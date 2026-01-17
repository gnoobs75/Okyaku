"""
Performance metrics endpoint for system monitoring.

Provides real-time system health, Ollama model status, VRAM usage,
and application performance metrics.
"""
import time
import asyncio
import platform
import psutil
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, status
from sqlalchemy import text, func
from pydantic import BaseModel

from app.api.deps import SessionDep
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


class ModelInfo(BaseModel):
    """Information about a loaded Ollama model."""
    name: str
    size: int  # Size in bytes
    size_vram: Optional[int] = None  # VRAM usage in bytes
    digest: Optional[str] = None
    details: Optional[dict] = None
    expires_at: Optional[str] = None


class OllamaMetrics(BaseModel):
    """Ollama service metrics."""
    status: str  # healthy, unhealthy, unavailable
    url: str
    models_available: list[str] = []
    models_loaded: list[ModelInfo] = []
    total_vram_used: int = 0  # bytes
    total_vram_used_gb: float = 0.0
    gpu_available: bool = False
    error: Optional[str] = None


class SystemMetrics(BaseModel):
    """System resource metrics."""
    cpu_percent: float
    memory_total_gb: float
    memory_used_gb: float
    memory_percent: float
    disk_total_gb: float
    disk_used_gb: float
    disk_percent: float
    platform: str
    python_version: str


class DatabaseMetrics(BaseModel):
    """Database performance metrics."""
    status: str
    connection_time_ms: float
    active_connections: Optional[int] = None


class ApplicationMetrics(BaseModel):
    """Application-level metrics."""
    uptime_seconds: float
    startup_time_ms: float
    requests_total: int
    errors_total: int
    error_rate_percent: float
    avg_response_time_ms: float
    p50_response_time_ms: float
    p95_response_time_ms: float
    ai_avg_response_time_ms: float


class PerformanceMetrics(BaseModel):
    """Complete performance metrics response."""
    timestamp: str
    app_name: str
    app_version: str
    overall_status: str  # healthy, degraded, unhealthy
    system: SystemMetrics
    database: DatabaseMetrics
    ollama: OllamaMetrics
    application: ApplicationMetrics
    warnings: list[str] = []


# Track application metrics (in-memory, resets on restart)
class MetricsCollector:
    """Collects and tracks application metrics."""

    def __init__(self):
        self.start_time = time.time()
        self.request_count = 0
        self.request_times: list[float] = []
        self.ai_request_count = 0
        self.ai_inference_times: list[float] = []
        self._lock = asyncio.Lock()

    async def record_request(self, duration_ms: float):
        """Record an HTTP request."""
        async with self._lock:
            self.request_count += 1
            self.request_times.append(duration_ms)
            # Keep only last 1000 requests for average calculation
            if len(self.request_times) > 1000:
                self.request_times = self.request_times[-1000:]

    async def record_ai_request(self, inference_time_ms: float):
        """Record an AI inference request."""
        async with self._lock:
            self.ai_request_count += 1
            self.ai_inference_times.append(inference_time_ms)
            # Keep only last 100 AI requests
            if len(self.ai_inference_times) > 100:
                self.ai_inference_times = self.ai_inference_times[-100:]

    def get_stats(self) -> dict:
        """Get current stats."""
        return {
            "uptime_seconds": time.time() - self.start_time,
            "requests_total": self.request_count,
            "avg_response_time_ms": (
                sum(self.request_times) / len(self.request_times)
                if self.request_times else 0
            ),
            "ai_requests_total": self.ai_request_count,
            "ai_avg_inference_time_ms": (
                sum(self.ai_inference_times) / len(self.ai_inference_times)
                if self.ai_inference_times else 0
            ),
        }


# Global metrics collector
metrics_collector = MetricsCollector()


async def get_ollama_metrics() -> OllamaMetrics:
    """Fetch detailed metrics from Ollama including VRAM usage."""
    ollama_url = settings.OLLAMA_BASE_URL.replace('/v1', '')

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Get available models
            tags_response = await client.get(f"{ollama_url}/api/tags")
            available_models = []
            if tags_response.status_code == 200:
                data = tags_response.json()
                available_models = [m.get("name", "unknown") for m in data.get("models", [])]

            # Get running models with VRAM info
            ps_response = await client.get(f"{ollama_url}/api/ps")
            loaded_models = []
            total_vram = 0
            gpu_available = False

            if ps_response.status_code == 200:
                ps_data = ps_response.json()
                for model in ps_data.get("models", []):
                    size_vram = model.get("size_vram", 0)
                    total_vram += size_vram

                    # Check if using GPU
                    if size_vram > 0:
                        gpu_available = True

                    loaded_models.append(ModelInfo(
                        name=model.get("name", "unknown"),
                        size=model.get("size", 0),
                        size_vram=size_vram,
                        digest=model.get("digest"),
                        details=model.get("details"),
                        expires_at=model.get("expires_at"),
                    ))

            return OllamaMetrics(
                status="healthy",
                url=ollama_url,
                models_available=available_models,
                models_loaded=loaded_models,
                total_vram_used=total_vram,
                total_vram_used_gb=round(total_vram / (1024**3), 2) if total_vram else 0,
                gpu_available=gpu_available,
            )

    except httpx.ConnectError:
        return OllamaMetrics(
            status="unavailable",
            url=ollama_url,
            error="Connection refused. Is Ollama running? Start with: ollama serve",
        )
    except Exception as e:
        logger.error(f"Failed to get Ollama metrics: {e}")
        return OllamaMetrics(
            status="unhealthy",
            url=ollama_url,
            error=str(e),
        )


