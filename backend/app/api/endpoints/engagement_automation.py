"""API endpoints for engagement automation."""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query
from sqlmodel import func, select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.engagement_automation import (
    AutomationRule,
    AutomationRuleCreate,
    AutomationRuleRead,
    AutomationRuleUpdate,
    RuleCondition,
    RuleConditionCreate,
    RuleConditionRead,
    RuleAction,
    RuleActionCreate,
    RuleActionRead,
    ExecutionLog,
    ExecutionLogRead,
    ResponseTemplate,
    ResponseTemplateCreate,
    ResponseTemplateRead,
    ResponseTemplateUpdate,
    RuleStatus,
    TriggerType,
    ActionType,
)

router = APIRouter()


# ==================== Automation Rules ====================

@router.get("/rules")
async def list_rules(
    session: SessionDep,
    current_user: CurrentUserDep,
    status: Optional[RuleStatus] = None,
    trigger_type: Optional[TriggerType] = None,
    platform: Optional[str] = None,
) -> list[AutomationRuleRead]:
    """List all automation rules."""
    user_id = UUID(current_user.sub)

    query = select(AutomationRule).where(AutomationRule.owner_id == user_id)

    if status:
        query = query.where(AutomationRule.status == status)
    else:
        query = query.where(AutomationRule.status != RuleStatus.ARCHIVED)

    if trigger_type:
        query = query.where(AutomationRule.trigger_type == trigger_type)

    if platform:
        query = query.where(AutomationRule.platform == platform)

    query = query.order_by(AutomationRule.created_at.desc())
    rules = session.exec(query).all()

    return [AutomationRuleRead.model_validate(r) for r in rules]


@router.post("/rules")
async def create_rule(
    session: SessionDep,
    current_user: CurrentUserDep,
    rule: AutomationRuleCreate,
) -> AutomationRuleRead:
    """Create a new automation rule."""
    user_id = UUID(current_user.sub)

    db_rule = AutomationRule(
        **rule.model_dump(),
        owner_id=user_id,
    )
    session.add(db_rule)
    session.commit()
    session.refresh(db_rule)

    return AutomationRuleRead.model_validate(db_rule)


@router.get("/rules/{rule_id}")
async def get_rule(
    session: SessionDep,
    current_user: CurrentUserDep,
    rule_id: UUID,
) -> dict:
    """Get a specific rule with its conditions and actions."""
    user_id = UUID(current_user.sub)

    rule = session.exec(
        select(AutomationRule).where(
            AutomationRule.id == rule_id,
            AutomationRule.owner_id == user_id,
        )
    ).first()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    # Get conditions
    conditions = session.exec(
        select(RuleCondition).where(RuleCondition.rule_id == rule_id)
    ).all()

    # Get actions
    actions = session.exec(
        select(RuleAction).where(RuleAction.rule_id == rule_id)
    ).all()

    return {
        "rule": AutomationRuleRead.model_validate(rule),
        "conditions": [RuleConditionRead.model_validate(c) for c in conditions],
        "actions": [RuleActionRead.model_validate(a) for a in actions],
    }


@router.patch("/rules/{rule_id}")
async def update_rule(
    session: SessionDep,
    current_user: CurrentUserDep,
    rule_id: UUID,
    update: AutomationRuleUpdate,
) -> AutomationRuleRead:
    """Update an automation rule."""
    user_id = UUID(current_user.sub)

    rule = session.exec(
        select(AutomationRule).where(
            AutomationRule.id == rule_id,
            AutomationRule.owner_id == user_id,
        )
    ).first()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rule, key, value)

    rule.updated_at = datetime.utcnow()
    session.add(rule)
    session.commit()
    session.refresh(rule)

    return AutomationRuleRead.model_validate(rule)


