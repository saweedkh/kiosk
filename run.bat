@echo off
REM Kiosk Application Startup Script for Windows
REM This script loads Docker images and starts the application

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

REM Load Docker images
echo Loading Docker images...
if exist images\backend.tar (
    echo Loading backend image...
    docker load -i images\backend.tar
) else (
    echo ERROR: images\backend.tar not found!
    pause
    exit /b 1
)

if exist images\frontend.tar (
    echo Loading frontend image...
    docker load -i images\frontend.tar
) else (
    echo ERROR: images\frontend.tar not found!
    pause
    exit /b 1
)

if exist images\nginx.tar (
    echo Loading nginx image...
    docker load -i images\nginx.tar
) else (
    echo ERROR: images\nginx.tar not found!
    pause
    exit /b 1
)

echo.
echo Starting containers...
REM استفاده از docker-compose.yml (که در پکیج تحویلی وجود دارد)
docker-compose -f docker-compose.yml up -d

REM Wait a moment for containers to initialize
timeout /t 3 /nobreak >nul

if errorlevel 1 (
    echo ERROR: Failed to start containers!
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Application started successfully!
echo.
echo The application is now running at:
echo http://localhost
echo.
echo To stop the application, run:
echo docker-compose -f docker-compose.yml down
echo or simply run: stop.bat
echo ==========================================
echo.

REM Wait a few seconds for services to start
echo Waiting for services to be ready...
timeout /t 10 /nobreak >nul

REM Check if service is ready
:check_service
curl -s http://localhost >nul 2>&1
if errorlevel 1 (
    echo Waiting for service...
    timeout /t 3 /nobreak >nul
    goto check_service
)

echo Service is ready!
echo.

REM Open Chrome in kiosk mode
echo Opening Chrome in kiosk mode...

REM Find Chrome executable
set "CHROME_PATH="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else (
    REM Try to find Chrome in PATH
    where chrome.exe >nul 2>&1
    if not errorlevel 1 (
        set "CHROME_PATH=chrome.exe"
    )
)

if "%CHROME_PATH%"=="" (
    echo ERROR: Google Chrome not found!
    echo Please install Google Chrome from https://www.google.com/chrome/
    pause
    exit /b 1
)

REM Open Chrome in kiosk mode with restricted access
REM Flags explanation:
REM --kiosk: Full screen kiosk mode
REM --no-first-run: Skip first run dialogs
REM --disable-infobars: Disable info bars
REM --disable-session-crashed-bubble: Disable crash recovery dialog
REM --disable-restore-session-state: Don't restore previous session
REM --disable-extensions: Disable extensions
REM --disable-plugins: Disable plugins
REM --disable-default-apps: Disable default apps
REM --disable-sync: Disable sync
REM --disable-translate: Disable translate
REM --disable-notifications: Disable notifications
REM --disable-password-generation: Disable password generation
REM --disable-save-password-bubble: Disable save password prompts
start "" "%CHROME_PATH%" --kiosk http://localhost --no-first-run --disable-infobars --disable-session-crashed-bubble --disable-restore-session-state --disable-extensions --disable-plugins --disable-default-apps --disable-sync --disable-translate --disable-notifications --disable-password-generation --disable-save-password-bubble

:browser_opened
echo.
echo ==========================================
echo Browser opened in kiosk mode!
echo.
echo For touch kiosk (no keyboard/mouse):
echo - Tap 5 times in top-right corner to open admin panel
echo - Or restart the system to exit
echo ==========================================
echo.

REM Hide this window (optional - uncomment if you want)
REM if not "%1"=="min" start /min cmd /c "%~nx0" min

REM Keep script running (don't pause, just wait)
timeout /t 1 /nobreak >nul

