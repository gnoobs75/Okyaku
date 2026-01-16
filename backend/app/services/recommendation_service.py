"""Service for AI-powered recommendations and next-best-actions."""

import json
import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlmodel import Session, select

from app.core.config import settings
from app.models.activity import Activity
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.recommendations import (
    Recommendation,
    RecommendationType,
    RecommendationPriority,
    RecommendationStatus,
    RecommendationResponse,
)
from app.models.ai_predictions import LeadScore, DealForecast, ChurnRisk, PredictionStatus
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


class RecommendationService:
    """Service for generating and managing AI recommendations."""

    async def generate_contact_recommendations(
        self,
        contact_id: UUID,
        session: Session,
    ) -> list[RecommendationResponse]:
        """Generate recommendations for a specific contact."""
        contact = session.get(Contact, contact_id)
        if not contact:
            return []

        # Get related data
        activities = session.exec(
            select(Activity)
            .where(Activity.contact_id == contact_id)
            .order_by(Activity.created_at.desc())
            .limit(10)
        ).all()

        deals = session.exec(
            select(Deal).where(Deal.contact_id == contact_id)
        ).all()

        # Get existing predictions
        lead_score = session.exec(
            select(LeadScore)
            .where(LeadScore.contact_id == contact_id)
            .where(LeadScore.status == PredictionStatus.ACTIVE)
            .order_by(LeadScore.calculated_at.desc())
            .limit(1)
        ).first()

        churn_risk = session.exec(
            select(ChurnRisk)
            .where(ChurnRisk.contact_id == contact_id)
            .where(ChurnRisk.status == PredictionStatus.ACTIVE)
            .order_by(ChurnRisk.calculated_at.desc())
            .limit(1)
        ).first()

        # Build context
        context = self._build_contact_context(contact, activities, deals, lead_score, churn_risk)

        # Generate recommendations via LLM
        recommendations = await self._generate_recommendations_via_llm(
            context=context,
            entity_type="contact",
            entity_id=contact_id,
            session=session,
        )

        return recommendations

    async def generate_deal_recommendations(
        self,
        deal_id: UUID,
        session: Session,
    ) -> list[RecommendationResponse]:
        """Generate recommendations for a specific deal."""
        deal = session.get(Deal, deal_id)
        if not deal:
            return []

        # Get related data
        contact = session.get(Contact, deal.contact_id) if deal.contact_id else None

        activities = session.exec(
            select(Activity)
            .where(Activity.deal_id == deal_id)
            .order_by(Activity.created_at.desc())
            .limit(10)
        ).all()

        # Get existing forecast
        forecast = session.exec(
            select(DealForecast)
            .where(DealForecast.deal_id == deal_id)
            .where(DealForecast.status == PredictionStatus.ACTIVE)
            .order_by(DealForecast.calculated_at.desc())
            .limit(1)
        ).first()

        # Build context
        context = self._build_deal_context(deal, contact, activities, forecast)

        # Generate recommendations via LLM
        recommendations = await self._generate_recommendations_via_llm(
            context=context,
            entity_type="deal",
            entity_id=deal_id,
            session=session,
        )

        return recommendations

    async def get_next_best_actions(
        self,
        session: Session,
        limit: int = 10,
    ) -> dict:
        """Get prioritized next-best-actions across all entities."""
        # Get pending recommendations ordered by priority and score
        stmt = (
            select(Recommendation)
            .where(Recommendation.status == RecommendationStatus.PENDING)
            .where(
                (Recommendation.expires_at == None) |
                (Recommendation.expires_at > datetime.utcnow())
            )
            .order_by(
                Recommendation.priority.asc(),  # critical < high < medium < low
                Recommendation.impact_score.desc(),
                Recommendation.urgency_score.desc(),
            )
            .limit(limit * 3)  # Get more to categorize
        )
        recommendations = session.exec(stmt).all()

        # Categorize
        contact_actions = []
        deal_actions = []
        follow_ups = []

        for rec in recommendations:
            response = RecommendationResponse(
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

            if rec.type == RecommendationType.CONTACT_ACTION:
                contact_actions.append(response)
            elif rec.type == RecommendationType.DEAL_ACTION:
                deal_actions.append(response)
            elif rec.type == RecommendationType.FOLLOW_UP:
                follow_ups.append(response)

        # Get top priorities (highest impact + urgency)
        all_responses = [
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
        ]
        top_priorities = sorted(
            all_responses,
            key=lambda x: (
                0 if x.priority == RecommendationPriority.CRITICAL else
                1 if x.priority == RecommendationPriority.HIGH else
                2 if x.priority == RecommendationPriority.MEDIUM else 3,
                -(x.impact_score + x.urgency_score)
            )
        )[:limit]

        return {
            "contact_actions": contact_actions[:limit],
            "deal_actions": deal_actions[:limit],
            "follow_ups": follow_ups[:limit],
            "top_priorities": top_priorities,
            "generated_at": datetime.utcnow(),
        }

    async def act_on_recommendation(
        self,
        recommendation_id: UUID,
        action: str,
        notes: Optional[str],
        session: Session,
    ) -> Optional[RecommendationResponse]:
        """Mark a recommendation as accepted, dismissed, or completed."""
        rec = session.get(Recommendation, recommendation_id)
        if not rec:
            return None

        if action == "accept":
            rec.status = RecommendationStatus.ACCEPTED
        elif action == "dismiss":
            rec.status = RecommendationStatus.DISMISSED
        elif action == "complete":
            rec.status = RecommendationStatus.COMPLETED
        else:
            return None

        rec.acted_on_at = datetime.utcnow()
        if notes:
            rec.context_data["action_notes"] = notes

        session.add(rec)
        session.commit()
        session.refresh(rec)

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

    def _build_contact_context(
        self,
        contact: Contact,
        activities: list,
        deals: list,
        lead_score: Optional[LeadScore],
        churn_risk: Optional[ChurnRisk],
    ) -> str:
        """Build context string for contact recommendations."""
        context_parts = [
            f"Contact: {contact.first_name} {contact.last_name}",
            f"Email: {contact.email}",
            f"Status: {contact.status.value if contact.status else 'unknown'}",
            f"Source: {contact.source.value if contact.source else 'unknown'}",
        ]

        if contact.company:
            context_parts.append(f"Company: {contact.company.name}")

        if lead_score:
            context_parts.append(f"\nLead Score: {lead_score.score}/100 ({lead_score.category.value})")
            context_parts.append(f"Score Explanation: {lead_score.explanation}")

        if churn_risk:
            context_parts.append(f"\nChurn Risk: {churn_risk.risk_score}/100 ({churn_risk.risk_level.value})")
            context_parts.append(f"Risk Analysis: {churn_risk.analysis}")

        if activities:
            context_parts.append("\nRecent Activities:")
            for act in activities[:5]:
                context_parts.append(f"- {act.type.value}: {act.subject or 'No subject'} ({act.created_at.strftime('%Y-%m-%d')})")

        if deals:
            context_parts.append("\nAssociated Deals:")
            for deal in deals:
                context_parts.append(f"- {deal.name}: ${deal.value} ({deal.stage.value if deal.stage else 'unknown'})")

        # Calculate days since last activity
        if activities:
            last_activity = activities[0]
            days_since = (datetime.utcnow() - last_activity.created_at).days
            context_parts.append(f"\nDays since last activity: {days_since}")

        return "\n".join(context_parts)

    def _build_deal_context(
        self,
        deal: Deal,
        contact: Optional[Contact],
        activities: list,
        forecast: Optional[DealForecast],
    ) -> str:
        """Build context string for deal recommendations."""
        context_parts = [
            f"Deal: {deal.name}",
            f"Value: ${deal.value}",
            f"Stage: {deal.stage.value if deal.stage else 'unknown'}",
        ]

        if deal.expected_close_date:
            days_to_close = (deal.expected_close_date - datetime.utcnow().date()).days
            context_parts.append(f"Expected Close: {deal.expected_close_date} ({days_to_close} days)")

        if contact:
            context_parts.append(f"\nContact: {contact.first_name} {contact.last_name}")
            context_parts.append(f"Contact Status: {contact.status.value if contact.status else 'unknown'}")

        if forecast:
            context_parts.append(f"\nAI Forecast:")
            context_parts.append(f"Close Probability: {forecast.close_probability * 100:.0f}%")
            context_parts.append(f"Risk Level: {forecast.risk_level.value}")
            context_parts.append(f"Analysis: {forecast.analysis}")
            if forecast.risk_factors:
                context_parts.append(f"Risk Factors: {', '.join(forecast.risk_factors[:3])}")

        if activities:
            context_parts.append("\nRecent Activities:")
            for act in activities[:5]:
                context_parts.append(f"- {act.type.value}: {act.subject or 'No subject'} ({act.created_at.strftime('%Y-%m-%d')})")

            # Calculate days since last activity
            last_activity = activities[0]
            days_since = (datetime.utcnow() - last_activity.created_at).days
            context_parts.append(f"\nDays since last activity: {days_since}")

        return "\n".join(context_parts)

    async def _generate_recommendations_via_llm(
        self,
        context: str,
        entity_type: str,  # "contact" or "deal"
        entity_id: UUID,
        session: Session,
    ) -> list[RecommendationResponse]:
        """Generate recommendations using the LLM."""
        prompt = f"""You are an AI sales assistant analyzing CRM data to provide actionable recommendations.

Based on the following {entity_type} information, generate 2-4 specific, actionable recommendations.

{context}

For each recommendation, provide:
1. A clear, specific action to take
2. Why this action is recommended (reasoning)
3. Priority level (critical, high, medium, low)
4. Impact score (0.0-1.0) - how much this could help
5. Urgency score (0.0-1.0) - how time-sensitive this is
6. If applicable, a template for an email or message

Respond with a JSON object in this exact format:
{{
  "recommendations": [
    {{
      "title": "Short action title",
      "description": "Detailed description of the recommendation",
      "reasoning": "Why this action is recommended",
      "suggested_action": "Specific action to take",
      "action_template": "Email/message template if applicable, or null",
      "priority": "high",
      "impact_score": 0.8,
      "urgency_score": 0.7,
      "type": "contact_action"
    }}
  ]
}}

Valid types: contact_action, deal_action, follow_up, outreach, engagement, upsell, retention
"""

        try:
            result = await llm_service.generate_json(
                prompt=prompt,
                system_message="You are a CRM AI assistant that analyzes sales data and provides actionable recommendations. Always respond with valid JSON.",
            )

            if not result or "recommendations" not in result:
                logger.warning("LLM returned invalid recommendations format")
                return []

            # Expire old recommendations for this entity
            if entity_type == "contact":
                old_recs = session.exec(
                    select(Recommendation)
                    .where(Recommendation.contact_id == entity_id)
                    .where(Recommendation.status == RecommendationStatus.PENDING)
                ).all()
            else:
                old_recs = session.exec(
                    select(Recommendation)
                    .where(Recommendation.deal_id == entity_id)
                    .where(Recommendation.status == RecommendationStatus.PENDING)
                ).all()

            for old_rec in old_recs:
                old_rec.status = RecommendationStatus.EXPIRED
                session.add(old_rec)

            # Create new recommendations
            responses = []
            for rec_data in result["recommendations"]:
                rec = Recommendation(
                    contact_id=entity_id if entity_type == "contact" else None,
                    deal_id=entity_id if entity_type == "deal" else None,
                    type=RecommendationType(rec_data.get("type", f"{entity_type}_action")),
                    priority=RecommendationPriority(rec_data.get("priority", "medium")),
                    title=rec_data["title"],
                    description=rec_data["description"],
                    reasoning=rec_data["reasoning"],
                    suggested_action=rec_data["suggested_action"],
                    action_template=rec_data.get("action_template"),
                    confidence=0.85,  # Default confidence
                    impact_score=rec_data.get("impact_score", 0.5),
                    urgency_score=rec_data.get("urgency_score", 0.5),
                    expires_at=datetime.utcnow() + timedelta(days=7),
                    model_version=settings.OLLAMA_MODEL,
                )
                session.add(rec)
                session.commit()
                session.refresh(rec)

                responses.append(RecommendationResponse(
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
                ))

            return responses

        except Exception as e:
            logger.error(f"Failed to generate recommendations: {e}")
            return []


# Singleton instance
recommendation_service = RecommendationService()
