from datetime import date, datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.company import Company
from app.models.contact import Contact
from app.models.deal import (
    Deal,
    DealCreate,
    DealRead,
    DealReadWithRelations,
    DealStageHistory,
    DealUpdate,
)
from app.models.pipeline import Pipeline, PipelineStage
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[DealReadWithRelations])
async def list_deals(
    session: SessionDep,
    current_user: CurrentUserDep,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = Query(default=None),
    pipeline_id: Optional[UUID] = Query(default=None),
    stage_id: Optional[UUID] = Query(default=None),
    owner_id: Optional[UUID] = Query(default=None),
    contact_id: Optional[UUID] = Query(default=None),
    company_id: Optional[UUID] = Query(default=None),
    deal_status: Optional[str] = Query(default=None, description="Filter by 'open' or 'closed'"),
    min_value: Optional[Decimal] = Query(default=None),
    max_value: Optional[Decimal] = Query(default=None),
    close_date_from: Optional[date] = Query(default=None),
    close_date_to: Optional[date] = Query(default=None),
    expected_close_from: Optional[date] = Query(default=None),
    expected_close_to: Optional[date] = Query(default=None),
    sort_by: str = Query(default="created_at"),
    sort_order: str = Query(default="desc", pattern="^(asc|desc)$"),
) -> PaginatedResponse[DealReadWithRelations]:
    """List deals with pagination, filtering, and search."""
    query = select(Deal)

    # Apply search filter
    if search:
        query = query.where(Deal.name.ilike(f"%{search}%"))

    # Apply filters
    if pipeline_id:
        query = query.where(Deal.pipeline_id == pipeline_id)
    if stage_id:
        query = query.where(Deal.stage_id == stage_id)
    if owner_id:
        query = query.where(Deal.owner_id == owner_id)
    if contact_id:
        query = query.where(Deal.contact_id == contact_id)
    if company_id:
        query = query.where(Deal.company_id == company_id)
    if deal_status == "open":
        query = query.where(Deal.actual_close_date.is_(None))
    elif deal_status == "closed":
        query = query.where(Deal.actual_close_date.isnot(None))
    if min_value is not None:
        query = query.where(Deal.value >= min_value)
    if max_value is not None:
        query = query.where(Deal.value <= max_value)
    if close_date_from:
        query = query.where(Deal.actual_close_date >= close_date_from)
    if close_date_to:
        query = query.where(Deal.actual_close_date <= close_date_to)
    if expected_close_from:
        query = query.where(Deal.expected_close_date >= expected_close_from)
    if expected_close_to:
        query = query.where(Deal.expected_close_date <= expected_close_to)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = session.exec(count_query).one()

    # Apply sorting
    sort_column = getattr(Deal, sort_by, Deal.created_at)
    if sort_order == "desc":
        query = query.order_by(sort_column.desc())
    else:
        query = query.order_by(sort_column.asc())

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    deals = session.exec(query).all()

    # Build response with related names
    items = []
    for deal in deals:
        deal_data = DealReadWithRelations.model_validate(deal)

        # Get stage and pipeline names
        stage = session.get(PipelineStage, deal.stage_id)
        if stage:
            deal_data.stage_name = stage.name
        pipeline = session.get(Pipeline, deal.pipeline_id)
        if pipeline:
            deal_data.pipeline_name = pipeline.name

        # Get contact and company names
        if deal.contact_id:
            contact = session.get(Contact, deal.contact_id)
            if contact:
                deal_data.contact_name = f"{contact.first_name} {contact.last_name}"
        if deal.company_id:
            company = session.get(Company, deal.company_id)
            if company:
                deal_data.company_name = company.name

        items.append(deal_data)

    return PaginatedResponse.create(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/forecast")
async def get_deal_forecast(
    session: SessionDep,
    current_user: CurrentUserDep,
    pipeline_id: Optional[UUID] = Query(default=None),
) -> dict:
    """Get deal forecasting data."""
    query = select(Deal, PipelineStage).join(
        PipelineStage, Deal.stage_id == PipelineStage.id
    )

    if pipeline_id:
        query = query.where(Deal.pipeline_id == pipeline_id)

    # Exclude closed-lost deals
    query = query.where(PipelineStage.is_lost == False)

    results = session.exec(query).all()

    total_value = Decimal("0.00")
    weighted_value = Decimal("0.00")
    by_stage = {}

    for deal, stage in results:
        total_value += deal.value
        weighted_value += deal.value * Decimal(stage.probability) / Decimal(100)

        stage_key = str(stage.id)
        if stage_key not in by_stage:
            by_stage[stage_key] = {
                "stage_name": stage.name,
                "deal_count": 0,
                "total_value": Decimal("0.00"),
                "probability": stage.probability,
            }
        by_stage[stage_key]["deal_count"] += 1
        by_stage[stage_key]["total_value"] += deal.value

    return {
        "total_value": float(total_value),
        "weighted_value": float(weighted_value),
        "by_stage": list(by_stage.values()),
    }


@router.get("/{deal_id}", response_model=DealReadWithRelations)
async def get_deal(
    deal_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> DealReadWithRelations:
    """Get a deal by ID."""
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found",
        )

    deal_data = DealReadWithRelations.model_validate(deal)

    # Get related names
    stage = session.get(PipelineStage, deal.stage_id)
    if stage:
        deal_data.stage_name = stage.name
    pipeline = session.get(Pipeline, deal.pipeline_id)
    if pipeline:
        deal_data.pipeline_name = pipeline.name
    if deal.contact_id:
        contact = session.get(Contact, deal.contact_id)
        if contact:
            deal_data.contact_name = f"{contact.first_name} {contact.last_name}"
    if deal.company_id:
        company = session.get(Company, deal.company_id)
        if company:
            deal_data.company_name = company.name

    return deal_data


@router.post("", status_code=status.HTTP_201_CREATED, response_model=DealRead)
async def create_deal(
    data: DealCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Deal:
    """Create a new deal."""
    # Verify pipeline exists
    pipeline = session.get(Pipeline, data.pipeline_id)
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pipeline not found",
        )

    # Verify stage exists and belongs to pipeline
    stage = session.get(PipelineStage, data.stage_id)
    if not stage or stage.pipeline_id != data.pipeline_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stage not found or does not belong to pipeline",
        )

    deal = Deal(
        **data.model_dump(),
        owner_id=UUID(current_user.sub),
        created_by=UUID(current_user.sub),
    )
    session.add(deal)
    session.commit()
    session.refresh(deal)

    # Record initial stage in history
    history = DealStageHistory(
        deal_id=deal.id,
        to_stage_id=deal.stage_id,
        changed_by=UUID(current_user.sub),
    )
    session.add(history)
    session.commit()

    return deal


