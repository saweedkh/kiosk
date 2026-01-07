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
echo Copying docker-compose files...
copy docker-compose.production.yml "%PACKAGE_DIR%\docker-compose.yml" >nul
if errorlevel 1 echo ERROR: Failed to copy docker-compose.production.yml

REM Copy run scripts
echo Copying run scripts...
copy run.bat "%PACKAGE_DIR%\" >nul
if errorlevel 1 echo ERROR: Failed to copy run.bat
copy stop.bat "%PACKAGE_DIR%\" >nul
if errorlevel 1 echo ERROR: Failed to copy stop.bat
copy rebuild-and-run.bat "%PACKAGE_DIR%\" >nul
if errorlevel 1 (
    echo ERROR: Failed to copy rebuild-and-run.bat
) else (
    echo Copied rebuild-and-run.bat
)
copy setup-startup.bat "%PACKAGE_DIR%\" >nul
if errorlevel 1 (
    echo ERROR: Failed to copy setup-startup.bat
) else (
    echo Copied setup-startup.bat
)

REM Copy README and documentation
echo Copying documentation...
copy README.txt "%PACKAGE_DIR%\" >nul
if errorlevel 1 echo ERROR: Failed to copy README.txt
copy NETWORK_ACCESS.md "%PACKAGE_DIR%\" >nul
if errorlevel 1 echo ERROR: Failed to copy NETWORK_ACCESS.md
copy TROUBLESHOOTING.md "%PACKAGE_DIR%\" >nul
if errorlevel 1 (
    echo ERROR: Failed to copy TROUBLESHOOTING.md
) else (
    echo Copied TROUBLESHOOTING.md
)

REM Copy database management scripts and documentation (only .bat files for Windows)
echo Copying database management scripts...
copy backup-database.bat "%PACKAGE_DIR%\" >nul
if errorlevel 1 echo ERROR: Failed to copy backup-database.bat
copy restore-database.bat "%PACKAGE_DIR%\" >nul
if errorlevel 1 echo ERROR: Failed to copy restore-database.bat
copy access-database.bat "%PACKAGE_DIR%\" >nul
if errorlevel 1 echo ERROR: Failed to copy access-database.bat
copy DATABASE_MANAGEMENT.md "%PACKAGE_DIR%\" >nul
if errorlevel 1 echo ERROR: Failed to copy DATABASE_MANAGEMENT.md
echo Copied database management scripts and documentation

REM Copy Docker fix scripts (only .bat files for Windows)
echo Copying Docker fix scripts...
copy fix-docker-safe.bat "%PACKAGE_DIR%\" >nul
if errorlevel 1 (
    echo ERROR: Failed to copy fix-docker-safe.bat
) else (
    echo Copied fix-docker-safe.bat
)

REM Copy .env file if exists
if exist ".env" (
    copy .env "%PACKAGE_DIR%\" >nul
    echo Copied .env file
) else (
    echo Warning: .env file not found, client should create it
)

REM Copy alternative docker-compose for WSL2/Linux (optional)
copy docker-compose.production.host-network.yml "%PACKAGE_DIR%\" >nul
if errorlevel 1 echo ERROR: Failed to copy docker-compose.production.host-network.yml

REM Copy images directory
echo Copying Docker images...
xcopy /E /I /Y images "%PACKAGE_DIR%\images" >nul
if errorlevel 1 (
    echo ERROR: Failed to copy images directory
) else (
    echo Copied images directory
)

REM Verify all files are copied
echo.
echo Verifying copied files...
dir "%PACKAGE_DIR%\*.bat" /b >nul 2>&1
if errorlevel 1 (
    echo WARNING: No .bat files found in package directory!
) else (
    echo Found .bat files in package
)
dir "%PACKAGE_DIR%\*.md" /b >nul 2>&1
if errorlevel 1 (
    echo WARNING: No .md files found in package directory!
) else (
    echo Found .md files in package
)

REM Create ZIP file (requires PowerShell)
echo.
echo Step 3: Creating ZIP archive...
powershell -Command "Compress-Archive -Path '%PACKAGE_DIR%\*' -DestinationPath '%PACKAGE_NAME%.zip' -Force"
if errorlevel 1 (
    echo ERROR: Failed to create ZIP file!
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Package created successfully!
echo File: %PACKAGE_NAME%.zip
echo ==========================================
pause

