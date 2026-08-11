@echo off
REM Show what payment gateway Docker/Django will actually use (not just .env on disk).
setlocal EnableExtensions
cd /d "%~dp0"

set "COMPOSE=docker compose"
docker compose version >nul 2>&1
if errorlevel 1 set "COMPOSE=docker-compose"

echo ==========================================
echo Payment env diagnostic
echo ==========================================
echo.

echo --- 1) Lines in host .env ---
if exist ".env" (
    findstr /I /B "PAYMENT_GATEWAY_NAME POS_USE_BRIDGE POS_BRIDGE_HOST POS_BRIDGE_PORT MOCK_PAYMENT" .env
) else (
    echo ERROR: .env missing in %CD%
)
echo.

echo --- 2) What Compose resolves for backend ---
%COMPOSE% config 2>nul | findstr /I "PAYMENT_GATEWAY POS_USE_BRIDGE POS_BRIDGE"
if errorlevel 1 echo (compose config failed or keys not found)
echo.

echo --- 3) What is inside running container ---
docker inspect -f "{{.State.Status}}" kiosk_backend 2>nul | findstr /I "running" >nul
if errorlevel 1 (
    echo ERROR: kiosk_backend is not running.
    echo Start with run.bat then re-run this script.
    pause
    exit /b 1
)

echo PAYMENT_GATEWAY_NAME=
docker exec kiosk_backend printenv PAYMENT_GATEWAY_NAME
echo POS_USE_BRIDGE=
docker exec kiosk_backend printenv POS_USE_BRIDGE
echo POS_BRIDGE_HOST=
docker exec kiosk_backend printenv POS_BRIDGE_HOST
echo POS_BRIDGE_PORT=
docker exec kiosk_backend printenv POS_BRIDGE_PORT
echo.

echo --- 4) What Django settings loaded ---
docker exec kiosk_backend python -c "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','config.settings'); import django; django.setup(); from django.conf import settings; c=settings.PAYMENT_GATEWAY_CONFIG; print('gateway_name=', c.get('gateway_name')); print('bridge=', c.get('bridge_host'), c.get('bridge_port')); print('raw PAYMENT_GATEWAY_NAME=', repr(os.getenv('PAYMENT_GATEWAY_NAME'))); print('raw POS_USE_BRIDGE=', repr(os.getenv('POS_USE_BRIDGE')))"
if errorlevel 1 (
    echo ERROR: could not read Django settings
)
echo.

echo --- 5) PosBridge on Windows host ---
curl.exe -s -m 3 http://127.0.0.1:9000/health
echo.
echo.

echo If gateway_name is still mock: copy latest docker-compose.yml, then:
echo   docker compose up -d --force-recreate backend
echo.
pause
