@echo off
REM One-time migration: copy data from a legacy SQLite file into PostgreSQL.
REM Prefer the two-step flow: export-sqlite-data.bat then import-data-to-postgres.bat
REM Usage:
REM   migrate-sqlite-to-postgres.bat
REM   migrate-sqlite-to-postgres.bat path\to\db.sqlite3
REM   migrate-sqlite-to-postgres.bat --keep-existing path\to\db.sqlite3

setlocal enabledelayedexpansion
cd /d "%~dp0"

set BACKEND_CONTAINER=kiosk_backend
set DB_CONTAINER=kiosk_db
set KEEP_EXISTING=0
set SQLITE_HOST_PATH=

:parse_args
if "%~1"=="" goto args_done
if /I "%~1"=="--keep-existing" (
    set KEEP_EXISTING=1
    shift
    goto parse_args
)
if /I "%~1"=="--help" (
    echo Usage: %~nx0 [--keep-existing] [path\to\db.sqlite3]
    echo Prefer: export-sqlite-data.bat then import-data-to-postgres.bat
    exit /b 0
)
if "!SQLITE_HOST_PATH!"=="" (
    set "SQLITE_HOST_PATH=%~1"
    shift
    goto parse_args
)
echo [ERROR] Unexpected argument: %~1
exit /b 1

:args_done
if "!SQLITE_HOST_PATH!"=="" (
    if exist "kiosk_backend\db.sqlite3" (
        set "SQLITE_HOST_PATH=kiosk_backend\db.sqlite3"
    ) else if exist "db.sqlite3" (
        set "SQLITE_HOST_PATH=db.sqlite3"
    ) else (
        echo [ERROR] SQLite file not found.
        echo Pass the path explicitly, or use export-sqlite-data.bat
        echo See docs\MIGRATE_SQLITE_TO_POSTGRES.md
        exit /b 1
    )
)

if not exist "!SQLITE_HOST_PATH!" (
    echo [ERROR] File not found: !SQLITE_HOST_PATH!
    exit /b 1
)

echo === Migrate SQLite to PostgreSQL (one-shot) ===
echo Source: !SQLITE_HOST_PATH!
echo.

docker ps --format "{{.Names}}" | findstr /C:"%DB_CONTAINER%" >nul
if errorlevel 1 (
    echo [ERROR] Container %DB_CONTAINER% is not running. Start the stack first.
    exit /b 1
)

docker ps --format "{{.Names}}" | findstr /C:"%BACKEND_CONTAINER%" >nul
if errorlevel 1 (
    echo [ERROR] Container %BACKEND_CONTAINER% is not running. Start the stack first.
    exit /b 1
)

echo [INFO] Copying SQLite file into %BACKEND_CONTAINER%...
docker cp "!SQLITE_HOST_PATH!" %BACKEND_CONTAINER%:/tmp/db.sqlite3
if errorlevel 1 (
    echo [ERROR] docker cp failed.
    exit /b 1
)

echo [INFO] Running import (Postgres data will be flushed unless --keep-existing)...
if "%KEEP_EXISTING%"=="1" (
    docker exec %BACKEND_CONTAINER% python manage.py migrate_sqlite_to_postgres --sqlite-path /tmp/db.sqlite3 --keep-existing
) else (
    docker exec %BACKEND_CONTAINER% python manage.py migrate_sqlite_to_postgres --sqlite-path /tmp/db.sqlite3
)
if errorlevel 1 (
    echo [ERROR] Migration command failed.
    exit /b 1
)

docker exec %BACKEND_CONTAINER% rm -f /tmp/db.sqlite3 /tmp/kiosk_sqlite_export.json 2>nul

echo.
echo [OK] Done.
echo [HINT] Media/images are NOT inside SQLite. Keep volume backend_media or restore a media backup.
endlocal
