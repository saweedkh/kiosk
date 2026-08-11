@echo off
REM Build the Windows delivery package (images + scripts + docs, no source)

setlocal EnableExtensions
cd /d "%~dp0"

echo ==========================================
echo Creating Delivery Package
echo ==========================================
echo.

set PACKAGE_NAME=kiosk-app
set PACKAGE_DIR=delivery-package

echo Cleaning up old package...
if exist "%PACKAGE_DIR%" rmdir /s /q "%PACKAGE_DIR%"
if exist "%PACKAGE_NAME%.zip" del /f /q "%PACKAGE_NAME%.zip"
mkdir "%PACKAGE_DIR%"

echo Step 1: Building Docker images...
call build-images.bat
if errorlevel 1 (
    echo Error building images
    exit /b 1
)

echo.
echo Step 2: Copying files to package...

echo [compose]
copy /Y docker-compose.production.yml "%PACKAGE_DIR%\docker-compose.yml" >nul
if errorlevel 1 (
    echo ERROR: Failed to copy docker-compose.production.yml
    exit /b 1
)
copy /Y docker-compose.production.host-network.yml "%PACKAGE_DIR%\" >nul

echo [startup scripts]
REM Do NOT copy build-images.bat / rebuild-and-run.bat (source-repo only)
copy /Y run.bat "%PACKAGE_DIR%\" >nul
copy /Y stop.bat "%PACKAGE_DIR%\" >nul
copy /Y exit-kiosk.bat "%PACKAGE_DIR%\" >nul
copy /Y setup-startup.bat "%PACKAGE_DIR%\" >nul
copy /Y update-images.bat "%PACKAGE_DIR%\" >nul

echo [database scripts]
copy /Y backup-database.bat "%PACKAGE_DIR%\" >nul
copy /Y restore-database.bat "%PACKAGE_DIR%\" >nul
copy /Y access-database.bat "%PACKAGE_DIR%\" >nul
copy /Y export-sqlite-data.bat "%PACKAGE_DIR%\" >nul
copy /Y import-data-to-postgres.bat "%PACKAGE_DIR%\" >nul
copy /Y migrate-sqlite-to-postgres.bat "%PACKAGE_DIR%\" >nul
copy /Y fix-backend-db.bat "%PACKAGE_DIR%\" >nul
copy /Y reset-postgres-password.bat "%PACKAGE_DIR%\" >nul
copy /Y reset-db-and-run.bat "%PACKAGE_DIR%\" >nul
copy /Y sync-postgres-password.bat "%PACKAGE_DIR%\" >nul
copy /Y check-payment-env.bat "%PACKAGE_DIR%\" >nul
if exist "scripts\sync-postgres-password.sh" (
    mkdir "%PACKAGE_DIR%\scripts" >nul 2>&1
    copy /Y scripts\sync-postgres-password.sh "%PACKAGE_DIR%\scripts\" >nul
)

echo [docker fix scripts]
copy /Y fix-docker-safe.bat "%PACKAGE_DIR%\" >nul
copy /Y fix-docker-io-error.bat "%PACKAGE_DIR%\" >nul

echo [docs]
copy /Y README.txt "%PACKAGE_DIR%\" >nul
copy /Y PACKAGE_CONTENTS.md "%PACKAGE_DIR%\" >nul
copy /Y DATABASE_MANAGEMENT.md "%PACKAGE_DIR%\" >nul
copy /Y docs\OPERATIONS.md "%PACKAGE_DIR%\OPERATIONS.md" >nul
copy /Y docs\MIGRATE_SQLITE_TO_POSTGRES.md "%PACKAGE_DIR%\MIGRATE_SQLITE_TO_POSTGRES.md" >nul
if exist "docs\POS_BRIDGE.md" copy /Y docs\POS_BRIDGE.md "%PACKAGE_DIR%\POS_BRIDGE.md" >nul
if exist "TROUBLESHOOTING.md" copy /Y TROUBLESHOOTING.md "%PACKAGE_DIR%\" >nul
if exist "NETWORK_ACCESS.md" copy /Y NETWORK_ACCESS.md "%PACKAGE_DIR%\" >nul

echo [pos_bridge + official PNA DLL]
if not exist "pos_bridge\app.py" (
    echo ERROR: pos_bridge\ missing
    exit /b 1
)
if not exist "kiosk_backend\pna.pcpos.dll" (
    echo ERROR: kiosk_backend\pna.pcpos.dll missing
    exit /b 1
)
mkdir "%PACKAGE_DIR%\pos_bridge" >nul 2>&1
robocopy "pos_bridge" "%PACKAGE_DIR%\pos_bridge" /E /NFL /NDL /NJH /NJS /nc /ns /np /XD __pycache__ .git /XF .env *.pyc >nul
set ROBOCOPY_RC=%ERRORLEVEL%
if %ROBOCOPY_RC% GEQ 8 (
    echo ERROR: Failed to copy pos_bridge ^(robocopy %ROBOCOPY_RC%^)
    exit /b 1
)
copy /Y "kiosk_backend\pna.pcpos.dll" "%PACKAGE_DIR%\pos_bridge\pna.pcpos.dll" >nul
if errorlevel 1 (
    echo ERROR: Failed to copy pna.pcpos.dll into pos_bridge
    exit /b 1
)
if exist "docs\POS_BRIDGE.md" copy /Y docs\POS_BRIDGE.md "%PACKAGE_DIR%\pos_bridge\POS_BRIDGE.md" >nul

