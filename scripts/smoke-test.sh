#!/usr/bin/env bash
# ============================================================
# Smoke test: circuitos críticos del sistema
# ============================================================
# Prueba de punta a punta, contra la API real (no mocks), los
# circuitos que más duelen si se rompen:
#
#   1. Login de admin.
#   2. Reserva pública de un cliente (dispara el mail de confirmación).
#   3. Ciclo de vida completo de un turno con cobro real (nace CONFIRMADO):
#      iniciar -> finalizar -> pago en caja (crea el movimiento, no solo
#      cambia el estado).
#   4. Recordatorio automático por email (cron de NotificationsService).
#
# Lo que NO cubre (a propósito, ver conversación): cancelación,
# branding/configuración, Cloudinary, fidelización, rate limiting.
# Se puede ir ampliando con el mismo patrón.
#
# Requiere: backend corriendo y respondiendo en API_URL, jq, y
# acceso directo a la base (docker exec) para el paso 4, que no
# tiene otra forma de dispararse salvo esperar al cron.
#
# USO:
#   EMAIL=tu-mail@ejemplo.com ADMIN_LOGIN=admin ADMIN_PASSWORD=... ./scripts/smoke-test.sh
#
# Variables opcionales (con sus defaults):
#   API_URL=http://localhost:3000/api
#   DB_CONTAINER=peluqueria-db
#   DB_USER=peluquero
#   DB_NAME=peluqueria
#   SKIP_RECORDATORIO=0   # poné 1 para saltear el paso 4 (es el que más tarda, hasta ~15 min)
#
# El script limpia los turnos que crea y restaura la config que
# toca, incluso si algún paso falla (trap al final).
# ============================================================

set -uo pipefail

API_URL="${API_URL:-http://localhost:3000/api}"
DB_CONTAINER="${DB_CONTAINER:-peluqueria-db}"
DB_USER="${DB_USER:-peluquero}"
DB_NAME="${DB_NAME:-peluqueria}"
SKIP_RECORDATORIO="${SKIP_RECORDATORIO:-0}"

if [ -z "${EMAIL:-}" ] || [ -z "${ADMIN_LOGIN:-}" ] || [ -z "${ADMIN_PASSWORD:-}" ]; then
  echo "Faltan variables. Uso:" >&2
  echo "  EMAIL=tu-mail@ejemplo.com ADMIN_LOGIN=tu-usuario ADMIN_PASSWORD=tu-clave ./scripts/smoke-test.sh" >&2
  exit 1
fi

PASSES=()
FAILURES=()
TURNO_PAGO=""
TURNO_RECORDATORIO=""
CONFIG_ORIGINAL=""

psql_q() {
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1"
}

ok()   { echo "  OK: $1"; PASSES+=("$1"); }
fail() { echo "  FALLÓ: $1"; FAILURES+=("$1"); }
step() { echo ""; echo "== $1 =="; }

DEVICE_TOKEN_HASH=""

cleanup() {
  step "Limpieza"
  psql_q "DELETE FROM turno_detalles WHERE \"idTurno\" IN (SELECT \"idTurno\" FROM turnos WHERE observacion LIKE 'SMOKE-TEST%');" > /dev/null
  psql_q "DELETE FROM pagos WHERE \"idTurno\" IN (SELECT \"idTurno\" FROM turnos WHERE observacion LIKE 'SMOKE-TEST%');" > /dev/null 2>&1
  psql_q "DELETE FROM movimientos_caja WHERE id_turno IN (SELECT \"idTurno\" FROM turnos WHERE observacion LIKE 'SMOKE-TEST%');" > /dev/null 2>&1
  psql_q "DELETE FROM turnos WHERE observacion LIKE 'SMOKE-TEST%';" > /dev/null
  if [ -n "$DEVICE_TOKEN_HASH" ]; then
    psql_q "DELETE FROM dispositivos_confiables WHERE token_hash = '$DEVICE_TOKEN_HASH';" > /dev/null
  fi
  if [ -n "$CONFIG_ORIGINAL" ]; then
    psql_q "UPDATE configuracion_negocio SET recordatorio_horas_antes = $CONFIG_ORIGINAL WHERE id = 1;" > /dev/null
  fi
  echo "  Turnos de prueba y config restaurados."
}
trap cleanup EXIT

# --- 1. Login ---
# El login ahora puede pedir 2FA por correo (POST /auth/login devuelve
# requiresTwoFactor: true y ningún access_token). Para no depender de leer
# un mail real, el script se registra como "dispositivo de confianza" de
# $ADMIN_LOGIN directo en la base (mismo mecanismo que usa POST
# /auth/verify-2fa con recordarDispositivo:true), y manda ese token como
# cookie device_token en el login: así el backend lo saltea y devuelve el
# access_token en el mismo paso, igual que antes de que existiera el 2FA.
step "1. Login de admin"

