"""Interview coaching session model"""
from sqlalchemy import Column, String, TIMESTAMP, ForeignKey, JSON, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID


class InterviewSession(Base):
    """Interview coaching sessions"""
    __tablename__ = "interview_sessions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role = Column(String(255))  # Target role for interview
    questions = Column(JSON, default=[])  # Array of questions asked
    answers = Column(JSON, default=[])  # Array of user answers
    feedback = Column(JSON, default=[])  # Array of AI feedback
    overall_score = Column(Numeric(3, 1))  # e.g., 7.5 out of 10
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="interview_sessions")
