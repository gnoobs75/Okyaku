#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "============================================"
echo "  Okyaku CRM - First Time Setup"
echo "============================================"
echo ""

# Check prerequisites
echo "Checking prerequisites..."
echo ""

MISSING=0

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2)
    echo -e "${GREEN}[OK]${NC} Python $PYTHON_VERSION"
else
    echo -e "${RED}[X]${NC} Python - NOT FOUND"
    echo "    Please install Python 3.11+ from https://python.org"
    MISSING=1
fi

# Check Node
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version 2>&1)
    echo -e "${GREEN}[OK]${NC} Node.js $NODE_VERSION"
else
    echo -e "${RED}[X]${NC} Node.js - NOT FOUND"
    echo "    Please install Node.js 18+ from https://nodejs.org"
    MISSING=1
fi

# Check PostgreSQL
if command -v pg_isready &> /dev/null && pg_isready &> /dev/null; then
    echo -e "${GREEN}[OK]${NC} PostgreSQL is running"
else
    echo -e "${RED}[X]${NC} PostgreSQL - NOT RUNNING"
    echo "    Please install and start PostgreSQL"
    MISSING=1
fi

if [ $MISSING -eq 1 ]; then
    echo ""
    echo "Please install missing prerequisites and run this script again."
    exit 1
fi

echo ""
echo "============================================"
echo "  Setting up Backend"
echo "============================================"
echo ""

cd "$(dirname "$0")/backend"

# Create virtual environment
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate and install dependencies
echo "Installing Python dependencies..."
source venv/bin/activate
pip install -r requirements.txt -q

# Create uploads directory
mkdir -p uploads

echo ""
echo "Backend setup complete!"

cd ..

echo ""
echo "============================================"
echo "  Setting up Frontend"
echo "============================================"
echo ""

cd frontend

# Install npm dependencies
echo "Installing Node.js dependencies..."
npm install

echo ""
echo "Frontend setup complete!"

cd ..

echo ""
echo "============================================"
echo "  Database Setup"
echo "============================================"
echo ""

echo "Attempting to create database..."
if psql -U postgres -c "CREATE DATABASE okyaku;" 2>/dev/null; then
    echo "Database 'okyaku' created successfully!"
else
    echo -e "${YELLOW}Database may already exist or connection failed.${NC}"
    echo "If needed, manually run: psql -U postgres -c \"CREATE DATABASE okyaku;\""
fi

echo ""
echo "Running database migrations..."
cd backend
source venv/bin/activate
if ! alembic upgrade head 2>/dev/null; then
    echo ""
    echo "Generating initial migration..."
    alembic revision --autogenerate -m "Initial migration" 2>/dev/null
    alembic upgrade head 2>/dev/null
fi
cd ..

echo ""
echo "============================================"
echo "  Setup Complete!"
echo "============================================"
echo ""
echo "You can now run './start-dev.sh' to launch the application."
echo ""
echo "Quick Start:"
echo "  1. Run ./start-dev.sh"
echo "  2. Open http://localhost:5173"
echo "  3. Register a new account"
echo "  4. Start using the CRM!"
echo ""
