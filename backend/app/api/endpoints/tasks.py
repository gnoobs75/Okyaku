from datetime import date, datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.company import Company
from app.models.contact import Contact
from app.models.deal import Deal
from app.models.task import (
    Task,
    TaskCreate,
    TaskPriority,
    TaskRead,
    TaskReadWithRelations,
    TaskStatus,
    TaskUpdate,
)
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[TaskReadWithRelations])
async def list_tasks(
    session: SessionDep,
    current_user: CurrentUserDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    task_status: Optional[TaskStatus] = Query(default=None),
    priority: Optional[TaskPriority] = Query(default=None),
    assignee_id: Optional[UUID] = Query(default=None),
    contact_id: Optional[UUID] = Query(default=None),
    company_id: Optional[UUID] = Query(default=None),
    deal_id: Optional[UUID] = Query(default=None),
    due_date_from: Optional[date] = Query(default=None),
    due_date_to: Optional[date] = Query(default=None),
    overdue_only: bool = Query(default=False),
    sort_by: str = Query(default="due_date"),
    sort_order: str = Query(default="asc", pattern="^(asc|desc)$"),
) -> PaginatedResponse[TaskReadWithRelations]:
    """List tasks with pagination, filtering, and search."""
    query = select(Task)

    # Apply search filter
    if search:
        query = query.where(
            or_(
                Task.title.ilike(f"%{search}%"),
                Task.description.ilike(f"%{search}%"),
            )
        )

    # Apply filters
    if task_status:
        query = query.where(Task.status == task_status)
    if priority:
        query = query.where(Task.priority == priority)
    if assignee_id:
        query = query.where(Task.assignee_id == assignee_id)
    if contact_id:
        query = query.where(Task.contact_id == contact_id)
    if company_id:
        query = query.where(Task.company_id == company_id)
    if deal_id:
        query = query.where(Task.deal_id == deal_id)
    if due_date_from:
        query = query.where(Task.due_date >= due_date_from)
    if due_date_to:
        query = query.where(Task.due_date <= due_date_to)
    if overdue_only:
        query = query.where(
            Task.due_date < date.today(),
            Task.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
        )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Apply sorting
    sort_column = getattr(Task, sort_by, Task.due_date)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    tasks = session.exec(query).all()

    # Build response with related names
    items = []
    for task in tasks:
        task_data = TaskReadWithRelations.model_validate(task)

        if task.contact_id:
            contact = session.get(Contact, task.contact_id)
            if contact:
                task_data.contact_name = f"{contact.first_name} {contact.last_name}"
        if task.company_id:
            company = session.get(Company, task.company_id)
            if company:
                task_data.company_name = company.name
        if task.deal_id:
            deal = session.get(Deal, task.deal_id)
            if deal:
                task_data.deal_name = deal.name

        items.append(task_data)

    return PaginatedResponse.create(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/my-tasks", response_model=list[TaskReadWithRelations])
async def get_my_tasks(
    session: SessionDep,
    current_user: CurrentUserDep,
    include_completed: bool = Query(default=False),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[TaskReadWithRelations]:
    """Get tasks assigned to the current user."""
    query = select(Task).where(Task.assignee_id == UUID(current_user.sub))

    if not include_completed:
        query = query.where(
            Task.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS])
        )

    query = query.order_by(Task.due_date.asc()).limit(limit)
    tasks = session.exec(query).all()

    items = []
    for task in tasks:
        task_data = TaskReadWithRelations.model_validate(task)
        items.append(task_data)

    return items


@router.get("/upcoming-reminders")
async def get_upcoming_reminders(
    session: SessionDep,
    current_user: CurrentUserDep,
    hours: int = Query(default=24, ge=1, le=168),
) -> list[TaskReadWithRelations]:
    """Get tasks with reminders in the next N hours."""
    now = datetime.utcnow()
    reminder_window = datetime.utcnow().replace(
        hour=now.hour + hours if now.hour + hours < 24 else (now.hour + hours) % 24
    )

    query = (
        select(Task)
        .where(
            Task.assignee_id == UUID(current_user.sub),
            Task.reminder_date.isnot(None),
            Task.reminder_date >= now,
            Task.reminder_date <= reminder_window,
            Task.status.in_([TaskStatus.PENDING, TaskStatus.IN_PROGRESS]),
        )
        .order_by(Task.reminder_date.asc())
    )

    tasks = session.exec(query).all()

    items = []
    for task in tasks:
        task_data = TaskReadWithRelations.model_validate(task)
        items.append(task_data)

    return items


@router.get("/{task_id}", response_model=TaskReadWithRelations)
async def get_task(
    task_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> TaskReadWithRelations:
    """Get a task by ID."""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    task_data = TaskReadWithRelations.model_validate(task)

    if task.contact_id:
        contact = session.get(Contact, task.contact_id)
        if contact:
            task_data.contact_name = f"{contact.first_name} {contact.last_name}"
    if task.company_id:
        company = session.get(Company, task.company_id)
        if company:
            task_data.company_name = company.name
    if task.deal_id:
        deal = session.get(Deal, task.deal_id)
        if deal:
            task_data.deal_name = deal.name

    return task_data


@router.post("", status_code=status.HTTP_201_CREATED, response_model=TaskRead)
async def create_task(
    data: TaskCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Task:
    """Create a new task."""
    task = Task(
        **data.model_dump(),
        created_by=UUID(current_user.sub),
    )

    # If no assignee specified, assign to creator
    if not task.assignee_id:
        task.assignee_id = UUID(current_user.sub)

    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.put("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: UUID,
    data: TaskUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Task:
    """Update a task."""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    # Handle status changes
    if data.status == TaskStatus.COMPLETED and task.status != TaskStatus.COMPLETED:
        task.completed_at = datetime.utcnow()
    elif data.status and data.status != TaskStatus.COMPLETED:
        task.completed_at = None

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(task, key, value)

    task.updated_by = UUID(current_user.sub)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.post("/{task_id}/complete", response_model=TaskRead)
async def complete_task(
    task_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Task:
    """Mark a task as completed."""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    task.status = TaskStatus.COMPLETED
    task.completed_at = datetime.utcnow()
    task.updated_by = UUID(current_user.sub)
    session.add(task)
    session.commit()
    session.refresh(task)
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    """Delete a task."""
    task = session.get(Task, task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found",
        )

    session.delete(task)
    session.commit()
