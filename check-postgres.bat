@echo off
title PostgreSQL Setup Check
color 0B

echo.
echo ============================================
echo   PostgreSQL Setup Check
echo ============================================
echo.

:: Check if psql is available
where psql >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] PostgreSQL is NOT installed or not in PATH
    echo.
    echo Please install PostgreSQL:
    echo.
    echo   1. Go to: https://www.postgresql.org/download/windows/
    echo   2. Click "Download the installer"
    echo   3. Run the installer
    echo   4. Set password to: postgres
    echo   5. Keep default port: 5432
    echo.
    echo After installation, you may need to add PostgreSQL to PATH:
    echo   C:\Program Files\PostgreSQL\16\bin
    echo.
    echo Or restart your terminal/computer.
    echo.
    pause
    exit /b 1
)

echo [OK] PostgreSQL client (psql) found
echo.

:: Check if PostgreSQL server is running
pg_isready >nul 2>&1
if %errorlevel% neq 0 (
    echo [X] PostgreSQL server is NOT running
    echo.
    echo To start PostgreSQL:
    echo   1. Open Windows Services (services.msc)
    echo   2. Find "postgresql-x64-16" (or similar)
    echo   3. Right-click and select "Start"
    echo.
    echo Or run from command line:
    echo   net start postgresql-x64-16
    echo.
    pause
    exit /b 1
)

echo [OK] PostgreSQL server is running
echo.

:: Try to connect
echo Testing connection...
psql -U postgres -c "SELECT 'Connection successful!' as status;" 2>nul
if %errorlevel% neq 0 (
    echo.
    echo [X] Could not connect to PostgreSQL
    echo.
    echo If prompted for password, the default is: postgres
    echo.
    echo Try connecting manually:
    echo   psql -U postgres
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Connection successful!
echo.

:: Check if okyaku database exists
echo Checking for 'okyaku' database...
psql -U postgres -lqt 2>nul | findstr /C:"okyaku" >nul
if %errorlevel% neq 0 (
    echo.
    echo [!] Database 'okyaku' does not exist
    echo.
    set /p CREATE="Do you want to create it now? (Y/N): "
    if /i "%CREATE%"=="Y" (
        echo Creating database...
        psql -U postgres -c "CREATE DATABASE okyaku;" 2>nul
        if %errorlevel% equ 0 (
            echo [OK] Database 'okyaku' created successfully!
        ) else (
            echo [X] Failed to create database
        )
    )
) else (
    echo [OK] Database 'okyaku' exists
)

echo.
echo ============================================
echo   PostgreSQL is ready!
echo ============================================
echo.
echo You can now run setup.bat or start-dev.bat
echo.
pause
