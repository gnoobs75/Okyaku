"""Models for AI Agent system with tool use and human-in-the-loop approval."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from pydantic import BaseModel as PydanticBaseModel
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel


class AgentTaskStatus(str, Enum):
    """Status of an agent task."""
    PENDING = "pending"  # Waiting to be processed
    RUNNING = "running"  # Agent is working
    AWAITING_APPROVAL = "awaiting_approval"  # Needs human approval for action
    APPROVED = "approved"  # Action approved, executing
    REJECTED = "rejected"  # Action rejected by human
    COMPLETED = "completed"  # Task finished successfully
    FAILED = "failed"  # Task failed with error
    CANCELLED = "cancelled"  # Task cancelled by user


class AgentActionType(str, Enum):
    """Types of agent actions that may require approval."""
    READ_ONLY = "read_only"  # Safe, no approval needed
    CREATE = "create"  # Creating new records
    UPDATE = "update"  # Modifying existing records
    DELETE = "delete"  # Removing records
    SEND = "send"  # Sending emails/messages
    BULK = "bulk"  # Bulk operations


class AgentTask(SQLModel, table=True):
    """Database model for agent tasks."""

    __tablename__ = "agent_tasks"

    id: UUID = Field(default_factory=uuid4, primary_key=True)

    # Task details
    prompt: str  # The original user request
    goal: str  # What the agent is trying to accomplish
    status: AgentTaskStatus = Field(default=AgentTaskStatus.PENDING, index=True)

    # Execution tracking
    steps_completed: int = Field(default=0)
    max_steps: int = Field(default=10)
    current_step: Optional[str] = None

    # Results
    result: Optional[str] = None
    error: Optional[str] = None

    # Action history (for audit trail)
    action_history: list = Field(default_factory=list, sa_column=Column(JSONB))

    # Pending action requiring approval
    pending_action: Optional[dict] = Field(default=None, sa_column=Column(JSONB))

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # AI metadata
    model_version: str = Field(default="llama3.1")


class AgentAction(SQLModel, table=True):
    """Database model for individual agent actions (audit trail)."""

    __tablename__ = "agent_actions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    task_id: UUID = Field(foreign_key="agent_tasks.id", index=True)

    # Action details
    action_type: AgentActionType
    tool_name: str
    tool_input: dict = Field(default_factory=dict, sa_column=Column(JSONB))
    tool_output: Optional[dict] = Field(default=None, sa_column=Column(JSONB))

    # Approval tracking
    requires_approval: bool = Field(default=False)
    approved: Optional[bool] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None

    # Execution
    executed: bool = Field(default=False)
    execution_error: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)


# Response models
class AgentTaskResponse(PydanticBaseModel):
    """API response for an agent task."""
    id: UUID
    prompt: str
    goal: str
    status: AgentTaskStatus
    steps_completed: int
    max_steps: int
    current_step: Optional[str]
    result: Optional[str]
    error: Optional[str]
    pending_action: Optional[dict]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class AgentActionResponse(PydanticBaseModel):
    """API response for an agent action."""
    id: UUID
    task_id: UUID
    action_type: AgentActionType
    tool_name: str
    tool_input: dict
    tool_output: Optional[dict]
    requires_approval: bool
    approved: Optional[bool]
    executed: bool
    execution_error: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class CreateAgentTaskRequest(PydanticBaseModel):
    """Request to create a new agent task."""
    prompt: str
    max_steps: int = 10


class ApproveActionRequest(PydanticBaseModel):
    """Request to approve or reject a pending action."""
    approved: bool
    rejection_reason: Optional[str] = None
