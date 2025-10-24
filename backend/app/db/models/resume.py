"""Resume and ResumeVersion models"""
from sqlalchemy import Column, String, TIMESTAMP, ForeignKey, JSON, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID


class Resume(Base):
    """Original uploaded resume"""
    __tablename__ = "resumes"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255))  # Original filename
    file_size = Column(String(50))  # File size in bytes
    file_type = Column(String(100))  # MIME type
    original_file_url = Column(Text)  # S3/Supabase Storage URL
    parsed_data = Column(JSON, default={})  # Extracted resume data
    parse_status = Column(String(50), default="pending")  # pending, processing, completed, failed
    parse_error = Column(JSON)  # Error details if parsing failed
    is_default = Column(Boolean, default=False)  # Is this the default resume
    is_deleted = Column(Boolean, default=False)  # Soft delete flag
    created_at = Column(TIMESTAMP, server_default=func.now())
    parsed_at = Column(TIMESTAMP)  # When parsing completed

    # Relationships
    user = relationship("User", back_populates="resumes")
    versions = relationship("ResumeVersion", back_populates="resume", cascade="all, delete-orphan")


class ResumeVersion(Base):
    """AI-generated resume versions"""
    __tablename__ = "resume_versions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_id = Column(GUID(), ForeignKey("resumes.id", ondelete="CASCADE"), nullable=True)
    version_name = Column(String(255))  # e.g., "Software Engineer - FAANG"
    content = Column(JSON, default={})  # Structured resume content
    tone = Column(String(50))  # 'formal', 'concise', 'conversational'
    length = Column(String(50))  # 'one_page', 'two_page', 'detailed'
    style = Column(String(50))  # 'ats_optimized', 'creative', 'executive', 'technical'
    target_title = Column(String(255))
    target_company = Column(String(255))
    keywords = Column(JSON, default=[])  # List of emphasized keywords
    strict_factual = Column(Boolean, default=True)  # Hallucination prevention flag
    token_usage = Column(String(50))  # Total tokens used
    cost = Column(String(50))  # Estimated cost in USD
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    is_default = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="resume_versions")
    resume = relationship("Resume", back_populates="versions")
    cover_letters = relationship("CoverLetter", back_populates="resume_version")
    applications = relationship("Application", back_populates="resume_version")
