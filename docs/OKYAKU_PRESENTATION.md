# Okyaku CRM Platform
## Complete Feature Presentation

---

# Table of Contents

1. Executive Overview
2. Core CRM Features
3. Marketing Automation
4. AI-Powered Intelligence
5. System & Administration
6. Technical Architecture
7. Getting Started

---

# PART 1: EXECUTIVE OVERVIEW

---

## What is Okyaku?

**Okyaku** is an AI-Native CRM Platform designed from the ground up with artificial intelligence at its core.

### Key Differentiators:
- **100% Self-Hosted** - Complete data sovereignty
- **Zero API Costs** - Local AI inference with Ollama
- **Privacy-First** - No data leaves your infrastructure
- **AI-Native Design** - Not bolted-on, built-in AI

---

## Platform Highlights

| Category | Features |
|----------|----------|
| **CRM** | Contacts, Companies, Deals, Activities, Tasks |
| **Marketing** | Email Campaigns, Social Media Suite (13 features) |
| **AI** | Lead Scoring, Deal Forecasting, Churn Prediction, AI Agent |
| **System** | Calendar Integration, Audit Logs, GDPR Compliance |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Tailwind CSS, Vite |
| **Backend** | FastAPI (Python 3.11+), SQLModel |
| **Database** | PostgreSQL 14+ with JSONB |
| **AI/LLM** | Ollama, Llama 3.1, nomic-embed-text |
| **Authentication** | JWT with bcrypt |

---

# PART 2: CORE CRM FEATURES

---

## Contact Management

### Comprehensive Contact Profiles
- **Personal Info**: Name, email, phone, mobile
- **Work Info**: Job title, department, company association
- **Location**: Full address support
- **Custom Fields**: JSONB-based extensibility

### Contact Lifecycle
```
LEAD → PROSPECT → CUSTOMER → (CHURNED)
```

---

## Contact Features

### Search & Filter
- Full-text search across name, email, phone
- Filter by status, company, source
- Configurable sorting and pagination

### Import/Export
- CSV import with field mapping wizard
- Template downloads for easy data preparation
- CSV export with selectable fields
- Date range filtering for exports

---

## Company Management

### Company Profiles
- Company name and domain
- Industry classification
- Size categorization (1-10, 11-50, 51-200, etc.)
- Full address and contact details
- Website and description

### Relationships
- One-to-many relationship with Contacts
- View all contacts per company
- Company-level activity tracking

---

## Deal Pipeline Management

### Kanban Board Interface
- Visual drag-and-drop deal management
- Multiple pipeline support
- Stage-based organization
- Real-time updates

### Deal Tracking
- Deal value with currency support
- Expected vs. actual close dates
- Priority levels (High, Medium, Low)
- Source tracking (Inbound, Outbound, Referral)

---

## Pipeline Stages

### Customizable Stages
- User-defined stage names
- Configurable stage order
- Win probability per stage (0-100%)
- Won/Lost stage classification

### Stage History
- Automatic tracking of all stage transitions
- Timestamp for each movement
- User attribution for changes
- Full audit trail

---

## Deal Forecasting

### Pipeline Analytics
- Total pipeline value
- Weighted value (by probability)
- Deal count per stage
- Conversion metrics

### Forecasting Features
- Monthly forecast charts
- Expected vs. closed comparisons
- Trend analysis

---

## Activity Tracking

### Activity Types
| Type | Use Case |
|------|----------|
| **Call** | Phone conversations |
| **Email** | Email communications |
| **Meeting** | In-person or video meetings |
| **Note** | General observations |
| **Task** | Task-related activities |
| **Other** | Miscellaneous |

---

## Activity Features

### Logging Capabilities
- Subject and description
- Date and duration tracking
- Outcome recording
- Entity associations (Contact, Company, Deal)

### Timeline View
- Chronological activity history
- Filter by activity type
- Quick-log buttons for common types
- Relative date display

---

## Task Management

