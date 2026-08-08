#!/bin/bash
# Build the delivery package (images + scripts + docs, no source)

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=========================================="
echo "Creating Delivery Package"
echo "=========================================="

PACKAGE_NAME="kiosk-app"
PACKAGE_DIR="./delivery-package"

echo "Cleaning up old package..."
rm -rf "$PACKAGE_DIR"
rm -f "${PACKAGE_NAME}.zip"
mkdir -p "$PACKAGE_DIR"

echo ""
echo "Step 1: Building Docker images..."
./build-images.sh

echo ""
echo "Step 2: Copying files to package..."

echo "[compose]"
cp docker-compose.production.yml "$PACKAGE_DIR/docker-compose.yml"
cp docker-compose.production.host-network.yml "$PACKAGE_DIR/"

echo "[startup scripts]"
cp run.bat stop.bat exit-kiosk.bat setup-startup.bat "$PACKAGE_DIR/"

echo "[database scripts]"
cp backup-database.bat restore-database.bat access-database.bat "$PACKAGE_DIR/"
cp export-sqlite-data.bat import-data-to-postgres.bat migrate-sqlite-to-postgres.bat "$PACKAGE_DIR/"
cp backup-database.sh restore-database.sh access-database.sh "$PACKAGE_DIR/" 2>/dev/null || true
cp export-sqlite-data.sh import-data-to-postgres.sh migrate-sqlite-to-postgres.sh "$PACKAGE_DIR/" 2>/dev/null || true

echo "[docker fix]"
cp fix-docker-safe.bat fix-docker-io-error.bat "$PACKAGE_DIR/"

echo "[docs]"
cp README.txt PACKAGE_CONTENTS.md DATABASE_MANAGEMENT.md "$PACKAGE_DIR/"
cp docs/OPERATIONS.md "$PACKAGE_DIR/OPERATIONS.md"
cp docs/MIGRATE_SQLITE_TO_POSTGRES.md "$PACKAGE_DIR/MIGRATE_SQLITE_TO_POSTGRES.md"
cp TROUBLESHOOTING.md NETWORK_ACCESS.md "$PACKAGE_DIR/"

echo "[env]"
if [ ! -f .env.example ]; then
  echo "ERROR: .env.example missing"
  exit 1
fi
cp .env.example "$PACKAGE_DIR/.env.example"
cp .env.example "$PACKAGE_DIR/.env"
echo "    .env created from .env.example — edit SECRET_KEY and POSTGRES_PASSWORD on site"

echo "[images]"
for f in images/backend.tar images/frontend.tar images/nginx.tar; do
  if [ ! -f "$f" ]; then
    echo "ERROR: $f missing after build"
    exit 1
  fi
done
cp -r images "$PACKAGE_DIR/"

echo ""
echo "Verifying package contents..."
MISSING=0
for f in \
  docker-compose.yml \
  docker-compose.production.host-network.yml \
  run.bat stop.bat exit-kiosk.bat setup-startup.bat \
  backup-database.bat restore-database.bat access-database.bat \
  export-sqlite-data.bat import-data-to-postgres.bat migrate-sqlite-to-postgres.bat \
  fix-docker-safe.bat fix-docker-io-error.bat \
  README.txt PACKAGE_CONTENTS.md OPERATIONS.md \
  MIGRATE_SQLITE_TO_POSTGRES.md DATABASE_MANAGEMENT.md \
  TROUBLESHOOTING.md NETWORK_ACCESS.md \
  .env .env.example \
  images/backend.tar images/frontend.tar images/nginx.tar
do
  if [ ! -e "$PACKAGE_DIR/$f" ]; then
    echo "[MISSING] $f"
    MISSING=1
  else
    echo "[OK] $f"
  fi
done
if [ "$MISSING" -eq 1 ]; then
  echo "ERROR: Package is incomplete."
  exit 1
fi

echo ""
echo "Step 3: Creating ZIP archive..."
rm -f "${PACKAGE_NAME}.zip"
(
  cd "$PACKAGE_DIR"
  zip -r "../${PACKAGE_NAME}.zip" .
)

echo ""
echo "=========================================="
echo "Package created successfully!"
echo "File: ${PACKAGE_NAME}.zip"
echo "See PACKAGE_CONTENTS.md for the full file list."
echo "=========================================="
