@echo off
REM Start PosBridge in a minimized window (called from run.bat).
REM Logs: pos_bridge\logs\bridge.out.log / bridge.err.log

setlocal EnableExtensions
cd /d "%~dp0"

if not exist "logs" mkdir "logs"

if not exist "%~dp0resolve_python.bat" (
  echo [PosBridge] ERROR: resolve_python.bat missing in pos_bridge\
  echo   Copy it from the latest kiosk package, then re-run.
  exit /b 1
)
call "%~dp0resolve_python.bat"
if errorlevel 1 (
  echo [PosBridge] ERROR: need Python 3.11 32-bit — see message above / POS_BRIDGE.md
  exit /b 1
)

REM Already healthy?
curl -s -o nul http://127.0.0.1:9000/health >nul 2>&1
if not errorlevel 1 (
  echo [PosBridge] Already running on :9000
  exit /b 0
)

REM Install deps only if missing
"%PY_EXE%" -c "import flask, waitress, dotenv, clr" >nul 2>&1
if errorlevel 1 (
  echo [PosBridge] Installing Python packages...
  "%PY_EXE%" -m pip install -r requirements.txt
  if errorlevel 1 (
    echo [PosBridge] ERROR: pip install failed
    exit /b 1
  )
)

echo [PosBridge] Starting with "%PY_EXE%" ...
start "KioskPosBridge" /MIN cmd /c ""%PY_EXE%" app.py >>"%~dp0logs\bridge.out.log" 2>>"%~dp0logs\bridge.err.log""

REM Wait up to ~45s for health
set /a "TRIES=0"
:wait_health
set /a "TRIES+=1"
curl -s -o nul http://127.0.0.1:9000/health >nul 2>&1
if not errorlevel 1 (
  echo [PosBridge] Ready on http://127.0.0.1:9000
  exit /b 0
)
if %TRIES% GEQ 15 (
  echo [PosBridge] WARNING: health check timed out.
  echo   Check logs\bridge.err.log and POS_TCP_HOST / Python 32-bit / DLL.
  exit /b 2
)
timeout /t 3 /nobreak >nul
goto wait_health
