import asyncio
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

import httpx
from sqlmodel import Session, select

from app.core.config import settings
from app.core.logging import get_logger
from app.models.social_media import (
    AccountStatus,
    PostStatus,
    SocialAccount,
    SocialMediaAttachment,
    SocialPlatform,
    SocialPost,
    SocialPostAnalytics,
)

logger = get_logger(__name__)


class SocialMediaClient(ABC):
    """Abstract base class for social media platform clients."""

    @abstractmethod
    async def exchange_code(
        self, authorization_code: str, redirect_uri: str
    ) -> dict:
        """Exchange authorization code for access tokens."""
        pass

    @abstractmethod
    async def refresh_token(self, refresh_token: str) -> dict:
        """Refresh access token."""
        pass

    @abstractmethod
    async def get_user_profile(self, access_token: str) -> dict:
        """Get authenticated user profile."""
        pass

    @abstractmethod
    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: list[str] = None,
        link_url: str = None,
    ) -> dict:
        """Publish a post to the platform."""
        pass

    @abstractmethod
    async def get_post_analytics(
        self, access_token: str, post_id: str
    ) -> dict:
        """Get analytics for a published post."""
        pass


class LinkedInClient(SocialMediaClient):
    """LinkedIn API client."""

    BASE_URL = "https://api.linkedin.com/v2"
    OAUTH_URL = "https://www.linkedin.com/oauth/v2"

    async def exchange_code(
        self, authorization_code: str, redirect_uri: str
    ) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.OAUTH_URL}/accessToken",
                data={
                    "grant_type": "authorization_code",
                    "code": authorization_code,
                    "redirect_uri": redirect_uri,
                    "client_id": settings.LINKEDIN_CLIENT_ID,
                    "client_secret": settings.LINKEDIN_CLIENT_SECRET,
                },
            )
            response.raise_for_status()
            return response.json()

    async def refresh_token(self, refresh_token: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.OAUTH_URL}/accessToken",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": settings.LINKEDIN_CLIENT_ID,
                    "client_secret": settings.LINKEDIN_CLIENT_SECRET,
                },
            )
            response.raise_for_status()
            return response.json()

    async def get_user_profile(self, access_token: str) -> dict:
        async with httpx.AsyncClient() as client:
            # Get basic profile
            response = await client.get(
                f"{self.BASE_URL}/userinfo",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            response.raise_for_status()
            return response.json()

    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: list[str] = None,
        link_url: str = None,
        user_urn: str = None,
    ) -> dict:
        async with httpx.AsyncClient() as client:
            # Build post payload
            payload = {
                "author": user_urn,
                "lifecycleState": "PUBLISHED",
                "specificContent": {
                    "com.linkedin.ugc.ShareContent": {
                        "shareCommentary": {"text": content},
                        "shareMediaCategory": "NONE",
                    }
                },
                "visibility": {"com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"},
            }

            if link_url:
                payload["specificContent"]["com.linkedin.ugc.ShareContent"][
                    "shareMediaCategory"
                ] = "ARTICLE"
                payload["specificContent"]["com.linkedin.ugc.ShareContent"]["media"] = [
                    {
                        "status": "READY",
                        "originalUrl": link_url,
                    }
                ]

            response = await client.post(
                f"{self.BASE_URL}/ugcPosts",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                    "X-Restli-Protocol-Version": "2.0.0",
                },
                json=payload,
            )
            response.raise_for_status()
            return response.json()

    async def get_post_analytics(
        self, access_token: str, post_id: str
    ) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/socialActions/{post_id}",
                headers={"Authorization": f"Bearer {access_token}"},
            )
            if response.status_code == 200:
                return response.json()
            return {}


