@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist ".env" (
  echo [i] Creating .env from .env.example — edit POS_IP / POS_DLL_PATH then re-run.
  copy /Y ".env.example" ".env" >nul
)

REM Prefer 32-bit Python 3.11 (DLL is PE32). Fallback to default py.
where py >nul 2>&1
if %ERRORLEVEL%==0 (
  py -3.11-32 -c "import sys" >nul 2>&1
  if %ERRORLEVEL%==0 (
    set PY=py -3.11-32
  ) else (
    set PY=py -3
  )
) else (
  set PY=python
)

echo Using: %PY%
%PY% -m pip install -r requirements.txt
if errorlevel 1 (
  echo [!] pip install failed
  pause
  exit /b 1
)

echo.
echo Starting PosBridge ...
%PY% app.py
pause
