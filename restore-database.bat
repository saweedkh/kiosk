@echo off
REM Restore PostgreSQL + media from backup archive
REM Usage: restore-database.bat backups\kiosk_backup_YYYYMMDD_HHMMSS.zip

setlocal enabledelayedexpansion
cd /d "%~dp0"

set DB_CONTAINER=kiosk_db
set BACKEND_CONTAINER=kiosk_backend
set BOT_CONTAINER=kiosk_bale_bot

set "COMPOSE=docker compose"
docker compose version >nul 2>&1
if errorlevel 1 set "COMPOSE=docker-compose"

if "%~1"=="" (
    echo [ERROR] Pass the backup file path.
    echo Example: %~nx0 backups\kiosk_backup_20260101_120000.zip
    exit /b 1
)

set "BACKUP_FILE=%~1"
if not exist "%BACKUP_FILE%" (
    echo [ERROR] File not found: %BACKUP_FILE%
    exit /b 1
)

docker ps --format "{{.Names}}" | findstr /C:"%DB_CONTAINER%" >nul
if errorlevel 1 (
    echo [ERROR] Container %DB_CONTAINER% is not running!
    exit /b 1
)

echo === Restore kiosk backup ===
echo.

echo [INFO] Safety backup of current state...
call "%~dp0backup-database.bat"
echo.

set TEMP_DIR=%TEMP%\kiosk_restore_%RANDOM%
mkdir "%TEMP_DIR%"

echo [INFO] Extracting archive...
powershell -Command "Expand-Archive -Path '%BACKUP_FILE%' -DestinationPath '%TEMP_DIR%' -Force"
if errorlevel 1 (
    echo [ERROR] Extract failed!
    rmdir /s /q "%TEMP_DIR%"
    exit /b 1
)

set DUMP_FILE=
for /r "%TEMP_DIR%" %%f in (database.dump) do set DUMP_FILE=%%f

if "%DUMP_FILE%"=="" (
    echo [ERROR] database.dump not found inside the backup!
    rmdir /s /q "%TEMP_DIR%"
    exit /b 1
)

set MEDIA_DIR=
for /d /r "%TEMP_DIR%" %%d in (media) do set MEDIA_DIR=%%d

echo [INFO] Stopping backend and bale_bot...
docker stop %BACKEND_CONTAINER% %BOT_CONTAINER% 2>nul
timeout /t 2 /nobreak >nul

echo [INFO] Restoring PostgreSQL...
docker cp "%DUMP_FILE%" %DB_CONTAINER%:/tmp/restore.dump
docker exec %DB_CONTAINER% sh -c "pg_restore -U $POSTGRES_USER -d $POSTGRES_DB --clean --if-exists --no-owner --no-acl /tmp/restore.dump"
docker exec %DB_CONTAINER% rm -f /tmp/restore.dump

echo [INFO] Starting backend to restore media...
docker start %BACKEND_CONTAINER% 2>nul
if errorlevel 1 %COMPOSE% up -d backend
timeout /t 5 /nobreak >nul

if not "%MEDIA_DIR%"=="" (
    echo [INFO] Restoring media...
    docker exec %BACKEND_CONTAINER% sh -c "rm -rf /app/media/* /app/media/.[!.]* 2>/dev/null || true"
    docker cp "%MEDIA_DIR%\." %BACKEND_CONTAINER%:/app/media/
) else (
    echo [INFO] No media folder in backup; skipped.
)

echo [INFO] Restarting services...
%COMPOSE% up -d backend bale_bot 2>nul
docker start %BACKEND_CONTAINER% %BOT_CONTAINER% 2>nul

rmdir /s /q "%TEMP_DIR%"

echo.
echo [OK] Restore finished.
endlocal
