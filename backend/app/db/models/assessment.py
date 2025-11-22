"""
SQLAlchemy Models for Skills Assessment & Testing Platform

Sprint 17-18 Phase 4

Models:
- Assessment: Main assessment configuration
- AssessmentQuestion: Questions for each assessment
- AssessmentAttempt: Candidate attempts at assessments
- AssessmentResponse: Individual question responses
- QuestionBankItem: Reusable question library
- JobAssessmentRequirement: Link assessments to jobs
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID, uuid4

from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    Text,
    DECIMAL,
    TIMESTAMP,
    ForeignKey,
    Index,
    UniqueConstraint,
    ARRAY,
    JSON,
)
from sqlalchemy.dialects.postgresql import JSONB
from app.db.types import GUID
from sqlalchemy.orm import relationship, Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


# ============================================================================
# Model 1: Assessment
# ============================================================================

class Assessment(Base):
    """
    Main assessment configuration and metadata.

    Represents a skills assessment test that can be assigned to job applicants.
    Supports multiple question types: MCQ, coding challenges, text responses, file uploads.
    """
    __tablename__ = "assessments"

    # Primary Key & Foreign Keys
    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    company_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False)
    created_by: Mapped[Optional[UUID]] = mapped_column(GUID(), ForeignKey("users.id", ondelete="SET NULL"))

    # Basic Information
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    assessment_type: Mapped[str] = mapped_column(String(50), nullable=False)  # pre_screening, technical, personality
    category: Mapped[Optional[str]] = mapped_column(String(100))

    # Configuration
    time_limit_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    passing_score_percentage: Mapped[float] = mapped_column(DECIMAL(5, 2), default=70.00)
    max_attempts: Mapped[int] = mapped_column(Integer, default=1)

    # Question Behavior
    randomize_questions: Mapped[bool] = mapped_column(Boolean, default=False)
    randomize_options: Mapped[bool] = mapped_column(Boolean, default=False)
    show_correct_answers: Mapped[bool] = mapped_column(Boolean, default=False)
    show_results_immediately: Mapped[bool] = mapped_column(Boolean, default=True)

    # Anti-Cheating / Proctoring
    enable_proctoring: Mapped[bool] = mapped_column(Boolean, default=False)
    allow_tab_switching: Mapped[bool] = mapped_column(Boolean, default=True)
    max_tab_switches: Mapped[int] = mapped_column(Integer, default=5)
    require_webcam: Mapped[bool] = mapped_column(Boolean, default=False)
    track_ip_address: Mapped[bool] = mapped_column(Boolean, default=True)

    # Status & Publishing
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="draft")  # draft, published, archived
    published_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))

    # Analytics
    total_attempts: Mapped[int] = mapped_column(Integer, default=0)
    total_completions: Mapped[int] = mapped_column(Integer, default=0)
    avg_score: Mapped[Optional[float]] = mapped_column(DECIMAL(5, 2))
    pass_rate: Mapped[Optional[float]] = mapped_column(DECIMAL(5, 2))
    avg_time_minutes: Mapped[Optional[int]] = mapped_column(Integer)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    questions: Mapped[List["AssessmentQuestion"]] = relationship("AssessmentQuestion", back_populates="assessment", cascade="all, delete-orphan")
    attempts: Mapped[List["AssessmentAttempt"]] = relationship("AssessmentAttempt", back_populates="assessment", cascade="all, delete-orphan")
    job_requirements: Mapped[List["JobAssessmentRequirement"]] = relationship("JobAssessmentRequirement", back_populates="assessment", cascade="all, delete-orphan")

    # Indexes (defined via Index objects below)
    __table_args__ = (
        Index("idx_assessments_company_id", "company_id"),
        Index("idx_assessments_status", "status"),
        Index("idx_assessments_assessment_type", "assessment_type"),
        Index("idx_assessments_created_at", "created_at"),
    )


# ============================================================================
# Model 2: AssessmentQuestion
# ============================================================================

class AssessmentQuestion(Base):
    """
    Questions belonging to each assessment.

    Polymorphic model supporting multiple question types:
    - MCQ (single/multiple choice)
    - Coding challenges
    - Text responses
    - File uploads
    """
    __tablename__ = "assessment_questions"

    # Primary Key & Foreign Keys
    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    assessment_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)

    # Question Content
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(50), nullable=False)  # mcq_single, mcq_multiple, coding, text, file_upload
    description: Mapped[Optional[str]] = mapped_column(Text)

    # MCQ Options (JSONB)
    options: Mapped[Optional[dict]] = mapped_column(JSON().with_variant(JSONB, "postgresql"))  # ["Option A", "Option B", ...]
    correct_answers: Mapped[Optional[dict]] = mapped_column(JSON().with_variant(JSONB, "postgresql"))  # ["Option B"]

    # Coding Challenge Fields
    coding_language: Mapped[Optional[str]] = mapped_column(String(50))
    starter_code: Mapped[Optional[str]] = mapped_column(Text)
    solution_code: Mapped[Optional[str]] = mapped_column(Text)
    test_cases: Mapped[Optional[dict]] = mapped_column(JSON().with_variant(JSONB, "postgresql"))  # [{"input": "...", "expected_output": "...", "points": 5}]
    execution_timeout_seconds: Mapped[int] = mapped_column(Integer, default=10)

    # File Upload Fields
    allowed_file_types: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String(50)))
    max_file_size_mb: Mapped[int] = mapped_column(Integer, default=10)

    # Scoring
    points: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)
    allow_partial_credit: Mapped[bool] = mapped_column(Boolean, default=True)

    # Metadata
    difficulty: Mapped[Optional[str]] = mapped_column(String(20))  # easy, medium, hard
    category: Mapped[Optional[str]] = mapped_column(String(100))
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String(50)))
    display_order: Mapped[int] = mapped_column(Integer, nullable=False)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    assessment: Mapped["Assessment"] = relationship("Assessment", back_populates="questions")
    responses: Mapped[List["AssessmentResponse"]] = relationship("AssessmentResponse", back_populates="question", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index("idx_assessment_questions_assessment_id", "assessment_id"),
        Index("idx_assessment_questions_question_type", "question_type"),
        Index("idx_assessment_questions_display_order", "assessment_id", "display_order"),
    )


# ============================================================================
# Model 3: AssessmentAttempt
# ============================================================================

class AssessmentAttempt(Base):
    """
    Candidate attempts at assessments.

    Tracks individual attempts with timing, scoring, anti-cheating measures.
    """
    __tablename__ = "assessment_attempts"

    # Primary Key & Foreign Keys
    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    assessment_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)
    application_id: Mapped[Optional[UUID]] = mapped_column(GUID(), ForeignKey("applications.id", ondelete="CASCADE"))
    candidate_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # Attempt Metadata
    attempt_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="not_started")  # not_started, in_progress, completed, disqualified

    # Timing
    started_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    submitted_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    time_elapsed_minutes: Mapped[Optional[int]] = mapped_column(Integer)
    auto_submitted: Mapped[bool] = mapped_column(Boolean, default=False)

    # Scoring
    total_points_possible: Mapped[int] = mapped_column(Integer, nullable=False)
    points_earned: Mapped[Optional[float]] = mapped_column(DECIMAL(10, 2))
    score_percentage: Mapped[Optional[float]] = mapped_column(DECIMAL(5, 2))
    passed: Mapped[Optional[bool]] = mapped_column(Boolean)

    # Questions Progress
    total_questions: Mapped[int] = mapped_column(Integer, nullable=False)
    questions_answered: Mapped[int] = mapped_column(Integer, default=0)
    questions_correct: Mapped[int] = mapped_column(Integer, default=0)

    # Security & Proctoring
    access_token: Mapped[Optional[str]] = mapped_column(String(255), unique=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(String(500))
    tab_switch_count: Mapped[int] = mapped_column(Integer, default=0)
    suspicious_activity: Mapped[Optional[dict]] = mapped_column(JSON().with_variant(JSONB, "postgresql"))

    # Grading Status
    grading_status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, auto_graded, manual_grading_required, graded
    graded_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    graded_by: Mapped[Optional[UUID]] = mapped_column(GUID(), ForeignKey("users.id", ondelete="SET NULL"))

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    assessment: Mapped["Assessment"] = relationship("Assessment", back_populates="attempts")
    responses: Mapped[List["AssessmentResponse"]] = relationship("AssessmentResponse", back_populates="attempt", cascade="all, delete-orphan")

    # Constraints & Indexes
    __table_args__ = (
        UniqueConstraint("assessment_id", "candidate_id", "attempt_number", name="uq_assessment_candidate_attempt"),
        Index("idx_assessment_attempts_assessment_id", "assessment_id"),
        Index("idx_assessment_attempts_candidate_id", "candidate_id"),
        Index("idx_assessment_attempts_application_id", "application_id"),
        Index("idx_assessment_attempts_status", "status"),
        Index("idx_assessment_attempts_access_token", "access_token"),
    )


# ============================================================================
# Model 4: AssessmentResponse
# ============================================================================

class AssessmentResponse(Base):
    """
    Individual question responses within an attempt.

    Polymorphic model storing responses for different question types.
    """
    __tablename__ = "assessment_responses"

    # Primary Key & Foreign Keys
    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    attempt_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("assessment_attempts.id", ondelete="CASCADE"), nullable=False)
    question_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("assessment_questions.id", ondelete="CASCADE"), nullable=False)

    # Response Content (polymorphic)
    response_type: Mapped[str] = mapped_column(String(50), nullable=False)

    # MCQ Response
    selected_options: Mapped[Optional[dict]] = mapped_column(JSON().with_variant(JSONB, "postgresql"))

    # Text Response
    text_response: Mapped[Optional[str]] = mapped_column(Text)

    # File Upload Response
    file_url: Mapped[Optional[str]] = mapped_column(String(500))
    file_name: Mapped[Optional[str]] = mapped_column(String(255))
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer)
    file_type: Mapped[Optional[str]] = mapped_column(String(50))

    # Coding Response
    code_language: Mapped[Optional[str]] = mapped_column(String(50))
    code_execution_output: Mapped[Optional[dict]] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    code_execution_error: Mapped[Optional[str]] = mapped_column(Text)

    # Grading
    is_correct: Mapped[Optional[bool]] = mapped_column(Boolean)
    points_earned: Mapped[Optional[float]] = mapped_column(DECIMAL(10, 2))
    auto_graded: Mapped[bool] = mapped_column(Boolean, default=False)
    grader_comments: Mapped[Optional[str]] = mapped_column(Text)

    # Timing & Behavior
    time_spent_seconds: Mapped[Optional[int]] = mapped_column(Integer)
    answered_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True))
    flagged_for_review: Mapped[bool] = mapped_column(Boolean, default=False)

    # Suspicious Activity
    copy_paste_detected: Mapped[bool] = mapped_column(Boolean, default=False)
    answer_changed_count: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    attempt: Mapped["AssessmentAttempt"] = relationship("AssessmentAttempt", back_populates="responses")
    question: Mapped["AssessmentQuestion"] = relationship("AssessmentQuestion", back_populates="responses")

    # Constraints & Indexes
    __table_args__ = (
        UniqueConstraint("attempt_id", "question_id", name="uq_attempt_question_response"),
        Index("idx_assessment_responses_attempt_id", "attempt_id"),
        Index("idx_assessment_responses_question_id", "question_id"),
        Index("idx_assessment_responses_is_correct", "is_correct"),
    )


# ============================================================================
# Model 5: QuestionBankItem
# ============================================================================

class QuestionBankItem(Base):
    """
    Reusable question library for creating assessments.

    Allows companies to build a library of questions for reuse across assessments.
    Supports public questions (available to all companies) and private (company-only).
    """
    __tablename__ = "question_bank"

    # Primary Key & Foreign Keys
    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    company_id: Mapped[Optional[UUID]] = mapped_column(GUID(), ForeignKey("companies.id", ondelete="CASCADE"))
    created_by: Mapped[Optional[UUID]] = mapped_column(GUID(), ForeignKey("users.id", ondelete="SET NULL"))

    # Question Content (same as AssessmentQuestion)
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    question_type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)

    # MCQ
    options: Mapped[Optional[dict]] = mapped_column(JSON().with_variant(JSONB, "postgresql"))
    correct_answers: Mapped[Optional[dict]] = mapped_column(JSON().with_variant(JSONB, "postgresql"))

    # Coding
    coding_language: Mapped[Optional[str]] = mapped_column(String(50))
    starter_code: Mapped[Optional[str]] = mapped_column(Text)
    solution_code: Mapped[Optional[str]] = mapped_column(Text)
    test_cases: Mapped[Optional[dict]] = mapped_column(JSON().with_variant(JSONB, "postgresql"))

    # File Upload
    allowed_file_types: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String(50)))
    max_file_size_mb: Mapped[Optional[int]] = mapped_column(Integer)

    # Metadata
    points: Mapped[int] = mapped_column(Integer, default=10)
    difficulty: Mapped[Optional[str]] = mapped_column(String(20))
    category: Mapped[Optional[str]] = mapped_column(String(100))
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String(50)))

    # Visibility & Sharing
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)

    # Usage Statistics
    times_used: Mapped[int] = mapped_column(Integer, default=0)
    avg_success_rate: Mapped[Optional[float]] = mapped_column(DECIMAL(5, 2))
    avg_time_seconds: Mapped[Optional[int]] = mapped_column(Integer)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Indexes
    __table_args__ = (
        Index("idx_question_bank_company_id", "company_id"),
        Index("idx_question_bank_question_type", "question_type"),
        Index("idx_question_bank_is_public", "is_public"),
        Index("idx_question_bank_category", "category"),
        Index("idx_question_bank_difficulty", "difficulty"),
    )


# ============================================================================
# Model 6: JobAssessmentRequirement
# ============================================================================

class JobAssessmentRequirement(Base):
    """
    Link assessments to job postings.

    Defines when and how assessments are required for job applications.
    """
    __tablename__ = "job_assessment_requirements"

    # Primary Key & Foreign Keys
    id: Mapped[UUID] = mapped_column(GUID(), primary_key=True, default=uuid4)
    job_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False)
    assessment_id: Mapped[UUID] = mapped_column(GUID(), ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False)

    # Requirement Configuration
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)
    must_pass_to_proceed: Mapped[bool] = mapped_column(Boolean, default=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False)

    # Timing
    deadline_hours_after_application: Mapped[Optional[int]] = mapped_column(Integer)
    send_reminder_hours_before_deadline: Mapped[Optional[int]] = mapped_column(Integer)

    # Visibility
    show_before_application: Mapped[bool] = mapped_column(Boolean, default=True)
    trigger_point: Mapped[str] = mapped_column(String(50), default="after_application")

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())

    # Relationships
    assessment: Mapped["Assessment"] = relationship("Assessment", back_populates="job_requirements")

    # Constraints & Indexes
    __table_args__ = (
        UniqueConstraint("job_id", "assessment_id", name="uq_job_assessment"),
        Index("idx_job_assessment_requirements_job_id", "job_id"),
        Index("idx_job_assessment_requirements_assessment_id", "assessment_id"),
        Index("idx_job_assessment_requirements_order", "job_id", "order"),
    )
