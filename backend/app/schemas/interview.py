"""Interview schemas for validation and serialization"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from datetime import datetime
from enum import Enum


class InterviewType(str, Enum):
    """Interview types"""

    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    SYSTEM_DESIGN = "system-design"
    PRODUCT = "product"
    LEADERSHIP = "leadership"


class RoleLevel(str, Enum):
    """Role seniority levels"""

    JUNIOR = "junior"
    MID = "mid"
    SENIOR = "senior"
    STAFF = "staff"


class CompanyType(str, Enum):
    """Company types"""

    FAANG = "faang"
    TECH = "tech"
    ENTERPRISE = "enterprise"
    FINTECH = "fintech"
    HEALTHCARE = "healthcare"


class SessionStatus(str, Enum):
    """Interview session status"""

    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class DifficultyLevel(str, Enum):
    """Question difficulty levels"""

    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


# Request Schemas
class InterviewSessionCreate(BaseModel):
    """Schema for creating a new interview session"""

    interview_type: InterviewType
    role_level: RoleLevel
    company_type: CompanyType
    focus_area: Optional[str] = Field(
        None, max_length=100, description="e.g., 'python', 'frontend'"
    )
    target_company: Optional[str] = Field(
        None, max_length=255, description="Optional specific company"
    )
    target_role: Optional[str] = Field(
        None, max_length=255, description="Optional specific role"
    )
    total_questions: int = Field(
        5, ge=1, le=20, description="Number of questions in session"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "interview_type": "technical",
                "role_level": "senior",
                "company_type": "tech",
                "focus_area": "python",
                "target_company": "Google",
                "target_role": "Senior Software Engineer",
                "total_questions": 5,
            }
        }


class AnswerSubmit(BaseModel):
    """Schema for submitting an answer to a question"""

    user_answer: str = Field(
        ..., min_length=10, max_length=5000, description="User's answer to the question"
    )
    time_taken_seconds: Optional[int] = Field(
        None, ge=0, description="Time taken to answer in seconds"
    )

    @field_validator("user_answer")
    @classmethod
    def validate_answer_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError("Answer cannot be empty")
        return v.strip()

    class Config:
        json_schema_extra = {
            "example": {
                "user_answer": "At my previous company, we faced a situation where our API response time increased from 200ms to 2000ms...",
                "time_taken_seconds": 180,
            }
        }


# Response Schemas
class QuestionFeedback(BaseModel):
    """Feedback on a single answer"""

    score: float = Field(..., ge=0, le=10, description="Score from 0-10")
    ai_feedback: str = Field(..., description="Detailed AI feedback")
    sample_answer: str = Field(..., description="Example of a strong answer")
    strengths: List[str] = Field(default_factory=list, description="What was done well")
    improvements: List[str] = Field(
        default_factory=list, description="Areas to improve"
    )

    # STAR framework analysis (for behavioral questions)
    has_situation: bool = False
    has_task: bool = False
    has_action: bool = False
    has_result: bool = False
    star_completeness_score: Optional[float] = Field(None, ge=0, le=10)

    class Config:
        json_schema_extra = {
            "example": {
                "score": 8.5,
                "ai_feedback": "Great answer! You provided specific metrics and demonstrated impact...",
                "sample_answer": "In my role as a senior engineer at TechCo...",
                "strengths": [
                    "Used specific metrics",
                    "Clear structure",
                    "Demonstrated impact",
                ],
                "improvements": [
                    "Could elaborate on team collaboration",
                    "Add more technical depth",
                ],
                "has_situation": True,
                "has_task": True,
                "has_action": True,
                "has_result": True,
                "star_completeness_score": 9.0,
            }
        }


class InterviewQuestionResponse(BaseModel):
    """Response schema for interview question"""

    id: int
    session_id: int
    question_number: int
    question_text: str
    question_category: Optional[str] = None
    difficulty_level: Optional[str] = None
    user_answer: Optional[str] = None
    time_taken_seconds: Optional[int] = None
    score: Optional[float] = None
    ai_feedback: Optional[str] = None
    sample_answer: Optional[str] = None
    strengths: Optional[List[str]] = None
    improvements: Optional[List[str]] = None
    has_situation: bool = False
    has_task: bool = False
    has_action: bool = False
    has_result: bool = False
    star_completeness_score: Optional[float] = None
    is_answered: bool = False
    asked_at: datetime
    answered_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class InterviewSessionResponse(BaseModel):
    """Response schema for interview session"""

    id: int
    user_id: int
    interview_type: str
    role_level: str
    company_type: str
    focus_area: Optional[str] = None
    target_company: Optional[str] = None
    target_role: Optional[str] = None
    status: str
    total_questions: int
    questions_answered: int
    overall_score: Optional[float] = None
    star_framework_score: Optional[float] = None
    technical_accuracy_score: Optional[float] = None
    communication_score: Optional[float] = None
    confidence_score: Optional[float] = None
    strengths: Optional[List[str]] = None
    improvement_areas: Optional[List[str]] = None
    feedback_summary: Optional[str] = None
    completion_percentage: float = 0.0
    is_completed: bool = False
    started_at: datetime
    completed_at: Optional[datetime] = None
    questions: List[InterviewQuestionResponse] = Field(default_factory=list)

    class Config:
        from_attributes = True


class SessionStats(BaseModel):
    """User's interview practice statistics"""

    total_sessions: int = 0
    sessions_completed: int = 0
    total_questions_answered: int = 0
    average_score: Optional[float] = None
    improvement_rate: Optional[float] = None  # Percentage improvement over time
    sessions_by_type: dict = Field(default_factory=dict)  # Count by interview type
    recent_sessions: List[InterviewSessionResponse] = Field(default_factory=list)

    class Config:
        json_schema_extra = {
            "example": {
                "total_sessions": 23,
                "sessions_completed": 20,
                "total_questions_answered": 156,
                "average_score": 8.2,
                "improvement_rate": 15.0,
                "sessions_by_type": {
                    "technical": 12,
                    "behavioral": 8,
                    "system-design": 3,
                },
                "recent_sessions": [],
            }
        }
