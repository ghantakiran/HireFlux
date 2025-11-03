"""
Candidate Profile Models

SQLAlchemy models for candidate discovery and search features.
Enables job seekers to create public profiles for employer discovery.
"""

from sqlalchemy import Column, String, Boolean, DateTime, Integer, Numeric, Date, Text, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base
from app.db.types import GUID
from uuid import uuid4


class CandidateProfile(Base):
    """
    Public candidate profile for employer discovery.

    Job seekers can opt-in to make their profiles visible to employers
    for proactive sourcing and invitations to apply.
    """
    __tablename__ = "candidate_profiles"

    id = Column(GUID(), primary_key=True, index=True, default=uuid4)
    user_id = Column(GUID(), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)

    # Visibility & status
    visibility = Column(String(20), nullable=False, server_default='private')  # 'public' or 'private'
    open_to_work = Column(Boolean(), nullable=False, server_default='false')
    open_to_remote = Column(Boolean(), nullable=False, server_default='false')

    # Profile content
    headline = Column(String(255))  # "Senior Full-Stack Engineer | Python | React"
    bio = Column(Text())
    location = Column(String(255))
    profile_picture_url = Column(String(500))

    # Skills & experience (searchable)
    skills = Column(JSON(), server_default='[]')  # Store as JSON array
    years_experience = Column(Integer())
    experience_level = Column(String(50))  # 'entry', 'mid', 'senior', 'lead', 'executive'

    # Preferred roles
    preferred_roles = Column(JSON(), server_default='[]')  # Store as JSON array
    preferred_location_type = Column(String(20))  # 'remote', 'hybrid', 'onsite', 'any'

    # Salary expectations
    expected_salary_min = Column(Numeric(10, 2))
    expected_salary_max = Column(Numeric(10, 2))
    expected_salary_currency = Column(String(3), server_default='USD')

    # Availability
    availability_status = Column(String(50), server_default='not_looking')  # 'actively_looking', 'open_to_offers', 'not_looking'
    availability_start_date = Column(Date())
    availability_updated_at = Column(DateTime(), server_default=func.now())

    # Portfolio (JSON array)
    # Structure: [{"type": "github|website|article|project", "title": str, "description": str, "url": str, "thumbnail": str}]
    portfolio = Column(JSON(), server_default='[]')

    # Resume summary
    resume_summary = Column(Text())  # 2-3 sentence summary
    latest_resume_url = Column(String(500))

    # Analytics
    profile_views = Column(Integer(), server_default='0')
    invites_received = Column(Integer(), server_default='0')

    # Timestamps
    created_at = Column(DateTime(), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    user = relationship("User", backref="candidate_profile", uselist=False)
    views = relationship("CandidateView", back_populates="candidate_profile", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<CandidateProfile(id={self.id}, user_id={self.user_id}, visibility='{self.visibility}')>"

    @property
    def is_public(self) -> bool:
        """Check if profile is publicly visible"""
        return self.visibility == 'public'

    @property
    def is_actively_looking(self) -> bool:
        """Check if candidate is actively looking for work"""
        return self.availability_status == 'actively_looking'

    @property
    def is_available(self) -> bool:
        """Check if candidate is open to opportunities"""
        return self.availability_status in ['actively_looking', 'open_to_offers']

    def increment_view_count(self):
        """Increment profile view count"""
        self.profile_views += 1

    def increment_invite_count(self):
        """Increment invite received count"""
        self.invites_received += 1

    def set_visibility(self, visibility: str):
        """Set profile visibility"""
        if visibility not in ['public', 'private']:
            raise ValueError("Visibility must be 'public' or 'private'")
        self.visibility = visibility

    def update_availability(self, status: str, start_date=None):
        """Update availability status and start date"""
        valid_statuses = ['actively_looking', 'open_to_offers', 'not_looking']
        if status not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")

        self.availability_status = status
        if start_date:
            self.availability_start_date = start_date
        self.availability_updated_at = func.now()


class CandidateView(Base):
    """
    Track employer views of candidate profiles.

    Used for analytics and usage billing purposes.
    Tracks which employers/company members viewed which candidates.
    """
    __tablename__ = "candidate_views"

    id = Column(GUID(), primary_key=True, index=True, default=uuid4)
    company_id = Column(GUID(), ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, index=True)
    viewer_id = Column(GUID(), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)  # Company member who viewed
    candidate_id = Column(GUID(), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)  # Candidate being viewed
    candidate_profile_id = Column(GUID(), ForeignKey('candidate_profiles.id', ondelete='CASCADE'), nullable=False)

    # Context
    source = Column(String(50))  # 'search', 'application', 'referral', 'invite'
    context_job_id = Column(GUID(), ForeignKey('jobs.id', ondelete='SET NULL'))  # If viewed in context of a job

    # Timestamp
    created_at = Column(DateTime(), server_default=func.now(), nullable=False, index=True)

    # Relationships
    candidate_profile = relationship("CandidateProfile", back_populates="views")
    viewer = relationship("User", foreign_keys=[viewer_id], backref="candidate_views_made")
    candidate = relationship("User", foreign_keys=[candidate_id], backref="candidate_views_received")

    def __repr__(self):
        return f"<CandidateView(id={self.id}, company_id={self.company_id}, viewer_id={self.viewer_id}, candidate_id={self.candidate_id})>"
