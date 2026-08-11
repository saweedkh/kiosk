#!/bin/bash
# Entrypoint script for Django backend container

set -e

mkdir -p /app/logs /app/media

echo "Waiting for PostgreSQL at ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432} (db=${POSTGRES_DB:-kiosk} user=${POSTGRES_USER:-kiosk})..."
echo "Note: Docker 'healthy' only means pg_isready — Django still needs matching POSTGRES_PASSWORD (set once when the volume was first created)."
for i in $(seq 1 60); do
  # Capture real error (auth/host mismatch) instead of silent retries
  if err=$(python manage.py check --database default 2>&1); then
    echo "Database is ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "ERROR: Database did not become ready in time."
    echo "Last Django DB check error:"
    echo "$err"
    echo ""
    echo "Common fix: POSTGRES_PASSWORD in .env must match the password used when volume postgres_data was first initialized."
    echo "If this is a fresh install and data can be wiped: docker compose down && docker volume rm <project>_postgres_data && run.bat"
    exit 1
  fi
  # Print error every 5 attempts so logs explain the loop
  if [ $((i % 5)) -eq 1 ]; then
    echo "Attempt $i/60 – not ready yet:"
    echo "$err" | head -n 5
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

echo "Starting Gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 --workers 3 --timeout 120 config.wsgi:application
