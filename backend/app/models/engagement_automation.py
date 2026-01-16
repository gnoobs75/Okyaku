"""Engagement Automation models for rules-based auto-responses."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class RuleStatus(str, Enum):
    """Status of an automation rule."""
    ACTIVE = "active"
    PAUSED = "paused"
    ARCHIVED = "archived"


class TriggerType(str, Enum):
    """Type of trigger for automation."""
    NEW_FOLLOWER = "new_follower"
    NEW_MENTION = "new_mention"
    NEW_COMMENT = "new_comment"
    NEW_DM = "new_dm"
    KEYWORD_MATCH = "keyword_match"
    SENTIMENT = "sentiment"
    HIGH_ENGAGEMENT = "high_engagement"


class ActionType(str, Enum):
    """Type of action to take."""
    SEND_DM = "send_dm"
    REPLY_COMMENT = "reply_comment"
    LIKE_POST = "like_post"
    FOLLOW_BACK = "follow_back"
    ADD_TO_LIST = "add_to_list"
    CREATE_TASK = "create_task"
    SEND_NOTIFICATION = "send_notification"
    WEBHOOK = "webhook"


class ConditionOperator(str, Enum):
    """Operators for rule conditions."""
    EQUALS = "equals"
    NOT_EQUALS = "not_equals"
    CONTAINS = "contains"
    NOT_CONTAINS = "not_contains"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    IN = "in"
    NOT_IN = "not_in"


# ==================== Automation Rules ====================

class AutomationRuleBase(SQLModel):
    """Base model for automation rules."""
    name: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    trigger_type: TriggerType
    action_type: ActionType
    platform: Optional[str] = Field(default=None, max_length=50)
    account_id: Optional[UUID] = Field(default=None, foreign_key="social_accounts.id")
    status: RuleStatus = Field(default=RuleStatus.PAUSED)

    # Rate limiting
    cooldown_minutes: int = Field(default=60)  # Wait between executions
    daily_limit: int = Field(default=50)  # Max executions per day
    enabled_hours_start: int = Field(default=9)  # Start hour (0-23)
    enabled_hours_end: int = Field(default=21)  # End hour (0-23)


class AutomationRule(AutomationRuleBase, table=True):
    """Automation rule for engagement."""
    __tablename__ = "automation_rules"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    # Execution stats
    total_executions: int = Field(default=0)
    successful_executions: int = Field(default=0)
    failed_executions: int = Field(default=0)
    last_executed_at: Optional[datetime] = Field(default=None)
    executions_today: int = Field(default=0)
    last_reset_date: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AutomationRuleCreate(AutomationRuleBase):
    """Schema for creating an automation rule."""
    pass


class AutomationRuleUpdate(SQLModel):
    """Schema for updating an automation rule."""
    name: Optional[str] = Field(default=None, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    trigger_type: Optional[TriggerType] = None
    action_type: Optional[ActionType] = None
    platform: Optional[str] = Field(default=None, max_length=50)
    status: Optional[RuleStatus] = None
    cooldown_minutes: Optional[int] = None
    daily_limit: Optional[int] = None
    enabled_hours_start: Optional[int] = None
    enabled_hours_end: Optional[int] = None


class AutomationRuleRead(AutomationRuleBase):
    """Schema for reading an automation rule."""
    id: UUID
    owner_id: UUID
    total_executions: int
    successful_executions: int
    failed_executions: int
    last_executed_at: Optional[datetime]
    executions_today: int
    created_at: datetime
    updated_at: datetime


# ==================== Rule Conditions ====================

class RuleConditionBase(SQLModel):
    """Base model for rule conditions."""
    rule_id: UUID = Field(foreign_key="automation_rules.id", index=True)
    field: str = Field(max_length=100)  # e.g., "followers_count", "content", "sentiment"
    operator: ConditionOperator
    value: str = Field(max_length=1000)  # Value to compare against
    is_required: bool = Field(default=True)


class RuleCondition(RuleConditionBase, table=True):
    """Condition for an automation rule."""
    __tablename__ = "rule_conditions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)


class RuleConditionCreate(RuleConditionBase):
    """Schema for creating a rule condition."""
    pass


class RuleConditionRead(RuleConditionBase):
    """Schema for reading a rule condition."""
    id: UUID
    owner_id: UUID
    created_at: datetime


# ==================== Rule Actions ====================

class RuleActionBase(SQLModel):
    """Base model for rule actions."""
    rule_id: UUID = Field(foreign_key="automation_rules.id", index=True)
    action_type: ActionType
    delay_minutes: int = Field(default=0)  # Delay before executing

    # Action parameters (stored as JSON string)
    message_template: Optional[str] = Field(default=None, max_length=2000)
    list_name: Optional[str] = Field(default=None, max_length=100)
    webhook_url: Optional[str] = Field(default=None, max_length=500)
    task_title: Optional[str] = Field(default=None, max_length=200)
    task_priority: Optional[str] = Field(default=None, max_length=20)


class RuleAction(RuleActionBase, table=True):
    """Action to execute when rule triggers."""
    __tablename__ = "rule_actions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)


class RuleActionCreate(RuleActionBase):
    """Schema for creating a rule action."""
    pass


class RuleActionRead(RuleActionBase):
    """Schema for reading a rule action."""
    id: UUID
    owner_id: UUID
    created_at: datetime


# ==================== Execution Log ====================

class ExecutionLogBase(SQLModel):
    """Base model for execution logs."""
    rule_id: UUID = Field(foreign_key="automation_rules.id", index=True)
    trigger_data: str = Field(max_length=5000)  # JSON of trigger context
    action_taken: str = Field(max_length=200)
    success: bool = Field(default=True)
    error_message: Optional[str] = Field(default=None, max_length=1000)


class ExecutionLog(ExecutionLogBase, table=True):
    """Log of rule executions."""
    __tablename__ = "automation_execution_logs"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    executed_at: datetime = Field(default_factory=datetime.utcnow)


class ExecutionLogRead(ExecutionLogBase):
    """Schema for reading execution logs."""
    id: UUID
    owner_id: UUID
    executed_at: datetime


# ==================== Response Templates ====================

class ResponseTemplateBase(SQLModel):
    """Base model for response templates."""
    name: str = Field(max_length=100)
    category: str = Field(max_length=50)  # welcome, thanks, support, etc.
    content: str = Field(max_length=2000)
    platform: Optional[str] = Field(default=None, max_length=50)
    is_default: bool = Field(default=False)

    # Personalization variables available
    variables: Optional[str] = Field(default=None, max_length=500)  # e.g., "{{username}}, {{follower_count}}"


class ResponseTemplate(ResponseTemplateBase, table=True):
    """Template for automated responses."""
    __tablename__ = "response_templates"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    times_used: int = Field(default=0)
    last_used_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ResponseTemplateCreate(ResponseTemplateBase):
    """Schema for creating a response template."""
    pass


class ResponseTemplateUpdate(SQLModel):
    """Schema for updating a response template."""
    name: Optional[str] = Field(default=None, max_length=100)
    category: Optional[str] = Field(default=None, max_length=50)
    content: Optional[str] = Field(default=None, max_length=2000)
    platform: Optional[str] = Field(default=None, max_length=50)
    is_default: Optional[bool] = None


class ResponseTemplateRead(ResponseTemplateBase):
    """Schema for reading a response template."""
    id: UUID
    owner_id: UUID
    times_used: int
    last_used_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
