"""Schemas for job matching and vector search"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class MatchQuality(str, Enum):
    """Match quality labels"""
    EXCELLENT = "excellent"  # 90-100
    GOOD = "good"  # 70-89
    PARTIAL = "partial"  # 40-69
    LOW = "low"  # 0-39


class LocationType(str, Enum):
    """Location types"""
    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"


class ExperienceLevel(str, Enum):
    """Experience levels"""
    ENTRY = "entry"  # 0-2 years
    MID = "mid"  # 3-5 years
    SENIOR = "senior"  # 6-10 years
    STAFF = "staff"  # 10+ years
    PRINCIPAL = "principal"  # 15+ years


class SkillMatch(BaseModel):
    """Individual skill match details"""
    skill: str
    user_has: bool
    user_years: Optional[int] = None
    required_level: Optional[str] = None
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    is_transferable: bool = False


class SkillVector(BaseModel):
    """Skill with embedding vector"""
    skill: str
    category: Optional[str] = None  # "language", "framework", "tool", "soft_skill"
    years_experience: Optional[int] = None
    proficiency: Optional[str] = None  # "beginner", "intermediate", "advanced", "expert"
    vector: Optional[List[float]] = None  # 1536 dimensions


class JobSearchFilters(BaseModel):
    """Job search filters"""
    min_fit_index: Optional[int] = Field(None, ge=0, le=100)
    max_fit_index: Optional[int] = Field(None, ge=0, le=100)
    locations: Optional[List[str]] = None
    location_types: Optional[List[LocationType]] = None
    min_salary: Optional[int] = None
    max_salary: Optional[int] = None
    visa_sponsorship: Optional[bool] = None
    experience_levels: Optional[List[ExperienceLevel]] = None
    industries: Optional[List[str]] = None
    company_sizes: Optional[List[str]] = None  # "1-10", "11-50", "51-200", etc.
    exclude_companies: Optional[List[str]] = None
    keywords: Optional[List[str]] = None
    posted_within_days: Optional[int] = None


class JobMatchRequest(BaseModel):
    """Request for job matching"""
    user_id: Optional[str] = None  # If not provided, use current user
    resume_id: Optional[str] = None  # Specific resume version
    filters: Optional[JobSearchFilters] = None
    limit: int = Field(default=10, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


class JobMatchRationale(BaseModel):
    """Explanation for job match score"""
    summary: str
    matching_skills: List[str]
    skill_gaps: List[str]
    transferable_skills: List[str] = []
    experience_match: str  # "perfect", "appropriate", "stretch", "under-qualified"
    experience_details: str
    recommendations: List[str] = []


class FitIndexBreakdown(BaseModel):
    """Detailed breakdown of Fit Index calculation"""
    skill_match_score: int = Field(..., ge=0, le=60, description="Max 60 points")
    experience_score: int = Field(..., ge=0, le=20, description="Max 20 points")
    seniority_score: int = Field(..., ge=0, le=10, description="Max 10 points")
    semantic_similarity: int = Field(..., ge=0, le=10, description="Max 10 points")
    total: int = Field(..., ge=0, le=100, description="Total Fit Index")


class JobMatchResponse(BaseModel):
    """Job match result"""
    job_id: str
    job_title: str
    company: str
    location: str
    location_type: LocationType
    salary_range: Optional[str] = None
    fit_index: int = Field(..., ge=0, le=100)
    match_quality: MatchQuality
    rationale: JobMatchRationale
    breakdown: FitIndexBreakdown
    skill_matches: List[SkillMatch]
    posted_date: datetime
    source: str  # "greenhouse", "lever", "manual", etc.
    job_url: Optional[str] = None
    requires_visa_sponsorship: bool
    is_active: bool = True


class TopMatchesResponse(BaseModel):
    """Top job matches response"""
    total_count: int
    matches: List[JobMatchResponse]
    filters_applied: Optional[JobSearchFilters] = None
    generated_at: datetime


class SkillGapAnalysis(BaseModel):
    """Analysis of skill gaps across viewed jobs"""
    most_required_skills: List[Dict[str, Any]]  # skill name, frequency, avg_importance
    missing_skills: List[Dict[str, Any]]  # skill name, frequency, related_skills
    transferable_skills: List[Dict[str, Any]]  # user skill, transferable to
    learning_recommendations: List[str]
    time_to_acquire: Dict[str, int]  # skill -> estimated weeks


class EmbeddingRequest(BaseModel):
    """Request to generate embeddings"""
    text: str = Field(..., min_length=1, max_length=10000)
    type: str = Field(..., description="Type: 'skill', 'job', 'resume'")
    metadata: Optional[Dict[str, Any]] = None


class EmbeddingResponse(BaseModel):
    """Embedding generation response"""
    vector: List[float] = Field(..., min_items=1536, max_items=1536)
    model: str
    token_count: int
    cached: bool = False


class VectorSearchRequest(BaseModel):
    """Request for vector similarity search"""
    query_vector: List[float] = Field(..., min_items=1536, max_items=1536)
    top_k: int = Field(default=10, ge=1, le=100)
    filter_metadata: Optional[Dict[str, Any]] = None
    namespace: str = Field(default="default")


class VectorSearchResult(BaseModel):
    """Single vector search result"""
    id: str
    score: float = Field(..., ge=0.0, le=1.0)
    metadata: Dict[str, Any]


class VectorSearchResponse(BaseModel):
    """Vector search results"""
    matches: List[VectorSearchResult]
    query_time_ms: int


class UserSkillProfile(BaseModel):
    """User's skill profile for matching"""
    user_id: str
    resume_id: Optional[str] = None
    skills: List[SkillVector]
    experience_years: int
    experience_level: ExperienceLevel
    job_titles: List[str]
    industries: List[str] = []
    last_updated: datetime


