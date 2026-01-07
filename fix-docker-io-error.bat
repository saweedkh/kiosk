@echo off
REM اسکریپت رفع مشکل I/O در Docker Desktop
REM این مشکل معمولاً به دلیل corruption در metadata database است

echo ==========================================
echo Fixing Docker I/O Error
echo ==========================================
echo.

echo Step 1: Stopping all containers...
docker-compose down 2>nul
docker stop $(docker ps -aq) 2>nul

echo.
echo Step 2: Removing corrupted images...
docker rmi kiosk-backend:latest kiosk-frontend:latest kiosk-nginx:latest 2>nul
docker images | findstr kiosk | for /f "tokens=3" %%i in ('more') do docker rmi %%i -f 2>nul

echo.
echo Step 3: Pruning Docker system...
docker system prune -a -f

echo.
echo Step 4: Clearing Docker build cache...
docker builder prune -a -f

echo.
echo ==========================================
echo IMPORTANT: Please restart Docker Desktop now!
echo ==========================================
echo.
echo After restarting Docker Desktop:
echo 1. Run: build-images.bat
echo 2. Run: run.bat
echo.
pause

