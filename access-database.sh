#!/bin/bash
# Open an interactive psql shell inside the Postgres container

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"


GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

DB_CONTAINER="kiosk_db"

echo -e "${GREEN}=== دسترسی به PostgreSQL کیوسک ===${NC}\n"

if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo -e "${RED}کانتینر ${DB_CONTAINER} در حال اجرا نیست.${NC}"
  echo "ابتدا: docker compose up -d"
  exit 1
fi

echo -e "${BLUE}دستورات مفید:${NC}"
echo "  \\dt              لیست جداول"
echo "  \\d+ tablename    جزئیات جدول"
echo "  \\q               خروج"
echo ""
echo -e "${YELLOW}ورود به psql...${NC}"
docker exec -it "${DB_CONTAINER}" sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"'
