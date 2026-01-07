#!/bin/bash

# اسکریپت امن برای رفع مشکل I/O در Docker Desktop
# این اسکریپت دیتابیس را حفظ می‌کند

set -e

echo "=========================================="
echo "Safe Docker I/O Fix (Database Preserved)"
echo "=========================================="
echo ""

# Step 1: Backup database FIRST (very important!)
echo "Step 1: Creating database backup..."
./backup-database.sh || echo "WARNING: Backup failed, but continuing..."
echo ""

# Step 2: Stop containers (database volume will be preserved)
echo "Step 2: Stopping containers..."
docker-compose down || echo "WARNING: Some containers may not have stopped"
echo ""

echo "Step 3: Removing ONLY corrupted images (NOT volumes)..."
docker rmi kiosk-backend:latest kiosk-frontend:latest kiosk-nginx:latest 2>/dev/null || echo "Some images may not exist, continuing..."
echo ""

echo "Step 4: Pruning images and cache (volumes are safe)..."
docker image prune -a -f
docker builder prune -a -f
echo ""

echo "=========================================="
echo "IMPORTANT: Database volume is SAFE!"
echo "=========================================="
echo ""
echo "Your database is stored in Docker volume 'backend_db'"
echo "This volume will NOT be deleted by the above commands"
echo ""
echo "Next steps:"
echo "1. RESTART Docker Desktop (very important!)"
echo "2. After restart, run: ./build-images.sh"
echo "3. Then run: docker-compose up -d"
echo ""
echo "Your database will be automatically restored from the volume"
echo ""