echo [env]
if not exist ".env.example" (
    echo ERROR: .env.example missing
    exit /b 1
)
copy /Y .env.example "%PACKAGE_DIR%\.env.example" >nul
copy /Y .env.example "%PACKAGE_DIR%\.env" >nul
echo     .env created from .env.example — edit SECRET_KEY and POSTGRES_PASSWORD on site

echo [images]
if not exist "images\backend.tar" (
    echo ERROR: images\backend.tar missing after build
    exit /b 1
)
if not exist "images\frontend.tar" (
    echo ERROR: images\frontend.tar missing after build
    exit /b 1
)
if not exist "images\nginx.tar" (
    echo ERROR: images\nginx.tar missing after build
    exit /b 1
)
if not exist "images\postgres.tar" (
    echo ERROR: images\postgres.tar missing after build
    echo Rebuild with the updated build-images.bat so Postgres is saved offline.
    exit /b 1
)
xcopy /E /I /Y images "%PACKAGE_DIR%\images" >nul
if errorlevel 1 (
    echo ERROR: Failed to copy images directory
    exit /b 1
)

echo.
echo ==========================================
echo Verifying package contents...
echo ==========================================
set MISSING=0
for %%F in (
    docker-compose.yml
    docker-compose.production.host-network.yml
    run.bat
    stop.bat
    exit-kiosk.bat
    setup-startup.bat
    update-images.bat
    backup-database.bat
    restore-database.bat
    access-database.bat
    export-sqlite-data.bat
    import-data-to-postgres.bat
    migrate-sqlite-to-postgres.bat
    fix-backend-db.bat
    reset-postgres-password.bat
    reset-db-and-run.bat
    sync-postgres-password.bat
    fix-docker-safe.bat
    fix-docker-io-error.bat
    README.txt
    PACKAGE_CONTENTS.md
    OPERATIONS.md
    MIGRATE_SQLITE_TO_POSTGRES.md
    DATABASE_MANAGEMENT.md
    TROUBLESHOOTING.md
    NETWORK_ACCESS.md
    POS_BRIDGE.md
    .env
    .env.example
    pos_bridge\app.py
    pos_bridge\run.bat
    pos_bridge\start_background.bat
    pos_bridge\stop_bridge.bat
    pos_bridge\resolve_python.bat
    pos_bridge\dll_client.py
    pos_bridge\requirements.txt
    pos_bridge\.env.example
    pos_bridge\pna.pcpos.dll
    images\backend.tar
    images\frontend.tar
    images\nginx.tar
    images\postgres.tar
) do (
    if not exist "%PACKAGE_DIR%\%%F" (
        echo [MISSING] %%F
        set MISSING=1
    ) else (
        echo [OK] %%F
    )
)
if "%MISSING%"=="1" (
    echo ERROR: Package is incomplete.
    pause
    exit /b 1
)

echo.
echo Step 3: Creating ZIP archive...
powershell -Command "Compress-Archive -Path '%PACKAGE_DIR%\*' -DestinationPath '%PACKAGE_NAME%.zip' -Force"
if errorlevel 1 (
    echo ERROR: Failed to create ZIP file!
    pause
    exit /b 1
)
if not exist "%PACKAGE_NAME%.zip" (
    echo ERROR: ZIP file was not created!
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Package created successfully!
echo File: %PACKAGE_NAME%.zip
echo.
echo Inside the ZIP (see PACKAGE_CONTENTS.md):
echo   - docker-compose.yml + Postgres stack
echo   - images\backend.tar frontend.tar nginx.tar postgres.tar
echo     ^(bale_bot = same as backend — no separate bot image^)
echo   - run/stop/exit-kiosk/setup-startup/update-images
echo   - fix-docker-safe ^(NOT build-images / rebuild-and-run^)
echo   - backup/restore/access + SQLite migrate scripts
echo   - .env / .env.example (COMPLETE)
echo   - OPERATIONS.md + other docs
echo   - pos_bridge\ + pna.pcpos.dll + POS_BRIDGE.md
echo.
echo Client steps:
echo   1. Extract ZIP
echo   2. Edit .env  ^(SECRET_KEY + POSTGRES_PASSWORD^)
echo   3. Optional migrate: see MIGRATE_SQLITE_TO_POSTGRES.md
echo   4. run.bat
echo   5. For official POS DLL bridge: POS_BRIDGE.md then pos_bridge\run.bat
echo   Update later: replace images\*.tar then update-images.bat
echo ==========================================
echo.
pause
endlocal
