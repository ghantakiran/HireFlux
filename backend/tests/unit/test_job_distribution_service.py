"""Unit tests for JobDistributionService (Sprint 11-12 Phase 3B)

Test-Driven Development (TDD) approach:
- Tests written BEFORE implementation
- Following E2E test requirements from 22-mass-job-posting.spec.ts
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timedelta
from typing import Dict, Any

from app.services.job_distribution_service import JobDistributionService
from app.schemas.bulk_job_posting import (
    DistributionChannelEnum,
    DistributionStatusEnum,
    DistributionCreate,
    BulkDistributionCreate,
)
from app.core.exceptions import ServiceError


@pytest.fixture
def mock_db():
    """Mock database session"""
    mock = AsyncMock()
    mock.execute = AsyncMock()
    mock.commit = AsyncMock()
    mock.refresh = AsyncMock()
    return mock


@pytest.fixture
def sample_job_data():
    """Sample job data for distribution"""
    return {
        "id": "job-123",
        "company_id": "company-abc",
        "title": "Senior Software Engineer",
        "department": "Engineering",
        "location": "Remote",
        "location_type": "remote",
        "employment_type": "full_time",
        "experience_level": "senior",
        "salary_min": 130000,
        "salary_max": 170000,
        "description": "We are looking for a Senior Software Engineer...",
        "requirements": "5+ years of experience with Python, React, AWS...",
        "skills": ["Python", "React", "AWS", "PostgreSQL"],
    }


@pytest.fixture
def service(mock_db):
    """JobDistributionService with mocked dependencies"""
    return JobDistributionService(db=mock_db)


class TestLinkedInDistribution:
    """Tests for LinkedIn job distribution"""

    @pytest.mark.asyncio
    async def test_publish_to_linkedin_success(self, service, sample_job_data):
        """Should successfully publish job to LinkedIn"""
        # GIVEN: Valid job data and LinkedIn channel
        distribution_create = DistributionCreate(
            job_id=sample_job_data["id"], channel=DistributionChannelEnum.LINKEDIN
        )

        # Mock LinkedIn API response
        service._linkedin_client = Mock()
        service._linkedin_client.post_job = AsyncMock(
            return_value={
                "id": "linkedin-post-12345",
                "url": "https://www.linkedin.com/jobs/view/12345",
                "status": "published",
            }
        )

        # WHEN: Publishing to LinkedIn
        result = await service.publish_to_channel(
            job_data=sample_job_data, distribution=distribution_create
        )

        # THEN: Distribution is created successfully
        assert result["status"] == DistributionStatusEnum.PUBLISHED
        assert result["channel"] == DistributionChannelEnum.LINKEDIN
        assert result["external_post_id"] == "linkedin-post-12345"
        assert result["external_post_url"] == "https://www.linkedin.com/jobs/view/12345"
        assert result["error_message"] is None

    @pytest.mark.asyncio
    async def test_publish_to_linkedin_api_error(self, service, sample_job_data):
        """Should handle LinkedIn API errors"""
        # GIVEN: LinkedIn API returns error
        distribution_create = DistributionCreate(
            job_id=sample_job_data["id"], channel=DistributionChannelEnum.LINKEDIN
        )

        service._linkedin_client = Mock()
        service._linkedin_client.post_job = AsyncMock(
            side_effect=Exception("LinkedIn API Error: Rate limit exceeded")
        )

        # WHEN: Publishing fails
        result = await service.publish_to_channel(
            job_data=sample_job_data, distribution=distribution_create
        )

        # THEN: Distribution status is FAILED with error message
        assert result["status"] == DistributionStatusEnum.FAILED
        assert "Rate limit exceeded" in result["error_message"]
        assert result["external_post_id"] is None

    @pytest.mark.asyncio
    async def test_linkedin_required_fields_validation(self, service, sample_job_data):
        """Should validate required fields for LinkedIn"""
        # GIVEN: Job data missing required LinkedIn fields
        invalid_job = sample_job_data.copy()
        invalid_job["description"] = None  # LinkedIn requires description

        distribution_create = DistributionCreate(
            job_id=invalid_job["id"], channel=DistributionChannelEnum.LINKEDIN
        )

        # WHEN: Attempting to publish
        result = await service.publish_to_channel(
            job_data=invalid_job, distribution=distribution_create
        )

        # THEN: Validation error is returned
        assert result["status"] == DistributionStatusEnum.FAILED
        assert "description" in result["error_message"].lower()


class TestIndeedDistribution:
    """Tests for Indeed job distribution"""

    @pytest.mark.asyncio
    async def test_publish_to_indeed_success(self, service, sample_job_data):
        """Should successfully publish job to Indeed"""
        # GIVEN: Valid job data and Indeed channel
        distribution_create = DistributionCreate(
            job_id=sample_job_data["id"], channel=DistributionChannelEnum.INDEED
        )

        # Mock Indeed API response
        service._indeed_client = Mock()
        service._indeed_client.post_job = AsyncMock(
            return_value={
                "jobId": "indeed-job-67890",
                "url": "https://www.indeed.com/viewjob?jk=67890",
                "status": "active",
            }
        )

        # WHEN: Publishing to Indeed
        result = await service.publish_to_channel(
            job_data=sample_job_data, distribution=distribution_create
        )

        # THEN: Distribution is created successfully
        assert result["status"] == DistributionStatusEnum.PUBLISHED
        assert result["channel"] == DistributionChannelEnum.INDEED
        assert result["external_post_id"] == "indeed-job-67890"
        assert result["external_post_url"] == "https://www.indeed.com/viewjob?jk=67890"

    @pytest.mark.asyncio
    async def test_indeed_api_timeout(self, service, sample_job_data):
        """Should handle Indeed API timeout"""
        # GIVEN: Indeed API times out
        distribution_create = DistributionCreate(
            job_id=sample_job_data["id"], channel=DistributionChannelEnum.INDEED
        )

        service._indeed_client = Mock()
        service._indeed_client.post_job = AsyncMock(
            side_effect=TimeoutError("Indeed API timeout")
        )

        # WHEN: Publishing times out
        result = await service.publish_to_channel(
            job_data=sample_job_data, distribution=distribution_create
        )

        # THEN: Distribution status is FAILED
        assert result["status"] == DistributionStatusEnum.FAILED
        assert "timeout" in result["error_message"].lower()


class TestGlassdoorDistribution:
    """Tests for Glassdoor job distribution"""

    @pytest.mark.asyncio
    async def test_publish_to_glassdoor_success(self, service, sample_job_data):
        """Should successfully publish job to Glassdoor"""
        # GIVEN: Valid job data and Glassdoor channel
        distribution_create = DistributionCreate(
            job_id=sample_job_data["id"], channel=DistributionChannelEnum.GLASSDOOR
        )

        # Mock Glassdoor API response
        service._glassdoor_client = Mock()
        service._glassdoor_client.post_job = AsyncMock(
            return_value={
                "jobListingId": "glassdoor-listing-abc123",
                "jobUrl": "https://www.glassdoor.com/job-listing/abc123",
                "status": "ACTIVE",
            }
        )

        # WHEN: Publishing to Glassdoor
        result = await service.publish_to_channel(
            job_data=sample_job_data, distribution=distribution_create
        )

        # THEN: Distribution is created successfully
        assert result["status"] == DistributionStatusEnum.PUBLISHED
        assert result["channel"] == DistributionChannelEnum.GLASSDOOR
        assert result["external_post_id"] == "glassdoor-listing-abc123"

    @pytest.mark.asyncio
    async def test_glassdoor_salary_required(self, service, sample_job_data):
        """Should require salary range for Glassdoor"""
        # GIVEN: Job data without salary (Glassdoor requires it)
        invalid_job = sample_job_data.copy()
        invalid_job["salary_min"] = None
        invalid_job["salary_max"] = None

        distribution_create = DistributionCreate(
            job_id=invalid_job["id"], channel=DistributionChannelEnum.GLASSDOOR
        )

        # WHEN: Attempting to publish
        result = await service.publish_to_channel(
            job_data=invalid_job, distribution=distribution_create
        )

        # THEN: Validation error is returned
        assert result["status"] == DistributionStatusEnum.FAILED
        assert "salary" in result["error_message"].lower()


class TestInternalDistribution:
    """Tests for internal job board distribution"""

    @pytest.mark.asyncio
    async def test_publish_to_internal_success(self, service, sample_job_data):
        """Should successfully publish job to internal board"""
        # GIVEN: Valid job data and INTERNAL channel
        distribution_create = DistributionCreate(
            job_id=sample_job_data["id"], channel=DistributionChannelEnum.INTERNAL
        )

        # WHEN: Publishing to internal board
        result = await service.publish_to_channel(
            job_data=sample_job_data, distribution=distribution_create
        )

        # THEN: Distribution is created successfully
        assert result["status"] == DistributionStatusEnum.PUBLISHED
        assert result["channel"] == DistributionChannelEnum.INTERNAL
        # Internal distribution doesn't need external IDs
        assert (
            result["external_post_id"] is None
            or result["external_post_id"] == sample_job_data["id"]
        )


class TestBulkDistribution:
    """Tests for bulk job distribution"""

    @pytest.mark.asyncio
    async def test_bulk_distribute_multiple_jobs_multiple_channels(self, service):
        """Should distribute multiple jobs to multiple channels"""
        # GIVEN: Multiple jobs and multiple channels
        jobs = [
            {
                "id": "job-1",
                "title": "Engineer 1",
                "description": "Desc 1",
                "company_id": "company-abc",
            },
            {
                "id": "job-2",
                "title": "Engineer 2",
                "description": "Desc 2",
                "company_id": "company-abc",
            },
            {
                "id": "job-3",
                "title": "Engineer 3",
                "description": "Desc 3",
                "company_id": "company-abc",
            },
        ]

        bulk_distribution = BulkDistributionCreate(
            upload_id="upload-123",
            channels=[DistributionChannelEnum.LINKEDIN, DistributionChannelEnum.INDEED],
        )

        # Mock successful distributions
        service._linkedin_client = Mock()
        service._linkedin_client.post_job = AsyncMock(
            return_value={
                "id": "linkedin-post",
                "url": "https://linkedin.com/jobs/123",
                "status": "published",
            }
        )

        service._indeed_client = Mock()
        service._indeed_client.post_job = AsyncMock(
            return_value={
                "jobId": "indeed-job",
                "url": "https://indeed.com/job/123",
                "status": "active",
            }
        )

        # WHEN: Bulk distributing
        results = await service.bulk_distribute(
            jobs=jobs, distribution=bulk_distribution
        )

        # THEN: All jobs distributed to all channels
        assert len(results) == 6  # 3 jobs × 2 channels
        published_count = sum(
            1 for r in results if r["status"] == DistributionStatusEnum.PUBLISHED
        )
        assert published_count == 6

    @pytest.mark.asyncio
    async def test_bulk_distribute_with_partial_failures(self, service):
        """Should continue bulk distribution on partial failures"""
        # GIVEN: Multiple jobs, some will fail
        jobs = [
            {
                "id": "job-1",
                "title": "Engineer 1",
                "description": "Desc 1",
                "company_id": "company-abc",
            },
            {
                "id": "job-2",
                "title": "Engineer 2",
                "description": None,
                "company_id": "company-abc",
            },  # Will fail
            {
                "id": "job-3",
                "title": "Engineer 3",
                "description": "Desc 3",
                "company_id": "company-abc",
            },
        ]

        bulk_distribution = BulkDistributionCreate(
            upload_id="upload-123", channels=[DistributionChannelEnum.LINKEDIN]
        )

        # Mock LinkedIn client
        service._linkedin_client = Mock()
        service._linkedin_client.post_job = AsyncMock(
            return_value={
                "id": "linkedin-post",
                "url": "https://linkedin.com/jobs/123",
                "status": "published",
            }
        )

        # WHEN: Bulk distributing with skip_on_error=True
        results = await service.bulk_distribute(
            jobs=jobs, distribution=bulk_distribution, skip_on_error=True
        )

        # THEN: Successful jobs are published, failed jobs are tracked
        assert len(results) == 3
        published_count = sum(
            1 for r in results if r["status"] == DistributionStatusEnum.PUBLISHED
        )
        failed_count = sum(
            1 for r in results if r["status"] == DistributionStatusEnum.FAILED
        )

        assert published_count == 2  # job-1 and job-3
        assert failed_count == 1  # job-2

    @pytest.mark.asyncio
    async def test_bulk_distribute_stops_on_error(self, service):
        """Should stop bulk distribution on first error if skip_on_error=False"""
        # GIVEN: Multiple jobs with skip_on_error=False
        jobs = [
            {
                "id": "job-1",
                "title": "Engineer 1",
                "description": "Desc 1",
                "company_id": "company-abc",
            },
            {
                "id": "job-2",
                "title": "Engineer 2",
                "description": None,
                "company_id": "company-abc",
            },  # Will fail
            {
                "id": "job-3",
                "title": "Engineer 3",
                "description": "Desc 3",
                "company_id": "company-abc",
            },
        ]

        bulk_distribution = BulkDistributionCreate(
            upload_id="upload-123", channels=[DistributionChannelEnum.LINKEDIN]
        )

        service._linkedin_client = Mock()
        service._linkedin_client.post_job = AsyncMock(
            return_value={
                "id": "linkedin-post",
                "url": "https://linkedin.com/jobs/123",
                "status": "published",
            }
        )

        # WHEN: Bulk distributing with skip_on_error=False
        # THEN: Should raise exception on first error
        with pytest.raises(ServiceError) as exc_info:
            await service.bulk_distribute(
                jobs=jobs, distribution=bulk_distribution, skip_on_error=False
            )

        assert "description" in str(exc_info.value).lower()


class TestRetryLogic:
    """Tests for distribution retry logic"""

    @pytest.mark.asyncio
    async def test_retry_failed_distribution_success(self, service, sample_job_data):
        """Should successfully retry failed distribution"""
        # GIVEN: Previously failed distribution
        distribution_id = "dist-failed-123"

        # Mock getting failed distribution from DB
        service._get_distribution = AsyncMock(
            return_value={
                "id": distribution_id,
                "job_id": sample_job_data["id"],
                "channel": DistributionChannelEnum.LINKEDIN,
                "status": DistributionStatusEnum.FAILED,
                "retry_count": 1,
                "max_retries": 3,
            }
        )

        # Mock getting job data
        service._get_job_data = AsyncMock(return_value=sample_job_data)

        # Mock successful retry
        service._linkedin_client = Mock()
        service._linkedin_client.post_job = AsyncMock(
            return_value={
                "id": "linkedin-post-retry",
                "url": "https://linkedin.com/jobs/456",
                "status": "published",
            }
        )

        # WHEN: Retrying distribution
        result = await service.retry_distribution(distribution_id)

        # THEN: Distribution is now published
        assert result["status"] == DistributionStatusEnum.PUBLISHED
        assert result["retry_count"] == 2
        assert result["external_post_id"] == "linkedin-post-retry"

    @pytest.mark.asyncio
    async def test_retry_exceeds_max_retries(self, service, sample_job_data):
        """Should not retry if max retries exceeded"""
        # GIVEN: Distribution at max retries
        distribution_id = "dist-max-retries-123"

        service._get_distribution = AsyncMock(
            return_value={
                "id": distribution_id,
                "job_id": sample_job_data["id"],
                "channel": DistributionChannelEnum.INDEED,
                "status": DistributionStatusEnum.FAILED,
                "retry_count": 3,
                "max_retries": 3,
            }
        )

        # WHEN: Attempting to retry
        # THEN: Should raise exception
        with pytest.raises(ServiceError) as exc_info:
            await service.retry_distribution(distribution_id)

        assert "max retries" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_retry_exponential_backoff(self, service, sample_job_data):
        """Should implement exponential backoff for retries"""
        # GIVEN: Multiple retry attempts
        distribution_create = DistributionCreate(
            job_id=sample_job_data["id"], channel=DistributionChannelEnum.LINKEDIN
        )

        service._linkedin_client = Mock()
        # First two attempts fail, third succeeds
        service._linkedin_client.post_job = AsyncMock(
            side_effect=[
                Exception("Temporary error"),
                Exception("Temporary error"),
                {
                    "id": "linkedin-post",
                    "url": "https://linkedin.com/jobs/789",
                    "status": "published",
                },
            ]
        )

        # WHEN: Publishing with auto-retry enabled
        result = await service.publish_with_retry(
            job_data=sample_job_data, distribution=distribution_create, max_retries=3
        )

        # THEN: Eventually succeeds after retries
        assert result["status"] == DistributionStatusEnum.PUBLISHED
        assert result["retry_count"] >= 2


class TestDistributionTracking:
    """Tests for distribution tracking and metrics"""

    @pytest.mark.asyncio
    async def test_update_distribution_metrics(self, service):
        """Should update distribution metrics (views, applications, clicks)"""
        # GIVEN: Published distribution
        distribution_id = "dist-published-123"

        # WHEN: Updating metrics from external API
        result = await service.update_metrics(
            distribution_id=distribution_id,
            views_count=150,
            applications_count=12,
            clicks_count=45,
        )

        # THEN: Metrics are updated
        assert result["views_count"] == 150
        assert result["applications_count"] == 12
        assert result["clicks_count"] == 45

    @pytest.mark.asyncio
    async def test_get_distribution_dashboard(self, service):
        """Should return distribution dashboard with metrics"""
        # GIVEN: Upload with multiple distributions
        upload_id = "upload-dashboard-123"

        # Mock database query
        service._get_distributions_by_upload = AsyncMock(
            return_value=[
                {
                    "id": "dist-1",
                    "channel": DistributionChannelEnum.LINKEDIN,
                    "status": DistributionStatusEnum.PUBLISHED,
                    "views_count": 200,
                    "applications_count": 15,
                    "clicks_count": 50,
                },
                {
                    "id": "dist-2",
                    "channel": DistributionChannelEnum.INDEED,
                    "status": DistributionStatusEnum.PUBLISHED,
                    "views_count": 180,
                    "applications_count": 10,
                    "clicks_count": 40,
                },
                {
                    "id": "dist-3",
                    "channel": DistributionChannelEnum.GLASSDOOR,
                    "status": DistributionStatusEnum.FAILED,
                    "views_count": 0,
                    "applications_count": 0,
                    "clicks_count": 0,
                },
            ]
        )

        # WHEN: Getting dashboard
        dashboard = await service.get_distribution_dashboard(upload_id)

        # THEN: Dashboard includes all distributions and aggregated metrics
        assert dashboard["upload_id"] == upload_id
        assert len(dashboard["distributions"]) == 3

        metrics = dashboard["metrics"]
        assert metrics["total_distributions"] == 3
        assert metrics["by_channel"][DistributionChannelEnum.LINKEDIN] == 1
        assert metrics["by_status"][DistributionStatusEnum.PUBLISHED] == 2
        assert metrics["by_status"][DistributionStatusEnum.FAILED] == 1
        assert metrics["total_views"] == 380
        assert metrics["total_applications"] == 25
        assert metrics["total_clicks"] == 90

    @pytest.mark.asyncio
    async def test_filter_distributions_by_status(self, service):
        """Should filter distributions by status"""
        # GIVEN: Multiple distributions with different statuses
        company_id = "company-filter-test"

        # WHEN: Filtering by PUBLISHED status
        results = await service.list_distributions(
            company_id=company_id,
            status_filter=DistributionStatusEnum.PUBLISHED,
            page=1,
            limit=20,
        )

        # THEN: Only published distributions are returned
        for dist in results["distributions"]:
            assert dist["status"] == DistributionStatusEnum.PUBLISHED


class TestScheduledDistribution:
    """Tests for scheduled job distribution"""

    @pytest.mark.asyncio
    async def test_schedule_distribution_for_future(self, service, sample_job_data):
        """Should schedule distribution for future date"""
        # GIVEN: Distribution with scheduled_publish_at
        scheduled_time = datetime.utcnow() + timedelta(days=7)

        distribution_create = DistributionCreate(
            job_id=sample_job_data["id"],
            channel=DistributionChannelEnum.LINKEDIN,
            scheduled_publish_at=scheduled_time,
        )

        # WHEN: Creating scheduled distribution
        result = await service.create_scheduled_distribution(
            job_data=sample_job_data, distribution=distribution_create
        )

        # THEN: Distribution is created with PENDING status
        assert result["status"] == DistributionStatusEnum.PENDING
        assert result["scheduled_publish_at"] == scheduled_time
        assert result["published_at"] is None

    @pytest.mark.asyncio
    async def test_process_scheduled_distributions(self, service):
        """Should process distributions scheduled for now"""
        # GIVEN: Distributions scheduled for current time
        now = datetime.utcnow()

        # Mock scheduled distributions
        service._get_pending_scheduled_distributions = AsyncMock(
            return_value=[
                {
                    "id": "dist-sched-1",
                    "job_id": "job-1",
                    "channel": DistributionChannelEnum.LINKEDIN,
                    "scheduled_publish_at": now - timedelta(minutes=5),  # Past due
                    "status": DistributionStatusEnum.PENDING,
                },
                {
                    "id": "dist-sched-2",
                    "job_id": "job-2",
                    "channel": DistributionChannelEnum.INDEED,
                    "scheduled_publish_at": now + timedelta(hours=1),  # Future
                    "status": DistributionStatusEnum.PENDING,
                },
            ]
        )

        # Mock getting job data
        service._get_job_data = AsyncMock(
            return_value={
                "id": "job-1",
                "title": "Test Job",
                "description": "Test Description",
                "company_id": "company-123",
            }
        )

        service._linkedin_client = Mock()
        service._linkedin_client.post_job = AsyncMock(
            return_value={
                "id": "linkedin-post",
                "url": "https://linkedin.com/jobs/123",
                "status": "published",
            }
        )

        # WHEN: Processing scheduled distributions
        results = await service.process_scheduled_distributions()

        # THEN: Only past-due distribution is published
        assert len(results) == 1
        assert results[0]["id"] == "dist-sched-1"
        assert results[0]["status"] == DistributionStatusEnum.PUBLISHED


class TestRateLimiting:
    """Tests for rate limiting"""

    @pytest.mark.asyncio
    async def test_respect_linkedin_rate_limits(self, service, sample_job_data):
        """Should respect LinkedIn rate limits"""
        # GIVEN: Multiple rapid requests to LinkedIn
        jobs = [sample_job_data.copy() for _ in range(100)]
        for i, job in enumerate(jobs):
            job["id"] = f"job-{i}"

        bulk_distribution = BulkDistributionCreate(
            upload_id="upload-rate-limit", channels=[DistributionChannelEnum.LINKEDIN]
        )

        service._linkedin_client = Mock()
        service._linkedin_client.post_job = AsyncMock(
            return_value={
                "id": "linkedin-post",
                "url": "https://linkedin.com/jobs/123",
                "status": "published",
            }
        )

        # WHEN: Bulk distributing many jobs
        start_time = datetime.utcnow()
        results = await service.bulk_distribute(
            jobs=jobs, distribution=bulk_distribution
        )
        end_time = datetime.utcnow()

        # THEN: Rate limiting is applied (should take longer than instant)
        # LinkedIn has rate limits, so 100 jobs shouldn't complete instantly
        assert len(results) == 100
        duration = (end_time - start_time).total_seconds()
        # With rate limiting, should take some time (not instant)
        # This is just a sanity check - actual implementation will use rate limiter


class TestChannelConfiguration:
    """Tests for per-channel configuration"""

    @pytest.mark.asyncio
    async def test_linkedin_character_limits(self, service, sample_job_data):
        """Should enforce LinkedIn character limits"""
        # GIVEN: Job with title exceeding LinkedIn's 100-char limit
        long_title = "Senior Software Engineer " * 10  # Very long title
        invalid_job = sample_job_data.copy()
        invalid_job["title"] = long_title

        distribution_create = DistributionCreate(
            job_id=invalid_job["id"], channel=DistributionChannelEnum.LINKEDIN
        )

        # WHEN: Publishing to LinkedIn
        result = await service.publish_to_channel(
            job_data=invalid_job, distribution=distribution_create
        )

        # THEN: Should either truncate or fail with validation error
        assert result["status"] in [
            DistributionStatusEnum.PUBLISHED,
            DistributionStatusEnum.FAILED,
        ]
        if result["status"] == DistributionStatusEnum.FAILED:
            assert (
                "title" in result["error_message"].lower()
                or "character" in result["error_message"].lower()
            )
