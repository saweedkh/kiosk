#!/bin/bash
# One-time migration: copy data from a legacy SQLite file into PostgreSQL.
# Usage:
#   ./migrate-sqlite-to-postgres.sh
#   ./migrate-sqlite-to-postgres.sh /path/to/db.sqlite3
#   ./migrate-sqlite-to-postgres.sh --keep-existing /path/to/db.sqlite3

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"


GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKEND_CONTAINER="kiosk_backend"
DB_CONTAINER="kiosk_db"
KEEP_EXISTING=0
SQLITE_HOST_PATH=""

for arg in "$@"; do
  case "$arg" in
    --keep-existing) KEEP_EXISTING=1 ;;
    -h|--help)
      echo "Usage: $0 [--keep-existing] [path/to/db.sqlite3]"
      exit 0
      ;;
    *)
      if [ -z "$SQLITE_HOST_PATH" ]; then
        SQLITE_HOST_PATH="$arg"
      else
        echo -e "${RED}Unexpected argument: $arg${NC}"
        exit 1
      fi
      ;;
  esac
done

if [ -z "$SQLITE_HOST_PATH" ]; then
  if [ -f "./kiosk_backend/db.sqlite3" ]; then
    SQLITE_HOST_PATH="./kiosk_backend/db.sqlite3"
  elif [ -f "./db.sqlite3" ]; then
    SQLITE_HOST_PATH="./db.sqlite3"
  else
    echo -e "${RED}SQLite file not found.${NC}"
    echo "Pass the path explicitly, e.g.:"
    echo "  $0 ./kiosk_backend/db.sqlite3"
    echo "Or copy it out of the old Docker volume first."
    exit 1
  fi
fi

if [ ! -f "$SQLITE_HOST_PATH" ]; then
  echo -e "${RED}File not found: ${SQLITE_HOST_PATH}${NC}"
  exit 1
fi

echo -e "${GREEN}=== Migrate SQLite → PostgreSQL ===${NC}"
echo "Source: ${SQLITE_HOST_PATH}"
echo

if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo -e "${RED}Container ${DB_CONTAINER} is not running. Start the stack first.${NC}"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$"; then
  echo -e "${RED}Container ${BACKEND_CONTAINER} is not running. Start the stack first.${NC}"
  exit 1
fi

echo -e "${YELLOW}Copying SQLite file into ${BACKEND_CONTAINER}...${NC}"
docker cp "$SQLITE_HOST_PATH" "${BACKEND_CONTAINER}:/tmp/db.sqlite3"

CMD=(python manage.py migrate_sqlite_to_postgres --sqlite-path /tmp/db.sqlite3)
if [ "$KEEP_EXISTING" -eq 1 ]; then
  CMD+=(--keep-existing)
fi

echo -e "${YELLOW}Running import (Postgres data will be flushed unless --keep-existing)...${NC}"
docker exec "${BACKEND_CONTAINER}" "${CMD[@]}"

docker exec "${BACKEND_CONTAINER}" rm -f /tmp/db.sqlite3 /tmp/kiosk_sqlite_export.json 2>/dev/null || true

echo
echo -e "${GREEN}Done.${NC}"
echo -e "${YELLOW}Media/images are NOT inside SQLite. Keep volume backend_media or restore a media backup.${NC}"
