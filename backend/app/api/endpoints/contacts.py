from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.contact import (
    Contact,
    ContactCreate,
    ContactRead,
    ContactReadWithCompany,
    ContactStatus,
    ContactUpdate,
)
from app.models.company import Company
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[ContactReadWithCompany])
async def list_contacts(
    session: SessionDep,
    current_user: CurrentUserDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    status: Optional[ContactStatus] = Query(default=None),
    company_id: Optional[UUID] = Query(default=None),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
) -> PaginatedResponse[ContactReadWithCompany]:
    """List contacts with pagination, filtering, and search."""
    query = select(Contact)

    # Apply search filter
    if search:
        search_filter = or_(
            Contact.first_name.ilike(f"%{search}%"),
            Contact.last_name.ilike(f"%{search}%"),
            Contact.email.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Apply status filter
    if status:
        query = query.where(Contact.status == status)

    # Apply company filter
    if company_id:
        query = query.where(Contact.company_id == company_id)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Apply sorting
    sort_column = getattr(Contact, sort_by, Contact.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    contacts = session.exec(query).all()

    # Build response with company names
    items = []
    for contact in contacts:
        contact_data = ContactReadWithCompany.model_validate(contact)
        if contact.company_id:
            company = session.get(Company, contact.company_id)
            if company:
                contact_data.company_name = company.name
        items.append(contact_data)

    return PaginatedResponse.create(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/search")
async def search_contacts(
    session: SessionDep,
    current_user: CurrentUserDep,
    q: str = Query(..., min_length=1),
    limit: int = Query(default=10, ge=1, le=50),
) -> list[ContactReadWithCompany]:
    """Full-text search across contacts."""
    search_filter = or_(
        Contact.first_name.ilike(f"%{q}%"),
        Contact.last_name.ilike(f"%{q}%"),
        Contact.email.ilike(f"%{q}%"),
        Contact.phone.ilike(f"%{q}%"),
        Contact.job_title.ilike(f"%{q}%"),
    )

    query = select(Contact).where(search_filter).limit(limit)
    contacts = session.exec(query).all()

    items = []
    for contact in contacts:
        contact_data = ContactReadWithCompany.model_validate(contact)
        if contact.company_id:
            company = session.get(Company, contact.company_id)
            if company:
                contact_data.company_name = company.name
        items.append(contact_data)

    return items


@router.get("/{contact_id}", response_model=ContactReadWithCompany)
async def get_contact(
    contact_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> ContactReadWithCompany:
    """Get a contact by ID."""
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    contact_data = ContactReadWithCompany.model_validate(contact)
    if contact.company_id:
        company = session.get(Company, contact.company_id)
        if company:
            contact_data.company_name = company.name

    return contact_data


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ContactRead)
async def create_contact(
    data: ContactCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Contact:
    """Create a new contact."""
    # Check for duplicate email
    existing = session.exec(
        select(Contact).where(Contact.email == data.email)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Contact with this email already exists",
        )

    # Verify company exists if provided
    if data.company_id:
        company = session.get(Company, data.company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company not found",
            )

    contact = Contact(
        **data.model_dump(),
        owner_id=UUID(current_user.sub),
        created_by=UUID(current_user.sub),
    )
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@router.put("/{contact_id}", response_model=ContactRead)
async def update_contact(
    contact_id: UUID,
    data: ContactUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Contact:
    """Update a contact."""
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    # Check email uniqueness if being updated
    if data.email and data.email != contact.email:
        existing = session.exec(
            select(Contact).where(Contact.email == data.email)
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Contact with this email already exists",
            )

    # Verify company exists if being updated
    if data.company_id:
        company = session.get(Company, data.company_id)
        if not company:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Company not found",
            )

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(contact, key, value)

    contact.updated_by = UUID(current_user.sub)
    session.add(contact)
    session.commit()
    session.refresh(contact)
    return contact


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    """Delete a contact."""
    contact = session.get(Contact, contact_id)
    if not contact:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Contact not found",
        )

    session.delete(contact)
    session.commit()
