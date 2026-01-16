from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Query
from sqlmodel import func, select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.social_media import (
    PostStatus,
    SocialAccount,
    SocialPlatform,
    SocialPost,
    SocialPostAnalytics,
)
from app.services.analytics_service import analytics_service

router = APIRouter()


@router.get("/overview")
async def get_analytics_overview(
    session: SessionDep,
    current_user: CurrentUserDep,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    account_id: Optional[UUID] = Query(default=None),
    platform: Optional[SocialPlatform] = Query(default=None),
) -> dict:
    """Get analytics overview with key metrics."""
    user_id = UUID(current_user.sub)

    # Default date range: last 30 days
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Get user's accounts
    accounts_query = select(SocialAccount).where(SocialAccount.owner_id == user_id)
    if account_id:
        accounts_query = accounts_query.where(SocialAccount.id == account_id)
    if platform:
        accounts_query = accounts_query.where(SocialAccount.platform == platform)
    accounts = session.exec(accounts_query).all()
    account_ids = [a.id for a in accounts]

    if not account_ids:
        return {
            "total_posts": 0,
            "total_impressions": 0,
            "total_reach": 0,
            "total_engagement": 0,
            "avg_engagement_rate": 0,
            "total_likes": 0,
            "total_comments": 0,
            "total_shares": 0,
            "total_clicks": 0,
        }

    # Get published posts in date range
    posts_query = select(SocialPost).where(
        SocialPost.account_id.in_(account_ids),
        SocialPost.status == PostStatus.PUBLISHED,
        SocialPost.published_at >= start_date,
        SocialPost.published_at <= end_date,
    )
    posts = session.exec(posts_query).all()
    post_ids = [p.id for p in posts]

    if not post_ids:
        return {
            "total_posts": 0,
            "total_impressions": 0,
            "total_reach": 0,
            "total_engagement": 0,
            "avg_engagement_rate": 0,
            "total_likes": 0,
            "total_comments": 0,
            "total_shares": 0,
            "total_clicks": 0,
        }

    # Aggregate analytics
    analytics = session.exec(
        select(
            func.sum(SocialPostAnalytics.impressions).label("impressions"),
            func.sum(SocialPostAnalytics.reach).label("reach"),
            func.sum(SocialPostAnalytics.likes).label("likes"),
            func.sum(SocialPostAnalytics.comments).label("comments"),
            func.sum(SocialPostAnalytics.shares).label("shares"),
            func.sum(SocialPostAnalytics.clicks).label("clicks"),
            func.avg(SocialPostAnalytics.engagement_rate).label("avg_engagement_rate"),
        ).where(SocialPostAnalytics.post_id.in_(post_ids))
    ).first()

    return {
        "total_posts": len(posts),
        "total_impressions": analytics.impressions or 0,
        "total_reach": analytics.reach or 0,
        "total_engagement": (analytics.likes or 0)
        + (analytics.comments or 0)
        + (analytics.shares or 0),
        "avg_engagement_rate": round(analytics.avg_engagement_rate or 0, 2),
        "total_likes": analytics.likes or 0,
        "total_comments": analytics.comments or 0,
        "total_shares": analytics.shares or 0,
        "total_clicks": analytics.clicks or 0,
    }


