@echo off
REM Collect POS-related logs from the running backend container.
REM Usage: scripts\pos-collect-logs.bat

setlocal

set "CONTAINER=%KIOSK_BACKEND_CONTAINER%"
if "%CONTAINER%"=="" set "CONTAINER=kiosk_backend"
set "OUT=%~1"
if "%OUT%"=="" set "OUT=pos-logs.txt"

docker ps --format "{{.Names}}" | findstr /x "%CONTAINER%" >nul
if errorlevel 1 (
  echo ❌ Container '%CONTAINER%' is not running.
  exit /b 1
)

> "%OUT%" (
  echo === show_pos_config ===
)
docker exec %CONTAINER% python manage.py show_pos_config >> "%OUT%" 2>&1
>> "%OUT%" echo.
>> "%OUT%" echo === last 150 payment/pos log lines ===
docker exec %CONTAINER% sh -c "grep -E \"pos_|gateway_response|payment_|MockPayment|POSPayment\" /app/logs/kiosk.log | tail -150" >> "%OUT%" 2>&1

echo Saved: %OUT%
endlocal
