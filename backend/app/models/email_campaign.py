from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Column, Index, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.models.contact import Contact
    from app.models.user import User


class CampaignStatus(str, Enum):
    """Email campaign status."""

    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    SENT = "sent"
    PAUSED = "paused"
    CANCELLED = "cancelled"


class DeliveryStatus(str, Enum):
    """Individual email delivery status."""

    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    OPENED = "opened"
    CLICKED = "clicked"
    BOUNCED = "bounced"
    COMPLAINED = "complained"
    UNSUBSCRIBED = "unsubscribed"
    FAILED = "failed"


class EmailTemplate(BaseModel, table=True):
    """Email template for campaigns."""

    __tablename__ = "email_templates"
    __table_args__ = (
        Index("ix_email_templates_name", "name"),
        Index("ix_email_templates_created_by", "created_by"),
    )

    name: str = Field(index=True)
    subject: str = Field(max_length=500)
    html_content: str = Field(sa_column=Column(Text))
    text_content: Optional[str] = Field(default=None, sa_column=Column(Text))
    description: Optional[str] = Field(default=None)
    is_active: bool = Field(default=True)

    # Template variables for personalization (e.g., {"first_name": "string", "company": "string"})
    variables: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))

    # Creator info
    created_by: Optional[UUID] = Field(default=None, foreign_key="users.id")
    updated_by: Optional[UUID] = Field(default=None, foreign_key="users.id")

    # Relationships
    campaigns: list["EmailCampaign"] = Relationship(back_populates="template")


class EmailCampaign(BaseModel, table=True):
    """Email campaign entity."""

    __tablename__ = "email_campaigns"
    __table_args__ = (
        Index("ix_email_campaigns_status", "status"),
        Index("ix_email_campaigns_scheduled_at", "scheduled_at"),
        Index("ix_email_campaigns_created_by", "created_by"),
    )

    name: str = Field(index=True)
    description: Optional[str] = Field(default=None)
    status: CampaignStatus = Field(default=CampaignStatus.DRAFT)

    # Template reference
    template_id: UUID = Field(foreign_key="email_templates.id")

    # Subject line (can override template)
    subject: Optional[str] = Field(default=None, max_length=500)

    # Scheduling
    scheduled_at: Optional[datetime] = Field(default=None)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)

    # Recipient filtering criteria
    recipient_filter: dict = Field(
        default_factory=dict,
        sa_column=Column(JSONB, default={}),
        description="Filter criteria for contacts (e.g., {'status': 'customer', 'tags': ['newsletter']})"
    )

    # Tracking settings
    track_opens: bool = Field(default=True)
    track_clicks: bool = Field(default=True)

    # Creator info
    created_by: Optional[UUID] = Field(default=None, foreign_key="users.id")
    updated_by: Optional[UUID] = Field(default=None, foreign_key="users.id")

    # Relationships
    template: "EmailTemplate" = Relationship(back_populates="campaigns")
    recipients: list["EmailRecipient"] = Relationship(back_populates="campaign")
    metrics: Optional["EmailCampaignMetrics"] = Relationship(back_populates="campaign")


class EmailRecipient(BaseModel, table=True):
    """Email recipient for a campaign."""

    __tablename__ = "email_recipients"
    __table_args__ = (
        Index("ix_email_recipients_campaign_id", "campaign_id"),
        Index("ix_email_recipients_contact_id", "contact_id"),
        Index("ix_email_recipients_status", "status"),
        Index("ix_email_recipients_email", "email"),
    )

    campaign_id: UUID = Field(foreign_key="email_campaigns.id")
    contact_id: Optional[UUID] = Field(default=None, foreign_key="contacts.id")

    # Recipient email (cached for historical purposes)
    email: str = Field(index=True)
    first_name: Optional[str] = Field(default=None)
    last_name: Optional[str] = Field(default=None)

    # Personalization data merged at send time
    personalization_data: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))

    # Delivery tracking
    status: DeliveryStatus = Field(default=DeliveryStatus.PENDING)
    sent_at: Optional[datetime] = Field(default=None)
    delivered_at: Optional[datetime] = Field(default=None)
    opened_at: Optional[datetime] = Field(default=None)
    clicked_at: Optional[datetime] = Field(default=None)
    bounced_at: Optional[datetime] = Field(default=None)
    error_message: Optional[str] = Field(default=None)

    # AWS SES message ID for tracking
    message_id: Optional[str] = Field(default=None, max_length=200)

    # Relationships
    campaign: "EmailCampaign" = Relationship(back_populates="recipients")
    contact: Optional["Contact"] = Relationship()


