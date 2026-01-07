#!/bin/bash

# Build script for creating Docker images and exporting them as .tar files
# This script is run by the developer to prepare the delivery package

set -e

echo "=========================================="
echo "Kiosk Docker Images Build Script"
echo "=========================================="

# Create images directory
mkdir -p images

# Build Docker images (without cache to ensure latest code is used)
echo ""
echo "Building backend image (no cache)..."
docker build --no-cache -t kiosk-backend:latest ./kiosk_backend

echo ""
echo "Building frontend image (no cache)..."
docker build --no-cache -t kiosk-frontend:latest ./kiosk_frontend

echo ""
echo "Building nginx image (no cache)..."
docker build --no-cache -t kiosk-nginx:latest ./nginx

# Save images as .tar files
echo ""
echo "Exporting images to .tar files..."
docker save kiosk-backend:latest -o images/backend.tar
docker save kiosk-frontend:latest -o images/frontend.tar
docker save kiosk-nginx:latest -o images/nginx.tar

echo ""
echo "=========================================="
echo "Build completed successfully!"
echo "Images saved in ./images/ directory"
echo "=========================================="

