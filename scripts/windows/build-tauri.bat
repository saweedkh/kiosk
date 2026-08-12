@echo off
REM Full Tauri build: Django sidecar + Next static + kiosk.exe
setlocal EnableExtensions
cd /d "%~dp0..\.."

echo === Kiosk Tauri Full Stack Build ===

if exist "kiosk_backend\pna.pcpos.dll" (
  if not exist "kiosk_desktop\src-tauri\resources" mkdir "kiosk_desktop\src-tauri\resources"
  copy /Y "kiosk_backend\pna.pcpos.dll" "kiosk_desktop\src-tauri\resources\pna.pcpos.dll" >nul
  echo Copied pna.pcpos.dll
)

call "%~dp0build-backend-sidecar.bat"
if errorlevel 1 exit /b 1

cd kiosk_desktop
if not exist node_modules call npm install
call npm run build
if errorlevel 1 exit /b 1

REM Optional POS DLL next to release bundle (not required for CI)
if exist "kiosk_backend\pna.pcpos.dll" (
  copy /Y "kiosk_backend\pna.pcpos.dll" "src-tauri\target\release\pna.pcpos.dll" >nul 2>nul
  copy /Y "kiosk_backend\pna.pcpos.dll" "src-tauri\target\release\bundle\msi\pna.pcpos.dll" >nul 2>nul
)

echo.
echo kiosk.exe: src-tauri\target\release\kiosk.exe
echo MSI:       src-tauri\target\release\bundle\msi\
endlocal
