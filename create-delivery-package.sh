#!/bin/bash

# Script to create the final delivery package for the client
# This creates a ZIP file with all necessary files (no source code)

set -e

echo "=========================================="
echo "Creating Delivery Package"
echo "=========================================="

PACKAGE_NAME="kiosk-app"
PACKAGE_DIR="./delivery-package"

# Clean up old package and ZIP if exists
echo "Cleaning up old package..."
rm -rf "$PACKAGE_DIR"
rm -f "${PACKAGE_NAME}.zip"
mkdir -p "$PACKAGE_DIR"

# Build images first
echo ""
echo "Step 1: Building Docker images..."
./build-images.sh

# Copy necessary files
echo ""
echo "Step 2: Copying files to package..."

# Copy docker-compose file
echo "Copying docker-compose files..."
cp docker-compose.production.yml "$PACKAGE_DIR/docker-compose.yml" || echo "ERROR: Failed to copy docker-compose.production.yml"

# Copy run scripts
echo "Copying run scripts..."
cp run.bat "$PACKAGE_DIR/" || echo "ERROR: Failed to copy run.bat"
cp stop.bat "$PACKAGE_DIR/" || echo "ERROR: Failed to copy stop.bat"
if cp rebuild-and-run.bat "$PACKAGE_DIR/"; then
    echo "Copied rebuild-and-run.bat"
else
    echo "ERROR: Failed to copy rebuild-and-run.bat"
fi
if cp rebuild-backend-only.bat "$PACKAGE_DIR/"; then
    echo "Copied rebuild-backend-only.bat"
else
    echo "ERROR: Failed to copy rebuild-backend-only.bat"
fi
if cp setup-startup.bat "$PACKAGE_DIR/"; then
    echo "Copied setup-startup.bat"
else
    echo "ERROR: Failed to copy setup-startup.bat"
fi

# Copy README and documentation
echo "Copying documentation..."
cp README.txt "$PACKAGE_DIR/" || echo "ERROR: Failed to copy README.txt"
cp NETWORK_ACCESS.md "$PACKAGE_DIR/" || echo "ERROR: Failed to copy NETWORK_ACCESS.md"
if cp TROUBLESHOOTING.md "$PACKAGE_DIR/"; then
    echo "Copied TROUBLESHOOTING.md"
else
    echo "ERROR: Failed to copy TROUBLESHOOTING.md"
fi

# Copy database management scripts and documentation (only .bat files for Windows)
echo "Copying database management scripts..."
cp backup-database.bat "$PACKAGE_DIR/" || echo "ERROR: Failed to copy backup-database.bat"
cp restore-database.bat "$PACKAGE_DIR/" || echo "ERROR: Failed to copy restore-database.bat"
cp access-database.bat "$PACKAGE_DIR/" || echo "ERROR: Failed to copy access-database.bat"
cp DATABASE_MANAGEMENT.md "$PACKAGE_DIR/" || echo "ERROR: Failed to copy DATABASE_MANAGEMENT.md"
echo "Copied database management scripts and documentation"

# Copy Docker fix scripts (only .bat files for Windows)
echo "Copying Docker fix scripts..."
if cp fix-docker-safe.bat "$PACKAGE_DIR/"; then
    echo "Copied fix-docker-safe.bat"
else
    echo "ERROR: Failed to copy fix-docker-safe.bat"
fi

# Copy .env file if exists
if [ -f .env ]; then
    cp .env "$PACKAGE_DIR/"
    echo "Copied .env file"
else
    echo "Warning: .env file not found, client should create it"
fi

# Copy alternative docker-compose for WSL2/Linux
cp docker-compose.production.host-network.yml "$PACKAGE_DIR/" || echo "ERROR: Failed to copy docker-compose.production.host-network.yml"

# Copy images directory
echo "Copying Docker images..."
if cp -r images "$PACKAGE_DIR/"; then
    echo "Copied images directory"
else
    echo "ERROR: Failed to copy images directory"
fi

# Verify all files are copied
echo ""
echo "=========================================="
echo "Verifying copied files..."
echo "=========================================="
echo ""
echo "Checking .bat files:"
if ls "$PACKAGE_DIR"/*.bat >/dev/null 2>&1; then
    ls "$PACKAGE_DIR"/*.bat
else
    echo "ERROR: No .bat files found in package directory!"
    exit 1
fi
echo ""
echo "Checking .md files:"
if ls "$PACKAGE_DIR"/*.md >/dev/null 2>&1; then
    ls "$PACKAGE_DIR"/*.md
else
    echo "ERROR: No .md files found in package directory!"
    exit 1
fi
echo ""
echo "Checking specific new files:"
if [ -f "$PACKAGE_DIR/rebuild-and-run.bat" ]; then
    echo "[OK] rebuild-and-run.bat exists"
else
    echo "[ERROR] rebuild-and-run.bat NOT FOUND!"
    exit 1
fi
if [ -f "$PACKAGE_DIR/setup-startup.bat" ]; then
    echo "[OK] setup-startup.bat exists"
else
    echo "[ERROR] setup-startup.bat NOT FOUND!"
    exit 1
fi
if [ -f "$PACKAGE_DIR/TROUBLESHOOTING.md" ]; then
    echo "[OK] TROUBLESHOOTING.md exists"
else
    echo "[ERROR] TROUBLESHOOTING.md NOT FOUND!"
    exit 1
fi
echo ""
echo "=========================================="

# Create ZIP file
echo ""
echo "=========================================="
echo "Step 3: Creating ZIP archive..."
echo "=========================================="
echo ""
echo "Deleting old ZIP file if exists..."
rm -f "${PACKAGE_NAME}.zip"

echo "Creating new ZIP file..."
cd "$PACKAGE_DIR"
zip -r "../${PACKAGE_NAME}.zip" .
cd ..

# Verify ZIP file was created
if [ ! -f "${PACKAGE_NAME}.zip" ]; then
    echo "ERROR: ZIP file was not created!"
    exit 1
fi

# Verify files are in ZIP
echo ""
echo "Verifying files in ZIP..."
unzip -l "${PACKAGE_NAME}.zip" | grep -E "(rebuild-and-run|setup-startup|TROUBLESHOOTING)" || echo "WARNING: Some files may not be in ZIP!"

echo ""
echo "=========================================="
echo "Package created successfully!"
echo "File: ${PACKAGE_NAME}.zip"
echo "=========================================="
echo ""
echo "IMPORTANT: Please verify that these files are in the ZIP:"
echo "  - rebuild-and-run.bat"
echo "  - setup-startup.bat"
echo "  - TROUBLESHOOTING.md"
echo ""

