"""Notification schemas for validation and serialization"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class NotificationType(str, Enum):
    """Notification types"""

    JOB_MATCH = "job_match"
    APPLICATION_STATUS = "application_status"
    INTERVIEW_REMINDER = "interview_reminder"
    CREDIT_LOW = "credit_low"
    CREDIT_REFUND = "credit_refund"
    WEEKLY_DIGEST = "weekly_digest"
    SYSTEM_UPDATE = "system_update"
    MARKETING = "marketing"


class NotificationPriority(str, Enum):
    """Notification priority levels"""

    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class NotificationCategory(str, Enum):
    """Notification categories"""

    JOBS = "jobs"
    APPLICATIONS = "applications"
    ACCOUNT = "account"
    BILLING = "billing"
    SYSTEM = "system"


# Request Schemas
class NotificationCreate(BaseModel):
    """Schema for creating a notification"""

    type: NotificationType
    title: str = Field(..., min_length=1, max_length=255)
    message: str = Field(..., min_length=1)
    action_url: Optional[str] = Field(None, max_length=500)
    priority: NotificationPriority = NotificationPriority.NORMAL
    category: Optional[NotificationCategory] = None
    data: Optional[Dict[str, Any]] = None
    expires_at: Optional[datetime] = None

    class Config:
        json_schema_extra = {
            "example": {
                "type": "job_match",
                "title": "New High-Fit Job Match!",
                "message": "We found a Senior Software Engineer role at Google that's a 95% match for your profile.",
                "action_url": "/dashboard/jobs/123",
                "priority": "high",
                "category": "jobs",
                "data": {"job_id": 123, "fit_score": 95},
            }
        }


class NotificationUpdate(BaseModel):
    """Schema for updating a notification"""

    is_read: Optional[bool] = None
    is_archived: Optional[bool] = None


class NotificationPreferenceUpdate(BaseModel):
    """Schema for updating notification preferences"""

    # Email preferences
    email_job_matches: Optional[bool] = None
    email_application_updates: Optional[bool] = None
    email_interview_reminders: Optional[bool] = None
    email_credit_alerts: Optional[bool] = None
    email_weekly_digest: Optional[bool] = None
    email_marketing: Optional[bool] = None

    # In-app preferences
    inapp_job_matches: Optional[bool] = None
    inapp_application_updates: Optional[bool] = None
    inapp_interview_reminders: Optional[bool] = None
    inapp_credit_alerts: Optional[bool] = None
    inapp_system_updates: Optional[bool] = None

    # Frequency settings
    job_match_frequency: Optional[str] = Field(
        None, pattern="^(immediate|daily|weekly)$"
    )
    digest_day: Optional[str] = Field(
        None, pattern="^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$"
    )
    quiet_hours_start: Optional[int] = Field(None, ge=0, le=23)
    quiet_hours_end: Optional[int] = Field(None, ge=0, le=23)


# Response Schemas
class NotificationResponse(BaseModel):
    """Response schema for notification"""

    id: int
    user_id: int
    type: str
    title: str
    message: str
    action_url: Optional[str] = None
    priority: str
    category: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    is_read: bool
    is_archived: bool
    read_at: Optional[datetime] = None
    email_sent: bool
    email_sent_at: Optional[datetime] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    is_expired: bool = False
    is_unread: bool = True

    class Config:
        from_attributes = True


class NotificationPreferenceResponse(BaseModel):
    """Response schema for notification preferences"""

    id: int
    user_id: int
    email_job_matches: bool
    email_application_updates: bool
    email_interview_reminders: bool
    email_credit_alerts: bool
    email_weekly_digest: bool
    email_marketing: bool
    inapp_job_matches: bool
    inapp_application_updates: bool
    inapp_interview_reminders: bool
    inapp_credit_alerts: bool
    inapp_system_updates: bool
    job_match_frequency: str
    digest_day: str
    quiet_hours_start: Optional[int] = None
    quiet_hours_end: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class NotificationStats(BaseModel):
    """User's notification statistics"""

    total_notifications: int = 0
    unread_count: int = 0
    by_category: Dict[str, int] = Field(default_factory=dict)
    by_priority: Dict[str, int] = Field(default_factory=dict)
    recent_notifications: List[NotificationResponse] = Field(default_factory=list)


# Email Schemas
class EmailSend(BaseModel):
    """Schema for sending an email"""

    to_email: str = Field(..., pattern=r"^[\w\.-]+@[\w\.-]+\.\w+$")
    subject: str = Field(..., min_length=1, max_length=255)
    html_body: str = Field(..., min_length=1)
    text_body: Optional[str] = None
    template_name: Optional[str] = None
    template_variables: Optional[Dict[str, Any]] = None


class EmailResponse(BaseModel):
    """Response from email service"""

    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None
