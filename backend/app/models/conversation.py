"""Models for Conversation Intelligence - meeting summaries, call analysis."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel as PydanticBaseModel
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class ConversationType(str, Enum):
    """Type of conversation."""
    MEETING = "meeting"
    CALL = "call"
    EMAIL_THREAD = "email_thread"
    CHAT = "chat"
    OTHER = "other"


class SentimentType(str, Enum):
    """Overall sentiment of conversation."""
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    MIXED = "mixed"


class ConversationAnalysis(SQLModel, table=True):
    """Database model for conversation analysis."""

    __tablename__ = "conversation_analyses"

    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Associated entities
    contact_id: Optional[UUID] = Field(default=None, foreign_key="contacts.id", index=True)
    deal_id: Optional[UUID] = Field(default=None, foreign_key="deals.id", index=True)
    activity_id: Optional[UUID] = Field(default=None, foreign_key="activities.id", index=True)

    # Conversation metadata
    type: ConversationType = Field(default=ConversationType.OTHER)
    title: str = Field(max_length=200)
    occurred_at: datetime = Field(default_factory=datetime.utcnow)
    duration_minutes: Optional[int] = None
    participants: list = Field(default_factory=list, sa_column=Column(JSONB))

    # Original content
    transcript: Optional[str] = None  # Full transcript if available
    notes: Optional[str] = None  # User notes

    # AI Analysis
    summary: str  # AI-generated summary
    key_points: list = Field(default_factory=list, sa_column=Column(JSONB))
    action_items: list = Field(default_factory=list, sa_column=Column(JSONB))
    decisions_made: list = Field(default_factory=list, sa_column=Column(JSONB))
    questions_raised: list = Field(default_factory=list, sa_column=Column(JSONB))
    follow_up_required: bool = Field(default=False)

    # Sentiment analysis
    sentiment: SentimentType = Field(default=SentimentType.NEUTRAL)
    sentiment_score: float = Field(default=0.0, ge=-1.0, le=1.0)
    sentiment_details: dict = Field(default_factory=dict, sa_column=Column(JSONB))

    # Extracted entities
    mentioned_people: list = Field(default_factory=list, sa_column=Column(JSONB))
    mentioned_companies: list = Field(default_factory=list, sa_column=Column(JSONB))
    mentioned_products: list = Field(default_factory=list, sa_column=Column(JSONB))
    mentioned_dates: list = Field(default_factory=list, sa_column=Column(JSONB))
    mentioned_amounts: list = Field(default_factory=list, sa_column=Column(JSONB))

    # Topics and keywords
    topics: list = Field(default_factory=list, sa_column=Column(JSONB))
    keywords: list = Field(default_factory=list, sa_column=Column(JSONB))

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    analyzed_at: datetime = Field(default_factory=datetime.utcnow)

    # AI metadata
    model_version: str = Field(default="llama3.1")


class ActionItem(PydanticBaseModel):
    """An action item extracted from a conversation."""
    description: str
    assignee: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "medium"
    completed: bool = False


# Response models
class ConversationAnalysisResponse(PydanticBaseModel):
    """API response for conversation analysis."""
    id: UUID
    contact_id: Optional[UUID]
    deal_id: Optional[UUID]
    activity_id: Optional[UUID]
    type: ConversationType
    title: str
    occurred_at: datetime
    duration_minutes: Optional[int]
    participants: list
    summary: str
    key_points: list
    action_items: list
    decisions_made: list
    questions_raised: list
    follow_up_required: bool
    sentiment: SentimentType
    sentiment_score: float
    topics: list
    keywords: list
    mentioned_people: list
    mentioned_companies: list
    created_at: datetime
    analyzed_at: datetime
    model_version: str

    class Config:
        from_attributes = True


class AnalyzeConversationRequest(PydanticBaseModel):
    """Request to analyze a conversation."""
    type: ConversationType = ConversationType.OTHER
    title: str
    transcript: Optional[str] = None
    notes: Optional[str] = None
    contact_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    activity_id: Optional[UUID] = None
    occurred_at: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    participants: list[str] = []


class QuickSummarizeRequest(PydanticBaseModel):
    """Request for quick summarization without full analysis."""
    text: str
    context: Optional[str] = None
