"""API endpoints for advanced reporting and exports."""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID
import csv
import io
import json

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlmodel import func, select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.reporting import (
    Report,
    ReportCreate,
    ReportRead,
    ScheduledReport,
    ScheduledReportCreate,
    ScheduledReportRead,
    ScheduledReportUpdate,
    ReportTemplate,
    ReportTemplateCreate,
    ReportTemplateRead,
    ReportType,
    ReportFormat,
    ReportStatus,
    ReportFrequency,
)

router = APIRouter()


# ==================== Reports ====================

@router.get("/")
async def list_reports(
    session: SessionDep,
    current_user: CurrentUserDep,
    report_type: Optional[ReportType] = None,
    status: Optional[ReportStatus] = None,
    limit: int = Query(50, ge=1, le=100),
) -> list[ReportRead]:
    """List all generated reports."""
    user_id = UUID(current_user.sub)

    query = select(Report).where(Report.owner_id == user_id)

    if report_type:
        query = query.where(Report.report_type == report_type)

    if status:
        query = query.where(Report.status == status)

    query = query.order_by(Report.created_at.desc()).limit(limit)
    reports = session.exec(query).all()

    return [ReportRead.model_validate(r) for r in reports]


@router.post("/")
async def create_report(
    session: SessionDep,
    current_user: CurrentUserDep,
    report: ReportCreate,
) -> ReportRead:
    """Request a new report to be generated."""
    user_id = UUID(current_user.sub)

    db_report = Report(
        **report.model_dump(),
        owner_id=user_id,
        status=ReportStatus.PENDING,
        expires_at=datetime.utcnow() + timedelta(days=7),  # Reports expire in 7 days
    )
    session.add(db_report)
    session.commit()
    session.refresh(db_report)

    # In production, this would trigger a background task to generate the report
    # For now, we'll simulate immediate generation
    db_report.status = ReportStatus.GENERATING
    db_report.started_at = datetime.utcnow()
    session.add(db_report)
    session.commit()

    # Simulate completion (in production this would be async)
    db_report.status = ReportStatus.COMPLETED
    db_report.completed_at = datetime.utcnow()
    db_report.file_path = f"reports/{db_report.id}.{report.format.value}"
    db_report.file_size = 1024 * 50  # 50KB placeholder
    session.add(db_report)
    session.commit()
    session.refresh(db_report)

    return ReportRead.model_validate(db_report)


@router.get("/{report_id}")
async def get_report(
    session: SessionDep,
    current_user: CurrentUserDep,
    report_id: UUID,
) -> ReportRead:
    """Get a specific report."""
    user_id = UUID(current_user.sub)

    report = session.exec(
        select(Report).where(
            Report.id == report_id,
            Report.owner_id == user_id,
        )
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    return ReportRead.model_validate(report)


@router.get("/{report_id}/download")
async def download_report(
    session: SessionDep,
    current_user: CurrentUserDep,
    report_id: UUID,
):
    """Download a generated report."""
    user_id = UUID(current_user.sub)

    report = session.exec(
        select(Report).where(
            Report.id == report_id,
            Report.owner_id == user_id,
        )
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.status != ReportStatus.COMPLETED:
        raise HTTPException(status_code=400, detail="Report is not ready for download")

    if report.expires_at and report.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="Report has expired")

    # Update download stats
    report.download_count += 1
    report.last_downloaded_at = datetime.utcnow()
    session.add(report)
    session.commit()

    # Generate sample data based on format
    if report.format == ReportFormat.CSV:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Date", "Platform", "Impressions", "Engagement", "Followers"])
        writer.writerow(["2024-01-01", "Twitter", 10000, 500, 1500])
        writer.writerow(["2024-01-01", "LinkedIn", 5000, 300, 800])
        writer.writerow(["2024-01-02", "Twitter", 12000, 600, 1550])
        output.seek(0)

        return StreamingResponse(
            iter([output.getvalue()]),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={report.name}.csv"
            },
        )

    elif report.format == ReportFormat.JSON:
        data = {
            "report": {
                "name": report.name,
                "type": report.report_type.value,
                "date_range": {
                    "from": report.date_from.isoformat(),
                    "to": report.date_to.isoformat(),
                },
            },
            "data": {
                "summary": {
                    "total_impressions": 27000,
                    "total_engagement": 1400,
                    "total_followers": 2350,
                    "engagement_rate": 5.2,
                },
                "platforms": [
                    {"name": "Twitter", "impressions": 22000, "engagement": 1100},
                    {"name": "LinkedIn", "impressions": 5000, "engagement": 300},
                ],
            },
        }

        return StreamingResponse(
            iter([json.dumps(data, indent=2)]),
            media_type="application/json",
            headers={
                "Content-Disposition": f"attachment; filename={report.name}.json"
            },
        )

    else:
        # For PDF/Excel, return a placeholder response
        # In production, this would return actual file content
        return {
            "message": "PDF/Excel generation requires additional libraries",
            "download_url": f"/api/reporting/{report_id}/file",
        }


