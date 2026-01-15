from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Query
from sqlmodel import func, select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.activity import Activity
from app.models.company import Company
from app.models.contact import Contact, ContactStatus
from app.models.deal import Deal
from app.models.pipeline import Pipeline, PipelineStage
from app.models.task import Task, TaskStatus

router = APIRouter()


@router.get("/metrics")
async def get_dashboard_metrics(
    session: SessionDep,
    current_user: CurrentUserDep,
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
) -> dict:
    """Get key performance indicators for the dashboard."""
    # Default to last 30 days if no date range specified
    if not date_to:
        date_to = date.today()
    if not date_from:
        date_from = date_to - timedelta(days=30)

    # Total counts
    total_contacts = session.exec(select(func.count(Contact.id))).first() or 0
    total_companies = session.exec(select(func.count(Company.id))).first() or 0
    total_deals = session.exec(select(func.count(Deal.id))).first() or 0

    # Pipeline value (sum of all open deals)
    pipeline_value = (
        session.exec(
            select(func.coalesce(func.sum(Deal.value), 0)).where(
                Deal.actual_close_date.is_(None)
            )
        ).first()
        or 0
    )

    # Contacts by status
    contacts_by_status = {}
    for status in ContactStatus:
        count = session.exec(
            select(func.count(Contact.id)).where(Contact.status == status)
        ).first()
        contacts_by_status[status.value] = count or 0

    # New contacts this period
    new_contacts = session.exec(
        select(func.count(Contact.id)).where(
            Contact.created_at >= datetime.combine(date_from, datetime.min.time()),
            Contact.created_at <= datetime.combine(date_to, datetime.max.time()),
        )
    ).first() or 0

    # Closed deals this period (won)
    closed_deals_query = select(func.count(Deal.id), func.coalesce(func.sum(Deal.value), 0)).where(
        Deal.actual_close_date >= date_from,
        Deal.actual_close_date <= date_to,
    )
    result = session.exec(closed_deals_query).first()
    closed_deals_count = result[0] if result else 0
    closed_deals_value = result[1] if result else 0

    # Open tasks
    open_tasks = session.exec(
        select(func.count(Task.id)).where(Task.status != TaskStatus.COMPLETED)
    ).first() or 0

    # Overdue tasks
    overdue_tasks = session.exec(
        select(func.count(Task.id)).where(
            Task.status != TaskStatus.COMPLETED,
            Task.due_date < date.today(),
        )
    ).first() or 0

    # Activities this period
    activities_count = session.exec(
        select(func.count(Activity.id)).where(
            Activity.activity_date >= datetime.combine(date_from, datetime.min.time()),
            Activity.activity_date <= datetime.combine(date_to, datetime.max.time()),
        )
    ).first() or 0

    # Conversion rate (contacts who became customers / total contacts)
    customers = contacts_by_status.get("customer", 0)
    conversion_rate = (customers / total_contacts * 100) if total_contacts > 0 else 0

    return {
        "date_range": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "totals": {
            "contacts": total_contacts,
            "companies": total_companies,
            "deals": total_deals,
            "pipeline_value": float(pipeline_value),
        },
        "contacts_by_status": contacts_by_status,
        "period_metrics": {
            "new_contacts": new_contacts,
            "closed_deals_count": closed_deals_count,
            "closed_deals_value": float(closed_deals_value),
            "activities_count": activities_count,
        },
        "tasks": {
            "open": open_tasks,
            "overdue": overdue_tasks,
        },
        "conversion_rate": round(conversion_rate, 2),
    }


@router.get("/pipeline-funnel")
async def get_pipeline_funnel(
    session: SessionDep,
    current_user: CurrentUserDep,
    pipeline_id: Optional[str] = Query(default=None),
) -> dict:
    """Get pipeline funnel data showing deals by stage."""
    # Get the default pipeline if not specified
    if pipeline_id:
        pipeline = session.get(Pipeline, pipeline_id)
    else:
        pipeline = session.exec(
            select(Pipeline).where(Pipeline.is_default == True)
        ).first()
        if not pipeline:
            pipeline = session.exec(select(Pipeline)).first()

    if not pipeline:
        return {"pipeline": None, "stages": []}

    # Get stages ordered
    stages = sorted(pipeline.stages, key=lambda s: s.order)

    funnel_data = []
    for stage in stages:
        deal_count = session.exec(
            select(func.count(Deal.id)).where(Deal.stage_id == stage.id)
        ).first() or 0

        deal_value = session.exec(
            select(func.coalesce(func.sum(Deal.value), 0)).where(Deal.stage_id == stage.id)
        ).first() or 0

        funnel_data.append({
            "stage_id": str(stage.id),
            "stage_name": stage.name,
            "deal_count": deal_count,
            "deal_value": float(deal_value),
            "probability": stage.probability,
            "weighted_value": float(deal_value * stage.probability / 100),
        })

    return {
        "pipeline": {
            "id": str(pipeline.id),
            "name": pipeline.name,
        },
        "stages": funnel_data,
        "total_value": sum(s["deal_value"] for s in funnel_data),
        "weighted_total": sum(s["weighted_value"] for s in funnel_data),
    }


