#!/usr/bin/env bash
# ============================================================
# Test: que el guard de disponibilidad NO deje pisar turnos,
# probando todas las combinaciones de solapamiento posibles
# contra la API pública real (no mocks de SQL) — valida el
# camino completo: reservarPublica() -> create() ->
# verificarDisponibilidad() (transacción Serializable).
# ============================================================
# Casos que prueba, todos sobre un turno base [INICIO, INICIO+DUR):
#
#   1. Duplicado exacto                         -> RECHAZAR
#   2. Se solapa por la izquierda (empieza antes, termina adentro) -> RECHAZAR
#   3. Se solapa por la derecha (empieza adentro, termina después) -> RECHAZAR
#   4. Contiene completamente al turno base      -> RECHAZAR
#   5. Anidado completamente adentro del base     -> RECHAZAR
#   6. Pegado antes, sin tocarse (termina justo cuando empieza el base) -> PERMITIR
#   7. Pegado después, sin tocarse (empieza justo cuando termina el base) -> PERMITIR
#   8. Lejos, sin relación                        -> PERMITIR
#   9. Mismo horario que un turno CANCELADO       -> PERMITIR (no debe bloquear)
#  10. Mismo horario que un turno COMPLETADO      -> RECHAZAR (sí debe bloquear)
#
# Usa el mismo servicio y forma de pago vigentes que smoke-test.sh, y una
# fecha futura fija (próximo martes) a las 10:00 hora AR, bien adentro de
# la franja matutina (09:00-13:30) del horario real del negocio — create()
# ahora valida horario de atención además de solapamiento, así que todos
# los offsets de este script tienen que caer dentro de esa misma franja.
#
# USO:
#   ./scripts/mock-solapamiento.sh
#
# Variables opcionales:
#   API_URL=http://localhost:3000/api
#   DB_CONTAINER=peluqueria-db
#   DB_USER=peluquero
#   DB_NAME=peluqueria
#
# Limpia los turnos que crea al final (trap), incluso si algún caso falla.
# ============================================================

set -uo pipefail

API_URL="${API_URL:-http://localhost:3000/api}"
DB_CONTAINER="${DB_CONTAINER:-peluqueria-db}"
DB_USER="${DB_USER:-peluquero}"
DB_NAME="${DB_NAME:-peluqueria}"
EMAIL="solapamiento-test@example.com"
OBS_PREFIX="MOCK-SOLAPAMIENTO"

PASS=0
FAIL=0
TURNOS_CREADOS=()

psql_q() {
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c "$1" | tr -d '[:space:]'
}

psql_exec() {
  docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -c "$1" >/dev/null
}

cleanup() {
  echo ""
  echo "--- Limpieza ---"
  psql_exec "DELETE FROM turno_detalles WHERE \"idTurno\" IN (SELECT \"idTurno\" FROM turnos WHERE observacion LIKE '${OBS_PREFIX}%');"
  psql_exec "DELETE FROM turnos WHERE observacion LIKE '${OBS_PREFIX}%';"
  psql_exec "DELETE FROM personas WHERE mail = '${EMAIL}';"
  echo "Listo."
}
trap cleanup EXIT

ok() { echo "  OK   - $1"; PASS=$((PASS+1)); }
bad() { echo "  FAIL - $1"; FAIL=$((FAIL+1)); }

ID_SERVICIO=$(psql_q "SELECT \"idServicio\" FROM servicios WHERE vigente = true ORDER BY \"idServicio\" LIMIT 1;")
DURACION=$(psql_q "SELECT \"duracionMinutos\" FROM servicios WHERE \"idServicio\" = ${ID_SERVICIO};")
ID_FORMA_PAGO=$(psql_q "SELECT \"idFormaPago\" FROM formas_pago WHERE vigente = true ORDER BY \"idFormaPago\" LIMIT 1;")

if [ -z "$ID_SERVICIO" ] || [ -z "$ID_FORMA_PAGO" ]; then
  echo "Falta un servicio o una forma de pago vigente en la base, no se puede seguir." >&2
  exit 1
fi