@router.delete("/{report_id}")
async def delete_report(
    session: SessionDep,
    current_user: CurrentUserDep,
    report_id: UUID,
) -> dict:
    """Delete a report."""
    user_id = UUID(current_user.sub)

    report = session.exec(
        select(Report).where(
            Report.id == report_id,
            Report.owner_id == user_id,
        )
    ).first()

    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    session.delete(report)
    session.commit()

    return {"success": True, "message": "Report deleted"}


# ==================== Scheduled Reports ====================

@router.get("/scheduled")
async def list_scheduled_reports(
    session: SessionDep,
    current_user: CurrentUserDep,
    active_only: bool = True,
) -> list[ScheduledReportRead]:
    """List all scheduled reports."""
    user_id = UUID(current_user.sub)

    query = select(ScheduledReport).where(ScheduledReport.owner_id == user_id)

    if active_only:
        query = query.where(ScheduledReport.is_active == True)

    query = query.order_by(ScheduledReport.next_run_at.asc())
    reports = session.exec(query).all()

    return [ScheduledReportRead.model_validate(r) for r in reports]


@router.post("/scheduled")
async def create_scheduled_report(
    session: SessionDep,
    current_user: CurrentUserDep,
    scheduled: ScheduledReportCreate,
) -> ScheduledReportRead:
    """Create a scheduled recurring report."""
    user_id = UUID(current_user.sub)

    # Calculate next run time
    now = datetime.utcnow()
    if scheduled.frequency == ReportFrequency.DAILY:
        next_run = now + timedelta(days=1)
    elif scheduled.frequency == ReportFrequency.WEEKLY:
        next_run = now + timedelta(weeks=1)
    elif scheduled.frequency == ReportFrequency.BIWEEKLY:
        next_run = now + timedelta(weeks=2)
    elif scheduled.frequency == ReportFrequency.MONTHLY:
        next_run = now + timedelta(days=30)
    else:  # QUARTERLY
        next_run = now + timedelta(days=90)

    db_scheduled = ScheduledReport(
        **scheduled.model_dump(),
        owner_id=user_id,
        next_run_at=next_run,
    )
    session.add(db_scheduled)
    session.commit()
    session.refresh(db_scheduled)

    return ScheduledReportRead.model_validate(db_scheduled)


@router.patch("/scheduled/{scheduled_id}")
async def update_scheduled_report(
    session: SessionDep,
    current_user: CurrentUserDep,
    scheduled_id: UUID,
    update: ScheduledReportUpdate,
) -> ScheduledReportRead:
    """Update a scheduled report."""
    user_id = UUID(current_user.sub)

    scheduled = session.exec(
        select(ScheduledReport).where(
            ScheduledReport.id == scheduled_id,
            ScheduledReport.owner_id == user_id,
        )
    ).first()

    if not scheduled:
        raise HTTPException(status_code=404, detail="Scheduled report not found")

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(scheduled, key, value)

    scheduled.updated_at = datetime.utcnow()
    session.add(scheduled)
    session.commit()
    session.refresh(scheduled)

    return ScheduledReportRead.model_validate(scheduled)


