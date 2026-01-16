"""Background job scheduler service for automated tasks."""

from datetime import datetime
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.cron import CronTrigger
from sqlmodel import Session

from app.core.logging import get_logger
from app.db.session import engine

logger = get_logger(__name__)

# Global scheduler instance
scheduler: Optional[AsyncIOScheduler] = None


async def process_scheduled_social_posts():
    """Job: Process and publish scheduled social media posts."""
    from app.services.social_media_service import social_media_service

    logger.info("Running scheduled social posts job")

    with Session(engine) as session:
        try:
            count = await social_media_service.process_scheduled_posts(session)
            if count > 0:
                logger.info(f"Published {count} scheduled posts")
        except Exception as e:
            logger.error(f"Error processing scheduled posts: {e}")


async def sync_social_analytics():
    """Job: Sync analytics for recent published posts."""
    from app.services.social_media_service import social_media_service
    from app.models.social_media import SocialPost, PostStatus
    from sqlmodel import select
    from datetime import timedelta

    logger.info("Running social analytics sync job")

    with Session(engine) as session:
        try:
            # Get posts published in last 7 days
            cutoff = datetime.utcnow() - timedelta(days=7)
            posts = session.exec(
                select(SocialPost).where(
                    SocialPost.status == PostStatus.PUBLISHED,
                    SocialPost.published_at >= cutoff,
                )
            ).all()

            for post in posts:
                await social_media_service.sync_post_analytics(session, post)

            logger.info(f"Synced analytics for {len(posts)} posts")
        except Exception as e:
            logger.error(f"Error syncing social analytics: {e}")


async def sync_social_inbox():
    """Job: Sync social inbox messages from all platforms."""
    from app.services.social_inbox_service import social_inbox_service
    from app.models.social_media import SocialAccount, AccountStatus
    from sqlmodel import select

    logger.info("Running social inbox sync job")

    with Session(engine) as session:
        try:
            accounts = session.exec(
                select(SocialAccount).where(
                    SocialAccount.status == AccountStatus.CONNECTED
                )
            ).all()

            total_messages = 0
            for account in accounts:
                count = await social_inbox_service.sync_messages(session, account)
                total_messages += count

            if total_messages > 0:
                logger.info(f"Synced {total_messages} new social messages")
        except Exception as e:
            logger.error(f"Error syncing social inbox: {e}")


async def process_scheduled_email_campaigns():
    """Job: Process and send scheduled email campaigns."""
    from app.services.email_service import email_service
    from app.models.email_campaign import EmailCampaign, CampaignStatus
    from sqlmodel import select

    logger.info("Running scheduled email campaigns job")

    with Session(engine) as session:
        try:
            now = datetime.utcnow()
            campaigns = session.exec(
                select(EmailCampaign).where(
                    EmailCampaign.status == CampaignStatus.SCHEDULED,
                    EmailCampaign.scheduled_at <= now,
                )
            ).all()

            for campaign in campaigns:
                campaign.status = CampaignStatus.SENDING
                session.add(campaign)
                session.commit()

                await email_service.send_campaign(session, campaign)

            if campaigns:
                logger.info(f"Started sending {len(campaigns)} email campaigns")
        except Exception as e:
            logger.error(f"Error processing scheduled email campaigns: {e}")


async def refresh_expiring_tokens():
    """Job: Refresh social account tokens that are about to expire."""
    from app.services.social_media_service import social_media_service
    from app.models.social_media import SocialAccount, AccountStatus
    from sqlmodel import select
    from datetime import timedelta

    logger.info("Running token refresh job")

    with Session(engine) as session:
        try:
            # Get accounts expiring in the next hour
            expiry_threshold = datetime.utcnow() + timedelta(hours=1)
            accounts = session.exec(
                select(SocialAccount).where(
                    SocialAccount.status == AccountStatus.CONNECTED,
                    SocialAccount.token_expires_at <= expiry_threshold,
                    SocialAccount.refresh_token.isnot(None),
                )
            ).all()

            refreshed = 0
            for account in accounts:
                success = await social_media_service.refresh_account_token(session, account)
                if success:
                    refreshed += 1

            if refreshed > 0:
                logger.info(f"Refreshed {refreshed} social account tokens")
        except Exception as e:
            logger.error(f"Error refreshing tokens: {e}")


def init_scheduler() -> AsyncIOScheduler:
    """Initialize and configure the scheduler."""
    global scheduler

    scheduler = AsyncIOScheduler(
        timezone="UTC",
        job_defaults={
            "coalesce": True,  # Combine missed runs into one
            "max_instances": 1,  # Only one instance per job at a time
            "misfire_grace_time": 60,  # Allow 60 seconds grace for misfires
        }
    )

    # Social media post publishing - every minute
    scheduler.add_job(
        process_scheduled_social_posts,
        trigger=IntervalTrigger(minutes=1),
        id="process_scheduled_social_posts",
        name="Process Scheduled Social Posts",
        replace_existing=True,
    )

    # Social analytics sync - every 15 minutes
    scheduler.add_job(
        sync_social_analytics,
        trigger=IntervalTrigger(minutes=15),
        id="sync_social_analytics",
        name="Sync Social Analytics",
        replace_existing=True,
    )

    # Social inbox sync - every 5 minutes
    scheduler.add_job(
        sync_social_inbox,
        trigger=IntervalTrigger(minutes=5),
        id="sync_social_inbox",
        name="Sync Social Inbox",
        replace_existing=True,
    )

    # Email campaign processing - every minute
    scheduler.add_job(
        process_scheduled_email_campaigns,
        trigger=IntervalTrigger(minutes=1),
        id="process_scheduled_email_campaigns",
        name="Process Scheduled Email Campaigns",
        replace_existing=True,
    )

    # Token refresh - every 30 minutes
    scheduler.add_job(
        refresh_expiring_tokens,
        trigger=IntervalTrigger(minutes=30),
        id="refresh_expiring_tokens",
        name="Refresh Expiring Tokens",
        replace_existing=True,
    )

    logger.info("Scheduler initialized with background jobs")
    return scheduler


def start_scheduler():
    """Start the scheduler."""
    global scheduler
    if scheduler and not scheduler.running:
        scheduler.start()
        logger.info("Background scheduler started")


def stop_scheduler():
    """Stop the scheduler gracefully."""
    global scheduler
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=True)
        logger.info("Background scheduler stopped")


def get_scheduler() -> Optional[AsyncIOScheduler]:
    """Get the scheduler instance."""
    return scheduler


def get_job_status() -> list[dict]:
    """Get status of all scheduled jobs."""
    if not scheduler:
        return []

    jobs = []
    for job in scheduler.get_jobs():
        jobs.append({
            "id": job.id,
            "name": job.name,
            "next_run": job.next_run_time.isoformat() if job.next_run_time else None,
            "trigger": str(job.trigger),
        })
    return jobs
