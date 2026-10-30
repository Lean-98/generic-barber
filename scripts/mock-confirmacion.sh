#!/usr/bin/env bash
# ============================================================
# Mock: circuito de notificación de CONFIRMACIÓN de turno
# ============================================================
# A diferencia de mock-recordatorios.sql (que inserta turnos directo
# en la base y solo puede probar el RECORDATORIO), este script prueba
# la CONFIRMACIÓN real: llama al endpoint público de reserva
# (POST /api/turnos-publicos/reservar), el mismo que usa el sitio
# cuando un cliente reserva desde /reservar. Eso ejecuta
# turnos.service.ts de punta a punta, incluido el mail de
# confirmación — algo que una inserción SQL no puede disparar.
#
# Requiere: el backend corriendo y respondiendo en API_URL, y jq
# instalado (se usa para parsear las respuestas).
#
# USO:
#   EMAIL=tu-mail-real@ejemplo.com ./scripts/mock-confirmacion.sh
#
# Variables opcionales (con sus defaults):
#   API_URL=http://localhost:3000/api
#   DB_CONTAINER=peluqueria-db
#   DB_USER=peluquero
#   DB_NAME=peluqueria
#
# LIMPIEZA: el turno queda con observacion = 'MOCK-CONFIRMACION-SCRIPT',
# para borrarlo:
#   docker exec -i peluqueria-db psql -U peluquero -d peluqueria -c "
#     DELETE FROM turno_detalles WHERE \"idTurno\" IN (SELECT \"idTurno\" FROM turnos WHERE observacion = 'MOCK-CONFIRMACION-SCRIPT');
#     DELETE FROM turnos WHERE observacion = 'MOCK-CONFIRMACION-SCRIPT';
#     DELETE FROM personas WHERE mail = 'tu-mail-real@ejemplo.com' AND nombre = 'Mock' AND apellido = 'Confirmacion';
#   "
#   (sacá la última línea si esa persona ya existía por otro motivo).
# ============================================================

set -euo pipefail

API_URL="${API_URL:-http://localhost:3000/api}"
DB_CONTAINER="${DB_CONTAINER:-peluqueria-db}"
DB_USER="${DB_USER:-peluquero}"
DB_NAME="${DB_NAME:-peluqueria}"

if [ -z "${EMAIL:-}" ]; then
  echo "Falta EMAIL. Uso: EMAIL=tu-mail@ejemplo.com ./scripts/mock-confirmacion.sh" >&2
  exit 1
fi

echo "Buscando un servicio vigente en la base..."
ID_SERVICIO=$(docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c \
  "SELECT \"idServicio\" FROM servicios WHERE vigente = true ORDER BY \"idServicio\" LIMIT 1;")

if [ -z "$ID_SERVICIO" ]; then
  echo "No hay ningún servicio vigente en la base, no se puede reservar." >&2
  exit 1
fi
echo "Usando idServicio=$ID_SERVICIO"

FECHA=$(date -d "+3 days" +%F)
echo "Consultando disponibilidad para $FECHA..."
DISP=$(curl -s -w '\n%{http_code}' "$API_URL/turnos-publicos/disponibilidad?fecha=$FECHA&servicios=$ID_SERVICIO")
DISP_CODE=$(echo "$DISP" | tail -n1)
DISP_BODY=$(echo "$DISP" | sed '$d')

if [ "$DISP_CODE" != "200" ]; then
  echo "Falló la consulta de disponibilidad (HTTP $DISP_CODE): $DISP_BODY" >&2
  exit 1
fi

SLOT=$(echo "$DISP_BODY" | jq -r '.slots[0] // empty')
if [ -z "$SLOT" ]; then
  echo "No hay horarios libres el $FECHA. Editá la variable FECHA en el script y probá otro día." >&2
  exit 1
fi
echo "Horario elegido: $SLOT"

echo "Reservando turno de prueba para $EMAIL..."
RESERVA=$(curl -s -w '\n%{http_code}' -X POST "$API_URL/turnos-publicos/reservar" \
  -H "Content-Type: application/json" \
  -d "{\"nombre\":\"Mock\",\"apellido\":\"Confirmacion\",\"email\":\"$EMAIL\",\"fechaHoraInicio\":\"$SLOT\",\"observacion\":\"MOCK-CONFIRMACION-SCRIPT\",\"servicios\":[{\"idServicio\":$ID_SERVICIO}]}")
RESERVA_CODE=$(echo "$RESERVA" | tail -n1)
RESERVA_BODY=$(echo "$RESERVA" | sed '$d')

echo "$RESERVA_BODY" | jq . 2>/dev/null || echo "$RESERVA_BODY"

if [ "$RESERVA_CODE" != "201" ]; then
  echo "Falló la reserva (HTTP $RESERVA_CODE)." >&2
  exit 1
fi

echo ""
echo "Listo. El turno se creó para el $SLOT. Revisá la bandeja de $EMAIL: el mail de confirmación se manda en el mismo request, así que ya debería estar ahí."
