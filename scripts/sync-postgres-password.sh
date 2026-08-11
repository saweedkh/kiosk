#!/bin/sh
# Run inside kiosk_db. Syncs role password to $POSTGRES_PASSWORD from env.
set -eu
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1 \
  -c "ALTER USER \"${POSTGRES_USER}\" WITH PASSWORD \$kpw\$${POSTGRES_PASSWORD}\$kpw\$;"
echo "OK: password synced for user=${POSTGRES_USER}"
