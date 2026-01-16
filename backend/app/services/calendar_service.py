"""Calendar integration service for Google and Outlook OAuth and sync."""

import logging
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

import httpx
from sqlmodel import Session, select

from app.core.config import settings
from app.models.activity import Activity, ActivityType
from app.models.calendar import (
    CalendarConnection,
    CalendarConnectionStatus,
    CalendarEvent,
    CalendarProvider,
    EventSyncStatus,
    ScheduledMeeting,
    SchedulingLink,
)

logger = logging.getLogger(__name__)


# OAuth Configuration
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_CALENDAR_API = "https://www.googleapis.com/calendar/v3"
GOOGLE_SCOPES = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
]

OUTLOOK_AUTH_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize"
OUTLOOK_TOKEN_URL = "https://login.microsoftonline.com/common/oauth2/v2.0/token"
OUTLOOK_CALENDAR_API = "https://graph.microsoft.com/v1.0"
OUTLOOK_SCOPES = [
    "Calendars.ReadWrite",
    "User.Read",
    "offline_access",
]


class CalendarService:
    """Service for calendar OAuth and synchronization."""

    def __init__(self, session: Session):
        self.session = session

    # ==================== OAuth Flow ====================

    def get_google_auth_url(self, redirect_uri: str, state: str) -> str:
        """Generate Google OAuth authorization URL."""
        params = {
            "client_id": settings.GOOGLE_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(GOOGLE_SCOPES),
            "access_type": "offline",
            "prompt": "consent",
            "state": state,
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{GOOGLE_AUTH_URL}?{query}"

    def get_outlook_auth_url(self, redirect_uri: str, state: str) -> str:
        """Generate Outlook OAuth authorization URL."""
        params = {
            "client_id": settings.OUTLOOK_CLIENT_ID,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(OUTLOOK_SCOPES),
            "state": state,
        }
        query = "&".join(f"{k}={v}" for k, v in params.items())
        return f"{OUTLOOK_AUTH_URL}?{query}"

    async def exchange_google_code(
        self, code: str, redirect_uri: str
    ) -> dict:
        """Exchange Google authorization code for tokens."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            response.raise_for_status()
            return response.json()

    async def exchange_outlook_code(
        self, code: str, redirect_uri: str
    ) -> dict:
        """Exchange Outlook authorization code for tokens."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                OUTLOOK_TOKEN_URL,
                data={
                    "client_id": settings.OUTLOOK_CLIENT_ID,
                    "client_secret": settings.OUTLOOK_CLIENT_SECRET,
                    "code": code,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                },
            )
            response.raise_for_status()
            return response.json()

    async def refresh_google_token(self, connection: CalendarConnection) -> CalendarConnection:
        """Refresh Google OAuth token."""
        if not connection.refresh_token:
            connection.status = CalendarConnectionStatus.EXPIRED
            self.session.add(connection)
            self.session.commit()
            raise ValueError("No refresh token available")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                GOOGLE_TOKEN_URL,
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "refresh_token": connection.refresh_token,
                    "grant_type": "refresh_token",
                },
            )

            if response.status_code != 200:
                connection.status = CalendarConnectionStatus.ERROR
                connection.last_error = response.text
                connection.error_count += 1
                self.session.add(connection)
                self.session.commit()
                raise ValueError(f"Token refresh failed: {response.text}")

            tokens = response.json()
            connection.access_token = tokens["access_token"]
            connection.token_expires_at = datetime.utcnow() + timedelta(
                seconds=tokens.get("expires_in", 3600)
            )
            connection.status = CalendarConnectionStatus.ACTIVE
            connection.error_count = 0
            self.session.add(connection)
            self.session.commit()
            return connection

    async def refresh_outlook_token(self, connection: CalendarConnection) -> CalendarConnection:
        """Refresh Outlook OAuth token."""
        if not connection.refresh_token:
            connection.status = CalendarConnectionStatus.EXPIRED
            self.session.add(connection)
            self.session.commit()
            raise ValueError("No refresh token available")

        async with httpx.AsyncClient() as client:
            response = await client.post(
                OUTLOOK_TOKEN_URL,
                data={
                    "client_id": settings.OUTLOOK_CLIENT_ID,
                    "client_secret": settings.OUTLOOK_CLIENT_SECRET,
                    "refresh_token": connection.refresh_token,
                    "grant_type": "refresh_token",
                },
            )

            if response.status_code != 200:
                connection.status = CalendarConnectionStatus.ERROR
                connection.last_error = response.text
                connection.error_count += 1
                self.session.add(connection)
                self.session.commit()
                raise ValueError(f"Token refresh failed: {response.text}")

            tokens = response.json()
            connection.access_token = tokens["access_token"]
            if "refresh_token" in tokens:
                connection.refresh_token = tokens["refresh_token"]
            connection.token_expires_at = datetime.utcnow() + timedelta(
                seconds=tokens.get("expires_in", 3600)
            )
            connection.status = CalendarConnectionStatus.ACTIVE
            connection.error_count = 0
            self.session.add(connection)
            self.session.commit()
            return connection

    async def ensure_valid_token(self, connection: CalendarConnection) -> CalendarConnection:
        """Ensure the connection has a valid access token, refreshing if needed."""
        if connection.token_expires_at and connection.token_expires_at > datetime.utcnow():
            return connection

        if connection.provider == CalendarProvider.GOOGLE:
            return await self.refresh_google_token(connection)
        else:
            return await self.refresh_outlook_token(connection)

    # ==================== Calendar Info ====================

    async def get_google_user_info(self, access_token: str) -> dict:
        """Get Google user info and primary calendar."""
        async with httpx.AsyncClient() as client:
            # Get user email
            response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            user_info = response.json()

            # Get primary calendar
            cal_response = await client.get(
                f"{GOOGLE_CALENDAR_API}/calendars/primary",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            cal_response.raise_for_status()
            calendar = cal_response.json()

            return {
                "email": user_info.get("email"),
                "calendar_id": calendar.get("id"),
            }

    async def get_outlook_user_info(self, access_token: str) -> dict:
        """Get Outlook user info."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{OUTLOOK_CALENDAR_API}/me",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            user_info = response.json()

            return {
                "email": user_info.get("mail") or user_info.get("userPrincipalName"),
                "calendar_id": "primary",  # Outlook uses different approach
            }

    # ==================== Event Sync ====================

    async def sync_google_events(
        self, connection: CalendarConnection, days_back: int = 30, days_forward: int = 90
    ) -> list[CalendarEvent]:
        """Sync events from Google Calendar."""
        connection = await self.ensure_valid_token(connection)

        time_min = (datetime.utcnow() - timedelta(days=days_back)).isoformat() + "Z"
        time_max = (datetime.utcnow() + timedelta(days=days_forward)).isoformat() + "Z"

        async with httpx.AsyncClient() as client:
            params = {
                "timeMin": time_min,
                "timeMax": time_max,
                "singleEvents": "true",
                "orderBy": "startTime",
                "maxResults": 250,
            }
            if connection.sync_token:
                params["syncToken"] = connection.sync_token

            response = await client.get(
                f"{GOOGLE_CALENDAR_API}/calendars/{connection.calendar_id or 'primary'}/events",
                headers={"Authorization": f"Bearer {connection.access_token}"},
                params=params,
            )
            response.raise_for_status()
            data = response.json()

        synced_events = []
        for item in data.get("items", []):
            event = await self._upsert_google_event(connection, item)
            if event:
                synced_events.append(event)

        # Save sync token for incremental sync
        if "nextSyncToken" in data:
            connection.sync_token = data["nextSyncToken"]
        connection.last_synced_at = datetime.utcnow()
        self.session.add(connection)
        self.session.commit()

        return synced_events

    async def _upsert_google_event(
        self, connection: CalendarConnection, google_event: dict
    ) -> Optional[CalendarEvent]:
        """Create or update a calendar event from Google data."""
        external_id = google_event.get("id")
        if not external_id:
            return None

        # Check if event already exists
        statement = select(CalendarEvent).where(
            CalendarEvent.connection_id == connection.id,
            CalendarEvent.external_id == external_id,
        )
        existing = self.session.exec(statement).first()

        # Parse times
        start = google_event.get("start", {})
        end = google_event.get("end", {})
        all_day = "date" in start

        if all_day:
            start_time = datetime.fromisoformat(start["date"])
            end_time = datetime.fromisoformat(end["date"])
        else:
            start_time = datetime.fromisoformat(start["dateTime"].replace("Z", "+00:00"))
            end_time = datetime.fromisoformat(end["dateTime"].replace("Z", "+00:00"))

        # Parse attendees
        attendees = {}
        for attendee in google_event.get("attendees", []):
            email = attendee.get("email")
            if email:
                attendees[email] = {
                    "name": attendee.get("displayName"),
                    "response": attendee.get("responseStatus"),
                }

        event_data = {
            "title": google_event.get("summary", "Untitled"),
            "description": google_event.get("description"),
            "location": google_event.get("location"),
            "start_time": start_time,
            "end_time": end_time,
            "all_day": all_day,
            "timezone": start.get("timeZone", "UTC"),
            "is_recurring": bool(google_event.get("recurringEventId")),
            "recurring_event_id": google_event.get("recurringEventId"),
            "attendees": attendees,
            "meeting_link": google_event.get("hangoutLink"),
            "external_link": google_event.get("htmlLink"),
            "sync_status": EventSyncStatus.SYNCED,
            "last_synced_at": datetime.utcnow(),
        }

        if existing:
            for key, value in event_data.items():
                setattr(existing, key, value)
            self.session.add(existing)
            self.session.commit()
            self.session.refresh(existing)
            return existing
        else:
            event = CalendarEvent(
                owner_id=connection.owner_id,
                connection_id=connection.id,
                external_id=external_id,
                **event_data,
            )
            self.session.add(event)
            self.session.commit()
            self.session.refresh(event)
            return event

    async def sync_outlook_events(
        self, connection: CalendarConnection, days_back: int = 30, days_forward: int = 90
    ) -> list[CalendarEvent]:
        """Sync events from Outlook Calendar."""
        connection = await self.ensure_valid_token(connection)

        start_date = (datetime.utcnow() - timedelta(days=days_back)).isoformat() + "Z"
        end_date = (datetime.utcnow() + timedelta(days=days_forward)).isoformat() + "Z"

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{OUTLOOK_CALENDAR_API}/me/calendarview",
                headers={"Authorization": f"Bearer {connection.access_token}"},
                params={
                    "startDateTime": start_date,
                    "endDateTime": end_date,
                    "$top": 250,
                    "$orderby": "start/dateTime",
                },
            )
            response.raise_for_status()
            data = response.json()

        synced_events = []
        for item in data.get("value", []):
            event = await self._upsert_outlook_event(connection, item)
            if event:
                synced_events.append(event)

        connection.last_synced_at = datetime.utcnow()
        self.session.add(connection)
        self.session.commit()

        return synced_events

    async def _upsert_outlook_event(
        self, connection: CalendarConnection, outlook_event: dict
    ) -> Optional[CalendarEvent]:
        """Create or update a calendar event from Outlook data."""
        external_id = outlook_event.get("id")
        if not external_id:
            return None

        # Check if event already exists
        statement = select(CalendarEvent).where(
            CalendarEvent.connection_id == connection.id,
            CalendarEvent.external_id == external_id,
        )
        existing = self.session.exec(statement).first()

        # Parse times
        start = outlook_event.get("start", {})
        end = outlook_event.get("end", {})
        all_day = outlook_event.get("isAllDay", False)

        start_time = datetime.fromisoformat(start["dateTime"])
        end_time = datetime.fromisoformat(end["dateTime"])

        # Parse attendees
        attendees = {}
        for attendee in outlook_event.get("attendees", []):
            email = attendee.get("emailAddress", {}).get("address")
            if email:
                attendees[email] = {
                    "name": attendee.get("emailAddress", {}).get("name"),
                    "response": attendee.get("status", {}).get("response"),
                }

        # Get meeting link
        meeting_link = None
        if outlook_event.get("onlineMeeting"):
            meeting_link = outlook_event["onlineMeeting"].get("joinUrl")

        event_data = {
            "title": outlook_event.get("subject", "Untitled"),
            "description": outlook_event.get("bodyPreview"),
            "location": outlook_event.get("location", {}).get("displayName"),
            "start_time": start_time,
            "end_time": end_time,
            "all_day": all_day,
            "timezone": start.get("timeZone", "UTC"),
            "is_recurring": bool(outlook_event.get("seriesMasterId")),
            "recurring_event_id": outlook_event.get("seriesMasterId"),
            "attendees": attendees,
            "meeting_link": meeting_link,
            "external_link": outlook_event.get("webLink"),
            "sync_status": EventSyncStatus.SYNCED,
            "last_synced_at": datetime.utcnow(),
        }

        if existing:
            for key, value in event_data.items():
                setattr(existing, key, value)
            self.session.add(existing)
            self.session.commit()
            self.session.refresh(existing)
            return existing
        else:
            event = CalendarEvent(
                owner_id=connection.owner_id,
                connection_id=connection.id,
                external_id=external_id,
                **event_data,
            )
            self.session.add(event)
            self.session.commit()
            self.session.refresh(event)
            return event

    # ==================== Push Events ====================

    async def create_google_event(
        self, connection: CalendarConnection, event: CalendarEvent
    ) -> CalendarEvent:
        """Create an event in Google Calendar."""
        connection = await self.ensure_valid_token(connection)

        event_body = {
            "summary": event.title,
            "description": event.description,
            "location": event.location,
            "start": {
                "dateTime": event.start_time.isoformat(),
                "timeZone": event.timezone,
            },
            "end": {
                "dateTime": event.end_time.isoformat(),
                "timeZone": event.timezone,
            },
        }

        if event.all_day:
            event_body["start"] = {"date": event.start_time.date().isoformat()}
            event_body["end"] = {"date": event.end_time.date().isoformat()}

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{GOOGLE_CALENDAR_API}/calendars/{connection.calendar_id or 'primary'}/events",
                headers={"Authorization": f"Bearer {connection.access_token}"},
                json=event_body,
            )
            response.raise_for_status()
            google_event = response.json()

        event.external_id = google_event.get("id")
        event.external_link = google_event.get("htmlLink")
        event.sync_status = EventSyncStatus.SYNCED
        event.last_synced_at = datetime.utcnow()
        self.session.add(event)
        self.session.commit()
        self.session.refresh(event)
        return event

    async def create_outlook_event(
        self, connection: CalendarConnection, event: CalendarEvent
    ) -> CalendarEvent:
        """Create an event in Outlook Calendar."""
        connection = await self.ensure_valid_token(connection)

        event_body = {
            "subject": event.title,
            "body": {"contentType": "text", "content": event.description or ""},
            "start": {
                "dateTime": event.start_time.isoformat(),
                "timeZone": event.timezone,
            },
            "end": {
                "dateTime": event.end_time.isoformat(),
                "timeZone": event.timezone,
            },
            "isAllDay": event.all_day,
        }

        if event.location:
            event_body["location"] = {"displayName": event.location}

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{OUTLOOK_CALENDAR_API}/me/events",
                headers={"Authorization": f"Bearer {connection.access_token}"},
                json=event_body,
            )
            response.raise_for_status()
            outlook_event = response.json()

        event.external_id = outlook_event.get("id")
        event.external_link = outlook_event.get("webLink")
        event.sync_status = EventSyncStatus.SYNCED
        event.last_synced_at = datetime.utcnow()
        self.session.add(event)
        self.session.commit()
        self.session.refresh(event)
        return event

    # ==================== Activity Logging ====================

    def create_activity_from_event(
        self, event: CalendarEvent
    ) -> Optional[Activity]:
        """Create a CRM activity from a calendar event."""
        if event.activity_id:
            return None  # Already linked

        # Determine activity type
        activity_type = ActivityType.MEETING
        if "call" in event.title.lower():
            activity_type = ActivityType.CALL

        activity = Activity(
            owner_id=event.owner_id,
            contact_id=event.contact_id,
            type=activity_type,
            subject=event.title,
            description=event.description,
            activity_date=event.start_time,
            duration_minutes=int((event.end_time - event.start_time).total_seconds() / 60),
        )
        self.session.add(activity)
        self.session.commit()
        self.session.refresh(activity)

        # Link activity to event
        event.activity_id = activity.id
        self.session.add(event)
        self.session.commit()

        return activity

    # ==================== Scheduling Links ====================

    def get_available_slots(
        self, link: SchedulingLink, date: datetime
    ) -> list[dict]:
        """Get available time slots for a scheduling link on a given date."""
        day_name = date.strftime("%A").lower()
        day_availability = link.availability.get(day_name, [])

        if not day_availability:
            return []

        # Get existing events for the day
        day_start = date.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)

        statement = select(CalendarEvent).where(
            CalendarEvent.owner_id == link.owner_id,
            CalendarEvent.start_time >= day_start,
            CalendarEvent.start_time < day_end,
        )
        existing_events = self.session.exec(statement).all()

        # Get existing bookings
        statement = select(ScheduledMeeting).where(
            ScheduledMeeting.link_id == link.id,
            ScheduledMeeting.start_time >= day_start,
            ScheduledMeeting.start_time < day_end,
            ScheduledMeeting.status != "cancelled",
        )
        existing_bookings = self.session.exec(statement).all()

        # Calculate blocked times
        blocked = []
        for event in existing_events:
            blocked.append({
                "start": event.start_time - timedelta(minutes=link.buffer_before),
                "end": event.end_time + timedelta(minutes=link.buffer_after),
            })
        for booking in existing_bookings:
            blocked.append({
                "start": booking.start_time - timedelta(minutes=link.buffer_before),
                "end": booking.end_time + timedelta(minutes=link.buffer_after),
            })

        # Generate available slots
        slots = []
        for window in day_availability:
            start_parts = window["start"].split(":")
            end_parts = window["end"].split(":")

            window_start = date.replace(
                hour=int(start_parts[0]), minute=int(start_parts[1]), second=0, microsecond=0
            )
            window_end = date.replace(
                hour=int(end_parts[0]), minute=int(end_parts[1]), second=0, microsecond=0
            )

            current = window_start
            while current + timedelta(minutes=link.duration_minutes) <= window_end:
                slot_end = current + timedelta(minutes=link.duration_minutes)

                # Check if slot conflicts with blocked times
                is_available = True
                for block in blocked:
                    if current < block["end"] and slot_end > block["start"]:
                        is_available = False
                        break

                # Check minimum notice
                if current < datetime.utcnow() + timedelta(hours=link.min_notice_hours):
                    is_available = False

                if is_available:
                    slots.append({
                        "start": current.isoformat(),
                        "end": slot_end.isoformat(),
                    })

                current += timedelta(minutes=15)  # 15-minute increments

        return slots

    def book_meeting(
        self, link: SchedulingLink, booking: ScheduledMeeting
    ) -> ScheduledMeeting:
        """Book a meeting through a scheduling link."""
        # Increment booking count
        link.booking_count += 1
        self.session.add(link)

        # Save booking
        self.session.add(booking)
        self.session.commit()
        self.session.refresh(booking)

        return booking
