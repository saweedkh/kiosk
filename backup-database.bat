@echo off
REM Backup PostgreSQL + media files (Windows)

setlocal enabledelayedexpansion
cd /d "%~dp0"

set DB_CONTAINER=kiosk_db
set BACKEND_CONTAINER=kiosk_backend
set BACKUP_DIR=backups

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set STAGING_DIR=%BACKUP_DIR%\kiosk_backup_%TIMESTAMP%
set ARCHIVE_FILE=%BACKUP_DIR%\kiosk_backup_%TIMESTAMP%.zip

echo === Kiosk backup (PostgreSQL + media) ===
echo.

docker ps --format "{{.Names}}" | findstr /C:"%DB_CONTAINER%" >nul
if errorlevel 1 (
    echo [ERROR] Container %DB_CONTAINER% is not running!
    echo Start it first with: run.bat   or   docker compose up -d
    exit /b 1
)

docker ps --format "{{.Names}}" | findstr /C:"%BACKEND_CONTAINER%" >nul
if errorlevel 1 (
    echo [ERROR] Container %BACKEND_CONTAINER% is not running!
    exit /b 1
)

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"
if not exist "%STAGING_DIR%" mkdir "%STAGING_DIR%"
if not exist "%STAGING_DIR%\media" mkdir "%STAGING_DIR%\media"

echo [INFO] Dumping PostgreSQL...
docker exec %DB_CONTAINER% sh -c "pg_dump -U $POSTGRES_USER -d $POSTGRES_DB -Fc -f /tmp/kiosk.dump"
if errorlevel 1 (
    echo [ERROR] pg_dump failed!
    exit /b 1
)
docker cp %DB_CONTAINER%:/tmp/kiosk.dump "%STAGING_DIR%\database.dump"
docker exec %DB_CONTAINER% rm -f /tmp/kiosk.dump
echo [OK] database.dump created

echo [INFO] Copying media files...
docker cp %BACKEND_CONTAINER%:/app/media/. "%STAGING_DIR%\media\" 2>nul
echo [OK] media copied

echo [INFO] Creating ZIP archive...
powershell -Command "Compress-Archive -Path '%STAGING_DIR%\*' -DestinationPath '%ARCHIVE_FILE%' -Force"
if errorlevel 1 (
    echo [WARN] ZIP failed; raw folder kept at: %STAGING_DIR%
) else (
    rmdir /s /q "%STAGING_DIR%"
    echo [OK] Backup ready: %ARCHIVE_FILE%
    echo [HINT] Restore with: restore-database.bat %ARCHIVE_FILE%
)

endlocal
