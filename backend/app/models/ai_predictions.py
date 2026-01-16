"""
AI Prediction Models - Lead scoring, deal forecasting, and churn risk predictions.

These models store AI-generated predictions about CRM entities to enable
data-driven decision making and proactive engagement.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel as PydanticBaseModel
from sqlalchemy import Column, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field

from app.db.base import BaseModel


# Enums

class PredictionStatus(str, Enum):
    """Status of a prediction."""
    ACTIVE = "active"
    EXPIRED = "expired"
    SUPERSEDED = "superseded"


class RiskLevel(str, Enum):
    """Risk level classification."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ScoreCategory(str, Enum):
    """Lead score category."""
    HOT = "hot"        # 80-100
    WARM = "warm"      # 60-79
    COOL = "cool"      # 40-59
    COLD = "cold"      # 0-39


# Database Models

class LeadScore(BaseModel, table=True):
    """
    AI-generated lead score for a contact.

    Scores range from 0-100 and indicate the likelihood of conversion.
    Includes factor breakdown and actionable recommendations.
    """
    __tablename__ = "lead_scores"
    __table_args__ = (
        Index("ix_lead_scores_contact_id", "contact_id"),
        Index("ix_lead_scores_score", "score"),
        Index("ix_lead_scores_category", "category"),
        Index("ix_lead_scores_calculated_at", "calculated_at"),
        Index("ix_lead_scores_status", "status"),
    )

    contact_id: UUID = Field(foreign_key="contacts.id", index=True)

    # Score (0-100)
    score: int = Field(ge=0, le=100)
    category: ScoreCategory = Field(default=ScoreCategory.COLD)
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)

    # Factor breakdown (stored as JSONB)
    # Example: {"engagement": 80, "fit": 70, "timing": 60, "activity": 75}
    factors: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))

    # AI-generated explanation
    explanation: str = Field(default="")

    # Recommendations (stored as JSONB array)
    # Example: ["Schedule a call", "Send product demo", "Add to nurture campaign"]
    recommendations: list = Field(default_factory=list, sa_column=Column(JSONB, default=[]))

    # Metadata
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    model_version: str = Field(default="llama3.1")
    status: PredictionStatus = Field(default=PredictionStatus.ACTIVE)
    expires_at: Optional[datetime] = Field(default=None)

    # Raw context used for prediction (for debugging/auditing)
    context_snapshot: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))


class DealForecast(BaseModel, table=True):
    """
    AI-generated forecast for a deal.

    Predicts close probability, expected amount, and timing.
    Includes risk factors and confidence intervals.
    """
    __tablename__ = "deal_forecasts"
    __table_args__ = (
        Index("ix_deal_forecasts_deal_id", "deal_id"),
        Index("ix_deal_forecasts_close_probability", "close_probability"),
        Index("ix_deal_forecasts_calculated_at", "calculated_at"),
        Index("ix_deal_forecasts_status", "status"),
    )

    deal_id: UUID = Field(foreign_key="deals.id", index=True)

    # Probability and amounts
    close_probability: float = Field(ge=0.0, le=1.0)
    predicted_amount: Decimal = Field(decimal_places=2, default=Decimal("0.00"))
    amount_confidence_low: Decimal = Field(decimal_places=2, default=Decimal("0.00"))
    amount_confidence_high: Decimal = Field(decimal_places=2, default=Decimal("0.00"))

    # Timing predictions
    predicted_close_date: Optional[date] = Field(default=None)
    days_to_close: Optional[int] = Field(default=None)

    # Confidence and risk
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)
    risk_level: RiskLevel = Field(default=RiskLevel.MEDIUM)

    # Risk factors (stored as JSONB array)
    # Example: ["Competitor mentioned", "Budget concerns", "Long sales cycle"]
    risk_factors: list = Field(default_factory=list, sa_column=Column(JSONB, default=[]))

    # Positive signals (stored as JSONB array)
    positive_signals: list = Field(default_factory=list, sa_column=Column(JSONB, default=[]))

    # AI-generated analysis
    analysis: str = Field(default="")

    # Next steps recommendations
    recommended_actions: list = Field(default_factory=list, sa_column=Column(JSONB, default=[]))

    # Metadata
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    model_version: str = Field(default="llama3.1")
    status: PredictionStatus = Field(default=PredictionStatus.ACTIVE)
    expires_at: Optional[datetime] = Field(default=None)

    # Raw context
    context_snapshot: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))


