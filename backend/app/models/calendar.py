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


class CalendarProvider(str, Enum):
    """Supported calendar providers."""

    GOOGLE = "google"
    OUTLOOK = "outlook"


class CalendarConnectionStatus(str, Enum):
    """Calendar connection status."""

    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"
    ERROR = "error"


class EventSyncStatus(str, Enum):
    """Event synchronization status."""

    SYNCED = "synced"
    PENDING = "pending"
    FAILED = "failed"
    LOCAL_ONLY = "local_only"


class CalendarConnection(BaseModel, table=True):
    """OAuth connection to an external calendar provider."""

    __tablename__ = "calendar_connections"
    __table_args__ = (
        Index("ix_calendar_connections_owner_id", "owner_id"),
        Index("ix_calendar_connections_provider", "provider"),
        Index("ix_calendar_connections_status", "status"),
    )

    owner_id: UUID = Field(foreign_key="users.id", index=True)
    provider: CalendarProvider
    status: CalendarConnectionStatus = Field(default=CalendarConnectionStatus.ACTIVE)

    # OAuth tokens (encrypted in production)
    access_token: str = Field(sa_column=Column(Text))
    refresh_token: Optional[str] = Field(default=None, sa_column=Column(Text))
    token_expires_at: Optional[datetime] = None

    # Provider account info
    provider_account_id: Optional[str] = None
    provider_email: Optional[str] = None
    calendar_id: Optional[str] = None  # Primary calendar ID

    # Sync settings
    sync_enabled: bool = Field(default=True)
    sync_direction: str = Field(default="both")  # "both", "pull", "push"
    last_synced_at: Optional[datetime] = None
    sync_token: Optional[str] = None  # For incremental sync

    # Error tracking
    last_error: Optional[str] = None
    error_count: int = Field(default=0)

    # Relationships
    owner: Optional["User"] = Relationship()


class CalendarConnectionCreate(BaseModel):
    """Schema for creating a calendar connection."""

    provider: CalendarProvider
    access_token: str
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    provider_account_id: Optional[str] = None
    provider_email: Optional[str] = None
    calendar_id: Optional[str] = None


class CalendarConnectionUpdate(BaseModel):
    """Schema for updating a calendar connection."""

    status: Optional[CalendarConnectionStatus] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    sync_enabled: Optional[bool] = None
    sync_direction: Optional[str] = None
    calendar_id: Optional[str] = None


class CalendarConnectionRead(BaseModel):
    """Schema for reading calendar connection data."""

    id: UUID
    owner_id: UUID
    provider: CalendarProvider
    status: CalendarConnectionStatus
    provider_email: Optional[str]
    calendar_id: Optional[str]
    sync_enabled: bool
    sync_direction: str
    last_synced_at: Optional[datetime]
    error_count: int
    created_at: datetime
    updated_at: Optional[datetime]


class CalendarEvent(BaseModel, table=True):
    """Calendar event synced from or to external calendar."""

    __tablename__ = "calendar_events"
    __table_args__ = (
        Index("ix_calendar_events_owner_id", "owner_id"),
        Index("ix_calendar_events_connection_id", "connection_id"),
        Index("ix_calendar_events_start_time", "start_time"),
        Index("ix_calendar_events_end_time", "end_time"),
        Index("ix_calendar_events_contact_id", "contact_id"),
        Index("ix_calendar_events_external_id", "external_id"),
    )

    owner_id: UUID = Field(foreign_key="users.id", index=True)
    connection_id: UUID = Field(foreign_key="calendar_connections.id")

    # External calendar reference
    external_id: Optional[str] = None  # ID from Google/Outlook
    external_link: Optional[str] = None  # Link to event in provider

    # Event details
    title: str = Field(index=True)
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    location: Optional[str] = None

    # Timing
    start_time: datetime
    end_time: datetime
    all_day: bool = Field(default=False)
    timezone: str = Field(default="UTC")

    # Recurrence
    is_recurring: bool = Field(default=False)
    recurrence_rule: Optional[str] = None  # RRULE format
    recurring_event_id: Optional[str] = None  # Parent event ID for instances

    # Attendees and links to CRM
    contact_id: Optional[UUID] = Field(default=None, foreign_key="contacts.id")
    attendees: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))

    # Meeting link
    meeting_link: Optional[str] = None  # Zoom, Meet, Teams link

    # Sync status
    sync_status: EventSyncStatus = Field(default=EventSyncStatus.SYNCED)
    last_synced_at: Optional[datetime] = None

    # Activity link - if this event was logged as an activity
    activity_id: Optional[UUID] = Field(default=None, foreign_key="activities.id")

    # Relationships
    owner: Optional["User"] = Relationship()
    contact: Optional["Contact"] = Relationship()


