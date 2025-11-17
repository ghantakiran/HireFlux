"""Application tracking model"""

from sqlalchemy import (
    Column,
    String,
    TIMESTAMP,
    ForeignKey,
    Text,
    Boolean,
    Integer,
    JSON,
    Numeric,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID


class Application(Base):
    """Job applications"""

    __tablename__ = "applications"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_id = Column(GUID(), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    resume_version_id = Column(
        GUID(), ForeignKey("resume_versions.id", ondelete="SET NULL"), nullable=True
    )
    cover_letter_id = Column(
        GUID(), ForeignKey("cover_letters.id", ondelete="SET NULL"), nullable=True
    )
    status = Column(
        String(50), index=True, default="saved"
    )  # 'saved', 'applied', 'interview', 'offer', 'rejected'
    applied_at = Column(TIMESTAMP)
    notes = Column(Text)

    # Auto-apply specific fields
    is_auto_applied = Column(Boolean, default=False)
    application_mode = Column(
        String(50), nullable=True
    )  # 'manual', 'apply_assist', 'auto_apply'

    # Webhook integration fields
    external_id = Column(
        String(255), nullable=True, index=True
    )  # External application ID from job board
    external_source = Column(
        String(50), nullable=True, index=True
    )  # 'greenhouse', 'lever', etc.

    # Employer ATS fields
    fit_index = Column(
        Integer, nullable=True, index=True
    )  # AI-calculated fit score 0-100
    assigned_to = Column(
        JSON, nullable=True, server_default="[]"
    )  # Array of user IDs (team members assigned to review)
    tags = Column(
        JSON, nullable=True, server_default="[]"
    )  # Array of tags: "strong_candidate", "needs_review", etc.

    # Sprint 15-16: Analytics fields
    source = Column(
        String(50), nullable=True, index=True
    )  # 'auto_apply', 'manual', 'referral', 'job_board'
    cost_attribution = Column(
        Numeric(10, 2), nullable=True
    )  # Portion of subscription cost attributed to this application

    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="applications")
    job = relationship("Job", back_populates="applications")
    resume_version = relationship("ResumeVersion", back_populates="applications")
    cover_letter = relationship("CoverLetter", back_populates="applications")
    auto_apply_job = relationship(
        "AutoApplyJob", back_populates="application", uselist=False
    )
    webhook_events = relationship("WebhookEvent", back_populates="application")
    status_history = relationship(
        "ApplicationStatusHistory",
        back_populates="application",
        cascade="all, delete-orphan",
    )
    interview_schedules = relationship(
        "InterviewSchedule",
        back_populates="application",
        cascade="all, delete-orphan",
    )
    application_notes = relationship(
        "ApplicationNote",
        back_populates="application",
        cascade="all, delete-orphan",
    )
    # Sprint 15-16: Analytics stage tracking
    stage_history = relationship(
        "ApplicationStageHistory",
        back_populates="application",
        cascade="all, delete-orphan",
        order_by="ApplicationStageHistory.changed_at",
    )


class ApplicationNote(Base):
    """Internal notes on applications for employer ATS"""

    __tablename__ = "application_notes"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    application_id = Column(
        GUID(),
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    author_id = Column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Note content
    content = Column(Text, nullable=False)

    # Visibility control
    visibility = Column(
        String(50), nullable=False, server_default="team"
    )  # 'private' (author only) or 'team' (all team members)

    # Note type (Issue #27 requirement)
    note_type = Column(
        String(50), nullable=False, server_default="internal", index=True
    )  # 'internal', 'feedback', 'interview_notes'

    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    application = relationship("Application", back_populates="application_notes")
    author = relationship("User")
