from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query, status
from sqlmodel import func, select

from app.api.deps import CurrentUserDep, SessionDep
from app.models.social_media import (
    AccountStatus,
    MediaAttachmentCreate,
    MediaAttachmentRead,
    PostStatus,
    SocialAccount,
    SocialAccountCreate,
    SocialAccountRead,
    SocialMediaAttachment,
    SocialPlatform,
    SocialPost,
    SocialPostAnalytics,
    SocialPostCreate,
    SocialPostRead,
    SocialPostReadWithAnalytics,
    SocialPostUpdate,
)
from app.services.social_media_service import social_media_service

router = APIRouter()


# ============ Social Accounts ============


@router.get("/accounts", response_model=list[SocialAccountRead])
async def list_accounts(
    session: SessionDep,
    current_user: CurrentUserDep,
    platform: Optional[SocialPlatform] = Query(default=None),
) -> list[SocialAccount]:
    """List connected social media accounts."""
    user_id = UUID(current_user.sub)
    query = select(SocialAccount).where(SocialAccount.owner_id == user_id)

    if platform:
        query = query.where(SocialAccount.platform == platform)

    return list(session.exec(query).all())


@router.post("/accounts/connect", response_model=SocialAccountRead)
async def connect_account(
    account_data: SocialAccountCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> SocialAccount:
    """Connect a new social media account using OAuth."""
    try:
        account = await social_media_service.connect_account(
            session=session,
            platform=account_data.platform,
            authorization_code=account_data.authorization_code,
            redirect_uri=account_data.redirect_uri,
            owner_id=UUID(current_user.sub),
        )
        return account
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to connect account: {str(e)}",
        )


