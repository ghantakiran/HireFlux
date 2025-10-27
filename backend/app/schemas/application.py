"""Application tracking schemas"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class ApplicationStatus(str, Enum):
    """Application status"""

    SAVED = "saved"
    APPLIED = "applied"
    INTERVIEW = "interview"
    OFFER = "offer"
    REJECTED = "rejected"


class ApplicationMode(str, Enum):
    """Application submission mode"""

    MANUAL = "manual"
    APPLY_ASSIST = "apply_assist"
    AUTO_APPLY = "auto_apply"


class ApplicationCreate(BaseModel):
    """Create application"""

    job_id: str
    resume_version_id: Optional[str] = None
    cover_letter_id: Optional[str] = None
    status: ApplicationStatus = ApplicationStatus.SAVED
    notes: Optional[str] = Field(None, max_length=2000)
    is_auto_applied: bool = False
    application_mode: Optional[ApplicationMode] = ApplicationMode.MANUAL


class ApplicationUpdate(BaseModel):
    """Update application"""

    status: Optional[ApplicationStatus] = None
    notes: Optional[str] = Field(None, max_length=2000)
    resume_version_id: Optional[str] = None
    cover_letter_id: Optional[str] = None


class ApplicationResponse(BaseModel):
    """Application response"""

    id: str
    user_id: str
    job_id: str
    resume_version_id: Optional[str]
    cover_letter_id: Optional[str]
    status: ApplicationStatus
    applied_at: Optional[datetime]
    notes: Optional[str]
    is_auto_applied: bool
    application_mode: Optional[ApplicationMode]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApplicationDetailResponse(ApplicationResponse):
    """Detailed application with relationships"""

    job: Optional[dict] = None  # Job details
    resume_version: Optional[dict] = None  # Resume version details
    cover_letter: Optional[dict] = None  # Cover letter details


class ApplicationListFilter(BaseModel):
    """Filter for listing applications"""

    status: Optional[ApplicationStatus] = None
    job_id: Optional[str] = None
    is_auto_applied: Optional[bool] = None
    application_mode: Optional[ApplicationMode] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None


class ApplicationStats(BaseModel):
    """Application statistics"""

    total_applications: int
    by_status: dict  # {"saved": 5, "applied": 10, ...}
    by_mode: dict  # {"manual": 8, "auto_apply": 7, ...}
    total_interviews: int
    total_offers: int
    total_rejections: int
    success_rate: float = Field(..., ge=0, le=100)
    avg_days_to_interview: Optional[float]
    avg_days_to_offer: Optional[float]
