@echo off
title Okyaku CRM - Health Check
color 0B

echo.
echo ============================================
echo   Okyaku CRM - Health Check
echo ============================================
echo   %date% %time%
echo ============================================
echo.

:: Check Backend
echo [BACKEND] Checking http://localhost:8000...
curl -s http://localhost:8000/api/v1/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [BACKEND] Status: HEALTHY
) else (
    echo [BACKEND] Status: NOT RUNNING
)
echo.

:: Check Ollama
echo [OLLAMA] Checking http://localhost:11434...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% equ 0 (
    echo [OLLAMA] Status: HEALTHY
    echo [OLLAMA] Models:
    curl -s http://localhost:11434/api/tags 2>nul | findstr /C:"name"
) else (
    echo [OLLAMA] Status: NOT RUNNING
    echo          Start with: ollama serve
)
echo.

:: Check Frontend
echo [FRONTEND] Checking http://localhost:5173...
curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 (
    echo [FRONTEND] Status: HEALTHY
) else (
    echo [FRONTEND] Status: NOT RUNNING
)
echo.

:: Check PostgreSQL
echo [DATABASE] Checking PostgreSQL...
pg_isready >nul 2>&1
if %errorlevel% equ 0 (
    echo [DATABASE] Status: HEALTHY
) else (
    echo [DATABASE] Status: NOT RUNNING
)

echo.
echo ============================================
echo   Full Health Check (JSON):
echo   http://localhost:8000/api/v1/health/full
echo ============================================
echo.
echo Fetching full health status...
echo.
curl -s http://localhost:8000/api/v1/health/full 2>nul
echo.
echo.
pause
