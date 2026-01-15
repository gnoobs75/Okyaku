from fastapi import APIRouter

from app.api.endpoints import (
    activities,
    auth,
    companies,
    contacts,
    dashboard,
    deals,
    email_campaigns,
    exports,
    files,
    health,
    imports,
    pipelines,
    social_analytics,
    social_inbox,
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
