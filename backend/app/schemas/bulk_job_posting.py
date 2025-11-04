"""Pydantic schemas for bulk job posting (Sprint 11-12)"""
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
from enum import Enum


class BulkUploadStatusEnum(str, Enum):
    """Status of a bulk job upload session"""
    UPLOADED = "uploaded"
    VALIDATING = "validating"
    ENRICHING = "enriching"
    READY = "ready"
    PUBLISHING = "publishing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class DistributionStatusEnum(str, Enum):
    """Status of a job distribution to a specific channel"""
    PENDING = "pending"
    PUBLISHING = "publishing"
    PUBLISHED = "published"
    FAILED = "failed"
    RETRYING = "retrying"


class DistributionChannelEnum(str, Enum):
    """Job board distribution channels"""
    LINKEDIN = "linkedin"
    INDEED = "indeed"
    GLASSDOOR = "glassdoor"
    INTERNAL = "internal"


# CSV Job Data Schemas

class CSVJobRow(BaseModel):
    """Schema for a single job from CSV upload"""
    title: str = Field(..., min_length=1, max_length=255)
    department: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    location_type: Optional[str] = Field(None, max_length=50)  # remote/hybrid/onsite
    employment_type: Optional[str] = Field(None, max_length=50)  # full-time/part-time/contract
    experience_level: Optional[str] = Field(None, max_length=50)  # entry/mid/senior/lead
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    description: Optional[str] = None
    requirements: Optional[str] = None

    # Additional optional fields
    required_skills: Optional[List[str]] = Field(default_factory=list)
    preferred_skills: Optional[List[str]] = Field(default_factory=list)

    @field_validator('salary_min', 'salary_max')
    @classmethod
    def validate_salary(cls, v):
        if v is not None and v < 0:
            raise ValueError('Salary must be positive')
        return v


class EnrichedJobData(CSVJobRow):
    """Job data after AI enrichment"""
    normalized_title: Optional[str] = None  # AI-normalized title
    extracted_skills: Optional[List[str]] = Field(default_factory=list)  # AI-extracted skills
    suggested_salary_min: Optional[int] = None  # AI-suggested salary range
    suggested_salary_max: Optional[int] = None
    confidence_score: Optional[float] = Field(None, ge=0.0, le=1.0)  # AI confidence


class JobValidationError(BaseModel):
    """Validation error for a specific job"""
    row_index: int
    field: str
    error_message: str


class DuplicateInfo(BaseModel):
    """Information about duplicate jobs"""
    row_index: int
    duplicate_of: int  # Index of original job
    similarity_score: float = Field(..., ge=0.0, le=1.0)
    matching_fields: List[str]


# Bulk Upload Request/Response Schemas

class BulkUploadCreate(BaseModel):
    """Request schema for creating a bulk job upload"""
    filename: str = Field(..., min_length=1, max_length=255)
    jobs_data: List[CSVJobRow] = Field(..., min_items=1, max_items=500)
    distribution_channels: Optional[List[DistributionChannelEnum]] = Field(default_factory=lambda: [DistributionChannelEnum.INTERNAL])
    scheduled_publish_at: Optional[datetime] = None

    @field_validator('jobs_data')
    @classmethod
    def validate_job_count(cls, v):
        if len(v) > 500:
            raise ValueError('Maximum 500 jobs allowed per upload')
        if len(v) == 0:
            raise ValueError('At least 1 job required')
        return v


class BulkUploadResponse(BaseModel):
    """Response schema for bulk job upload"""
    id: str
    company_id: str
    filename: str
    total_jobs: int
    valid_jobs: int
    invalid_jobs: int
    duplicate_jobs: int
    status: BulkUploadStatusEnum
    validation_errors: Optional[List[JobValidationError]] = Field(default_factory=list)
    duplicate_info: Optional[List[DuplicateInfo]] = Field(default_factory=list)
    created_at: datetime

    class Config:
        from_attributes = True


class BulkUploadDetail(BulkUploadResponse):
    """Detailed bulk upload response with job data"""
    raw_jobs_data: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    enriched_jobs_data: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    enrichment_started_at: Optional[datetime] = None
    enrichment_completed_at: Optional[datetime] = None
    enrichment_cost: Optional[int] = None  # Cost in cents
    distribution_channels: Optional[List[DistributionChannelEnum]] = Field(default_factory=list)
    scheduled_publish_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None

    class Config:
        from_attributes = True


# AI Enrichment Schemas

class EnrichmentRequest(BaseModel):
    """Request schema for AI job enrichment"""
    upload_id: str


class EnrichmentResponse(BaseModel):
    """Response schema for AI job enrichment"""
    upload_id: str
    status: BulkUploadStatusEnum
    enriched_count: int
    enrichment_cost: int  # Cost in cents
    enrichment_started_at: datetime
    enrichment_completed_at: Optional[datetime] = None


# Job Distribution Schemas

class DistributionCreate(BaseModel):
    """Request schema for creating a job distribution"""
    job_id: str
    channel: DistributionChannelEnum
    scheduled_publish_at: Optional[datetime] = None


class BulkDistributionCreate(BaseModel):
    """Request schema for bulk job distribution"""
    upload_id: str
    channels: List[DistributionChannelEnum] = Field(..., min_items=1)
    scheduled_publish_at: Optional[datetime] = None


class DistributionResponse(BaseModel):
    """Response schema for job distribution"""
    id: str
    job_id: str
    company_id: str
    channel: DistributionChannelEnum
    status: DistributionStatusEnum
    external_post_id: Optional[str] = None
    external_post_url: Optional[str] = None
    views_count: int = 0
    applications_count: int = 0
    clicks_count: int = 0
    retry_count: int = 0
    max_retries: int = 3
    error_message: Optional[str] = None
    scheduled_publish_at: Optional[datetime] = None
    published_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DistributionMetrics(BaseModel):
    """Aggregated metrics for job distributions"""
    total_distributions: int
    by_channel: Dict[str, int]  # Channel -> count
    by_status: Dict[str, int]  # Status -> count
    total_views: int
    total_applications: int
    total_clicks: int


class DistributionDashboard(BaseModel):
    """Dashboard response for distribution tracking"""
    upload_id: str
    total_jobs: int
    distributions: List[DistributionResponse]
    metrics: DistributionMetrics

    class Config:
        from_attributes = True


# List and Filter Schemas

class BulkUploadListResponse(BaseModel):
    """Paginated list of bulk uploads"""
    uploads: List[BulkUploadResponse]
    total: int
    page: int
    limit: int


class DistributionListResponse(BaseModel):
    """Paginated list of distributions"""
    distributions: List[DistributionResponse]
    total: int
    page: int
    limit: int


class BulkUploadFilter(BaseModel):
    """Filter parameters for bulk uploads"""
    status: Optional[BulkUploadStatusEnum] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)


class DistributionFilter(BaseModel):
    """Filter parameters for distributions"""
    channel: Optional[DistributionChannelEnum] = None
    status: Optional[DistributionStatusEnum] = None
    upload_id: Optional[str] = None
    job_id: Optional[str] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)
