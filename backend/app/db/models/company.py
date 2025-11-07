"""Company domain models

Models for employer/company functionality including companies, team members, and subscriptions.
"""
from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.db.base import Base
from app.db.types import GUID


class Company(Base):
    """Company model for employer accounts"""

    __tablename__ = "companies"

    id = Column(GUID(), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False)
    domain = Column(String(255), unique=True, nullable=True)
    industry = Column(String(100), nullable=True)
    size = Column(
        String(50), nullable=True
    )  # "1-10", "11-50", "51-200", "201-500", "501+"
    location = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    logo_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)

    # Subscription & billing
    subscription_tier = Column(
        String(50), default="starter"
    )  # "starter", "growth", "professional", "enterprise"
    subscription_status = Column(
        String(50), default="active"
    )  # "active", "trial", "past_due", "canceled"
    trial_ends_at = Column(DateTime, nullable=True)
    billing_email = Column(String(255), nullable=True)

    # Plan limits
    max_active_jobs = Column(Integer, default=1)
    max_candidate_views = Column(Integer, default=10)
    max_team_members = Column(Integer, default=1)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    members = relationship(
        "CompanyMember", back_populates="company", cascade="all, delete-orphan"
    )
    subscription = relationship(
        "CompanySubscription",
        back_populates="company",
        uselist=False,
        cascade="all, delete-orphan",
    )
    jobs = relationship(
        "Job", back_populates="employer_company", cascade="all, delete-orphan"
    )
    bulk_job_uploads = relationship(
        "BulkJobUpload", back_populates="company", cascade="all, delete-orphan"
    )
    job_distributions = relationship(
        "JobDistribution", back_populates="company", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<Company {self.name}>"


class CompanyMember(Base):
    """Company member model for team collaboration"""

    __tablename__ = "company_members"

    id = Column(GUID(), primary_key=True, default=uuid4)
    company_id = Column(
        GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Role & permissions
    role = Column(
        String(50), nullable=False
    )  # "owner", "admin", "hiring_manager", "recruiter", "interviewer", "viewer"
    permissions = Column(JSON, nullable=True)  # Granular permissions

    # Status
    status = Column(String(50), default="active")  # "active", "invited", "suspended"
    invited_by = Column(
        GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    invited_at = Column(DateTime, nullable=True)
    joined_at = Column(DateTime, nullable=True)

    # Activity tracking (Sprint 13-14)
    last_active_at = Column(DateTime, nullable=True)
    notification_preferences = Column(
        JSON, nullable=True, default=dict
    )  # {"email": true, "in_app": true}

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    company = relationship("Company", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])
    inviter = relationship("User", foreign_keys=[invited_by])

    # Sprint 13-14 relationships
    team_activities = relationship(
        "TeamActivity",
        back_populates="member",
        foreign_keys="[TeamActivity.member_id]",
        cascade="all, delete-orphan",
    )
    mentioned_in = relationship(
        "TeamMention",
        back_populates="mentioned_member",
        foreign_keys="[TeamMention.mentioned_member_id]",
        cascade="all, delete-orphan",
    )

    def __repr__(self):
        return f"<CompanyMember {self.user_id} - {self.role}>"


class CompanySubscription(Base):
    """Company subscription model for billing"""

    __tablename__ = "company_subscriptions"

    id = Column(GUID(), primary_key=True, default=uuid4)
    company_id = Column(
        GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    # Stripe integration
    stripe_subscription_id = Column(String(255), unique=True, nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)

    # Plan details
    plan_tier = Column(
        String(50), nullable=False
    )  # "starter", "growth", "professional", "enterprise"
    plan_interval = Column(String(20), nullable=True)  # "month", "year"
    plan_amount = Column(Numeric(10, 2), nullable=True)

    # Subscription status
    status = Column(
        String(50), nullable=False
    )  # "active", "trialing", "past_due", "canceled", "unpaid"
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)

    # Usage tracking
    jobs_posted_this_month = Column(Integer, default=0)
    candidate_views_this_month = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    company = relationship("Company", back_populates="subscription")

    def __repr__(self):
        return f"<CompanySubscription {self.company_id} - {self.plan_tier}>"


class TeamInvitation(Base):
    """Team invitation model for inviting new team members (Sprint 13-14)"""

    __tablename__ = "team_invitations"

    id = Column(GUID(), primary_key=True, default=uuid4)
    company_id = Column(
        GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )

    # Invitation details
    email = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # Role to assign when accepted
    invited_by = Column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    # Token for acceptance
    invitation_token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime, nullable=False)

    # Status tracking
    status = Column(
        String(50), default="pending", nullable=False
    )  # "pending", "accepted", "expired", "revoked"
    accepted_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relationships
    company = relationship("Company")
    inviter = relationship("User", foreign_keys=[invited_by])

    def __repr__(self):
        return f"<TeamInvitation {self.email} - {self.status}>"


class TeamActivity(Base):
    """Team activity tracking for audit and collaboration (Sprint 13-14)"""

    __tablename__ = "team_activities"

    id = Column(GUID(), primary_key=True, default=uuid4)
    company_id = Column(
        GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False
    )
    member_id = Column(
        GUID(), ForeignKey("company_members.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Activity details
    action_type = Column(
        String(50), nullable=False
    )  # "job_posted", "application_reviewed", "interview_scheduled", etc.
    entity_type = Column(
        String(50), nullable=True
    )  # "job", "application", "interview", "candidate"
    entity_id = Column(GUID(), nullable=True)

    # Content
    description = Column(Text, nullable=True)
    activity_metadata = Column(JSON, nullable=True)

    # Mentions (stored as array for quick lookup)
    mentioned_members = Column(JSON, nullable=True, default=list)  # Array of member IDs

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    company = relationship("Company")
    member = relationship(
        "CompanyMember", back_populates="team_activities", foreign_keys=[member_id]
    )
    user = relationship("User")
    mentions = relationship(
        "TeamMention", back_populates="activity", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<TeamActivity {self.action_type} - {self.entity_type}>"


class TeamMention(Base):
    """Team mentions for notifying team members (Sprint 13-14)"""

    __tablename__ = "team_mentions"

    id = Column(GUID(), primary_key=True, default=uuid4)
    activity_id = Column(
        GUID(), ForeignKey("team_activities.id", ondelete="CASCADE"), nullable=False
    )
    mentioned_member_id = Column(
        GUID(), ForeignKey("company_members.id", ondelete="CASCADE"), nullable=False
    )
    mentioned_by_member_id = Column(
        GUID(), ForeignKey("company_members.id", ondelete="CASCADE"), nullable=False
    )

    # Notification status
    notified = Column(Boolean, default=False, nullable=False)
    read_at = Column(DateTime, nullable=True)

    # Timestamp
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    activity = relationship("TeamActivity", back_populates="mentions")
    mentioned_member = relationship(
        "CompanyMember",
        back_populates="mentioned_in",
        foreign_keys=[mentioned_member_id],
    )
    mentioned_by_member = relationship(
        "CompanyMember", foreign_keys=[mentioned_by_member_id]
    )

    def __repr__(self):
        return f"<TeamMention {self.mentioned_member_id} in {self.activity_id}>"