@router.get("/by-platform")
async def get_analytics_by_platform(
    session: SessionDep,
    current_user: CurrentUserDep,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
) -> list[dict]:
    """Get analytics broken down by platform."""
    user_id = UUID(current_user.sub)

    # Default date range: last 30 days
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Get user's accounts
    accounts = session.exec(
        select(SocialAccount).where(SocialAccount.owner_id == user_id)
    ).all()

    result = []
    for platform_enum in SocialPlatform:
        platform_accounts = [a for a in accounts if a.platform == platform_enum]
        account_ids = [a.id for a in platform_accounts]

        if not account_ids:
            result.append(
                {
                    "platform": platform_enum.value,
                    "posts": 0,
                    "impressions": 0,
                    "reach": 0,
                    "likes": 0,
                    "comments": 0,
                    "shares": 0,
                    "clicks": 0,
                    "engagement_rate": 0,
                }
            )
            continue

        # Get posts for this platform
        posts = session.exec(
            select(SocialPost).where(
                SocialPost.account_id.in_(account_ids),
                SocialPost.status == PostStatus.PUBLISHED,
                SocialPost.published_at >= start_date,
                SocialPost.published_at <= end_date,
            )
        ).all()
        post_ids = [p.id for p in posts]

        if not post_ids:
            result.append(
                {
                    "platform": platform_enum.value,
                    "posts": 0,
                    "impressions": 0,
                    "reach": 0,
                    "likes": 0,
                    "comments": 0,
                    "shares": 0,
                    "clicks": 0,
                    "engagement_rate": 0,
                }
            )
            continue

        analytics = session.exec(
            select(
                func.sum(SocialPostAnalytics.impressions).label("impressions"),
                func.sum(SocialPostAnalytics.reach).label("reach"),
                func.sum(SocialPostAnalytics.likes).label("likes"),
                func.sum(SocialPostAnalytics.comments).label("comments"),
                func.sum(SocialPostAnalytics.shares).label("shares"),
                func.sum(SocialPostAnalytics.clicks).label("clicks"),
                func.avg(SocialPostAnalytics.engagement_rate).label("engagement_rate"),
            ).where(SocialPostAnalytics.post_id.in_(post_ids))
        ).first()

        result.append(
            {
                "platform": platform_enum.value,
                "posts": len(posts),
                "impressions": analytics.impressions or 0,
                "reach": analytics.reach or 0,
                "likes": analytics.likes or 0,
                "comments": analytics.comments or 0,
                "shares": analytics.shares or 0,
                "clicks": analytics.clicks or 0,
                "engagement_rate": round(analytics.engagement_rate or 0, 2),
            }
        )

    return result


@router.get("/timeline")
async def get_analytics_timeline(
    session: SessionDep,
    current_user: CurrentUserDep,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    account_id: Optional[UUID] = Query(default=None),
    platform: Optional[SocialPlatform] = Query(default=None),
    granularity: str = Query(default="day"),  # day, week, month
) -> list[dict]:
    """Get analytics timeline data for charts."""
    user_id = UUID(current_user.sub)

    # Default date range: last 30 days
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Get user's accounts
    accounts_query = select(SocialAccount).where(SocialAccount.owner_id == user_id)
    if account_id:
        accounts_query = accounts_query.where(SocialAccount.id == account_id)
    if platform:
        accounts_query = accounts_query.where(SocialAccount.platform == platform)
    accounts = session.exec(accounts_query).all()
    account_ids = [a.id for a in accounts]

    if not account_ids:
        return []

    # Get posts with analytics
    posts = session.exec(
        select(SocialPost, SocialPostAnalytics)
        .join(SocialPostAnalytics, SocialPostAnalytics.post_id == SocialPost.id)
        .where(
            SocialPost.account_id.in_(account_ids),
            SocialPost.status == PostStatus.PUBLISHED,
            SocialPost.published_at >= start_date,
            SocialPost.published_at <= end_date,
        )
        .order_by(SocialPost.published_at)
    ).all()

    # Group by time period
    timeline = {}
    for post, analytics in posts:
        if not post.published_at:
            continue

        if granularity == "month":
            period_key = post.published_at.strftime("%Y-%m")
        elif granularity == "week":
            # ISO week
            period_key = post.published_at.strftime("%Y-W%V")
        else:  # day
            period_key = post.published_at.strftime("%Y-%m-%d")

        if period_key not in timeline:
            timeline[period_key] = {
                "period": period_key,
                "posts": 0,
                "impressions": 0,
                "reach": 0,
                "likes": 0,
                "comments": 0,
                "shares": 0,
                "clicks": 0,
                "engagement": 0,
            }

        timeline[period_key]["posts"] += 1
        timeline[period_key]["impressions"] += analytics.impressions
        timeline[period_key]["reach"] += analytics.reach
        timeline[period_key]["likes"] += analytics.likes
        timeline[period_key]["comments"] += analytics.comments
        timeline[period_key]["shares"] += analytics.shares
        timeline[period_key]["clicks"] += analytics.clicks
        timeline[period_key]["engagement"] += (
            analytics.likes + analytics.comments + analytics.shares
        )

    return list(timeline.values())


