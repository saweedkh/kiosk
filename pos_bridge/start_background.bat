@echo off
REM Start PosBridge in a minimized window (called from run.bat).
REM Logs: pos_bridge\logs\bridge.out.log / bridge.err.log

setlocal EnableExtensions
cd /d "%~dp0"

if not exist "logs" mkdir "logs"

REM Prefer 32-bit Python 3.11 (DLL is PE32)
set "PY="
where py >nul 2>&1
if %ERRORLEVEL%==0 (
  py -3.11-32 -c "import sys" >nul 2>&1
  if %ERRORLEVEL%==0 (
    for /f "delims=" %%i in ('py -3.11-32 -c "import sys;print(sys.executable)"') do set "PY=%%i"
  )
)
if "%PY%"=="" (
  where python >nul 2>&1
  if %ERRORLEVEL%==0 (
    for /f "delims=" %%i in ('where python') do (
      if "%PY%"=="" set "PY=%%i"
    )
  )
)
if "%PY%"=="" (
  echo [PosBridge] ERROR: Python not found. Install Python 3.11 32-bit.
  exit /b 1
)

REM Already healthy?
curl -s -o nul http://127.0.0.1:9000/health >nul 2>&1
if not errorlevel 1 (
  echo [PosBridge] Already running on :9000
  exit /b 0
)

REM Install deps only if missing
"%PY%" -c "import flask, waitress, dotenv, clr" >nul 2>&1
if errorlevel 1 (
  echo [PosBridge] Installing Python packages...
  "%PY%" -m pip install -r requirements.txt
  if errorlevel 1 (
    echo [PosBridge] ERROR: pip install failed
    exit /b 1
  )
)

echo [PosBridge] Starting with "%PY%" ...
start "KioskPosBridge" /MIN cmd /c ""%PY%" app.py >>"%~dp0logs\bridge.out.log" 2>>"%~dp0logs\bridge.err.log""

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
