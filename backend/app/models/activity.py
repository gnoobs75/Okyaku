from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Column, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.contact import Contact
    from app.models.deal import Deal
    from app.models.user import User


class ActivityType(str, Enum):
    """Types of sales activities."""

    CALL = "call"
    EMAIL = "email"
    MEETING = "meeting"
    NOTE = "note"
    TASK = "task"
    OTHER = "other"


class ActivityBase(BaseModel):
    """Base activity fields."""

    type: ActivityType
    subject: str = Field(index=True)
    description: Optional[str] = Field(default=None)
    activity_date: datetime = Field(default_factory=datetime.utcnow)
    duration_minutes: Optional[int] = Field(default=None)
    outcome: Optional[str] = Field(default=None)  # e.g., "connected", "left voicemail", "no answer"


class Activity(ActivityBase, table=True):
    """Activity entity representing a sales interaction or event."""

    __tablename__ = "activities"
    __table_args__ = (
        Index("ix_activities_owner_id", "owner_id"),
        Index("ix_activities_contact_id", "contact_id"),
        Index("ix_activities_company_id", "company_id"),
        Index("ix_activities_deal_id", "deal_id"),
        Index("ix_activities_type", "type"),
        Index("ix_activities_activity_date", "activity_date"),
        Index("ix_activities_created_at", "created_at"),
    )

    # Foreign keys
    contact_id: Optional[UUID] = Field(default=None, foreign_key="contacts.id")
    company_id: Optional[UUID] = Field(default=None, foreign_key="companies.id")
    deal_id: Optional[UUID] = Field(default=None, foreign_key="deals.id")
    owner_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    created_by: Optional[UUID] = Field(default=None, foreign_key="users.id")
    updated_by: Optional[UUID] = Field(default=None, foreign_key="users.id")

    # Custom properties stored as JSONB
    custom_properties: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))

    # Relationships
    contact: Optional["Contact"] = Relationship()
    company: Optional["Company"] = Relationship()
    deal: Optional["Deal"] = Relationship()
    owner: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Activity.owner_id]"}
    )


class ActivityCreate(BaseModel):
    """Schema for creating an activity."""

    type: ActivityType
    subject: str
    description: Optional[str] = None
    activity_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    outcome: Optional[str] = None
    contact_id: Optional[UUID] = None
    company_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    custom_properties: dict = {}


class ActivityUpdate(BaseModel):
    """Schema for updating an activity."""

    type: Optional[ActivityType] = None
    subject: Optional[str] = None
    description: Optional[str] = None
    activity_date: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    outcome: Optional[str] = None
    contact_id: Optional[UUID] = None
    company_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    owner_id: Optional[UUID] = None
    custom_properties: Optional[dict] = None


class ActivityRead(BaseModel):
    """Schema for reading activity data."""

    id: UUID
    type: ActivityType
    subject: str
    description: Optional[str]
    activity_date: datetime
    duration_minutes: Optional[int]
    outcome: Optional[str]
    contact_id: Optional[UUID]
    company_id: Optional[UUID]
    deal_id: Optional[UUID]
    owner_id: Optional[UUID]
    custom_properties: dict
    created_at: datetime
    updated_at: Optional[datetime]


class ActivityReadWithRelations(ActivityRead):
    """Schema for reading activity data with related entity names."""

    contact_name: Optional[str] = None
    company_name: Optional[str] = None
    deal_name: Optional[str] = None
    owner_name: Optional[str] = None