class CalendarEventCreate(BaseModel):
    """Schema for creating a calendar event."""

    connection_id: UUID
    title: str
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: datetime
    end_time: datetime
    all_day: bool = False
    timezone: str = "UTC"
    contact_id: Optional[UUID] = None
    attendees: dict = {}
    meeting_link: Optional[str] = None


class CalendarEventUpdate(BaseModel):
    """Schema for updating a calendar event."""

    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    all_day: Optional[bool] = None
    timezone: Optional[str] = None
    contact_id: Optional[UUID] = None
    attendees: Optional[dict] = None
    meeting_link: Optional[str] = None


class CalendarEventRead(BaseModel):
    """Schema for reading calendar event data."""

    id: UUID
    owner_id: UUID
    connection_id: UUID
    external_id: Optional[str]
    external_link: Optional[str]
    title: str
    description: Optional[str]
    location: Optional[str]
    start_time: datetime
    end_time: datetime
    all_day: bool
    timezone: str
    is_recurring: bool
    contact_id: Optional[UUID]
    attendees: dict
    meeting_link: Optional[str]
    sync_status: EventSyncStatus
    activity_id: Optional[UUID]
    created_at: datetime
    updated_at: Optional[datetime]


class SchedulingLink(BaseModel, table=True):
    """Personal scheduling link for booking meetings."""

    __tablename__ = "scheduling_links"
    __table_args__ = (
        Index("ix_scheduling_links_owner_id", "owner_id"),
        Index("ix_scheduling_links_slug", "slug", unique=True),
        Index("ix_scheduling_links_is_active", "is_active"),
    )

    owner_id: UUID = Field(foreign_key="users.id", index=True)
    connection_id: Optional[UUID] = Field(default=None, foreign_key="calendar_connections.id")

    # Link settings
    name: str  # e.g., "30 Minute Meeting"
    slug: str = Field(unique=True)  # e.g., "john-30min" -> /schedule/john-30min
    description: Optional[str] = None

    # Duration and availability
    duration_minutes: int = Field(default=30)
    buffer_before: int = Field(default=0)  # Minutes before meeting
    buffer_after: int = Field(default=0)  # Minutes after meeting

    # Availability settings (JSONB for flexibility)
    availability: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))
    # Example: {"monday": [{"start": "09:00", "end": "17:00"}], ...}

    timezone: str = Field(default="UTC")

    # Booking settings
    min_notice_hours: int = Field(default=24)  # Minimum hours before meeting
    max_days_ahead: int = Field(default=60)  # How far in advance to book

    # Meeting settings
    location_type: str = Field(default="video")  # "video", "phone", "in_person"
    location: Optional[str] = None  # Physical address or custom
    meeting_provider: Optional[str] = None  # "zoom", "meet", "teams"

    # Customization
    questions: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))
    # Custom questions to ask when booking

    confirmation_message: Optional[str] = None

    # Status
    is_active: bool = Field(default=True)
    booking_count: int = Field(default=0)

    # Relationships
    owner: Optional["User"] = Relationship()


