@echo off
chcp 65001 >nul
title NeonFit Studio Manager
cd /d "%~dp0"

echo ============================================
echo   NeonFit Studio Manager
echo ============================================
echo.
echo [1] Starting frontend dev server...
start "NeonFit Frontend" cmd /c "npm run dev"
echo     Frontend: http://localhost:3000
echo.
echo [2] Starting Flask posture backend...
start "NeonFit Backend" cmd /c "cd backend && python app.py"
echo     Backend:  http://localhost:5000
echo.
echo ============================================
echo   Both servers starting...
echo   Close the two windows to stop.
echo ============================================
echo   This window will close in 3 seconds...
timeout /t 3 /nobreak >nul
exit
