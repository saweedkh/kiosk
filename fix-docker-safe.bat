@echo off
REM اسکریپت امن برای رفع مشکل I/O در Docker Desktop
REM این اسکریپت دیتابیس را حفظ می‌کند

echo ==========================================
echo Safe Docker I/O Fix (Database Preserved)
echo ==========================================
echo.

REM Step 1: Backup database FIRST (very important!)
echo Step 1: Creating database backup...
call backup-database.bat
if errorlevel 1 (
    echo WARNING: Backup failed, but continuing...
) else (
    echo Database backup created successfully!
)
echo.

REM Step 2: Stop containers (database volume will be preserved)
echo Step 2: Stopping containers...
docker-compose down
if errorlevel 1 (
    echo WARNING: Some containers may not have stopped
)

echo.
echo Step 3: Removing ONLY corrupted images (NOT volumes)...
docker rmi kiosk-backend:latest kiosk-frontend:latest kiosk-nginx:latest 2>nul
if errorlevel 1 (
    echo Some images may not exist, continuing...
)

echo.
echo Step 4: Pruning images and cache (volumes are safe)...
docker image prune -a -f
docker builder prune -a -f

echo.
echo ==========================================
echo IMPORTANT: Database volume is SAFE!
echo ==========================================
echo.
echo Your database is stored in Docker volume 'backend_db'
echo This volume will NOT be deleted by the above commands
echo.
echo Next steps:
echo 1. RESTART Docker Desktop (very important!)
echo 2. After restart, run: build-images.bat
echo 3. Then run: run.bat
echo.
echo Your database will be automatically restored from the volume
echo.
pause

