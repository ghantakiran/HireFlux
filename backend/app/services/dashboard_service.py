"""Dashboard Service for Employer Analytics

Provides dashboard statistics, activity feeds, and team analytics for employers.
"""
from datetime import datetime, timedelta
from typing import List, Optional
import sqlalchemy
from sqlalchemy import func, and_, or_, desc
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.models.company import Company, CompanyMember, CompanySubscription
from app.db.models.job import Job
from app.db.models.application import Application
from app.db.models.user import User
from app.schemas.dashboard import (
    DashboardStats,
    ApplicationStatusCount,
    TopJob,
    PipelineMetrics,
    RecentActivity,
    ActivityEvent,
    TeamActivity,
    TeamMemberActivity
)


class DashboardService:
    """Service for employer dashboard analytics"""

    def __init__(self, db: Session):
        self.db = db

    def get_dashboard_stats(self, company_id: UUID) -> DashboardStats:
        """
        Get comprehensive dashboard statistics for a company.

        Args:
            company_id: Company UUID

        Returns:
            DashboardStats with all metrics

        Raises:
            Exception: If company not found
        """
        # Verify company exists
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise Exception(f"Company {company_id} not found")

        # Get subscription for usage tracking
        subscription = (
            self.db.query(CompanySubscription)
            .filter(CompanySubscription.company_id == company_id)
            .first()
        )

        # Job metrics
        active_jobs_count = (
            self.db.query(func.count(Job.id))
            .filter(Job.company_id == company_id, Job.is_active == True)
            .scalar()
        ) or 0

        total_jobs_count = (
            self.db.query(func.count(Job.id))
            .filter(Job.company_id == company_id)
            .scalar()
        ) or 0

        # Application metrics
        job_ids = [
            job_id[0]
            for job_id in self.db.query(Job.id)
            .filter(Job.company_id == company_id)
            .all()
        ]

        total_applications = 0
        new_applications_today = 0
        new_applications_this_week = 0

        if job_ids:
            total_applications = (
                self.db.query(func.count(Application.id))
                .filter(Application.job_id.in_(job_ids))
                .scalar()
            ) or 0

            # Applications today
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            new_applications_today = (
                self.db.query(func.count(Application.id))
                .filter(
                    Application.job_id.in_(job_ids),
                    Application.created_at >= today_start
                )
                .scalar()
            ) or 0

            # Applications this week
            week_start = datetime.utcnow() - timedelta(days=7)
            new_applications_this_week = (
                self.db.query(func.count(Application.id))
                .filter(
                    Application.job_id.in_(job_ids),
                    Application.created_at >= week_start
                )
                .scalar()
            ) or 0

        # Pipeline breakdown by status
        applications_by_status: List[ApplicationStatusCount] = []
        if job_ids:
            status_counts = (
                self.db.query(
                    Application.status,
                    func.count(Application.id).label("count")
                )
                .filter(Application.job_id.in_(job_ids))
                .group_by(Application.status)
                .all()
            )

            applications_by_status = [
                ApplicationStatusCount(status=status, count=count)
                for status, count in status_counts
            ]

        # Top performing jobs (by application volume in last 7 days)
        top_jobs = self._get_top_jobs(company_id, limit=5)

        # Quality metrics
        avg_time_to_first_app = self._calculate_avg_time_to_first_application(company_id)

        # Build stats object
        stats = DashboardStats(
            # Job metrics
            active_jobs=active_jobs_count,
            total_jobs_posted=total_jobs_count,
            # Application metrics
            total_applications=total_applications,
            new_applications_today=new_applications_today,
            new_applications_this_week=new_applications_this_week,
            # Pipeline
            applications_by_status=applications_by_status,
            top_jobs=top_jobs,
            # Quality metrics
            avg_time_to_first_application_hours=avg_time_to_first_app,
            avg_candidate_quality=None,  # TODO: Implement with match scores
            # Usage tracking
            jobs_posted_this_month=subscription.jobs_posted_this_month if subscription else 0,
            candidate_views_this_month=subscription.candidate_views_this_month if subscription else 0,
            # Plan limits
            max_active_jobs=company.max_active_jobs,
            max_candidate_views=company.max_candidate_views
        )

        return stats

    def _get_top_jobs(self, company_id: UUID, limit: int = 5) -> List[TopJob]:
        """Get top performing jobs by application volume"""
        # Get jobs with application counts
        week_ago = datetime.utcnow() - timedelta(days=7)
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

        jobs_with_counts = (
            self.db.query(
                Job.id,
                Job.title,
                func.count(Application.id).label("total_applications"),
                func.sum(
                    func.cast(Application.created_at >= today_start, sqlalchemy.Integer)
                ).label("new_applications_24h")
            )
            .outerjoin(Application, Application.job_id == Job.id)
            .filter(
                Job.company_id == company_id,
                Job.is_active == True
            )
            .group_by(Job.id, Job.title)
            .order_by(desc("total_applications"))
            .limit(limit)
            .all()
        )

        top_jobs = []
        for job_id, job_title, total_apps, new_apps_24h in jobs_with_counts:
            top_jobs.append(
                TopJob(
                    job_id=job_id,
                    job_title=job_title,
                    total_applications=total_apps or 0,
                    new_applications_24h=new_apps_24h or 0,
                    avg_candidate_fit=None  # TODO: Calculate from match scores
                )
            )

        return top_jobs

    def _calculate_avg_time_to_first_application(self, company_id: UUID) -> Optional[float]:
        """Calculate average time from job posting to first application (in hours)"""
        # Get all jobs with their first application time
        jobs = self.db.query(Job).filter(Job.company_id == company_id).all()

        time_deltas = []
        for job in jobs:
            first_application = (
                self.db.query(Application)
                .filter(Application.job_id == job.id)
                .order_by(Application.applied_at)
                .first()
            )

            if first_application and job.posted_date:
                delta = first_application.applied_at - job.posted_date
                hours = delta.total_seconds() / 3600
                time_deltas.append(hours)

        if not time_deltas:
            return None

        return sum(time_deltas) / len(time_deltas)

    def get_pipeline_metrics(self, company_id: UUID) -> PipelineMetrics:
        """
        Get hiring pipeline conversion metrics.

        Args:
            company_id: Company UUID

        Returns:
            PipelineMetrics with conversion rates
        """
        # Get all applications for company's jobs
        job_ids = [
            job_id[0]
            for job_id in self.db.query(Job.id)
            .filter(Job.company_id == company_id)
            .all()
        ]

        if not job_ids:
            return PipelineMetrics(
                total_applicants=0,
                interviewed_count=0,
                offered_count=0,
                hired_count=0,
                rejected_count=0,
                application_to_interview_rate=0.0,
                interview_to_offer_rate=0.0,
                offer_acceptance_rate=0.0
            )

        # Count applications by status
        total_applicants = (
            self.db.query(func.count(Application.id))
            .filter(Application.job_id.in_(job_ids))
            .scalar()
        ) or 0

        interviewed_count = (
            self.db.query(func.count(Application.id))
            .filter(
                Application.job_id.in_(job_ids),
                Application.status == "interview"
            )
            .scalar()
        ) or 0

        offered_count = (
            self.db.query(func.count(Application.id))
            .filter(
                Application.job_id.in_(job_ids),
                or_(Application.status == "offered", Application.status == "offer")
            )
            .scalar()
        ) or 0

        hired_count = (
            self.db.query(func.count(Application.id))
            .filter(
                Application.job_id.in_(job_ids),
                Application.status == "hired"
            )
            .scalar()
        ) or 0

        rejected_count = (
            self.db.query(func.count(Application.id))
            .filter(
                Application.job_id.in_(job_ids),
                Application.status == "rejected"
            )
            .scalar()
        ) or 0

        # Calculate conversion rates
        application_to_interview_rate = (
            (interviewed_count / total_applicants * 100) if total_applicants > 0 else 0.0
        )

        interview_to_offer_rate = (
            (offered_count / interviewed_count * 100) if interviewed_count > 0 else 0.0
        )

        offer_acceptance_rate = (
            (hired_count / offered_count * 100) if offered_count > 0 else 0.0
        )

        return PipelineMetrics(
            total_applicants=total_applicants,
            interviewed_count=interviewed_count,
            offered_count=offered_count,
            hired_count=hired_count,
            rejected_count=rejected_count,
            application_to_interview_rate=round(application_to_interview_rate, 2),
            interview_to_offer_rate=round(interview_to_offer_rate, 2),
            offer_acceptance_rate=round(offer_acceptance_rate, 2)
        )

    def get_recent_activity(self, company_id: UUID, limit: int = 20) -> RecentActivity:
        """
        Get recent activity feed for company.

        Args:
            company_id: Company UUID
            limit: Maximum number of events to return

        Returns:
            RecentActivity with events sorted by timestamp (descending)
        """
        events: List[ActivityEvent] = []

        # Get job posting events
        jobs = (
            self.db.query(Job, User)
            .outerjoin(
                CompanyMember,
                and_(
                    CompanyMember.company_id == company_id,
                    CompanyMember.role.in_(["owner", "admin", "hiring_manager"])
                )
            )
            .outerjoin(User, User.id == CompanyMember.user_id)
            .filter(Job.company_id == company_id)
            .order_by(desc(Job.created_at))
            .limit(limit)
            .all()
        )

        for job, user in jobs:
            events.append(
                ActivityEvent(
                    id=job.id,
                    event_type="job_posted",
                    title=f"New job posted: {job.title}",
                    description=f"Job posted on {job.posted_date.strftime('%Y-%m-%d') if job.posted_date else 'N/A'}",
                    actor_name=user.email if user else None,
                    job_title=job.title,
                    candidate_name=None,
                    timestamp=job.created_at
                )
            )

        # Get application received events
        job_ids = [job_id[0] for job_id in self.db.query(Job.id).filter(Job.company_id == company_id).all()]

        if job_ids:
            applications = (
                self.db.query(Application, Job, User)
                .join(Job, Job.id == Application.job_id)
                .join(User, User.id == Application.user_id)
                .filter(Application.job_id.in_(job_ids))
                .order_by(desc(Application.created_at))
                .limit(limit)
                .all()
            )

            for application, job, candidate in applications:
                events.append(
                    ActivityEvent(
                        id=application.id,
                        event_type="application_received",
                        title=f"New application for {job.title}",
                        description=f"Application status: {application.status}",
                        actor_name=None,
                        job_title=job.title,
                        candidate_name=candidate.email,
                        timestamp=application.created_at
                    )
                )

        # Sort all events by timestamp (descending)
        events.sort(key=lambda e: e.timestamp, reverse=True)

        # Limit to requested number
        events = events[:limit]

        return RecentActivity(
            events=events,
            total_count=len(events)  # This is simplified; in production, would count total without limit
        )

    def get_team_activity(self, company_id: UUID) -> TeamActivity:
        """
        Get team activity overview.

        Args:
            company_id: Company UUID

        Returns:
            TeamActivity with per-member breakdown
        """
        # Get all team members
        members = (
            self.db.query(CompanyMember, User)
            .join(User, User.id == CompanyMember.user_id)
            .filter(CompanyMember.company_id == company_id)
            .all()
        )

        total_members = len(members)
        member_activities: List[TeamMemberActivity] = []

        for member, user in members:
            # Count jobs posted by this member (owner gets credit for all jobs for now)
            jobs_posted = 0
            if member.role in ["owner", "admin", "hiring_manager"]:
                jobs_posted = (
                    self.db.query(func.count(Job.id))
                    .filter(Job.company_id == company_id)
                    .scalar()
                ) or 0

            member_activities.append(
                TeamMemberActivity(
                    member_id=member.id,
                    member_name=user.email,  # In production, use user.name if available
                    member_role=member.role,
                    jobs_posted=jobs_posted,
                    candidates_reviewed=0,  # TODO: Track candidate views
                    last_active_at=member.updated_at
                )
            )

        # Count active members this week
        week_ago = datetime.utcnow() - timedelta(days=7)
        active_members_this_week = sum(
            1 for activity in member_activities
            if activity.last_active_at and activity.last_active_at >= week_ago
        )

        return TeamActivity(
            total_members=total_members,
            active_members_this_week=active_members_this_week,
            member_activities=member_activities
        )
