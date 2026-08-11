@echo off
REM Start PosBridge minimized (called from root run.bat).
REM Logs: pos_bridge\logs\bridge.out.log / bridge.err.log

setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

if not exist "logs" mkdir "logs" 2>nul

REM --- Resolve 32-bit Python (inline; no dependency on broken for /f) ---
set "PY_EXE="
if exist "%LocalAppData%\Programs\Python\Python311-32\python.exe" set "PY_EXE=%LocalAppData%\Programs\Python\Python311-32\python.exe"
if "!PY_EXE!"=="" if exist "%LocalAppData%\Programs\Python\Python312-32\python.exe" set "PY_EXE=%LocalAppData%\Programs\Python\Python312-32\python.exe"
if "!PY_EXE!"=="" if exist "%~dp0resolve_python.bat" (
  call "%~dp0resolve_python.bat"
)

if "!PY_EXE!"=="" (
  echo [PosBridge] ERROR: Python 3.11 32-bit not found.
  echo   Expected: %%LocalAppData%%\Programs\Python\Python311-32\python.exe
  echo   Install win32 from https://www.python.org/downloads/release/python-3119/
  exit /b 1
)

echo [PosBridge] Using: !PY_EXE!

REM Already healthy?
curl -s -o nul http://127.0.0.1:9000/health >nul 2>&1
if not errorlevel 1 (
  echo [PosBridge] Already running on :9000
  exit /b 0
)

REM Install deps only if missing
"!PY_EXE!" -c "import flask, waitress, dotenv, clr" >nul 2>&1
if errorlevel 1 (
  echo [PosBridge] Installing Python packages...
  "!PY_EXE!" -m pip install -r "%~dp0requirements.txt"
  if errorlevel 1 (
    echo [PosBridge] ERROR: pip install failed
    exit /b 1
  )
)

REM Launch via a tiny helper bat so quoting/paths stay sane
set "HELPER=%TEMP%\kiosk_start_posbridge.bat"
set "BRIDGE_DIR=%CD%"
(
  echo @echo off
  echo cd /d "!BRIDGE_DIR!"
  echo "!PY_EXE!" app.py
) > "!HELPER!"

echo [PosBridge] Starting in background...
start "KioskPosBridge" /MIN cmd /c ""!HELPER!" >>"%~dp0logs\bridge.out.log" 2>>"%~dp0logs\bridge.err.log""

set /a "TRIES=0"
:wait_health
set /a "TRIES+=1"
curl -s -o nul http://127.0.0.1:9000/health >nul 2>&1
if not errorlevel 1 (
  echo [PosBridge] Ready on http://127.0.0.1:9000
  exit /b 0
)
if !TRIES! GEQ 15 (
  echo [PosBridge] WARNING: health check timed out.
  echo   Check logs\bridge.err.log
  exit /b 2
)
timeout /t 3 /nobreak >nul
goto wait_health
