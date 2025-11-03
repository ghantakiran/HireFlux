"""
Pydantic Schemas for Candidate Profiles

Request/Response schemas for candidate discovery and search features.
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID


# ===========================================================================
# Portfolio Item Schemas
# ===========================================================================

class PortfolioItemBase(BaseModel):
    """Base schema for portfolio items"""
    type: str = Field(..., description="Type: github, website, article, project")
    title: str = Field(..., max_length=200, description="Portfolio item title")
    description: Optional[str] = Field(None, max_length=500, description="Brief description")
    url: str = Field(..., max_length=500, description="URL to portfolio item")
    thumbnail: Optional[str] = Field(None, max_length=500, description="Thumbnail image URL")

    @validator('type')
    def validate_type(cls, v):
        valid_types = ['github', 'website', 'article', 'project']
        if v not in valid_types:
            raise ValueError(f"Type must be one of {valid_types}")
        return v


class PortfolioItemCreate(PortfolioItemBase):
    """Schema for creating a portfolio item"""
    pass


class PortfolioItem(PortfolioItemBase):
    """Schema for portfolio item response"""
    pass

    class Config:
        from_attributes = True


# ===========================================================================
# Candidate Profile Schemas
# ===========================================================================

class CandidateProfileBase(BaseModel):
    """Base schema for candidate profile"""
    headline: Optional[str] = Field(None, max_length=255, description="Professional headline")
    bio: Optional[str] = Field(None, description="Professional bio")
    location: Optional[str] = Field(None, max_length=255, description="Location")
    profile_picture_url: Optional[str] = Field(None, max_length=500, description="Profile picture URL")

    # Skills & experience
    skills: Optional[List[str]] = Field(None, description="List of skills")
    years_experience: Optional[int] = Field(None, ge=0, le=50, description="Years of experience")
    experience_level: Optional[str] = Field(None, description="Experience level")

    # Preferences
    preferred_roles: Optional[List[str]] = Field(None, description="Preferred job roles")
    preferred_location_type: Optional[str] = Field(None, description="Remote/hybrid/onsite preference")
    open_to_remote: Optional[bool] = Field(False, description="Open to remote work")
    open_to_work: Optional[bool] = Field(False, description="Actively looking for work")

    # Salary expectations
    expected_salary_min: Optional[Decimal] = Field(None, description="Minimum expected salary")
    expected_salary_max: Optional[Decimal] = Field(None, description="Maximum expected salary")
    expected_salary_currency: Optional[str] = Field("USD", max_length=3, description="Currency code")

    # Resume
    resume_summary: Optional[str] = Field(None, description="Brief resume summary")
    latest_resume_url: Optional[str] = Field(None, max_length=500, description="URL to latest resume")

    # Visibility
    visibility: str = Field("private", description="Profile visibility: public or private")

    @validator('experience_level')
    def validate_experience_level(cls, v):
        if v is None:
            return v
        valid_levels = ['entry', 'mid', 'senior', 'lead', 'executive']
        if v not in valid_levels:
            raise ValueError(f"Experience level must be one of {valid_levels}")
        return v

    @validator('preferred_location_type')
    def validate_location_type(cls, v):
        if v is None:
            return v
        valid_types = ['remote', 'hybrid', 'onsite', 'any']
        if v not in valid_types:
            raise ValueError(f"Location type must be one of {valid_types}")
        return v

    @validator('visibility')
    def validate_visibility(cls, v):
        if v not in ['public', 'private']:
            raise ValueError("Visibility must be 'public' or 'private'")
        return v

    @validator('skills')
    def validate_skills(cls, v):
        if v is not None and len(v) > 50:
            raise ValueError("Maximum 50 skills allowed")
        return v

    @validator('preferred_roles')
    def validate_preferred_roles(cls, v):
        if v is not None and len(v) > 20:
            raise ValueError("Maximum 20 preferred roles allowed")
        return v


class CandidateProfileCreate(CandidateProfileBase):
    """Schema for creating a candidate profile"""
    availability_status: Optional[str] = Field("not_looking", description="Availability status")
    availability_start_date: Optional[date] = Field(None, description="When candidate is available")

    @validator('availability_status')
    def validate_availability_status(cls, v):
        valid_statuses = ['actively_looking', 'open_to_offers', 'not_looking']
        if v not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")
        return v


class CandidateProfileUpdate(BaseModel):
    """Schema for updating a candidate profile (all fields optional)"""
    headline: Optional[str] = Field(None, max_length=255)
    bio: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    profile_picture_url: Optional[str] = Field(None, max_length=500)

    skills: Optional[List[str]] = None
    years_experience: Optional[int] = Field(None, ge=0, le=50)
    experience_level: Optional[str] = None

    preferred_roles: Optional[List[str]] = None
    preferred_location_type: Optional[str] = None
    open_to_remote: Optional[bool] = None
    open_to_work: Optional[bool] = None

    expected_salary_min: Optional[Decimal] = None
    expected_salary_max: Optional[Decimal] = None
    expected_salary_currency: Optional[str] = Field(None, max_length=3)

    resume_summary: Optional[str] = None
    latest_resume_url: Optional[str] = Field(None, max_length=500)

    @validator('experience_level')
    def validate_experience_level(cls, v):
        if v is None:
            return v
        valid_levels = ['entry', 'mid', 'senior', 'lead', 'executive']
        if v not in valid_levels:
            raise ValueError(f"Experience level must be one of {valid_levels}")
        return v


class CandidateProfile(CandidateProfileBase):
    """Schema for candidate profile response"""
    id: UUID
    user_id: UUID

    # Availability
    availability_status: str
    availability_start_date: Optional[date]
    availability_updated_at: Optional[datetime]

    # Portfolio
    portfolio: List[dict] = []

    # Analytics
    profile_views: int = 0
    invites_received: int = 0

    # Timestamps
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CandidateProfilePublic(BaseModel):
    """Public-facing candidate profile (limited fields for privacy)"""
    id: UUID
    headline: Optional[str]
    bio: Optional[str]
    location: Optional[str]
    profile_picture_url: Optional[str]

    skills: Optional[List[str]]
    years_experience: Optional[int]
    experience_level: Optional[str]

    preferred_roles: Optional[List[str]]
    preferred_location_type: Optional[str]
    open_to_remote: bool

    expected_salary_min: Optional[Decimal]
    expected_salary_max: Optional[Decimal]
    expected_salary_currency: str

    availability_status: str
    portfolio: List[dict]

    class Config:
        from_attributes = True


# ===========================================================================
# Availability Schemas
# ===========================================================================

class AvailabilityUpdate(BaseModel):
    """Schema for updating availability"""
    availability_status: str = Field(..., description="Availability status")
    availability_start_date: Optional[date] = Field(None, description="When candidate is available")

    @validator('availability_status')
    def validate_status(cls, v):
        valid_statuses = ['actively_looking', 'open_to_offers', 'not_looking']
        if v not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")
        return v


# ===========================================================================
# Candidate View Schemas
# ===========================================================================

class CandidateViewCreate(BaseModel):
    """Schema for tracking a profile view"""
    company_id: UUID
    viewer_id: UUID
    candidate_id: UUID
    source: Optional[str] = Field(None, max_length=50, description="View source")
    context_job_id: Optional[UUID] = Field(None, description="Job context if applicable")

    @validator('source')
    def validate_source(cls, v):
        if v is None:
            return v
        valid_sources = ['search', 'application', 'referral', 'invite']
        if v not in valid_sources:
            raise ValueError(f"Source must be one of {valid_sources}")
        return v


class CandidateView(BaseModel):
    """Schema for candidate view response"""
    id: UUID
    company_id: UUID
    viewer_id: UUID
    candidate_id: UUID
    candidate_profile_id: UUID
    source: Optional[str]
    context_job_id: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True


# ===========================================================================
# Search Schemas
# ===========================================================================

class CandidateSearchFilters(BaseModel):
    """Schema for candidate search filters"""
    skills: Optional[List[str]] = Field(None, description="Required skills")
    experience_level: Optional[List[str]] = Field(None, description="Experience levels")
    min_years_experience: Optional[int] = Field(None, ge=0, description="Minimum years")
    max_years_experience: Optional[int] = Field(None, le=50, description="Maximum years")

    location: Optional[str] = Field(None, description="Location filter")
    remote_only: Optional[bool] = Field(None, description="Remote positions only")
    location_type: Optional[str] = Field(None, description="Remote/hybrid/onsite")

    min_salary: Optional[Decimal] = Field(None, description="Minimum salary")
    max_salary: Optional[Decimal] = Field(None, description="Maximum salary")

    availability_status: Optional[List[str]] = Field(None, description="Availability statuses")
    preferred_roles: Optional[List[str]] = Field(None, description="Preferred roles")

    # Pagination
    page: int = Field(1, ge=1, description="Page number")
    limit: int = Field(20, ge=1, le=100, description="Results per page")

    @validator('location_type')
    def validate_location_type(cls, v):
        if v is None:
            return v
        valid_types = ['remote', 'hybrid', 'onsite', 'any']
        if v not in valid_types:
            raise ValueError(f"Location type must be one of {valid_types}")
        return v


class CandidateSearchResult(BaseModel):
    """Schema for search results"""
    profiles: List[CandidateProfilePublic]
    total: int
    page: int
    limit: int
    total_pages: int

    class Config:
        from_attributes = True
