"""Schemas for AI resume generation and optimization"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class ResumeTone(str, Enum):
    """Resume tone styles"""

    FORMAL = "formal"
    CONVERSATIONAL = "conversational"
    CONCISE = "concise"


class ResumeLength(str, Enum):
    """Resume length preferences"""

    ONE_PAGE = "one_page"
    TWO_PAGE = "two_page"
    DETAILED = "detailed"


class OptimizationStyle(str, Enum):
    """Resume optimization styles"""

    ATS_OPTIMIZED = "ats_optimized"
    CREATIVE = "creative"
    EXECUTIVE = "executive"
    TECHNICAL = "technical"


class GenerationStatus(str, Enum):
    """Status of AI generation"""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AIResumeGenerationRequest(BaseModel):
    """Request to generate AI-optimized resume"""

    resume_id: str = Field(..., description="Source resume ID")
    target_title: Optional[str] = Field(
        None, max_length=255, description="Target job title"
    )
    target_company: Optional[str] = Field(
        None, max_length=255, description="Target company name"
    )
    tone: ResumeTone = Field(default=ResumeTone.FORMAL, description="Desired tone")
    length: ResumeLength = Field(
        default=ResumeLength.ONE_PAGE, description="Desired length"
    )
    style: OptimizationStyle = Field(
        default=OptimizationStyle.ATS_OPTIMIZED, description="Optimization style"
    )
    include_keywords: List[str] = Field(
        default=[], max_items=20, description="Keywords to emphasize"
    )
    strict_factual: bool = Field(default=True, description="Prevent AI hallucinations")
    version_name: Optional[str] = Field(
        None, max_length=255, description="Name for this version"
    )

    @field_validator("include_keywords")
    @classmethod
    def validate_keywords(cls, v):
        if len(v) > 20:
            raise ValueError("Maximum 20 keywords allowed")
        return [kw.strip() for kw in v if kw.strip()]


class SectionRegenerationRequest(BaseModel):
    """Request to regenerate specific resume sections"""

    resume_version_id: str = Field(..., description="Resume version to update")
    sections: List[str] = Field(..., min_items=1, description="Sections to regenerate")
    tone: Optional[ResumeTone] = Field(
        None, description="Tone for regenerated sections"
    )
    instructions: Optional[str] = Field(
        None, max_length=500, description="Specific instructions"
    )

    @field_validator("sections")
    @classmethod
    def validate_sections(cls, v):
        valid_sections = [
            "summary",
            "experience",
            "education",
            "skills",
            "certifications",
        ]
        for section in v:
            if section not in valid_sections:
                raise ValueError(
                    f"Invalid section: {section}. Must be one of {valid_sections}"
                )
        return v


class AIEnhancementRequest(BaseModel):
    """Request to enhance specific text"""

    text: str = Field(
        ..., min_length=10, max_length=2000, description="Text to enhance"
    )
    context: Optional[str] = Field(
        None, max_length=500, description="Context for enhancement"
    )
    tone: ResumeTone = Field(default=ResumeTone.FORMAL, description="Desired tone")
    max_length: Optional[int] = Field(
        None, ge=50, le=500, description="Maximum enhanced length"
    )


class AIGenerationResponse(BaseModel):
    """Response from AI generation"""

    id: str
    user_id: str
    source_resume_id: str
    version_name: str
    status: GenerationStatus
    generated_content: Optional[Dict[str, Any]] = None
    token_usage: Optional[int] = None
    cost: Optional[float] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


class AIGenerationStats(BaseModel):
    """Statistics for AI generation"""

    total_generations: int
    tokens_used: int
    total_cost: float
    average_generation_time: float
    success_rate: float


class ImprovementSuggestion(BaseModel):
    """AI suggestion for resume improvement"""

    section: str
    current_text: str
    suggested_text: str
    reason: str
    priority: str  # high, medium, low


class AIImprovementSuggestionsResponse(BaseModel):
    """Response with improvement suggestions"""

    resume_id: str
    suggestions: List[ImprovementSuggestion]
    overall_score: float  # 0-100
    strengths: List[str]
    weaknesses: List[str]
    missing_keywords: List[str]


class GenerationPreferences(BaseModel):
    """User's default generation preferences"""

    default_tone: ResumeTone = ResumeTone.FORMAL
    default_length: ResumeLength = ResumeLength.ONE_PAGE
    default_style: OptimizationStyle = OptimizationStyle.ATS_OPTIMIZED
    strict_factual: bool = True
    auto_include_keywords: List[str] = Field(default=[])


class TokenUsageLog(BaseModel):
    """Log of token usage for cost tracking"""

    id: str
    user_id: str
    operation: str
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    estimated_cost: float
    timestamp: datetime


class AIPromptTemplate(BaseModel):
    """Template for AI prompts"""

    template_name: str
    template_text: str
    variables: List[str]
    description: str


class ComparisonResult(BaseModel):
    """Result of comparing original vs generated resume"""

    original_version_id: str
    generated_version_id: str
    differences: List[Dict[str, Any]]
    improvements: List[str]
    similarity_score: float  # 0-100
    recommendation: str  # which to keep


class AIGenerationQueueItem(BaseModel):
    """Item in the AI generation queue"""

    queue_id: str
    user_id: str
    request: AIResumeGenerationRequest
    status: GenerationStatus
    priority: int = 5  # 1-10, higher is more urgent
    estimated_wait_time: Optional[int] = None  # seconds
    created_at: datetime
    started_at: Optional[datetime] = None


class CreditDeduction(BaseModel):
    """Credit deduction for AI operation"""

    user_id: str
    operation: str
    credits_deducted: float
    remaining_credits: float
    timestamp: datetime


class AIServiceHealthCheck(BaseModel):
    """Health check for AI service"""

    openai_available: bool
    rate_limit_status: str  # ok, warning, critical
    queue_length: int
    average_response_time: float
    error_rate: float
    last_check: datetime
