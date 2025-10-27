"""Unit tests for AutoApplyService"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import uuid

from app.services.auto_apply_service import AutoApplyService
from app.db.models.auto_apply import AutoApplyConfig, AutoApplyJob
from app.db.models.application import Application
from app.db.models.job import Job
from app.db.models.user import User
from app.schemas.auto_apply import (
    AutoApplyConfigCreate,
    AutoApplyConfigUpdate,
    AutoApplyJobCreate,
    AutoApplyMode,
    AutoApplyStatus,
    EmploymentType,
    SeniorityLevel,
    RefundRequest,
)
from app.core.exceptions import NotFoundError, ValidationError


@pytest.fixture
def mock_db():
    """Create mock database session"""
    return Mock()


@pytest.fixture
def mock_user():
    """Create mock user"""
    user = Mock(spec=User)
    user.id = uuid.uuid4()
    user.email = "test@example.com"
    return user


@pytest.fixture
def mock_job():
    """Create mock job"""
    job = Mock(spec=Job)
    job.id = uuid.uuid4()
    job.title = "Senior Software Engineer"
    job.company = "Tech Corp"
    job.source = "greenhouse"
    job.external_url = "https://jobs.example.com/123"
    job.location_type = "remote"
    job.employment_type = "full-time"
    job.salary_min = 120000
    job.salary_max = 180000
    return job


@pytest.fixture
def auto_apply_service(mock_db):
    """Create AutoApplyService instance"""
    return AutoApplyService(mock_db)


@pytest.fixture
def sample_config_data():
    """Sample configuration data"""
    return AutoApplyConfigCreate(
        enabled=True,
        mode=AutoApplyMode.AUTO_APPLY,
        min_fit_score=75,
        max_applications_per_day=10,
        max_applications_per_week=50,
        remote_only=True,
        min_salary=100000,
        employment_types=[EmploymentType.FULL_TIME],
        seniority_levels=[SeniorityLevel.SENIOR],
        auto_generate_cover_letter=True,
    )


class TestConfigurationManagement:
    """Test auto-apply configuration CRUD operations"""

    def test_create_config_success(
        self, auto_apply_service, mock_db, mock_user, sample_config_data
    ):
        """Test creating new auto-apply configuration"""
        mock_db.query().filter().first.return_value = None
        mock_db.add = Mock()
        mock_db.commit = Mock()
        mock_db.refresh = Mock()

        result = auto_apply_service.create_config(mock_user.id, sample_config_data)

        assert mock_db.add.called
        assert mock_db.commit.called

    def test_create_config_already_exists(
        self, auto_apply_service, mock_db, mock_user, sample_config_data
    ):
        """Test creating config when one already exists"""
        existing_config = Mock(spec=AutoApplyConfig)
        mock_db.query().filter().first.return_value = existing_config

        with pytest.raises(ValidationError, match="already exists"):
            auto_apply_service.create_config(mock_user.id, sample_config_data)

    def test_get_config_success(self, auto_apply_service, mock_db, mock_user):
        """Test getting user's auto-apply configuration"""
        mock_config = Mock(spec=AutoApplyConfig)
        mock_config.id = uuid.uuid4()
        mock_config.user_id = mock_user.id
        mock_db.query().filter().first.return_value = mock_config

        result = auto_apply_service.get_config(mock_user.id)

        assert result is not None
        mock_db.query().filter().first.assert_called_once()

    def test_get_config_creates_default(self, auto_apply_service, mock_db, mock_user):
        """Test that getting config creates default if none exists"""
        mock_db.query().filter().first.return_value = None
        mock_db.add = Mock()
        mock_db.commit = Mock()
        mock_db.refresh = Mock()

        result = auto_apply_service.get_config(mock_user.id)

        assert mock_db.add.called
        assert mock_db.commit.called

    def test_update_config_success(self, auto_apply_service, mock_db, mock_user):
        """Test updating auto-apply configuration"""
        mock_config = Mock(spec=AutoApplyConfig)
        mock_config.enabled = False
        mock_db.query().filter().first.return_value = mock_config
        mock_db.commit = Mock()

        updates = AutoApplyConfigUpdate(enabled=True, min_fit_score=80)
        result = auto_apply_service.update_config(mock_user.id, updates)

        assert mock_config.enabled == True
        assert mock_db.commit.called

    def test_update_config_not_found(self, auto_apply_service, mock_db, mock_user):
        """Test updating non-existent configuration"""
        mock_db.query().filter().first.return_value = None

        updates = AutoApplyConfigUpdate(enabled=True)
        with pytest.raises(NotFoundError):
            auto_apply_service.update_config(mock_user.id, updates)

    def test_disable_auto_apply(self, auto_apply_service, mock_db, mock_user):
        """Test disabling auto-apply"""
        mock_config = Mock(spec=AutoApplyConfig)
        mock_config.enabled = True
        mock_db.query().filter().first.return_value = mock_config
        mock_db.commit = Mock()

        result = auto_apply_service.disable_auto_apply(mock_user.id)

        assert mock_config.enabled == False
        assert mock_db.commit.called


