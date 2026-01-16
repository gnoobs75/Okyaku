# Okyaku AI-Native CRM Implementation Plan

## Implementation Status: COMPLETE

All 8 phases have been successfully implemented. Okyaku is now a fully AI-native, self-hosted CRM.

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Ollama Integration | **COMPLETE** |
| Phase 2 | Predictive Analytics | **COMPLETE** |
| Phase 3 | Next-Best-Action Engine | **COMPLETE** |
| Phase 4 | AI Agent Framework | **COMPLETE** |
| Phase 5 | Conversation Intelligence | **COMPLETE** |
| Phase 6 | Natural Language Chat | **COMPLETE** |
| Phase 7 | RAG & Knowledge Base | **COMPLETE** |
| Phase 8 | Anomaly Detection & Insights | **COMPLETE** |

---

## Executive Summary

Transform Okyaku from a traditional CRM with basic AI content generation into a fully **AI-native, self-hosted CRM** where AI autonomously handles tasks, generates insights, predicts outcomes, and executes workflows within guardrails.

**Key Change**: Replace Anthropic Claude API with **Ollama running Llama 3.1** via OpenAI-compatible API format for complete self-hosted operation with zero recurring API costs.

---

## Current State Analysis

### What Exists Today
- **AI Content Service**: Uses Anthropic Claude for social media content generation
- **Endpoints**: `/api/v1/ai/content/generate`, `/variations`, `/adapt`, `/improve`, `/hashtags`
- **Engagement Automation**: Rule-based (templates, triggers) - NOT AI-driven
- **Frontend**: AIContentAssistant component with tabs for different content operations

### Limitations to Address
1. External API dependency (Anthropic) with recurring costs
2. No predictive analytics (lead scoring, deal forecasting)
3. No AI-driven recommendations (next-best-action)
4. No conversation intelligence or summarization
5. No autonomous AI agents
6. No natural language query interface
7. Rule-based automation only (no AI reasoning)

---

## Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        REACT FRONTEND                           │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ AI Chat      │  │ AI Sidebar   │  │ AI Insights Dashboard  │ │
│  │ Interface    │  │ Suggestions  │  │ & Predictions          │ │
│  └──────────────┘  └──────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     PYTHON BACKEND (FastAPI)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    AI ORCHESTRATION LAYER                │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐   │   │
│  │  │ Agent       │  │ Tool        │  │ Guardrails &    │   │   │
│  │  │ Executor    │  │ Registry    │  │ Human-in-Loop   │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘   │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    AI SERVICES                            │   │
│  │  ┌────────────┐ ┌────────────┐ ┌────────────┐            │   │
│  │  │ LLM Client │ │ Embeddings │ │ RAG Engine │            │   │
│  │  │ (Ollama)   │ │ Service    │ │            │            │   │
│  │  └────────────┘ └────────────┘ └────────────┘            │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    CRM SERVICES                           │   │
│  │  Contacts │ Deals │ Activities │ Analytics │ Email       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ PostgreSQL   │  │ Vector Store │  │ Ollama               │   │
│  │ (CRM Data)   │  │ (pgvector)   │  │ (Llama 3.1 Local)    │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation - Ollama Integration (Week 1)

**Goal**: Replace Anthropic with Ollama/Llama 3.1 using OpenAI-compatible API

#### 1.1 Backend LLM Client Refactor

**File**: `backend/app/services/llm_service.py` (NEW)

```python
# Core LLM service using OpenAI SDK pointing to Ollama
from openai import AsyncOpenAI

class LLMService:
    def __init__(self):
        self.client = AsyncOpenAI(
            base_url="http://localhost:11434/v1",  # Ollama OpenAI-compatible endpoint
            api_key="ollama"  # Ollama doesn't require real key
        )
        self.model = "llama3.1"  # or llama3.1:70b for larger model

    async def chat(self, messages: list, temperature: float = 0.7,
                   max_tokens: int = 2048, tools: list = None) -> str:
        """Standard chat completion"""

    async def chat_with_tools(self, messages: list, tools: list) -> dict:
        """Chat with function/tool calling for agents"""

    async def stream_chat(self, messages: list) -> AsyncGenerator:
        """Streaming response for real-time UI"""
```

