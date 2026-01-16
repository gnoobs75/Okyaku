"""API endpoints for social listening and brand monitoring."""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select, or_

from app.api.deps import CurrentUserDep, SessionDep
from app.models.social_listening import (
    TrackedKeyword,
    TrackedKeywordCreate,
    TrackedKeywordRead,
    TrackedKeywordUpdate,
    BrandMention,
    BrandMentionCreate,
    BrandMentionRead,
    BrandMentionUpdate,
    MentionAlert,
    MentionAlertRead,
    MentionSentiment,
    MentionSource,
    AlertPriority,
)

router = APIRouter()


# ==================== Tracked Keywords ====================

@router.get("/keywords")
async def list_keywords(
    session: SessionDep,
    current_user: CurrentUserDep,
    active_only: bool = True,
) -> list[TrackedKeywordRead]:
    """List all tracked keywords."""
    user_id = UUID(current_user.sub)

    query = select(TrackedKeyword).where(TrackedKeyword.owner_id == user_id)
    if active_only:
        query = query.where(TrackedKeyword.is_active == True)
    query = query.order_by(TrackedKeyword.mention_count.desc())

    keywords = session.exec(query).all()
    return [TrackedKeywordRead.model_validate(k) for k in keywords]


@router.post("/keywords")
async def create_keyword(
    session: SessionDep,
    current_user: CurrentUserDep,
    keyword: TrackedKeywordCreate,
) -> TrackedKeywordRead:
    """Create a new tracked keyword."""
    user_id = UUID(current_user.sub)

    # Check for duplicate
    existing = session.exec(
        select(TrackedKeyword).where(
            TrackedKeyword.owner_id == user_id,
            TrackedKeyword.keyword == keyword.keyword,
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Keyword already exists")

    db_keyword = TrackedKeyword(
        **keyword.model_dump(),
        owner_id=user_id,
    )
    session.add(db_keyword)
    session.commit()
    session.refresh(db_keyword)

    return TrackedKeywordRead.model_validate(db_keyword)


@router.patch("/keywords/{keyword_id}")
async def update_keyword(
    session: SessionDep,
    current_user: CurrentUserDep,
    keyword_id: UUID,
    update: TrackedKeywordUpdate,
) -> TrackedKeywordRead:
    """Update a tracked keyword."""
    user_id = UUID(current_user.sub)

    keyword = session.exec(
        select(TrackedKeyword).where(
            TrackedKeyword.id == keyword_id,
            TrackedKeyword.owner_id == user_id,
        )
    ).first()

    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(keyword, key, value)

    keyword.updated_at = datetime.utcnow()
    session.add(keyword)
    session.commit()
    session.refresh(keyword)

    return TrackedKeywordRead.model_validate(keyword)


@router.delete("/keywords/{keyword_id}")
async def delete_keyword(
    session: SessionDep,
    current_user: CurrentUserDep,
    keyword_id: UUID,
) -> dict:
    """Delete a tracked keyword and its mentions."""
    user_id = UUID(current_user.sub)

    keyword = session.exec(
        select(TrackedKeyword).where(
            TrackedKeyword.id == keyword_id,
            TrackedKeyword.owner_id == user_id,
        )
    ).first()

    if not keyword:
        raise HTTPException(status_code=404, detail="Keyword not found")

    # Delete associated mentions and alerts
    for mention in session.exec(select(BrandMention).where(BrandMention.keyword_id == keyword_id)).all():
        for alert in session.exec(select(MentionAlert).where(MentionAlert.mention_id == mention.id)).all():
            session.delete(alert)
        session.delete(mention)

    session.delete(keyword)
    session.commit()

    return {"success": True, "message": "Keyword deleted"}


# ==================== Brand Mentions ====================

@router.get("/mentions")
async def list_mentions(
    session: SessionDep,
    current_user: CurrentUserDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    keyword_id: Optional[UUID] = None,
    source: Optional[MentionSource] = None,
    sentiment: Optional[MentionSentiment] = None,
    unread_only: bool = False,
    flagged_only: bool = False,
    search: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    sort_by: str = Query("mentioned_at", pattern="^(mentioned_at|likes|influence_score)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
) -> dict:
    """List brand mentions with filtering."""
    user_id = UUID(current_user.sub)

    query = select(BrandMention).where(BrandMention.owner_id == user_id)

    if keyword_id:
        query = query.where(BrandMention.keyword_id == keyword_id)

    if source:
        query = query.where(BrandMention.source == source)

    if sentiment:
        query = query.where(BrandMention.sentiment == sentiment)

    if unread_only:
        query = query.where(BrandMention.is_read == False)

    if flagged_only:
        query = query.where(BrandMention.is_flagged == True)

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                BrandMention.content.ilike(search_pattern),
                BrandMention.author_username.ilike(search_pattern),
            )
        )

    if date_from:
        query = query.where(BrandMention.mentioned_at >= date_from)

    if date_to:
        query = query.where(BrandMention.mentioned_at <= date_to)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Apply sorting
    sort_column = getattr(BrandMention, sort_by)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    mentions = session.exec(query).all()

    # Get keywords for mentions
    keyword_ids = set(m.keyword_id for m in mentions)
    keywords = {}
    if keyword_ids:
        for kw in session.exec(select(TrackedKeyword).where(TrackedKeyword.id.in_(keyword_ids))).all():
            keywords[kw.id] = kw.keyword

    items = []
    for m in mentions:
        item = BrandMentionRead.model_validate(m)
        item.keyword = keywords.get(m.keyword_id)
        items.append(item)

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


@router.get("/mentions/{mention_id}")
async def get_mention(
    session: SessionDep,
    current_user: CurrentUserDep,
    mention_id: UUID,
) -> BrandMentionRead:
    """Get a specific mention."""
    user_id = UUID(current_user.sub)

    mention = session.exec(
        select(BrandMention).where(
            BrandMention.id == mention_id,
            BrandMention.owner_id == user_id,
        )
    ).first()

    if not mention:
        raise HTTPException(status_code=404, detail="Mention not found")

    # Get keyword
    keyword = session.exec(
        select(TrackedKeyword).where(TrackedKeyword.id == mention.keyword_id)
    ).first()

    result = BrandMentionRead.model_validate(mention)
    result.keyword = keyword.keyword if keyword else None
    return result


@router.patch("/mentions/{mention_id}")
async def update_mention(
    session: SessionDep,
    current_user: CurrentUserDep,
    mention_id: UUID,
    update: BrandMentionUpdate,
) -> BrandMentionRead:
    """Update a mention (read status, flag, etc.)."""
    user_id = UUID(current_user.sub)

    mention = session.exec(
        select(BrandMention).where(
            BrandMention.id == mention_id,
            BrandMention.owner_id == user_id,
        )
    ).first()

    if not mention:
        raise HTTPException(status_code=404, detail="Mention not found")

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(mention, key, value)

    mention.updated_at = datetime.utcnow()
    session.add(mention)
    session.commit()
    session.refresh(mention)

    return BrandMentionRead.model_validate(mention)


@router.post("/mentions/{mention_id}/read")
async def mark_mention_read(
    session: SessionDep,
    current_user: CurrentUserDep,
    mention_id: UUID,
) -> BrandMentionRead:
    """Mark a mention as read."""
    user_id = UUID(current_user.sub)

    mention = session.exec(
        select(BrandMention).where(
            BrandMention.id == mention_id,
            BrandMention.owner_id == user_id,
        )
    ).first()

    if not mention:
        raise HTTPException(status_code=404, detail="Mention not found")

    mention.is_read = True
    mention.updated_at = datetime.utcnow()
    session.add(mention)
    session.commit()
    session.refresh(mention)

    return BrandMentionRead.model_validate(mention)


@router.post("/mentions/{mention_id}/flag")
async def toggle_flag_mention(
    session: SessionDep,
    current_user: CurrentUserDep,
    mention_id: UUID,
    reason: Optional[str] = None,
) -> BrandMentionRead:
    """Toggle flag status on a mention."""
    user_id = UUID(current_user.sub)

    mention = session.exec(
        select(BrandMention).where(
            BrandMention.id == mention_id,
            BrandMention.owner_id == user_id,
        )
    ).first()

    if not mention:
        raise HTTPException(status_code=404, detail="Mention not found")

    mention.is_flagged = not mention.is_flagged
    if mention.is_flagged and reason:
        mention.flag_reason = reason
    elif not mention.is_flagged:
        mention.flag_reason = None

    mention.updated_at = datetime.utcnow()
    session.add(mention)
    session.commit()
    session.refresh(mention)

    return BrandMentionRead.model_validate(mention)


# ==================== Alerts ====================

@router.get("/alerts")
async def list_alerts(
    session: SessionDep,
    current_user: CurrentUserDep,
    unacknowledged_only: bool = True,
    limit: int = Query(20, ge=1, le=100),
) -> list[MentionAlertRead]:
    """List mention alerts."""
    user_id = UUID(current_user.sub)

    query = (
        select(MentionAlert)
        .where(MentionAlert.owner_id == user_id)
        .order_by(MentionAlert.created_at.desc())
    )

    if unacknowledged_only:
        query = query.where(MentionAlert.is_acknowledged == False)

    query = query.limit(limit)
    alerts = session.exec(query).all()

    return [MentionAlertRead.model_validate(a) for a in alerts]


@router.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    session: SessionDep,
    current_user: CurrentUserDep,
    alert_id: UUID,
) -> MentionAlertRead:
    """Acknowledge an alert."""
    user_id = UUID(current_user.sub)

    alert = session.exec(
        select(MentionAlert).where(
            MentionAlert.id == alert_id,
            MentionAlert.owner_id == user_id,
        )
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.is_acknowledged = True
    alert.acknowledged_at = datetime.utcnow()
    session.add(alert)
    session.commit()
    session.refresh(alert)

    return MentionAlertRead.model_validate(alert)


# ==================== Statistics ====================

@router.get("/stats")
async def get_listening_stats(
    session: SessionDep,
    current_user: CurrentUserDep,
    days: int = Query(30, ge=1, le=365),
) -> dict:
    """Get social listening statistics."""
    user_id = UUID(current_user.sub)
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Total keywords
    total_keywords = session.exec(
        select(func.count()).where(
            TrackedKeyword.owner_id == user_id,
            TrackedKeyword.is_active == True,
        )
    ).one()

    # Total mentions in period
    total_mentions = session.exec(
        select(func.count()).where(
            BrandMention.owner_id == user_id,
            BrandMention.mentioned_at >= cutoff_date,
        )
    ).one()

    # Unread mentions
    unread_mentions = session.exec(
        select(func.count()).where(
            BrandMention.owner_id == user_id,
            BrandMention.is_read == False,
        )
    ).one()

    # Flagged mentions
    flagged_mentions = session.exec(
        select(func.count()).where(
            BrandMention.owner_id == user_id,
            BrandMention.is_flagged == True,
        )
    ).one()

    # Mentions by sentiment
    sentiment_counts = {}
    for sentiment in MentionSentiment:
        count = session.exec(
            select(func.count()).where(
                BrandMention.owner_id == user_id,
                BrandMention.mentioned_at >= cutoff_date,
                BrandMention.sentiment == sentiment,
            )
        ).one()
        sentiment_counts[sentiment.value] = count

    # Mentions by source
    source_counts = {}
    for source in MentionSource:
        count = session.exec(
            select(func.count()).where(
                BrandMention.owner_id == user_id,
                BrandMention.mentioned_at >= cutoff_date,
                BrandMention.source == source,
            )
        ).one()
        if count > 0:
            source_counts[source.value] = count

    # Top keywords by mentions
    top_keywords = session.exec(
        select(TrackedKeyword)
        .where(
            TrackedKeyword.owner_id == user_id,
            TrackedKeyword.is_active == True,
        )
        .order_by(TrackedKeyword.mention_count.desc())
        .limit(5)
    ).all()

    # Pending alerts
    pending_alerts = session.exec(
        select(func.count()).where(
            MentionAlert.owner_id == user_id,
            MentionAlert.is_acknowledged == False,
        )
    ).one()

    # Calculate average sentiment score
    avg_sentiment = session.exec(
        select(func.avg(BrandMention.sentiment_score)).where(
            BrandMention.owner_id == user_id,
            BrandMention.mentioned_at >= cutoff_date,
            BrandMention.sentiment_score.isnot(None),
        )
    ).one()

    return {
        "period_days": days,
        "total_keywords": total_keywords,
        "total_mentions": total_mentions,
        "unread_mentions": unread_mentions,
        "flagged_mentions": flagged_mentions,
        "pending_alerts": pending_alerts,
        "sentiment_breakdown": sentiment_counts,
        "source_breakdown": source_counts,
        "avg_sentiment_score": round(avg_sentiment, 2) if avg_sentiment else None,
        "top_keywords": [
            {
                "id": str(k.id),
                "keyword": k.keyword,
                "mention_count": k.mention_count,
            }
            for k in top_keywords
        ],
    }


@router.get("/timeline")
async def get_mentions_timeline(
    session: SessionDep,
    current_user: CurrentUserDep,
    days: int = Query(30, ge=7, le=365),
    keyword_id: Optional[UUID] = None,
) -> list[dict]:
    """Get mentions timeline data for charts."""
    user_id = UUID(current_user.sub)
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    query = select(BrandMention).where(
        BrandMention.owner_id == user_id,
        BrandMention.mentioned_at >= cutoff_date,
    )

    if keyword_id:
        query = query.where(BrandMention.keyword_id == keyword_id)

    mentions = session.exec(query).all()

    # Group by date
    timeline = {}
    for mention in mentions:
        date_key = mention.mentioned_at.strftime("%Y-%m-%d")
        if date_key not in timeline:
            timeline[date_key] = {
                "date": date_key,
                "count": 0,
                "positive": 0,
                "neutral": 0,
                "negative": 0,
                "total_engagement": 0,
            }

        timeline[date_key]["count"] += 1
        timeline[date_key][mention.sentiment.value] += 1
        timeline[date_key]["total_engagement"] += mention.likes + mention.comments + mention.shares

    # Sort by date
    result = sorted(timeline.values(), key=lambda x: x["date"])
    return result
