"""Unit tests for JobIngestionService"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
import uuid

from app.services.job_ingestion_service import JobIngestionService
from app.schemas.job_feed import (
    JobSource,
    JobIngestionRequest,
    NormalizedJob,
    SalaryRange,
    JobFetchResult,
    JobMetadata,
    LocationType,
)
from app.db.models.job import Job, JobSource as JobSourceModel


@pytest.fixture
def mock_db():
    """Create mock database session"""
    db = Mock()
    db.query = Mock()
    db.add = Mock()
    db.commit = Mock()
    db.refresh = Mock()
    return db


@pytest.fixture
def ingestion_service(mock_db):
    """Create JobIngestionService with mocked dependencies"""
    with patch("app.services.job_ingestion_service.GreenhouseService"), patch(
        "app.services.job_ingestion_service.LeverService"
    ), patch("app.services.job_ingestion_service.JobNormalizationService"), patch(
        "app.services.job_ingestion_service.PineconeService"
    ):
        service = JobIngestionService(mock_db)
        return service


@pytest.fixture
def sample_normalized_job():
    """Sample normalized job"""
    return NormalizedJob(
        external_id="gh-123456",
        source=JobSource.GREENHOUSE,
        title="Senior Backend Engineer",
        company="Tech Corp",
        location="San Francisco, CA",
        location_type=LocationType.HYBRID,
        description="We are looking for a senior backend engineer with 5+ years of experience in Python and FastAPI. "
        "You will be responsible for building scalable microservices, designing APIs, and working with "
        "cross-functional teams to deliver high-quality software solutions. Strong understanding of "
        "distributed systems and cloud infrastructure is required.",
        required_skills=["Python", "FastAPI", "PostgreSQL"],
        preferred_skills=["AWS", "Docker"],
        experience_requirement="5+ years",
        experience_min_years=5,
        experience_max_years=10,
        experience_level="senior",
        salary=SalaryRange(min_salary=150000, max_salary=200000),
        department="Engineering",
        employment_type="full-time",
        requires_visa_sponsorship=False,
        application_url="https://example.com/jobs/123456/apply",
        posted_date=datetime.utcnow(),
    )


@pytest.fixture
def sample_source_config():
    """Sample job source configuration"""
    config = Mock()
    config.source = JobSource.GREENHOUSE
    config.config = {
        "board_token": "techcorp",
        "company_name": "Tech Corp",
        "department_id": "1",
        "office_id": "1",
    }
    return config


class TestJobIngestion:
    """Test complete job ingestion flow"""

    def test_ingest_jobs_success(
        self, ingestion_service, mock_db, sample_source_config, sample_normalized_job
    ):
        """Test successful job ingestion"""
        # Mock greenhouse service
        mock_fetch_result = JobFetchResult(
            jobs=[Mock()],  # Mock greenhouse job
            metadata=JobMetadata(
                total_fetched=1,
                new_jobs=0,
                updated_jobs=0,
                failed_jobs=0,
                fetch_duration_seconds=1.0,
                errors=[],
            ),
            source=JobSource.GREENHOUSE,
        )
        ingestion_service.greenhouse.fetch_jobs = Mock(return_value=mock_fetch_result)
        ingestion_service.normalizer.normalize_greenhouse_job = Mock(
            return_value=sample_normalized_job
        )

        # Mock database query (no existing job)
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = None
        mock_db.query.return_value = mock_query

        # Mock pinecone
        ingestion_service.pinecone.index_job = Mock()

        # Create request
        request = JobIngestionRequest(sources=[sample_source_config], incremental=True)

        # Execute
        result = ingestion_service.ingest_jobs(request)

        # Verify
        assert result.success is True
        assert result.metadata.new_jobs == 1
        assert result.metadata.updated_jobs == 0
        assert result.metadata.failed_jobs == 0
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called()

    def test_ingest_jobs_with_errors(self, ingestion_service, sample_source_config):
        """Test ingestion with errors"""
        # Mock greenhouse service to raise error
        ingestion_service.greenhouse.fetch_jobs = Mock(
            side_effect=Exception("API Error")
        )

        request = JobIngestionRequest(sources=[sample_source_config], incremental=True)

        result = ingestion_service.ingest_jobs(request)

        # Should handle error gracefully
        assert result.success is False
        assert result.metadata.failed_jobs > 0
        assert len(result.metadata.errors) > 0

    def test_ingest_multiple_sources(self, ingestion_service, mock_db):
        """Test ingesting from multiple sources"""
        # Create configs for both Greenhouse and Lever
        gh_config = Mock()
        gh_config.source = JobSource.GREENHOUSE
        gh_config.config = {"board_token": "company1", "company_name": "Company 1"}

        lever_config = Mock()
        lever_config.source = JobSource.LEVER
        lever_config.config = {"company_site": "company2", "company_name": "Company 2"}

        # Mock both services
        ingestion_service.greenhouse.fetch_jobs = Mock(
            return_value=JobFetchResult(
                jobs=[],
                metadata=JobMetadata(
                    total_fetched=0,
                    new_jobs=0,
                    updated_jobs=0,
                    failed_jobs=0,
                    fetch_duration_seconds=0.0,
                    errors=[],
                ),
                source=JobSource.GREENHOUSE,
            )
        )
        ingestion_service.lever.fetch_jobs = Mock(
            return_value=JobFetchResult(
                jobs=[],
                metadata=JobMetadata(
                    total_fetched=0,
                    new_jobs=0,
                    updated_jobs=0,
                    failed_jobs=0,
                    fetch_duration_seconds=0.0,
                    errors=[],
                ),
                source=JobSource.LEVER,
            )
        )

        request = JobIngestionRequest(
            sources=[gh_config, lever_config], incremental=True
        )

        result = ingestion_service.ingest_jobs(request)

        # Both services should be called
        ingestion_service.greenhouse.fetch_jobs.assert_called_once()
        ingestion_service.lever.fetch_jobs.assert_called_once()


class TestGreenhouseIngestion:
    """Test Greenhouse-specific ingestion"""

    def test_ingest_from_greenhouse_success(
        self, ingestion_service, sample_normalized_job
    ):
        """Test successful Greenhouse job fetching and normalization"""
        source_config = Mock()
        source_config.config = {
            "board_token": "techcorp",
            "company_name": "Tech Corp",
            "department_id": "1",
            "office_id": "1",
        }

        # Mock fetch result
        mock_gh_job = Mock()
        mock_gh_job.id = "123"
        fetch_result = JobFetchResult(
            jobs=[mock_gh_job],
            metadata=JobMetadata(
                total_fetched=1,
                new_jobs=0,
                updated_jobs=0,
                failed_jobs=0,
                fetch_duration_seconds=0.0,
                errors=[],
            ),
            source=JobSource.GREENHOUSE,
        )

        ingestion_service.greenhouse.fetch_jobs = Mock(return_value=fetch_result)
        ingestion_service.normalizer.normalize_greenhouse_job = Mock(
            return_value=sample_normalized_job
        )

        # Execute
        result = ingestion_service._ingest_from_greenhouse(source_config)

        # Verify
        assert len(result) == 1
        assert result[0] == sample_normalized_job
        ingestion_service.greenhouse.fetch_jobs.assert_called_once_with(
            board_token="techcorp", department_id="1", office_id="1"
        )

    def test_ingest_from_greenhouse_missing_board_token(self, ingestion_service):
        """Test error when board_token is missing"""
        source_config = Mock()
        source_config.config = {"company_name": "Tech Corp"}

        from app.core.exceptions import ServiceError

        with pytest.raises(ServiceError) as exc:
            ingestion_service._ingest_from_greenhouse(source_config)

        assert "board_token required" in str(exc.value)

    def test_ingest_from_greenhouse_normalization_errors(self, ingestion_service):
        """Test handling of normalization errors"""
        source_config = Mock()
        source_config.config = {"board_token": "techcorp", "company_name": "Tech Corp"}

        # Mock fetch with multiple jobs
        mock_jobs = [Mock(id="1"), Mock(id="2"), Mock(id="3")]
        fetch_result = JobFetchResult(
            jobs=mock_jobs,
            metadata=JobMetadata(
                total_fetched=3,
                new_jobs=0,
                updated_jobs=0,
                failed_jobs=0,
                fetch_duration_seconds=0.0,
                errors=[],
            ),
            source=JobSource.GREENHOUSE,
        )

        ingestion_service.greenhouse.fetch_jobs = Mock(return_value=fetch_result)

        # Make normalizer fail for second job
        def normalize_side_effect(job, company):
            if job.id == "2":
                raise Exception("Normalization failed")
            return Mock(spec=NormalizedJob)

        ingestion_service.normalizer.normalize_greenhouse_job = Mock(
            side_effect=normalize_side_effect
        )

        # Execute
        result = ingestion_service._ingest_from_greenhouse(source_config)

        # Should return only successfully normalized jobs
        assert len(result) == 2


class TestLeverIngestion:
    """Test Lever-specific ingestion"""

    def test_ingest_from_lever_success(self, ingestion_service, sample_normalized_job):
        """Test successful Lever job fetching and normalization"""
        source_config = Mock()
        source_config.config = {
            "company_site": "netflix",
            "company_name": "Netflix",
            "team": "Engineering",
        }

        # Mock fetch result
        mock_lever_job = Mock()
        mock_lever_job.id = "abc123"
        fetch_result = JobFetchResult(
            jobs=[mock_lever_job],
            metadata=JobMetadata(
                total_fetched=1,
                new_jobs=0,
                updated_jobs=0,
                failed_jobs=0,
                fetch_duration_seconds=0.0,
                errors=[],
            ),
            source=JobSource.LEVER,
        )

        ingestion_service.lever.fetch_jobs = Mock(return_value=fetch_result)
        ingestion_service.normalizer.normalize_lever_job = Mock(
            return_value=sample_normalized_job
        )

        # Execute
        result = ingestion_service._ingest_from_lever(source_config)

        # Verify
        assert len(result) == 1
        ingestion_service.lever.fetch_jobs.assert_called_once_with(
            company_site="netflix", team="Engineering", location=None, commitment=None
        )

    def test_ingest_from_lever_missing_company_site(self, ingestion_service):
        """Test error when company_site is missing"""
        source_config = Mock()
        source_config.config = {"company_name": "Netflix"}

        from app.core.exceptions import ServiceError

        with pytest.raises(ServiceError) as exc:
            ingestion_service._ingest_from_lever(source_config)

        assert "company_site required" in str(exc.value)


class TestJobSaveOrUpdate:
    """Test job saving and updating logic"""

    def test_save_new_job(self, ingestion_service, mock_db, sample_normalized_job):
        """Test creating a new job"""
        # Mock database query (no existing job)
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = None
        mock_db.query.return_value = mock_query

        # Mock pinecone
        ingestion_service.pinecone.index_job = Mock()
        ingestion_service.normalizer.detect_visa_sponsorship = Mock(return_value=False)

        # Execute
        result = ingestion_service._save_or_update_job(sample_normalized_job)

        # Verify
        assert result == "new"
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called()
        ingestion_service.pinecone.index_job.assert_called_once()

    def test_update_existing_job(
        self, ingestion_service, mock_db, sample_normalized_job
    ):
        """Test updating an existing job"""
        # Mock existing job with different title
        existing_job = Mock(spec=Job)
        existing_job.id = uuid.uuid4()
        existing_job.title = "Old Title"  # Different from sample
        existing_job.description = sample_normalized_job.description
        existing_job.location = sample_normalized_job.location
        existing_job.posted_date = datetime.utcnow() - timedelta(days=10)

        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = existing_job
        mock_db.query.return_value = mock_query

        # Mock pinecone
        ingestion_service.pinecone.index_job = Mock()
        ingestion_service.normalizer.detect_visa_sponsorship = Mock(return_value=False)

        # Execute
        result = ingestion_service._save_or_update_job(sample_normalized_job)

        # Verify
        assert result == "updated"
        assert existing_job.title == sample_normalized_job.title
        mock_db.commit.assert_called()
        ingestion_service.pinecone.index_job.assert_called_once()

    def test_skip_unchanged_job(
        self, ingestion_service, mock_db, sample_normalized_job
    ):
        """Test skipping job that hasn't changed"""
        # Mock existing job with same data
        existing_job = Mock(spec=Job)
        existing_job.title = sample_normalized_job.title
        existing_job.description = sample_normalized_job.description
        existing_job.location = sample_normalized_job.location
        existing_job.posted_date = sample_normalized_job.posted_date

        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = existing_job
        mock_db.query.return_value = mock_query

        # Execute
        result = ingestion_service._save_or_update_job(sample_normalized_job)

        # Verify
        assert result == "skipped"
        # Should not commit or reindex
        assert mock_db.commit.call_count == 0


