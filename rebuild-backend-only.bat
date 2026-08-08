@echo off
REM Developer-only: rebuild backend image from source (needs Dockerfiles).
REM Not useful inside a delivery ZIP.

setlocal
cd /d "%~dp0"

echo ==========================================
echo Rebuilding Backend Only
echo ==========================================
echo.

if not exist "kiosk_backend\Dockerfile" (
    echo ERROR: kiosk_backend\Dockerfile not found.
    echo This script requires the full source repository, not the delivery package.
    echo On a delivery machine, replace images\backend.tar and run: run.bat
    pause
    exit /b 1
)

set "COMPOSE=docker compose"
docker compose version >nul 2>&1
if errorlevel 1 set "COMPOSE=docker-compose"

echo Step 1: Stopping containers...
%COMPOSE% down 2>nul

echo.
echo Step 2: Removing old backend image...
docker rmi kiosk-backend:latest 2>nul

echo.
echo Step 3: Rebuilding backend image (no cache)...
docker build --no-cache -t kiosk-backend:latest ./kiosk_backend
if errorlevel 1 (
    echo ERROR: Failed to build backend image!
    pause
    exit /b 1
)

echo.
echo Step 4: Starting containers...
if exist "docker-compose.production.yml" (
    %COMPOSE% -f docker-compose.production.yml up -d
) else if exist "docker-compose.yml" (
    %COMPOSE% -f docker-compose.yml up -d
) else (
    echo ERROR: No docker-compose file found.
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Backend rebuilt and restarted successfully!
echo ==========================================
pause
endlocal
