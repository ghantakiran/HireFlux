"""Webhook event schemas for job board integrations"""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ============================================================================
# ENUMS
# ============================================================================


class WebhookSource(str, Enum):
    """Supported webhook sources"""

    GREENHOUSE = "greenhouse"
    LEVER = "lever"
    WORKDAY = "workday"
    ASHBY = "ashby"
    UNKNOWN = "unknown"


class WebhookEventType(str, Enum):
    """Webhook event types"""

    # Application events
    APPLICATION_SUBMITTED = "application.submitted"
    APPLICATION_VIEWED = "application.viewed"
    APPLICATION_REJECTED = "application.rejected"

    # Candidate/Stage events
    CANDIDATE_STAGE_CHANGE = "candidate.stage_change"
    CANDIDATE_HIRED = "candidate.hired"
    CANDIDATE_ARCHIVED = "candidate.archived"

    # Interview events
    INTERVIEW_SCHEDULED = "interview.scheduled"
    INTERVIEW_RESCHEDULED = "interview.rescheduled"
    INTERVIEW_CANCELLED = "interview.cancelled"
    INTERVIEW_COMPLETED = "interview.completed"

    # Offer events
    OFFER_SENT = "offer.sent"
    OFFER_ACCEPTED = "offer.accepted"
    OFFER_DECLINED = "offer.declined"

    # Generic
    STATUS_UPDATE = "status.update"
    UNKNOWN = "unknown"


class WebhookEventStatus(str, Enum):
    """Processing status of webhook events"""

    PENDING = "pending"
    PROCESSING = "processing"
    PROCESSED = "processed"
    FAILED = "failed"
    RETRY_SCHEDULED = "retry_scheduled"


class ApplicationStatus(str, Enum):
    """Application status values"""

    SUBMITTED = "submitted"
    IN_REVIEW = "in_review"
    PHONE_SCREEN = "phone_screen"
    TECHNICAL_INTERVIEW = "technical_interview"
    ONSITE_INTERVIEW = "onsite_interview"
    FINAL_INTERVIEW = "final_interview"
    OFFER = "offer"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"
    HIRED = "hired"
    ARCHIVED = "archived"


class StatusChangeSource(str, Enum):
    """Source of status change"""

    SYSTEM = "system"
    WEBHOOK = "webhook"
    USER = "user"
    ADMIN = "admin"
    AUTO_APPLY = "auto_apply"


class InterviewType(str, Enum):
    """Types of interviews"""

    PHONE_SCREEN = "phone_screen"
    RECRUITER_SCREEN = "recruiter_screen"
    TECHNICAL = "technical"
    CODING = "coding"
    SYSTEM_DESIGN = "system_design"
    BEHAVIORAL = "behavioral"
    CULTURAL_FIT = "cultural_fit"
    ONSITE = "onsite"
    FINAL = "final"
    PANEL = "panel"
    OTHER = "other"


class InterviewStatus(str, Enum):
    """Interview status"""

    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    RESCHEDULED = "rescheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    NO_SHOW = "no_show"


class ConfirmationStatus(str, Enum):
    """Interview confirmation status"""

    PENDING = "pending"
    CONFIRMED = "confirmed"
    DECLINED = "declined"


class InterviewOutcome(str, Enum):
    """Interview outcome"""

    PASSED = "passed"
    FAILED = "failed"
    PENDING_FEEDBACK = "pending_feedback"
    STRONG_YES = "strong_yes"
    YES = "yes"
    NO = "no"
    STRONG_NO = "strong_no"


# ============================================================================
# WEBHOOK EVENT SCHEMAS
# ============================================================================


class WebhookEventBase(BaseModel):
    """Base webhook event schema"""

    source: WebhookSource
    event_type: WebhookEventType
    event_id: Optional[str] = None
    payload: Dict[str, Any]
    headers: Optional[Dict[str, str]] = None

    class Config:
        use_enum_values = True


class WebhookEventCreate(WebhookEventBase):
    """Create webhook event schema"""

    signature: Optional[str] = None
    is_verified: bool = False


class WebhookEventUpdate(BaseModel):
    """Update webhook event schema"""

    status: Optional[WebhookEventStatus] = None
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: Optional[int] = None
    application_id: Optional[UUID] = None
    user_id: Optional[UUID] = None

    class Config:
        use_enum_values = True


class WebhookEventResponse(WebhookEventBase):
    """Webhook event response schema"""

    id: UUID
    signature: Optional[str] = None
    is_verified: bool
    status: WebhookEventStatus
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    retry_count: int
    max_retries: int
    application_id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    received_at: datetime
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        use_enum_values = True


