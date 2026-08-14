@echo off
REM Import a Postgres dumpdata JSON into the EXE SQLite DB.
REM NO Docker. Uses kiosk-backend.exe next to kiosk.exe.
REM Close is handled: kiosk.exe is stopped so SQLite is not locked.
REM
REM Usage (on the kiosk PC):
REM   import-data-to-sqlite.bat C:\path\to\kiosk_postgres_....json
REM   Or drop the JSON file onto this .bat
REM
REM Needs the NEW sidecar (import-json). Old backend EXE will start the API instead.

setlocal enabledelayedexpansion
cd /d "%~dp0"

set "DOUBLECLICK=0"
echo %CMDCMDLINE% | findstr /I /C:" /c " >nul && set "DOUBLECLICK=1"

set EXITCODE=0
set JSON_PATH=%~1
set SQLITE_PATH=%~2
set "BACKEND_EXE="
set "KIOSK_DIR="

if /I "%~1"=="--help" (
    echo Usage: %~nx0 [export.json] [path\to\kiosk.db]
    echo Default DB: %%APPDATA%%\com.kiosk.desktop\kiosk.db
    echo.
    echo No Docker. Put this bat next to kiosk.exe, or drop the JSON onto it.
    echo Requires the new kiosk-backend EXE with import-json support.
    goto :done
)

if "%JSON_PATH%"=="" (
    for /f "delims=" %%F in ('dir /b /o-d "%~dp0kiosk_postgres_*.json" 2^>nul') do (
        set "JSON_PATH=%~dp0%%F"
        goto :have_json
    )
    for /f "delims=" %%F in ('dir /b /o-d "%~dp0exports\kiosk_postgres_*.json" 2^>nul') do (
        set "JSON_PATH=%~dp0exports\%%F"
        goto :have_json
    )
    echo [ERROR] Pass the JSON file, or drop it onto this .bat
    echo Example: %~nx0 C:\Users\Public\kiosk_postgres_20260814.json
    goto :fail
)

:have_json
if not exist "%JSON_PATH%" (
    echo [ERROR] File not found: %JSON_PATH%
    goto :fail
)

if "%SQLITE_PATH%"=="" (
    if defined APPDATA (
        set "SQLITE_PATH=%APPDATA%\com.kiosk.desktop\kiosk.db"
    ) else (
        set "SQLITE_PATH=%CD%\data\kiosk.db"
    )
)

echo === Import JSON → EXE SQLite (no Docker) ===
echo JSON:   %JSON_PATH%
echo SQLite: %SQLITE_PATH%
echo.

REM Sidecar next to this script (typical: copy bat beside kiosk.exe)
if exist "%~dp0kiosk-backend-x86_64-pc-windows-msvc.exe" set "BACKEND_EXE=%~dp0kiosk-backend-x86_64-pc-windows-msvc.exe"
if "%BACKEND_EXE%"=="" if exist "%~dp0kiosk-backend.exe" set "BACKEND_EXE=%~dp0kiosk-backend.exe"

REM Folder of the running kiosk.exe
for /f "usebackq delims=" %%P in (`powershell -NoProfile -Command "try { (Get-CimInstance Win32_Process -Filter \"Name='kiosk.exe'\" | Select-Object -First 1).ExecutablePath } catch { }"`) do (
    if not "%%P"=="" (
        for %%D in ("%%P") do set "KIOSK_DIR=%%~dpD"
    )
)
if defined KIOSK_DIR (
    if exist "%KIOSK_DIR%kiosk-backend-x86_64-pc-windows-msvc.exe" set "BACKEND_EXE=%KIOSK_DIR%kiosk-backend-x86_64-pc-windows-msvc.exe"
    if exist "%KIOSK_DIR%kiosk-backend.exe" if not exist "%BACKEND_EXE%" set "BACKEND_EXE=%KIOSK_DIR%kiosk-backend.exe"
)

if "%BACKEND_EXE%"=="" if exist "%~dp0kiosk_desktop\src-tauri\target\release\kiosk-backend-x86_64-pc-windows-msvc.exe" (
    set "BACKEND_EXE=%~dp0kiosk_desktop\src-tauri\target\release\kiosk-backend-x86_64-pc-windows-msvc.exe"
)
if "%BACKEND_EXE%"=="" if exist "%~dp0kiosk_desktop\src-tauri\binaries\kiosk-backend-x86_64-pc-windows-msvc.exe" (
    set "BACKEND_EXE=%~dp0kiosk_desktop\src-tauri\binaries\kiosk-backend-x86_64-pc-windows-msvc.exe"
)

if "%BACKEND_EXE%"=="" (
    echo [ERROR] kiosk-backend.exe not found.
    echo Copy this .bat next to kiosk.exe, or start kiosk.exe once so we can find it.
    goto :fail
)

echo [INFO] Backend: %BACKEND_EXE%
echo [INFO] Closing kiosk.exe so SQLite is not locked...
taskkill /IM kiosk.exe /F >nul 2>&1
taskkill /IM kiosk-backend-x86_64-pc-windows-msvc.exe /F >nul 2>&1
taskkill /IM kiosk-backend.exe /F >nul 2>&1
timeout /t 3 /nobreak >nul

if not defined APPDATA (
    echo [ERROR] APPDATA is not set.
    goto :fail
)
set "KIOSK_DATA_DIR=%APPDATA%\com.kiosk.desktop"
set "DJANGO_SETTINGS_MODULE=config.settings.desktop"
set "SEED_DEMO_DATA=0"
set "KIOSK_QUIET_STARTUP=0"

echo [INFO] Importing with the sidecar (1-2 min on first unpack is normal)...
echo If the API server starts instead of importing, this backend EXE is too old.
echo Rebuild / replace kiosk-backend-x86_64-pc-windows-msvc.exe next to kiosk.exe.
echo.

"%BACKEND_EXE%" import-json "%JSON_PATH%" "%SQLITE_PATH%"
if errorlevel 1 (
    echo [ERROR] Import failed.
    goto :fail
)

echo.
echo ==========================================
echo [OK] Import finished
echo DB: %SQLITE_PATH%
echo ==========================================
echo Start kiosk.exe. Login with the same admin user as Postgres.
echo Copy product images into:
echo   %KIOSK_DATA_DIR%\media
goto :done

:fail
set EXITCODE=1
echo.
echo ==========================================
echo [FAILED] Import did not finish. Read the [ERROR] above.
echo No Docker is used. JSON + kiosk-backend.exe only.
echo ==========================================
echo.

:done
if "%DOUBLECLICK%"=="1" (
    echo.
    pause
)
exit /b %EXITCODE%
