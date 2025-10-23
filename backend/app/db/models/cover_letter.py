"""Cover Letter model"""
from sqlalchemy import Column, String, TIMESTAMP, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID


class CoverLetter(Base):
    """AI-generated cover letters"""
    __tablename__ = "cover_letters"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_version_id = Column(GUID(), ForeignKey("resume_versions.id", ondelete="SET NULL"), nullable=True)
    job_id = Column(GUID(), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    content = Column(Text)
    tone = Column(String(50))  # 'formal', 'concise', 'conversational'
    length = Column(String(50))  # 'short', 'medium', 'long'
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="cover_letters")
    resume_version = relationship("ResumeVersion", back_populates="cover_letters")
    job = relationship("Job", back_populates="cover_letters")
    applications = relationship("Application", back_populates="cover_letter")