#### 1.2 Configuration Updates

**File**: `backend/app/core/config.py`

```python
# AI Configuration
OLLAMA_BASE_URL: str = "http://localhost:11434/v1"
OLLAMA_MODEL: str = "llama3.1"  # Default model
OLLAMA_EMBEDDING_MODEL: str = "nomic-embed-text"
AI_MAX_TOKENS: int = 4096
AI_TEMPERATURE: float = 0.7

# Feature flags
AI_AGENTS_ENABLED: bool = True
AI_PREDICTIONS_ENABLED: bool = True
AI_CHAT_ENABLED: bool = True
```

#### 1.3 Migrate Existing AI Content Service

**File**: `backend/app/services/ai_content_service.py` (MODIFY)

- Replace `anthropic` client with new `LLMService`
- Update prompts for Llama 3.1 format
- Maintain same API contracts for backward compatibility

#### 1.4 Tasks
- [x] Install `openai` Python SDK
- [x] Create `LLMService` class with OpenAI-compatible client
- [x] Add Ollama configuration settings
- [x] Refactor `AIContentService` to use new LLM client
- [x] Test all existing content generation endpoints
- [x] Update frontend status check for Ollama connectivity
- [x] Add Ollama health check endpoint

---

### Phase 2: Predictive Analytics (Week 2)

**Goal**: Implement lead scoring, deal forecasting, and churn prediction

#### 2.1 Lead Scoring Service

**File**: `backend/app/services/ai_scoring_service.py` (NEW)

```python
class AIScoringService:
    async def score_lead(self, contact_id: str) -> LeadScore:
        """
        Analyze contact data and predict lead quality.
        Returns score (0-100), factors, and recommendations.
        """
        # Gather context: contact info, activities, email engagement, deal history
        # Use LLM to analyze and score

    async def forecast_deal(self, deal_id: str) -> DealForecast:
        """
        Predict deal close probability, expected amount, and timing.
        """

    async def detect_churn_risk(self, contact_id: str) -> ChurnRisk:
        """
        Identify contacts at risk of churning.
        """
```

#### 2.2 Prediction Models

**File**: `backend/app/models/ai_predictions.py` (NEW)

```python
class LeadScore(SQLModel, table=True):
    id: str
    contact_id: str
    score: int  # 0-100
    factors: dict  # {"engagement": 80, "fit": 70, "timing": 60}
    recommendations: list[str]
    explanation: str
    calculated_at: datetime

class DealForecast(SQLModel, table=True):
    id: str
    deal_id: str
    close_probability: float  # 0.0-1.0
    predicted_amount: float
    predicted_close_date: date
    confidence: float
    risk_factors: list[str]
    calculated_at: datetime
```

#### 2.3 API Endpoints

**File**: `backend/app/api/endpoints/ai_predictions.py` (NEW)

```
POST /api/v1/ai/predictions/lead-score/{contact_id}
POST /api/v1/ai/predictions/deal-forecast/{deal_id}
POST /api/v1/ai/predictions/churn-risk/{contact_id}
GET  /api/v1/ai/predictions/batch-score  (score all leads)
GET  /api/v1/ai/predictions/pipeline-forecast  (full pipeline)
```

#### 2.4 Tasks
- [x] Create LeadScore, DealForecast, ChurnRisk models
- [x] Implement AIScoringService with LLM-based analysis
- [x] Create prediction endpoints
- [x] Add scoring prompts with structured output
- [x] Store predictions in database for history
- [x] Add batch scoring job to scheduler
- [x] Create frontend dashboard components

---

### Phase 3: Next-Best-Action Engine (Week 3)

**Goal**: AI recommends optimal actions with explanations