class TestJobQueueing:
    """Test adding jobs to auto-apply queue"""

    def test_queue_job_success(
        self, auto_apply_service, mock_db, mock_user, mock_job
    ):
        """Test queueing a job for auto-apply"""
        mock_db.query().filter().first.return_value = mock_job
        mock_db.add = Mock()
        mock_db.commit = Mock()
        mock_db.refresh = Mock()

        job_data = AutoApplyJobCreate(
            job_id=str(mock_job.id), fit_score=85, fit_rationale="Great match!"
        )

        with patch.object(
            auto_apply_service, "_check_eligibility", return_value=(True, None)
        ):
            with patch.object(
                auto_apply_service, "_deduct_credit", return_value=True
            ):
                result = auto_apply_service.queue_job(mock_user.id, job_data)

                assert mock_db.add.called
                assert mock_db.commit.called

    def test_queue_job_not_eligible(
        self, auto_apply_service, mock_db, mock_user, mock_job
    ):
        """Test queueing job that doesn't meet criteria"""
        mock_db.query().filter().first.return_value = mock_job

        job_data = AutoApplyJobCreate(
            job_id=str(mock_job.id), fit_score=60, fit_rationale="Low match"
        )

        with patch.object(
            auto_apply_service,
            "_check_eligibility",
            return_value=(False, "Fit score too low"),
        ):
            with pytest.raises(ValidationError, match="not eligible"):
                auto_apply_service.queue_job(mock_user.id, job_data)

    def test_queue_job_insufficient_credits(
        self, auto_apply_service, mock_db, mock_user, mock_job
    ):
        """Test queueing job without sufficient credits"""
        mock_db.query().filter().first.return_value = mock_job

        job_data = AutoApplyJobCreate(
            job_id=str(mock_job.id), fit_score=85, fit_rationale="Great match!"
        )

        with patch.object(
            auto_apply_service, "_check_eligibility", return_value=(True, None)
        ):
            with patch.object(
                auto_apply_service, "_deduct_credit", return_value=False
            ):
                with pytest.raises(ValidationError, match="Insufficient credits"):
                    auto_apply_service.queue_job(mock_user.id, job_data)

    def test_queue_job_already_queued(
        self, auto_apply_service, mock_db, mock_user, mock_job
    ):
        """Test queueing job that's already in queue"""
        mock_db.query().filter().first.side_effect = [
            mock_job,
            Mock(spec=AutoApplyJob),
        ]  # Job exists, then auto_apply_job exists

        job_data = AutoApplyJobCreate(
            job_id=str(mock_job.id), fit_score=85, fit_rationale="Great match!"
        )

        with pytest.raises(ValidationError, match="already queued"):
            auto_apply_service.queue_job(mock_user.id, job_data)

    def test_queue_job_already_applied(
        self, auto_apply_service, mock_db, mock_user, mock_job
    ):
        """Test queueing job that user already applied to"""
        mock_db.query().filter().first.side_effect = [
            mock_job,
            None,
            Mock(spec=Application),
        ]  # Job exists, no auto_apply_job, but application exists

        job_data = AutoApplyJobCreate(
            job_id=str(mock_job.id), fit_score=85, fit_rationale="Great match!"
        )

        with pytest.raises(ValidationError, match="already applied"):
            auto_apply_service.queue_job(mock_user.id, job_data)

    def test_batch_queue_jobs(self, auto_apply_service, mock_db, mock_user, mock_job):
        """Test queueing multiple jobs at once"""
        job_ids = [str(uuid.uuid4()) for _ in range(5)]

        with patch.object(
            auto_apply_service, "queue_job", return_value=Mock()
        ) as mock_queue:
            result = auto_apply_service.batch_queue_jobs(mock_user.id, job_ids)

            assert mock_queue.call_count == 5
            assert result["successful"] == 5