# Los casos de más abajo se extienden desde -DURACION hasta +150+DURACION
# minutos respecto del ancla. Con el ancla a los 60 min de abierta la franja
# matutina (09:00-13:30 = 270 min), hace falta DURACION <= 60 para que todo
# quede adentro. Si el servicio vigente tiene una duración mayor, el script
# avisa en vez de fallar con errores confusos de "fuera de horario".
if [ "$DURACION" -gt 60 ]; then
  echo "El servicio vigente dura ${DURACION}min; este script asume <= 60min para que todos los casos entren en la franja matutina. Ajustá los offsets o probá con otro servicio." >&2
  exit 1
fi

echo "Servicio vigente: idServicio=$ID_SERVICIO (duración ${DURACION}min) | Forma de pago: idFormaPago=$ID_FORMA_PAGO"

# Próximo martes, 10:00 hora AR (13:00 UTC, UTC-3 sin horario de verano),
# como horario base dentro de la franja matutina (09:00-13:30) de martes
# a sábado.
FECHA_BASE=$(date -d "next tuesday" +%F)
BASE_INICIO="${FECHA_BASE}T13:00:00.000Z"
echo "Fecha base: $FECHA_BASE (próximo martes), turno base a las 10:00 hora AR por ${DURACION}min"
echo ""

# Suma/resta minutos a un timestamp ISO (en UTC)
offset() {
  local base_iso="$1" minutos="$2"
  date -u -d "${base_iso} ${minutos} minutes" +%Y-%m-%dT%H:%M:%S.000Z
}

reservar() {
  local inicio="$1" obs="$2"
  local resp code body
  # El endpoint público tiene rate limit de 5 req/min; espaciamos las
  # llamadas para no pisarnos con el propio throttling durante el test.
  sleep 13
  resp=$(curl -s -w '\n%{http_code}' -X POST "$API_URL/turnos-publicos/reservar" \
    -H "Content-Type: application/json" \
    -d "{\"nombre\":\"Solapamiento\",\"apellido\":\"Test\",\"email\":\"$EMAIL\",\"fechaHoraInicio\":\"$inicio\",\"observacion\":\"${OBS_PREFIX}: ${obs}\",\"servicios\":[{\"idServicio\":$ID_SERVICIO}],\"idFormaPagoPreferida\":$ID_FORMA_PAGO}")
  code=$(echo "$resp" | tail -n1)
  body=$(echo "$resp" | sed '$d')
  echo "$code|$body"
}

# --- Turno base ---
echo "--- Creando turno base (10:00 - $(offset "$BASE_INICIO" "$DURACION")) ---"
RESP=$(reservar "$BASE_INICIO" "turno base")
CODE="${RESP%%|*}"
BODY="${RESP#*|}"
if [ "$CODE" != "201" ]; then
  echo "No se pudo crear el turno base (HTTP $CODE): $BODY" >&2
  exit 1
fi
ID_TURNO_BASE=$(echo "$BODY" | jq -r '.idTurno')
TURNOS_CREADOS+=("$ID_TURNO_BASE")
ok "turno base creado (idTurno=$ID_TURNO_BASE)"
echo ""

MITAD=$((DURACION / 2))

echo "--- Casos de solapamiento (deberían RECHAZARSE con 400) ---"

RESP=$(reservar "$BASE_INICIO" "duplicado exacto"); CODE="${RESP%%|*}"
[ "$CODE" == "400" ] && ok "1. duplicado exacto -> 400" || bad "1. duplicado exacto -> HTTP $CODE (esperaba 400)"

RESP=$(reservar "$(offset "$BASE_INICIO" "-$MITAD")" "solapa por la izquierda"); CODE="${RESP%%|*}"
[ "$CODE" == "400" ] && ok "2. solapa por la izquierda -> 400" || bad "2. solapa por la izquierda -> HTTP $CODE (esperaba 400)"

RESP=$(reservar "$(offset "$BASE_INICIO" "$MITAD")" "solapa por la derecha"); CODE="${RESP%%|*}"
[ "$CODE" == "400" ] && ok "3. solapa por la derecha -> 400" || bad "3. solapa por la derecha -> HTTP $CODE (esperaba 400)"

RESP=$(reservar "$(offset "$BASE_INICIO" "-10")" "contiene completamente al base"); CODE="${RESP%%|*}"
[ "$CODE" == "400" ] && ok "4. contiene completamente -> 400" || bad "4. contiene completamente -> HTTP $CODE (esperaba 400)"

