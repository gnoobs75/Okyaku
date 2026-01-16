"""Hashtag Research models for analytics and suggestions."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class HashtagCategory(str, Enum):
    """Category for organizing hashtags."""
    GENERAL = "general"
    INDUSTRY = "industry"
    TRENDING = "trending"
    BRANDED = "branded"
    CAMPAIGN = "campaign"
    SEASONAL = "seasonal"
    NICHE = "niche"


class TrendDirection(str, Enum):
    """Direction of hashtag trend."""
    RISING = "rising"
    STABLE = "stable"
    DECLINING = "declining"


# ==================== Tracked Hashtags ====================

class TrackedHashtagBase(SQLModel):
    """Base model for tracked hashtags."""
    hashtag: str = Field(max_length=100, index=True)
    category: HashtagCategory = Field(default=HashtagCategory.GENERAL)
    is_active: bool = Field(default=True)
    notes: Optional[str] = Field(default=None, max_length=500)


class TrackedHashtag(TrackedHashtagBase, table=True):
    """Hashtag being tracked for performance analytics."""
    __tablename__ = "tracked_hashtags"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    # Performance metrics (updated periodically)
    total_posts: int = Field(default=0)
    total_reach: int = Field(default=0)
    total_engagement: int = Field(default=0)
    avg_engagement_rate: Optional[float] = Field(default=None)

    # Trend data
    trend_direction: TrendDirection = Field(default=TrendDirection.STABLE)
    trend_score: Optional[float] = Field(default=None)  # -100 to 100

    # Usage
    times_used: int = Field(default=0)
    last_used_at: Optional[datetime] = Field(default=None)
    best_performing_platform: Optional[str] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TrackedHashtagCreate(TrackedHashtagBase):
    """Schema for creating a tracked hashtag."""
    pass


class TrackedHashtagUpdate(SQLModel):
    """Schema for updating a tracked hashtag."""
    hashtag: Optional[str] = Field(default=None, max_length=100)
    category: Optional[HashtagCategory] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = Field(default=None, max_length=500)


class TrackedHashtagRead(TrackedHashtagBase):
    """Schema for reading a tracked hashtag."""
    id: UUID
    owner_id: UUID
    total_posts: int
    total_reach: int
    total_engagement: int
    avg_engagement_rate: Optional[float]
    trend_direction: TrendDirection
    trend_score: Optional[float]
    times_used: int
    last_used_at: Optional[datetime]
    best_performing_platform: Optional[str]
    created_at: datetime
    updated_at: datetime


# ==================== Hashtag Performance ====================

class HashtagPerformanceBase(SQLModel):
    """Base model for hashtag performance records."""
    hashtag_id: UUID = Field(foreign_key="tracked_hashtags.id", index=True)
    platform: str = Field(max_length=50)
    post_id: Optional[UUID] = Field(default=None, foreign_key="social_posts.id")

    # Metrics
    impressions: int = Field(default=0)
    reach: int = Field(default=0)
    likes: int = Field(default=0)
    comments: int = Field(default=0)
    shares: int = Field(default=0)
    saves: int = Field(default=0)
    engagement_rate: Optional[float] = Field(default=None)

    recorded_at: datetime = Field(default_factory=datetime.utcnow)


class HashtagPerformance(HashtagPerformanceBase, table=True):
    """Performance record for a hashtag usage."""
    __tablename__ = "hashtag_performance"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)


class HashtagPerformanceRead(HashtagPerformanceBase):
    """Schema for reading hashtag performance."""
    id: UUID
    owner_id: UUID
    created_at: datetime


# ==================== Hashtag Collections ====================

class HashtagCollectionBase(SQLModel):
    """Base model for hashtag collections/groups."""
    name: str = Field(max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    hashtags: str = Field(max_length=2000)  # Comma-separated hashtags
    is_favorite: bool = Field(default=False)


class HashtagCollection(HashtagCollectionBase, table=True):
    """Collection of related hashtags for easy reuse."""
    __tablename__ = "hashtag_collections"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    times_used: int = Field(default=0)
    last_used_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class HashtagCollectionCreate(HashtagCollectionBase):
    """Schema for creating a hashtag collection."""
    pass


class HashtagCollectionUpdate(SQLModel):
    """Schema for updating a hashtag collection."""
    name: Optional[str] = Field(default=None, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    hashtags: Optional[str] = Field(default=None, max_length=2000)
    is_favorite: Optional[bool] = None


class HashtagCollectionRead(HashtagCollectionBase):
    """Schema for reading a hashtag collection."""
    id: UUID
    owner_id: UUID
    times_used: int
    last_used_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


# ==================== Trending Hashtags ====================

class TrendingHashtagBase(SQLModel):
    """Base model for trending hashtag data."""
    hashtag: str = Field(max_length=100, index=True)
    platform: str = Field(max_length=50)
    category: Optional[str] = Field(default=None, max_length=100)

    # Trend metrics
    volume: int = Field(default=0)  # Number of posts
    velocity: float = Field(default=0.0)  # Rate of growth
    rank: int = Field(default=0)  # Position in trending list

    # Time-based data
    peak_time: Optional[datetime] = Field(default=None)
    trend_start: Optional[datetime] = Field(default=None)


class TrendingHashtag(TrendingHashtagBase, table=True):
    """Trending hashtag discovered from platforms."""
    __tablename__ = "trending_hashtags"

    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Relevance to user
    relevance_score: Optional[float] = Field(default=None)  # 0-100

    discovered_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = Field(default=None)


class TrendingHashtagRead(TrendingHashtagBase):
    """Schema for reading trending hashtag."""
    id: UUID
    relevance_score: Optional[float]
    discovered_at: datetime
    expires_at: Optional[datetime]
