# Okyaku CRM - AI Process Flow

This document describes how AI is integrated throughout the Okyaku CRM application, the data flows between components, and provides sample use cases for each AI-powered feature.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  LeadScoreCard │ DealForecast │ ChurnRisk │ Recommendations │ ChatInterface │
│  AgentChat     │ ConversationAnalyzer │ InsightsPanel │ PipelineForecast   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ HTTP/REST API
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Backend (FastAPI)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  /ai/predictions  │  /ai/recommendations  │  /ai/agent  │  /ai/conversation │
│  /ai/chat         │  /ai/knowledge        │  /ai/insights                   │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI Services Layer                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  LLMService      │  AIScoringService     │  RecommendationService           │
│  AgentService    │  ConversationService  │  ChatService                     │
│  RAGService      │  InsightsService                                         │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ OpenAI-compatible API
                                   ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Ollama (Self-Hosted LLM)                              │
│                           Llama 3.1 8B Model                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Predictive Analytics

### Lead Scoring

**Purpose**: Automatically score leads based on their likelihood to convert, helping sales teams prioritize high-value prospects.

**Process Flow**:
```
Contact Data → AIScoringService → LLM Analysis → Lead Score (0-100) → Database
     │                                                                    │
     │ (engagement history, company info,                                 │
     │  activity patterns, firmographics)                                 ▼
     │                                                            Frontend Display
     └──────────────────────────────────────────────────────────→ (LeadScoreCard)
```

**Data Analyzed**:
- Contact engagement history (emails opened, calls answered)
- Company firmographics (size, industry, revenue)
- Activity patterns (website visits, content downloads)
- Deal history and previous interactions
- Social media engagement

**Sample Use Cases**:

| Scenario | Input | AI Output | Business Value |
|----------|-------|-----------|----------------|
| New lead qualification | Contact with company email, LinkedIn profile, initial form submission | Score: 78/100, High conversion probability based on company size and industry fit | Sales rep prioritizes this lead for immediate follow-up |
| Re-engagement campaign | Dormant contact, 6 months since last activity | Score: 35/100, Low engagement signals, recommend nurture campaign | Marketing adds to automated drip campaign instead of direct sales |
| Enterprise prospect | Fortune 500 company contact, multiple decision-makers engaged | Score: 92/100, Strong buying signals, multiple stakeholders active | Account executive assigned, custom demo scheduled |

**API Endpoint**: `POST /ai/predictions/lead-score/{contact_id}`

---

### Deal Forecasting

**Purpose**: Predict deal outcomes and estimated close values to improve pipeline accuracy and revenue forecasting.

**Process Flow**:
```
Deal Data → AIScoringService → Pattern Analysis → Forecast → Database
     │                              │                           │
     │ (stage, value, age,          │ (historical win rates,    ▼
     │  activities, stakeholders)   │  stage progression)    Frontend Display
     │                              │                        (DealForecastCard)
     └──────────────────────────────┴──────────────────────────────────────────
```

**Data Analyzed**:
- Current deal stage and time in stage
- Deal value and historical averages
- Number and quality of activities
- Stakeholder engagement levels
- Competitor mentions
- Historical win/loss patterns

**Sample Use Cases**:

| Scenario | Input | AI Output | Business Value |
|----------|-------|-----------|----------------|
| Quarterly forecast | All deals in pipeline with stages and values | 73% confidence in Q1 target, $2.3M weighted pipeline | CFO gets accurate revenue projection |
| Stalled deal detection | Deal stuck in proposal stage for 30 days | Win probability dropped from 65% to 42%, recommend executive sponsor engagement | Manager intervenes before deal is lost |
| Upsell opportunity | Active customer with expansion signals | 85% probability of $50K upsell, optimal timing in 2 weeks | Rep schedules strategic touchpoint |

**API Endpoint**: `POST /ai/predictions/deal-forecast/{deal_id}`

---

### Churn Risk Prediction

**Purpose**: Identify contacts and accounts at risk of churning before they leave, enabling proactive retention.

**Process Flow**:
```
Customer Data → AIScoringService → Risk Analysis → Churn Score → Alert System
       │                                │                             │
       │ (usage patterns, support       │ (behavioral patterns,       ▼
       │  tickets, engagement drops)    │  industry benchmarks)   InsightsPanel
       │                                │                              │
       └────────────────────────────────┴──────────────────────────────┘
                                                                       │
                                                              Retention Actions
```

