"""API endpoints for Conversation Intelligence."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session

from app.api.deps import CurrentUserDep
from app.db.session import get_session
from app.core.config import settings
from app.models.conversation import (
    ConversationType,
    ConversationAnalysisResponse,
    AnalyzeConversationRequest,
    QuickSummarizeRequest,
)
from app.services.conversation_service import conversation_service

router = APIRouter()


@router.post("/analyze", response_model=ConversationAnalysisResponse)
async def analyze_conversation(
    request: AnalyzeConversationRequest,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> ConversationAnalysisResponse:
    """
    Analyze a conversation transcript or meeting notes.

    Extracts:
    - Summary
    - Key points
    - Action items with assignees and due dates
    - Decisions made
    - Questions raised
    - Sentiment analysis
    - Mentioned entities (people, companies, products)
    - Topics and keywords

    Provide either a transcript or notes (or both).
    """
    if not settings.AI_PREDICTIONS_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="AI features are disabled. Enable AI_PREDICTIONS_ENABLED in settings.",
        )

    if not request.transcript and not request.notes:
        raise HTTPException(
            status_code=400,
            detail="Either transcript or notes must be provided.",
        )

    result = await conversation_service.analyze_conversation(
        session=session,
        type=request.type,
        title=request.title,
        transcript=request.transcript,
        notes=request.notes,
        contact_id=request.contact_id,
        deal_id=request.deal_id,
        activity_id=request.activity_id,
        occurred_at=request.occurred_at,
        duration_minutes=request.duration_minutes,
        participants=request.participants,
    )

    if not result:
        raise HTTPException(
            status_code=500,
            detail="Failed to analyze conversation. Check Ollama connection.",
        )

    return result


@router.post("/summarize")
async def quick_summarize(
    request: QuickSummarizeRequest,
    current_user: CurrentUserDep,
) -> dict:
    """
    Quick summarization without full analysis or storage.

    Use this for quick summaries of text snippets, emails, etc.
    Does not store results in the database.
    """
    if not settings.AI_PREDICTIONS_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="AI features are disabled.",
        )

    result = await conversation_service.quick_summarize(
        text=request.text,
        context=request.context,
    )

    if not result:
        raise HTTPException(
            status_code=500,
            detail="Failed to summarize text.",
        )

    return result


@router.get("/analyses", response_model=list[ConversationAnalysisResponse])
async def list_analyses(
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
    contact_id: Optional[UUID] = Query(default=None),
    deal_id: Optional[UUID] = Query(default=None),
    type: Optional[ConversationType] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[ConversationAnalysisResponse]:
    """List conversation analyses with optional filters."""
    return await conversation_service.list_analyses(
        session=session,
        contact_id=contact_id,
        deal_id=deal_id,
        type=type,
        limit=limit,
    )


@router.get("/analyses/{analysis_id}", response_model=ConversationAnalysisResponse)
async def get_analysis(
    analysis_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> ConversationAnalysisResponse:
    """Get a specific conversation analysis by ID."""
    result = await conversation_service.get_analysis(analysis_id, session)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return result


@router.get("/contact/{contact_id}/summary")
async def get_contact_conversation_summary(
    contact_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> dict:
    """
    Get aggregated conversation insights for a contact.

    Returns:
    - Total conversations
    - Recent summary
    - Common topics
    - Sentiment trend
    - Pending action items
    """
    return await conversation_service.get_contact_conversation_summary(
        contact_id, session
    )


@router.get("/status")
async def get_conversation_status(current_user: CurrentUserDep) -> dict:
    """Get status of conversation intelligence features."""
    from app.services.llm_service import llm_service

    health = await llm_service.check_health()
    is_available = health.get("status") == "healthy" and settings.AI_PREDICTIONS_ENABLED

    return {
        "available": is_available,
        "enabled": settings.AI_PREDICTIONS_ENABLED,
        "ollama_status": health.get("status"),
        "model": settings.OLLAMA_MODEL,
        "features": {
            "full_analysis": is_available,
            "quick_summarize": is_available,
            "sentiment_analysis": is_available,
            "action_extraction": is_available,
        },
    }
