@echo off
REM Kiosk Application Startup Script for Windows
REM Starts: Docker stack + PosBridge (official PNA DLL) + Chrome

setlocal EnableExtensions
cd /d "%~dp0"

set "COMPOSE_FILE=docker-compose.yml"
set "NEED_LOAD=0"
set "BRIDGE_OK=0"

echo ==========================================
echo Kiosk Application Startup
echo ==========================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo Docker is running...
echo.

REM Prefer docker compose v2, fall back to docker-compose
set "COMPOSE=docker compose"
docker compose version >nul 2>&1
if errorlevel 1 set "COMPOSE=docker-compose"

if not exist "%COMPOSE_FILE%" (
    echo ERROR: %COMPOSE_FILE% not found in %CD%
    pause
    exit /b 1
)

if not exist ".env" (
    if exist ".env.example" (
        echo WARNING: .env missing. Copying from .env.example ...
        copy /Y ".env.example" ".env" >nul
        echo Edit .env and set POSTGRES_PASSWORD before production use.
    ) else (
        echo ERROR: .env not found. Create it from .env.example
        pause
        exit /b 1
    )
)

REM Ensure postgres image exists: prefer offline images\postgres.tar, else pull
docker image inspect postgres:18-alpine >nul 2>&1
if errorlevel 1 (
    if exist images\postgres.tar (
        echo Postgres image not found. Loading from images\postgres.tar ...
        docker load -i images\postgres.tar
        if errorlevel 1 (
            echo ERROR: Failed to load postgres image from images\postgres.tar
            pause
            exit /b 1
        )
    ) else (
        echo Postgres image not found and images\postgres.tar missing.
        echo Pulling postgres:18-alpine ^(needs internet^)...
        docker pull postgres:18-alpine
        if errorlevel 1 (
            echo ERROR: Failed to pull postgres:18-alpine
            echo Rebuild delivery with build-images.bat to include images\postgres.tar
            pause
            exit /b 1
        )
    )
)

REM Check whether required app images already exist
docker image inspect kiosk-backend:latest >nul 2>&1
if errorlevel 1 set "NEED_LOAD=1"
docker image inspect kiosk-frontend:latest >nul 2>&1
if errorlevel 1 set "NEED_LOAD=1"
docker image inspect kiosk-nginx:latest >nul 2>&1
if errorlevel 1 set "NEED_LOAD=1"

if "%NEED_LOAD%"=="1" (
    echo Required app images not found. Loading from images\*.tar ...
    echo This is only done once ^(or after images were removed^).
    echo NOTE: bale_bot uses kiosk-backend — no separate bot image.
    echo.

    if not exist images\backend.tar (
        echo ERROR: images\backend.tar not found!
        echo Put the delivery images folder next to this script, or run build-images.bat.
        pause
        exit /b 1
    )
    if not exist images\frontend.tar (
        echo ERROR: images\frontend.tar not found!
        pause
        exit /b 1
    )
    if not exist images\nginx.tar (
        echo ERROR: images\nginx.tar not found!
        pause
        exit /b 1
    )

    echo Loading backend image...
    docker load -i images\backend.tar
    if errorlevel 1 (
        echo ERROR: Failed to load backend image!
        pause
        exit /b 1
    )

    echo Loading frontend image...
    docker load -i images\frontend.tar
    if errorlevel 1 (
        echo ERROR: Failed to load frontend image!
        pause
        exit /b 1
    )

    echo Loading nginx image...
    docker load -i images\nginx.tar
    if errorlevel 1 (
        echo ERROR: Failed to load nginx image!
        pause
        exit /b 1
    )
    echo Images loaded.
    echo.
) else (
    echo App images already present. Skipping load ^(no delete / no re-download^).
    echo.
)

echo Starting containers...
%COMPOSE% -f %COMPOSE_FILE% up -d
if errorlevel 1 (
    echo ERROR: Failed to start containers!
    echo.
    echo Troubleshooting:
    echo 1. Make sure Docker Desktop is running
    echo 2. Run: stop.bat
    echo 3. Check logs: docker compose -f %COMPOSE_FILE% logs
    echo 4. Do NOT run fix-docker-io-error.bat unless images are corrupted
    echo 5. DB auth stuck: fix-backend-db.bat
    pause
    exit /b 1
)

