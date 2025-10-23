"""Application tracking model"""
from sqlalchemy import Column, String, TIMESTAMP, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID


class Application(Base):
    """Job applications"""
    __tablename__ = "applications"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(GUID(), ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True)
    resume_version_id = Column(GUID(), ForeignKey("resume_versions.id", ondelete="SET NULL"), nullable=True)
    cover_letter_id = Column(GUID(), ForeignKey("cover_letters.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(50), index=True, default='saved')  # 'saved', 'applied', 'interview', 'offer', 'rejected'
    applied_at = Column(TIMESTAMP)
    notes = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="applications")
    job = relationship("Job", back_populates="applications")
    resume_version = relationship("ResumeVersion", back_populates="applications")
    cover_letter = relationship("CoverLetter", back_populates="applications")
