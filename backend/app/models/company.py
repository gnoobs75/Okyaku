from datetime import datetime
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from sqlalchemy import Column, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.models.contact import Contact
    from app.models.user import User


class CompanyBase(BaseModel):
    """Base company fields."""

    name: str = Field(index=True)
    domain: Optional[str] = Field(default=None, index=True)
    industry: Optional[str] = Field(default=None)
    size: Optional[str] = Field(default=None)  # e.g., "1-10", "11-50", "51-200", etc.
    description: Optional[str] = Field(default=None)
    website: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    address: Optional[str] = Field(default=None)
    city: Optional[str] = Field(default=None)
    state: Optional[str] = Field(default=None)
    country: Optional[str] = Field(default=None)
    postal_code: Optional[str] = Field(default=None)


class Company(CompanyBase, table=True):
    """Company entity representing a business organization."""

    __tablename__ = "companies"
    __table_args__ = (
        Index("ix_companies_owner_id", "owner_id"),
        Index("ix_companies_created_at", "created_at"),
    )

    # Ownership and audit
    owner_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    created_by: Optional[UUID] = Field(default=None, foreign_key="users.id")
    updated_by: Optional[UUID] = Field(default=None, foreign_key="users.id")

    # Custom properties stored as JSONB
    custom_properties: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))

    # Relationships
    contacts: list["Contact"] = Relationship(back_populates="company")
    owner: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Company.owner_id]"}
    )


class CompanyCreate(BaseModel):
    """Schema for creating a company."""

    name: str
    domain: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    custom_properties: dict = {}


class CompanyUpdate(BaseModel):
    """Schema for updating a company."""

    name: Optional[str] = None
    domain: Optional[str] = None
    industry: Optional[str] = None
    size: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    owner_id: Optional[UUID] = None
    custom_properties: Optional[dict] = None


class CompanyRead(BaseModel):
    """Schema for reading company data."""

    id: UUID
    name: str
    domain: Optional[str]
    industry: Optional[str]
    size: Optional[str]
    description: Optional[str]
    website: Optional[str]
    phone: Optional[str]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    country: Optional[str]
    postal_code: Optional[str]
    owner_id: Optional[UUID]
    custom_properties: dict
    created_at: datetime
    updated_at: Optional[datetime]
