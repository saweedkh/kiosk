@echo off
REM Called by root run.bat — starts PosBridge in background on :9000
setlocal EnableExtensions EnableDelayedExpansion

REM Always use this script's folder (absolute)
set "BRIDGE_DIR=%~dp0"
if "!BRIDGE_DIR:~-1!"=="\" set "BRIDGE_DIR=!BRIDGE_DIR:~0,-1!"
cd /d "!BRIDGE_DIR!" || (
  echo [PosBridge] ERROR: cannot cd to !BRIDGE_DIR!
  exit /b 1
)

if not exist "!BRIDGE_DIR!\logs" mkdir "!BRIDGE_DIR!\logs"
set "START_LOG=!BRIDGE_DIR!\logs\start_from_run.log"

call :log ===== PosBridge start =====
call :log BRIDGE_DIR=!BRIDGE_DIR!
call :log LocalAppData=%LocalAppData%

REM --- Find 32-bit Python ---
set "PY_EXE="
if exist "%LocalAppData%\Programs\Python\Python311-32\python.exe" (
  set "PY_EXE=%LocalAppData%\Programs\Python\Python311-32\python.exe"
)
if not defined PY_EXE if exist "%LocalAppData%\Programs\Python\Python312-32\python.exe" (
  set "PY_EXE=%LocalAppData%\Programs\Python\Python312-32\python.exe"
)

if not defined PY_EXE (
  echo [PosBridge] ERROR: Python 3.11 32-bit not found.
  echo   Expected: %LocalAppData%\Programs\Python\Python311-32\python.exe
  call :log ERROR no python
  exit /b 1
)

set "PYW_EXE=!PY_EXE!"
if /I "!PY_EXE:~-10!"=="python.exe" (
  set "PYW_EXE=!PY_EXE:~0,-10!pythonw.exe"
)
if not exist "!PYW_EXE!" set "PYW_EXE=!PY_EXE!"

echo [PosBridge] Python: !PY_EXE!
call :log PY_EXE=!PY_EXE!
call :log PYW_EXE=!PYW_EXE!

REM Already up? (curl optional)
curl.exe -s -o nul http://127.0.0.1:9000/health >nul 2>&1
if not errorlevel 1 (
  echo [PosBridge] Already running on :9000
  call :log already running
  exit /b 0
)

REM Deps via console python (pythonw has no pip UI)
"!PY_EXE!" -c "import flask,waitress,dotenv,clr" >nul 2>&1
if errorlevel 1 (
  echo [PosBridge] Installing requirements...
  call :log pip install
  "!PY_EXE!" -m pip install -r "!BRIDGE_DIR!\requirements.txt" >> "!START_LOG!" 2>&1
  if errorlevel 1 (
    echo [PosBridge] ERROR: pip install failed — see logs\start_from_run.log
    exit /b 1
  )
)

REM Background, no window: pythonw + start (no PowerShell)
echo [PosBridge] Starting background process on :9000 ...
call :log starting
start "KioskPosBridge" /MIN /D "!BRIDGE_DIR!" "!PYW_EXE!" "!BRIDGE_DIR!\app.py"
if errorlevel 1 (
  echo [PosBridge] ERROR: start failed
  call :log start failed
  exit /b 1
)

REM Wait for :9000 — ping delay (no timeout command)
set /a "TRIES=0"
:wait_health
set /a "TRIES+=1"
curl.exe -s -o nul http://127.0.0.1:9000/health >nul 2>&1
if not errorlevel 1 (
  echo [PosBridge] Ready — http://127.0.0.1:9000/health
  call :log Ready tries=!TRIES!
  exit /b 0
)
if !TRIES! GEQ 25 (
  echo [PosBridge] WARNING: not healthy yet.
  echo   Check: !START_LOG!
  echo   Check: !BRIDGE_DIR!\logs\bridge.out.log
  echo   Test:  curl http://127.0.0.1:9000/health
  call :log NOT healthy tries=!TRIES!
  exit /b 2
)
ping -n 3 127.0.0.1 >nul 2>&1
goto wait_health

:log
echo %*>> "!START_LOG!" 2>nul
goto :eof
