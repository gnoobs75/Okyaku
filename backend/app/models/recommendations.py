"""Models for AI-powered recommendations and next-best-actions."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel as PydanticBaseModel
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class RecommendationType(str, Enum):
    """Types of recommendations."""
    CONTACT_ACTION = "contact_action"  # Actions for specific contacts
    DEAL_ACTION = "deal_action"  # Actions for specific deals
    FOLLOW_UP = "follow_up"  # Follow-up reminders
    OUTREACH = "outreach"  # Outreach suggestions
    ENGAGEMENT = "engagement"  # Engagement opportunities
    UPSELL = "upsell"  # Upsell/cross-sell opportunities
    RETENTION = "retention"  # Retention actions
    PRIORITIZATION = "prioritization"  # Task prioritization


class RecommendationPriority(str, Enum):
    """Priority levels for recommendations."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class RecommendationStatus(str, Enum):
    """Status of a recommendation."""
    PENDING = "pending"
    ACCEPTED = "accepted"
    DISMISSED = "dismissed"
    COMPLETED = "completed"
    EXPIRED = "expired"


class Recommendation(SQLModel, table=True):
    """Database model for AI recommendations."""

    __tablename__ = "recommendations"

    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Target entity
    contact_id: Optional[UUID] = Field(default=None, foreign_key="contacts.id", index=True)
    deal_id: Optional[UUID] = Field(default=None, foreign_key="deals.id", index=True)

    # Recommendation details
    type: RecommendationType = Field(index=True)
    priority: RecommendationPriority = Field(default=RecommendationPriority.MEDIUM, index=True)
    status: RecommendationStatus = Field(default=RecommendationStatus.PENDING, index=True)

    # Content
    title: str = Field(max_length=200)
    description: str
    reasoning: str  # Why this recommendation was made

    # Action details
    suggested_action: str  # Specific action to take
    action_template: Optional[str] = None  # Template for email/message if applicable

    # Context and scoring
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    impact_score: float = Field(default=0.0, ge=0.0, le=1.0)  # Expected impact
    urgency_score: float = Field(default=0.0, ge=0.0, le=1.0)  # Time sensitivity

    # Supporting data
    context_data: dict = Field(default_factory=dict, sa_column=Column(JSONB))

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    acted_on_at: Optional[datetime] = None

    # AI metadata
    model_version: str = Field(default="llama3.1")


# Response models
class RecommendationResponse(PydanticBaseModel):
    """API response model for a recommendation."""
    id: UUID
    contact_id: Optional[UUID]
    deal_id: Optional[UUID]
    type: RecommendationType
    priority: RecommendationPriority
    status: RecommendationStatus
    title: str
    description: str
    reasoning: str
    suggested_action: str
    action_template: Optional[str]
    confidence: float
    impact_score: float
    urgency_score: float
    context_data: dict
    created_at: datetime
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True


class RecommendationListResponse(PydanticBaseModel):
    """API response for list of recommendations."""
    recommendations: list[RecommendationResponse]
    total: int
    pending_count: int
    high_priority_count: int


class RecommendationActionRequest(PydanticBaseModel):
    """Request to act on a recommendation."""
    action: str  # "accept", "dismiss", "complete"
    notes: Optional[str] = None


class NextBestActionsResponse(PydanticBaseModel):
    """Response with prioritized next-best-actions."""
    contact_actions: list[RecommendationResponse]
    deal_actions: list[RecommendationResponse]
    follow_ups: list[RecommendationResponse]
    top_priorities: list[RecommendationResponse]
    generated_at: datetime
