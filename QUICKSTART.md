# Okyaku CRM - Quick Start Guide

Get up and running in 5 minutes with a fully AI-native CRM.

## Prerequisites

| Software | Version | Download |
|----------|---------|----------|
| Python | 3.11+ | https://python.org/downloads |
| Node.js | 18+ | https://nodejs.org |
| PostgreSQL | 14+ | https://postgresql.org/download |
| Ollama | Latest | https://ollama.com/download |

## Setup Steps

### 1. Install PostgreSQL

Download and install from https://www.postgresql.org/download/windows/

During installation:
- Set password to: `postgres`
- Keep port as: `5432`

### 2. Verify PostgreSQL

```
Double-click: check-postgres.bat
```

This checks PostgreSQL is installed, running, and creates the database.

### 3. Install Ollama (AI Features)

Download and install from https://ollama.com/download

Then pull the required models:
```bash
# Start Ollama (if not auto-started)
ollama serve

# Pull models (in a new terminal)
ollama pull llama3.1:8b
ollama pull nomic-embed-text
```

### 4. Run Setup

```
Double-click: setup.bat
```

This installs all dependencies and configures the database.

### 5. Start Development

```
Double-click: start-dev.bat
```

This launches both backend and frontend servers.

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `setup.bat` | First-time setup (install dependencies, create DB) |
| `start-dev.bat` | Start both backend + frontend (opens 2 windows) |
| `start-backend.bat` | Start only the backend server |
| `start-frontend.bat` | Start only the frontend server |
| `check-postgres.bat` | Verify PostgreSQL is working |

---

## URLs

| Service | URL |
|---------|-----|
| Frontend App | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Documentation | http://localhost:8000/api/v1/docs |
| Health Check | http://localhost:8000/api/v1/health |
| Ollama Server | http://localhost:11434 |

---

## Starting & Stopping

### Start Everything
```batch
start-dev.bat
```
Opens two terminal windows (backend + frontend).

### Start Individually
```batch
:: Terminal 1
start-backend.bat

:: Terminal 2
start-frontend.bat
```

### Stop Services
- Press `Ctrl+C` in each terminal window, OR
- Close the terminal windows

---

## Debugging

### Backend Logs
The backend window shows:
- All incoming HTTP requests
- Database queries (in debug mode)
- Error stack traces
- Authentication events

Example output:
```
[12:34:56] [INFO] Starting backend server...
INFO:     Uvicorn running on http://0.0.0.0:8000
DEBUG:    POST /api/v1/auth/login - 200 OK
DEBUG:    GET /api/v1/contacts - 200 OK
```

### Frontend Logs
The frontend window shows:
- Vite build status
- Hot Module Replacement (HMR) updates
- TypeScript compilation errors
- Bundle size information

Example output:
```
[12:34:56] [INFO] Starting frontend server...
VITE v5.0.10  ready in 500 ms
➜  Local:   http://localhost:5173/
➜  Network: http://192.168.1.100:5173/
```

### Browser DevTools
Press `F12` in the browser to see:
- Network requests and responses
- JavaScript console errors
- React component tree (with React DevTools extension)

---

## First Login

1. Open http://localhost:5173
2. Click **"Register"**
3. Create your account:
   - Username: `admin`
   - Email: `admin@example.com`
   - Password: `password123`
4. You're in!

---

## Common Issues

### "PostgreSQL not running"
```batch
:: Start PostgreSQL service (Windows)
net start postgresql-x64-16
```

### "Database does not exist"
```batch
psql -U postgres -c "CREATE DATABASE okyaku;"
```

### "Port already in use"
Another application is using port 8000 or 5173. Either:
- Close the other application, or
- Change the port in the startup scripts

### "Module not found" errors
Re-run the setup:
```batch
setup.bat
```

---

## Project Structure

```
Okyaku/
├── backend/           # FastAPI Python backend
│   ├── app/          # Application code
│   ├── alembic/      # Database migrations
│   └── uploads/      # Local file storage
│
├── frontend/         # React TypeScript frontend
│   └── src/         # Source code
│
├── setup.bat         # First-time setup
├── start-dev.bat     # Start both services
├── start-backend.bat # Start backend only
├── start-frontend.bat# Start frontend only
├── check-postgres.bat# Verify PostgreSQL
├── INSTALL.md       # Full installation guide
└── QUICKSTART.md    # This file
```

---

## Next Steps

- Read the full [Installation Guide](INSTALL.md)
- Explore the [API Documentation](http://localhost:8000/api/v1/docs)
- Check out the features:
  - Contact & Company Management
  - Deal Pipeline (Kanban board)
  - Email Campaigns
  - Social Media Publishing
  - Analytics Dashboard

## AI Features Quick Reference

All AI features require Ollama running with `llama3.1:8b` model.

| Feature | How to Access |
|---------|---------------|
| **Lead Scoring** | Contact detail page → AI Score panel |
| **Deal Forecast** | Deal detail page → Forecast widget |
| **Recommendations** | Dashboard → Next Best Actions panel |
| **AI Chat** | Bottom-right chat icon → Ask questions naturally |
| **Conversation Analysis** | Activity detail → "Summarize" button |
| **AI Insights** | Dashboard → Insights panel |
| **Knowledge Base** | Settings → Upload documents for RAG |

### Quick AI Test

After setup, try these in the AI Chat:
- "Show me my hottest leads"
- "What deals are closing this month?"
- "Summarize activities with [company name]"

For detailed AI documentation, see [AI_PROCESS_FLOW.md](./AI_PROCESS_FLOW.md).