class TwitterClient(SocialMediaClient):
    """Twitter/X API client."""

    BASE_URL = "https://api.twitter.com/2"
    OAUTH_URL = "https://api.twitter.com/2/oauth2"

    async def exchange_code(
        self, authorization_code: str, redirect_uri: str
    ) -> dict:
        import base64

        credentials = base64.b64encode(
            f"{settings.TWITTER_CLIENT_ID}:{settings.TWITTER_CLIENT_SECRET}".encode()
        ).decode()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.OAUTH_URL}/token",
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={
                    "grant_type": "authorization_code",
                    "code": authorization_code,
                    "redirect_uri": redirect_uri,
                    "code_verifier": "challenge",  # Should be stored from initial auth
                },
            )
            response.raise_for_status()
            return response.json()

    async def refresh_token(self, refresh_token: str) -> dict:
        import base64

        credentials = base64.b64encode(
            f"{settings.TWITTER_CLIENT_ID}:{settings.TWITTER_CLIENT_SECRET}".encode()
        ).decode()

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.OAUTH_URL}/token",
                headers={
                    "Authorization": f"Basic {credentials}",
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                },
            )
            response.raise_for_status()
            return response.json()

    async def get_user_profile(self, access_token: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/users/me",
                headers={"Authorization": f"Bearer {access_token}"},
                params={"user.fields": "id,name,username,profile_image_url"},
            )
            response.raise_for_status()
            return response.json().get("data", {})

    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: list[str] = None,
        link_url: str = None,
    ) -> dict:
        async with httpx.AsyncClient() as client:
            payload = {"text": content}

            if link_url:
                payload["text"] = f"{content}\n\n{link_url}"

            response = await client.post(
                f"{self.BASE_URL}/tweets",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            response.raise_for_status()
            return response.json().get("data", {})

    async def get_post_analytics(
        self, access_token: str, post_id: str
    ) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/tweets/{post_id}",
                headers={"Authorization": f"Bearer {access_token}"},
                params={
                    "tweet.fields": "public_metrics,non_public_metrics,organic_metrics"
                },
            )
            if response.status_code == 200:
                return response.json().get("data", {})
            return {}


class FacebookClient(SocialMediaClient):
    """Facebook/Meta API client."""

    BASE_URL = "https://graph.facebook.com/v18.0"

    async def exchange_code(
        self, authorization_code: str, redirect_uri: str
    ) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/oauth/access_token",
                params={
                    "client_id": settings.FACEBOOK_APP_ID,
                    "client_secret": settings.FACEBOOK_APP_SECRET,
                    "redirect_uri": redirect_uri,
                    "code": authorization_code,
                },
            )
            response.raise_for_status()
            return response.json()

    async def refresh_token(self, refresh_token: str) -> dict:
        # Facebook uses long-lived tokens, exchange short-lived for long-lived
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/oauth/access_token",
                params={
                    "grant_type": "fb_exchange_token",
                    "client_id": settings.FACEBOOK_APP_ID,
                    "client_secret": settings.FACEBOOK_APP_SECRET,
                    "fb_exchange_token": refresh_token,
                },
            )
            response.raise_for_status()
            return response.json()

    async def get_user_profile(self, access_token: str) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/me",
                params={
                    "access_token": access_token,
                    "fields": "id,name,picture",
                },
            )
            response.raise_for_status()
            return response.json()

    async def publish_post(
        self,
        access_token: str,
        content: str,
        media_urls: list[str] = None,
        link_url: str = None,
        page_id: str = "me",
    ) -> dict:
        async with httpx.AsyncClient() as client:
            payload = {"message": content, "access_token": access_token}

            if link_url:
                payload["link"] = link_url

            response = await client.post(
                f"{self.BASE_URL}/{page_id}/feed",
                data=payload,
            )
            response.raise_for_status()
            return response.json()

    async def get_post_analytics(
        self, access_token: str, post_id: str
    ) -> dict:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.BASE_URL}/{post_id}/insights",
                params={
                    "access_token": access_token,
                    "metric": "post_impressions,post_engaged_users,post_clicks",
                },
            )
            if response.status_code == 200:
                return response.json().get("data", [])
            return {}


