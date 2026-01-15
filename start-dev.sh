#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "============================================"
echo "  Okyaku CRM - Development Environment"
echo "============================================"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Python is not installed or not in PATH"
    echo "Please install Python 3.11+ from https://python.org"
    exit 1
fi

# Check if Node is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR]${NC} Node.js is not installed or not in PATH"
    echo "Please install Node.js 18+ from https://nodejs.org"
    exit 1
fi

# Check if PostgreSQL is running
echo "Checking PostgreSQL connection..."
if ! pg_isready &> /dev/null; then
    echo ""
    echo -e "${YELLOW}[WARNING]${NC} PostgreSQL may not be running."
    echo "Make sure PostgreSQL is installed and running on localhost:5432"
    echo ""
    echo "If you haven't created the database yet, run:"
    echo "  psql -U postgres -c \"CREATE DATABASE okyaku;\""
    echo ""
fi

echo ""
echo "Starting services..."
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start backend
echo -e "${CYAN}[1/2]${NC} Starting Backend (FastAPI)..."
cd "$SCRIPT_DIR/backend"

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

# Install dependencies if needed
if [ ! -f "venv/.installed" ]; then
    echo "Installing dependencies..."
    pip install -r requirements.txt -q
    touch venv/.installed
fi

# Run migrations
echo "Checking database migrations..."
alembic upgrade head 2>/dev/null || echo "(Migrations may need setup)"

# Start backend in background
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Wait for backend to start
sleep 3

# Start frontend
echo -e "${CYAN}[2/2]${NC} Starting Frontend (Vite)..."
cd "$SCRIPT_DIR/frontend"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start frontend in background
npm run dev &
FRONTEND_PID=$!

echo ""
echo "============================================"
echo "  Both services are starting!"
echo "============================================"
echo ""
echo -e "  Backend:  ${GREEN}http://localhost:8000${NC}"
echo -e "  API Docs: ${GREEN}http://localhost:8000/api/v1/docs${NC}"
echo -e "  Frontend: ${GREEN}http://localhost:5173${NC}"
echo ""
echo "  Default test account:"
echo "  (Register a new account on first use)"
echo ""
echo "  Press Ctrl+C to stop all services"
echo "============================================"
echo ""

# Open browser (works on macOS and most Linux desktops)
if command -v open &> /dev/null; then
    sleep 2
    open http://localhost:5173
elif command -v xdg-open &> /dev/null; then
    sleep 2
    xdg-open http://localhost:5173
fi

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
