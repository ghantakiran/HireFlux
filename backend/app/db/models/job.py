"""Job, JobSource, and MatchScore models"""
from sqlalchemy import Column, String, TIMESTAMP, UUID, ForeignKey, Text, Integer, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


class JobSource(Base):
    """Job board/API sources"""
    __tablename__ = "job_sources"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255))  # 'Greenhouse', 'Lever', etc.
    api_url = Column(Text)
    is_active = Column(Boolean, default=True)
    last_sync_at = Column(TIMESTAMP)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    jobs = relationship("Job", back_populates="source")


class Job(Base):
    """Job postings from various sources"""
    __tablename__ = "jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    source_id = Column(UUID(as_uuid=True), ForeignKey("job_sources.id", ondelete="SET NULL"), nullable=True)
    external_id = Column(String(255))  # ID from job board
    title = Column(String(255), index=True)
    company = Column(String(255), index=True)
    description = Column(Text)
    location = Column(String(255))
    remote_policy = Column(String(50))  # 'remote', 'hybrid', 'onsite'
    salary_min = Column(Integer)
    salary_max = Column(Integer)
    visa_friendly = Column(Boolean, default=False)
    posted_at = Column(TIMESTAMP)
    expires_at = Column(TIMESTAMP)
    is_active = Column(Boolean, default=True, index=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    source = relationship("JobSource", back_populates="jobs")
    match_scores = relationship("MatchScore", back_populates="job", cascade="all, delete-orphan")
    cover_letters = relationship("CoverLetter", back_populates="job")
    applications = relationship("Application", back_populates="job")


class MatchScore(Base):
    """Job matching scores for users"""
    __tablename__ = "match_scores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(UUID(as_uuid=True), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    fit_index = Column(Integer)  # 0-100
    rationale = Column(Text)  # Why this job matches
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="match_scores")
    job = relationship("Job", back_populates="match_scores")