#### 3.1 Recommendation Service

**File**: `backend/app/services/ai_recommendations_service.py` (NEW)

```python
class AIRecommendationsService:
    async def get_next_actions(self, entity_type: str, entity_id: str) -> list[Recommendation]:
        """
        Analyze entity (contact, deal, company) and suggest actions.
        Returns ranked recommendations with explanations.
        """

    async def explain_recommendation(self, recommendation_id: str) -> Explanation:
        """
        Provide detailed reasoning for a recommendation.
        """

    async def get_daily_priorities(self, user_id: str) -> list[Priority]:
        """
        Generate prioritized task list for the day.
        """
```

#### 3.2 Recommendation Types

```python
class RecommendationType(str, Enum):
    SEND_EMAIL = "send_email"
    SCHEDULE_CALL = "schedule_call"
    CREATE_TASK = "create_task"
    UPDATE_DEAL_STAGE = "update_deal_stage"
    ADD_NOTE = "add_note"
    SEND_PROPOSAL = "send_proposal"
    FOLLOW_UP = "follow_up"
    RE_ENGAGE = "re_engage"

class Recommendation(BaseModel):
    id: str
    type: RecommendationType
    title: str
    description: str
    entity_type: str
    entity_id: str
    priority: int  # 1-5
    confidence: float
    reasoning: str  # "Based on similar deals closing 20% faster..."
    suggested_content: Optional[str]  # Draft email, talking points
    expires_at: Optional[datetime]
```

#### 3.3 Tasks
- [x] Create Recommendation models and types
- [x] Implement AIRecommendationsService
- [x] Build recommendation prompts with RAG context
- [x] Create API endpoints for recommendations
- [x] Add recommendation sidebar to contact/deal views
- [x] Implement "Apply" action to execute recommendations
- [x] Add feedback loop (mark helpful/not helpful)

---

### Phase 4: AI Agents & Autonomous Workflows (Week 4)

**Goal**: Task-specific agents that execute multi-step actions with human oversight

#### 4.1 Agent Framework

**File**: `backend/app/services/ai_agents/base.py` (NEW)

```python
class AgentTool:
    """Callable tool that agents can use"""
    name: str
    description: str
    parameters: dict
    requires_approval: bool

    async def execute(self, **kwargs) -> ToolResult

class Agent:
    """Base agent with reasoning loop"""
    name: str
    description: str
    tools: list[AgentTool]
    max_iterations: int = 10

    async def run(self, task: str, context: dict) -> AgentResult:
        """Execute agent with ReAct-style reasoning"""
```

#### 4.2 CRM Tools for Agents

**File**: `backend/app/services/ai_agents/tools/` (NEW DIRECTORY)

```python
# crm_tools.py
class QueryContactsTool(AgentTool):
    """Search and filter contacts"""

class UpdateDealTool(AgentTool):
    """Update deal stage, amount, or properties"""
    requires_approval = True  # Needs human approval

class CreateTaskTool(AgentTool):
    """Create a task for follow-up"""

class SendEmailTool(AgentTool):
    """Draft and queue email (requires approval)"""
    requires_approval = True

class LogActivityTool(AgentTool):
    """Log call, meeting, or note"""

class AnalyzeDataTool(AgentTool):
    """Query database for analytics"""
```

#### 4.3 Specialized Agents

**File**: `backend/app/services/ai_agents/agents/` (NEW DIRECTORY)

```python
# lead_qualifier.py
class LeadQualifierAgent(Agent):
    """
    Qualifies new leads:
    1. Analyze lead data
    2. Score and categorize
    3. Update lead status
    4. Create follow-up task
    5. Draft initial outreach
    """

# deal_assistant.py
class DealAssistantAgent(Agent):
    """
    Assists with deal progression:
    1. Analyze deal status and history
    2. Identify blockers
    3. Suggest next steps
    4. Draft proposals/follow-ups
    """

# data_analyst.py
class DataAnalystAgent(Agent):
    """
    Answers natural language queries:
    1. Parse user question
    2. Query database
    3. Analyze results
    4. Generate report/visualization
    """
```

