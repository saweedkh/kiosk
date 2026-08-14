@echo off
REM Export kiosk data from Docker PostgreSQL to JSON on the host.
REM Usage: export-postgres-data.bat

setlocal
cd /d "%~dp0"

set BACKEND_CONTAINER=kiosk_backend
set EXPORT_DIR=exports
set CONTAINER_OUTPUT=/tmp/kiosk_postgres_export.json

for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set HOST_OUTPUT=%EXPORT_DIR%\kiosk_postgres_%TIMESTAMP%.json

echo === Export PostgreSQL data from Docker ===
echo.

docker ps --format "{{.Names}}" | findstr /C:"%BACKEND_CONTAINER%" >nul
if errorlevel 1 (
    echo [ERROR] Container %BACKEND_CONTAINER% is not running.
    echo Start the old stack: docker compose up -d
    exit /b 1
)

if not exist "%EXPORT_DIR%" mkdir "%EXPORT_DIR%"

echo [INFO] Dumping Postgres inside %BACKEND_CONTAINER%...
docker exec %BACKEND_CONTAINER% python manage.py dumpdata --natural-foreign --natural-primary --indent 2 -e contenttypes.contenttype -e auth.permission -e admin.logentry -e sessions.session -e token_blacklist.outstandingtoken -e token_blacklist.blacklistedtoken --output %CONTAINER_OUTPUT%
if errorlevel 1 (
    echo [ERROR] dumpdata failed.
    exit /b 1
)

echo [INFO] Copying JSON to host...
docker cp %BACKEND_CONTAINER%:%CONTAINER_OUTPUT% "%HOST_OUTPUT%"
if errorlevel 1 (
    echo [ERROR] docker cp failed.
    exit /b 1
)
docker exec %BACKEND_CONTAINER% rm -f %CONTAINER_OUTPUT% 2>nul

echo.
echo ==========================================
echo [OK] EXPORT DONE
echo File: %CD%\%HOST_OUTPUT%
echo ==========================================
echo.
echo Next (Postgres can be stopped now):
echo   import-data-to-sqlite.bat %HOST_OUTPUT%
echo Or just:
echo   import-data-to-sqlite.bat
echo.
echo Also copy images:
echo   docker cp %BACKEND_CONTAINER%:/app/media/. data\media\
endlocal
