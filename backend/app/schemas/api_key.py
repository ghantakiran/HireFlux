"""API Key and Webhook schemas for Sprint 17-18

Pydantic schemas for API key management and webhook system.
"""

from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, validator


# ============================================================================
# API Key Schemas
# ============================================================================


class APIKeyPermissions(BaseModel):
    """API key permissions structure"""

    jobs: List[str] = Field(default=["read"], description="Job permissions: read, write, delete")
    candidates: List[str] = Field(default=["read"], description="Candidate permissions: read, write")
    applications: List[str] = Field(default=["read"], description="Application permissions: read, write")
    webhooks: List[str] = Field(default=[], description="Webhook permissions: read, write, delete")
    analytics: List[str] = Field(default=[], description="Analytics permissions: read")

    @validator("jobs", "candidates", "applications", "webhooks", "analytics")
    def validate_permissions(cls, v):
        """Validate permission values"""
        valid_perms = {"read", "write", "delete"}
        for perm in v:
            if perm not in valid_perms:
                raise ValueError(f"Invalid permission: {perm}. Must be one of {valid_perms}")
        return v


class APIKeyCreate(BaseModel):
    """Request schema for creating an API key"""

    name: str = Field(..., min_length=1, max_length=255, description="Human-readable name")
    permissions: Optional[APIKeyPermissions] = Field(
        default_factory=lambda: APIKeyPermissions(),
        description="Scoped permissions",
    )
    rate_limit_tier: str = Field(
        default="standard",
        description="Rate limit tier: standard, elevated, enterprise",
    )
    expires_at: Optional[datetime] = Field(
        None, description="Optional expiration date"
    )

    @validator("rate_limit_tier")
    def validate_tier(cls, v):
        """Validate rate limit tier"""
        valid_tiers = {"standard", "elevated", "enterprise"}
        if v not in valid_tiers:
            raise ValueError(f"Invalid tier: {v}. Must be one of {valid_tiers}")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "name": "Production API Key",
                "permissions": {
                    "jobs": ["read", "write"],
                    "candidates": ["read"],
                    "applications": ["read", "write"],
                },
                "rate_limit_tier": "elevated",
            }
        }


class APIKeyResponse(BaseModel):
    """Response schema for API key (includes plaintext key only on creation)"""

    id: UUID
    company_id: UUID
    name: str
    key_prefix: str
    key: Optional[str] = Field(
        None,
        description="Full API key (only returned on creation, never again)",
    )
    permissions: Dict
    rate_limit_tier: str
    rate_limit_requests_per_minute: int
    rate_limit_requests_per_hour: int
    last_used_at: Optional[datetime]
    last_used_ip: Optional[str]
    expires_at: Optional[datetime]
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime
    revoked_at: Optional[datetime]
    status: str

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "company_id": "660e8400-e29b-41d4-a716-446655440000",
                "name": "Production API Key",
                "key_prefix": "hf_live_",
                "key": "hf_live_1234567890abcdef1234567890abcdef",
                "permissions": {"jobs": ["read", "write"], "candidates": ["read"]},
                "rate_limit_tier": "elevated",
                "rate_limit_requests_per_minute": 120,
                "rate_limit_requests_per_hour": 6000,
                "status": "active",
            }
        }


