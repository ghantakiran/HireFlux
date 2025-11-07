"""Job Pydantic Schemas

Request/response models for job posting endpoints.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class JobStatus(str, Enum):
    """Job status enum"""

    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    CLOSED = "closed"


class LocationType(str, Enum):
    """Location type enum"""

    REMOTE = "remote"
    HYBRID = "hybrid"
    ONSITE = "onsite"


class EmploymentType(str, Enum):
    """Employment type enum"""

    FULL_TIME = "full_time"
    PART_TIME = "part_time"
    CONTRACT = "contract"
    INTERNSHIP = "internship"


class ExperienceLevel(str, Enum):
    """Experience level enum"""

    ENTRY = "entry"
    MID = "mid"
    SENIOR = "senior"
    LEAD = "lead"
    EXECUTIVE = "executive"


class JobCreate(BaseModel):
    """Schema for creating a new job"""

    title: str = Field(..., min_length=1, max_length=255, description="Job title")
    company_name: str = Field(
        ..., min_length=1, max_length=255, description="Company name display"
    )
    department: Optional[str] = Field(
        None, max_length=255, description="Department name"
    )
    location: str = Field(..., min_length=1, max_length=255, description="Job location")
    location_type: LocationType = Field(..., description="Remote/hybrid/onsite")
    employment_type: EmploymentType = Field(
        ..., description="Full-time/part-time/contract/internship"
    )

    # Experience
    experience_level: Optional[ExperienceLevel] = Field(
        None, description="Experience level required"
    )
    experience_min_years: Optional[int] = Field(
        None, ge=0, le=50, description="Minimum years of experience"
    )
    experience_max_years: Optional[int] = Field(
        None, ge=0, le=50, description="Maximum years of experience"
    )
    experience_requirement: Optional[str] = Field(
        None, max_length=100, description="Experience requirement text"
    )

    # Salary
    salary_min: Optional[int] = Field(None, ge=0, description="Minimum salary")
    salary_max: Optional[int] = Field(None, ge=0, description="Maximum salary")

    # Job details
    description: str = Field(..., min_length=10, description="Full job description")
    required_skills: List[str] = Field(
        default_factory=list, description="Required skills"
    )
    preferred_skills: List[str] = Field(
        default_factory=list, description="Preferred skills"
    )
    requirements: Optional[List[str]] = Field(
        default_factory=list, description="Job requirements"
    )
    responsibilities: Optional[List[str]] = Field(
        default_factory=list, description="Job responsibilities"
    )
    benefits: Optional[List[str]] = Field(
        default_factory=list, description="Company benefits"
    )

    # Additional
    requires_visa_sponsorship: bool = Field(
        default=False, description="Whether visa sponsorship is available"
    )
    external_url: Optional[str] = Field(
        None, max_length=500, description="External application URL"
    )
    expires_at: Optional[datetime] = Field(None, description="Job expiration date")

    @field_validator("salary_max")
    @classmethod
    def validate_salary_range(cls, v, info):
        """Ensure salary_max >= salary_min if both provided"""
        salary_min = info.data.get("salary_min")
        if salary_min is not None and v is not None:
            if v < salary_min:
                raise ValueError(
                    "salary_max must be greater than or equal to salary_min"
                )
        return v

    @field_validator("experience_max_years")
    @classmethod
    def validate_experience_range(cls, v, info):
        """Ensure experience_max >= experience_min if both provided"""
        experience_min = info.data.get("experience_min_years")
        if experience_min is not None and v is not None:
            if v < experience_min:
                raise ValueError(
                    "experience_max_years must be greater than or equal to experience_min_years"
                )
        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Senior Software Engineer",
                "company_name": "Tech Company Inc",
                "department": "Engineering",
                "location": "San Francisco, CA",
                "location_type": "hybrid",
                "employment_type": "full_time",
                "experience_level": "senior",
                "experience_min_years": 5,
                "experience_max_years": 10,
                "salary_min": 130000,
                "salary_max": 170000,
                "description": "We are seeking a talented Senior Software Engineer to join our team...",
                "required_skills": ["Python", "FastAPI", "PostgreSQL", "React"],
                "preferred_skills": ["AWS", "Docker", "Kubernetes"],
                "requirements": [
                    "5+ years of software development experience",
                    "Strong Python and JavaScript skills",
                ],
                "responsibilities": [
                    "Design and implement scalable backend services",
                    "Collaborate with cross-functional teams",
                ],
                "benefits": [
                    "Competitive salary",
                    "Health insurance",
                    "401(k) matching",
                ],
                "requires_visa_sponsorship": False,
            }
        }
    }


class JobUpdate(BaseModel):
    """Schema for updating an existing job (all fields optional)"""

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    department: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, min_length=1, max_length=255)
    location_type: Optional[LocationType] = None
    employment_type: Optional[EmploymentType] = None

    # Experience
    experience_level: Optional[ExperienceLevel] = None
    experience_min_years: Optional[int] = Field(None, ge=0, le=50)
    experience_max_years: Optional[int] = Field(None, ge=0, le=50)
    experience_requirement: Optional[str] = Field(None, max_length=100)

    # Salary
    salary_min: Optional[int] = Field(None, ge=0)
    salary_max: Optional[int] = Field(None, ge=0)

    # Job details
    description: Optional[str] = Field(None, min_length=10)
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    responsibilities: Optional[List[str]] = None
    benefits: Optional[List[str]] = None

    # Additional
    requires_visa_sponsorship: Optional[bool] = None
    external_url: Optional[str] = Field(None, max_length=500)
    expires_at: Optional[datetime] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Lead Software Engineer",
                "salary_min": 150000,
                "salary_max": 200000,
                "description": "Updated job description...",
            }
        }
    }


class JobResponse(BaseModel):
    """Schema for job response"""

    id: UUID
    company_id: Optional[UUID] = None

    # Basic info
    title: str
    company: str  # Company name string
    department: Optional[str] = None
    location: str
    location_type: str
    employment_type: str

    # Experience
    experience_level: Optional[str] = None
    experience_min_years: Optional[int] = None
    experience_max_years: Optional[int] = None
    experience_requirement: Optional[str] = None

    # Salary
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None

    # Job details
    description: Optional[str] = None
    required_skills: List[str] = []
    preferred_skills: List[str] = []

    # Metadata
    source: Optional[str] = None  # 'employer', 'greenhouse', 'lever', etc.
    external_id: Optional[str] = None
    external_url: Optional[str] = None
    requires_visa_sponsorship: bool = False

    # Status
    is_active: bool
    posted_date: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "company_id": "987fbc97-4bed-5078-9f07-9141ba07c9f3",
                "title": "Senior Software Engineer",
                "company": "Tech Company Inc",
                "location": "San Francisco, CA",
                "location_type": "hybrid",
                "employment_type": "full_time",
                "experience_level": "senior",
                "salary_min": 130000,
                "salary_max": 170000,
                "description": "We are seeking...",
                "required_skills": ["Python", "FastAPI", "PostgreSQL"],
                "source": "employer",
                "is_active": True,
                "posted_date": "2025-01-01T00:00:00Z",
                "created_at": "2025-01-01T00:00:00Z",
                "updated_at": "2025-01-01T00:00:00Z",
            }
        },
    }


class JobListResponse(BaseModel):
    """Schema for paginated job list response"""

    jobs: List[JobResponse]
    total: int
    page: int
    limit: int
    total_pages: int

    model_config = {
        "json_schema_extra": {
            "example": {
                "jobs": [],
                "total": 50,
                "page": 1,
                "limit": 10,
                "total_pages": 5,
            }
        }
    }


class JobStatusUpdate(BaseModel):
    """Schema for updating job status"""

    status: JobStatus

    model_config = {"json_schema_extra": {"example": {"status": "paused"}}}
