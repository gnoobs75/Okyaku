"""Competitor Tracking models for competitive analysis."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class CompetitorStatus(str, Enum):
    """Status of competitor tracking."""
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"


class MetricTrend(str, Enum):
    """Trend direction for metrics."""
    UP = "up"
    DOWN = "down"
    STABLE = "stable"


# ==================== Competitors ====================

class CompetitorBase(SQLModel):
    """Base model for competitor profiles."""
    name: str = Field(max_length=200, index=True)
    description: Optional[str] = Field(default=None, max_length=1000)
    website_url: Optional[str] = Field(default=None, max_length=500)
    logo_url: Optional[str] = Field(default=None, max_length=500)
    industry: Optional[str] = Field(default=None, max_length=100)
    status: CompetitorStatus = Field(default=CompetitorStatus.ACTIVE)
    notes: Optional[str] = Field(default=None, max_length=2000)


class Competitor(CompetitorBase, table=True):
    """Competitor being tracked."""
    __tablename__ = "competitors"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    # Social handles
    twitter_handle: Optional[str] = Field(default=None, max_length=100)
    linkedin_url: Optional[str] = Field(default=None, max_length=500)
    facebook_url: Optional[str] = Field(default=None, max_length=500)
    instagram_handle: Optional[str] = Field(default=None, max_length=100)

    # Latest metrics (updated periodically)
    total_followers: int = Field(default=0)
    follower_growth_rate: Optional[float] = Field(default=None)
    avg_engagement_rate: Optional[float] = Field(default=None)
    posting_frequency: Optional[float] = Field(default=None)  # posts per week
    avg_likes_per_post: Optional[float] = Field(default=None)
    avg_comments_per_post: Optional[float] = Field(default=None)

    # Tracking info
    last_analyzed_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CompetitorCreate(CompetitorBase):
    """Schema for creating a competitor."""
    twitter_handle: Optional[str] = None
    linkedin_url: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_handle: Optional[str] = None


class CompetitorUpdate(SQLModel):
    """Schema for updating a competitor."""
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    website_url: Optional[str] = Field(default=None, max_length=500)
    logo_url: Optional[str] = Field(default=None, max_length=500)
    industry: Optional[str] = Field(default=None, max_length=100)
    status: Optional[CompetitorStatus] = None
    notes: Optional[str] = Field(default=None, max_length=2000)
    twitter_handle: Optional[str] = None
    linkedin_url: Optional[str] = None
    facebook_url: Optional[str] = None
    instagram_handle: Optional[str] = None


class CompetitorRead(CompetitorBase):
    """Schema for reading a competitor."""
    id: UUID
    owner_id: UUID
    twitter_handle: Optional[str]
    linkedin_url: Optional[str]
    facebook_url: Optional[str]
    instagram_handle: Optional[str]
    total_followers: int
    follower_growth_rate: Optional[float]
    avg_engagement_rate: Optional[float]
    posting_frequency: Optional[float]
    avg_likes_per_post: Optional[float]
    avg_comments_per_post: Optional[float]
    last_analyzed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


# ==================== Competitor Metrics History ====================

class CompetitorMetricsBase(SQLModel):
    """Base model for competitor metrics snapshots."""
    competitor_id: UUID = Field(foreign_key="competitors.id", index=True)
    platform: str = Field(max_length=50)

    # Follower metrics
    followers: int = Field(default=0)
    follower_change: int = Field(default=0)
    follower_growth_rate: Optional[float] = Field(default=None)

    # Engagement metrics
    total_posts: int = Field(default=0)
    total_likes: int = Field(default=0)
    total_comments: int = Field(default=0)
    total_shares: int = Field(default=0)
    engagement_rate: Optional[float] = Field(default=None)

    # Content metrics
    posts_this_period: int = Field(default=0)
    avg_likes: Optional[float] = Field(default=None)
    avg_comments: Optional[float] = Field(default=None)
    top_post_likes: int = Field(default=0)

    recorded_at: datetime = Field(default_factory=datetime.utcnow)


class CompetitorMetrics(CompetitorMetricsBase, table=True):
    """Historical metrics snapshot for a competitor."""
    __tablename__ = "competitor_metrics"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)


class CompetitorMetricsRead(CompetitorMetricsBase):
    """Schema for reading competitor metrics."""
    id: UUID
    owner_id: UUID
    created_at: datetime


# ==================== Competitor Content ====================

class CompetitorContentBase(SQLModel):
    """Base model for tracked competitor content."""
    competitor_id: UUID = Field(foreign_key="competitors.id", index=True)
    platform: str = Field(max_length=50)
    post_id: Optional[str] = Field(default=None, max_length=100)
    post_url: Optional[str] = Field(default=None, max_length=500)

    # Content
    content: str = Field(max_length=5000)
    content_type: str = Field(max_length=50)  # text, image, video, carousel
    hashtags: Optional[str] = Field(default=None, max_length=1000)

    # Metrics
    likes: int = Field(default=0)
    comments: int = Field(default=0)
    shares: int = Field(default=0)
    views: Optional[int] = Field(default=None)
    engagement_rate: Optional[float] = Field(default=None)

    posted_at: datetime


class CompetitorContent(CompetitorContentBase, table=True):
    """Tracked content from competitors."""
    __tablename__ = "competitor_content"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    # Analysis
    is_top_performer: bool = Field(default=False)
    notes: Optional[str] = Field(default=None, max_length=500)

    created_at: datetime = Field(default_factory=datetime.utcnow)


class CompetitorContentRead(CompetitorContentBase):
    """Schema for reading competitor content."""
    id: UUID
    owner_id: UUID
    is_top_performer: bool
    notes: Optional[str]
    created_at: datetime


# ==================== Competitive Insights ====================

class CompetitiveInsightBase(SQLModel):
    """Base model for competitive insights."""
    competitor_id: Optional[UUID] = Field(default=None, foreign_key="competitors.id")
    insight_type: str = Field(max_length=50)  # gap, opportunity, threat, trend
    category: str = Field(max_length=50)  # content, engagement, growth, timing
    title: str = Field(max_length=200)
    description: str = Field(max_length=2000)
    priority: str = Field(max_length=20)  # low, medium, high
    actionable: bool = Field(default=True)


class CompetitiveInsight(CompetitiveInsightBase, table=True):
    """Generated insight from competitive analysis."""
    __tablename__ = "competitive_insights"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    # Status
    is_read: bool = Field(default=False)
    is_actioned: bool = Field(default=False)
    actioned_at: Optional[datetime] = Field(default=None)

    generated_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = Field(default=None)


class CompetitiveInsightRead(CompetitiveInsightBase):
    """Schema for reading competitive insights."""
    id: UUID
    owner_id: UUID
    is_read: bool
    is_actioned: bool
    actioned_at: Optional[datetime]
    generated_at: datetime
    expires_at: Optional[datetime]
