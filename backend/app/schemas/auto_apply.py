"""Auto-apply configuration and job queue schemas"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class AutoApplyMode(str, Enum):
    """Auto-apply operation modes"""

    APPLY_ASSIST = "apply_assist"  # User confirms each application
    AUTO_APPLY = "auto_apply"  # Fully automated with pre-approval


class AutoApplyStatus(str, Enum):
    """Status of auto-apply jobs"""

    QUEUED = "queued"
    PROCESSING = "processing"
    APPLIED = "applied"
    FAILED = "failed"
    REFUNDED = "refunded"
    CANCELLED = "cancelled"


class LocationType(str, Enum):
    """Job location types"""

    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"


class EmploymentType(str, Enum):
    """Employment types"""

    FULL_TIME = "full-time"
    PART_TIME = "part-time"
    CONTRACT = "contract"
    INTERNSHIP = "internship"


class SeniorityLevel(str, Enum):
    """Seniority levels"""

    ENTRY = "entry"
    MID = "mid"
    SENIOR = "senior"
    STAFF = "staff"
    PRINCIPAL = "principal"


# Configuration Schemas


class AutoApplyConfigCreate(BaseModel):
    """Create auto-apply configuration"""

    enabled: bool = False
    mode: AutoApplyMode = AutoApplyMode.APPLY_ASSIST
    min_fit_score: int = Field(70, ge=0, le=100)
    max_applications_per_day: int = Field(5, ge=1, le=50)
    max_applications_per_week: int = Field(25, ge=1, le=250)

    # Job preferences
    remote_only: bool = False
    hybrid_allowed: bool = True
    onsite_allowed: bool = False

    # Salary preferences (USD annual)
    min_salary: Optional[int] = Field(None, ge=0)
    max_salary: Optional[int] = Field(None, ge=0)

    # Location preferences
    preferred_locations: Optional[List[str]] = None
    excluded_locations: Optional[List[str]] = None

    # Company preferences
    preferred_companies: Optional[List[str]] = None
    excluded_companies: Optional[List[str]] = None

    # Job type preferences
    employment_types: Optional[List[EmploymentType]] = None
    seniority_levels: Optional[List[SeniorityLevel]] = None

    # Application settings
    use_default_resume: bool = True
    default_resume_id: Optional[str] = None
    auto_generate_cover_letter: bool = True

    # Notification preferences
    notify_on_apply: bool = True
    notify_on_error: bool = True
    notify_on_refund: bool = True

    @field_validator("max_salary")
    @classmethod
    def validate_salary_range(cls, v, info):
        if v is not None and info.data.get("min_salary") is not None:
            if v < info.data["min_salary"]:
                raise ValueError("max_salary must be greater than min_salary")
        return v


class AutoApplyConfigUpdate(BaseModel):
    """Update auto-apply configuration"""

    enabled: Optional[bool] = None
    mode: Optional[AutoApplyMode] = None
    min_fit_score: Optional[int] = Field(None, ge=0, le=100)
    max_applications_per_day: Optional[int] = Field(None, ge=1, le=50)
    max_applications_per_week: Optional[int] = Field(None, ge=1, le=250)

    remote_only: Optional[bool] = None
    hybrid_allowed: Optional[bool] = None
    onsite_allowed: Optional[bool] = None

    min_salary: Optional[int] = Field(None, ge=0)
    max_salary: Optional[int] = Field(None, ge=0)

    preferred_locations: Optional[List[str]] = None
    excluded_locations: Optional[List[str]] = None
    preferred_companies: Optional[List[str]] = None
    excluded_companies: Optional[List[str]] = None

    employment_types: Optional[List[EmploymentType]] = None
    seniority_levels: Optional[List[SeniorityLevel]] = None

    use_default_resume: Optional[bool] = None
    default_resume_id: Optional[str] = None
    auto_generate_cover_letter: Optional[bool] = None

    notify_on_apply: Optional[bool] = None
    notify_on_error: Optional[bool] = None
    notify_on_refund: Optional[bool] = None


class AutoApplyConfigResponse(BaseModel):
    """Auto-apply configuration response"""

    id: str
    user_id: str
    enabled: bool
    mode: AutoApplyMode
    min_fit_score: int
    max_applications_per_day: int
    max_applications_per_week: int

    remote_only: bool
    hybrid_allowed: bool
    onsite_allowed: bool

    min_salary: Optional[int]
    max_salary: Optional[int]

    preferred_locations: Optional[List[str]]
    excluded_locations: Optional[List[str]]
    preferred_companies: Optional[List[str]]
    excluded_companies: Optional[List[str]]

    employment_types: Optional[List[str]]
    seniority_levels: Optional[List[str]]

    use_default_resume: bool
    default_resume_id: Optional[str]
    auto_generate_cover_letter: bool

    notify_on_apply: bool
    notify_on_error: bool
    notify_on_refund: bool

    pause_until: Optional[datetime]
    daily_application_count: int
    weekly_application_count: int
    last_daily_reset: Optional[datetime]
    last_weekly_reset: Optional[datetime]

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Auto-Apply Job Schemas


class AutoApplyJobCreate(BaseModel):
    """Create auto-apply job entry"""

    job_id: str
    fit_score: float = Field(..., ge=0, le=100)
    fit_rationale: Optional[str] = None
    priority: int = Field(0, ge=0, le=10)
    resume_version_id: Optional[str] = None
    cover_letter_id: Optional[str] = None


class AutoApplyJobUpdate(BaseModel):
    """Update auto-apply job status"""

    status: Optional[AutoApplyStatus] = None
    priority: Optional[int] = Field(None, ge=0, le=10)
    user_approved: Optional[bool] = None
    notes: Optional[str] = None


class AutoApplyJobResponse(BaseModel):
    """Auto-apply job response"""

    id: str
    user_id: str
    job_id: str
    application_id: Optional[str]

    status: AutoApplyStatus
    priority: int
    fit_score: float
    fit_rationale: Optional[str]

    resume_version_id: Optional[str]
    cover_letter_id: Optional[str]

    job_source: str
    job_board_url: str
    application_url: Optional[str]
    company_name: Optional[str]

    scheduled_at: Optional[datetime]
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    attempts: int
    max_attempts: int

    error_message: Optional[str]
    error_type: Optional[str]
    last_error_at: Optional[datetime]

    credits_used: int
    credits_refunded: bool
    refund_reason: Optional[str]
    refunded_at: Optional[datetime]

    user_approved: bool
    tos_compliant: bool

    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AutoApplyJobDetailResponse(AutoApplyJobResponse):
    """Detailed auto-apply job with form data"""

    form_data: Optional[dict]
    submission_response: Optional[dict]


# Batch Operations


class AutoApplyBatchCreate(BaseModel):
    """Create multiple auto-apply jobs at once"""

    job_ids: List[str] = Field(..., min_length=1, max_length=100)
    priority: int = Field(0, ge=0, le=10)


class AutoApplyBatchResponse(BaseModel):
    """Batch operation response"""

    total_queued: int
    successful: int
    failed: int
    errors: List[str]
    queued_job_ids: List[str]


# Refund Request


class RefundRequest(BaseModel):
    """Request credit refund for failed/invalid application"""

    reason: str = Field(..., min_length=10, max_length=500)


class RefundResponse(BaseModel):
    """Refund operation response"""

    success: bool
    credits_refunded: int
    message: str


# Statistics


class AutoApplyStats(BaseModel):
    """Auto-apply statistics for user dashboard"""

    total_queued: int
    total_processing: int
    total_applied: int
    total_failed: int
    total_refunded: int
    total_cancelled: int

    credits_used_today: int
    credits_used_this_week: int
    applications_today: int
    applications_this_week: int

    success_rate: float = Field(..., ge=0, le=100)
    avg_fit_score: float = Field(..., ge=0, le=100)

    most_applied_companies: List[dict]  # [{"company": "X", "count": 5}, ...]
    most_common_errors: List[dict]  # [{"error_type": "X", "count": 3}, ...]


# Queue Management


class QueueFilter(BaseModel):
    """Filter for auto-apply queue"""

    status: Optional[AutoApplyStatus] = None
    min_fit_score: Optional[int] = Field(None, ge=0, le=100)
    max_fit_score: Optional[int] = Field(None, ge=0, le=100)
    job_source: Optional[str] = None
    company_name: Optional[str] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None


class QueueResponse(BaseModel):
    """Auto-apply queue response with pagination"""

    total: int
    jobs: List[AutoApplyJobResponse]
    page: int
    page_size: int
    has_more: bool