@router.delete("/scheduled/{scheduled_id}")
async def delete_scheduled_report(
    session: SessionDep,
    current_user: CurrentUserDep,
    scheduled_id: UUID,
) -> dict:
    """Delete a scheduled report."""
    user_id = UUID(current_user.sub)

    scheduled = session.exec(
        select(ScheduledReport).where(
            ScheduledReport.id == scheduled_id,
            ScheduledReport.owner_id == user_id,
        )
    ).first()

    if not scheduled:
        raise HTTPException(status_code=404, detail="Scheduled report not found")

    session.delete(scheduled)
    session.commit()

    return {"success": True, "message": "Scheduled report deleted"}


@router.post("/scheduled/{scheduled_id}/run")
async def run_scheduled_report_now(
    session: SessionDep,
    current_user: CurrentUserDep,
    scheduled_id: UUID,
) -> ReportRead:
    """Run a scheduled report immediately."""
    user_id = UUID(current_user.sub)

    scheduled = session.exec(
        select(ScheduledReport).where(
            ScheduledReport.id == scheduled_id,
            ScheduledReport.owner_id == user_id,
        )
    ).first()

    if not scheduled:
        raise HTTPException(status_code=404, detail="Scheduled report not found")

    # Create a new report based on the schedule
    now = datetime.utcnow()
    days = 30  # Default

    if scheduled.frequency == ReportFrequency.DAILY:
        days = 1
    elif scheduled.frequency == ReportFrequency.WEEKLY:
        days = 7
    elif scheduled.frequency == ReportFrequency.BIWEEKLY:
        days = 14
    elif scheduled.frequency == ReportFrequency.MONTHLY:
        days = 30
    elif scheduled.frequency == ReportFrequency.QUARTERLY:
        days = 90

    report = Report(
        name=f"{scheduled.name} - {now.strftime('%Y-%m-%d')}",
        report_type=scheduled.report_type,
        format=scheduled.format,
        date_from=now - timedelta(days=days),
        date_to=now,
        platforms=scheduled.platforms,
        account_ids=scheduled.account_ids,
        include_charts=scheduled.include_charts,
        compare_previous_period=scheduled.compare_previous_period,
        owner_id=user_id,
        status=ReportStatus.COMPLETED,
        started_at=now,
        completed_at=now,
        expires_at=now + timedelta(days=7),
    )
    session.add(report)

    # Update scheduled report
    scheduled.last_run_at = now
    scheduled.last_report_id = report.id
    scheduled.run_count += 1
    session.add(scheduled)

    session.commit()
    session.refresh(report)

    return ReportRead.model_validate(report)


# ==================== Templates ====================

@router.get("/templates")
async def list_templates(
    session: SessionDep,
    current_user: CurrentUserDep,
    report_type: Optional[ReportType] = None,
) -> list[ReportTemplateRead]:
    """List all report templates (user + system)."""
    user_id = UUID(current_user.sub)

    query = select(ReportTemplate).where(
        (ReportTemplate.owner_id == user_id) | (ReportTemplate.is_system == True)
    )

    if report_type:
        query = query.where(ReportTemplate.report_type == report_type)

    query = query.order_by(ReportTemplate.times_used.desc())
    templates = session.exec(query).all()

    return [ReportTemplateRead.model_validate(t) for t in templates]


