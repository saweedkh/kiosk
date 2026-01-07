@echo off
REM Script to create the final delivery package for the client
REM This creates a ZIP file with all necessary files (no source code)

echo ==========================================
echo Creating Delivery Package
echo ==========================================
echo.

set PACKAGE_NAME=kiosk-app
set PACKAGE_DIR=delivery-package

REM Clean up old package if exists
if exist "%PACKAGE_DIR%" rmdir /s /q "%PACKAGE_DIR%"
mkdir "%PACKAGE_DIR%"

REM Build images first
echo Step 1: Building Docker images...
call build-images.bat
if errorlevel 1 (
    echo Error building images
    exit /b 1
)

REM Copy necessary files
echo.
echo Step 2: Copying files to package...

REM Copy docker-compose file
copy docker-compose.production.yml "%PACKAGE_DIR%\docker-compose.yml" >nul

REM Copy run scripts
copy run.bat "%PACKAGE_DIR%\" >nul
copy stop.bat "%PACKAGE_DIR%\" >nul

REM Copy README and documentation
copy README.txt "%PACKAGE_DIR%\" >nul
copy NETWORK_ACCESS.md "%PACKAGE_DIR%\" >nul

REM Copy database management scripts and documentation (only .bat files for Windows)
copy backup-database.bat "%PACKAGE_DIR%\" >nul
copy restore-database.bat "%PACKAGE_DIR%\" >nul
copy access-database.bat "%PACKAGE_DIR%\" >nul
copy DATABASE_MANAGEMENT.md "%PACKAGE_DIR%\" >nul
echo Copied database management scripts and documentation

REM Copy .env file if exists
if exist ".env" (
    copy .env "%PACKAGE_DIR%\" >nul
    echo Copied .env file
) else (
    echo Warning: .env file not found, client should create it
)

REM Copy alternative docker-compose for WSL2/Linux (optional)
copy docker-compose.production.host-network.yml "%PACKAGE_DIR%\" >nul

REM Copy images directory
xcopy /E /I /Y images "%PACKAGE_DIR%\images" >nul

REM Create ZIP file (requires PowerShell)
echo.
echo Step 3: Creating ZIP archive...
powershell -Command "Compress-Archive -Path '%PACKAGE_DIR%\*' -DestinationPath '%PACKAGE_NAME%.zip' -Force"

echo.
echo ==========================================
echo Package created successfully!
echo File: %PACKAGE_NAME%.zip
echo ==========================================
pause

