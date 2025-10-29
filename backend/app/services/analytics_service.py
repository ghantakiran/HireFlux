"""Analytics Service for Job Insights Dashboard"""
import logging
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.db.models.application import Application
from app.db.models.audit import EventAudit
from app.db.models.interview import InterviewSession
from app.db.models.job import Job, MatchScore
from app.db.models.webhook import ApplicationStatusHistory, InterviewSchedule
from app.schemas.analytics import (
    ActivityItem,
    ActivityTimeline,
    ActivityType,
    Anomaly,
    AnomalyReport,
    AnomalyType,
    ApplicationPipelineStats,
    ApplicationTrend,
    BenchmarkComparison,
    ConversionFunnel,
    DashboardOverview,
    DetailedAnalytics,
    HealthScoreComponent,
    HealthScoreLevel,
    JobSearchHealthScore,
    PeerComparison,
    PipelineStageDistribution,
    SuccessMetrics,
    TimeRange,
    TimeSeriesChart,
    TimeSeriesDataPoint,
)

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Service for calculating analytics and insights"""

    def __init__(self, db: Session):
        self.db = db

    # =========================================================================
    # TIME RANGE HELPERS
    # =========================================================================

    def _get_date_range(self, time_range: TimeRange) -> tuple[datetime, datetime]:
        """Get start and end dates for time range"""
        end_date = datetime.utcnow()

        if time_range == TimeRange.LAST_7_DAYS:
            start_date = end_date - timedelta(days=7)
        elif time_range == TimeRange.LAST_30_DAYS:
            start_date = end_date - timedelta(days=30)
        elif time_range == TimeRange.LAST_90_DAYS:
            start_date = end_date - timedelta(days=90)
        else:  # ALL_TIME
            start_date = datetime(2020, 1, 1)  # Platform launch date

        return start_date, end_date

    # =========================================================================
    # APPLICATION PIPELINE STATS
    # =========================================================================

    def get_pipeline_stats(
        self, user_id: UUID, time_range: TimeRange = TimeRange.LAST_30_DAYS
    ) -> ApplicationPipelineStats:
        """Calculate application pipeline statistics"""
        start_date, end_date = self._get_date_range(time_range)

        # Get all applications in time range
        applications = (
            self.db.query(Application)
            .filter(
                and_(
                    Application.user_id == user_id,
                    Application.created_at >= start_date,
                    Application.created_at <= end_date,
                )
            )
            .all()
        )

        # Count applications by status
        status_counts = defaultdict(int)
        for app in applications:
            status_counts[app.status] += 1

        total = len(applications)

        # Calculate rates
        if total > 0:
            # Applications that moved past 'applied' status
            responses = total - status_counts.get("applied", 0)
            response_rate = (responses / total) * 100

            # Applications that reached interview stages
            interview_statuses = [
                "phone_screen",
                "technical_interview",
                "onsite_interview",
                "final_interview",
                "offer",
            ]
            interviews = sum(status_counts.get(s, 0) for s in interview_statuses)
            interview_rate = (interviews / total) * 100

            # Applications that got offers
            offers = status_counts.get("offer", 0)
            offer_rate = (offers / total) * 100
        else:
            response_rate = 0.0
            interview_rate = 0.0
            offer_rate = 0.0

        return ApplicationPipelineStats(
            total_applications=total,
            saved=status_counts.get("saved", 0),
            applied=status_counts.get("applied", 0),
            in_review=status_counts.get("in_review", 0),
            phone_screen=status_counts.get("phone_screen", 0),
            technical_interview=status_counts.get("technical_interview", 0),
            onsite_interview=status_counts.get("onsite_interview", 0),
            final_interview=status_counts.get("final_interview", 0),
            offer=status_counts.get("offer", 0),
            rejected=status_counts.get("rejected", 0),
            withdrawn=status_counts.get("withdrawn", 0),
            response_rate=response_rate,
            interview_rate=interview_rate,
            offer_rate=offer_rate,
        )

    def get_pipeline_distribution(
        self, user_id: UUID, time_range: TimeRange = TimeRange.LAST_30_DAYS
    ) -> List[PipelineStageDistribution]:
        """Get distribution of applications across pipeline stages"""
        stats = self.get_pipeline_stats(user_id, time_range)
        total = stats.total_applications

        if total == 0:
            return []

        stages = [
            ("Saved", stats.saved),
            ("Applied", stats.applied),
            ("In Review", stats.in_review),
            ("Phone Screen", stats.phone_screen),
            ("Technical Interview", stats.technical_interview),
            ("Onsite Interview", stats.onsite_interview),
            ("Final Interview", stats.final_interview),
            ("Offer", stats.offer),
            ("Rejected", stats.rejected),
            ("Withdrawn", stats.withdrawn),
        ]

        distribution = []
        for stage_name, count in stages:
            if count > 0:
                percentage = (count / total) * 100
                distribution.append(
                    PipelineStageDistribution(
                        stage=stage_name, count=count, percentage=percentage
                    )
                )

        return distribution

    # =========================================================================
    # SUCCESS METRICS
    # =========================================================================

    def get_success_metrics(
        self, user_id: UUID, time_range: TimeRange = TimeRange.LAST_30_DAYS
    ) -> SuccessMetrics:
        """Calculate comprehensive success metrics"""
        start_date, end_date = self._get_date_range(time_range)

        # Get applications
        applications = (
            self.db.query(Application)
            .filter(
                and_(
                    Application.user_id == user_id,
                    Application.created_at >= start_date,
                )
            )
            .all()
        )

        total_apps = len(applications)

        # Count by time periods
        now = datetime.utcnow()
        last_7_days = now - timedelta(days=7)
        last_30_days = now - timedelta(days=30)

        apps_last_7 = sum(1 for app in applications if app.created_at >= last_7_days)
        apps_last_30 = sum(1 for app in applications if app.created_at >= last_30_days)

        # Calculate averages
        days_in_range = (end_date - start_date).days or 1
        weeks_in_range = days_in_range / 7
        avg_per_week = total_apps / weeks_in_range if weeks_in_range > 0 else 0
        avg_per_day = total_apps / days_in_range if days_in_range > 0 else 0

        # Response metrics
        responses = sum(
            1 for app in applications if app.status not in ["saved", "applied"]
        )
        response_rate = (responses / total_apps * 100) if total_apps > 0 else 0.0

        # Calculate avg response time
        response_times = []
        for app in applications:
            if (
                app.status not in ["saved", "applied"]
                and app.applied_at
                and app.updated_at
            ):
                delta = (app.updated_at - app.applied_at).days
                if delta > 0:
                    response_times.append(delta)
        avg_response_time = (
            sum(response_times) / len(response_times) if response_times else None
        )

        # Interview metrics
        interview_statuses = [
            "phone_screen",
            "technical_interview",
            "onsite_interview",
            "final_interview",
        ]
        total_interviews = sum(
            1 for app in applications if app.status in interview_statuses
        )

        interview_conversion = (
            (total_interviews / total_apps * 100) if total_apps > 0 else 0.0
        )

        # Get interview schedules
        interviews = (
            self.db.query(InterviewSchedule)
            .filter(
                and_(
                    InterviewSchedule.user_id == user_id,
                    InterviewSchedule.created_at >= start_date,
                )
            )
            .all()
        )

        interviews_scheduled = sum(
            1 for i in interviews if i.status in ["scheduled", "confirmed"]
        )
        interviews_completed = sum(1 for i in interviews if i.status == "completed")

        # Offer metrics
        total_offers = sum(1 for app in applications if app.status == "offer")
        offer_rate = (total_offers / total_apps * 100) if total_apps > 0 else 0.0
        pending_offers = total_offers  # Simplification

        # Rejection metrics
        total_rejections = sum(1 for app in applications if app.status == "rejected")
        rejection_rate = (
            (total_rejections / total_apps * 100) if total_apps > 0 else 0.0
        )

        # Activity metrics
        active_dates = set(app.created_at.date() for app in applications)
        active_days = len(active_dates)

        # Calculate longest streak
        sorted_dates = sorted(active_dates)
        longest_streak = 1
        current_streak = 1

        for i in range(1, len(sorted_dates)):
            if (sorted_dates[i] - sorted_dates[i - 1]).days == 1:
                current_streak += 1
                longest_streak = max(longest_streak, current_streak)
            else:
                current_streak = 1

        return SuccessMetrics(
            total_applications=total_apps,
            applications_last_7_days=apps_last_7,
            applications_last_30_days=apps_last_30,
            avg_applications_per_week=round(avg_per_week, 2),
            total_responses=responses,
            response_rate=round(response_rate, 2),
            avg_response_time_days=round(avg_response_time, 1)
            if avg_response_time
            else None,
            total_interviews=total_interviews,
            interview_conversion_rate=round(interview_conversion, 2),
            interviews_scheduled=interviews_scheduled,
            interviews_completed=interviews_completed,
            total_offers=total_offers,
            offer_rate=round(offer_rate, 2),
            pending_offers=pending_offers,
            total_rejections=total_rejections,
            rejection_rate=round(rejection_rate, 2),
            active_days=active_days,
            avg_daily_applications=round(avg_per_day, 2),
            longest_streak_days=longest_streak if active_dates else 0,
        )

    # =========================================================================
    # ACTIVITY TIMELINE
    # =========================================================================

    def get_activity_timeline(
        self,
        user_id: UUID,
        skip: int = 0,
        limit: int = 20,
        activity_types: Optional[List[ActivityType]] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> ActivityTimeline:
        """Get user activity timeline"""
        # Query event audit logs
        query = self.db.query(EventAudit).filter(EventAudit.user_id == user_id)

        if activity_types:
            query = query.filter(
                EventAudit.event_type.in_([t.value for t in activity_types])
            )

        if start_date:
            query = query.filter(EventAudit.created_at >= start_date)

        if end_date:
            query = query.filter(EventAudit.created_at <= end_date)

        total_count = query.count()

        activities_db = (
            query.order_by(EventAudit.created_at.desc()).offset(skip).limit(limit).all()
        )

        activities = [
            ActivityItem(
                id=event.id,
                activity_type=ActivityType(event.event_type),
                title=event.event_type.replace("_", " ").title(),
                description=event.event_data.get("description")
                if event.event_data
                else None,
                entity_id=event.entity_id,
                entity_type=event.entity_type,
                metadata=event.event_data,
                created_at=event.created_at,
            )
            for event in activities_db
        ]

        has_more = (skip + len(activities)) < total_count

        return ActivityTimeline(
            activities=activities, total_count=total_count, has_more=has_more
        )

    # =========================================================================
    # HEALTH SCORE
    # =========================================================================

    def get_health_score(self, user_id: UUID) -> JobSearchHealthScore:
        """Calculate job search health score"""
        # Get metrics for last 30 days
        metrics = self.get_success_metrics(user_id, TimeRange.LAST_30_DAYS)

        # Calculate component scores
        activity_score = self._calculate_activity_score(metrics)
        quality_score = self._calculate_quality_score(metrics)
        response_score = self._calculate_response_score(metrics)
        success_score = self._calculate_success_score(metrics)

        # Weighted average
        weights = {
            "activity": 0.25,
            "quality": 0.20,
            "response": 0.30,
            "success": 0.25,
        }

        overall_score = (
            activity_score * weights["activity"]
            + quality_score * weights["quality"]
            + response_score * weights["response"]
            + success_score * weights["success"]
        )

        # Determine level
        if overall_score >= 80:
            level = HealthScoreLevel.EXCELLENT
        elif overall_score >= 60:
            level = HealthScoreLevel.GOOD
        elif overall_score >= 40:
            level = HealthScoreLevel.FAIR
        else:
            level = HealthScoreLevel.NEEDS_IMPROVEMENT

        # Build components
        components = [
            HealthScoreComponent(
                name="Activity",
                score=activity_score,
                weight=weights["activity"],
                recommendation=self._get_activity_recommendation(activity_score),
            ),
            HealthScoreComponent(
                name="Quality",
                score=quality_score,
                weight=weights["quality"],
                recommendation=self._get_quality_recommendation(quality_score),
            ),
            HealthScoreComponent(
                name="Response Rate",
                score=response_score,
                weight=weights["response"],
                recommendation=self._get_response_recommendation(response_score),
            ),
            HealthScoreComponent(
                name="Success Rate",
                score=success_score,
                weight=weights["success"],
                recommendation=self._get_success_recommendation(success_score),
            ),
        ]

        # Generate recommendations
        recommendations = self._generate_health_recommendations(
            metrics, activity_score, response_score, success_score
        )

        strengths = []
        areas_for_improvement = []

        for component in components:
            if component.score >= 80:
                strengths.append(f"Strong {component.name.lower()}")
            elif component.score < 60:
                areas_for_improvement.append(f"Improve {component.name.lower()}")

        return JobSearchHealthScore(
            overall_score=round(overall_score, 1),
            level=level,
            components=components,
            activity_score=round(activity_score, 1),
            quality_score=round(quality_score, 1),
            response_score=round(response_score, 1),
            success_score=round(success_score, 1),
            recommendations=recommendations,
            strengths=strengths,
            areas_for_improvement=areas_for_improvement,
        )

    def _calculate_activity_score(self, metrics: SuccessMetrics) -> float:
        """Calculate activity component score"""
        # Based on applications per week and active days
        apps_per_week = metrics.avg_applications_per_week
        active_ratio = metrics.active_days / 30 if metrics.active_days <= 30 else 1.0

        # Ideal is 5-10 apps per week
        if apps_per_week >= 5:
            app_score = min(100, (apps_per_week / 10) * 100)
        else:
            app_score = (apps_per_week / 5) * 70

        activity_score = (app_score * 0.6) + (active_ratio * 100 * 0.4)

        return min(100, activity_score)

    def _calculate_quality_score(self, metrics: SuccessMetrics) -> float:
        """Calculate quality component score"""
        # Based on response and interview rates
        if metrics.total_applications == 0:
            return 0.0

        # Good response rate is 40%+
        response_score = min(100, (metrics.response_rate / 40) * 100)

        # Good interview rate is 20%+
        interview_score = min(100, (metrics.interview_conversion_rate / 20) * 100)

        quality_score = (response_score * 0.5) + (interview_score * 0.5)

        return quality_score

    def _calculate_response_score(self, metrics: SuccessMetrics) -> float:
        """Calculate response component score"""
        if metrics.total_applications == 0:
            return 0.0

        # Lower rejection rate is better
        rejection_penalty = min(100, metrics.rejection_rate)
        response_bonus = min(100, metrics.response_rate)

        response_score = response_bonus - (rejection_penalty * 0.5)

        return max(0, response_score)

    def _calculate_success_score(self, metrics: SuccessMetrics) -> float:
        """Calculate success component score"""
        if metrics.total_applications == 0:
            return 0.0

        # Based on offers and interviews
        offer_score = min(100, (metrics.offer_rate / 10) * 100)
        interview_score = min(100, (metrics.interview_conversion_rate / 30) * 100)

        success_score = (offer_score * 0.6) + (interview_score * 0.4)

        return success_score

    def _get_activity_recommendation(self, score: float) -> str:
        """Get activity recommendation"""
        if score < 50:
            return "Increase application volume to 5-10 per week"
        elif score < 80:
            return "Maintain consistent application activity"
        else:
            return "Excellent application activity!"

    def _get_quality_recommendation(self, score: float) -> str:
        """Get quality recommendation"""
        if score < 50:
            return "Focus on targeting better-matched roles"
        elif score < 80:
            return "Continue improving application quality"
        else:
            return "Great job targeting relevant roles!"

    def _get_response_recommendation(self, score: float) -> str:
        """Get response recommendation"""
        if score < 50:
            return "Review and improve your application materials"
        elif score < 80:
            return "Good response rate, keep optimizing"
        else:
            return "Excellent response rate!"

    def _get_success_recommendation(self, score: float) -> str:
        """Get success recommendation"""
        if score < 50:
            return "Focus on interview preparation and follow-ups"
        elif score < 80:
            return "Good progress, keep improving"
        else:
            return "Outstanding success rate!"

    def _generate_health_recommendations(
        self, metrics: SuccessMetrics, activity: float, response: float, success: float
    ) -> List[str]:
        """Generate actionable recommendations"""
        recommendations = []

        if activity < 60:
            recommendations.append(
                "Apply to 5-10 jobs per week to increase opportunities"
            )

        if response < 50:
            recommendations.append("Use AI Resume Builder to optimize for ATS systems")

        if metrics.interview_conversion_rate < 15:
            recommendations.append(
                "Practice with Interview Coach to improve success rate"
            )

        if metrics.rejection_rate > 60:
            recommendations.append(
                "Target roles with higher fit scores (70+) for better results"
            )

        if metrics.active_days < 15:
            recommendations.append("Maintain consistent activity for better results")

        if not recommendations:
            recommendations.append("Keep up the great work!")

        return recommendations

    # =========================================================================
    # ANOMALY DETECTION
    # =========================================================================

    def detect_anomalies(self, user_id: UUID) -> AnomalyReport:
        """Detect anomalies in job search activity"""
        anomalies = []

        metrics = self.get_success_metrics(user_id, TimeRange.LAST_30_DAYS)

        # Low activity
        if metrics.applications_last_7_days == 0:
            anomalies.append(
                Anomaly(
                    type=AnomalyType.LOW_ACTIVITY,
                    severity="high",
                    title="No Recent Activity",
                    description="No applications submitted in the last 7 days",
                    recommendation="Resume your job search to maintain momentum",
                    detected_at=datetime.utcnow(),
                    metadata={"days_inactive": 7},
                )
            )

        # High rejection rate
        if metrics.rejection_rate > 70 and metrics.total_applications >= 10:
            anomalies.append(
                Anomaly(
                    type=AnomalyType.HIGH_REJECTION_RATE,
                    severity="critical",
                    title="High Rejection Rate",
                    description=f"Rejection rate is {metrics.rejection_rate:.1f}%",
                    recommendation="Review and improve application materials with AI assistance",
                    detected_at=datetime.utcnow(),
                    metadata={"rejection_rate": metrics.rejection_rate},
                )
            )

        # No responses
        if metrics.response_rate < 10 and metrics.total_applications >= 10:
            anomalies.append(
                Anomaly(
                    type=AnomalyType.NO_RESPONSES,
                    severity="high",
                    title="Very Low Response Rate",
                    description=f"Only {metrics.response_rate:.1f}% response rate",
                    recommendation="Optimize your resume and target better-matched roles",
                    detected_at=datetime.utcnow(),
                    metadata={"response_rate": metrics.response_rate},
                )
            )

        # Stale applications
        start_date, _ = self._get_date_range(TimeRange.LAST_90_DAYS)
        stale_cutoff = datetime.utcnow() - timedelta(days=60)

        stale_apps = (
            self.db.query(Application)
            .filter(
                and_(
                    Application.user_id == user_id,
                    Application.created_at >= start_date,
                    Application.updated_at < stale_cutoff,
                    Application.status.in_(["applied", "in_review"]),
                )
            )
            .count()
        )

        if stale_apps >= 5:
            anomalies.append(
                Anomaly(
                    type=AnomalyType.STALE_APPLICATIONS,
                    severity="medium",
                    title="Stale Applications Detected",
                    description=f"{stale_apps} applications with no updates in 60+ days",
                    recommendation="Follow up on pending applications or mark as closed",
                    detected_at=datetime.utcnow(),
                    metadata={"stale_count": stale_apps},
                )
            )

        # Interview conversion drop
        if metrics.interview_conversion_rate < 10 and metrics.total_applications >= 20:
            anomalies.append(
                Anomaly(
                    type=AnomalyType.INTERVIEW_CONVERSION_DROP,
                    severity="high",
                    title="Low Interview Conversion",
                    description=f"Only {metrics.interview_conversion_rate:.1f}% getting interviews",
                    recommendation="Use Job Match Engine to target higher-fit roles",
                    detected_at=datetime.utcnow(),
                    metadata={"conversion_rate": metrics.interview_conversion_rate},
                )
            )

        critical_count = sum(1 for a in anomalies if a.severity == "critical")
        high_count = sum(1 for a in anomalies if a.severity == "high")

        return AnomalyReport(
            anomalies=anomalies,
            total_count=len(anomalies),
            critical_count=critical_count,
            high_count=high_count,
        )

    # =========================================================================
    # TRENDS AND TIME SERIES
    # =========================================================================

    def get_application_trends(
        self, user_id: UUID, time_range: TimeRange = TimeRange.LAST_30_DAYS
    ) -> List[ApplicationTrend]:
        """Get application trends over time"""
        start_date, end_date = self._get_date_range(time_range)

        applications = (
            self.db.query(Application)
            .filter(
                and_(
                    Application.user_id == user_id,
                    Application.created_at >= start_date,
                    Application.created_at <= end_date,
                )
            )
            .all()
        )

        # Group by date
        trends_dict: Dict[datetime, ApplicationTrend] = {}

        for app in applications:
            date_key = app.created_at.date()

            if date_key not in trends_dict:
                trends_dict[date_key] = ApplicationTrend(
                    date=datetime.combine(date_key, datetime.min.time()),
                    applications_submitted=0,
                    responses_received=0,
                    interviews_scheduled=0,
                    offers_received=0,
                )

            trends_dict[date_key].applications_submitted += 1

            if app.status not in ["saved", "applied"]:
                trends_dict[date_key].responses_received += 1

            if app.status in [
                "phone_screen",
                "technical_interview",
                "onsite_interview",
                "final_interview",
            ]:
                trends_dict[date_key].interviews_scheduled += 1

            if app.status == "offer":
                trends_dict[date_key].offers_received += 1

        return sorted(trends_dict.values(), key=lambda x: x.date)

    def get_time_series_chart(
        self, user_id: UUID, metric: str, time_range: TimeRange
    ) -> TimeSeriesChart:
        """Get time series chart data for a metric"""
        trends = self.get_application_trends(user_id, time_range)

        if metric == "applications":
            data_points = [
                TimeSeriesDataPoint(
                    date=trend.date,
                    value=float(trend.applications_submitted),
                    label=f"{trend.applications_submitted} apps",
                )
                for trend in trends
            ]
        elif metric == "responses":
            data_points = [
                TimeSeriesDataPoint(
                    date=trend.date,
                    value=float(trend.responses_received),
                    label=f"{trend.responses_received} responses",
                )
                for trend in trends
            ]
        elif metric == "interviews":
            data_points = [
                TimeSeriesDataPoint(
                    date=trend.date,
                    value=float(trend.interviews_scheduled),
                    label=f"{trend.interviews_scheduled} interviews",
                )
                for trend in trends
            ]
        else:
            data_points = []

        # Determine trend direction
        if len(data_points) >= 2:
            first_half = sum(dp.value for dp in data_points[: len(data_points) // 2])
            second_half = sum(dp.value for dp in data_points[len(data_points) // 2 :])

            if second_half > first_half * 1.1:
                trend = "increasing"
            elif second_half < first_half * 0.9:
                trend = "decreasing"
            else:
                trend = "stable"

            change_pct = (
                ((second_half - first_half) / first_half * 100) if first_half > 0 else 0
            )
        else:
            trend = "stable"
            change_pct = 0.0

        return TimeSeriesChart(
            metric_name=metric,
            data_points=data_points,
            trend=trend,
            change_percentage=round(change_pct, 1),
        )

    # =========================================================================
    # CONVERSION FUNNEL
    # =========================================================================

    def get_conversion_funnel(
        self, user_id: UUID, time_range: TimeRange = TimeRange.LAST_30_DAYS
    ) -> List[ConversionFunnel]:
        """Calculate conversion funnel from application to offer"""
        stats = self.get_pipeline_stats(user_id, time_range)

        funnel_stages = [
            ("Applied", stats.total_applications),
            ("In Review", stats.in_review),
            (
                "Interview",
                stats.phone_screen
                + stats.technical_interview
                + stats.onsite_interview
                + stats.final_interview,
            ),
            ("Offer", stats.offer),
        ]

        funnel = []
        base_count = stats.total_applications

        for stage, count in funnel_stages:
            conversion_rate = (count / base_count * 100) if base_count > 0 else 0.0
            funnel.append(
                ConversionFunnel(
                    stage=stage, count=count, conversion_rate=round(conversion_rate, 2)
                )
            )

        return funnel

    # =========================================================================
    # BENCHMARKING
    # =========================================================================

    def get_peer_comparison(self, user_id: UUID) -> PeerComparison:
        """Compare user metrics with platform benchmarks"""
        user_metrics = self.get_success_metrics(user_id, TimeRange.LAST_30_DAYS)

        # Platform averages (these would come from aggregated data in production)
        platform_avg_applications = 15.0
        platform_avg_response_rate = 35.0
        platform_avg_interview_rate = 18.0
        platform_avg_offer_rate = 8.0

        return PeerComparison(
            total_applications=BenchmarkComparison(
                metric_name="Total Applications",
                user_value=float(user_metrics.total_applications),
                platform_average=platform_avg_applications,
                percentile=self._calculate_percentile(
                    user_metrics.total_applications, platform_avg_applications
                ),
                performance=self._get_performance_level(
                    user_metrics.total_applications, platform_avg_applications
                ),
            ),
            response_rate=BenchmarkComparison(
                metric_name="Response Rate",
                user_value=user_metrics.response_rate,
                platform_average=platform_avg_response_rate,
                percentile=self._calculate_percentile(
                    user_metrics.response_rate, platform_avg_response_rate
                ),
                performance=self._get_performance_level(
                    user_metrics.response_rate, platform_avg_response_rate
                ),
            ),
            interview_rate=BenchmarkComparison(
                metric_name="Interview Rate",
                user_value=user_metrics.interview_conversion_rate,
                platform_average=platform_avg_interview_rate,
                percentile=self._calculate_percentile(
                    user_metrics.interview_conversion_rate, platform_avg_interview_rate
                ),
                performance=self._get_performance_level(
                    user_metrics.interview_conversion_rate, platform_avg_interview_rate
                ),
            ),
            offer_rate=BenchmarkComparison(
                metric_name="Offer Rate",
                user_value=user_metrics.offer_rate,
                platform_average=platform_avg_offer_rate,
                percentile=self._calculate_percentile(
                    user_metrics.offer_rate, platform_avg_offer_rate
                ),
                performance=self._get_performance_level(
                    user_metrics.offer_rate, platform_avg_offer_rate
                ),
            ),
        )

    def _calculate_percentile(self, user_value: float, platform_avg: float) -> float:
        """Calculate approximate percentile"""
        if platform_avg == 0:
            return 50.0

        ratio = user_value / platform_avg

        if ratio >= 1.5:
            return 90.0
        elif ratio >= 1.2:
            return 75.0
        elif ratio >= 0.8:
            return 50.0
        elif ratio >= 0.5:
            return 25.0
        else:
            return 10.0

    def _get_performance_level(self, user_value: float, platform_avg: float) -> str:
        """Get performance level description"""
        if platform_avg == 0:
            return "average"

        ratio = user_value / platform_avg

        if ratio >= 1.3:
            return "excellent"
        elif ratio >= 1.0:
            return "above"
        elif ratio >= 0.7:
            return "average"
        else:
            return "below"

    # =========================================================================
    # COMPREHENSIVE DASHBOARD
    # =========================================================================

    def get_dashboard_overview(self, user_id: UUID) -> DashboardOverview:
        """Get complete dashboard overview"""
        pipeline_stats = self.get_pipeline_stats(user_id, TimeRange.LAST_30_DAYS)
        success_metrics = self.get_success_metrics(user_id, TimeRange.LAST_30_DAYS)
        health_score = self.get_health_score(user_id)
        activity_timeline = self.get_activity_timeline(user_id, limit=10)
        anomalies = self.detect_anomalies(user_id)

        # Quick stats
        applications_this_week = success_metrics.applications_last_7_days
        interviews_this_week = (
            self.db.query(InterviewSchedule)
            .filter(
                and_(
                    InterviewSchedule.user_id == user_id,
                    InterviewSchedule.scheduled_at
                    >= datetime.utcnow() - timedelta(days=7),
                    InterviewSchedule.scheduled_at
                    <= datetime.utcnow() + timedelta(days=7),
                )
            )
            .count()
        )
        offers_pending = pipeline_stats.offer

        # New job matches
        new_matches = (
            self.db.query(MatchScore)
            .filter(
                and_(
                    MatchScore.user_id == user_id,
                    MatchScore.created_at >= datetime.utcnow() - timedelta(days=7),
                    MatchScore.fit_index >= 70,
                )
            )
            .count()
        )

        return DashboardOverview(
            pipeline_stats=pipeline_stats,
            success_metrics=success_metrics,
            health_score=health_score,
            recent_activity=activity_timeline.activities,
            anomalies=anomalies.anomalies,
            applications_this_week=applications_this_week,
            interviews_this_week=interviews_this_week,
            offers_pending=offers_pending,
            new_matches_count=new_matches,
        )

    def get_detailed_analytics(
        self, user_id: UUID, time_range: TimeRange = TimeRange.LAST_30_DAYS
    ) -> DetailedAnalytics:
        """Get detailed analytics with trends"""
        pipeline_stats = self.get_pipeline_stats(user_id, time_range)
        pipeline_distribution = self.get_pipeline_distribution(user_id, time_range)
        success_metrics = self.get_success_metrics(user_id, time_range)
        conversion_funnel = self.get_conversion_funnel(user_id, time_range)
        application_trends = self.get_application_trends(user_id, time_range)

        time_series_charts = [
            self.get_time_series_chart(user_id, "applications", time_range),
            self.get_time_series_chart(user_id, "responses", time_range),
            self.get_time_series_chart(user_id, "interviews", time_range),
        ]

        peer_comparison = self.get_peer_comparison(user_id)

        return DetailedAnalytics(
            time_range=time_range,
            pipeline_stats=pipeline_stats,
            pipeline_distribution=pipeline_distribution,
            success_metrics=success_metrics,
            conversion_funnel=conversion_funnel,
            application_trends=application_trends,
            time_series_charts=time_series_charts,
            peer_comparison=peer_comparison,
        )
