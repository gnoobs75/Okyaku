from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.pipeline import (
    Pipeline,
    PipelineCreate,
    PipelineRead,
    PipelineReadWithStages,
    PipelineStage,
    PipelineStageCreate,
    PipelineStageRead,
    PipelineStageUpdate,
    PipelineUpdate,
)

router = APIRouter()


@router.get("", response_model=list[PipelineReadWithStages])
async def list_pipelines(
    session: SessionDep,
    current_user: CurrentUserDep,
    active_only: bool = Query(default=True),
) -> list[PipelineReadWithStages]:
    """List all pipelines with their stages."""
    query = select(Pipeline)
    if active_only:
        query = query.where(Pipeline.is_active == True)
    query = query.order_by(Pipeline.is_default.desc(), Pipeline.name)

    pipelines = session.exec(query).all()

    result = []
    for pipeline in pipelines:
        stages_query = (
            select(PipelineStage)
            .where(PipelineStage.pipeline_id == pipeline.id)
            .order_by(PipelineStage.order)
        )
        stages = session.exec(stages_query).all()

        pipeline_data = PipelineReadWithStages.model_validate(pipeline)
        pipeline_data.stages = [PipelineStageRead.model_validate(s) for s in stages]
        result.append(pipeline_data)

    return result


@router.get("/{pipeline_id}", response_model=PipelineReadWithStages)
async def get_pipeline(
    pipeline_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> PipelineReadWithStages:
    """Get a pipeline with its stages."""
    pipeline = session.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )

    stages_query = (
        select(PipelineStage)
        .where(PipelineStage.pipeline_id == pipeline_id)
        .order_by(PipelineStage.order)
    )
    stages = session.exec(stages_query).all()

    pipeline_data = PipelineReadWithStages.model_validate(pipeline)
    pipeline_data.stages = [PipelineStageRead.model_validate(s) for s in stages]

    return pipeline_data


@router.post("", status_code=status.HTTP_201_CREATED, response_model=PipelineRead)
async def create_pipeline(
    data: PipelineCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Pipeline:
    """Create a new pipeline."""
    # If setting as default, unset other defaults
    if data.is_default:
        existing_default = session.exec(
            select(Pipeline).where(Pipeline.is_default == True)
        ).first()
        if existing_default:
            existing_default.is_default = False
            session.add(existing_default)

    pipeline = Pipeline(
        **data.model_dump(),
        created_by=UUID(current_user.sub),
    )
    session.add(pipeline)
    session.commit()
    session.refresh(pipeline)
    return pipeline


@router.put("/{pipeline_id}", response_model=PipelineRead)
async def update_pipeline(
    pipeline_id: UUID,
    data: PipelineUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> Pipeline:
    """Update a pipeline."""
    pipeline = session.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )

    # If setting as default, unset other defaults
    if data.is_default:
        existing_default = session.exec(
            select(Pipeline).where(
                Pipeline.is_default == True, Pipeline.id != pipeline_id
            )
        ).first()
        if existing_default:
            existing_default.is_default = False
            session.add(existing_default)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pipeline, key, value)

    pipeline.updated_by = UUID(current_user.sub)
    session.add(pipeline)
    session.commit()
    session.refresh(pipeline)
    return pipeline


@router.delete("/{pipeline_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_pipeline(
    pipeline_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    """Delete a pipeline (soft delete by deactivating)."""
    pipeline = session.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )

    # Soft delete - just deactivate
    pipeline.is_active = False
    pipeline.updated_by = UUID(current_user.sub)
    session.add(pipeline)
    session.commit()


# Stage endpoints
@router.post(
    "/{pipeline_id}/stages",
    status_code=status.HTTP_201_CREATED,
    response_model=PipelineStageRead,
)
async def create_stage(
    pipeline_id: UUID,
    data: PipelineStageCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> PipelineStage:
    """Create a new stage in a pipeline."""
    pipeline = session.get(Pipeline, pipeline_id)
    if not pipeline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pipeline not found",
        )

    stage = PipelineStage(
        **data.model_dump(),
        pipeline_id=pipeline_id,
    )
    session.add(stage)
    session.commit()
    session.refresh(stage)
    return stage


@router.put(
    "/{pipeline_id}/stages/{stage_id}",
    response_model=PipelineStageRead,
)
async def update_stage(
    pipeline_id: UUID,
    stage_id: UUID,
    data: PipelineStageUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> PipelineStage:
    """Update a pipeline stage."""
    stage = session.get(PipelineStage, stage_id)
    if not stage or stage.pipeline_id != pipeline_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found",
        )

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(stage, key, value)

    session.add(stage)
    session.commit()
    session.refresh(stage)
    return stage


@router.delete(
    "/{pipeline_id}/stages/{stage_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_stage(
    pipeline_id: UUID,
    stage_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    """Delete a pipeline stage."""
    stage = session.get(PipelineStage, stage_id)
    if not stage or stage.pipeline_id != pipeline_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Stage not found",
        )

    session.delete(stage)
    session.commit()
