"""Onboarding schemas"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any
from enum import Enum


class ProficiencyLevel(str, Enum):
    """Skill proficiency levels"""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"
    EXPERT = "expert"


class SkillInput(BaseModel):
    """Schema for skill input"""

    name: str = Field(..., min_length=1, max_length=100, description="Skill name")
    proficiency: ProficiencyLevel = Field(..., description="Proficiency level")


class BasicProfileUpdate(BaseModel):
    """Schema for basic profile information (Step 1)"""

    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    location: Optional[str] = Field(None, max_length=255)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if v and not v.replace("+", "").replace("-", "").replace(" ", "").isdigit():
            raise ValueError(
                "Phone number must contain only digits, spaces, hyphens, and plus sign"
            )
        return v


class JobPreferencesUpdate(BaseModel):
    """Schema for job preferences (Step 2)"""

    target_titles: List[str] = Field(
        ..., min_items=1, max_items=10, description="Target job titles"
    )
    salary_min: Optional[int] = Field(None, ge=0, description="Minimum desired salary")
    salary_max: Optional[int] = Field(None, ge=0, description="Maximum desired salary")
    industries: List[str] = Field(
        default=[], max_items=10, description="Target industries"
    )

    @field_validator("salary_max")
    @classmethod
    def validate_salary_range(cls, v, info):
        if v and info.data.get("salary_min") and v < info.data["salary_min"]:
            raise ValueError("Maximum salary must be greater than minimum salary")
        return v

    @field_validator("target_titles")
    @classmethod
    def validate_target_titles(cls, v):
        if not v or len(v) == 0:
            raise ValueError("At least one target job title is required")
        # Remove duplicates and empty strings
        return list(set([title.strip() for title in v if title.strip()]))


class SkillsUpdate(BaseModel):
    """Schema for skills update (Step 3)"""

    skills: List[SkillInput] = Field(
        ..., min_items=1, max_items=50, description="User skills"
    )

    @field_validator("skills")
    @classmethod
    def validate_unique_skills(cls, v):
        skill_names = [skill.name.lower() for skill in v]
        if len(skill_names) != len(set(skill_names)):
            raise ValueError("Duplicate skills are not allowed")
        return v


class WorkPreferencesUpdate(BaseModel):
    """Schema for work preferences (Step 4)"""

    remote: bool = Field(default=False, description="Open to remote work")
    visa_friendly: bool = Field(default=False, description="Requires visa sponsorship")
    relocation: bool = Field(default=False, description="Open to relocation")
    contract: bool = Field(default=False, description="Open to contract work")
    part_time: bool = Field(default=False, description="Open to part-time work")


class OnboardingProgress(BaseModel):
    """Schema for onboarding progress response"""

    current_step: int = Field(
        ..., ge=1, le=4, description="Current onboarding step (1-4)"
    )
    onboarding_complete: bool = Field(..., description="Whether onboarding is complete")
    profile_completed: bool = Field(..., description="Step 1 completed")
    preferences_completed: bool = Field(..., description="Step 2 completed")
    skills_completed: bool = Field(..., description="Step 3 completed")
    work_preferences_completed: bool = Field(..., description="Step 4 completed")


class CompleteProfileResponse(BaseModel):
    """Schema for complete profile response"""

    id: str
    first_name: Optional[str]
    last_name: Optional[str]
    phone: Optional[str]
    location: Optional[str]
    target_titles: List[str]
    salary_min: Optional[int]
    salary_max: Optional[int]
    industries: List[str]
    skills: List[Dict[str, Any]]
    preferences: Dict[str, Any]
    onboarding_complete: bool

    class Config:
        from_attributes = True
