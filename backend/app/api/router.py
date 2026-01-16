from fastapi import APIRouter

from app.api.endpoints import (
    ab_testing,
    activities,
    agent,
    ai_content,
    ai_predictions,
    audit_log,
    auth,
    calendar,
    chat,
    companies,
    competitor_tracking,
    contacts,
    content_library,
    conversation,
    dashboard,
    deals,
    email_campaigns,
    engagement_automation,
    exports,
    files,
    hashtag_research,
    health,
    imports,
    insights,
    knowledge_base,
    pipelines,
    recommendations,
    reporting,
    social_analytics,
    social_inbox,
    social_listening,
    social_media,
    tasks,
)

api_router = APIRouter()

# Health check endpoints (no auth required)
api_router.include_router(health.router, tags=["health"])

# Auth endpoints (no auth required)
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# File management (requires auth)
api_router.include_router(files.router, prefix="/files", tags=["files"])

# CRM endpoints (requires auth)
api_router.include_router(companies.router, prefix="/companies", tags=["companies"])
api_router.include_router(contacts.router, prefix="/contacts", tags=["contacts"])
api_router.include_router(pipelines.router, prefix="/pipelines", tags=["pipelines"])
api_router.include_router(deals.router, prefix="/deals", tags=["deals"])
api_router.include_router(activities.router, prefix="/activities", tags=["activities"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(imports.router, prefix="/imports", tags=["imports"])
api_router.include_router(exports.router, prefix="/exports", tags=["exports"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])

# Email marketing
api_router.include_router(email_campaigns.router, prefix="/email", tags=["email"])

# Social media
api_router.include_router(social_media.router, prefix="/social", tags=["social"])
api_router.include_router(social_inbox.router, prefix="/social/inbox", tags=["social-inbox"])
api_router.include_router(social_analytics.router, prefix="/social/analytics", tags=["social-analytics"])

# AI Content Generation
api_router.include_router(ai_content.router, prefix="/ai/content", tags=["ai-content"])

# AI Predictions (Lead Scoring, Deal Forecasting, Churn Risk)
api_router.include_router(ai_predictions.router, prefix="/ai/predictions", tags=["ai-predictions"])

# AI Recommendations (Next-Best-Actions)
api_router.include_router(recommendations.router, prefix="/ai/recommendations", tags=["ai-recommendations"])

# AI Agent (Autonomous Tasks with Tool Use)
api_router.include_router(agent.router, prefix="/ai/agent", tags=["ai-agent"])

# AI Conversation Intelligence (Meeting Summaries, Call Analysis)
api_router.include_router(conversation.router, prefix="/ai/conversation", tags=["ai-conversation"])

# AI Chat (Natural Language Queries)
api_router.include_router(chat.router, prefix="/ai/chat", tags=["ai-chat"])

# AI Knowledge Base & RAG
api_router.include_router(knowledge_base.router, prefix="/ai/knowledge", tags=["ai-knowledge"])

# AI Insights & Anomaly Detection
api_router.include_router(insights.router, prefix="/ai/insights", tags=["ai-insights"])

# Content Library
api_router.include_router(content_library.router, prefix="/content-library", tags=["content-library"])

# Social Listening
api_router.include_router(social_listening.router, prefix="/social/listening", tags=["social-listening"])

# Hashtag Research
api_router.include_router(hashtag_research.router, prefix="/hashtags", tags=["hashtag-research"])

# Competitor Tracking
api_router.include_router(competitor_tracking.router, prefix="/competitors", tags=["competitor-tracking"])

# A/B Testing
api_router.include_router(ab_testing.router, prefix="/ab-testing", tags=["ab-testing"])

# Engagement Automation
api_router.include_router(engagement_automation.router, prefix="/automation", tags=["engagement-automation"])

# Advanced Reporting
api_router.include_router(reporting.router, prefix="/reporting", tags=["reporting"])

# Calendar Integration
api_router.include_router(calendar.router, prefix="/calendar", tags=["calendar"])

# Audit Logs
api_router.include_router(audit_log.router, prefix="/audit", tags=["audit"])
