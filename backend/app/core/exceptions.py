from typing import Any

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse

from app.core.logging import get_logger

logger = get_logger(__name__)


class AppException(Exception):
    """Base application exception."""

    def __init__(
        self,
        message: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: dict[str, Any] | None = None,
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class NotFoundError(AppException):
    """Resource not found error."""

    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} not found",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource": resource, "identifier": str(identifier)},
        )


class ValidationError(AppException):
    """Validation error."""

    def __init__(self, message: str, details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class AuthenticationError(AppException):
    """Authentication error."""

    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
        )


class AuthorizationError(AppException):
    """Authorization error."""

    def __init__(self, message: str = "Permission denied"):
        super().__init__(
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
        )


async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Handle application exceptions."""
    logger.warning(
        "Application exception",
        status_code=exc.status_code,
        message=exc.message,
        details=exc.details,
        path=str(request.url),
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "message": exc.message,
                "details": exc.details,
            }
        },
    )


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    """Handle HTTP exceptions."""
    logger.warning(
        "HTTP exception",
        status_code=exc.status_code,
        detail=exc.detail,
        path=str(request.url),
    )
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "message": exc.detail,
            }
        },
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unhandled exceptions."""
    logger.exception(
        "Unhandled exception",
        path=str(request.url),
        error=str(exc),
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": {
                "message": "Internal server error",
            }
        },
    )
