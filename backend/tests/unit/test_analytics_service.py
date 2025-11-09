"""Unit tests for AnalyticsService (TDD)

Sprint 15-16: Advanced Analytics & Reporting

Test-Driven Development approach:
1. Write tests first (RED phase)
2. Implement minimal code to pass tests (GREEN phase)
3. Refactor for quality (REFACTOR phase)
"""

import pytest
from datetime import datetime, date, timedelta
from decimal import Decimal
from uuid import uuid4
from unittest.mock import Mock, MagicMock

from app.services.analytics_service import AnalyticsService
from app.db.models.company import Company
from app.db.models.job import Job
from app.db.models.application import Application
from app.db.models.analytics import (
    AnalyticsSnapshot,
    ApplicationStageHistory,
    CompanyAnalyticsConfig,
)
from app.db.models.webhook import InterviewSchedule


# ============================================================================
# TEST FIXTURES
# ============================================================================

@pytest.fixture
def mock_db():
    """Mock database session"""
    return MagicMock()


@pytest.fixture
def analytics_service(mock_db):
    """Initialize AnalyticsService with mocked DB"""
    return AnalyticsService(db=mock_db)


@pytest.fixture
def test_company():
    """Test company with Growth plan"""
    return Company(
        id=uuid4(),
        name="TechCorp",
        subscription_tier="growth",
        subscription_status="active",
        created_at=datetime.utcnow(),
    )


@pytest.fixture
def test_job(test_company):
    """Test job posting"""
    return Job(
        id=uuid4(),
        company_id=test_company.id,
        title="Senior Python Developer",
        status="active",
        created_at=datetime.utcnow() - timedelta(days=30),
    )


# ============================================================================
# TEST SUITE 1: SOURCING METRICS
# ============================================================================

class TestSourcingMetrics:
    """Test suite for application sourcing analytics"""

    def test_calculate_sourcing_metrics_by_source(
        self, analytics_service, test_company
    ):
        """
        GIVEN: 10 auto-apply apps (avg fit 75), 5 manual apps (avg fit 82)
        WHEN: calculate_sourcing_metrics(company_id, date_range)
        THEN: Returns correct counts, avg_fit, conversion rates
        """
        # Arrange
        start_date = date(2025, 1, 1)
        end_date = date(2025, 3, 31)

        # Mock DB query results
        mock_results = [
            {"source": "auto_apply", "count": 10, "avg_fit": 75.0, "hires": 2},
            {"source": "manual", "count": 5, "avg_fit": 82.0, "hires": 2},
        ]
        analytics_service.db.query.return_value.filter.return_value.group_by.return_value.all.return_value = (
            mock_results
        )

        # Act
        metrics = analytics_service.calculate_sourcing_metrics(
            company_id=test_company.id, start_date=start_date, end_date=end_date
        )

        # Assert
        assert metrics is not None
        assert "auto_apply" in metrics
        assert metrics["auto_apply"]["count"] == 10
        assert metrics["auto_apply"]["avg_fit"] == 75.0
        assert metrics["auto_apply"]["conversion_rate"] == 0.20  # 2/10

        assert "manual" in metrics
        assert metrics["manual"]["count"] == 5
        assert metrics["manual"]["avg_fit"] == 82.0
        assert metrics["manual"]["conversion_rate"] == 0.40  # 2/5

    def test_sourcing_metrics_empty_data(self, analytics_service, test_company):
        """
        GIVEN: Company with no applications
        WHEN: calculate_sourcing_metrics()
        THEN: Returns empty dict, does not raise exception
        """
        # Arrange
        analytics_service.db.query.return_value.filter.return_value.group_by.return_value.all.return_value = (
            []
        )

        # Act
        metrics = analytics_service.calculate_sourcing_metrics(
            company_id=test_company.id,
            start_date=date.today(),
            end_date=date.today(),
        )

        # Assert
        assert metrics == {}


# ============================================================================
# TEST SUITE 2: PIPELINE METRICS
# ============================================================================

