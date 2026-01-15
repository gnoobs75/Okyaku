import csv
import io
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from fastapi.responses import StreamingResponse

from app.api.deps import CurrentUserDep, SessionDep
from app.services.csv_import import (
    get_template_fields,
    import_companies,
    import_contacts,
    parse_csv_file,
    validate_mapping,
)

router = APIRouter()


@router.get("/template/{entity_type}")
async def download_template(
    entity_type: str,
    current_user: CurrentUserDep,
) -> StreamingResponse:
    """Download a CSV template for the specified entity type."""
    if entity_type not in ["contacts", "companies"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid entity type. Use 'contacts' or 'companies'",
        )

    fields = get_template_fields(entity_type)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(fields)
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={entity_type}_template.csv"
        },
    )


@router.post("/preview")
async def preview_import(
    file: UploadFile = File(...),
    current_user: CurrentUserDep = None,
) -> dict:
    """Preview CSV file contents and suggest field mappings."""
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV",
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit",
        )

    try:
        headers, rows = parse_csv_file(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error parsing CSV: {str(e)}",
        )

    # Suggest field mappings based on header names
    contact_fields = get_template_fields("contacts")
    company_fields = get_template_fields("companies")

    suggested_contact_mapping = {}
    suggested_company_mapping = {}

    for header in headers:
        header_lower = header.lower().replace(" ", "_").replace("-", "_")

        # Try exact match first
        if header_lower in contact_fields:
            suggested_contact_mapping[header] = header_lower
        elif header_lower in company_fields:
            suggested_company_mapping[header] = header_lower
        else:
            # Try partial matches
            for field in contact_fields:
                if field in header_lower or header_lower in field:
                    suggested_contact_mapping[header] = field
                    break
            for field in company_fields:
                if field in header_lower or header_lower in field:
                    suggested_company_mapping[header] = field
                    break

    return {
        "headers": headers,
        "row_count": len(rows),
        "preview_rows": rows[:5],
        "suggested_mappings": {
            "contacts": suggested_contact_mapping,
            "companies": suggested_company_mapping,
        },
        "available_fields": {
            "contacts": contact_fields,
            "companies": company_fields,
        },
    }


@router.post("/{entity_type}")
async def import_data(
    entity_type: str,
    field_mapping: dict[str, str],
    session: SessionDep,
    current_user: CurrentUserDep,
    file: UploadFile = File(...),
) -> dict:
    """Import data from CSV file."""
    if entity_type not in ["contacts", "companies"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid entity type. Use 'contacts' or 'companies'",
        )

    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV",
        )

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 10MB limit",
        )

    # Validate mapping
    mapping_errors = validate_mapping(entity_type, field_mapping)
    if mapping_errors:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"errors": mapping_errors},
        )

    try:
        headers, rows = parse_csv_file(content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error parsing CSV: {str(e)}",
        )

    user_id = UUID(current_user.sub)

    if entity_type == "contacts":
        imported, skipped, errors = import_contacts(
            session, rows, field_mapping, user_id
        )
    else:
        imported, skipped, errors = import_companies(
            session, rows, field_mapping, user_id
        )

    return {
        "imported": imported,
        "skipped": skipped,
        "total": len(rows),
        "errors": errors[:50],  # Limit errors to first 50
    }
