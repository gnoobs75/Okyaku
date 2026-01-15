from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from sqlmodel import func, select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.social_inbox import (
    MessageStatus,
    MessageType,
    SocialMessage,
    SocialMessageRead,
    SocialMessageReply,
    SocialMessageReplyCreate,
    SocialMessageReplyRead,
)
from app.models.social_media import SocialAccount, SocialPlatform
from app.services.social_inbox_service import social_inbox_service

router = APIRouter()


@router.get("/messages", response_model=list[SocialMessageRead])
async def list_messages(
    session: SessionDep,
    current_user: CurrentUserDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    account_id: Optional[UUID] = Query(default=None),
    platform: Optional[SocialPlatform] = Query(default=None),
    message_type: Optional[MessageType] = Query(default=None),
    status_filter: Optional[MessageStatus] = Query(default=None, alias="status"),
    search: Optional[str] = Query(default=None),
) -> list[SocialMessage]:
    """List social messages with filtering."""
    user_id = UUID(current_user.sub)

    # Get user's accounts
    accounts_query = select(SocialAccount.id).where(SocialAccount.owner_id == user_id)
    if account_id:
        accounts_query = accounts_query.where(SocialAccount.id == account_id)
    account_ids = [a for a in session.exec(accounts_query).all()]

    if not account_ids:
        return []

    query = select(SocialMessage).where(SocialMessage.account_id.in_(account_ids))

    if platform:
        query = query.where(SocialMessage.platform == platform)
    if message_type:
        query = query.where(SocialMessage.message_type == message_type)
    if status_filter:
        query = query.where(SocialMessage.status == status_filter)
    if search:
        query = query.where(
            SocialMessage.content.ilike(f"%{search}%")
            | SocialMessage.sender_username.ilike(f"%{search}%")
        )

    query = query.offset(skip).limit(limit).order_by(SocialMessage.received_at.desc())

    return list(session.exec(query).all())


