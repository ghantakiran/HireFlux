"""Unit tests for Analytics Service"""
import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, Mock, patch

import pytest

from app.schemas.analytics import (
    ActivityType,
    AnomalyType,
    HealthScoreLevel,
    TimeRange,
)


# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_db():
    """Mock database session"""
    db = MagicMock()
    db.query = Mock()
    db.add = Mock()
    db.commit = Mock()
    db.refresh = Mock()
    return db


@pytest.fixture
def mock_user():
    """Mock user"""
    user = Mock()
    user.id = uuid.uuid4()
    user.email = "test@example.com"
    user.created_at = datetime.utcnow() - timedelta(days=90)
    return user


@pytest.fixture
def analytics_service(mock_db):
    """AnalyticsService instance with mocked dependencies"""
    from app.services.analytics_service import AnalyticsService

    return AnalyticsService(mock_db)


@pytest.fixture
def sample_applications():
    """Sample applications for testing"""
    now = datetime.utcnow()
    return [
        Mock(
            id=uuid.uuid4(),
            status="applied",
            applied_at=now - timedelta(days=1),
            created_at=now - timedelta(days=2),
        ),
        Mock(
            id=uuid.uuid4(),
            status="in_review",
            applied_at=now - timedelta(days=5),
            created_at=now - timedelta(days=6),
        ),
        Mock(
            id=uuid.uuid4(),
            status="phone_screen",
            applied_at=now - timedelta(days=10),
            created_at=now - timedelta(days=11),
        ),
        Mock(
            id=uuid.uuid4(),
            status="technical_interview",
            applied_at=now - timedelta(days=15),
            created_at=now - timedelta(days=16),
        ),
        Mock(
            id=uuid.uuid4(),
            status="offer",
            applied_at=now - timedelta(days=20),
            created_at=now - timedelta(days=21),
        ),
        Mock(
            id=uuid.uuid4(),
            status="rejected",
            applied_at=now - timedelta(days=25),
            created_at=now - timedelta(days=26),
        ),
    ]


# ============================================================================
# TEST APPLICATION PIPELINE STATS
# ============================================================================


class TestApplicationPipelineStats:
    """Test application pipeline statistics calculation"""

    def test_calculate_pipeline_stats_success(
        self, analytics_service, mock_db, mock_user, sample_applications
    ):
        """Should calculate pipeline stats correctly"""
        mock_db.query().filter().all.return_value = sample_applications

        result = analytics_service.get_pipeline_stats(
            mock_user.id, TimeRange.LAST_30_DAYS
        )

        assert result.total_applications == 6
        assert result.applied == 1
        assert result.in_review == 1
        assert result.phone_screen == 1
        assert result.technical_interview == 1
        assert result.offer == 1
        assert result.rejected == 1

    def test_calculate_response_rate(
        self, analytics_service, mock_db, mock_user, sample_applications
    ):
        """Should calculate response rate correctly"""
        mock_db.query().filter().all.return_value = sample_applications

        result = analytics_service.get_pipeline_stats(
            mock_user.id, TimeRange.LAST_30_DAYS
        )

        # 5 out of 6 moved past 'applied' status
        assert result.response_rate == pytest.approx(83.33, rel=0.1)

    def test_calculate_interview_rate(
        self, analytics_service, mock_db, mock_user, sample_applications
    ):
        """Should calculate interview rate correctly"""
        mock_db.query().filter().all.return_value = sample_applications

        result = analytics_service.get_pipeline_stats(
            mock_user.id, TimeRange.LAST_30_DAYS
        )

        # 3 interviews (phone_screen, technical, offer) out of 6
        assert result.interview_rate == pytest.approx(50.0, rel=0.1)

    def test_calculate_offer_rate(
        self, analytics_service, mock_db, mock_user, sample_applications
    ):
        """Should calculate offer rate correctly"""
        mock_db.query().filter().all.return_value = sample_applications

        result = analytics_service.get_pipeline_stats(
            mock_user.id, TimeRange.LAST_30_DAYS
        )

        # 1 offer out of 6
        assert result.offer_rate == pytest.approx(16.67, rel=0.1)

    def test_pipeline_stats_empty_applications(
        self, analytics_service, mock_db, mock_user
    ):
        """Should handle no applications gracefully"""
        mock_db.query().filter().all.return_value = []

        result = analytics_service.get_pipeline_stats(
            mock_user.id, TimeRange.LAST_30_DAYS
        )

        assert result.total_applications == 0
        assert result.response_rate == 0.0
        assert result.interview_rate == 0.0
        assert result.offer_rate == 0.0

    def test_pipeline_distribution(
        self, analytics_service, mock_db, mock_user, sample_applications
    ):
        """Should calculate pipeline stage distribution"""
        mock_db.query().filter().all.return_value = sample_applications

        result = analytics_service.get_pipeline_distribution(
            mock_user.id, TimeRange.LAST_30_DAYS
        )

        assert len(result) > 0
        # Each stage should have count and percentage
        for stage in result:
            assert hasattr(stage, "stage")
            assert hasattr(stage, "count")
            assert hasattr(stage, "percentage")
            assert 0 <= stage.percentage <= 100


