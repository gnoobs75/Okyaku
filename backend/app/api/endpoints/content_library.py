"""API endpoints for the unified content library."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select, or_

from app.api.deps import CurrentUserDep, SessionDep
from app.models.content_library import (
    ContentAsset,
    ContentAssetCreate,
    ContentAssetRead,
    ContentAssetUpdate,
    ContentCollection,
    ContentCollectionCreate,
    ContentCollectionRead,
    ContentCollectionUpdate,
    CollectionAsset,
    AssetType,
    AssetCategory,
)

router = APIRouter()


# ==================== Content Assets ====================

@router.get("/assets")
async def list_assets(
    session: SessionDep,
    current_user: CurrentUserDep,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    asset_type: Optional[AssetType] = None,
    category: Optional[AssetCategory] = None,
    platform: Optional[str] = None,
    search: Optional[str] = None,
    collection_id: Optional[UUID] = None,
    favorites_only: bool = False,
    sort_by: str = Query("created_at", pattern="^(created_at|name|usage_count|last_used_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
) -> dict:
    """List content library assets with filtering and pagination."""
    user_id = UUID(current_user.sub)

    # Base query
    query = select(ContentAsset).where(ContentAsset.owner_id == user_id)

    # Apply filters
    if asset_type:
        query = query.where(ContentAsset.asset_type == asset_type)

    if category:
        query = query.where(ContentAsset.category == category)

    if platform:
        query = query.where(ContentAsset.platforms.contains(platform))

    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                ContentAsset.name.ilike(search_pattern),
                ContentAsset.description.ilike(search_pattern),
                ContentAsset.tags.ilike(search_pattern),
                ContentAsset.content.ilike(search_pattern),
            )
        )

    if favorites_only:
        query = query.where(ContentAsset.is_favorite == True)

    if collection_id:
        query = query.join(
            CollectionAsset, ContentAsset.id == CollectionAsset.asset_id
        ).where(CollectionAsset.collection_id == collection_id)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Apply sorting
    sort_column = getattr(ContentAsset, sort_by)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    assets = session.exec(query).all()

    return {
        "items": [ContentAssetRead.model_validate(a) for a in assets],
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": (total + page_size - 1) // page_size,
    }


@router.post("/assets")
async def create_asset(
    session: SessionDep,
    current_user: CurrentUserDep,
    asset: ContentAssetCreate,
) -> ContentAssetRead:
    """Create a new content library asset."""
    user_id = UUID(current_user.sub)

    db_asset = ContentAsset(
        **asset.model_dump(),
        owner_id=user_id,
    )
    session.add(db_asset)
    session.commit()
    session.refresh(db_asset)

    return ContentAssetRead.model_validate(db_asset)


@router.get("/assets/{asset_id}")
async def get_asset(
    session: SessionDep,
    current_user: CurrentUserDep,
    asset_id: UUID,
) -> ContentAssetRead:
    """Get a content library asset by ID."""
    user_id = UUID(current_user.sub)

    asset = session.exec(
        select(ContentAsset).where(
            ContentAsset.id == asset_id,
            ContentAsset.owner_id == user_id,
        )
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    return ContentAssetRead.model_validate(asset)


@router.patch("/assets/{asset_id}")
async def update_asset(
    session: SessionDep,
    current_user: CurrentUserDep,
    asset_id: UUID,
    update: ContentAssetUpdate,
) -> ContentAssetRead:
    """Update a content library asset."""
    user_id = UUID(current_user.sub)

    asset = session.exec(
        select(ContentAsset).where(
            ContentAsset.id == asset_id,
            ContentAsset.owner_id == user_id,
        )
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(asset, key, value)

    asset.updated_at = datetime.utcnow()
    session.add(asset)
    session.commit()
    session.refresh(asset)

    return ContentAssetRead.model_validate(asset)


@router.delete("/assets/{asset_id}")
async def delete_asset(
    session: SessionDep,
    current_user: CurrentUserDep,
    asset_id: UUID,
) -> dict:
    """Delete a content library asset."""
    user_id = UUID(current_user.sub)

    asset = session.exec(
        select(ContentAsset).where(
            ContentAsset.id == asset_id,
            ContentAsset.owner_id == user_id,
        )
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Remove from all collections first
    session.exec(
        select(CollectionAsset).where(CollectionAsset.asset_id == asset_id)
    )
    for ca in session.exec(select(CollectionAsset).where(CollectionAsset.asset_id == asset_id)).all():
        session.delete(ca)

    session.delete(asset)
    session.commit()

    return {"success": True, "message": "Asset deleted"}


@router.post("/assets/{asset_id}/use")
async def track_asset_usage(
    session: SessionDep,
    current_user: CurrentUserDep,
    asset_id: UUID,
) -> ContentAssetRead:
    """Track when an asset is used (e.g., added to a post)."""
    user_id = UUID(current_user.sub)

    asset = session.exec(
        select(ContentAsset).where(
            ContentAsset.id == asset_id,
            ContentAsset.owner_id == user_id,
        )
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset.usage_count += 1
    asset.last_used_at = datetime.utcnow()
    session.add(asset)
    session.commit()
    session.refresh(asset)

    return ContentAssetRead.model_validate(asset)


@router.post("/assets/{asset_id}/favorite")
async def toggle_favorite(
    session: SessionDep,
    current_user: CurrentUserDep,
    asset_id: UUID,
) -> ContentAssetRead:
    """Toggle favorite status of an asset."""
    user_id = UUID(current_user.sub)

    asset = session.exec(
        select(ContentAsset).where(
            ContentAsset.id == asset_id,
            ContentAsset.owner_id == user_id,
        )
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    asset.is_favorite = not asset.is_favorite
    asset.updated_at = datetime.utcnow()
    session.add(asset)
    session.commit()
    session.refresh(asset)

    return ContentAssetRead.model_validate(asset)


# ==================== Collections ====================

@router.get("/collections")
async def list_collections(
    session: SessionDep,
    current_user: CurrentUserDep,
) -> list[ContentCollectionRead]:
    """List all content collections."""
    user_id = UUID(current_user.sub)

    collections = session.exec(
        select(ContentCollection)
        .where(ContentCollection.owner_id == user_id)
        .order_by(ContentCollection.name)
    ).all()

    result = []
    for collection in collections:
        # Count assets in collection
        asset_count = session.exec(
            select(func.count()).where(CollectionAsset.collection_id == collection.id)
        ).one()

        collection_data = ContentCollectionRead(
            id=collection.id,
            owner_id=collection.owner_id,
            name=collection.name,
            description=collection.description,
            color=collection.color,
            asset_count=asset_count,
            created_at=collection.created_at,
            updated_at=collection.updated_at,
        )
        result.append(collection_data)

    return result


@router.post("/collections")
async def create_collection(
    session: SessionDep,
    current_user: CurrentUserDep,
    collection: ContentCollectionCreate,
) -> ContentCollectionRead:
    """Create a new content collection."""
    user_id = UUID(current_user.sub)

    db_collection = ContentCollection(
        **collection.model_dump(),
        owner_id=user_id,
    )
    session.add(db_collection)
    session.commit()
    session.refresh(db_collection)

    return ContentCollectionRead(
        id=db_collection.id,
        owner_id=db_collection.owner_id,
        name=db_collection.name,
        description=db_collection.description,
        color=db_collection.color,
        asset_count=0,
        created_at=db_collection.created_at,
        updated_at=db_collection.updated_at,
    )


@router.patch("/collections/{collection_id}")
async def update_collection(
    session: SessionDep,
    current_user: CurrentUserDep,
    collection_id: UUID,
    update: ContentCollectionUpdate,
) -> ContentCollectionRead:
    """Update a content collection."""
    user_id = UUID(current_user.sub)

    collection = session.exec(
        select(ContentCollection).where(
            ContentCollection.id == collection_id,
            ContentCollection.owner_id == user_id,
        )
    ).first()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(collection, key, value)

    collection.updated_at = datetime.utcnow()
    session.add(collection)
    session.commit()
    session.refresh(collection)

    asset_count = session.exec(
        select(func.count()).where(CollectionAsset.collection_id == collection.id)
    ).one()

    return ContentCollectionRead(
        id=collection.id,
        owner_id=collection.owner_id,
        name=collection.name,
        description=collection.description,
        color=collection.color,
        asset_count=asset_count,
        created_at=collection.created_at,
        updated_at=collection.updated_at,
    )


@router.delete("/collections/{collection_id}")
async def delete_collection(
    session: SessionDep,
    current_user: CurrentUserDep,
    collection_id: UUID,
) -> dict:
    """Delete a content collection (does not delete assets)."""
    user_id = UUID(current_user.sub)

    collection = session.exec(
        select(ContentCollection).where(
            ContentCollection.id == collection_id,
            ContentCollection.owner_id == user_id,
        )
    ).first()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Remove asset associations
    for ca in session.exec(select(CollectionAsset).where(CollectionAsset.collection_id == collection_id)).all():
        session.delete(ca)

    session.delete(collection)
    session.commit()

    return {"success": True, "message": "Collection deleted"}


@router.post("/collections/{collection_id}/assets/{asset_id}")
async def add_asset_to_collection(
    session: SessionDep,
    current_user: CurrentUserDep,
    collection_id: UUID,
    asset_id: UUID,
) -> dict:
    """Add an asset to a collection."""
    user_id = UUID(current_user.sub)

    # Verify ownership of both
    collection = session.exec(
        select(ContentCollection).where(
            ContentCollection.id == collection_id,
            ContentCollection.owner_id == user_id,
        )
    ).first()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    asset = session.exec(
        select(ContentAsset).where(
            ContentAsset.id == asset_id,
            ContentAsset.owner_id == user_id,
        )
    ).first()

    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    # Check if already in collection
    existing = session.exec(
        select(CollectionAsset).where(
            CollectionAsset.collection_id == collection_id,
            CollectionAsset.asset_id == asset_id,
        )
    ).first()

    if existing:
        return {"success": True, "message": "Asset already in collection"}

    # Add to collection
    ca = CollectionAsset(collection_id=collection_id, asset_id=asset_id)
    session.add(ca)
    session.commit()

    return {"success": True, "message": "Asset added to collection"}


@router.delete("/collections/{collection_id}/assets/{asset_id}")
async def remove_asset_from_collection(
    session: SessionDep,
    current_user: CurrentUserDep,
    collection_id: UUID,
    asset_id: UUID,
) -> dict:
    """Remove an asset from a collection."""
    user_id = UUID(current_user.sub)

    # Verify ownership
    collection = session.exec(
        select(ContentCollection).where(
            ContentCollection.id == collection_id,
            ContentCollection.owner_id == user_id,
        )
    ).first()

    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")

    ca = session.exec(
        select(CollectionAsset).where(
            CollectionAsset.collection_id == collection_id,
            CollectionAsset.asset_id == asset_id,
        )
    ).first()

    if ca:
        session.delete(ca)
        session.commit()

    return {"success": True, "message": "Asset removed from collection"}


# ==================== Stats ====================

@router.get("/stats")
async def get_library_stats(
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Get content library statistics."""
    user_id = UUID(current_user.sub)

    # Count by type
    type_counts = {}
    for asset_type in AssetType:
        count = session.exec(
            select(func.count()).where(
                ContentAsset.owner_id == user_id,
                ContentAsset.asset_type == asset_type,
            )
        ).one()
        type_counts[asset_type.value] = count

    # Count by category
    category_counts = {}
    for category in AssetCategory:
        count = session.exec(
            select(func.count()).where(
                ContentAsset.owner_id == user_id,
                ContentAsset.category == category,
            )
        ).one()
        if count > 0:
            category_counts[category.value] = count

    # Total assets
    total_assets = session.exec(
        select(func.count()).where(ContentAsset.owner_id == user_id)
    ).one()

    # Total collections
    total_collections = session.exec(
        select(func.count()).where(ContentCollection.owner_id == user_id)
    ).one()

    # Favorites count
    favorites = session.exec(
        select(func.count()).where(
            ContentAsset.owner_id == user_id,
            ContentAsset.is_favorite == True,
        )
    ).one()

    # Most used assets
    most_used = session.exec(
        select(ContentAsset)
        .where(
            ContentAsset.owner_id == user_id,
            ContentAsset.usage_count > 0,
        )
        .order_by(ContentAsset.usage_count.desc())
        .limit(5)
    ).all()

    return {
        "total_assets": total_assets,
        "total_collections": total_collections,
        "favorites": favorites,
        "by_type": type_counts,
        "by_category": category_counts,
        "most_used": [
            {
                "id": str(a.id),
                "name": a.name,
                "type": a.asset_type.value,
                "usage_count": a.usage_count,
            }
            for a in most_used
        ],
    }
