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
    original_file_url = Column(Text)  # S3/Supabase Storage URL
    parsed_data = Column(JSON, default={})  # Extracted resume data
    created_at = Column(TIMESTAMP, server_default=func.now())

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
    target_title = Column(String(255))
    is_default = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="resume_versions")
    resume = relationship("Resume", back_populates="versions")
    cover_letters = relationship("CoverLetter", back_populates="resume_version")
    applications = relationship("Application", back_populates="resume_version")