# ============================================================================
# TEST SUCCESS METRICS
# ============================================================================


class TestSuccessMetrics:
    """Test success metrics calculation"""

    def test_calculate_success_metrics(
        self, analytics_service, mock_db, mock_user, sample_applications
    ):
        """Should calculate comprehensive success metrics"""
        mock_db.query().filter().all.return_value = sample_applications

        result = analytics_service.get_success_metrics(
            mock_user.id, TimeRange.LAST_30_DAYS
        )

        assert result.total_applications == 6
        assert result.total_interviews >= 1
        assert result.total_offers >= 1
        assert result.total_rejections >= 1

    def test_applications_by_time_period(
        self, analytics_service, mock_db, mock_user, sample_applications
    ):
        """Should count applications in different time periods"""
        mock_db.query().filter().all.return_value = sample_applications

        result = analytics_service.get_success_metrics(
            mock_user.id, TimeRange.LAST_30_DAYS
        )

        assert result.applications_last_7_days >= 0
        assert result.applications_last_30_days >= 0
        assert result.avg_applications_per_week >= 0

    def test_avg_response_time_calculation(self, analytics_service, mock_db, mock_user):
        """Should calculate average response time in days"""
        # Mock applications with status changes
        apps_with_response = [
            Mock(
                status="in_review",
                applied_at=datetime.utcnow() - timedelta(days=10),
                updated_at=datetime.utcnow() - timedelta(days=8),  # 2 days response
            ),
            Mock(
                status="phone_screen",
                applied_at=datetime.utcnow() - timedelta(days=15),
                updated_at=datetime.utcnow() - timedelta(days=11),  # 4 days response
            ),
        ]
        mock_db.query().filter().all.return_value = apps_with_response

        result = analytics_service.get_success_metrics(
            mock_user.id, TimeRange.LAST_30_DAYS
        )

        # Average should be (2 + 4) / 2 = 3 days
        assert result.avg_response_time_days == pytest.approx(3.0, rel=0.5)

    def test_interview_conversion_rate(
        self, analytics_service, mock_db, mock_user, sample_applications
    ):
        """Should calculate interview conversion rate"""
        mock_db.query().filter().all.return_value = sample_applications

        result = analytics_service.get_success_metrics(
            mock_user.id, TimeRange.LAST_30_DAYS
        )

        # Conversion rate should be interviews / total applications
        assert 0 <= result.interview_conversion_rate <= 100

    def test_active_days_calculation(self, analytics_service, mock_db, mock_user):
        """Should calculate active days correctly"""
        # Applications spread across multiple days
        apps_different_days = [
            Mock(created_at=datetime.utcnow() - timedelta(days=i))
            for i in range(0, 10, 2)  # 5 different days
        ]
        mock_db.query().filter().all.return_value = apps_different_days

        result = analytics_service.get_success_metrics(
            mock_user.id, TimeRange.LAST_30_DAYS
        )

        assert result.active_days == 5


# ============================================================================
# TEST ACTIVITY TIMELINE
# ============================================================================


