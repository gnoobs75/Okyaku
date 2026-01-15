from datetime import date, datetime
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


class TaskStatus(str, Enum):
    """Task status values."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TaskPriority(str, Enum):
    """Task priority levels."""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskBase(BaseModel):
    """Base task fields."""

    title: str = Field(index=True)
    description: Optional[str] = Field(default=None)
    due_date: Optional[date] = Field(default=None)
    due_time: Optional[datetime] = Field(default=None)
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)
    status: TaskStatus = Field(default=TaskStatus.PENDING)
    completed_at: Optional[datetime] = Field(default=None)
    reminder_date: Optional[datetime] = Field(default=None)


class Task(TaskBase, table=True):
    """Task entity representing a to-do item or follow-up action."""

    __tablename__ = "tasks"
    __table_args__ = (
        Index("ix_tasks_assignee_id", "assignee_id"),
        Index("ix_tasks_contact_id", "contact_id"),
        Index("ix_tasks_company_id", "company_id"),
        Index("ix_tasks_deal_id", "deal_id"),
        Index("ix_tasks_status", "status"),
        Index("ix_tasks_priority", "priority"),
        Index("ix_tasks_due_date", "due_date"),
        Index("ix_tasks_created_at", "created_at"),
    )

    # Foreign keys
    assignee_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    contact_id: Optional[UUID] = Field(default=None, foreign_key="contacts.id")
    company_id: Optional[UUID] = Field(default=None, foreign_key="companies.id")
    deal_id: Optional[UUID] = Field(default=None, foreign_key="deals.id")
    created_by: Optional[UUID] = Field(default=None, foreign_key="users.id")
    updated_by: Optional[UUID] = Field(default=None, foreign_key="users.id")

    # Custom properties stored as JSONB
    custom_properties: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))

    # Relationships
    assignee: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Task.assignee_id]"}
    )
    contact: Optional["Contact"] = Relationship()
    company: Optional["Company"] = Relationship()
    deal: Optional["Deal"] = Relationship()


class TaskCreate(BaseModel):
    """Schema for creating a task."""

    title: str
    description: Optional[str] = None
    due_date: Optional[date] = None
    due_time: Optional[datetime] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    assignee_id: Optional[UUID] = None
    contact_id: Optional[UUID] = None
    company_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    reminder_date: Optional[datetime] = None
    custom_properties: dict = {}


class TaskUpdate(BaseModel):
    """Schema for updating a task."""

    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[date] = None
    due_time: Optional[datetime] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
    assignee_id: Optional[UUID] = None
    contact_id: Optional[UUID] = None
    company_id: Optional[UUID] = None
    deal_id: Optional[UUID] = None
    reminder_date: Optional[datetime] = None
    custom_properties: Optional[dict] = None


class TaskRead(BaseModel):
    """Schema for reading task data."""

    id: UUID
    title: str
    description: Optional[str]
    due_date: Optional[date]
    due_time: Optional[datetime]
    priority: TaskPriority
    status: TaskStatus
    completed_at: Optional[datetime]
    assignee_id: Optional[UUID]
    contact_id: Optional[UUID]
    company_id: Optional[UUID]
    deal_id: Optional[UUID]
    reminder_date: Optional[datetime]
    custom_properties: dict
    created_at: datetime
    updated_at: Optional[datetime]


class TaskReadWithRelations(TaskRead):
    """Schema for reading task data with related entity names."""

    assignee_name: Optional[str] = None
    contact_name: Optional[str] = None
    company_name: Optional[str] = None
    deal_name: Optional[str] = None
