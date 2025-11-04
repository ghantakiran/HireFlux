"""Company domain models

Models for employer/company functionality including companies, team members, and subscriptions.
"""
from datetime import datetime
from typing import Optional
from uuid import uuid4

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text
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
    size = Column(String(50), nullable=True)  # "1-10", "11-50", "51-200", "201-500", "501+"
    location = Column(String(255), nullable=True)
    website = Column(String(255), nullable=True)
    logo_url = Column(String(500), nullable=True)
    description = Column(Text, nullable=True)

    # Subscription & billing
    subscription_tier = Column(String(50), default="starter")  # "starter", "growth", "professional", "enterprise"
    subscription_status = Column(String(50), default="active")  # "active", "trial", "past_due", "canceled"
    trial_ends_at = Column(DateTime, nullable=True)
    billing_email = Column(String(255), nullable=True)

    # Plan limits
    max_active_jobs = Column(Integer, default=1)
    max_candidate_views = Column(Integer, default=10)
    max_team_members = Column(Integer, default=1)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    members = relationship("CompanyMember", back_populates="company", cascade="all, delete-orphan")
    subscription = relationship("CompanySubscription", back_populates="company", uselist=False, cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="employer_company", cascade="all, delete-orphan")
    bulk_job_uploads = relationship("BulkJobUpload", back_populates="company", cascade="all, delete-orphan")
    job_distributions = relationship("JobDistribution", back_populates="company", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Company {self.name}>"


class CompanyMember(Base):
    """Company member model for team collaboration"""
    __tablename__ = "company_members"

    id = Column(GUID(), primary_key=True, default=uuid4)
    company_id = Column(GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Role & permissions
    role = Column(String(50), nullable=False)  # "owner", "admin", "hiring_manager", "recruiter", "interviewer", "viewer"
    permissions = Column(JSON, nullable=True)  # Granular permissions

    # Status
    status = Column(String(50), default="active")  # "active", "invited", "suspended"
    invited_by = Column(GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    invited_at = Column(DateTime, nullable=True)
    joined_at = Column(DateTime, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    company = relationship("Company", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])
    inviter = relationship("User", foreign_keys=[invited_by])

    def __repr__(self):
        return f"<CompanyMember {self.user_id} - {self.role}>"


class CompanySubscription(Base):
    """Company subscription model for billing"""
    __tablename__ = "company_subscriptions"

    id = Column(GUID(), primary_key=True, default=uuid4)
    company_id = Column(GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)

    # Stripe integration
    stripe_subscription_id = Column(String(255), unique=True, nullable=True)
    stripe_customer_id = Column(String(255), nullable=True)

    # Plan details
    plan_tier = Column(String(50), nullable=False)  # "starter", "growth", "professional", "enterprise"
    plan_interval = Column(String(20), nullable=True)  # "month", "year"
    plan_amount = Column(Numeric(10, 2), nullable=True)

    # Subscription status
    status = Column(String(50), nullable=False)  # "active", "trialing", "past_due", "canceled", "unpaid"
    current_period_start = Column(DateTime, nullable=True)
    current_period_end = Column(DateTime, nullable=True)
    cancel_at_period_end = Column(Boolean, default=False)

    # Usage tracking
    jobs_posted_this_month = Column(Integer, default=0)
    candidate_views_this_month = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    company = relationship("Company", back_populates="subscription")

    def __repr__(self):
        return f"<CompanySubscription {self.company_id} - {self.plan_tier}>"
