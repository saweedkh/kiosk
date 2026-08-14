#!/bin/bash
# Import a Postgres JSON export into desktop SQLite.
# Postgres / kiosk_db is NOT required — only the JSON + kiosk_backend.
# Import runs inside Docker so a local Django venv is not needed.
#
# Usage:
#   ./import-data-to-sqlite.sh
#   ./import-data-to-sqlite.sh ./exports/kiosk_postgres_YYYYMMDD_HHMMSS.json
#   ./import-data-to-sqlite.sh ./exports/foo.json /path/to/kiosk.db

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKEND_CONTAINER="kiosk_backend"
HELPER="${SCRIPT_DIR}/kiosk_backend/scripts/import_fixture_to_sqlite.py"
JSON_PATH="${1:-}"
SQLITE_PATH="${2:-}"

if [ -z "$JSON_PATH" ]; then
  JSON_PATH=$(ls -t "${SCRIPT_DIR}"/exports/kiosk_postgres_*.json 2>/dev/null | head -1 || true)
fi

if [ -z "$JSON_PATH" ] || [ ! -f "$JSON_PATH" ]; then
  echo -e "${RED}JSON not found.${NC}"
  echo "First:  ./export-postgres-data.sh"
  echo "Then:   $0 ./exports/kiosk_postgres_YYYYMMDD_HHMMSS.json"
  exit 1
fi

if [ -z "$SQLITE_PATH" ]; then
  SQLITE_PATH="${SCRIPT_DIR}/data/kiosk.db"
fi

if [ ! -f "$HELPER" ]; then
  echo -e "${RED}Missing helper: ${HELPER}${NC}"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$"; then
  echo -e "${RED}Container ${BACKEND_CONTAINER} is not running.${NC}"
  echo "Postgres can stay down. Only backend is needed:"
  echo "  docker compose up -d backend"
  exit 1
fi

echo -e "${GREEN}=== Import JSON → SQLite ===${NC}"
echo "JSON:    ${JSON_PATH}"
echo "SQLite:  ${SQLITE_PATH}"
echo

mkdir -p "$(dirname "$SQLITE_PATH")"
rm -f "${SQLITE_PATH}" "${SQLITE_PATH}-wal" "${SQLITE_PATH}-shm" "${SQLITE_PATH}-journal"

echo -e "${YELLOW}Loading inside ${BACKEND_CONTAINER}...${NC}"
docker cp "${JSON_PATH}" "${BACKEND_CONTAINER}:/tmp/kiosk_postgres_import.json"
docker cp "${HELPER}" "${BACKEND_CONTAINER}:/tmp/import_fixture_to_sqlite.py"
docker exec "${BACKEND_CONTAINER}" python /tmp/import_fixture_to_sqlite.py \
  /tmp/kiosk_postgres_import.json /tmp/kiosk.db
docker cp "${BACKEND_CONTAINER}:/tmp/kiosk.db" "${SQLITE_PATH}"
printf 'postgres\n' > "$(dirname "$SQLITE_PATH")/no_demo_seed"
docker exec "${BACKEND_CONTAINER}" rm -f \
  /tmp/kiosk_postgres_import.json /tmp/kiosk.db /tmp/import_fixture_to_sqlite.py 2>/dev/null || true

echo
echo -e "${GREEN}Import finished.${NC}"
echo "DB: ${SQLITE_PATH}"
echo
echo "Windows EXE DB is usually:"
echo "  %APPDATA%\\com.kiosk.desktop\\kiosk.db"
echo "  %APPDATA%\\com.kiosk.desktop\\media"
