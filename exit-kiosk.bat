@echo off
REM Exit Chrome kiosk mode so you can use the desktop.
REM Docker / the kiosk app keep running at http://localhost

setlocal EnableExtensions
cd /d "%~dp0"

set "KIOSK_PROFILE=%LOCALAPPDATA%\KioskAppChrome"

echo ==========================================
echo Exit Kiosk Browser
echo ==========================================
echo.
echo Closing Chrome kiosk window...
echo App containers stay running at http://localhost
echo.

REM Prefer closing only the kiosk Chrome profile; fall back to all Chrome.
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$closed = 0; Get-CimInstance Win32_Process -Filter \"Name='chrome.exe'\" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like '*KioskAppChrome*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $closed++ }; if ($closed -eq 0) { Get-Process chrome -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue }; exit 0"

timeout /t 1 /nobreak >nul

set "CHROME_PATH="
if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
) else if exist "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe" (
    set "CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
) else (
    where chrome.exe >nul 2>&1
    if not errorlevel 1 set "CHROME_PATH=chrome.exe"
)

echo.
echo ==========================================
echo Kiosk browser closed.
echo.
echo Tips:
echo   - To open the app in a normal window, press Y below
echo   - Prefer the admin button "خروج از تمام‌صفحه" on touch kiosks
echo   - To return to customer fullscreen later: run.bat
echo ==========================================
echo.

choice /C YN /M "Open Chrome in normal window (not kiosk)"
if errorlevel 2 goto done
if errorlevel 1 (
    if not "%CHROME_PATH%"=="" (
        start "" "%CHROME_PATH%" http://localhost --new-window
    ) else (
        start "" http://localhost
    )
)

:done
endlocal
exit /b 0
