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


class AuditAction(str, Enum):
    """Types of auditable actions."""

    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    VIEW = "view"
    EXPORT = "export"
    IMPORT = "import"
    LOGIN = "login"
    LOGOUT = "logout"
    PASSWORD_CHANGE = "password_change"
    PERMISSION_CHANGE = "permission_change"
    BULK_UPDATE = "bulk_update"
    BULK_DELETE = "bulk_delete"
    RESTORE = "restore"
    ARCHIVE = "archive"


class EntityType(str, Enum):
    """Types of entities that can be audited."""

    CONTACT = "contact"
    COMPANY = "company"
    DEAL = "deal"
    ACTIVITY = "activity"
    TASK = "task"
    USER = "user"
    PIPELINE = "pipeline"
    STAGE = "stage"
    EMAIL_CAMPAIGN = "email_campaign"
    EMAIL_TEMPLATE = "email_template"
    SOCIAL_POST = "social_post"
    SOCIAL_ACCOUNT = "social_account"
    CALENDAR_EVENT = "calendar_event"
    SCHEDULING_LINK = "scheduling_link"
    FILE = "file"
    IMPORT = "import"
    EXPORT = "export"
    AUTOMATION_RULE = "automation_rule"
    AB_TEST = "ab_test"
    REPORT = "report"
    SETTINGS = "settings"


class AuditLog(BaseModel, table=True):
    """Audit log entry tracking all entity changes."""

    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_user_id", "user_id"),
        Index("ix_audit_logs_entity_type", "entity_type"),
        Index("ix_audit_logs_entity_id", "entity_id"),
        Index("ix_audit_logs_action", "action"),
        Index("ix_audit_logs_created_at", "created_at"),
        Index("ix_audit_logs_entity_type_entity_id", "entity_type", "entity_id"),
        Index("ix_audit_logs_user_action", "user_id", "action"),
    )

    # Who performed the action
    user_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    user_email: Optional[str] = None  # Denormalized for quick access
    user_name: Optional[str] = None  # Denormalized for quick access

    # What entity was affected
    entity_type: EntityType
    entity_id: UUID
    entity_name: Optional[str] = None  # Denormalized - e.g., contact name, deal name

    # What action was performed
    action: AuditAction

    # Change details
    old_values: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    new_values: Optional[dict] = Field(default=None, sa_column=Column(JSONB))
    changed_fields: Optional[list] = Field(default=None, sa_column=Column(JSONB))

    # Context
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    ip_address: Optional[str] = None
    user_agent: Optional[str] = Field(default=None, sa_column=Column(Text))
    request_id: Optional[str] = None  # For correlating related actions

    # Additional metadata
    extra_data: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))

    # Relationships
    user: Optional["User"] = Relationship()


class AuditLogCreate(BaseModel):
    """Schema for creating an audit log entry."""

    user_id: Optional[UUID] = None
    user_email: Optional[str] = None
    user_name: Optional[str] = None
    entity_type: EntityType
    entity_id: UUID
    entity_name: Optional[str] = None
    action: AuditAction
    old_values: Optional[dict] = None
    new_values: Optional[dict] = None
    changed_fields: Optional[list] = None
    description: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    request_id: Optional[str] = None
    extra_data: dict = {}


class AuditLogRead(BaseModel):
    """Schema for reading audit log data."""

    id: UUID
    user_id: Optional[UUID]
    user_email: Optional[str]
    user_name: Optional[str]
    entity_type: EntityType
    entity_id: UUID
    entity_name: Optional[str]
    action: AuditAction
    old_values: Optional[dict]
    new_values: Optional[dict]
    changed_fields: Optional[list]
    description: Optional[str]
    ip_address: Optional[str]
    request_id: Optional[str]
    extra_data: dict
    created_at: datetime


class AuditLogFilter(BaseModel):
    """Schema for filtering audit logs."""

    user_id: Optional[UUID] = None
    entity_type: Optional[EntityType] = None
    entity_id: Optional[UUID] = None
    action: Optional[AuditAction] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    search: Optional[str] = None  # Search in description, entity_name