@router.delete("/rules/{rule_id}")
async def delete_rule(
    session: SessionDep,
    current_user: CurrentUserDep,
    rule_id: UUID,
) -> dict:
    """Delete an automation rule."""
    user_id = UUID(current_user.sub)

    rule = session.exec(
        select(AutomationRule).where(
            AutomationRule.id == rule_id,
            AutomationRule.owner_id == user_id,
        )
    ).first()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    # Delete conditions
    for c in session.exec(
        select(RuleCondition).where(RuleCondition.rule_id == rule_id)
    ).all():
        session.delete(c)

    # Delete actions
    for a in session.exec(
        select(RuleAction).where(RuleAction.rule_id == rule_id)
    ).all():
        session.delete(a)

    # Delete logs
    for log in session.exec(
        select(ExecutionLog).where(ExecutionLog.rule_id == rule_id)
    ).all():
        session.delete(log)

    session.delete(rule)
    session.commit()

    return {"success": True, "message": "Rule deleted"}


@router.post("/rules/{rule_id}/activate")
async def activate_rule(
    session: SessionDep,
    current_user: CurrentUserDep,
    rule_id: UUID,
) -> AutomationRuleRead:
    """Activate a rule."""
    user_id = UUID(current_user.sub)

    rule = session.exec(
        select(AutomationRule).where(
            AutomationRule.id == rule_id,
            AutomationRule.owner_id == user_id,
        )
    ).first()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    # Check for at least one action
    action_count = session.exec(
        select(func.count()).where(RuleAction.rule_id == rule_id)
    ).one()

    if action_count == 0:
        raise HTTPException(
            status_code=400,
            detail="Rule must have at least one action to be activated"
        )

    rule.status = RuleStatus.ACTIVE
    rule.updated_at = datetime.utcnow()
    session.add(rule)
    session.commit()
    session.refresh(rule)

    return AutomationRuleRead.model_validate(rule)


@router.post("/rules/{rule_id}/pause")
async def pause_rule(
    session: SessionDep,
    current_user: CurrentUserDep,
    rule_id: UUID,
) -> AutomationRuleRead:
    """Pause a rule."""
    user_id = UUID(current_user.sub)

    rule = session.exec(
        select(AutomationRule).where(
            AutomationRule.id == rule_id,
            AutomationRule.owner_id == user_id,
        )
    ).first()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    rule.status = RuleStatus.PAUSED
    rule.updated_at = datetime.utcnow()
    session.add(rule)
    session.commit()
    session.refresh(rule)

    return AutomationRuleRead.model_validate(rule)


# ==================== Rule Conditions ====================

@router.post("/rules/{rule_id}/conditions")
async def add_condition(
    session: SessionDep,
    current_user: CurrentUserDep,
    rule_id: UUID,
    condition: RuleConditionCreate,
) -> RuleConditionRead:
    """Add a condition to a rule."""
    user_id = UUID(current_user.sub)

    # Verify rule ownership
    rule = session.exec(
        select(AutomationRule).where(
            AutomationRule.id == rule_id,
            AutomationRule.owner_id == user_id,
        )
    ).first()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    db_condition = RuleCondition(
        **{**condition.model_dump(), "rule_id": rule_id},
        owner_id=user_id,
    )
    session.add(db_condition)
    session.commit()
    session.refresh(db_condition)

    return RuleConditionRead.model_validate(db_condition)


@router.delete("/rules/{rule_id}/conditions/{condition_id}")
async def delete_condition(
    session: SessionDep,
    current_user: CurrentUserDep,
    rule_id: UUID,
    condition_id: UUID,
) -> dict:
    """Delete a condition from a rule."""
    user_id = UUID(current_user.sub)

    condition = session.exec(
        select(RuleCondition).where(
            RuleCondition.id == condition_id,
            RuleCondition.rule_id == rule_id,
            RuleCondition.owner_id == user_id,
        )
    ).first()

    if not condition:
        raise HTTPException(status_code=404, detail="Condition not found")

    session.delete(condition)
    session.commit()

    return {"success": True, "message": "Condition deleted"}


