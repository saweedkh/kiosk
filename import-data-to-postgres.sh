#!/bin/bash
# Step 2: Import a previously exported JSON fixture into PostgreSQL.
# Usage:
#   ./import-data-to-postgres.sh ./exports/kiosk_data_YYYYMMDD_HHMMSS.json
#   ./import-data-to-postgres.sh --keep-existing ./exports/kiosk_data_....json

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
JSON_PATH=""

for arg in "$@"; do
  case "$arg" in
    --keep-existing) KEEP_EXISTING=1 ;;
    -h|--help)
      echo "Usage: $0 [--keep-existing] path/to/kiosk_data_....json"
      exit 0
      ;;
    *)
      if [ -z "$JSON_PATH" ]; then
        JSON_PATH="$arg"
      else
        echo -e "${RED}Unexpected argument: $arg${NC}"
        exit 1
      fi
      ;;
  esac
done

if [ -z "$JSON_PATH" ]; then
  echo -e "${RED}Pass the export JSON path.${NC}"
  echo "Example: $0 ./exports/kiosk_data_20260101_120000.json"
  exit 1
fi

if [ ! -f "$JSON_PATH" ]; then
  echo -e "${RED}File not found: ${JSON_PATH}${NC}"
  exit 1
fi

echo -e "${GREEN}=== Import data into PostgreSQL ===${NC}"
echo "Source: ${JSON_PATH}"
echo

if ! docker ps --format '{{.Names}}' | grep -q "^${DB_CONTAINER}$"; then
  echo -e "${RED}Container ${DB_CONTAINER} is not running. Start Postgres first.${NC}"
  exit 1
fi

if ! docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$"; then
  echo -e "${RED}Container ${BACKEND_CONTAINER} is not running.${NC}"
  exit 1
fi

CONTAINER_INPUT="/tmp/kiosk_data_import.json"
echo -e "${YELLOW}Copying fixture into ${BACKEND_CONTAINER}...${NC}"
docker cp "$JSON_PATH" "${BACKEND_CONTAINER}:${CONTAINER_INPUT}"

CMD=(python manage.py import_data_to_postgres --input "${CONTAINER_INPUT}")
if [ "$KEEP_EXISTING" -eq 1 ]; then
  CMD+=(--keep-existing)
fi

echo -e "${YELLOW}Loading into PostgreSQL (flush unless --keep-existing)...${NC}"
docker exec "${BACKEND_CONTAINER}" "${CMD[@]}"

docker exec "${BACKEND_CONTAINER}" rm -f "${CONTAINER_INPUT}" 2>/dev/null || true

echo
echo -e "${GREEN}Import finished.${NC}"
echo -e "${YELLOW}Media/images are not in this JSON — keep backend_media or restore a media backup.${NC}"
