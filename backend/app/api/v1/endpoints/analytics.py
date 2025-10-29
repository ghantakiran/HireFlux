"""Analytics and Dashboard API endpoints"""
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, get_db
from app.db.models.user import User
from app.schemas.analytics import (
    ActivityTimeline,
    ActivityTimelineRequest,
    ActivityType,
    AnalyticsRequest,
    AnomalyReport,
    ApplicationPipelineStats,
    ApplicationTrend,
    ConversionFunnel,
    DashboardExport,
    DashboardOverview,
    DetailedAnalytics,
    JobSearchHealthScore,
    PeerComparison,
    PipelineStageDistribution,
    SuccessMetrics,
    TimeRange,
    TimeSeriesChart,
)
from app.services.analytics_service import AnalyticsService

router = APIRouter()


# ============================================================================
# DASHBOARD OVERVIEW
# ============================================================================


@router.get("/dashboard", response_model=DashboardOverview)
def get_dashboard_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get comprehensive dashboard overview

    Returns all key metrics, health score, recent activity, and anomalies
    for the authenticated user.
    """
    analytics_service = AnalyticsService(db)
    return analytics_service.get_dashboard_overview(current_user.id)


@router.get("/dashboard/detailed", response_model=DetailedAnalytics)
def get_detailed_analytics(
    time_range: TimeRange = Query(TimeRange.LAST_30_DAYS),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed analytics with trends and comparisons

    Includes pipeline stats, conversion funnel, time series data,
    and peer comparisons.
    """
    analytics_service = AnalyticsService(db)
    return analytics_service.get_detailed_analytics(current_user.id, time_range)


# ============================================================================
# APPLICATION PIPELINE
# ============================================================================