@router.get("/top-posts")
async def get_top_posts(
    session: SessionDep,
    current_user: CurrentUserDep,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    account_id: Optional[UUID] = Query(default=None),
    platform: Optional[SocialPlatform] = Query(default=None),
    sort_by: str = Query(default="engagement"),  # engagement, impressions, reach, likes
    limit: int = Query(default=10, ge=1, le=50),
) -> list[dict]:
    """Get top performing posts."""
    user_id = UUID(current_user.sub)

    # Default date range: last 30 days
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Get user's accounts
    accounts_query = select(SocialAccount).where(SocialAccount.owner_id == user_id)
    if account_id:
        accounts_query = accounts_query.where(SocialAccount.id == account_id)
    if platform:
        accounts_query = accounts_query.where(SocialAccount.platform == platform)
    accounts = session.exec(accounts_query).all()
    account_ids = [a.id for a in accounts]
    accounts_map = {a.id: a for a in accounts}

    if not account_ids:
        return []

    # Get posts with analytics
    query = (
        select(SocialPost, SocialPostAnalytics)
        .join(SocialPostAnalytics, SocialPostAnalytics.post_id == SocialPost.id)
        .where(
            SocialPost.account_id.in_(account_ids),
            SocialPost.status == PostStatus.PUBLISHED,
            SocialPost.published_at >= start_date,
            SocialPost.published_at <= end_date,
        )
    )

    # Order by metric
    if sort_by == "impressions":
        query = query.order_by(SocialPostAnalytics.impressions.desc())
    elif sort_by == "reach":
        query = query.order_by(SocialPostAnalytics.reach.desc())
    elif sort_by == "likes":
        query = query.order_by(SocialPostAnalytics.likes.desc())
    else:  # engagement
        query = query.order_by(
            (
                SocialPostAnalytics.likes
                + SocialPostAnalytics.comments
                + SocialPostAnalytics.shares
            ).desc()
        )

    query = query.limit(limit)
    results = session.exec(query).all()

    top_posts = []
    for post, analytics in results:
        account = accounts_map.get(post.account_id)
        top_posts.append(
            {
                "id": str(post.id),
                "content": post.content[:200] + "..." if len(post.content) > 200 else post.content,
                "published_at": post.published_at.isoformat() if post.published_at else None,
                "platform": account.platform.value if account else None,
                "platform_username": account.platform_username if account else None,
                "platform_post_url": post.platform_post_url,
                "impressions": analytics.impressions,
                "reach": analytics.reach,
                "likes": analytics.likes,
                "comments": analytics.comments,
                "shares": analytics.shares,
                "clicks": analytics.clicks,
                "engagement_rate": analytics.engagement_rate,
                "total_engagement": analytics.likes + analytics.comments + analytics.shares,
            }
        )

    return top_posts


@router.get("/engagement-breakdown")
async def get_engagement_breakdown(
    session: SessionDep,
    current_user: CurrentUserDep,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
    account_id: Optional[UUID] = Query(default=None),
    platform: Optional[SocialPlatform] = Query(default=None),
) -> dict:
    """Get engagement breakdown by type."""
    user_id = UUID(current_user.sub)

    # Default date range: last 30 days
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Get user's accounts
    accounts_query = select(SocialAccount).where(SocialAccount.owner_id == user_id)
    if account_id:
        accounts_query = accounts_query.where(SocialAccount.id == account_id)
    if platform:
        accounts_query = accounts_query.where(SocialAccount.platform == platform)
    accounts = session.exec(accounts_query).all()
    account_ids = [a.id for a in accounts]

    if not account_ids:
        return {
            "likes": 0,
            "comments": 0,
            "shares": 0,
            "clicks": 0,
            "saves": 0,
        }

    # Get posts
    posts = session.exec(
        select(SocialPost).where(
            SocialPost.account_id.in_(account_ids),
            SocialPost.status == PostStatus.PUBLISHED,
            SocialPost.published_at >= start_date,
            SocialPost.published_at <= end_date,
        )
    ).all()
    post_ids = [p.id for p in posts]

    if not post_ids:
        return {
            "likes": 0,
            "comments": 0,
            "shares": 0,
            "clicks": 0,
            "saves": 0,
        }

    analytics = session.exec(
        select(
            func.sum(SocialPostAnalytics.likes).label("likes"),
            func.sum(SocialPostAnalytics.comments).label("comments"),
            func.sum(SocialPostAnalytics.shares).label("shares"),
            func.sum(SocialPostAnalytics.clicks).label("clicks"),
            func.sum(SocialPostAnalytics.saves).label("saves"),
        ).where(SocialPostAnalytics.post_id.in_(post_ids))
    ).first()

    return {
        "likes": analytics.likes or 0,
        "comments": analytics.comments or 0,
        "shares": analytics.shares or 0,
        "clicks": analytics.clicks or 0,
        "saves": analytics.saves or 0,
    }


