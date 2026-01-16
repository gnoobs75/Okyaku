"""Service for AI-powered insights and anomaly detection."""

import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlmodel import Session, select, func

from app.core.config import settings
from app.models.contact import Contact, ContactStatus
from app.models.deal import Deal
from app.models.activity import Activity
from app.models.insights import (
    Insight,
    InsightType,
    InsightCategory,
    InsightSeverity,
    InsightStatus,
    InsightResponse,
    InsightsSummary,
)
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


class InsightsService:
    """Service for generating and managing AI insights."""

    async def generate_insights(self, session: Session) -> list[InsightResponse]:
        """
        Run anomaly detection and generate new insights.

        Analyzes various CRM metrics and creates insights for anomalies.
        """
        new_insights = []

        # Run various anomaly detections
        new_insights.extend(await self._detect_deal_velocity_anomalies(session))
        new_insights.extend(await self._detect_pipeline_health_issues(session))
        new_insights.extend(await self._detect_engagement_anomalies(session))
        new_insights.extend(await self._detect_conversion_trends(session))
        new_insights.extend(await self._detect_activity_patterns(session))

        return new_insights

    async def _detect_deal_velocity_anomalies(
        self, session: Session
    ) -> list[InsightResponse]:
        """Detect unusual deal velocity patterns."""
        insights = []

        # Get deals created in last 7 days vs previous 7 days
        now = datetime.utcnow()
        week_ago = now - timedelta(days=7)
        two_weeks_ago = now - timedelta(days=14)

        recent_deals = session.exec(
            select(Deal).where(Deal.created_at >= week_ago)
        ).all()
        previous_deals = session.exec(
            select(Deal)
            .where(Deal.created_at >= two_weeks_ago)
            .where(Deal.created_at < week_ago)
        ).all()

        recent_count = len(recent_deals)
        previous_count = len(previous_deals)
        recent_value = sum(float(d.value) for d in recent_deals)
        previous_value = sum(float(d.value) for d in previous_deals)

        # Check for significant changes
        if previous_count > 0:
            count_change = ((recent_count - previous_count) / previous_count) * 100

            if abs(count_change) > 50:  # More than 50% change
                is_increase = count_change > 0
                severity = (
                    InsightSeverity.HIGH if abs(count_change) > 100
                    else InsightSeverity.MEDIUM
                )
                insight_type = InsightType.TREND if is_increase else InsightType.ANOMALY

                insight = Insight(
                    type=insight_type,
                    category=InsightCategory.DEAL_VELOCITY,
                    severity=severity,
                    title=f"Deal velocity {'surge' if is_increase else 'drop'}",
                    description=f"New deals {'increased' if is_increase else 'decreased'} by {abs(count_change):.0f}% this week compared to last week.",
                    details={
                        "recent_count": recent_count,
                        "previous_count": previous_count,
                        "recent_value": recent_value,
                        "previous_value": previous_value,
                    },
                    metric_name="deal_count_weekly",
                    metric_value=recent_count,
                    metric_baseline=previous_count,
                    deviation_percent=count_change,
                    suggested_action=(
                        "Review lead sources to capitalize on momentum"
                        if is_increase
                        else "Investigate potential pipeline issues"
                    ),
                    confidence=0.85,
                )
                session.add(insight)
                session.commit()
                session.refresh(insight)
                insights.append(self._to_response(insight))

        # Check for high-value deal anomalies
        if recent_deals:
            avg_value = recent_value / recent_count
            high_value_threshold = avg_value * 3  # 3x average

            for deal in recent_deals:
                if float(deal.value) > high_value_threshold:
                    insight = Insight(
                        type=InsightType.OPPORTUNITY,
                        category=InsightCategory.REVENUE,
                        severity=InsightSeverity.HIGH,
                        title=f"High-value deal: {deal.name}",
                        description=f"Deal worth ${float(deal.value):,.0f} is significantly above average (${avg_value:,.0f}). Prioritize for attention.",
                        details={
                            "deal_name": deal.name,
                            "deal_value": float(deal.value),
                            "average_value": avg_value,
                        },
                        deal_id=deal.id,
                        metric_name="deal_value",
                        metric_value=float(deal.value),
                        metric_baseline=avg_value,
                        deviation_percent=((float(deal.value) - avg_value) / avg_value) * 100,
                        suggested_action="Schedule executive involvement for this strategic deal",
                        confidence=0.9,
                    )
                    session.add(insight)
                    session.commit()
                    session.refresh(insight)
                    insights.append(self._to_response(insight))

        return insights

    async def _detect_pipeline_health_issues(
        self, session: Session
    ) -> list[InsightResponse]:
        """Detect pipeline health issues."""
        insights = []

        # Check for stale deals (no activity in 14+ days)
        stale_threshold = datetime.utcnow() - timedelta(days=14)

        deals = session.exec(select(Deal)).all()
        stale_deals = []

        for deal in deals:
            last_activity = session.exec(
                select(Activity)
                .where(Activity.deal_id == deal.id)
                .order_by(Activity.created_at.desc())
                .limit(1)
            ).first()

            if not last_activity or last_activity.created_at < stale_threshold:
                stale_deals.append(deal)

        if len(stale_deals) > 0:
            stale_value = sum(float(d.value) for d in stale_deals)

            insight = Insight(
                type=InsightType.RISK,
                category=InsightCategory.PIPELINE_HEALTH,
                severity=InsightSeverity.HIGH if len(stale_deals) > 5 else InsightSeverity.MEDIUM,
                title=f"{len(stale_deals)} stale deals detected",
                description=f"Found {len(stale_deals)} deals with no activity in 14+ days, representing ${stale_value:,.0f} in pipeline value.",
                details={
                    "stale_deal_count": len(stale_deals),
                    "stale_value": stale_value,
                    "deal_ids": [str(d.id) for d in stale_deals[:10]],
                },
                metric_name="stale_deals",
                metric_value=len(stale_deals),
                metric_baseline=0,
                deviation_percent=100,
                suggested_action="Review stale deals and schedule follow-up activities",
                confidence=0.95,
            )
            session.add(insight)
            session.commit()
            session.refresh(insight)
            insights.append(self._to_response(insight))

        return insights

    async def _detect_engagement_anomalies(
        self, session: Session
    ) -> list[InsightResponse]:
        """Detect contact engagement anomalies."""
        insights = []

        # Find contacts with declining engagement (previously active, now quiet)
        month_ago = datetime.utcnow() - timedelta(days=30)
        two_months_ago = datetime.utcnow() - timedelta(days=60)

        customers = session.exec(
            select(Contact).where(Contact.status == ContactStatus.CUSTOMER)
        ).all()

        disengaged_customers = []
        for customer in customers:
            # Recent activities
            recent = session.exec(
                select(func.count(Activity.id))
                .where(Activity.contact_id == customer.id)
                .where(Activity.created_at >= month_ago)
            ).one()

            # Previous period activities
            previous = session.exec(
                select(func.count(Activity.id))
                .where(Activity.contact_id == customer.id)
                .where(Activity.created_at >= two_months_ago)
                .where(Activity.created_at < month_ago)
            ).one()

            # If previously had activities but none recently
            if previous >= 3 and recent == 0:
                disengaged_customers.append(customer)

        if disengaged_customers:
            insight = Insight(
                type=InsightType.RISK,
                category=InsightCategory.CHURN_RISK,
                severity=InsightSeverity.HIGH,
                title=f"{len(disengaged_customers)} customers showing disengagement",
                description=f"Found {len(disengaged_customers)} customers who were active last month but have had no engagement in the past 30 days.",
                details={
                    "disengaged_count": len(disengaged_customers),
                    "contact_ids": [str(c.id) for c in disengaged_customers[:10]],
                    "contact_names": [f"{c.first_name} {c.last_name}" for c in disengaged_customers[:10]],
                },
                metric_name="disengaged_customers",
                metric_value=len(disengaged_customers),
                metric_baseline=0,
                suggested_action="Initiate re-engagement campaigns for at-risk customers",
                confidence=0.8,
            )
            session.add(insight)
            session.commit()
            session.refresh(insight)
            insights.append(self._to_response(insight))

        return insights

    async def _detect_conversion_trends(
        self, session: Session
    ) -> list[InsightResponse]:
        """Detect conversion rate trends."""
        insights = []

        # Calculate conversion from leads to opportunities
        total_leads = session.exec(
            select(func.count(Contact.id)).where(Contact.status == ContactStatus.LEAD)
        ).one()

        total_opportunities = session.exec(
            select(func.count(Contact.id)).where(Contact.status == ContactStatus.OPPORTUNITY)
        ).one()

        total_customers = session.exec(
            select(func.count(Contact.id)).where(Contact.status == ContactStatus.CUSTOMER)
        ).one()

        # Check for conversion bottlenecks
        if total_leads > 10 and total_opportunities < total_leads * 0.1:
            insight = Insight(
                type=InsightType.ALERT,
                category=InsightCategory.CONVERSION,
                severity=InsightSeverity.MEDIUM,
                title="Low lead-to-opportunity conversion",
                description=f"Only {total_opportunities} of {total_leads} leads ({(total_opportunities/total_leads)*100:.1f}%) have converted to opportunities. Consider reviewing lead quality or qualification process.",
                details={
                    "total_leads": total_leads,
                    "total_opportunities": total_opportunities,
                    "conversion_rate": (total_opportunities / total_leads) * 100 if total_leads > 0 else 0,
                },
                metric_name="lead_to_opportunity_rate",
                metric_value=(total_opportunities / total_leads) * 100 if total_leads > 0 else 0,
                metric_baseline=20,  # Assume 20% is typical
                suggested_action="Review lead qualification criteria and sales process",
                confidence=0.75,
            )
            session.add(insight)
            session.commit()
            session.refresh(insight)
            insights.append(self._to_response(insight))

        return insights

    async def _detect_activity_patterns(
        self, session: Session
    ) -> list[InsightResponse]:
        """Detect unusual activity patterns."""
        insights = []

        # Activity volume today vs average
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = today_start - timedelta(days=7)

        today_activities = session.exec(
            select(func.count(Activity.id)).where(Activity.created_at >= today_start)
        ).one()

        week_activities = session.exec(
            select(func.count(Activity.id))
            .where(Activity.created_at >= week_ago)
            .where(Activity.created_at < today_start)
        ).one()

        if week_activities > 0:
            daily_avg = week_activities / 7

            if today_activities > 0 and daily_avg > 0:
                deviation = ((today_activities - daily_avg) / daily_avg) * 100

                if deviation > 100:  # Double the average
                    insight = Insight(
                        type=InsightType.MILESTONE,
                        category=InsightCategory.ACTIVITY,
                        severity=InsightSeverity.INFO,
                        title="Above-average activity day",
                        description=f"Today's activity count ({today_activities}) is {deviation:.0f}% above the 7-day average ({daily_avg:.1f}).",
                        details={
                            "today_count": today_activities,
                            "daily_average": daily_avg,
                        },
                        metric_name="daily_activities",
                        metric_value=today_activities,
                        metric_baseline=daily_avg,
                        deviation_percent=deviation,
                        confidence=0.9,
                    )
                    session.add(insight)
                    session.commit()
                    session.refresh(insight)
                    insights.append(self._to_response(insight))

        return insights

    async def get_insights(
        self,
        session: Session,
        type: Optional[InsightType] = None,
        category: Optional[InsightCategory] = None,
        severity: Optional[InsightSeverity] = None,
        status: Optional[InsightStatus] = None,
        limit: int = 20,
    ) -> list[InsightResponse]:
        """Get insights with optional filters."""
        stmt = select(Insight)

        if type:
            stmt = stmt.where(Insight.type == type)
        if category:
            stmt = stmt.where(Insight.category == category)
        if severity:
            stmt = stmt.where(Insight.severity == severity)
        if status:
            stmt = stmt.where(Insight.status == status)

        stmt = stmt.order_by(
            Insight.severity.asc(),
            Insight.detected_at.desc(),
        ).limit(limit)

        insights = session.exec(stmt).all()
        return [self._to_response(i) for i in insights]

    async def get_summary(self, session: Session) -> InsightsSummary:
        """Get insights summary."""
        all_insights = session.exec(select(Insight)).all()

        by_type: dict = {}
        by_severity: dict = {}
        by_category: dict = {}
        new_count = 0
        critical_count = 0

        for insight in all_insights:
            by_type[insight.type.value] = by_type.get(insight.type.value, 0) + 1
            by_severity[insight.severity.value] = by_severity.get(insight.severity.value, 0) + 1
            by_category[insight.category.value] = by_category.get(insight.category.value, 0) + 1

            if insight.status == InsightStatus.NEW:
                new_count += 1
            if insight.severity == InsightSeverity.CRITICAL:
                critical_count += 1

        # Get recent insights
        recent = session.exec(
            select(Insight)
            .order_by(Insight.detected_at.desc())
            .limit(5)
        ).all()

        return InsightsSummary(
            total_insights=len(all_insights),
            by_type=by_type,
            by_severity=by_severity,
            by_category=by_category,
            new_insights=new_count,
            critical_insights=critical_count,
            recent_insights=[self._to_response(i) for i in recent],
        )

    async def update_insight(
        self,
        insight_id: UUID,
        status: InsightStatus,
        action_taken: Optional[str],
        session: Session,
    ) -> Optional[InsightResponse]:
        """Update insight status."""
        insight = session.get(Insight, insight_id)
        if not insight:
            return None

        insight.status = status
        if action_taken:
            insight.action_taken = action_taken
        if status == InsightStatus.ACKNOWLEDGED:
            insight.acknowledged_at = datetime.utcnow()

        session.add(insight)
        session.commit()
        session.refresh(insight)

        return self._to_response(insight)

    def _to_response(self, insight: Insight) -> InsightResponse:
        """Convert model to response."""
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


# Singleton instance
insights_service = InsightsService()