# ==================== Rule Actions ====================

@router.post("/rules/{rule_id}/actions")
async def add_action(
    session: SessionDep,
    current_user: CurrentUserDep,
    rule_id: UUID,
    action: RuleActionCreate,
) -> RuleActionRead:
    """Add an action to a rule."""
    user_id = UUID(current_user.sub)

    # Verify rule ownership
    rule = session.exec(
        select(AutomationRule).where(
            AutomationRule.id == rule_id,
            AutomationRule.owner_id == user_id,
        )
    ).first()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    db_action = RuleAction(
        **{**action.model_dump(), "rule_id": rule_id},
        owner_id=user_id,
    )
    session.add(db_action)
    session.commit()
    session.refresh(db_action)

    return RuleActionRead.model_validate(db_action)


@router.delete("/rules/{rule_id}/actions/{action_id}")
async def delete_action(
    session: SessionDep,
    current_user: CurrentUserDep,
    rule_id: UUID,
    action_id: UUID,
) -> dict:
    """Delete an action from a rule."""
    user_id = UUID(current_user.sub)

    action = session.exec(
        select(RuleAction).where(
            RuleAction.id == action_id,
            RuleAction.rule_id == rule_id,
            RuleAction.owner_id == user_id,
        )
    ).first()

    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    session.delete(action)
    session.commit()

    return {"success": True, "message": "Action deleted"}


# ==================== Execution Logs ====================

@router.get("/rules/{rule_id}/logs")
async def get_rule_logs(
    session: SessionDep,
    current_user: CurrentUserDep,
    rule_id: UUID,
    success: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=100),
) -> list[ExecutionLogRead]:
    """Get execution logs for a rule."""
    user_id = UUID(current_user.sub)

    # Verify rule ownership
    rule = session.exec(
        select(AutomationRule).where(
            AutomationRule.id == rule_id,
            AutomationRule.owner_id == user_id,
        )
    ).first()

    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    query = select(ExecutionLog).where(ExecutionLog.rule_id == rule_id)

    if success is not None:
        query = query.where(ExecutionLog.success == success)

    query = query.order_by(ExecutionLog.executed_at.desc()).limit(limit)
    logs = session.exec(query).all()

    return [ExecutionLogRead.model_validate(log) for log in logs]


# ==================== Response Templates ====================

@router.get("/templates")
async def list_templates(
    session: SessionDep,
    current_user: CurrentUserDep,
    category: Optional[str] = None,
    platform: Optional[str] = None,
) -> list[ResponseTemplateRead]:
    """List all response templates."""
    user_id = UUID(current_user.sub)

    query = select(ResponseTemplate).where(ResponseTemplate.owner_id == user_id)

    if category:
        query = query.where(ResponseTemplate.category == category)

    if platform:
        query = query.where(ResponseTemplate.platform == platform)

    query = query.order_by(ResponseTemplate.times_used.desc())
    templates = session.exec(query).all()

    return [ResponseTemplateRead.model_validate(t) for t in templates]


@router.post("/templates")
async def create_template(
    session: SessionDep,
    current_user: CurrentUserDep,
    template: ResponseTemplateCreate,
) -> ResponseTemplateRead:
    """Create a new response template."""
    user_id = UUID(current_user.sub)

    db_template = ResponseTemplate(
        **template.model_dump(),
        owner_id=user_id,
    )
    session.add(db_template)
    session.commit()
    session.refresh(db_template)

    return ResponseTemplateRead.model_validate(db_template)


@router.patch("/templates/{template_id}")
async def update_template(
    session: SessionDep,
    current_user: CurrentUserDep,
    template_id: UUID,
    update: ResponseTemplateUpdate,
) -> ResponseTemplateRead:
    """Update a response template."""
    user_id = UUID(current_user.sub)

    template = session.exec(
        select(ResponseTemplate).where(
            ResponseTemplate.id == template_id,
            ResponseTemplate.owner_id == user_id,
        )
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)

    template.updated_at = datetime.utcnow()
    session.add(template)
    session.commit()
    session.refresh(template)

    return ResponseTemplateRead.model_validate(template)