@router.post("/templates")
async def create_template(
    session: SessionDep,
    current_user: CurrentUserDep,
    template: ReportTemplateCreate,
) -> ReportTemplateRead:
    """Create a custom report template."""
    user_id = UUID(current_user.sub)

    db_template = ReportTemplate(
        **template.model_dump(),
        owner_id=user_id,
        is_system=False,
    )
    session.add(db_template)
    session.commit()
    session.refresh(db_template)

    return ReportTemplateRead.model_validate(db_template)


@router.post("/templates/{template_id}/generate")
async def generate_from_template(
    session: SessionDep,
    current_user: CurrentUserDep,
    template_id: UUID,
    days: Optional[int] = None,
) -> ReportRead:
    """Generate a report from a template."""
    user_id = UUID(current_user.sub)

    template = session.exec(
        select(ReportTemplate).where(
            ReportTemplate.id == template_id,
            (ReportTemplate.owner_id == user_id) | (ReportTemplate.is_system == True),
        )
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Update template usage
    template.times_used += 1
    template.last_used_at = datetime.utcnow()
    session.add(template)

    # Create report
    now = datetime.utcnow()
    report_days = days or template.default_days

    report = Report(
        name=f"{template.name} - {now.strftime('%Y-%m-%d')}",
        report_type=template.report_type,
        format=template.format,
        date_from=now - timedelta(days=report_days),
        date_to=now,
        platforms=template.platforms,
        include_charts=template.include_charts,
        compare_previous_period=template.compare_previous_period,
        owner_id=user_id,
        status=ReportStatus.COMPLETED,
        started_at=now,
        completed_at=now,
        expires_at=now + timedelta(days=7),
    )
    session.add(report)
    session.commit()
    session.refresh(report)

    return ReportRead.model_validate(report)


@router.delete("/templates/{template_id}")
async def delete_template(
    session: SessionDep,
    current_user: CurrentUserDep,
    template_id: UUID,
) -> dict:
    """Delete a custom template."""
    user_id = UUID(current_user.sub)

    template = session.exec(
        select(ReportTemplate).where(
            ReportTemplate.id == template_id,
            ReportTemplate.owner_id == user_id,
            ReportTemplate.is_system == False,
        )
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found or is a system template")

    session.delete(template)
    session.commit()

    return {"success": True, "message": "Template deleted"}


# ==================== Statistics ====================

@router.get("/stats")
async def get_reporting_stats(
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Get reporting statistics."""
    user_id = UUID(current_user.sub)

    # Total reports
    total_reports = session.exec(
        select(func.count()).where(Report.owner_id == user_id)
    ).one()

    # Completed reports
    completed_reports = session.exec(
        select(func.count()).where(
            Report.owner_id == user_id,
            Report.status == ReportStatus.COMPLETED,
        )
    ).one()

    # Active schedules
    active_schedules = session.exec(
        select(func.count()).where(
            ScheduledReport.owner_id == user_id,
            ScheduledReport.is_active == True,
        )
    ).one()

    # Total downloads
    total_downloads = session.exec(
        select(func.sum(Report.download_count)).where(Report.owner_id == user_id)
    ).one() or 0

    # Reports by type
    type_counts = {}
    for report_type in ReportType:
        count = session.exec(
            select(func.count()).where(
                Report.owner_id == user_id,
                Report.report_type == report_type,
            )
        ).one()
        if count > 0:
            type_counts[report_type.value] = count

    # Recent reports
    recent_reports = session.exec(
        select(Report)
        .where(Report.owner_id == user_id)
        .order_by(Report.created_at.desc())
        .limit(5)
    ).all()

    return {
        "total_reports": total_reports,
        "completed_reports": completed_reports,
        "active_schedules": active_schedules,
        "total_downloads": total_downloads,
        "type_breakdown": type_counts,
        "recent_reports": [
            {
                "id": str(r.id),
                "name": r.name,
                "type": r.report_type.value,
                "format": r.format.value,
                "status": r.status.value,
                "created_at": r.created_at.isoformat(),
            }
            for r in recent_reports
        ],
    }
