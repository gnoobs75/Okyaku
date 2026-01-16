"""API endpoints for AI predictions - lead scoring, deal forecasting, churn risk."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends
from sqlmodel import Session, select

from app.api.deps import CurrentUserDep
from app.db.session import get_session
from app.core.config import settings
from app.models.ai_predictions import (
    LeadScore,
    DealForecast,
    ChurnRisk,
    LeadScoreResponse,
    DealForecastResponse,
    ChurnRiskResponse,
    PipelineForecastResponse,
    BatchScoreResult,
    PredictionStatus,
)
from app.models.contact import Contact
from app.models.deal import Deal
from app.services.ai_scoring_service import ai_scoring_service

router = APIRouter()


@router.post("/lead-score/{contact_id}", response_model=LeadScoreResponse)
async def score_lead(
    contact_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> LeadScoreResponse:
    """
    Generate an AI lead score for a contact.

    Analyzes the contact's profile, activity history, and engagement
    to predict their likelihood of conversion.

    Returns a score (0-100), factor breakdown, explanation, and recommendations.
    """
    if not settings.AI_PREDICTIONS_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="AI predictions are disabled. Enable AI_PREDICTIONS_ENABLED in settings.",
        )

    # Verify contact exists
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    result = await ai_scoring_service.score_lead(contact_id, session)

    if not result:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate lead score. Check Ollama connection.",
        )

    return result


@router.get("/lead-score/{contact_id}", response_model=Optional[LeadScoreResponse])
async def get_lead_score(
    contact_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> Optional[LeadScoreResponse]:
    """
    Get the most recent lead score for a contact.

    Returns the current active score if available, or null if no score exists.
    """
    stmt = (
        select(LeadScore)
        .where(LeadScore.contact_id == contact_id)
        .where(LeadScore.status == PredictionStatus.ACTIVE)
        .order_by(LeadScore.calculated_at.desc())
        .limit(1)
    )
    score = session.exec(stmt).first()

    if not score:
        return None

    return LeadScoreResponse(
        id=score.id,
        contact_id=score.contact_id,
        score=score.score,
        category=score.category,
        confidence=score.confidence,
        factors=score.factors,
        explanation=score.explanation,
        recommendations=score.recommendations,
        calculated_at=score.calculated_at,
        model_version=score.model_version,
    )


@router.post("/deal-forecast/{deal_id}", response_model=DealForecastResponse)
async def forecast_deal(
    deal_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> DealForecastResponse:
    """
    Generate an AI forecast for a deal.

    Analyzes the deal's stage, value, timeline, and associated activities
    to predict close probability, timing, and risk factors.

    Returns probability, predicted amount/date, risk factors, and recommendations.
    """
    if not settings.AI_PREDICTIONS_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="AI predictions are disabled. Enable AI_PREDICTIONS_ENABLED in settings.",
        )

    # Verify deal exists
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(status_code=404, detail="Deal not found")

    result = await ai_scoring_service.forecast_deal(deal_id, session)

    if not result:
        raise HTTPException(
            status_code=500,
            detail="Failed to generate deal forecast. Check Ollama connection.",
        )

    return result


@router.get("/deal-forecast/{deal_id}", response_model=Optional[DealForecastResponse])
async def get_deal_forecast(
    deal_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> Optional[DealForecastResponse]:
    """
    Get the most recent forecast for a deal.

    Returns the current active forecast if available, or null if none exists.
    """
    stmt = (
        select(DealForecast)
        .where(DealForecast.deal_id == deal_id)
        .where(DealForecast.status == PredictionStatus.ACTIVE)
        .order_by(DealForecast.calculated_at.desc())
        .limit(1)
    )
    forecast = session.exec(stmt).first()

    if not forecast:
        return None

    return DealForecastResponse(
        id=forecast.id,
        deal_id=forecast.deal_id,
        close_probability=forecast.close_probability,
        predicted_amount=forecast.predicted_amount,
        amount_confidence_low=forecast.amount_confidence_low,
        amount_confidence_high=forecast.amount_confidence_high,
        predicted_close_date=forecast.predicted_close_date,
        days_to_close=forecast.days_to_close,
        confidence=forecast.confidence,
        risk_level=forecast.risk_level,
        risk_factors=forecast.risk_factors,
        positive_signals=forecast.positive_signals,
        analysis=forecast.analysis,
        recommended_actions=forecast.recommended_actions,
        calculated_at=forecast.calculated_at,
        model_version=forecast.model_version,
    )


@router.post("/churn-risk/{contact_id}", response_model=ChurnRiskResponse)
async def assess_churn_risk(
    contact_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> ChurnRiskResponse:
    """
    Assess churn risk for a customer contact.

    Analyzes engagement trends, activity patterns, and relationship
    health to identify customers at risk of churning.

    Returns risk score, warning signals, and recommended retention actions.
    """
    if not settings.AI_PREDICTIONS_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="AI predictions are disabled. Enable AI_PREDICTIONS_ENABLED in settings.",
        )

    # Verify contact exists
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")

    # Must be a customer
    if contact.status.value not in ["customer", "churned"]:
        raise HTTPException(
            status_code=400,
            detail="Churn risk assessment is only available for customers",
        )

    result = await ai_scoring_service.assess_churn_risk(contact_id, session)

    if not result:
        raise HTTPException(
            status_code=500,
            detail="Failed to assess churn risk. Check Ollama connection.",
        )

    return result


@router.get("/churn-risk/{contact_id}", response_model=Optional[ChurnRiskResponse])
async def get_churn_risk(
    contact_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> Optional[ChurnRiskResponse]:
    """
    Get the most recent churn risk assessment for a contact.

    Returns the current active assessment if available, or null if none exists.
    """
    stmt = (
        select(ChurnRisk)
        .where(ChurnRisk.contact_id == contact_id)
        .where(ChurnRisk.status == PredictionStatus.ACTIVE)
        .order_by(ChurnRisk.calculated_at.desc())
        .limit(1)
    )
    risk = session.exec(stmt).first()

    if not risk:
        return None

    return ChurnRiskResponse(
        id=risk.id,
        contact_id=risk.contact_id,
        risk_score=risk.risk_score,
        risk_level=risk.risk_level,
        confidence=risk.confidence,
        warning_signals=risk.warning_signals,
        factor_weights=risk.factor_weights,
        analysis=risk.analysis,
        retention_actions=risk.retention_actions,
        estimated_days_to_churn=risk.estimated_days_to_churn,
        calculated_at=risk.calculated_at,
        model_version=risk.model_version,
    )


@router.get("/pipeline-forecast", response_model=PipelineForecastResponse)
async def get_pipeline_forecast(
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> PipelineForecastResponse:
    """
    Get aggregated forecast for the entire pipeline.

    Calculates weighted pipeline value, forecasted revenue, and
    risk distribution across all active deals with forecasts.
    """
    from decimal import Decimal
    from datetime import datetime

    # Get all active deal forecasts
    stmt = (
        select(DealForecast, Deal)
        .join(Deal, DealForecast.deal_id == Deal.id)
        .where(DealForecast.status == PredictionStatus.ACTIVE)
    )
    results = session.exec(stmt).all()

    if not results:
        return PipelineForecastResponse(
            total_pipeline_value=Decimal("0.00"),
            weighted_pipeline_value=Decimal("0.00"),
            forecasted_revenue=Decimal("0.00"),
            forecast_confidence=0.0,
            deals_by_probability={
                "high": [],
                "medium": [],
                "low": [],
            },
            total_deals=0,
            average_close_probability=0.0,
            risk_summary={
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0,
            },
            calculated_at=datetime.utcnow(),
        )

    # Calculate aggregates
    total_pipeline = Decimal("0.00")
    weighted_pipeline = Decimal("0.00")
    total_probability = 0.0
    risk_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    deals_by_prob = {"high": [], "medium": [], "low": []}

    for forecast, deal in results:
        total_pipeline += deal.value
        weighted_pipeline += deal.value * Decimal(str(forecast.close_probability))
        total_probability += forecast.close_probability
        risk_counts[forecast.risk_level.value] += 1

        deal_summary = {
            "deal_id": str(deal.id),
            "name": deal.name,
            "value": float(deal.value),
            "probability": forecast.close_probability,
        }

        if forecast.close_probability >= 0.7:
            deals_by_prob["high"].append(deal_summary)
        elif forecast.close_probability >= 0.4:
            deals_by_prob["medium"].append(deal_summary)
        else:
            deals_by_prob["low"].append(deal_summary)

    total_deals = len(results)
    avg_probability = total_probability / total_deals if total_deals > 0 else 0.0

    return PipelineForecastResponse(
        total_pipeline_value=total_pipeline,
        weighted_pipeline_value=weighted_pipeline,
        forecasted_revenue=weighted_pipeline,  # Simplified; could be more sophisticated
        forecast_confidence=avg_probability,
        deals_by_probability=deals_by_prob,
        total_deals=total_deals,
        average_close_probability=avg_probability,
        risk_summary=risk_counts,
        calculated_at=datetime.utcnow(),
    )


@router.get("/status")
async def get_predictions_status(current_user: CurrentUserDep) -> dict:
    """
    Get status of AI predictions feature.

    Returns configuration status and feature availability.
    """
    from app.services.llm_service import llm_service

    health = await llm_service.check_health()
    is_available = health.get("status") == "healthy" and settings.AI_PREDICTIONS_ENABLED

    return {
        "available": is_available,
        "enabled": settings.AI_PREDICTIONS_ENABLED,
        "ollama_status": health.get("status"),
        "model": settings.OLLAMA_MODEL,
        "features": {
            "lead_scoring": is_available,
            "deal_forecasting": is_available,
            "churn_prediction": is_available,
            "pipeline_forecast": is_available,
        },
    }
