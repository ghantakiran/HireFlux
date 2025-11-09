"""Webhook Delivery Service for Sprint 17-18

Service for delivering webhooks TO external systems (employer integrations).
This is distinct from webhook_service.py which receives webhooks FROM job boards.

Features:
- Create and manage webhook configurations
- Deliver events to external endpoints with HMAC signatures
- Retry failed deliveries with exponential backoff
- Track delivery history and statistics
- Auto-disable webhooks after consecutive failures
"""

import secrets
import hmac
import hashlib
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from uuid import UUID

import aiohttp
from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.db.models.api_key import Webhook, WebhookDelivery
from app.schemas.api_key import WebhookCreate, WebhookUpdate


class WebhookDeliveryService:
    """Service for managing and delivering webhooks to external endpoints"""

    def __init__(self, db: Session):
        """Initialize service with database session"""
        self.db = db

    # ========================================================================
    # WEBHOOK CONFIGURATION MANAGEMENT
    # ========================================================================

    def create_webhook(
        self,
        company_id: UUID,
        user_id: UUID,
        webhook_data: WebhookCreate,
    ) -> Webhook:
        """
        Create a new webhook configuration

        Args:
            company_id: Company UUID
            user_id: User creating the webhook
            webhook_data: Webhook creation data

        Returns:
            Created Webhook object with generated secret

        Raises:
            ValueError: If URL is invalid (must be HTTPS in production)
        """
        # Validate URL (must be HTTPS for security)
        if not webhook_data.url.startswith("https://"):
            raise ValueError("Webhook URL must use HTTPS")

        # Generate webhook secret for HMAC signatures
        secret = self._generate_webhook_secret()

        # Create webhook record
        webhook = Webhook(
            company_id=company_id,
            url=webhook_data.url,
            description=webhook_data.description,
            events=webhook_data.events,
            secret=secret,
            is_active=True,
            retry_policy=(
                webhook_data.retry_policy.model_dump()
                if webhook_data.retry_policy
                else {"max_attempts": 3, "backoff_seconds": [60, 300, 900]}
            ),
            headers=webhook_data.headers,
            created_by=user_id,
            failure_count=0,
        )

        self.db.add(webhook)
        self.db.commit()
        self.db.refresh(webhook)

        return webhook

    def list_webhooks(
        self,
        company_id: UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict:
        """
        List all webhooks for a company

        Args:
            company_id: Company UUID
            page: Page number (1-indexed)
            page_size: Items per page

        Returns:
            Dict with webhooks, total, page, page_size
        """
        query = self.db.query(Webhook).filter(Webhook.company_id == company_id)

        total = query.count()
        webhooks = (
            query.order_by(Webhook.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        return {
            "webhooks": webhooks,
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    def get_webhook(
        self,
        webhook_id: UUID,
        company_id: UUID,
    ) -> Optional[Webhook]:
        """Get a specific webhook by ID"""
        return (
            self.db.query(Webhook)
            .filter(
                and_(
                    Webhook.id == webhook_id,
                    Webhook.company_id == company_id,
                )
            )
            .first()
        )

    def update_webhook(
        self,
        webhook_id: UUID,
        company_id: UUID,
        update_data: WebhookUpdate,
    ) -> Optional[Webhook]:
        """
        Update webhook configuration

        Args:
            webhook_id: Webhook UUID
            company_id: Company UUID (for authorization)
            update_data: Update data

        Returns:
            Updated Webhook or None if not found
        """
        webhook = self.get_webhook(webhook_id, company_id)
        if not webhook:
            return None

        # Update fields
        if update_data.url is not None:
            if not update_data.url.startswith("https://"):
                raise ValueError("Webhook URL must use HTTPS")
            webhook.url = update_data.url

        if update_data.description is not None:
            webhook.description = update_data.description

        if update_data.events is not None:
            webhook.events = update_data.events

        if update_data.is_active is not None:
            webhook.is_active = update_data.is_active

        if update_data.headers is not None:
            webhook.headers = update_data.headers

        webhook.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(webhook)

        return webhook

    def delete_webhook(
        self,
        webhook_id: UUID,
        company_id: UUID,
    ) -> Optional[Webhook]:
        """
        Delete a webhook (hard delete)

        Args:
            webhook_id: Webhook UUID
            company_id: Company UUID (for authorization)

        Returns:
            Deleted Webhook or None if not found
        """
        webhook = self.get_webhook(webhook_id, company_id)
        if not webhook:
            return None

        self.db.delete(webhook)
        self.db.commit()

        return webhook

    # ========================================================================
    # WEBHOOK DELIVERY
    # ========================================================================

    async def deliver_webhook(
        self,
        webhook: Webhook,
        event_type: str,
        payload: Dict,
        event_id: Optional[UUID] = None,
        attempt_number: int = 1,
    ) -> WebhookDelivery:
        """
        Deliver webhook to external endpoint

        Args:
            webhook: Webhook configuration
            event_type: Event type (e.g., "application.created")
            payload: Event payload data
            event_id: Optional event ID
            attempt_number: Delivery attempt number (1-based)

        Returns:
            WebhookDelivery record with delivery status
        """
        # Prepare payload
        payload_str = json.dumps(payload, sort_keys=True)

        # Compute HMAC signature
        signature = self._compute_signature(webhook, payload_str)

        # Prepare headers
        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-Event": event_type,
            "X-Webhook-ID": str(webhook.id),
            "X-Webhook-Timestamp": datetime.utcnow().isoformat(),
        }

        # Add custom headers
        if webhook.headers:
            headers.update(webhook.headers)

        # Deliver webhook
        delivery_start = datetime.utcnow()
        status = "pending"
        http_status_code = None
        response_body = None
        error_message = None
        response_time_ms = None

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    webhook.url,
                    data=payload_str,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as response:
                    delivery_end = datetime.utcnow()
                    response_time_ms = int(
                        (delivery_end - delivery_start).total_seconds() * 1000
                    )

                    http_status_code = response.status
                    response_body = await response.text()

                    if 200 <= response.status < 300:
                        status = "success"
                    else:
                        status = "failed"
                        error_message = f"HTTP {response.status}: {response_body[:500]}"

        except asyncio.TimeoutError:
            delivery_end = datetime.utcnow()
            response_time_ms = int(
                (delivery_end - delivery_start).total_seconds() * 1000
            )
            status = "failed"
            error_message = "Request timeout (30s)"

        except Exception as e:
            delivery_end = datetime.utcnow()
            response_time_ms = int(
                (delivery_end - delivery_start).total_seconds() * 1000
            )
            status = "failed"
            error_message = f"Delivery error: {str(e)}"

        # Calculate next retry if failed
        next_retry_at = None
        if status == "failed" and self.should_retry(webhook, attempt_number):
            next_retry_at = self.calculate_next_retry(webhook, attempt_number)

        # Create delivery record
        delivery = WebhookDelivery(
            webhook_id=webhook.id,
            company_id=webhook.company_id,
            event_type=event_type,
            event_id=event_id,
            payload=payload,
            attempt_number=attempt_number,
            status=status,
            http_status_code=http_status_code,
            response_body=response_body,
            response_time_ms=response_time_ms,
            error_message=error_message,
            next_retry_at=next_retry_at,
            delivered_at=delivery_end if status == "success" else None,
        )

        self.db.add(delivery)

        # Update webhook last_triggered and failure count
        if status == "success":
            self.record_success(webhook)
        else:
            self.record_failure(webhook)

        self.db.commit()
        self.db.refresh(delivery)

        return delivery

    # ========================================================================
    # EVENT SUBSCRIPTION
    # ========================================================================

    def is_event_subscribed(
        self,
        webhook: Webhook,
        event_type: str,
    ) -> bool:
        """
        Check if webhook is subscribed to event type

        Args:
            webhook: Webhook configuration
            event_type: Event type to check

        Returns:
            True if subscribed, False otherwise
        """
        return event_type in webhook.events

    def get_webhooks_for_event(
        self,
        company_id: UUID,
        event_type: str,
    ) -> List[Webhook]:
        """
        Get all active webhooks subscribed to an event type

        Args:
            company_id: Company UUID
            event_type: Event type

        Returns:
            List of active webhooks subscribed to the event
        """
        all_webhooks = (
            self.db.query(Webhook)
            .filter(Webhook.company_id == company_id)
            .filter(Webhook.is_active == True)
            .all()
        )

        # Filter by event subscription
        subscribed = [
            wh for wh in all_webhooks if self.is_event_subscribed(wh, event_type)
        ]

        return subscribed

    # ========================================================================
    # SECURITY & SIGNATURES
    # ========================================================================

    def _generate_webhook_secret(self) -> str:
        """
        Generate a cryptographically secure webhook secret

        Format: whsec_<48_random_chars>
        Total length: 56 characters
        """
        random_part = secrets.token_urlsafe(36)  # 48 chars when base64 encoded
        return f"whsec_{random_part}"

    def _compute_signature(
        self,
        webhook: Webhook,
        payload_str: str,
    ) -> str:
        """
        Compute HMAC signature for webhook payload

        Args:
            webhook: Webhook with secret
            payload_str: JSON payload string

        Returns:
            Signature in format "sha256=<hex_digest>"
        """
        signature = hmac.new(
            webhook.secret.encode(),
            payload_str.encode(),
            hashlib.sha256,
        ).hexdigest()

        return f"sha256={signature}"

    # ========================================================================
    # FAILURE HANDLING
    # ========================================================================

    def record_failure(self, webhook: Webhook) -> None:
        """
        Record webhook delivery failure

        Increments failure count and auto-disables after 10 consecutive failures

        Args:
            webhook: Webhook that failed
        """
        webhook.failure_count += 1

        # Auto-disable after 10 consecutive failures
        if webhook.failure_count >= 10:
            webhook.is_active = False
            webhook.disabled_at = datetime.utcnow()

        self.db.commit()

    def record_success(self, webhook: Webhook) -> None:
        """
        Record webhook delivery success

        Resets failure count and updates last_triggered_at

        Args:
            webhook: Webhook that succeeded
        """
        webhook.failure_count = 0
        webhook.last_triggered_at = datetime.utcnow()
        self.db.commit()

    # ========================================================================
    # RETRY LOGIC
    # ========================================================================

    def should_retry(
        self,
        webhook: Webhook,
        attempt_number: int,
    ) -> bool:
        """
        Check if webhook delivery should be retried

        Args:
            webhook: Webhook configuration
            attempt_number: Current attempt number

        Returns:
            True if should retry, False otherwise
        """
        max_attempts = webhook.retry_policy.get("max_attempts", 3)
        return attempt_number < max_attempts

    def calculate_next_retry(
        self,
        webhook: Webhook,
        attempt_number: int,
    ) -> datetime:
        """
        Calculate next retry time using exponential backoff

        Args:
            webhook: Webhook configuration
            attempt_number: Current attempt number

        Returns:
            Datetime for next retry
        """
        backoff_seconds = webhook.retry_policy.get(
            "backoff_seconds", [60, 300, 900]
        )

        # Get backoff for this attempt (use last value if exceeded array length)
        if attempt_number <= len(backoff_seconds):
            delay = backoff_seconds[attempt_number - 1]
        else:
            delay = backoff_seconds[-1]

        return datetime.utcnow() + timedelta(seconds=delay)

    # ========================================================================
    # DELIVERY HISTORY & STATS
    # ========================================================================

    def get_delivery_history(
        self,
        webhook_id: UUID,
        limit: int = 50,
    ) -> List[WebhookDelivery]:
        """
        Get delivery history for a webhook

        Args:
            webhook_id: Webhook UUID
            limit: Maximum number of records

        Returns:
            List of delivery records, ordered by created_at DESC
        """
        return (
            self.db.query(WebhookDelivery)
            .filter(WebhookDelivery.webhook_id == webhook_id)
            .order_by(WebhookDelivery.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_delivery_stats(
        self,
        webhook_id: UUID,
        days: int = 30,
    ) -> Dict:
        """
        Get delivery statistics for a webhook

        Args:
            webhook_id: Webhook UUID
            days: Number of days to include

        Returns:
            Dict with delivery statistics
        """
        since = datetime.utcnow() - timedelta(days=days)

        total = (
            self.db.query(WebhookDelivery)
            .filter(
                and_(
                    WebhookDelivery.webhook_id == webhook_id,
                    WebhookDelivery.created_at >= since,
                )
            )
            .count()
        )

        successful = (
            self.db.query(WebhookDelivery)
            .filter(
                and_(
                    WebhookDelivery.webhook_id == webhook_id,
                    WebhookDelivery.created_at >= since,
                    WebhookDelivery.status == "success",
                )
            )
            .count()
        )

        failed = (
            self.db.query(WebhookDelivery)
            .filter(
                and_(
                    WebhookDelivery.webhook_id == webhook_id,
                    WebhookDelivery.created_at >= since,
                    WebhookDelivery.status == "failed",
                )
            )
            .count()
        )

        avg_response_time = (
            self.db.query(func.avg(WebhookDelivery.response_time_ms))
            .filter(
                and_(
                    WebhookDelivery.webhook_id == webhook_id,
                    WebhookDelivery.created_at >= since,
                    WebhookDelivery.status == "success",
                )
            )
            .scalar()
        )

        return {
            "total_deliveries": total,
            "successful_deliveries": successful,
            "failed_deliveries": failed,
            "success_rate": round((successful / total * 100) if total > 0 else 0, 1),
            "avg_response_time_ms": int(avg_response_time) if avg_response_time else 0,
            "period_days": days,
        }


# Import asyncio for timeout handling
import asyncio
