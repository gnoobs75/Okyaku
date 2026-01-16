"""API endpoints for AI recommendations and next-best-actions."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session, select

from app.api.deps import CurrentUserDep
from app.db.session import get_session
from app.core.config import settings
from app.models.recommendations import (
    Recommendation,
    RecommendationStatus,
    RecommendationPriority,
    RecommendationType,
    RecommendationResponse,
    RecommendationListResponse,
    RecommendationActionRequest,
    NextBestActionsResponse,
)
from app.services.recommendation_service import recommendation_service

router = APIRouter()


@router.post("/contact/{contact_id}", response_model=list[RecommendationResponse])
async def generate_contact_recommendations(
    contact_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> list[RecommendationResponse]:
    """
    Generate AI recommendations for a specific contact.

    Analyzes the contact's profile, activity history, lead score, and churn risk
    to generate actionable recommendations.
    """
    if not settings.AI_PREDICTIONS_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="AI predictions are disabled. Enable AI_PREDICTIONS_ENABLED in settings.",
        )

    return await recommendation_service.generate_contact_recommendations(contact_id, session)


@router.post("/deal/{deal_id}", response_model=list[RecommendationResponse])
async def generate_deal_recommendations(
    deal_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> list[RecommendationResponse]:
    """
    Generate AI recommendations for a specific deal.

    Analyzes the deal's stage, forecast, activities, and risk factors
    to generate actionable recommendations.
    """
    if not settings.AI_PREDICTIONS_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="AI predictions are disabled. Enable AI_PREDICTIONS_ENABLED in settings.",
        )

    return await recommendation_service.generate_deal_recommendations(deal_id, session)


@router.get("/next-best-actions", response_model=NextBestActionsResponse)
async def get_next_best_actions(
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
    limit: int = Query(default=10, ge=1, le=50),
) -> NextBestActionsResponse:
    """
    Get prioritized next-best-actions across all entities.

    Returns categorized recommendations with top priorities based on
    impact and urgency scores.
    """
    result = await recommendation_service.get_next_best_actions(session, limit)
    return NextBestActionsResponse(**result)


@router.get("/", response_model=RecommendationListResponse)
async def list_recommendations(
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
    status: Optional[RecommendationStatus] = Query(default=None),
    priority: Optional[RecommendationPriority] = Query(default=None),
    type: Optional[RecommendationType] = Query(default=None),
    contact_id: Optional[UUID] = Query(default=None),
    deal_id: Optional[UUID] = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
) -> RecommendationListResponse:
    """
    List recommendations with optional filters.

    Supports filtering by status, priority, type, and associated entity.
    """
    stmt = select(Recommendation)

    if status:
        stmt = stmt.where(Recommendation.status == status)
    if priority:
        stmt = stmt.where(Recommendation.priority == priority)
    if type:
        stmt = stmt.where(Recommendation.type == type)
    if contact_id:
        stmt = stmt.where(Recommendation.contact_id == contact_id)
    if deal_id:
        stmt = stmt.where(Recommendation.deal_id == deal_id)

    stmt = stmt.order_by(
        Recommendation.priority.asc(),
        Recommendation.created_at.desc(),
    ).offset(skip).limit(limit)

    recommendations = session.exec(stmt).all()

    # Get counts
    pending_count = session.exec(
        select(Recommendation)
        .where(Recommendation.status == RecommendationStatus.PENDING)
    ).all()

    high_priority_count = session.exec(
        select(Recommendation)
        .where(Recommendation.status == RecommendationStatus.PENDING)
        .where(
            (Recommendation.priority == RecommendationPriority.CRITICAL) |
            (Recommendation.priority == RecommendationPriority.HIGH)
        )
    ).all()

    return RecommendationListResponse(
        recommendations=[
            RecommendationResponse(
                id=r.id,
                contact_id=r.contact_id,
                deal_id=r.deal_id,
                type=r.type,
                priority=r.priority,
                status=r.status,
                title=r.title,
                description=r.description,
                reasoning=r.reasoning,
                suggested_action=r.suggested_action,
                action_template=r.action_template,
                confidence=r.confidence,
                impact_score=r.impact_score,
                urgency_score=r.urgency_score,
                context_data=r.context_data,
                created_at=r.created_at,
                expires_at=r.expires_at,
            )
            for r in recommendations
        ],
        total=len(recommendations),
        pending_count=len(pending_count),
        high_priority_count=len(high_priority_count),
    )


@router.get("/{recommendation_id}", response_model=RecommendationResponse)
async def get_recommendation(
    recommendation_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> RecommendationResponse:
    """Get a specific recommendation by ID."""
    rec = session.get(Recommendation, recommendation_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    return RecommendationResponse(
        id=rec.id,
        contact_id=rec.contact_id,
        deal_id=rec.deal_id,
        type=rec.type,
        priority=rec.priority,
        status=rec.status,
        title=rec.title,
        description=rec.description,
        reasoning=rec.reasoning,
        suggested_action=rec.suggested_action,
        action_template=rec.action_template,
        confidence=rec.confidence,
        impact_score=rec.impact_score,
        urgency_score=rec.urgency_score,
        context_data=rec.context_data,
        created_at=rec.created_at,
        expires_at=rec.expires_at,
    )


@router.post("/{recommendation_id}/action", response_model=RecommendationResponse)
async def act_on_recommendation(
    recommendation_id: UUID,
    request: RecommendationActionRequest,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> RecommendationResponse:
    """
    Act on a recommendation (accept, dismiss, or complete).

    - accept: Mark as accepted and in progress
    - dismiss: Mark as dismissed (not useful)
    - complete: Mark as completed (action taken)
    """
    if request.action not in ["accept", "dismiss", "complete"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid action. Must be 'accept', 'dismiss', or 'complete'.",
        )

    result = await recommendation_service.act_on_recommendation(
        recommendation_id, request.action, request.notes, session
    )

    if not result:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    return result
