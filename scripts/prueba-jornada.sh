#!/usr/bin/env bash
# ============================================================
# Prueba de jornada completa (para correr en la VPS de producción)
# ============================================================
# Llena dos días de trabajo con turnos de clientes ficticios, usando la
# misma API pública que la página /reservar, y prueba la cancelación del
# cliente con el mismo link firmado que va en el mail:
#
#   Día 1: se llena entero. Se cancela un turno del medio y se verifica
#          que el horario vuelve a aparecer libre en la reserva online.
#          Ese hueco queda libre, para verlo en el panel.
#   Día 2: se llena entero, se cancela un turno y otro cliente nuevo
#          reserva el horario que se liberó.
#
# Además verifica que no se pueda reservar un horario ya ocupado y que al
# barbero le llegue el aviso de cancelación (2 mails al email del negocio).
#
# Los clientes ficticios usan direcciones de prueba de Resend
# (delivered+jornada-NN@resend.dev): los mails de confirmación se
# "entregan" sin llegarle a nadie y sin dañar la reputación del dominio.
#
# USO (desde la carpeta del repo en la VPS):
#   ./scripts/prueba-jornada.sh crear [FECHA_DIA_1 FECHA_DIA_2]
#   ./scripts/prueba-jornada.sh ver
#   ./scripts/prueba-jornada.sh limpiar
#
#   Sin fechas, usa el lunes y el martes que caen dentro de 2 a 3 semanas
#   (fechas AAAA-MM-DD). Tienen que ser días futuros y abiertos.
#
# Variables opcionales:
#   API_URL=http://127.0.0.1:8080/api   (el frontend, que reenvía /api al backend)
#   COMPOSE_FILE=docker-compose.prod.yml
#   ENV_FILE=.env.production            (de acá salen DB_USER y DB_NAME)
#   SERVICIOS=1,3                       (ids a rotar; por defecto, los vigentes de hasta 60 min)
#   PAUSA=13                            (segundos entre reservas; la API acepta 5 por minuto)
#   SI=1                                (no pedir confirmación)
#
# OJO:
#   - Mientras corre (unos 6-8 minutos), la reserva online puede rechazar a
#     clientes reales con "demasiados pedidos": el límite de 5 reservas por
#     minuto lo comparten todos. Conviene correrlo con el local cerrado.
#   - Si Google Calendar está conectado, los turnos aparecen en el calendario;
#     "limpiar" los borra también de ahí.
#   - Correr "limpiar" al terminar de mirar: si quedan cargados, salen los
#     recordatorios automáticos y los turnos cuentan en los reportes.
# ============================================================

set -uo pipefail

cd "$(dirname "$0")/.."

API_URL="${API_URL:-http://127.0.0.1:8080/api}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
ENV_FILE="${ENV_FILE:-.env.production}"
PAUSA="${PAUSA:-13}"
TZ_AR="America/Argentina/Buenos_Aires"
EMAIL_PATRON="delivered+jornada-%@resend.dev"
OBSERVACION="PRUEBA-JORNADA"
DIAS_SEMANA=(domingo lunes martes miércoles jueves viernes sábado)

NOMBRES=(Juan Martín Lucas Santiago Mateo Tomás Joaquín Nicolás Facundo Agustín Franco Ignacio Lautaro Bruno Gonzalo Ramiro Federico Emiliano Valentín Leandro)
APELLIDOS=(Pérez González Rodríguez Fernández López Martínez Gómez Díaz Sosa Romero Álvarez Torres Ruiz Ramírez Acosta Benítez Medina Herrera Suárez Aguirre)

PASS=0
FAIL=0
CLIENTE=0

# ─── Utilidades ───

leer_env() {
  grep -E "^$1=" "$ENV_FILE" 2>/dev/null | tail -n1 | cut -d= -f2- | sed -e 's/^["'\'']//' -e 's/["'\'']$//'
}

DB_USER="${DB_USER:-$(leer_env DB_USER)}"
DB_NAME="${DB_NAME:-$(leer_env DB_NAME)}"

