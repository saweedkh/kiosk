@echo off
REM POS on-site preflight for Windows kiosk (Docker Desktop).
REM Usage:
REM   scripts\pos-preflight.bat
REM   scripts\pos-preflight.bat 192.168.1.50 1362
REM   set POS_SEND=1 && scripts\pos-preflight.bat 192.168.1.50 1362

setlocal EnableDelayedExpansion

set "CONTAINER=%KIOSK_BACKEND_CONTAINER%"
if "%CONTAINER%"=="" set "CONTAINER=kiosk_backend"

set "HOST=%~1"
set "PORT=%~2"
if "%PORT%"=="" set "PORT=1362"

set "AMOUNT=%POS_TEST_AMOUNT%"
if "%AMOUNT%"=="" set "AMOUNT=10000"

for /f "tokens=1-3 delims=/:. " %%a in ("%date% %time%") do set "STAMP=%%a%%b%%c"
set "REPORT=pos-preflight-%STAMP%.txt"

docker ps --format "{{.Names}}" | findstr /x "%CONTAINER%" >nul
if errorlevel 1 (
  echo ❌ Container '%CONTAINER%' is not running.
  echo    Start stack: docker compose up -d
  exit /b 1
)

echo === Kiosk POS Preflight ===
echo Container: %CONTAINER%
echo.

set "ARGS=manage.py pos_preflight --amount %AMOUNT% --save /app/logs/pos-preflight-last.txt"
if not "%HOST%"=="" (
  set "ARGS=!ARGS! --host %HOST% --port %PORT%"
)
if "%POS_SEND%"=="1" (
  echo ⚠️  POS_SEND=1 — sending real amount. Close vendor PNA software first.
  set "ARGS=!ARGS! --send"
)

docker exec -it %CONTAINER% python !ARGS!
docker cp %CONTAINER%:/app/logs/pos-preflight-last.txt %REPORT% 2>nul

echo.
echo --- show_pos_config ---
docker exec %CONTAINER% python manage.py show_pos_config

if not "%HOST%"=="" (
  echo.
  echo --- host ping ---
  ping -n 2 %HOST%
)

echo.
echo Done. Report: %REPORT%
echo.
echo If TCP OK but no amount on POS, set in .env:
echo   PAYMENT_GATEWAY_NAME=pos
echo   POS_MESSAGE_FORMAT=pardakht_novin_official
echo   POS_USE_SIMPLE_FORMAT=True
echo Then: docker compose up -d --force-recreate backend

endlocal