### Task Properties
- Title and description
- Due date and time
- Priority: Urgent, High, Medium, Low
- Status: Pending, In Progress, Completed, Cancelled

### Task Features
- Assignment to team members
- Reminder scheduling
- Overdue detection and alerts
- "My Tasks" personal view

---

## Task Intelligence

### Smart Features
- Upcoming reminders query (next N hours)
- Overdue task highlighting
- Automatic completion timestamps
- Entity linking (Contact, Company, Deal)

---

# PART 3: MARKETING AUTOMATION

---

## Email Campaign Management

### Campaign Lifecycle
```
DRAFT → SCHEDULED → SENDING → SENT
           ↓
        PAUSED / CANCELLED
```

### Campaign Features
- Template-based creation
- Variable personalization
- Recipient filtering by contact attributes
- Batch sending with configurable size

---

## Email Templates

### Template Management
- HTML and plain text support
- Reusable across campaigns
- Variable placeholders for personalization
- Active/inactive status

### Tracking Capabilities
- Open tracking via transparent pixel
- Click tracking with URL redirect
- Bounce and delivery tracking
- Comprehensive metrics dashboard

---

## Email Analytics

### Key Metrics
- **Delivery Rate**: Successful deliveries
- **Open Rate**: Unique opens
- **Click Rate**: Link engagement
- **Bounce Rate**: Failed deliveries

### Reporting
- Campaign comparison
- Trend analysis over time
- Per-recipient status tracking

---

## Social Media Suite

### 13 Integrated Features
1. Social Calendar
2. Account Management
3. Social Inbox
4. Analytics Dashboard
5. AI Content Generator
6. Content Library
7. Social Listening
8. Hashtag Research
9. Competitor Analysis
10. A/B Testing
11. Automation Rules
12. Reports
13. Multi-Platform Publishing

---

## Social Calendar

### Visual Scheduling
- Month, week, day calendar views
- Drag-and-drop post scheduling
- Multi-account posting
- Platform color coding

### Post Management
- Draft, scheduled, published states
- Media attachments (image, video, gif)
- Timezone support
- Analytics sync

---

## Social Account Management

### Supported Platforms
- **LinkedIn** - Professional networking
- **Twitter/X** - Microblogging
- **Facebook** - Social networking

### OAuth Integration
- Secure token management
- Automatic token refresh
- Connection status tracking
- Easy disconnect/reconnect

---

## Social Inbox

### Unified Messaging
- Direct messages aggregation
- Mention tracking
- Comment monitoring
- Reply management

### Workflow Features
- Read/unread status
- Team assignment
- CRM contact linking
- Archive functionality

---

## Social Listening

### Brand Monitoring
- Keyword tracking
- Multi-source monitoring
- Sentiment analysis
- Alert generation

### Data Sources
- Twitter, LinkedIn, Facebook, Instagram
- News articles
- Blog posts
- Forum discussions

---

## Hashtag Research

### Discovery Features
- Hashtag performance tracking
- Trending hashtag identification
- Platform-specific analytics
- Engagement rate calculations

### Collections
- Group related hashtags
- Quick-use collections
- Performance comparison
- Trend direction tracking

---

## A/B Testing

### Test Types
- Content variations
- Posting time optimization
- Hashtag effectiveness
- Media type comparison
- CTA testing

### Results Analysis
- Statistical significance
- Winner determination
- Performance visualization

---

## Content Library

### Asset Management
- Images, videos, designs, copy
- Category organization
- Platform-specific tagging
- Usage tracking

### Features
- Favorites marking
- Full-text search
- Collection grouping
- Last-used tracking

---

## Engagement Automation

### Rule-Based Workflows
- Trigger conditions
- Automated actions
- Response templates
- Execution logging

### Trigger Types
- New mention
- Direct message received
- Engagement threshold
- Keyword match

---

## Social Analytics

### Performance Metrics
- Impressions and reach
- Engagement rates
- Click-through rates
- Follower growth