def get_system_metrics() -> SystemMetrics:
    """Collect system resource metrics."""
    memory = psutil.virtual_memory()

    # Use appropriate disk path for the platform
    disk_path = 'C:\\' if platform.system() == 'Windows' else '/'
    try:
        disk = psutil.disk_usage(disk_path)
        disk_total_gb = round(disk.total / (1024**3), 2)
        disk_used_gb = round(disk.used / (1024**3), 2)
        disk_percent = round((disk.used / disk.total) * 100, 1)
    except Exception:
        disk_total_gb = 0
        disk_used_gb = 0
        disk_percent = 0

    return SystemMetrics(
        cpu_percent=psutil.cpu_percent(interval=0.1),
        memory_total_gb=round(memory.total / (1024**3), 2),
        memory_used_gb=round(memory.used / (1024**3), 2),
        memory_percent=memory.percent,
        disk_total_gb=disk_total_gb,
        disk_used_gb=disk_used_gb,
        disk_percent=disk_percent,
        platform=platform.system(),
        python_version=platform.python_version(),
    )


async def get_database_metrics(session: SessionDep) -> DatabaseMetrics:
    """Check database connectivity and performance."""
    start = time.perf_counter()
    try:
        session.exec(text("SELECT 1"))
        duration = (time.perf_counter() - start) * 1000
        return DatabaseMetrics(
            status="healthy",
            connection_time_ms=round(duration, 2),
        )
    except Exception as e:
        duration = (time.perf_counter() - start) * 1000
        return DatabaseMetrics(
            status="unhealthy",
            connection_time_ms=round(duration, 2),
        )


def get_application_metrics() -> ApplicationMetrics:
    """Get application-level performance metrics."""
    from app.middleware.logging import get_performance_stats
    from app.main import get_startup_time

    perf_stats = get_performance_stats()
    startup_time = get_startup_time()

    return ApplicationMetrics(
        uptime_seconds=time.time() - (time.time() - startup_time / 1000) if startup_time > 0 else 0,
        startup_time_ms=startup_time,
        requests_total=perf_stats["total_requests"],
        errors_total=perf_stats["total_errors"],
        error_rate_percent=perf_stats["error_rate_percent"],
        avg_response_time_ms=perf_stats["avg_response_time_ms"],
        p50_response_time_ms=perf_stats["p50_response_time_ms"],
        p95_response_time_ms=perf_stats["p95_response_time_ms"],
        ai_avg_response_time_ms=perf_stats["ai_avg_response_time_ms"],
    )


@router.get("/metrics", response_model=PerformanceMetrics)
async def get_performance_metrics(session: SessionDep) -> PerformanceMetrics:
    """
    Get comprehensive performance metrics for the application.

    Returns system resources, database status, Ollama/AI status with VRAM usage,
    and application-level metrics.
    """
    # Collect all metrics concurrently
    ollama_task = asyncio.create_task(get_ollama_metrics())
    db_task = asyncio.create_task(get_database_metrics(session))

    system_metrics = get_system_metrics()
    app_metrics = get_application_metrics()
    ollama_metrics = await ollama_task
    db_metrics = await db_task

    # Determine overall status and warnings
    warnings = []
    overall_status = "healthy"

    if ollama_metrics.status != "healthy":
        overall_status = "degraded"
        warnings.append(f"Ollama: {ollama_metrics.error or 'unavailable'}")

    if db_metrics.status != "healthy":
        overall_status = "unhealthy"
        warnings.append("Database connection failed")

    # Check for high resource usage
    if system_metrics.memory_percent > 90:
        warnings.append(f"High memory usage: {system_metrics.memory_percent}%")

    if system_metrics.cpu_percent > 90:
        warnings.append(f"High CPU usage: {system_metrics.cpu_percent}%")

    # Check if required models are available
    if ollama_metrics.status == "healthy":
        has_llm = any("llama" in m.lower() for m in ollama_metrics.models_available)
        has_embed = any("embed" in m.lower() or "nomic" in m.lower() for m in ollama_metrics.models_available)

        if not has_llm:
            warnings.append("No LLM model available. Run: ollama pull llama3.1:8b")
        if not has_embed:
            warnings.append("No embedding model available. Run: ollama pull nomic-embed-text")

    # Check VRAM usage (warn if over 80% of typical consumer GPU - 8GB)
    if ollama_metrics.total_vram_used_gb > 6.4:  # 80% of 8GB
        warnings.append(f"High VRAM usage: {ollama_metrics.total_vram_used_gb}GB")

    # Check high error rate
    if app_metrics.error_rate_percent > 10:
        warnings.append(f"High error rate: {app_metrics.error_rate_percent}%")

    return PerformanceMetrics(
        timestamp=datetime.utcnow().isoformat(),
        app_name=settings.APP_NAME,
        app_version=settings.APP_VERSION,
        overall_status=overall_status,
        system=system_metrics,
        database=db_metrics,
        ollama=ollama_metrics,
        application=app_metrics,
        warnings=warnings,
    )


