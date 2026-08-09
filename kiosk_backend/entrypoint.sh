#!/bin/bash
# Entrypoint script for Django backend container

set -e

mkdir -p /app/logs /app/media

echo "Waiting for PostgreSQL..."
for i in $(seq 1 60); do
  if python manage.py check --database default >/dev/null 2>&1; then
    echo "Database is ready."
    break
  fi
  if [ "$i" -eq 60 ]; then
    echo "ERROR: Database did not become ready in time."
    exit 1
  fi
  echo "Attempt $i/60 – retrying in 2s..."
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
