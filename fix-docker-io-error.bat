@echo off
REM DANGEROUS: aggressive Docker cleanup. Prefer fix-docker-safe.bat
REM This can remove ALL unused images via docker system prune -a

setlocal
cd /d "%~dp0"

echo ==========================================
echo Fixing Docker I/O Error (AGGRESSIVE)
echo ==========================================
echo.
echo WARNING: Prefer fix-docker-safe.bat instead.
echo This script runs: docker system prune -a
echo Press Ctrl+C to cancel, or
pause

echo.
echo Step 1: Stopping all compose services...
set "COMPOSE=docker compose"
docker compose version >nul 2>&1
if errorlevel 1 set "COMPOSE=docker-compose"
if exist "docker-compose.yml" %COMPOSE% -f docker-compose.yml down 2>nul

echo.
echo Step 2: Removing kiosk images...
docker rmi kiosk-backend:latest kiosk-frontend:latest kiosk-nginx:latest 2>nul

echo.
echo Step 3: Pruning Docker system (unused images/networks/cache)...
docker system prune -a -f

echo.
echo Step 4: Clearing Docker build cache...
docker builder prune -a -f

echo.
echo ==========================================
echo IMPORTANT: Restart Docker Desktop now!
echo ==========================================
echo.
echo After restarting Docker Desktop:
echo 1. Run: run.bat  ^(reloads images from images\ if needed^)
echo 2. Do NOT run build-images.bat on a delivery package without source code
echo.
pause
endlocal