class JobProfile(BaseModel):
    """Job profile for matching"""
    job_id: str
    title: str
    company: str
    description: str
    required_skills: List[SkillVector]
    preferred_skills: List[SkillVector] = []
    experience_range: Optional[str] = None  # "3-5 years"
    experience_level: Optional[ExperienceLevel] = None
    indexed_at: datetime


class MatchAnalytics(BaseModel):
    """Analytics for job matching"""
    user_id: str
    period_days: int
    total_matches_viewed: int
    avg_fit_index: float
    high_quality_matches: int  # Fit Index >= 80
    applications_submitted: int
    skill_improvement_impact: Optional[float] = None  # Change in avg fit index
    most_viewed_skills: List[str]
    generated_at: datetime


class SimilarJobsRequest(BaseModel):
    """Request for similar jobs"""
    job_id: str
    limit: int = Field(default=5, ge=1, le=20)
    exclude_same_company: bool = False


class CompanyPreferences(BaseModel):
    """User's company preferences"""
    preferred_sizes: List[str] = []  # "1-10", "11-50", etc.
    preferred_industries: List[str] = []
    excluded_companies: List[str] = []
    remote_preference: Optional[LocationType] = None


class JobAlertSettings(BaseModel):
    """Job alert settings"""
    enabled: bool = True
    min_fit_index: int = Field(default=70, ge=0, le=100)
    frequency: str = Field(default="weekly")  # "daily", "weekly"
    max_alerts_per_email: int = Field(default=5, ge=1, le=20)
    filters: Optional[JobSearchFilters] = None


class BatchEmbeddingRequest(BaseModel):
    """Request to batch process embeddings"""
    items: List[Dict[str, Any]] = Field(..., max_items=100)
    type: str = Field(..., description="Type: 'skill', 'job', 'resume'")


class BatchEmbeddingResponse(BaseModel):
    """Batch embedding response"""
    results: List[EmbeddingResponse]
    success_count: int
    failed_count: int
    errors: List[str] = []
