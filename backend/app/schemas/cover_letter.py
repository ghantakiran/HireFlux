"""Schemas for cover letter generation"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class CoverLetterTone(str, Enum):
    """Cover letter tone styles"""
    FORMAL = "formal"
    CONVERSATIONAL = "conversational"
    ENTHUSIASTIC = "enthusiastic"
    PROFESSIONAL = "professional"


class CoverLetterLength(str, Enum):
    """Cover letter length preferences"""
    BRIEF = "brief"  # 200-250 words
    STANDARD = "standard"  # 300-400 words
    DETAILED = "detailed"  # 450-600 words


class CoverLetterStatus(str, Enum):
    """Status of cover letter generation"""
    DRAFT = "draft"
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class CoverLetterGenerationRequest(BaseModel):
    """Request to generate cover letter"""
    resume_version_id: Optional[str] = Field(None, description="Specific resume version to use")
    resume_id: Optional[str] = Field(None, description="Resume ID (uses default version)")
    job_title: str = Field(..., min_length=1, max_length=255, description="Target job title")
    company_name: str = Field(..., min_length=1, max_length=255, description="Company name")
    job_description: Optional[str] = Field(None, max_length=10000, description="Full job description")
    tone: CoverLetterTone = Field(default=CoverLetterTone.PROFESSIONAL, description="Desired tone")
    length: CoverLetterLength = Field(default=CoverLetterLength.STANDARD, description="Desired length")
    emphasize_skills: List[str] = Field(default=[], max_length=10, description="Skills to highlight")
    custom_intro: Optional[str] = Field(None, max_length=500, description="Custom introduction paragraph")
    company_research: Optional[str] = Field(None, max_length=1000, description="Company insights to incorporate")
    referral_name: Optional[str] = Field(None, max_length=255, description="Referral contact name and title")
    address_gap: Optional[str] = Field(None, max_length=500, description="Explanation for employment gap")
    career_change_context: Optional[str] = Field(None, max_length=500, description="Career transition context")
    strict_factual: bool = Field(default=True, description="Prevent AI hallucinations")
    variations_count: int = Field(default=1, ge=1, le=3, description="Number of variations to generate")

    @field_validator('emphasize_skills')
    @classmethod
    def validate_skills(cls, v):
        if len(v) > 10:
            raise ValueError('Maximum 10 skills allowed')
        return [skill.strip() for skill in v if skill.strip()]


class CoverLetterEditRequest(BaseModel):
    """Request to edit cover letter"""
    cover_letter_id: str = Field(..., description="Cover letter ID to edit")
    section: str = Field(..., description="Section to edit (intro, body, closing)")
    content: Optional[str] = Field(None, max_length=2000, description="New content for section")
    regenerate: bool = Field(default=False, description="Regenerate this section with AI")
    instructions: Optional[str] = Field(None, max_length=500, description="Instructions for regeneration")


class CoverLetterExportRequest(BaseModel):
    """Request to export cover letter"""
    cover_letter_id: str = Field(..., description="Cover letter ID")
    format: str = Field(..., description="Export format (pdf, docx, txt, html)")

    @field_validator('format')
    @classmethod
    def validate_format(cls, v):
        valid_formats = ['pdf', 'docx', 'txt', 'html']
        if v.lower() not in valid_formats:
            raise ValueError(f'Format must be one of {valid_formats}')
        return v.lower()


class CoverLetterResponse(BaseModel):
    """Response with cover letter data"""
    id: str
    user_id: str
    resume_version_id: Optional[str]
    job_title: str
    company_name: str
    tone: str
    length: str
    content: str
    status: CoverLetterStatus
    token_usage: Optional[int] = None
    cost: Optional[float] = None
    quality_score: Optional[float] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class CoverLetterVariation(BaseModel):
    """Single variation of cover letter"""
    variation_number: int
    content: str
    emphasis: str  # What this variation emphasizes
    quality_score: Optional[float] = None


class BulkCoverLetterGenerationRequest(BaseModel):
    """Request to generate multiple cover letters"""
    resume_version_id: Optional[str] = None
    jobs: List[Dict[str, str]] = Field(..., min_length=1, max_length=10, description="List of jobs with title and company")
    tone: CoverLetterTone = Field(default=CoverLetterTone.PROFESSIONAL)
    length: CoverLetterLength = Field(default=CoverLetterLength.STANDARD)

    @field_validator('jobs')
    @classmethod
    def validate_jobs(cls, v):
        for job in v:
            if 'job_title' not in job or 'company_name' not in job:
                raise ValueError('Each job must have job_title and company_name')
        return v


class BulkCoverLetterResponse(BaseModel):
    """Response for bulk generation"""
    total_letters: int
    successful: int
    failed: int
    letters: List[CoverLetterResponse]
    total_cost: float
    total_tokens: int


class CoverLetterQualityAnalysis(BaseModel):
    """Quality analysis of cover letter"""
    cover_letter_id: str
    overall_score: float  # 0-100
    strengths: List[str]
    weaknesses: List[str]
    suggestions: List[str]
    tone_consistency: float  # 0-100
    relevance_score: float  # 0-100
    grammar_score: float  # 0-100
    impact_score: float  # 0-100


class CoverLetterComparison(BaseModel):
    """Comparison of cover letter variations"""
    variations: List[CoverLetterVariation]
    recommendation: int  # Which variation number is recommended
    differences: List[str]
    strengths_by_variation: Dict[int, List[str]]


class CoverLetterVersion(BaseModel):
    """Cover letter version metadata"""
    version_number: int
    content: str
    created_at: datetime
    changes_summary: str
    parameters: Dict[str, Any]


class CoverLetterTemplate(BaseModel):
    """Reusable cover letter template"""
    template_id: str
    template_name: str
    structure: Dict[str, str]  # intro, body, closing patterns
    tone: str
    industry: Optional[str] = None
    success_rate: Optional[float] = None  # % that led to interviews


class CoverLetterStats(BaseModel):
    """Statistics for user's cover letters"""
    total_generated: int
    total_cost: float
    total_tokens: int
    average_quality_score: float
    by_status: Dict[str, int]
    by_tone: Dict[str, int]
    recent_letters: List[CoverLetterResponse]


class CoverLetterFeedback(BaseModel):
    """User feedback on cover letter quality"""
    cover_letter_id: str
    rating: int = Field(..., ge=1, le=5, description="Rating 1-5")
    resulted_in_interview: Optional[bool] = None
    comments: Optional[str] = Field(None, max_length=1000)
    timestamp: datetime