@router.get("/forecast")
async def get_deal_forecast(
    session: SessionDep,
    current_user: CurrentUserDep,
    months: int = Query(default=6, ge=1, le=12),
) -> dict:
    """Get monthly deal forecast based on expected close dates."""
    today = date.today()
    forecast_data = []

    for i in range(months):
        # Calculate month start and end
        month_start = date(today.year, today.month, 1) + timedelta(days=i * 30)
        if month_start.month == 12:
            month_end = date(month_start.year + 1, 1, 1) - timedelta(days=1)
        else:
            month_end = date(month_start.year, month_start.month + 1, 1) - timedelta(days=1)

        # Normalize to actual month boundaries
        month_start = date(month_start.year, month_start.month, 1)

        # Get deals expected to close this month
        result = session.exec(
            select(func.count(Deal.id), func.coalesce(func.sum(Deal.value), 0)).where(
                Deal.expected_close_date >= month_start,
                Deal.expected_close_date <= month_end,
                Deal.actual_close_date.is_(None),  # Not yet closed
            )
        ).first()

        deal_count = result[0] if result else 0
        deal_value = result[1] if result else 0

        # Get actually closed deals for past months
        closed_result = session.exec(
            select(func.count(Deal.id), func.coalesce(func.sum(Deal.value), 0)).where(
                Deal.actual_close_date >= month_start,
                Deal.actual_close_date <= month_end,
            )
        ).first()

        closed_count = closed_result[0] if closed_result else 0
        closed_value = closed_result[1] if closed_result else 0

        forecast_data.append({
            "month": month_start.strftime("%Y-%m"),
            "month_label": month_start.strftime("%b %Y"),
            "expected_count": deal_count,
            "expected_value": float(deal_value),
            "closed_count": closed_count,
            "closed_value": float(closed_value),
        })

    return {"forecast": forecast_data}


@router.get("/activity-leaderboard")
async def get_activity_leaderboard(
    session: SessionDep,
    current_user: CurrentUserDep,
    date_from: Optional[date] = Query(default=None),
    date_to: Optional[date] = Query(default=None),
    limit: int = Query(default=10, ge=1, le=50),
) -> dict:
    """Get activity leaderboard showing top performers."""
    # Default to last 30 days
    if not date_to:
        date_to = date.today()
    if not date_from:
        date_from = date_to - timedelta(days=30)

    # Count activities by created_by user
    from app.models.user import User

    leaderboard_query = (
        select(
            Activity.created_by,
            func.count(Activity.id).label("activity_count"),
        )
        .where(
            Activity.activity_date >= datetime.combine(date_from, datetime.min.time()),
            Activity.activity_date <= datetime.combine(date_to, datetime.max.time()),
        )
        .group_by(Activity.created_by)
        .order_by(func.count(Activity.id).desc())
        .limit(limit)
    )

    results = session.exec(leaderboard_query).all()

    leaderboard = []
    for user_id, count in results:
        user = session.get(User, user_id)
        leaderboard.append({
            "user_id": str(user_id),
            "user_name": user.display_name if user else "Unknown User",
            "activity_count": count,
        })

    return {
        "date_range": {"from": date_from.isoformat(), "to": date_to.isoformat()},
        "leaderboard": leaderboard,
    }


@router.get("/recent-activities")
async def get_recent_activities(
    session: SessionDep,
    current_user: CurrentUserDep,
    limit: int = Query(default=10, ge=1, le=50),
) -> dict:
    """Get recent activities for the dashboard feed."""
    activities = session.exec(
        select(Activity)
        .order_by(Activity.activity_date.desc())
        .limit(limit)
    ).all()

    return {
        "activities": [
            {
                "id": str(a.id),
                "type": a.type.value if hasattr(a.type, 'value') else a.type,
                "subject": a.subject,
                "activity_date": a.activity_date.isoformat(),
                "contact_id": str(a.contact_id) if a.contact_id else None,
                "deal_id": str(a.deal_id) if a.deal_id else None,
            }
            for a in activities
        ]
    }


@router.get("/upcoming-tasks")
async def get_upcoming_tasks(
    session: SessionDep,
    current_user: CurrentUserDep,
    limit: int = Query(default=10, ge=1, le=50),
) -> dict:
    """Get upcoming tasks for the dashboard."""
    tasks = session.exec(
        select(Task)
        .where(
            Task.status != TaskStatus.COMPLETED,
            Task.due_date >= date.today(),
        )
        .order_by(Task.due_date.asc())
        .limit(limit)
    ).all()

    return {
        "tasks": [
            {
                "id": str(t.id),
                "title": t.title,
                "priority": t.priority.value,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "contact_id": str(t.contact_id) if t.contact_id else None,
                "deal_id": str(t.deal_id) if t.deal_id else None,
            }
            for t in tasks
        ]
    }
