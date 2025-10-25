"""Cover Letter model"""
from sqlalchemy import (
    Column,
    String,
    TIMESTAMP,
    ForeignKey,
    Text,
    JSON,
    Boolean,
    Integer,
    Float,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID


class CoverLetter(Base):
    """AI-generated cover letters"""

    __tablename__ = "cover_letters"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    resume_version_id = Column(
        GUID(), ForeignKey("resume_versions.id", ondelete="SET NULL"), nullable=True
    )
    job_id = Column(GUID(), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)

    # Job details
    job_title = Column(String(255))
    company_name = Column(String(255))
    job_description = Column(Text)

    # Content and structure
    content = Column(Text)
    intro_paragraph = Column(Text)
    body_paragraphs = Column(JSON, default=[])
    closing_paragraph = Column(Text)

    # Generation parameters
    tone = Column(
        String(50)
    )  # 'formal', 'conversational', 'enthusiastic', 'professional'
    length = Column(String(50))  # 'brief', 'standard', 'detailed'
    emphasized_skills = Column(JSON, default=[])
    custom_intro = Column(Text)
    company_research = Column(Text)
    referral_name = Column(String(255))
    address_gap = Column(Text)
    career_change_context = Column(Text)
    strict_factual = Column(Boolean, default=True)

    # AI metadata
    token_usage = Column(String(50))
    cost = Column(String(50))
    quality_score = Column(Float)
    status = Column(
        String(50), default="pending"
    )  # draft, pending, processing, completed, failed

    # Versioning
    version_number = Column(Integer, default=1)
    parent_id = Column(
        GUID(), ForeignKey("cover_letters.id", ondelete="SET NULL"), nullable=True
    )
    variation_number = Column(Integer)  # For multiple variations of same request

    # Feedback
    user_rating = Column(Integer)  # 1-5
    resulted_in_interview = Column(Boolean)

    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="cover_letters")
    resume_version = relationship("ResumeVersion", back_populates="cover_letters")
    job = relationship("Job", back_populates="cover_letters")
    applications = relationship("Application", back_populates="cover_letter")
    versions = relationship("CoverLetter", remote_side=[parent_id])
