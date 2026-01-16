"""API endpoints for competitor tracking and analysis."""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.competitor_tracking import (
    Competitor,
    CompetitorCreate,
    CompetitorRead,
    CompetitorUpdate,
    CompetitorMetrics,
    CompetitorMetricsRead,
    CompetitorContent,
    CompetitorContentRead,
    CompetitiveInsight,
    CompetitiveInsightRead,
    CompetitorStatus,
)

router = APIRouter()


# ==================== Competitors ====================

@router.get("/")
async def list_competitors(
    session: SessionDep,
    current_user: CurrentUserDep,
    status: Optional[CompetitorStatus] = None,
    industry: Optional[str] = None,
) -> list[CompetitorRead]:
    """List all tracked competitors."""
    user_id = UUID(current_user.sub)

    query = select(Competitor).where(Competitor.owner_id == user_id)

    if status:
        query = query.where(Competitor.status == status)
    else:
        query = query.where(Competitor.status != CompetitorStatus.ARCHIVED)

    if industry:
        query = query.where(Competitor.industry == industry)

    query = query.order_by(Competitor.total_followers.desc())
    competitors = session.exec(query).all()

    return [CompetitorRead.model_validate(c) for c in competitors]


@router.post("/")
async def create_competitor(
    session: SessionDep,
    current_user: CurrentUserDep,
    competitor: CompetitorCreate,
) -> CompetitorRead:
    """Create a new competitor to track."""
    user_id = UUID(current_user.sub)

    db_competitor = Competitor(
        **competitor.model_dump(),
        owner_id=user_id,
    )
    session.add(db_competitor)
    session.commit()
    session.refresh(db_competitor)

    return CompetitorRead.model_validate(db_competitor)


@router.get("/{competitor_id}")
async def get_competitor(
    session: SessionDep,
    current_user: CurrentUserDep,
    competitor_id: UUID,
) -> CompetitorRead:
    """Get a specific competitor."""
    user_id = UUID(current_user.sub)

    competitor = session.exec(
        select(Competitor).where(
            Competitor.id == competitor_id,
            Competitor.owner_id == user_id,
        )
    ).first()

    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    return CompetitorRead.model_validate(competitor)


@router.patch("/{competitor_id}")
async def update_competitor(
    session: SessionDep,
    current_user: CurrentUserDep,
    competitor_id: UUID,
    update: CompetitorUpdate,
) -> CompetitorRead:
    """Update a competitor."""
    user_id = UUID(current_user.sub)

    competitor = session.exec(
        select(Competitor).where(
            Competitor.id == competitor_id,
            Competitor.owner_id == user_id,
        )
    ).first()

    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(competitor, key, value)

    competitor.updated_at = datetime.utcnow()
    session.add(competitor)
    session.commit()
    session.refresh(competitor)

    return CompetitorRead.model_validate(competitor)


@router.delete("/{competitor_id}")
async def delete_competitor(
    session: SessionDep,
    current_user: CurrentUserDep,
    competitor_id: UUID,
) -> dict:
    """Delete a competitor and associated data."""
    user_id = UUID(current_user.sub)

    competitor = session.exec(
        select(Competitor).where(
            Competitor.id == competitor_id,
            Competitor.owner_id == user_id,
        )
    ).first()

    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    # Delete associated metrics
    for m in session.exec(
        select(CompetitorMetrics).where(CompetitorMetrics.competitor_id == competitor_id)
    ).all():
        session.delete(m)

    # Delete associated content
    for c in session.exec(
        select(CompetitorContent).where(CompetitorContent.competitor_id == competitor_id)
    ).all():
        session.delete(c)

    # Delete associated insights
    for i in session.exec(
        select(CompetitiveInsight).where(CompetitiveInsight.competitor_id == competitor_id)
    ).all():
        session.delete(i)

    session.delete(competitor)
    session.commit()

    return {"success": True, "message": "Competitor deleted"}


# ==================== Competitor Metrics ====================

