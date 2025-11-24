"""
Email Delivery Tracking Models - Issue #52
Tracks email delivery status, bounces, complaints, opens, and clicks via Resend webhooks
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    Boolean,
    ForeignKey,
    JSON,
    Enum,
    Index,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum


class EmailDeliveryStatus(enum.Enum):
    """Email delivery status enum"""

    QUEUED = "queued"  # Email queued for sending
    SENDING = "sending"  # Email being sent
    SENT = "sent"  # Email sent to Resend
    DELIVERED = "delivered"  # Email delivered to recipient
    SOFT_BOUNCED = "soft_bounced"  # Temporary delivery failure
    BOUNCED = "bounced"  # Permanent delivery failure
    COMPLAINED = "complained"  # Recipient marked as spam
    FAILED = "failed"  # Send failed
    OPENED = "opened"  # Email opened by recipient
    CLICKED = "clicked"  # Link clicked in email


class EmailDeliveryLog(Base):
    """
    Email delivery tracking - Issue #52

    Tracks all emails sent through the platform with delivery status,
    bounces, complaints, and engagement metrics.
    """

    __tablename__ = "email_delivery_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Recipient information
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    to_email = Column(String(255), nullable=False, index=True)
    from_email = Column(String(255), nullable=False)

    # Email details
    subject = Column(String(500), nullable=False)
    email_type = Column(String(50), nullable=False, index=True)  # welcome, password_reset, job_match, etc.
    template_name = Column(String(100), nullable=True)

    # External provider tracking
    message_id = Column(String(255), nullable=True, unique=True, index=True)  # Resend message ID

    # Delivery status
    status = Column(
        Enum(EmailDeliveryStatus),
        default=EmailDeliveryStatus.QUEUED,
        nullable=False,
        index=True
    )

    # Timestamps for delivery tracking
    queued_at = Column(DateTime, default=func.now())
    sent_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    bounced_at = Column(DateTime, nullable=True)
    complained_at = Column(DateTime, nullable=True)
    opened_at = Column(DateTime, nullable=True)  # First open
    clicked_at = Column(DateTime, nullable=True)  # First click

    # Bounce tracking
    bounce_type = Column(String(50), nullable=True)  # hard, soft, spam
    bounce_reason = Column(Text, nullable=True)
    bounce_code = Column(String(50), nullable=True)  # SMTP error code
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    next_retry_at = Column(DateTime, nullable=True)

    # Engagement metrics
    open_count = Column(Integer, default=0)
    click_count = Column(Integer, default=0)
    last_opened_at = Column(DateTime, nullable=True)
    last_clicked_at = Column(DateTime, nullable=True)

    # Click tracking
    clicked_urls = Column(JSON, nullable=True)  # Array of clicked URLs with timestamps

    # Error handling
    error_message = Column(Text, nullable=True)
    error_code = Column(String(50), nullable=True)

    # Webhook data
    webhook_events = Column(JSON, nullable=True)  # Array of all webhook events received

    # Metadata
    extra_metadata = Column(JSON, nullable=True)  # Additional context (job_id, application_id, etc.)

    # Timestamps
    created_at = Column(DateTime, default=func.now(), index=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    # Indexes for common queries
    __table_args__ = (
        Index('ix_email_delivery_logs_status_created', 'status', 'created_at'),
        Index('ix_email_delivery_logs_email_type_status', 'email_type', 'status'),
        Index('ix_email_delivery_logs_user_created', 'user_id', 'created_at'),
    )

    def __repr__(self):
        return f"<EmailDeliveryLog(id={self.id}, to='{self.to_email}', status={self.status.value}, type='{self.email_type}')>"

    @property
    def is_delivered(self) -> bool:
        """Check if email was successfully delivered"""
        return self.status == EmailDeliveryStatus.DELIVERED

    @property
    def is_bounced(self) -> bool:
        """Check if email bounced"""
        return self.status in [EmailDeliveryStatus.BOUNCED, EmailDeliveryStatus.SOFT_BOUNCED]

    @property
    def is_engaged(self) -> bool:
        """Check if recipient engaged with email (opened or clicked)"""
        return self.open_count > 0 or self.click_count > 0

    @property
    def delivery_time_seconds(self) -> int | None:
        """Calculate time from sent to delivered in seconds"""
        if self.sent_at and self.delivered_at:
            return int((self.delivered_at - self.sent_at).total_seconds())
        return None

    def should_retry(self) -> bool:
        """Check if email should be retried"""
        if self.status != EmailDeliveryStatus.SOFT_BOUNCED:
            return False
        if self.retry_count >= self.max_retries:
            return False
        if self.next_retry_at:
            from datetime import datetime
            return datetime.now() >= self.next_retry_at
        return True

    def record_webhook_event(self, event_type: str, event_data: dict):
        """Add webhook event to log"""
        if not self.webhook_events:
            self.webhook_events = []

        event = {
            "type": event_type,
            "data": event_data,
            "received_at": func.now().isoformat() if hasattr(func.now(), 'isoformat') else str(func.now())
        }

        self.webhook_events.append(event)

    def record_click(self, url: str):
        """Record URL click"""
        if not self.clicked_urls:
            self.clicked_urls = []

        from datetime import datetime
        click_event = {
            "url": url,
            "clicked_at": datetime.now().isoformat()
        }

        self.clicked_urls.append(click_event)
        self.click_count += 1


class EmailBlocklist(Base):
    """
    Email address blocklist - Issue #52

    Tracks email addresses that should not receive emails due to:
    - Hard bounces
    - Spam complaints
    - User requests
    - System blocks
    """

    __tablename__ = "email_blocklist"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String(255), nullable=False, unique=True, index=True)

    # Block reason
    reason = Column(String(50), nullable=False, index=True)  # hard_bounce, spam_complaint, user_request, system_block
    reason_detail = Column(Text, nullable=True)

    # Block metadata
    blocked_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    blocked_by_system = Column(Boolean, default=False)

    # Timestamps
    blocked_at = Column(DateTime, default=func.now(), index=True)
    last_attempt_at = Column(DateTime, nullable=True)  # Last time email was attempted
    attempt_count = Column(Integer, default=0)  # Number of attempts since block

    # Relationships
    blocked_by = relationship("User", foreign_keys=[blocked_by_user_id])

    def __repr__(self):
        return f"<EmailBlocklist(id={self.id}, email='{self.email}', reason='{self.reason}')>"

    @staticmethod
    def is_blocked(db, email: str) -> bool:
        """Check if email is blocked"""
        return db.query(EmailBlocklist).filter(EmailBlocklist.email == email).count() > 0


class EmailUnsubscribe(Base):
    """
    Email unsubscribe tracking - Issue #52

    Tracks users who have unsubscribed from different email types.
    Separate from blocklist to allow granular unsubscribe options.
    """

    __tablename__ = "email_unsubscribes"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    email = Column(String(255), nullable=False, index=True)

    # Unsubscribe scope
    email_type = Column(String(50), nullable=True)  # None = all emails, or specific type
    unsubscribe_all = Column(Boolean, default=False)  # Unsubscribe from all marketing

    # Unsubscribe method
    unsubscribed_via = Column(String(50), nullable=False)  # email_link, preference_center, admin

    # Tracking
    message_id = Column(String(255), nullable=True)  # Email that triggered unsubscribe
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)

    # Timestamps
    unsubscribed_at = Column(DateTime, default=func.now(), index=True)

    # Relationships
    user = relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index('ix_email_unsubscribes_email_type', 'email', 'email_type'),
    )

    def __repr__(self):
        return f"<EmailUnsubscribe(id={self.id}, email='{self.email}', type='{self.email_type}')>"

    @staticmethod
    def is_unsubscribed(db, email: str, email_type: str | None = None) -> bool:
        """Check if email is unsubscribed from specific type or all"""
        query = db.query(EmailUnsubscribe).filter(EmailUnsubscribe.email == email)

        # Check for full unsubscribe
        if query.filter(EmailUnsubscribe.unsubscribe_all == True).count() > 0:
            return True

        # Check for type-specific unsubscribe
        if email_type:
            if query.filter(EmailUnsubscribe.email_type == email_type).count() > 0:
                return True

        return False
