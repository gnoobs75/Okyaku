@echo off
title Okyaku Frontend
color 0B

cd /d "%~dp0frontend"

echo.
echo ============================================
echo   Okyaku CRM - Frontend Server
echo ============================================
echo   Started: %date% %time%
echo ============================================
echo.

if not exist node_modules (
    echo [%time%] [ERROR] Dependencies not installed.
    echo [%time%] [ERROR] Please run setup.bat first.
    pause
    exit /b 1
)

echo [%time%] [INFO] Checking Node.js version...
for /f "tokens=*" %%i in ('node --version') do echo [%time%] [INFO] Node.js %%i

echo [%time%] [INFO] Checking npm version...
for /f "tokens=*" %%i in ('npm --version') do echo [%time%] [INFO] npm %%i

echo [%time%] [INFO] Loading environment from .env...
if exist .env (
    echo [%time%] [INFO] .env file found
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        if not "%%a"=="" if not "%%a:~0,1%"=="#" (
            echo [%time%] [INFO]   %%a = %%b
        )
    )
) else (
    echo [%time%] [WARN] No .env file found, using defaults
)

echo.
echo [%time%] [INFO] Starting frontend development server...
echo.
echo   App:     http://localhost:5173
echo   Network: http://0.0.0.0:5173
echo.
echo   Hot Module Replacement: ENABLED
echo   Source Maps: ENABLED
echo.
echo   Press Ctrl+C to stop
echo ============================================
echo.

:: Enable verbose logging for Vite
set DEBUG=vite:*

npm run dev -- --debug
