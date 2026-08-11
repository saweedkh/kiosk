@echo off
REM Build ONLY kiosk-backend and export images\backend.tar
REM (frontend / nginx / postgres untouched)

setlocal
cd /d "%~dp0"

echo ==========================================
echo Build backend image only
echo ==========================================
echo.

if not exist "kiosk_backend\Dockerfile" (
    echo ERROR: kiosk_backend\Dockerfile not found.
    echo Run this from the full source repo, not the delivery ZIP.
    pause
    exit /b 1
)

if not exist images mkdir images

echo Building backend image (no cache)...
docker build --no-cache -t kiosk-backend:latest ./kiosk_backend
if errorlevel 1 (
    echo ERROR: Failed to build backend image
    pause
    exit /b 1
)

echo.
echo Exporting images\backend.tar ...
docker save kiosk-backend:latest -o images\backend.tar
if errorlevel 1 (
    echo ERROR: Failed to save images\backend.tar
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Done.
echo   Image:  kiosk-backend:latest
echo   File:   images\backend.tar
echo.
echo On the kiosk PC:
echo   1. Copy images\backend.tar next to run.bat
echo   2. docker load -i images\backend.tar
echo   3. docker compose up -d --force-recreate backend bale_bot
echo   Or: replace tar then update only backend load manually.
echo ==========================================
pause
endlocal
exit /b 0