@router.get("/{competitor_id}/metrics")
async def get_competitor_metrics(
    session: SessionDep,
    current_user: CurrentUserDep,
    competitor_id: UUID,
    platform: Optional[str] = None,
    days: int = Query(30, ge=7, le=365),
) -> dict:
    """Get historical metrics for a competitor."""
    user_id = UUID(current_user.sub)
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Verify ownership
    competitor = session.exec(
        select(Competitor).where(
            Competitor.id == competitor_id,
            Competitor.owner_id == user_id,
        )
    ).first()

    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    query = select(CompetitorMetrics).where(
        CompetitorMetrics.competitor_id == competitor_id,
        CompetitorMetrics.recorded_at >= cutoff_date,
    )

    if platform:
        query = query.where(CompetitorMetrics.platform == platform)

    query = query.order_by(CompetitorMetrics.recorded_at.asc())
    metrics = session.exec(query).all()

    # Group by platform
    platform_data = {}
    for m in metrics:
        if m.platform not in platform_data:
            platform_data[m.platform] = []
        platform_data[m.platform].append({
            "date": m.recorded_at.strftime("%Y-%m-%d"),
            "followers": m.followers,
            "follower_change": m.follower_change,
            "engagement_rate": m.engagement_rate,
            "posts": m.posts_this_period,
            "avg_likes": m.avg_likes,
            "avg_comments": m.avg_comments,
        })

    return {
        "competitor": CompetitorRead.model_validate(competitor),
        "period_days": days,
        "platform_data": platform_data,
    }


# ==================== Competitor Content ====================

@router.get("/{competitor_id}/content")
async def get_competitor_content(
    session: SessionDep,
    current_user: CurrentUserDep,
    competitor_id: UUID,
    platform: Optional[str] = None,
    top_only: bool = False,
    limit: int = Query(20, ge=1, le=100),
) -> list[CompetitorContentRead]:
    """Get tracked content from a competitor."""
    user_id = UUID(current_user.sub)

    # Verify ownership
    competitor = session.exec(
        select(Competitor).where(
            Competitor.id == competitor_id,
            Competitor.owner_id == user_id,
        )
    ).first()

    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")

    query = select(CompetitorContent).where(
        CompetitorContent.competitor_id == competitor_id,
    )

    if platform:
        query = query.where(CompetitorContent.platform == platform)

    if top_only:
        query = query.where(CompetitorContent.is_top_performer == True)

    query = query.order_by(CompetitorContent.likes.desc()).limit(limit)
    content = session.exec(query).all()

    return [CompetitorContentRead.model_validate(c) for c in content]


# ==================== Competitive Comparison ====================

@router.get("/comparison")
async def get_competitive_comparison(
    session: SessionDep,
    current_user: CurrentUserDep,
    competitor_ids: Optional[str] = Query(None, description="Comma-separated UUIDs"),
) -> dict:
    """Get comparison data across competitors."""
    user_id = UUID(current_user.sub)

    query = select(Competitor).where(
        Competitor.owner_id == user_id,
        Competitor.status == CompetitorStatus.ACTIVE,
    )

    if competitor_ids:
        ids = [UUID(id.strip()) for id in competitor_ids.split(",")]
        query = query.where(Competitor.id.in_(ids))

    competitors = session.exec(query).all()

    comparison = {
        "competitors": [],
        "metrics": {
            "followers": [],
            "engagement_rate": [],
            "posting_frequency": [],
            "avg_likes": [],
        },
    }

    for c in competitors:
        comparison["competitors"].append({
            "id": str(c.id),
            "name": c.name,
            "logo_url": c.logo_url,
        })
        comparison["metrics"]["followers"].append({
            "name": c.name,
            "value": c.total_followers,
        })
        comparison["metrics"]["engagement_rate"].append({
            "name": c.name,
            "value": c.avg_engagement_rate or 0,
        })
        comparison["metrics"]["posting_frequency"].append({
            "name": c.name,
            "value": c.posting_frequency or 0,
        })
        comparison["metrics"]["avg_likes"].append({
            "name": c.name,
            "value": c.avg_likes_per_post or 0,
        })

    return comparison


# ==================== Insights ====================

