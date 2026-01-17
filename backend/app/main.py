from contextlib import asynccontextmanager
import time
import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import settings
from app.core.exceptions import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
)
from app.core.logging import get_logger, setup_logging
from app.middleware.logging import RequestLoggingMiddleware
from app.services.scheduler_service import (
    init_scheduler,
    start_scheduler,
    stop_scheduler,
)

logger = get_logger(__name__)

# Track application startup time
_startup_time: float = 0


async def check_ollama_health() -> dict:
    """Check if Ollama is running and log status."""
    import httpx

    ollama_url = settings.OLLAMA_BASE_URL.replace('/v1', '')
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{ollama_url}/api/tags")
            if response.status_code == 200:
                data = response.json()
                models = [m.get("name", "unknown") for m in data.get("models", [])]
                has_llm = any("llama" in m.lower() for m in models)
                has_embed = any("embed" in m.lower() or "nomic" in m.lower() for m in models)

                return {
                    "status": "healthy",
                    "models": models,
                    "has_llm": has_llm,
                    "has_embed": has_embed,
                }
    except Exception as e:
        return {
            "status": "unavailable",
            "error": str(e),
        }

    return {"status": "unknown"}


async def warmup_models_if_enabled():
    """Optionally warm up AI models on startup."""
    # Check if warmup is enabled via settings or environment variable
    warmup_enabled = (
        settings.WARMUP_MODELS_ON_STARTUP or
        os.getenv("OKYAKU_WARMUP_MODELS", "false").lower() == "true"
    )

    if not warmup_enabled:
        logger.info(
            "Model warmup disabled",
            hint="Set WARMUP_MODELS_ON_STARTUP=true in .env to enable"
        )
        return

    logger.info("Warming up AI models...")
    try:
        from app.services.llm_service import llm_service
        result = await llm_service.warmup(include_embedding=True)

        if result["success"]:
            logger.info(
                "AI models warmed up successfully",
                total_time_ms=result["total_time_ms"],
                llm_time_ms=result["models"]["llm"]["time_ms"],
                embed_time_ms=result["models"]["embedding"]["time_ms"],
            )
        else:
            logger.warning(
                "AI model warmup failed",
                llm_status=result["models"]["llm"]["status"],
                embed_status=result["models"]["embedding"]["status"],
            )
    except Exception as e:
        logger.warning(f"Failed to warm up models: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler with enhanced startup diagnostics."""
    global _startup_time
    startup_start = time.perf_counter()

    # Startup
    setup_logging()
    logger.info(
        "Starting application",
        app=settings.APP_NAME,
        version=settings.APP_VERSION,
        debug=settings.DEBUG,
    )

    # Check database connectivity
    try:
        from app.db.session import engine
        from sqlalchemy import text

        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Database connection verified")
    except Exception as e:
        logger.error(f"Database connection failed: {e}")

    # Check Ollama status
    ollama_status = await check_ollama_health()
    if ollama_status["status"] == "healthy":
        logger.info(
            "Ollama connected",
            models=ollama_status.get("models", []),
            has_llm=ollama_status.get("has_llm"),
            has_embed=ollama_status.get("has_embed"),
        )
        if not ollama_status.get("has_llm"):
            logger.warning("No LLM model found. Run: ollama pull llama3.1:8b")
        if not ollama_status.get("has_embed"):
            logger.warning("No embedding model found. Run: ollama pull nomic-embed-text")
    else:
        logger.warning(
            "Ollama not available",
            error=ollama_status.get("error", "Connection failed"),
            hint="Start Ollama with: ollama serve",
        )

    # Optional model warmup
    await warmup_models_if_enabled()

    # Initialize and start background scheduler
    init_scheduler()
    start_scheduler()
    logger.info("Background job scheduler started")

    _startup_time = (time.perf_counter() - startup_start) * 1000
    logger.info(
        "Application startup complete",
        startup_time_ms=round(_startup_time, 2),
    )

    yield

    # Shutdown
    stop_scheduler()
    logger.info("Background job scheduler stopped")
    logger.info("Shutting down application")


def get_startup_time() -> float:
    """Get application startup time in milliseconds."""
    return _startup_time


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Exception handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# API routes
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


@app.get("/")
async def root() -> dict:
    """Root endpoint."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": f"{settings.API_V1_PREFIX}/docs",
    }
