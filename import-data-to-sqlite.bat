@echo off
REM Import a Postgres JSON export into desktop SQLite.
REM Close kiosk.exe first.
REM
REM Usage:
REM   import-data-to-sqlite.bat exports\kiosk_postgres_....json
REM   import-data-to-sqlite.bat exports\foo.json C:\Users\you\AppData\Roaming\com.kiosk.desktop\kiosk.db

setlocal enabledelayedexpansion
cd /d "%~dp0"

set JSON_PATH=%~1
set SQLITE_PATH=%~2

if "%JSON_PATH%"=="" (
    echo [ERROR] Pass the export JSON path.
    echo Example: %~nx0 exports\kiosk_postgres_20260813_120000.json
    exit /b 1
)

if not exist "%JSON_PATH%" (
    echo [ERROR] File not found: %JSON_PATH%
    exit /b 1
)

if "%SQLITE_PATH%"=="" (
    if defined APPDATA (
        set "SQLITE_PATH=%APPDATA%\com.kiosk.desktop\kiosk.db"
    ) else (
        set "SQLITE_PATH=%CD%\data\kiosk.db"
    )
)

set PYTHON=%CD%\kiosk_backend\.venv\Scripts\python.exe
if not exist "%PYTHON%" set PYTHON=python

echo === Import Postgres dump into SQLite ===
echo JSON:   %JSON_PATH%
echo SQLite: %SQLITE_PATH%
echo.

for %%I in ("%SQLITE_PATH%") do set SQLITE_DIR=%%~dpI
if not exist "%SQLITE_DIR%" mkdir "%SQLITE_DIR%"

set DJANGO_SETTINGS_MODULE=config.settings.desktop
set SEED_DEMO_DATA=0
set PAYMENT_GATEWAY_NAME=mock

"%PYTHON%" "%CD%\kiosk_backend\manage.py" import_data_to_sqlite --input "%JSON_PATH%" --sqlite-path "%SQLITE_PATH%"
if errorlevel 1 (
    echo [ERROR] Import failed. Close kiosk.exe and retry.
    exit /b 1
)

echo.
echo [OK] Import finished.
echo Copy images:
echo   docker cp kiosk_backend:/app/media/. "%SQLITE_DIR%media\"
endlocal