#### 4.4 Human-in-the-Loop Approval System

```python
class PendingAction(SQLModel, table=True):
    id: str
    agent_name: str
    action_type: str
    action_data: dict
    context: dict
    reasoning: str
    status: str  # pending, approved, rejected
    created_at: datetime
    reviewed_at: Optional[datetime]
    reviewed_by: Optional[str]
```

#### 4.5 Tasks
- [x] Create Agent base class with ReAct loop
- [x] Implement AgentTool interface
- [x] Build CRM-specific tools (query, update, email, etc.)
- [x] Create LeadQualifierAgent
- [x] Create DealAssistantAgent
- [x] Create DataAnalystAgent
- [x] Implement PendingAction approval workflow
- [x] Add agent endpoints (`POST /api/v1/ai/agents/{agent}/run`)
- [x] Build approval queue UI in frontend

---

### Phase 5: Conversation Intelligence (Week 5)

**Goal**: Summarize interactions, extract insights, auto-update records

#### 5.1 Conversation Analysis Service

**File**: `backend/app/services/ai_conversation_service.py` (NEW)

```python
class AIConversationService:
    async def summarize_activity(self, activity_id: str) -> Summary:
        """Summarize a call note, meeting, or email"""

    async def extract_insights(self, text: str) -> Insights:
        """
        Extract:
        - Key points
        - Action items
        - Objections
        - Sentiment
        - Next steps mentioned
        """

    async def auto_update_record(self, activity_id: str) -> list[ProposedUpdate]:
        """
        Analyze conversation and propose CRM updates:
        - Update contact preferences
        - Update deal stage
        - Create tasks
        - Add tags
        """
```

#### 5.2 Tasks
- [x] Create AIConversationService
- [x] Build summarization prompts
- [x] Implement insight extraction (action items, objections, sentiment)
- [x] Add auto-update proposals with approval flow
- [x] Integrate with Activity creation flow
- [x] Add "Summarize" button to activity views
- [x] Real-time summarization for email/note composition

---

### Phase 6: Natural Language Query Interface (Week 6)

**Goal**: Chat interface for querying CRM data naturally

#### 6.1 Chat Service

**File**: `backend/app/services/ai_chat_service.py` (NEW)

```python
class AIChatService:
    async def process_query(self, user_id: str, message: str,
                           conversation_id: Optional[str]) -> ChatResponse:
        """
        Process natural language query:
        1. Understand intent
        2. Generate SQL or use tools
        3. Execute query
        4. Format response
        """

    async def stream_response(self, ...) -> AsyncGenerator:
        """Stream response for real-time UI"""
```

#### 6.2 Example Queries Supported

```
"Show me all deals closing this month"
"Who are my hottest leads?"
"Summarize my activities with Acme Corp"
"What's my pipeline value by stage?"
"Find contacts I haven't talked to in 30 days"
"Draft a follow-up email to John about the proposal"
"Create a task to call Sarah next Tuesday"
"Why did we lose the deal with XYZ Inc?"
```

#### 6.3 Chat UI Component

**File**: `frontend/src/components/ai/AIChatPanel.tsx` (NEW)

- Floating chat button (like Intercom)
- Expandable panel with conversation history
- Markdown rendering for responses
- Action buttons for suggested actions
- Context awareness (current page/entity)

#### 6.4 Tasks
- [x] Create AIChatService with intent detection
- [x] Build SQL generation from natural language
- [x] Implement conversation memory (multi-turn)
- [x] Create chat WebSocket endpoint for streaming
- [x] Build AIChatPanel React component
- [x] Add chat context awareness
- [x] Implement action execution from chat
- [x] Store conversation history

---

### Phase 7: RAG & Embeddings (Week 7)

**Goal**: Enhance AI accuracy with retrieval-augmented generation

