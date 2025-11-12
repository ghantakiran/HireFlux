"""
Candidate Assessment Schemas - Sprint 19-20 Week 37

Request/Response schemas for candidate-side assessment taking flow.
Handles assessment access, attempt management, answer submission, and results.
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator
from uuid import UUID


# ============================================================================
# Assessment Access
# ============================================================================

class AssessmentAccessResponse(BaseModel):
    """Response when candidate accesses assessment via token"""
    assessment_id: str
    assessment_title: str
    assessment_description: Optional[str] = None
    time_limit_minutes: Optional[int] = None
    total_questions: int
    total_points: float
    status: str  # "not_started", "in_progress", "completed", "expired"
    time_remaining_minutes: Optional[int] = None
    allow_tab_switching: bool = True
    max_tab_switches: Optional[int] = None
    attempt_id: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================================
# Assessment Start
# ============================================================================

class AttemptStartRequest(BaseModel):
    """Request to start new assessment attempt"""
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class QuestionData(BaseModel):
    """Question data for attempt start response"""
    id: str
    question_type: str  # "mcq_single", "mcq_multiple", "text", "coding", "file_upload"
    question_text: str
    points: float
    order: int
    options: Optional[List[Dict[str, Any]]] = None
    starter_code: Optional[str] = None
    coding_language: Optional[str] = None


class AttemptStartResponse(BaseModel):
    """Response when starting assessment attempt"""
    attempt_id: str
    access_token: str
    started_at: datetime
    time_limit_minutes: Optional[int] = None
    total_questions: int
    questions: List[QuestionData]

    class Config:
        from_attributes = True


# ============================================================================
# Answer Submission
# ============================================================================

class AnswerSubmitRequest(BaseModel):
    """Request to submit answer to a question"""
    question_id: UUID
    answer_data: Dict[str, Any]  # Flexible structure for different question types
    time_spent_seconds: Optional[int] = None

    @validator('answer_data')
    def validate_answer_data(cls, v):
        """Validate answer_data structure"""
        if not isinstance(v, dict):
            raise ValueError("answer_data must be a dictionary")
        return v

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "question_id": "123e4567-e89b-12d3-a456-426614174000",
                    "answer_data": {"selected_option": 2},
                    "time_spent_seconds": 45
                },
                {
                    "question_id": "123e4567-e89b-12d3-a456-426614174001",
                    "answer_data": {"selected_options": [0, 2]},
                    "time_spent_seconds": 60
                },
                {
                    "question_id": "123e4567-e89b-12d3-a456-426614174002",
                    "answer_data": {"text_response": "My answer here"},
                    "time_spent_seconds": 120
                }
            ]
        }


class AnswerSubmitResponse(BaseModel):
    """Response after submitting answer"""
    response_id: str
    question_id: str
    is_correct: Optional[bool] = None
    points_earned: Optional[float] = None
    saved_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Code Execution
# ============================================================================

class CodeExecutionRequest(BaseModel):
    """Request to execute coding challenge"""
    question_id: UUID
    code: str
    language: str
    save_to_response: bool = False

    @validator('language')
    def validate_language(cls, v):
        """Validate programming language"""
        supported_languages = [
            "python", "javascript", "typescript", "java",
            "cpp", "c", "go", "rust", "csharp", "ruby", "php"
        ]
        if v.lower() not in supported_languages:
            raise ValueError(f"Unsupported language: {v}. Must be one of {supported_languages}")
        return v.lower()


class CodeExecutionResponse(BaseModel):
    """Response from code execution"""
    status: str  # "success", "error", "timeout", "compilation_error"
    test_cases_passed: int = 0
    test_cases_total: int = 0
    execution_time_ms: int = 0
    output: str = ""
    error_message: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "status": "success",
                "test_cases_passed": 3,
                "test_cases_total": 5,
                "execution_time_ms": 245,
                "output": "Test 1: PASS\nTest 2: PASS\nTest 3: PASS\nTest 4: FAIL\nTest 5: FAIL"
            }
        }


# ============================================================================
# Anti-Cheating
# ============================================================================

class AntiCheatEventRequest(BaseModel):
    """Request to track anti-cheating event"""
    event_type: str  # "tab_switch", "copy_paste", "ip_change", "full_screen_exit"
    details: Optional[Dict[str, Any]] = None

    @validator('event_type')
    def validate_event_type(cls, v):
        """Validate event type"""
        valid_events = ["tab_switch", "copy_paste", "ip_change", "full_screen_exit", "suspicious_behavior"]
        if v not in valid_events:
            raise ValueError(f"Invalid event_type: {v}. Must be one of {valid_events}")
        return v

    class Config:
        json_schema_extra = {
            "examples": [
                {
                    "event_type": "tab_switch",
                    "details": {"timestamp": "2025-11-12T10:30:00Z", "duration_seconds": 5}
                },
                {
                    "event_type": "copy_paste",
                    "details": {"action": "paste", "length": 150}
                }
            ]
        }


# ============================================================================
# Assessment Submission
# ============================================================================

class AssessmentSubmitResponse(BaseModel):
    """Response after submitting final assessment"""
    attempt_id: str
    score_percentage: float
    points_earned: float
    total_points: float
    questions_correct: int
    total_questions: int
    passed: bool
    submitted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============================================================================
# Results Retrieval
# ============================================================================

class QuestionResult(BaseModel):
    """Individual question result"""
    question_id: str
    question_text: str
    question_type: str
    points_possible: float
    points_earned: Optional[float] = None
    is_correct: Optional[bool] = None
    candidate_answer: Optional[Dict[str, Any]] = None
    correct_answer: Optional[Dict[str, Any]] = None
    feedback: Optional[str] = None
    show_correct_answer: bool = True


class AssessmentResultsResponse(BaseModel):
    """Complete assessment results"""
    attempt_id: str
    assessment_title: str
    score_percentage: float
    points_earned: float
    total_points: float
    questions_correct: int
    total_questions: int
    passed: bool
    submitted_at: Optional[datetime] = None
    graded_at: Optional[datetime] = None
    time_taken_minutes: Optional[int] = None
    question_results: List[QuestionResult] = []
    overall_feedback: Optional[str] = None

    class Config:
        from_attributes = True


# ============================================================================
# Progress Tracking
# ============================================================================

class AttemptProgressResponse(BaseModel):
    """Real-time progress of ongoing assessment"""
    attempt_id: str
    assessment_id: str
    status: str  # "in_progress", "completed", "expired"
    questions_answered: int
    total_questions: int
    time_elapsed_minutes: int
    time_remaining_minutes: Optional[int] = None
    last_saved_at: Optional[datetime] = None
    current_score: Optional[float] = None
    auto_graded_points: Optional[float] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "attempt_id": "123e4567-e89b-12d3-a456-426614174000",
                "assessment_id": "123e4567-e89b-12d3-a456-426614174001",
                "status": "in_progress",
                "questions_answered": 5,
                "total_questions": 10,
                "time_elapsed_minutes": 15,
                "time_remaining_minutes": 45,
                "last_saved_at": "2025-11-12T10:45:00Z",
                "current_score": 70.5,
                "auto_graded_points": 35.25
            }
        }
