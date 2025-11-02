"""Application tracking schemas"""
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from enum import Enum


class ApplicationStatus(str, Enum):
    """Application status"""

    SAVED = "saved"
    APPLIED = "applied"
    INTERVIEW = "interview"
    OFFER = "offer"
    REJECTED = "rejected"


class ApplicationMode(str, Enum):
    """Application submission mode"""

    MANUAL = "manual"
    APPLY_ASSIST = "apply_assist"
    AUTO_APPLY = "auto_apply"


class ApplicationCreate(BaseModel):
    """Create application"""

    job_id: str
    resume_version_id: Optional[str] = None
    cover_letter_id: Optional[str] = None
    status: ApplicationStatus = ApplicationStatus.SAVED
    notes: Optional[str] = Field(None, max_length=2000)
    is_auto_applied: bool = False
    application_mode: Optional[ApplicationMode] = ApplicationMode.MANUAL


class ApplicationUpdate(BaseModel):
    """Update application"""

    status: Optional[ApplicationStatus] = None
    notes: Optional[str] = Field(None, max_length=2000)
    resume_version_id: Optional[str] = None
    cover_letter_id: Optional[str] = None


class ApplicationResponse(BaseModel):
    """Application response"""

    id: str
    user_id: str
    job_id: str
    resume_version_id: Optional[str]
    cover_letter_id: Optional[str]
    status: ApplicationStatus
    applied_at: Optional[datetime]
    notes: Optional[str]
    is_auto_applied: bool
    application_mode: Optional[ApplicationMode]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ApplicationDetailResponse(ApplicationResponse):
    """Detailed application with relationships"""

    job: Optional[dict] = None  # Job details
    resume_version: Optional[dict] = None  # Resume version details
    cover_letter: Optional[dict] = None  # Cover letter details


class ApplicationListFilter(BaseModel):
    """Filter for listing applications"""

    status: Optional[ApplicationStatus] = None
    job_id: Optional[str] = None
    is_auto_applied: Optional[bool] = None
    application_mode: Optional[ApplicationMode] = None
    from_date: Optional[datetime] = None
    to_date: Optional[datetime] = None


class ApplicationStats(BaseModel):
    """Application statistics"""

    total_applications: int
    by_status: dict  # {"saved": 5, "applied": 10, ...}
    by_mode: dict  # {"manual": 8, "auto_apply": 7, ...}
    total_interviews: int
    total_offers: int
    total_rejections: int
    success_rate: float = Field(..., ge=0, le=100)
    avg_days_to_interview: Optional[float]
    avg_days_to_offer: Optional[float]


# ============================================================================
# Employer ATS Schemas
# ============================================================================


class ATSApplicationStatus(str, Enum):
    """ATS pipeline status for employer tracking"""

    NEW = "new"
    REVIEWING = "reviewing"
    PHONE_SCREEN = "phone_screen"
    TECHNICAL_INTERVIEW = "technical_interview"
    FINAL_INTERVIEW = "final_interview"
    OFFER = "offer"
    HIRED = "hired"
    REJECTED = "rejected"


class FitIndexResponse(BaseModel):
    """AI candidate fit scoring details"""

    fit_index: int = Field(..., ge=0, le=100, description="Overall fit score 0-100")
    explanations: List[str] = Field(default_factory=list, description="Factor explanations")
    strengths: List[str] = Field(default_factory=list, description="Top candidate strengths")
    concerns: List[str] = Field(default_factory=list, description="Potential concerns")

    model_config = {
        "json_schema_extra": {
            "example": {
                "fit_index": 87,
                "explanations": [
                    "Skills match: 95%",
                    "Experience level: Excellent",
                    "Location: Local for hybrid role"
                ],
                "strengths": [
                    "95% skills match (React, TypeScript, Node.js)",
                    "5 years experience (Matches Senior level requirement)",
                    "Salary expectation $140K (Within your $130-150K range)"
                ],
                "concerns": [
                    "Start date: 60 days (You prefer 30 days)",
                    "No experience with AWS (Listed as nice to have)"
                ]
            }
        }
    }