class TestJobNeedsUpdate:
    """Test job update detection logic"""

    def test_update_needed_title_changed(
        self, ingestion_service, sample_normalized_job
    ):
        """Test update detection when title changes"""
        existing_job = Mock()
        existing_job.title = "Old Title"
        existing_job.description = sample_normalized_job.description
        existing_job.location = sample_normalized_job.location
        existing_job.posted_date = sample_normalized_job.posted_date

        assert (
            ingestion_service._job_needs_update(existing_job, sample_normalized_job)
            is True
        )

    def test_update_needed_description_changed(
        self, ingestion_service, sample_normalized_job
    ):
        """Test update detection when description changes"""
        existing_job = Mock()
        existing_job.title = sample_normalized_job.title
        existing_job.description = "Old description"
        existing_job.location = sample_normalized_job.location
        existing_job.posted_date = sample_normalized_job.posted_date

        assert (
            ingestion_service._job_needs_update(existing_job, sample_normalized_job)
            is True
        )

    def test_update_needed_posted_date_newer(
        self, ingestion_service, sample_normalized_job
    ):
        """Test update detection when posted date is newer"""
        existing_job = Mock()
        existing_job.title = sample_normalized_job.title
        existing_job.description = sample_normalized_job.description
        existing_job.location = sample_normalized_job.location
        existing_job.posted_date = datetime.utcnow() - timedelta(days=10)

        assert (
            ingestion_service._job_needs_update(existing_job, sample_normalized_job)
            is True
        )

    def test_no_update_needed(self, ingestion_service, sample_normalized_job):
        """Test when no update is needed"""
        existing_job = Mock()
        existing_job.title = sample_normalized_job.title
        existing_job.description = sample_normalized_job.description
        existing_job.location = sample_normalized_job.location
        existing_job.posted_date = sample_normalized_job.posted_date

        assert (
            ingestion_service._job_needs_update(existing_job, sample_normalized_job)
            is False
        )


