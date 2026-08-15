@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================
echo  Kiosk Bale starter
echo  folder: %CD%
echo ========================================
echo.

if not exist "kiosk-backend\kiosk-backend.exe" (
  echo ERROR: kiosk-backend\kiosk-backend.exe not found.
  echo Put this .bat next to kiosk.exe
  pause
  exit /b 1
)

REM migrate exe has a console. Copy it so the filename is NOT kiosk-backend-migrate
REM (that name always runs migrate). kiosk-bale.exe bale_poll starts the bot and shows errors.
if exist "kiosk-backend\kiosk-backend-migrate.exe" (
  copy /Y "kiosk-backend\kiosk-backend-migrate.exe" "kiosk-backend\kiosk-bale.exe" >nul
  echo Using console exe: kiosk-backend\kiosk-bale.exe bale_poll
  echo Leave this window open. Refresh Admin - Bale after 20 seconds.
  echo.
  "kiosk-backend\kiosk-bale.exe" bale_poll
) else (
  echo No migrate exe. Trying windowed kiosk-backend.exe bale_poll
  echo If this window stays empty, the process has no console.
  echo.
  "kiosk-backend\kiosk-backend.exe" bale_poll
)

echo.
echo bale_poll exited. If the bot never worked, the error is above.
pause
