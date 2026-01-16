"""Social Listening models for brand mention monitoring."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class MentionSentiment(str, Enum):
    """Sentiment classification for mentions."""
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    UNKNOWN = "unknown"


class MentionSource(str, Enum):
    """Source platform for mentions."""
    TWITTER = "twitter"
    LINKEDIN = "linkedin"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    NEWS = "news"
    BLOG = "blog"
    FORUM = "forum"
    OTHER = "other"


class AlertPriority(str, Enum):
    """Priority levels for alerts."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ==================== Tracked Keywords ====================

class TrackedKeywordBase(SQLModel):
    """Base model for tracked keywords."""
    keyword: str = Field(max_length=100, index=True)
    is_active: bool = Field(default=True)
    alert_on_mention: bool = Field(default=False)
    alert_priority: AlertPriority = Field(default=AlertPriority.MEDIUM)
    notes: Optional[str] = Field(default=None, max_length=500)


class TrackedKeyword(TrackedKeywordBase, table=True):
    """Tracked keyword for social listening."""
    __tablename__ = "tracked_keywords"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    mention_count: int = Field(default=0)
    last_mention_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TrackedKeywordCreate(TrackedKeywordBase):
    """Schema for creating a tracked keyword."""
    pass


class TrackedKeywordUpdate(SQLModel):
    """Schema for updating a tracked keyword."""
    keyword: Optional[str] = Field(default=None, max_length=100)
    is_active: Optional[bool] = None
    alert_on_mention: Optional[bool] = None
    alert_priority: Optional[AlertPriority] = None
    notes: Optional[str] = Field(default=None, max_length=500)


class TrackedKeywordRead(TrackedKeywordBase):
    """Schema for reading a tracked keyword."""
    id: UUID
    owner_id: UUID
    mention_count: int
    last_mention_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


# ==================== Brand Mentions ====================

class BrandMentionBase(SQLModel):
    """Base model for brand mentions."""
    keyword_id: UUID = Field(foreign_key="tracked_keywords.id", index=True)
    source: MentionSource
    source_url: Optional[str] = Field(default=None, max_length=500)
    source_post_id: Optional[str] = Field(default=None, max_length=100)

    # Content
    content: str = Field(max_length=5000)
    content_preview: Optional[str] = Field(default=None, max_length=280)

    # Author info
    author_username: Optional[str] = Field(default=None, max_length=100)
    author_display_name: Optional[str] = Field(default=None, max_length=200)
    author_profile_url: Optional[str] = Field(default=None, max_length=500)
    author_profile_image: Optional[str] = Field(default=None, max_length=500)
    author_followers: Optional[int] = Field(default=None)

    # Engagement metrics
    likes: int = Field(default=0)
    comments: int = Field(default=0)
    shares: int = Field(default=0)
    reach: Optional[int] = Field(default=None)

    # Analysis
    sentiment: MentionSentiment = Field(default=MentionSentiment.UNKNOWN)
    sentiment_score: Optional[float] = Field(default=None)  # -1 to 1
    influence_score: Optional[float] = Field(default=None)  # 0 to 100

    # Status
    is_read: bool = Field(default=False)
    is_responded: bool = Field(default=False)
    is_flagged: bool = Field(default=False)
    flag_reason: Optional[str] = Field(default=None, max_length=200)

    mentioned_at: datetime = Field(index=True)


class BrandMention(BrandMentionBase, table=True):
    """Brand mention record."""
    __tablename__ = "brand_mentions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class BrandMentionCreate(BrandMentionBase):
    """Schema for creating a brand mention."""
    pass


class BrandMentionUpdate(SQLModel):
    """Schema for updating a brand mention."""
    is_read: Optional[bool] = None
    is_responded: Optional[bool] = None
    is_flagged: Optional[bool] = None
    flag_reason: Optional[str] = Field(default=None, max_length=200)
    sentiment: Optional[MentionSentiment] = None


class BrandMentionRead(BrandMentionBase):
    """Schema for reading a brand mention."""
    id: UUID
    owner_id: UUID
    keyword: Optional[str] = None  # Populated from join
    created_at: datetime
    updated_at: datetime


# ==================== Mention Alerts ====================

class MentionAlertBase(SQLModel):
    """Base model for mention alerts."""
    mention_id: UUID = Field(foreign_key="brand_mentions.id", index=True)
    keyword_id: UUID = Field(foreign_key="tracked_keywords.id", index=True)
    priority: AlertPriority
    title: str = Field(max_length=200)
    message: str = Field(max_length=1000)
    is_acknowledged: bool = Field(default=False)


class MentionAlert(MentionAlertBase, table=True):
    """Alert for high-priority mentions."""
    __tablename__ = "mention_alerts"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    acknowledged_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class MentionAlertRead(MentionAlertBase):
    """Schema for reading an alert."""
    id: UUID
    owner_id: UUID
    acknowledged_at: Optional[datetime]
    created_at: datetime
