"""Audit log API endpoints."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.audit_log import (
    AuditAction,
    AuditLog,
    AuditLogRead,
    DataRetentionPolicy,
    DataRetentionPolicyCreate,
    DataRetentionPolicyRead,
    DataRetentionPolicyUpdate,
    EntityType,
    GDPRExportRequest,
    GDPRExportRequestCreate,
    GDPRExportRequestRead,
)
from app.services.audit_service import AuditService

router = APIRouter()


# ==================== Audit Logs ====================


@router.get("/logs", response_model=list[AuditLogRead])
async def list_audit_logs(
    current_user: CurrentUserDep,
    session: SessionDep,
    user_id: Optional[UUID] = None,
    entity_type: Optional[EntityType] = None,
    entity_id: Optional[UUID] = None,
    action: Optional[AuditAction] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
):
    """List audit logs with optional filters."""
    service = AuditService(session)
    logs, total = service.get_logs(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        date_from=date_from,
        date_to=date_to,
        search=search,
        skip=skip,
        limit=limit,
    )
    return logs


@router.get("/logs/count")
async def count_audit_logs(
    current_user: CurrentUserDep,
    session: SessionDep,
    user_id: Optional[UUID] = None,
    entity_type: Optional[EntityType] = None,
    entity_id: Optional[UUID] = None,
    action: Optional[AuditAction] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    search: Optional[str] = None,
):
    """Get count of audit logs matching filters."""
    service = AuditService(session)
    _, total = service.get_logs(
        user_id=user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        date_from=date_from,
        date_to=date_to,
        search=search,
        skip=0,
        limit=1,
    )
    return {"total": total}


@router.get("/logs/{log_id}", response_model=AuditLogRead)
async def get_audit_log(
    log_id: UUID,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Get a specific audit log entry."""
    log = session.get(AuditLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return log


@router.get("/entity/{entity_type}/{entity_id}/history", response_model=list[AuditLogRead])
async def get_entity_history(
    entity_type: EntityType,
    entity_id: UUID,
    current_user: CurrentUserDep,
    session: SessionDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
):
    """Get audit history for a specific entity."""
    service = AuditService(session)
    logs = service.get_entity_history(
        entity_type=entity_type,
        entity_id=entity_id,
        skip=skip,
        limit=limit,
    )
    return logs


@router.get("/user/{user_id}/activity", response_model=list[AuditLogRead])
async def get_user_activity(
    user_id: UUID,
    current_user: CurrentUserDep,
    session: SessionDep,
    days: int = Query(default=30, ge=1, le=365),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
):
    """Get recent activity for a specific user."""
    service = AuditService(session)
    logs = service.get_user_activity(
        user_id=user_id,
        days=days,
        skip=skip,
        limit=limit,
    )
    return logs


@router.get("/stats")
async def get_audit_stats(
    current_user: CurrentUserDep,
    session: SessionDep,
    days: int = Query(default=30, ge=1, le=365),
):
    """Get audit log statistics."""
    service = AuditService(session)
    return service.get_stats(days=days)


# ==================== Export ====================


@router.get("/export")
async def export_audit_logs(
    current_user: CurrentUserDep,
    session: SessionDep,
    format: str = Query(default="csv", regex="^(csv|json)$"),
    user_id: Optional[UUID] = None,
    entity_type: Optional[EntityType] = None,
    action: Optional[AuditAction] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
):
    """Export audit logs as CSV or JSON."""
    import csv
    import io
    import json

    service = AuditService(session)
    logs, _ = service.get_logs(
        user_id=user_id,
        entity_type=entity_type,
        action=action,
        date_from=date_from,
        date_to=date_to,
        skip=0,
        limit=10000,  # Max export
    )

    if format == "json":
        data = [
            {
                "id": str(log.id),
                "user_email": log.user_email,
                "user_name": log.user_name,
                "entity_type": log.entity_type.value,
                "entity_id": str(log.entity_id),
                "entity_name": log.entity_name,
                "action": log.action.value,
                "description": log.description,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ]
        content = json.dumps(data, indent=2)
        media_type = "application/json"
        filename = "audit_logs.json"
    else:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "ID", "User Email", "User Name", "Entity Type", "Entity ID",
            "Entity Name", "Action", "Description", "IP Address", "Created At"
        ])
        for log in logs:
            writer.writerow([
                str(log.id),
                log.user_email,
                log.user_name,
                log.entity_type.value,
                str(log.entity_id),
                log.entity_name,
                log.action.value,
                log.description,
                log.ip_address,
                log.created_at.isoformat(),
            ])
        content = output.getvalue()
        media_type = "text/csv"
        filename = "audit_logs.csv"

    return StreamingResponse(
        iter([content]),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ==================== Data Retention ====================


@router.get("/retention-policies", response_model=list[DataRetentionPolicyRead])
async def list_retention_policies(
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """List all data retention policies."""
    service = AuditService(session)
    return service.get_retention_policies()


@router.post("/retention-policies", response_model=DataRetentionPolicyRead)
async def create_retention_policy(
    data: DataRetentionPolicyCreate,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Create a new data retention policy."""
    # Check if policy exists for this entity type
    statement = select(DataRetentionPolicy).where(
        DataRetentionPolicy.entity_type == data.entity_type
    )
    existing = session.exec(statement).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Policy already exists for this entity type"
        )

    policy = DataRetentionPolicy(**data.model_dump())
    session.add(policy)
    session.commit()
    session.refresh(policy)
    return policy


@router.get("/retention-policies/{policy_id}", response_model=DataRetentionPolicyRead)
async def get_retention_policy(
    policy_id: UUID,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Get a specific data retention policy."""
    policy = session.get(DataRetentionPolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy


@router.patch("/retention-policies/{policy_id}", response_model=DataRetentionPolicyRead)
async def update_retention_policy(
    policy_id: UUID,
    data: DataRetentionPolicyUpdate,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Update a data retention policy."""
    policy = session.get(DataRetentionPolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(policy, key, value)

    session.add(policy)
    session.commit()
    session.refresh(policy)
    return policy


@router.delete("/retention-policies/{policy_id}")
async def delete_retention_policy(
    policy_id: UUID,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Delete a data retention policy."""
    policy = session.get(DataRetentionPolicy, policy_id)
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    session.delete(policy)
    session.commit()
    return {"status": "success", "message": "Policy deleted"}


@router.post("/cleanup")
async def cleanup_old_logs(
    current_user: CurrentUserDep,
    session: SessionDep,
    days: int = Query(default=730, ge=30),
):
    """Manually trigger cleanup of old audit logs."""
    service = AuditService(session)
    count = service.cleanup_old_logs(days=days)
    return {"status": "success", "deleted_count": count}


# ==================== GDPR ====================


@router.get("/gdpr/requests", response_model=list[GDPRExportRequestRead])
async def list_gdpr_requests(
    current_user: CurrentUserDep,
    session: SessionDep,
    user_id: Optional[UUID] = None,
    status: Optional[str] = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
):
    """List GDPR export requests."""
    service = AuditService(session)
    requests = service.get_gdpr_export_requests(
        user_id=user_id,
        status=status,
        skip=skip,
        limit=limit,
    )
    return requests


@router.post("/gdpr/requests", response_model=GDPRExportRequestRead)
async def create_gdpr_request(
    data: GDPRExportRequestCreate,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Create a GDPR data export request."""
    service = AuditService(session)

    # Log this action
    from app.models.audit_log import EntityType, AuditAction
    service.log_action(
        user=current_user,
        entity_type=EntityType.USER,
        entity_id=data.user_id,
        action=AuditAction.EXPORT,
        description=f"GDPR data export requested for user {data.user_id}",
    )

    request = service.create_gdpr_export_request(
        user_id=data.user_id,
        requested_by=current_user.id,
        include_contacts=data.include_contacts,
        include_companies=data.include_companies,
        include_deals=data.include_deals,
        include_activities=data.include_activities,
        include_emails=data.include_emails,
        include_audit_logs=data.include_audit_logs,
    )
    return request


@router.get("/gdpr/requests/{request_id}", response_model=GDPRExportRequestRead)
async def get_gdpr_request(
    request_id: UUID,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Get a specific GDPR export request."""
    request = session.get(GDPRExportRequest, request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    return request


@router.get("/gdpr/requests/{request_id}/download")
async def download_gdpr_export(
    request_id: UUID,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Download a completed GDPR export."""
    request = session.get(GDPRExportRequest, request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")

    if request.status != "completed":
        raise HTTPException(status_code=400, detail="Export not yet completed")

    if request.expires_at and request.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Export has expired")

    if not request.file_path:
        raise HTTPException(status_code=404, detail="Export file not found")

    # Update download count
    request.download_count += 1
    session.add(request)
    session.commit()

    # Return file
    import os
    if not os.path.exists(request.file_path):
        raise HTTPException(status_code=404, detail="Export file not found")

    def file_iterator():
        with open(request.file_path, "rb") as f:
            while chunk := f.read(8192):
                yield chunk

    return StreamingResponse(
        file_iterator(),
        media_type="application/zip",
        headers={
            "Content-Disposition": f"attachment; filename=gdpr_export_{request_id}.zip"
        },
    )


# ==================== Actions / Events Lookup ====================


@router.get("/actions")
async def list_actions():
    """List all available audit actions."""
    return [{"value": a.value, "label": a.value.replace("_", " ").title()} for a in AuditAction]


@router.get("/entity-types")
async def list_entity_types():
    """List all available entity types."""
    return [{"value": e.value, "label": e.value.replace("_", " ").title()} for e in EntityType]