@router.get("/pipeline/stats", response_model=ApplicationPipelineStats)
def get_pipeline_stats(
    time_range: TimeRange = Query(TimeRange.LAST_30_DAYS),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get application pipeline statistics

    Returns counts and rates for each pipeline stage:
    - Total applications
    - Applications by status (saved, applied, in review, etc.)
    - Response rate, interview rate, offer rate
    """
    analytics_service = AnalyticsService(db)
    return analytics_service.get_pipeline_stats(current_user.id, time_range)


@router.get("/pipeline/distribution", response_model=List[PipelineStageDistribution])
def get_pipeline_distribution(
    time_range: TimeRange = Query(TimeRange.LAST_30_DAYS),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get distribution of applications across pipeline stages

    Returns percentage distribution showing where applications are
    concentrated in the pipeline.
    """
    analytics_service = AnalyticsService(db)
    return analytics_service.get_pipeline_distribution(current_user.id, time_range)


@router.get("/pipeline/funnel", response_model=List[ConversionFunnel])
def get_conversion_funnel(
    time_range: TimeRange = Query(TimeRange.LAST_30_DAYS),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get conversion funnel from application to offer

    Shows drop-off rates at each stage:
    Applied → In Review → Interview → Offer
    """
    analytics_service = AnalyticsService(db)
    return analytics_service.get_conversion_funnel(current_user.id, time_range)


# ============================================================================
# SUCCESS METRICS
# ============================================================================


@router.get("/metrics/success", response_model=SuccessMetrics)
def get_success_metrics(
    time_range: TimeRange = Query(TimeRange.LAST_30_DAYS),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get comprehensive success metrics

    Includes:
    - Application counts by time period
    - Response and interview rates
    - Offer and rejection rates
    - Activity metrics (active days, streaks)
    """
    analytics_service = AnalyticsService(db)
    return analytics_service.get_success_metrics(current_user.id, time_range)


# ============================================================================
# HEALTH SCORE
# ============================================================================


@router.get("/health-score", response_model=JobSearchHealthScore)
def get_health_score(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get job search health score

    Calculates an overall health score (0-100) based on:
    - Activity level
    - Application quality
    - Response rates
    - Success metrics

    Includes actionable recommendations for improvement.
    """
    analytics_service = AnalyticsService(db)
    return analytics_service.get_health_score(current_user.id)


# ============================================================================
# ACTIVITY TIMELINE
# ============================================================================


@router.get("/activity", response_model=ActivityTimeline)
def get_activity_timeline(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    activity_types: Optional[List[ActivityType]] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get user activity timeline

    Returns chronological list of user actions:
    - Resume updates
    - Applications submitted
    - Interview schedules
    - Status changes

    Supports pagination and filtering by activity type.
    """
    analytics_service = AnalyticsService(db)
    return analytics_service.get_activity_timeline(
        current_user.id,
        skip=skip,
        limit=limit,
        activity_types=activity_types,
    )


# ============================================================================
# TRENDS AND TIME SERIES
# ============================================================================


@router.get("/trends/applications", response_model=List[ApplicationTrend])
def get_application_trends(
    time_range: TimeRange = Query(TimeRange.LAST_30_DAYS),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get application trends over time

    Returns daily aggregates of:
    - Applications submitted
    - Responses received
    - Interviews scheduled
    - Offers received
    """
    analytics_service = AnalyticsService(db)
    return analytics_service.get_application_trends(current_user.id, time_range)


@router.get("/trends/timeseries/{metric}", response_model=TimeSeriesChart)
def get_time_series_chart(
    metric: str,
    time_range: TimeRange = Query(TimeRange.LAST_30_DAYS),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get time series chart data for a specific metric

    Supported metrics:
    - applications: Applications submitted over time
    - responses: Responses received over time
    - interviews: Interviews scheduled over time

    Includes trend direction (increasing/decreasing/stable)
    and percentage change.
    """
    if metric not in ["applications", "responses", "interviews"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid metric. Must be 'applications', 'responses', or 'interviews'",
        )

    analytics_service = AnalyticsService(db)
    return analytics_service.get_time_series_chart(current_user.id, metric, time_range)


# ============================================================================
# ANOMALY DETECTION
# ============================================================================


@router.get("/anomalies", response_model=AnomalyReport)
def detect_anomalies(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Detect anomalies in job search activity

    Identifies unusual patterns:
    - Low or no activity
    - High rejection rates
    - Lack of responses
    - Stale applications (no updates in 60+ days)
    - Interview conversion drops

    Each anomaly includes severity level and actionable recommendation.
    """
    analytics_service = AnalyticsService(db)
    return analytics_service.detect_anomalies(current_user.id)


# ============================================================================
# BENCHMARKING
# ============================================================================


@router.get("/benchmarks/peer-comparison", response_model=PeerComparison)
def get_peer_comparison(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Compare performance with platform averages

    Shows how user metrics compare to platform benchmarks:
    - Total applications
    - Response rate
    - Interview rate
    - Offer rate

    Includes percentile ranking and performance level
    (below/average/above/excellent).
    """
    analytics_service = AnalyticsService(db)
    return analytics_service.get_peer_comparison(current_user.id)


# ============================================================================
# QUICK STATS (for widgets)
# ============================================================================


@router.get("/quick-stats")
def get_quick_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get quick stats for dashboard widgets

    Returns minimal data for at-a-glance metrics:
    - Applications this week
    - Interviews this week
    - Pending offers
    - New job matches
    """
    analytics_service = AnalyticsService(db)
    overview = analytics_service.get_dashboard_overview(current_user.id)

    return {
        "applications_this_week": overview.applications_this_week,
        "interviews_this_week": overview.interviews_this_week,
        "offers_pending": overview.offers_pending,
        "new_matches": overview.new_matches_count,
        "health_score": overview.health_score.overall_score,
        "health_level": overview.health_score.level.value,
    }


# ============================================================================
# EXPORT
# ============================================================================


@router.get("/export", response_model=DashboardExport)
def export_dashboard_data(
    time_range: TimeRange = Query(TimeRange.LAST_30_DAYS),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export complete dashboard data

    Returns comprehensive data package including:
    - Dashboard overview
    - Detailed analytics
    - Activity timeline
    - Anomaly report

    Useful for external analysis or reporting.
    """
    from datetime import datetime

    analytics_service = AnalyticsService(db)

    overview = analytics_service.get_dashboard_overview(current_user.id)
    detailed = analytics_service.get_detailed_analytics(current_user.id, time_range)
    activity = analytics_service.get_activity_timeline(current_user.id, limit=100)
    anomalies = analytics_service.detect_anomalies(current_user.id)

    return DashboardExport(
        user_id=current_user.id,
        generated_at=datetime.utcnow(),
        time_range=time_range,
        overview=overview,
        detailed_analytics=detailed,
        activity_timeline=activity,
        anomaly_report=anomalies,
    )


# ============================================================================
# ADMIN ENDPOINTS (for platform analytics)
# ============================================================================


@router.get("/admin/platform-stats")
def get_platform_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get platform-wide statistics (admin only)

    Returns aggregated metrics across all users.
    In production, this would require admin role check.
    """
    # TODO: Add admin role check
    # if not current_user.is_admin:
    #     raise HTTPException(status_code=403, detail="Admin access required")

    from app.db.models.application import Application

    # Simple platform stats
    total_applications = db.query(Application).count()
    total_users = db.query(User).count()

    return {
        "total_users": total_users,
        "total_applications": total_applications,
        "avg_applications_per_user": (
            round(total_applications / total_users, 2) if total_users > 0 else 0
        ),
    }
