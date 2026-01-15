from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlmodel import Field

from app.db.base import BaseModel


class FileAttachment(BaseModel, table=True):
    """Model for file attachments stored in S3."""

    __tablename__ = "file_attachments"

    filename: str
    s3_key: str = Field(unique=True, index=True)
    content_type: str
    size_bytes: int
    uploaded_by: Optional[UUID] = Field(default=None, foreign_key="users.id")


class FileAttachmentRead(BaseModel):
    """Schema for reading file attachment data."""

    id: UUID
    filename: str
    content_type: str
    size_bytes: int
    created_at: datetime


class FileAttachmentCreate(BaseModel):
    """Schema for creating a file attachment record."""

    filename: str
    s3_key: str
    content_type: str
    size_bytes: int
    uploaded_by: Optional[UUID] = None
