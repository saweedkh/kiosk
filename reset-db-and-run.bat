@echo off
REM Nuclear fix: wipe ONLY postgres_data, keep media, then run.bat
REM Use when backend keeps retrying DB auth and password sync is not enough.

setlocal EnableExtensions
cd /d "%~dp0"

echo ==========================================
echo RESET Postgres volume + run
echo ==========================================
echo.
echo This DELETES all database data ^(orders, products, users^).
echo Keeps: backend_media ^(product images^), app images, .env
echo.
echo Type YES to continue:
set /p "CONFIRM=Confirm: "
if /I not "%CONFIRM%"=="YES" (
    echo Aborted.
    pause
    exit /b 1
)

set "COMPOSE=docker compose"
docker compose version >nul 2>&1
if errorlevel 1 set "COMPOSE=docker-compose"

if not exist "docker-compose.yml" (
    echo ERROR: docker-compose.yml not found
    pause
    exit /b 1
)

echo.
echo Stopping stack...
%COMPOSE% -f docker-compose.yml down

echo Removing postgres_data volumes...
set "REMOVED=0"
for /f "tokens=*" %%V in ('docker volume ls -q ^| findstr /I "postgres_data"') do (
    echo   docker volume rm %%V
    docker volume rm "%%V"
    if not errorlevel 1 set "REMOVED=1"
)
if "%REMOVED%"=="0" (
    echo No postgres_data volume found ^(ok if first install^).
)

echo.
echo Starting with run.bat ^(Postgres will init from current .env password^)...
call "%~dp0run.bat"
endlocal
exit /b %ERRORLEVEL%
