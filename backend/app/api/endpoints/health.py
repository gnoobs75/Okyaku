from fastapi import APIRouter, status
from sqlalchemy import text

from app.api.deps import SessionDep
from app.core.config import settings

router = APIRouter()


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check() -> dict:
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@router.get("/health/ready", status_code=status.HTTP_200_OK)
async def readiness_check(session: SessionDep) -> dict:
    """Readiness check that verifies database connectivity."""
    try:
        session.exec(text("SELECT 1"))
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return {
        "status": "ready" if db_status == "connected" else "not_ready",
        "database": db_status,
    }


@router.get("/health/live", status_code=status.HTTP_200_OK)
async def liveness_check() -> dict:
    """Liveness check for container orchestration."""
    return {"status": "alive"}
