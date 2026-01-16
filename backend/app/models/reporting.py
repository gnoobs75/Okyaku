"""Advanced Reporting models for PDF/CSV exports."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class ReportType(str, Enum):
    """Type of report."""
    SOCIAL_PERFORMANCE = "social_performance"
    ENGAGEMENT_SUMMARY = "engagement_summary"
    CONTENT_ANALYSIS = "content_analysis"
    AUDIENCE_INSIGHTS = "audience_insights"
    COMPETITOR_COMPARISON = "competitor_comparison"
    AB_TEST_RESULTS = "ab_test_results"
    CAMPAIGN_REPORT = "campaign_report"
    CUSTOM = "custom"


class ReportFormat(str, Enum):
    """Export format for reports."""
    PDF = "pdf"
    CSV = "csv"
    EXCEL = "excel"
    JSON = "json"


class ReportStatus(str, Enum):
    """Status of report generation."""
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"
    EXPIRED = "expired"


class ReportFrequency(str, Enum):
    """Frequency for scheduled reports."""
    DAILY = "daily"
    WEEKLY = "weekly"
    BIWEEKLY = "biweekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"


# ==================== Reports ====================

class ReportBase(SQLModel):
    """Base model for reports."""
    name: str = Field(max_length=200)
    report_type: ReportType
    format: ReportFormat = Field(default=ReportFormat.PDF)
    description: Optional[str] = Field(default=None, max_length=500)

    # Date range
    date_from: datetime
    date_to: datetime

    # Filters
    platforms: Optional[str] = Field(default=None, max_length=200)  # Comma-separated
    account_ids: Optional[str] = Field(default=None, max_length=1000)  # Comma-separated UUIDs

    # Options
    include_charts: bool = Field(default=True)
    include_raw_data: bool = Field(default=False)
    compare_previous_period: bool = Field(default=True)


class Report(ReportBase, table=True):
    """Generated report."""
    __tablename__ = "reports"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    status: ReportStatus = Field(default=ReportStatus.PENDING)
    file_path: Optional[str] = Field(default=None, max_length=500)
    file_size: Optional[int] = Field(default=None)
    error_message: Optional[str] = Field(default=None, max_length=1000)

    # Generation times
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    expires_at: Optional[datetime] = Field(default=None)

    # Downloads
    download_count: int = Field(default=0)
    last_downloaded_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)


class ReportCreate(ReportBase):
    """Schema for creating a report."""
    pass


class ReportRead(ReportBase):
    """Schema for reading a report."""
    id: UUID
    owner_id: UUID
    status: ReportStatus
    file_path: Optional[str]
    file_size: Optional[int]
    error_message: Optional[str]
    requested_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    expires_at: Optional[datetime]
    download_count: int
    last_downloaded_at: Optional[datetime]
    created_at: datetime


# ==================== Scheduled Reports ====================

class ScheduledReportBase(SQLModel):
    """Base model for scheduled reports."""
    name: str = Field(max_length=200)
    report_type: ReportType
    format: ReportFormat = Field(default=ReportFormat.PDF)
    frequency: ReportFrequency

    # Options
    platforms: Optional[str] = Field(default=None, max_length=200)
    account_ids: Optional[str] = Field(default=None, max_length=1000)
    include_charts: bool = Field(default=True)
    compare_previous_period: bool = Field(default=True)

    # Delivery
    email_recipients: Optional[str] = Field(default=None, max_length=1000)  # Comma-separated
    is_active: bool = Field(default=True)


class ScheduledReport(ScheduledReportBase, table=True):
    """Scheduled recurring report."""
    __tablename__ = "scheduled_reports"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    next_run_at: Optional[datetime] = Field(default=None)
    last_run_at: Optional[datetime] = Field(default=None)
    last_report_id: Optional[UUID] = Field(default=None, foreign_key="reports.id")
    run_count: int = Field(default=0)
    failure_count: int = Field(default=0)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ScheduledReportCreate(ScheduledReportBase):
    """Schema for creating a scheduled report."""
    pass


class ScheduledReportUpdate(SQLModel):
    """Schema for updating a scheduled report."""
    name: Optional[str] = Field(default=None, max_length=200)
    report_type: Optional[ReportType] = None
    format: Optional[ReportFormat] = None
    frequency: Optional[ReportFrequency] = None
    platforms: Optional[str] = Field(default=None, max_length=200)
    email_recipients: Optional[str] = Field(default=None, max_length=1000)
    is_active: Optional[bool] = None


class ScheduledReportRead(ScheduledReportBase):
    """Schema for reading a scheduled report."""
    id: UUID
    owner_id: UUID
    next_run_at: Optional[datetime]
    last_run_at: Optional[datetime]
    last_report_id: Optional[UUID]
    run_count: int
    failure_count: int
    created_at: datetime
    updated_at: datetime


# ==================== Report Templates ====================

class ReportTemplateBase(SQLModel):
    """Base model for report templates."""
    name: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=500)
    report_type: ReportType
    format: ReportFormat = Field(default=ReportFormat.PDF)

    # Default options
    default_days: int = Field(default=30)
    platforms: Optional[str] = Field(default=None, max_length=200)
    include_charts: bool = Field(default=True)
    compare_previous_period: bool = Field(default=True)
    is_system: bool = Field(default=False)


class ReportTemplate(ReportTemplateBase, table=True):
    """Template for quick report generation."""
    __tablename__ = "report_templates"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: Optional[UUID] = Field(default=None, foreign_key="users.id")  # Null for system templates

    times_used: int = Field(default=0)
    last_used_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)


class ReportTemplateCreate(ReportTemplateBase):
    """Schema for creating a report template."""
    pass


class ReportTemplateRead(ReportTemplateBase):
    """Schema for reading a report template."""
    id: UUID
    owner_id: Optional[UUID]
    times_used: int
    last_used_at: Optional[datetime]
    created_at: datetime
