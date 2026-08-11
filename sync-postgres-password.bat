@echo off
REM Sync Postgres role password to current .env (via container env). Safe; no data wipe.

setlocal EnableExtensions
cd /d "%~dp0"

docker ps --format "{{.Names}}" | findstr /C:"kiosk_db" >nul
if errorlevel 1 (
    echo ERROR: kiosk_db is not running. Start with run.bat first.
    exit /b 1
)

if not exist "scripts\sync-postgres-password.sh" (
    echo ERROR: scripts\sync-postgres-password.sh missing
    exit /b 1
)

echo Copying sync script into kiosk_db...
docker cp "scripts\sync-postgres-password.sh" kiosk_db:/tmp/sync-postgres-password.sh
if errorlevel 1 exit /b 1

echo Running ALTER USER ...
docker exec kiosk_db sh /tmp/sync-postgres-password.sh
if errorlevel 1 (
    echo ERROR: sync failed
    exit /b 1
)

echo Recreating backend...
set "COMPOSE=docker compose"
docker compose version >nul 2>&1
if errorlevel 1 set "COMPOSE=docker-compose"
%COMPOSE% -f docker-compose.yml up -d --force-recreate backend

echo Done. Check: docker logs kiosk_backend --tail 40
endlocal
exit /b 0
