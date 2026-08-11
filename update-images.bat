@echo off
REM Customer / delivery: reload app images from images\*.tar and recreate containers.
REM Use after replacing images\*.tar with a new delivery package.
REM Preserves Docker volumes (postgres_data, backend_media) — does NOT wipe DB or media.
REM Do NOT use build-images.bat / rebuild-and-run.bat here (those need source repo).

setlocal EnableExtensions
cd /d "%~dp0"

echo ==========================================
echo Update Kiosk App Images
echo ==========================================
echo.
echo This will:
echo   - stop containers
echo   - remove old kiosk-backend / frontend / nginx images
echo   - load new images from images\*.tar
echo   - reload postgres from images\postgres.tar if present
echo   - start containers again
echo.
echo Volumes postgres_data and backend_media are kept.
echo bale_bot uses the same backend image — no separate bot tar.
echo.
echo Press Ctrl+C to cancel, or
pause

set "COMPOSE=docker compose"
docker compose version >nul 2>&1
if errorlevel 1 set "COMPOSE=docker-compose"

if not exist "images\backend.tar" (
    echo ERROR: images\backend.tar not found.
    echo Copy the new delivery images\ folder next to this script first.
    pause
    exit /b 1
)
if not exist "images\frontend.tar" (
    echo ERROR: images\frontend.tar not found.
    pause
    exit /b 1
)
if not exist "images\nginx.tar" (
    echo ERROR: images\nginx.tar not found.
    pause
    exit /b 1
)

echo.
echo Step 1: Stopping containers...
if exist "docker-compose.yml" (
    %COMPOSE% -f docker-compose.yml down
) else (
    %COMPOSE% down
)

echo.
echo Step 2: Removing old app images...
docker rmi kiosk-backend:latest kiosk-frontend:latest kiosk-nginx:latest 2>nul
if errorlevel 1 (
    echo Some images may not exist, continuing...
)

echo.
echo Step 3: Loading new images from images\*.tar ...
docker load -i images\backend.tar
if errorlevel 1 (
    echo ERROR: Failed to load backend image!
    pause
    exit /b 1
)
docker load -i images\frontend.tar
if errorlevel 1 (
    echo ERROR: Failed to load frontend image!
    pause
    exit /b 1
)
docker load -i images\nginx.tar
if errorlevel 1 (
    echo ERROR: Failed to load nginx image!
    pause
    exit /b 1
)
if exist images\postgres.tar (
    echo Loading postgres image...
    docker rmi postgres:18-alpine 2>nul
    docker load -i images\postgres.tar
    if errorlevel 1 (
        echo ERROR: Failed to load postgres image!
        pause
        exit /b 1
    )
) else (
    echo WARNING: images\postgres.tar missing — keeping existing postgres image if any.
)
echo Images loaded.

echo.
echo Step 4: Starting containers...
if exist "docker-compose.yml" (
    %COMPOSE% -f docker-compose.yml up -d
) else (
    %COMPOSE% up -d
)
if errorlevel 1 (
    echo ERROR: Failed to start containers!
    echo Try: run.bat
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Images updated successfully.
echo Open http://localhost  or run run.bat for kiosk Chrome.
echo ==========================================
echo.
pause
endlocal
