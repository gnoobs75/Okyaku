from contextlib import asynccontextmanager

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

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler."""
    # Startup
    setup_logging()
    logger.info(
        "Starting application",
        app=settings.APP_NAME,
        version=settings.APP_VERSION,
    )
    yield
    # Shutdown
    logger.info("Shutting down application")


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
