@echo off
REM Kiosk Application Startup Script for Windows
REM This script loads Docker images and starts the application

echo ==========================================
echo Kiosk Application Startup
echo ==========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo Docker is running...
echo.

REM Load Docker images
echo Loading Docker images...
if exist images\backend.tar (
    echo Loading backend image...
    docker load -i images\backend.tar
) else (
    echo ERROR: images\backend.tar not found!
    pause
    exit /b 1
)

if exist images\frontend.tar (
    echo Loading frontend image...
    docker load -i images\frontend.tar
) else (
    echo ERROR: images\frontend.tar not found!
    pause
    exit /b 1
)

if exist images\nginx.tar (
    echo Loading nginx image...
    docker load -i images\nginx.tar
) else (
    echo ERROR: images\nginx.tar not found!
    pause
    exit /b 1
)

echo.
echo Starting containers...
REM استفاده از docker-compose.yml (که در پکیج تحویلی وجود دارد)
docker-compose -f docker-compose.yml up -d

REM Wait a moment for containers to initialize
timeout /t 3 /nobreak >nul

if errorlevel 1 (
    echo ERROR: Failed to start containers!
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Application started successfully!
echo.
echo The application is now running at:
echo http://localhost
echo.
echo To stop the application, run:
echo docker-compose -f docker-compose.yml down
echo or simply run: stop.bat
echo ==========================================
echo.

REM Wait a few seconds for services to start
timeout /t 5 /nobreak >nul

REM Open browser (optional - comment out if not needed)
REM start http://localhost

pause

