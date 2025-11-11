"""
Pydantic Schemas for Skills Assessment & Testing Platform

Sprint 17-18 Phase 4

Request/Response schemas for all assessment-related API endpoints.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field, validator, ConfigDict


# ============================================================================
# ENUMS
# ============================================================================

class AssessmentType(str, Enum):
    """Assessment category types"""
    PRE_SCREENING = "pre_screening"
    TECHNICAL = "technical"
    PERSONALITY = "personality"
    SKILLS_TEST = "skills_test"


class QuestionType(str, Enum):
    """Question format types"""
    MCQ_SINGLE = "mcq_single"
    MCQ_MULTIPLE = "mcq_multiple"
    CODING = "coding"
    TEXT = "text"
    FILE_UPLOAD = "file_upload"


class AssessmentStatus(str, Enum):
    """Assessment publishing status"""
    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"
    DELETED = "deleted"


class AttemptStatus(str, Enum):
    """Assessment attempt status"""
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DISQUALIFIED = "disqualified"
    EXPIRED = "expired"


class GradingStatus(str, Enum):
    """Grading status"""
    PENDING = "pending"
    AUTO_GRADED = "auto_graded"
    MANUAL_GRADING_REQUIRED = "manual_grading_required"
    GRADED = "graded"


class Difficulty(str, Enum):
    """Question difficulty levels"""
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class CodingLanguage(str, Enum):
    """Supported coding languages"""
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
    JAVA = "java"
    CPP = "cpp"
    GO = "go"
    RUST = "rust"
    CSHARP = "csharp"


# ============================================================================
# ASSESSMENT SCHEMAS
# ============================================================================

class AssessmentBase(BaseModel):
    """Base assessment fields"""
    title: str = Field(..., max_length=255, description="Assessment title")
    description: Optional[str] = Field(None, description="Assessment description/instructions")
    assessment_type: AssessmentType
    category: Optional[str] = Field(None, max_length=100)

    # Configuration
    time_limit_minutes: Optional[int] = Field(None, gt=0, le=480, description="Time limit (max 8 hours)")
    passing_score_percentage: float = Field(70.0, ge=0, le=100)
    max_attempts: int = Field(1, ge=1, le=10)

    # Question Behavior
    randomize_questions: bool = False
    randomize_options: bool = False
    show_correct_answers: bool = False
    show_results_immediately: bool = True

    # Anti-Cheating
    enable_proctoring: bool = False
    allow_tab_switching: bool = True
    max_tab_switches: int = Field(5, ge=0, le=100)
    require_webcam: bool = False
    track_ip_address: bool = True


class AssessmentCreate(AssessmentBase):
    """Schema for creating a new assessment"""
    pass


class AssessmentUpdate(BaseModel):
    """Schema for updating an assessment (all fields optional)"""
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    assessment_type: Optional[AssessmentType] = None
    category: Optional[str] = Field(None, max_length=100)

    time_limit_minutes: Optional[int] = Field(None, gt=0, le=480)
    passing_score_percentage: Optional[float] = Field(None, ge=0, le=100)
    max_attempts: Optional[int] = Field(None, ge=1, le=10)

    randomize_questions: Optional[bool] = None
    randomize_options: Optional[bool] = None
    show_correct_answers: Optional[bool] = None
    show_results_immediately: Optional[bool] = None

    enable_proctoring: Optional[bool] = None
    allow_tab_switching: Optional[bool] = None
    max_tab_switches: Optional[int] = Field(None, ge=0, le=100)
    require_webcam: Optional[bool] = None
    track_ip_address: Optional[bool] = None


class AssessmentResponse(AssessmentBase):
    """Schema for assessment response"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    created_by: Optional[UUID]
    status: AssessmentStatus
    published_at: Optional[datetime]

    # Analytics
    total_attempts: int
    total_completions: int
    avg_score: Optional[float]
    pass_rate: Optional[float]
    avg_time_minutes: Optional[int]

    # Timestamps
    created_at: datetime
    updated_at: datetime


class AssessmentWithQuestions(AssessmentResponse):
    """Assessment with full question list"""
    questions: List["QuestionResponse"] = []


# ============================================================================
# QUESTION SCHEMAS
# ============================================================================

class TestCase(BaseModel):
    """Test case for coding questions"""
    input: str = Field(..., description="Test input")
    expected_output: str = Field(..., description="Expected output")
    points: int = Field(..., gt=0, description="Points for this test case")
    is_hidden: bool = Field(False, description="Hidden from candidate")