class TestJobEligibility:
    """Test job eligibility checking"""

    def test_check_eligibility_fit_score_too_low(
        self, auto_apply_service, mock_db, mock_user, mock_job
    ):
        """Test eligibility check with low fit score"""
        config = Mock(spec=AutoApplyConfig)
        config.enabled = True
        config.min_fit_score = 75
        mock_db.query().filter().first.return_value = config

        eligible, reason = auto_apply_service._check_eligibility(
            mock_user.id, mock_job, 60
        )

        assert eligible == False
        assert "fit score" in reason.lower()

    def test_check_eligibility_remote_only_filter(
        self, auto_apply_service, mock_db, mock_user, mock_job
    ):
        """Test eligibility check with remote-only filter"""
        config = Mock(spec=AutoApplyConfig)
        config.enabled = True
        config.min_fit_score = 70
        config.remote_only = True
        mock_db.query().filter().first.return_value = config

        mock_job.location_type = "onsite"

        eligible, reason = auto_apply_service._check_eligibility(
            mock_user.id, mock_job, 85
        )

        assert eligible == False
        assert "remote" in reason.lower()

    def test_check_eligibility_salary_filter(
        self, auto_apply_service, mock_db, mock_user, mock_job
    ):
        """Test eligibility check with salary filter"""
        config = Mock(spec=AutoApplyConfig)
        config.enabled = True
        config.min_fit_score = 70
        config.min_salary = 150000
        config.remote_only = False
        mock_db.query().filter().first.return_value = config

        mock_job.salary_max = 120000

        eligible, reason = auto_apply_service._check_eligibility(
            mock_user.id, mock_job, 85
        )

        assert eligible == False
        assert "salary" in reason.lower()

    def test_check_eligibility_daily_limit_reached(
        self, auto_apply_service, mock_db, mock_user, mock_job
    ):
        """Test eligibility check when daily limit is reached"""
        config = Mock(spec=AutoApplyConfig)
        config.enabled = True
        config.min_fit_score = 70
        config.max_applications_per_day = 5
        config.daily_application_count = 5
        config.remote_only = False
        mock_db.query().filter().first.return_value = config

        eligible, reason = auto_apply_service._check_eligibility(
            mock_user.id, mock_job, 85
        )

        assert eligible == False
        assert "daily limit" in reason.lower()

    def test_check_eligibility_excluded_company(
        self, auto_apply_service, mock_db, mock_user, mock_job
    ):
        """Test eligibility check with excluded company"""
        config = Mock(spec=AutoApplyConfig)
        config.enabled = True
        config.min_fit_score = 70
        config.excluded_companies = ["Tech Corp", "Other Company"]
        config.remote_only = False
        mock_db.query().filter().first.return_value = config

        eligible, reason = auto_apply_service._check_eligibility(
            mock_user.id, mock_job, 85
        )

        assert eligible == False
        assert "excluded" in reason.lower()

    def test_check_eligibility_all_criteria_met(
        self, auto_apply_service, mock_db, mock_user, mock_job
    ):
        """Test eligibility check when all criteria are met"""
        config = Mock(spec=AutoApplyConfig)
        config.enabled = True
        config.min_fit_score = 70
        config.max_applications_per_day = 10
        config.daily_application_count = 3
        config.remote_only = True
        config.min_salary = 100000
        config.excluded_companies = []
        mock_db.query().filter().first.return_value = config

        mock_job.location_type = "remote"
        mock_job.salary_max = 180000

        eligible, reason = auto_apply_service._check_eligibility(
            mock_user.id, mock_job, 85
        )

        assert eligible == True
        assert reason is None