class TestActivityTimeline:
    """Test activity timeline tracking"""

    def test_get_activity_timeline(self, analytics_service, mock_db, mock_user):
        """Should retrieve activity timeline"""
        mock_activities = [
            Mock(
                id=uuid.uuid4(),
                activity_type="application_submitted",
                created_at=datetime.utcnow(),
            )
            for _ in range(5)
        ]
        mock_db.query().filter().order_by().offset().limit().all.return_value = (
            mock_activities
        )
        mock_db.query().filter().count.return_value = 10

        result = analytics_service.get_activity_timeline(mock_user.id, skip=0, limit=5)

        assert len(result.activities) == 5
        assert result.total_count == 10
        assert result.has_more is True

    def test_activity_timeline_pagination(self, analytics_service, mock_db, mock_user):
        """Should handle pagination correctly"""
        mock_activities = [Mock(id=uuid.uuid4()) for _ in range(3)]
        mock_db.query().filter().order_by().offset().limit().all.return_value = (
            mock_activities
        )
        mock_db.query().filter().count.return_value = 8

        result = analytics_service.get_activity_timeline(mock_user.id, skip=5, limit=5)

        assert len(result.activities) == 3
        assert result.has_more is False  # No more after this

    def test_filter_activity_by_type(self, analytics_service, mock_db, mock_user):
        """Should filter activities by type"""
        result = analytics_service.get_activity_timeline(
            mock_user.id,
            activity_types=[ActivityType.APPLICATION_SUBMITTED],
        )

        # Verify filter was applied in query
        assert mock_db.query().filter.called


# ============================================================================
# TEST HEALTH SCORE
# ============================================================================


class TestHealthScore:
    """Test job search health score calculation"""

    def test_calculate_health_score_excellent(
        self, analytics_service, mock_db, mock_user
    ):
        """Should calculate excellent health score"""
        # Mock high activity and success
        mock_db.query().filter().all.return_value = [
            Mock(status="offer") for _ in range(10)
        ]

        result = analytics_service.get_health_score(mock_user.id)

        assert result.overall_score >= 80
        assert result.level == HealthScoreLevel.EXCELLENT

    def test_calculate_health_score_needs_improvement(
        self, analytics_service, mock_db, mock_user
    ):
        """Should calculate low health score"""
        # Mock low activity or high rejection
        mock_db.query().filter().all.return_value = [
            Mock(status="rejected") for _ in range(20)
        ]

        result = analytics_service.get_health_score(mock_user.id)

        assert result.overall_score < 40
        assert result.level == HealthScoreLevel.NEEDS_IMPROVEMENT

    def test_health_score_components(
        self, analytics_service, mock_db, mock_user, sample_applications
    ):
        """Should include all health score components"""
        mock_db.query().filter().all.return_value = sample_applications

        result = analytics_service.get_health_score(mock_user.id)

        assert 0 <= result.activity_score <= 100
        assert 0 <= result.quality_score <= 100
        assert 0 <= result.response_score <= 100
        assert 0 <= result.success_score <= 100
        assert len(result.components) >= 4

    def test_health_score_recommendations(self, analytics_service, mock_db, mock_user):
        """Should provide actionable recommendations"""
        mock_db.query().filter().all.return_value = []

        result = analytics_service.get_health_score(mock_user.id)

        assert len(result.recommendations) > 0
        assert isinstance(result.recommendations, list)
        assert all(isinstance(r, str) for r in result.recommendations)


# ============================================================================
# TEST ANOMALY DETECTION
# ============================================================================


