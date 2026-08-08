@echo off
REM Kiosk Application Startup Script for Windows
REM Normal start: only start containers (no delete / no reload of images).
REM Images are loaded from .tar ONLY if they are missing.

setlocal EnableExtensions
cd /d "%~dp0"

set "COMPOSE_FILE=docker-compose.yml"
set "NEED_LOAD=0"

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

REM Pull/ensure postgres image exists when using production compose (named image)
docker image inspect postgres:18-alpine >nul 2>&1
if errorlevel 1 (
    echo Postgres image not found locally. Pulling postgres:18-alpine ...
    docker pull postgres:18-alpine
    if errorlevel 1 (
        echo ERROR: Failed to pull postgres:18-alpine
        pause
        exit /b 1
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
    pause
    exit /b 1
)

REM Brief wait, then check status (no infinite hang)
timeout /t 5 /nobreak >nul
%COMPOSE% -f %COMPOSE_FILE% ps

echo.
echo Waiting for service ^(max ~90s^)...
set /a "TRIES=0"
:check_service
set /a "TRIES+=1"
curl -s -o nul http://localhost >nul 2>&1
if not errorlevel 1 goto service_ready
if %TRIES% GEQ 30 (
    echo WARNING: Service did not respond in time.
    echo Containers may still be starting. Open http://localhost manually.
    echo Check: docker compose -f %COMPOSE_FILE% ps
    goto open_browser
)
timeout /t 3 /nobreak >nul
goto check_service

:service_ready
echo Service is ready!
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
REM Use --app (not --kiosk / --start-fullscreen) so the admin touch
REM button can exit/enter via the Fullscreen API. Customer page
REM enters fullscreen on first touch.
set "KIOSK_PROFILE=%LOCALAPPDATA%\KioskAppChrome"

start "" "%CHROME_PATH%" --user-data-dir="%KIOSK_PROFILE%" --app=http://localhost --start-maximized --no-first-run --disable-infobars --disable-session-crashed-bubble --disable-restore-session-state --disable-extensions --disable-plugins --disable-default-apps --disable-sync --disable-translate --disable-notifications --disable-password-generation --disable-save-password-bubble

echo.
echo ==========================================
echo Browser opened in app mode.
echo App: http://localhost
echo.
echo Staff exit on touch kiosk:
echo   - Admin panel button: "خروج از تمام‌صفحه"
echo   - Or double-click exit-kiosk.bat to close Chrome
echo Stop containers with: stop.bat
echo ==========================================
echo.

:done
endlocal
exit /b 0