class ATSApplicationResponse(ApplicationResponse):
    """Application response with employer ATS fields"""

    fit_index: Optional[int] = Field(None, ge=0, le=100)
    assigned_to: List[UUID] = Field(default_factory=list)
    tags: List[str] = Field(default_factory=list)

    # Nested candidate info (from user relationship)
    candidate: Optional[dict] = None  # User details

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "987fbc97-4bed-5078-9f07-9141ba07c9f3",
                "job_id": "456e7890-e12b-34d5-a678-426614174001",
                "status": "reviewing",
                "fit_index": 87,
                "assigned_to": ["789fbc97-4bed-5078-9f07-9141ba07c9f3"],
                "tags": ["strong_candidate", "react_expert"],
                "applied_at": "2025-11-01T10:30:00Z",
                "created_at": "2025-11-01T10:30:00Z",
                "updated_at": "2025-11-01T10:30:00Z"
            }
        }
    }


class ATSApplicationListResponse(BaseModel):
    """Paginated list of applications for employer ATS"""

    applications: List[ATSApplicationResponse]
    total: int
    page: int
    limit: int
    total_pages: int

    model_config = {
        "json_schema_extra": {
            "example": {
                "applications": [],
                "total": 50,
                "page": 1,
                "limit": 20,
                "total_pages": 3
            }
        }
    }


class ApplicationNoteCreate(BaseModel):
    """Create internal note on application"""

    content: str = Field(..., min_length=1, max_length=5000)
    visibility: str = Field(default="team", pattern="^(private|team)$")

    model_config = {
        "json_schema_extra": {
            "example": {
                "content": "Strong technical skills, but needs to improve communication during interview",
                "visibility": "team"
            }
        }
    }


class ApplicationNoteResponse(BaseModel):
    """Application note response"""

    id: UUID
    application_id: UUID
    author_id: UUID
    content: str
    visibility: str
    created_at: datetime
    updated_at: datetime

    # Nested author info
    author: Optional[dict] = None  # User details

    model_config = {
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "application_id": "987fbc97-4bed-5078-9f07-9141ba07c9f3",
                "author_id": "456e7890-e12b-34d5-a678-426614174001",
                "content": "Great candidate, moving to phone screen",
                "visibility": "team",
                "created_at": "2025-11-01T10:30:00Z",
                "updated_at": "2025-11-01T10:30:00Z"
            }
        }
    }


class ApplicationStatusUpdate(BaseModel):
    """Update application status"""

    status: ATSApplicationStatus
    note: Optional[str] = Field(None, max_length=500, description="Optional reason for status change")

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "phone_screen",
                "note": "Moving to phone screen after reviewing portfolio"
            }
        }
    }


class ApplicationAssignUpdate(BaseModel):
    """Assign/unassign team members to application"""

    assigned_to: List[UUID] = Field(..., description="User IDs of team members to assign")

    model_config = {
        "json_schema_extra": {
            "example": {
                "assigned_to": [
                    "123e4567-e89b-12d3-a456-426614174000",
                    "987fbc97-4bed-5078-9f07-9141ba07c9f3"
                ]
            }
        }
    }


class ApplicationBulkUpdate(BaseModel):
    """Bulk update applications"""

    application_ids: List[UUID] = Field(..., min_length=1, max_length=100)
    action: str = Field(..., pattern="^(reject|shortlist|move_to_stage)$")
    target_status: Optional[ATSApplicationStatus] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "application_ids": [
                    "123e4567-e89b-12d3-a456-426614174000",
                    "987fbc97-4bed-5078-9f07-9141ba07c9f3"
                ],
                "action": "move_to_stage",
                "target_status": "phone_screen"
            }
        }
    }
