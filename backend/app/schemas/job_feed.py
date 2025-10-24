"""Schemas for job feed integration"""
from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class JobSource(str, Enum):
    """Job source types"""
    GREENHOUSE = "greenhouse"
    LEVER = "lever"
    MANUAL = "manual"
    USER_REFERRAL = "user_referral"


class JobSourceStatus(str, Enum):
    """Job source status"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"


class LocationType(str, Enum):
    """Work location types"""
    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"


class JobSourceConfig(BaseModel):
    """Job source configuration"""
    id: Optional[str] = None
    source_type: JobSource
    name: str = Field(..., max_length=100)
    api_key: str
    company_id: Optional[str] = None
    base_url: Optional[str] = None
    active: bool = True
    status: JobSourceStatus = JobSourceStatus.INACTIVE
    last_sync_at: Optional[datetime] = None
    last_error: Optional[str] = None
    rate_limit_per_minute: int = Field(default=60, ge=1, le=1000)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class RawJobData(BaseModel):
    """Raw job data from external API"""
    source: JobSource
    external_id: str
    raw_data: Dict[str, Any]
    fetched_at: datetime


class JobSkillExtraction(BaseModel):
    """Extracted skill from job description"""
    skill: str
    required: bool
    years_required: Optional[int] = None
    proficiency_level: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)


class SalaryRange(BaseModel):
    """Salary range"""
    min_salary: Optional[int] = Field(None, ge=0)
    max_salary: Optional[int] = Field(None, ge=0)
    currency: str = Field(default="USD")
    period: str = Field(default="yearly")  # yearly, hourly


class NormalizedJob(BaseModel):
    """Normalized job data"""
    external_id: str
    source: JobSource
    title: str = Field(..., min_length=1, max_length=255)
    company: str = Field(..., min_length=1, max_length=255)
    location: str
    location_type: LocationType
    description: str = Field(..., min_length=100)

    # Skills
    required_skills: List[str] = []
    preferred_skills: List[str] = []

    # Experience
    experience_requirement: Optional[str] = None
    experience_min_years: Optional[int] = None
    experience_max_years: Optional[int] = None
    experience_level: Optional[str] = None  # entry, mid, senior, staff, principal

    # Salary
    salary: Optional[SalaryRange] = None

    # Additional info
    department: Optional[str] = None
    employment_type: Optional[str] = None  # full-time, part-time, contract
    requires_visa_sponsorship: Optional[bool] = None
    application_url: str
    posted_date: Optional[datetime] = None

    # Metadata
    raw_metadata: Dict[str, Any] = {}


class JobIngestionRequest(BaseModel):
    """Request to ingest jobs from source"""
    source_id: str
    incremental: bool = Field(default=True, description="Only fetch updated jobs")
    max_jobs: Optional[int] = Field(None, ge=1, le=1000)
    department_filter: Optional[List[str]] = None


class JobIngestionResult(BaseModel):
    """Result of job ingestion"""
    source: JobSource
    total_fetched: int
    jobs_created: int
    jobs_updated: int
    jobs_skipped: int
    errors: int
    processing_time_seconds: float
    error_messages: List[str] = []
    last_job_id: Optional[str] = None


class DuplicateJobMatch(BaseModel):
    """Duplicate job detection result"""
    job_id: str
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    matching_fields: List[str]
    is_duplicate: bool


class JobEnrichment(BaseModel):
    """Job enrichment data"""
    company_size: Optional[str] = None  # "1-10", "11-50", etc.
    company_industry: Optional[str] = None
    company_founded_year: Optional[int] = None
    company_funding_stage: Optional[str] = None
    freshness_score: int = Field(..., ge=0, le=100)
    quality_score: float = Field(..., ge=0.0, le=1.0)


class JobSyncConfig(BaseModel):
    """Job sync configuration"""
    enabled: bool = True
    sync_frequency_hours: int = Field(default=24, ge=1, le=168)
    incremental_sync: bool = True
    stale_job_days: int = Field(default=60, ge=1, le=365)
    batch_size: int = Field(default=50, ge=1, le=100)


class GreenhouseJob(BaseModel):
    """Greenhouse API job format"""
    id: int
    name: str
    updated_at: datetime
    location: Dict[str, Any]
    absolute_url: str
    internal_job_id: int
    metadata: Optional[List[Dict[str, Any]]] = None
    departments: List[Dict[str, Any]] = []
    offices: List[Dict[str, Any]] = []
    content: Optional[str] = None
    education: Optional[str] = None


class LeverJob(BaseModel):
    """Lever API job format"""
    id: str
    text: str
    createdAt: int  # Unix timestamp
    state: str
    categories: Dict[str, Optional[str]]
    description: str
    lists: List[Dict[str, Any]]
    additional: Optional[str] = None
    hostedUrl: str
    applyUrl: str


class JobSourceHealthCheck(BaseModel):
    """Health check result for job source"""
    source_id: str
    source_type: JobSource
    is_healthy: bool
    response_time_ms: int
    last_successful_sync: Optional[datetime]
    error_rate: float = Field(..., ge=0.0, le=1.0)
    total_active_jobs: int
    issues: List[str] = []


class JobFeedAnalytics(BaseModel):
    """Analytics for job feed sources"""
    source: JobSource
    time_period_days: int
    total_jobs_fetched: int
    active_jobs: int
    avg_application_rate: float
    avg_job_quality_score: float
    api_success_rate: float
    avg_response_time_ms: int
    top_companies: List[Dict[str, int]]  # company name -> job count
    top_locations: List[Dict[str, int]]


class ManualJobSubmission(BaseModel):
    """Manual job submission by admin or user"""
    job_url: HttpUrl
    notes: Optional[str] = Field(None, max_length=500)
    submitted_by: str  # user_id or "admin"
    submission_type: str = Field(default="referral")  # "manual", "referral"


class JobParsingResult(BaseModel):
    """Result of parsing job from URL"""
    success: bool
    job_data: Optional[NormalizedJob] = None
    error: Optional[str] = None
    confidence: float = Field(..., ge=0.0, le=1.0)


class JobQualityCheck(BaseModel):
    """Job data quality validation"""
    job_id: str
    is_valid: bool
    quality_score: float = Field(..., ge=0.0, le=1.0)
    issues: List[str] = []
    warnings: List[str] = []
    flagged: bool = False
    flag_reason: Optional[str] = None


class BatchJobIngestion(BaseModel):
    """Batch job ingestion status"""
    batch_id: str
    source: JobSource
    total_jobs: int
    processed: int
    success: int
    failed: int
    status: str  # "pending", "processing", "completed", "failed"
    started_at: datetime
    completed_at: Optional[datetime] = None
    errors: List[Dict[str, str]] = []