@router.put("/{deal_id}", response_model=DealRead)
async def update_deal(
    deal_id: UUID,
    data: DealUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Deal:
    """Update a deal."""
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found",
        )

    # If stage is being changed, validate and record history
    if data.stage_id and data.stage_id != deal.stage_id:
        new_stage = session.get(PipelineStage, data.stage_id)
        if not new_stage or new_stage.pipeline_id != deal.pipeline_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stage not found or does not belong to deal's pipeline",
            )

        # Record stage change
        history = DealStageHistory(
            deal_id=deal.id,
            from_stage_id=deal.stage_id,
            to_stage_id=data.stage_id,
            changed_by=UUID(current_user.sub),
        )
        session.add(history)

        # Set actual close date if moving to won/lost stage
        if new_stage.is_won or new_stage.is_lost:
            if not deal.actual_close_date:
                deal.actual_close_date = date.today()

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(deal, key, value)

    deal.updated_by = UUID(current_user.sub)
    session.add(deal)
    session.commit()
    session.refresh(deal)
    return deal


@router.post("/{deal_id}/move-stage", response_model=DealRead)
async def move_deal_stage(
    deal_id: UUID,
    stage_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Deal:
    """Move a deal to a different stage."""
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found",
        )

    new_stage = session.get(PipelineStage, stage_id)
    if not new_stage or new_stage.pipeline_id != deal.pipeline_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stage not found or does not belong to deal's pipeline",
        )

    if stage_id == deal.stage_id:
        return deal  # No change needed

    # Record stage change
    history = DealStageHistory(
        deal_id=deal.id,
        from_stage_id=deal.stage_id,
        to_stage_id=stage_id,
        changed_by=UUID(current_user.sub),
    )
    session.add(history)

    # Update deal
    deal.stage_id = stage_id
    deal.updated_by = UUID(current_user.sub)

    # Set actual close date if moving to won/lost stage
    if new_stage.is_won or new_stage.is_lost:
        if not deal.actual_close_date:
            deal.actual_close_date = date.today()

    session.add(deal)
    session.commit()
    session.refresh(deal)
    return deal


@router.get("/{deal_id}/history")
async def get_deal_history(
    deal_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> list[dict]:
    """Get stage change history for a deal."""
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found",
        )

    query = (
        select(DealStageHistory)
        .where(DealStageHistory.deal_id == deal_id)
        .order_by(DealStageHistory.entered_at.desc())
    )
    history = session.exec(query).all()

    result = []
    for entry in history:
        item = {
            "id": str(entry.id),
            "entered_at": entry.entered_at.isoformat(),
            "from_stage": None,
            "to_stage": None,
        }
        if entry.from_stage_id:
            from_stage = session.get(PipelineStage, entry.from_stage_id)
            if from_stage:
                item["from_stage"] = from_stage.name
        to_stage = session.get(PipelineStage, entry.to_stage_id)
        if to_stage:
            item["to_stage"] = to_stage.name
        result.append(item)

    return result


@router.delete("/{deal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deal(
    deal_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    """Delete a deal."""
    deal = session.get(Deal, deal_id)
    if not deal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Deal not found",
        )

    # Delete history first
    history_query = select(DealStageHistory).where(DealStageHistory.deal_id == deal_id)
    for history in session.exec(history_query).all():
        session.delete(history)

    session.delete(deal)
    session.commit()
