import csv
import io
from datetime import date
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.company import Company
from app.models.contact import Contact
from app.models.deal import Deal

router = APIRouter()

CONTACT_EXPORT_FIELDS = [
    "id",
    "first_name",
    "last_name",
    "email",
    "phone",
    "mobile",
    "job_title",
    "department",
    "status",
    "source",
    "address",
    "city",
    "state",
    "country",
    "postal_code",
    "notes",
    "created_at",
    "updated_at",
]

COMPANY_EXPORT_FIELDS = [
    "id",
    "name",
    "domain",
    "industry",
    "size",
    "description",
    "website",
    "phone",
    "address",
    "city",
    "state",
    "country",
    "postal_code",
    "created_at",
    "updated_at",
]

DEAL_EXPORT_FIELDS = [
    "id",
    "name",
    "value",
    "currency",
    "expected_close_date",
    "actual_close_date",
    "description",
    "priority",
    "source",
    "lost_reason",
    "created_at",
    "updated_at",
]


@router.get("/contacts")
async def export_contacts(
    session: SessionDep,
    current_user: CurrentUserDep,
    fields: Optional[str] = Query(default=None, description="Comma-separated field names"),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    created_from: Optional[date] = Query(default=None),
    created_to: Optional[date] = Query(default=None),
) -> StreamingResponse:
    """Export contacts to CSV."""
    query = select(Contact)

    # Apply filters
    if status_filter:
        query = query.where(Contact.status == status_filter)
    if created_from:
        query = query.where(Contact.created_at >= created_from)
    if created_to:
        query = query.where(Contact.created_at <= created_to)

    contacts = session.exec(query).all()

    # Determine fields to export
    if fields:
        export_fields = [f.strip() for f in fields.split(",") if f.strip() in CONTACT_EXPORT_FIELDS]
    else:
        export_fields = CONTACT_EXPORT_FIELDS

    # Generate CSV
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=export_fields)
    writer.writeheader()

    for contact in contacts:
        row = {}
        for field in export_fields:
            value = getattr(contact, field, "")
            if value is not None:
                if hasattr(value, "isoformat"):
                    value = value.isoformat()
                row[field] = str(value)
            else:
                row[field] = ""
        writer.writerow(row)

    output.seek(0)

    filename = f"contacts_export_{date.today().isoformat()}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/companies")
async def export_companies(
    session: SessionDep,
    current_user: CurrentUserDep,
    fields: Optional[str] = Query(default=None, description="Comma-separated field names"),
    industry: Optional[str] = Query(default=None),
    created_from: Optional[date] = Query(default=None),
    created_to: Optional[date] = Query(default=None),
) -> StreamingResponse:
    """Export companies to CSV."""
    query = select(Company)

    # Apply filters
    if industry:
        query = query.where(Company.industry == industry)
    if created_from:
        query = query.where(Company.created_at >= created_from)
    if created_to:
        query = query.where(Company.created_at <= created_to)

    companies = session.exec(query).all()

    # Determine fields to export
    if fields:
        export_fields = [f.strip() for f in fields.split(",") if f.strip() in COMPANY_EXPORT_FIELDS]
    else:
        export_fields = COMPANY_EXPORT_FIELDS

    # Generate CSV
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=export_fields)
    writer.writeheader()

    for company in companies:
        row = {}
        for field in export_fields:
            value = getattr(company, field, "")
            if value is not None:
                if hasattr(value, "isoformat"):
                    value = value.isoformat()
                row[field] = str(value)
            else:
                row[field] = ""
        writer.writerow(row)

    output.seek(0)

    filename = f"companies_export_{date.today().isoformat()}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/deals")
async def export_deals(
    session: SessionDep,
    current_user: CurrentUserDep,
    fields: Optional[str] = Query(default=None, description="Comma-separated field names"),
    pipeline_id: Optional[UUID] = Query(default=None),
    stage_id: Optional[UUID] = Query(default=None),
    created_from: Optional[date] = Query(default=None),
    created_to: Optional[date] = Query(default=None),
) -> StreamingResponse:
    """Export deals to CSV."""
    query = select(Deal)

    # Apply filters
    if pipeline_id:
        query = query.where(Deal.pipeline_id == pipeline_id)
    if stage_id:
        query = query.where(Deal.stage_id == stage_id)
    if created_from:
        query = query.where(Deal.created_at >= created_from)
    if created_to:
        query = query.where(Deal.created_at <= created_to)

    deals = session.exec(query).all()

    # Determine fields to export
    if fields:
        export_fields = [f.strip() for f in fields.split(",") if f.strip() in DEAL_EXPORT_FIELDS]
    else:
        export_fields = DEAL_EXPORT_FIELDS

    # Generate CSV
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=export_fields)
    writer.writeheader()

    for deal in deals:
        row = {}
        for field in export_fields:
            value = getattr(deal, field, "")
            if value is not None:
                if hasattr(value, "isoformat"):
                    value = value.isoformat()
                row[field] = str(value)
            else:
                row[field] = ""
        writer.writerow(row)

    output.seek(0)

    filename = f"deals_export_{date.today().isoformat()}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/fields/{entity_type}")
async def get_export_fields(
    entity_type: str,
    current_user: CurrentUserDep,
) -> dict:
    """Get available export fields for an entity type."""
    if entity_type == "contacts":
        return {"fields": CONTACT_EXPORT_FIELDS}
    elif entity_type == "companies":
        return {"fields": COMPANY_EXPORT_FIELDS}
    elif entity_type == "deals":
        return {"fields": DEAL_EXPORT_FIELDS}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid entity type. Use 'contacts', 'companies', or 'deals'",
        )
