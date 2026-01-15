from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlmodel import Field

from app.db.base import BaseModel


class User(BaseModel, table=True):
    """User model representing a CRM user."""

    __tablename__ = "users"

    email: str = Field(unique=True, index=True)
    username: str = Field(unique=True, index=True)
    password_hash: str = Field()
    name: Optional[str] = None
    is_active: bool = Field(default=True)
    last_login: Optional[datetime] = None


class UserRead(BaseModel):
    """Schema for reading user data."""

    id: UUID
    email: str
    username: str
    name: Optional[str]
    is_active: bool
    created_at: datetime


class UserCreate(BaseModel):
    """Schema for creating a user (registration)."""

    email: str
    username: str
    password: str
    name: Optional[str] = None


class UserLogin(BaseModel):
    """Schema for user login."""

    username: str
    password: str


class TokenResponse(BaseModel):
    """Schema for token response."""

    access_token: str
    token_type: str = "bearer"
    user: UserRead
