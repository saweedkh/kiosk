#!/bin/bash
# Entrypoint script for Django backend container

set -e

mkdir -p /app/data /app/logs /app/media

echo "Waiting for database to be ready..."
python manage.py check --database default || sleep 5

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput || true

echo "Starting Gunicorn..."
exec gunicorn --bind 0.0.0.0:8000 --workers 3 --timeout 120 config.wsgi:application