@router.get("/posting-frequency")
async def get_posting_frequency(
    session: SessionDep,
    current_user: CurrentUserDep,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
) -> dict:
    """Get posting frequency by day of week and hour."""
    user_id = UUID(current_user.sub)

    # Default date range: last 90 days
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=90)

    # Get user's accounts
    accounts = session.exec(
        select(SocialAccount).where(SocialAccount.owner_id == user_id)
    ).all()
    account_ids = [a.id for a in accounts]

    if not account_ids:
        return {
            "by_day_of_week": [],
            "by_hour": [],
        }

    # Get published posts
    posts = session.exec(
        select(SocialPost).where(
            SocialPost.account_id.in_(account_ids),
            SocialPost.status == PostStatus.PUBLISHED,
            SocialPost.published_at >= start_date,
            SocialPost.published_at <= end_date,
        )
    ).all()

    # Aggregate by day of week
    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    by_day = {i: {"day": days[i], "posts": 0, "engagement": 0} for i in range(7)}

    # Aggregate by hour
    by_hour = {i: {"hour": i, "posts": 0, "engagement": 0} for i in range(24)}

    for post in posts:
        if not post.published_at:
            continue

        day_idx = post.published_at.weekday()
        hour = post.published_at.hour

        by_day[day_idx]["posts"] += 1
        by_hour[hour]["posts"] += 1

        # Get analytics for this post
        analytics = session.exec(
            select(SocialPostAnalytics).where(SocialPostAnalytics.post_id == post.id)
        ).first()

        if analytics:
            engagement = analytics.likes + analytics.comments + analytics.shares
            by_day[day_idx]["engagement"] += engagement
            by_hour[hour]["engagement"] += engagement

    return {
        "by_day_of_week": list(by_day.values()),
        "by_hour": list(by_hour.values()),
    }


@router.get("/account-performance")
async def get_account_performance(
    session: SessionDep,
    current_user: CurrentUserDep,
    start_date: Optional[datetime] = Query(default=None),
    end_date: Optional[datetime] = Query(default=None),
) -> list[dict]:
    """Get performance metrics for each connected account."""
    user_id = UUID(current_user.sub)

    # Default date range: last 30 days
    if not end_date:
        end_date = datetime.utcnow()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Get user's accounts
    accounts = session.exec(
        select(SocialAccount).where(SocialAccount.owner_id == user_id)
    ).all()

    result = []
    for account in accounts:
        # Get posts for this account
        posts = session.exec(
            select(SocialPost).where(
                SocialPost.account_id == account.id,
                SocialPost.status == PostStatus.PUBLISHED,
                SocialPost.published_at >= start_date,
                SocialPost.published_at <= end_date,
            )
        ).all()
        post_ids = [p.id for p in posts]

        if not post_ids:
            result.append(
                {
                    "account_id": str(account.id),
                    "platform": account.platform.value,
                    "username": account.platform_username,
                    "display_name": account.display_name,
                    "profile_image": account.profile_image_url,
                    "posts": 0,
                    "impressions": 0,
                    "reach": 0,
                    "likes": 0,
                    "comments": 0,
                    "shares": 0,
                    "engagement_rate": 0,
                }
            )
            continue

        analytics = session.exec(
            select(
                func.sum(SocialPostAnalytics.impressions).label("impressions"),
                func.sum(SocialPostAnalytics.reach).label("reach"),
                func.sum(SocialPostAnalytics.likes).label("likes"),
                func.sum(SocialPostAnalytics.comments).label("comments"),
                func.sum(SocialPostAnalytics.shares).label("shares"),
                func.avg(SocialPostAnalytics.engagement_rate).label("engagement_rate"),
            ).where(SocialPostAnalytics.post_id.in_(post_ids))
        ).first()

        result.append(
            {
                "account_id": str(account.id),
                "platform": account.platform.value,
                "username": account.platform_username,
                "display_name": account.display_name,
                "profile_image": account.profile_image_url,
                "posts": len(posts),
                "impressions": analytics.impressions or 0,
                "reach": analytics.reach or 0,
                "likes": analytics.likes or 0,
                "comments": analytics.comments or 0,
                "shares": analytics.shares or 0,
                "engagement_rate": round(analytics.engagement_rate or 0, 2),
            }
        )

    return result


