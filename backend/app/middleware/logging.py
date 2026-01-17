import time
import asyncio
from uuid import uuid4
from typing import Callable, Awaitable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.types import ASGIApp

from app.core.logging import get_logger

logger = get_logger(__name__)


class PerformanceTracker:
    """Tracks request performance metrics globally."""

    def __init__(self):
        self.total_requests = 0
        self.total_errors = 0
        self.response_times: list[float] = []
        self.ai_request_times: list[float] = []
        self._lock = asyncio.Lock()

    async def record_request(self, duration_ms: float, is_error: bool = False, is_ai: bool = False):
        """Record a request's performance."""
        async with self._lock:
            self.total_requests += 1
            if is_error:
                self.total_errors += 1
            self.response_times.append(duration_ms)
            if is_ai:
                self.ai_request_times.append(duration_ms)

            # Keep only last 1000 for memory efficiency
            if len(self.response_times) > 1000:
                self.response_times = self.response_times[-1000:]
            if len(self.ai_request_times) > 100:
                self.ai_request_times = self.ai_request_times[-100:]

    def get_stats(self) -> dict:
        """Get performance statistics."""
        return {
            "total_requests": self.total_requests,
            "total_errors": self.total_errors,
            "error_rate_percent": round(
                (self.total_errors / self.total_requests * 100) if self.total_requests > 0 else 0, 2
            ),
            "avg_response_time_ms": round(
                sum(self.response_times) / len(self.response_times) if self.response_times else 0, 2
            ),
            "p50_response_time_ms": round(
                sorted(self.response_times)[len(self.response_times) // 2] if self.response_times else 0, 2
            ),
            "p95_response_time_ms": round(
                sorted(self.response_times)[int(len(self.response_times) * 0.95)] if len(self.response_times) >= 20 else 0, 2
            ),
            "ai_avg_response_time_ms": round(
                sum(self.ai_request_times) / len(self.ai_request_times) if self.ai_request_times else 0, 2
            ),
        }


# Global performance tracker
performance_tracker = PerformanceTracker()


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging HTTP requests and responses with performance tracking."""

    # Paths that are AI-related
    AI_PATHS = {"/ai/", "/chat", "/agent", "/predictions", "/recommendations", "/insights", "/conversation", "/knowledge"}

    # Paths to skip detailed logging (health checks, static files)
    SKIP_LOGGING_PATHS = {"/health", "/metrics", "/favicon", "/assets"}

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    def _is_ai_request(self, path: str) -> bool:
        """Check if the request is AI-related."""
        return any(ai_path in path for ai_path in self.AI_PATHS)

    def _should_skip_logging(self, path: str) -> bool:
        """Check if we should skip detailed logging for this path."""
        return any(skip_path in path for skip_path in self.SKIP_LOGGING_PATHS)

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        request_id = str(uuid4())
        start_time = time.perf_counter()
        path = str(request.url.path)
        is_ai = self._is_ai_request(path)
        skip_logging = self._should_skip_logging(path)

        # Log request (skip for health/metrics endpoints to reduce noise)
        if not skip_logging:
            logger.info(
                "Request started",
                request_id=request_id,
                method=request.method,
                path=path,
                query_params=str(request.query_params) if request.query_params else None,
                is_ai=is_ai,
            )

        # Process request
        response = await call_next(request)

        # Calculate duration
        duration_ms = (time.perf_counter() - start_time) * 1000
        is_error = response.status_code >= 400

        # Record performance metrics
        await performance_tracker.record_request(
            duration_ms=duration_ms,
            is_error=is_error,
            is_ai=is_ai
        )

        # Log response
        if not skip_logging:
            log_level = "warning" if is_error else "info"
            log_data = {
                "request_id": request_id,
                "method": request.method,
                "path": path,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
            }

            # Add extra context for slow requests
            if duration_ms > 1000:
                log_data["slow_request"] = True

            # Add extra context for AI requests
            if is_ai:
                log_data["is_ai"] = True
                if duration_ms > 5000:
                    log_data["slow_ai_request"] = True

            if is_error:
                logger.warning("Request failed", **log_data)
            else:
                logger.info("Request completed", **log_data)

        # Add performance headers
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time"] = f"{round(duration_ms, 2)}ms"

        return response


def get_performance_stats() -> dict:
    """Get the current performance statistics."""
    return performance_tracker.get_stats()
