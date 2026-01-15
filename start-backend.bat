@echo off
title Okyaku Backend
color 0A

cd /d "%~dp0backend"

echo.
echo ============================================
echo   Okyaku CRM - Backend Server
echo ============================================
echo   Started: %date% %time%
echo ============================================
echo.

if not exist venv (
    echo [%time%] [ERROR] Virtual environment not found.
    echo [%time%] [ERROR] Please run setup.bat first.
    pause
    exit /b 1
)

echo [%time%] [INFO] Activating virtual environment...
call venv\Scripts\activate

echo [%time%] [INFO] Checking database connection...
python -c "from app.db.session import engine; engine.connect(); print('[INFO] Database connection OK')" 2>nul
if %errorlevel% neq 0 (
    echo [%time%] [WARN] Could not verify database connection
    echo [%time%] [WARN] Make sure PostgreSQL is running
)

echo [%time%] [INFO] Running database migrations...
alembic upgrade head 2>nul
if %errorlevel% equ 0 (
    echo [%time%] [INFO] Migrations up to date
) else (
    echo [%time%] [WARN] Migration check skipped or failed
)

echo.
echo [%time%] [INFO] Starting backend server...
echo.
echo   API:      http://localhost:8000
echo   API Docs: http://localhost:8000/api/v1/docs
echo   Health:   http://localhost:8000/api/v1/health
echo.
echo   Log Level: DEBUG
echo   Auto-reload: ENABLED
echo.
echo   Press Ctrl+C to stop
echo ============================================
echo.

:: Set environment variables for debugging
set LOG_LEVEL=DEBUG
set DEBUG=true

:: Start with verbose logging
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 --log-level debug
