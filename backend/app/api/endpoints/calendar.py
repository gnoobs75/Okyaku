"""Calendar integration API endpoints."""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, Request
from sqlmodel import select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.calendar import (
    CalendarConnection,
    CalendarConnectionCreate,
    CalendarConnectionRead,
    CalendarConnectionStatus,
    CalendarConnectionUpdate,
    CalendarEvent,
    CalendarEventCreate,
    CalendarEventRead,
    CalendarEventUpdate,
    CalendarProvider,
    ScheduledMeeting,
    ScheduledMeetingCreate,
    ScheduledMeetingRead,
    SchedulingLink,
    SchedulingLinkCreate,
    SchedulingLinkRead,
    SchedulingLinkUpdate,
)
from app.services.calendar_service import CalendarService

router = APIRouter()


# ==================== OAuth Endpoints ====================


@router.get("/oauth/{provider}/url")
async def get_oauth_url(
    provider: CalendarProvider,
    request: Request,
    current_user: CurrentUserDep,
):
    """Get OAuth authorization URL for a calendar provider."""
    redirect_uri = str(request.url_for("oauth_callback", provider=provider.value))
    state = str(current_user.id)  # Use user ID as state

    if provider == CalendarProvider.GOOGLE:
        from app.services.calendar_service import CalendarService
        service = CalendarService(None)
        url = service.get_google_auth_url(redirect_uri, state)
    else:
        from app.services.calendar_service import CalendarService
        service = CalendarService(None)
        url = service.get_outlook_auth_url(redirect_uri, state)

    return {"url": url}


@router.get("/oauth/{provider}/callback")
async def oauth_callback(
    provider: CalendarProvider,
    code: str,
    state: str,
    request: Request,
    session: SessionDep,
):
    """Handle OAuth callback from calendar provider."""
    redirect_uri = str(request.url_for("oauth_callback", provider=provider.value))
    service = CalendarService(session)

    try:
        if provider == CalendarProvider.GOOGLE:
            tokens = await service.exchange_google_code(code, redirect_uri)
            user_info = await service.get_google_user_info(tokens["access_token"])
        else:
            tokens = await service.exchange_outlook_code(code, redirect_uri)
            user_info = await service.get_outlook_user_info(tokens["access_token"])

        # Create or update connection
        user_id = UUID(state)
        statement = select(CalendarConnection).where(
            CalendarConnection.owner_id == user_id,
            CalendarConnection.provider == provider,
        )
        existing = session.exec(statement).first()

        if existing:
            existing.access_token = tokens["access_token"]
            existing.refresh_token = tokens.get("refresh_token")
            existing.token_expires_at = datetime.utcnow() + timedelta(
                seconds=tokens.get("expires_in", 3600)
            )
            existing.provider_email = user_info.get("email")
            existing.calendar_id = user_info.get("calendar_id")
            existing.status = CalendarConnectionStatus.ACTIVE
            existing.error_count = 0
            session.add(existing)
        else:
            connection = CalendarConnection(
                owner_id=user_id,
                provider=provider,
                access_token=tokens["access_token"],
                refresh_token=tokens.get("refresh_token"),
                token_expires_at=datetime.utcnow() + timedelta(
                    seconds=tokens.get("expires_in", 3600)
                ),
                provider_email=user_info.get("email"),
                calendar_id=user_info.get("calendar_id"),
            )
            session.add(connection)

        session.commit()

        # Redirect to settings page
        return {"status": "success", "message": f"{provider.value} calendar connected"}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== Connection Management ====================