class TestStaleJobDeactivation:
    """Test stale job deactivation"""

    def test_deactivate_stale_jobs(self, ingestion_service, mock_db):
        """Test deactivating jobs older than threshold"""
        # Mock stale jobs
        stale_jobs = [Mock(spec=Job) for _ in range(3)]
        for job in stale_jobs:
            job.is_active = True

        mock_query = Mock()
        mock_query.filter.return_value.all.return_value = stale_jobs
        mock_db.query.return_value = mock_query

        # Execute
        count = ingestion_service.deactivate_stale_jobs(
            source=JobSource.GREENHOUSE, days_old=30
        )

        # Verify
        assert count == 3
        for job in stale_jobs:
            assert job.is_active is False
        mock_db.commit.assert_called_once()

    def test_deactivate_no_stale_jobs(self, ingestion_service, mock_db):
        """Test when no stale jobs exist"""
        mock_query = Mock()
        mock_query.filter.return_value.all.return_value = []
        mock_db.query.return_value = mock_query

        count = ingestion_service.deactivate_stale_jobs(
            source=JobSource.GREENHOUSE, days_old=30
        )

        assert count == 0


class TestSourceHealth:
    """Test source health monitoring"""

    def test_get_source_health_healthy(self, ingestion_service, mock_db):
        """Test health check for healthy source"""

        # Mock database queries
        def query_side_effect(model):
            mock_query = Mock()
            if model == Job:
                mock_query.filter.return_value.count.return_value = 150  # Active jobs
                return mock_query
            elif model == JobSourceModel:
                source_record = Mock()
                source_record.last_sync_at = datetime.utcnow() - timedelta(hours=2)
                mock_query.filter.return_value.first.return_value = source_record
                return mock_query
            return mock_query

        mock_db.query.side_effect = query_side_effect

        # Execute
        health = ingestion_service.get_source_health(JobSource.GREENHOUSE)

        # Verify
        assert health["source"] == "greenhouse"
        assert health["active_jobs"] > 0
        assert health["is_healthy"] is True

    def test_get_source_health_unhealthy(self, ingestion_service, mock_db):
        """Test health check for unhealthy source"""

        def query_side_effect(model):
            mock_query = Mock()
            if model == Job:
                mock_query.filter.return_value.count.return_value = 0  # No active jobs
                return mock_query
            elif model == JobSourceModel:
                source_record = Mock()
                source_record.last_sync_at = datetime.utcnow() - timedelta(days=10)
                mock_query.filter.return_value.first.return_value = source_record
                return mock_query
            return mock_query

        mock_db.query.side_effect = query_side_effect

        health = ingestion_service.get_source_health(JobSource.GREENHOUSE)

        assert health["is_healthy"] is False


class TestSourceSyncTimeUpdate:
    """Test source sync timestamp updates"""

    def test_update_existing_source_sync_time(self, ingestion_service, mock_db):
        """Test updating sync time for existing source"""
        existing_source = Mock(spec=JobSourceModel)
        existing_source.last_sync_at = datetime.utcnow() - timedelta(hours=1)

        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = existing_source
        mock_db.query.return_value = mock_query

        # Execute
        ingestion_service.update_source_sync_time(JobSource.GREENHOUSE)

        # Verify sync time was updated
        assert existing_source.last_sync_at > datetime.utcnow() - timedelta(seconds=5)
        mock_db.commit.assert_called_once()

    def test_create_new_source_record(self, ingestion_service, mock_db):
        """Test creating new source record if it doesn't exist"""
        mock_query = Mock()
        mock_query.filter.return_value.first.return_value = None  # No existing record
        mock_db.query.return_value = mock_query

        # Execute
        ingestion_service.update_source_sync_time(JobSource.LEVER)

        # Verify new record was created
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
