#!/bin/bash

# اسکریپت بکاپ دیتابیس SQLite
# این اسکریپت دیتابیس را از Docker کانتینر کپی می‌کند و بکاپ می‌گیرد

set -e

# رنگ‌ها برای خروجی
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

CONTAINER_NAME="kiosk_backend"
DB_PATH="/app/db.sqlite3"
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/db_backup_${TIMESTAMP}.sqlite3"
BACKUP_FILE_COMPRESSED="${BACKUP_DIR}/db_backup_${TIMESTAMP}.tar.gz"

echo -e "${GREEN}=== بکاپ دیتابیس کیوسک ===${NC}\n"

# بررسی وجود کانتینر
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}❌ کانتینر ${CONTAINER_NAME} در حال اجرا نیست!${NC}"
    echo "لطفاً ابتدا با دستور زیر کانتینر را راه‌اندازی کنید:"
    echo "docker-compose up -d"
    exit 1
fi

# ایجاد پوشه بکاپ
mkdir -p "${BACKUP_DIR}"

echo -e "${YELLOW}📦 در حال کپی دیتابیس از کانتینر...${NC}"
docker cp "${CONTAINER_NAME}:${DB_PATH}" "${BACKUP_FILE}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ دیتابیس با موفقیت کپی شد: ${BACKUP_FILE}${NC}"
    
    # فشرده‌سازی
    echo -e "${YELLOW}🗜️  در حال فشرده‌سازی...${NC}"
    tar -czf "${BACKUP_FILE_COMPRESSED}" -C "${BACKUP_DIR}" "db_backup_${TIMESTAMP}.sqlite3"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ فایل فشرده شده ایجاد شد: ${BACKUP_FILE_COMPRESSED}${NC}"
        rm "${BACKUP_FILE}"  # حذف فایل غیرفشرده
        echo -e "${GREEN}📊 حجم فایل: $(du -h "${BACKUP_FILE_COMPRESSED}" | cut -f1)${NC}"
    else
        echo -e "${YELLOW}⚠️  فشرده‌سازی انجام نشد، فایل اصلی باقی ماند${NC}"
    fi
    
    # نمایش لیست بکاپ‌های موجود
    echo -e "\n${GREEN}📋 لیست بکاپ‌های موجود:${NC}"
    ls -lh "${BACKUP_DIR}"/*.tar.gz 2>/dev/null | tail -5 || echo "هیچ بکاپ فشرده‌ای یافت نشد"
    ls -lh "${BACKUP_DIR}"/*.sqlite3 2>/dev/null | tail -5 || echo "هیچ بکاپ SQLite یافت نشد"
    
    echo -e "\n${GREEN}✅ بکاپ با موفقیت انجام شد!${NC}"
    echo -e "${YELLOW}💡 برای بازگردانی بکاپ از دستور زیر استفاده کنید:${NC}"
    echo "   ./restore-database.sh ${BACKUP_FILE_COMPRESSED}"
else
    echo -e "${RED}❌ خطا در کپی دیتابیس!${NC}"
    exit 1
fi