class ChurnRisk(BaseModel, table=True):
    """
    AI-generated churn risk assessment for a contact.

    Identifies contacts at risk of churning and provides
    early warning signals with recommended retention actions.
    """
    __tablename__ = "churn_risks"
    __table_args__ = (
        Index("ix_churn_risks_contact_id", "contact_id"),
        Index("ix_churn_risks_risk_level", "risk_level"),
        Index("ix_churn_risks_risk_score", "risk_score"),
        Index("ix_churn_risks_calculated_at", "calculated_at"),
        Index("ix_churn_risks_status", "status"),
    )

    contact_id: UUID = Field(foreign_key="contacts.id", index=True)

    # Risk assessment
    risk_score: int = Field(ge=0, le=100)  # Higher = more likely to churn
    risk_level: RiskLevel = Field(default=RiskLevel.LOW)
    confidence: float = Field(ge=0.0, le=1.0, default=0.5)

    # Warning signals (stored as JSONB)
    # Example: ["No activity in 30 days", "Support tickets increased", "Engagement declining"]
    warning_signals: list = Field(default_factory=list, sa_column=Column(JSONB, default=[]))

    # Contributing factors with weights
    # Example: {"inactivity": 0.4, "support_issues": 0.3, "engagement_drop": 0.3}
    factor_weights: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))

    # AI-generated analysis
    analysis: str = Field(default="")

    # Retention recommendations
    retention_actions: list = Field(default_factory=list, sa_column=Column(JSONB, default=[]))

    # Estimated time to churn (days)
    estimated_days_to_churn: Optional[int] = Field(default=None)

    # Metadata
    calculated_at: datetime = Field(default_factory=datetime.utcnow)
    model_version: str = Field(default="llama3.1")
    status: PredictionStatus = Field(default=PredictionStatus.ACTIVE)
    expires_at: Optional[datetime] = Field(default=None)

    # Raw context
    context_snapshot: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))


# Pydantic Schemas for API

class LeadScoreResponse(PydanticBaseModel):
    """Response schema for lead score."""
    id: UUID
    contact_id: UUID
    score: int
    category: ScoreCategory
    confidence: float
    factors: dict
    explanation: str
    recommendations: list[str]
    calculated_at: datetime
    model_version: str


class DealForecastResponse(PydanticBaseModel):
    """Response schema for deal forecast."""
    id: UUID
    deal_id: UUID
    close_probability: float
    predicted_amount: Decimal
    amount_confidence_low: Decimal
    amount_confidence_high: Decimal
    predicted_close_date: Optional[date]
    days_to_close: Optional[int]
    confidence: float
    risk_level: RiskLevel
    risk_factors: list[str]
    positive_signals: list[str]
    analysis: str
    recommended_actions: list[str]
    calculated_at: datetime
    model_version: str


class ChurnRiskResponse(PydanticBaseModel):
    """Response schema for churn risk."""
    id: UUID
    contact_id: UUID
    risk_score: int
    risk_level: RiskLevel
    confidence: float
    warning_signals: list[str]
    factor_weights: dict
    analysis: str
    retention_actions: list[str]
    estimated_days_to_churn: Optional[int]
    calculated_at: datetime
    model_version: str


class PipelineForecastResponse(PydanticBaseModel):
    """Response schema for full pipeline forecast."""
    total_pipeline_value: Decimal
    weighted_pipeline_value: Decimal
    forecasted_revenue: Decimal
    forecast_confidence: float
    deals_by_probability: dict  # {"high": [...], "medium": [...], "low": [...]}
    total_deals: int
    average_close_probability: float
    risk_summary: dict  # {"high_risk": 5, "medium_risk": 10, "low_risk": 20}
    calculated_at: datetime


class BatchScoreResult(PydanticBaseModel):
    """Result of batch scoring operation."""
    total_scored: int
    scores_by_category: dict  # {"hot": 10, "warm": 20, "cool": 30, "cold": 40}
    average_score: float
    processing_time_seconds: float
    errors: list[str]
