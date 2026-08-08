@echo off
REM Open interactive psql inside Postgres container

setlocal
cd /d "%~dp0"

set DB_CONTAINER=kiosk_db

echo === Access kiosk PostgreSQL ===
echo.

docker ps --format "{{.Names}}" | findstr /C:"%DB_CONTAINER%" >nul
if errorlevel 1 (
    echo [ERROR] Container %DB_CONTAINER% is not running!
    echo Start it first with: run.bat
    exit /b 1
)

echo Useful commands:
echo   \dt              list tables
echo   \d+ tablename    table details
echo   \q               quit
echo.
echo Opening psql...
docker exec -it %DB_CONTAINER% sh -c "psql -U $POSTGRES_USER -d $POSTGRES_DB"

endlocal
