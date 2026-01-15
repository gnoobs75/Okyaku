from datetime import datetime
from typing import Optional
from uuid import UUID

import httpx
from sqlmodel import Session, select

from app.core.config import settings
from app.core.logging import get_logger
from app.models.social_inbox import (
    MessageStatus,
    MessageType,
    SocialMessage,
    SocialMessageReply,
)
from app.models.social_media import SocialAccount, SocialPlatform

logger = get_logger(__name__)


class SocialInboxService:
    """Service for managing social media inbox."""

    async def fetch_linkedin_messages(
        self, session: Session, account: SocialAccount
    ) -> int:
        """Fetch messages from LinkedIn."""
        # LinkedIn API for messages is restricted
        # This is a placeholder for the actual implementation
        logger.info(f"Fetching LinkedIn messages for account {account.id}")
        return 0

    async def fetch_twitter_messages(
        self, session: Session, account: SocialAccount
    ) -> int:
        """Fetch direct messages and mentions from Twitter/X."""
        fetched_count = 0

        try:
            async with httpx.AsyncClient() as client:
                # Fetch mentions
                response = await client.get(
                    "https://api.twitter.com/2/users/me/mentions",
                    headers={"Authorization": f"Bearer {account.access_token}"},
                    params={
                        "tweet.fields": "created_at,author_id,conversation_id",
                        "expansions": "author_id",
                        "user.fields": "name,username,profile_image_url",
                    },
                )

                if response.status_code == 200:
                    data = response.json()
                    tweets = data.get("data", [])
                    users = {
                        u["id"]: u for u in data.get("includes", {}).get("users", [])
                    }

                    for tweet in tweets:
                        # Check if already exists
                        existing = session.exec(
                            select(SocialMessage).where(
                                SocialMessage.platform_message_id == tweet["id"]
                            )
                        ).first()

                        if not existing:
                            author = users.get(tweet["author_id"], {})
                            message = SocialMessage(
                                account_id=account.id,
                                platform=SocialPlatform.TWITTER,
                                platform_message_id=tweet["id"],
                                thread_id=tweet.get("conversation_id"),
                                message_type=MessageType.MENTION,
                                content=tweet.get("text", ""),
                                sender_platform_id=tweet["author_id"],
                                sender_username=author.get("username", "unknown"),
                                sender_display_name=author.get("name"),
                                sender_profile_image=author.get("profile_image_url"),
                                received_at=datetime.fromisoformat(
                                    tweet["created_at"].replace("Z", "+00:00")
                                ),
                                platform_data=tweet,
                            )
                            session.add(message)
                            fetched_count += 1

                    session.commit()

        except Exception as e:
            logger.error(f"Error fetching Twitter messages: {e}")

        return fetched_count

    async def fetch_facebook_messages(
        self, session: Session, account: SocialAccount
    ) -> int:
        """Fetch messages from Facebook."""
        fetched_count = 0

        try:
            async with httpx.AsyncClient() as client:
                page_id = account.platform_data.get("page_id", "me")

                # Fetch page posts and comments
                response = await client.get(
                    f"https://graph.facebook.com/v18.0/{page_id}/posts",
                    params={
                        "access_token": account.access_token,
                        "fields": "id,message,created_time,comments{id,from,message,created_time}",
                    },
                )

                if response.status_code == 200:
                    data = response.json()
                    posts = data.get("data", [])

                    for post in posts:
                        comments = post.get("comments", {}).get("data", [])
                        for comment in comments:
                            # Check if already exists
                            existing = session.exec(
                                select(SocialMessage).where(
                                    SocialMessage.platform_message_id == comment["id"]
                                )
                            ).first()

                            if not existing:
                                sender = comment.get("from", {})
                                message = SocialMessage(
                                    account_id=account.id,
                                    platform=SocialPlatform.FACEBOOK,
                                    platform_message_id=comment["id"],
                                    thread_id=post["id"],
                                    message_type=MessageType.COMMENT,
                                    content=comment.get("message", ""),
                                    sender_platform_id=sender.get("id", "unknown"),
                                    sender_username=sender.get("name", "Unknown"),
                                    sender_display_name=sender.get("name"),
                                    received_at=datetime.fromisoformat(
                                        comment["created_time"].replace("Z", "+00:00")
                                    ),
                                    platform_data=comment,
                                )
                                session.add(message)
                                fetched_count += 1

                    session.commit()

        except Exception as e:
            logger.error(f"Error fetching Facebook messages: {e}")

        return fetched_count

    async def fetch_all_messages(self, session: Session, account_id: UUID) -> int:
        """Fetch messages for a specific account."""
        account = session.get(SocialAccount, account_id)
        if not account:
            return 0

        if account.platform == SocialPlatform.LINKEDIN:
            return await self.fetch_linkedin_messages(session, account)
        elif account.platform == SocialPlatform.TWITTER:
            return await self.fetch_twitter_messages(session, account)
        elif account.platform == SocialPlatform.FACEBOOK:
            return await self.fetch_facebook_messages(session, account)

        return 0

    async def send_reply(
        self,
        session: Session,
        message: SocialMessage,
        content: str,
        user_id: UUID,
    ) -> tuple[bool, Optional[str]]:
        """Send a reply to a message."""
        account = session.get(SocialAccount, message.account_id)
        if not account:
            return False, "Account not found"

        reply = SocialMessageReply(
            message_id=message.id,
            content=content,
            sent_by=user_id,
        )

        try:
            async with httpx.AsyncClient() as client:
                if message.platform == SocialPlatform.TWITTER:
                    # Reply to tweet
                    response = await client.post(
                        "https://api.twitter.com/2/tweets",
                        headers={
                            "Authorization": f"Bearer {account.access_token}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "text": content,
                            "reply": {"in_reply_to_tweet_id": message.platform_message_id},
                        },
                    )
                    if response.status_code == 201:
                        data = response.json().get("data", {})
                        reply.platform_reply_id = data.get("id")
                        reply.send_status = "sent"
                    else:
                        reply.send_status = "failed"
                        reply.error_message = response.text

                elif message.platform == SocialPlatform.FACEBOOK:
                    # Reply to comment
                    response = await client.post(
                        f"https://graph.facebook.com/v18.0/{message.platform_message_id}/comments",
                        params={
                            "access_token": account.access_token,
                            "message": content,
                        },
                    )
                    if response.status_code == 200:
                        data = response.json()
                        reply.platform_reply_id = data.get("id")
                        reply.send_status = "sent"
                    else:
                        reply.send_status = "failed"
                        reply.error_message = response.text

                else:
                    reply.send_status = "failed"
                    reply.error_message = "Platform not supported for replies"

        except Exception as e:
            reply.send_status = "failed"
            reply.error_message = str(e)

        session.add(reply)

        # Update message status
        if reply.send_status == "sent":
            message.status = MessageStatus.RESPONDED
            message.responded_at = datetime.utcnow()
            session.add(message)

        session.commit()
        session.refresh(reply)

        return reply.send_status == "sent", reply.error_message


# Global service instance
social_inbox_service = SocialInboxService()
