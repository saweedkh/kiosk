@echo off
REM اسکریپت کامل برای rebuild و run
REM این اسکریپت imageها را rebuild می‌کند و سپس application را start می‌کند

echo ==========================================
echo Rebuild and Run Kiosk Application
echo ==========================================
echo.

REM Step 1: Stop containers
echo Step 1: Stopping containers...
docker-compose down 2>nul
if errorlevel 1 (
    echo Note: Some containers may not have been running
)

REM Step 2: Build images
echo.
echo Step 2: Building Docker images...
call build-images.bat
if errorlevel 1 (
    echo ERROR: Failed to build images!
    pause
    exit /b 1
)

REM Step 3: Run application
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