**Data Analyzed**:
- Product/service usage trends
- Support ticket frequency and sentiment
- Engagement decline patterns
- Payment history
- NPS/satisfaction scores
- Competitive research signals

**Sample Use Cases**:

| Scenario | Input | AI Output | Business Value |
|----------|-------|-----------|----------------|
| Usage decline detection | Customer reduced platform usage by 40% this month | Churn risk: 72%, recommend CSM check-in, offer training session | Proactive outreach saves $50K ARR account |
| Support escalation | 5 support tickets in 2 weeks, negative sentiment | Churn risk: 85%, escalate to account manager immediately | Executive attention prevents contract cancellation |
| Healthy account confirmation | Consistent usage, positive feedback, contract renewal approaching | Churn risk: 8%, recommend upsell conversation | Rep focuses on expansion instead of retention |

**API Endpoint**: `POST /ai/predictions/churn-risk/{contact_id}`

---

## 2. Recommendation Engine (Next-Best-Actions)

**Purpose**: Provide sales reps with AI-powered recommendations for optimal next actions with each contact or deal.

**Process Flow**:
```
Context Data → RecommendationService → Action Analysis → Ranked Recommendations
      │                                      │                      │
      │ (contact history, deal stage,        │ (action library,     ▼
      │  recent activities, goals)           │  success patterns) NextBestActionsPanel
      │                                      │                      │
      └──────────────────────────────────────┴──────────────────────┘
                                                                    │
                                                             Rep Takes Action
                                                                    │
                                                             Feedback Loop ←──┘
```

**Recommendation Types**:
- **follow_up**: Schedule calls, send emails, book meetings
- **content_share**: Share relevant case studies, whitepapers
- **escalation**: Involve managers, executives, specialists
- **nurture**: Add to campaigns, schedule future touchpoints
- **close**: Present proposal, negotiate, ask for signature

**Sample Use Cases**:

| Scenario | Context | AI Recommendation | Expected Outcome |
|----------|---------|-------------------|------------------|
| Post-demo follow-up | Demo completed yesterday, 3 stakeholders attended | Send personalized follow-up with recorded demo highlights, include ROI calculator | 40% higher response rate than generic follow-up |
| Proposal pending | Proposal sent 5 days ago, no response | Call primary contact, offer to address questions, suggest brief review meeting | Reduces deal cycle by 3 days on average |
| Champion building | Single contact engaged, need broader buy-in | Request introduction to technical decision-maker, offer technical deep-dive | Increases win rate by 25% |
| Contract renewal | Renewal in 30 days, positive relationship | Schedule business review, present usage insights, discuss expansion | 90% renewal rate with expansion opportunities |

**API Endpoints**:
- `GET /ai/recommendations/contact/{contact_id}`
- `GET /ai/recommendations/deal/{deal_id}`
- `POST /ai/recommendations/{id}/feedback`

---

## 3. AI Agent Framework

**Purpose**: Execute complex, multi-step tasks autonomously with human oversight and approval for sensitive actions.

**Process Flow**:
```
User Request → AgentService → Task Planning → Tool Execution → Result
      │              │              │               │            │
      │              ▼              ▼               ▼            ▼
      │       Parse Intent   Select Tools    Execute Steps   Compile Output
      │              │              │               │            │
      │              │              │               ▼            │
      │              │              │      ┌───────────────┐     │
      │              │              │      │ Available     │     │
      │              │              └─────→│ Tools:        │     │
      │              │                     │ - search_crm  │     │
      │              │                     │ - create_task │     │
      │              │                     │ - send_email  │     │
      │              │                     │ - update_deal │     │
      │              │                     │ - schedule    │     │
      │              │                     │ - get_insights│     │
      │              │                     └───────────────┘     │
      │              │                            │              │
      │              │                            ▼              │
      │              │                   Human Approval          │
      │              │                   (if required)           │
      │              │                            │              │
      └──────────────┴────────────────────────────┴──────────────┘
                                                                 │
                                                          AgentChat UI
```