USUARIO_ADMIN=$(psql_q "SELECT usuario FROM usuarios_web WHERE usuario = '$ADMIN_LOGIN' OR email = '$ADMIN_LOGIN';")
if [ -z "$USUARIO_ADMIN" ]; then
  echo "No existe ningún usuario con login/email '$ADMIN_LOGIN'." >&2
  exit 1
fi

DEVICE_TOKEN=$(openssl rand -hex 32)
DEVICE_TOKEN_HASH=$(printf '%s' "$DEVICE_TOKEN" | sha256sum | cut -d' ' -f1)
psql_q "INSERT INTO dispositivos_confiables (usuario, token_hash, expira_en) VALUES ('$USUARIO_ADMIN', '$DEVICE_TOKEN_HASH', now() + interval '30 days');" > /dev/null

LOGIN_RESP=$(curl -s -w '\n%{http_code}' -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -H "Cookie: device_token=$DEVICE_TOKEN" \
  -d "{\"login\":\"$ADMIN_LOGIN\",\"password\":\"$ADMIN_PASSWORD\"}")
LOGIN_CODE=$(echo "$LOGIN_RESP" | tail -n1)
LOGIN_BODY=$(echo "$LOGIN_RESP" | sed '$d')
TOKEN=$(echo "$LOGIN_BODY" | jq -r '.access_token // empty')

if [ "$LOGIN_CODE" == "200" ] && [ -n "$TOKEN" ]; then
  ok "login devolvió 200 y un access_token (2FA saltado via dispositivo de confianza de prueba)"
else
  fail "login (HTTP $LOGIN_CODE): $LOGIN_BODY"
  echo ""
  echo "Sin token no se puede seguir con los pasos que requieren auth. Abortando."
  exit 1
fi
AUTH_HEADER="Authorization: Bearer $TOKEN"

# --- idServicio e idFormaPago vigentes, reusados en los pasos 2 y 4 ---
ID_SERVICIO=$(psql_q "SELECT \"idServicio\" FROM servicios WHERE vigente = true ORDER BY \"idServicio\" LIMIT 1;")
if [ -z "$ID_SERVICIO" ]; then
  echo "No hay ningún servicio vigente en la base, no se puede seguir." >&2
  exit 1
fi

ID_FORMA_PAGO_RESERVA=$(psql_q "SELECT \"idFormaPago\" FROM formas_pago WHERE vigente = true ORDER BY \"idFormaPago\" LIMIT 1;")
if [ -z "$ID_FORMA_PAGO_RESERVA" ]; then
  echo "No hay ninguna forma de pago vigente en la base, no se puede seguir." >&2
  exit 1
fi

reservar() {
  local fecha="$1" observacion="$2"
  local disp slot resp code body
  disp=$(curl -s -w '\n%{http_code}' "$API_URL/turnos-publicos/disponibilidad?fecha=$fecha&servicios=$ID_SERVICIO")
  code=$(echo "$disp" | tail -n1)
  body=$(echo "$disp" | sed '$d')
  if [ "$code" != "200" ]; then
    echo "" >&2
    return 1
  fi
  slot=$(echo "$body" | jq -r '.slots[0] // empty')
  if [ -z "$slot" ]; then
    echo "" >&2
    return 1
  fi
  resp=$(curl -s -w '\n%{http_code}' -X POST "$API_URL/turnos-publicos/reservar" \
    -H "Content-Type: application/json" \
    -d "{\"nombre\":\"Smoke\",\"apellido\":\"Test\",\"email\":\"$EMAIL\",\"fechaHoraInicio\":\"$slot\",\"observacion\":\"$observacion\",\"servicios\":[{\"idServicio\":$ID_SERVICIO}],\"idFormaPagoPreferida\":$ID_FORMA_PAGO_RESERVA}")
  code=$(echo "$resp" | tail -n1)
  body=$(echo "$resp" | sed '$d')
  if [ "$code" != "201" ]; then
    echo "" >&2
    return 1
  fi
  echo "$body" | jq -r '.idTurno'
}

# --- 2. Reserva pública + confirmación ---
step "2. Reserva pública (dispara el mail de confirmación)"
FECHA=$(date -d "+3 days" +%F)
TURNO_PAGO=$(reservar "$FECHA" "SMOKE-TEST-PAGO")
if [ -n "$TURNO_PAGO" ]; then
  ok "reserva pública creó el turno #$TURNO_PAGO (revisá $EMAIL para confirmar que llegó el mail)"
else
  fail "no se pudo reservar el turno para el ciclo de pago"
fi

