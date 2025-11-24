"""
Email Webhook Service - Issue #52
Handles Resend webhook events for email delivery tracking

Events handled:
- email.delivered: Email successfully delivered
- email.bounced: Email bounced (hard or soft)
- email.complained: Recipient marked as spam
- email.opened: Email opened by recipient
- email.clicked: Link clicked in email
"""

from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.models.email_delivery import (
    EmailDeliveryLog,
    EmailDeliveryStatus,
    EmailBlocklist,
    EmailUnsubscribe,
)
from app.core.logging import logger


class EmailWebhookService:
    """Service for handling Resend webhook events"""

    def __init__(self, db: Session):
        self.db = db

    # =========================================================================
    # Public Webhook Handlers
    # =========================================================================

    def handle_delivered(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle email delivered webhook

        Args:
            webhook_data: Webhook payload from Resend

        Returns:
            Dict with success status and message
        """
        try:
            message_id = webhook_data.get("data", {}).get("email_id")
            if not message_id:
                return {"success": False, "error": "Missing email_id"}

            # Find email log
            email_log = (
                self.db.query(EmailDeliveryLog)
                .filter(EmailDeliveryLog.message_id == message_id)
                .first()
            )

            if not email_log:
                logger.warning(f"Email log not found for message_id: {message_id}")
                return {
                    "success": True,
                    "warning": f"Email log not found for {message_id}",
                }

            # Update status
            email_log.status = "delivered"
            email_log.delivered_at = datetime.now()

            # Log webhook event
            email_log.record_webhook_event("email.delivered", webhook_data["data"])

            self.db.commit()

            logger.info(
                f"Email delivered: {email_log.to_email} (message_id: {message_id})"
            )

            return {"success": True, "message": "Email delivery recorded"}

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error handling delivered webhook: {str(e)}")
            return {"success": False, "error": str(e)}

    def handle_bounced(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle email bounced webhook

        Args:
            webhook_data: Webhook payload from Resend

        Returns:
            Dict with success status and message
        """
        try:
            data = webhook_data.get("data", {})
            message_id = data.get("email_id")
            bounce_type = data.get("bounce_type", "hard")  # Default to hard bounce
            bounce_reason = data.get("bounce_reason", "Unknown")
            smtp_code = data.get("smtp_code")

            # Find email log
            email_log = (
                self.db.query(EmailDeliveryLog)
                .filter(EmailDeliveryLog.message_id == message_id)
                .first()
            )

            if not email_log:
                return {
                    "success": True,
                    "warning": f"Email log not found for {message_id}",
                }

            # Update bounce info
            email_log.bounce_type = bounce_type
            email_log.bounce_reason = bounce_reason
            email_log.bounce_code = smtp_code
            email_log.bounced_at = datetime.now()

            # Log webhook event
            email_log.record_webhook_event("email.bounced", data)

            if bounce_type == "soft":
                # Soft bounce - schedule retry if under max retries
                email_log.status = "soft_bounced"
                email_log.retry_count += 1

                if email_log.retry_count < email_log.max_retries:
                    # Schedule retry for 1 hour later
                    email_log.next_retry_at = datetime.now() + timedelta(hours=1)
                    logger.info(
                        f"Soft bounce: {email_log.to_email}, retry {email_log.retry_count}/{email_log.max_retries}"
                    )
                else:
                    # Max retries exceeded - treat as hard bounce
                    email_log.status = "bounced"
                    self._add_to_blocklist(
                        email_log.to_email,
                        "hard_bounce",
                        f"Exceeded max retries ({email_log.max_retries}) for soft bounces",
                    )
                    logger.warning(
                        f"Soft bounce exceeded max retries: {email_log.to_email}"
                    )
            else:
                # Hard bounce - add to blocklist
                email_log.status = "bounced"
                self._add_to_blocklist(
                    email_log.to_email, "hard_bounce", bounce_reason
                )
                logger.warning(f"Hard bounce: {email_log.to_email} - {bounce_reason}")

            self.db.commit()

            return {"success": True, "message": "Bounce recorded"}

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error handling bounced webhook: {str(e)}")
            return {"success": False, "error": str(e)}

    def handle_complained(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle spam complaint webhook

        Args:
            webhook_data: Webhook payload from Resend

        Returns:
            Dict with success status and message
        """
        try:
            data = webhook_data.get("data", {})
            message_id = data.get("email_id")
            to_email = data.get("to")

            # Find email log
            email_log = (
                self.db.query(EmailDeliveryLog)
                .filter(EmailDeliveryLog.message_id == message_id)
                .first()
            )

            if not email_log:
                return {
                    "success": True,
                    "warning": f"Email log not found for {message_id}",
                }

            # Update status
            email_log.status = "complained"
            email_log.complained_at = datetime.now()

            # Log webhook event
            email_log.record_webhook_event("email.complained", data)

            # Auto-unsubscribe from all emails
            self._add_to_unsubscribe_list(to_email, "spam_complaint", message_id)

            # Check complaint rate and alert if high
            complaint_rate = self._calculate_complaint_rate()
            if complaint_rate > 0.1:  # >0.1% complaint rate
                self._send_admin_alert(
                    f"⚠️ High complaint rate detected: {complaint_rate:.2f}% (threshold: 0.1%)"
                )

            self.db.commit()

            logger.warning(f"Spam complaint: {to_email} (message_id: {message_id})")

            return {"success": True, "message": "Complaint recorded and unsubscribed"}

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error handling complained webhook: {str(e)}")
            return {"success": False, "error": str(e)}

    def handle_opened(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle email opened webhook

        Args:
            webhook_data: Webhook payload from Resend

        Returns:
            Dict with success status and message
        """
        try:
            data = webhook_data.get("data", {})
            message_id = data.get("email_id")

            # Find email log
            email_log = (
                self.db.query(EmailDeliveryLog)
                .filter(EmailDeliveryLog.message_id == message_id)
                .first()
            )

            if not email_log:
                return {
                    "success": True,
                    "warning": f"Email log not found for {message_id}",
                }

            # Update open tracking
            now = datetime.now()

            if email_log.open_count == 0:
                # First open
                email_log.opened_at = now
                email_log.status = "opened"

            email_log.open_count += 1
            email_log.last_opened_at = now

            # Log webhook event
            email_log.record_webhook_event("email.opened", data)

            self.db.commit()

            logger.info(
                f"Email opened: {email_log.to_email} (count: {email_log.open_count})"
            )

            return {"success": True, "message": "Open recorded"}

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error handling opened webhook: {str(e)}")
            return {"success": False, "error": str(e)}

    def handle_clicked(self, webhook_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle email link clicked webhook

        Args:
            webhook_data: Webhook payload from Resend

        Returns:
            Dict with success status and message
        """
        try:
            data = webhook_data.get("data", {})
            message_id = data.get("email_id")
            url = data.get("url")

            # Find email log
            email_log = (
                self.db.query(EmailDeliveryLog)
                .filter(EmailDeliveryLog.message_id == message_id)
                .first()
            )

            if not email_log:
                return {
                    "success": True,
                    "warning": f"Email log not found for {message_id}",
                }

            # Update click tracking
            now = datetime.now()

            if email_log.click_count == 0:
                # First click
                email_log.clicked_at = now
                email_log.status = "clicked"

            email_log.click_count += 1
            email_log.last_clicked_at = now

            # Record clicked URL
            if url:
                email_log.record_click(url)

            # Log webhook event
            email_log.record_webhook_event("email.clicked", data)

            self.db.commit()

            logger.info(
                f"Email link clicked: {email_log.to_email} - {url} (count: {email_log.click_count})"
            )

            return {"success": True, "message": "Click recorded"}

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error handling clicked webhook: {str(e)}")
            return {"success": False, "error": str(e)}

    # =========================================================================
    # Analytics Methods
    # =========================================================================

    def calculate_delivery_rate(self, hours: int = 24) -> float:
        """
        Calculate email delivery rate for the past N hours

        Args:
            hours: Time window for calculation

        Returns:
            Delivery rate as percentage (0-100)
        """
        since = datetime.now() - timedelta(hours=hours)

        total_sent = (
            self.db.query(EmailDeliveryLog)
            .filter(EmailDeliveryLog.sent_at >= since)
            .count()
        )

        if total_sent == 0:
            return 100.0

        delivered = (
            self.db.query(EmailDeliveryLog)
            .filter(
                EmailDeliveryLog.sent_at >= since,
                EmailDeliveryLog.status == "delivered",
            )
            .count()
        )

        return round((delivered / total_sent) * 100, 2)

    def calculate_open_rate(self, hours: int = 24) -> float:
        """
        Calculate email open rate for the past N hours

        Args:
            hours: Time window for calculation

        Returns:
            Open rate as percentage (0-100)
        """
        since = datetime.now() - timedelta(hours=hours)

        delivered = (
            self.db.query(EmailDeliveryLog)
            .filter(
                EmailDeliveryLog.delivered_at >= since,
                EmailDeliveryLog.status.in_(["delivered", "opened", "clicked"]),
            )
            .count()
        )

        if delivered == 0:
            return 0.0

        opened = (
            self.db.query(EmailDeliveryLog)
            .filter(
                EmailDeliveryLog.delivered_at >= since, EmailDeliveryLog.open_count > 0
            )
            .count()
        )

        return round((opened / delivered) * 100, 2)

    def calculate_click_rate(self, hours: int = 24) -> float:
        """
        Calculate email click-through rate for the past N hours

        Args:
            hours: Time window for calculation

        Returns:
            Click rate as percentage (0-100)
        """
        since = datetime.now() - timedelta(hours=hours)

        delivered = (
            self.db.query(EmailDeliveryLog)
            .filter(
                EmailDeliveryLog.delivered_at >= since,
                EmailDeliveryLog.status.in_(["delivered", "opened", "clicked"]),
            )
            .count()
        )

        if delivered == 0:
            return 0.0

        clicked = (
            self.db.query(EmailDeliveryLog)
            .filter(
                EmailDeliveryLog.delivered_at >= since,
                EmailDeliveryLog.click_count > 0,
            )
            .count()
        )

        return round((clicked / delivered) * 100, 2)

    def _calculate_complaint_rate(self) -> float:
        """Calculate complaint rate for the past 30 days"""
        since = datetime.now() - timedelta(days=30)

        total_sent = (
            self.db.query(EmailDeliveryLog)
            .filter(EmailDeliveryLog.sent_at >= since)
            .count()
        )

        if total_sent == 0:
            return 0.0

        complained = (
            self.db.query(EmailDeliveryLog)
            .filter(
                EmailDeliveryLog.sent_at >= since,
                EmailDeliveryLog.status == "complained",
            )
            .count()
        )

        return round((complained / total_sent) * 100, 2)

    # =========================================================================
    # Helper Methods
    # =========================================================================

    def _add_to_blocklist(
        self, email: str, reason: str, reason_detail: Optional[str] = None
    ):
        """Add email to blocklist"""
        # Check if already blocked
        existing = (
            self.db.query(EmailBlocklist)
            .filter(EmailBlocklist.email == email)
            .first()
        )

        if existing:
            # Update attempt count
            existing.last_attempt_at = datetime.now()
            existing.attempt_count += 1
        else:
            # Create new blocklist entry
            blocklist_entry = EmailBlocklist(
                email=email,
                reason=reason,
                reason_detail=reason_detail,
                blocked_by_system=True,
                blocked_at=datetime.now(),
            )
            self.db.add(blocklist_entry)

        logger.info(f"Added to blocklist: {email} (reason: {reason})")

    def _add_to_unsubscribe_list(
        self, email: str, unsubscribe_via: str, message_id: Optional[str] = None
    ):
        """Add email to unsubscribe list"""
        # Check if already unsubscribed
        existing = (
            self.db.query(EmailUnsubscribe)
            .filter(
                EmailUnsubscribe.email == email,
                EmailUnsubscribe.unsubscribe_all == True,
            )
            .first()
        )

        if not existing:
            # Create unsubscribe entry
            unsubscribe = EmailUnsubscribe(
                email=email,
                unsubscribe_all=True,
                unsubscribed_via=unsubscribe_via,
                message_id=message_id,
                unsubscribed_at=datetime.now(),
            )
            self.db.add(unsubscribe)

            logger.info(f"Unsubscribed: {email} (via: {unsubscribe_via})")

    def _send_admin_alert(self, message: str):
        """Send alert to admins (placeholder for Issue #55 - Notification System)"""
        # TODO: Implement when notification system is ready
        logger.error(f"ADMIN ALERT: {message}")


# Global function for easy import
def send_admin_alert(message: str):
    """Send alert to admins"""
    logger.error(f"ADMIN ALERT: {message}")
