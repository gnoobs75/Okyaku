"""API endpoint for natural language CRM chat."""

from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlmodel import Session

from app.api.deps import CurrentUserDep
from app.db.session import get_session
from app.core.config import settings
from app.services.chat_service import chat_service

router = APIRouter()


class ChatRequest(BaseModel):
    """Request for chat query."""
    query: str
    context: Optional[str] = None


class ChatResponse(BaseModel):
    """Response from chat query."""
    query: str
    response: str
    intent: dict
    result: dict
    timestamp: str


@router.post("/query", response_model=ChatResponse)
async def chat_query(
    request: ChatRequest,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> ChatResponse:
    """
    Process a natural language query about CRM data.

    Examples:
    - "How many leads do we have?"
    - "Show me deals over $10,000"
    - "Find contacts at Acme Corp"
    - "What's our pipeline value?"
    - "Recent activities"

    Returns a natural language response along with structured data.
    """
    if not settings.AI_CHAT_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="AI chat is disabled. Enable AI_CHAT_ENABLED in settings.",
        )

    if not request.query.strip():
        raise HTTPException(
            status_code=400,
            detail="Query cannot be empty.",
        )

    result = await chat_service.process_query(
        query=request.query.strip(),
        session=session,
        context=request.context,
    )

    return ChatResponse(
        query=result["query"],
        response=result["response"],
        intent=result["intent"],
        result=result["result"],
        timestamp=result["timestamp"],
    )


@router.get("/status")
async def get_chat_status(current_user: CurrentUserDep) -> dict:
    """Get status of AI chat features."""
    from app.services.llm_service import llm_service

    health = await llm_service.check_health()
    is_available = health.get("status") == "healthy" and settings.AI_CHAT_ENABLED

    return {
        "available": is_available,
        "enabled": settings.AI_CHAT_ENABLED,
        "ollama_status": health.get("status"),
        "model": settings.OLLAMA_MODEL,
        "supported_queries": [
            "Count queries (e.g., 'How many leads?')",
            "List queries (e.g., 'Show me deals over $10k')",
            "Search queries (e.g., 'Find contacts at Acme')",
            "Stats queries (e.g., 'Pipeline value')",
            "Recent queries (e.g., 'Recent activities')",
        ],
    }


@router.get("/examples")
async def get_query_examples(current_user: CurrentUserDep) -> dict:
    """Get example queries to help users."""
    return {
        "examples": [
            {
                "category": "Counting",
                "queries": [
                    "How many contacts do we have?",
                    "How many leads are in the pipeline?",
                    "Count deals over $50,000",
                ],
            },
            {
                "category": "Listing",
                "queries": [
                    "Show me all customers",
                    "List deals closing this month",
                    "Show top 10 deals by value",
                ],
            },
            {
                "category": "Searching",
                "queries": [
                    "Find contacts at Microsoft",
                    "Search for deals named Enterprise",
                    "Look up John Smith",
                ],
            },
            {
                "category": "Statistics",
                "queries": [
                    "What's our total pipeline value?",
                    "Break down contacts by status",
                    "Show deal statistics",
                ],
            },
            {
                "category": "Recent Activity",
                "queries": [
                    "What were the recent activities?",
                    "Show latest deals",
                    "New contacts this week",
                ],
            },
        ]
    }