class TestJobProcessing:
    """Test job application processing"""

    def test_process_job_success(self, auto_apply_service, mock_db, mock_user):
        """Test successful job processing"""
        auto_apply_job = Mock(spec=AutoApplyJob)
        auto_apply_job.id = uuid.uuid4()
        auto_apply_job.user_id = mock_user.id
        auto_apply_job.status = AutoApplyStatus.QUEUED
        auto_apply_job.attempts = 0
        auto_apply_job.job = Mock(spec=Job)

        mock_db.query().filter().first.return_value = auto_apply_job
        mock_db.commit = Mock()

        with patch.object(
            auto_apply_service, "_submit_application", return_value=True
        ):
            result = auto_apply_service.process_job(str(auto_apply_job.id))

            assert auto_apply_job.status == AutoApplyStatus.APPLIED
            assert mock_db.commit.called

    def test_process_job_failure(self, auto_apply_service, mock_db, mock_user):
        """Test job processing failure"""
        auto_apply_job = Mock(spec=AutoApplyJob)
        auto_apply_job.id = uuid.uuid4()
        auto_apply_job.user_id = mock_user.id
        auto_apply_job.status = AutoApplyStatus.QUEUED
        auto_apply_job.attempts = 0
        auto_apply_job.max_attempts = 3
        auto_apply_job.job = Mock(spec=Job)

        mock_db.query().filter().first.return_value = auto_apply_job
        mock_db.commit = Mock()

        with patch.object(
            auto_apply_service,
            "_submit_application",
            side_effect=Exception("Network error"),
        ):
            with pytest.raises(Exception):
                auto_apply_service.process_job(str(auto_apply_job.id))

            assert auto_apply_job.attempts == 1
            assert auto_apply_job.error_message is not None

    def test_process_job_max_attempts_exceeded(
        self, auto_apply_service, mock_db, mock_user
    ):
        """Test job processing after max attempts"""
        auto_apply_job = Mock(spec=AutoApplyJob)
        auto_apply_job.id = uuid.uuid4()
        auto_apply_job.user_id = mock_user.id
        auto_apply_job.status = AutoApplyStatus.QUEUED
        auto_apply_job.attempts = 3
        auto_apply_job.max_attempts = 3
        auto_apply_job.job = Mock(spec=Job)

        mock_db.query().filter().first.return_value = auto_apply_job
        mock_db.commit = Mock()

        with patch.object(
            auto_apply_service,
            "_submit_application",
            side_effect=Exception("Network error"),
        ):
            with patch.object(
                auto_apply_service, "_refund_credit", return_value=True
            ):
                with pytest.raises(Exception):
                    auto_apply_service.process_job(str(auto_apply_job.id))

                assert auto_apply_job.status == AutoApplyStatus.FAILED