RESP=$(reservar "$(offset "$BASE_INICIO" "5")" "anidado adentro del base"); CODE="${RESP%%|*}"
[ "$CODE" == "400" ] && ok "5. anidado adentro -> 400" || bad "5. anidado adentro -> HTTP $CODE (esperaba 400)"

echo ""
echo "--- Casos sin solapamiento real (deberían PERMITIRSE con 201) ---"

RESP=$(reservar "$(offset "$BASE_INICIO" "-$DURACION")" "pegado antes, sin tocarse"); CODE="${RESP%%|*}"; BODY="${RESP#*|}"
if [ "$CODE" == "201" ]; then ok "6. pegado antes -> 201"; TURNOS_CREADOS+=("$(echo "$BODY" | jq -r '.idTurno')")
else bad "6. pegado antes -> HTTP $CODE (esperaba 201): $BODY"; fi

RESP=$(reservar "$(offset "$BASE_INICIO" "$DURACION")" "pegado después, sin tocarse"); CODE="${RESP%%|*}"; BODY="${RESP#*|}"
if [ "$CODE" == "201" ]; then ok "7. pegado después -> 201"; TURNOS_CREADOS+=("$(echo "$BODY" | jq -r '.idTurno')")
else bad "7. pegado después -> HTTP $CODE (esperaba 201): $BODY"; fi

RESP=$(reservar "$(offset "$BASE_INICIO" "90")" "lejos, sin relación"); CODE="${RESP%%|*}"; BODY="${RESP#*|}"
if [ "$CODE" == "201" ]; then ok "8. lejos -> 201"; TURNOS_CREADOS+=("$(echo "$BODY" | jq -r '.idTurno')")
else bad "8. lejos -> HTTP $CODE (esperaba 201): $BODY"; fi

echo ""
echo "--- Casos cruzando estados (CANCELADO no bloquea, COMPLETADO sí) ---"

INICIO_CANCELADO="$(offset "$BASE_INICIO" "120")"
RESP=$(reservar "$INICIO_CANCELADO" "para cancelar"); CODE="${RESP%%|*}"; BODY="${RESP#*|}"
ID_PARA_CANCELAR=$(echo "$BODY" | jq -r '.idTurno // empty')
if [ "$CODE" == "201" ] && [ -n "$ID_PARA_CANCELAR" ]; then
  TURNOS_CREADOS+=("$ID_PARA_CANCELAR")
  psql_exec "UPDATE turnos SET estado = 'CANCELADO' WHERE \"idTurno\" = ${ID_PARA_CANCELAR};"
  RESP=$(reservar "$INICIO_CANCELADO" "mismo horario que uno cancelado"); CODE="${RESP%%|*}"; BODY="${RESP#*|}"
  if [ "$CODE" == "201" ]; then ok "9. mismo horario que CANCELADO -> 201 (no bloquea)"; TURNOS_CREADOS+=("$(echo "$BODY" | jq -r '.idTurno')")
  else bad "9. mismo horario que CANCELADO -> HTTP $CODE (esperaba 201): $BODY"; fi
else
  bad "9. no se pudo preparar el turno a cancelar (HTTP $CODE): $BODY"
fi

INICIO_COMPLETADO="$(offset "$BASE_INICIO" "150")"
RESP=$(reservar "$INICIO_COMPLETADO" "para completar"); CODE="${RESP%%|*}"; BODY="${RESP#*|}"
ID_PARA_COMPLETAR=$(echo "$BODY" | jq -r '.idTurno // empty')
if [ "$CODE" == "201" ] && [ -n "$ID_PARA_COMPLETAR" ]; then
  TURNOS_CREADOS+=("$ID_PARA_COMPLETAR")
  psql_exec "UPDATE turnos SET estado = 'COMPLETADO' WHERE \"idTurno\" = ${ID_PARA_COMPLETAR};"
  RESP=$(reservar "$INICIO_COMPLETADO" "mismo horario que uno completado"); CODE="${RESP%%|*}"
  [ "$CODE" == "400" ] && ok "10. mismo horario que COMPLETADO -> 400 (sí bloquea)" || bad "10. mismo horario que COMPLETADO -> HTTP $CODE (esperaba 400)"
else
  bad "10. no se pudo preparar el turno a completar (HTTP $CODE): $BODY"
fi

echo ""
echo "============================================================"
echo "Resultado: $PASS OK, $FAIL FAIL"
echo "============================================================"
if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
