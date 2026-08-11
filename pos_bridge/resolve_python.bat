@echo off
REM Resolve a 32-bit Python for PosBridge (PNA DLL is PE32).
REM Caller gets PY_EXE = full path to python.exe
REM Do NOT use setlocal here — variables must leak to caller.

set "PY_EXE="
set "PY_BITS="

where py >nul 2>&1
if errorlevel 1 goto try_path_python

REM Prefer 3.11 32-bit, then other 32-bit tags the launcher knows
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
for /f "delims=" %%b in ('"%PY_EXE%" -c "import struct;print(struct.calcsize(\"P\")*8)" 2^>nul') do set "PY_BITS=%%b"
if "%PY_BITS%"=="32" (
  echo [PosBridge] Python OK: "%PY_EXE%" ^(32-bit^)
  exit /b 0
)

echo.
echo [PosBridge] ERROR: Found Python but it is %PY_BITS%-bit:
echo   %PY_EXE%
echo.
echo The POS DLL ^(pna.pcpos.dll^) is 32-bit ^(PE32^). You MUST install
echo Python 3.11 Windows installer 32-bit from python.org:
echo   https://www.python.org/downloads/release/python-3119/
echo   File: Windows installer ^(32-bit^)  —  python-3.11.x-win32.exe
echo.
echo During setup: enable "Add python.exe to PATH" and
echo "Install launcher for all users" ^(py.exe^).
echo.
echo Verify:
echo   py -3.11-32 -c "import struct; print(struct.calcsize('P')*8)"
echo Must print: 32
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
REM %1 = launcher tag e.g. 3.11-32
set "_TAG=%~1"
set "_OUT="
for /f "delims=" %%i in ('py -%_TAG% -c "import sys;print(sys.executable)" 2^>nul') do set "_OUT=%%i"
if defined _OUT set "PY_EXE=%_OUT%"
set "_TAG="
set "_OUT="
goto :eof
