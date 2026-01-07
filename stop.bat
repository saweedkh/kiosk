@echo off
REM Kiosk Application Stop Script for Windows

echo ==========================================
echo Stopping Kiosk Application
echo ==========================================
echo.

docker-compose -f docker-compose.yml down

echo.
echo Application stopped.
pause

