# Okyaku

**AI-Native CRM Platform** - A self-hosted, privacy-first CRM with integrated AI capabilities powered by Ollama/Llama 3.1.

GitHub Repository: https://github.com/gnoobs75/Okyaku.git

## Overview

Okyaku is a comprehensive CRM platform that puts AI at the center of customer relationship management. Unlike traditional CRMs with bolted-on AI, Okyaku was designed from the ground up to leverage AI for predictions, recommendations, and autonomous task execution.

### Key Features

**Core CRM**
- Contact & Company Management
- Deal Pipeline with Kanban board
- Activity & Task Tracking
- Email Campaign Management
- Social Media Publishing & Analytics
- File Attachments & Document Management

**AI Capabilities** (100% self-hosted, zero API costs)
- Lead Scoring & Quality Prediction
- Deal Forecasting & Win Probability
- Churn Risk Detection
- Next-Best-Action Recommendations
- AI Agent with CRM Tools (human-in-the-loop approval)
- Conversation Intelligence (meeting/call summarization)
- Natural Language CRM Queries
- Knowledge Base with RAG (document Q&A)
- Anomaly Detection & Proactive Insights

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Tailwind CSS, Vite |
| Backend | FastAPI (Python 3.11+), SQLModel |
| Database | PostgreSQL 14+ with JSONB |
| AI/LLM | Ollama, Llama 3.1, nomic-embed-text |
| Authentication | JWT with bcrypt |

## Quick Start

```bash
# Prerequisites: Python 3.11+, Node.js 18+, PostgreSQL 14+, Ollama

# 1. Clone the repository
git clone https://github.com/gnoobs75/Okyaku.git
cd Okyaku

# 2. Set up Ollama and models
ollama pull llama3.1:8b
ollama pull nomic-embed-text

# 3. Run setup (Windows)
setup.bat

# 4. Start development
start-dev.bat
```

Access the application at http://localhost:5173

## Documentation

| Document | Description |
|----------|-------------|
| [INSTALL.md](./INSTALL.md) | Full installation guide |
| [QUICKSTART.md](./QUICKSTART.md) | Quick setup guide |
| [AI_PROCESS_FLOW.md](./AI_PROCESS_FLOW.md) | AI features, data flows, and use cases |
| [AI_IMPLEMENTATION_PLAN.md](./AI_IMPLEMENTATION_PLAN.md) | Technical implementation details |

## API Endpoints

### Core CRM
- `/api/v1/contacts` - Contact management
- `/api/v1/companies` - Company management
- `/api/v1/deals` - Deal pipeline
- `/api/v1/activities` - Activity tracking
- `/api/v1/tasks` - Task management
- `/api/v1/pipelines` - Pipeline configuration

### AI Features
- `/api/v1/ai/predictions` - Lead scoring, deal forecasting, churn risk
- `/api/v1/ai/recommendations` - Next-best-action suggestions
- `/api/v1/ai/agent` - Autonomous task execution
- `/api/v1/ai/conversation` - Meeting/call analysis
- `/api/v1/ai/chat` - Natural language queries
- `/api/v1/ai/knowledge` - RAG knowledge base
- `/api/v1/ai/insights` - Anomaly detection & insights

## Project Structure

```
Okyaku/
├── backend/                    # FastAPI Python backend
│   ├── app/
│   │   ├── api/endpoints/     # API route handlers
│   │   ├── models/            # SQLModel database models
│   │   ├── services/          # Business logic & AI services
│   │   └── core/              # Configuration & utilities
│   ├── alembic/               # Database migrations
│   └── requirements.txt
│
├── frontend/                   # React TypeScript frontend
│   ├── src/
│   │   ├── components/        # UI components (including /ai)
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── types/             # TypeScript definitions
│   │   └── context/           # React context providers
│   └── package.json
│
├── CLAUDE.md                  # This file
├── INSTALL.md                 # Installation guide
├── QUICKSTART.md              # Quick start guide
├── AI_PROCESS_FLOW.md         # AI documentation
└── AI_IMPLEMENTATION_PLAN.md  # Implementation details
```

## License

[Add license information]
