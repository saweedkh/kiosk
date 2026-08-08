#!/bin/bash
# Restore PostgreSQL dump + media from a kiosk backup archive
# Usage: ./restore-database.sh ./backups/kiosk_backup_YYYYMMDD_HHMMSS.tar.gz

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"


GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DB_CONTAINER="kiosk_db"
BACKEND_CONTAINER="kiosk_backend"
BOT_CONTAINER="kiosk_bale_bot"

if [ -z "$1" ]; then
  echo -e "${RED}مسیر فایل بکاپ را بدهید.${NC}"
  echo "مثال: $0 ./backups/kiosk_backup_20260101_120000.tar.gz"
  exit 1
fi

BACKUP_FILE="$1"
if [ ! -f "$BACKUP_FILE" ]; then
  echo -e "${RED}فایل یافت نشد: ${BACKUP_FILE}${NC}"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo -e "${RED}کانتینر ${DB_CONTAINER} در حال اجرا نیست.${NC}"
  exit 1
fi

COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  COMPOSE="docker-compose"
fi

echo -e "${GREEN}=== بازگردانی بکاپ کیوسک ===${NC}\n"

# Safety backup of current state
echo -e "${YELLOW}بکاپ ایمنی از وضعیت فعلی...${NC}"
./backup-database.sh || echo -e "${YELLOW}بکاپ ایمنی ناموفق بود؛ ادامه می‌دهیم...${NC}"

TEMP_DIR=$(mktemp -d)
cleanup() { rm -rf "$TEMP_DIR"; }
trap cleanup EXIT

echo -e "${YELLOW}استخراج آرشیو...${NC}"
if [[ "$BACKUP_FILE" == *.tar.gz ]] || [[ "$BACKUP_FILE" == *.tgz ]]; then
  tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
elif [[ "$BACKUP_FILE" == *.zip ]]; then
  unzip -q "$BACKUP_FILE" -d "$TEMP_DIR"
else
  echo -e "${RED}فرمت پشتیبانی نمی‌شود (tar.gz / zip).${NC}"
  exit 1
fi

DUMP_FILE=$(find "$TEMP_DIR" -name 'database.dump' -type f | head -1)
MEDIA_DIR=$(find "$TEMP_DIR" -type d -name 'media' | head -1)

if [ -z "$DUMP_FILE" ] || [ ! -f "$DUMP_FILE" ]; then
  echo -e "${RED}database.dump داخل بکاپ پیدا نشد.${NC}"
  exit 1
fi

echo -e "${YELLOW}توقف backend و bale_bot...${NC}"
$COMPOSE stop backend bale_bot 2>/dev/null || true
docker stop "$BACKEND_CONTAINER" "$BOT_CONTAINER" 2>/dev/null || true
sleep 2

echo -e "${YELLOW}بازگردانی PostgreSQL...${NC}"
docker cp "$DUMP_FILE" "${DB_CONTAINER}:/tmp/restore.dump"
docker exec "${DB_CONTAINER}" sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists --no-owner --no-acl /tmp/restore.dump' \
  || echo -e "${YELLOW}pg_restore با هشدار تمام شد (معمولاً بی‌ضرر است).${NC}"
docker exec "${DB_CONTAINER}" rm -f /tmp/restore.dump

if [ -n "$MEDIA_DIR" ] && [ -d "$MEDIA_DIR" ]; then
  echo -e "${YELLOW}بازگردانی media...${NC}"
  # Ensure backend is up enough to receive files, or use a temp container on the volume.
  $COMPOSE start backend 2>/dev/null || $COMPOSE up -d backend
  # Wait briefly for container
  for i in $(seq 1 30); do
    docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$" && break
    sleep 1
  done
  docker exec "${BACKEND_CONTAINER}" sh -c 'rm -rf /app/media/* /app/media/.[!.]* 2>/dev/null || true'
  docker cp "${MEDIA_DIR}/." "${BACKEND_CONTAINER}:/app/media/"
else
  echo -e "${YELLOW}پوشه media در بکاپ نبود؛ رد شد.${NC}"
  $COMPOSE start backend 2>/dev/null || $COMPOSE up -d backend
fi

echo -e "${YELLOW}راه‌اندازی مجدد سرویس‌ها...${NC}"
$COMPOSE up -d backend bale_bot 2>/dev/null || true

echo -e "\n${GREEN}بازگردانی انجام شد.${NC}"
