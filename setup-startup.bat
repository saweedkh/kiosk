@echo off
REM Script to setup automatic startup on Windows boot

setlocal
cd /d "%~dp0"

echo ==========================================
echo Kiosk Startup Setup
echo ==========================================
echo.

set "CURRENT_DIR=%~dp0"
set "SCRIPT_PATH=%CURRENT_DIR%run.bat"

echo Current directory: %CURRENT_DIR%
echo Script path: %SCRIPT_PATH%
echo.

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

if not exist "%SCRIPT_PATH%" (
    echo ERROR: run.bat not found at %SCRIPT_PATH%
    pause
    exit /b 1
)

echo Creating scheduled task for automatic startup...
echo.

REM /tr uses full path; run.bat itself cds to its own directory
schtasks /create /tn "KioskApp" /tr "\"%SCRIPT_PATH%\"" /sc onstart /ru SYSTEM /rl HIGHEST /f

if errorlevel 1 (
    echo ERROR: Failed to create scheduled task!
    pause
    exit /b 1
)

echo.
echo ==========================================
echo Startup task created successfully!
echo.
echo The kiosk application will start automatically on Windows boot.
echo.
echo To remove the startup task, run:
echo schtasks /delete /tn "KioskApp" /f
echo ==========================================
echo.
pause
endlocal
