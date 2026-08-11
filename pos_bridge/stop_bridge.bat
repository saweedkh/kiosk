@echo off
REM Stop PosBridge window / process started by start_background.bat

setlocal EnableExtensions
cd /d "%~dp0"

echo [PosBridge] Stopping...

REM Close the minimized console titled KioskPosBridge
taskkill /FI "WINDOWTITLE eq KioskPosBridge*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq KioskPosBridge" /F >nul 2>&1

REM Also kill python processes serving PosBridge on port 9000 (best-effort)
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":9000" ^| findstr "LISTENING"') do (
  echo [PosBridge] Killing PID %%p on :9000
  taskkill /PID %%p /F >nul 2>&1
)

echo [PosBridge] Stopped.
exit /b 0
