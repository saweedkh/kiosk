@echo off
REM Developer-only: rebuild images from source, then run.
REM Not useful inside a delivery ZIP (no Dockerfiles / source).

setlocal
cd /d "%~dp0"

echo ==========================================
echo Rebuild and Run Kiosk Application
echo ==========================================
echo.

if not exist "build-images.bat" (
    echo ERROR: build-images.bat not found.
    echo This script requires the full source repository, not the delivery package.
    pause
    exit /b 1
)

set "COMPOSE=docker compose"
docker compose version >nul 2>&1
if errorlevel 1 set "COMPOSE=docker-compose"

echo Step 1: Stopping containers...
if exist "docker-compose.yml" %COMPOSE% -f docker-compose.yml down 2>nul

echo.
echo Step 2: Building Docker images...
call build-images.bat
if errorlevel 1 (
    echo ERROR: Failed to build images!
    pause
    exit /b 1
)

echo.
echo Step 3: Starting application...
call run.bat
if errorlevel 1 (
    echo ERROR: Failed to start application!
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Rebuild and Run completed successfully!
echo ==========================================
endlocal
