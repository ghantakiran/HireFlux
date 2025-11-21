"""Schemas for usage limits and subscription enforcement

Issue #64: Usage Limit Enforcement
"""

from pydantic import BaseModel, Field
from typing import Optional


class ResourceUsageSchema(BaseModel):
    """Usage details for a specific resource"""
    used: int = Field(..., description="Current usage count")
    limit: int = Field(..., description="Maximum allowed (-1 for unlimited)")
    remaining: int = Field(..., description="Remaining usage")
    unlimited: bool = Field(default=False, description="Whether usage is unlimited")
    percentage: float = Field(..., description="Usage percentage (0-100)")

    class Config:
        json_schema_extra = {
            "example": {
                "used": 5,
                "limit": 10,
                "remaining": 5,
                "unlimited": False,
                "percentage": 50.0
            }
        }


class UsageLimitsResponse(BaseModel):
    """Complete usage limits for a company"""
    plan: str = Field(..., description="Current subscription plan")
    jobs: ResourceUsageSchema = Field(..., description="Job posting usage")
    candidate_views: ResourceUsageSchema = Field(..., description="Candidate view usage")
    team_members: ResourceUsageSchema = Field(..., description="Team member usage")

    class Config:
        json_schema_extra = {
            "example": {
                "plan": "growth",
                "jobs": {
                    "used": 5,
                    "limit": 10,
                    "remaining": 5,
                    "unlimited": False,
                    "percentage": 50.0
                },
                "candidate_views": {
                    "used": 50,
                    "limit": 100,
                    "remaining": 50,
                    "unlimited": False,
                    "percentage": 50.0
                },
                "team_members": {
                    "used": 2,
                    "limit": 3,
                    "remaining": 1,
                    "unlimited": False,
                    "percentage": 66.67
                }
            }
        }


class UsageCheckRequest(BaseModel):
    """Request to check usage limit for a resource"""
    resource: str = Field(..., description="Resource type: jobs, candidate_views, team_members")

    class Config:
        json_schema_extra = {
            "example": {
                "resource": "jobs"
            }
        }


class UsageCheckResponse(BaseModel):
    """Response for usage limit check"""
    allowed: bool = Field(..., description="Whether action is allowed")
    current_usage: int = Field(..., description="Current usage count")
    limit: int = Field(..., description="Maximum allowed")
    remaining: int = Field(..., description="Remaining usage")
    unlimited: bool = Field(default=False, description="Whether unlimited")
    warning: bool = Field(default=False, description="Whether approaching limit (80%)")
    upgrade_required: bool = Field(default=False, description="Whether upgrade is needed")
    message: str = Field(default="", description="User-friendly message")

    class Config:
        json_schema_extra = {
            "example": {
                "allowed": False,
                "current_usage": 10,
                "limit": 10,
                "remaining": 0,
                "unlimited": False,
                "warning": False,
                "upgrade_required": True,
                "message": "You've reached your job posting limit (10 jobs/month). Upgrade to Growth plan for 100 jobs/month."
            }
        }


class UpgradeRecommendationResponse(BaseModel):
    """Upgrade recommendation based on current usage"""
    recommended_plan: str = Field(..., description="Recommended plan to upgrade to")
    current_plan: str = Field(..., description="Current plan")
    reason: str = Field(..., description="Why upgrade is recommended")
    benefits: list[str] = Field(..., description="Benefits of upgrading")
    price_increase: float = Field(..., description="Monthly price increase")

    class Config:
        json_schema_extra = {
            "example": {
                "recommended_plan": "growth",
                "current_plan": "starter",
                "reason": "You're at 100% of your job posting limit",
                "benefits": [
                    "10 job postings/month (vs. 1)",
                    "100 candidate views/month (vs. 10)",
                    "3 team members (vs. 1)",
                    "AI candidate ranking",
                    "Basic ATS features"
                ],
                "price_increase": 99.0
            }
        }
