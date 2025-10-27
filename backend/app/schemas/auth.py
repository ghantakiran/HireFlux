"""
Authentication Schemas (US-002)
Pydantic models for request/response validation
"""

from pydantic import BaseModel, EmailStr, validator
from datetime import datetime
from typing import Optional, List
import json


class UserBase(BaseModel):
    name: str
    email: EmailStr


class UserCreate(UserBase):
    password: str
    terms_accepted: bool

    @validator("password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @validator("terms_accepted")
    def validate_terms(cls, v):
        if not v:
            raise ValueError("Terms and conditions must be accepted")
        return v


class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    target_job_titles: Optional[List[str]] = None
    target_salary_min: Optional[int] = None
    target_salary_max: Optional[int] = None
    remote_preference: Optional[str] = None
    visa_sponsorship_required: Optional[bool] = None
    marketing_emails_opt_in: Optional[bool] = None

    @validator("target_job_titles")
    def validate_job_titles(cls, v):
        if v is not None and len(v) > 10:
            raise ValueError("Maximum 10 job titles allowed")
        return v

    @validator("target_salary_min", "target_salary_max")
    def validate_salary(cls, v):
        if v is not None and v < 0:
            raise ValueError("Salary must be positive")
        return v

    @validator("remote_preference")
    def validate_remote_preference(cls, v):
        if v is not None and v not in ["remote", "hybrid", "onsite", "any"]:
            raise ValueError("Invalid remote preference")
        return v


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_verified: bool
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    target_job_titles: Optional[List[str]] = None
    target_salary_min: Optional[int] = None
    target_salary_max: Optional[int] = None
    remote_preference: Optional[str] = None
    visa_sponsorship_required: bool = False
    subscription_plan: str = "free"
    subscription_status: str = "active"
    credit_balance: int = 0
    monthly_cover_letter_limit: int = 3
    monthly_job_suggestions_limit: int = 10
    marketing_emails_opt_in: bool = False
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    user_id: Optional[int] = None


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordReset(BaseModel):
    token: str
    new_password: str

    @validator("new_password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class EmailVerificationRequest(BaseModel):
    email: EmailStr


class EmailVerification(BaseModel):
    token: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    user: UserResponse
    token: Token


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    terms_accepted: bool

    @validator("password")
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v

    @validator("terms_accepted")
    def validate_terms(cls, v):
        if not v:
            raise ValueError("Terms and conditions must be accepted")
        return v


class RegisterResponse(BaseModel):
    user: UserResponse
    token: Token


class UserProfile(BaseModel):
    """Extended user profile for dashboard"""

    id: int
    name: str
    email: str
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    target_job_titles: Optional[List[str]] = None
    target_salary_min: Optional[int] = None
    target_salary_max: Optional[int] = None
    remote_preference: Optional[str] = None
    visa_sponsorship_required: bool = False
    subscription_plan: str = "free"
    subscription_status: str = "active"
    credit_balance: int = 0
    monthly_cover_letter_limit: int = 3
    monthly_job_suggestions_limit: int = 10
    marketing_emails_opt_in: bool = False
    created_at: datetime
    updated_at: datetime
    last_login_at: Optional[datetime] = None

    # Computed properties
    is_plus_subscriber: bool = False
    is_pro_subscriber: bool = False
    can_generate_cover_letter: bool = True
    can_get_job_suggestions: bool = True

    class Config:
        from_attributes = True


class UserStats(BaseModel):
    """User statistics for dashboard"""

    total_resumes: int = 0
    total_cover_letters: int = 0
    total_applications: int = 0
    applications_this_month: int = 0
    interviews_scheduled: int = 0
    offers_received: int = 0
    jobs_saved: int = 0
    jobs_applied: int = 0
    average_fit_index: Optional[float] = None
    response_rate: Optional[float] = None

    class Config:
        from_attributes = True
