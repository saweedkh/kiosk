#!/bin/bash
# Entrypoint script for Django backend container

set -e

mkdir -p /app/logs /app/media

# Pure DB probe — do NOT use `manage.py check` here.
# Full system checks can fail for non-DB reasons and look like "Postgres not ready".
db_ping() {
  python - <<'PY'
import os, sys
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
import django
django.setup()
from django.db import connection
try:
    connection.ensure_connection()
except Exception as exc:
    print(f"{type(exc).__name__}: {exc}", file=sys.stderr)
    sys.exit(1)
print("ok")
PY
}

echo "Waiting for PostgreSQL at ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432} (db=${POSTGRES_DB:-kiosk} user=${POSTGRES_USER:-kiosk})..."
echo "Note: Docker 'healthy' only means pg_isready — Django still needs matching POSTGRES_PASSWORD."
for i in $(seq 1 60); do
  if err=$(db_ping 2>&1); then
    echo "Database is ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "ERROR: Database did not become ready in time."
    echo "Last connection error:"
    echo "$err"
    echo ""
    echo "Common fix: POSTGRES_PASSWORD in .env must match the password baked into volume postgres_data."
    echo "On Windows delivery: run reset-db-and-run.bat  (wipes DB volume) or fix-backend-db.bat"
    exit 1
  fi
  if [ $((i % 5)) -eq 1 ]; then
    echo "Attempt $i/60 – not ready yet:"
    echo "$err" | head -n 8
  else
    echo "Attempt $i/60 – retrying in 2s..."
  fi
  sleep 2
done

# Custom command (e.g. bale_poll): skip migrate/collectstatic to avoid races with backend
if [ "$#" -gt 0 ]; then
  echo "Starting: $*"
  exec "$@"
fi

echo "Running migrations..."
python manage.py migrate --noinput

echo "Setting up permission groups..."
python manage.py setup_permission_groups || true

# Idempotent: only fills an empty catalog (skip with SEED_DEMO_DATA=0)
if [ "${SEED_DEMO_DATA:-1}" != "0" ]; then
  echo "Seeding demo data (if catalog empty)..."
  python manage.py seed_demo_data || true
fi

echo "Collecting static files..."
python manage.py collectstatic --noinput || true

echo "Payment gateway: PAYMENT_GATEWAY_NAME=${PAYMENT_GATEWAY_NAME:-} POS_USE_BRIDGE=${POS_USE_BRIDGE:-}"
python manage.py show_pos_config || true

echo "Starting Gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 --workers 3 --timeout 120 config.wsgi:application
