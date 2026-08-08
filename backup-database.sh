#!/bin/bash
# Backup PostgreSQL database + media files from running Docker stack

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"


GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DB_CONTAINER="kiosk_db"
BACKEND_CONTAINER="kiosk_backend"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
STAGING_DIR="${BACKUP_DIR}/kiosk_backup_${TIMESTAMP}"
ARCHIVE_FILE="${BACKUP_DIR}/kiosk_backup_${TIMESTAMP}.tar.gz"

echo -e "${GREEN}=== بکاپ کیوسک (PostgreSQL + تصاویر) ===${NC}\n"

if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo -e "${RED}کانتینر ${DB_CONTAINER} در حال اجرا نیست.${NC}"
  echo "ابتدا: docker compose up -d"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$"; then
  echo -e "${RED}کانتینر ${BACKEND_CONTAINER} در حال اجرا نیست (برای media لازم است).${NC}"
  exit 1
fi

mkdir -p "${STAGING_DIR}/media"

echo -e "${YELLOW}در حال گرفتن dump از PostgreSQL...${NC}"
docker exec "${DB_CONTAINER}" sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/kiosk.dump'
docker cp "${DB_CONTAINER}:/tmp/kiosk.dump" "${STAGING_DIR}/database.dump"
docker exec "${DB_CONTAINER}" rm -f /tmp/kiosk.dump
echo -e "${GREEN}database.dump آماده شد${NC}"

echo -e "${YELLOW}در حال کپی media (تصاویر)...${NC}"
# Copy contents; empty media is fine
docker cp "${BACKEND_CONTAINER}:/app/media/." "${STAGING_DIR}/media/" 2>/dev/null || true
echo -e "${GREEN}media کپی شد${NC}"

echo -e "${YELLOW}در حال فشرده‌سازی...${NC}"
tar -czf "${ARCHIVE_FILE}" -C "${BACKUP_DIR}" "kiosk_backup_${TIMESTAMP}"
rm -rf "${STAGING_DIR}"

echo -e "\n${GREEN}بکاپ آماده شد: ${ARCHIVE_FILE}${NC}"
echo -e "حجم: $(du -h "${ARCHIVE_FILE}" | cut -f1)"
echo -e "${YELLOW}بازگردانی: ./restore-database.sh ${ARCHIVE_FILE}${NC}"
