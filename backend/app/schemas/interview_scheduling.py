"""Pydantic schemas for interview scheduling (Sprint 13-14)

Schemas for request/response validation in interview scheduling APIs.
"""
from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


# ============================================================================
# Interview Scheduling Schemas
# ============================================================================


class InterviewScheduleCreate(BaseModel):
    """Schema for creating a new interview"""

    application_id: UUID
    interview_type: str = Field(
        ..., description="Type: phone_screen, technical, behavioral, onsite, final"
    )
    interview_round: int = Field(1, ge=1, le=10, description="Interview round number")
    scheduled_at: datetime = Field(..., description="Interview date and time")
    duration_minutes: int = Field(
        30, ge=15, le=480, description="Interview duration (15-480 minutes)"
    )
    timezone: str = Field("UTC", description="Timezone (e.g., America/New_York)")
    meeting_platform: Optional[str] = Field(
        None, description="Platform: zoom, google_meet, microsoft_teams, in_person"
    )
    meeting_link: Optional[str] = Field(None, description="Video meeting link")
    location: Optional[str] = Field(
        None, description="Physical location (for in_person)"
    )
    interviewer_ids: List[UUID] = Field(
        default_factory=list, description="List of interviewer company member IDs"
    )
    notes: Optional[str] = None

    @field_validator("interview_type")
    @classmethod
    def validate_interview_type(cls, v: str) -> str:
        """Validate interview type"""
        valid_types = [
            "phone_screen",
            "technical",
            "behavioral",
            "onsite",
            "final",
            "cultural_fit",
        ]
        if v not in valid_types:
            raise ValueError(f"Interview type must be one of: {', '.join(valid_types)}")
        return v

    @field_validator("meeting_platform")
    @classmethod
    def validate_platform(cls, v: Optional[str]) -> Optional[str]:
        """Validate meeting platform"""
        if v is None:
            return v
        valid_platforms = ["zoom", "google_meet", "microsoft_teams", "in_person"]
        if v not in valid_platforms:
            raise ValueError(f"Platform must be one of: {', '.join(valid_platforms)}")
        return v


class InterviewScheduleUpdate(BaseModel):
    """Schema for updating an interview"""

    scheduled_at: Optional[datetime] = None
    duration_minutes: Optional[int] = Field(None, ge=15, le=480)
    timezone: Optional[str] = None
    meeting_platform: Optional[str] = None
    meeting_link: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None


class InterviewScheduleResponse(BaseModel):
    """Schema for interview schedule response"""

    id: UUID
    application_id: UUID
    user_id: UUID
    interview_type: str
    interview_round: int
    scheduled_at: Optional[datetime]
    duration_minutes: Optional[int]
    timezone: Optional[str]
    meeting_platform: Optional[str]
    meeting_link: Optional[str]
    location: Optional[str]
    interviewer_ids: Optional[List[str]] = None  # Stored as JSON array
    status: str  # 'scheduled', 'confirmed', 'rescheduled', 'completed', 'cancelled', 'no_show'
    confirmation_status: str  # 'pending', 'confirmed', 'declined'
    reminder_sent: bool = False
    calendar_event_id: Optional[str] = None
    calendar_invite_sent: bool = False
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Populated from joins
    candidate_name: Optional[str] = None
    candidate_email: Optional[str] = None
    job_title: Optional[str] = None

    model_config = {"from_attributes": True}


class InterviewRescheduleRequest(BaseModel):
    """Schema for rescheduling an interview"""

    new_time: datetime = Field(..., description="New interview date and time")
    reason: Optional[str] = Field(None, description="Reason for rescheduling")


class InterviewCancelRequest(BaseModel):
    """Schema for canceling an interview"""

    reason: str = Field(..., min_length=5, description="Cancellation reason")


# ============================================================================
# Interviewer Assignment Schemas
# ============================================================================


class InterviewerAssignRequest(BaseModel):
    """Schema for assigning interviewers"""

    interviewer_ids: List[UUID] = Field(
        ..., min_length=1, description="List of interviewer company member IDs"
    )


class InterviewerRemoveRequest(BaseModel):
    """Schema for removing an interviewer"""

    interviewer_id: UUID = Field(
        ..., description="Interviewer company member ID to remove"
    )


# ============================================================================
# Candidate Availability Schemas
# ============================================================================


class TimeSlot(BaseModel):
    """Schema for a time slot"""

    start: datetime = Field(..., description="Slot start time (ISO 8601)")
    end: datetime = Field(..., description="Slot end time (ISO 8601)")

    @field_validator("end")
    @classmethod
    def validate_end_after_start(cls, v: datetime, info) -> datetime:
        """Validate end time is after start time"""
        start = info.data.get("start")
        if start and v <= start:
            raise ValueError("End time must be after start time")
        return v


class AvailabilityRequestCreate(BaseModel):
    """Schema for requesting candidate availability"""

    application_id: UUID
    deadline: datetime = Field(..., description="Deadline for candidate to respond")


