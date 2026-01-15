# Okyaku CRM - Installation Guide

A comprehensive CRM platform built with FastAPI (Python) and React (TypeScript).

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Manual Installation](#manual-installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Default Credentials](#default-credentials)
- [Troubleshooting](#troubleshooting)
- [Project Structure](#project-structure)

---

## Prerequisites

Before installing Okyaku CRM, ensure you have the following software installed:

### Required Software

| Software | Minimum Version | Download Link |
|----------|----------------|---------------|
| Python | 3.11+ | https://python.org/downloads |
| Node.js | 18+ | https://nodejs.org |
| PostgreSQL | 14+ | https://postgresql.org/download |

### Verify Installation

Open a terminal/command prompt and run:

```bash
# Check Python
python --version
# Expected: Python 3.11.x or higher

# Check Node.js
node --version
# Expected: v18.x.x or higher

# Check npm
npm --version
# Expected: 9.x.x or higher

# Check PostgreSQL is running
pg_isready
# Expected: accepting connections
```

### Windows-Specific Notes

- During Python installation, check **"Add Python to PATH"**
- During Node.js installation, the installer adds it to PATH automatically
- For PostgreSQL, remember the password you set for the `postgres` user

### macOS Installation (using Homebrew)

```bash
brew install python@3.11
brew install node@18
brew install postgresql@14
brew services start postgresql
```

### Linux Installation (Ubuntu/Debian)

```bash
# Python
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip

# Node.js (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs

# PostgreSQL
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

## Quick Start

### Windows

1. **Run the setup script** (first time only):
   ```
   Double-click: setup.bat
   ```

2. **Start the development environment**:
   ```
   Double-click: start-dev.bat
   ```

3. **Open your browser** to http://localhost:5173

4. **Register a new account** and start using the CRM!

### macOS / Linux

```bash
# First time setup
./setup.sh

# Start development
./start-dev.sh
```

> **Note:** If the shell scripts don't exist, follow the [Manual Installation](#manual-installation) steps below.

---

## Manual Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/gnoobs75/Okyaku.git
cd Okyaku
```

### Step 2: Create the Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE okyaku;

# Exit psql
\q
```

### Step 3: Set Up the Backend

```bash
# Navigate to backend directory
cd backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Create uploads directory
mkdir uploads

# Run database migrations
alembic upgrade head
```

### Step 4: Set Up the Frontend

```bash
# Navigate to frontend directory (from project root)
cd frontend

# Install Node.js dependencies
npm install
```

### Step 5: Configure Environment Variables

The default configuration works out of the box for local development. If you need to customize:

**Backend** (`backend/.env`):
```env
# Application
APP_NAME=Okyaku CRM
DEBUG=true

# Security (change in production!)
SECRET_KEY=dev-secret-key-change-in-production

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/okyaku

# File Storage
UPLOAD_DIR=./uploads

# CORS
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

**Frontend** (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## Configuration

### Database Configuration

If your PostgreSQL setup differs from the defaults:

```env
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/okyaku
```

### Changing Ports

**Backend port** (default: 8000):
```bash
uvicorn app.main:app --reload --port 8001
```

**Frontend port** (default: 5173):
Update `frontend/vite.config.ts`:
```typescript
export default defineConfig({
  server: {
    port: 3000
  }
})
```

---

## Running the Application

### Start Backend Server

```bash
cd backend
# Activate virtual environment first
venv\Scripts\activate  # Windows
source venv/bin/activate  # macOS/Linux

# Start the server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at:
- **API**: http://localhost:8000
- **API Documentation (Swagger)**: http://localhost:8000/api/v1/docs
- **API Documentation (ReDoc)**: http://localhost:8000/api/v1/redoc

### Start Frontend Server

```bash
cd frontend
npm run dev
```

The frontend will be available at:
- **Application**: http://localhost:5173

### Running Both (Two Terminals)

**Terminal 1 - Backend:**
```bash
cd backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## Default Credentials

This application uses local authentication. On first run:

1. Navigate to http://localhost:5173
2. Click **"Register"** to create a new account
3. Enter your desired username, email, and password
4. You'll be automatically logged in

There are no default credentials - you create your own account!

---

## Troubleshooting

### Database Connection Errors

**Error:** `connection refused` or `could not connect to server`

**Solution:**
1. Ensure PostgreSQL is running:
   ```bash
   # Windows (Services)
   net start postgresql-x64-14

   # macOS
   brew services start postgresql

   # Linux
   sudo systemctl start postgresql
   ```

2. Verify the database exists:
   ```bash
   psql -U postgres -l | grep okyaku
   ```

3. Check your `DATABASE_URL` in `backend/.env`

---

### Migration Errors

**Error:** `Target database is not up to date`

**Solution:**
```bash
cd backend
venv\Scripts\activate
alembic upgrade head
```

**Error:** `Can't locate revision`

**Solution:**
```bash
# Generate a new migration
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

---

### Port Already in Use

**Error:** `Address already in use` or `EADDRINUSE`

**Solution:**
```bash
# Find what's using the port (Windows)
netstat -ano | findstr :8000

# Find what's using the port (macOS/Linux)
lsof -i :8000

# Use a different port
uvicorn app.main:app --reload --port 8001
```

---

### Module Not Found Errors

**Backend:**
```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend:**
```bash
cd frontend
rm -rf node_modules
npm install
```

---

### CORS Errors

If you see CORS errors in the browser console, ensure:

1. Backend `CORS_ORIGINS` includes your frontend URL
2. Both servers are running
3. You're accessing via the correct URL (not `127.0.0.1` vs `localhost`)

---

## Project Structure

```
Okyaku/
├── backend/                 # FastAPI Python backend
│   ├── app/
│   │   ├── api/            # API routes and endpoints
│   │   ├── core/           # Config, security, logging
│   │   ├── db/             # Database setup
│   │   ├── models/         # SQLModel database models
│   │   ├── services/       # Business logic services
│   │   └── main.py         # Application entry point
│   ├── alembic/            # Database migrations
│   ├── uploads/            # Local file storage
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment configuration
│
├── frontend/               # React TypeScript frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── context/       # React context providers
│   │   ├── hooks/         # Custom React hooks
│   │   ├── pages/         # Page components
│   │   ├── types/         # TypeScript type definitions
│   │   └── App.tsx        # Main application component
│   ├── package.json       # Node.js dependencies
│   └── .env              # Environment configuration
│
├── setup.bat              # Windows setup script
├── start-dev.bat          # Windows launch script
└── INSTALL.md            # This file
```

---

## Next Steps

After installation:

1. **Explore the API**: Visit http://localhost:8000/api/v1/docs
2. **Create test data**: Use the CRM to add contacts, companies, and deals
3. **Check out features**:
   - Contact & Company Management
   - Deal Pipeline with Kanban board
   - Email Campaign Management
   - Social Media Publishing & Analytics
   - Task & Activity Tracking
   - Reporting Dashboard

---

## Support

For issues and questions:
- GitHub Issues: https://github.com/gnoobs75/Okyaku/issues

---

## License

[Add your license information here]
