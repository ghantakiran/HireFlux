"""Auto-apply models for background job application"""
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    Float,
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


class AutoApplyConfig(Base):
    """User preferences for auto-apply functionality"""

    __tablename__ = "auto_apply_configs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )

    # Auto-apply settings
    enabled = Column(Boolean, default=False, nullable=False)
    mode = Column(
        String(50), default="apply_assist", nullable=False
    )  # 'apply_assist' or 'auto_apply'

    # Filters
    min_fit_score = Column(Integer, default=70, nullable=False)  # 0-100
    max_applications_per_day = Column(Integer, default=5, nullable=False)
    max_applications_per_week = Column(Integer, default=25, nullable=False)

    # Job preferences
    remote_only = Column(Boolean, default=False)
    hybrid_allowed = Column(Boolean, default=True)
    onsite_allowed = Column(Boolean, default=False)

    # Salary preferences (in USD, annual)
    min_salary = Column(Integer, nullable=True)
    max_salary = Column(Integer, nullable=True)

    # Location preferences
    preferred_locations = Column(JSON, nullable=True)  # List of locations
    excluded_locations = Column(JSON, nullable=True)  # List of excluded locations

    # Company preferences
    preferred_companies = Column(JSON, nullable=True)  # List of company names
    excluded_companies = Column(JSON, nullable=True)  # List of excluded companies

    # Job type preferences
    employment_types = Column(
        JSON, nullable=True
    )  # ['full-time', 'contract', 'part-time']
    seniority_levels = Column(JSON, nullable=True)  # ['entry', 'mid', 'senior']

    # Application settings
    use_default_resume = Column(Boolean, default=True)
    default_resume_id = Column(
        GUID(), ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True
    )
    auto_generate_cover_letter = Column(Boolean, default=True)

    # Notification preferences
    notify_on_apply = Column(Boolean, default=True)
    notify_on_error = Column(Boolean, default=True)
    notify_on_refund = Column(Boolean, default=True)

    # Rate limiting
    pause_until = Column(TIMESTAMP, nullable=True)  # For temporary pauses
    daily_application_count = Column(Integer, default=0)
    weekly_application_count = Column(Integer, default=0)
    last_daily_reset = Column(TIMESTAMP, nullable=True)
    last_weekly_reset = Column(TIMESTAMP, nullable=True)

    # Metadata
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="auto_apply_config")
    default_resume = relationship("Resume", foreign_keys=[default_resume_id])


class AutoApplyJob(Base):
    """Jobs queued for auto-apply processing"""

    __tablename__ = "auto_apply_jobs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_id = Column(GUID(), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    application_id = Column(
        GUID(), ForeignKey("applications.id", ondelete="SET NULL"), nullable=True
    )

    # Status tracking
    status = Column(
        String(50), default="queued", nullable=False, index=True
    )  # 'queued', 'processing', 'applied', 'failed', 'refunded', 'cancelled'
    priority = Column(Integer, default=0)  # Higher priority processed first

    # Fit score (from job matching)
    fit_score = Column(Float, nullable=False)
    fit_rationale = Column(Text, nullable=True)

    # Application details
    resume_version_id = Column(
        GUID(), ForeignKey("resume_versions.id", ondelete="SET NULL"), nullable=True
    )
    cover_letter_id = Column(
        GUID(), ForeignKey("cover_letters.id", ondelete="SET NULL"), nullable=True
    )

    # Job board details
    job_source = Column(String(50), nullable=False)  # 'greenhouse', 'lever', etc.
    job_board_url = Column(Text, nullable=False)
    application_url = Column(Text, nullable=True)
    company_name = Column(String(255), nullable=True)

    # Processing metadata
    scheduled_at = Column(TIMESTAMP, nullable=True)
    started_at = Column(TIMESTAMP, nullable=True)
    completed_at = Column(TIMESTAMP, nullable=True)
    attempts = Column(Integer, default=0)
    max_attempts = Column(Integer, default=3)

    # Error tracking
    error_message = Column(Text, nullable=True)
    error_type = Column(
        String(50), nullable=True
    )  # 'validation', 'network', 'rate_limit', etc.
    last_error_at = Column(TIMESTAMP, nullable=True)

    # Credit tracking
    credits_used = Column(Integer, default=1)
    credits_refunded = Column(Boolean, default=False)
    refund_reason = Column(String(255), nullable=True)
    refunded_at = Column(TIMESTAMP, nullable=True)

    # Form data (for retry)
    form_data = Column(JSON, nullable=True)  # Captured form fields
    submission_response = Column(JSON, nullable=True)  # API response data

    # Consent and compliance
    user_approved = Column(
        Boolean, default=False
    )  # True if user explicitly approved this application
    tos_compliant = Column(Boolean, default=True)  # Job board ToS compliance check

    # Metadata
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="auto_apply_jobs")
    job = relationship("Job", back_populates="auto_apply_jobs")
    application = relationship("Application", back_populates="auto_apply_job")
    resume_version = relationship("ResumeVersion")
    cover_letter = relationship("CoverLetter")