@router.get("/accounts/{account_id}", response_model=SocialAccountRead)
async def get_account(
    account_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> SocialAccount:
    """Get a social account by ID."""
    account = session.get(SocialAccount, account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    return account


@router.post("/accounts/{account_id}/refresh")
async def refresh_account_token(
    account_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Refresh the access token for an account."""
    account = session.get(SocialAccount, account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )

    success = await social_media_service.refresh_account_token(session, account)
    if success:
        return {"status": "refreshed"}
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to refresh token",
        )


@router.delete("/accounts/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def disconnect_account(
    account_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    """Disconnect (delete) a social media account."""
    account = session.get(SocialAccount, account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )

    # Delete associated posts and attachments
    posts = session.exec(
        select(SocialPost).where(SocialPost.account_id == account_id)
    ).all()

    for post in posts:
        # Delete attachments
        attachments = session.exec(
            select(SocialMediaAttachment).where(
                SocialMediaAttachment.post_id == post.id
            )
        ).all()
        for attachment in attachments:
            session.delete(attachment)

        # Delete analytics
        analytics = session.exec(
            select(SocialPostAnalytics).where(
                SocialPostAnalytics.post_id == post.id
            )
        ).first()
        if analytics:
            session.delete(analytics)

        session.delete(post)

    session.delete(account)
    session.commit()


# ============ Social Posts ============


@router.get("/posts", response_model=list[SocialPostReadWithAnalytics])
async def list_posts(
    session: SessionDep,
    current_user: CurrentUserDep,
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    account_id: Optional[UUID] = Query(default=None),
    status_filter: Optional[PostStatus] = Query(default=None, alias="status"),
) -> list[dict]:
    """List social posts with analytics."""
    user_id = UUID(current_user.sub)

    # Get user's accounts
    accounts_query = select(SocialAccount.id).where(SocialAccount.owner_id == user_id)
    if account_id:
        accounts_query = accounts_query.where(SocialAccount.id == account_id)
    account_ids = [a for a in session.exec(accounts_query).all()]

    if not account_ids:
        return []

    query = select(SocialPost).where(SocialPost.account_id.in_(account_ids))

    if status_filter:
        query = query.where(SocialPost.status == status_filter)

    query = query.offset(skip).limit(limit).order_by(SocialPost.created_at.desc())

    posts = session.exec(query).all()

    result = []
    for post in posts:
        post_dict = post.model_dump()

        # Get analytics
        analytics = session.exec(
            select(SocialPostAnalytics).where(SocialPostAnalytics.post_id == post.id)
        ).first()

        if analytics:
            post_dict["impressions"] = analytics.impressions
            post_dict["reach"] = analytics.reach
            post_dict["likes"] = analytics.likes
            post_dict["comments"] = analytics.comments
            post_dict["shares"] = analytics.shares
            post_dict["clicks"] = analytics.clicks
            post_dict["engagement_rate"] = analytics.engagement_rate

        result.append(post_dict)

    return result


@router.post("/posts", response_model=SocialPostRead, status_code=status.HTTP_201_CREATED)
async def create_post(
    post_data: SocialPostCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> SocialPost:
    """Create a new social post."""
    # Verify account ownership
    account = session.get(SocialAccount, post_data.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )

    post = SocialPost(
        **post_data.model_dump(),
        created_by=UUID(current_user.sub),
    )

    # Set initial status based on scheduling
    if post_data.scheduled_at:
        post.status = PostStatus.SCHEDULED

    session.add(post)
    session.commit()
    session.refresh(post)
    return post


@router.get("/posts/{post_id}", response_model=SocialPostReadWithAnalytics)
async def get_post(
    post_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Get a social post by ID with analytics."""
    post = session.get(SocialPost, post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    # Verify ownership
    account = session.get(SocialAccount, post.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    post_dict = post.model_dump()

    # Get analytics
    analytics = session.exec(
        select(SocialPostAnalytics).where(SocialPostAnalytics.post_id == post.id)
    ).first()

    if analytics:
        post_dict["impressions"] = analytics.impressions
        post_dict["reach"] = analytics.reach
        post_dict["likes"] = analytics.likes
        post_dict["comments"] = analytics.comments
        post_dict["shares"] = analytics.shares
        post_dict["clicks"] = analytics.clicks
        post_dict["engagement_rate"] = analytics.engagement_rate

    return post_dict


@router.patch("/posts/{post_id}", response_model=SocialPostRead)
async def update_post(
    post_id: UUID,
    post_data: SocialPostUpdate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> SocialPost:
    """Update a social post."""
    post = session.get(SocialPost, post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    # Verify ownership
    account = session.get(SocialAccount, post.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    if post.status not in [PostStatus.DRAFT, PostStatus.SCHEDULED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot update post in current status",
        )

    update_data = post_data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(post, key, value)

    # Update status if scheduling changed
    if post_data.scheduled_at:
        post.status = PostStatus.SCHEDULED
    elif post_data.scheduled_at is None and post.status == PostStatus.SCHEDULED:
        post.status = PostStatus.DRAFT

    session.add(post)
    session.commit()
    session.refresh(post)
    return post


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    """Delete a social post."""
    post = session.get(SocialPost, post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    # Verify ownership
    account = session.get(SocialAccount, post.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    # Delete attachments
    attachments = session.exec(
        select(SocialMediaAttachment).where(SocialMediaAttachment.post_id == post_id)
    ).all()
    for attachment in attachments:
        session.delete(attachment)

    # Delete analytics
    analytics = session.exec(
        select(SocialPostAnalytics).where(SocialPostAnalytics.post_id == post_id)
    ).first()
    if analytics:
        session.delete(analytics)

    session.delete(post)
    session.commit()


# ============ Post Actions ============


@router.post("/posts/{post_id}/publish")
async def publish_post_now(
    post_id: UUID,
    background_tasks: BackgroundTasks,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Publish a post immediately."""
    post = session.get(SocialPost, post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    # Verify ownership
    account = session.get(SocialAccount, post.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    if post.status not in [PostStatus.DRAFT, PostStatus.SCHEDULED, PostStatus.FAILED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Post cannot be published in current status",
        )

    # Update status
    post.status = PostStatus.PUBLISHING
    session.add(post)
    session.commit()

    # Publish in background
    background_tasks.add_task(_publish_post, post_id)

    return {"status": "publishing"}


async def _publish_post(post_id: UUID) -> None:
    """Background task to publish a post."""
    from app.db.session import get_session

    with get_session() as session:
        post = session.get(SocialPost, post_id)
        if post:
            await social_media_service.publish_post(session, post)


@router.post("/posts/{post_id}/schedule")
async def schedule_post(
    post_id: UUID,
    scheduled_at: datetime,
    session: SessionDep,
    current_user: CurrentUserDep,
    timezone: str = "UTC",
) -> dict:
    """Schedule a post for later publishing."""
    post = session.get(SocialPost, post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    # Verify ownership
    account = session.get(SocialAccount, post.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    if post.status not in [PostStatus.DRAFT, PostStatus.SCHEDULED, PostStatus.FAILED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Post cannot be scheduled in current status",
        )

    post.scheduled_at = scheduled_at
    post.timezone = timezone
    post.status = PostStatus.SCHEDULED
    post.error_message = None
    session.add(post)
    session.commit()

    return {"status": "scheduled", "scheduled_at": scheduled_at.isoformat()}


@router.post("/posts/{post_id}/cancel")
async def cancel_post(
    post_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Cancel a scheduled post."""
    post = session.get(SocialPost, post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    # Verify ownership
    account = session.get(SocialAccount, post.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    if post.status not in [PostStatus.SCHEDULED, PostStatus.QUEUED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only scheduled posts can be cancelled",
        )

    post.status = PostStatus.CANCELLED
    session.add(post)
    session.commit()

    return {"status": "cancelled"}


@router.post("/posts/{post_id}/sync-analytics")
async def sync_post_analytics(
    post_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Manually sync analytics for a published post."""
    post = session.get(SocialPost, post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    # Verify ownership
    account = session.get(SocialAccount, post.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    if post.status != PostStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only sync analytics for published posts",
        )

    await social_media_service.sync_post_analytics(session, post)

    return {"status": "synced"}


# ============ Media Attachments ============


@router.get("/posts/{post_id}/attachments", response_model=list[MediaAttachmentRead])
async def list_post_attachments(
    post_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> list[SocialMediaAttachment]:
    """List media attachments for a post."""
    post = session.get(SocialPost, post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    # Verify ownership
    account = session.get(SocialAccount, post.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    return list(
        session.exec(
            select(SocialMediaAttachment)
            .where(SocialMediaAttachment.post_id == post_id)
            .order_by(SocialMediaAttachment.order)
        ).all()
    )


@router.post("/posts/{post_id}/attachments", response_model=MediaAttachmentRead)
async def add_attachment(
    post_id: UUID,
    attachment_data: MediaAttachmentCreate,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> SocialMediaAttachment:
    """Add a media attachment to a post."""
    post = session.get(SocialPost, post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    # Verify ownership
    account = session.get(SocialAccount, post.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    if post.status not in [PostStatus.DRAFT, PostStatus.SCHEDULED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add attachments to post in current status",
        )

    attachment = SocialMediaAttachment(
        post_id=post_id,
        **attachment_data.model_dump(),
    )
    session.add(attachment)
    session.commit()
    session.refresh(attachment)
    return attachment


@router.delete(
    "/posts/{post_id}/attachments/{attachment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def remove_attachment(
    post_id: UUID,
    attachment_id: UUID,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> None:
    """Remove a media attachment from a post."""
    attachment = session.get(SocialMediaAttachment, attachment_id)
    if not attachment or attachment.post_id != post_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment not found",
        )

    post = session.get(SocialPost, post_id)
    if not post:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    # Verify ownership
    account = session.get(SocialAccount, post.account_id)
    if not account or str(account.owner_id) != current_user.sub:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Post not found",
        )

    session.delete(attachment)
    session.commit()


# ============ Scheduler ============


@router.post("/process-scheduled")
async def process_scheduled_posts(
    background_tasks: BackgroundTasks,
    session: SessionDep,
    current_user: CurrentUserDep,
) -> dict:
    """Manually trigger processing of scheduled posts (for testing/admin use)."""
    # In production, this would be called by a cron job or scheduler
    background_tasks.add_task(_process_scheduled)
    return {"status": "processing"}


async def _process_scheduled() -> None:
    """Background task to process scheduled posts."""
    from app.db.session import get_session

    with get_session() as session:
        count = await social_media_service.process_scheduled_posts(session)
        logger = __import__("app.core.logging", fromlist=["get_logger"]).get_logger(__name__)
        logger.info(f"Processed {count} scheduled posts")
