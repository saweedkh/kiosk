@echo off
REM One-shot: Docker Postgres + media → desktop SQLite (kiosk.exe).
REM Works with an OLD backend image: uses built-in dumpdata + a small injected script.
REM Does NOT rebuild or update the Docker image.
REM
REM Usage:
REM   migrate-postgres-to-sqlite.bat
REM   migrate-postgres-to-sqlite.bat C:\path\to\kiosk.db
REM
REM Needs BOTH containers: kiosk_db (Postgres) AND kiosk_backend.
REM   docker compose up -d

setlocal enabledelayedexpansion
cd /d "%~dp0"

REM Keep the window open if this .bat was double-clicked (cmd.exe /c ...).
set "DOUBLECLICK=0"
echo %CMDCMDLINE% | findstr /I /C:" /c " >nul && set "DOUBLECLICK=1"

set EXITCODE=0
set BACKEND_CONTAINER=kiosk_backend
set DB_CONTAINER=kiosk_db
set SQLITE_PATH=%~1
set HELPER=%CD%\kiosk_backend\scripts\import_fixture_to_sqlite.py

if /I "%~1"=="--help" (
    echo Usage: %~nx0 [path\to\kiosk.db]
    echo Default: %%APPDATA%%\com.kiosk.desktop\kiosk.db
    echo.
    echo Requires running containers: kiosk_db AND kiosk_backend
    echo   docker compose up -d
    goto :done
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
echo This can take 1-3 minutes. Do not close this window.
echo.

if not exist "%HELPER%" (
    echo [ERROR] Missing helper script:
    echo   %HELPER%
    goto :fail
)

where docker >nul 2>&1
if errorlevel 1 (
    echo [ERROR] docker is not in PATH.
    echo Open Docker Desktop, then run this from Command Prompt in the repo folder:
    echo   %~nx0
    goto :fail
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Desktop is not running / not ready.
    echo Start Docker Desktop, wait until it is idle, then:
    echo   docker compose up -d
    echo   %~nx0
    goto :fail
)

docker ps --format "{{.Names}}" | findstr /C:"%DB_CONTAINER%" >nul
if errorlevel 1 (
    echo [ERROR] Postgres container %DB_CONTAINER% is not running.
    echo Data lives in Postgres. This migrate cannot run without it.
    echo Start it:
    echo   docker compose up -d
    echo Then run this script again.
    goto :fail
)

docker ps --format "{{.Names}}" | findstr /C:"%BACKEND_CONTAINER%" >nul
if errorlevel 1 (
    echo [ERROR] Container %BACKEND_CONTAINER% is not running.
    echo dumpdata runs inside this container. Start the stack:
    echo   docker compose up -d
    echo Then run this script again.
    goto :fail
)

echo [OK] Docker is up. Containers: %DB_CONTAINER% + %BACKEND_CONTAINER%
echo.

echo [INFO] Closing kiosk.exe so SQLite is not locked...
taskkill /IM kiosk.exe /F >nul 2>&1
taskkill /IM kiosk-backend-x86_64-pc-windows-msvc.exe /F >nul 2>&1
timeout /t 2 /nobreak >nul

echo [INFO] Exporting PostgreSQL with built-in dumpdata (this is the slow part)...
call "%~dp0export-postgres-data.bat"
if errorlevel 1 (
    echo [ERROR] Export failed. Postgres may still be starting, or dumpdata crashed.
    echo Check: docker compose ps
    echo Logs:  docker logs %BACKEND_CONTAINER% --tail 80
    goto :fail
)

set LATEST=
for /f "delims=" %%F in ('dir /b /o-d "exports\kiosk_postgres_*.json" 2^>nul') do (
    set "LATEST=%CD%\exports\%%F"
    goto :got_json
)

echo [ERROR] Export JSON not found in exports\
goto :fail

:got_json
echo [INFO] Using export: %LATEST%

echo [INFO] Wiping old SQLite + WAL so leftover demo rows cannot come back...
del /f /q "%SQLITE_PATH%" 2>nul
del /f /q "%SQLITE_PATH%-wal" 2>nul
del /f /q "%SQLITE_PATH%-shm" 2>nul
del /f /q "%SQLITE_PATH%-journal" 2>nul

echo [INFO] Replacing media folder (old demo images removed)...
if exist "%MEDIA_DIR%" rd /s /q "%MEDIA_DIR%"
mkdir "%MEDIA_DIR%"
docker cp "%BACKEND_CONTAINER%:/app/media/." "%MEDIA_DIR%\"
if errorlevel 1 (
    echo [WARN] Media copy failed or media folder is empty. Continuing with DB import.
)

echo.
echo [INFO] Importing inside the running container (old image is fine)...
docker cp "%LATEST%" %BACKEND_CONTAINER%:/tmp/kiosk_postgres_import.json
if errorlevel 1 (
    echo [ERROR] docker cp of JSON into container failed.
    goto :fail
)
docker cp "%HELPER%" %BACKEND_CONTAINER%:/tmp/import_fixture_to_sqlite.py
if errorlevel 1 (
    echo [ERROR] docker cp of helper script failed.
    goto :fail
)

docker exec %BACKEND_CONTAINER% python /tmp/import_fixture_to_sqlite.py /tmp/kiosk_postgres_import.json /tmp/kiosk.db
if errorlevel 1 (
    echo [ERROR] Import inside Docker failed.
    goto :fail
)

if not exist "%SQLITE_DIR%" mkdir "%SQLITE_DIR%"
docker cp %BACKEND_CONTAINER%:/tmp/kiosk.db "%SQLITE_PATH%"
if errorlevel 1 (
    echo [ERROR] Could not copy kiosk.db out of the container.
    goto :fail
)

echo postgres> "%SQLITE_DIR%no_demo_seed"

docker exec %BACKEND_CONTAINER% rm -f /tmp/kiosk_postgres_import.json /tmp/kiosk.db /tmp/import_fixture_to_sqlite.py 2>nul

echo.
echo ==========================================
echo [OK] Postgres → SQLite done
echo DB:    %SQLITE_PATH%
echo Media: %MEDIA_DIR%
echo ==========================================
echo Start kiosk.exe. Login with the same admin user as Postgres.
goto :done

:fail
set EXITCODE=1
echo.
echo ==========================================
echo [FAILED] Postgres → SQLite did not finish.
echo Window was closing instantly before because the error
echo happened in the first few seconds (Docker/containers).
echo ==========================================
echo.
goto :done

:done
if "%DOUBLECLICK%"=="1" (
    echo.
    pause
)
exit /b %EXITCODE%
