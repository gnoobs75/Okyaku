"""Audit logging service for tracking all entity changes."""

import json
import logging
from datetime import datetime, timedelta
from typing import Any, Optional
from uuid import UUID

from sqlmodel import Session, func, select

from app.models.audit_log import (
    AuditAction,
    AuditLog,
    AuditLogCreate,
    DataRetentionPolicy,
    EntityType,
    GDPRExportRequest,
)
from app.models.user import User

logger = logging.getLogger(__name__)


class AuditService:
    """Service for creating and querying audit logs."""

    def __init__(self, session: Session):
        self.session = session

    def log_action(
        self,
        user: Optional[User],
        entity_type: EntityType,
        entity_id: UUID,
        action: AuditAction,
        entity_name: Optional[str] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        description: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        request_id: Optional[str] = None,
        extra_data: Optional[dict] = None,
    ) -> AuditLog:
        """Create an audit log entry."""
        # Calculate changed fields
        changed_fields = None
        if old_values and new_values:
            changed_fields = [
                key for key in new_values
                if key in old_values and old_values[key] != new_values[key]
            ]
            # Also include new keys
            changed_fields.extend(
                key for key in new_values if key not in old_values
            )

        log_entry = AuditLog(
            user_id=user.id if user else None,
            user_email=user.email if user else None,
            user_name=user.username if user else None,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_name=entity_name,
            action=action,
            old_values=self._sanitize_values(old_values),
            new_values=self._sanitize_values(new_values),
            changed_fields=changed_fields,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            request_id=request_id,
            extra_data=extra_data or {},
        )

        self.session.add(log_entry)
        self.session.commit()
        self.session.refresh(log_entry)
        return log_entry

    def _sanitize_values(self, values: Optional[dict]) -> Optional[dict]:
        """Remove sensitive fields from values before logging."""
        if not values:
            return None

        sensitive_fields = {
            "password", "password_hash", "access_token", "refresh_token",
            "api_key", "secret", "token", "credential",
        }

        sanitized = {}
        for key, value in values.items():
            if key.lower() in sensitive_fields:
                sanitized[key] = "[REDACTED]"
            elif isinstance(value, (datetime,)):
                sanitized[key] = value.isoformat()
            elif isinstance(value, UUID):
                sanitized[key] = str(value)
            else:
                try:
                    json.dumps(value)  # Check if serializable
                    sanitized[key] = value
                except (TypeError, ValueError):
                    sanitized[key] = str(value)

        return sanitized

    def log_create(
        self,
        user: Optional[User],
        entity_type: EntityType,
        entity_id: UUID,
        entity_name: Optional[str] = None,
        new_values: Optional[dict] = None,
        **kwargs,
    ) -> AuditLog:
        """Log a create action."""
        return self.log_action(
            user=user,
            entity_type=entity_type,
            entity_id=entity_id,
            action=AuditAction.CREATE,
            entity_name=entity_name,
            new_values=new_values,
            description=f"Created {entity_type.value}: {entity_name or entity_id}",
            **kwargs,
        )

    def log_update(
        self,
        user: Optional[User],
        entity_type: EntityType,
        entity_id: UUID,
        entity_name: Optional[str] = None,
        old_values: Optional[dict] = None,
        new_values: Optional[dict] = None,
        **kwargs,
    ) -> AuditLog:
        """Log an update action."""
        return self.log_action(
            user=user,
            entity_type=entity_type,
            entity_id=entity_id,
            action=AuditAction.UPDATE,
            entity_name=entity_name,
            old_values=old_values,
            new_values=new_values,
            description=f"Updated {entity_type.value}: {entity_name or entity_id}",
            **kwargs,
        )

    def log_delete(
        self,
        user: Optional[User],
        entity_type: EntityType,
        entity_id: UUID,
        entity_name: Optional[str] = None,
        old_values: Optional[dict] = None,
        **kwargs,
    ) -> AuditLog:
        """Log a delete action."""
        return self.log_action(
            user=user,
            entity_type=entity_type,
            entity_id=entity_id,
            action=AuditAction.DELETE,
            entity_name=entity_name,
            old_values=old_values,
            description=f"Deleted {entity_type.value}: {entity_name or entity_id}",
            **kwargs,
        )

    def log_view(
        self,
        user: Optional[User],
        entity_type: EntityType,
        entity_id: UUID,
        entity_name: Optional[str] = None,
        **kwargs,
    ) -> AuditLog:
        """Log a view action (for sensitive data access)."""
        return self.log_action(
            user=user,
            entity_type=entity_type,
            entity_id=entity_id,
            action=AuditAction.VIEW,
            entity_name=entity_name,
            description=f"Viewed {entity_type.value}: {entity_name or entity_id}",
            **kwargs,
        )

    def log_export(
        self,
        user: Optional[User],
        entity_type: EntityType,
        record_count: int,
        format: str,
        **kwargs,
    ) -> AuditLog:
        """Log an export action."""
        # Use a placeholder UUID for bulk exports
        from uuid import uuid4
        return self.log_action(
            user=user,
            entity_type=entity_type,
            entity_id=uuid4(),
            action=AuditAction.EXPORT,
            description=f"Exported {record_count} {entity_type.value} records as {format}",
            extra_data={"record_count": record_count, "format": format},
            **kwargs,
        )

    def log_login(
        self,
        user: User,
        success: bool = True,
        **kwargs,
    ) -> AuditLog:
        """Log a login action."""
        action = AuditAction.LOGIN
        description = f"User logged in: {user.email}"
        if not success:
            description = f"Failed login attempt for: {user.email}"

        return self.log_action(
            user=user,
            entity_type=EntityType.USER,
            entity_id=user.id,
            action=action,
            entity_name=user.username,
            description=description,
            extra_data={"success": success},
            **kwargs,
        )

    def log_logout(self, user: User, **kwargs) -> AuditLog:
        """Log a logout action."""
        return self.log_action(
            user=user,
            entity_type=EntityType.USER,
            entity_id=user.id,
            action=AuditAction.LOGOUT,
            entity_name=user.username,
            description=f"User logged out: {user.email}",
            **kwargs,
        )

    # ==================== Query Methods ====================

    def get_logs(
        self,
        user_id: Optional[UUID] = None,
        entity_type: Optional[EntityType] = None,
        entity_id: Optional[UUID] = None,
        action: Optional[AuditAction] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[AuditLog], int]:
        """Query audit logs with filters."""
        statement = select(AuditLog)

        if user_id:
            statement = statement.where(AuditLog.user_id == user_id)
        if entity_type:
            statement = statement.where(AuditLog.entity_type == entity_type)
        if entity_id:
            statement = statement.where(AuditLog.entity_id == entity_id)
        if action:
            statement = statement.where(AuditLog.action == action)
        if date_from:
            statement = statement.where(AuditLog.created_at >= date_from)
        if date_to:
            statement = statement.where(AuditLog.created_at <= date_to)
        if search:
            statement = statement.where(
                AuditLog.description.ilike(f"%{search}%") |
                AuditLog.entity_name.ilike(f"%{search}%") |
                AuditLog.user_email.ilike(f"%{search}%")
            )

        # Count total
        count_statement = select(func.count()).select_from(statement.subquery())
        total = self.session.exec(count_statement).one()

        # Get paginated results
        statement = statement.order_by(AuditLog.created_at.desc())
        statement = statement.offset(skip).limit(limit)
        logs = self.session.exec(statement).all()

        return logs, total

    def get_entity_history(
        self,
        entity_type: EntityType,
        entity_id: UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> list[AuditLog]:
        """Get the audit history for a specific entity."""
        statement = select(AuditLog).where(
            AuditLog.entity_type == entity_type,
            AuditLog.entity_id == entity_id,
        ).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)

        return list(self.session.exec(statement).all())

    def get_user_activity(
        self,
        user_id: UUID,
        days: int = 30,
        skip: int = 0,
        limit: int = 50,
    ) -> list[AuditLog]:
        """Get recent activity for a specific user."""
        date_from = datetime.utcnow() - timedelta(days=days)
        statement = select(AuditLog).where(
            AuditLog.user_id == user_id,
            AuditLog.created_at >= date_from,
        ).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)

        return list(self.session.exec(statement).all())

    def get_stats(self, days: int = 30) -> dict:
        """Get audit log statistics."""
        date_from = datetime.utcnow() - timedelta(days=days)

        # Total entries
        total = self.session.exec(
            select(func.count(AuditLog.id)).where(AuditLog.created_at >= date_from)
        ).one()

        # By action
        action_counts = self.session.exec(
            select(AuditLog.action, func.count(AuditLog.id))
            .where(AuditLog.created_at >= date_from)
            .group_by(AuditLog.action)
        ).all()

        # By entity type
        entity_counts = self.session.exec(
            select(AuditLog.entity_type, func.count(AuditLog.id))
            .where(AuditLog.created_at >= date_from)
            .group_by(AuditLog.entity_type)
        ).all()

        # Active users
        active_users = self.session.exec(
            select(func.count(func.distinct(AuditLog.user_id)))
            .where(AuditLog.created_at >= date_from)
            .where(AuditLog.user_id.isnot(None))
        ).one()

        # Recent activity
        recent = self.session.exec(
            select(AuditLog)
            .order_by(AuditLog.created_at.desc())
            .limit(10)
        ).all()

        return {
            "total_entries": total,
            "entries_by_action": {str(a): c for a, c in action_counts},
            "entries_by_entity_type": {str(e): c for e, c in entity_counts},
            "active_users": active_users,
            "recent_activity": [
                {
                    "id": str(log.id),
                    "action": log.action.value,
                    "entity_type": log.entity_type.value,
                    "entity_name": log.entity_name,
                    "user_name": log.user_name,
                    "created_at": log.created_at.isoformat(),
                }
                for log in recent
            ],
        }

    # ==================== GDPR / Data Retention ====================

    def create_gdpr_export_request(
        self,
        user_id: UUID,
        requested_by: UUID,
        include_contacts: bool = True,
        include_companies: bool = True,
        include_deals: bool = True,
        include_activities: bool = True,
        include_emails: bool = True,
        include_audit_logs: bool = True,
    ) -> GDPRExportRequest:
        """Create a GDPR data export request."""
        request = GDPRExportRequest(
            user_id=user_id,
            requested_by=requested_by,
            include_contacts=include_contacts,
            include_companies=include_companies,
            include_deals=include_deals,
            include_activities=include_activities,
            include_emails=include_emails,
            include_audit_logs=include_audit_logs,
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        self.session.add(request)
        self.session.commit()
        self.session.refresh(request)
        return request

    def get_gdpr_export_requests(
        self,
        user_id: Optional[UUID] = None,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[GDPRExportRequest]:
        """Get GDPR export requests."""
        statement = select(GDPRExportRequest)

        if user_id:
            statement = statement.where(GDPRExportRequest.user_id == user_id)
        if status:
            statement = statement.where(GDPRExportRequest.status == status)

        statement = statement.order_by(GDPRExportRequest.requested_at.desc())
        statement = statement.offset(skip).limit(limit)

        return list(self.session.exec(statement).all())

    def cleanup_old_logs(self, days: int = 730) -> int:
        """Delete audit logs older than specified days."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        statement = select(AuditLog).where(AuditLog.created_at < cutoff)
        old_logs = self.session.exec(statement).all()

        count = len(old_logs)
        for log in old_logs:
            self.session.delete(log)

        self.session.commit()
        return count

    def get_retention_policies(self) -> list[DataRetentionPolicy]:
        """Get all data retention policies."""
        statement = select(DataRetentionPolicy).order_by(DataRetentionPolicy.entity_type)
        return list(self.session.exec(statement).all())

    def update_retention_policy(
        self,
        entity_type: EntityType,
        retention_days: Optional[int] = None,
        archive_after_days: Optional[int] = None,
        auto_cleanup_enabled: Optional[bool] = None,
    ) -> DataRetentionPolicy:
        """Update or create a data retention policy."""
        statement = select(DataRetentionPolicy).where(
            DataRetentionPolicy.entity_type == entity_type
        )
        policy = self.session.exec(statement).first()

        if not policy:
            policy = DataRetentionPolicy(entity_type=entity_type)

        if retention_days is not None:
            policy.retention_days = retention_days
        if archive_after_days is not None:
            policy.archive_after_days = archive_after_days
        if auto_cleanup_enabled is not None:
            policy.auto_cleanup_enabled = auto_cleanup_enabled

        self.session.add(policy)
        self.session.commit()
        self.session.refresh(policy)
        return policy


def get_client_ip(request) -> Optional[str]:
    """Extract client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def get_user_agent(request) -> Optional[str]:
    """Extract user agent from request."""
    return request.headers.get("User-Agent")
