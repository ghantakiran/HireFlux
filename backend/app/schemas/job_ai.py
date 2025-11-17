"""Job AI Assistance Schemas

Request/response models for AI-powered job description generation endpoints.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator

from app.schemas.job import EmploymentType, ExperienceLevel


class JobAIGenerationRequest(BaseModel):
    """Request schema for AI job description generation"""

    title: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Job title (e.g., 'Senior Software Engineer')",
    )
    key_points: List[str] = Field(
        ...,
        min_length=3,
        max_length=10,
        description="3-10 key points about the role",
    )
    experience_level: Optional[ExperienceLevel] = Field(
        None, description="Experience level (entry/mid/senior/lead/executive)"
    )
    location: Optional[str] = Field(None, max_length=255, description="Job location")
    employment_type: Optional[EmploymentType] = Field(
        None, description="Employment type (full_time/part_time/contract/internship)"
    )
    department: Optional[str] = Field(None, max_length=255, description="Department")

    @field_validator("key_points")
    @classmethod
    def validate_key_points(cls, v):
        """Ensure each key point is non-empty and reasonable length"""
        if not v:
            raise ValueError("At least 3 key points are required")

        for i, point in enumerate(v):
            if not point or point.strip() == "":
                raise ValueError(f"Key point {i+1} cannot be empty")
            if len(point) > 200:
                raise ValueError(f"Key point {i+1} is too long (max 200 characters)")

        return v

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Senior Software Engineer",
                "key_points": [
                    "Build scalable backend systems with Python and FastAPI",
                    "Lead technical design decisions and architecture reviews",
                    "Mentor junior engineers and conduct code reviews",
                    "Work with PostgreSQL, Redis, and AWS cloud services",
                ],
                "experience_level": "senior",
                "location": "San Francisco, CA",
                "employment_type": "full_time",
                "department": "Engineering",
            }
        }
    }


class JobAIGenerationResponse(BaseModel):
    """Response schema for AI job description generation"""

    description: str = Field(
        ..., description="Generated job description (2-3 paragraphs)"
    )
    requirements: List[str] = Field(
        ..., description="List of job requirements (4-8 items)"
    )
    responsibilities: List[str] = Field(
        ..., description="List of job responsibilities (5-10 items)"
    )
    suggested_skills: List[str] = Field(
        ..., description="List of suggested skills (8-15 skills)"
    )
    token_usage: int = Field(..., description="Total tokens used in generation")
    cost: float = Field(..., description="Estimated cost in USD")
    generation_time_ms: int = Field(..., description="Generation time in milliseconds")

    model_config = {
        "json_schema_extra": {
            "example": {
                "description": "We are seeking a talented Senior Software Engineer to join our growing team...",
                "requirements": [
                    "5+ years of professional software development experience",
                    "Strong proficiency in Python and modern web frameworks",
                    "Experience with cloud platforms (AWS, GCP, or Azure)",
                    "Excellent problem-solving and communication skills",
                ],
                "responsibilities": [
                    "Design and implement scalable backend services using Python and FastAPI",
                    "Lead technical design discussions and architecture decisions",
                    "Mentor junior engineers through code reviews and pair programming",
                    "Collaborate with product and design teams to deliver features",
                    "Optimize application performance and database queries",
                ],
                "suggested_skills": [
                    "Python",
                    "FastAPI",
                    "PostgreSQL",
                    "Redis",
                    "AWS",
                    "Docker",
                    "Git",
                    "REST APIs",
                ],
                "token_usage": 1850,
                "cost": 0.0555,
                "generation_time_ms": 4200,
            }
        }
    }


class JobSkillsSuggestionRequest(BaseModel):
    """Request schema for AI skills suggestion"""

    title: str = Field(
        ..., min_length=1, max_length=255, description="Job title"
    )
    description: Optional[str] = Field(
        None, description="Job description (helps with context)"
    )
    existing_skills: Optional[List[str]] = Field(
        default_factory=list, description="Already selected skills to filter out"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Data Scientist",
                "description": "Build machine learning models for customer behavior prediction",
                "existing_skills": ["Python", "SQL"],
            }
        }
    }


class JobSkillsSuggestionResponse(BaseModel):
    """Response schema for AI skills suggestion"""

    suggested_skills: List[str] = Field(
        ..., description="All suggested skills (8-15 skills)"
    )
    technical_skills: List[str] = Field(
        ..., description="Technical/hard skills subset"
    )
    soft_skills: List[str] = Field(..., description="Soft skills subset")

    model_config = {
        "json_schema_extra": {
            "example": {
                "suggested_skills": [
                    "Python",
                    "TensorFlow",
                    "Scikit-learn",
                    "Pandas",
                    "NumPy",
                    "Tableau",
                    "Communication",
                    "Problem-solving",
                ],
                "technical_skills": [
                    "Python",
                    "TensorFlow",
                    "Scikit-learn",
                    "Pandas",
                    "NumPy",
                    "Tableau",
                ],
                "soft_skills": ["Communication", "Problem-solving"],
            }
        }
    }


class JobSalarySuggestionRequest(BaseModel):
    """Request schema for AI salary range suggestion"""

    title: str = Field(..., min_length=1, max_length=255, description="Job title")
    experience_level: ExperienceLevel = Field(
        ..., description="Experience level required"
    )
    location: str = Field(
        ..., min_length=1, max_length=255, description="Job location (city, state)"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "title": "Senior Software Engineer",
                "experience_level": "senior",
                "location": "San Francisco, CA",
            }
        }
    }


class JobSalarySuggestionResponse(BaseModel):
    """Response schema for AI salary range suggestion"""

    salary_min: int = Field(..., description="Suggested minimum salary (USD)")
    salary_max: int = Field(..., description="Suggested maximum salary (USD)")
    currency: str = Field(default="USD", description="Currency code")
    market_data: Optional[Dict[str, Any]] = Field(
        None, description="Additional market insights"
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "salary_min": 150000,
                "salary_max": 190000,
                "currency": "USD",
                "market_data": {
                    "market_median": 170000,
                    "percentile_25": 150000,
                    "percentile_75": 190000,
                    "location_adjustment": 1.35,
                    "notes": "San Francisco has 35% higher salaries than national average",
                },
            }
        }
    }