class QuestionBase(BaseModel):
    """Base question fields"""
    question_text: str = Field(..., min_length=10, description="Question text")
    question_type: QuestionType
    description: Optional[str] = Field(None, description="Additional context")

    # MCQ fields
    options: Optional[List[str]] = Field(None, min_length=2, max_length=10)
    correct_answers: Optional[List[str]] = Field(None, min_length=1)

    # Coding fields
    coding_language: Optional[CodingLanguage] = None
    starter_code: Optional[str] = None
    solution_code: Optional[str] = None
    test_cases: Optional[List[TestCase]] = None
    execution_timeout_seconds: int = Field(10, ge=1, le=300)

    # File upload fields
    allowed_file_types: Optional[List[str]] = Field(None, max_length=10)
    max_file_size_mb: int = Field(10, ge=1, le=100)

    # Scoring
    points: int = Field(10, gt=0, le=1000)
    is_required: bool = True
    allow_partial_credit: bool = True

    # Metadata
    difficulty: Optional[Difficulty] = None
    category: Optional[str] = Field(None, max_length=100)
    tags: Optional[List[str]] = Field(None, max_length=20)
    display_order: int = Field(..., ge=1)

    @validator("correct_answers")
    def validate_correct_answers_in_options(cls, v, values):
        """Ensure correct answers are in options list for MCQ"""
        if values.get("question_type") in [QuestionType.MCQ_SINGLE, QuestionType.MCQ_MULTIPLE]:
            if not v:
                raise ValueError("correct_answers required for MCQ questions")
            options = values.get("options", [])
            if not all(ans in options for ans in v):
                raise ValueError("All correct answers must be in options list")
        return v

    @validator("test_cases")
    def validate_test_cases_for_coding(cls, v, values):
        """Ensure test cases exist for coding questions"""
        if values.get("question_type") == QuestionType.CODING:
            if not v or len(v) == 0:
                raise ValueError("At least one test case required for coding questions")
        return v


class QuestionCreate(QuestionBase):
    """Schema for creating a new question"""
    pass


class QuestionUpdate(BaseModel):
    """Schema for updating a question (all fields optional)"""
    question_text: Optional[str] = Field(None, min_length=10)
    description: Optional[str] = None
    options: Optional[List[str]] = None
    correct_answers: Optional[List[str]] = None
    coding_language: Optional[CodingLanguage] = None
    starter_code: Optional[str] = None
    solution_code: Optional[str] = None
    test_cases: Optional[List[TestCase]] = None
    points: Optional[int] = Field(None, gt=0, le=1000)
    difficulty: Optional[Difficulty] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    display_order: Optional[int] = Field(None, ge=1)


class QuestionResponse(QuestionBase):
    """Schema for question response"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    assessment_id: UUID
    created_at: datetime
    updated_at: datetime


# ============================================================================
# ASSESSMENT ATTEMPT SCHEMAS
# ============================================================================

class AssessmentAttemptCreate(BaseModel):
    """Schema for starting an assessment attempt"""
    application_id: Optional[UUID] = Field(None, description="Link to job application")
    ip_address: Optional[str] = Field(None, description="Candidate IP address")
    user_agent: Optional[str] = Field(None, max_length=500)


class AssessmentAttemptResponse(BaseModel):
    """Schema for assessment attempt response"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    assessment_id: UUID
    application_id: Optional[UUID]
    candidate_id: UUID
    attempt_number: int
    status: AttemptStatus

    # Timing
    started_at: Optional[datetime]
    submitted_at: Optional[datetime]
    time_elapsed_minutes: Optional[int]
    auto_submitted: bool

    # Scoring
    total_points_possible: int
    points_earned: Optional[float]
    score_percentage: Optional[float]
    passed: Optional[bool]

    # Progress
    total_questions: int
    questions_answered: int
    questions_correct: int

    # Security
    access_token: Optional[str]
    tab_switch_count: int

    # Grading
    grading_status: GradingStatus
    graded_at: Optional[datetime]

    # Timestamps
    created_at: datetime
    updated_at: datetime


class AssessmentAttemptWithResponses(AssessmentAttemptResponse):
    """Assessment attempt with all responses"""
    responses: List["ResponseResponse"] = []


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class ResponseCreate(BaseModel):
    """Schema for submitting a question response"""
    question_id: UUID
    response_type: QuestionType

    # MCQ response
    selected_options: Optional[List[str]] = None

    # Text/Coding response
    text_response: Optional[str] = None

    # File upload response
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size_bytes: Optional[int] = None
    file_type: Optional[str] = None

    # Metadata
    time_spent_seconds: Optional[int] = Field(None, ge=0)
    flagged_for_review: bool = False
    copy_paste_detected: bool = False


