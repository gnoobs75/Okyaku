"""API endpoints for AI Agent system."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends, Query
from sqlmodel import Session

from app.api.deps import CurrentUserDep
from app.db.session import get_session
from app.core.config import settings
from app.models.agent import (
    AgentTaskStatus,
    AgentTaskResponse,
    CreateAgentTaskRequest,
    ApproveActionRequest,
)
from app.services.agent_service import agent_service
from app.services.agent_tools import AGENT_TOOLS

router = APIRouter()


@router.post("/tasks", response_model=AgentTaskResponse)
async def create_agent_task(
    request: CreateAgentTaskRequest,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> AgentTaskResponse:
    """
    Create a new AI agent task.

    The agent will process the prompt and use CRM tools to accomplish the goal.
    Write operations require human approval when AI_REQUIRE_APPROVAL_FOR_WRITES is enabled.
    """
    if not settings.AI_AGENTS_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="AI agents are disabled. Enable AI_AGENTS_ENABLED in settings.",
        )

    return await agent_service.create_task(
        prompt=request.prompt,
        session=session,
        max_steps=request.max_steps,
    )


@router.post("/tasks/{task_id}/run", response_model=AgentTaskResponse)
async def run_agent_task(
    task_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> AgentTaskResponse:
    """
    Run an agent task.

    Starts or continues execution of the task. If the task is awaiting approval,
    this will return the current state without continuing.
    """
    if not settings.AI_AGENTS_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="AI agents are disabled.",
        )

    try:
        return await agent_service.run_task(task_id, session)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/tasks/{task_id}/approve", response_model=AgentTaskResponse)
async def approve_agent_action(
    task_id: UUID,
    request: ApproveActionRequest,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> AgentTaskResponse:
    """
    Approve or reject a pending agent action.

    When an agent needs to perform a write operation (create, update, delete),
    it pauses and waits for human approval. Use this endpoint to approve or reject.
    """
    try:
        return await agent_service.approve_action(
            task_id=task_id,
            approved=request.approved,
            rejection_reason=request.rejection_reason,
            session=session,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tasks/{task_id}/cancel", response_model=AgentTaskResponse)
async def cancel_agent_task(
    task_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> AgentTaskResponse:
    """Cancel a running or pending agent task."""
    try:
        return await agent_service.cancel_task(task_id, session)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/tasks/{task_id}", response_model=AgentTaskResponse)
async def get_agent_task(
    task_id: UUID,
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
) -> AgentTaskResponse:
    """Get details of a specific agent task."""
    task = await agent_service.get_task(task_id, session)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("/tasks", response_model=list[AgentTaskResponse])
async def list_agent_tasks(
    current_user: CurrentUserDep,
    session: Session = Depends(get_session),
    status: Optional[AgentTaskStatus] = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
) -> list[AgentTaskResponse]:
    """List agent tasks with optional status filter."""
    return await agent_service.list_tasks(session, status=status, limit=limit)


@router.get("/tools")
async def list_agent_tools(current_user: CurrentUserDep) -> dict:
    """
    List available CRM tools for the agent.

    Returns tool definitions including names, descriptions, and parameters.
    """
    return {
        "tools": [
            {
                "name": tool["function"]["name"],
                "description": tool["function"]["description"],
                "parameters": tool["function"]["parameters"],
            }
            for tool in AGENT_TOOLS
        ],
        "total": len(AGENT_TOOLS),
        "approval_required_for_writes": settings.AI_REQUIRE_APPROVAL_FOR_WRITES,
    }


@router.get("/status")
async def get_agent_status(current_user: CurrentUserDep) -> dict:
    """
    Get status of the AI agent system.

    Returns configuration and availability information.
    """
    from app.services.llm_service import llm_service

    health = await llm_service.check_health()
    is_available = health.get("status") == "healthy" and settings.AI_AGENTS_ENABLED

    return {
        "available": is_available,
        "enabled": settings.AI_AGENTS_ENABLED,
        "ollama_status": health.get("status"),
        "model": settings.OLLAMA_MODEL,
        "require_approval_for_writes": settings.AI_REQUIRE_APPROVAL_FOR_WRITES,
        "available_tools": len(AGENT_TOOLS),
    }
