"""
User Model and Schemas (US-003)
Database schema for user management
"""

from sqlalchemy import Column, String, Boolean, DateTime, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.db.types import GUID
from uuid import uuid4


class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, index=True, default=uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)  # Nullable for OAuth users
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    # OAuth fields
    oauth_provider = Column(String(50), nullable=True)  # google, linkedin, email
    oauth_provider_id = Column(String(255), nullable=True, index=True)  # Provider's user ID
    oauth_picture = Column(String(500), nullable=True)  # Profile picture URL from OAuth

    # Profile information
    phone = Column(String(20), nullable=True)
    location = Column(String(255), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    github_url = Column(String(500), nullable=True)
    portfolio_url = Column(String(500), nullable=True)

    # Job search preferences
    target_job_titles = Column(Text, nullable=True)  # JSON string
    target_salary_min = Column(Integer, nullable=True)
    target_salary_max = Column(Integer, nullable=True)
    remote_preference = Column(String(50), nullable=True)  # remote, hybrid, onsite, any
    visa_sponsorship_required = Column(Boolean, default=False)

    # Subscription and billing
    subscription_plan = Column(String(50), default="free")  # free, plus, pro
    subscription_status = Column(
        String(50), default="active"
    )  # active, cancelled, expired
    stripe_customer_id = Column(String(255), nullable=True)
    stripe_subscription_id = Column(String(255), nullable=True)

    # Credits and usage
    credit_balance = Column(Integer, default=0)
    monthly_cover_letter_limit = Column(Integer, default=3)  # Free plan limit
    monthly_job_suggestions_limit = Column(Integer, default=10)  # Free plan limit

    # Terms and privacy
    terms_accepted_at = Column(DateTime, nullable=True)
    privacy_policy_accepted_at = Column(DateTime, nullable=True)
    marketing_emails_opt_in = Column(Boolean, default=False)

    # Password reset
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)

    # Email verification
    verification_token = Column(String(255), nullable=True)
    verification_token_expires = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_login_at = Column(DateTime, nullable=True)

    # Relationships
    resumes = relationship(
        "Resume", back_populates="user", cascade="all, delete-orphan"
    )
    cover_letters = relationship(
        "CoverLetter", back_populates="user", cascade="all, delete-orphan"
    )
    applications = relationship(
        "Application", back_populates="user", cascade="all, delete-orphan"
    )
    notifications = relationship(
        "Notification", back_populates="user", cascade="all, delete-orphan"
    )
    interview_sessions = relationship(
        "InterviewSession", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}', name='{self.name}')>"

    @property
    def is_plus_subscriber(self) -> bool:
        """Check if user has Plus or Pro subscription"""
        return self.subscription_plan in ["plus", "pro"]

    @property
    def is_pro_subscriber(self) -> bool:
        """Check if user has Pro subscription"""
        return self.subscription_plan == "pro"

    @property
    def can_generate_cover_letter(self) -> bool:
        """Check if user can generate a cover letter"""
        if self.is_plus_subscriber:
            return True
        return self.monthly_cover_letter_limit > 0

    @property
    def can_get_job_suggestions(self) -> bool:
        """Check if user can get job suggestions"""
        if self.is_plus_subscriber:
            return True
        return self.monthly_job_suggestions_limit > 0

    def consume_cover_letter_credit(self):
        """Consume a cover letter credit"""
        if not self.is_plus_subscriber:
            self.monthly_cover_letter_limit = max(
                0, self.monthly_cover_letter_limit - 1
            )

    def consume_job_suggestion_credit(self):
        """Consume a job suggestion credit"""
        if not self.is_plus_subscriber:
            self.monthly_job_suggestions_limit = max(
                0, self.monthly_job_suggestions_limit - 1
            )

    def reset_monthly_limits(self):
        """Reset monthly limits (called by cron job)"""
        if not self.is_plus_subscriber:
            self.monthly_cover_letter_limit = 3
            self.monthly_job_suggestions_limit = 10
