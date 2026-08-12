@echo off
REM Build Django backend sidecar for Tauri (Windows x64)
setlocal EnableExtensions
cd /d "%~dp0..\.."

echo === Build kiosk-backend sidecar (PyInstaller) ===

set "VENV=%CD%\kiosk_backend\venv"
if not exist "%VENV%\Scripts\python.exe" (
  echo Create venv first: cd kiosk_backend ^&^& python -m venv venv ^&^& venv\Scripts\pip install -r requirements\base.txt
  exit /b 1
)

call "%VENV%\Scripts\activate.bat"
pip install pyinstaller -q

set DJANGO_SETTINGS_MODULE=config.settings.desktop
cd kiosk_backend
pyinstaller --noconfirm --clean kiosk-backend.spec
cd ..

set "OUT=kiosk_backend\dist\kiosk-backend.exe"
set "DEST=kiosk_desktop\src-tauri\binaries\kiosk-backend-x86_64-pc-windows-msvc.exe"
if not exist "%OUT%" (
  echo PyInstaller output missing: %OUT%
  exit /b 1
)

if not exist "kiosk_desktop\src-tauri\binaries" mkdir "kiosk_desktop\src-tauri\binaries"
copy /Y "%OUT%" "%DEST%" >nul
echo Sidecar ready: %DEST%
endlocal
