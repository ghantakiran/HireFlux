"""Pydantic schemas for applicant filtering API

Issue #59: Applicant Filtering & Sorting - API request/response schemas
"""

from pydantic import BaseModel, Field, validator
from typing import List, Optional, Dict
from datetime import datetime
from uuid import UUID


class ApplicantFilterRequest(BaseModel):
    """Query parameters for filtering applicants"""

    # Filtering options
    status: Optional[List[str]] = Field(None, description="Filter by status(es)")
    minFitIndex: Optional[int] = Field(
        None, ge=0, le=100, description="Minimum fit score (0-100)"
    )
    maxFitIndex: Optional[int] = Field(
        None, ge=0, le=100, description="Maximum fit score (0-100)"
    )
    appliedAfter: Optional[datetime] = Field(
        None, description="Applied after date (ISO 8601)"
    )
    appliedBefore: Optional[datetime] = Field(
        None, description="Applied before date (ISO 8601)"
    )
    assignedTo: Optional[str] = Field(None, description="Filter by assigned team member ID")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    search: Optional[str] = Field(None, description="Search by candidate name or email")
    unassigned: Optional[bool] = Field(None, description="Show only unassigned applicants")

    # Sorting options
    sortBy: Optional[str] = Field(
        "appliedDate",
        description="Sort by: fitIndex, appliedDate, or experience",
    )
    order: Optional[str] = Field(
        "desc",
        description="Sort order: desc (descending) or asc (ascending)",
    )

    # Pagination
    page: Optional[int] = Field(1, ge=1, description="Page number (starts at 1)")
    limit: Optional[int] = Field(
        50, ge=1, le=100, description="Items per page (1-100)"
    )

    @validator("sortBy")
    def validate_sort_by(cls, v):
        """Validate sortBy field"""
        allowed = ["fitIndex", "appliedDate", "experience"]
        if v not in allowed:
            raise ValueError(f"sortBy must be one of: {', '.join(allowed)}")
        return v

    @validator("order")
    def validate_order(cls, v):
        """Validate order field"""
        allowed = ["desc", "asc"]
        if v not in allowed:
            raise ValueError(f"order must be one of: {', '.join(allowed)}")
        return v

    @validator("status")
    def validate_status(cls, v):
        """Validate status values"""
        if v:
            allowed = ["new", "screening", "interview", "offer", "hired", "rejected"]
            for status in v:
                if status not in allowed:
                    raise ValueError(
                        f"Invalid status '{status}'. Allowed: {', '.join(allowed)}"
                    )
        return v


class CandidateProfileResponse(BaseModel):
    """Candidate profile info in application response"""

    first_name: Optional[str]
    last_name: Optional[str]
    email: str
    location: Optional[str]
    phone: Optional[str]

    class Config:
        from_attributes = True


class ApplicationResponse(BaseModel):
    """Single application response"""

    id: UUID
    user_id: UUID
    job_id: UUID
    status: str
    fit_index: int
    applied_at: datetime
    tags: List[str] = []
    assigned_to: List[str] = []
    candidate: CandidateProfileResponse

    class Config:
        from_attributes = True


class FilterStatsResponse(BaseModel):
    """Filter statistics for UI display"""

    status_counts: Dict[str, int] = Field(
        description="Count of applicants by status"
    )
    fit_index_counts: Dict[str, int] = Field(
        description="Count of applicants by fit range (high/medium/low)"
    )
    unassigned_count: int = Field(
        description="Count of unassigned applicants"
    )
    total_count: int = Field(
        description="Total count of all applicants"
    )


class ApplicantListResponse(BaseModel):
    """Response for applicant list endpoint"""

    success: bool = True
    data: Dict = Field(
        description="Response data containing applications, pagination, and stats"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "applications": [
                        {
                            "id": "123e4567-e89b-12d3-a456-426614174000",
                            "user_id": "123e4567-e89b-12d3-a456-426614174001",
                            "job_id": "123e4567-e89b-12d3-a456-426614174002",
                            "status": "new",
                            "fit_index": 85,
                            "applied_at": "2024-01-15T10:30:00Z",
                            "tags": ["starred"],
                            "assigned_to": ["user-id-123"],
                            "candidate": {
                                "first_name": "John",
                                "last_name": "Doe",
                                "email": "john.doe@example.com",
                                "location": "San Francisco, CA",
                                "phone": "+1-555-0100",
                            },
                        }
                    ],
                    "total_count": 100,
                    "page": 1,
                    "limit": 50,
                    "has_more": True,
                    "filter_stats": {
                        "status_counts": {
                            "new": 30,
                            "screening": 25,
                            "interview": 20,
                            "offer": 10,
                            "hired": 10,
                            "rejected": 5,
                        },
                        "fit_index_counts": {"high": 40, "medium": 45, "low": 15},
                        "unassigned_count": 50,
                        "total_count": 100,
                    },
                },
            }
        }