**Available Tools**:
| Tool | Description | Requires Approval |
|------|-------------|-------------------|
| `search_contacts` | Search CRM for contacts by name, email, company | No |
| `search_deals` | Search deals by name, stage, value | No |
| `get_contact_details` | Get full contact profile and history | No |
| `get_deal_details` | Get complete deal information | No |
| `create_task` | Create follow-up tasks | No |
| `update_deal_stage` | Move deal to new stage | Yes |
| `send_email` | Send email to contact | Yes |
| `schedule_meeting` | Book calendar meeting | Yes |
| `create_activity` | Log calls, meetings, notes | No |
| `get_recommendations` | Get AI recommendations | No |
| `get_pipeline_summary` | Get pipeline analytics | No |
| `get_insights` | Get AI-generated insights | No |

**Sample Use Cases**:

| User Request | Agent Actions | Output |
|--------------|---------------|--------|
| "Prepare for my meeting with Acme Corp tomorrow" | 1. Search for Acme Corp contacts<br>2. Get recent activities<br>3. Get deal status<br>4. Get recommendations<br>5. Compile briefing | Meeting prep doc with contact bios, deal history, talking points |
| "Follow up with all stalled deals this week" | 1. Search deals stalled >7 days<br>2. For each: create follow-up task<br>3. Generate personalized email drafts<br>4. Request approval for sends | 8 follow-up tasks created, 8 email drafts ready for review |
| "Update Q1 forecast and notify sales manager" | 1. Get pipeline summary<br>2. Calculate weighted forecast<br>3. Identify risks<br>4. Create summary email<br>5. Request send approval | Forecast report generated, email pending approval |

**API Endpoints**:
- `POST /ai/agent/task` - Create new agent task
- `GET /ai/agent/task/{task_id}` - Get task status
- `POST /ai/agent/task/{task_id}/approve` - Approve pending action
- `POST /ai/agent/task/{task_id}/reject` - Reject pending action

---

## 4. Conversation Intelligence

**Purpose**: Analyze calls, meetings, and conversations to extract insights, action items, and sentiment.

**Process Flow**:
```
Conversation Input → ConversationService → Analysis → Structured Output
        │                    │                │              │
        │ (transcript,       │                ▼              ▼
        │  recording,        │         ┌─────────────┐  Database Storage
        │  notes)            │         │ Extraction: │       │
        │                    │         │ - Summary   │       │
        │                    │         │ - Key Points│       ▼
        │                    │         │ - Actions   │  ConversationAnalyzer
        │                    │         │ - Sentiment │       UI
        │                    │         │ - Questions │
        │                    │         └─────────────┘
        └────────────────────┴─────────────────────────────────
```

**Analysis Types**:
- **call**: Phone call recordings/transcripts
- **meeting**: Video meeting recordings
- **email_thread**: Email conversation chains
- **chat**: Chat/messaging conversations

**Extracted Information**:
- Executive summary
- Key discussion points
- Action items with owners
- Questions raised (answered and unanswered)
- Sentiment analysis (positive, neutral, negative)
- Buying signals
- Objections raised
- Next steps agreed

**Sample Use Cases**:

| Scenario | Input | AI Analysis | Business Value |
|----------|-------|-------------|----------------|
| Sales call review | 30-minute discovery call transcript | Summary: Prospect has budget approved, timeline Q2, evaluating 3 vendors. Action: Send competitive comparison by Friday. Sentiment: Positive (78%) | Rep has clear next steps, manager has visibility |
| Team meeting notes | Product roadmap discussion recording | Key decisions: Feature X prioritized, launch date March 15. Action items: Design mockups (Sarah), API spec (John), Customer interviews (Mike) | Automatic task creation, searchable decisions |
| Customer complaint | Support call transcript | Issue: Integration failing since update. Sentiment: Frustrated (negative). Root cause identified. Resolution steps documented. | Faster resolution, sentiment tracking for churn prediction |
| Executive meeting prep | Series of emails with CTO | Key concerns: Security, scalability, support SLA. Questions to address: SOC2 compliance, uptime guarantees | Targeted presentation addressing specific concerns |

**API Endpoints**:
- `POST /ai/conversation/analyze` - Analyze new conversation
- `GET /ai/conversation/{analysis_id}` - Get analysis results
- `GET /ai/conversation/contact/{contact_id}` - Get all analyses for contact

