from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Column, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.models.deal import Deal


class PipelineBase(BaseModel):
    """Base pipeline fields."""

    name: str = Field(index=True)
    description: Optional[str] = Field(default=None)
    is_default: bool = Field(default=False)
    is_active: bool = Field(default=True)


class Pipeline(PipelineBase, table=True):
    """Pipeline entity representing a sales process."""

    __tablename__ = "pipelines"
    __table_args__ = (
        Index("ix_pipelines_is_default", "is_default"),
        Index("ix_pipelines_is_active", "is_active"),
    )

    # Audit
    created_by: Optional[UUID] = Field(default=None, foreign_key="users.id")
    updated_by: Optional[UUID] = Field(default=None, foreign_key="users.id")

    # Relationships
    stages: list["PipelineStage"] = Relationship(
        back_populates="pipeline",
        sa_relationship_kwargs={"order_by": "PipelineStage.order"}
    )
    deals: list["Deal"] = Relationship(back_populates="pipeline")


class PipelineStageBase(BaseModel):
    """Base pipeline stage fields."""

    name: str
    order: int = Field(default=0)
    probability: int = Field(default=0, ge=0, le=100)  # Win probability percentage
    is_won: bool = Field(default=False)  # Marks a closed-won stage
    is_lost: bool = Field(default=False)  # Marks a closed-lost stage


class PipelineStage(PipelineStageBase, table=True):
    """Pipeline stage entity representing a step in the sales process."""

    __tablename__ = "pipeline_stages"
    __table_args__ = (
        Index("ix_pipeline_stages_pipeline_id", "pipeline_id"),
        Index("ix_pipeline_stages_order", "order"),
    )

    pipeline_id: UUID = Field(foreign_key="pipelines.id")

    # Relationships
    pipeline: Pipeline = Relationship(back_populates="stages")
    deals: list["Deal"] = Relationship(back_populates="stage")


class PipelineCreate(BaseModel):
    """Schema for creating a pipeline."""

    name: str
    description: Optional[str] = None
    is_default: bool = False


class PipelineUpdate(BaseModel):
    """Schema for updating a pipeline."""

    name: Optional[str] = None
    description: Optional[str] = None
    is_default: Optional[bool] = None
    is_active: Optional[bool] = None


class PipelineStageCreate(BaseModel):
    """Schema for creating a pipeline stage."""

    name: str
    order: int = 0
    probability: int = 0
    is_won: bool = False
    is_lost: bool = False


class PipelineStageUpdate(BaseModel):
    """Schema for updating a pipeline stage."""

    name: Optional[str] = None
    order: Optional[int] = None
    probability: Optional[int] = None
    is_won: Optional[bool] = None
    is_lost: Optional[bool] = None


class PipelineStageRead(BaseModel):
    """Schema for reading pipeline stage data."""

    id: UUID
    name: str
    order: int
    probability: int
    is_won: bool
    is_lost: bool
    pipeline_id: UUID
    created_at: datetime


class PipelineRead(BaseModel):
    """Schema for reading pipeline data."""

    id: UUID
    name: str
    description: Optional[str]
    is_default: bool
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime]


class PipelineReadWithStages(PipelineRead):
    """Schema for reading pipeline data with stages."""

    stages: list[PipelineStageRead] = []