# --- 3. Ciclo de vida completo + pago en caja ---
# El turno ya nace CONFIRMADO (ver create() en turnos.service.ts), así que
# no hace falta un paso "confirmar" explícito acá.
step "3. Iniciar -> finalizar -> pagar"
if [ -n "$TURNO_PAGO" ]; then
  transicion() {
    local accion="$1" estado_esperado="$2"
    local resp code body estado
    resp=$(curl -s -w '\n%{http_code}' -X POST "$API_URL/turnos/$TURNO_PAGO/$accion" -H "$AUTH_HEADER")
    code=$(echo "$resp" | tail -n1)
    body=$(echo "$resp" | sed '$d')
    estado=$(echo "$body" | jq -r '.estado // empty')
    if { [ "$code" == "200" ] || [ "$code" == "201" ]; } && [ "$estado" == "$estado_esperado" ]; then
      ok "$accion -> $estado"
    else
      fail "$accion (HTTP $code): $body"
    fi
  }
  transicion "iniciar" "EN_PROCESO"
  transicion "finalizar" "COMPLETADO"

  TOTAL=$(curl -s "$API_URL/turnos/$TURNO_PAGO/total" -H "$AUTH_HEADER" | jq -r '.total')
  ID_FORMA_PAGO=$(curl -s "$API_URL/caja/formas-pago" -H "$AUTH_HEADER" | jq -r '.[0].idFormaPago // empty')

  if [ -n "$TOTAL" ] && [ -n "$ID_FORMA_PAGO" ]; then
    PAGO_RESP=$(curl -s -w '\n%{http_code}' -X POST "$API_URL/caja/pagos" \
      -H "$AUTH_HEADER" -H "Content-Type: application/json" \
      -d "{\"idTurno\":$TURNO_PAGO,\"idFormaPago\":$ID_FORMA_PAGO,\"monto\":$TOTAL}")
    PAGO_CODE=$(echo "$PAGO_RESP" | tail -n1)
    PAGO_BODY=$(echo "$PAGO_RESP" | sed '$d')
    if [ "$PAGO_CODE" == "201" ]; then
      ok "pago registrado en caja (\$$TOTAL) y movimiento creado"
    else
      fail "registrar pago (HTTP $PAGO_CODE): $PAGO_BODY"
    fi
  else
    fail "no se pudo calcular el total o no hay una forma de pago vigente"
  fi
else
  fail "se saltea el ciclo de vida: no hay turno de pago"
fi

# --- 4. Recordatorio automático ---
if [ "$SKIP_RECORDATORIO" == "1" ]; then
  step "4. Recordatorio automático: SALTEADO (SKIP_RECORDATORIO=1)"
else
  step "4. Recordatorio automático por email"
  FECHA_RECORDATORIO=$(date -d "+5 days" +%F)
  TURNO_RECORDATORIO=$(reservar "$FECHA_RECORDATORIO" "SMOKE-TEST-RECORDATORIO")

  if [ -n "$TURNO_RECORDATORIO" ]; then
    CONFIG_ORIGINAL=$(psql_q "SELECT recordatorio_horas_antes FROM configuracion_negocio WHERE id = 1;")
    [ -z "$CONFIG_ORIGINAL" ] && CONFIG_ORIGINAL=24

    # Ventana amplia (24hs) + turno a 2 minutos, para no depender de qué
    # valor tenga configurado el negocio en este momento.
    psql_q "UPDATE configuracion_negocio SET recordatorio_horas_antes = 24 WHERE id = 1;" > /dev/null
    psql_q "UPDATE turnos SET fecha_hora_inicio = now() + interval '2 minutes', fecha_hora_fin = now() + interval '30 minutes', recordatorio_enviado_en = NULL WHERE \"idTurno\" = $TURNO_RECORDATORIO;" > /dev/null

    echo "  Turno #$TURNO_RECORDATORIO listo. Esperando al próximo tick del cron (corre cada 15 min, timeout 16 min)..."
    ENVIADO=""
    for _ in $(seq 1 64); do
      ENVIADO=$(psql_q "SELECT recordatorio_enviado_en FROM turnos WHERE \"idTurno\" = $TURNO_RECORDATORIO;")
      [ -n "$ENVIADO" ] && break
      sleep 15
    done

    if [ -n "$ENVIADO" ]; then
      ok "el cron mandó el recordatorio y marcó el turno (revisá $EMAIL)"
    else
      fail "pasaron 16 min y el turno #$TURNO_RECORDATORIO no fue marcado como enviado"
    fi
  else
    fail "no se pudo reservar el turno para probar el recordatorio"
  fi
fi

# --- Resumen ---
echo ""
echo "============================================================"
echo "RESUMEN: ${#PASSES[@]} OK, ${#FAILURES[@]} FALLÓ"
if [ "${#FAILURES[@]}" -gt 0 ]; then
  echo "Fallaron:"
  for f in "${FAILURES[@]}"; do echo "  - $f"; done
fi
echo "============================================================"

[ "${#FAILURES[@]}" -eq 0 ]
