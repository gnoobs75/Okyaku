import csv
import io
from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlmodel import Session

from app.core.logging import get_logger
from app.models.company import Company
from app.models.contact import Contact, ContactStatus

logger = get_logger(__name__)

CONTACT_FIELDS = {
    "first_name": {"required": True, "type": "str"},
    "last_name": {"required": True, "type": "str"},
    "email": {"required": True, "type": "str"},
    "phone": {"required": False, "type": "str"},
    "mobile": {"required": False, "type": "str"},
    "job_title": {"required": False, "type": "str"},
    "department": {"required": False, "type": "str"},
    "status": {"required": False, "type": "str", "default": "lead"},
    "source": {"required": False, "type": "str"},
    "address": {"required": False, "type": "str"},
    "city": {"required": False, "type": "str"},
    "state": {"required": False, "type": "str"},
    "country": {"required": False, "type": "str"},
    "postal_code": {"required": False, "type": "str"},
    "notes": {"required": False, "type": "str"},
}

COMPANY_FIELDS = {
    "name": {"required": True, "type": "str"},
    "domain": {"required": False, "type": "str"},
    "industry": {"required": False, "type": "str"},
    "size": {"required": False, "type": "str"},
    "description": {"required": False, "type": "str"},
    "website": {"required": False, "type": "str"},
    "phone": {"required": False, "type": "str"},
    "address": {"required": False, "type": "str"},
    "city": {"required": False, "type": "str"},
    "state": {"required": False, "type": "str"},
    "country": {"required": False, "type": "str"},
    "postal_code": {"required": False, "type": "str"},
}


def get_template_fields(entity_type: str) -> list[str]:
    """Get template field names for an entity type."""
    if entity_type == "contacts":
        return list(CONTACT_FIELDS.keys())
    elif entity_type == "companies":
        return list(COMPANY_FIELDS.keys())
    else:
        raise ValueError(f"Unknown entity type: {entity_type}")


def parse_csv_file(file_content: bytes) -> tuple[list[str], list[dict[str, str]]]:
    """Parse CSV file and return headers and rows."""
    content = file_content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(content))
    headers = reader.fieldnames or []
    rows = list(reader)
    return headers, rows


def validate_mapping(
    entity_type: str, field_mapping: dict[str, str]
) -> list[str]:
    """Validate field mapping and return any errors."""
    errors = []
    fields = CONTACT_FIELDS if entity_type == "contacts" else COMPANY_FIELDS

    # Check required fields are mapped
    for field_name, field_info in fields.items():
        if field_info["required"] and field_name not in field_mapping.values():
            errors.append(f"Required field '{field_name}' is not mapped")

    return errors


def validate_row(
    entity_type: str,
    row: dict[str, str],
    field_mapping: dict[str, str],
    row_index: int,
) -> list[str]:
    """Validate a single row and return any errors."""
    errors = []
    fields = CONTACT_FIELDS if entity_type == "contacts" else COMPANY_FIELDS

    for csv_col, crm_field in field_mapping.items():
        if crm_field not in fields:
            continue

        field_info = fields[crm_field]
        value = row.get(csv_col, "").strip()

        if field_info["required"] and not value:
            errors.append(f"Row {row_index + 1}: Required field '{crm_field}' is empty")

        # Validate status values for contacts
        if crm_field == "status" and value:
            valid_statuses = ["lead", "prospect", "customer", "churned", "other"]
            if value.lower() not in valid_statuses:
                errors.append(
                    f"Row {row_index + 1}: Invalid status '{value}'. "
                    f"Valid values: {', '.join(valid_statuses)}"
                )

    return errors


def import_contacts(
    session: Session,
    rows: list[dict[str, str]],
    field_mapping: dict[str, str],
    user_id: UUID,
) -> tuple[int, int, list[str]]:
    """Import contacts from CSV rows."""
    imported = 0
    skipped = 0
    errors = []

    for i, row in enumerate(rows):
        row_errors = validate_row("contacts", row, field_mapping, i)
        if row_errors:
            errors.extend(row_errors)
            skipped += 1
            continue

        try:
            contact_data = {}
            for csv_col, crm_field in field_mapping.items():
                if crm_field in CONTACT_FIELDS:
                    value = row.get(csv_col, "").strip()
                    if value:
                        if crm_field == "status":
                            value = value.lower()
                        contact_data[crm_field] = value

            # Set defaults
            if "status" not in contact_data:
                contact_data["status"] = ContactStatus.LEAD

            contact = Contact(
                **contact_data,
                owner_id=user_id,
                created_by=user_id,
            )
            session.add(contact)
            imported += 1

        except Exception as e:
            errors.append(f"Row {i + 1}: Error creating contact - {str(e)}")
            skipped += 1

    session.commit()
    return imported, skipped, errors


def import_companies(
    session: Session,
    rows: list[dict[str, str]],
    field_mapping: dict[str, str],
    user_id: UUID,
) -> tuple[int, int, list[str]]:
    """Import companies from CSV rows."""
    imported = 0
    skipped = 0
    errors = []

    for i, row in enumerate(rows):
        row_errors = validate_row("companies", row, field_mapping, i)
        if row_errors:
            errors.extend(row_errors)
            skipped += 1
            continue

        try:
            company_data = {}
            for csv_col, crm_field in field_mapping.items():
                if crm_field in COMPANY_FIELDS:
                    value = row.get(csv_col, "").strip()
                    if value:
                        company_data[crm_field] = value

            company = Company(
                **company_data,
                owner_id=user_id,
                created_by=user_id,
            )
            session.add(company)
            imported += 1

        except Exception as e:
            errors.append(f"Row {i + 1}: Error creating company - {str(e)}")
            skipped += 1

    session.commit()
    return imported, skipped, errors