class EmailCampaignMetrics(BaseModel, table=True):
    """Aggregated metrics for a campaign."""

    __tablename__ = "email_campaign_metrics"
    __table_args__ = (Index("ix_email_campaign_metrics_campaign_id", "campaign_id"),)

    campaign_id: UUID = Field(foreign_key="email_campaigns.id", unique=True)

    # Counts
    total_recipients: int = Field(default=0)
    sent_count: int = Field(default=0)
    delivered_count: int = Field(default=0)
    opened_count: int = Field(default=0)
    clicked_count: int = Field(default=0)
    bounced_count: int = Field(default=0)
    complained_count: int = Field(default=0)
    unsubscribed_count: int = Field(default=0)
    failed_count: int = Field(default=0)

    # Unique counts (for rate calculations)
    unique_opens: int = Field(default=0)
    unique_clicks: int = Field(default=0)

    # Last updated
    last_calculated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    campaign: "EmailCampaign" = Relationship(back_populates="metrics")


class EmailClick(BaseModel, table=True):
    """Tracks individual link clicks in emails."""

    __tablename__ = "email_clicks"
    __table_args__ = (
        Index("ix_email_clicks_recipient_id", "recipient_id"),
        Index("ix_email_clicks_clicked_at", "clicked_at"),
    )

    recipient_id: UUID = Field(foreign_key="email_recipients.id")
    url: str = Field(max_length=2000)
    clicked_at: datetime = Field(default_factory=datetime.utcnow)
    user_agent: Optional[str] = Field(default=None, max_length=500)
    ip_address: Optional[str] = Field(default=None, max_length=45)


# Schema classes for API
class EmailTemplateCreate(BaseModel):
    """Schema for creating an email template."""

    name: str
    subject: str
    html_content: str
    text_content: Optional[str] = None
    description: Optional[str] = None
    variables: dict = {}


class EmailTemplateUpdate(BaseModel):
    """Schema for updating an email template."""

    name: Optional[str] = None
    subject: Optional[str] = None
    html_content: Optional[str] = None
    text_content: Optional[str] = None
    description: Optional[str] = None
    variables: Optional[dict] = None
    is_active: Optional[bool] = None


class EmailTemplateRead(BaseModel):
    """Schema for reading an email template."""

    id: UUID
    name: str
    subject: str
    html_content: str
    text_content: Optional[str]
    description: Optional[str]
    variables: dict
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]


class EmailCampaignCreate(BaseModel):
    """Schema for creating an email campaign."""

    name: str
    description: Optional[str] = None
    template_id: UUID
    subject: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    recipient_filter: dict = {}
    track_opens: bool = True
    track_clicks: bool = True


class EmailCampaignUpdate(BaseModel):
    """Schema for updating an email campaign."""

    name: Optional[str] = None
    description: Optional[str] = None
    template_id: Optional[UUID] = None
    subject: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    recipient_filter: Optional[dict] = None
    track_opens: Optional[bool] = None
    track_clicks: Optional[bool] = None


class EmailCampaignRead(BaseModel):
    """Schema for reading an email campaign."""

    id: UUID
    name: str
    description: Optional[str]
    status: CampaignStatus
    template_id: UUID
    subject: Optional[str]
    scheduled_at: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    recipient_filter: dict
    track_opens: bool
    track_clicks: bool
    created_at: datetime
    updated_at: Optional[datetime]


class EmailCampaignReadWithMetrics(EmailCampaignRead):
    """Schema for reading an email campaign with metrics."""

    total_recipients: int = 0
    sent_count: int = 0
    delivered_count: int = 0
    opened_count: int = 0
    clicked_count: int = 0
    bounced_count: int = 0
    open_rate: float = 0.0
    click_rate: float = 0.0


class EmailRecipientRead(BaseModel):
    """Schema for reading an email recipient."""

    id: UUID
    campaign_id: UUID
    contact_id: Optional[UUID]
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    status: DeliveryStatus
    sent_at: Optional[datetime]
    delivered_at: Optional[datetime]
    opened_at: Optional[datetime]
    clicked_at: Optional[datetime]
    error_message: Optional[str]