REM ----- Sync Postgres role password to current .env -----
REM Volume keeps the password from FIRST init; .env changes alone do not update it.
REM Local socket inside kiosk_db needs no old password. Safe; does not wipe data.
echo.
echo Syncing Postgres password with .env ...
set /a "DBWAIT=0"
:wait_db
set /a "DBWAIT+=1"
docker exec kiosk_db sh -c "pg_isready -U \"$POSTGRES_USER\" -d \"$POSTGRES_DB\"" >nul 2>&1
if not errorlevel 1 goto db_ready
REM Prefer env user if container is up enough to answer
docker inspect -f "{{.State.Health.Status}}" kiosk_db 2>nul | findstr /I "healthy" >nul
if not errorlevel 1 goto db_ready
if %DBWAIT% GEQ 30 (
    echo WARNING: kiosk_db not ready yet — skipping password sync.
    goto after_db_sync
)
timeout /t 2 /nobreak >nul
goto wait_db

:db_ready
docker exec kiosk_db sh -c "echo \"ALTER USER $POSTGRES_USER WITH PASSWORD '$POSTGRES_PASSWORD';\" | psql -U $POSTGRES_USER -d $POSTGRES_DB -v ON_ERROR_STOP=1" >nul 2>&1
if errorlevel 1 (
    echo WARNING: could not sync DB password. If backend keeps retrying, run fix-backend-db.bat
) else (
    echo Postgres password synced with .env.
    REM Restart backend so entrypoint reconnects with matching password
    %COMPOSE% -f %COMPOSE_FILE% up -d --force-recreate backend >nul 2>&1
)

:after_db_sync

REM ----- PosBridge (Windows + official DLL) -----
if exist "pos_bridge\start_background.bat" (
    echo.
    echo Starting PosBridge ^(PNA DLL^)...
    call "pos_bridge\start_background.bat"
    if errorlevel 1 (
        echo.
        echo WARNING: PosBridge did not become healthy.
        echo POS card payments via bridge will fail until it is fixed.
        echo See POS_BRIDGE.md and pos_bridge\logs\
    ) else (
        set "BRIDGE_OK=1"
    )
) else (
    echo.
    echo WARNING: pos_bridge\ missing — card reader bridge not started.
)

REM Brief wait, then check status (no infinite hang)
timeout /t 5 /nobreak >nul
%COMPOSE% -f %COMPOSE_FILE% ps

echo.
echo Waiting for web app ^(max ~90s^)...
set /a "TRIES=0"
:check_service
set /a "TRIES+=1"
curl -s -o nul http://localhost >nul 2>&1
if not errorlevel 1 goto service_ready
if %TRIES% GEQ 30 (
    echo WARNING: Service did not respond in time.
    echo.
    echo If backend logs show Waiting for PostgreSQL / password authentication:
    echo   1^) fix-backend-db.bat
    echo   2^) If still broken and data can be wiped, type YES when asked
    echo.
    echo Check: docker logs kiosk_backend --tail 40
    echo Check: docker compose -f %COMPOSE_FILE% ps
    goto open_browser
)
timeout /t 3 /nobreak >nul
goto check_service

:service_ready
echo Web app is ready!
echo.

:open_browser
echo Opening Chrome in fullscreen app mode...

set "CHROME_PATH="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else (
    where chrome.exe >nul 2>&1
    if not errorlevel 1 set "CHROME_PATH=chrome.exe"
)

if "%CHROME_PATH%"=="" (
    echo WARNING: Google Chrome not found. App is running at http://localhost
    echo Install Chrome from https://www.google.com/chrome/
    goto done
)

REM Dedicated profile so exit-kiosk.bat can close only this Chrome.
set "KIOSK_PROFILE=%LOCALAPPDATA%\KioskAppChrome"

start "" "%CHROME_PATH%" --user-data-dir="%KIOSK_PROFILE%" --app=http://localhost --start-maximized --no-first-run --disable-infobars --disable-session-crashed-bubble --disable-restore-session-state --disable-extensions --disable-plugins --disable-default-apps --disable-sync --disable-translate --disable-notifications --disable-password-generation --disable-save-password-bubble

echo.
echo ==========================================
echo Stack status:
echo   Docker / web:  http://localhost
if "%BRIDGE_OK%"=="1" (
    echo   PosBridge:     http://127.0.0.1:9000/health  OK
) else (
    echo   PosBridge:     NOT ready — check POS_BRIDGE.md
)
echo.
echo .env tips for POS:
echo   PAYMENT_GATEWAY_NAME=bridge
echo   POS_USE_BRIDGE=True
echo   POS_TCP_HOST=^<POS IP^>
echo   POS_BRIDGE_HOST=host.docker.internal
echo.
echo Staff exit on touch kiosk:
echo   - Admin panel: "خروج از تمام‌صفحه"
echo   - Or exit-kiosk.bat
echo Stop everything: stop.bat
echo ==========================================
echo.

:done
endlocal
exit /b 0
