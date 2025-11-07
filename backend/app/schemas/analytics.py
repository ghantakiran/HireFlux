"""Analytics and Dashboard schemas"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================================
# ENUMS
# ============================================================================


class TimeRange(str, Enum):
    """Time range for analytics"""

    LAST_7_DAYS = "last_7_days"
    LAST_30_DAYS = "last_30_days"
    LAST_90_DAYS = "last_90_days"
    ALL_TIME = "all_time"


class ActivityType(str, Enum):
    """Types of user activities"""

    RESUME_CREATED = "resume_created"
    RESUME_UPDATED = "resume_updated"
    COVER_LETTER_GENERATED = "cover_letter_generated"
    JOB_SAVED = "job_saved"
    APPLICATION_SUBMITTED = "application_submitted"
    APPLICATION_STATUS_CHANGED = "application_status_changed"
    INTERVIEW_SCHEDULED = "interview_scheduled"
    INTERVIEW_COMPLETED = "interview_completed"
    AUTO_APPLY_CONFIGURED = "auto_apply_configured"


class HealthScoreLevel(str, Enum):
    """Health score levels"""

    EXCELLENT = "excellent"  # 80-100
    GOOD = "good"  # 60-79
    FAIR = "fair"  # 40-59
    NEEDS_IMPROVEMENT = "needs_improvement"  # 0-39


class AnomalyType(str, Enum):
    """Types of anomalies detected"""

    LOW_ACTIVITY = "low_activity"
    HIGH_REJECTION_RATE = "high_rejection_rate"
    NO_RESPONSES = "no_responses"
    STALE_APPLICATIONS = "stale_applications"
    INTERVIEW_CONVERSION_DROP = "interview_conversion_drop"


# ============================================================================
# APPLICATION PIPELINE SCHEMAS
# ============================================================================


class ApplicationPipelineStats(BaseModel):
    """Application pipeline statistics"""

    total_applications: int = 0
    saved: int = 0  # Jobs saved but not applied
    applied: int = 0  # Applications submitted
    in_review: int = 0  # Under review by employer
    phone_screen: int = 0
    technical_interview: int = 0
    onsite_interview: int = 0
    final_interview: int = 0
    offer: int = 0
    rejected: int = 0
    withdrawn: int = 0

    # Percentages
    response_rate: float = Field(0.0, ge=0, le=100)  # % that moved past 'applied'
    interview_rate: float = Field(0.0, ge=0, le=100)  # % that got interviews
    offer_rate: float = Field(0.0, ge=0, le=100)  # % that got offers


class PipelineStageDistribution(BaseModel):
    """Distribution of applications across pipeline stages"""

    stage: str
    count: int
    percentage: float = Field(..., ge=0, le=100)


class ApplicationTrend(BaseModel):
    """Application trends over time"""

    date: datetime
    applications_submitted: int
    responses_received: int
    interviews_scheduled: int
    offers_received: int


# ============================================================================
# SUCCESS METRICS SCHEMAS
# ============================================================================


class SuccessMetrics(BaseModel):
    """Overall success metrics"""

    # Application metrics
    total_applications: int
    applications_last_7_days: int
    applications_last_30_days: int
    avg_applications_per_week: float

    # Response metrics
    total_responses: int
    response_rate: float = Field(..., ge=0, le=100)
    avg_response_time_days: Optional[float] = None

    # Interview metrics
    total_interviews: int
    interview_conversion_rate: float = Field(..., ge=0, le=100)
    interviews_scheduled: int
    interviews_completed: int

    # Offer metrics
    total_offers: int
    offer_rate: float = Field(..., ge=0, le=100)
    pending_offers: int

    # Rejection metrics
    total_rejections: int
    rejection_rate: float = Field(..., ge=0, le=100)

    # Activity metrics
    active_days: int  # Days with activity
    avg_daily_applications: float
    longest_streak_days: int


class ConversionFunnel(BaseModel):
    """Conversion funnel from application to offer"""

    stage: str
    count: int
    conversion_rate: float = Field(..., ge=0, le=100)


# ============================================================================
# ACTIVITY TIMELINE SCHEMAS
# ============================================================================


class ActivityItem(BaseModel):
    """Individual activity item"""

    id: UUID
    activity_type: ActivityType
    title: str
    description: Optional[str] = None
    entity_id: Optional[UUID] = None  # ID of related job/application/etc
    entity_type: Optional[str] = None  # 'job', 'application', 'resume', etc
    metadata: Optional[Dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ActivityTimeline(BaseModel):
    """Activity timeline with pagination"""

    activities: List[ActivityItem]
    total_count: int
    has_more: bool


# ============================================================================
# JOB SEARCH HEALTH SCORE SCHEMAS
# ============================================================================


class HealthScoreComponent(BaseModel):
    """Individual component of health score"""

    name: str
    score: float = Field(..., ge=0, le=100)
    weight: float = Field(..., ge=0, le=1)
    recommendation: Optional[str] = None


class JobSearchHealthScore(BaseModel):
    """Overall job search health score"""

    overall_score: float = Field(..., ge=0, le=100)
    level: HealthScoreLevel
    components: List[HealthScoreComponent]

    # Component scores
    activity_score: float = Field(..., ge=0, le=100)
    quality_score: float = Field(..., ge=0, le=100)
    response_score: float = Field(..., ge=0, le=100)
    success_score: float = Field(..., ge=0, le=100)

    # Recommendations
    recommendations: List[str]
    strengths: List[str]
    areas_for_improvement: List[str]


# ============================================================================
# ANOMALY DETECTION SCHEMAS
# ============================================================================


class Anomaly(BaseModel):
    """Detected anomaly"""

    type: AnomalyType
    severity: str = Field(..., pattern="^(low|medium|high|critical)$")
    title: str
    description: str
    recommendation: str
    detected_at: datetime
    metadata: Optional[Dict] = None


class AnomalyReport(BaseModel):
    """Anomaly detection report"""

    anomalies: List[Anomaly]
    total_count: int
    critical_count: int
    high_count: int


# ============================================================================
# COMPARATIVE ANALYTICS SCHEMAS
# ============================================================================


class BenchmarkComparison(BaseModel):
    """Comparison with platform benchmarks"""

    metric_name: str
    user_value: float
    platform_average: float
    percentile: float = Field(..., ge=0, le=100)
    performance: str = Field(..., pattern="^(below|average|above|excellent)$")


class PeerComparison(BaseModel):
    """Comparison with similar users"""

    total_applications: BenchmarkComparison
    response_rate: BenchmarkComparison
    interview_rate: BenchmarkComparison
    offer_rate: BenchmarkComparison
    avg_time_to_offer: Optional[BenchmarkComparison] = None


# ============================================================================
# TIME SERIES SCHEMAS
# ============================================================================


class TimeSeriesDataPoint(BaseModel):
    """Single data point in time series"""

    date: datetime
    value: float
    label: Optional[str] = None


class TimeSeriesChart(BaseModel):
    """Time series chart data"""

    metric_name: str
    data_points: List[TimeSeriesDataPoint]
    trend: str = Field(..., pattern="^(increasing|decreasing|stable)$")
    change_percentage: float


# ============================================================================
# COMPREHENSIVE DASHBOARD SCHEMAS
# ============================================================================


class DashboardOverview(BaseModel):
    """Complete dashboard overview"""

    pipeline_stats: ApplicationPipelineStats
    success_metrics: SuccessMetrics
    health_score: JobSearchHealthScore
    recent_activity: List[ActivityItem] = Field(default_factory=list, max_length=10)
    anomalies: List[Anomaly] = Field(default_factory=list)

    # Quick stats
    applications_this_week: int
    interviews_this_week: int
    offers_pending: int
    new_matches_count: int


class DetailedAnalytics(BaseModel):
    """Detailed analytics with trends"""

    time_range: TimeRange
    pipeline_stats: ApplicationPipelineStats
    pipeline_distribution: List[PipelineStageDistribution]
    success_metrics: SuccessMetrics
    conversion_funnel: List[ConversionFunnel]
    application_trends: List[ApplicationTrend]
    time_series_charts: List[TimeSeriesChart]
    peer_comparison: Optional[PeerComparison] = None


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================


class AnalyticsRequest(BaseModel):
    """Request for analytics data"""

    time_range: TimeRange = TimeRange.LAST_30_DAYS
    include_trends: bool = True
    include_comparison: bool = False


class ActivityTimelineRequest(BaseModel):
    """Request for activity timeline"""

    skip: int = Field(0, ge=0)
    limit: int = Field(20, ge=1, le=100)
    activity_types: Optional[List[ActivityType]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


# ============================================================================
# EXPORT SCHEMAS
# ============================================================================


class DashboardExport(BaseModel):
    """Exportable dashboard data"""

    user_id: UUID
    generated_at: datetime
    time_range: TimeRange
    overview: DashboardOverview
    detailed_analytics: DetailedAnalytics
    activity_timeline: ActivityTimeline
    anomaly_report: AnomalyReport
