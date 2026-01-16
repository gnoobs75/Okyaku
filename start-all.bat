@echo off
title Okyaku CRM - Full Stack Startup
color 0A

echo.
echo ============================================
echo   Okyaku CRM - AI-Native CRM Platform
echo ============================================
echo   Started: %date% %time%
echo ============================================
echo.

:: Navigate to project root
cd /d "%~dp0"

:: ============================================
:: CHECK PREREQUISITES
:: ============================================
echo [%time%] [INFO] Checking prerequisites...
echo.

:: Check Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [%time%] [ERROR] Python is not installed or not in PATH
    echo          Please install Python 3.11+ from https://python.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do echo [%time%] [OK] %%i

:: Check Node
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [%time%] [ERROR] Node.js is not installed or not in PATH
    echo          Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do echo [%time%] [OK] Node.js %%i

:: Check Ollama
ollama --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [%time%] [ERROR] Ollama is not installed or not in PATH
    echo          Please install Ollama from https://ollama.com/download
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('ollama --version') do echo [%time%] [OK] %%i

:: Check PostgreSQL
pg_isready >nul 2>&1
if %errorlevel% neq 0 (
    echo [%time%] [WARN] PostgreSQL may not be running
    echo          Make sure PostgreSQL is running on localhost:5432
    set /p CONTINUE="Continue anyway? (Y/N): "
    if /i not "%CONTINUE%"=="Y" exit /b 1
) else (
    echo [%time%] [OK] PostgreSQL is running
)

echo.
echo ============================================
echo   STARTING SERVICES
echo ============================================
echo.

:: ============================================
:: START OLLAMA (if not already running)
:: ============================================
echo [%time%] [INFO] Checking Ollama service...
curl -s http://localhost:11434/api/tags >nul 2>&1
if %errorlevel% neq 0 (
    echo [%time%] [INFO] Starting Ollama...
    start "Ollama Server" /min ollama serve
    timeout /t 3 /nobreak >nul
) else (
    echo [%time%] [OK] Ollama is already running
)

:: Check if models are loaded
echo [%time%] [INFO] Checking AI models...
curl -s http://localhost:11434/api/tags | findstr "llama3.1" >nul 2>&1
if %errorlevel% neq 0 (
    echo [%time%] [WARN] llama3.1:8b model not found
    echo [%time%] [INFO] Run: ollama pull llama3.1:8b
) else (
    echo [%time%] [OK] llama3.1 model available
)

:: ============================================
:: START BACKEND
:: ============================================
echo [%time%] [INFO] Starting Backend (FastAPI)...
start "Okyaku Backend" cmd /k "cd /d "%~dp0backend" && call venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Wait for backend
echo [%time%] [INFO] Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

:: ============================================
:: START FRONTEND
:: ============================================
echo [%time%] [INFO] Starting Frontend (Vite)...
start "Okyaku Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

:: Wait for frontend
echo [%time%] [INFO] Waiting for frontend to initialize...
timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo   ALL SERVICES STARTED
echo ============================================
echo.
echo   Service URLs:
echo   -------------
echo   Frontend App:     http://localhost:5173
echo   Backend API:      http://localhost:8000
echo   API Docs:         http://localhost:8000/api/v1/docs
echo   Ollama:           http://localhost:11434
echo.
echo   Health Checks:
echo   --------------
echo   Full Health:      http://localhost:8000/api/v1/health/full
echo   Backend Only:     http://localhost:8000/api/v1/health
echo   Ollama:           http://localhost:11434/api/tags
echo.
echo   AI Features:
echo   ------------
echo   - Lead Scoring, Deal Forecasting, Churn Risk
echo   - Next-Best-Action Recommendations
echo   - AI Agent with CRM Tools
echo   - Natural Language Chat
echo   - Knowledge Base (RAG)
echo   - Anomaly Detection ^& Insights
echo.
echo   To stop: Close the Backend and Frontend windows
echo.
echo ============================================
echo.
echo   Press any key to open the app in browser...
pause >nul

:: Open browser
start http://localhost:5173

echo.
echo [%time%] [INFO] Browser opened. Check service windows for logs.
echo [%time%] [INFO] Health check: http://localhost:8000/api/v1/health/full
echo.
pause