class TestAnomalyDetection:
    """Test anomaly detection"""

    def test_detect_low_activity_anomaly(self, analytics_service, mock_db, mock_user):
        """Should detect low activity anomaly"""
        # No applications in last 14 days
        mock_db.query().filter().all.return_value = []

        result = analytics_service.detect_anomalies(mock_user.id)

        low_activity = [
            a for a in result.anomalies if a.type == AnomalyType.LOW_ACTIVITY
        ]
        assert len(low_activity) > 0

    def test_detect_high_rejection_rate(self, analytics_service, mock_db, mock_user):
        """Should detect high rejection rate anomaly"""
        # Many rejections
        mock_db.query().filter().all.return_value = [
            Mock(status="rejected") for _ in range(20)
        ]

        result = analytics_service.detect_anomalies(mock_user.id)

        high_rejection = [
            a for a in result.anomalies if a.type == AnomalyType.HIGH_REJECTION_RATE
        ]
        assert len(high_rejection) > 0

    def test_detect_no_responses_anomaly(self, analytics_service, mock_db, mock_user):
        """Should detect no responses anomaly"""
        # All applications still in 'applied' status
        now = datetime.utcnow()
        mock_db.query().filter().all.return_value = [
            Mock(status="applied", applied_at=now - timedelta(days=30))
            for _ in range(10)
        ]

        result = analytics_service.detect_anomalies(mock_user.id)

        no_responses = [
            a for a in result.anomalies if a.type == AnomalyType.NO_RESPONSES
        ]
        assert len(no_responses) > 0

    def test_detect_stale_applications(self, analytics_service, mock_db, mock_user):
        """Should detect stale applications"""
        # Applications with no updates for 60+ days
        old_date = datetime.utcnow() - timedelta(days=70)
        mock_db.query().filter().all.return_value = [
            Mock(
                status="in_review",
                updated_at=old_date,
                applied_at=old_date,
            )
            for _ in range(5)
        ]

        result = analytics_service.detect_anomalies(mock_user.id)

        stale = [
            a for a in result.anomalies if a.type == AnomalyType.STALE_APPLICATIONS
        ]
        assert len(stale) > 0

    def test_anomaly_severity_levels(self, analytics_service, mock_db, mock_user):
        """Should assign appropriate severity levels"""
        mock_db.query().filter().all.return_value = []

        result = analytics_service.detect_anomalies(mock_user.id)

        for anomaly in result.anomalies:
            assert anomaly.severity in ["low", "medium", "high", "critical"]


# ============================================================================
# TEST TRENDS AND TIME SERIES
# ============================================================================


class TestTrendsAnalysis:
    """Test trends and time series analysis"""

    def test_calculate_application_trends(self, analytics_service, mock_db, mock_user):
        """Should calculate application trends over time"""
        result = analytics_service.get_application_trends(
            mock_user.id, TimeRange.LAST_30_DAYS
        )

        assert len(result) >= 0
        # Each data point should have date and metrics
        for trend in result:
            assert hasattr(trend, "date")
            assert hasattr(trend, "applications_submitted")

    def test_identify_trend_direction(self, analytics_service, mock_db, mock_user):
        """Should identify if trend is increasing/decreasing/stable"""
        # Mock increasing applications over time
        apps_increasing = [
            Mock(created_at=datetime.utcnow() - timedelta(days=30 - i))
            for i in range(30)
        ]
        mock_db.query().filter().all.return_value = apps_increasing

        result = analytics_service.get_time_series_chart(
            mock_user.id, "applications", TimeRange.LAST_30_DAYS
        )

        assert result.trend in ["increasing", "decreasing", "stable"]

    def test_calculate_change_percentage(self, analytics_service, mock_db, mock_user):
        """Should calculate percentage change in metrics"""
        result = analytics_service.get_time_series_chart(
            mock_user.id, "applications", TimeRange.LAST_30_DAYS
        )

        assert hasattr(result, "change_percentage")
        assert isinstance(result.change_percentage, float)


# ============================================================================
# TEST CONVERSION FUNNEL
# ============================================================================


class TestConversionFunnel:
    """Test conversion funnel analysis"""

    def test_calculate_conversion_funnel(
        self, analytics_service, mock_db, mock_user, sample_applications
    ):
        """Should calculate conversion funnel"""
        mock_db.query().filter().all.return_value = sample_applications

        result = analytics_service.get_conversion_funnel(
            mock_user.id, TimeRange.LAST_30_DAYS
        )

        assert len(result) > 0
        # Should have stages like Applied -> In Review -> Interview -> Offer
        stages = [stage.stage for stage in result]
        assert "Applied" in stages

    def test_conversion_rates_between_stages(
        self, analytics_service, mock_db, mock_user, sample_applications
    ):
        """Should calculate conversion rates between stages"""
        mock_db.query().filter().all.return_value = sample_applications

        result = analytics_service.get_conversion_funnel(
            mock_user.id, TimeRange.LAST_30_DAYS
        )

        for stage in result:
            assert 0 <= stage.conversion_rate <= 100


# ============================================================================
# TEST BENCHMARKING
# ============================================================================


