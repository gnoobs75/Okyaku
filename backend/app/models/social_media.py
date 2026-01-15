from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Column, Index, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User


class SocialPlatform(str, Enum):
    """Supported social media platforms."""

    LINKEDIN = "linkedin"
    TWITTER = "twitter"  # X
    FACEBOOK = "facebook"


class AccountStatus(str, Enum):
    """Social account connection status."""

    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    TOKEN_EXPIRED = "token_expired"
    ERROR = "error"


class PostStatus(str, Enum):
    """Social post status."""

    DRAFT = "draft"
    SCHEDULED = "scheduled"
    QUEUED = "queued"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    FAILED = "failed"
    CANCELLED = "cancelled"


class MediaType(str, Enum):
    """Media attachment type."""

    IMAGE = "image"
    VIDEO = "video"
    GIF = "gif"
    LINK = "link"


class SocialAccount(BaseModel, table=True):
    """Connected social media account."""

    __tablename__ = "social_accounts"
    __table_args__ = (
        Index("ix_social_accounts_platform", "platform"),
        Index("ix_social_accounts_owner_id", "owner_id"),
    )

    platform: SocialPlatform = Field(index=True)
    platform_user_id: str = Field(max_length=200)
    platform_username: str = Field(max_length=200)
    display_name: Optional[str] = Field(default=None, max_length=200)
    profile_image_url: Optional[str] = Field(default=None, max_length=1000)

    # Connection status
    status: AccountStatus = Field(default=AccountStatus.CONNECTED)
    error_message: Optional[str] = Field(default=None)

    # OAuth tokens (encrypted in production)
    access_token: str = Field(sa_column=Column(Text))
    refresh_token: Optional[str] = Field(default=None, sa_column=Column(Text))
    token_expires_at: Optional[datetime] = Field(default=None)

    # Platform-specific data
    platform_data: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))

    # Owner
    owner_id: UUID = Field(foreign_key="users.id")

    # Relationships
    posts: list["SocialPost"] = Relationship(back_populates="account")


class SocialPost(BaseModel, table=True):
    """Social media post."""

    __tablename__ = "social_posts"
    __table_args__ = (
        Index("ix_social_posts_account_id", "account_id"),
        Index("ix_social_posts_status", "status"),
        Index("ix_social_posts_scheduled_at", "scheduled_at"),
    )

    account_id: UUID = Field(foreign_key="social_accounts.id")

    # Content
    content: str = Field(sa_column=Column(Text))
    link_url: Optional[str] = Field(default=None, max_length=2000)
    link_title: Optional[str] = Field(default=None, max_length=500)
    link_description: Optional[str] = Field(default=None)

    # Status and scheduling
    status: PostStatus = Field(default=PostStatus.DRAFT)
    scheduled_at: Optional[datetime] = Field(default=None)
    published_at: Optional[datetime] = Field(default=None)
    timezone: str = Field(default="UTC", max_length=50)

    # Publishing details
    platform_post_id: Optional[str] = Field(default=None, max_length=200)
    platform_post_url: Optional[str] = Field(default=None, max_length=2000)

    # Error tracking
    error_message: Optional[str] = Field(default=None)
    retry_count: int = Field(default=0)
    last_retry_at: Optional[datetime] = Field(default=None)

    # Creator info
    created_by: Optional[UUID] = Field(default=None, foreign_key="users.id")

    # Relationships
    account: "SocialAccount" = Relationship(back_populates="posts")
    media_attachments: list["SocialMediaAttachment"] = Relationship(back_populates="post")
    analytics: Optional["SocialPostAnalytics"] = Relationship(back_populates="post")