### Visualization
- Timeline charts
- Platform comparison
- Top performing posts
- Best posting times heatmap

---

# PART 4: AI-POWERED INTELLIGENCE

---

## AI Architecture

### Self-Hosted AI Stack
- **Ollama**: Local inference server
- **Llama 3.1**: Primary language model
- **nomic-embed-text**: Embedding model

### Zero API Costs
- All processing on your infrastructure
- No data sent to external services
- Complete privacy and control

---

## Lead Scoring

### Intelligent Scoring (0-100)
- Profile completeness analysis
- Engagement pattern recognition
- Company fit assessment
- Timing signals evaluation

### Score Categories
| Score | Category | Action |
|-------|----------|--------|
| 80-100 | HOT | Immediate outreach |
| 60-79 | WARM | Nurture actively |
| 40-59 | COOL | Monitor engagement |
| 0-39 | COLD | Long-term nurture |

---

## Deal Forecasting

### Predictive Analytics
- Close probability calculation
- Predicted deal amount
- Days to close estimation
- Risk level assessment

### Risk Indicators
- **LOW**: On track
- **MEDIUM**: Needs attention
- **HIGH**: Intervention required
- **CRITICAL**: At risk of loss

---

## Churn Risk Detection

### Early Warning System
- Activity frequency analysis
- Engagement trend monitoring
- Support interaction tracking
- Relationship health scoring

### Retention Recommendations
- Personalized action plans
- Priority-based suggestions
- Estimated time to churn

---

## Next-Best-Action Engine

### Recommendation Types
- Contact outreach
- Deal advancement
- Follow-up scheduling
- Upsell opportunities
- Retention actions

### Prioritization
- Impact scoring
- Urgency assessment
- Confidence levels

---

## AI Agent

### Autonomous Task Execution
- Natural language commands
- Multi-step task completion
- CRM tool access

### Human-in-the-Loop
- Approval required for writes
- Action preview before execution
- Rejection with reason tracking
- Complete audit trail

---

## Agent Capabilities

### Read Operations (Auto-Approved)
- Search contacts and deals
- Get entity details
- Pipeline summaries

### Write Operations (Requires Approval)
- Create/update contacts
- Create/update deals
- Log activities
- Create tasks
- Draft emails

---

## Conversation Intelligence

### Meeting Analysis
- Transcript processing
- Automatic summarization
- Action item extraction
- Sentiment analysis

### Extracted Insights
- Key points and decisions
- Questions raised
- Follow-up requirements
- Mentioned entities

---

## Natural Language CRM Queries

### Query Examples
- "How many leads do we have?"
- "Show me deals over $10,000"
- "Find contacts at Acme Corp"
- "What's our pipeline value?"

### Query Classification
- COUNT, LIST, SEARCH
- STATS, RECENT, COMPARISON
- Automatic parameter extraction

---

## AI Content Generation

### Platform-Optimized Content
| Platform | Max Length | Style |
|----------|------------|-------|
| LinkedIn | 3000 chars | Professional |
| Twitter | 280 chars | Punchy, witty |
| Facebook | 63K chars | Engaging |

### Generation Features
- Topic-based creation
- Tone selection
- CTA inclusion
- Hashtag generation

---

## Content Tools

### Variations
- Generate multiple versions
- A/B test content
- Maintain core message

### Adaptation
- Cross-platform rewriting
- Length optimization
- Style adjustment

### Improvement
- Hook enhancement
- CTA strengthening
- Clarity optimization

---

## Knowledge Base (RAG)

### Document Management
- Upload and index documents
- Automatic chunking
- Embedding generation
- Summary creation

### Query Capabilities
- Vector similarity search
- Context-aware answers
- Source citations
- Confidence scoring

---

## Anomaly Detection

### Automatic Monitoring
- Deal velocity changes
- Pipeline health issues
- Engagement anomalies
- Conversion trends
- Activity patterns

