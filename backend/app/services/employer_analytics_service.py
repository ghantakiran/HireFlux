"""Employer Analytics Service

Sprint 15-16: Advanced Analytics & Reporting

Provides comprehensive analytics for employer hiring metrics:
- Sourcing metrics (application sources, quality, conversion)
- Pipeline metrics (funnel, drop-off, avg time in stage)
- Time metrics (time to hire, time to offer)
- Quality metrics (Fit Index, show-up rate, retention)
- Cost metrics (cost per application, cost per hire, ROI)
"""

import logging
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Dict, List, Optional, Tuple
from uuid import UUID

from sqlalchemy import and_, func, case
from sqlalchemy.orm import Session

from app.db.models.application import Application
from app.db.models.analytics import (
    AnalyticsSnapshot,
    ApplicationStageHistory,
    CompanyAnalyticsConfig,
)
from app.db.models.company import Company, CompanySubscription
from app.db.models.job import Job
from app.db.models.webhook import InterviewSchedule

logger = logging.getLogger(__name__)


class EmployerAnalyticsService:
    """Service for employer hiring analytics and insights"""

    def __init__(self, db: Session):
        self.db = db

    # =========================================================================
    # SOURCING METRICS
    # =========================================================================

    def calculate_sourcing_metrics(
        self, company_id: UUID, start_date: date, end_date: date
    ) -> Dict[str, Dict[str, any]]:
        """
        Calculate application sourcing metrics by source.

        Args:
            company_id: Company UUID
            start_date: Start of date range
            end_date: End of date range

        Returns:
            Dict mapping source to metrics:
            {
                "auto_apply": {
                    "count": 10,
                    "avg_fit": 75.0,
                    "hires": 2,
                    "conversion_rate": 0.20
                },
                ...
            }
        """
        # Get all applications for company in date range
        applications = (
            self.db.query(Application)
            .join(Job, Application.job_id == Job.id)
            .filter(
                and_(
                    Job.company_id == company_id,
                    Application.created_at >= datetime.combine(start_date, datetime.min.time()),
                    Application.created_at <= datetime.combine(end_date, datetime.max.time()),
                )
            )
            .all()
        )

        if not applications:
            return {}

        # Group by source
        source_metrics = {}
        sources = set(app.source for app in applications if app.source)

        for source in sources:
            source_apps = [app for app in applications if app.source == source]
            total_count = len(source_apps)

            # Calculate average Fit Index
            fit_indices = [app.fit_index for app in source_apps if app.fit_index is not None]
            avg_fit = sum(fit_indices) / len(fit_indices) if fit_indices else None

            # Count hires
            hires = len([app for app in source_apps if app.status == "hired"])

            # Calculate conversion rate
            conversion_rate = hires / total_count if total_count > 0 else 0.0

            source_metrics[source] = {
                "count": total_count,
                "avg_fit": avg_fit,
                "hires": hires,
                "conversion_rate": conversion_rate,
            }

        return source_metrics

    # =========================================================================
    # PIPELINE METRICS
    # =========================================================================

    def calculate_pipeline_funnel(
        self, job_id: Optional[UUID] = None, company_id: Optional[UUID] = None
    ) -> List[Dict[str, any]]:
        """
        Calculate pipeline funnel with stage distribution.

        Args:
            job_id: Optional job UUID (if None, company-wide)
            company_id: Company UUID (required if job_id is None)

        Returns:
            List of stage dicts with counts
        """
        query = self.db.query(
            Application.status.label("stage"),
            func.count(Application.id).label("count")
        )

        if job_id:
            query = query.filter(Application.job_id == job_id)
        elif company_id:
            query = query.join(Job, Application.job_id == Job.id).filter(Job.company_id == company_id)
        else:
            raise ValueError("Either job_id or company_id must be provided")

        results = query.group_by(Application.status).all()

        funnel = [{"stage": row.stage, "count": row.count} for row in results]
        return funnel

    def calculate_drop_off_rates(
        self, company_id: UUID
    ) -> Dict[str, float]:
        """
        Calculate drop-off rates between pipeline stages.

        Args:
            company_id: Company UUID

        Returns:
            Dict mapping stage to drop-off rate:
            {"reviewing": 0.70, "phone_screen": 0.50}
        """
        # Get all stage transitions for company applications
        stage_transitions = (
            self.db.query(ApplicationStageHistory)
            .join(Application, ApplicationStageHistory.application_id == Application.id)
            .join(Job, Application.job_id == Job.id)
            .filter(Job.company_id == company_id)
            .all()
        )

        # Count entries and exits per stage
        stage_stats = {}
        for transition in stage_transitions:
            stage = transition.from_stage
            if stage and stage not in stage_stats:
                stage_stats[stage] = {"entered": 0, "moved_forward": 0}
            
            if stage:
                stage_stats[stage]["entered"] += 1
            
            # If moved to next stage (not rejected)
            if transition.to_stage and transition.to_stage != "rejected":
                if stage and stage in stage_stats:
                    stage_stats[stage]["moved_forward"] += 1

        # Calculate drop-off rates
        drop_off_rates = {}
        for stage, stats in stage_stats.items():
            if stats["entered"] > 0:
                drop_off = 1 - (stats["moved_forward"] / stats["entered"])
                drop_off_rates[stage] = drop_off

        return drop_off_rates

    def calculate_avg_days_per_stage(
        self, company_id: UUID
    ) -> Dict[str, float]:
        """
        Calculate average days spent in each pipeline stage.

        Args:
            company_id: Company UUID

        Returns:
            Dict mapping stage to avg days:
            {"reviewing": 5.0, "phone_screen": 7.0}
        """
        # Get stage history for company
        stage_history = (
            self.db.query(ApplicationStageHistory)
            .join(Application, ApplicationStageHistory.application_id == Application.id)
            .join(Job, Application.job_id == Job.id)
            .filter(Job.company_id == company_id)
            .order_by(ApplicationStageHistory.application_id, ApplicationStageHistory.changed_at)
            .all()
        )

        # Group by application
        app_stages = {}
        for history in stage_history:
            app_id = history.application_id
            if app_id not in app_stages:
                app_stages[app_id] = []
            app_stages[app_id].append(history)

        # Calculate time in each stage
        stage_durations = {}
        for app_id, stages in app_stages.items():
            for i in range(len(stages) - 1):
                current_stage = stages[i].to_stage
                next_transition = stages[i + 1].changed_at
                current_transition = stages[i].changed_at

                days = (next_transition - current_transition).days

                if current_stage not in stage_durations:
                    stage_durations[current_stage] = []
                stage_durations[current_stage].append(days)

        # Calculate averages
        avg_days = {}
        for stage, durations in stage_durations.items():
            if durations:
                avg_days[stage] = sum(durations) / len(durations)

        return avg_days

    # =========================================================================
    # TIME METRICS
    # =========================================================================

    def calculate_time_to_first_application(self, job_id: UUID) -> Optional[int]:
        """
        Calculate days from job posted to first application.

        Args:
            job_id: Job UUID

        Returns:
            Days as integer, or None if no applications
        """
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return None

        first_app = (
            self.db.query(Application)
            .filter(Application.job_id == job_id)
            .order_by(Application.created_at.asc())
            .first()
        )

        if not first_app:
            return None

        delta = first_app.created_at - job.created_at
        return delta.days

    def calculate_time_to_hire(self, application_id: UUID) -> Optional[int]:
        """
        Calculate days from application submitted to hired.

        Args:
            application_id: Application UUID

        Returns:
            Days as integer, or None if not hired yet
        """
        # Get stage history
        history = (
            self.db.query(ApplicationStageHistory)
            .filter(ApplicationStageHistory.application_id == application_id)
            .order_by(ApplicationStageHistory.changed_at.asc())
            .all()
        )

        if not history:
            return None

        # Find first (application start) and hired stage
        first_stage = history[0]
        hired_stage = next((h for h in history if h.to_stage == "hired"), None)

        if not hired_stage:
            return None

        delta = hired_stage.changed_at - first_stage.changed_at
        return delta.days

    def calculate_time_to_offer(self, application_id: UUID) -> Optional[int]:
        """
        Calculate days from application submitted to offer extended.

        Args:
            application_id: Application UUID

        Returns:
            Days as integer, or None if no offer yet
        """
        history = (
            self.db.query(ApplicationStageHistory)
            .filter(ApplicationStageHistory.application_id == application_id)
            .order_by(ApplicationStageHistory.changed_at.asc())
            .all()
        )

        if not history:
            return None

        first_stage = history[0]
        offer_stage = next((h for h in history if h.to_stage == "offer"), None)

        if not offer_stage:
            return None

        delta = offer_stage.changed_at - first_stage.changed_at
        return delta.days

    def calculate_avg_time_to_hire(
        self, company_id: UUID, start_date: date, end_date: date
    ) -> Optional[float]:
        """
        Calculate average time to hire across all hires.

        Args:
            company_id: Company UUID
            start_date: Start of date range
            end_date: End of date range

        Returns:
            Average days, or None if no hires
        """
        # Get all hired applications in date range
        hired_apps = (
            self.db.query(Application)
            .join(Job, Application.job_id == Job.id)
            .filter(
                and_(
                    Job.company_id == company_id,
                    Application.status == "hired",
                    Application.created_at >= datetime.combine(start_date, datetime.min.time()),
                    Application.created_at <= datetime.combine(end_date, datetime.max.time()),
                )
            )
            .all()
        )

        if not hired_apps:
            return None

        # Calculate time to hire for each
        times = []
        for app in hired_apps:
            time_to_hire = self.calculate_time_to_hire(app.id)
            if time_to_hire is not None:
                times.append(time_to_hire)

        if not times:
            return None

        return sum(times) / len(times)

    # =========================================================================
    # QUALITY METRICS
    # =========================================================================

    def calculate_avg_fit_index(
        self, job_id: Optional[UUID] = None, company_id: Optional[UUID] = None
    ) -> Optional[float]:
        """
        Calculate average Fit Index for applications.

        Args:
            job_id: Optional job UUID
            company_id: Company UUID (required if job_id is None)

        Returns:
            Average Fit Index (0-100), or None if no data
        """
        query = self.db.query(Application.fit_index).filter(Application.fit_index.isnot(None))

        if job_id:
            query = query.filter(Application.job_id == job_id)
        elif company_id:
            query = query.join(Job, Application.job_id == Job.id).filter(Job.company_id == company_id)
        else:
            raise ValueError("Either job_id or company_id must be provided")

        fit_indices = [row[0] for row in query.all()]

        if not fit_indices:
            return None

        return sum(fit_indices) / len(fit_indices)

    def calculate_interview_show_up_rate(self, company_id: UUID) -> float:
        """
        Calculate percentage of scheduled interviews attended.

        Args:
            company_id: Company UUID

        Returns:
            Show-up rate (0.0-1.0)
        """
        # Get all completed interviews for company
        interviews = (
            self.db.query(InterviewSchedule)
            .join(Application, InterviewSchedule.application_id == Application.id)
            .join(Job, Application.job_id == Job.id)
            .filter(
                and_(
                    Job.company_id == company_id,
                    InterviewSchedule.status == "completed",
                    InterviewSchedule.candidate_showed_up.isnot(None),
                )
            )
            .all()
        )

        if not interviews:
            return 0.0

        showed_up_count = len([i for i in interviews if i.candidate_showed_up])
        return showed_up_count / len(interviews)

    def calculate_offer_acceptance_rate(self, company_id: UUID) -> float:
        """
        Calculate percentage of offers accepted.

        Args:
            company_id: Company UUID

        Returns:
            Acceptance rate (0.0-1.0)
        """
        # Get all applications that reached offer stage
        offers = (
            self.db.query(Application)
            .join(Job, Application.job_id == Job.id)
            .filter(
                and_(
                    Job.company_id == company_id,
                    Application.status.in_(["offer", "hired", "rejected"]),
                )
            )
            .all()
        )

        # Filter to those that were actually offered (had offer status at some point)
        offered_apps = [app for app in offers if app.status in ["offer", "hired"]]

        if not offered_apps:
            return 0.0

        accepted_count = len([app for app in offered_apps if app.status == "hired"])
        return accepted_count / len(offered_apps)

    def calculate_retention_rate(self, company_id: UUID, months: int = 6) -> float:
        """
        Calculate retention rate for hired candidates.

        Args:
            company_id: Company UUID
            months: Retention period in months (default: 6)

        Returns:
            Retention rate (0.0-1.0)
        """
        # Get applications hired N+ months ago
        cutoff_date = datetime.utcnow() - timedelta(days=months * 30)

        hired_apps = (
            self.db.query(Application)
            .join(Job, Application.job_id == Job.id)
            .filter(
                and_(
                    Job.company_id == company_id,
                    Application.status == "hired",
                    Application.updated_at <= cutoff_date,
                )
            )
            .all()
        )

        if not hired_apps:
            return 0.0

        # For now, assume all are still active (would need employee status tracking)
        # In production, this would check an employee table or status field
        still_active_count = len(hired_apps)  # Placeholder
        return still_active_count / len(hired_apps)

    # =========================================================================
    # COST METRICS
    # =========================================================================

    def calculate_cost_per_application(
        self, company_id: UUID, start_date: date, end_date: date
    ) -> Optional[Decimal]:
        """
        Calculate subscription cost per application.

        Args:
            company_id: Company UUID
            start_date: Start of period
            end_date: End of period

        Returns:
            Cost per application, or None if no data
        """
        # Get subscription cost
        subscription = (
            self.db.query(CompanySubscription)
            .filter(CompanySubscription.company_id == company_id)
            .first()
        )

        if not subscription:
            return None

        # Count applications in period
        app_count = (
            self.db.query(func.count(Application.id))
            .join(Job, Application.job_id == Job.id)
            .filter(
                and_(
                    Job.company_id == company_id,
                    Application.created_at >= datetime.combine(start_date, datetime.min.time()),
                    Application.created_at <= datetime.combine(end_date, datetime.max.time()),
                )
            )
            .scalar()
        )

        if app_count == 0:
            return None

        # Get monthly cost (assuming subscription has monthly_cost field)
        monthly_cost = Decimal(str(subscription.monthly_cost)) if hasattr(subscription, 'monthly_cost') else Decimal("99.00")
        
        return monthly_cost / Decimal(str(app_count))

    def calculate_cost_per_hire(
        self, company_id: UUID, start_date: date, end_date: date
    ) -> Optional[Decimal]:
        """
        Calculate subscription cost per successful hire.

        Args:
            company_id: Company UUID
            start_date: Start of period
            end_date: End of period

        Returns:
            Cost per hire, or None if no hires
        """
        subscription = (
            self.db.query(CompanySubscription)
            .filter(CompanySubscription.company_id == company_id)
            .first()
        )

        if not subscription:
            return None

        # Count hires in period
        hire_count = (
            self.db.query(func.count(Application.id))
            .join(Job, Application.job_id == Job.id)
            .filter(
                and_(
                    Job.company_id == company_id,
                    Application.status == "hired",
                    Application.created_at >= datetime.combine(start_date, datetime.min.time()),
                    Application.created_at <= datetime.combine(end_date, datetime.max.time()),
                )
            )
            .scalar()
        )

        if hire_count == 0:
            return None

        monthly_cost = Decimal(str(subscription.monthly_cost)) if hasattr(subscription, 'monthly_cost') else Decimal("99.00")
        return monthly_cost / Decimal(str(hire_count))

    def calculate_roi(self, job_id: UUID, hire_value: Decimal = Decimal("5000.00")) -> Optional[Decimal]:
        """
        Calculate ROI for a job posting.

        Args:
            job_id: Job UUID
            hire_value: Estimated value of a successful hire (default: $5000)

        Returns:
            ROI ratio, or None if no hires
        """
        # Get hire count for job
        hire_count = (
            self.db.query(func.count(Application.id))
            .filter(
                and_(
                    Application.job_id == job_id,
                    Application.status == "hired",
                )
            )
            .scalar()
        )

        if hire_count == 0:
            return None

        # Estimate job cost (could be more sophisticated)
        job_cost = Decimal("10.00")  # Placeholder

        total_value = hire_value * hire_count
        roi = (total_value - job_cost) / job_cost

        return roi

    # =========================================================================
    # SNAPSHOT MANAGEMENT
    # =========================================================================

    def generate_daily_snapshot(self, company_id: UUID, snapshot_date: date):
        """
        Generate and cache daily analytics snapshot.

        Args:
            company_id: Company UUID
            snapshot_date: Date for snapshot
        """
        # Calculate all metrics for the day
        metrics = {
            "sourcing": self.calculate_sourcing_metrics(
                company_id, snapshot_date, snapshot_date
            ),
            "pipeline": self.calculate_pipeline_funnel(company_id=company_id),
        }

        # Create snapshot
        snapshot = AnalyticsSnapshot(
            company_id=company_id,
            snapshot_date=snapshot_date,
            metric_type="daily_aggregate",
            metrics=metrics,
        )

        self.db.add(snapshot)
        self.db.commit()

    def get_cached_metrics(
        self, company_id: UUID, metric_type: str, date_range: Tuple[date, date]
    ) -> Optional[Dict[str, any]]:
        """
        Retrieve cached analytics snapshots.

        Args:
            company_id: Company UUID
            metric_type: Type of metrics to retrieve
            date_range: Tuple of (start_date, end_date)

        Returns:
            Cached metrics dict, or None if not cached
        """
        start_date, end_date = date_range

        snapshot = (
            self.db.query(AnalyticsSnapshot)
            .filter(
                and_(
                    AnalyticsSnapshot.company_id == company_id,
                    AnalyticsSnapshot.metric_type == metric_type,
                    AnalyticsSnapshot.snapshot_date >= start_date,
                    AnalyticsSnapshot.snapshot_date <= end_date,
                )
            )
            .first()
        )

        return snapshot.metrics if snapshot else None
