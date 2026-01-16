from fastapi import APIRouter, status
from sqlalchemy import text
import httpx
from datetime import datetime

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


@router.get("/health/full", status_code=status.HTTP_200_OK)
async def full_health_check(session: SessionDep) -> dict:
    """
    Comprehensive health check for all services.
    Checks: Backend, Database, Ollama, and AI Models.
    """
    checks = {
        "timestamp": datetime.utcnow().isoformat(),
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
    all_healthy = True

    # Backend check (always healthy if we get here)
    checks["backend"] = {
        "status": "healthy",
        "url": "http://localhost:8000"
    }

    # Database check
    try:
        session.exec(text("SELECT 1"))
        checks["database"] = {
            "status": "healthy",
            "type": "PostgreSQL"
        }
    except Exception as e:
        checks["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        all_healthy = False

    # Ollama check
    ollama_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://localhost:11434/v1').replace('/v1', '')
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{ollama_url}/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = [m.get("name", "unknown") for m in data.get("models", [])]

                # Check for required models
                has_llm = any("llama" in m.lower() for m in models)
                has_embed = any("embed" in m.lower() or "nomic" in m.lower() for m in models)

                checks["ollama"] = {
                    "status": "healthy",
                    "url": ollama_url,
                    "models_loaded": len(models),
                    "models": models,
                    "llm_available": has_llm,
                    "embeddings_available": has_embed
                }

                if not has_llm:
                    checks["ollama"]["warning"] = "No LLM model loaded. Run: ollama pull llama3.1:8b"
                    all_healthy = False
            else:
                checks["ollama"] = {
                    "status": "unhealthy",
                    "error": f"HTTP {response.status_code}"
                }
                all_healthy = False
    except httpx.ConnectError:
        checks["ollama"] = {
            "status": "unhealthy",
            "error": "Connection refused. Is Ollama running? Start with: ollama serve"
        }
        all_healthy = False
    except Exception as e:
        checks["ollama"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        all_healthy = False

    # Frontend check (best effort - may fail due to CORS)
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get("http://localhost:5173", follow_redirects=True)
            checks["frontend"] = {
                "status": "healthy" if response.status_code == 200 else "unknown",
                "url": "http://localhost:5173"
            }
    except Exception:
        checks["frontend"] = {
            "status": "unknown",
            "url": "http://localhost:5173",
            "note": "Could not verify (may still be running)"
        }

    # Overall status
    checks["overall"] = "healthy" if all_healthy else "degraded"

    return checks
