@echo off
chcp 65001 >nul
REM Install PosBridge as a Windows service via NSSM (https://nssm.cc/download)
REM 1) Extract nssm.exe into this folder OR put it on PATH
REM 2) Edit SERVICE_DIR / PYTHON below if needed
REM 3) Run this script as Administrator

set SERVICE_NAME=KioskPosBridge
set SERVICE_DIR=%~dp0
set PYTHON=

call "%~dp0resolve_python.bat"
if errorlevel 1 (
  echo [!] Python 32-bit required — see message above
  exit /b 1
)
set "PYTHON=%PY_EXE%"

:have_py
if "%PYTHON%"=="" (
  echo [!] Python not found
  exit /b 1
)

where nssm >nul 2>&1
if errorlevel 1 (
  if exist "%SERVICE_DIR%nssm.exe" (
    set NSSM=%SERVICE_DIR%nssm.exe
  ) else (
    echo [!] nssm.exe not found. Download from https://nssm.cc/download
    exit /b 1
  )
) else (
  set NSSM=nssm
)

echo Python: %PYTHON%
"%NSSM%" install %SERVICE_NAME% "%PYTHON%" "app.py"
"%NSSM%" set %SERVICE_NAME% AppDirectory "%SERVICE_DIR%"
"%NSSM%" set %SERVICE_NAME% AppStdout "%SERVICE_DIR%logs\bridge.out.log"
"%NSSM%" set %SERVICE_NAME% AppStderr "%SERVICE_DIR%logs\bridge.err.log"
"%NSSM%" set %SERVICE_NAME% Start SERVICE_AUTO_START
if not exist "%SERVICE_DIR%logs" mkdir "%SERVICE_DIR%logs"
"%NSSM%" start %SERVICE_NAME%
echo.
echo Service %SERVICE_NAME% installed and started.
echo Health: http://127.0.0.1:9000/health
pause
