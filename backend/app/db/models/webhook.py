"""Webhook event models for job board integrations"""
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    TIMESTAMP,
    ForeignKey,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID


class WebhookEvent(Base):
    """Incoming webhook events from job boards"""

    __tablename__ = "webhook_events"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    # Source identification
    source = Column(
        String(50), nullable=False, index=True
    )  # 'greenhouse', 'lever', etc.
    event_type = Column(
        String(100), nullable=False, index=True
    )  # 'application.submitted', 'candidate.stage_change', etc.
    event_id = Column(
        String(255), nullable=True, index=True
    )  # External event ID from job board

    # Webhook metadata
    signature = Column(String(512), nullable=True)  # Webhook signature for verification
    is_verified = Column(Boolean, default=False)  # Whether signature was verified

    # Payload
    payload = Column(JSON, nullable=False)  # Complete webhook payload
    headers = Column(JSON, nullable=True)  # HTTP headers from webhook request

    # Processing status
    status = Column(
        String(50), default="pending", nullable=False, index=True
    )  # 'pending', 'processing', 'processed', 'failed'
    processed_at = Column(TIMESTAMP, nullable=True)

    # Error tracking
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)

    # Related entities
    application_id = Column(
        GUID(),
        ForeignKey("applications.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    user_id = Column(
        GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Timestamps
    received_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    application = relationship("Application", back_populates="webhook_events")
    user = relationship("User", back_populates="webhook_events")
    status_history = relationship(
        "ApplicationStatusHistory",
        back_populates="webhook_event",
        cascade="all, delete-orphan",
    )


class ApplicationStatusHistory(Base):
    """Track application status changes over time"""

    __tablename__ = "application_status_history"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    application_id = Column(
        GUID(),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Status information
    old_status = Column(String(50), nullable=True)
    new_status = Column(
        String(50), nullable=False, index=True
    )  # 'submitted', 'in_review', 'phone_screen', 'onsite', 'offer', 'rejected'

    # Change metadata
    changed_by = Column(
        String(50), nullable=True
    )  # 'system', 'webhook', 'user', 'admin'
    change_reason = Column(Text, nullable=True)

    # Related webhook event
    webhook_event_id = Column(
        GUID(), ForeignKey("webhook_events.id", ondelete="SET NULL"), nullable=True
    )

    # Additional context
    extra_data = Column(
        JSON, nullable=True
    )  # Any additional data (stage name, rejection reason, etc.)
    notes = Column(Text, nullable=True)

    # Timestamps
    changed_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    application = relationship("Application", back_populates="status_history")
    webhook_event = relationship("WebhookEvent", back_populates="status_history")


class InterviewSchedule(Base):
    """Interview scheduling and tracking"""

    __tablename__ = "interview_schedules"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    application_id = Column(
        GUID(),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Interview details
    interview_type = Column(
        String(50), nullable=False
    )  # 'phone_screen', 'technical', 'behavioral', 'onsite', 'final'
    interview_round = Column(Integer, default=1)

    # Scheduling
    scheduled_at = Column(TIMESTAMP, nullable=True, index=True)
    duration_minutes = Column(Integer, nullable=True)
    timezone = Column(String(50), nullable=True)

    # Location/link
    location = Column(Text, nullable=True)  # Physical address or empty if virtual
    meeting_link = Column(Text, nullable=True)  # Zoom, Google Meet, etc.
    dial_in_info = Column(Text, nullable=True)

    # Participants
    interviewer_names = Column(JSON, nullable=True)  # List of interviewer names
    interviewer_emails = Column(JSON, nullable=True)  # List of interviewer emails

    # Sprint 13-14: Enhanced interview scheduling
    interviewer_ids = Column(
        JSON, nullable=True
    )  # Array of company_member IDs assigned as interviewers
    meeting_platform = Column(
        String(50), nullable=True
    )  # 'zoom', 'google_meet', 'microsoft_teams', 'in_person'
    calendar_event_id = Column(
        String(255), nullable=True
    )  # Google Calendar / Outlook event ID
    reminders_config = Column(JSON, nullable=True)  # {"24h": true, "1h": true}

    # Status
    status = Column(
        String(50), default="scheduled", nullable=False, index=True
    )  # 'scheduled', 'confirmed', 'rescheduled', 'completed', 'cancelled', 'no_show'
    confirmation_status = Column(
        String(50), default="pending", nullable=False
    )  # 'pending', 'confirmed', 'declined'

    # Reminders
    reminder_sent = Column(Boolean, default=False)
    reminder_sent_at = Column(TIMESTAMP, nullable=True)

    # External references
    external_event_id = Column(
        String(255), nullable=True
    )  # Calendar event ID or ATS event ID
    calendar_invite_sent = Column(Boolean, default=False)

    # Webhook event that created this
    webhook_event_id = Column(
        GUID(), ForeignKey("webhook_events.id", ondelete="SET NULL"), nullable=True
    )

    # Outcome
    completed_at = Column(TIMESTAMP, nullable=True)
    outcome = Column(
        String(50), nullable=True
    )  # 'passed', 'failed', 'pending_feedback'
    feedback = Column(Text, nullable=True)

    # Metadata
    extra_data = Column(JSON, nullable=True)  # Additional data from job board
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    application = relationship("Application", back_populates="interview_schedules")
    user = relationship("User", back_populates="interview_schedules")
    webhook_event = relationship("WebhookEvent")
    interview_feedback = relationship(
        "InterviewFeedback", back_populates="interview", cascade="all, delete-orphan"
    )


class WebhookSubscription(Base):
    """Webhook subscriptions to job boards"""

    __tablename__ = "webhook_subscriptions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    # Job board details
    source = Column(String(50), nullable=False, index=True)  # 'greenhouse', 'lever'
    source_company_id = Column(String(255), nullable=True)  # Company ID at job board

    # Webhook configuration
    webhook_url = Column(Text, nullable=False)  # Our webhook receiver URL
    webhook_secret = Column(
        String(512), nullable=True
    )  # Secret for signature verification

    # Subscription details
    event_types = Column(JSON, nullable=False)  # List of subscribed event types
    is_active = Column(Boolean, default=True)

    # Status
    subscription_id = Column(String(255), nullable=True)  # External subscription ID
    verified = Column(Boolean, default=False)
    verified_at = Column(TIMESTAMP, nullable=True)

    # Statistics
    total_events_received = Column(Integer, default=0)
    last_event_received_at = Column(TIMESTAMP, nullable=True)

    # Error tracking
    consecutive_failures = Column(Integer, default=0)
    last_failure_at = Column(TIMESTAMP, nullable=True)
    last_failure_reason = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())


class InterviewFeedback(Base):
    """Interview feedback from interviewers (Sprint 13-14)"""

    __tablename__ = "interview_feedback"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    interview_id = Column(
        GUID(),
        ForeignKey("interview_schedules.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    interviewer_id = Column(
        GUID(),
        ForeignKey("company_members.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    application_id = Column(
        GUID(),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Ratings (1-5 scale)
    overall_rating = Column(
        Integer, nullable=True
    )  # CHECK (overall_rating BETWEEN 1 AND 5)
    technical_rating = Column(
        Integer, nullable=True
    )  # CHECK (technical_rating BETWEEN 1 AND 5)
    communication_rating = Column(
        Integer, nullable=True
    )  # CHECK (communication_rating BETWEEN 1 AND 5)
    culture_fit_rating = Column(
        Integer, nullable=True
    )  # CHECK (culture_fit_rating BETWEEN 1 AND 5)

    # Detailed feedback
    strengths = Column(JSON, nullable=True)  # Array of strengths
    concerns = Column(JSON, nullable=True)  # Array of concerns
    notes = Column(Text, nullable=True)

    # Recommendation
    recommendation = Column(
        String(50), nullable=True
    )  # 'strong_yes', 'yes', 'maybe', 'no', 'strong_no'
    next_steps = Column(Text, nullable=True)

    # Status
    is_submitted = Column(Boolean, default=False, nullable=False)
    submitted_at = Column(TIMESTAMP, nullable=True)

    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    interview = relationship("InterviewSchedule", back_populates="interview_feedback")
    interviewer = relationship("CompanyMember")
    application = relationship("Application")


class CandidateAvailability(Base):
    """Candidate availability for interview scheduling (Sprint 13-14)"""

    __tablename__ = "candidate_availability"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    application_id = Column(
        GUID(),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    candidate_id = Column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Time slots (candidate provides multiple options)
    available_slots = Column(
        JSON, nullable=False
    )  # [{"start": "2025-11-10T10:00:00Z", "end": "2025-11-10T11:00:00Z"}, ...]
    timezone = Column(String(50), nullable=False)

    # Preferences
    preferred_platform = Column(
        String(50), nullable=True
    )  # 'zoom', 'google_meet', etc.
    notes = Column(Text, nullable=True)

    # Expiration
    expires_at = Column(TIMESTAMP, nullable=False)

    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    application = relationship("Application")
    candidate = relationship("User")
