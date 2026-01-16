"""API endpoints for AI-powered insights and anomaly detection."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session

from app.api.deps import CurrentUserDep
from app.db.session import get_session
from app.core.config import settings
from app.models.insights import (
    InsightType,
    InsightCategory,
    InsightSeverity,
    InsightStatus,
    InsightResponse,
    InsightsListResponse,
    InsightsSummary,
    UpdateInsightRequest,
)
from app.services.insights_service import insights_service

router = APIRouter()


@router.post("/generate", response_model=list[InsightResponse])
async def generate_insights(
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> list[InsightResponse]:
    """
    Run anomaly detection and generate new insights.

    Analyzes CRM data for:
    - Deal velocity anomalies
    - Pipeline health issues
    - Engagement anomalies
    - Conversion trends
    - Activity patterns

    Returns newly generated insights.
    """
    if not settings.AI_PREDICTIONS_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="AI features are disabled. Enable AI_PREDICTIONS_ENABLED in settings.",
        )

    return await insights_service.generate_insights(session)


@router.get("/", response_model=InsightsListResponse)
async def list_insights(
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
    type: Optional[InsightType] = Query(default=None),
    category: Optional[InsightCategory] = Query(default=None),
    severity: Optional[InsightSeverity] = Query(default=None),
    status: Optional[InsightStatus] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
) -> InsightsListResponse:
    """
    List insights with optional filters.

    Filters:
    - type: anomaly, trend, opportunity, risk, milestone, alert
    - category: deal_velocity, pipeline_health, contact_engagement, etc.
    - severity: info, low, medium, high, critical
    - status: new, viewed, acknowledged, dismissed, resolved
    """
    insights = await insights_service.get_insights(
        session=session,
        type=type,
        category=category,
        severity=severity,
        status=status,
        limit=limit,
    )

    # Count new and critical
    new_count = sum(1 for i in insights if i.status == InsightStatus.NEW)
    critical_count = sum(1 for i in insights if i.severity == InsightSeverity.CRITICAL)

    return InsightsListResponse(
        insights=insights,
        total=len(insights),
        new_count=new_count,
        critical_count=critical_count,
    )


@router.get("/summary", response_model=InsightsSummary)
async def get_insights_summary(
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> InsightsSummary:
    """
    Get summary of all insights.

    Returns counts by type, severity, and category, plus recent insights.
    """
    return await insights_service.get_summary(session)


@router.get("/{insight_id}", response_model=InsightResponse)
async def get_insight(
    insight_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> InsightResponse:
    """Get a specific insight by ID."""
    from sqlmodel import select
    from app.models.insights import Insight

    insight = session.get(Insight, insight_id)
    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    # Mark as viewed if new
    if insight.status == InsightStatus.NEW:
        insight.status = InsightStatus.VIEWED
        session.add(insight)
        session.commit()
        session.refresh(insight)

    return InsightResponse(
        id=insight.id,
        type=insight.type,
        category=insight.category,
        severity=insight.severity,
        status=insight.status,
        title=insight.title,
        description=insight.description,
        details=insight.details,
        contact_id=insight.contact_id,
        deal_id=insight.deal_id,
        company_id=insight.company_id,
        metric_name=insight.metric_name,
        metric_value=insight.metric_value,
        metric_baseline=insight.metric_baseline,
        deviation_percent=insight.deviation_percent,
        suggested_action=insight.suggested_action,
        confidence=insight.confidence,
        detected_at=insight.detected_at,
    )


@router.patch("/{insight_id}", response_model=InsightResponse)
async def update_insight(
    insight_id: UUID,
    request: UpdateInsightRequest,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> InsightResponse:
    """
    Update insight status.

    Use this to acknowledge, dismiss, or resolve insights.
    """
    result = await insights_service.update_insight(
        insight_id=insight_id,
        status=request.status,
        action_taken=request.action_taken,
        session=session,
    )

    if not result:
        raise HTTPException(status_code=404, detail="Insight not found")

    return result


@router.get("/status")
async def get_insights_status(current_user: CurrentUserDep) -> dict:
    """Get status of insights/anomaly detection features."""
    from app.services.llm_service import llm_service

    health = await llm_service.check_health()
    is_available = health.get("status") == "healthy" and settings.AI_PREDICTIONS_ENABLED

    return {
        "available": is_available,
        "enabled": settings.AI_PREDICTIONS_ENABLED,
        "ollama_status": health.get("status"),
        "model": settings.OLLAMA_MODEL,
        "detection_categories": [
            "deal_velocity",
            "pipeline_health",
            "contact_engagement",
            "churn_risk",
            "conversion",
            "activity",
        ],
    }
