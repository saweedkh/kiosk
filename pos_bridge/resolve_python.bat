@echo off
REM Resolve a 32-bit Python for PosBridge (PNA DLL is PE32).
REM Caller gets PY_EXE = full path to python.exe
REM Do NOT use setlocal here — variables must leak to caller.

set "PY_EXE="
set "PY_BITS="
set "PF86=%ProgramFiles(x86)%"
set "PY_BITS_OUT=%TEMP%\kiosk_pos_py_bits.txt"
set "PY_BITS_PY=%TEMP%\kiosk_pos_py_bits.py"

REM 1) Explicit 32-bit install locations
if exist "%LocalAppData%\Programs\Python\Python311-32\python.exe" (
  set "PY_EXE=%LocalAppData%\Programs\Python\Python311-32\python.exe"
  goto check_bits
)
if exist "%LocalAppData%\Programs\Python\Python312-32\python.exe" (
  set "PY_EXE=%LocalAppData%\Programs\Python\Python312-32\python.exe"
  goto check_bits
)
if defined PF86 if exist "%PF86%\Python311-32\python.exe" (
  set "PY_EXE=%PF86%\Python311-32\python.exe"
  goto check_bits
)
if defined PF86 if exist "%PF86%\Python311\python.exe" (
  set "PY_EXE=%PF86%\Python311\python.exe"
  goto check_bits
)

REM 2) py launcher 32-bit tags
where py >nul 2>&1
if errorlevel 1 goto try_path_python

call :try_py_tag 3.11-32
if defined PY_EXE goto check_bits
call :try_py_tag 3.12-32
if defined PY_EXE goto check_bits
call :try_py_tag 3.10-32
if defined PY_EXE goto check_bits
call :try_py_tag 3-32
if defined PY_EXE goto check_bits

:try_path_python
where python >nul 2>&1
if errorlevel 1 goto not_found
for /f "delims=" %%i in ('where python') do (
  if not defined PY_EXE set "PY_EXE=%%i"
)
goto check_bits

:check_bits
if not defined PY_EXE goto not_found

REM Heuristic: official 32-bit layout folder name
echo %PY_EXE% | findstr /I /C:"Python311-32" /C:"Python312-32" /C:"Python310-32" /C:"-32\python.exe" >nul
if not errorlevel 1 (
  echo [PosBridge] Python OK: "%PY_EXE%" ^(32-bit path^)
  exit /b 0
)

REM Bitness via temp script — avoids for /f + quoted-path cmd bug
(
  echo import platform
  echo print^(platform.architecture^(^)[0][:2]^)
) > "%PY_BITS_PY%"

del "%PY_BITS_OUT%" >nul 2>&1
"%PY_EXE%" "%PY_BITS_PY%" > "%PY_BITS_OUT%" 2>nul
set "PY_BITS="
if exist "%PY_BITS_OUT%" set /p PY_BITS=<"%PY_BITS_OUT%"

if "%PY_BITS%"=="32" (
  echo [PosBridge] Python OK: "%PY_EXE%" ^(32-bit^)
  exit /b 0
)

echo.
if "%PY_BITS%"=="" (
  echo [PosBridge] ERROR: Could not detect Python bitness for:
  echo   %PY_EXE%
  echo   Try running manually:
  echo   "%PY_EXE%" -c "import platform; print(platform.architecture())"
) else (
  echo [PosBridge] ERROR: Found Python but it is %PY_BITS%-bit:
  echo   %PY_EXE%
)
echo.
echo Install Python 3.11 Windows installer ^(32-bit^) / win32.exe:
echo   https://www.python.org/downloads/release/python-3119/
echo Expected path after install:
echo   %LocalAppData%\Programs\Python\Python311-32\python.exe
echo.
set "PY_EXE="
exit /b 1

:not_found
echo.
echo [PosBridge] ERROR: No Python found.
echo Install Python 3.11 32-bit ^(win32^) from:
echo   https://www.python.org/downloads/release/python-3119/
echo Then re-open this terminal and run again.
echo.
exit /b 1

:try_py_tag
set "_TAG=%~1"
set "_OUT="
REM Use temp file — for /f with quoted py path is unreliable
del "%TEMP%\kiosk_pos_py_exe.txt" >nul 2>&1
py -%_TAG% -c "import sys;print(sys.executable)" > "%TEMP%\kiosk_pos_py_exe.txt" 2>nul
if exist "%TEMP%\kiosk_pos_py_exe.txt" set /p _OUT=<"%TEMP%\kiosk_pos_py_exe.txt"
if defined _OUT set "PY_EXE=%_OUT%"
set "_TAG="
set "_OUT="
goto :eof