class TestCreditManagement:
    """Test credit deduction and refund"""

    def test_deduct_credit_success(self, auto_apply_service, mock_db, mock_user):
        """Test successful credit deduction"""
        with patch("app.services.auto_apply_service.CreditService") as MockCredit:
            mock_credit_service = MockCredit.return_value
            mock_credit_service.deduct_credits.return_value = True

            result = auto_apply_service._deduct_credit(
                mock_user.id, str(uuid.uuid4())
            )

            assert result == True
            mock_credit_service.deduct_credits.assert_called_once()

    def test_deduct_credit_insufficient(self, auto_apply_service, mock_db, mock_user):
        """Test credit deduction with insufficient credits"""
        with patch("app.services.auto_apply_service.CreditService") as MockCredit:
            mock_credit_service = MockCredit.return_value
            mock_credit_service.deduct_credits.side_effect = ValidationError(
                "Insufficient credits"
            )

            result = auto_apply_service._deduct_credit(
                mock_user.id, str(uuid.uuid4())
            )

            assert result == False

    def test_refund_credit_success(self, auto_apply_service, mock_db, mock_user):
        """Test successful credit refund"""
        auto_apply_job = Mock(spec=AutoApplyJob)
        auto_apply_job.id = uuid.uuid4()
        auto_apply_job.user_id = mock_user.id
        auto_apply_job.credits_refunded = False
        auto_apply_job.credits_used = 1

        mock_db.query().filter().first.return_value = auto_apply_job
        mock_db.commit = Mock()

        with patch("app.services.auto_apply_service.CreditService") as MockCredit:
            mock_credit_service = MockCredit.return_value
            mock_credit_service.refund_credits.return_value = None

            refund_request = RefundRequest(reason="Job posting was invalid")
            result = auto_apply_service.request_refund(
                mock_user.id, str(auto_apply_job.id), refund_request
            )

            assert auto_apply_job.credits_refunded == True
            assert auto_apply_job.status == AutoApplyStatus.REFUNDED
            mock_credit_service.refund_credits.assert_called_once()

    def test_refund_credit_already_refunded(
        self, auto_apply_service, mock_db, mock_user
    ):
        """Test refund request for already refunded job"""
        auto_apply_job = Mock(spec=AutoApplyJob)
        auto_apply_job.id = uuid.uuid4()
        auto_apply_job.user_id = mock_user.id
        auto_apply_job.credits_refunded = True

        mock_db.query().filter().first.return_value = auto_apply_job

        refund_request = RefundRequest(reason="Job posting was invalid")
        with pytest.raises(ValidationError, match="already refunded"):
            auto_apply_service.request_refund(
                mock_user.id, str(auto_apply_job.id), refund_request
            )


class TestQueueManagement:
    """Test queue listing and management"""

    def test_get_queue_success(self, auto_apply_service, mock_db, mock_user):
        """Test getting user's auto-apply queue"""
        mock_jobs = [Mock(spec=AutoApplyJob) for _ in range(5)]
        mock_db.query().filter().order_by().offset().limit().all.return_value = (
            mock_jobs
        )
        mock_db.query().filter().count.return_value = 10

        result = auto_apply_service.get_queue(mock_user.id, skip=0, limit=10)

        assert len(result["jobs"]) == 5
        assert result["total"] == 10

    def test_get_queue_with_filters(self, auto_apply_service, mock_db, mock_user):
        """Test getting queue with status filter"""
        mock_jobs = [Mock(spec=AutoApplyJob) for _ in range(3)]
        mock_db.query().filter().order_by().offset().limit().all.return_value = (
            mock_jobs
        )
        mock_db.query().filter().count.return_value = 3

        result = auto_apply_service.get_queue(
            mock_user.id, status=AutoApplyStatus.QUEUED, skip=0, limit=10
        )

        assert len(result["jobs"]) == 3

    def test_cancel_job_success(self, auto_apply_service, mock_db, mock_user):
        """Test cancelling a queued job"""
        auto_apply_job = Mock(spec=AutoApplyJob)
        auto_apply_job.id = uuid.uuid4()
        auto_apply_job.user_id = mock_user.id
        auto_apply_job.status = AutoApplyStatus.QUEUED
        auto_apply_job.credits_refunded = False

        mock_db.query().filter().first.return_value = auto_apply_job
        mock_db.commit = Mock()

        with patch.object(auto_apply_service, "_refund_credit", return_value=True):
            result = auto_apply_service.cancel_job(mock_user.id, str(auto_apply_job.id))

            assert auto_apply_job.status == AutoApplyStatus.CANCELLED
            assert mock_db.commit.called

    def test_cancel_job_already_applied(self, auto_apply_service, mock_db, mock_user):
        """Test cancelling job that's already applied"""
        auto_apply_job = Mock(spec=AutoApplyJob)
        auto_apply_job.id = uuid.uuid4()
        auto_apply_job.user_id = mock_user.id
        auto_apply_job.status = AutoApplyStatus.APPLIED

        mock_db.query().filter().first.return_value = auto_apply_job

        with pytest.raises(ValidationError, match="cannot be cancelled"):
            auto_apply_service.cancel_job(mock_user.id, str(auto_apply_job.id))