@router.get("/best-times")
async def get_best_times_to_post(
    session: SessionDep,
    current_user: CurrentUserDep,
    account_id: Optional[UUID] = Query(default=None),
    platform: Optional[SocialPlatform] = Query(default=None),
    days_lookback: int = Query(default=90, ge=7, le=365),
) -> dict:
    """
    Get optimal posting times based on historical engagement data.

    Returns:
    - best_hours: Top 20 day/hour combinations ranked by engagement rate
    - best_days: Days of week ranked by average engagement
    - heatmap: 7x24 matrix of engagement rates (day x hour)
    - recommendations: Top 5 recommended posting slots with confidence levels
    """
    user_id = UUID(current_user.sub)

    # Validate account belongs to user if specified
    if account_id:
        account = session.exec(
            select(SocialAccount).where(
                SocialAccount.id == account_id,
                SocialAccount.owner_id == user_id,
            )
        ).first()
        if not account:
            return {
                "best_hours": [],
                "best_days": [],
                "heatmap": [[0] * 24 for _ in range(7)],
                "recommendations": [],
                "data_points": 0,
                "analysis_period_days": days_lookback,
            }

    return await analytics_service.get_best_times_to_post(
        session=session,
        account_id=account_id,
        platform=platform,
        days_lookback=days_lookback,
    )


@router.get("/content-insights")
async def get_content_performance_insights(
    session: SessionDep,
    current_user: CurrentUserDep,
    account_id: Optional[UUID] = Query(default=None),
    days_lookback: int = Query(default=30, ge=7, le=365),
) -> dict:
    """
    Analyze content performance to identify winning patterns.

    Returns:
    - content_length: Performance by post length (short, medium, long, very_long)
    - media_impact: Performance comparison with/without media
    - hashtag_performance: Engagement by hashtag count
    """
    user_id = UUID(current_user.sub)

    # Validate account belongs to user if specified
    if account_id:
        account = session.exec(
            select(SocialAccount).where(
                SocialAccount.id == account_id,
                SocialAccount.owner_id == user_id,
            )
        ).first()
        if not account:
            return {
                "content_length": [],
                "media_impact": {},
                "hashtag_performance": [],
                "total_posts_analyzed": 0,
            }

    return await analytics_service.get_content_performance_insights(
        session=session,
        account_id=account_id,
        days_lookback=days_lookback,
    )


@router.get("/platform-comparison")
async def get_platform_comparison(
    session: SessionDep,
    current_user: CurrentUserDep,
    days_lookback: int = Query(default=30, ge=7, le=365),
) -> dict:
    """
    Compare performance metrics across all connected social platforms.

    Returns:
    - platforms: List of platform performance summaries with:
        - post_count, total_impressions, total_reach
        - engagement metrics (likes, comments, shares, clicks)
        - average engagement rate
    """
    user_id = UUID(current_user.sub)

    return await analytics_service.get_platform_comparison(
        session=session,
        owner_id=user_id,
        days_lookback=days_lookback,
    )
