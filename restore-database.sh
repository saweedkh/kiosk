#!/bin/bash

# اسکریپت بازگردانی بکاپ دیتابیس SQLite
# استفاده: ./restore-database.sh <path-to-backup-file>

set -e

# رنگ‌ها برای خروجی
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

CONTAINER_NAME="kiosk_backend"
DB_PATH="/app/db.sqlite3"

echo -e "${GREEN}=== بازگردانی بکاپ دیتابیس کیوسک ===${NC}\n"

# بررسی آرگومان
if [ -z "$1" ]; then
    echo -e "${RED}❌ لطفاً مسیر فایل بکاپ را مشخص کنید!${NC}"
    echo "استفاده: $0 <path-to-backup-file>"
    echo "مثال: $0 ./backups/db_backup_20260101_120000.tar.gz"
    exit 1
fi

BACKUP_FILE="$1"

# بررسی وجود فایل بکاپ
if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ فایل بکاپ یافت نشد: ${BACKUP_FILE}${NC}"
    exit 1
fi

# بررسی وجود کانتینر
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}❌ کانتینر ${CONTAINER_NAME} در حال اجرا نیست!${NC}"
    echo "لطفاً ابتدا با دستور زیر کانتینر را راه‌اندازی کنید:"
    echo "docker-compose up -d"
    exit 1
fi

# استخراج فایل اگر فشرده است
TEMP_DIR=$(mktemp -d)
EXTRACTED_DB=""

if [[ "$BACKUP_FILE" == *.tar.gz ]]; then
    echo -e "${YELLOW}📦 در حال استخراج فایل فشرده...${NC}"
    tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"
    EXTRACTED_DB=$(find "$TEMP_DIR" -name "*.sqlite3" -type f | head -1)
elif [[ "$BACKUP_FILE" == *.zip ]]; then
    echo -e "${YELLOW}📦 در حال استخراج فایل ZIP...${NC}"
    unzip -q "$BACKUP_FILE" -d "$TEMP_DIR"
    EXTRACTED_DB=$(find "$TEMP_DIR" -name "*.sqlite3" -type f | head -1)
elif [[ "$BACKUP_FILE" == *.sqlite3 ]]; then
    EXTRACTED_DB="$BACKUP_FILE"
else
    echo -e "${RED}❌ فرمت فایل بکاپ پشتیبانی نمی‌شود!${NC}"
    echo "فرمت‌های پشتیبانی شده: .sqlite3, .tar.gz, .zip"
    exit 1
fi

if [ -z "$EXTRACTED_DB" ] || [ ! -f "$EXTRACTED_DB" ]; then
    echo -e "${RED}❌ فایل دیتابیس در بکاپ یافت نشد!${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# بکاپ از دیتابیس فعلی قبل از بازگردانی
echo -e "${YELLOW}💾 در حال گرفتن بکاپ از دیتابیس فعلی...${NC}"
BACKUP_BEFORE_RESTORE="./backups/db_backup_before_restore_$(date +%Y%m%d_%H%M%S).sqlite3"
mkdir -p backups
docker cp "${CONTAINER_NAME}:${DB_PATH}" "$BACKUP_BEFORE_RESTORE" 2>/dev/null || true

# توقف سرویس (اختیاری - برای اطمینان از عدم نوشتن همزمان)
echo -e "${YELLOW}⏸️  در حال توقف سرویس...${NC}"
docker-compose stop backend 2>/dev/null || true
sleep 2

# کپی فایل بکاپ به کانتینر
echo -e "${YELLOW}📤 در حال بازگردانی دیتابیس...${NC}"
docker cp "$EXTRACTED_DB" "${CONTAINER_NAME}:${DB_PATH}"

# تنظیم مجوزها
docker exec "${CONTAINER_NAME}" chmod 644 "${DB_PATH}" 2>/dev/null || true

# راه‌اندازی مجدد سرویس
echo -e "${YELLOW}▶️  در حال راه‌اندازی مجدد سرویس...${NC}"
docker-compose start backend 2>/dev/null || docker-compose up -d backend

# پاکسازی فایل‌های موقت
rm -rf "$TEMP_DIR"

echo -e "\n${GREEN}✅ دیتابیس با موفقیت بازگردانی شد!${NC}"
if [ -f "$BACKUP_BEFORE_RESTORE" ]; then
    echo -e "${YELLOW}💾 بکاپ قبلی در این مسیر ذخیره شد: ${BACKUP_BEFORE_RESTORE}${NC}"
fi

