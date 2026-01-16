"""Content Library models for reusable assets and templates."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID, uuid4

from sqlmodel import Field, Relationship, SQLModel


class AssetType(str, Enum):
    """Types of content library assets."""
    IMAGE = "image"
    VIDEO = "video"
    GIF = "gif"
    TEMPLATE = "template"
    SNIPPET = "snippet"
    HASHTAG_SET = "hashtag_set"


class AssetCategory(str, Enum):
    """Categories for organizing assets."""
    GENERAL = "general"
    BRANDING = "branding"
    PRODUCTS = "products"
    EVENTS = "events"
    SEASONAL = "seasonal"
    TESTIMONIALS = "testimonials"
    EDUCATIONAL = "educational"
    PROMOTIONAL = "promotional"
    BEHIND_THE_SCENES = "behind_the_scenes"
    USER_GENERATED = "user_generated"


class ContentAssetBase(SQLModel):
    """Base model for content assets."""
    name: str = Field(max_length=255, index=True)
    description: Optional[str] = Field(default=None, max_length=1000)
    asset_type: AssetType
    category: AssetCategory = AssetCategory.GENERAL
    tags: Optional[str] = Field(default=None, max_length=500)  # Comma-separated tags

    # For media assets (image, video, gif)
    file_url: Optional[str] = Field(default=None, max_length=500)
    thumbnail_url: Optional[str] = Field(default=None, max_length=500)
    file_size: Optional[int] = Field(default=None)  # In bytes
    mime_type: Optional[str] = Field(default=None, max_length=100)
    width: Optional[int] = Field(default=None)
    height: Optional[int] = Field(default=None)
    duration_seconds: Optional[float] = Field(default=None)  # For videos

    # For text assets (template, snippet, hashtag_set)
    content: Optional[str] = Field(default=None, max_length=5000)

    # Platform compatibility
    platforms: Optional[str] = Field(default=None, max_length=100)  # Comma-separated: linkedin,twitter,facebook

    # Usage tracking
    usage_count: int = Field(default=0)
    last_used_at: Optional[datetime] = Field(default=None)

    # Favorites
    is_favorite: bool = Field(default=False)


class ContentAsset(ContentAssetBase, table=True):
    """Content library asset model."""
    __tablename__ = "content_assets"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ContentAssetCreate(ContentAssetBase):
    """Schema for creating a content asset."""
    pass


class ContentAssetUpdate(SQLModel):
    """Schema for updating a content asset."""
    name: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = Field(default=None, max_length=1000)
    category: Optional[AssetCategory] = None
    tags: Optional[str] = Field(default=None, max_length=500)
    content: Optional[str] = Field(default=None, max_length=5000)
    platforms: Optional[str] = Field(default=None, max_length=100)
    is_favorite: Optional[bool] = None


class ContentAssetRead(ContentAssetBase):
    """Schema for reading a content asset."""
    id: UUID
    owner_id: UUID
    created_at: datetime
    updated_at: datetime


# Content Collections for grouping assets
class ContentCollectionBase(SQLModel):
    """Base model for content collections."""
    name: str = Field(max_length=255, index=True)
    description: Optional[str] = Field(default=None, max_length=500)
    color: Optional[str] = Field(default=None, max_length=7)  # Hex color


class ContentCollection(ContentCollectionBase, table=True):
    """Content collection model for grouping assets."""
    __tablename__ = "content_collections"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    owner_id: UUID = Field(foreign_key="users.id", index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ContentCollectionCreate(ContentCollectionBase):
    """Schema for creating a collection."""
    pass


class ContentCollectionUpdate(SQLModel):
    """Schema for updating a collection."""
    name: Optional[str] = Field(default=None, max_length=255)
    description: Optional[str] = Field(default=None, max_length=500)
    color: Optional[str] = Field(default=None, max_length=7)


class ContentCollectionRead(ContentCollectionBase):
    """Schema for reading a collection."""
    id: UUID
    owner_id: UUID
    asset_count: int = 0
    created_at: datetime
    updated_at: datetime


# Junction table for assets in collections
class CollectionAsset(SQLModel, table=True):
    """Many-to-many relationship between collections and assets."""
    __tablename__ = "collection_assets"

    collection_id: UUID = Field(foreign_key="content_collections.id", primary_key=True)
    asset_id: UUID = Field(foreign_key="content_assets.id", primary_key=True)
    added_at: datetime = Field(default_factory=datetime.utcnow)
