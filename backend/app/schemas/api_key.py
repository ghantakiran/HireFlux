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