# ============================================================================
# APPLICATION STATUS HISTORY SCHEMAS
# ============================================================================


class ApplicationStatusHistoryBase(BaseModel):
    """Base application status history schema"""

    application_id: UUID
    new_status: ApplicationStatus
    old_status: Optional[ApplicationStatus] = None
    changed_by: Optional[StatusChangeSource] = None
    change_reason: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=2000)
    extra_data: Optional[Dict[str, Any]] = None

    class Config:
        use_enum_values = True


class ApplicationStatusHistoryCreate(ApplicationStatusHistoryBase):
    """Create application status history schema"""

    webhook_event_id: Optional[UUID] = None


class ApplicationStatusHistoryUpdate(BaseModel):
    """Update application status history schema"""

    notes: Optional[str] = Field(None, max_length=2000)
    extra_data: Optional[Dict[str, Any]] = None


class ApplicationStatusHistoryResponse(ApplicationStatusHistoryBase):
    """Application status history response schema"""

    id: UUID
    webhook_event_id: Optional[UUID] = None
    changed_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True
        use_enum_values = True


# ============================================================================
# INTERVIEW SCHEDULE SCHEMAS
# ============================================================================


class InterviewScheduleBase(BaseModel):
    """Base interview schedule schema"""

    application_id: UUID
    interview_type: InterviewType
    interview_round: int = Field(1, ge=1, le=10)
    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=15, le=480)
    timezone: Optional[str] = Field(None, max_length=50)
    location: Optional[str] = Field(None, max_length=500)
    meeting_link: Optional[str] = Field(None, max_length=500)
    dial_in_info: Optional[str] = Field(None, max_length=500)
    interviewer_names: Optional[List[str]] = None
    interviewer_emails: Optional[List[str]] = None
    notes: Optional[str] = Field(None, max_length=2000)
    extra_data: Optional[Dict[str, Any]] = None

    @field_validator("interviewer_emails")
    @classmethod
    def validate_emails(cls, v):
        """Validate email format"""
        if v:
            import re

            email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
            for email in v:
                if not re.match(email_pattern, email):
                    raise ValueError(f"Invalid email format: {email}")
        return v

    class Config:
        use_enum_values = True


class InterviewScheduleCreate(InterviewScheduleBase):
    """Create interview schedule schema"""

    user_id: UUID
    webhook_event_id: Optional[UUID] = None
    external_event_id: Optional[str] = None


class InterviewScheduleUpdate(BaseModel):
    """Update interview schedule schema"""

    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=15, le=480)
    timezone: Optional[str] = Field(None, max_length=50)
    location: Optional[str] = Field(None, max_length=500)
    meeting_link: Optional[str] = Field(None, max_length=500)
    dial_in_info: Optional[str] = Field(None, max_length=500)
    interviewer_names: Optional[List[str]] = None
    interviewer_emails: Optional[List[str]] = None
    status: Optional[InterviewStatus] = None
    confirmation_status: Optional[ConfirmationStatus] = None
    outcome: Optional[InterviewOutcome] = None
    feedback: Optional[str] = Field(None, max_length=2000)
    notes: Optional[str] = Field(None, max_length=2000)
    extra_data: Optional[Dict[str, Any]] = None

    @field_validator("interviewer_emails")
    @classmethod
    def validate_emails(cls, v):
        """Validate email format"""
        if v:
            import re

            email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
            for email in v:
                if not re.match(email_pattern, email):
                    raise ValueError(f"Invalid email format: {email}")
        return v

    class Config:
        use_enum_values = True


class InterviewScheduleResponse(InterviewScheduleBase):
    """Interview schedule response schema"""

    id: UUID
    user_id: UUID
    status: InterviewStatus
    confirmation_status: ConfirmationStatus
    reminder_sent: bool
    reminder_sent_at: Optional[datetime] = None
    external_event_id: Optional[str] = None
    calendar_invite_sent: bool
    webhook_event_id: Optional[UUID] = None
    completed_at: Optional[datetime] = None
    outcome: Optional[InterviewOutcome] = None
    feedback: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        use_enum_values = True


# ============================================================================
# WEBHOOK SUBSCRIPTION SCHEMAS
# ============================================================================


class WebhookSubscriptionBase(BaseModel):
    """Base webhook subscription schema"""

    source: WebhookSource
    source_company_id: Optional[str] = Field(None, max_length=255)
    webhook_url: str = Field(..., max_length=500)
    event_types: List[WebhookEventType] = Field(..., min_length=1)

    @field_validator("webhook_url")
    @classmethod
    def validate_url(cls, v):
        """Validate URL format"""
        import re

        url_pattern = r"^https?://.+"
        if not re.match(url_pattern, v):
            raise ValueError("Invalid webhook URL format")
        return v

    class Config:
        use_enum_values = True