@router.get("/messages/stats")
async def get_inbox_stats(
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Get inbox statistics."""
    user_id = UUID(current_user.sub)

    # Get user's accounts
    accounts_query = select(SocialAccount.id).where(SocialAccount.owner_id == user_id)
    account_ids = [a for a in session.exec(accounts_query).all()]

    if not account_ids:
        return {
            "total": 0,
            "unread": 0,
            "responded": 0,
            "by_platform": {},
            "by_type": {},
        }

    base_query = select(SocialMessage).where(SocialMessage.account_id.in_(account_ids))

    total = session.exec(
        select(func.count(SocialMessage.id)).where(
            SocialMessage.account_id.in_(account_ids)
        )
    ).first() or 0

    unread = session.exec(
        select(func.count(SocialMessage.id)).where(
            SocialMessage.account_id.in_(account_ids),
            SocialMessage.status == MessageStatus.UNREAD,
        )
    ).first() or 0

    responded = session.exec(
        select(func.count(SocialMessage.id)).where(
            SocialMessage.account_id.in_(account_ids),
            SocialMessage.status == MessageStatus.RESPONDED,
        )
    ).first() or 0

    # By platform
    by_platform = {}
    for platform in SocialPlatform:
        count = session.exec(
            select(func.count(SocialMessage.id)).where(
                SocialMessage.account_id.in_(account_ids),
                SocialMessage.platform == platform,
            )
        ).first() or 0
        by_platform[platform.value] = count

    # By type
    by_type = {}
    for msg_type in MessageType:
        count = session.exec(
            select(func.count(SocialMessage.id)).where(
                SocialMessage.account_id.in_(account_ids),
                SocialMessage.message_type == msg_type,
            )
        ).first() or 0
        by_type[msg_type.value] = count

    return {
        "total": total,
        "unread": unread,
        "responded": responded,
        "by_platform": by_platform,
        "by_type": by_type,
    }


@router.get("/messages/{message_id}", response_model=SocialMessageRead)
async def get_message(
    message_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> SocialMessage:
    """Get a specific message."""
    message = session.get(SocialMessage, message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    # Verify ownership
    account = session.get(SocialAccount, message.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    return message


@router.post("/messages/{message_id}/read")
async def mark_as_read(
    message_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Mark a message as read."""
    message = session.get(SocialMessage, message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    # Verify ownership
    account = session.get(SocialAccount, message.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    if message.status == MessageStatus.UNREAD:
        message.status = MessageStatus.READ
        message.read_at = datetime.utcnow()
        session.add(message)
        session.commit()

    return {"status": "read"}


@router.post("/messages/{message_id}/archive")
async def archive_message(
    message_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Archive a message."""
    message = session.get(SocialMessage, message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    # Verify ownership
    account = session.get(SocialAccount, message.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    message.status = MessageStatus.ARCHIVED
    message.archived_at = datetime.utcnow()
    session.add(message)
    session.commit()

    return {"status": "archived"}


@router.post("/messages/{message_id}/assign")
async def assign_message(
    message_id: UUID,
    user_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Assign a message to a team member."""
    message = session.get(SocialMessage, message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    # Verify ownership
    account = session.get(SocialAccount, message.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    message.assigned_to = user_id
    session.add(message)
    session.commit()

    return {"status": "assigned", "assigned_to": str(user_id)}


@router.post("/messages/{message_id}/link-contact")
async def link_to_contact(
    message_id: UUID,
    contact_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Link a message to a CRM contact."""
    message = session.get(SocialMessage, message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    # Verify ownership
    account = session.get(SocialAccount, message.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    message.contact_id = contact_id
    session.add(message)
    session.commit()

    return {"status": "linked", "contact_id": str(contact_id)}


# ============ Replies ============


@router.get("/messages/{message_id}/replies", response_model=list[SocialMessageReplyRead])
async def list_replies(
    message_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> list[SocialMessageReply]:
    """List replies to a message."""
    message = session.get(SocialMessage, message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    # Verify ownership
    account = session.get(SocialAccount, message.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    return list(
        session.exec(
            select(SocialMessageReply)
            .where(SocialMessageReply.message_id == message_id)
            .order_by(SocialMessageReply.sent_at.asc())
        ).all()
    )


@router.post("/messages/{message_id}/reply", response_model=SocialMessageReplyRead)
async def send_reply(
    message_id: UUID,
    reply_data: SocialMessageReplyCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> SocialMessageReply:
    """Send a reply to a message."""
    message = session.get(SocialMessage, message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    # Verify ownership
    account = session.get(SocialAccount, message.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    success, error = await social_inbox_service.send_reply(
        session=session,
        message=message,
        content=reply_data.content,
        user_id=UUID(current_user.sub),
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to send reply: {error}",
        )

    # Get the reply we just created
    reply = session.exec(
        select(SocialMessageReply)
        .where(SocialMessageReply.message_id == message_id)
        .order_by(SocialMessageReply.sent_at.desc())
    ).first()

    return reply


# ============ Sync ============


@router.post("/sync")
async def sync_messages(
    background_tasks: BackgroundTasks,
    session: SessionDep,
    current_user: CurrentUserDep,
    account_id: Optional[UUID] = Query(default=None),
) -> dict:
    """Sync messages from social platforms."""
    user_id = UUID(current_user.sub)

    # Get accounts to sync
    query = select(SocialAccount).where(SocialAccount.owner_id == user_id)
    if account_id:
        query = query.where(SocialAccount.id == account_id)

    accounts = session.exec(query).all()

    if not accounts:
        return {"status": "no_accounts"}

    # Sync each account in background
    for account in accounts:
        background_tasks.add_task(
            _sync_account_messages,
            account_id=account.id,
        )

    return {"status": "syncing", "account_count": len(accounts)}


async def _sync_account_messages(account_id: UUID) -> None:
    """Background task to sync messages for an account."""
    from app.db.session import get_session

    with get_session() as session:
        count = await social_inbox_service.fetch_all_messages(session, account_id)
        logger = __import__("app.core.logging", fromlist=["get_logger"]).get_logger(__name__)
        logger.info(f"Synced {count} messages for account {account_id}")
