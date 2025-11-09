"""API Key and Webhook models for Sprint 17-18

Models for enterprise features including API key management and webhook system.
"""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.db.types import GUID


class APIKey(Base):
    """API key model for public API access"""

    __tablename__ = "api_keys"

    id = Column(GUID(), primary_key=True, default=uuid4)
    company_id = Column(
        GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    # Key identification
    name = Column(String(255), nullable=False, comment="Human-readable name for the API key")
    key_prefix = Column(
        String(20),
        nullable=False,
        comment='First 8 chars of key for identification (e.g., "hf_live_")',
    )
    key_hash = Column(
        String(255), nullable=False, comment="SHA-256 hash of the full API key"
    )

    # Permissions and rate limiting
    permissions = Column(
        JSONB,
        nullable=False,
        default=dict,
        comment='Scoped permissions: {"jobs": ["read", "write"], "candidates": ["read"]}',
    )
    rate_limit_tier = Column(
        String(50),
        nullable=False,
        default="standard",
        comment='Rate limit tier: "standard", "elevated", "enterprise"',
    )
    rate_limit_requests_per_minute = Column(Integer, nullable=False, default=60)
    rate_limit_requests_per_hour = Column(Integer, nullable=False, default=3000)

    # Usage tracking
    last_used_at = Column(
        DateTime, nullable=True, comment="Last API request timestamp"
    )
    last_used_ip = Column(
        String(45), nullable=True, comment="Last IP address that used this key"
    )

    # Lifecycle
    expires_at = Column(DateTime, nullable=True, comment="Optional expiration date")
    created_by = Column(
        GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )
    revoked_at = Column(
        DateTime, nullable=True, comment="Timestamp when key was revoked"
    )
    revoked_by = Column(
        GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    status = Column(
        String(50),
        nullable=False,
        default="active",
        comment='Status: "active", "revoked", "expired"',
    )

    # Relationships
    company = relationship("Company")
    creator = relationship("User", foreign_keys=[created_by])
    revoker = relationship("User", foreign_keys=[revoked_by])
    usage_logs = relationship(
        "APIKeyUsage", back_populates="api_key", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<APIKey {self.name} - {self.key_prefix}>"


class APIKeyUsage(Base):
    """API key usage tracking for rate limiting and analytics"""

    __tablename__ = "api_key_usage"

    id = Column(GUID(), primary_key=True, default=uuid4)
    api_key_id = Column(
        GUID(), ForeignKey("api_keys.id", ondelete="CASCADE"), nullable=False
    )
    company_id = Column(
        GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    # Request details
    endpoint = Column(
        String(255),
        nullable=False,
        comment='API endpoint path (e.g., "/api/v1/jobs")',
    )
    method = Column(
        String(10), nullable=False, comment="HTTP method (GET, POST, PUT, DELETE)"
    )
    status_code = Column(Integer, nullable=False, comment="HTTP status code")

    # Performance metrics
    response_time_ms = Column(
        Integer, nullable=True, comment="Response time in milliseconds"
    )
    request_size_bytes = Column(Integer, nullable=True, comment="Request payload size")
    response_size_bytes = Column(
        Integer, nullable=True, comment="Response payload size"
    )

    # Client information
    ip_address = Column(String(45), nullable=True, comment="Client IP address")
    user_agent = Column(String(500), nullable=True, comment="Client user agent")

    # Error tracking
    error_message = Column(Text, nullable=True, comment="Error message if request failed")

    # Timestamp
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        comment="Request timestamp",
    )

    # Relationships
    api_key = relationship("APIKey", back_populates="usage_logs")
    company = relationship("Company")

    def __repr__(self):
        return f"<APIKeyUsage {self.method} {self.endpoint} - {self.status_code}>"


class Webhook(Base):
    """Webhook configuration model for event notifications"""

    __tablename__ = "webhooks"

    id = Column(GUID(), primary_key=True, default=uuid4)
    company_id = Column(
        GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    # Webhook configuration
    url = Column(String(500), nullable=False, comment="Webhook endpoint URL")
    description = Column(Text, nullable=True, comment="Human-readable description")
    events = Column(
        JSONB,
        nullable=False,
        default=list,
        comment='Array of subscribed events: ["application.created", "job.published"]',
    )
    secret = Column(
        String(255), nullable=False, comment="HMAC secret for signature verification"
    )
    is_active = Column(Boolean, nullable=False, default=True)

    # Retry configuration
    retry_policy = Column(
        JSONB,
        nullable=False,
        default={"max_attempts": 3, "backoff_seconds": [60, 300, 900]},
        comment="Retry configuration",
    )
    headers = Column(
        JSONB,
        nullable=True,
        comment="Custom headers to include in webhook requests",
    )

    # Status tracking
    last_triggered_at = Column(
        DateTime, nullable=True, comment="Last successful delivery timestamp"
    )
    failure_count = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Consecutive failure count",
    )
    disabled_at = Column(
        DateTime,
        nullable=True,
        comment="Auto-disabled timestamp after too many failures",
    )

    # Lifecycle
    created_by = Column(
        GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    company = relationship("Company")
    creator = relationship("User", foreign_keys=[created_by])
    deliveries = relationship(
        "WebhookDelivery", back_populates="webhook", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Webhook {self.url} - {len(self.events)} events>"


class WebhookDelivery(Base):
    """Webhook delivery tracking for audit and retry logic"""

    __tablename__ = "webhook_deliveries"

    id = Column(GUID(), primary_key=True, default=uuid4)
    webhook_id = Column(
        GUID(), ForeignKey("webhooks.id", ondelete="CASCADE"), nullable=False
    )
    company_id = Column(
        GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    # Event details
    event_type = Column(
        String(100),
        nullable=False,
        comment='Event type (e.g., "application.created")',
    )
    event_id = Column(
        GUID(), nullable=True, comment="ID of the event entity"
    )
    payload = Column(JSONB, nullable=False, comment="Full webhook payload sent")

    # Delivery tracking
    attempt_number = Column(
        Integer,
        nullable=False,
        default=1,
        comment="Delivery attempt number (1-based)",
    )
    status = Column(
        String(50),
        nullable=False,
        comment='Delivery status: "pending", "success", "failed", "retrying"',
    )

    # Response details
    http_status_code = Column(
        Integer, nullable=True, comment="HTTP response status code"
    )
    response_body = Column(
        Text, nullable=True, comment="Response body from webhook endpoint"
    )
    response_time_ms = Column(
        Integer, nullable=True, comment="Response time in milliseconds"
    )
    error_message = Column(
        Text, nullable=True, comment="Error message if delivery failed"
    )

    # Retry scheduling
    next_retry_at = Column(
        DateTime, nullable=True, comment="Scheduled time for next retry"
    )
    delivered_at = Column(
        DateTime, nullable=True, comment="Successful delivery timestamp"
    )

    # Timestamp
    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        comment="Delivery attempt timestamp",
    )

    # Relationships
    webhook = relationship("Webhook", back_populates="deliveries")
    company = relationship("Company")

    def __repr__(self):
        return f"<WebhookDelivery {self.event_type} - {self.status} (attempt {self.attempt_number})>"
