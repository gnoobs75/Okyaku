@echo off
title Okyaku CRM - First Time Setup
color 0E

echo.
echo ============================================
echo   Okyaku CRM - First Time Setup
echo ============================================
echo.

cd /d "%~dp0"

:: Check prerequisites
echo Checking prerequisites...
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Python - NOT FOUND
    echo     Please install Python 3.11+ from https://python.org
    set MISSING=1
) else (
    for /f "tokens=2" %%i in ('python --version 2^>^&1') do echo [OK] Python %%i
)

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] Node.js - NOT FOUND
    echo     Please install Node.js 18+ from https://nodejs.org
    set MISSING=1
) else (
    for /f "tokens=1" %%i in ('node --version 2^>^&1') do echo [OK] Node.js %%i
)

pg_isready >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] PostgreSQL - NOT RUNNING
    echo     Please install and start PostgreSQL
    set MISSING=1
) else (
    echo [OK] PostgreSQL is running
)

if defined MISSING (
    echo.
    echo Please install missing prerequisites and run this script again.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   Setting up Backend
echo ============================================
echo.

cd backend

:: Create virtual environment
if not exist venv (
    echo Creating Python virtual environment...
    python -m venv venv
)

:: Activate and install dependencies
echo Installing Python dependencies...
call venv\Scripts\activate
pip install -r requirements.txt -q

:: Create uploads directory
if not exist uploads mkdir uploads

echo.
echo Backend setup complete!

cd ..

echo.
echo ============================================
echo   Setting up Frontend
echo ============================================
echo.

cd frontend

:: Install npm dependencies
echo Installing Node.js dependencies...
call npm install

echo.
echo Frontend setup complete!

cd ..

echo.
echo ============================================
echo   Database Setup
echo ============================================
echo.

echo Attempting to create database...
psql -U postgres -c "CREATE DATABASE okyaku;" 2>nul
if %errorlevel% equ 0 (
    echo Database 'okyaku' created successfully!
) else (
    echo Database may already exist or connection failed.
    echo If needed, manually run: psql -U postgres -c "CREATE DATABASE okyaku;"
)

echo.
echo Running database migrations...
cd backend
call venv\Scripts\activate
alembic upgrade head 2>nul
if %errorlevel% neq 0 (
    echo.
    echo Generating initial migration...
    alembic revision --autogenerate -m "Initial migration" 2>nul
    alembic upgrade head 2>nul
)
cd ..

echo.
echo ============================================
echo   Setup Complete!
echo ============================================
echo.
echo You can now run 'start-dev.bat' to launch the application.
echo.
echo Quick Start:
echo   1. Run start-dev.bat
echo   2. Open http://localhost:5173
echo   3. Register a new account
echo   4. Start using the CRM!
echo.
pause
