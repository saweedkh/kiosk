@echo off
REM اسکریپت برای rebuild کردن فقط backend با کد جدید
REM این اسکریپت container را stop می‌کند، image را rebuild می‌کند و دوباره start می‌کند

echo ==========================================
echo Rebuilding Backend Only
echo ==========================================
echo.

REM Step 1: Stop containers
echo Step 1: Stopping containers...
docker-compose down
if errorlevel 1 (
    echo Note: Some containers may not have been running
)

REM Step 2: Remove old backend image
echo.
echo Step 2: Removing old backend image...
docker rmi kiosk-backend:latest 2>nul
if errorlevel 1 (
    echo Note: Image may not exist, continuing...
)

REM Step 3: Rebuild backend image (NO CACHE)
echo.
echo Step 3: Rebuilding backend image (no cache)...
docker-compose build --no-cache backend
if errorlevel 1 (
    echo ERROR: Failed to build backend image!
    pause
    exit /b 1
)

REM Step 4: Start containers
echo.
echo Step 4: Starting containers...
docker-compose up -d
if errorlevel 1 (
    echo ERROR: Failed to start containers!
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Backend rebuilt and restarted successfully!
echo ==========================================
echo.
echo IMPORTANT: The new code with correct AM format is now running.
echo.
pause

