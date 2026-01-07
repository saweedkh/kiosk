@echo off
REM View payment logs from Docker container
echo ==========================================
echo Payment Logs Viewer
echo ==========================================
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running!
    pause
    exit /b 1
)

REM Get backend container name
for /f "tokens=*" %%i in ('docker ps --format "{{.Names}}" ^| findstr /i "backend"') do set CONTAINER_NAME=%%i

if "%CONTAINER_NAME%"=="" (
    echo ERROR: Backend container not found!
    echo Please make sure the application is running.
    pause
    exit /b 1
)

echo Container: %CONTAINER_NAME%
echo.
echo Showing last 100 lines of payment logs...
echo ==========================================
echo.

REM Show logs with payment-related keywords
docker logs %CONTAINER_NAME% --tail 200 2>&1 | findstr /i "payment pos amount AM message_built message_final"

echo.
echo ==========================================
echo End of logs
echo ==========================================
pause

