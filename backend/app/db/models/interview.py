"""
Interview Models (INT-001)
Database schema for interview coaching sessions
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    Float,
    Boolean,
    ForeignKey,
    JSON,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class InterviewSession(Base):
    """Interview practice session"""

    __tablename__ = "interview_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Session configuration
    interview_type = Column(
        String(50), nullable=False
    )  # technical, behavioral, system-design, product, leadership
    role_level = Column(String(50), nullable=False)  # junior, mid, senior, staff
    company_type = Column(
        String(50), nullable=False
    )  # faang, tech, enterprise, fintech, healthcare
    focus_area = Column(
        String(100), nullable=True
    )  # python, frontend, fullstack, devops, data
    target_company = Column(String(255), nullable=True)  # Optional specific company
    target_role = Column(String(255), nullable=True)  # Optional specific role

    # Session metadata
    status = Column(
        String(50), default="in_progress"
    )  # in_progress, completed, abandoned
    total_questions = Column(Integer, default=5)
    questions_answered = Column(Integer, default=0)

    # Scoring and feedback
    overall_score = Column(Float, nullable=True)  # 0-10 scale
    star_framework_score = Column(Float, nullable=True)  # STAR methodology adherence
    technical_accuracy_score = Column(Float, nullable=True)
    communication_score = Column(Float, nullable=True)
    confidence_score = Column(Float, nullable=True)

    # Session summary
    strengths = Column(JSON, nullable=True)  # List of strength areas
    improvement_areas = Column(JSON, nullable=True)  # List of areas to improve
    feedback_summary = Column(Text, nullable=True)  # Overall feedback

    # Timestamps
    started_at = Column(DateTime, default=func.now())
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="interview_sessions")
    questions = relationship(
        "InterviewQuestion", back_populates="session", cascade="all, delete-orphan"
    )

    def __repr__(self):
        return f"<InterviewSession(id={self.id}, user_id={self.user_id}, type='{self.interview_type}', status='{self.status}')>"

    @property
    def is_completed(self) -> bool:
        """Check if session is completed"""
        return self.status == "completed"

    @property
    def completion_percentage(self) -> float:
        """Calculate completion percentage"""
        if self.total_questions == 0:
            return 0.0
        return (self.questions_answered / self.total_questions) * 100


class InterviewQuestion(Base):
    """Individual interview question and answer"""

    __tablename__ = "interview_questions"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(
        Integer, ForeignKey("interview_sessions.id"), nullable=False, index=True
    )

    # Question details
    question_number = Column(Integer, nullable=False)  # 1-indexed position in session
    question_text = Column(Text, nullable=False)
    question_category = Column(
        String(100), nullable=True
    )  # e.g., "data structures", "leadership"
    difficulty_level = Column(String(50), nullable=True)  # easy, medium, hard

    # User's answer
    user_answer = Column(Text, nullable=True)
    time_taken_seconds = Column(Integer, nullable=True)  # Time spent answering

    # AI feedback
    ai_feedback = Column(Text, nullable=True)  # Detailed feedback on the answer
    sample_answer = Column(Text, nullable=True)  # Example of a strong answer
    score = Column(Float, nullable=True)  # 0-10 score for this specific answer

    # STAR framework analysis (for behavioral questions)
    has_situation = Column(Boolean, default=False)
    has_task = Column(Boolean, default=False)
    has_action = Column(Boolean, default=False)
    has_result = Column(Boolean, default=False)
    star_completeness_score = Column(Float, nullable=True)  # 0-10

    # Feedback highlights
    strengths = Column(JSON, nullable=True)  # List of what was done well
    improvements = Column(JSON, nullable=True)  # List of suggestions

    # Timestamps
    asked_at = Column(DateTime, default=func.now())
    answered_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    session = relationship("InterviewSession", back_populates="questions")

    def __repr__(self):
        return f"<InterviewQuestion(id={self.id}, session_id={self.session_id}, number={self.question_number})>"

    @property
    def is_answered(self) -> bool:
        """Check if question has been answered"""
        return self.user_answer is not None and len(self.user_answer.strip()) > 0

    @property
    def has_complete_star(self) -> bool:
        """Check if answer follows complete STAR framework"""
        return all(
            [self.has_situation, self.has_task, self.has_action, self.has_result]
        )