class SchedulingLinkCreate(BaseModel):
    """Schema for creating a scheduling link."""

    name: str
    slug: str
    description: Optional[str] = None
    duration_minutes: int = 30
    buffer_before: int = 0
    buffer_after: int = 0
    availability: dict = {}
    timezone: str = "UTC"
    min_notice_hours: int = 24
    max_days_ahead: int = 60
    location_type: str = "video"
    location: Optional[str] = None
    meeting_provider: Optional[str] = None
    questions: dict = {}
    confirmation_message: Optional[str] = None
    connection_id: Optional[UUID] = None


class SchedulingLinkUpdate(BaseModel):
    """Schema for updating a scheduling link."""

    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    buffer_before: Optional[int] = None
    buffer_after: Optional[int] = None
    availability: Optional[dict] = None
    timezone: Optional[str] = None
    min_notice_hours: Optional[int] = None
    max_days_ahead: Optional[int] = None
    location_type: Optional[str] = None
    location: Optional[str] = None
    meeting_provider: Optional[str] = None
    questions: Optional[dict] = None
    confirmation_message: Optional[str] = None
    is_active: Optional[bool] = None
    connection_id: Optional[UUID] = None


class SchedulingLinkRead(BaseModel):
    """Schema for reading scheduling link data."""

    id: UUID
    owner_id: UUID
    connection_id: Optional[UUID]
    name: str
    slug: str
    description: Optional[str]
    duration_minutes: int
    buffer_before: int
    buffer_after: int
    availability: dict
    timezone: str
    min_notice_hours: int
    max_days_ahead: int
    location_type: str
    location: Optional[str]
    meeting_provider: Optional[str]
    questions: dict
    confirmation_message: Optional[str]
    is_active: bool
    booking_count: int
    created_at: datetime
    updated_at: Optional[datetime]


class ScheduledMeeting(BaseModel, table=True):
    """A meeting booked through a scheduling link."""

    __tablename__ = "scheduled_meetings"
    __table_args__ = (
        Index("ix_scheduled_meetings_owner_id", "owner_id"),
        Index("ix_scheduled_meetings_link_id", "link_id"),
        Index("ix_scheduled_meetings_contact_id", "contact_id"),
        Index("ix_scheduled_meetings_start_time", "start_time"),
        Index("ix_scheduled_meetings_status", "status"),
    )

    owner_id: UUID = Field(foreign_key="users.id", index=True)
    link_id: UUID = Field(foreign_key="scheduling_links.id")

    # Guest info
    guest_name: str
    guest_email: str
    guest_phone: Optional[str] = None
    guest_notes: Optional[str] = None

    # Link to CRM contact if matched
    contact_id: Optional[UUID] = Field(default=None, foreign_key="contacts.id")

    # Meeting details
    start_time: datetime
    end_time: datetime
    timezone: str

    # Meeting link and calendar event
    meeting_link: Optional[str] = None
    calendar_event_id: Optional[UUID] = Field(default=None, foreign_key="calendar_events.id")

    # Custom question responses
    responses: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))

    # Status
    status: str = Field(default="confirmed")  # "confirmed", "cancelled", "completed", "no_show"
    cancelled_at: Optional[datetime] = None
    cancellation_reason: Optional[str] = None

    # Relationships
    owner: Optional["User"] = Relationship()
    contact: Optional["Contact"] = Relationship()


class ScheduledMeetingCreate(BaseModel):
    """Schema for creating a scheduled meeting (booking)."""

    link_id: UUID
    guest_name: str
    guest_email: str
    guest_phone: Optional[str] = None
    guest_notes: Optional[str] = None
    start_time: datetime
    end_time: datetime
    timezone: str
    responses: dict = {}


class ScheduledMeetingRead(BaseModel):
    """Schema for reading scheduled meeting data."""

    id: UUID
    owner_id: UUID
    link_id: UUID
    guest_name: str
    guest_email: str
    guest_phone: Optional[str]
    guest_notes: Optional[str]
    contact_id: Optional[UUID]
    start_time: datetime
    end_time: datetime
    timezone: str
    meeting_link: Optional[str]
    calendar_event_id: Optional[UUID]
    responses: dict
    status: str
    cancelled_at: Optional[datetime]
    cancellation_reason: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
