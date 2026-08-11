@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist ".env" (
  if exist "..\.env" (
    echo [i] Using monorepo root .env via config.py
  ) else if exist ".env.example" (
    echo [i] Creating .env from .env.example — edit POS_TCP_HOST / POS_DLL_PATH then re-run.
    copy /Y ".env.example" ".env" >nul
  )
)

if not exist "%~dp0resolve_python.bat" (
  echo [!] Missing resolve_python.bat in this folder.
  echo     Copy pos_bridge\resolve_python.bat from the latest package/repo.
  pause
  exit /b 1
)
call "%~dp0resolve_python.bat"
if errorlevel 1 (
  pause
  exit /b 1
)

echo Using: %PY_EXE%
"%PY_EXE%" -m pip install -r requirements.txt
if errorlevel 1 (
  echo [!] pip install failed
  pause
  exit /b 1
)

echo.
echo Starting PosBridge ...
"%PY_EXE%" app.py
pause
