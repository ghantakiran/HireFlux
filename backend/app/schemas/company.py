"""Pydantic schemas for company/employer domain

Schemas for request/response validation in employer APIs.
"""
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


# ============================================================================
# Company Schemas
# ============================================================================

class CompanyBase(BaseModel):
    """Base company schema with common fields"""
    name: str = Field(..., min_length=2, max_length=255, description="Company name")
    industry: Optional[str] = Field(None, max_length=100, description="Industry sector")
    size: Optional[str] = Field(None, description="Company size range")
    location: Optional[str] = Field(None, max_length=255, description="Company location")
    website: Optional[str] = Field(None, max_length=255, description="Company website URL")
    description: Optional[str] = Field(None, description="Company description")

    @field_validator('size')
    @classmethod
    def validate_size(cls, v: Optional[str]) -> Optional[str]:
        """Validate company size is in allowed values"""
        if v is None:
            return v
        valid_sizes = ["1-10", "11-50", "51-200", "201-500", "501+"]
        if v not in valid_sizes:
            raise ValueError(f"Size must be one of: {', '.join(valid_sizes)}")
        return v

    @field_validator('website')
    @classmethod
    def validate_website(cls, v: Optional[str]) -> Optional[str]:
        """Validate website URL format"""
        if v is None:
            return v
        if not v.startswith(('http://', 'https://')):
            return f"https://{v}"
        return v


class CompanyCreate(CompanyBase):
    """Schema for creating a new company with founder account"""
    email: EmailStr = Field(..., description="Founder's email address")
    password: str = Field(..., min_length=8, max_length=100, description="Founder's password")

    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class CompanyUpdate(BaseModel):
    """Schema for updating company details"""
    name: Optional[str] = Field(None, min_length=2, max_length=255)
    industry: Optional[str] = Field(None, max_length=100)
    size: Optional[str] = None
    location: Optional[str] = Field(None, max_length=255)
    website: Optional[str] = Field(None, max_length=255)
    logo_url: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = None

    @field_validator('size')
    @classmethod
    def validate_size(cls, v: Optional[str]) -> Optional[str]:
        """Validate company size is in allowed values"""
        if v is None:
            return v
        valid_sizes = ["1-10", "11-50", "51-200", "201-500", "501+"]
        if v not in valid_sizes:
            raise ValueError(f"Size must be one of: {', '.join(valid_sizes)}")
        return v


class CompanyResponse(CompanyBase):
    """Schema for company response"""
    id: UUID
    domain: Optional[str]
    logo_url: Optional[str]
    subscription_tier: str
    subscription_status: str
    trial_ends_at: Optional[datetime]
    max_active_jobs: int
    max_candidate_views: int
    max_team_members: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CompanyWithMembers(CompanyResponse):
    """Company response with member count"""
    member_count: int


# ============================================================================
# Company Member Schemas
# ============================================================================

class CompanyMemberBase(BaseModel):
    """Base company member schema"""
    role: str = Field(..., description="Member role")

    @field_validator('role')
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Validate role is in allowed values"""
        valid_roles = ["owner", "admin", "hiring_manager", "recruiter", "interviewer", "viewer"]
        if v not in valid_roles:
            raise ValueError(f"Role must be one of: {', '.join(valid_roles)}")
        return v


class CompanyMemberCreate(CompanyMemberBase):
    """Schema for inviting a new team member"""
    email: EmailStr = Field(..., description="Email of user to invite")
    permissions: Optional[dict] = Field(None, description="Custom permissions")


class CompanyMemberUpdate(BaseModel):
    """Schema for updating team member"""
    role: Optional[str] = None
    permissions: Optional[dict] = None
    status: Optional[str] = None

    @field_validator('role')
    @classmethod
    def validate_role(cls, v: Optional[str]) -> Optional[str]:
        """Validate role is in allowed values"""
        if v is None:
            return v
        valid_roles = ["owner", "admin", "hiring_manager", "recruiter", "interviewer", "viewer"]
        if v not in valid_roles:
            raise ValueError(f"Role must be one of: {', '.join(valid_roles)}")
        return v

    @field_validator('status')
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        """Validate status is in allowed values"""
        if v is None:
            return v
        valid_statuses = ["active", "invited", "suspended"]
        if v not in valid_statuses:
            raise ValueError(f"Status must be one of: {', '.join(valid_statuses)}")
        return v


class CompanyMemberResponse(CompanyMemberBase):
    """Schema for company member response"""
    id: UUID
    company_id: UUID
    user_id: UUID
    permissions: Optional[dict]
    status: str
    invited_at: Optional[datetime]
    joined_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class CompanyMemberWithUser(CompanyMemberResponse):
    """Company member response with user details"""
    user_email: str
    user_name: Optional[str]


# ============================================================================
# Company Subscription Schemas
# ============================================================================

class CompanySubscriptionResponse(BaseModel):
    """Schema for company subscription response"""
    id: UUID
    company_id: UUID
    plan_tier: str
    plan_interval: Optional[str]
    plan_amount: Optional[float]
    status: str
    current_period_start: Optional[datetime]
    current_period_end: Optional[datetime]
    cancel_at_period_end: bool
    jobs_posted_this_month: int
    candidate_views_this_month: int
    created_at: datetime

    class Config:
        from_attributes = True


class SubscriptionUpgrade(BaseModel):
    """Schema for upgrading subscription"""
    plan_tier: str = Field(..., description="Target plan tier")
    plan_interval: str = Field("month", description="Billing interval")

    @field_validator('plan_tier')
    @classmethod
    def validate_plan_tier(cls, v: str) -> str:
        """Validate plan tier is in allowed values"""
        valid_tiers = ["starter", "growth", "professional", "enterprise"]
        if v not in valid_tiers:
            raise ValueError(f"Plan tier must be one of: {', '.join(valid_tiers)}")
        return v

    @field_validator('plan_interval')
    @classmethod
    def validate_plan_interval(cls, v: str) -> str:
        """Validate billing interval"""
        valid_intervals = ["month", "year"]
        if v not in valid_intervals:
            raise ValueError(f"Interval must be one of: {', '.join(valid_intervals)}")
        return v


# ============================================================================
# Registration Response Schemas
# ============================================================================

class EmployerRegistrationResponse(BaseModel):
    """Response after successful employer registration"""
    company: CompanyResponse
    user_id: UUID
    access_token: str
    token_type: str = "bearer"
    message: str = "Company registered successfully. Welcome to HireFlux!"

    class Config:
        from_attributes = True


# ============================================================================
# Dashboard Schemas
# ============================================================================

class DashboardStats(BaseModel):
    """Dashboard statistics for employer"""
    active_jobs: int = 0
    total_applications: int = 0
    new_applications: int = 0  # Last 7 days
    interviews_scheduled: int = 0
    avg_time_to_hire: Optional[float] = None  # Days
    top_performing_job_id: Optional[UUID] = None
    top_performing_job_title: Optional[str] = None


class RecentActivity(BaseModel):
    """Recent activity item"""
    id: UUID
    type: str  # "application", "interview", "hire", "job_posted"
    title: str
    description: str
    timestamp: datetime
    user_name: Optional[str] = None


class DashboardResponse(BaseModel):
    """Complete dashboard response"""
    company: CompanyResponse
    stats: DashboardStats
    recent_activities: List[RecentActivity] = []
    subscription: CompanySubscriptionResponse
