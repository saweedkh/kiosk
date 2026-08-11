@echo off
chcp 65001 >nul
cd /d "%~dp0"
REM Quick smoke: health endpoint
curl -s http://127.0.0.1:9000/health
echo.
pause
