@echo off
REM Build script for Windows to create Docker images and export them as .tar files

setlocal
cd /d "%~dp0"

echo ==========================================
echo Kiosk Docker Images Build Script
echo ==========================================
echo.

if not exist images mkdir images

echo Building backend image (no cache)...
docker build --no-cache -t kiosk-backend:latest ./kiosk_backend
if errorlevel 1 (
    echo Error building backend image
    exit /b 1
)

echo.
echo Building frontend image (no cache)...
docker build --no-cache -t kiosk-frontend:latest ./kiosk_frontend --build-arg NEXT_PUBLIC_API_BASE_URL=/api
if errorlevel 1 (
    echo Error building frontend image
    exit /b 1
)

echo.
echo Building nginx image (no cache)...
docker build --no-cache -t kiosk-nginx:latest ./nginx
if errorlevel 1 (
    echo Error building nginx image
    exit /b 1
)

echo.
echo Exporting images to .tar files...
docker save kiosk-backend:latest -o images\backend.tar
docker save kiosk-frontend:latest -o images\frontend.tar
docker save kiosk-nginx:latest -o images\nginx.tar

echo.
echo ==========================================
echo Build completed successfully!
echo Images saved in .\images\ directory
echo ==========================================
endlocal
