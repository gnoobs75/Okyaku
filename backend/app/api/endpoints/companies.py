from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.company import Company, CompanyCreate, CompanyRead, CompanyUpdate
from app.models.contact import Contact, ContactRead
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("/", response_model=PaginatedResponse[CompanyRead])
async def list_companies(
    session: SessionDep,
    current_user: CurrentUserDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    industry: Optional[str] = Query(default=None),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
) -> PaginatedResponse[CompanyRead]:
    """List companies with pagination, filtering, and search."""
    query = select(Company)

    # Apply search filter
    if search:
        search_filter = or_(
            Company.name.ilike(f"%{search}%"),
            Company.domain.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)

    # Apply industry filter
    if industry:
        query = query.where(Company.industry == industry)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Apply sorting
    sort_column = getattr(Company, sort_by, Company.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    companies = session.exec(query).all()

    return PaginatedResponse.create(
        items=[CompanyRead.model_validate(c) for c in companies],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{company_id}", response_model=CompanyRead)
async def get_company(
    company_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Company:
    """Get a company by ID."""
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )
    return company


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=CompanyRead)
async def create_company(
    data: CompanyCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Company:
    """Create a new company."""
    company = Company(
        **data.model_dump(),
        owner_id=UUID(current_user.sub),
        created_by=UUID(current_user.sub),
    )
    session.add(company)
    session.commit()
    session.refresh(company)
    return company


@router.put("/{company_id}", response_model=CompanyRead)
async def update_company(
    company_id: UUID,
    data: CompanyUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Company:
    """Update a company."""
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(company, key, value)

    company.updated_by = UUID(current_user.sub)
    session.add(company)
    session.commit()
    session.refresh(company)
    return company


@router.delete("/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_company(
    company_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    """Delete a company."""
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    session.delete(company)
    session.commit()


@router.get("/{company_id}/contacts", response_model=list[ContactRead])
async def get_company_contacts(
    company_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> list[Contact]:
    """Get all contacts for a company."""
    company = session.get(Company, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )

    query = select(Contact).where(Contact.company_id == company_id)
    contacts = session.exec(query).all()
    return list(contacts)
