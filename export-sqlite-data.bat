@echo off
REM Step 1: Export data from SQLite inside the backend container to a JSON file on the host.
REM Usage:
REM   export-sqlite-data.bat
REM   export-sqlite-data.bat path\to\db.sqlite3

setlocal enabledelayedexpansion
cd /d "%~dp0"

set BACKEND_CONTAINER=kiosk_backend
set EXPORT_DIR=exports
set CONTAINER_SQLITE=/app/db.sqlite3
set CONTAINER_OUTPUT=/tmp/kiosk_data_export.json
set HOST_SQLITE=%~1

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set HOST_OUTPUT=%EXPORT_DIR%\kiosk_data_%TIMESTAMP%.json

echo === Export SQLite data from container ===
echo.

docker ps --format "{{.Names}}" | findstr /C:"%BACKEND_CONTAINER%" >nul
if errorlevel 1 (
    echo [ERROR] Container %BACKEND_CONTAINER% is not running.
    exit /b 1
)

if not exist "%EXPORT_DIR%" mkdir "%EXPORT_DIR%"

if not "%HOST_SQLITE%"=="" (
    if not exist "%HOST_SQLITE%" (
        echo [ERROR] File not found: %HOST_SQLITE%
        exit /b 1
    )
    echo [INFO] Copying host SQLite into container...
    docker cp "%HOST_SQLITE%" %BACKEND_CONTAINER%:/tmp/db.sqlite3
    if errorlevel 1 (
        echo [ERROR] docker cp failed.
        exit /b 1
    )
    set CONTAINER_SQLITE=/tmp/db.sqlite3
) else (
    echo [INFO] Looking for %CONTAINER_SQLITE% inside %BACKEND_CONTAINER%...
    docker exec %BACKEND_CONTAINER% test -f %CONTAINER_SQLITE%
    if errorlevel 1 (
        echo [ERROR] No SQLite file at %CONTAINER_SQLITE% in the container.
        echo Pass a host path instead, e.g.:
        echo   %~nx0 kiosk_backend\db.sqlite3
        echo See docs\MIGRATE_SQLITE_TO_POSTGRES.md
        exit /b 1
    )
)

echo [INFO] Dumping data inside container...
docker exec %BACKEND_CONTAINER% python manage.py export_sqlite_data --sqlite-path %CONTAINER_SQLITE% --output %CONTAINER_OUTPUT%
if errorlevel 1 (
    echo [ERROR] Export command failed.
    echo If the command is unknown, rebuild/reload the new kiosk-backend image.
    exit /b 1
)

echo [INFO] Copying JSON out to host...
docker cp %BACKEND_CONTAINER%:%CONTAINER_OUTPUT% "%HOST_OUTPUT%"
if errorlevel 1 (
    echo [ERROR] Failed to copy export file out of the container.
    exit /b 1
)
docker exec %BACKEND_CONTAINER% rm -f %CONTAINER_OUTPUT% 2>nul

echo.
echo ==========================================
echo [OK] EXPORT DONE
echo Relative: %HOST_OUTPUT%
echo Absolute: %CD%\%HOST_OUTPUT%
echo ==========================================
echo.
echo [HINT] Import later with:
echo   import-data-to-postgres.bat %HOST_OUTPUT%
echo See MIGRATE_SQLITE_TO_POSTGRES.md
endlocal