class AuditLogStats(BaseModel):
    """Statistics about audit logs."""

    total_entries: int
    entries_by_action: dict
    entries_by_entity_type: dict
    active_users: int
    recent_activity: list


class GDPRExportRequest(BaseModel, table=True):
    """Request for GDPR data export."""

    __tablename__ = "gdpr_export_requests"
    __table_args__ = (
        Index("ix_gdpr_export_requests_user_id", "user_id"),
        Index("ix_gdpr_export_requests_status", "status"),
        Index("ix_gdpr_export_requests_requested_at", "requested_at"),
    )

    user_id: UUID = Field(foreign_key="users.id", index=True)

    # Request details
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    requested_by: UUID = Field(foreign_key="users.id")  # Admin who initiated

    # Data scope
    include_contacts: bool = Field(default=True)
    include_companies: bool = Field(default=True)
    include_deals: bool = Field(default=True)
    include_activities: bool = Field(default=True)
    include_emails: bool = Field(default=True)
    include_audit_logs: bool = Field(default=True)

    # Status
    status: str = Field(default="pending")  # "pending", "processing", "completed", "failed", "expired"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Result
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    error_message: Optional[str] = None

    # Expiry
    expires_at: Optional[datetime] = None
    download_count: int = Field(default=0)

    # Relationships
    user: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[GDPRExportRequest.user_id]"}
    )


class GDPRExportRequestCreate(BaseModel):
    """Schema for creating a GDPR export request."""

    user_id: UUID
    include_contacts: bool = True
    include_companies: bool = True
    include_deals: bool = True
    include_activities: bool = True
    include_emails: bool = True
    include_audit_logs: bool = True


class GDPRExportRequestRead(BaseModel):
    """Schema for reading GDPR export request data."""

    id: UUID
    user_id: UUID
    requested_at: datetime
    requested_by: UUID
    include_contacts: bool
    include_companies: bool
    include_deals: bool
    include_activities: bool
    include_emails: bool
    include_audit_logs: bool
    status: str
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    file_size: Optional[int]
    error_message: Optional[str]
    expires_at: Optional[datetime]
    download_count: int
    created_at: datetime


class DataRetentionPolicy(BaseModel, table=True):
    """Data retention policy settings."""

    __tablename__ = "data_retention_policies"
    __table_args__ = (
        Index("ix_data_retention_policies_entity_type", "entity_type", unique=True),
    )

    entity_type: EntityType = Field(unique=True)

    # Retention settings
    retention_days: int = Field(default=365)  # How long to keep data
    archive_after_days: Optional[int] = None  # When to archive (before delete)

    # Auto-cleanup settings
    auto_cleanup_enabled: bool = Field(default=False)
    last_cleanup_at: Optional[datetime] = None
    records_cleaned: int = Field(default=0)

    # Audit log specific
    audit_log_retention_days: int = Field(default=730)  # 2 years default

    # Status
    is_active: bool = Field(default=True)


class DataRetentionPolicyCreate(BaseModel):
    """Schema for creating a data retention policy."""

    entity_type: EntityType
    retention_days: int = 365
    archive_after_days: Optional[int] = None
    auto_cleanup_enabled: bool = False
    audit_log_retention_days: int = 730


class DataRetentionPolicyUpdate(BaseModel):
    """Schema for updating a data retention policy."""

    retention_days: Optional[int] = None
    archive_after_days: Optional[int] = None
    auto_cleanup_enabled: Optional[bool] = None
    audit_log_retention_days: Optional[int] = None
    is_active: Optional[bool] = None


class DataRetentionPolicyRead(BaseModel):
    """Schema for reading data retention policy."""

    id: UUID
    entity_type: EntityType
    retention_days: int
    archive_after_days: Optional[int]
    auto_cleanup_enabled: bool
    last_cleanup_at: Optional[datetime]
    records_cleaned: int
    audit_log_retention_days: int
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]
