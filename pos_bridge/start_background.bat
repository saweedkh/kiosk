@echo off
REM Called by root run.bat — starts PosBridge minimized on :9000
REM You do NOT need to run pos_bridge\run.bat yourself.

setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

if not exist "logs" mkdir "logs" 2>nul

REM Prefer known 32-bit installs (PNA DLL is PE32)
set "PY_EXE="
if exist "%LocalAppData%\Programs\Python\Python311-32\python.exe" (
  set "PY_EXE=%LocalAppData%\Programs\Python\Python311-32\python.exe"
)
if "!PY_EXE!"=="" if exist "%LocalAppData%\Programs\Python\Python312-32\python.exe" (
  set "PY_EXE=%LocalAppData%\Programs\Python\Python312-32\python.exe"
)
if "!PY_EXE!"=="" if exist "%~dp0resolve_python.bat" (
  call "%~dp0resolve_python.bat"
)

if "!PY_EXE!"=="" (
  echo [PosBridge] ERROR: Python 3.11 32-bit not found.
  echo   Install: python-3.11.x-win32.exe
  echo   Expected: %%LocalAppData%%\Programs\Python\Python311-32\python.exe
  exit /b 1
)

if not exist "!PY_EXE!" (
  echo [PosBridge] ERROR: Python path missing: !PY_EXE!
  exit /b 1
)

echo [PosBridge] Python: !PY_EXE!

REM Already up?
curl -s -o nul http://127.0.0.1:9000/health >nul 2>&1
if not errorlevel 1 (
  echo [PosBridge] Already running on :9000
  exit /b 0
)

REM Deps
"!PY_EXE!" -c "import flask,waitress,dotenv,clr" >nul 2>&1
if errorlevel 1 (
  echo [PosBridge] Installing requirements...
  "!PY_EXE!" -m pip install -r "%~dp0requirements.txt"
  if errorlevel 1 (
    echo [PosBridge] ERROR: pip install failed
    exit /b 1
  )
)

REM New console window (minimized). Survives after run.bat exits.
REM /D sets working directory so app.py and .env resolve correctly.
echo [PosBridge] Starting background window on :9000 ...
start "KioskPosBridge" /MIN /D "%~dp0" "!PY_EXE!" app.py

REM Wait for health (DLL load can take a few seconds)
set /a "TRIES=0"
:wait_health
set /a "TRIES+=1"
curl -s -o nul http://127.0.0.1:9000/health >nul 2>&1
if not errorlevel 1 (
  echo [PosBridge] Ready — http://127.0.0.1:9000/health
  exit /b 0
)
if !TRIES! GEQ 20 (
  echo [PosBridge] WARNING: not healthy after wait.
  echo   Open the minimized "KioskPosBridge" window or check Task Manager.
  echo   Manual test: curl http://127.0.0.1:9000/health
  exit /b 2
)
timeout /t 2 /nobreak >nul
goto wait_health