class SocialMediaAttachment(BaseModel, table=True):
    """Media attachment for a social post."""

    __tablename__ = "social_media_attachments"
    __table_args__ = (Index("ix_social_media_attachments_post_id", "post_id"),)

    post_id: UUID = Field(foreign_key="social_posts.id")

    media_type: MediaType = Field(default=MediaType.IMAGE)
    file_url: str = Field(max_length=2000)
    thumbnail_url: Optional[str] = Field(default=None, max_length=2000)
    alt_text: Optional[str] = Field(default=None, max_length=500)
    file_size: Optional[int] = Field(default=None)
    width: Optional[int] = Field(default=None)
    height: Optional[int] = Field(default=None)
    duration_seconds: Optional[int] = Field(default=None)  # For video

    # Platform-specific media ID after upload
    platform_media_id: Optional[str] = Field(default=None, max_length=200)

    order: int = Field(default=0)

    # Relationships
    post: "SocialPost" = Relationship(back_populates="media_attachments")


class SocialPostAnalytics(BaseModel, table=True):
    """Analytics for a published social post."""

    __tablename__ = "social_post_analytics"
    __table_args__ = (Index("ix_social_post_analytics_post_id", "post_id"),)

    post_id: UUID = Field(foreign_key="social_posts.id", unique=True)

    # Engagement metrics
    impressions: int = Field(default=0)
    reach: int = Field(default=0)
    likes: int = Field(default=0)
    comments: int = Field(default=0)
    shares: int = Field(default=0)
    clicks: int = Field(default=0)
    saves: int = Field(default=0)

    # Video-specific
    video_views: int = Field(default=0)
    video_completion_rate: float = Field(default=0.0)

    # Calculated metrics
    engagement_rate: float = Field(default=0.0)

    # Last sync from platform
    last_synced_at: datetime = Field(default_factory=datetime.utcnow)

    # Raw data from platform
    platform_data: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))

    # Relationships
    post: "SocialPost" = Relationship(back_populates="analytics")


# Schema classes for API
class SocialAccountCreate(BaseModel):
    """Schema for connecting a social account."""

    platform: SocialPlatform
    authorization_code: str
    redirect_uri: str


class SocialAccountRead(BaseModel):
    """Schema for reading a social account."""

    id: UUID
    platform: SocialPlatform
    platform_user_id: str
    platform_username: str
    display_name: Optional[str]
    profile_image_url: Optional[str]
    status: AccountStatus
    error_message: Optional[str]
    token_expires_at: Optional[datetime]
    created_at: datetime


class SocialPostCreate(BaseModel):
    """Schema for creating a social post."""

    account_id: UUID
    content: str
    link_url: Optional[str] = None
    link_title: Optional[str] = None
    link_description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    timezone: str = "UTC"


class SocialPostUpdate(BaseModel):
    """Schema for updating a social post."""

    content: Optional[str] = None
    link_url: Optional[str] = None
    link_title: Optional[str] = None
    link_description: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    timezone: Optional[str] = None


class SocialPostRead(BaseModel):
    """Schema for reading a social post."""

    id: UUID
    account_id: UUID
    content: str
    link_url: Optional[str]
    link_title: Optional[str]
    link_description: Optional[str]
    status: PostStatus
    scheduled_at: Optional[datetime]
    published_at: Optional[datetime]
    timezone: str
    platform_post_id: Optional[str]
    platform_post_url: Optional[str]
    error_message: Optional[str]
    retry_count: int
    created_at: datetime


class SocialPostReadWithAnalytics(SocialPostRead):
    """Schema for reading a social post with analytics."""

    impressions: int = 0
    reach: int = 0
    likes: int = 0
    comments: int = 0
    shares: int = 0
    clicks: int = 0
    engagement_rate: float = 0.0


class MediaAttachmentCreate(BaseModel):
    """Schema for creating a media attachment."""

    media_type: MediaType
    file_url: str
    thumbnail_url: Optional[str] = None
    alt_text: Optional[str] = None
    order: int = 0


class MediaAttachmentRead(BaseModel):
    """Schema for reading a media attachment."""

    id: UUID
    post_id: UUID
    media_type: MediaType
    file_url: str
    thumbnail_url: Optional[str]
    alt_text: Optional[str]
    file_size: Optional[int]
    width: Optional[int]
    height: Optional[int]
    duration_seconds: Optional[int]
    order: int
