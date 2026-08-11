@echo off
REM Diagnose backend↔Postgres, sync password, or wipe volume if needed.
REM run.bat now also syncs password on every start; use this if that is not enough.

setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "DB_CONTAINER=kiosk_db"
set "BACKEND_CONTAINER=kiosk_backend"
set "COMPOSE_FILE=docker-compose.yml"

echo ==========================================
echo Fix backend DB connection
echo ==========================================
echo.

if not exist ".env" (
    echo ERROR: .env missing
    pause
    exit /b 1
)

set "COMPOSE=docker compose"
docker compose version >nul 2>&1
if errorlevel 1 set "COMPOSE=docker-compose"

docker ps --format "{{.Names}}" | findstr /C:"%DB_CONTAINER%" >nul
if errorlevel 1 (
    echo DB container not running. Starting stack...
    %COMPOSE% -f %COMPOSE_FILE% up -d db
    timeout /t 8 /nobreak >nul
)

echo.
echo --- 1) Container env ^(password hidden^) ---
docker exec %DB_CONTAINER% sh -c "echo USER=$POSTGRES_USER DB=$POSTGRES_DB HOST_HINT=db; echo PASS_LEN=$(printf %%s \"$POSTGRES_PASSWORD\" | wc -c)"

echo.
echo --- 2) Sync role password to current .env ^(no old password needed^) ---
docker exec %DB_CONTAINER% sh -c "echo \"ALTER USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD';\" | psql -U $POSTGRES_USER -d $POSTGRES_DB -v ON_ERROR_STOP=1"
if errorlevel 1 (
    echo ALTER USER failed — will try wipe path below if you confirm.
) else (
    echo ALTER USER OK.
)

echo.
echo Recreating backend...
%COMPOSE% -f %COMPOSE_FILE% up -d --force-recreate backend
timeout /t 5 /nobreak >nul

echo.
echo --- 3) Django DB check from backend ---
docker exec %BACKEND_CONTAINER% python manage.py check --database default
if not errorlevel 1 (
    echo.
    echo SUCCESS: backend can talk to Postgres.
    echo If entrypoint was mid-retry, wait a few seconds or:
    echo   %COMPOSE% -f %COMPOSE_FILE% restart backend
    pause
    exit /b 0
)

echo.
echo Django still cannot connect. Recent backend logs:
docker logs %BACKEND_CONTAINER% --tail 40
echo.

echo ==========================================
echo NUCLEAR OPTION: wipe Postgres volume
echo This DELETES all DB data ^(orders, products, users^).
echo Media files in backend_media are kept.
echo ==========================================
set /p "WIPE=Type YES to wipe postgres_data and recreate: "
if /I not "%WIPE%"=="YES" (
    echo Aborted. Fix POSTGRES_* in .env or restore from backup.
    pause
    exit /b 1
)

echo Stopping stack...
%COMPOSE% -f %COMPOSE_FILE% down

echo Removing postgres volumes...
for /f "tokens=*" %%V in ('docker volume ls -q ^| findstr /I "postgres_data"') do (
    echo Removing volume: %%V
    docker volume rm "%%V"
)

echo Starting fresh ^(Postgres will init with CURRENT .env password^)...
%COMPOSE% -f %COMPOSE_FILE% up -d

echo.
echo Wait ~20s then check:
echo   docker logs %BACKEND_CONTAINER% --tail 50
echo.
pause
endlocal
exit /b 0
