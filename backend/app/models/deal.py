from datetime import date, datetime
from decimal import Decimal
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Column, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.contact import Contact
    from app.models.pipeline import Pipeline, PipelineStage
    from app.models.user import User


class DealBase(BaseModel):
    """Base deal fields."""

    name: str = Field(index=True)
    value: Decimal = Field(default=Decimal("0.00"), decimal_places=2)
    currency: str = Field(default="USD", max_length=3)
    expected_close_date: Optional[date] = Field(default=None)
    actual_close_date: Optional[date] = Field(default=None)
    description: Optional[str] = Field(default=None)
    priority: Optional[str] = Field(default=None)  # e.g., "high", "medium", "low"
    source: Optional[str] = Field(default=None)  # e.g., "inbound", "outbound", "referral"
    lost_reason: Optional[str] = Field(default=None)


class Deal(DealBase, table=True):
    """Deal entity representing a sales opportunity."""

    __tablename__ = "deals"
    __table_args__ = (
        Index("ix_deals_owner_id", "owner_id"),
        Index("ix_deals_pipeline_id", "pipeline_id"),
        Index("ix_deals_stage_id", "stage_id"),
        Index("ix_deals_company_id", "company_id"),
        Index("ix_deals_contact_id", "contact_id"),
        Index("ix_deals_expected_close_date", "expected_close_date"),
        Index("ix_deals_created_at", "created_at"),
    )

    # Foreign keys
    pipeline_id: UUID = Field(foreign_key="pipelines.id")
    stage_id: UUID = Field(foreign_key="pipeline_stages.id")
    contact_id: Optional[UUID] = Field(default=None, foreign_key="contacts.id")
    company_id: Optional[UUID] = Field(default=None, foreign_key="companies.id")
    owner_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    created_by: Optional[UUID] = Field(default=None, foreign_key="users.id")
    updated_by: Optional[UUID] = Field(default=None, foreign_key="users.id")

    # Custom properties stored as JSONB
    custom_properties: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))

    # Relationships
    pipeline: "Pipeline" = Relationship(back_populates="deals")
    stage: "PipelineStage" = Relationship(back_populates="deals")
    contact: Optional["Contact"] = Relationship()
    company: Optional["Company"] = Relationship()
    owner: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Deal.owner_id]"}
    )


class DealStageHistory(BaseModel, table=True):
    """Tracks deal stage changes for history and analytics."""

    __tablename__ = "deal_stage_history"
    __table_args__ = (
        Index("ix_deal_stage_history_deal_id", "deal_id"),
        Index("ix_deal_stage_history_entered_at", "entered_at"),
    )

    deal_id: UUID = Field(foreign_key="deals.id")
    from_stage_id: Optional[UUID] = Field(default=None, foreign_key="pipeline_stages.id")
    to_stage_id: UUID = Field(foreign_key="pipeline_stages.id")
    entered_at: datetime = Field(default_factory=datetime.utcnow)
    changed_by: Optional[UUID] = Field(default=None, foreign_key="users.id")


class DealCreate(BaseModel):
    """Schema for creating a deal."""

    name: str
    value: Decimal = Decimal("0.00")
    currency: str = "USD"
    pipeline_id: UUID
    stage_id: UUID
    expected_close_date: Optional[date] = None
    contact_id: Optional[UUID] = None
    company_id: Optional[UUID] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    source: Optional[str] = None
    custom_properties: dict = {}


class DealUpdate(BaseModel):
    """Schema for updating a deal."""

    name: Optional[str] = None
    value: Optional[Decimal] = None
    currency: Optional[str] = None
    stage_id: Optional[UUID] = None
    expected_close_date: Optional[date] = None
    actual_close_date: Optional[date] = None
    contact_id: Optional[UUID] = None
    company_id: Optional[UUID] = None
    owner_id: Optional[UUID] = None
    description: Optional[str] = None
    priority: Optional[str] = None
    source: Optional[str] = None
    lost_reason: Optional[str] = None
    custom_properties: Optional[dict] = None


class DealRead(BaseModel):
    """Schema for reading deal data."""

    id: UUID
    name: str
    value: Decimal
    currency: str
    pipeline_id: UUID
    stage_id: UUID
    contact_id: Optional[UUID]
    company_id: Optional[UUID]
    owner_id: Optional[UUID]
    expected_close_date: Optional[date]
    actual_close_date: Optional[date]
    description: Optional[str]
    priority: Optional[str]
    source: Optional[str]
    lost_reason: Optional[str]
    custom_properties: dict
    created_at: datetime
    updated_at: Optional[datetime]


class DealReadWithRelations(DealRead):
    """Schema for reading deal data with related entity names."""

    stage_name: Optional[str] = None
    pipeline_name: Optional[str] = None
    contact_name: Optional[str] = None
    company_name: Optional[str] = None
    owner_name: Optional[str] = None
