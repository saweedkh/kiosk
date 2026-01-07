#!/bin/bash

# اسکریپت رفع مشکل I/O در Docker Desktop
# این مشکل معمولاً به دلیل corruption در metadata database است

set -e

echo "=========================================="
echo "Fixing Docker I/O Error"
echo "=========================================="
echo ""

echo "Step 1: Stopping all containers..."
docker-compose down 2>/dev/null || true
docker stop $(docker ps -aq) 2>/dev/null || true

echo ""
echo "Step 2: Removing corrupted images..."
docker rmi kiosk-backend:latest kiosk-frontend:latest kiosk-nginx:latest 2>/dev/null || true
docker images | grep kiosk | awk '{print $3}' | xargs docker rmi -f 2>/dev/null || true

echo ""
echo "Step 3: Pruning Docker system..."
docker system prune -a -f

echo ""
echo "Step 4: Clearing Docker build cache..."
docker builder prune -a -f

echo ""
echo "=========================================="
echo "IMPORTANT: Please restart Docker Desktop now!"
echo "=========================================="
echo ""
echo "After restarting Docker Desktop:"
echo "1. Run: ./build-images.sh"
echo "2. Run: ./run.bat (or docker-compose up -d)"
echo ""

