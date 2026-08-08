@echo off
REM Kiosk Application Stop Script for Windows

setlocal
cd /d "%~dp0"

echo ==========================================
echo Stopping Kiosk Application
echo ==========================================
echo.

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
echo Application stopped.
pause
endlocal
