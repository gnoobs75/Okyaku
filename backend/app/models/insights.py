"""Models for AI-powered insights and anomaly detection."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel as PydanticBaseModel
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class InsightType(str, Enum):
    """Types of insights."""
    ANOMALY = "anomaly"  # Unexpected pattern
    TREND = "trend"  # Emerging trend
    OPPORTUNITY = "opportunity"  # Potential opportunity
    RISK = "risk"  # Potential risk
    MILESTONE = "milestone"  # Achievement/milestone
    ALERT = "alert"  # Immediate attention needed


class InsightSeverity(str, Enum):
    """Severity levels."""
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class InsightStatus(str, Enum):
    """Insight status."""
    NEW = "new"
    VIEWED = "viewed"
    ACKNOWLEDGED = "acknowledged"
    DISMISSED = "dismissed"
    RESOLVED = "resolved"


class InsightCategory(str, Enum):
    """Categories for insights."""
    DEAL_VELOCITY = "deal_velocity"
    PIPELINE_HEALTH = "pipeline_health"
    CONTACT_ENGAGEMENT = "contact_engagement"
    CHURN_RISK = "churn_risk"
    REVENUE = "revenue"
    ACTIVITY = "activity"
    CONVERSION = "conversion"
    PERFORMANCE = "performance"


class Insight(SQLModel, table=True):
    """Database model for AI-generated insights."""

    __tablename__ = "insights"

    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Classification
    type: InsightType = Field(index=True)
    category: InsightCategory = Field(index=True)
    severity: InsightSeverity = Field(default=InsightSeverity.MEDIUM, index=True)
    status: InsightStatus = Field(default=InsightStatus.NEW, index=True)

    # Content
    title: str = Field(max_length=200)
    description: str
    details: dict = Field(default_factory=dict, sa_column=Column(JSONB))

    # Associated entities
    contact_id: Optional[UUID] = Field(default=None, foreign_key="contacts.id", index=True)
    deal_id: Optional[UUID] = Field(default=None, foreign_key="deals.id", index=True)
    company_id: Optional[UUID] = Field(default=None, foreign_key="companies.id", index=True)

    # Metrics
    metric_name: Optional[str] = None  # e.g., "deal_velocity", "engagement_rate"
    metric_value: Optional[float] = None
    metric_baseline: Optional[float] = None  # Expected/normal value
    deviation_percent: Optional[float] = None  # % deviation from baseline

    # Actions
    suggested_action: Optional[str] = None
    action_taken: Optional[str] = None

    # Timestamps
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    acknowledged_at: Optional[datetime] = None

    # AI metadata
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    model_version: str = Field(default="llama3.1")


# Response models
class InsightResponse(PydanticBaseModel):
    """API response for an insight."""
    id: UUID
    type: InsightType
    category: InsightCategory
    severity: InsightSeverity
    status: InsightStatus
    title: str
    description: str
    details: dict
    contact_id: Optional[UUID]
    deal_id: Optional[UUID]
    company_id: Optional[UUID]
    metric_name: Optional[str]
    metric_value: Optional[float]
    metric_baseline: Optional[float]
    deviation_percent: Optional[float]
    suggested_action: Optional[str]
    confidence: float
    detected_at: datetime

    class Config:
        from_attributes = True


class InsightsListResponse(PydanticBaseModel):
    """Response for list of insights."""
    insights: list[InsightResponse]
    total: int
    new_count: int
    critical_count: int


class InsightsSummary(PydanticBaseModel):
    """Summary of insights."""
    total_insights: int
    by_type: dict[str, int]
    by_severity: dict[str, int]
    by_category: dict[str, int]
    new_insights: int
    critical_insights: int
    recent_insights: list[InsightResponse]


class UpdateInsightRequest(PydanticBaseModel):
    """Request to update insight status."""
    status: InsightStatus
    action_taken: Optional[str] = None