compose() { docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$@"; }
sql() { compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -q -t -A -F ' | ' -c "$1"; }
ayudante() { compose exec -T backend node - "$@" < scripts/prueba-jornada-helper.js; }

ok()  { echo "  ✔ $1"; PASS=$((PASS + 1)); }
mal() { echo "  ✘ $1"; FAIL=$((FAIL + 1)); }

hora_ar() { TZ="$TZ_AR" date -d "$1" +%H:%M; }
nombre_dia() { echo "${DIAS_SEMANA[$(date -d "$1" +%w)]} $(date -d "$1" +%d/%m)"; }

confirmar() {
  [ "${SI:-0}" = "1" ] && return 0
  local respuesta
  read -r -p "Escribí SI para seguir: " respuesta
  [ "$respuesta" = "SI" ] || { echo "Cancelado, no se tocó nada."; exit 1; }
}

# Hace el pedido y deja el resultado en HTTP_CODE y HTTP_BODY.
pedir() {
  local metodo="$1" url="$2" datos="${3:-}" resp
  if [ -n "$datos" ]; then
    resp=$(curl -sS -m 30 -w '\n%{http_code}' -X "$metodo" -H 'Content-Type: application/json' -d "$datos" "$url" 2>&1)
  else
    resp=$(curl -sS -m 30 -w '\n%{http_code}' "$url" 2>&1)
  fi
  HTTP_CODE=$(tail -n1 <<<"$resp")
  HTTP_BODY=$(sed '$d' <<<"$resp")
}

# Para reservar y cancelar (5 pedidos por minuto): espera entre pedidos y,
# si igual se pasa del límite, espera un minuto y reintenta.
pedir_con_limite() {
  local intento
  for intento in 1 2 3; do
    sleep "$PAUSA"
    pedir "$@"
    [ "$HTTP_CODE" != "429" ] && return
    echo "    (límite de pedidos alcanzado, espero 60 s)"
    sleep 60
  done
}

# Deja en SLOTS los horarios libres (ISO, UTC) de esa fecha para ese servicio.
obtener_slots() {
  SLOTS=()
  pedir GET "$API_URL/turnos-publicos/disponibilidad?fecha=$1&servicios=$2"
  if [ "$HTTP_CODE" != "200" ]; then
    echo "    No se pudo consultar la disponibilidad (HTTP $HTTP_CODE): $HTTP_BODY" >&2
    return 1
  fi
  mapfile -t SLOTS < <(jq -r '.slots[]' <<<"$HTTP_BODY")
}

contiene() {
  local buscado="$1" x
  shift
  for x in "$@"; do [ "$x" = "$buscado" ] && return 0; done
  return 1
}

franjas_de() {
  jq -r --argjson d "$(date -d "$1" +%w)" '
    [.horarios[]? | select(.dia == $d)][0] as $h
    | if $h == null or $h.cerrado then "cerrado"
      else [ (if $h.abre and $h.cierra then "\($h.abre)-\($h.cierra)" else empty end),
             (if $h.abre2 and $h.cierra2 then "\($h.abre2)-\($h.cierra2)" else empty end) ]
           | if length == 0 then "cerrado" else join(" y ") end
      end' <<<"$BRANDING"
}

# Cuántos turnos de 30 min entran en el día, para estimar la duración.
lugares_de() {
  jq -r --argjson d "$(date -d "$1" +%w)" '
    def minutos(t): (t | split(":") | (.[0] | tonumber) * 60 + (.[1] | tonumber));
    [.horarios[]? | select(.dia == $d)][0] as $h
    | if $h == null or $h.cerrado then 0
      else ((if $h.abre and $h.cierra then (minutos($h.cierra) - minutos($h.abre)) else 0 end)
          + (if $h.abre2 and $h.cierra2 then (minutos($h.cierra2) - minutos($h.abre2)) else 0 end)) / 30 | floor
      end' <<<"$BRANDING"
}

# Reserva con un cliente ficticio nuevo. Deja el id en ULTIMO_TURNO.
reservar_cliente() {
  local slot="$1" servicio="$2" nombre apellido email telefono payload
  CLIENTE=$((CLIENTE + 1))
  nombre="${NOMBRES[$(( (CLIENTE - 1) % ${#NOMBRES[@]} ))]}"
  apellido="${APELLIDOS[$(( (CLIENTE * 7) % ${#APELLIDOS[@]} ))]}"
  email=$(printf 'delivered+jornada-%02d@resend.dev' "$CLIENTE")
  telefono=$(printf '351555%04d' "$CLIENTE")
  payload=$(jq -nc --arg n "$nombre" --arg a "$apellido" --arg e "$email" --arg t "$telefono" \
    --arg f "$slot" --arg o "$OBSERVACION" --argjson s "$servicio" --argjson p "$ID_FORMA_PAGO" \
    '{nombre:$n, apellido:$a, email:$e, telefono:$t, fechaHoraInicio:$f, observacion:$o,
      servicios:[{idServicio:$s}], idFormaPagoPreferida:$p}')

  ULTIMO_TURNO=""
  pedir_con_limite POST "$API_URL/turnos-publicos/reservar" "$payload"
  if [ "$HTTP_CODE" = "201" ]; then
    ULTIMO_TURNO=$(jq -r '.idTurno' <<<"$HTTP_BODY")
    printf '    %s  %-28s %-22s turno #%s\n' "$(hora_ar "$slot")" "${SVC_NOMBRE[$servicio]} (${SVC_DUR[$servicio]} min)" "$nombre $apellido" "$ULTIMO_TURNO"
    return 0
  fi
  printf '    %s  rechazado (HTTP %s): %s\n' "$(hora_ar "$slot")" "$HTTP_CODE" "$(jq -r '.message // .' <<<"$HTTP_BODY" 2>/dev/null || echo "$HTTP_BODY")"
  return 1
}

# Llena el día tomando siempre el primer horario libre. Rota los servicios;
# si el que toca ya no entra, prueba con el más corto. Deja los turnos
# creados en DIA_IDS / DIA_SLOTS / DIA_SVCS.
llenar_dia() {
  local fecha="$1" fallos=0 servicio
  DIA_IDS=(); DIA_SLOTS=(); DIA_SVCS=()
  echo ""
  echo "── $(nombre_dia "$fecha") ($(franjas_de "$fecha")) ──"
  while [ "${#DIA_IDS[@]}" -lt 60 ]; do
    servicio="${ROTACION[$(( CLIENTE % ${#ROTACION[@]} ))]}"
    obtener_slots "$fecha" "$servicio" || return 1
    if [ "${#SLOTS[@]}" -eq 0 ] && [ "$servicio" != "$SVC_CORTO" ]; then
      servicio="$SVC_CORTO"
      obtener_slots "$fecha" "$servicio" || return 1
    fi
    [ "${#SLOTS[@]}" -eq 0 ] && break

    if reservar_cliente "${SLOTS[0]}" "$servicio"; then
      DIA_IDS+=("$ULTIMO_TURNO"); DIA_SLOTS+=("${SLOTS[0]}"); DIA_SVCS+=("$servicio")
      fallos=0
    else
      fallos=$((fallos + 1))
      [ "$fallos" -ge 3 ] && { mal "$(nombre_dia "$fecha"): 3 reservas seguidas rechazadas, dejo de llenar el día"; return 1; }
    fi
  done

  obtener_slots "$fecha" "$SVC_CORTO"
  if [ "${#SLOTS[@]}" -eq 0 ]; then
    ok "$(nombre_dia "$fecha"): ${#DIA_IDS[@]} turnos, el día quedó sin horarios libres"
  else
    mal "$(nombre_dia "$fecha"): quedaron ${#SLOTS[@]} horarios libres después de llenarlo"
  fi
}

# Cancela un turno con el link del mail y verifica que el horario se libere.
probar_cancelacion() {
  local id="$1" slot="$2" servicio="$3" fecha="$4" token estado cancelado_por
  echo ""
  echo "  Cancelación del turno #$id ($(nombre_dia "$fecha") $(hora_ar "$slot"))"

  token=$(ayudante token "$id") || { mal "no se pudo generar el link de cancelación"; return 1; }

  obtener_slots "$fecha" "$servicio"
  contiene "$slot" "${SLOTS[@]}" && mal "antes de cancelar, las $(hora_ar "$slot") ya figuraban libres" \
                                  || ok "antes de cancelar, las $(hora_ar "$slot") figuran ocupadas"

  pedir GET "$API_URL/turnos-publicos/cancelacion?token=$token"
  if [ "$HTTP_CODE" = "200" ] && [ "$(jq -r '.puedeCancelar' <<<"$HTTP_BODY")" = "true" ]; then
    ok "el link del mail abre el turno de $(jq -r '.nombreCliente' <<<"$HTTP_BODY") y deja cancelarlo"
  else
    mal "el link del mail no funciona (HTTP $HTTP_CODE): $HTTP_BODY"
    return 1
  fi

  pedir_con_limite POST "$API_URL/turnos-publicos/cancelar" "$(jq -nc --arg t "$token" '{token:$t}')"
  estado=$(jq -r '.estado // empty' <<<"$HTTP_BODY" 2>/dev/null)
  [ "$HTTP_CODE" = "200" ] && [ "$estado" = "CANCELADO" ] \
    && ok "el cliente canceló el turno" \
    || { mal "la cancelación falló (HTTP $HTTP_CODE): $HTTP_BODY"; return 1; }

  cancelado_por=$(sql "SELECT cancelado_por FROM turnos WHERE \"idTurno\" = $id;")
  [ "$cancelado_por" = "CLIENTE" ] && ok "en la base figura cancelado por el cliente" \
                                   || mal "en la base figura cancelado_por='$cancelado_por' (esperaba CLIENTE)"

  obtener_slots "$fecha" "$servicio"
  contiene "$slot" "${SLOTS[@]}" && ok "las $(hora_ar "$slot") volvieron a aparecer libres en la reserva online" \
                                  || mal "las $(hora_ar "$slot") siguen ocupadas después de cancelar"
}

cargar_datos_api() {
  pedir GET "$API_URL/configuracion/branding"
  [ "$HTTP_CODE" = "200" ] || { echo "La API no responde en $API_URL (HTTP $HTTP_CODE). ¿Está levantado el stack?" >&2; exit 1; }
  BRANDING="$HTTP_BODY"

  pedir GET "$API_URL/turnos-publicos/formas-pago"
  ID_FORMA_PAGO=$(jq -r '.[0].idFormaPago // empty' <<<"$HTTP_BODY")
  [ -n "$ID_FORMA_PAGO" ] || { echo "No hay formas de pago vigentes, no se puede reservar." >&2; exit 1; }

  pedir GET "$API_URL/servicios?vigente=true&limit=100"
  [ "$HTTP_CODE" = "200" ] || { echo "No se pudieron leer los servicios (HTTP $HTTP_CODE): $HTTP_BODY" >&2; exit 1; }
  declare -gA SVC_NOMBRE SVC_DUR
  local id dur nombre
  while IFS=$'\t' read -r id dur nombre; do
    SVC_NOMBRE[$id]="$nombre"; SVC_DUR[$id]="$dur"
  done < <(jq -r '.data[] | [.idServicio, .duracionMinutos, .nombre] | @tsv' <<<"$HTTP_BODY")
  [ "${#SVC_DUR[@]}" -gt 0 ] || { echo "No hay servicios vigentes, no se puede reservar." >&2; exit 1; }

  SVC_CORTO=$(jq -r '.data | min_by(.duracionMinutos) | .idServicio' <<<"$HTTP_BODY")
  if [ -n "${SERVICIOS:-}" ]; then
    IFS=',' read -r -a ROTACION <<<"$SERVICIOS"
    for id in "${ROTACION[@]}"; do
      [ -n "${SVC_DUR[$id]:-}" ] || { echo "El servicio $id no existe o no está vigente." >&2; exit 1; }
    done
  else
    mapfile -t ROTACION < <(jq -r '.data[] | select(.duracionMinutos <= 60) | .idServicio' <<<"$HTTP_BODY")
    [ "${#ROTACION[@]}" -gt 0 ] || ROTACION=("$SVC_CORTO")
  fi
}

# ─── Comandos ───

crear() {
  local f1 f2 base dia_semana
  if [ $# -ge 2 ]; then
    f1="$1"; f2="$2"
  else
    base=$(date -d '+14 days' +%F)
    dia_semana=$(date -d "$base" +%u)
    f1=$(date -d "$base +$(( (8 - dia_semana) % 7 )) days" +%F)
    f2=$(date -d "$f1 +1 day" +%F)
  fi
  for f in "$f1" "$f2"; do
    [[ "$f" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]] && date -d "$f" >/dev/null 2>&1 \
      || { echo "Fecha inválida: $f (usar AAAA-MM-DD)" >&2; exit 1; }
    [ "$f" \> "$(TZ="$TZ_AR" date +%F)" ] || { echo "La fecha $f no es futura: el cliente solo puede cancelar turnos que todavía no empezaron." >&2; exit 1; }
  done
  [ "$f1" != "$f2" ] || { echo "Las dos fechas tienen que ser distintas." >&2; exit 1; }

  cargar_datos_api

  local f lugares=0 servicios_txt="" id
  for f in "$f1" "$f2"; do
    [ "$(franjas_de "$f")" != "cerrado" ] || { echo "El negocio está cerrado el $(nombre_dia "$f"). Elegí otro día." >&2; exit 1; }
    lugares=$(( lugares + $(lugares_de "$f") ))
  done
  for id in "${ROTACION[@]}"; do servicios_txt+="${SVC_NOMBRE[$id]} (${SVC_DUR[$id]} min), "; done

  local previos
  previos=$(sql "SELECT count(*) FROM turnos t JOIN personas p ON p.\"idPersona\" = t.\"idPersona\" WHERE p.mail LIKE '$EMAIL_PATRON' AND t.estado <> 'CANCELADO';") || exit 1

  echo "Prueba de jornada completa"
  echo "  API:        $API_URL"
  echo "  Día 1:      $(nombre_dia "$f1") ($(franjas_de "$f1"))"
  echo "  Día 2:      $(nombre_dia "$f2") ($(franjas_de "$f2"))"
  echo "  Servicios:  ${servicios_txt%, }"
  echo "  Forma pago: id $ID_FORMA_PAGO"
  echo ""
  echo "  Se van a crear hasta ~$((lugares + 2)) clientes y turnos ficticios (mails a direcciones de"
  echo "  prueba de Resend, no le llegan a nadie) y se van a mandar 2 avisos de cancelación al"
  echo "  mail del negocio. Tarda unos $(( (lugares + 4) * PAUSA / 60 + 1 )) minutos."
  echo "  Mientras corre, la reserva online puede rechazar clientes reales por el límite de pedidos."
  [ "$previos" -gt 0 ] && echo "  Hay $previos turnos de una prueba anterior sin limpiar (se mantienen)."
  echo ""
  confirmar

  # Día 1: llenar, probar que no se pueda pisar un horario y cancelar uno del medio.
  llenar_dia "$f1"
  local n1="${#DIA_IDS[@]}"
  if [ "$n1" -gt 0 ]; then
    local medio=$(( n1 / 2 ))
    local d1_id="${DIA_IDS[$medio]}" d1_slot="${DIA_SLOTS[$medio]}" d1_svc="${DIA_SVCS[$medio]}"

    echo ""
    echo "  Intento de reservar un horario ocupado ($(hora_ar "${DIA_SLOTS[0]}")):"
    if reservar_cliente "${DIA_SLOTS[0]}" "${DIA_SVCS[0]}"; then
      mal "se pudo reservar un horario ocupado (turno #$ULTIMO_TURNO)"
    elif [ "$HTTP_CODE" = "400" ]; then
      ok "la API rechaza el horario ocupado"
    else
      mal "respuesta inesperada al reservar un horario ocupado (HTTP $HTTP_CODE)"
    fi

    probar_cancelacion "$d1_id" "$d1_slot" "$d1_svc" "$f1"

    pedir_con_limite POST "$API_URL/turnos-publicos/cancelar" "$(jq -nc --arg t "$(ayudante token "$d1_id")" '{token:$t}')"
    [ "$HTTP_CODE" = "200" ] && ok "abrir el link de nuevo no da error (el turno ya estaba cancelado)" \
                             || mal "segundo clic en cancelar: HTTP $HTTP_CODE"
  fi

  # Día 2: llenar, cancelar uno y que otro cliente tome ese horario.
  llenar_dia "$f2"
  local n2="${#DIA_IDS[@]}"
  if [ "$n2" -gt 0 ]; then
    local i2=$(( n2 / 3 ))
    local d2_id="${DIA_IDS[$i2]}" d2_slot="${DIA_SLOTS[$i2]}" d2_svc="${DIA_SVCS[$i2]}"
    if probar_cancelacion "$d2_id" "$d2_slot" "$d2_svc" "$f2"; then
      echo ""
      echo "  Otro cliente reserva el horario liberado:"
      if reservar_cliente "$d2_slot" "$d2_svc"; then
        ok "un cliente nuevo tomó las $(hora_ar "$d2_slot")"
      else
        mal "no se pudo reservar el horario liberado"
      fi
    fi
  fi

  echo ""
  ver
  echo ""
  echo "============================================================"
  echo "Resultado: $PASS OK, $FAIL con problemas"
  echo "============================================================"
  echo "Para revisar a mano:"
  echo "  - Panel → Turnos: la semana del $(date -d "$f1" +%d/%m). Hay un turno cancelado \"por el cliente\""
  echo "    el $(nombre_dia "$f1") con su horario libre, y uno reemplazado el $(nombre_dia "$f2")."
  echo "  - El mail del negocio: 2 avisos de cancelación."
  echo "  - /reservar en esas fechas: el $(nombre_dia "$f1") solo debería ofrecer el horario liberado."
  echo "Al terminar: ./scripts/prueba-jornada.sh limpiar"
  [ "$FAIL" -eq 0 ]
}

ver() {
  local filas
  filas=$(sql "
    SELECT to_char(t.fecha_hora_inicio AT TIME ZONE 'UTC' AT TIME ZONE '$TZ_AR', 'DD/MM HH24:MI'),
           rpad(p.nombre || ' ' || p.apellido, 22),
           rpad(string_agg(s.nombre, ', '), 26),
           t.estado || CASE WHEN t.cancelado_por IS NOT NULL THEN ' (' || lower(t.cancelado_por) || ')' ELSE '' END
    FROM turnos t
    JOIN personas p ON p.\"idPersona\" = t.\"idPersona\"
    JOIN turno_detalles d ON d.\"idTurno\" = t.\"idTurno\"
    JOIN servicios s ON s.\"idServicio\" = d.\"idServicio\"
    WHERE p.mail LIKE '$EMAIL_PATRON'
    GROUP BY t.\"idTurno\", p.nombre, p.apellido
    ORDER BY t.fecha_hora_inicio, t.\"idTurno\";") || exit 1
  if [ -z "$filas" ]; then
    echo "No hay turnos de prueba cargados."
    return
  fi
  echo "Turnos de prueba en la base:"
  sed 's/^/  /' <<<"$filas"
}

limpiar() {
  local sub="SELECT t.\"idTurno\" FROM turnos t JOIN personas p ON p.\"idPersona\" = t.\"idPersona\" WHERE p.mail LIKE '$EMAIL_PATRON'"
  local turnos personas pagos eventos
  turnos=$(sql "SELECT count(*) FROM ($sub) x;") || exit 1
  personas=$(sql "SELECT count(*) FROM personas WHERE mail LIKE '$EMAIL_PATRON';")
  pagos=$(sql "SELECT count(*) FROM pagos WHERE \"idTurno\" IN ($sub);")
  mapfile -t eventos < <(sql "SELECT t.google_event_id FROM turnos t JOIN personas p ON p.\"idPersona\" = t.\"idPersona\" WHERE p.mail LIKE '$EMAIL_PATRON' AND t.google_event_id IS NOT NULL;")

  if [ "$turnos" -eq 0 ] && [ "$personas" -eq 0 ]; then
    echo "No hay datos de prueba para borrar."
    return
  fi

  echo "Se van a borrar: $turnos turnos, $personas clientes ficticios, $pagos pagos (y sus movimientos de caja)"
  echo "y ${#eventos[@]} eventos de Google Calendar."
  [ "$pagos" -gt 0 ] && echo "Si cerraste la caja de esos días, el cierre ya guardado no se recalcula."
  confirmar

  if [ "${#eventos[@]}" -gt 0 ]; then
    local resultado
    resultado=$(ayudante borrar-eventos "${eventos[@]}")
    case "$resultado" in
      no-conectado) echo "Google Calendar no está conectado: no hay eventos para borrar." ;;
      *" 0") echo "Eventos de Google Calendar borrados: ${resultado%% *}." ;;
      *) echo "Eventos borrados/fallidos: $resultado. Los que fallaron hay que borrarlos a mano del calendario." ;;
    esac
  fi

  sql "BEGIN;
    DELETE FROM movimientos_caja WHERE id_turno IN ($sub);
    DELETE FROM pagos WHERE \"idTurno\" IN ($sub);
    DELETE FROM turnos WHERE \"idTurno\" IN ($sub);
    DELETE FROM personas WHERE mail LIKE '$EMAIL_PATRON';
    COMMIT;" || exit 1
  echo "Listo, se borró todo lo de la prueba."
}

# ─── Inicio ───

for programa in curl jq docker; do
  command -v "$programa" >/dev/null || { echo "Falta $programa." >&2; exit 1; }
done
[ -f "$ENV_FILE" ] || { echo "No encuentro $ENV_FILE (correr desde la carpeta del repo en la VPS o pasar ENV_FILE=...)." >&2; exit 1; }
[ -n "$DB_USER" ] && [ -n "$DB_NAME" ] || { echo "No pude leer DB_USER/DB_NAME de $ENV_FILE." >&2; exit 1; }

case "${1:-}" in
  crear) shift; crear "$@" ;;
  ver) ver ;;
  limpiar) limpiar ;;
  *)
    echo "Uso: $0 crear [FECHA_DIA_1 FECHA_DIA_2] | ver | limpiar" >&2
    exit 1
    ;;
esac
