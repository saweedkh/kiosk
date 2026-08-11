@echo off
REM Called by root run.bat — starts PosBridge hidden in background on :9000
REM Manual double-click of this file also works for debugging.

setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

if not exist "logs" mkdir "logs" 2>nul
set "START_LOG=%~dp0logs\start_from_run.log"
echo ===== PosBridge start %DATE% %TIME% =====>> "%START_LOG%"

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
  echo [PosBridge] ERROR: Python 3.11 32-bit not found.>> "%START_LOG%"
  exit /b 1
)

echo [PosBridge] Python: !PY_EXE!
echo Python=!PY_EXE!>> "%START_LOG%"
echo LocalAppData=%LocalAppData%>> "%START_LOG%"
echo CWD=%CD%>> "%START_LOG%"

REM Already up?
curl -s -o nul http://127.0.0.1:9000/health >nul 2>&1
if not errorlevel 1 (
  echo [PosBridge] Already running on :9000
  echo Already running>> "%START_LOG%"
  exit /b 0
)

REM Deps
"!PY_EXE!" -c "import flask,waitress,dotenv,clr" >nul 2>&1
if errorlevel 1 (
  echo [PosBridge] Installing requirements...
  echo pip install...>> "%START_LOG%"
  "!PY_EXE!" -m pip install -r "%~dp0requirements.txt" >> "%START_LOG%" 2>&1
  if errorlevel 1 (
    echo [PosBridge] ERROR: pip install failed
    echo pip FAILED>> "%START_LOG%"
    exit /b 1
  )
)

REM True background: no console window. Survives after run.bat exits.
REM Use PowerShell Start-Process — more reliable than "start" when called via CALL from run.bat
echo [PosBridge] Starting hidden background process on :9000 ...
echo Start-Process Hidden>> "%START_LOG%"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Start-Process -FilePath '!PY_EXE!' -ArgumentList 'app.py' -WorkingDirectory '%CD%' -WindowStyle Hidden"
if errorlevel 1 (
  echo [PosBridge] ERROR: Start-Process failed
  echo Start-Process FAILED>> "%START_LOG%"
  exit /b 1
)

REM Wait for health — use ping delay (timeout fails under some redirected stdin)
set /a "TRIES=0"
:wait_health
set /a "TRIES+=1"
curl -s -o nul http://127.0.0.1:9000/health >nul 2>&1
if not errorlevel 1 (
  echo [PosBridge] Ready — http://127.0.0.1:9000/health
  echo Ready after !TRIES! tries>> "%START_LOG%"
  exit /b 0
)
if !TRIES! GEQ 25 (
  echo [PosBridge] WARNING: not healthy after wait.
  echo   See logs\start_from_run.log and Task Manager ^(python.exe^).
  echo   Manual: curl http://127.0.0.1:9000/health
  echo NOT healthy after !TRIES! tries>> "%START_LOG%"
  exit /b 2
)
REM ~2s delay without "timeout" (works when stdin is redirected)
ping -n 3 127.0.0.1 >nul
goto wait_health
