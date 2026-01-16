"""Advanced analytics service for social media optimization."""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
from collections import defaultdict

from sqlalchemy import func, extract
from sqlmodel import Session, select

from app.core.logging import get_logger
from app.models.social_media import (
    SocialAccount,
    SocialPost,
    SocialPostAnalytics,
    PostStatus,
    SocialPlatform,
)

logger = get_logger(__name__)


class AnalyticsService:
    """Service for advanced social media analytics and optimization."""

    async def get_best_times_to_post(
        self,
        session: Session,
        account_id: Optional[UUID] = None,
        platform: Optional[SocialPlatform] = None,
        days_lookback: int = 90,
    ) -> dict:
        """
        Analyze historical engagement data to determine optimal posting times.

        Returns engagement scores by day of week and hour.
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_lookback)

        # Build query for published posts with analytics
        query = (
            select(SocialPost, SocialPostAnalytics)
            .join(SocialPostAnalytics, SocialPost.id == SocialPostAnalytics.post_id)
            .where(
                SocialPost.status == PostStatus.PUBLISHED,
                SocialPost.published_at >= cutoff_date,
                SocialPostAnalytics.impressions > 0,
            )
        )

        if account_id:
            query = query.where(SocialPost.account_id == account_id)

        if platform:
            query = query.join(
                SocialAccount, SocialPost.account_id == SocialAccount.id
            ).where(SocialAccount.platform == platform)

        results = session.exec(query).all()

        # Aggregate engagement by day and hour
        hourly_engagement = defaultdict(lambda: {"total_engagement": 0, "count": 0})
        daily_engagement = defaultdict(lambda: {"total_engagement": 0, "count": 0})

        for post, analytics in results:
            if not post.published_at:
                continue

            # Calculate total engagement
            total_engagement = (
                (analytics.likes or 0)
                + (analytics.comments or 0) * 2  # Comments weighted higher
                + (analytics.shares or 0) * 3  # Shares weighted highest
                + (analytics.clicks or 0)
            )

            # Normalize by impressions for engagement rate
            if analytics.impressions > 0:
                engagement_rate = total_engagement / analytics.impressions
            else:
                engagement_rate = 0

            hour = post.published_at.hour
            day = post.published_at.weekday()  # 0 = Monday

            hour_key = f"{day}_{hour}"
            hourly_engagement[hour_key]["total_engagement"] += engagement_rate
            hourly_engagement[hour_key]["count"] += 1

            daily_engagement[day]["total_engagement"] += engagement_rate
            daily_engagement[day]["count"] += 1

        # Calculate average engagement rates
        best_hours = []
        for key, data in hourly_engagement.items():
            if data["count"] > 0:
                day, hour = map(int, key.split("_"))
                avg_engagement = data["total_engagement"] / data["count"]
                best_hours.append({
                    "day": day,
                    "day_name": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][day],
                    "hour": hour,
                    "hour_label": f"{hour:02d}:00",
                    "avg_engagement_rate": round(avg_engagement * 100, 2),
                    "post_count": data["count"],
                })

        # Sort by engagement rate
        best_hours.sort(key=lambda x: x["avg_engagement_rate"], reverse=True)

        # Calculate best days
        best_days = []
        for day, data in daily_engagement.items():
            if data["count"] > 0:
                avg_engagement = data["total_engagement"] / data["count"]
                best_days.append({
                    "day": day,
                    "day_name": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][day],
                    "avg_engagement_rate": round(avg_engagement * 100, 2),
                    "post_count": data["count"],
                })

        best_days.sort(key=lambda x: x["avg_engagement_rate"], reverse=True)

        # Build heatmap data (7 days x 24 hours)
        heatmap = []
        for day in range(7):
            day_data = []
            for hour in range(24):
                key = f"{day}_{hour}"
                if key in hourly_engagement and hourly_engagement[key]["count"] > 0:
                    avg = hourly_engagement[key]["total_engagement"] / hourly_engagement[key]["count"]
                    day_data.append(round(avg * 100, 2))
                else:
                    day_data.append(0)
            heatmap.append(day_data)

        # Get top 5 recommendations
        recommendations = []
        seen_slots = set()
        for item in best_hours[:10]:
            slot = (item["day"], item["hour"])
            if slot not in seen_slots and len(recommendations) < 5:
                recommendations.append({
                    "day": item["day_name"],
                    "time": item["hour_label"],
                    "engagement_rate": item["avg_engagement_rate"],
                    "confidence": "high" if item["post_count"] >= 10 else "medium" if item["post_count"] >= 5 else "low",
                })
                seen_slots.add(slot)

        return {
            "best_hours": best_hours[:20],
            "best_days": best_days,
            "heatmap": heatmap,
            "recommendations": recommendations,
            "data_points": len(results),
            "analysis_period_days": days_lookback,
        }

    async def get_content_performance_insights(
        self,
        session: Session,
        account_id: Optional[UUID] = None,
        days_lookback: int = 30,
    ) -> dict:
        """Analyze content performance to identify winning patterns."""
        cutoff_date = datetime.utcnow() - timedelta(days=days_lookback)

        query = (
            select(SocialPost, SocialPostAnalytics)
            .join(SocialPostAnalytics, SocialPost.id == SocialPostAnalytics.post_id)
            .where(
                SocialPost.status == PostStatus.PUBLISHED,
                SocialPost.published_at >= cutoff_date,
            )
        )

        if account_id:
            query = query.where(SocialPost.account_id == account_id)

        results = session.exec(query).all()

        # Analyze content length vs engagement
        length_buckets = {
            "short": {"range": (0, 100), "total_engagement": 0, "count": 0},
            "medium": {"range": (100, 280), "total_engagement": 0, "count": 0},
            "long": {"range": (280, 500), "total_engagement": 0, "count": 0},
            "very_long": {"range": (500, float("inf")), "total_engagement": 0, "count": 0},
        }

        # Analyze media vs no media
        media_analysis = {
            "with_media": {"total_engagement": 0, "count": 0},
            "without_media": {"total_engagement": 0, "count": 0},
        }

        # Analyze hashtag count
        hashtag_analysis = defaultdict(lambda: {"total_engagement": 0, "count": 0})

        for post, analytics in results:
            content_length = len(post.content) if post.content else 0
            engagement_rate = analytics.engagement_rate or 0

            # Content length analysis
            for bucket_name, bucket_data in length_buckets.items():
                min_len, max_len = bucket_data["range"]
                if min_len <= content_length < max_len:
                    bucket_data["total_engagement"] += engagement_rate
                    bucket_data["count"] += 1
                    break

            # Media analysis
            has_media = post.link_url is not None  # Simplified check
            if has_media:
                media_analysis["with_media"]["total_engagement"] += engagement_rate
                media_analysis["with_media"]["count"] += 1
            else:
                media_analysis["without_media"]["total_engagement"] += engagement_rate
                media_analysis["without_media"]["count"] += 1

            # Hashtag analysis
            hashtag_count = post.content.count("#") if post.content else 0
            hashtag_bucket = min(hashtag_count, 10)  # Cap at 10+
            hashtag_analysis[hashtag_bucket]["total_engagement"] += engagement_rate
            hashtag_analysis[hashtag_bucket]["count"] += 1

        # Calculate averages
        length_insights = []
        for bucket_name, data in length_buckets.items():
            if data["count"] > 0:
                avg = data["total_engagement"] / data["count"]
                length_insights.append({
                    "category": bucket_name,
                    "char_range": f"{data['range'][0]}-{int(data['range'][1]) if data['range'][1] != float('inf') else '500+'}",
                    "avg_engagement_rate": round(avg, 2),
                    "post_count": data["count"],
                })

        media_insights = {}
        for key, data in media_analysis.items():
            if data["count"] > 0:
                media_insights[key] = {
                    "avg_engagement_rate": round(data["total_engagement"] / data["count"], 2),
                    "post_count": data["count"],
                }

        hashtag_insights = []
        for count, data in sorted(hashtag_analysis.items()):
            if data["count"] > 0:
                hashtag_insights.append({
                    "hashtag_count": count,
                    "avg_engagement_rate": round(data["total_engagement"] / data["count"], 2),
                    "post_count": data["count"],
                })

        return {
            "content_length": length_insights,
            "media_impact": media_insights,
            "hashtag_performance": hashtag_insights,
            "total_posts_analyzed": len(results),
        }

    async def get_platform_comparison(
        self,
        session: Session,
        owner_id: UUID,
        days_lookback: int = 30,
    ) -> dict:
        """Compare performance across different social platforms."""
        cutoff_date = datetime.utcnow() - timedelta(days=days_lookback)

        query = (
            select(
                SocialAccount.platform,
                func.count(SocialPost.id).label("post_count"),
                func.sum(SocialPostAnalytics.impressions).label("total_impressions"),
                func.sum(SocialPostAnalytics.reach).label("total_reach"),
                func.sum(SocialPostAnalytics.likes).label("total_likes"),
                func.sum(SocialPostAnalytics.comments).label("total_comments"),
                func.sum(SocialPostAnalytics.shares).label("total_shares"),
                func.sum(SocialPostAnalytics.clicks).label("total_clicks"),
                func.avg(SocialPostAnalytics.engagement_rate).label("avg_engagement_rate"),
            )
            .join(SocialPost, SocialAccount.id == SocialPost.account_id)
            .join(SocialPostAnalytics, SocialPost.id == SocialPostAnalytics.post_id)
            .where(
                SocialAccount.owner_id == owner_id,
                SocialPost.status == PostStatus.PUBLISHED,
                SocialPost.published_at >= cutoff_date,
            )
            .group_by(SocialAccount.platform)
        )

        results = session.exec(query).all()

        platforms = []
        for row in results:
            platforms.append({
                "platform": row.platform,
                "post_count": row.post_count or 0,
                "total_impressions": row.total_impressions or 0,
                "total_reach": row.total_reach or 0,
                "total_likes": row.total_likes or 0,
                "total_comments": row.total_comments or 0,
                "total_shares": row.total_shares or 0,
                "total_clicks": row.total_clicks or 0,
                "avg_engagement_rate": round(row.avg_engagement_rate or 0, 2),
            })

        return {
            "platforms": platforms,
            "period_days": days_lookback,
        }


# Global service instance
analytics_service = AnalyticsService()
