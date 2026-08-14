@echo off
REM Build Django backend sidecar for Tauri (Windows — use Python 3.11 **32-bit** for PNA DLL)
REM Output: onedir folder dist\kiosk-backend\ (fast warm starts — no TEMP unpack)
setlocal EnableExtensions
cd /d "%~dp0..\.."

echo === Build kiosk-backend sidecar (PyInstaller onedir, 32-bit Python required) ===
echo PNA pna.pcpos.dll is PE32 — use py -3.11-32 or Python311-32 in venv.

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

set "OUT=kiosk_backend\dist\kiosk-backend\kiosk-backend.exe"
if not exist "%OUT%" (
  echo PyInstaller onedir output missing: %OUT%
  exit /b 1
)

echo Sidecar onedir ready: kiosk_backend\dist\kiosk-backend\
echo Copy that whole folder next to kiosk.exe as "kiosk-backend\".
endlocal
