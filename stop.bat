@echo off
REM Stop Docker stack + PosBridge

setlocal EnableExtensions
cd /d "%~dp0"

echo ==========================================
echo Stopping Kiosk Application
echo ==========================================
echo.

if exist "pos_bridge\stop_bridge.bat" (
    call "pos_bridge\stop_bridge.bat"
    echo.
)

set "COMPOSE=docker compose"
docker compose version >nul 2>&1
if errorlevel 1 set "COMPOSE=docker-compose"

if exist "docker-compose.yml" (
    %COMPOSE% -f docker-compose.yml down
) else (
    echo ERROR: docker-compose.yml not found in %CD%
    pause
    exit /b 1
)

echo.
echo Application stopped ^(Docker + PosBridge^).
pause
endlocal
