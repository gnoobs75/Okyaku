# Okyaku CRM Platform
# Complete User Manual

**Version 0.1.0**

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Getting Started](#2-getting-started)
3. [Dashboard Overview](#3-dashboard-overview)
4. [Contact Management](#4-contact-management)
5. [Company Management](#5-company-management)
6. [Deal Pipeline](#6-deal-pipeline)
7. [Activity Tracking](#7-activity-tracking)
8. [Task Management](#8-task-management)
9. [Email Marketing](#9-email-marketing)
10. [Social Media Management](#10-social-media-management)
11. [AI Features](#11-ai-features)
12. [Calendar & Scheduling](#12-calendar--scheduling)
13. [Reports & Analytics](#13-reports--analytics)
14. [System Administration](#14-system-administration)
15. [User Roles & Personas](#15-user-roles--personas)
16. [Troubleshooting](#16-troubleshooting)
17. [Glossary](#17-glossary)

---

# 1. Introduction

## 1.1 What is Okyaku?

Okyaku is an AI-Native Customer Relationship Management (CRM) platform designed for businesses that prioritize data privacy while wanting cutting-edge AI capabilities. Unlike traditional CRMs with AI features added as an afterthought, Okyaku was built from the ground up with artificial intelligence at its core.

### Key Benefits

- **Complete Data Sovereignty**: All data stays on your infrastructure
- **Zero AI API Costs**: Local AI inference using Ollama
- **Privacy-First Design**: No data sent to third-party services
- **Comprehensive CRM**: Full-featured contact, deal, and activity management
- **Marketing Automation**: Email campaigns and social media management
- **AI Intelligence**: Lead scoring, deal forecasting, and autonomous agents

## 1.2 System Requirements

### Server Requirements
- Python 3.11 or higher
- Node.js 18 or higher
- PostgreSQL 14 or higher
- Ollama (for AI features)
- 8GB RAM minimum (16GB recommended for AI)
- 20GB disk space minimum

### Client Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Screen resolution 1280x720 minimum

## 1.3 Accessing Okyaku

After installation, access Okyaku at:
- **Application**: http://localhost:5173
- **API Documentation**: http://localhost:8000/docs

---

# 2. Getting Started

## 2.1 Creating Your Account

1. Navigate to the login page
2. Click **"Create an account"**
3. Fill in the registration form:
   - **Email**: Your email address (must be unique)
   - **Full Name**: Your display name (optional)
   - **Username**: Your login username (must be unique)
   - **Password**: Your secure password
4. Click **"Create Account"**
5. You will be automatically logged in

## 2.2 Logging In

1. Navigate to the login page
2. Enter your **Username**
3. Enter your **Password**
4. Click **"Sign In"**

## 2.3 Navigation Overview

### Main Sidebar Sections

**CRM Section**
- Dashboard - Main overview and metrics
- Contacts - Contact management
- Companies - Company management
- Deals - Pipeline and deal tracking
- Activities - Activity logging
- Tasks - Task management

**Marketing Section**
- Email Campaigns - Email marketing
- Social Calendar - Post scheduling
- Social Accounts - Platform connections
- Social Inbox - Unified messaging
- Analytics - Performance metrics
- AI Content - Content generation
- Content Library - Asset management
- Social Listening - Brand monitoring
- Hashtag Research - Hashtag tools
- Competitors - Competitor tracking
- A/B Testing - Content testing
- Automation - Workflow rules
- Reports - Marketing reports

**System Section**
- Calendar - Calendar integration
- Audit Log - Activity audit
- Settings - User settings

## 2.4 User Profile

Your user profile is displayed at the bottom of the sidebar showing:
- Profile avatar (initial of username)
- Username
- Email address
- Sign Out button (appears on hover)

---

# 3. Dashboard Overview

## 3.1 Accessing the Dashboard

The Dashboard is your home screen and provides a comprehensive overview of your CRM data. Access it by clicking **"Dashboard"** in the sidebar or by navigating to the root URL.

## 3.2 KPI Cards

### Primary Metrics Row

| Metric | Description |
|--------|-------------|
| **Total Contacts** | Count of all contacts in the system |
| **Total Companies** | Count of all companies |
| **Pipeline Value** | Total value of all open deals |
| **Conversion Rate** | Percentage of contacts converted to customers |

### Secondary Metrics Row

| Metric | Description |
|--------|-------------|
| **Activities** | Number of activities in selected period |
| **Open Tasks** | Tasks in pending or in-progress status |
| **Overdue Tasks** | Tasks past their due date (highlighted red) |
| **Closed Deals** | Value of deals closed in period |

## 3.3 Date Range Selection

1. Click the date picker at the top right
2. Select your **From** date
3. Select your **To** date
4. All metrics will update automatically

Default range: Last 30 days

## 3.4 Pipeline Funnel Chart

The funnel chart visualizes your deals across pipeline stages:
- Each bar represents a pipeline stage
- Bar width indicates deal count
- Hover to see total value per stage
- Click a stage to drill down to those deals

## 3.5 Deal Forecast Chart

The forecast chart shows monthly deal projections:
- Blue bars: Expected deal values (based on close dates)
- Red bars: Actually closed deal values
- X-axis: Months (default 6 months)
- Y-axis: Deal value in currency

## 3.6 Activity Leaderboard

Shows top users ranked by activity count:
- User name and activity count
- Filter by date range
- Click to view user's activities

## 3.7 Recent Activities

Lists the latest activities across the system:
- Activity type and subject
- Associated contact/company/deal
- Relative timestamp

## 3.8 Upcoming Tasks

Shows tasks not yet completed:
- Task title and due date
- Priority indicator
- Assignee information
- Click to view task details

---

# 4. Contact Management

## 4.1 Viewing Contacts

### Contacts List Page

Navigate to **Contacts** in the sidebar to view all contacts.

**List Features:**
- Paginated display (20 contacts per page)
- Search bar for finding contacts
- Status filter dropdown
- Sort controls

**Contact Card Information:**
- Full name
- Email address
- Phone number
- Job title
- Company association
- Status badge (Lead, Prospect, Customer, Churned)

## 4.2 Searching Contacts

1. Enter search term in the search bar
2. Press Enter or click the search button
3. Results filter by name, email, and phone

## 4.3 Filtering by Status

1. Click the status dropdown
2. Select a status:
   - All Statuses
   - Lead
   - Prospect
   - Customer
   - Churned
   - Other
3. List updates automatically

## 4.4 Creating a Contact

1. Click the **"Add Contact"** button
2. Fill in the contact form:

**Basic Information:**
- First Name (required)
- Last Name (required)
- Email (required, must be unique)
- Phone
- Mobile

**Work Information:**
- Company (select from dropdown)
- Job Title
- Department
- Status (Lead, Prospect, Customer, Churned, Other)
- Source (how contact was acquired)

**Notes:**
- Free-form text area for additional information

3. Click **"Save"** to create the contact
4. Click **"Cancel"** to discard changes

## 4.5 Editing a Contact

1. Click on a contact in the list
2. Make changes in the edit form
3. Click **"Save"** to update
4. Click **"Cancel"** to discard changes

## 4.6 Deleting a Contact

1. Navigate to the contact's edit page
2. Click the **"Delete"** button
3. Confirm the deletion
4. Contact is permanently removed

## 4.7 Exporting Contacts

1. Click the **"Export"** button on the contacts list
2. A CSV file will download with all contacts
3. File includes: name, email, phone, status, company, etc.

## 4.8 Importing Contacts

1. Click the **"Import"** button
2. Download the CSV template
3. Fill in your contact data
4. Upload the completed CSV
5. Map columns to contact fields
6. Review the preview
7. Click **"Import"** to complete

---

# 5. Company Management

## 5.1 Viewing Companies

Navigate to **Companies** in the sidebar.

**Company Card Information:**
- Company name
- Domain/website
- Industry
- Size category
- Description preview

## 5.2 Creating a Company

1. Click **"Add Company"**
2. Fill in company details:
   - Name (required)
   - Domain
   - Industry
   - Size (1-10, 11-50, 51-200, etc.)
   - Description
   - Website
   - Phone
   - Address fields
3. Click **"Save"**

## 5.3 Viewing Company Contacts

1. Open a company's detail page
2. Scroll to the **"Contacts"** section
3. All contacts associated with this company are listed

## 5.4 Company-Contact Relationship

- A contact can belong to one company
- A company can have many contacts
- Assign contacts to companies via the contact form

---

# 6. Deal Pipeline

## 6.1 Understanding the Pipeline

The deal pipeline visualizes your sales process as a series of stages. Deals move through stages from initial contact to closed-won or closed-lost.

### Default Pipeline Stages
1. **Prospecting** - Initial identification
2. **Qualification** - Determining fit
3. **Proposal** - Presenting solution
4. **Negotiation** - Terms discussion
5. **Closed-Won** - Deal won
6. **Closed-Lost** - Deal lost

## 6.2 Pipeline Board View

Navigate to **Deals** to see the Kanban-style pipeline board.

**Board Layout:**
- Each column represents a pipeline stage
- Column header shows stage name, deal count, and total value
- Deal cards are arranged vertically within columns
- Win probability displayed per stage

## 6.3 Deal Cards

Each deal card displays:
- Deal name
- Deal value with currency
- Expected close date
- Associated company
- Associated contact

## 6.4 Creating a Deal

1. Click **"Add Deal"** button
2. Fill in deal information:
   - Name (required)
   - Value (required)
   - Currency
   - Pipeline (select)
   - Stage (select)
   - Expected Close Date
   - Contact (select)
   - Company (select)
   - Priority (High, Medium, Low)
   - Source
   - Description
3. Click **"Save"**

## 6.5 Moving Deals Between Stages

### Drag and Drop Method
1. Click and hold a deal card
2. Drag to the target stage column
3. Release to drop
4. Deal stage updates automatically

### Edit Method
1. Click on a deal card
2. Change the Stage dropdown
3. Click **"Save"**

## 6.6 Deal Stage History

Each deal maintains a complete history of stage transitions:
- From stage
- To stage
- Transition timestamp
- User who made the change

Access via the deal detail page's **"History"** tab.

## 6.7 Pipeline Selection

If you have multiple pipelines:
1. Click the pipeline dropdown at the top of the board
2. Select your desired pipeline
3. Board updates to show that pipeline's stages and deals

## 6.8 Deal Forecasting

The system calculates:
- **Total Pipeline Value**: Sum of all open deals
- **Weighted Value**: Value adjusted by stage win probability
- **Forecast by Month**: Expected closes by expected close date

---

# 7. Activity Tracking

## 7.1 Activity Types

| Type | Icon | Use Case |
|------|------|----------|
| **Call** | Phone | Phone conversations |
| **Email** | Mail | Email communications |
| **Meeting** | Calendar | In-person or video meetings |
| **Note** | File | General observations |
| **Task** | Checkbox | Task-related updates |
| **Other** | Circle | Miscellaneous |

## 7.2 Viewing Activities

Navigate to **Activities** in the sidebar.

**Activity List Features:**
- Chronological display
- Type-based filtering
- Relative timestamps (Today at, Yesterday at, X days ago)
- Entity associations displayed

## 7.3 Logging an Activity

### Quick Log Buttons
- **Log Call**: Opens form pre-set to Call type
- **Log Email**: Opens form pre-set to Email type
- **Log Meeting**: Opens form pre-set to Meeting type

### Full Activity Form
1. Click **"Add Activity"** or use quick log buttons
2. Fill in activity details:
   - Type (required)
   - Subject (required)
   - Description
   - Activity Date and Time
   - Duration (for calls/meetings)
   - Outcome
   - Contact (select)
   - Company (select)
   - Deal (select)
3. Click **"Save"**

## 7.4 Activity Timeline

View all activities for a specific entity:
1. Navigate to a Contact, Company, or Deal
2. Open the **"Activities"** tab
3. See all related activities in reverse chronological order

---

# 8. Task Management

## 8.1 Understanding Tasks

Tasks are actionable items with:
- Due dates
- Priority levels
- Assignment to users
- Status tracking

## 8.2 Task Status Workflow

```
PENDING → IN_PROGRESS → COMPLETED
                     ↓
                 CANCELLED
```

## 8.3 Task Priorities

| Priority | Color | Description |
|----------|-------|-------------|
| **Urgent** | Red | Immediate attention required |
| **High** | Orange | Important, do soon |
| **Medium** | Yellow | Normal priority |
| **Low** | Green | Do when time permits |

## 8.4 Viewing Tasks

Navigate to **Tasks** in the sidebar.

**Task List Features:**
- Status filter (All, Pending, In Progress, Completed, Cancelled)
- Priority filter (All, Urgent, High, Medium, Low)
- Overdue highlighting (red border)
- Due date display

## 8.5 Creating a Task

1. Click **"Add Task"**
2. Fill in task details:
   - Title (required)
   - Description
   - Due Date
   - Due Time
   - Priority
   - Status
   - Assignee
   - Contact (optional)
   - Company (optional)
   - Deal (optional)
   - Reminder Date/Time
3. Click **"Save"**

## 8.6 Completing a Task

### Quick Complete
- Click the checkmark icon on a task card
- Task immediately moves to Completed status

### Via Edit
1. Open the task
2. Change Status to "Completed"
3. Click **"Save"**

## 8.7 My Tasks View

Access tasks assigned specifically to you:
1. The **"My Tasks"** filter shows only your assigned tasks
2. Excludes completed and cancelled tasks by default

## 8.8 Overdue Tasks

Tasks are marked overdue when:
- Due date has passed
- Status is still Pending or In Progress

Overdue tasks display:
- Red border on task card
- Alert icon indicator
- Highlighted in dashboard KPIs

---

# 9. Email Marketing

## 9.1 Campaign Overview

Email campaigns allow you to send targeted messages to groups of contacts.

### Campaign States
- **Draft**: Being created, not yet scheduled
- **Scheduled**: Set to send at future time
- **Sending**: Currently sending to recipients
- **Sent**: Delivery complete
- **Paused**: Temporarily stopped
- **Cancelled**: Permanently stopped

## 9.2 Email Templates

### Creating a Template
1. Navigate to **Email Templates**
2. Click **"Add Template"**
3. Enter template details:
   - Name
   - Subject line
   - HTML content
   - Plain text version
4. Use variables like `{{first_name}}` for personalization
5. Click **"Save"**

### Template Variables
- `{{first_name}}` - Contact's first name
- `{{last_name}}` - Contact's last name
- `{{email}}` - Contact's email
- `{{company_name}}` - Associated company name

## 9.3 Creating a Campaign

1. Navigate to **Email Campaigns**
2. Click **"New Campaign"**
3. Configure campaign:
   - Name
   - Subject line
   - Template selection
   - Sender name and email
4. Add recipients:
   - Manual selection
   - Filter by status (e.g., all Leads)
   - Filter by tags
5. Review and save as draft

## 9.4 Scheduling a Campaign

1. Open a draft campaign
2. Click **"Schedule"**
3. Select date and time
4. Confirm scheduling
5. Campaign status changes to "Scheduled"

## 9.5 Sending Immediately

1. Open a draft campaign
2. Click **"Send Now"**
3. Confirm sending
4. Campaign begins sending

## 9.6 Campaign Metrics

After sending, view metrics:
- **Sent**: Total emails dispatched
- **Delivered**: Successfully received
- **Opens**: Unique opens (tracked via pixel)
- **Clicks**: Link clicks (tracked via redirect)
- **Bounces**: Failed deliveries

---

# 10. Social Media Management

## 10.1 Connecting Social Accounts

### Supported Platforms
- LinkedIn
- Twitter/X
- Facebook

### Connection Process
1. Navigate to **Social Accounts**
2. Click **"Connect Account"**
3. Select platform
4. Authorize via OAuth
5. Account appears in list

### Account Status Indicators
- **Green (Connected)**: Active and working
- **Yellow (Token Expired)**: Needs refresh
- **Gray (Disconnected)**: Not connected
- **Red (Error)**: Connection issue

## 10.2 Social Calendar

### Viewing the Calendar
Navigate to **Social Calendar** to see scheduled posts.

### Calendar Views
- **Month View**: Overview of entire month
- **Week View**: Detailed weekly view
- **Day View**: Hourly breakdown

### Post Indicators
Posts appear as color-coded events:
- **Blue**: LinkedIn
- **Sky Blue**: Twitter
- **Dark Blue**: Facebook

## 10.3 Creating a Social Post

1. Click **"New Post"** or click a calendar date
2. Select target account(s)
3. Write your content
4. Add media (optional):
   - Images
   - Videos
   - GIFs
   - Links
5. Choose action:
   - **Save as Draft**: Save without scheduling
   - **Schedule**: Set specific date/time
   - **Publish Now**: Post immediately

## 10.4 Social Inbox

### Unified Message View
Navigate to **Social Inbox** to see all messages.

**Message Types:**
- Direct Messages
- Mentions
- Comments
- Replies

### Managing Messages
- Mark as read/unread
- Archive messages
- Assign to team member
- Link to CRM contact
- Reply directly

## 10.5 AI Content Generation

Navigate to **AI Content** for AI-assisted content creation.

### Generating Content
1. Enter your topic/idea
2. Select target platform
3. Choose tone:
   - Professional
   - Casual
   - Humorous
   - Inspirational
   - Educational
   - Promotional
4. Select length (Short, Medium, Long)
5. Toggle options:
   - Include hashtags
   - Include emojis
   - Include call-to-action
6. Click **"Generate"**

### Additional AI Tools
- **Variations**: Create multiple versions
- **Adapt**: Convert for different platform
- **Improve**: Enhance existing content
- **Hashtags**: Generate relevant hashtags

## 10.6 Content Library

### Uploading Assets
1. Navigate to **Content Library**
2. Click **"Upload"**
3. Select files (images, videos, designs)
4. Add metadata:
   - Name
   - Category
   - Tags
   - Platform
5. Click **"Save"**

### Using Library Assets
- Browse by category or platform
- Search by name or tag
- Mark favorites for quick access
- Track usage across posts

## 10.7 Social Listening

### Setting Up Keyword Tracking
1. Navigate to **Social Listening**
2. Click **"Add Keyword"**
3. Enter keyword or phrase
4. Select platforms to monitor
5. Click **"Save"**

### Reviewing Mentions
- View mentions timeline
- Filter by sentiment (Positive, Neutral, Negative)
- Filter by source
- Flag important mentions
- Acknowledge alerts

## 10.8 Hashtag Research

### Tracking Hashtags
1. Navigate to **Hashtag Research**
2. Click **"Track Hashtag"**
3. Enter hashtag (with or without #)
4. View performance metrics

### Discovering Hashtags
- View trending hashtags
- Get AI suggestions based on your top performers
- Track engagement rates
- Monitor trend direction (Rising, Stable, Declining)

## 10.9 A/B Testing

### Creating a Test
1. Navigate to **A/B Testing**
2. Click **"New Test"**
3. Configure test:
   - Test name
   - Test type (Content, Timing, Hashtags, Media, CTA)
   - Platform
   - Winner criteria
4. Create variants (A, B, C...)
5. Start test

### Analyzing Results
- View performance per variant
- See statistical significance
- Identify winner
- Apply learnings to future content

## 10.10 Automation

### Creating Automation Rules
1. Navigate to **Automation**
2. Click **"New Rule"**
3. Define trigger:
   - New mention
   - Direct message received
   - Keyword match
   - Engagement threshold
4. Set conditions
5. Define actions:
   - Auto-reply
   - Assign to user
   - Create task
   - Tag contact
6. Activate rule

---

# 11. AI Features

## 11.1 AI Overview

Okyaku's AI features run entirely on your local infrastructure using Ollama with Llama 3.1 model. This ensures:
- **Privacy**: No data sent to external services
- **Cost**: Zero API fees
- **Control**: Full customization capability

## 11.2 Lead Scoring

### How It Works
The AI analyzes multiple factors to score leads 0-100:
- Profile completeness
- Engagement patterns
- Company fit
- Activity recency
- Timing signals

### Score Categories
| Range | Category | Recommended Action |
|-------|----------|-------------------|
| 80-100 | HOT | Immediate sales outreach |
| 60-79 | WARM | Active nurturing |
| 40-59 | COOL | Monitor and engage |
| 0-39 | COLD | Long-term nurture |

### Viewing Lead Scores
1. Open a contact's detail page
2. Find the **Lead Score Card**
3. View score, factors, and recommendations

### Refreshing Scores
- Scores auto-expire after 7 days
- Click **"Refresh Score"** for new analysis

## 11.3 Deal Forecasting

### Forecast Metrics
- **Close Probability**: Likelihood of winning (0-100%)
- **Predicted Amount**: Expected final deal value
- **Days to Close**: Estimated time to close
- **Risk Level**: LOW, MEDIUM, HIGH, CRITICAL

### Risk Factors
The AI identifies risks such as:
- Stalled progression
- Low engagement
- Extended timeline
- Competitor involvement

### Positive Signals
The AI identifies favorable indicators:
- Strong engagement
- Champion identified
- Fast progression
- High activity

## 11.4 Churn Risk Detection

### Applicability
Churn risk analysis is available for:
- Contacts with status "Customer"
- Contacts with status "Churned"

### Risk Factors Analyzed
- Activity frequency decline
- Engagement trend (30/60/90 days)
- Support interaction patterns
- Relationship health indicators

### Risk Levels
| Score | Level | Urgency |
|-------|-------|---------|
| 80-100 | CRITICAL | Immediate intervention |
| 60-79 | HIGH | Urgent attention |
| 40-59 | MEDIUM | Proactive outreach |
| 0-39 | LOW | Continue monitoring |

## 11.5 Next-Best-Actions

### Accessing Recommendations
1. Navigate to any contact or deal
2. Find the **Recommendations** panel
3. View prioritized actions

### Recommendation Types
- Contact outreach
- Deal advancement
- Follow-up scheduling
- Upsell opportunities
- Retention actions

### Taking Action
1. Review recommendation details
2. Click **"Accept"** to mark as planned
3. Complete the action
4. Mark as **"Completed"**
5. Or click **"Dismiss"** if not applicable

## 11.6 AI Agent

### What is the AI Agent?
The AI Agent can autonomously execute multi-step tasks using natural language commands.

### Human-in-the-Loop
All write operations require your approval before execution:
1. You give a command
2. Agent proposes actions
3. You review and approve/reject
4. Agent executes approved actions

### Available Commands
**Read Operations (Auto-approved):**
- "Search for contacts at Acme"
- "Show me deals over $50,000"
- "What's our pipeline summary?"

**Write Operations (Require approval):**
- "Create a contact for John Smith"
- "Log a call with Jane Doe"
- "Create a task to follow up"

### Using the Agent
1. Navigate to the AI Agent interface
2. Type your request in natural language
3. Review proposed actions
4. Approve or reject each action
5. View results

## 11.7 Natural Language Queries

### Chat Interface
Navigate to the AI Chat interface to query your CRM data naturally.

### Example Queries
- "How many leads do we have?"
- "Show me deals closing this month"
- "Find contacts at tech companies"
- "What's our total pipeline value?"
- "List recent activities"

### Query Results
Results display:
- Natural language response
- Structured data (if applicable)
- Links to referenced entities

## 11.8 Conversation Intelligence

### Analyzing Meetings
1. Navigate to Conversation Intelligence
2. Click **"Analyze Conversation"**
3. Enter or paste transcript
4. Select conversation type (Call, Meeting, Email, Chat)
5. Click **"Analyze"**

### Analysis Output
- **Summary**: 2-4 sentence overview
- **Key Points**: Main discussion items
- **Action Items**: Tasks with assignees and dates
- **Decisions Made**: Confirmed decisions
- **Sentiment**: Overall tone analysis
- **Mentioned Entities**: People, companies, products

## 11.9 Knowledge Base (RAG)

### Uploading Documents
1. Navigate to Knowledge Base
2. Click **"Add Document"**
3. Enter document details:
   - Title
   - Type (Process, Policy, Product, Case Study, Other)
   - Tags
4. Paste or upload content
5. Click **"Save"**

### Querying the Knowledge Base
1. Enter your question in the query box
2. Click **"Ask"**
3. View AI-generated answer with source citations

## 11.10 Anomaly Detection

### Automatic Monitoring
The system continuously monitors for:
- Deal velocity changes
- Pipeline health issues
- Engagement anomalies
- Conversion trend shifts
- Activity pattern changes

### Viewing Insights
1. Navigate to the Insights panel
2. View alerts by severity
3. Review suggested actions
4. Mark as acknowledged or acted upon

---

# 12. Calendar & Scheduling

## 12.1 Connecting Calendars

### Supported Providers
- Google Calendar
- Microsoft Outlook

### Connection Process
1. Navigate to **Calendar** settings
2. Click **"Connect Calendar"**
3. Select provider
4. Authorize via OAuth
5. Configure sync settings:
   - Sync direction (Both, Pull only, Push only)
   - Default calendar

## 12.2 Calendar Events

### Viewing Events
- Synced events appear in the calendar view
- CRM-created events are also displayed
- Filter by connection/calendar

### Creating Events
1. Click a date/time slot
2. Enter event details:
   - Title
   - Description
   - Location
   - Start/End time
   - All-day toggle
3. Link to CRM entities:
   - Contact
   - Deal
4. Add meeting link
5. Click **"Save"**

### Syncing with External Calendar
- Events sync automatically based on settings
- Manual sync available via refresh button
- Conflicts handled based on sync direction

## 12.3 Scheduling Links

### Creating a Booking Link
1. Navigate to **Scheduling Links**
2. Click **"New Link"**
3. Configure:
   - Link name (e.g., "30 Minute Discovery Call")
   - URL slug
   - Duration
   - Buffer time before/after
   - Availability hours
   - Location type (Video, Phone, In-person)
4. Add custom questions
5. Set confirmation message
6. Activate link

### Sharing Your Link
Copy the public URL and share:
- In email signatures
- On your website
- In social profiles

### Managing Bookings
1. Navigate to **Scheduled Meetings**
2. View upcoming bookings
3. See guest details and responses
4. Cancel if needed

---

# 13. Reports & Analytics

## 13.1 Dashboard Metrics

The dashboard provides real-time KPIs:
- Contact and company counts
- Pipeline value
- Conversion rates
- Activity metrics
- Task status

## 13.2 Social Analytics

Navigate to **Social Analytics** for social media performance.

### Available Reports
- **Overview**: Impressions, reach, engagement, clicks
- **By Platform**: Platform-specific breakdown
- **Timeline**: Trends over time
- **Top Posts**: Best performing content
- **Best Times**: Optimal posting times

## 13.3 Email Campaign Reports

Each campaign shows:
- Delivery statistics
- Open and click rates
- Bounce analysis
- Recipient-level tracking

## 13.4 Deal Reports

### Pipeline Funnel
- Deals by stage
- Value by stage
- Conversion between stages

### Forecast Report
- Monthly projections
- Expected vs. actual
- Win rate analysis

## 13.5 Exporting Data

### CSV Export
Most list views support CSV export:
1. Apply desired filters
2. Click **"Export"**
3. Download CSV file

### Audit Log Export
1. Navigate to **Audit Log**
2. Set filters
3. Click **"Export"**
4. Choose format (CSV or JSON)

---

# 14. System Administration

## 14.1 User Settings

Navigate to **Settings** to manage your account:
- View account information
- (Future: Change password, preferences)

## 14.2 Pipeline Configuration

### Creating a Pipeline
1. Access pipeline settings
2. Click **"New Pipeline"**
3. Enter name and description
4. Set as default (optional)
5. Add stages

### Configuring Stages
For each stage, set:
- Stage name
- Display order
- Win probability (0-100%)
- Won/Lost classification

## 14.3 Audit Log

### Accessing the Audit Log
Navigate to **Audit Log** in the System section.

### Filtering Logs
- By user
- By entity type
- By action
- By date range

### Log Information
Each entry shows:
- Timestamp
- User who made change
- Entity affected
- Action type
- Old and new values (for updates)

## 14.4 Data Retention

### Retention Policies
Administrators can configure:
- How long to retain data by entity type
- When to archive vs. delete
- Audit log retention period

### GDPR Compliance
- Request user data export
- Track export requests
- Secure download with expiration

---

# 15. User Roles & Personas

## 15.1 Sales Representative

**Primary Activities:**
- Managing personal contacts
- Working deal pipeline
- Logging activities
- Completing tasks

**Key Features Used:**
- Contact management
- Deal Kanban board
- Activity logging
- Task list
- Lead scores
- Next-best-actions

**Daily Workflow:**
1. Check dashboard for priorities
2. Review overdue tasks
3. Check lead scores for hot leads
4. Work deals through pipeline
5. Log activities after each interaction
6. Update deal stages

## 15.2 Sales Manager

**Primary Activities:**
- Pipeline oversight
- Team performance tracking
- Forecasting
- Coaching

**Key Features Used:**
- Dashboard KPIs
- Pipeline funnel
- Deal forecasts
- Activity leaderboard
- Audit logs

**Daily Workflow:**
1. Review pipeline health
2. Check team activity levels
3. Identify stalled deals
4. Review forecast accuracy
5. Coach on high-value opportunities

## 15.3 Marketing Manager

**Primary Activities:**
- Campaign management
- Content creation
- Social media oversight
- Performance analysis

**Key Features Used:**
- Email campaigns
- Social media suite
- AI content generation
- Analytics dashboards
- A/B testing

**Daily Workflow:**
1. Review social inbox
2. Check campaign performance
3. Schedule content
4. Analyze engagement metrics
5. Adjust strategy based on data

## 15.4 Customer Success Manager

**Primary Activities:**
- Customer health monitoring
- Churn prevention
- Relationship building
- Upsell identification

**Key Features Used:**
- Churn risk detection
- Activity timeline
- Task management
- Conversation intelligence
- Contact recommendations

**Daily Workflow:**
1. Review churn risk alerts
2. Check customer activity patterns
3. Plan proactive outreach
4. Log customer interactions
5. Identify upsell opportunities

## 15.5 Executive/Leadership

**Primary Activities:**
- Strategic oversight
- Performance monitoring
- Forecasting review

**Key Features Used:**
- Dashboard overview
- Pipeline forecasts
- Conversion metrics
- Trend analysis

**Weekly Review:**
1. Review overall pipeline health
2. Check forecast accuracy
3. Monitor conversion trends
4. Identify systemic issues
5. Track team performance

---

# 16. Troubleshooting

## 16.1 Login Issues

**Problem: Cannot log in**
- Verify username is correct (case-sensitive)
- Check password
- Clear browser cache
- Try incognito/private mode

**Problem: Session expired**
- Sessions last 24 hours
- Re-login required after expiry
- Check for browser cookie settings

## 16.2 AI Features Not Working

**Problem: AI features unavailable**
1. Verify Ollama is running: `ollama list`
2. Check model is installed: `ollama pull llama3.1:8b`
3. Verify backend can reach Ollama
4. Check logs for errors

**Problem: Slow AI responses**
- First request after startup is slower (model loading)
- Consider enabling model warmup in config
- Check system resources (RAM, GPU)

## 16.3 Calendar Sync Issues

**Problem: Events not syncing**
1. Check connection status
2. Refresh OAuth token
3. Verify sync direction settings
4. Check for error messages

**Problem: Duplicate events**
- Review sync direction
- Check for manual and synced entries
- Clear and re-sync if needed

## 16.4 Email Campaign Issues

**Problem: Emails not sending**
- Verify SMTP settings
- Check sender email configuration
- Review bounce/error logs
- Verify recipient email validity

## 16.5 Social Media Issues

**Problem: Cannot connect account**
- Verify OAuth credentials in config
- Check platform API status
- Review permission scopes
- Try disconnecting and reconnecting

**Problem: Posts failing**
- Check account connection status
- Verify content meets platform requirements
- Review error messages
- Check for rate limiting

## 16.6 Performance Issues

**Problem: Slow page loads**
- Check database connection
- Review browser network tab
- Clear browser cache
- Check server resources

**Problem: Timeout errors**
- Increase timeout settings
- Check database query performance
- Review slow request logs

---

# 17. Glossary

**Activity**: A logged interaction with a contact (call, email, meeting, note, task)

**Churn**: When a customer stops using your product/service

**Churn Risk**: AI-calculated probability that a customer will churn

**CRM**: Customer Relationship Management - system for managing customer data and interactions

**Deal**: A potential or in-progress sales opportunity

**Forecast**: Predicted future sales based on current pipeline

**Funnel**: Visual representation of deals moving through pipeline stages

**Human-in-the-Loop**: AI system that requires human approval before taking action

**JWT**: JSON Web Token - used for authentication

**Kanban**: Visual board methodology for managing workflow

**Lead**: A potential customer who has shown interest

**Lead Score**: AI-calculated score (0-100) indicating sales readiness

**LLM**: Large Language Model - AI model for natural language processing

**NBA**: Next-Best-Action - AI-recommended action to take

**OAuth**: Open Authorization - protocol for secure third-party access

**Ollama**: Local AI inference server

**Pipeline**: Series of stages deals progress through

**Prospect**: A qualified lead being actively pursued

**RAG**: Retrieval Augmented Generation - AI technique using document context

**Sentiment**: Emotional tone (positive, neutral, negative)

**Stage**: A step in the sales pipeline

**Win Probability**: Likelihood of closing a deal at each stage

---

# Document Information

**Document**: Okyaku CRM User Manual
**Version**: 0.1.0
**Last Updated**: January 2026

**For Support**:
- GitHub Issues: https://github.com/gnoobs75/Okyaku/issues
- Documentation: See INSTALL.md, QUICKSTART.md in repository

---

*This manual is for Okyaku CRM Platform. All features described are subject to your specific installation and configuration.*