class ResponseResponse(BaseModel):
    """Schema for response data"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    attempt_id: UUID
    question_id: UUID
    response_type: QuestionType

    # Response data
    selected_options: Optional[Dict[str, Any]]
    text_response: Optional[str]
    file_url: Optional[str]
    file_name: Optional[str]

    # Grading
    is_correct: Optional[bool]
    points_earned: Optional[float]
    auto_graded: bool
    grader_comments: Optional[str]

    # Timing
    time_spent_seconds: Optional[int]
    answered_at: Optional[datetime]

    # Timestamps
    created_at: datetime
    updated_at: datetime


# ============================================================================
# QUESTION BANK SCHEMAS
# ============================================================================

class QuestionBankCreate(BaseModel):
    """Schema for creating a question bank item"""
    question_text: str = Field(..., min_length=10)
    question_type: QuestionType
    description: Optional[str] = None

    # Type-specific fields (same as QuestionBase)
    options: Optional[List[str]] = None
    correct_answers: Optional[List[str]] = None
    coding_language: Optional[CodingLanguage] = None
    starter_code: Optional[str] = None
    solution_code: Optional[str] = None
    test_cases: Optional[List[TestCase]] = None
    allowed_file_types: Optional[List[str]] = None
    max_file_size_mb: int = 10

    # Metadata
    points: int = 10
    difficulty: Optional[Difficulty] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: bool = False


class QuestionBankResponse(BaseModel):
    """Schema for question bank item response"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: Optional[UUID]
    created_by: Optional[UUID]
    question_text: str
    question_type: QuestionType
    difficulty: Optional[Difficulty]
    category: Optional[str]
    tags: Optional[List[str]]
    is_public: bool
    is_verified: bool
    times_used: int
    avg_success_rate: Optional[float]
    created_at: datetime
    updated_at: datetime


# ============================================================================
# JOB ASSESSMENT REQUIREMENT SCHEMAS
# ============================================================================

class JobAssessmentRequirementCreate(BaseModel):
    """Schema for linking assessment to job"""
    assessment_id: UUID
    is_required: bool = True
    must_pass_to_proceed: bool = False
    order: int = Field(..., ge=1, description="Order in application flow")
    deadline_hours_after_application: Optional[int] = Field(None, ge=1, le=720)  # Max 30 days
    send_reminder_hours_before_deadline: Optional[int] = Field(None, ge=1, le=168)  # Max 7 days
    show_before_application: bool = True
    trigger_point: str = Field("after_application", pattern="^(after_application|before_interview)$")


class JobAssessmentRequirementResponse(BaseModel):
    """Schema for job assessment requirement response"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    job_id: UUID
    assessment_id: UUID
    is_required: bool
    must_pass_to_proceed: bool
    order: int
    deadline_hours_after_application: Optional[int]
    show_before_application: bool
    trigger_point: str
    created_at: datetime


# ============================================================================
# FILTER & QUERY SCHEMAS
# ============================================================================

class AssessmentFilters(BaseModel):
    """Filters for listing assessments"""
    status: Optional[AssessmentStatus] = None
    assessment_type: Optional[AssessmentType] = None
    category: Optional[str] = None
    search: Optional[str] = Field(None, max_length=255, description="Search by title/description")
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)


class QuestionBankFilters(BaseModel):
    """Filters for searching question bank"""
    question_type: Optional[QuestionType] = None
    difficulty: Optional[Difficulty] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    is_public: Optional[bool] = None
    search: Optional[str] = Field(None, max_length=255)
    page: int = Field(1, ge=1)
    limit: int = Field(20, ge=1, le=100)


# ============================================================================
# GRADING SCHEMAS
# ============================================================================

class ManualGradeRequest(BaseModel):
    """Schema for manual grading"""
    response_id: UUID
    points_earned: float = Field(..., ge=0)
    grader_comments: Optional[str] = Field(None, max_length=2000)


class BulkGradeRequest(BaseModel):
    """Schema for bulk grading multiple responses"""
    responses: List[ManualGradeRequest] = Field(..., min_length=1, max_length=100)


# ============================================================================
# ANALYTICS & STATISTICS SCHEMAS
# ============================================================================

class AssessmentStatistics(BaseModel):
    """Assessment analytics"""
    assessment_id: UUID
    total_attempts: int
    total_completions: int
    completion_rate: float = Field(..., ge=0, le=100)
    avg_score: Optional[float]
    pass_rate: Optional[float]
    avg_time_minutes: Optional[int]
    question_statistics: List[Dict[str, Any]] = Field(default_factory=list)


# ============================================================================
# SPECIAL ACTION SCHEMAS
# ============================================================================

class PublishAssessmentRequest(BaseModel):
    """Request to publish an assessment"""
    confirm: bool = Field(True, description="Confirm publishing")


class RecordTabSwitchRequest(BaseModel):
    """Record tab switching activity"""
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class SubmitAssessmentRequest(BaseModel):
    """Request to submit completed assessment"""
    confirm_submission: bool = Field(True)


# Update forward refs
AssessmentWithQuestions.model_rebuild()
AssessmentAttemptWithResponses.model_rebuild()
