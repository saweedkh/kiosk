#!/bin/bash
# One-shot: Docker Postgres + media → desktop SQLite (data/kiosk.db).
# Close the kiosk app first.
#
# Usage:
#   ./migrate-postgres-to-sqlite.sh
#   ./migrate-postgres-to-sqlite.sh /path/to/kiosk.db

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

SQLITE_PATH="${1:-${SCRIPT_DIR}/data/kiosk.db}"
MEDIA_DIR="$(dirname "$SQLITE_PATH")/media"
BACKEND_CONTAINER="kiosk_backend"

echo "=== Postgres (Docker) → SQLite ==="
echo "SQLite: ${SQLITE_PATH}"
echo "Media:  ${MEDIA_DIR}"
echo

"${SCRIPT_DIR}/export-postgres-data.sh"

LATEST=$(ls -t "${SCRIPT_DIR}"/exports/kiosk_postgres_*.json 2>/dev/null | head -1)
if [ -z "$LATEST" ]; then
  echo "Export JSON not found in exports/"
  exit 1
fi

echo
echo "Copying media from ${BACKEND_CONTAINER}..."
mkdir -p "${MEDIA_DIR}"
if docker ps --format '{{.Names}}' | grep -q "^${BACKEND_CONTAINER}$"; then
  docker cp "${BACKEND_CONTAINER}:/app/media/." "${MEDIA_DIR}/" || true
else
  echo "WARNING: ${BACKEND_CONTAINER} not running — skipped media copy."
fi

echo
"${SCRIPT_DIR}/import-data-to-sqlite.sh" "${LATEST}" "${SQLITE_PATH}"
