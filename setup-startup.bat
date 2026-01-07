@echo off
REM Script to setup automatic startup on Windows boot
REM This script creates a scheduled task to run the kiosk application on startup

echo ==========================================
echo Kiosk Startup Setup
echo ==========================================
echo.

REM Get current directory
set "CURRENT_DIR=%~dp0"
set "SCRIPT_PATH=%CURRENT_DIR%run.bat"

echo Current directory: %CURRENT_DIR%
echo Script path: %SCRIPT_PATH%
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo ERROR: This script must be run as Administrator!
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo Creating scheduled task for automatic startup...
echo.

REM Create scheduled task
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

