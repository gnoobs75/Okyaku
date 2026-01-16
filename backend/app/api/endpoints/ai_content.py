"""API endpoints for AI-powered content generation using Ollama."""

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.api.deps import CurrentUserDep
from app.services.ai_content_service import (
    ai_content_service,
    ContentTone,
    ContentLength,
    SocialPlatform,
)
from app.services.llm_service import llm_service
from app.core.config import settings

router = APIRouter()


class GeneratePostRequest(BaseModel):
    """Request model for generating a post."""
    topic: str = Field(..., min_length=3, max_length=500)
    platform: SocialPlatform
    tone: ContentTone = ContentTone.PROFESSIONAL
    length: ContentLength = ContentLength.MEDIUM
    include_hashtags: bool = True
    include_emojis: bool = True
    include_cta: bool = False
    additional_context: Optional[str] = Field(None, max_length=1000)
    brand_voice: Optional[str] = Field(None, max_length=500)


class GenerateVariationsRequest(BaseModel):
    """Request model for generating variations."""
    content: str = Field(..., min_length=10, max_length=5000)
    platform: SocialPlatform
    num_variations: int = Field(3, ge=1, le=5)
    tone: Optional[ContentTone] = None


class AdaptContentRequest(BaseModel):
    """Request model for adapting content to another platform."""
    content: str = Field(..., min_length=10, max_length=5000)
    source_platform: SocialPlatform
    target_platform: SocialPlatform


class ImproveContentRequest(BaseModel):
    """Request model for improving content."""
    content: str = Field(..., min_length=10, max_length=5000)
    platform: SocialPlatform
    improvement_focus: Optional[str] = Field(None, max_length=200)


class GenerateHashtagsRequest(BaseModel):
    """Request model for generating hashtags."""
    content: str = Field(..., min_length=10, max_length=5000)
    platform: SocialPlatform
    count: int = Field(5, ge=1, le=10)


@router.post("/generate")
async def generate_post(
    request: GeneratePostRequest,
    current_user: CurrentUserDep,
) -> dict:
    """
    Generate a social media post using AI.

    Uses local Ollama with Llama 3.1 to create optimized content for the specified platform,
    taking into account tone, length, and platform-specific best practices.
    """
    result = await ai_content_service.generate_post(
        topic=request.topic,
        platform=request.platform,
        tone=request.tone,
        length=request.length,
        include_hashtags=request.include_hashtags,
        include_emojis=request.include_emojis,
        include_cta=request.include_cta,
        additional_context=request.additional_context,
        brand_voice=request.brand_voice,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate content: {result.get('error', 'Unknown error')}",
        )

    return result


@router.post("/variations")
async def generate_variations(
    request: GenerateVariationsRequest,
    current_user: CurrentUserDep,
) -> dict:
    """
    Generate variations of existing content.

    Creates alternative versions of a post while maintaining the core message,
    useful for A/B testing or refreshing content.
    """
    result = await ai_content_service.generate_variations(
        original_content=request.content,
        platform=request.platform,
        num_variations=request.num_variations,
        tone=request.tone,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate variations: {result.get('error', 'Unknown error')}",
        )

    return result


@router.post("/adapt")
async def adapt_content(
    request: AdaptContentRequest,
    current_user: CurrentUserDep,
) -> dict:
    """
    Adapt content from one platform to another.

    Rewrites content to match the target platform's format, style,
    and best practices while preserving the core message.
    """
    if request.source_platform == request.target_platform:
        raise HTTPException(
            status_code=400,
            detail="Source and target platforms must be different",
        )

    result = await ai_content_service.adapt_for_platform(
        content=request.content,
        source_platform=request.source_platform,
        target_platform=request.target_platform,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to adapt content: {result.get('error', 'Unknown error')}",
        )

    return result


@router.post("/improve")
async def improve_content(
    request: ImproveContentRequest,
    current_user: CurrentUserDep,
) -> dict:
    """
    Improve existing content for better engagement.

    Analyzes the content and suggests improvements while explaining
    the changes and providing engagement tips.
    """
    result = await ai_content_service.improve_content(
        content=request.content,
        platform=request.platform,
        improvement_focus=request.improvement_focus,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to improve content: {result.get('error', 'Unknown error')}",
        )

    return result


@router.post("/hashtags")
async def generate_hashtags(
    request: GenerateHashtagsRequest,
    current_user: CurrentUserDep,
) -> dict:
    """
    Generate relevant hashtags for content.

    Creates a mix of popular and niche hashtags optimized for
    reach and engagement on the specified platform.
    """
    result = await ai_content_service.generate_hashtags(
        content=request.content,
        platform=request.platform,
        count=request.count,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate hashtags: {result.get('error', 'Unknown error')}",
        )

    return result


@router.get("/status")
async def get_ai_status(current_user: CurrentUserDep) -> dict:
    """
    Check if AI content generation is available.

    Returns the Ollama connection status, available models, and features.
    """
    # Check Ollama health
    health = await llm_service.check_health()
    is_available = health.get("status") == "healthy"

    return {
        "available": is_available,
        "provider": "ollama",
        "model": settings.OLLAMA_MODEL,
        "embedding_model": settings.OLLAMA_EMBEDDING_MODEL,
        "base_url": settings.OLLAMA_BASE_URL,
        "health": health,
        "features": {
            "content_generation": is_available,
            "lead_scoring": is_available and settings.AI_PREDICTIONS_ENABLED,
            "deal_forecasting": is_available and settings.AI_PREDICTIONS_ENABLED,
            "ai_chat": is_available and settings.AI_CHAT_ENABLED,
            "ai_agents": is_available and settings.AI_AGENTS_ENABLED,
            "rag_search": is_available and settings.AI_RAG_ENABLED,
        },
        "supported_platforms": [p.value for p in SocialPlatform],
        "supported_tones": [t.value for t in ContentTone],
        "supported_lengths": [l.value for l in ContentLength],
        "setup_instructions": None if is_available else {
            "message": "Ollama is not running. Start it to enable AI features.",
            "steps": [
                "1. Install Ollama: curl -fsSL https://ollama.com/install.sh | sh",
                "2. Pull the model: ollama pull llama3.1",
                "3. Start the server: ollama serve",
                "4. Verify at: http://localhost:11434",
            ],
        },
    }


@router.get("/health")
async def ai_health_check() -> dict:
    """
    Quick health check for AI services (no auth required for monitoring).

    Returns the current status of the Ollama backend.
    """
    health = await llm_service.check_health()
    return {
        "status": health.get("status"),
        "provider": "ollama",
        "model": settings.OLLAMA_MODEL,
    }
