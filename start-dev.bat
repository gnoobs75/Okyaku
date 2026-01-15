@echo off
title Okyaku CRM Development Environment
color 0A

echo.
echo ============================================
echo   Okyaku CRM - Development Environment
echo ============================================
echo   Started: %date% %time%
echo ============================================
echo.

:: Check if Python is available
echo [%time%] [INFO] Checking prerequisites...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [%time%] [ERROR] Python is not installed or not in PATH
    echo [%time%] [ERROR] Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do echo [%time%] [OK] %%i

:: Check if Node is available
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [%time%] [ERROR] Node.js is not installed or not in PATH
    echo [%time%] [ERROR] Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo [%time%] [OK] Node.js %%i

:: Check if PostgreSQL is running
echo [%time%] [INFO] Checking PostgreSQL connection...
pg_isready >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [%time%] [WARN] PostgreSQL may not be running.
    echo [%time%] [WARN] Make sure PostgreSQL is installed and running on localhost:5432
    echo.
    echo If you haven't created the database yet, run:
    echo   psql -U postgres -c "CREATE DATABASE okyaku;"
    echo.
    set /p CONTINUE="Continue anyway? (Y/N): "
    if /i not "%CONTINUE%"=="Y" exit /b 1
) else (
    echo [%time%] [OK] PostgreSQL is running
)

:: Navigate to project root
cd /d "%~dp0"

echo.
echo [%time%] [INFO] Starting services in debug mode...
echo.

:: Start backend in a new window with logging
echo [%time%] [INFO] Launching Backend (FastAPI)...
start "Okyaku Backend" cmd /k "cd /d "%~dp0" && call start-backend.bat"

:: Wait a moment for backend to start
echo [%time%] [INFO] Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

:: Start frontend in a new window with logging
echo [%time%] [INFO] Launching Frontend (Vite)...
start "Okyaku Frontend" cmd /k "cd /d "%~dp0" && call start-frontend.bat"

echo.
echo ============================================
echo   Services Starting
echo ============================================
echo.
echo   Backend Window:  Look for "Uvicorn running on..."
echo   Frontend Window: Look for "Local: http://localhost:5173"
echo.
echo   URLs:
echo   - Frontend:  http://localhost:5173
echo   - Backend:   http://localhost:8000
echo   - API Docs:  http://localhost:8000/api/v1/docs
echo   - Health:    http://localhost:8000/api/v1/health
echo.
echo   Debugging:
echo   - Backend logs show all API requests
echo   - Frontend shows HMR and build info
echo   - Check browser DevTools (F12) for frontend errors
echo.
echo   Press any key to open the app in browser...
echo ============================================
pause >nul

:: Open browser
start http://localhost:5173

echo.
echo [%time%] [INFO] Browser opened. Check the service windows for logs.
echo [%time%] [INFO] To stop services, close their terminal windows.
echo.
pause
