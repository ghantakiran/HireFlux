"""Job Template Pydantic Schemas

Request/response models for job template endpoints.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID
from enum import Enum

from pydantic import BaseModel, Field


class TemplateVisibility(str, Enum):
    """Template visibility enum"""

    PUBLIC = "public"  # Available to all companies
    PRIVATE = "private"  # Company-specific only


class TemplateCategory(str, Enum):
    """Template category enum for organizing templates"""

    ENGINEERING = "engineering"
    PRODUCT = "product"
    DESIGN = "design"
    SALES = "sales"
    MARKETING = "marketing"
    OPERATIONS = "operations"
    CUSTOMER_SUCCESS = "customer_success"
    HR = "hr"
    FINANCE = "finance"
    DATA = "data"
    OTHER = "other"


class JobTemplateBase(BaseModel):
    """Base schema for job template"""

    name: str = Field(..., min_length=1, max_length=255, description="Template name")
    category: TemplateCategory = Field(..., description="Template category")
    visibility: TemplateVisibility = Field(
        default=TemplateVisibility.PRIVATE, description="Public or private template"
    )

    # Job details (reusable template fields)
    title: str = Field(..., min_length=1, max_length=255, description="Job title")
    department: Optional[str] = Field(
        None, max_length=255, description="Department name"
    )
    employment_type: Optional[str] = Field(None, description="Employment type")
    experience_level: Optional[str] = Field(None, description="Experience level")

    # Content
    description: Optional[str] = Field(None, description="Job description")
    requirements: Optional[List[str]] = Field(
        default_factory=list, description="List of job requirements"
    )
    responsibilities: Optional[List[str]] = Field(
        default_factory=list, description="List of job responsibilities"
    )
    skills: Optional[List[str]] = Field(
        default_factory=list, description="Required/preferred skills"
    )


class JobTemplateCreate(JobTemplateBase):
    """Schema for creating a new job template"""

    pass


class JobTemplateUpdate(BaseModel):
    """Schema for updating a job template (all fields optional)"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    category: Optional[TemplateCategory] = None
    visibility: Optional[TemplateVisibility] = None

    title: Optional[str] = Field(None, min_length=1, max_length=255)
    department: Optional[str] = Field(None, max_length=255)
    employment_type: Optional[str] = None
    experience_level: Optional[str] = None

    description: Optional[str] = None
    requirements: Optional[List[str]] = None
    responsibilities: Optional[List[str]] = None
    skills: Optional[List[str]] = None


class JobTemplateResponse(JobTemplateBase):
    """Schema for job template response"""

    id: UUID
    company_id: Optional[UUID] = None  # None for public templates
    usage_count: int = Field(default=0, description="Number of times template used")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class JobTemplateListResponse(BaseModel):
    """Schema for listing job templates"""

    templates: List[JobTemplateResponse]
    total: int
    page: int = 1
    page_size: int = 50