class TestPipelineMetrics:
    """Test suite for pipeline funnel analytics"""

    def test_calculate_pipeline_funnel(self, analytics_service, test_job):
        """
        GIVEN: 100 apps (40 new, 30 reviewing, 20 phone_screen, 10 hired)
        WHEN: calculate_pipeline_funnel(job_id)
        THEN: Returns stage counts and conversion rates
        """
        # Arrange
        mock_results = [
            {"stage": "new", "count": 40},
            {"stage": "reviewing", "count": 30},
            {"stage": "phone_screen", "count": 20},
            {"stage": "hired", "count": 10},
        ]
        analytics_service.db.query.return_value.filter.return_value.group_by.return_value.all.return_value = (
            mock_results
        )

        # Act
        funnel = analytics_service.calculate_pipeline_funnel(job_id=test_job.id)

        # Assert
        assert len(funnel) == 4
        assert funnel[0]["stage"] == "new"
        assert funnel[0]["count"] == 40


# ============================================================================
# TEST SUITE 3: TIME METRICS
# ============================================================================

class TestTimeMetrics:
    """Test suite for time-to-hire analytics"""

    def test_time_to_hire(self, analytics_service):
        """
        GIVEN: App submitted Jan 1, hired Jan 30 (29 days)
        WHEN: calculate_time_to_hire(application_id)
        THEN: Returns 29 days
        """
        # Arrange
        app_id = uuid4()
        applied_at = datetime(2025, 1, 1, 10, 0, 0)

        # Mock stage history
        mock_history = [
            Mock(to_stage="new", changed_at=datetime(2025, 1, 1, 10, 0, 0)),
            Mock(to_stage="reviewing", changed_at=datetime(2025, 1, 5, 10, 0, 0)),
            Mock(to_stage="phone_screen", changed_at=datetime(2025, 1, 15, 10, 0, 0)),
            Mock(to_stage="hired", changed_at=datetime(2025, 1, 30, 10, 0, 0)),
        ]
        analytics_service.db.query.return_value.filter.return_value.order_by.return_value.all.return_value = (
            mock_history
        )

        # Act
        days = analytics_service.calculate_time_to_hire(application_id=app_id)

        # Assert
        assert days == 29


# ============================================================================
# TEST SUITE 4: QUALITY METRICS
# ============================================================================

class TestQualityMetrics:
    """Test suite for quality of hire analytics"""

    def test_calculate_avg_fit_index(self, analytics_service, test_job):
        """
        GIVEN: 10 apps with fit_index [70, 75, 80, 85, 90, 60, 95, 88, 78, 82]
        WHEN: calculate_avg_fit_index(job_id)
        THEN: Returns 80.3
        """
        # Arrange
        fit_indices = [70, 75, 80, 85, 90, 60, 95, 88, 78, 82]
        mock_apps = [Mock(fit_index=fi) for fi in fit_indices]

        analytics_service.db.query.return_value.filter.return_value.all.return_value = (
            mock_apps
        )

        # Act
        avg_fit = analytics_service.calculate_avg_fit_index(job_id=test_job.id)

        # Assert
        assert avg_fit == pytest.approx(80.3, rel=0.1)


# ============================================================================
# TEST SUITE 5: COST METRICS
# ============================================================================

class TestCostMetrics:
    """Test suite for cost-per-hire analytics"""

    def test_calculate_cost_per_application(self, analytics_service, test_company):
        """
        GIVEN: $99/month plan, 100 apps in month
        WHEN: calculate_cost_per_application(company_id, month)
        THEN: Returns $0.99 per app
        """
        # Arrange
        monthly_cost = Decimal("99.00")
        total_apps = 100

        # Mock subscription
        mock_subscription = Mock(monthly_cost=monthly_cost)
        analytics_service.db.query.return_value.filter.return_value.first.return_value = (
            mock_subscription
        )

        # Mock application count
        analytics_service.db.query.return_value.filter.return_value.count.return_value = (
            total_apps
        )

        # Act
        cost_per_app = analytics_service.calculate_cost_per_application(
            company_id=test_company.id,
            start_date=date(2025, 1, 1),
            end_date=date(2025, 1, 31),
        )

        # Assert
        assert cost_per_app == pytest.approx(Decimal("0.99"), rel=0.01)
