"""Dashboard schemas for employer analytics

Pydantic schemas for employer dashboard data including statistics, metrics, and activity feeds.
"""
from datetime import datetime
from typing import Dict, List, Optional
from pydantic import BaseModel, Field
from uuid import UUID


class ApplicationStatusCount(BaseModel):
    """Count of applications by status"""
    status: str = Field(..., description="Application status")
    count: int = Field(..., description="Number of applications in this status")


class TopJob(BaseModel):
    """Top performing job with application metrics"""
    job_id: UUID
    job_title: str
    total_applications: int
    new_applications_24h: int
    avg_candidate_fit: Optional[float] = Field(None, description="Average fit index of applicants")


class DashboardStats(BaseModel):
    """Main dashboard statistics"""
    # Job metrics
    active_jobs: int = Field(..., description="Number of currently active job postings")
    total_jobs_posted: int = Field(..., description="Total jobs posted all-time")

    # Application metrics
    total_applications: int = Field(..., description="Total applications received all-time")
    new_applications_today: int = Field(..., description="Applications received today")
    new_applications_this_week: int = Field(..., description="Applications received this week")

    # Pipeline breakdown
    applications_by_status: List[ApplicationStatusCount] = Field(
        default_factory=list,
        description="Application counts grouped by status"
    )

    # Top performing jobs
    top_jobs: List[TopJob] = Field(
        default_factory=list,
        description="Top 5 jobs by application volume (last 7 days)"
    )

    # Quality metrics
    avg_time_to_first_application_hours: Optional[float] = Field(
        None,
        description="Average hours from job posting to first application"
    )
    avg_candidate_quality: Optional[float] = Field(
        None,
        description="Average fit index of all applicants (0-100)"
    )

    # Usage tracking
    jobs_posted_this_month: int = Field(0, description="Jobs posted in current billing month")
    candidate_views_this_month: int = Field(0, description="Candidate profiles viewed this month")

    # Plan limits
    max_active_jobs: int = Field(..., description="Maximum active jobs allowed on current plan")
    max_candidate_views: int = Field(..., description="Maximum candidate views allowed per month")

    class Config:
        from_attributes = True


class ActivityEvent(BaseModel):
    """Activity feed event"""
    id: UUID
    event_type: str = Field(..., description="Type of event: job_posted, application_received, etc.")
    title: str = Field(..., description="Human-readable event title")
    description: Optional[str] = Field(None, description="Event description")
    actor_name: Optional[str] = Field(None, description="Name of team member who triggered event")
    job_title: Optional[str] = Field(None, description="Related job title if applicable")
    candidate_name: Optional[str] = Field(None, description="Related candidate name if applicable")
    timestamp: datetime = Field(..., description="When the event occurred")

    class Config:
        from_attributes = True


class RecentActivity(BaseModel):
    """Recent activity feed for company"""
    events: List[ActivityEvent] = Field(
        default_factory=list,
        description="Recent activity events (last 30 days)"
    )
    total_count: int = Field(..., description="Total number of activity events")


class PipelineMetrics(BaseModel):
    """Hiring pipeline conversion metrics"""
    total_applicants: int
    interviewed_count: int
    offered_count: int
    hired_count: int
    rejected_count: int

    # Conversion rates (percentages)
    application_to_interview_rate: float = Field(
        ...,
        description="Percentage of applicants who reached interview stage"
    )
    interview_to_offer_rate: float = Field(
        ...,
        description="Percentage of interviewed candidates who received offers"
    )
    offer_acceptance_rate: float = Field(
        ...,
        description="Percentage of offers that were accepted"
    )


class TeamMemberActivity(BaseModel):
    """Activity summary for team member"""
    member_id: UUID
    member_name: str
    member_role: str
    jobs_posted: int = Field(0, description="Jobs posted by this member")
    candidates_reviewed: int = Field(0, description="Candidate profiles reviewed")
    last_active_at: Optional[datetime] = Field(None, description="Last activity timestamp")


class TeamActivity(BaseModel):
    """Team activity overview"""
    total_members: int
    active_members_this_week: int
    member_activities: List[TeamMemberActivity] = Field(
        default_factory=list,
        description="Activity breakdown by team member"
    )
