from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Column, Index, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship

from app.db.base import BaseModel
from app.models.social_media import SocialPlatform

if TYPE_CHECKING:
    from app.models.contact import Contact
    from app.models.company import Company
    from app.models.social_media import SocialAccount
    from app.models.user import User


class MessageType(str, Enum):
    """Type of social message."""

    DIRECT_MESSAGE = "direct_message"
    MENTION = "mention"
    COMMENT = "comment"
    REPLY = "reply"


class MessageStatus(str, Enum):
    """Status of social message."""

    UNREAD = "unread"
    READ = "read"
    RESPONDED = "responded"
    ARCHIVED = "archived"


class SocialMessage(BaseModel, table=True):
    """Social media message/interaction."""

    __tablename__ = "social_messages"
    __table_args__ = (
        Index("ix_social_messages_account_id", "account_id"),
        Index("ix_social_messages_status", "status"),
        Index("ix_social_messages_message_type", "message_type"),
        Index("ix_social_messages_received_at", "received_at"),
        Index("ix_social_messages_thread_id", "thread_id"),
    )

    account_id: UUID = Field(foreign_key="social_accounts.id")

    # Platform identification
    platform: SocialPlatform = Field(index=True)
    platform_message_id: str = Field(max_length=200, unique=True)
    thread_id: Optional[str] = Field(default=None, max_length=200)

    # Message details
    message_type: MessageType = Field(default=MessageType.DIRECT_MESSAGE)
    content: str = Field(sa_column=Column(Text))

    # Sender info
    sender_platform_id: str = Field(max_length=200)
    sender_username: str = Field(max_length=200)
    sender_display_name: Optional[str] = Field(default=None, max_length=200)
    sender_profile_image: Optional[str] = Field(default=None, max_length=1000)

    # Timestamps
    received_at: datetime = Field(default_factory=datetime.utcnow)

    # Status tracking
    status: MessageStatus = Field(default=MessageStatus.UNREAD)
    read_at: Optional[datetime] = Field(default=None)
    responded_at: Optional[datetime] = Field(default=None)
    archived_at: Optional[datetime] = Field(default=None)

    # Assignment
    assigned_to: Optional[UUID] = Field(default=None, foreign_key="users.id")

    # CRM linking
    contact_id: Optional[UUID] = Field(default=None, foreign_key="contacts.id")
    company_id: Optional[UUID] = Field(default=None, foreign_key="companies.id")

    # Platform-specific data
    platform_data: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))

    # Relationships
    replies: list["SocialMessageReply"] = Relationship(back_populates="message")


class SocialMessageReply(BaseModel, table=True):
    """Reply sent to a social message."""

    __tablename__ = "social_message_replies"
    __table_args__ = (Index("ix_social_message_replies_message_id", "message_id"),)

    message_id: UUID = Field(foreign_key="social_messages.id")

    content: str = Field(sa_column=Column(Text))
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    sent_by: UUID = Field(foreign_key="users.id")

    # Platform response
    platform_reply_id: Optional[str] = Field(default=None, max_length=200)
    send_status: str = Field(default="sent")  # sent, failed
    error_message: Optional[str] = Field(default=None)

    # Relationships
    message: "SocialMessage" = Relationship(back_populates="replies")


# Schema classes
class SocialMessageRead(BaseModel):
    """Schema for reading a social message."""

    id: UUID
    account_id: UUID
    platform: SocialPlatform
    platform_message_id: str
    thread_id: Optional[str]
    message_type: MessageType
    content: str
    sender_platform_id: str
    sender_username: str
    sender_display_name: Optional[str]
    sender_profile_image: Optional[str]
    received_at: datetime
    status: MessageStatus
    read_at: Optional[datetime]
    responded_at: Optional[datetime]
    assigned_to: Optional[UUID]
    contact_id: Optional[UUID]
    company_id: Optional[UUID]
    created_at: datetime


class SocialMessageReplyCreate(BaseModel):
    """Schema for creating a reply."""

    content: str


class SocialMessageReplyRead(BaseModel):
    """Schema for reading a reply."""

    id: UUID
    message_id: UUID
    content: str
    sent_at: datetime
    sent_by: UUID
    platform_reply_id: Optional[str]
    send_status: str
    error_message: Optional[str]