#### 7.1 Vector Store Setup

```sql
-- Enable pgvector extension
CREATE EXTENSION vector;

-- Add embedding columns
ALTER TABLE contacts ADD COLUMN embedding vector(768);
ALTER TABLE deals ADD COLUMN embedding vector(768);
ALTER TABLE activities ADD COLUMN embedding vector(768);
```

#### 7.2 Embedding Service

**File**: `backend/app/services/ai_embedding_service.py` (NEW)

```python
class AIEmbeddingService:
    def __init__(self):
        self.client = AsyncOpenAI(base_url="http://localhost:11434/v1")
        self.model = "nomic-embed-text"  # Via Ollama

    async def embed_text(self, text: str) -> list[float]:
        """Generate embedding for text"""

    async def embed_entity(self, entity_type: str, entity_id: str):
        """Generate and store embedding for CRM entity"""

    async def semantic_search(self, query: str, entity_type: str,
                             limit: int = 10) -> list[SearchResult]:
        """Find similar entities by semantic meaning"""
```

#### 7.3 RAG Pipeline

```python
class RAGService:
    async def get_context(self, query: str, entity_type: str = None) -> str:
        """
        1. Embed query
        2. Search vector store
        3. Retrieve relevant records
        4. Format as context for LLM
        """
```

#### 7.4 Tasks
- [x] Install pgvector extension
- [x] Add embedding columns to key tables
- [x] Create AIEmbeddingService
- [x] Implement embedding generation on record create/update
- [x] Build semantic search functionality
- [x] Create RAGService for context retrieval
- [x] Integrate RAG into chat and recommendations
- [x] Add background job to backfill embeddings

---

### Phase 8: Anomaly Detection & Insights (Week 8)

**Goal**: Proactive AI monitoring and alerting

#### 8.1 Anomaly Service

**File**: `backend/app/services/ai_anomaly_service.py` (NEW)

```python
class AIAnomalyService:
    async def detect_anomalies(self) -> list[Anomaly]:
        """
        Scan for:
        - Unusual activity patterns
        - Data quality issues
        - Performance deviations
        - Churn signals
        """

    async def generate_insights(self, timeframe: str = "week") -> list[Insight]:
        """
        Generate periodic insights:
        - Top performers
        - Areas needing attention
        - Trend analysis
        - Opportunities
        """
```

#### 8.2 Anomaly Types

```python
class AnomalyType(str, Enum):
    CHURN_RISK = "churn_risk"
    DATA_GAP = "data_gap"
    STALE_DEAL = "stale_deal"
    ENGAGEMENT_DROP = "engagement_drop"
    UNUSUAL_PATTERN = "unusual_pattern"

class Anomaly(BaseModel):
    type: AnomalyType
    severity: str  # low, medium, high, critical
    entity_type: str
    entity_id: str
    title: str
    description: str
    suggested_action: str
```

#### 8.3 Tasks
- [x] Create AIAnomalyService
- [x] Define anomaly detection rules + AI analysis
- [x] Build scheduled anomaly scan job
- [x] Create notifications for critical anomalies
- [x] Build insights dashboard
- [x] Add AI-generated weekly summary email

---

## Frontend Components Summary

### New Components to Build

```
frontend/src/components/ai/
├── AIChatPanel.tsx          # Floating chat interface
├── AIChatMessage.tsx        # Chat message bubble
├── AIInsightsSidebar.tsx    # Contextual recommendations
├── AIScoreCard.tsx          # Lead score display
├── AIDealForecast.tsx       # Deal prediction card
├── AIRecommendationCard.tsx # Action recommendation
├── AIApprovalQueue.tsx      # Pending actions queue
├── AIInsightsDashboard.tsx  # Main AI dashboard
├── AIAgentStatus.tsx        # Agent execution status
└── index.ts                 # Exports

frontend/src/pages/ai/
├── AICommandCenter.tsx      # Central AI management
└── AIInsightsPage.tsx       # Full insights view

frontend/src/types/ai.ts     # All AI-related types
frontend/src/hooks/useAI.ts  # AI-related hooks
frontend/src/context/AIContext.tsx  # AI state management
```

