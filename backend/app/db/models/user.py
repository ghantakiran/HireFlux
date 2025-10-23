"""User and Profile models"""
from sqlalchemy import Boolean, Column, String, TIMESTAMP, ForeignKey, Integer, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID


class User(Base):
    """User model for authentication"""
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=True)
    oauth_provider = Column(String(50), nullable=True)  # 'google', 'linkedin'
    oauth_id = Column(String(255), nullable=True)
    email_verified = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    profile = relationship("Profile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    resume_versions = relationship("ResumeVersion", back_populates="user", cascade="all, delete-orphan")
    cover_letters = relationship("CoverLetter", back_populates="user", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="user", cascade="all, delete-orphan")
    match_scores = relationship("MatchScore", back_populates="user", cascade="all, delete-orphan")
    credit_wallet = relationship("CreditWallet", back_populates="user", uselist=False, cascade="all, delete-orphan")
    credit_ledger = relationship("CreditLedger", back_populates="user", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="user", cascade="all, delete-orphan")
    interview_sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan")


class Profile(Base):
    """User profile with job search preferences"""
    __tablename__ = "profiles"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    first_name = Column(String(100))
    last_name = Column(String(100))
    phone = Column(String(20))
    location = Column(String(255))
    target_titles = Column(JSON, default=[])  # Array of job titles
    salary_min = Column(Integer)
    salary_max = Column(Integer)
    industries = Column(JSON, default=[])  # Array of industries
    skills = Column(JSON, default=[])  # Array of skills
    preferences = Column(JSON, default={})  # {remote: true, visa_friendly: true, etc.}
    onboarding_complete = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="profile")
