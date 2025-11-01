"""Job, JobSource, and MatchScore models"""
from sqlalchemy import (
    Column,
    String,
    TIMESTAMP,
    ForeignKey,
    Text,
    Integer,
    Boolean,
    JSON,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID


class JobSource(Base):
    """Job board/API sources"""

    __tablename__ = "job_sources"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(255))  # 'Greenhouse', 'Lever', etc.
    api_url = Column(Text)
    is_active = Column(Boolean, default=True)
    last_sync_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    jobs = relationship("Job", back_populates="job_source")


class Job(Base):
    """Job postings from various sources"""

    __tablename__ = "jobs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    # Employer relationship (for jobs posted by companies on the platform)
    company_id = Column(
        GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # External source relationship (for jobs sourced from job boards)
    source_id = Column(
        GUID(), ForeignKey("job_sources.id", ondelete="SET NULL"), nullable=True
    )
    source = Column(String(50))  # 'greenhouse', 'lever', 'manual', 'employer'
    external_id = Column(String(255))  # ID from job board
    title = Column(String(255), index=True)
    company = Column(String(255), index=True)  # Company name (string for external jobs)
    description = Column(Text)
    location = Column(String(255))
    location_type = Column(String(50))  # 'remote', 'hybrid', 'onsite'

    # Skills
    required_skills = Column(JSON, default=[])
    preferred_skills = Column(JSON, default=[])

    # Experience
    experience_requirement = Column(String(100))
    experience_min_years = Column(Integer)
    experience_max_years = Column(Integer)
    experience_level = Column(String(50))  # entry, mid, senior, staff, principal

    # Salary
    salary_min = Column(Integer)
    salary_max = Column(Integer)

    # Additional info
    department = Column(String(255))
    employment_type = Column(String(50))  # full-time, part-time, contract
    requires_visa_sponsorship = Column(Boolean, default=False)
    external_url = Column(Text)

    # Dates
    posted_date = Column(TIMESTAMP)
    expires_at = Column(TIMESTAMP)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    employer_company = relationship("Company", back_populates="jobs")
    job_source = relationship("JobSource", back_populates="jobs")
    match_scores = relationship(
        "MatchScore", back_populates="job", cascade="all, delete-orphan"
    )
    cover_letters = relationship("CoverLetter", back_populates="job")
    applications = relationship("Application", back_populates="job")
    auto_apply_jobs = relationship(
        "AutoApplyJob", back_populates="job", cascade="all, delete-orphan"
    )


class MatchScore(Base):
    """Job matching scores for users"""

    __tablename__ = "match_scores"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    job_id = Column(
        GUID(), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    fit_index = Column(Integer)  # 0-100
    rationale = Column(Text)  # Why this job matches
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="match_scores")
    job = relationship("Job", back_populates="match_scores")