class SocialMediaService:
    """Service for managing social media publishing."""

    def __init__(self):
        self.clients = {
            SocialPlatform.LINKEDIN: LinkedInClient(),
            SocialPlatform.TWITTER: TwitterClient(),
            SocialPlatform.FACEBOOK: FacebookClient(),
        }

    def get_client(self, platform: SocialPlatform) -> SocialMediaClient:
        """Get the appropriate client for a platform."""
        return self.clients[platform]

    async def connect_account(
        self,
        session: Session,
        platform: SocialPlatform,
        authorization_code: str,
        redirect_uri: str,
        owner_id: UUID,
    ) -> SocialAccount:
        """Connect a new social media account."""
        client = self.get_client(platform)

        # Exchange code for tokens
        token_data = await client.exchange_code(authorization_code, redirect_uri)

        access_token = token_data.get("access_token")
        refresh_token = token_data.get("refresh_token")
        expires_in = token_data.get("expires_in", 3600)

        # Get user profile
        profile = await client.get_user_profile(access_token)

        # Create or update account
        existing = session.exec(
            select(SocialAccount).where(
                SocialAccount.platform == platform,
                SocialAccount.owner_id == owner_id,
                SocialAccount.platform_user_id == str(profile.get("id", profile.get("sub", ""))),
            )
        ).first()

        if existing:
            existing.access_token = access_token
            existing.refresh_token = refresh_token
            existing.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            existing.status = AccountStatus.CONNECTED
            existing.error_message = None
            existing.platform_username = profile.get("username", profile.get("name", ""))
            existing.display_name = profile.get("name", profile.get("localizedFirstName", ""))
            existing.profile_image_url = profile.get("picture", profile.get("profile_image_url", ""))
            session.add(existing)
            session.commit()
            session.refresh(existing)
            return existing

        account = SocialAccount(
            platform=platform,
            platform_user_id=str(profile.get("id", profile.get("sub", ""))),
            platform_username=profile.get("username", profile.get("name", "")),
            display_name=profile.get("name", profile.get("localizedFirstName", "")),
            profile_image_url=profile.get("picture", profile.get("profile_image_url", "")),
            access_token=access_token,
            refresh_token=refresh_token,
            token_expires_at=datetime.utcnow() + timedelta(seconds=expires_in),
            owner_id=owner_id,
            platform_data=profile,
        )
        session.add(account)
        session.commit()
        session.refresh(account)
        return account

    async def refresh_account_token(
        self, session: Session, account: SocialAccount
    ) -> bool:
        """Refresh the access token for an account."""
        if not account.refresh_token:
            account.status = AccountStatus.TOKEN_EXPIRED
            session.add(account)
            session.commit()
            return False

        try:
            client = self.get_client(account.platform)
            token_data = await client.refresh_token(account.refresh_token)

            account.access_token = token_data.get("access_token")
            if token_data.get("refresh_token"):
                account.refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in", 3600)
            account.token_expires_at = datetime.utcnow() + timedelta(seconds=expires_in)
            account.status = AccountStatus.CONNECTED
            account.error_message = None

            session.add(account)
            session.commit()
            return True

        except Exception as e:
            logger.error(f"Failed to refresh token for account {account.id}: {e}")
            account.status = AccountStatus.TOKEN_EXPIRED
            account.error_message = str(e)
            session.add(account)
            session.commit()
            return False

    async def publish_post(
        self, session: Session, post: SocialPost
    ) -> tuple[bool, Optional[str]]:
        """Publish a social post."""
        account = session.get(SocialAccount, post.account_id)
        if not account:
            return False, "Account not found"

        # Check if token needs refresh
        if account.token_expires_at and account.token_expires_at < datetime.utcnow():
            refreshed = await self.refresh_account_token(session, account)
            if not refreshed:
                return False, "Token expired and refresh failed"

        try:
            client = self.get_client(account.platform)

            # Get media URLs
            media_urls = []
            media_attachments = session.exec(
                select(SocialMediaAttachment)
                .where(SocialMediaAttachment.post_id == post.id)
                .order_by(SocialMediaAttachment.order)
            ).all()
            for attachment in media_attachments:
                media_urls.append(attachment.file_url)

            # Publish based on platform
            if account.platform == SocialPlatform.LINKEDIN:
                result = await client.publish_post(
                    access_token=account.access_token,
                    content=post.content,
                    media_urls=media_urls if media_urls else None,
                    link_url=post.link_url,
                    user_urn=f"urn:li:person:{account.platform_user_id}",
                )
            elif account.platform == SocialPlatform.FACEBOOK:
                result = await client.publish_post(
                    access_token=account.access_token,
                    content=post.content,
                    media_urls=media_urls if media_urls else None,
                    link_url=post.link_url,
                    page_id=account.platform_data.get("page_id", "me"),
                )
            else:
                result = await client.publish_post(
                    access_token=account.access_token,
                    content=post.content,
                    media_urls=media_urls if media_urls else None,
                    link_url=post.link_url,
                )

            # Update post with platform details
            post.platform_post_id = result.get("id")
            post.status = PostStatus.PUBLISHED
            post.published_at = datetime.utcnow()

            # Construct post URL based on platform
            if account.platform == SocialPlatform.TWITTER:
                post.platform_post_url = (
                    f"https://twitter.com/{account.platform_username}/status/{result.get('id')}"
                )
            elif account.platform == SocialPlatform.LINKEDIN:
                post.platform_post_url = (
                    f"https://www.linkedin.com/feed/update/{result.get('id')}"
                )
            elif account.platform == SocialPlatform.FACEBOOK:
                post.platform_post_url = f"https://www.facebook.com/{result.get('id')}"

            session.add(post)
            session.commit()

            # Create analytics record
            analytics = SocialPostAnalytics(post_id=post.id)
            session.add(analytics)
            session.commit()

            logger.info(f"Successfully published post {post.id} to {account.platform}")
            return True, None

        except Exception as e:
            error_message = str(e)
            logger.error(f"Failed to publish post {post.id}: {error_message}")

            post.status = PostStatus.FAILED
            post.error_message = error_message
            post.retry_count += 1
            post.last_retry_at = datetime.utcnow()
            session.add(post)
            session.commit()

            return False, error_message

    async def sync_post_analytics(
        self, session: Session, post: SocialPost
    ) -> None:
        """Sync analytics for a published post."""
        if post.status != PostStatus.PUBLISHED or not post.platform_post_id:
            return

        account = session.get(SocialAccount, post.account_id)
        if not account:
            return

        try:
            client = self.get_client(account.platform)
            data = await client.get_post_analytics(
                account.access_token, post.platform_post_id
            )

            analytics = session.exec(
                select(SocialPostAnalytics).where(
                    SocialPostAnalytics.post_id == post.id
                )
            ).first()

            if not analytics:
                analytics = SocialPostAnalytics(post_id=post.id)

            # Update metrics based on platform response format
            if account.platform == SocialPlatform.TWITTER:
                metrics = data.get("public_metrics", {})
                analytics.likes = metrics.get("like_count", 0)
                analytics.shares = metrics.get("retweet_count", 0)
                analytics.comments = metrics.get("reply_count", 0)
                analytics.impressions = metrics.get("impression_count", 0)
            elif account.platform == SocialPlatform.LINKEDIN:
                analytics.likes = data.get("likesSummary", {}).get("totalLikes", 0)
                analytics.comments = data.get("commentsSummary", {}).get("totalFirstLevelComments", 0)
            elif account.platform == SocialPlatform.FACEBOOK:
                for metric in data:
                    name = metric.get("name")
                    value = metric.get("values", [{}])[0].get("value", 0)
                    if name == "post_impressions":
                        analytics.impressions = value
                    elif name == "post_engaged_users":
                        analytics.reach = value
                    elif name == "post_clicks":
                        analytics.clicks = value

            # Calculate engagement rate
            if analytics.impressions > 0:
                total_engagement = (
                    analytics.likes
                    + analytics.comments
                    + analytics.shares
                    + analytics.clicks
                )
                analytics.engagement_rate = (total_engagement / analytics.impressions) * 100

            analytics.last_synced_at = datetime.utcnow()
            analytics.platform_data = data

            session.add(analytics)
            session.commit()

        except Exception as e:
            logger.error(f"Failed to sync analytics for post {post.id}: {e}")

    async def process_scheduled_posts(self, session: Session) -> int:
        """Process posts that are due for publishing."""
        now = datetime.utcnow()

        scheduled_posts = session.exec(
            select(SocialPost).where(
                SocialPost.status == PostStatus.SCHEDULED,
                SocialPost.scheduled_at <= now,
            )
        ).all()

        published_count = 0
        for post in scheduled_posts:
            post.status = PostStatus.QUEUED
            session.add(post)
            session.commit()

            success, error = await self.publish_post(session, post)
            if success:
                published_count += 1
            else:
                # Schedule retry if under limit
                if post.retry_count < settings.SOCIAL_POST_RETRY_LIMIT:
                    post.status = PostStatus.SCHEDULED
                    post.scheduled_at = datetime.utcnow() + timedelta(
                        seconds=settings.SOCIAL_POST_RETRY_DELAY
                    )
                    session.add(post)
                    session.commit()

        return published_count


# Global service instance
social_media_service = SocialMediaService()
