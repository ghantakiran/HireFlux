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
    JSON,
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
        JSON().with_variant(JSONB, "postgresql"),
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
        JSON().with_variant(JSONB, "postgresql"),
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
        JSON().with_variant(JSONB, "postgresql"),
        nullable=False,
        default={"max_attempts": 3, "backoff_seconds": [60, 300, 900]},
        comment="Retry configuration",
    )
    headers = Column(
        JSON().with_variant(JSONB, "postgresql"),
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
    payload = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False, comment="Full webhook payload sent")

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


class WhiteLabelBranding(Base):
    """White-label branding configuration for Enterprise customers - Sprint 17-18 Phase 3"""

    __tablename__ = "white_label_branding"

    id = Column(GUID(), primary_key=True, default=uuid4)
    company_id = Column(
        GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, unique=True
    )

    # Feature enablement (Enterprise plan required)
    is_enabled = Column(Boolean, nullable=False, default=False)
    enabled_at = Column(DateTime, nullable=True)

    # Brand identity
    company_display_name = Column(
        String(255), nullable=True, comment="Custom display name (can differ from company.name)"
    )

    # Logos (multiple sizes)
    logo_url = Column(String(500), nullable=True, comment="Primary logo (light background)")
    logo_dark_url = Column(String(500), nullable=True, comment="Logo for dark backgrounds")
    logo_icon_url = Column(String(500), nullable=True, comment="Icon/favicon (512x512)")
    logo_email_url = Column(String(500), nullable=True, comment="Email header logo (600x200)")

    # Color scheme (hex colors)
    primary_color = Column(String(7), nullable=False, default="#3B82F6")
    secondary_color = Column(String(7), nullable=False, default="#10B981")
    accent_color = Column(String(7), nullable=False, default="#F59E0B")
    text_color = Column(String(7), nullable=False, default="#1F2937")
    background_color = Column(String(7), nullable=False, default="#FFFFFF")

    # Typography
    font_family = Column(String(100), nullable=False, default="Inter")
    heading_font_family = Column(String(100), nullable=True)

    # Custom domain
    custom_domain = Column(String(255), nullable=True, comment="e.g., careers.company.com")
    custom_domain_verified = Column(Boolean, nullable=False, default=False)
    custom_domain_verification_token = Column(String(255), nullable=True)
    custom_domain_ssl_enabled = Column(Boolean, nullable=False, default=False)

    # Email branding
    email_from_name = Column(String(255), nullable=True)
    email_from_address = Column(String(255), nullable=True)
    email_reply_to = Column(String(255), nullable=True)
    email_footer_text = Column(Text, nullable=True)
    email_header_html = Column(Text, nullable=True)

    # Career page customization
    career_page_enabled = Column(Boolean, nullable=False, default=True)
    career_page_slug = Column(String(100), nullable=True)
    career_page_title = Column(String(255), nullable=True)
    career_page_description = Column(Text, nullable=True)
    career_page_header_html = Column(Text, nullable=True)
    career_page_footer_html = Column(Text, nullable=True)

    # Social media links
    social_links = Column(JSON().with_variant(JSONB, "postgresql"), default=dict, comment='{"linkedin": "url", "twitter": "url"}')

    # Custom CSS
    custom_css = Column(Text, nullable=True)

    # Feature flags
    hide_hireflux_branding = Column(Boolean, nullable=False, default=False)
    use_custom_application_form = Column(Boolean, nullable=False, default=False)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    company = relationship("Company")
    custom_fields = relationship(
        "WhiteLabelApplicationField",
        back_populates="branding",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        status = "enabled" if self.is_enabled else "disabled"
        return f"<WhiteLabelBranding {self.company_id} - {status}>"


class WhiteLabelApplicationField(Base):
    """Custom application form fields for white-label career pages"""

    __tablename__ = "white_label_application_fields"

    id = Column(GUID(), primary_key=True, default=uuid4)
    company_id = Column(
        GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    branding_id = Column(
        GUID(), ForeignKey("white_label_branding.id", ondelete="CASCADE"), nullable=True
    )

    # Field configuration
    field_name = Column(String(100), nullable=False, comment='e.g., "diversity_statement"')
    field_label = Column(String(255), nullable=False, comment='e.g., "Diversity Statement"')
    field_type = Column(
        String(50),
        nullable=False,
        comment='"text", "textarea", "select", "checkbox", "file"',
    )
    field_options = Column(
        JSON().with_variant(JSONB, "postgresql"), nullable=True, comment='For select/radio: ["Option 1", "Option 2"]'
    )

    is_required = Column(Boolean, nullable=False, default=False)
    display_order = Column(Integer, nullable=False, default=0)

    help_text = Column(Text, nullable=True, comment="Instruction text for applicants")

    # Status
    is_active = Column(Boolean, nullable=False, default=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    company = relationship("Company")
    branding = relationship("WhiteLabelBranding", back_populates="custom_fields")

    def __repr__(self):
        return f"<WhiteLabelApplicationField {self.field_label} ({self.field_type})>"


class WhiteLabelDomainVerification(Base):
    """Domain verification records for custom domain setup"""

    __tablename__ = "white_label_domain_verification"

    id = Column(GUID(), primary_key=True, default=uuid4)
    company_id = Column(
        GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    # Domain information
    domain = Column(String(255), nullable=False)
    verification_method = Column(
        String(50), nullable=True, comment='"dns_txt", "dns_cname", "file_upload"'
    )
    verification_token = Column(String(255), nullable=False)

    # Verification status
    status = Column(
        String(50),
        nullable=False,
        default="pending",
        comment='"pending", "verified", "failed"',
    )
    verified_at = Column(DateTime, nullable=True)
    last_check_at = Column(DateTime, nullable=True)

    # DNS configuration
    dns_records = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True, comment="Required DNS records to add")
    error_message = Column(Text, nullable=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    company = relationship("Company")

    def __repr__(self):
        return f"<WhiteLabelDomainVerification {self.domain} - {self.status}>"
