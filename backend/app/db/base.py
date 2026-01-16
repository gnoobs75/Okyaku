from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel


class BaseModel(SQLModel):
    """Base model with common fields for all database models."""

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = Field(default=None, sa_column_kwargs={"onupdate": datetime.utcnow})


# Import all models here to ensure they are registered with SQLModel
# This is necessary for Alembic to detect them
def import_models() -> None:
    """Import all models to register them with SQLModel."""
    from app.models.activity import Activity  # noqa: F401
    from app.models.company import Company  # noqa: F401
    from app.models.contact import Contact  # noqa: F401
    from app.models.deal import Deal, DealStageHistory  # noqa: F401
    from app.models.email_campaign import (  # noqa: F401
        EmailCampaign,
        EmailCampaignMetrics,
        EmailClick,
        EmailRecipient,
        EmailTemplate,
    )
    from app.models.file import FileAttachment  # noqa: F401
    from app.models.pipeline import Pipeline, PipelineStage  # noqa: F401
    from app.models.social_inbox import (  # noqa: F401
        SocialMessage,
        SocialMessageReply,
    )
    from app.models.social_media import (  # noqa: F401
        SocialAccount,
        SocialMediaAttachment,
        SocialPost,
        SocialPostAnalytics,
    )
    from app.models.task import Task  # noqa: F401
    from app.models.user import User  # noqa: F401
    from app.models.ai_predictions import (  # noqa: F401
        LeadScore,
        DealForecast,
        ChurnRisk,
    )
    from app.models.recommendations import Recommendation  # noqa: F401
    from app.models.agent import AgentTask, AgentAction  # noqa: F401
    from app.models.conversation import ConversationAnalysis  # noqa: F401
    from app.models.knowledge_base import (  # noqa: F401
        KnowledgeDocument,
        DocumentChunk,
        RAGQuery,
    )
    from app.models.insights import Insight  # noqa: F401
