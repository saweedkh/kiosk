#!/bin/bash
# Step 1: Export data from SQLite inside the backend container → JSON on the host.
# Usage:
#   ./export-sqlite-data.sh
#   ./export-sqlite-data.sh /path/to/db.sqlite3   # if file is on the host, copy it in first

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"


GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

BACKEND_CONTAINER="kiosk_backend"
EXPORT_DIR="./exports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
HOST_OUTPUT="${EXPORT_DIR}/kiosk_data_${TIMESTAMP}.json"
CONTAINER_SQLITE="/app/db.sqlite3"
CONTAINER_OUTPUT="/tmp/kiosk_data_export.json"
HOST_SQLITE="${1:-}"

echo -e "${GREEN}=== Export SQLite data from container ===${NC}"
echo

if ! docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$"; then
  echo -e "${RED}Container ${BACKEND_CONTAINER} is not running.${NC}"
  exit 1
fi

mkdir -p "${EXPORT_DIR}"

if [ -n "$HOST_SQLITE" ]; then
  if [ ! -f "$HOST_SQLITE" ]; then
    echo -e "${RED}File not found: ${HOST_SQLITE}${NC}"
    exit 1
  fi
  echo -e "${YELLOW}Copying host SQLite into container...${NC}"
  docker cp "$HOST_SQLITE" "${BACKEND_CONTAINER}:/tmp/db.sqlite3"
  CONTAINER_SQLITE="/tmp/db.sqlite3"
else
  echo -e "${YELLOW}Looking for ${CONTAINER_SQLITE} inside ${BACKEND_CONTAINER}...${NC}"
  if ! docker exec "${BACKEND_CONTAINER}" test -f "${CONTAINER_SQLITE}"; then
    echo -e "${RED}No SQLite file at ${CONTAINER_SQLITE} in the container.${NC}"
    echo "Pass a host path instead, e.g.:"
    echo "  $0 ./kiosk_backend/db.sqlite3"
    echo "Or copy from the old volume:"
    echo "  docker run --rm -v kiosk_backend_db:/from -v \"\$PWD\":/to alpine cp /from/db.sqlite3 /to/db.sqlite3"
    exit 1
  fi
fi

echo -e "${YELLOW}Dumping data inside container...${NC}"
docker exec "${BACKEND_CONTAINER}" python manage.py export_sqlite_data \
  --sqlite-path "${CONTAINER_SQLITE}" \
  --output "${CONTAINER_OUTPUT}"

echo -e "${YELLOW}Copying JSON out to host...${NC}"
docker cp "${BACKEND_CONTAINER}:${CONTAINER_OUTPUT}" "${HOST_OUTPUT}"
docker exec "${BACKEND_CONTAINER}" rm -f "${CONTAINER_OUTPUT}" 2>/dev/null || true

echo
echo -e "${GREEN}Export saved:${NC} ${HOST_OUTPUT}"
echo -e "Size: $(du -h "${HOST_OUTPUT}" | cut -f1)"
echo
echo -e "${YELLOW}Later, after Postgres is up, import with:${NC}"
echo "  ./import-data-to-postgres.sh ${HOST_OUTPUT}"