@router.delete("/templates/{template_id}")
async def delete_template(
    session: SessionDep,
    current_user: CurrentUserDep,
    template_id: UUID,
) -> dict:
    """Delete a response template."""
    user_id = UUID(current_user.sub)

    template = session.exec(
        select(ResponseTemplate).where(
            ResponseTemplate.id == template_id,
            ResponseTemplate.owner_id == user_id,
        )
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    session.delete(template)
    session.commit()

    return {"success": True, "message": "Template deleted"}


# ==================== Statistics ====================

@router.get("/stats")
async def get_automation_stats(
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Get automation statistics."""
    user_id = UUID(current_user.sub)

    # Rule counts
    total_rules = session.exec(
        select(func.count()).where(
            AutomationRule.owner_id == user_id,
            AutomationRule.status != RuleStatus.ARCHIVED,
        )
    ).one()

    active_rules = session.exec(
        select(func.count()).where(
            AutomationRule.owner_id == user_id,
            AutomationRule.status == RuleStatus.ACTIVE,
        )
    ).one()

    # Template counts
    total_templates = session.exec(
        select(func.count()).where(ResponseTemplate.owner_id == user_id)
    ).one()

    # Execution stats (last 30 days)
    cutoff = datetime.utcnow() - timedelta(days=30)
    total_executions = session.exec(
        select(func.count()).where(
            ExecutionLog.owner_id == user_id,
            ExecutionLog.executed_at >= cutoff,
        )
    ).one()

    successful_executions = session.exec(
        select(func.count()).where(
            ExecutionLog.owner_id == user_id,
            ExecutionLog.executed_at >= cutoff,
            ExecutionLog.success == True,
        )
    ).one()

    # Executions by day
    daily_executions = {}
    logs = session.exec(
        select(ExecutionLog)
        .where(
            ExecutionLog.owner_id == user_id,
            ExecutionLog.executed_at >= cutoff,
        )
        .order_by(ExecutionLog.executed_at.asc())
    ).all()

    for log in logs:
        date_key = log.executed_at.strftime("%Y-%m-%d")
        if date_key not in daily_executions:
            daily_executions[date_key] = {"date": date_key, "total": 0, "successful": 0}
        daily_executions[date_key]["total"] += 1
        if log.success:
            daily_executions[date_key]["successful"] += 1

    # Top performing rules
    top_rules = session.exec(
        select(AutomationRule)
        .where(
            AutomationRule.owner_id == user_id,
            AutomationRule.status != RuleStatus.ARCHIVED,
        )
        .order_by(AutomationRule.successful_executions.desc())
        .limit(5)
    ).all()

    # Trigger type breakdown
    trigger_counts = {}
    for trigger in TriggerType:
        count = session.exec(
            select(func.count()).where(
                AutomationRule.owner_id == user_id,
                AutomationRule.trigger_type == trigger,
                AutomationRule.status != RuleStatus.ARCHIVED,
            )
        ).one()
        if count > 0:
            trigger_counts[trigger.value] = count

    return {
        "total_rules": total_rules,
        "active_rules": active_rules,
        "total_templates": total_templates,
        "executions_30d": total_executions,
        "successful_executions_30d": successful_executions,
        "success_rate": (
            round(successful_executions / total_executions * 100, 1)
            if total_executions > 0 else 0
        ),
        "daily_executions": list(daily_executions.values()),
        "trigger_breakdown": trigger_counts,
        "top_rules": [
            {
                "id": str(r.id),
                "name": r.name,
                "trigger_type": r.trigger_type.value,
                "successful_executions": r.successful_executions,
                "status": r.status.value,
            }
            for r in top_rules
        ],
    }
