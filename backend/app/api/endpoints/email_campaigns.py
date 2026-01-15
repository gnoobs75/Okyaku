from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from fastapi.responses import Response
from sqlmodel import func, select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.email_campaign import (
    CampaignStatus,
    DeliveryStatus,
    EmailCampaign,
    EmailCampaignCreate,
    EmailCampaignMetrics,
    EmailCampaignRead,
    EmailCampaignReadWithMetrics,
    EmailCampaignUpdate,
    EmailClick,
    EmailRecipient,
    EmailRecipientRead,
    EmailTemplate,
    EmailTemplateCreate,
    EmailTemplateRead,
    EmailTemplateUpdate,
)
from app.services.email_service import email_service

router = APIRouter()


# ============ Email Templates ============


@router.get("/templates", response_model=list[EmailTemplateRead])
async def list_templates(
    session: SessionDep,
    current_user: CurrentUserDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    active_only: bool = Query(default=True),
) -> list[EmailTemplate]:
    """List email templates."""
    query = select(EmailTemplate)
    if active_only:
        query = query.where(EmailTemplate.is_active == True)
    query = query.offset(skip).limit(limit).order_by(EmailTemplate.created_at.desc())
    return list(session.exec(query).all())


@router.post("/templates", response_model=EmailTemplateRead, status_code=status.HTTP_201_CREATED)
async def create_template(
    template_data: EmailTemplateCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> EmailTemplate:
    """Create a new email template."""
    template = EmailTemplate(
        **template_data.model_dump(),
        created_by=UUID(current_user.sub),
    )
    session.add(template)
    session.commit()
    session.refresh(template)
    return template


@router.get("/templates/{template_id}", response_model=EmailTemplateRead)
async def get_template(
    template_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> EmailTemplate:
    """Get an email template by ID."""
    template = session.get(EmailTemplate, template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )
    return template


@router.patch("/templates/{template_id}", response_model=EmailTemplateRead)
async def update_template(
    template_id: UUID,
    template_data: EmailTemplateUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> EmailTemplate:
    """Update an email template."""
    template = session.get(EmailTemplate, template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    update_data = template_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(template, key, value)

    template.updated_by = UUID(current_user.sub)
    session.add(template)
    session.commit()
    session.refresh(template)
    return template


@router.delete("/templates/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_template(
    template_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    """Delete an email template (soft delete by deactivating)."""
    template = session.get(EmailTemplate, template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found",
        )

    # Check if template is used by any campaigns
    campaign_count = session.exec(
        select(func.count(EmailCampaign.id)).where(
            EmailCampaign.template_id == template_id
        )
    ).first()

    if campaign_count and campaign_count > 0:
        # Soft delete
        template.is_active = False
        session.add(template)
    else:
        # Hard delete
        session.delete(template)

    session.commit()


# ============ Email Campaigns ============


@router.get("/campaigns", response_model=list[EmailCampaignReadWithMetrics])
async def list_campaigns(
    session: SessionDep,
    current_user: CurrentUserDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    status_filter: Optional[CampaignStatus] = Query(default=None, alias="status"),
) -> list[dict]:
    """List email campaigns with metrics."""
    query = select(EmailCampaign)
    if status_filter:
        query = query.where(EmailCampaign.status == status_filter)
    query = query.offset(skip).limit(limit).order_by(EmailCampaign.created_at.desc())

    campaigns = session.exec(query).all()

    result = []
    for campaign in campaigns:
        campaign_dict = campaign.model_dump()

        # Get metrics
        metrics = session.exec(
            select(EmailCampaignMetrics).where(
                EmailCampaignMetrics.campaign_id == campaign.id
            )
        ).first()

        if metrics:
            campaign_dict["total_recipients"] = metrics.total_recipients
            campaign_dict["sent_count"] = metrics.sent_count
            campaign_dict["delivered_count"] = metrics.delivered_count
            campaign_dict["opened_count"] = metrics.opened_count
            campaign_dict["clicked_count"] = metrics.clicked_count
            campaign_dict["bounced_count"] = metrics.bounced_count
            campaign_dict["open_rate"] = (
                (metrics.unique_opens / metrics.delivered_count * 100)
                if metrics.delivered_count > 0
                else 0
            )
            campaign_dict["click_rate"] = (
                (metrics.unique_clicks / metrics.delivered_count * 100)
                if metrics.delivered_count > 0
                else 0
            )

        result.append(campaign_dict)

    return result


@router.post("/campaigns", response_model=EmailCampaignRead, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    campaign_data: EmailCampaignCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> EmailCampaign:
    """Create a new email campaign."""
    # Verify template exists
    template = session.get(EmailTemplate, campaign_data.template_id)
    if not template:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Template not found",
        )

    campaign = EmailCampaign(
        **campaign_data.model_dump(),
        created_by=UUID(current_user.sub),
    )
    session.add(campaign)
    session.commit()
    session.refresh(campaign)

    # Create empty metrics record
    metrics = EmailCampaignMetrics(campaign_id=campaign.id)
    session.add(metrics)
    session.commit()

    return campaign


@router.get("/campaigns/{campaign_id}", response_model=EmailCampaignReadWithMetrics)
async def get_campaign(
    campaign_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Get a campaign by ID with metrics."""
    campaign = session.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    campaign_dict = campaign.model_dump()

    # Get metrics
    metrics = session.exec(
        select(EmailCampaignMetrics).where(
            EmailCampaignMetrics.campaign_id == campaign.id
        )
    ).first()

    if metrics:
        campaign_dict["total_recipients"] = metrics.total_recipients
        campaign_dict["sent_count"] = metrics.sent_count
        campaign_dict["delivered_count"] = metrics.delivered_count
        campaign_dict["opened_count"] = metrics.opened_count
        campaign_dict["clicked_count"] = metrics.clicked_count
        campaign_dict["bounced_count"] = metrics.bounced_count
        campaign_dict["open_rate"] = (
            (metrics.unique_opens / metrics.delivered_count * 100)
            if metrics.delivered_count > 0
            else 0
        )
        campaign_dict["click_rate"] = (
            (metrics.unique_clicks / metrics.delivered_count * 100)
            if metrics.delivered_count > 0
            else 0
        )

    return campaign_dict


@router.patch("/campaigns/{campaign_id}", response_model=EmailCampaignRead)
async def update_campaign(
    campaign_id: UUID,
    campaign_data: EmailCampaignUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> EmailCampaign:
    """Update an email campaign."""
    campaign = session.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if campaign.status not in [CampaignStatus.DRAFT, CampaignStatus.SCHEDULED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update campaign that is already sending or sent",
        )

    update_data = campaign_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(campaign, key, value)

    campaign.updated_by = UUID(current_user.sub)
    session.add(campaign)
    session.commit()
    session.refresh(campaign)
    return campaign


@router.delete("/campaigns/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    """Delete an email campaign."""
    campaign = session.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if campaign.status in [CampaignStatus.SENDING, CampaignStatus.SENT]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete campaign that is sending or has been sent",
        )

    # Delete related records
    session.exec(
        select(EmailRecipient).where(EmailRecipient.campaign_id == campaign_id)
    )
    for recipient in session.exec(
        select(EmailRecipient).where(EmailRecipient.campaign_id == campaign_id)
    ).all():
        session.delete(recipient)

    metrics = session.exec(
        select(EmailCampaignMetrics).where(
            EmailCampaignMetrics.campaign_id == campaign_id
        )
    ).first()
    if metrics:
        session.delete(metrics)

    session.delete(campaign)
    session.commit()


# ============ Campaign Actions ============


@router.post("/campaigns/{campaign_id}/populate-recipients")
async def populate_campaign_recipients(
    campaign_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Populate campaign recipients based on filter criteria."""
    campaign = session.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if campaign.status not in [CampaignStatus.DRAFT, CampaignStatus.SCHEDULED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify recipients for this campaign status",
        )

    added_count = email_service.populate_campaign_recipients(session, campaign)

    # Update metrics
    email_service.update_campaign_metrics(session, campaign_id)

    return {"added_count": added_count}


@router.post("/campaigns/{campaign_id}/schedule")
async def schedule_campaign(
    campaign_id: UUID,
    scheduled_at: datetime,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Schedule a campaign for sending."""
    campaign = session.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if campaign.status != CampaignStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft campaigns can be scheduled",
        )

    # Check if there are recipients
    recipient_count = session.exec(
        select(func.count(EmailRecipient.id)).where(
            EmailRecipient.campaign_id == campaign_id
        )
    ).first()

    if not recipient_count or recipient_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign has no recipients. Populate recipients first.",
        )

    campaign.scheduled_at = scheduled_at
    campaign.status = CampaignStatus.SCHEDULED
    session.add(campaign)
    session.commit()

    return {"status": "scheduled", "scheduled_at": scheduled_at.isoformat()}


@router.post("/campaigns/{campaign_id}/send")
async def send_campaign(
    campaign_id: UUID,
    background_tasks: BackgroundTasks,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Start sending a campaign immediately."""
    campaign = session.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if campaign.status not in [CampaignStatus.DRAFT, CampaignStatus.SCHEDULED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign cannot be sent in current status",
        )

    # Check if there are recipients
    recipient_count = session.exec(
        select(func.count(EmailRecipient.id)).where(
            EmailRecipient.campaign_id == campaign_id,
            EmailRecipient.status == DeliveryStatus.PENDING,
        )
    ).first()

    if not recipient_count or recipient_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign has no pending recipients to send to.",
        )

    # Update status
    campaign.status = CampaignStatus.SENDING
    campaign.started_at = datetime.utcnow()
    session.add(campaign)
    session.commit()

    # Add background task
    background_tasks.add_task(
        _send_campaign_emails,
        campaign_id=campaign_id,
    )

    return {"status": "sending", "recipient_count": recipient_count}


async def _send_campaign_emails(campaign_id: UUID) -> None:
    """Background task to send campaign emails."""
    from app.db.session import get_session

    with get_session() as session:
        campaign = session.get(EmailCampaign, campaign_id)
        if not campaign:
            return

        # Get pending recipients in batches
        batch_size = email_service.batch_size
        offset = 0

        while True:
            recipients = session.exec(
                select(EmailRecipient)
                .where(
                    EmailRecipient.campaign_id == campaign_id,
                    EmailRecipient.status == DeliveryStatus.PENDING,
                )
                .offset(offset)
                .limit(batch_size)
            ).all()

            if not recipients:
                break

            await email_service.send_campaign_batch(
                session=session,
                campaign=campaign,
                recipients=list(recipients),
                tracking_base_url="",  # Would be configured from settings
            )

            offset += batch_size

        # Update campaign status
        campaign.status = CampaignStatus.SENT
        campaign.completed_at = datetime.utcnow()
        session.add(campaign)
        session.commit()

        # Update final metrics
        email_service.update_campaign_metrics(session, campaign_id)


@router.post("/campaigns/{campaign_id}/cancel")
async def cancel_campaign(
    campaign_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Cancel a scheduled or sending campaign."""
    campaign = session.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if campaign.status not in [CampaignStatus.SCHEDULED, CampaignStatus.SENDING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Campaign cannot be cancelled in current status",
        )

    campaign.status = CampaignStatus.CANCELLED
    session.add(campaign)
    session.commit()

    return {"status": "cancelled"}


# ============ Recipients ============


@router.get("/campaigns/{campaign_id}/recipients", response_model=list[EmailRecipientRead])
async def list_campaign_recipients(
    campaign_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    status_filter: Optional[DeliveryStatus] = Query(default=None, alias="status"),
) -> list[EmailRecipient]:
    """List recipients for a campaign."""
    campaign = session.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    query = select(EmailRecipient).where(EmailRecipient.campaign_id == campaign_id)
    if status_filter:
        query = query.where(EmailRecipient.status == status_filter)
    query = query.offset(skip).limit(limit)

    return list(session.exec(query).all())


@router.post("/campaigns/{campaign_id}/recipients")
async def add_recipient(
    campaign_id: UUID,
    email: str,
    session: SessionDep,
    current_user: CurrentUserDep,
    first_name: Optional[str] = None,
    last_name: Optional[str] = None,
    contact_id: Optional[UUID] = None,
) -> EmailRecipientRead:
    """Add a single recipient to a campaign."""
    campaign = session.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    if campaign.status not in [CampaignStatus.DRAFT, CampaignStatus.SCHEDULED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add recipients to this campaign",
        )

    # Check for duplicate
    existing = session.exec(
        select(EmailRecipient).where(
            EmailRecipient.campaign_id == campaign_id,
            EmailRecipient.email == email,
        )
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recipient already exists in campaign",
        )

    recipient = EmailRecipient(
        campaign_id=campaign_id,
        email=email,
        first_name=first_name,
        last_name=last_name,
        contact_id=contact_id,
    )
    session.add(recipient)
    session.commit()
    session.refresh(recipient)

    # Update metrics
    email_service.update_campaign_metrics(session, campaign_id)

    return recipient


@router.delete("/campaigns/{campaign_id}/recipients/{recipient_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_recipient(
    campaign_id: UUID,
    recipient_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    """Remove a recipient from a campaign."""
    recipient = session.get(EmailRecipient, recipient_id)
    if not recipient or recipient.campaign_id != campaign_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient not found",
        )

    campaign = session.get(EmailCampaign, campaign_id)
    if campaign and campaign.status not in [CampaignStatus.DRAFT, CampaignStatus.SCHEDULED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove recipients from this campaign",
        )

    session.delete(recipient)
    session.commit()

    # Update metrics
    if campaign:
        email_service.update_campaign_metrics(session, campaign_id)


# ============ Tracking Webhooks ============


@router.get("/track/open/{recipient_id}")
async def track_open(
    recipient_id: UUID,
    session: SessionDep,
) -> Response:
    """Track email open via tracking pixel."""
    recipient = session.get(EmailRecipient, recipient_id)
    if recipient and not recipient.opened_at:
        recipient.opened_at = datetime.utcnow()
        if recipient.status in [DeliveryStatus.SENT, DeliveryStatus.DELIVERED]:
            recipient.status = DeliveryStatus.OPENED
        session.add(recipient)
        session.commit()

        # Update campaign metrics
        email_service.update_campaign_metrics(session, recipient.campaign_id)

    # Return a 1x1 transparent GIF
    gif_bytes = b"\x47\x49\x46\x38\x39\x61\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00\x21\xf9\x04\x01\x00\x00\x00\x00\x2c\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x44\x01\x00\x3b"
    return Response(content=gif_bytes, media_type="image/gif")


@router.get("/track/click/{recipient_id}")
async def track_click(
    recipient_id: UUID,
    url: str,
    session: SessionDep,
) -> Response:
    """Track email link click."""
    import urllib.parse

    recipient = session.get(EmailRecipient, recipient_id)
    if recipient:
        # Record click
        click = EmailClick(
            recipient_id=recipient_id,
            url=url,
        )
        session.add(click)

        # Update recipient status
        if not recipient.clicked_at:
            recipient.clicked_at = datetime.utcnow()
        if recipient.status in [
            DeliveryStatus.SENT,
            DeliveryStatus.DELIVERED,
            DeliveryStatus.OPENED,
        ]:
            recipient.status = DeliveryStatus.CLICKED
        session.add(recipient)
        session.commit()

        # Update campaign metrics
        email_service.update_campaign_metrics(session, recipient.campaign_id)

    # Redirect to original URL
    decoded_url = urllib.parse.unquote(url)
    return Response(
        status_code=302,
        headers={"Location": decoded_url},
    )


# ============ Campaign Metrics ============


@router.get("/campaigns/{campaign_id}/metrics")
async def get_campaign_metrics(
    campaign_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Get detailed metrics for a campaign."""
    campaign = session.get(EmailCampaign, campaign_id)
    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found",
        )

    # Refresh metrics
    metrics = email_service.update_campaign_metrics(session, campaign_id)

    return {
        "campaign_id": str(campaign_id),
        "total_recipients": metrics.total_recipients,
        "sent_count": metrics.sent_count,
        "delivered_count": metrics.delivered_count,
        "opened_count": metrics.opened_count,
        "clicked_count": metrics.clicked_count,
        "bounced_count": metrics.bounced_count,
        "complained_count": metrics.complained_count,
        "unsubscribed_count": metrics.unsubscribed_count,
        "failed_count": metrics.failed_count,
        "unique_opens": metrics.unique_opens,
        "unique_clicks": metrics.unique_clicks,
        "open_rate": (
            round(metrics.unique_opens / metrics.delivered_count * 100, 2)
            if metrics.delivered_count > 0
            else 0
        ),
        "click_rate": (
            round(metrics.unique_clicks / metrics.delivered_count * 100, 2)
            if metrics.delivered_count > 0
            else 0
        ),
        "bounce_rate": (
            round(metrics.bounced_count / metrics.sent_count * 100, 2)
            if metrics.sent_count > 0
            else 0
        ),
        "last_calculated_at": metrics.last_calculated_at.isoformat(),
    }
