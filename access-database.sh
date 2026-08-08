#!/bin/bash

# اسکریپت دسترسی مستقیم به دیتابیس SQLite
# این اسکریپت دیتابیس را از Docker کپی می‌کند و دسترسی مستقیم می‌دهد

set -e

# رنگ‌ها برای خروجی
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

CONTAINER_NAME="kiosk_backend"
DB_PATH="/app/data/db.sqlite3"
LOCAL_DB="./db_local.sqlite3"

echo -e "${GREEN}=== دسترسی مستقیم به دیتابیس کیوسک ===${NC}\n"

# بررسی وجود کانتینر
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo -e "${RED}❌ کانتینر ${CONTAINER_NAME} در حال اجرا نیست!${NC}"
    echo "لطفاً ابتدا با دستور زیر کانتینر را راه‌اندازی کنید:"
    echo "docker-compose up -d"
    exit 1
fi

# کپی دیتابیس به سیستم محلی
echo -e "${YELLOW}📦 در حال کپی دیتابیس از کانتینر...${NC}"
docker cp "${CONTAINER_NAME}:${DB_PATH}" "${LOCAL_DB}"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ دیتابیس با موفقیت کپی شد: ${LOCAL_DB}${NC}\n"
    
    # بررسی وجود sqlite3
    if command -v sqlite3 &> /dev/null; then
        echo -e "${BLUE}💡 دستورات مفید SQLite:${NC}"
        echo "   .tables              - لیست جداول"
        echo "   .schema <table>      - ساختار جدول"
        echo "   .dump <table>        - خروجی SQL جدول"
        echo "   .quit                - خروج"
        echo ""
        echo -e "${YELLOW}📊 در حال باز کردن SQLite CLI...${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
        sqlite3 "${LOCAL_DB}"
    else
        echo -e "${YELLOW}⚠️  sqlite3 نصب نیست. می‌توانید از ابزارهای زیر استفاده کنید:${NC}"
        echo ""
        echo "1. DB Browser for SQLite (رایگان):"
        echo "   https://sqlitebrowser.org/"
        echo ""
        echo "2. VS Code Extension: SQLite Viewer"
        echo ""
        echo "3. نصب sqlite3:"
        echo "   macOS: brew install sqlite3"
        echo "   Ubuntu: sudo apt-get install sqlite3"
        echo ""
        echo -e "${GREEN}✅ فایل دیتابیس آماده است: ${LOCAL_DB}${NC}"
    fi
else
    echo -e "${RED}❌ خطا در کپی دیتابیس!${NC}"
    exit 1
fi

