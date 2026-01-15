from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING, Optional
from uuid import UUID

from pydantic import EmailStr
from sqlalchemy import Column, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, Relationship

from app.db.base import BaseModel

if TYPE_CHECKING:
    from app.models.company import Company
    from app.models.user import User


class ContactStatus(str, Enum):
    """Contact lifecycle status."""

    LEAD = "lead"
    PROSPECT = "prospect"
    CUSTOMER = "customer"
    CHURNED = "churned"
    OTHER = "other"


class ContactBase(BaseModel):
    """Base contact fields."""

    first_name: str = Field(index=True)
    last_name: str = Field(index=True)
    email: str = Field(index=True)
    phone: Optional[str] = Field(default=None)
    mobile: Optional[str] = Field(default=None)
    job_title: Optional[str] = Field(default=None)
    department: Optional[str] = Field(default=None)
    status: ContactStatus = Field(default=ContactStatus.LEAD)
    source: Optional[str] = Field(default=None)  # e.g., "website", "referral", "event"
    address: Optional[str] = Field(default=None)
    city: Optional[str] = Field(default=None)
    state: Optional[str] = Field(default=None)
    country: Optional[str] = Field(default=None)
    postal_code: Optional[str] = Field(default=None)
    notes: Optional[str] = Field(default=None)


class Contact(ContactBase, table=True):
    """Contact entity representing an individual person."""

    __tablename__ = "contacts"
    __table_args__ = (
        Index("ix_contacts_owner_id", "owner_id"),
        Index("ix_contacts_company_id", "company_id"),
        Index("ix_contacts_email", "email"),
        Index("ix_contacts_full_name", "first_name", "last_name"),
        Index("ix_contacts_created_at", "created_at"),
        Index("ix_contacts_status", "status"),
    )

    # Foreign keys
    company_id: Optional[UUID] = Field(default=None, foreign_key="companies.id")
    owner_id: Optional[UUID] = Field(default=None, foreign_key="users.id")
    created_by: Optional[UUID] = Field(default=None, foreign_key="users.id")
    updated_by: Optional[UUID] = Field(default=None, foreign_key="users.id")

    # Custom properties stored as JSONB
    custom_properties: dict = Field(default_factory=dict, sa_column=Column(JSONB, default={}))

    # Relationships
    company: Optional["Company"] = Relationship(back_populates="contacts")
    owner: Optional["User"] = Relationship(
        sa_relationship_kwargs={"foreign_keys": "[Contact.owner_id]"}
    )


class ContactCreate(BaseModel):
    """Schema for creating a contact."""

    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    mobile: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    status: ContactStatus = ContactStatus.LEAD
    source: Optional[str] = None
    company_id: Optional[UUID] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    notes: Optional[str] = None
    custom_properties: dict = {}


class ContactUpdate(BaseModel):
    """Schema for updating a contact."""

    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    job_title: Optional[str] = None
    department: Optional[str] = None
    status: Optional[ContactStatus] = None
    source: Optional[str] = None
    company_id: Optional[UUID] = None
    owner_id: Optional[UUID] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None
    notes: Optional[str] = None
    custom_properties: Optional[dict] = None


class ContactRead(BaseModel):
    """Schema for reading contact data."""

    id: UUID
    first_name: str
    last_name: str
    email: str
    phone: Optional[str]
    mobile: Optional[str]
    job_title: Optional[str]
    department: Optional[str]
    status: ContactStatus
    source: Optional[str]
    company_id: Optional[UUID]
    owner_id: Optional[UUID]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    country: Optional[str]
    postal_code: Optional[str]
    notes: Optional[str]
    custom_properties: dict
    created_at: datetime
    updated_at: Optional[datetime]


class ContactReadWithCompany(ContactRead):
    """Schema for reading contact data with company info."""

    company_name: Optional[str] = None