class APIKeyUpdate(BaseModel):
    """Request schema for updating an API key"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    permissions: Optional[APIKeyPermissions] = None
    rate_limit_tier: Optional[str] = None

    @validator("rate_limit_tier")
    def validate_tier(cls, v):
        """Validate rate limit tier"""
        if v is not None:
            valid_tiers = {"standard", "elevated", "enterprise"}
            if v not in valid_tiers:
                raise ValueError(f"Invalid tier: {v}. Must be one of {valid_tiers}")
        return v


class APIKeyList(BaseModel):
    """Response schema for listing API keys"""

    keys: List[APIKeyResponse]
    total: int
    page: int = 1
    page_size: int = 20


class APIKeyUsageStats(BaseModel):
    """API key usage statistics"""

    total_requests: int
    requests_by_endpoint: Dict[str, int]
    requests_by_status: Dict[str, int]
    avg_response_time_ms: float
    error_rate: float
    period_start: datetime
    period_end: datetime


# ============================================================================
# Webhook Schemas
# ============================================================================


class WebhookRetryPolicy(BaseModel):
    """Webhook retry policy configuration"""

    max_attempts: int = Field(default=3, ge=1, le=10)
    backoff_seconds: List[int] = Field(
        default=[60, 300, 900],
        description="Backoff intervals in seconds for each retry",
    )


class WebhookCreate(BaseModel):
    """Request schema for creating a webhook"""

    url: str = Field(..., min_length=1, max_length=500, description="Webhook endpoint URL")
    description: Optional[str] = Field(None, max_length=1000)
    events: List[str] = Field(
        ...,
        min_items=1,
        description="Subscribed events: application.created, job.published, etc.",
    )
    retry_policy: Optional[WebhookRetryPolicy] = Field(
        default_factory=WebhookRetryPolicy
    )
    headers: Optional[Dict[str, str]] = Field(None, description="Custom headers")

    @validator("url")
    def validate_url(cls, v):
        """Validate webhook URL"""
        if not v.startswith(("http://", "https://")):
            raise ValueError("Webhook URL must start with http:// or https://")
        return v

    @validator("events")
    def validate_events(cls, v):
        """Validate event types"""
        valid_events = {
            "application.created",
            "application.updated",
            "application.status_changed",
            "job.published",
            "job.closed",
            "interview.scheduled",
            "candidate.viewed",
        }
        for event in v:
            if event not in valid_events:
                raise ValueError(
                    f"Invalid event: {event}. Must be one of {valid_events}"
                )
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://api.example.com/webhooks/hireflux",
                "description": "Production webhook for new applications",
                "events": ["application.created", "application.status_changed"],
                "headers": {"X-Custom-Header": "value"},
            }
        }


class WebhookResponse(BaseModel):
    """Response schema for webhook"""

    id: UUID
    company_id: UUID
    url: str
    description: Optional[str]
    events: List[str]
    secret: str = Field(description="HMAC secret for signature verification")
    is_active: bool
    retry_policy: Dict
    headers: Optional[Dict[str, str]]
    last_triggered_at: Optional[datetime]
    failure_count: int
    disabled_at: Optional[datetime]
    created_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WebhookUpdate(BaseModel):
    """Request schema for updating a webhook"""

    url: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=1000)
    events: Optional[List[str]] = None
    is_active: Optional[bool] = None
    headers: Optional[Dict[str, str]] = None

    @validator("url")
    def validate_url(cls, v):
        """Validate webhook URL"""
        if v is not None and not v.startswith(("http://", "https://")):
            raise ValueError("Webhook URL must start with http:// or https://")
        return v


class WebhookList(BaseModel):
    """Response schema for listing webhooks"""

    webhooks: List[WebhookResponse]
    total: int
    page: int = 1
    page_size: int = 20


class WebhookDeliveryResponse(BaseModel):
    """Response schema for webhook delivery"""

    id: UUID
    webhook_id: UUID
    event_type: str
    event_id: Optional[UUID]
    attempt_number: int
    status: str
    http_status_code: Optional[int]
    response_time_ms: Optional[int]
    error_message: Optional[str]
    next_retry_at: Optional[datetime]
    delivered_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class WebhookDeliveryList(BaseModel):
    """Response schema for listing webhook deliveries"""

    deliveries: List[WebhookDeliveryResponse]
    total: int
    page: int = 1
    page_size: int = 20


class WebhookTestRequest(BaseModel):
    """Request schema for testing a webhook"""

    event_type: str = Field(..., description="Event type to simulate")

    @validator("event_type")
    def validate_event(cls, v):
        """Validate event type"""
        valid_events = {
            "application.created",
            "application.updated",
            "application.status_changed",
            "job.published",
            "job.closed",
            "interview.scheduled",
            "candidate.viewed",
        }
        if v not in valid_events:
            raise ValueError(f"Invalid event: {v}. Must be one of {valid_events}")
        return v


# ============================================================================
# White-Label Branding Schemas - Sprint 17-18 Phase 3
# ============================================================================


class WhiteLabelBrandingUpdate(BaseModel):
    """Update schema for white-label branding configuration"""

    company_display_name: Optional[str] = Field(None, max_length=255)

    # Logos
    logo_url: Optional[str] = Field(None, max_length=500)
    logo_dark_url: Optional[str] = Field(None, max_length=500)
    logo_icon_url: Optional[str] = Field(None, max_length=500)
    logo_email_url: Optional[str] = Field(None, max_length=500)

    # Colors
    primary_color: Optional[str] = Field(None, min_length=7, max_length=7)
    secondary_color: Optional[str] = Field(None, min_length=7, max_length=7)
    accent_color: Optional[str] = Field(None, min_length=7, max_length=7)
    text_color: Optional[str] = Field(None, min_length=7, max_length=7)
    background_color: Optional[str] = Field(None, min_length=7, max_length=7)

    # Typography
    font_family: Optional[str] = Field(None, max_length=100)
    heading_font_family: Optional[str] = Field(None, max_length=100)

    # Email branding
    email_from_name: Optional[str] = Field(None, max_length=255)
    email_from_address: Optional[str] = Field(None, max_length=255)
    email_reply_to: Optional[str] = Field(None, max_length=255)
    email_footer_text: Optional[str] = None
    email_header_html: Optional[str] = None

    # Career page
    career_page_enabled: Optional[bool] = None
    career_page_slug: Optional[str] = Field(None, max_length=100)
    career_page_title: Optional[str] = Field(None, max_length=255)
    career_page_description: Optional[str] = None
    career_page_header_html: Optional[str] = None
    career_page_footer_html: Optional[str] = None

    # Social links
    social_links: Optional[Dict[str, str]] = None

    # Custom CSS
    custom_css: Optional[str] = Field(None, max_length=50000)

    # Feature flags
    hide_hireflux_branding: Optional[bool] = None
    use_custom_application_form: Optional[bool] = None

    @validator("primary_color", "secondary_color", "accent_color", "text_color", "background_color")
    def validate_hex_color(cls, v):
        """Validate hex color format"""
        if v is not None:
            if not v.startswith("#") or len(v) != 7:
                raise ValueError("Color must be in hex format (#RRGGBB)")
            try:
                int(v[1:], 16)
            except ValueError:
                raise ValueError("Invalid hex color value")
        return v

    @validator("career_page_slug")
    def validate_slug(cls, v):
        """Validate URL slug format"""
        if v is not None:
            if not v.replace("-", "").replace("_", "").isalnum():
                raise ValueError("Slug must contain only alphanumeric characters, hyphens, and underscores")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "company_display_name": "Acme Corporation",
                "primary_color": "#FF0000",
                "secondary_color": "#00FF00",
                "email_from_name": "Acme Careers",
                "career_page_slug": "acme-corp",
                "hide_hireflux_branding": True,
            }
        }


class WhiteLabelBrandingResponse(BaseModel):
    """Response schema for white-label branding configuration"""

    id: UUID
    company_id: UUID
    is_enabled: bool
    enabled_at: Optional[datetime]

    company_display_name: Optional[str]

    # Logos
    logo_url: Optional[str]
    logo_dark_url: Optional[str]
    logo_icon_url: Optional[str]
    logo_email_url: Optional[str]

    # Colors
    primary_color: str
    secondary_color: str
    accent_color: str
    text_color: str
    background_color: str

    # Typography
    font_family: str
    heading_font_family: Optional[str]

    # Custom domain
    custom_domain: Optional[str]
    custom_domain_verified: bool
    custom_domain_ssl_enabled: bool

    # Email branding
    email_from_name: Optional[str]
    email_from_address: Optional[str]
    email_reply_to: Optional[str]
    email_footer_text: Optional[str]
    email_header_html: Optional[str]

    # Career page
    career_page_enabled: bool
    career_page_slug: Optional[str]
    career_page_title: Optional[str]
    career_page_description: Optional[str]
    career_page_header_html: Optional[str]
    career_page_footer_html: Optional[str]

    # Social links
    social_links: Dict[str, str]

    # Custom CSS
    custom_css: Optional[str]

    # Feature flags
    hide_hireflux_branding: bool
    use_custom_application_form: bool

    # Metadata
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CustomApplicationFieldCreate(BaseModel):
    """Request schema for creating custom application field"""

    field_name: str = Field(..., min_length=1, max_length=100)
    field_label: str = Field(..., min_length=1, max_length=255)
    field_type: str = Field(..., description="Field type: text, textarea, select, checkbox, file")
    field_options: Optional[List[str]] = Field(None, description="Options for select/radio fields")
    is_required: bool = Field(default=False)
    help_text: Optional[str] = None

    @validator("field_type")
    def validate_field_type(cls, v):
        """Validate field type"""
        valid_types = {"text", "textarea", "select", "checkbox", "file"}
        if v not in valid_types:
            raise ValueError(f"Invalid field type: {v}. Must be one of {valid_types}")
        return v

    @validator("field_options")
    def validate_options(cls, v, values):
        """Validate options for select fields"""
        if values.get("field_type") == "select" and (v is None or len(v) == 0):
            raise ValueError("Select fields must have at least one option")
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "field_name": "diversity_statement",
                "field_label": "Diversity Statement",
                "field_type": "textarea",
                "is_required": False,
                "help_text": "Tell us about your commitment to diversity and inclusion",
            }
        }


class CustomApplicationFieldUpdate(BaseModel):
    """Update schema for custom application field"""

    field_label: Optional[str] = Field(None, min_length=1, max_length=255)
    field_options: Optional[List[str]] = None
    is_required: Optional[bool] = None
    help_text: Optional[str] = None
    is_active: Optional[bool] = None


class CustomApplicationFieldResponse(BaseModel):
    """Response schema for custom application field"""

    id: UUID
    company_id: UUID
    field_name: str
    field_label: str
    field_type: str
    field_options: Optional[List[str]]
    is_required: bool
    display_order: int
    help_text: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class DomainVerificationResponse(BaseModel):
    """Response schema for domain verification"""

    domain: str
    verification_token: str
    verification_method: str
    dns_records: List[Dict[str, str]]
    status: str
    verified_at: Optional[datetime]
    error_message: Optional[str]

    class Config:
        from_attributes = True


class DomainSetupRequest(BaseModel):
    """Request schema for setting up custom domain"""

    domain: str = Field(..., min_length=3, max_length=255)

    @validator("domain")
    def validate_domain(cls, v):
        """Validate domain format"""
        # Basic domain validation (can be enhanced)
        if not v or " " in v:
            raise ValueError("Invalid domain format")
        if v.endswith(".hireflux.com"):
            raise ValueError("Cannot use HireFlux subdomain for white-label")
        return v.lower()

    class Config:
        json_schema_extra = {
            "example": {
                "domain": "careers.acme.com"
            }
        }