class WebhookSubscriptionCreate(WebhookSubscriptionBase):
    """Create webhook subscription schema"""

    webhook_secret: Optional[str] = Field(None, max_length=512)
    is_active: bool = True


class WebhookSubscriptionUpdate(BaseModel):
    """Update webhook subscription schema"""

    webhook_url: Optional[str] = Field(None, max_length=500)
    webhook_secret: Optional[str] = Field(None, max_length=512)
    event_types: Optional[List[WebhookEventType]] = Field(None, min_length=1)
    is_active: Optional[bool] = None
    verified: Optional[bool] = None

    @field_validator("webhook_url")
    @classmethod
    def validate_url(cls, v):
        """Validate URL format"""
        if v:
            import re

            url_pattern = r"^https?://.+"
            if not re.match(url_pattern, v):
                raise ValueError("Invalid webhook URL format")
        return v

    class Config:
        use_enum_values = True


class WebhookSubscriptionResponse(WebhookSubscriptionBase):
    """Webhook subscription response schema"""

    id: UUID
    webhook_secret: Optional[str] = None
    is_active: bool
    subscription_id: Optional[str] = None
    verified: bool
    verified_at: Optional[datetime] = None
    total_events_received: int
    last_event_received_at: Optional[datetime] = None
    consecutive_failures: int
    last_failure_at: Optional[datetime] = None
    last_failure_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
        use_enum_values = True


# ============================================================================
# REQUEST/RESPONSE SCHEMAS
# ============================================================================


class WebhookVerificationRequest(BaseModel):
    """Webhook verification request (challenge-response)"""

    challenge: str


class WebhookVerificationResponse(BaseModel):
    """Webhook verification response"""

    challenge: str


class ProcessWebhookRequest(BaseModel):
    """Request to manually process a webhook event"""

    event_id: UUID
    force_reprocess: bool = False


class ProcessWebhookResponse(BaseModel):
    """Response from processing a webhook event"""

    event_id: UUID
    status: WebhookEventStatus
    processed_at: Optional[datetime] = None
    application_id: Optional[UUID] = None
    status_changes: List[ApplicationStatusHistoryResponse] = []
    interviews_scheduled: List[InterviewScheduleResponse] = []
    error_message: Optional[str] = None

    class Config:
        use_enum_values = True


class BulkStatusUpdateRequest(BaseModel):
    """Request to update multiple application statuses"""

    updates: List[ApplicationStatusHistoryCreate] = Field(
        ..., min_length=1, max_length=100
    )


class BulkStatusUpdateResponse(BaseModel):
    """Response from bulk status update"""

    total_updates: int
    successful_updates: int
    failed_updates: int
    status_changes: List[ApplicationStatusHistoryResponse] = []
    errors: List[Dict[str, Any]] = []


class InterviewReminderRequest(BaseModel):
    """Request to send interview reminder"""

    interview_id: UUID
    hours_before: int = Field(24, ge=1, le=168)  # 1 hour to 1 week


class InterviewReminderResponse(BaseModel):
    """Response from sending interview reminder"""

    interview_id: UUID
    reminder_sent: bool
    reminder_sent_at: Optional[datetime] = None
    error_message: Optional[str] = None


# ============================================================================
# STATISTICS SCHEMAS
# ============================================================================


class WebhookStatistics(BaseModel):
    """Webhook event statistics"""

    total_events: int
    pending_events: int
    processing_events: int
    processed_events: int
    failed_events: int
    events_by_source: Dict[str, int]
    events_by_type: Dict[str, int]
    average_processing_time_seconds: Optional[float] = None
    retry_rate_percentage: Optional[float] = None


class ApplicationStatusStatistics(BaseModel):
    """Application status statistics"""

    total_applications: int
    status_distribution: Dict[str, int]
    total_status_changes: int
    recent_status_changes: List[ApplicationStatusHistoryResponse] = []
    average_time_to_first_response_days: Optional[float] = None
    webhook_triggered_changes: int
    user_triggered_changes: int


class InterviewStatistics(BaseModel):
    """Interview statistics"""

    total_interviews: int
    upcoming_interviews: int
    completed_interviews: int
    cancelled_interviews: int
    interviews_by_type: Dict[str, int]
    interviews_by_outcome: Dict[str, int]
    average_interview_duration_minutes: Optional[float] = None
    confirmation_rate_percentage: Optional[float] = None
    no_show_rate_percentage: Optional[float] = None
