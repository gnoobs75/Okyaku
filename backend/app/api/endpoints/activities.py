from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.activity import (
    Activity,
    ActivityCreate,
    ActivityRead,
    ActivityReadWithRelations,
    ActivityType,
    ActivityUpdate,
)
from app.models.company import Company
from app.models.contact import Contact
from app.models.deal import Deal
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[ActivityReadWithRelations])
async def list_activities(
    session: SessionDep,
    current_user: CurrentUserDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    activity_type: Optional[ActivityType] = Query(default=None),
    contact_id: Optional[UUID] = Query(default=None),
    company_id: Optional[UUID] = Query(default=None),
    deal_id: Optional[UUID] = Query(default=None),
    owner_id: Optional[UUID] = Query(default=None),
    created_by: Optional[UUID] = Query(default=None),
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    sort_by: str = Query(default="activity_date"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
) -> PaginatedResponse[ActivityReadWithRelations]:
    """List activities with pagination, filtering, and search."""
    query = select(Activity)

    # Apply search filter
    if search:
        query = query.where(
            or_(
                Activity.subject.ilike(f"%{search}%"),
                Activity.description.ilike(f"%{search}%"),
            )
        )

    # Apply filters
    if activity_type:
        query = query.where(Activity.type == activity_type)
    if contact_id:
        query = query.where(Activity.contact_id == contact_id)
    if company_id:
        query = query.where(Activity.company_id == company_id)
    if deal_id:
        query = query.where(Activity.deal_id == deal_id)
    if owner_id:
        query = query.where(Activity.owner_id == owner_id)
    if created_by:
        query = query.where(Activity.created_by == created_by)
    if date_from:
        query = query.where(Activity.activity_date >= date_from)
    if date_to:
        query = query.where(Activity.activity_date <= date_to)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Apply sorting
    sort_column = getattr(Activity, sort_by, Activity.activity_date)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    activities = session.exec(query).all()

    # Build response with related names
    items = []
    for activity in activities:
        activity_data = ActivityReadWithRelations.model_validate(activity)

        if activity.contact_id:
            contact = session.get(Contact, activity.contact_id)
            if contact:
                activity_data.contact_name = f"{contact.first_name} {contact.last_name}"
        if activity.company_id:
            company = session.get(Company, activity.company_id)
            if company:
                activity_data.company_name = company.name
        if activity.deal_id:
            deal = session.get(Deal, activity.deal_id)
            if deal:
                activity_data.deal_name = deal.name

        items.append(activity_data)

    return PaginatedResponse.create(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/timeline/{entity_type}/{entity_id}")
async def get_timeline(
    entity_type: str,
    entity_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
    limit: int = Query(default=50, ge=1, le=100),
) -> list[ActivityReadWithRelations]:
    """Get activity timeline for a contact, company, or deal."""
    query = select(Activity)

    if entity_type == "contact":
        query = query.where(Activity.contact_id == entity_id)
    elif entity_type == "company":
        query = query.where(Activity.company_id == entity_id)
    elif entity_type == "deal":
        query = query.where(Activity.deal_id == entity_id)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid entity type. Use 'contact', 'company', or 'deal'",
        )

    query = query.order_by(Activity.activity_date.desc()).limit(limit)
    activities = session.exec(query).all()

    items = []
    for activity in activities:
        activity_data = ActivityReadWithRelations.model_validate(activity)
        items.append(activity_data)

    return items


@router.get("/{activity_id}", response_model=ActivityReadWithRelations)
async def get_activity(
    activity_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> ActivityReadWithRelations:
    """Get an activity by ID."""
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )

    activity_data = ActivityReadWithRelations.model_validate(activity)

    if activity.contact_id:
        contact = session.get(Contact, activity.contact_id)
        if contact:
            activity_data.contact_name = f"{contact.first_name} {contact.last_name}"
    if activity.company_id:
        company = session.get(Company, activity.company_id)
        if company:
            activity_data.company_name = company.name
    if activity.deal_id:
        deal = session.get(Deal, activity.deal_id)
        if deal:
            activity_data.deal_name = deal.name

    return activity_data


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ActivityRead)
async def create_activity(
    data: ActivityCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Activity:
    """Create a new activity."""
    activity = Activity(
        **data.model_dump(),
        owner_id=UUID(current_user.sub),
        created_by=UUID(current_user.sub),
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity


@router.post("/bulk", status_code=status.HTTP_201_CREATED)
async def create_activities_bulk(
    data: list[ActivityCreate],
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Create multiple activities at once."""
    activities = []
    for item in data:
        activity = Activity(
            **item.model_dump(),
            owner_id=UUID(current_user.sub),
            created_by=UUID(current_user.sub),
        )
        session.add(activity)
        activities.append(activity)

    session.commit()

    return {"created": len(activities)}


@router.put("/{activity_id}", response_model=ActivityRead)
async def update_activity(
    activity_id: UUID,
    data: ActivityUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Activity:
    """Update an activity."""
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(activity, key, value)

    activity.updated_by = UUID(current_user.sub)
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return activity


@router.delete("/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_activity(
    activity_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    """Delete an activity."""
    activity = session.get(Activity, activity_id)
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Activity not found",
        )

    session.delete(activity)
    session.commit()