---

## Database Migrations

```sql
-- Phase 2: Predictions
CREATE TABLE lead_scores (...);
CREATE TABLE deal_forecasts (...);
CREATE TABLE churn_risks (...);

-- Phase 4: Agents
CREATE TABLE pending_actions (...);
CREATE TABLE agent_executions (...);

-- Phase 6: Chat
CREATE TABLE chat_conversations (...);
CREATE TABLE chat_messages (...);

-- Phase 7: Embeddings
CREATE EXTENSION vector;
ALTER TABLE contacts ADD COLUMN embedding vector(768);
ALTER TABLE deals ADD COLUMN embedding vector(768);
ALTER TABLE activities ADD COLUMN embedding vector(768);
ALTER TABLE companies ADD COLUMN embedding vector(768);

-- Phase 8: Anomalies
CREATE TABLE anomalies (...);
CREATE TABLE ai_insights (...);
```

---

## Configuration Requirements

### Ollama Setup

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull models
ollama pull llama3.1           # Main LLM (8B params)
ollama pull llama3.1:70b       # Larger model (optional, needs GPU)
ollama pull nomic-embed-text   # Embeddings model

# Start Ollama server
ollama serve
# Runs at http://localhost:11434
```

### Environment Variables

```env
# Ollama Configuration
OLLAMA_BASE_URL=http://localhost:11434/v1
OLLAMA_MODEL=llama3.1
OLLAMA_EMBEDDING_MODEL=nomic-embed-text

# AI Feature Flags
AI_AGENTS_ENABLED=true
AI_PREDICTIONS_ENABLED=true
AI_CHAT_ENABLED=true
AI_RAG_ENABLED=true

# AI Settings
AI_MAX_TOKENS=4096
AI_TEMPERATURE=0.7
AI_REQUIRE_APPROVAL_FOR_WRITES=true
```

### Python Dependencies to Add

```txt
# requirements.txt additions
openai>=1.12.0        # OpenAI SDK for Ollama compatibility
pgvector>=0.2.0       # Vector similarity search
numpy>=1.24.0         # For embedding operations
```

---

## Success Metrics

1. **Lead Scoring Accuracy**: 70%+ correlation with actual conversions
2. **Deal Forecast Accuracy**: Within 20% of actual close amount/date
3. **Recommendation Engagement**: 40%+ of recommendations acted upon
4. **Chat Query Success**: 80%+ queries successfully answered
5. **Agent Task Completion**: 90%+ agent tasks complete successfully
6. **User Satisfaction**: Positive feedback on AI features

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| LLM hallucinations | RAG for grounding, human approval for writes |
| Performance issues | Async processing, smaller models, caching |
| Data privacy | Self-hosted only, no external API calls |
| User trust | Explainability in all recommendations |
| Scope creep | Phased rollout, MVP-first approach |

---

## Timeline Summary

| Phase | Focus | Duration |
|-------|-------|----------|
| 1 | Ollama Integration | Week 1 |
| 2 | Predictive Analytics | Week 2 |
| 3 | Next-Best-Action | Week 3 |
| 4 | AI Agents | Week 4 |
| 5 | Conversation Intelligence | Week 5 |
| 6 | NL Query Interface | Week 6 |
| 7 | RAG & Embeddings | Week 7 |
| 8 | Anomaly Detection | Week 8 |

**Total: 8 weeks to full AI-native CRM**

---

## Quick Start (Phase 1 MVP)

For immediate impact, implement in this order:

1. **Day 1-2**: Set up Ollama + LLMService
2. **Day 3-4**: Migrate content generation to Ollama
3. **Day 5-6**: Add basic chat interface
4. **Day 7**: Add lead scoring endpoint

This gives you a working AI-native foundation to build upon.
