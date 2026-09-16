#!/usr/bin/env bash
set -euo pipefail

# Backup diario de la base de datos a un remoto de rclone (pensado para
# Cloudflare R2, pero funciona con cualquier remoto S3-compatible).
# Corre al lado de docker-compose.prod.yml y .env.production, vía cron.
#
# Requisitos previos (una sola vez, por servidor):
#   1. rclone instalado: curl https://rclone.org/install.sh | sudo bash
#   2. Un remoto configurado con `rclone config`, llamado "r2"
#      (o el nombre que pongas en RCLONE_REMOTE más abajo)
#   3. Completar BUCKET más abajo con el nombre real del bucket
#
# Uso: ./scripts/backup-db.sh
# Cron sugerido (diario a las 3am): 0 3 * * * /ruta/al/repo/scripts/backup-db.sh >> /var/log/backup-db.log 2>&1

cd "$(dirname "$0")/.."

set -a
source .env.production
set +a

RCLONE_REMOTE="r2"
BUCKET="${RCLONE_REMOTE}:completar-con-tu-bucket"

FECHA=$(date +%Y-%m-%d_%H%M)
ARCHIVO="backup_${DB_NAME}_${FECHA}.sql.gz"
TMP="/tmp/${ARCHIVO}"

DB_CONTAINER=$(docker compose -f docker-compose.prod.yml ps -q db)

if [ -z "$DB_CONTAINER" ]; then
  echo "Error: no se encontró el contenedor 'db' corriendo." >&2
  exit 1
fi

echo "[$(date)] Generando dump de ${DB_NAME}..."
docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$TMP"

echo "[$(date)] Subiendo a ${BUCKET}..."
rclone copy "$TMP" "$BUCKET"

rm -f "$TMP"

# Avisa que el backup corrió bien, si se configuró un ping de monitoreo
# (ej. healthchecks.io, gratis). Sin esto, un backup roto puede pasar
# meses sin que nadie lo note.
if [ -n "${BACKUP_HEALTHCHECK_URL:-}" ]; then
  curl -fsS -m 10 --retry 3 "$BACKUP_HEALTHCHECK_URL" >/dev/null || true
fi

echo "[$(date)] Backup completado: ${ARCHIVO}"
