import asyncio
import re
from datetime import datetime
from typing import Optional
from uuid import UUID

import boto3
from botocore.exceptions import ClientError
from sqlmodel import Session, select

from app.core.config import settings
from app.core.logging import get_logger
from app.models.contact import Contact, ContactStatus
from app.models.email_campaign import (
    CampaignStatus,
    DeliveryStatus,
    EmailCampaign,
    EmailCampaignMetrics,
    EmailRecipient,
    EmailTemplate,
)

logger = get_logger(__name__)


class EmailService:
    """Service for sending emails via AWS SES."""

    def __init__(self):
        self.ses_client = boto3.client(
            "ses",
            region_name=settings.AWS_REGION,
        )
        self.rate_limit = settings.SES_RATE_LIMIT
        self.batch_size = settings.SES_BATCH_SIZE

    def _get_sender(self) -> str:
        """Get the formatted sender email."""
        return f"{settings.SES_SENDER_NAME} <{settings.SES_SENDER_EMAIL}>"

    def _personalize_content(
        self, content: str, personalization_data: dict
    ) -> str:
        """Replace template variables with personalization data."""
        result = content
        for key, value in personalization_data.items():
            placeholder = "{{" + key + "}}"
            result = result.replace(placeholder, str(value) if value else "")
        return result

    def _inject_tracking_pixel(
        self,
        html_content: str,
        recipient_id: UUID,
        tracking_base_url: str,
    ) -> str:
        """Inject an open tracking pixel into HTML content."""
        pixel = f'<img src="{tracking_base_url}/track/open/{recipient_id}" width="1" height="1" style="display:none;" />'
        # Insert before closing body tag
        if "</body>" in html_content.lower():
            return re.sub(
                r"(</body>)",
                f"{pixel}\\1",
                html_content,
                flags=re.IGNORECASE,
            )
        return html_content + pixel

    def _wrap_links(
        self,
        html_content: str,
        recipient_id: UUID,
        tracking_base_url: str,
    ) -> str:
        """Wrap links for click tracking."""
        import urllib.parse

        def replace_link(match):
            original_url = match.group(1)
            # Skip tracking for internal links and unsubscribe links
            if "unsubscribe" in original_url.lower():
                return match.group(0)
            encoded_url = urllib.parse.quote(original_url, safe="")
            tracking_url = f"{tracking_base_url}/track/click/{recipient_id}?url={encoded_url}"
            return f'href="{tracking_url}"'

        return re.sub(r'href="([^"]+)"', replace_link, html_content)

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        recipient_id: Optional[UUID] = None,
        track_opens: bool = True,
        track_clicks: bool = True,
        tracking_base_url: str = "",
    ) -> tuple[bool, Optional[str], Optional[str]]:
        """
        Send a single email via AWS SES.

        Returns:
            Tuple of (success, message_id, error_message)
        """
        try:
            # Apply tracking if enabled
            if track_opens and recipient_id and tracking_base_url:
                html_content = self._inject_tracking_pixel(
                    html_content, recipient_id, tracking_base_url
                )

            if track_clicks and recipient_id and tracking_base_url:
                html_content = self._wrap_links(
                    html_content, recipient_id, tracking_base_url
                )

            # Build message body
            body = {"Html": {"Charset": "UTF-8", "Data": html_content}}
            if text_content:
                body["Text"] = {"Charset": "UTF-8", "Data": text_content}

            response = self.ses_client.send_email(
                Source=self._get_sender(),
                Destination={"ToAddresses": [to_email]},
                Message={
                    "Subject": {"Charset": "UTF-8", "Data": subject},
                    "Body": body,
                },
            )

            message_id = response.get("MessageId")
            logger.info(f"Email sent successfully to {to_email}, message_id: {message_id}")
            return True, message_id, None

        except ClientError as e:
            error_message = str(e)
            logger.error(f"Failed to send email to {to_email}: {error_message}")
            return False, None, error_message

    async def send_campaign_batch(
        self,
        session: Session,
        campaign: EmailCampaign,
        recipients: list[EmailRecipient],
        tracking_base_url: str = "",
    ) -> int:
        """
        Send a batch of campaign emails.

        Returns:
            Number of successfully sent emails
        """
        template = session.get(EmailTemplate, campaign.template_id)
        if not template:
            logger.error(f"Template not found for campaign {campaign.id}")
            return 0

        subject = campaign.subject or template.subject
        sent_count = 0

        for recipient in recipients:
            # Build personalization data
            personalization = {
                "first_name": recipient.first_name or "",
                "last_name": recipient.last_name or "",
                "email": recipient.email,
                **recipient.personalization_data,
            }

            # Personalize content
            html_content = self._personalize_content(template.html_content, personalization)
            text_content = None
            if template.text_content:
                text_content = self._personalize_content(template.text_content, personalization)

            personalized_subject = self._personalize_content(subject, personalization)

            # Send email
            success, message_id, error = await self.send_email(
                to_email=recipient.email,
                subject=personalized_subject,
                html_content=html_content,
                text_content=text_content,
                recipient_id=recipient.id,
                track_opens=campaign.track_opens,
                track_clicks=campaign.track_clicks,
                tracking_base_url=tracking_base_url,
            )

            # Update recipient status
            if success:
                recipient.status = DeliveryStatus.SENT
                recipient.sent_at = datetime.utcnow()
                recipient.message_id = message_id
                sent_count += 1
            else:
                recipient.status = DeliveryStatus.FAILED
                recipient.error_message = error

            session.add(recipient)

            # Rate limiting
            await asyncio.sleep(1.0 / self.rate_limit)

        session.commit()
        return sent_count

    def populate_campaign_recipients(
        self,
        session: Session,
        campaign: EmailCampaign,
    ) -> int:
        """
        Populate campaign recipients based on filter criteria.

        Returns:
            Number of recipients added
        """
        # Build query based on filter criteria
        query = select(Contact).where(Contact.email.isnot(None))

        filter_criteria = campaign.recipient_filter or {}

        # Filter by status
        if "status" in filter_criteria:
            status_value = filter_criteria["status"]
            if isinstance(status_value, list):
                query = query.where(Contact.status.in_([ContactStatus(s) for s in status_value]))
            else:
                query = query.where(Contact.status == ContactStatus(status_value))

        # Filter by source
        if "source" in filter_criteria:
            query = query.where(Contact.source == filter_criteria["source"])

        # Filter by company
        if "company_id" in filter_criteria:
            query = query.where(Contact.company_id == UUID(filter_criteria["company_id"]))

        contacts = session.exec(query).all()

        # Check for existing recipients to avoid duplicates
        existing_emails = set()
        existing_query = select(EmailRecipient.email).where(
            EmailRecipient.campaign_id == campaign.id
        )
        for email in session.exec(existing_query).all():
            existing_emails.add(email)

        added_count = 0
        for contact in contacts:
            if contact.email and contact.email not in existing_emails:
                recipient = EmailRecipient(
                    campaign_id=campaign.id,
                    contact_id=contact.id,
                    email=contact.email,
                    first_name=contact.first_name,
                    last_name=contact.last_name,
                    personalization_data={
                        "job_title": contact.job_title or "",
                        "company": contact.company_name if hasattr(contact, "company_name") else "",
                    },
                )
                session.add(recipient)
                existing_emails.add(contact.email)
                added_count += 1

        session.commit()
        return added_count

    def update_campaign_metrics(
        self,
        session: Session,
        campaign_id: UUID,
    ) -> EmailCampaignMetrics:
        """Update aggregated metrics for a campaign."""
        from sqlmodel import func

        # Get or create metrics record
        metrics = session.exec(
            select(EmailCampaignMetrics).where(
                EmailCampaignMetrics.campaign_id == campaign_id
            )
        ).first()

        if not metrics:
            metrics = EmailCampaignMetrics(campaign_id=campaign_id)

        # Count recipients by status
        recipients_query = select(EmailRecipient).where(
            EmailRecipient.campaign_id == campaign_id
        )
        recipients = session.exec(recipients_query).all()

        metrics.total_recipients = len(recipients)
        metrics.sent_count = sum(1 for r in recipients if r.status != DeliveryStatus.PENDING)
        metrics.delivered_count = sum(
            1 for r in recipients
            if r.status in [DeliveryStatus.DELIVERED, DeliveryStatus.OPENED, DeliveryStatus.CLICKED]
        )
        metrics.opened_count = sum(
            1 for r in recipients
            if r.status in [DeliveryStatus.OPENED, DeliveryStatus.CLICKED]
        )
        metrics.clicked_count = sum(
            1 for r in recipients if r.status == DeliveryStatus.CLICKED
        )
        metrics.bounced_count = sum(
            1 for r in recipients if r.status == DeliveryStatus.BOUNCED
        )
        metrics.complained_count = sum(
            1 for r in recipients if r.status == DeliveryStatus.COMPLAINED
        )
        metrics.unsubscribed_count = sum(
            1 for r in recipients if r.status == DeliveryStatus.UNSUBSCRIBED
        )
        metrics.failed_count = sum(
            1 for r in recipients if r.status == DeliveryStatus.FAILED
        )

        # Unique opens/clicks
        metrics.unique_opens = sum(1 for r in recipients if r.opened_at is not None)
        metrics.unique_clicks = sum(1 for r in recipients if r.clicked_at is not None)

        metrics.last_calculated_at = datetime.utcnow()

        session.add(metrics)
        session.commit()
        session.refresh(metrics)

        return metrics


# Global service instance
email_service = EmailService()