class AvailabilitySubmit(BaseModel):
    """Schema for candidate submitting availability"""

    application_id: UUID
    slots: List[TimeSlot] = Field(
        ..., min_length=1, max_length=10, description="Available time slots (1-10)"
    )
    timezone: str = Field(..., description="Timezone (e.g., America/New_York)")
    preferred_platform: Optional[str] = Field(
        None, description="Preferred meeting platform"
    )
    notes: Optional[str] = Field(None, max_length=500)

    @field_validator("preferred_platform")
    @classmethod
    def validate_platform(cls, v: Optional[str]) -> Optional[str]:
        """Validate preferred platform"""
        if v is None:
            return v
        valid_platforms = ["zoom", "google_meet", "microsoft_teams", "phone"]
        if v not in valid_platforms:
            raise ValueError(f"Platform must be one of: {', '.join(valid_platforms)}")
        return v


class CandidateAvailabilityResponse(BaseModel):
    """Schema for candidate availability response"""

    id: UUID
    application_id: UUID
    candidate_id: UUID
    available_slots: List[Dict[str, Any]]  # List of time slots
    timezone: str
    preferred_platform: Optional[str] = None
    notes: Optional[str] = None
    expires_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ============================================================================
# Interview Feedback Schemas
# ============================================================================


class InterviewFeedbackCreate(BaseModel):
    """Schema for submitting interview feedback"""

    interview_id: UUID
    overall_rating: Optional[int] = Field(
        None, ge=1, le=5, description="Overall rating (1-5)"
    )
    technical_rating: Optional[int] = Field(
        None, ge=1, le=5, description="Technical skills rating (1-5)"
    )
    communication_rating: Optional[int] = Field(
        None, ge=1, le=5, description="Communication rating (1-5)"
    )
    culture_fit_rating: Optional[int] = Field(
        None, ge=1, le=5, description="Culture fit rating (1-5)"
    )
    strengths: List[str] = Field(default_factory=list, description="List of strengths")
    concerns: List[str] = Field(default_factory=list, description="List of concerns")
    notes: Optional[str] = Field(None, max_length=2000)
    recommendation: Optional[str] = Field(
        None, description="Recommendation: strong_yes, yes, maybe, no, strong_no"
    )
    next_steps: Optional[str] = Field(None, max_length=500)

    @field_validator("recommendation")
    @classmethod
    def validate_recommendation(cls, v: Optional[str]) -> Optional[str]:
        """Validate recommendation"""
        if v is None:
            return v
        valid_recommendations = ["strong_yes", "yes", "maybe", "no", "strong_no"]
        if v not in valid_recommendations:
            raise ValueError(
                f"Recommendation must be one of: {', '.join(valid_recommendations)}"
            )
        return v


class InterviewFeedbackResponse(BaseModel):
    """Schema for interview feedback response"""

    id: UUID
    interview_id: UUID
    interviewer_id: UUID
    application_id: UUID
    overall_rating: Optional[int] = None
    technical_rating: Optional[int] = None
    communication_rating: Optional[int] = None
    culture_fit_rating: Optional[int] = None
    strengths: Optional[List[str]] = None
    concerns: Optional[List[str]] = None
    notes: Optional[str] = None
    recommendation: Optional[str] = None
    next_steps: Optional[str] = None
    is_submitted: bool = False
    submitted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Populated from joins
    interviewer_name: Optional[str] = None
    interviewer_email: Optional[str] = None

    model_config = {"from_attributes": True}


class AggregatedFeedbackResponse(BaseModel):
    """Schema for aggregated feedback across all interviews"""

    application_id: UUID
    total_feedbacks: int
    average_overall_rating: Optional[float] = None
    average_technical_rating: Optional[float] = None
    average_communication_rating: Optional[float] = None
    average_culture_fit_rating: Optional[float] = None
    recommendations: Dict[str, int]  # Map of recommendation -> count
    common_strengths: List[str]
    common_concerns: List[str]


# ============================================================================
# Interview List and Filter Schemas
# ============================================================================


class InterviewListFilters(BaseModel):
    """Schema for filtering interview list"""

    status: Optional[str] = None  # 'scheduled', 'completed', etc.
    interview_type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    interviewer_id: Optional[UUID] = None


class InterviewListResponse(BaseModel):
    """Schema for interview list response"""

    interviews: List[InterviewScheduleResponse]
    total: int
    filtered_total: int


# ============================================================================
# Calendar Integration Schemas
# ============================================================================


class CalendarSyncRequest(BaseModel):
    """Schema for syncing interview to calendar"""

    interview_id: UUID
    platform: str = Field("google", description="Calendar platform: google, microsoft")

    @field_validator("platform")
    @classmethod
    def validate_platform(cls, v: str) -> str:
        """Validate calendar platform"""
        valid_platforms = ["google", "microsoft"]
        if v not in valid_platforms:
            raise ValueError(f"Platform must be one of: {', '.join(valid_platforms)}")
        return v


class CalendarSyncResponse(BaseModel):
    """Schema for calendar sync response"""

    interview_id: UUID
    calendar_event_id: str
    platform: str
    synced_at: datetime


class CalendarInviteRequest(BaseModel):
    """Schema for sending calendar invite"""

    interview_id: UUID


# ============================================================================
# Interview Reminder Schemas
# ============================================================================


class ReminderSendRequest(BaseModel):
    """Schema for sending interview reminders"""

    hours_before: int = Field(
        24, ge=1, le=168, description="Hours before interview (1-168)"
    )


class ReminderSendResponse(BaseModel):
    """Schema for reminder send response"""

    reminders_sent: int
    interviews_notified: List[UUID]
