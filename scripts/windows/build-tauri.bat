@echo off
REM Full Tauri build: Django sidecar + Next static + kiosk.exe
setlocal EnableExtensions
cd /d "%~dp0..\.."

echo === Kiosk Tauri Full Stack Build ===

call "%~dp0build-backend-sidecar.bat"
if errorlevel 1 exit /b 1

echo === Next.js static export ===
cd kiosk_frontend
if not exist node_modules call npm install
set TAURI_BUILD=1
set NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api
call npx next build
if errorlevel 1 exit /b 1
if not exist out\index.html (
  echo ERROR: kiosk_frontend\out\index.html missing
  exit /b 1
)
cd ..

echo === Tauri package ===
cd kiosk_desktop
if not exist node_modules call npm install
call npm run build:ci
if errorlevel 1 exit /b 1

if exist "..\kiosk_backend\pna.pcpos.dll" (
  copy /Y "..\kiosk_backend\pna.pcpos.dll" "src-tauri\target\release\pna.pcpos.dll" >nul 2>nul
)

echo.
echo kiosk.exe: src-tauri\target\release\kiosk.exe
echo MSI:       src-tauri\target\release\bundle\msi\
endlocal