class TestStatistics:
    """Test auto-apply statistics"""

    def test_get_stats_success(self, auto_apply_service, mock_db, mock_user):
        """Test getting user's auto-apply statistics"""
        # Mock count queries
        mock_db.query().filter().count.side_effect = [5, 2, 10, 1, 2, 0]  # Various counts

        with patch.object(auto_apply_service, "_calculate_success_rate", return_value=80.0):
            with patch.object(auto_apply_service, "_get_avg_fit_score", return_value=82.5):
                result = auto_apply_service.get_stats(mock_user.id)

                assert result["total_queued"] == 5
                assert result["total_applied"] == 10
                assert result["success_rate"] == 80.0


class TestRateLimiting:
    """Test rate limiting functionality"""

    def test_reset_daily_count(self, auto_apply_service, mock_db, mock_user):
        """Test resetting daily application count"""
        config = Mock(spec=AutoApplyConfig)
        config.daily_application_count = 5
        config.last_daily_reset = datetime.utcnow() - timedelta(days=2)

        result = auto_apply_service._reset_counts_if_needed(config)

        assert config.daily_application_count == 0

    def test_reset_weekly_count(self, auto_apply_service, mock_db, mock_user):
        """Test resetting weekly application count"""
        config = Mock(spec=AutoApplyConfig)
        config.weekly_application_count = 20
        config.last_weekly_reset = datetime.utcnow() - timedelta(days=8)

        result = auto_apply_service._reset_counts_if_needed(config)

        assert config.weekly_application_count == 0

    def test_pause_auto_apply(self, auto_apply_service, mock_db, mock_user):
        """Test pausing auto-apply temporarily"""
        config = Mock(spec=AutoApplyConfig)
        config.enabled = True
        mock_db.query().filter().first.return_value = config
        mock_db.commit = Mock()

        pause_until = datetime.utcnow() + timedelta(hours=24)
        result = auto_apply_service.pause_auto_apply(mock_user.id, pause_until)

        assert config.pause_until == pause_until
        assert mock_db.commit.called


class TestComplianceChecks:
    """Test ToS compliance and validation"""

    def test_check_tos_compliance_greenhouse(self, auto_apply_service):
        """Test ToS compliance check for Greenhouse"""
        job = Mock(spec=Job)
        job.source = "greenhouse"

        compliant = auto_apply_service._check_tos_compliance(job)

        assert compliant == True  # Greenhouse allows API submissions

    def test_check_tos_compliance_lever(self, auto_apply_service):
        """Test ToS compliance check for Lever"""
        job = Mock(spec=Job)
        job.source = "lever"

        compliant = auto_apply_service._check_tos_compliance(job)

        assert compliant == True  # Lever allows API submissions

    def test_validate_job_data(self, auto_apply_service, mock_job):
        """Test job data validation"""
        valid = auto_apply_service._validate_job_data(mock_job)

        assert valid == True

    def test_validate_job_data_missing_url(self, auto_apply_service, mock_job):
        """Test job data validation with missing URL"""
        mock_job.external_url = None

        valid = auto_apply_service._validate_job_data(mock_job)

        assert valid == False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