### Alert System
- Severity levels
- Suggested actions
- Metric tracking
- Deviation calculation

---

# PART 5: SYSTEM & ADMINISTRATION

---

## Authentication

### Security Features
- JWT-based tokens
- bcrypt password hashing
- 24-hour token expiry
- Session management

### User Management
- Registration and login
- Profile management
- Last login tracking
- Active/inactive status

---

## Calendar Integration

### Supported Providers
- Google Calendar (OAuth)
- Microsoft Outlook (OAuth)

### Features
- Two-way sync
- Event creation and management
- CRM activity linking
- Meeting scheduling links

---

## Scheduling Links

### Public Booking
- Customizable booking pages
- Duration and buffer settings
- Availability configuration
- Time zone support

### Meeting Management
- Guest information capture
- Custom questions
- Confirmation messages
- Cancellation handling

---

## Audit Log System

### Comprehensive Tracking
- 14 action types (create, update, delete, etc.)
- 20+ entity types
- User attribution
- IP address logging

### Audit Features
- Change history (old/new values)
- Entity timeline view
- User activity reports
- CSV/JSON export

---

## GDPR Compliance

### Data Export
- User data packages
- Configurable scope
- Secure download
- Expiration management

### Data Retention
- Configurable retention periods
- Automatic cleanup
- Archive before delete
- Audit-specific retention

---

## Dashboard

### KPI Cards
- Total contacts and companies
- Pipeline value
- Conversion rate
- Activities and tasks
- Overdue items

### Visualizations
- Pipeline funnel chart
- Monthly forecast chart
- Activity leaderboard
- Recent activities feed

---

## Pipeline Configuration

### Custom Pipelines
- Multiple pipeline support
- Custom stage naming
- Stage ordering
- Default pipeline selection

### Stage Configuration
- Win probability (0-100%)
- Won/Lost classification
- Soft delete support

---

# PART 6: TECHNICAL ARCHITECTURE

---

## Database Schema

### Core Tables
- users, contacts, companies
- deals, pipelines, pipeline_stages
- activities, tasks, deal_stage_history

### Marketing Tables
- email_campaigns, email_templates
- social_posts, social_accounts
- content_assets, hashtags

### AI Tables
- lead_scores, deal_forecasts
- churn_risks, recommendations
- knowledge_documents, insights

---

## API Structure

### Base URL: `/api/v1`

### Endpoint Categories
- `/auth/*` - Authentication
- `/contacts/*`, `/companies/*`, `/deals/*` - CRM
- `/email/*`, `/social/*` - Marketing
- `/ai/*` - AI features
- `/calendar/*` - Scheduling
- `/audit/*` - Compliance

---

## Configuration

### Key Settings
```python
# AI Configuration
OLLAMA_BASE_URL = "http://localhost:11434/v1"
OLLAMA_MODEL = "llama3.1"
AI_REQUIRE_APPROVAL_FOR_WRITES = True

# Database
DATABASE_URL = "postgresql://..."
DB_POOL_SIZE = 5
```

---

# PART 7: GETTING STARTED

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Ollama

### Installation
```bash
# Clone repository
git clone https://github.com/gnoobs75/Okyaku.git

# Pull AI models
ollama pull llama3.1:8b
ollama pull nomic-embed-text

# Run setup
setup.bat

# Start development
start-dev.bat
```

---

## Access Points

### URLs
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Default Credentials
- Create account via registration
- First user becomes admin

---

## Support Resources

### Documentation
- INSTALL.md - Full installation guide
- QUICKSTART.md - Quick setup guide
- AI_PROCESS_FLOW.md - AI documentation
- AI_IMPLEMENTATION_PLAN.md - Technical details

### Repository
- GitHub: https://github.com/gnoobs75/Okyaku

---

# Thank You

## Okyaku CRM
### AI-Native. Self-Hosted. Privacy-First.

---

*Presentation generated for Okyaku CRM Platform*
*Version 0.1.0*
