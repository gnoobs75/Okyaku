"""
AI Scoring Service - Lead scoring, deal forecasting, and churn prediction.

Uses the LLM service (Ollama/Llama 3.1) to analyze CRM data and generate
predictive scores with explanations and actionable recommendations.
"""

import json
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Optional
from uuid import UUID

from sqlmodel import Session, select

from app.core.config import settings
from app.core.logging import get_logger
from app.db.session import get_session
from app.models.activity import Activity
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.ai_predictions import (
    LeadScore,
    DealForecast,
    ChurnRisk,
    ScoreCategory,
    RiskLevel,
    PredictionStatus,
    LeadScoreResponse,
    DealForecastResponse,
    ChurnRiskResponse,
)
from app.services.llm_service import llm_service

logger = get_logger(__name__)


def _get_score_category(score: int) -> ScoreCategory:
    """Convert numeric score to category."""
    if score >= 80:
        return ScoreCategory.HOT
    elif score >= 60:
        return ScoreCategory.WARM
    elif score >= 40:
        return ScoreCategory.COOL
    return ScoreCategory.COLD


def _get_risk_level(score: int) -> RiskLevel:
    """Convert risk score to level."""
    if score >= 80:
        return RiskLevel.CRITICAL
    elif score >= 60:
        return RiskLevel.HIGH
    elif score >= 40:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


