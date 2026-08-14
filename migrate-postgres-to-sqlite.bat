@echo off
REM One-shot: Docker Postgres + media → desktop SQLite (kiosk.exe).
REM Works with an OLD backend image: uses built-in dumpdata + a small injected script.
REM Does NOT rebuild or update the Docker image.
REM
REM Usage:
REM   migrate-postgres-to-sqlite.bat
REM   migrate-postgres-to-sqlite.bat C:\path\to\kiosk.db

setlocal enabledelayedexpansion
cd /d "%~dp0"

set BACKEND_CONTAINER=kiosk_backend
set SQLITE_PATH=%~1
set HELPER=%CD%\kiosk_backend\scripts\import_fixture_to_sqlite.py

if /I "%~1"=="--help" (
    echo Usage: %~nx0 [path\to\kiosk.db]
    echo Default: %%APPDATA%%\com.kiosk.desktop\kiosk.db
    exit /b 0
)

if "%SQLITE_PATH%"=="" (
    if defined APPDATA (
        set "SQLITE_PATH=%APPDATA%\com.kiosk.desktop\kiosk.db"
    ) else (
        set "SQLITE_PATH=%CD%\data\kiosk.db"
    )
)

for %%I in ("%SQLITE_PATH%") do set SQLITE_DIR=%%~dpI
set "MEDIA_DIR=%SQLITE_DIR%media"

echo === Postgres (Docker) → SQLite (EXE) ===
echo SQLite: %SQLITE_PATH%
echo Media:  %MEDIA_DIR%
echo.

if not exist "%HELPER%" (
    echo [ERROR] Missing helper script:
    echo   %HELPER%
    exit /b 1
)

docker ps --format "{{.Names}}" | findstr /C:"%BACKEND_CONTAINER%" >nul
if errorlevel 1 (
    echo [ERROR] Container %BACKEND_CONTAINER% is not running.
    echo Start the stack first: docker compose up -d
    exit /b 1
)

echo [INFO] Closing kiosk.exe so SQLite is not locked...
taskkill /IM kiosk.exe /F >nul 2>&1
taskkill /IM kiosk-backend-x86_64-pc-windows-msvc.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul

echo [INFO] Exporting PostgreSQL with built-in dumpdata...
call "%~dp0export-postgres-data.bat"
if errorlevel 1 (
    echo [ERROR] Export failed.
    exit /b 1
)

set LATEST=
for /f "delims=" %%F in ('dir /b /o-d "exports\kiosk_postgres_*.json" 2^>nul') do (
    set "LATEST=%CD%\exports\%%F"
    goto :got_json
)

echo [ERROR] Export JSON not found in exports\
exit /b 1

:got_json
echo [INFO] Using export: %LATEST%

echo [INFO] Copying media from %BACKEND_CONTAINER%...
if not exist "%MEDIA_DIR%" mkdir "%MEDIA_DIR%"
docker cp "%BACKEND_CONTAINER%:/app/media/." "%MEDIA_DIR%\"
if errorlevel 1 (
    echo [WARN] Media copy failed or media folder is empty. Continuing with DB import.
)

echo.
echo [INFO] Importing inside the running container (old image is fine)...
docker cp "%LATEST%" %BACKEND_CONTAINER%:/tmp/kiosk_postgres_import.json
if errorlevel 1 (
    echo [ERROR] docker cp of JSON into container failed.
    exit /b 1
)
docker cp "%HELPER%" %BACKEND_CONTAINER%:/tmp/import_fixture_to_sqlite.py
if errorlevel 1 (
    echo [ERROR] docker cp of helper script failed.
    exit /b 1
)

docker exec %BACKEND_CONTAINER% python /tmp/import_fixture_to_sqlite.py /tmp/kiosk_postgres_import.json /tmp/kiosk.db
if errorlevel 1 (
    echo [ERROR] Import inside Docker failed.
    exit /b 1
)

if not exist "%SQLITE_DIR%" mkdir "%SQLITE_DIR%"
docker cp %BACKEND_CONTAINER%:/tmp/kiosk.db "%SQLITE_PATH%"
if errorlevel 1 (
    echo [ERROR] Could not copy kiosk.db out of the container.
    exit /b 1
)

docker exec %BACKEND_CONTAINER% rm -f /tmp/kiosk_postgres_import.json /tmp/kiosk.db /tmp/import_fixture_to_sqlite.py 2>nul

echo.
echo ==========================================
echo [OK] Postgres → SQLite done
echo DB:    %SQLITE_PATH%
echo Media: %MEDIA_DIR%
echo ==========================================
echo Start kiosk.exe. Login with the same admin user as Postgres.
endlocal