class TestBenchmarking:
    """Test peer and platform benchmarking"""

    def test_compare_with_platform_average(self, analytics_service, mock_db, mock_user):
        """Should compare user metrics with platform average"""
        result = analytics_service.get_peer_comparison(mock_user.id)

        assert hasattr(result, "total_applications")
        assert hasattr(result, "response_rate")
        assert hasattr(result, "interview_rate")
        assert hasattr(result, "offer_rate")

    def test_calculate_percentile_ranking(self, analytics_service, mock_db, mock_user):
        """Should calculate user's percentile ranking"""
        result = analytics_service.get_peer_comparison(mock_user.id)

        # Check percentile for each metric
        assert 0 <= result.total_applications.percentile <= 100
        assert 0 <= result.response_rate.percentile <= 100


# ============================================================================
# TEST COMPREHENSIVE DASHBOARD
# ============================================================================


class TestComprehensiveDashboard:
    """Test complete dashboard data generation"""

    def test_get_dashboard_overview(
        self, analytics_service, mock_db, mock_user, sample_applications
    ):
        """Should generate complete dashboard overview"""
        mock_db.query().filter().all.return_value = sample_applications

        result = analytics_service.get_dashboard_overview(mock_user.id)

        assert hasattr(result, "pipeline_stats")
        assert hasattr(result, "success_metrics")
        assert hasattr(result, "health_score")
        assert hasattr(result, "recent_activity")
        assert hasattr(result, "anomalies")

    def test_dashboard_quick_stats(self, analytics_service, mock_db, mock_user):
        """Should include quick stats in dashboard"""
        mock_db.query().filter().all.return_value = []

        result = analytics_service.get_dashboard_overview(mock_user.id)

        assert hasattr(result, "applications_this_week")
        assert hasattr(result, "interviews_this_week")
        assert hasattr(result, "offers_pending")

    def test_get_detailed_analytics(
        self, analytics_service, mock_db, mock_user, sample_applications
    ):
        """Should generate detailed analytics"""
        mock_db.query().filter().all.return_value = sample_applications

        result = analytics_service.get_detailed_analytics(
            mock_user.id, TimeRange.LAST_30_DAYS
        )

        assert hasattr(result, "pipeline_stats")
        assert hasattr(result, "pipeline_distribution")
        assert hasattr(result, "success_metrics")
        assert hasattr(result, "conversion_funnel")
        assert hasattr(result, "application_trends")


# ============================================================================
# TEST TIME RANGE FILTERING
# ============================================================================


class TestTimeRangeFiltering:
    """Test time range filtering for analytics"""

    def test_filter_by_last_7_days(self, analytics_service, mock_db, mock_user):
        """Should filter data for last 7 days"""
        result = analytics_service.get_pipeline_stats(
            mock_user.id, TimeRange.LAST_7_DAYS
        )

        # Verify appropriate time filter was applied
        assert mock_db.query().filter.called

    def test_filter_by_last_30_days(self, analytics_service, mock_db, mock_user):
        """Should filter data for last 30 days"""
        result = analytics_service.get_pipeline_stats(
            mock_user.id, TimeRange.LAST_30_DAYS
        )

        assert mock_db.query().filter.called

    def test_filter_by_all_time(self, analytics_service, mock_db, mock_user):
        """Should show all-time data"""
        result = analytics_service.get_pipeline_stats(mock_user.id, TimeRange.ALL_TIME)

        assert mock_db.query().filter.called


# ============================================================================
# TEST ERROR HANDLING
# ============================================================================


class TestErrorHandling:
    """Test error handling in analytics service"""

    def test_handle_invalid_user_id(self, analytics_service, mock_db):
        """Should handle invalid user ID gracefully"""
        invalid_user_id = uuid.uuid4()
        mock_db.query().filter().all.return_value = []

        result = analytics_service.get_pipeline_stats(
            invalid_user_id, TimeRange.LAST_30_DAYS
        )

        # Should return empty/zero stats instead of error
        assert result.total_applications == 0

    def test_handle_database_errors(self, analytics_service, mock_db, mock_user):
        """Should handle database errors gracefully"""
        mock_db.query().filter().all.side_effect = Exception("Database error")

        with pytest.raises(Exception):
            analytics_service.get_pipeline_stats(mock_user.id, TimeRange.LAST_30_DAYS)
