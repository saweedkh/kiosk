@echo off
REM Sync Postgres role password to the CURRENT .env value.
REM Local socket auth inside the container needs no old password.
REM Does NOT wipe data / volumes.

setlocal EnableExtensions
cd /d "%~dp0"

set "DB_CONTAINER=kiosk_db"
set "COMPOSE_FILE=docker-compose.yml"

echo === Reset Postgres password to match .env ===
echo.

if not exist ".env" (
    echo ERROR: .env not found next to this script.
    pause
    exit /b 1
)

docker ps --format "{{.Names}}" | findstr /C:"%DB_CONTAINER%" >nul
if errorlevel 1 (
    echo ERROR: Container %DB_CONTAINER% is not running.
    echo Start the stack first: run.bat
    pause
    exit /b 1
)

echo Updating role password inside %DB_CONTAINER% from container env ^(same as .env^)...
REM Local trust inside the image: no old password needed. Env vars come from compose env_file.
docker exec %DB_CONTAINER% sh -c "echo \"ALTER USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD';\" | psql -U $POSTGRES_USER -d $POSTGRES_DB -v ON_ERROR_STOP=1"
if errorlevel 1 (
    echo.
    echo ERROR: ALTER USER failed.
    echo If the password in .env has quotes or special shell chars, set a simpler POSTGRES_PASSWORD and retry.
    echo Or wipe volume only if data can be discarded — see docs\OPERATIONS.md
    pause
    exit /b 1
)

echo.
echo Password synced. Recreating backend...
set "COMPOSE=docker compose"
docker compose version >nul 2>&1
if errorlevel 1 set "COMPOSE=docker-compose"

%COMPOSE% -f %COMPOSE_FILE% up -d --force-recreate backend
if errorlevel 1 (
    echo WARNING: recreate failed — run manually:
    echo   %COMPOSE% -f %COMPOSE_FILE% up -d --force-recreate backend
    pause
    exit /b 1
)

echo.
echo Done. Check:
echo   docker logs %DB_CONTAINER% --tail 5
echo   docker logs kiosk_backend --tail 30
echo.
pause
endlocal
exit /b 0
