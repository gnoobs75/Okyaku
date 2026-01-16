"""API endpoints for hashtag research and analytics."""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.hashtag_research import (
    TrackedHashtag,
    TrackedHashtagCreate,
    TrackedHashtagRead,
    TrackedHashtagUpdate,
    HashtagPerformance,
    HashtagPerformanceRead,
    HashtagCollection,
    HashtagCollectionCreate,
    HashtagCollectionRead,
    HashtagCollectionUpdate,
    TrendingHashtag,
    TrendingHashtagRead,
    HashtagCategory,
    TrendDirection,
)

router = APIRouter()


# ==================== Tracked Hashtags ====================

@router.get("/hashtags")
async def list_hashtags(
    session: SessionDep,
    current_user: CurrentUserDep,
    active_only: bool = True,
    category: Optional[HashtagCategory] = None,
    sort_by: str = Query("total_engagement", pattern="^(total_engagement|times_used|created_at|trend_score)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
) -> list[TrackedHashtagRead]:
    """List all tracked hashtags."""
    user_id = UUID(current_user.sub)

    query = select(TrackedHashtag).where(TrackedHashtag.owner_id == user_id)

    if active_only:
        query = query.where(TrackedHashtag.is_active == True)

    if category:
        query = query.where(TrackedHashtag.category == category)

    # Apply sorting
    sort_column = getattr(TrackedHashtag, sort_by)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    hashtags = session.exec(query).all()
    return [TrackedHashtagRead.model_validate(h) for h in hashtags]


@router.post("/hashtags")
async def create_hashtag(
    session: SessionDep,
    current_user: CurrentUserDep,
    hashtag: TrackedHashtagCreate,
) -> TrackedHashtagRead:
    """Create a new tracked hashtag."""
    user_id = UUID(current_user.sub)

    # Normalize hashtag (ensure it starts with #)
    tag = hashtag.hashtag.strip()
    if not tag.startswith("#"):
        tag = f"#{tag}"

    # Check for duplicate
    existing = session.exec(
        select(TrackedHashtag).where(
            TrackedHashtag.owner_id == user_id,
            TrackedHashtag.hashtag == tag,
        )
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="Hashtag already tracked")

    db_hashtag = TrackedHashtag(
        **{**hashtag.model_dump(), "hashtag": tag},
        owner_id=user_id,
    )
    session.add(db_hashtag)
    session.commit()
    session.refresh(db_hashtag)

    return TrackedHashtagRead.model_validate(db_hashtag)


@router.get("/hashtags/{hashtag_id}")
async def get_hashtag(
    session: SessionDep,
    current_user: CurrentUserDep,
    hashtag_id: UUID,
) -> TrackedHashtagRead:
    """Get a specific tracked hashtag."""
    user_id = UUID(current_user.sub)

    hashtag = session.exec(
        select(TrackedHashtag).where(
            TrackedHashtag.id == hashtag_id,
            TrackedHashtag.owner_id == user_id,
        )
    ).first()

    if not hashtag:
        raise HTTPException(status_code=404, detail="Hashtag not found")

    return TrackedHashtagRead.model_validate(hashtag)


@router.patch("/hashtags/{hashtag_id}")
async def update_hashtag(
    session: SessionDep,
    current_user: CurrentUserDep,
    hashtag_id: UUID,
    update: TrackedHashtagUpdate,
) -> TrackedHashtagRead:
    """Update a tracked hashtag."""
    user_id = UUID(current_user.sub)

    hashtag = session.exec(
        select(TrackedHashtag).where(
            TrackedHashtag.id == hashtag_id,
            TrackedHashtag.owner_id == user_id,
        )
    ).first()

    if not hashtag:
        raise HTTPException(status_code=404, detail="Hashtag not found")

    update_data = update.model_dump(exclude_unset=True)

    # Normalize hashtag if updated
    if "hashtag" in update_data and update_data["hashtag"]:
        tag = update_data["hashtag"].strip()
        if not tag.startswith("#"):
            tag = f"#{tag}"
        update_data["hashtag"] = tag

    for key, value in update_data.items():
        setattr(hashtag, key, value)

    hashtag.updated_at = datetime.utcnow()
    session.add(hashtag)
    session.commit()
    session.refresh(hashtag)

    return TrackedHashtagRead.model_validate(hashtag)


@router.delete("/hashtags/{hashtag_id}")
async def delete_hashtag(
    session: SessionDep,
    current_user: CurrentUserDep,
    hashtag_id: UUID,
) -> dict:
    """Delete a tracked hashtag."""
    user_id = UUID(current_user.sub)

    hashtag = session.exec(
        select(TrackedHashtag).where(
            TrackedHashtag.id == hashtag_id,
            TrackedHashtag.owner_id == user_id,
        )
    ).first()

    if not hashtag:
        raise HTTPException(status_code=404, detail="Hashtag not found")

    # Delete performance records
    performances = session.exec(
        select(HashtagPerformance).where(HashtagPerformance.hashtag_id == hashtag_id)
    ).all()
    for p in performances:
        session.delete(p)

    session.delete(hashtag)
    session.commit()

    return {"success": True, "message": "Hashtag deleted"}


# ==================== Hashtag Performance ====================

@router.get("/hashtags/{hashtag_id}/performance")
async def get_hashtag_performance(
    session: SessionDep,
    current_user: CurrentUserDep,
    hashtag_id: UUID,
    days: int = Query(30, ge=7, le=365),
    platform: Optional[str] = None,
) -> dict:
    """Get performance data for a hashtag."""
    user_id = UUID(current_user.sub)
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Verify ownership
    hashtag = session.exec(
        select(TrackedHashtag).where(
            TrackedHashtag.id == hashtag_id,
            TrackedHashtag.owner_id == user_id,
        )
    ).first()

    if not hashtag:
        raise HTTPException(status_code=404, detail="Hashtag not found")

    query = select(HashtagPerformance).where(
        HashtagPerformance.hashtag_id == hashtag_id,
        HashtagPerformance.recorded_at >= cutoff_date,
    )

    if platform:
        query = query.where(HashtagPerformance.platform == platform)

    query = query.order_by(HashtagPerformance.recorded_at.desc())
    performances = session.exec(query).all()

    # Aggregate by platform
    platform_stats = {}
    timeline = {}

    for p in performances:
        # Platform aggregation
        if p.platform not in platform_stats:
            platform_stats[p.platform] = {
                "platform": p.platform,
                "total_impressions": 0,
                "total_reach": 0,
                "total_likes": 0,
                "total_comments": 0,
                "total_shares": 0,
                "total_saves": 0,
                "post_count": 0,
            }
        platform_stats[p.platform]["total_impressions"] += p.impressions
        platform_stats[p.platform]["total_reach"] += p.reach
        platform_stats[p.platform]["total_likes"] += p.likes
        platform_stats[p.platform]["total_comments"] += p.comments
        platform_stats[p.platform]["total_shares"] += p.shares
        platform_stats[p.platform]["total_saves"] += p.saves
        platform_stats[p.platform]["post_count"] += 1

        # Timeline aggregation
        date_key = p.recorded_at.strftime("%Y-%m-%d")
        if date_key not in timeline:
            timeline[date_key] = {
                "date": date_key,
                "impressions": 0,
                "engagement": 0,
                "posts": 0,
            }
        timeline[date_key]["impressions"] += p.impressions
        timeline[date_key]["engagement"] += p.likes + p.comments + p.shares
        timeline[date_key]["posts"] += 1

    # Calculate engagement rates
    for platform, stats in platform_stats.items():
        total_engagement = stats["total_likes"] + stats["total_comments"] + stats["total_shares"]
        if stats["total_impressions"] > 0:
            stats["engagement_rate"] = round(
                (total_engagement / stats["total_impressions"]) * 100, 2
            )
        else:
            stats["engagement_rate"] = 0

    return {
        "hashtag": TrackedHashtagRead.model_validate(hashtag),
        "period_days": days,
        "platform_breakdown": list(platform_stats.values()),
        "timeline": sorted(timeline.values(), key=lambda x: x["date"]),
        "total_posts": len(performances),
    }


# ==================== Hashtag Collections ====================

@router.get("/collections")
async def list_collections(
    session: SessionDep,
    current_user: CurrentUserDep,
    favorites_only: bool = False,
) -> list[HashtagCollectionRead]:
    """List all hashtag collections."""
    user_id = UUID(current_user.sub)

    query = select(HashtagCollection).where(HashtagCollection.owner_id == user_id)

    if favorites_only:
        query = query.where(HashtagCollection.is_favorite == True)

    query = query.order_by(HashtagCollection.times_used.desc())
    collections = session.exec(query).all()

    return [HashtagCollectionRead.model_validate(c) for c in collections]


@router.post("/collections")
async def create_collection(
    session: SessionDep,
    current_user: CurrentUserDep,
    collection: HashtagCollectionCreate,
) -> HashtagCollectionRead:
    """Create a new hashtag collection."""
    user_id = UUID(current_user.sub)

    # Normalize hashtags
    tags = [t.strip() for t in collection.hashtags.split(",")]
    normalized = []
    for tag in tags:
        if tag:
            if not tag.startswith("#"):
                tag = f"#{tag}"
            normalized.append(tag)

    db_collection = HashtagCollection(
        **{**collection.model_dump(), "hashtags": ", ".join(normalized)},
        owner_id=user_id,
    )
    session.add(db_collection)
    session.commit()
    session.refresh(db_collection)

    return HashtagCollectionRead.model_validate(db_collection)


@router.get("/collections/{collection_id}")
async def get_collection(
    session: SessionDep,
    current_user: CurrentUserDep,
    collection_id: UUID,
) -> HashtagCollectionRead:
    """Get a specific hashtag collection."""
    user_id = UUID(current_user.sub)

    collection = session.exec(
        select(HashtagCollection).where(
            HashtagCollection.id == collection_id,
            HashtagCollection.owner_id == user_id,
        )
    ).first()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    return HashtagCollectionRead.model_validate(collection)


@router.patch("/collections/{collection_id}")
async def update_collection(
    session: SessionDep,
    current_user: CurrentUserDep,
    collection_id: UUID,
    update: HashtagCollectionUpdate,
) -> HashtagCollectionRead:
    """Update a hashtag collection."""
    user_id = UUID(current_user.sub)

    collection = session.exec(
        select(HashtagCollection).where(
            HashtagCollection.id == collection_id,
            HashtagCollection.owner_id == user_id,
        )
    ).first()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    update_data = update.model_dump(exclude_unset=True)

    # Normalize hashtags if updated
    if "hashtags" in update_data and update_data["hashtags"]:
        tags = [t.strip() for t in update_data["hashtags"].split(",")]
        normalized = []
        for tag in tags:
            if tag:
                if not tag.startswith("#"):
                    tag = f"#{tag}"
                normalized.append(tag)
        update_data["hashtags"] = ", ".join(normalized)

    for key, value in update_data.items():
        setattr(collection, key, value)

    collection.updated_at = datetime.utcnow()
    session.add(collection)
    session.commit()
    session.refresh(collection)

    return HashtagCollectionRead.model_validate(collection)


@router.delete("/collections/{collection_id}")
async def delete_collection(
    session: SessionDep,
    current_user: CurrentUserDep,
    collection_id: UUID,
) -> dict:
    """Delete a hashtag collection."""
    user_id = UUID(current_user.sub)

    collection = session.exec(
        select(HashtagCollection).where(
            HashtagCollection.id == collection_id,
            HashtagCollection.owner_id == user_id,
        )
    ).first()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    session.delete(collection)
    session.commit()

    return {"success": True, "message": "Collection deleted"}


@router.post("/collections/{collection_id}/use")
async def mark_collection_used(
    session: SessionDep,
    current_user: CurrentUserDep,
    collection_id: UUID,
) -> HashtagCollectionRead:
    """Mark a collection as used (increment usage counter)."""
    user_id = UUID(current_user.sub)

    collection = session.exec(
        select(HashtagCollection).where(
            HashtagCollection.id == collection_id,
            HashtagCollection.owner_id == user_id,
        )
    ).first()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    collection.times_used += 1
    collection.last_used_at = datetime.utcnow()
    session.add(collection)
    session.commit()
    session.refresh(collection)

    return HashtagCollectionRead.model_validate(collection)


# ==================== Trending Hashtags ====================

@router.get("/trending")
async def get_trending_hashtags(
    session: SessionDep,
    current_user: CurrentUserDep,
    platform: Optional[str] = None,
    category: Optional[str] = None,
    limit: int = Query(20, ge=1, le=100),
) -> list[TrendingHashtagRead]:
    """Get trending hashtags (simulated data for now)."""
    # In production, this would fetch from social platform APIs
    # For now, return trending hashtags from database

    query = select(TrendingHashtag).where(
        TrendingHashtag.expires_at > datetime.utcnow()
    )

    if platform:
        query = query.where(TrendingHashtag.platform == platform)

    if category:
        query = query.where(TrendingHashtag.category == category)

    query = query.order_by(TrendingHashtag.rank.asc()).limit(limit)
    trending = session.exec(query).all()

    return [TrendingHashtagRead.model_validate(t) for t in trending]


# ==================== Statistics ====================

@router.get("/stats")
async def get_hashtag_stats(
    session: SessionDep,
    current_user: CurrentUserDep,
    days: int = Query(30, ge=7, le=365),
) -> dict:
    """Get overall hashtag statistics."""
    user_id = UUID(current_user.sub)
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    # Total tracked hashtags
    total_hashtags = session.exec(
        select(func.count()).where(
            TrackedHashtag.owner_id == user_id,
            TrackedHashtag.is_active == True,
        )
    ).one()

    # Total collections
    total_collections = session.exec(
        select(func.count()).where(HashtagCollection.owner_id == user_id)
    ).one()

    # Top performing hashtags
    top_hashtags = session.exec(
        select(TrackedHashtag)
        .where(
            TrackedHashtag.owner_id == user_id,
            TrackedHashtag.is_active == True,
        )
        .order_by(TrackedHashtag.total_engagement.desc())
        .limit(5)
    ).all()

    # Category breakdown
    category_counts = {}
    for category in HashtagCategory:
        count = session.exec(
            select(func.count()).where(
                TrackedHashtag.owner_id == user_id,
                TrackedHashtag.category == category,
            )
        ).one()
        if count > 0:
            category_counts[category.value] = count

    # Trend direction breakdown
    trend_counts = {}
    for direction in TrendDirection:
        count = session.exec(
            select(func.count()).where(
                TrackedHashtag.owner_id == user_id,
                TrackedHashtag.trend_direction == direction,
            )
        ).one()
        trend_counts[direction.value] = count

    # Most used collections
    top_collections = session.exec(
        select(HashtagCollection)
        .where(HashtagCollection.owner_id == user_id)
        .order_by(HashtagCollection.times_used.desc())
        .limit(5)
    ).all()

    return {
        "period_days": days,
        "total_hashtags": total_hashtags,
        "total_collections": total_collections,
        "category_breakdown": category_counts,
        "trend_breakdown": trend_counts,
        "top_hashtags": [
            {
                "id": str(h.id),
                "hashtag": h.hashtag,
                "total_engagement": h.total_engagement,
                "trend_direction": h.trend_direction.value,
            }
            for h in top_hashtags
        ],
        "top_collections": [
            {
                "id": str(c.id),
                "name": c.name,
                "times_used": c.times_used,
                "hashtag_count": len(c.hashtags.split(",")),
            }
            for c in top_collections
        ],
    }


# ==================== Suggestions ====================

@router.get("/suggestions")
async def get_hashtag_suggestions(
    session: SessionDep,
    current_user: CurrentUserDep,
    topic: Optional[str] = None,
    platform: Optional[str] = None,
    limit: int = Query(20, ge=1, le=50),
) -> dict:
    """Get hashtag suggestions based on topic or user's history."""
    user_id = UUID(current_user.sub)

    suggestions = []

    # Get user's best performing hashtags
    best_hashtags = session.exec(
        select(TrackedHashtag)
        .where(
            TrackedHashtag.owner_id == user_id,
            TrackedHashtag.is_active == True,
            TrackedHashtag.total_engagement > 0,
        )
        .order_by(TrackedHashtag.avg_engagement_rate.desc())
        .limit(10)
    ).all()

    for h in best_hashtags:
        suggestions.append({
            "hashtag": h.hashtag,
            "source": "top_performing",
            "reason": f"Your best performer with {h.total_engagement} engagement",
            "engagement_rate": h.avg_engagement_rate,
        })

    # Get trending hashtags
    trending = session.exec(
        select(TrendingHashtag)
        .where(TrendingHashtag.expires_at > datetime.utcnow())
        .order_by(TrendingHashtag.relevance_score.desc())
        .limit(10)
    ).all()

    for t in trending:
        if platform and t.platform != platform:
            continue
        suggestions.append({
            "hashtag": t.hashtag,
            "source": "trending",
            "reason": f"Trending on {t.platform} (rank #{t.rank})",
            "platform": t.platform,
            "volume": t.volume,
        })

    # Get recently used successful hashtags
    recent_hashtags = session.exec(
        select(TrackedHashtag)
        .where(
            TrackedHashtag.owner_id == user_id,
            TrackedHashtag.is_active == True,
            TrackedHashtag.last_used_at.isnot(None),
            TrackedHashtag.trend_direction == TrendDirection.RISING,
        )
        .order_by(TrackedHashtag.last_used_at.desc())
        .limit(5)
    ).all()

    for h in recent_hashtags:
        if not any(s["hashtag"] == h.hashtag for s in suggestions):
            suggestions.append({
                "hashtag": h.hashtag,
                "source": "rising",
                "reason": "Rising trend based on recent performance",
                "trend_score": h.trend_score,
            })

    return {
        "suggestions": suggestions[:limit],
        "total": len(suggestions),
        "topic": topic,
        "platform": platform,
    }
