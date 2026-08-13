#!/bin/bash
# Import a Postgres JSON export into the desktop SQLite DB.
# Close kiosk.exe first — SQLite cannot import while the app holds the file.
#
# Usage:
#   ./import-data-to-sqlite.sh ./exports/kiosk_postgres_YYYYMMDD_HHMMSS.json
#   ./import-data-to-sqlite.sh ./exports/foo.json /path/to/kiosk.db

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

JSON_PATH="${1:-}"
SQLITE_PATH="${2:-}"

if [ -z "$JSON_PATH" ]; then
  echo -e "${RED}Pass the export JSON path.${NC}"
  echo "Example: $0 ./exports/kiosk_postgres_20260813_120000.json"
  exit 1
fi

if [ ! -f "$JSON_PATH" ]; then
  echo -e "${RED}File not found: ${JSON_PATH}${NC}"
  exit 1
fi

if [ -z "$SQLITE_PATH" ]; then
  SQLITE_PATH="${SCRIPT_DIR}/data/kiosk.db"
fi

PYTHON="${SCRIPT_DIR}/kiosk_backend/.venv/bin/python"
if [ ! -x "$PYTHON" ]; then
  PYTHON="python3"
fi

echo -e "${GREEN}=== Import Postgres dump into SQLite ===${NC}"
echo "JSON:    ${JSON_PATH}"
echo "SQLite:  ${SQLITE_PATH}"
echo

mkdir -p "$(dirname "$SQLITE_PATH")"

echo -e "${YELLOW}Loading (this replaces existing SQLite rows)...${NC}"
DJANGO_SETTINGS_MODULE=config.settings.desktop \
SEED_DEMO_DATA=0 \
PAYMENT_GATEWAY_NAME=mock \
"$PYTHON" "${SCRIPT_DIR}/kiosk_backend/manage.py" import_data_to_sqlite \
  --input "${JSON_PATH}" \
  --sqlite-path "${SQLITE_PATH}"

echo
echo -e "${GREEN}Import finished.${NC}"
echo "Copy images if you have not already:"
echo "  mkdir -p $(dirname "$SQLITE_PATH")/media"
echo "  docker cp kiosk_backend:/app/media/. $(dirname "$SQLITE_PATH")/media/"
echo
echo "Windows EXE DB is usually:"
echo "  %APPDATA%\\com.kiosk.app\\kiosk.db"
echo "  %APPDATA%\\com.kiosk.app\\media"
