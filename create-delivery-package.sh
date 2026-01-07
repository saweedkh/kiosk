#!/bin/bash

# Script to create the final delivery package for the client
# This creates a ZIP file with all necessary files (no source code)

set -e

echo "=========================================="
echo "Creating Delivery Package"
echo "=========================================="

PACKAGE_NAME="kiosk-app"
PACKAGE_DIR="./delivery-package"

# Clean up old package if exists
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR"

# Build images first
echo ""
echo "Step 1: Building Docker images..."
./build-images.sh

# Copy necessary files
echo ""
echo "Step 2: Copying files to package..."

# Copy docker-compose file
cp docker-compose.production.yml "$PACKAGE_DIR/docker-compose.yml"

# Copy run scripts
cp run.bat "$PACKAGE_DIR/"
cp stop.bat "$PACKAGE_DIR/"

# Copy README and documentation
cp README.txt "$PACKAGE_DIR/"
cp NETWORK_ACCESS.md "$PACKAGE_DIR/"

# Copy database management scripts and documentation (only .bat files for Windows)
cp backup-database.bat "$PACKAGE_DIR/"
cp restore-database.bat "$PACKAGE_DIR/"
cp access-database.bat "$PACKAGE_DIR/"
cp DATABASE_MANAGEMENT.md "$PACKAGE_DIR/"
echo "Copied database management scripts and documentation"

# Copy Docker fix scripts (only .bat files for Windows)
cp fix-docker-safe.bat "$PACKAGE_DIR/"
echo "Copied Docker fix scripts"

# Copy .env file if exists
if [ -f .env ]; then
    cp .env "$PACKAGE_DIR/"
    echo "Copied .env file"
else
    echo "Warning: .env file not found, client should create it"
fi

# Copy alternative docker-compose for WSL2/Linux
cp docker-compose.production.host-network.yml "$PACKAGE_DIR/"

# Copy images directory
cp -r images "$PACKAGE_DIR/"

# Create ZIP file
echo ""
echo "Step 3: Creating ZIP archive..."
cd "$PACKAGE_DIR"
zip -r "../${PACKAGE_NAME}.zip" .
cd ..

echo ""
echo "=========================================="
echo "Package created successfully!"
echo "File: ${PACKAGE_NAME}.zip"
echo "=========================================="