---

## 5. Natural Language Chat Interface

**Purpose**: Allow users to query CRM data and get insights using natural language instead of complex filters and reports.

**Process Flow**:
```
User Question → ChatService → Query Understanding → Data Retrieval → Response
       │              │               │                   │             │
       │              ▼               ▼                   ▼             ▼
       │       Intent Classification  Entity Extraction   Database    Natural Language
       │              │               │                   Query        Answer
       │              │               │                   │             │
       │              │               │                   │             │
       │              └───────────────┴───────────────────┴─────────────┘
       │                                                                 │
       └─────────────────────────────────────────────────────────────────┘
                                                                         │
                                                                   ChatInterface UI
```

**Query Types Supported**:
- Pipeline and deal queries
- Contact and company searches
- Activity summaries
- Performance metrics
- Trend analysis
- Comparative questions

**Sample Use Cases**:

| User Question | AI Processing | Response |
|---------------|---------------|----------|
| "How many deals did we close last month?" | Intent: count_deals, Filter: status=won, period=last_month | "You closed 12 deals last month totaling $847,000, up 15% from the previous month." |
| "Who are my most engaged contacts this week?" | Intent: rank_contacts, Metric: engagement, Period: this_week | "Your top 3 engaged contacts: 1) Sarah Chen (5 activities), 2) John Smith (4 activities), 3) Lisa Wong (3 activities)" |
| "What's the average deal cycle for enterprise deals?" | Intent: calculate_metric, Segment: enterprise, Metric: cycle_time | "Enterprise deals average 45 days from creation to close, compared to 23 days for SMB deals." |
| "Show me deals at risk of slipping this quarter" | Intent: filter_deals, Criteria: risk_indicators | "5 deals at risk: [List with names, values, and risk factors]" |
| "Compare this quarter's pipeline to last quarter" | Intent: compare_periods, Metric: pipeline_value | "Q1 pipeline: $2.3M (45 deals) vs Q4: $1.9M (38 deals). 21% growth in value, 18% more deals." |

**API Endpoint**: `POST /ai/chat/query`

---

## 6. Knowledge Base & RAG (Retrieval-Augmented Generation)

**Purpose**: Enable AI to access and reason over company documents, providing accurate answers grounded in your knowledge base.

**Process Flow**:
```
Document Upload → Chunking → Embedding → Vector Storage
       │              │           │            │
       │              ▼           ▼            ▼
       │        Split into    Generate     PostgreSQL
       │        ~500 token    embeddings   with vectors
       │        chunks                          │
       │                                        │
       └────────────────────────────────────────┘
                          │
                          ▼
                 ┌─────────────────┐
User Query ────→│   RAG Service   │────→ Contextual Answer
                 │                 │
                 │ 1. Embed query  │
                 │ 2. Vector search│
                 │ 3. Get chunks   │
                 │ 4. LLM synthesis│
                 └─────────────────┘
```

**Supported Document Types**:
- PDF documents
- Word documents (.docx)
- Text files
- Markdown files
- HTML pages

**Knowledge Categories**:
- `product`: Product documentation, features, specs
- `sales`: Sales playbooks, objection handling, pricing
- `support`: FAQ, troubleshooting, known issues
- `company`: Company info, policies, processes
- `training`: Training materials, onboarding docs

**Sample Use Cases**:

| Scenario | User Query | RAG Process | Response |
|----------|------------|-------------|----------|
| Pricing question | "What's our enterprise pricing?" | Search pricing docs, retrieve relevant chunks | "Enterprise pricing starts at $500/user/month with volume discounts: 100+ users get 15% off, 500+ get 25% off. Custom quotes available." |
| Technical question | "Does our API support webhooks?" | Search technical docs | "Yes, webhooks are supported. You can configure up to 10 webhook endpoints per account. Events supported: deal.created, deal.updated, contact.created..." |
| Objection handling | "Customer says we're too expensive" | Search sales playbook | "Value-based response: Focus on ROI - average customer sees 3x return in first year. Offer pilot program to demonstrate value before full commitment." |
| Product comparison | "How do we compare to Competitor X?" | Search competitive docs | "Key differentiators: 1) AI-native vs bolt-on AI, 2) Self-hosted option for data privacy, 3) 40% lower TCO over 3 years..." |