@router.get("/insights")
async def list_insights(
    session: SessionDep,
    current_user: CurrentUserDep,
    competitor_id: Optional[UUID] = None,
    insight_type: Optional[str] = None,
    unread_only: bool = False,
    limit: int = Query(20, ge=1, le=100),
) -> list[CompetitiveInsightRead]:
    """List competitive insights."""
    user_id = UUID(current_user.sub)

    query = select(CompetitiveInsight).where(
        CompetitiveInsight.owner_id == user_id,
    )

    if competitor_id:
        query = query.where(CompetitiveInsight.competitor_id == competitor_id)

    if insight_type:
        query = query.where(CompetitiveInsight.insight_type == insight_type)

    if unread_only:
        query = query.where(CompetitiveInsight.is_read == False)

    # Filter out expired insights
    query = query.where(
        (CompetitiveInsight.expires_at.is_(None)) |
        (CompetitiveInsight.expires_at > datetime.utcnow())
    )

    query = query.order_by(CompetitiveInsight.generated_at.desc()).limit(limit)
    insights = session.exec(query).all()

    return [CompetitiveInsightRead.model_validate(i) for i in insights]


@router.post("/insights/{insight_id}/read")
async def mark_insight_read(
    session: SessionDep,
    current_user: CurrentUserDep,
    insight_id: UUID,
) -> CompetitiveInsightRead:
    """Mark an insight as read."""
    user_id = UUID(current_user.sub)

    insight = session.exec(
        select(CompetitiveInsight).where(
            CompetitiveInsight.id == insight_id,
            CompetitiveInsight.owner_id == user_id,
        )
    ).first()

    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    insight.is_read = True
    session.add(insight)
    session.commit()
    session.refresh(insight)

    return CompetitiveInsightRead.model_validate(insight)


@router.post("/insights/{insight_id}/action")
async def mark_insight_actioned(
    session: SessionDep,
    current_user: CurrentUserDep,
    insight_id: UUID,
) -> CompetitiveInsightRead:
    """Mark an insight as actioned."""
    user_id = UUID(current_user.sub)

    insight = session.exec(
        select(CompetitiveInsight).where(
            CompetitiveInsight.id == insight_id,
            CompetitiveInsight.owner_id == user_id,
        )
    ).first()

    if not insight:
        raise HTTPException(status_code=404, detail="Insight not found")

    insight.is_actioned = True
    insight.actioned_at = datetime.utcnow()
    insight.is_read = True
    session.add(insight)
    session.commit()
    session.refresh(insight)

    return CompetitiveInsightRead.model_validate(insight)


# ==================== Statistics ====================

@router.get("/stats")
async def get_competitor_stats(
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Get overall competitor tracking statistics."""
    user_id = UUID(current_user.sub)

    # Total competitors
    total_competitors = session.exec(
        select(func.count()).where(
            Competitor.owner_id == user_id,
            Competitor.status == CompetitorStatus.ACTIVE,
        )
    ).one()

    # Pending insights
    pending_insights = session.exec(
        select(func.count()).where(
            CompetitiveInsight.owner_id == user_id,
            CompetitiveInsight.is_read == False,
        )
    ).one()

    # Get competitors for comparison
    competitors = session.exec(
        select(Competitor).where(
            Competitor.owner_id == user_id,
            Competitor.status == CompetitorStatus.ACTIVE,
        )
    ).all()

    # Calculate averages
    total_followers = sum(c.total_followers for c in competitors)
    avg_engagement = (
        sum(c.avg_engagement_rate or 0 for c in competitors) / len(competitors)
        if competitors else 0
    )
    avg_posting = (
        sum(c.posting_frequency or 0 for c in competitors) / len(competitors)
        if competitors else 0
    )

    # Top performer by engagement
    top_by_engagement = max(
        competitors, key=lambda c: c.avg_engagement_rate or 0, default=None
    )

    # Top performer by followers
    top_by_followers = max(
        competitors, key=lambda c: c.total_followers, default=None
    )

    # Industry breakdown
    industry_counts = {}
    for c in competitors:
        industry = c.industry or "Unknown"
        industry_counts[industry] = industry_counts.get(industry, 0) + 1

    return {
        "total_competitors": total_competitors,
        "pending_insights": pending_insights,
        "combined_followers": total_followers,
        "avg_engagement_rate": round(avg_engagement, 2),
        "avg_posting_frequency": round(avg_posting, 1),
        "top_by_engagement": {
            "id": str(top_by_engagement.id),
            "name": top_by_engagement.name,
            "engagement_rate": top_by_engagement.avg_engagement_rate,
        } if top_by_engagement else None,
        "top_by_followers": {
            "id": str(top_by_followers.id),
            "name": top_by_followers.name,
            "followers": top_by_followers.total_followers,
        } if top_by_followers else None,
        "industry_breakdown": industry_counts,
    }
