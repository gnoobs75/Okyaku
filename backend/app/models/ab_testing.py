"""A/B Testing models for post variation testing."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class TestStatus(str, Enum):
    """Status of an A/B test."""
    DRAFT = "draft"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TestType(str, Enum):
    """Type of A/B test."""
    CONTENT = "content"  # Different post content
    TIMING = "timing"  # Different posting times
    HASHTAGS = "hashtags"  # Different hashtag sets
    MEDIA = "media"  # Different images/videos
    CTA = "cta"  # Different calls to action


class WinnerCriteria(str, Enum):
    """Criteria for determining the winner."""
    ENGAGEMENT_RATE = "engagement_rate"
    LIKES = "likes"
    COMMENTS = "comments"
    SHARES = "shares"
    CLICKS = "clicks"
    REACH = "reach"
    IMPRESSIONS = "impressions"


# ==================== A/B Tests ====================

class ABTestBase(SQLModel):
    """Base model for A/B tests."""
    name: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    test_type: TestType
    platform: str = Field(max_length=50)
    account_id: Optional[UUID] = Field(default=None, foreign_key="social_accounts.id")

    # Test configuration
    winner_criteria: WinnerCriteria = Field(default=WinnerCriteria.ENGAGEMENT_RATE)
    confidence_level: float = Field(default=95.0)  # Statistical confidence %
    min_sample_size: int = Field(default=100)  # Minimum impressions per variant
    auto_select_winner: bool = Field(default=True)

    # Scheduling
    scheduled_start: Optional[datetime] = Field(default=None)
    scheduled_end: Optional[datetime] = Field(default=None)
    duration_hours: int = Field(default=24)

    status: TestStatus = Field(default=TestStatus.DRAFT)


class ABTest(ABTestBase, table=True):
    """A/B test configuration."""
    __tablename__ = "ab_tests"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    # Results
    winning_variant_id: Optional[UUID] = Field(default=None)
    result_summary: Optional[str] = Field(default=None, max_length=2000)
    statistical_significance: Optional[float] = Field(default=None)

    # Timestamps
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ABTestCreate(ABTestBase):
    """Schema for creating an A/B test."""
    pass


class ABTestUpdate(SQLModel):
    """Schema for updating an A/B test."""
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    winner_criteria: Optional[WinnerCriteria] = None
    confidence_level: Optional[float] = None
    min_sample_size: Optional[int] = None
    auto_select_winner: Optional[bool] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    duration_hours: Optional[int] = None
    status: Optional[TestStatus] = None


class ABTestRead(ABTestBase):
    """Schema for reading an A/B test."""
    id: UUID
    owner_id: UUID
    winning_variant_id: Optional[UUID]
    result_summary: Optional[str]
    statistical_significance: Optional[float]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime


# ==================== Test Variants ====================

class TestVariantBase(SQLModel):
    """Base model for test variants."""
    test_id: UUID = Field(foreign_key="ab_tests.id", index=True)
    name: str = Field(max_length=100)  # e.g., "Variant A", "Variant B"
    is_control: bool = Field(default=False)

    # Content
    content: str = Field(max_length=5000)
    media_urls: Optional[str] = Field(default=None, max_length=2000)  # Comma-separated
    hashtags: Optional[str] = Field(default=None, max_length=1000)
    cta_text: Optional[str] = Field(default=None, max_length=200)
    cta_url: Optional[str] = Field(default=None, max_length=500)

    # Scheduling (for timing tests)
    scheduled_time: Optional[datetime] = Field(default=None)

    # Traffic allocation
    traffic_percentage: float = Field(default=50.0)  # % of traffic for this variant


class TestVariant(TestVariantBase, table=True):
    """Variant in an A/B test."""
    __tablename__ = "test_variants"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    # Linked post (when published)
    post_id: Optional[UUID] = Field(default=None, foreign_key="social_posts.id")
    published_at: Optional[datetime] = Field(default=None)

    # Performance metrics
    impressions: int = Field(default=0)
    reach: int = Field(default=0)
    likes: int = Field(default=0)
    comments: int = Field(default=0)
    shares: int = Field(default=0)
    clicks: int = Field(default=0)
    engagement_rate: Optional[float] = Field(default=None)

    # Status
    is_winner: bool = Field(default=False)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TestVariantCreate(TestVariantBase):
    """Schema for creating a test variant."""
    pass


class TestVariantUpdate(SQLModel):
    """Schema for updating a test variant."""
    name: Optional[str] = Field(default=None, max_length=100)
    content: Optional[str] = Field(default=None, max_length=5000)
    media_urls: Optional[str] = Field(default=None, max_length=2000)
    hashtags: Optional[str] = Field(default=None, max_length=1000)
    cta_text: Optional[str] = Field(default=None, max_length=200)
    cta_url: Optional[str] = Field(default=None, max_length=500)
    scheduled_time: Optional[datetime] = None
    traffic_percentage: Optional[float] = None


class TestVariantRead(TestVariantBase):
    """Schema for reading a test variant."""
    id: UUID
    owner_id: UUID
    post_id: Optional[UUID]
    published_at: Optional[datetime]
    impressions: int
    reach: int
    likes: int
    comments: int
    shares: int
    clicks: int
    engagement_rate: Optional[float]
    is_winner: bool
    created_at: datetime
    updated_at: datetime


# ==================== Test Results ====================

class TestResultSnapshot(SQLModel, table=True):
    """Periodic snapshot of test results for tracking progress."""
    __tablename__ = "test_result_snapshots"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    test_id: UUID = Field(foreign_key="ab_tests.id", index=True)
    variant_id: UUID = Field(foreign_key="test_variants.id", index=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    # Metrics at this point
    impressions: int = Field(default=0)
    engagement_rate: Optional[float] = Field(default=None)
    confidence: Optional[float] = Field(default=None)

    recorded_at: datetime = Field(default_factory=datetime.utcnow)


class TestResultSnapshotRead(SQLModel):
    """Schema for reading test result snapshots."""
    id: UUID
    test_id: UUID
    variant_id: UUID
    impressions: int
    engagement_rate: Optional[float]
    confidence: Optional[float]
    recorded_at: datetime