@router.get("/metrics/ollama", response_model=OllamaMetrics)
async def get_ollama_status() -> OllamaMetrics:
    """Get Ollama-specific metrics including VRAM usage and loaded models."""
    return await get_ollama_metrics()


@router.post("/metrics/warmup")
async def warmup_models() -> dict:
    """
    Warm up AI models by loading them into VRAM.

    This triggers a small inference to ensure models are loaded
    and ready for fast response times.
    """
    from app.services.llm_service import llm_service

    start_time = time.perf_counter()
    results = {
        "llm": {"status": "pending", "time_ms": 0},
        "embedding": {"status": "pending", "time_ms": 0},
    }

    # Warm up LLM
    llm_start = time.perf_counter()
    try:
        response = await llm_service.chat(
            messages=[{"role": "user", "content": "Hi"}],
            max_tokens=10,
        )
        llm_time = (time.perf_counter() - llm_start) * 1000
        results["llm"] = {
            "status": "success" if response.get("success") else "failed",
            "time_ms": round(llm_time, 2),
            "error": response.get("error"),
        }
    except Exception as e:
        results["llm"] = {
            "status": "failed",
            "time_ms": round((time.perf_counter() - llm_start) * 1000, 2),
            "error": str(e),
        }

    # Warm up embedding model
    embed_start = time.perf_counter()
    try:
        embedding = await llm_service.generate_embedding("test")
        embed_time = (time.perf_counter() - embed_start) * 1000
        results["embedding"] = {
            "status": "success" if embedding else "failed",
            "time_ms": round(embed_time, 2),
        }
    except Exception as e:
        results["embedding"] = {
            "status": "failed",
            "time_ms": round((time.perf_counter() - embed_start) * 1000, 2),
            "error": str(e),
        }

    total_time = (time.perf_counter() - start_time) * 1000

    logger.info(
        "Model warmup completed",
        llm_status=results["llm"]["status"],
        llm_time_ms=results["llm"]["time_ms"],
        embed_status=results["embedding"]["status"],
        embed_time_ms=results["embedding"]["time_ms"],
        total_time_ms=round(total_time, 2),
    )

    return {
        "success": all(r["status"] == "success" for r in results.values()),
        "total_time_ms": round(total_time, 2),
        "models": results,
    }


@router.post("/metrics/unload")
async def unload_models() -> dict:
    """
    Unload AI models from VRAM to free memory.

    Uses Ollama's keep_alive=0 feature to immediately unload models.
    """
    ollama_url = settings.OLLAMA_BASE_URL.replace('/v1', '')
    unloaded = []
    errors = []

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # First get list of loaded models
            ps_response = await client.get(f"{ollama_url}/api/ps")
            if ps_response.status_code == 200:
                loaded = ps_response.json().get("models", [])

                for model in loaded:
                    model_name = model.get("name")
                    try:
                        # Send request with keep_alive=0 to unload
                        await client.post(
                            f"{ollama_url}/api/generate",
                            json={
                                "model": model_name,
                                "prompt": "",
                                "keep_alive": 0,
                            },
                        )
                        unloaded.append(model_name)
                        logger.info(f"Unloaded model: {model_name}")
                    except Exception as e:
                        errors.append({"model": model_name, "error": str(e)})
                        logger.error(f"Failed to unload {model_name}: {e}")

        return {
            "success": len(errors) == 0,
            "unloaded": unloaded,
            "errors": errors,
        }

    except Exception as e:
        logger.error(f"Failed to unload models: {e}")
        return {
            "success": False,
            "error": str(e),
        }