@router.get("/connections", response_model=list[CalendarConnectionRead])
async def list_connections(
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """List all calendar connections for current user."""
    statement = select(CalendarConnection).where(
        CalendarConnection.owner_id == current_user.id
    )
    connections = session.exec(statement).all()
    return connections


@router.get("/connections/{connection_id}", response_model=CalendarConnectionRead)
async def get_connection(
    connection_id: UUID,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Get a specific calendar connection."""
    connection = session.get(CalendarConnection, connection_id)
    if not connection or connection.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Connection not found")
    return connection


@router.patch("/connections/{connection_id}", response_model=CalendarConnectionRead)
async def update_connection(
    connection_id: UUID,
    data: CalendarConnectionUpdate,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Update a calendar connection."""
    connection = session.get(CalendarConnection, connection_id)
    if not connection or connection.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Connection not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(connection, key, value)

    session.add(connection)
    session.commit()
    session.refresh(connection)
    return connection


@router.delete("/connections/{connection_id}")
async def delete_connection(
    connection_id: UUID,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Disconnect a calendar."""
    connection = session.get(CalendarConnection, connection_id)
    if not connection or connection.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Connection not found")

    session.delete(connection)
    session.commit()
    return {"status": "success", "message": "Calendar disconnected"}


@router.post("/connections/{connection_id}/sync")
async def sync_connection(
    connection_id: UUID,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Manually trigger sync for a calendar connection."""
    connection = session.get(CalendarConnection, connection_id)
    if not connection or connection.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Connection not found")

    service = CalendarService(session)

    try:
        if connection.provider == CalendarProvider.GOOGLE:
            events = await service.sync_google_events(connection)
        else:
            events = await service.sync_outlook_events(connection)

        return {"status": "success", "synced_events": len(events)}

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ==================== Events ====================


@router.get("/events", response_model=list[CalendarEventRead])
async def list_events(
    current_user: CurrentUserDep,
    session: SessionDep,
    connection_id: Optional[UUID] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    contact_id: Optional[UUID] = None,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
):
    """List calendar events for current user."""
    statement = select(CalendarEvent).where(
        CalendarEvent.owner_id == current_user.id
    )

    if connection_id:
        statement = statement.where(CalendarEvent.connection_id == connection_id)
    if start_date:
        statement = statement.where(CalendarEvent.start_time >= start_date)
    if end_date:
        statement = statement.where(CalendarEvent.end_time <= end_date)
    if contact_id:
        statement = statement.where(CalendarEvent.contact_id == contact_id)

    statement = statement.order_by(CalendarEvent.start_time)
    statement = statement.offset(skip).limit(limit)

    events = session.exec(statement).all()
    return events


@router.post("/events", response_model=CalendarEventRead)
async def create_event(
    data: CalendarEventCreate,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Create a new calendar event."""
    connection = session.get(CalendarConnection, data.connection_id)
    if not connection or connection.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Calendar connection not found")

    event = CalendarEvent(
        owner_id=current_user.id,
        **data.model_dump(),
    )
    session.add(event)
    session.commit()
    session.refresh(event)

    # Push to external calendar
    service = CalendarService(session)
    try:
        if connection.provider == CalendarProvider.GOOGLE:
            event = await service.create_google_event(connection, event)
        else:
            event = await service.create_outlook_event(connection, event)
    except Exception as e:
        # Event created locally but failed to sync
        event.sync_status = "pending"
        session.add(event)
        session.commit()

    return event


@router.get("/events/{event_id}", response_model=CalendarEventRead)
async def get_event(
    event_id: UUID,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Get a specific calendar event."""
    event = session.get(CalendarEvent, event_id)
    if not event or event.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Event not found")
    return event


@router.patch("/events/{event_id}", response_model=CalendarEventRead)
async def update_event(
    event_id: UUID,
    data: CalendarEventUpdate,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Update a calendar event."""
    event = session.get(CalendarEvent, event_id)
    if not event or event.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Event not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(event, key, value)

    session.add(event)
    session.commit()
    session.refresh(event)
    return event


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: UUID,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Delete a calendar event."""
    event = session.get(CalendarEvent, event_id)
    if not event or event.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Event not found")

    session.delete(event)
    session.commit()
    return {"status": "success", "message": "Event deleted"}


@router.post("/events/{event_id}/log-activity")
async def log_event_as_activity(
    event_id: UUID,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Create a CRM activity from a calendar event."""
    event = session.get(CalendarEvent, event_id)
    if not event or event.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.activity_id:
        raise HTTPException(status_code=400, detail="Activity already exists for this event")

    service = CalendarService(session)
    activity = service.create_activity_from_event(event)

    return {"status": "success", "activity_id": str(activity.id)}


# ==================== Scheduling Links ====================


@router.get("/scheduling-links", response_model=list[SchedulingLinkRead])
async def list_scheduling_links(
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """List all scheduling links for current user."""
    statement = select(SchedulingLink).where(
        SchedulingLink.owner_id == current_user.id
    )
    links = session.exec(statement).all()
    return links


@router.post("/scheduling-links", response_model=SchedulingLinkRead)
async def create_scheduling_link(
    data: SchedulingLinkCreate,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Create a new scheduling link."""
    # Check if slug is unique
    statement = select(SchedulingLink).where(SchedulingLink.slug == data.slug)
    existing = session.exec(statement).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already in use")

    link = SchedulingLink(
        owner_id=current_user.id,
        **data.model_dump(),
    )
    session.add(link)
    session.commit()
    session.refresh(link)
    return link


@router.get("/scheduling-links/{link_id}", response_model=SchedulingLinkRead)
async def get_scheduling_link(
    link_id: UUID,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Get a specific scheduling link."""
    link = session.get(SchedulingLink, link_id)
    if not link or link.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scheduling link not found")
    return link


@router.patch("/scheduling-links/{link_id}", response_model=SchedulingLinkRead)
async def update_scheduling_link(
    link_id: UUID,
    data: SchedulingLinkUpdate,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Update a scheduling link."""
    link = session.get(SchedulingLink, link_id)
    if not link or link.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scheduling link not found")

    # Check slug uniqueness if changing
    if data.slug and data.slug != link.slug:
        statement = select(SchedulingLink).where(SchedulingLink.slug == data.slug)
        existing = session.exec(statement).first()
        if existing:
            raise HTTPException(status_code=400, detail="Slug already in use")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(link, key, value)

    session.add(link)
    session.commit()
    session.refresh(link)
    return link


@router.delete("/scheduling-links/{link_id}")
async def delete_scheduling_link(
    link_id: UUID,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Delete a scheduling link."""
    link = session.get(SchedulingLink, link_id)
    if not link or link.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scheduling link not found")

    session.delete(link)
    session.commit()
    return {"status": "success", "message": "Scheduling link deleted"}


# ==================== Public Booking Endpoints ====================


@router.get("/book/{slug}")
async def get_booking_page(
    slug: str,
    session: SessionDep,
):
    """Get public scheduling link info for booking page."""
    statement = select(SchedulingLink).where(
        SchedulingLink.slug == slug,
        SchedulingLink.is_active == True,
    )
    link = session.exec(statement).first()
    if not link:
        raise HTTPException(status_code=404, detail="Scheduling link not found")

    # Get owner name
    from app.models.user import User
    owner = session.get(User, link.owner_id)

    return {
        "name": link.name,
        "description": link.description,
        "duration_minutes": link.duration_minutes,
        "timezone": link.timezone,
        "questions": link.questions,
        "owner_name": owner.username if owner else "Unknown",
    }


@router.get("/book/{slug}/slots")
async def get_available_slots(
    slug: str,
    date: str,
    session: SessionDep,
):
    """Get available time slots for a specific date."""
    statement = select(SchedulingLink).where(
        SchedulingLink.slug == slug,
        SchedulingLink.is_active == True,
    )
    link = session.exec(statement).first()
    if not link:
        raise HTTPException(status_code=404, detail="Scheduling link not found")

    try:
        target_date = datetime.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    service = CalendarService(session)
    slots = service.get_available_slots(link, target_date)

    return {"date": date, "slots": slots}


@router.post("/book/{slug}")
async def book_meeting(
    slug: str,
    data: ScheduledMeetingCreate,
    session: SessionDep,
):
    """Book a meeting through a scheduling link."""
    statement = select(SchedulingLink).where(
        SchedulingLink.slug == slug,
        SchedulingLink.is_active == True,
    )
    link = session.exec(statement).first()
    if not link:
        raise HTTPException(status_code=404, detail="Scheduling link not found")

    # Verify the slot is available
    service = CalendarService(session)
    slots = service.get_available_slots(link, data.start_time.replace(hour=0, minute=0))
    slot_match = any(
        s["start"] == data.start_time.isoformat()
        for s in slots
    )
    if not slot_match:
        raise HTTPException(status_code=400, detail="Selected time slot is not available")

    # Create booking
    booking = ScheduledMeeting(
        owner_id=link.owner_id,
        link_id=link.id,
        guest_name=data.guest_name,
        guest_email=data.guest_email,
        guest_phone=data.guest_phone,
        guest_notes=data.guest_notes,
        start_time=data.start_time,
        end_time=data.end_time,
        timezone=data.timezone,
        responses=data.responses,
    )

    booking = service.book_meeting(link, booking)

    # TODO: Send confirmation emails, create calendar event

    return {
        "status": "success",
        "booking_id": str(booking.id),
        "message": "Meeting booked successfully",
    }


# ==================== Scheduled Meetings ====================


@router.get("/scheduled-meetings", response_model=list[ScheduledMeetingRead])
async def list_scheduled_meetings(
    current_user: CurrentUserDep,
    session: SessionDep,
    status: Optional[str] = None,
    upcoming_only: bool = False,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, le=100),
):
    """List scheduled meetings for current user."""
    statement = select(ScheduledMeeting).where(
        ScheduledMeeting.owner_id == current_user.id
    )

    if status:
        statement = statement.where(ScheduledMeeting.status == status)
    if upcoming_only:
        statement = statement.where(ScheduledMeeting.start_time >= datetime.utcnow())

    statement = statement.order_by(ScheduledMeeting.start_time)
    statement = statement.offset(skip).limit(limit)

    meetings = session.exec(statement).all()
    return meetings


@router.get("/scheduled-meetings/{meeting_id}", response_model=ScheduledMeetingRead)
async def get_scheduled_meeting(
    meeting_id: UUID,
    current_user: CurrentUserDep,
    session: SessionDep,
):
    """Get a specific scheduled meeting."""
    meeting = session.get(ScheduledMeeting, meeting_id)
    if not meeting or meeting.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.post("/scheduled-meetings/{meeting_id}/cancel")
async def cancel_scheduled_meeting(
    meeting_id: UUID,
    reason: Optional[str] = None,
    current_user: CurrentUserDep = None,
    session: SessionDep = None,
):
    """Cancel a scheduled meeting."""
    meeting = session.get(ScheduledMeeting, meeting_id)
    if not meeting or meeting.owner_id != current_user.id:
        raise HTTPException(status_code=404, detail="Meeting not found")

    meeting.status = "cancelled"
    meeting.cancelled_at = datetime.utcnow()
    meeting.cancellation_reason = reason

    session.add(meeting)
    session.commit()

    # TODO: Send cancellation emails

    return {"status": "success", "message": "Meeting cancelled"}