**API Endpoints**:
- `POST /ai/knowledge/documents` - Upload document
- `GET /ai/knowledge/documents` - List documents
- `POST /ai/knowledge/query` - Query knowledge base
- `DELETE /ai/knowledge/documents/{id}` - Delete document

---

## 7. Anomaly Detection & Insights

**Purpose**: Automatically detect unusual patterns, surface opportunities, and alert users to important changes in their CRM data.

**Process Flow**:
```
CRM Data → InsightsService → Pattern Analysis → Anomaly Detection → Insights
     │            │                │                   │              │
     │            ▼                ▼                   ▼              ▼
     │     Schedule/Trigger   Compare to      Statistical      InsightsPanel
     │     (hourly/daily)     baselines       thresholds       with alerts
     │            │                │                   │              │
     │            │                │                   │              │
     └────────────┴────────────────┴───────────────────┴──────────────┘
                                                                      │
                                                               User Notification
```

**Insight Types**:
| Type | Icon | Description |
|------|------|-------------|
| `anomaly` | ⚠️ | Unusual pattern detected |
| `trend` | 📈 | Significant trend identified |
| `opportunity` | ⭐ | Potential opportunity found |
| `risk` | 🛡️ | Risk detected requiring attention |
| `milestone` | 🚩 | Important milestone reached |
| `alert` | 🔔 | Urgent situation requiring action |

**Insight Categories**:
- `deal_velocity`: Deal progression speed changes
- `pipeline_health`: Pipeline coverage and quality
- `contact_engagement`: Engagement pattern changes
- `churn_risk`: Customer retention signals
- `revenue`: Revenue trend anomalies
- `activity`: Activity level changes
- `conversion`: Conversion rate shifts
- `performance`: Rep/team performance

**Sample Use Cases**:

| Detection | Insight Generated | Severity | Recommended Action |
|-----------|-------------------|----------|-------------------|
| Deal velocity spike | "Deal cycle time dropped 30% this month - investigate successful patterns" | Info | Share best practices with team |
| Engagement drop | "Contact engagement at Acme Corp dropped 60% in 2 weeks" | High | Immediate outreach recommended |
| Pipeline gap | "Q2 pipeline coverage at 1.8x - below 3x target" | Critical | Increase prospecting activity |
| Unusual win | "3 deals closed same day from new segment - emerging market?" | Opportunity | Analyze and replicate |
| Activity anomaly | "Rep activity down 40% this week" | Medium | Check in with team member |
| Conversion improvement | "Demo-to-proposal conversion up 25% after new deck" | Trend | Roll out new materials team-wide |

**API Endpoints**:
- `GET /ai/insights` - List insights
- `POST /ai/insights/generate` - Trigger insight generation
- `PATCH /ai/insights/{id}` - Update insight status
- `GET /ai/insights/summary` - Get insights summary

---

## Integration Points Summary

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CRM Core Data                                      │
│  Contacts │ Companies │ Deals │ Activities │ Tasks │ Pipelines              │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              ┌──────────┐  ┌──────────┐  ┌──────────┐
              │Predictive│  │   NBA    │  │  Agent   │
              │Analytics │  │  Engine  │  │Framework │
              └────┬─────┘  └────┬─────┘  └────┬─────┘
                   │             │             │
                   └──────────┬──┴─────────────┘
                              ▼
              ┌──────────────────────────────────┐
              │         Ollama LLM               │
              │       (Llama 3.1 8B)             │
              └──────────────────────────────────┘
                              ▲
                   ┌──────────┴──┬─────────────┐
                   │             │             │
              ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐
              │ Chat &   │  │Conversa- │  │ Insights │
              │   RAG    │  │  tion    │  │& Anomaly │
              └──────────┘  └──────────┘  └──────────┘
```

---

## Getting Started with AI Features

1. **Ensure Ollama is running**: `ollama serve`
2. **Pull the model**: `ollama pull llama3.1:8b`
3. **Start the backend**: `cd backend && uvicorn app.main:app`
4. **Start the frontend**: `cd frontend && npm run dev`
5. **Access AI features** through the dashboard panels and chat interface

For detailed setup instructions, see [INSTALL.md](./INSTALL.md).
