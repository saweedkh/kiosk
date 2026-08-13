#!/bin/bash
# Export kiosk data from Docker PostgreSQL → JSON on the host.
# Works with the running kiosk_backend container (uses built-in dumpdata).
#
# Usage:
#   ./export-postgres-data.sh

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
HOST_OUTPUT="${EXPORT_DIR}/kiosk_postgres_${TIMESTAMP}.json"
CONTAINER_OUTPUT="/tmp/kiosk_postgres_export.json"

echo -e "${GREEN}=== Export PostgreSQL data from Docker ===${NC}"
echo

if ! docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$"; then
  echo -e "${RED}Container ${BACKEND_CONTAINER} is not running.${NC}"
  echo "Start the old stack first: docker compose up -d"
  exit 1
fi

mkdir -p "${EXPORT_DIR}"

echo -e "${YELLOW}Dumping Postgres inside ${BACKEND_CONTAINER}...${NC}"
# dumpdata is built-in — works even if this repo's new management command is not in the image yet.
docker exec "${BACKEND_CONTAINER}" python manage.py dumpdata \
  --natural-foreign \
  --natural-primary \
  --indent 2 \
  -e contenttypes.contenttype \
  -e auth.permission \
  -e admin.logentry \
  -e sessions.session \
  -e token_blacklist.outstandingtoken \
  -e token_blacklist.blacklistedtoken \
  --output "${CONTAINER_OUTPUT}"

echo -e "${YELLOW}Copying JSON to host...${NC}"
docker cp "${BACKEND_CONTAINER}:${CONTAINER_OUTPUT}" "${HOST_OUTPUT}"
docker exec "${BACKEND_CONTAINER}" rm -f "${CONTAINER_OUTPUT}" 2>/dev/null || true

ABS_OUTPUT="$(cd "$(dirname "${HOST_OUTPUT}")" && pwd)/$(basename "${HOST_OUTPUT}")"

echo
echo "=========================================="
echo -e "${GREEN}EXPORT OK${NC}"
echo "File: ${ABS_OUTPUT}"
echo "Size: $(du -h "${HOST_OUTPUT}" | cut -f1)"
echo "=========================================="
echo
echo -e "${YELLOW}Next:${NC}"
echo "  ./import-data-to-sqlite.sh ${HOST_OUTPUT}"
echo
echo "Also copy images:"
echo "  mkdir -p data/media && docker cp ${BACKEND_CONTAINER}:/app/media/. data/media/"
