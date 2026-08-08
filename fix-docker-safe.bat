@echo off
REM Safe Docker I/O fix — preserves volumes (postgres_data, backend_media)
REM WARNING: Removes app images. You must reload images\*.tar or rebuild afterward.

setlocal
cd /d "%~dp0"

echo ==========================================
echo Safe Docker I/O Fix (volumes preserved)
echo ==========================================
echo.
echo This will:
echo   - backup DB+media if possible
echo   - stop containers
echo   - remove kiosk app images
echo   - prune unused images/cache
echo It will NOT delete postgres_data or backend_media volumes.
echo.
echo Press Ctrl+C to cancel, or
pause

echo.
echo Step 1: Creating database backup...
call "%~dp0backup-database.bat"
if errorlevel 1 (
    echo WARNING: Backup failed, but continuing...
) else (
    echo Database backup created successfully!
)
echo.

set "COMPOSE=docker compose"
docker compose version >nul 2>&1
if errorlevel 1 set "COMPOSE=docker-compose"

echo Step 2: Stopping containers...
if exist "docker-compose.yml" (
    %COMPOSE% -f docker-compose.yml down
) else (
    %COMPOSE% down
)

echo.
echo Step 3: Removing ONLY kiosk app images (NOT volumes)...
docker rmi kiosk-backend:latest kiosk-frontend:latest kiosk-nginx:latest 2>nul
if errorlevel 1 (
    echo Some images may not exist, continuing...
)

echo.
echo Step 4: Pruning unused images and build cache (volumes are safe)...
docker image prune -a -f
docker builder prune -a -f

echo.
echo ==========================================
echo IMPORTANT: Database volume is SAFE!
echo ==========================================
echo.
echo Your database is stored in Docker volume 'postgres_data'
echo Media files are in volume 'backend_media'
echo.
echo Next steps:
echo 1. RESTART Docker Desktop
echo 2. Run: run.bat   ^(it will reload images\*.tar if needed^)
echo.
pause
endlocal
