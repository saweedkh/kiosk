@echo off
REM Step 2: Import a previously exported JSON fixture into PostgreSQL.
REM Usage:
REM   import-data-to-postgres.bat exports\kiosk_data_YYYYMMDD_HHMMSS.json
REM   import-data-to-postgres.bat --keep-existing exports\kiosk_data_....json

setlocal enabledelayedexpansion
cd /d "%~dp0"

set BACKEND_CONTAINER=kiosk_backend
set DB_CONTAINER=kiosk_db
set KEEP_EXISTING=0
set JSON_PATH=

:parse_args
if "%~1"=="" goto args_done
if /I "%~1"=="--keep-existing" (
    set KEEP_EXISTING=1
    shift
    goto parse_args
)
if /I "%~1"=="--help" (
    echo Usage: %~nx0 [--keep-existing] path\to\kiosk_data_....json
    exit /b 0
)
if "!JSON_PATH!"=="" (
    set "JSON_PATH=%~1"
    shift
    goto parse_args
)
echo [ERROR] Unexpected argument: %~1
exit /b 1

:args_done
if "!JSON_PATH!"=="" (
    echo [ERROR] Pass the export JSON path.
    echo Example: %~nx0 exports\kiosk_data_20260101_120000.json
    echo See docs\MIGRATE_SQLITE_TO_POSTGRES.md
    exit /b 1
)

if not exist "!JSON_PATH!" (
    echo [ERROR] File not found: !JSON_PATH!
    exit /b 1
)

echo === Import data into PostgreSQL ===
echo Source: !JSON_PATH!
echo.

docker ps --format "{{.Names}}" | findstr /C:"%DB_CONTAINER%" >nul
if errorlevel 1 (
    echo [ERROR] Container %DB_CONTAINER% is not running. Start Postgres first ^(run.bat^).
    exit /b 1
)

docker ps --format "{{.Names}}" | findstr /C:"%BACKEND_CONTAINER%" >nul
if errorlevel 1 (
    echo [ERROR] Container %BACKEND_CONTAINER% is not running.
    exit /b 1
)

set CONTAINER_INPUT=/tmp/kiosk_data_import.json
echo [INFO] Copying fixture into %BACKEND_CONTAINER%...
docker cp "!JSON_PATH!" %BACKEND_CONTAINER%:%CONTAINER_INPUT%
if errorlevel 1 (
    echo [ERROR] docker cp failed.
    exit /b 1
)

echo [INFO] Loading into PostgreSQL (flush unless --keep-existing)...
if "%KEEP_EXISTING%"=="1" (
    docker exec %BACKEND_CONTAINER% python manage.py import_data_to_postgres --input %CONTAINER_INPUT% --keep-existing
) else (
    docker exec %BACKEND_CONTAINER% python manage.py import_data_to_postgres --input %CONTAINER_INPUT%
)
if errorlevel 1 (
    echo [ERROR] Import command failed.
    exit /b 1
)

docker exec %BACKEND_CONTAINER% rm -f %CONTAINER_INPUT% 2>nul

echo.
echo [OK] Import finished.
echo [HINT] Media/images are not in this JSON — keep backend_media or restore a media backup.
endlocal
