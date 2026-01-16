"""AI Agent Service - Orchestrates tool use with human-in-the-loop approval."""

import json
import logging
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlmodel import Session, select

from app.core.config import settings
from app.models.agent import (
    AgentTask,
    AgentAction,
    AgentTaskStatus,
    AgentActionType,
    AgentTaskResponse,
    AgentActionResponse,
)
from app.services.llm_service import llm_service
from app.services.agent_tools import (
    AGENT_TOOLS,
    CRMTools,
    get_tool_action_type,
    requires_approval,
)

logger = logging.getLogger(__name__)

AGENT_SYSTEM_PROMPT = """You are a helpful AI assistant for a CRM (Customer Relationship Management) system.
You help users manage their contacts, deals, activities, and tasks.

You have access to various tools to interact with the CRM. Use them to fulfill user requests.

Guidelines:
1. Always search before creating to avoid duplicates
2. Be helpful and proactive - suggest follow-up actions when appropriate
3. When creating or updating records, confirm the details with the user first
4. Provide clear summaries of actions taken
5. If you're unsure, ask for clarification

When you've completed a task or need to stop, respond with your final summary without calling any tools.
"""


class AgentService:
    """Service for running AI agent tasks with tool use."""

    async def create_task(
        self,
        prompt: str,
        session: Session,
        max_steps: int = 10,
    ) -> AgentTaskResponse:
        """Create a new agent task."""
        task = AgentTask(
            prompt=prompt,
            goal=prompt,  # Initial goal is the prompt
            max_steps=max_steps,
            model_version=settings.OLLAMA_MODEL,
        )
        session.add(task)
        session.commit()
        session.refresh(task)

        return AgentTaskResponse(
            id=task.id,
            prompt=task.prompt,
            goal=task.goal,
            status=task.status,
            steps_completed=task.steps_completed,
            max_steps=task.max_steps,
            current_step=task.current_step,
            result=task.result,
            error=task.error,
            pending_action=task.pending_action,
            created_at=task.created_at,
            started_at=task.started_at,
            completed_at=task.completed_at,
        )

    async def run_task(
        self,
        task_id: UUID,
        session: Session,
    ) -> AgentTaskResponse:
        """Run an agent task (or continue from pending approval)."""
        task = session.get(AgentTask, task_id)
        if not task:
            raise ValueError("Task not found")

        # Check if task can be run
        if task.status in [AgentTaskStatus.COMPLETED, AgentTaskStatus.FAILED, AgentTaskStatus.CANCELLED]:
            return self._task_to_response(task)

        if task.status == AgentTaskStatus.AWAITING_APPROVAL:
            return self._task_to_response(task)

        # Start running
        task.status = AgentTaskStatus.RUNNING
        task.started_at = task.started_at or datetime.utcnow()
        session.add(task)
        session.commit()

        # Build conversation history
        messages = [
            {"role": "system", "content": AGENT_SYSTEM_PROMPT},
            {"role": "user", "content": task.prompt},
        ]

        # Add previous steps from action history
        for action_record in task.action_history:
            if action_record.get("tool_call"):
                messages.append({
                    "role": "assistant",
                    "content": None,
                    "tool_calls": [action_record["tool_call"]]
                })
                messages.append({
                    "role": "tool",
                    "tool_call_id": action_record["tool_call"]["id"],
                    "content": json.dumps(action_record.get("tool_result", {}))
                })

        crm_tools = CRMTools(session)

        # Agent loop
        while task.steps_completed < task.max_steps:
            try:
                # Call LLM with tools
                response = await llm_service.chat_with_tools(
                    messages=messages,
                    tools=AGENT_TOOLS,
                    system_message=AGENT_SYSTEM_PROMPT,
                )

                if not response:
                    task.status = AgentTaskStatus.FAILED
                    task.error = "Failed to get response from LLM"
                    break

                # Check if LLM wants to use a tool
                if response.get("tool_calls"):
                    tool_call = response["tool_calls"][0]
                    tool_name = tool_call["function"]["name"]
                    tool_input = json.loads(tool_call["function"]["arguments"])

                    task.current_step = f"Using tool: {tool_name}"
                    task.steps_completed += 1

                    # Check if approval is required
                    if settings.AI_REQUIRE_APPROVAL_FOR_WRITES and requires_approval(tool_name):
                        # Store pending action and wait for approval
                        pending = {
                            "tool_call_id": tool_call["id"],
                            "tool_name": tool_name,
                            "tool_input": tool_input,
                            "action_type": get_tool_action_type(tool_name).value,
                        }
                        task.pending_action = pending
                        task.status = AgentTaskStatus.AWAITING_APPROVAL

                        # Create action record
                        action = AgentAction(
                            task_id=task.id,
                            action_type=get_tool_action_type(tool_name),
                            tool_name=tool_name,
                            tool_input=tool_input,
                            requires_approval=True,
                        )
                        session.add(action)
                        session.add(task)
                        session.commit()

                        return self._task_to_response(task)

                    # Execute tool directly (read-only or approval not required)
                    tool_result = await crm_tools.execute_tool(tool_name, tool_input)

                    # Record action
                    action = AgentAction(
                        task_id=task.id,
                        action_type=get_tool_action_type(tool_name),
                        tool_name=tool_name,
                        tool_input=tool_input,
                        tool_output=tool_result,
                        requires_approval=False,
                        executed=True,
                    )
                    session.add(action)

                    # Add to history
                    history_entry = {
                        "tool_call": {
                            "id": tool_call["id"],
                            "function": {
                                "name": tool_name,
                                "arguments": json.dumps(tool_input)
                            }
                        },
                        "tool_result": tool_result
                    }
                    task.action_history = task.action_history + [history_entry]

                    # Add to messages for next iteration
                    messages.append({
                        "role": "assistant",
                        "content": None,
                        "tool_calls": [tool_call]
                    })
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tool_call["id"],
                        "content": json.dumps(tool_result)
                    })

                else:
                    # LLM responded without tools - task complete
                    task.result = response.get("content", "Task completed")
                    task.status = AgentTaskStatus.COMPLETED
                    task.completed_at = datetime.utcnow()
                    break

            except Exception as e:
                logger.error(f"Agent task error: {e}")
                task.status = AgentTaskStatus.FAILED
                task.error = str(e)
                break

        # Check if max steps reached
        if task.steps_completed >= task.max_steps and task.status == AgentTaskStatus.RUNNING:
            task.status = AgentTaskStatus.COMPLETED
            task.result = task.result or "Task completed (max steps reached)"
            task.completed_at = datetime.utcnow()

        session.add(task)
        session.commit()
        session.refresh(task)

        return self._task_to_response(task)

    async def approve_action(
        self,
        task_id: UUID,
        approved: bool,
        rejection_reason: Optional[str],
        session: Session,
    ) -> AgentTaskResponse:
        """Approve or reject a pending action."""
        task = session.get(AgentTask, task_id)
        if not task:
            raise ValueError("Task not found")

        if task.status != AgentTaskStatus.AWAITING_APPROVAL:
            raise ValueError("Task is not awaiting approval")

        if not task.pending_action:
            raise ValueError("No pending action")

        pending = task.pending_action
        tool_name = pending["tool_name"]
        tool_input = pending["tool_input"]
        tool_call_id = pending["tool_call_id"]

        # Find the action record
        action = session.exec(
            select(AgentAction)
            .where(AgentAction.task_id == task_id)
            .where(AgentAction.tool_name == tool_name)
            .where(AgentAction.executed == False)
            .order_by(AgentAction.created_at.desc())
        ).first()

        if approved:
            # Execute the approved action
            crm_tools = CRMTools(session)
            try:
                tool_result = await crm_tools.execute_tool(tool_name, tool_input)

                if action:
                    action.approved = True
                    action.approved_at = datetime.utcnow()
                    action.tool_output = tool_result
                    action.executed = True
                    session.add(action)

                # Add to history
                history_entry = {
                    "tool_call": {
                        "id": tool_call_id,
                        "function": {
                            "name": tool_name,
                            "arguments": json.dumps(tool_input)
                        }
                    },
                    "tool_result": tool_result,
                    "approved": True
                }
                task.action_history = task.action_history + [history_entry]
                task.pending_action = None
                task.status = AgentTaskStatus.APPROVED

                session.add(task)
                session.commit()

                # Continue running the task
                return await self.run_task(task_id, session)

            except Exception as e:
                logger.error(f"Failed to execute approved action: {e}")
                if action:
                    action.execution_error = str(e)
                    session.add(action)
                task.status = AgentTaskStatus.FAILED
                task.error = f"Failed to execute action: {e}"
                session.add(task)
                session.commit()
                return self._task_to_response(task)

        else:
            # Rejected
            if action:
                action.approved = False
                action.rejection_reason = rejection_reason
                session.add(action)

            task.pending_action = None
            task.status = AgentTaskStatus.REJECTED
            task.result = f"Action rejected: {rejection_reason or 'No reason provided'}"
            task.completed_at = datetime.utcnow()

            session.add(task)
            session.commit()

            return self._task_to_response(task)

    async def cancel_task(
        self,
        task_id: UUID,
        session: Session,
    ) -> AgentTaskResponse:
        """Cancel a running or pending task."""
        task = session.get(AgentTask, task_id)
        if not task:
            raise ValueError("Task not found")

        if task.status in [AgentTaskStatus.COMPLETED, AgentTaskStatus.FAILED, AgentTaskStatus.CANCELLED]:
            return self._task_to_response(task)

        task.status = AgentTaskStatus.CANCELLED
        task.completed_at = datetime.utcnow()
        session.add(task)
        session.commit()

        return self._task_to_response(task)

    async def get_task(
        self,
        task_id: UUID,
        session: Session,
    ) -> Optional[AgentTaskResponse]:
        """Get task by ID."""
        task = session.get(AgentTask, task_id)
        if not task:
            return None
        return self._task_to_response(task)

    async def list_tasks(
        self,
        session: Session,
        status: Optional[AgentTaskStatus] = None,
        limit: int = 20,
    ) -> list[AgentTaskResponse]:
        """List agent tasks."""
        stmt = select(AgentTask)
        if status:
            stmt = stmt.where(AgentTask.status == status)
        stmt = stmt.order_by(AgentTask.created_at.desc()).limit(limit)

        tasks = session.exec(stmt).all()
        return [self._task_to_response(t) for t in tasks]

    def _task_to_response(self, task: AgentTask) -> AgentTaskResponse:
        """Convert task model to response."""
        return AgentTaskResponse(
            id=task.id,
            prompt=task.prompt,
            goal=task.goal,
            status=task.status,
            steps_completed=task.steps_completed,
            max_steps=task.max_steps,
            current_step=task.current_step,
            result=task.result,
            error=task.error,
            pending_action=task.pending_action,
            created_at=task.created_at,
            started_at=task.started_at,
            completed_at=task.completed_at,
        )


# Singleton instance
agent_service = AgentService()