class AIScoringService:
    """
    Service for AI-powered lead scoring, deal forecasting, and churn prediction.

    Uses Ollama/Llama 3.1 to analyze CRM data and generate insights.
    """

    async def score_lead(
        self,
        contact_id: UUID,
        session: Session,
    ) -> Optional[LeadScoreResponse]:
        """
        Analyze a contact and generate a lead score.

        Considers:
        - Contact profile completeness
        - Activity history (emails, calls, meetings)
        - Engagement patterns
        - Company fit
        - Timing signals

        Returns:
            LeadScoreResponse with score, factors, and recommendations
        """
        if not settings.AI_PREDICTIONS_ENABLED:
            logger.warning("AI predictions are disabled")
            return None

        # Fetch contact data
        contact = session.get(Contact, contact_id)
        if not contact:
            logger.error(f"Contact {contact_id} not found")
            return None

        # Fetch recent activities
        activities_stmt = (
            select(Activity)
            .where(Activity.contact_id == contact_id)
            .order_by(Activity.created_at.desc())
            .limit(20)
        )
        activities = session.exec(activities_stmt).all()

        # Build context for LLM
        context = self._build_lead_context(contact, activities)

        # Generate score using LLM
        system_prompt = """You are an expert sales analyst. Analyze the provided lead data and generate a comprehensive lead score.

You must respond with valid JSON matching this exact structure:
{
    "score": <integer 0-100>,
    "factors": {
        "profile_completeness": <integer 0-100>,
        "engagement_level": <integer 0-100>,
        "company_fit": <integer 0-100>,
        "timing": <integer 0-100>,
        "activity_recency": <integer 0-100>
    },
    "explanation": "<2-3 sentence explanation of the score>",
    "recommendations": ["<action 1>", "<action 2>", "<action 3>"],
    "confidence": <float 0.0-1.0>
}

Consider:
- Profile completeness (email, phone, job title, company)
- Activity frequency and recency
- Engagement quality (responses, meeting attendance)
- Company size and industry fit
- Timing signals (budget cycles, expressed interest)"""

        user_prompt = f"""Analyze this lead and provide a score:

CONTACT DATA:
{json.dumps(context, indent=2, default=str)}

Provide your analysis as JSON."""

        result = await llm_service.chat(
            messages=[{"role": "user", "content": user_prompt}],
            system_prompt=system_prompt,
            temperature=0.3,
        )

        if not result["success"]:
            logger.error(f"LLM scoring failed: {result.get('error')}")
            return None

        # Parse LLM response
        try:
            content = result["content"].strip()
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join(lines[1:-1])

            parsed = json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {e}")
            return None

        # Create and save lead score
        score = parsed.get("score", 50)
        lead_score = LeadScore(
            contact_id=contact_id,
            score=score,
            category=_get_score_category(score),
            confidence=parsed.get("confidence", 0.5),
            factors=parsed.get("factors", {}),
            explanation=parsed.get("explanation", ""),
            recommendations=parsed.get("recommendations", []),
            calculated_at=datetime.utcnow(),
            model_version=settings.OLLAMA_MODEL,
            status=PredictionStatus.ACTIVE,
            expires_at=datetime.utcnow() + timedelta(days=7),
            context_snapshot=context,
        )

        # Expire old scores for this contact
        old_scores_stmt = (
            select(LeadScore)
            .where(LeadScore.contact_id == contact_id)
            .where(LeadScore.status == PredictionStatus.ACTIVE)
        )
        old_scores = session.exec(old_scores_stmt).all()
        for old_score in old_scores:
            old_score.status = PredictionStatus.SUPERSEDED
            session.add(old_score)

        session.add(lead_score)
        session.commit()
        session.refresh(lead_score)

        return LeadScoreResponse(
            id=lead_score.id,
            contact_id=lead_score.contact_id,
            score=lead_score.score,
            category=lead_score.category,
            confidence=lead_score.confidence,
            factors=lead_score.factors,
            explanation=lead_score.explanation,
            recommendations=lead_score.recommendations,
            calculated_at=lead_score.calculated_at,
            model_version=lead_score.model_version,
        )

    async def forecast_deal(
        self,
        deal_id: UUID,
        session: Session,
    ) -> Optional[DealForecastResponse]:
        """
        Analyze a deal and generate a forecast.

        Considers:
        - Deal stage and history
        - Deal value and timeline
        - Associated contact/company engagement
        - Historical win/loss patterns
        - Activity patterns

        Returns:
            DealForecastResponse with probability, timing, and risk factors
        """
        if not settings.AI_PREDICTIONS_ENABLED:
            logger.warning("AI predictions are disabled")
            return None

        # Fetch deal data with relationships
        deal = session.get(Deal, deal_id)
        if not deal:
            logger.error(f"Deal {deal_id} not found")
            return None

        # Fetch activities related to the deal's contact/company
        activities = []
        if deal.contact_id:
            activities_stmt = (
                select(Activity)
                .where(Activity.contact_id == deal.contact_id)
                .order_by(Activity.created_at.desc())
                .limit(15)
            )
            activities = session.exec(activities_stmt).all()

        # Build context for LLM
        context = self._build_deal_context(deal, activities)

        # Generate forecast using LLM
        system_prompt = """You are an expert sales forecaster. Analyze the provided deal data and generate a comprehensive forecast.

You must respond with valid JSON matching this exact structure:
{
    "close_probability": <float 0.0-1.0>,
    "predicted_amount": <float>,
    "amount_confidence_low": <float>,
    "amount_confidence_high": <float>,
    "days_to_close": <integer or null>,
    "risk_level": "<low|medium|high|critical>",
    "risk_factors": ["<risk 1>", "<risk 2>"],
    "positive_signals": ["<signal 1>", "<signal 2>"],
    "analysis": "<2-3 sentence analysis>",
    "recommended_actions": ["<action 1>", "<action 2>", "<action 3>"],
    "confidence": <float 0.0-1.0>
}

Consider:
- Current deal stage and time in stage
- Deal value relative to typical deals
- Expected close date vs. actual progress
- Activity patterns and engagement
- Any mentioned concerns or objections"""

        user_prompt = f"""Analyze this deal and provide a forecast:

DEAL DATA:
{json.dumps(context, indent=2, default=str)}

Provide your analysis as JSON."""

        result = await llm_service.chat(
            messages=[{"role": "user", "content": user_prompt}],
            system_prompt=system_prompt,
            temperature=0.3,
        )

        if not result["success"]:
            logger.error(f"LLM forecasting failed: {result.get('error')}")
            return None

        # Parse LLM response
        try:
            content = result["content"].strip()
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join(lines[1:-1])

            parsed = json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {e}")
            return None

        # Calculate predicted close date
        days_to_close = parsed.get("days_to_close")
        predicted_close_date = None
        if days_to_close:
            predicted_close_date = (datetime.utcnow() + timedelta(days=days_to_close)).date()

        # Map risk level string to enum
        risk_level_str = parsed.get("risk_level", "medium").lower()
        risk_level_map = {
            "low": RiskLevel.LOW,
            "medium": RiskLevel.MEDIUM,
            "high": RiskLevel.HIGH,
            "critical": RiskLevel.CRITICAL,
        }
        risk_level = risk_level_map.get(risk_level_str, RiskLevel.MEDIUM)

        # Create and save forecast
        forecast = DealForecast(
            deal_id=deal_id,
            close_probability=parsed.get("close_probability", 0.5),
            predicted_amount=Decimal(str(parsed.get("predicted_amount", float(deal.value)))),
            amount_confidence_low=Decimal(str(parsed.get("amount_confidence_low", float(deal.value) * 0.8))),
            amount_confidence_high=Decimal(str(parsed.get("amount_confidence_high", float(deal.value) * 1.2))),
            predicted_close_date=predicted_close_date,
            days_to_close=days_to_close,
            confidence=parsed.get("confidence", 0.5),
            risk_level=risk_level,
            risk_factors=parsed.get("risk_factors", []),
            positive_signals=parsed.get("positive_signals", []),
            analysis=parsed.get("analysis", ""),
            recommended_actions=parsed.get("recommended_actions", []),
            calculated_at=datetime.utcnow(),
            model_version=settings.OLLAMA_MODEL,
            status=PredictionStatus.ACTIVE,
            expires_at=datetime.utcnow() + timedelta(days=7),
            context_snapshot=context,
        )

        # Expire old forecasts for this deal
        old_forecasts_stmt = (
            select(DealForecast)
            .where(DealForecast.deal_id == deal_id)
            .where(DealForecast.status == PredictionStatus.ACTIVE)
        )
        old_forecasts = session.exec(old_forecasts_stmt).all()
        for old_forecast in old_forecasts:
            old_forecast.status = PredictionStatus.SUPERSEDED
            session.add(old_forecast)

        session.add(forecast)
        session.commit()
        session.refresh(forecast)

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

    async def assess_churn_risk(
        self,
        contact_id: UUID,
        session: Session,
    ) -> Optional[ChurnRiskResponse]:
        """
        Assess churn risk for a customer contact.

        Considers:
        - Activity recency and frequency
        - Engagement trends
        - Support interactions
        - Product usage (if available)
        - Relationship history

        Returns:
            ChurnRiskResponse with risk score, signals, and retention actions
        """
        if not settings.AI_PREDICTIONS_ENABLED:
            logger.warning("AI predictions are disabled")
            return None

        # Fetch contact data
        contact = session.get(Contact, contact_id)
        if not contact:
            logger.error(f"Contact {contact_id} not found")
            return None

        # Only assess churn for customers
        if contact.status.value not in ["customer", "churned"]:
            logger.info(f"Contact {contact_id} is not a customer, skipping churn assessment")
            return None

        # Fetch activities
        activities_stmt = (
            select(Activity)
            .where(Activity.contact_id == contact_id)
            .order_by(Activity.created_at.desc())
            .limit(30)
        )
        activities = session.exec(activities_stmt).all()

        # Build context for LLM
        context = self._build_churn_context(contact, activities)

        # Generate churn assessment using LLM
        system_prompt = """You are an expert customer success analyst. Analyze the provided customer data and assess their churn risk.

You must respond with valid JSON matching this exact structure:
{
    "risk_score": <integer 0-100>,
    "risk_level": "<low|medium|high|critical>",
    "warning_signals": ["<signal 1>", "<signal 2>"],
    "factor_weights": {
        "inactivity": <float 0.0-1.0>,
        "engagement_decline": <float 0.0-1.0>,
        "support_issues": <float 0.0-1.0>,
        "relationship_health": <float 0.0-1.0>
    },
    "analysis": "<2-3 sentence analysis>",
    "retention_actions": ["<action 1>", "<action 2>", "<action 3>"],
    "estimated_days_to_churn": <integer or null>,
    "confidence": <float 0.0-1.0>
}

Higher risk_score means MORE likely to churn.

Consider:
- Days since last meaningful interaction
- Trend in activity frequency
- Any negative interactions or complaints
- Overall engagement pattern
- Value of the customer relationship"""

        user_prompt = f"""Assess churn risk for this customer:

CUSTOMER DATA:
{json.dumps(context, indent=2, default=str)}

Provide your analysis as JSON."""

        result = await llm_service.chat(
            messages=[{"role": "user", "content": user_prompt}],
            system_prompt=system_prompt,
            temperature=0.3,
        )

        if not result["success"]:
            logger.error(f"LLM churn assessment failed: {result.get('error')}")
            return None

        # Parse LLM response
        try:
            content = result["content"].strip()
            if content.startswith("```"):
                lines = content.split("\n")
                content = "\n".join(lines[1:-1])

            parsed = json.loads(content)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM response: {e}")
            return None

        # Map risk level
        risk_score = parsed.get("risk_score", 50)
        risk_level = _get_risk_level(risk_score)

        # Create and save churn risk
        churn_risk = ChurnRisk(
            contact_id=contact_id,
            risk_score=risk_score,
            risk_level=risk_level,
            confidence=parsed.get("confidence", 0.5),
            warning_signals=parsed.get("warning_signals", []),
            factor_weights=parsed.get("factor_weights", {}),
            analysis=parsed.get("analysis", ""),
            retention_actions=parsed.get("retention_actions", []),
            estimated_days_to_churn=parsed.get("estimated_days_to_churn"),
            calculated_at=datetime.utcnow(),
            model_version=settings.OLLAMA_MODEL,
            status=PredictionStatus.ACTIVE,
            expires_at=datetime.utcnow() + timedelta(days=7),
            context_snapshot=context,
        )

        # Expire old assessments
        old_risks_stmt = (
            select(ChurnRisk)
            .where(ChurnRisk.contact_id == contact_id)
            .where(ChurnRisk.status == PredictionStatus.ACTIVE)
        )
        old_risks = session.exec(old_risks_stmt).all()
        for old_risk in old_risks:
            old_risk.status = PredictionStatus.SUPERSEDED
            session.add(old_risk)

        session.add(churn_risk)
        session.commit()
        session.refresh(churn_risk)

        return ChurnRiskResponse(
            id=churn_risk.id,
            contact_id=churn_risk.contact_id,
            risk_score=churn_risk.risk_score,
            risk_level=churn_risk.risk_level,
            confidence=churn_risk.confidence,
            warning_signals=churn_risk.warning_signals,
            factor_weights=churn_risk.factor_weights,
            analysis=churn_risk.analysis,
            retention_actions=churn_risk.retention_actions,
            estimated_days_to_churn=churn_risk.estimated_days_to_churn,
            calculated_at=churn_risk.calculated_at,
            model_version=churn_risk.model_version,
        )

    def _build_lead_context(self, contact: Contact, activities: list) -> dict:
        """Build context dictionary for lead scoring."""
        # Calculate profile completeness
        profile_fields = [
            contact.email,
            contact.phone,
            contact.job_title,
            contact.department,
            contact.company_id,
        ]
        profile_completeness = sum(1 for f in profile_fields if f) / len(profile_fields) * 100

        # Activity summary
        activity_summary = {
            "total_activities": len(activities),
            "activity_types": {},
            "days_since_last_activity": None,
        }

        if activities:
            for act in activities:
                act_type = act.type.value if hasattr(act.type, "value") else str(act.type)
                activity_summary["activity_types"][act_type] = activity_summary["activity_types"].get(act_type, 0) + 1

            days_since = (datetime.utcnow() - activities[0].created_at).days
            activity_summary["days_since_last_activity"] = days_since

        return {
            "contact": {
                "first_name": contact.first_name,
                "last_name": contact.last_name,
                "email": contact.email,
                "phone": contact.phone,
                "job_title": contact.job_title,
                "department": contact.department,
                "status": contact.status.value,
                "source": contact.source,
                "has_company": contact.company_id is not None,
                "created_at": contact.created_at.isoformat(),
            },
            "profile_completeness": profile_completeness,
            "activity_summary": activity_summary,
            "recent_activities": [
                {
                    "type": act.type.value if hasattr(act.type, "value") else str(act.type),
                    "subject": act.subject,
                    "date": act.created_at.isoformat(),
                }
                for act in activities[:5]
            ],
        }

    def _build_deal_context(self, deal: Deal, activities: list) -> dict:
        """Build context dictionary for deal forecasting."""
        # Calculate days in current stage
        days_in_stage = (datetime.utcnow() - deal.updated_at).days if deal.updated_at else 0

        # Calculate days since creation
        days_since_creation = (datetime.utcnow() - deal.created_at).days

        # Days to expected close
        days_to_expected_close = None
        if deal.expected_close_date:
            days_to_expected_close = (deal.expected_close_date - datetime.utcnow().date()).days

        return {
            "deal": {
                "name": deal.name,
                "value": float(deal.value),
                "currency": deal.currency,
                "priority": deal.priority,
                "source": deal.source,
                "description": deal.description,
                "expected_close_date": deal.expected_close_date.isoformat() if deal.expected_close_date else None,
                "days_to_expected_close": days_to_expected_close,
                "created_at": deal.created_at.isoformat(),
                "days_since_creation": days_since_creation,
                "days_in_current_stage": days_in_stage,
                "has_contact": deal.contact_id is not None,
                "has_company": deal.company_id is not None,
            },
            "activity_summary": {
                "total_activities": len(activities),
                "days_since_last_activity": (datetime.utcnow() - activities[0].created_at).days if activities else None,
            },
            "recent_activities": [
                {
                    "type": act.type.value if hasattr(act.type, "value") else str(act.type),
                    "subject": act.subject,
                    "date": act.created_at.isoformat(),
                }
                for act in activities[:5]
            ],
        }

    def _build_churn_context(self, contact: Contact, activities: list) -> dict:
        """Build context dictionary for churn risk assessment."""
        # Calculate engagement metrics
        now = datetime.utcnow()

        # Activity trends
        last_30_days = [a for a in activities if (now - a.created_at).days <= 30]
        last_60_days = [a for a in activities if (now - a.created_at).days <= 60]
        last_90_days = [a for a in activities if (now - a.created_at).days <= 90]

        return {
            "contact": {
                "first_name": contact.first_name,
                "last_name": contact.last_name,
                "status": contact.status.value,
                "created_at": contact.created_at.isoformat(),
                "days_as_customer": (now - contact.created_at).days,
            },
            "engagement_trends": {
                "activities_last_30_days": len(last_30_days),
                "activities_last_60_days": len(last_60_days),
                "activities_last_90_days": len(last_90_days),
                "trend": "declining" if len(last_30_days) < len(last_60_days) / 2 else "stable",
            },
            "last_activity": {
                "days_ago": (now - activities[0].created_at).days if activities else None,
                "type": activities[0].type.value if activities and hasattr(activities[0].type, "value") else None,
            },
            "recent_activities": [
                {
                    "type": act.type.value if hasattr(act.type, "value") else str(act.type),
                    "subject": act.subject,
                    "date": act.created_at.isoformat(),
                }
                for act in activities[:10]
            ],
        }


# Global service instance
ai_scoring_service = AIScoringService()
