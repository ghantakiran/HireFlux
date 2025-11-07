"""Unit tests for GreenhouseService"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import requests

from app.services.greenhouse_service import GreenhouseService
from app.schemas.job_feed import JobSource


@pytest.fixture
def mock_db():
    """Create mock database session"""
    return Mock()


@pytest.fixture
def greenhouse_service(mock_db):
    """Create GreenhouseService instance"""
    return GreenhouseService(mock_db)


@pytest.fixture
def mock_greenhouse_departments():
    """Mock Greenhouse departments response"""
    return {
        "departments": [
            {"id": 1, "name": "Engineering"},
            {"id": 2, "name": "Product"},
            {"id": 3, "name": "Sales"},
        ]
    }


@pytest.fixture
def mock_greenhouse_offices():
    """Mock Greenhouse offices response"""
    return {
        "offices": [
            {
                "id": 1,
                "name": "San Francisco",
                "location": {"name": "San Francisco, CA"},
            },
            {"id": 2, "name": "Remote", "location": {"name": "Remote"}},
            {"id": 3, "name": "New York", "location": {"name": "New York, NY"}},
        ]
    }


@pytest.fixture
def mock_greenhouse_jobs():
    """Mock Greenhouse jobs response"""
    return {
        "jobs": [
            {
                "id": 12345,
                "title": "Senior Backend Engineer",
                "departments": [{"id": 1}],
                "offices": [{"id": 1}],
                "location": {"name": "San Francisco, CA"},
                "absolute_url": "https://example.com/jobs/12345",
                "updated_at": "2025-10-24T00:00:00Z",
                "requisition_id": "REQ-001",
                "metadata": [],
                "content": "Great opportunity for a backend engineer...",
            },
            {
                "id": 12346,
                "title": "Frontend Engineer",
                "departments": [{"id": 1}],
                "offices": [{"id": 2}],
                "location": {"name": "Remote"},
                "absolute_url": "https://example.com/jobs/12346",
                "updated_at": "2025-10-24T00:00:00Z",
                "requisition_id": "REQ-002",
                "metadata": [],
                "content": "Remote frontend position...",
            },
        ]
    }


class TestRateLimiting:
    """Test rate limiting functionality"""

    def test_rate_limit_allows_requests_within_limit(self, greenhouse_service):
        """Test that requests within limit are allowed"""
        # Should allow up to 10 requests
        for _ in range(10):
            assert greenhouse_service._check_rate_limit() is True
            greenhouse_service._request_times.append(datetime.utcnow())

    def test_rate_limit_blocks_excess_requests(self, greenhouse_service):
        """Test that requests exceeding limit are blocked"""
        # Fill up rate limit
        for _ in range(10):
            greenhouse_service._request_times.append(datetime.utcnow())

        # Next request should be blocked
        assert greenhouse_service._check_rate_limit() is False

    def test_rate_limit_resets_after_window(self, greenhouse_service):
        """Test that rate limit resets after time window"""
        from datetime import timedelta

        # Add old requests (> 60 seconds ago)
        old_time = datetime.utcnow() - timedelta(seconds=61)
        for _ in range(10):
            greenhouse_service._request_times.append(old_time)

        # Should allow new requests after window
        assert greenhouse_service._check_rate_limit() is True


class TestJobFetching:
    """Test job fetching functionality"""

    @patch("app.services.greenhouse_service.requests.get")
    def test_fetch_jobs_success(
        self,
        mock_get,
        greenhouse_service,
        mock_greenhouse_departments,
        mock_greenhouse_offices,
        mock_greenhouse_jobs,
    ):
        """Test successful job fetching"""
        # Mock API responses
        mock_get.side_effect = [
            Mock(status_code=200, json=lambda: mock_greenhouse_departments),
            Mock(status_code=200, json=lambda: mock_greenhouse_offices),
            Mock(status_code=200, json=lambda: mock_greenhouse_jobs),
        ]

        result = greenhouse_service.fetch_jobs(board_token="testcompany")

        assert result.source == JobSource.GREENHOUSE
        assert len(result.jobs) == 2
        assert result.metadata.total_fetched == 2
        assert result.metadata.failed_jobs == 0

    @patch("app.services.greenhouse_service.requests.get")
    def test_fetch_jobs_with_filters(
        self,
        mock_get,
        greenhouse_service,
        mock_greenhouse_departments,
        mock_greenhouse_offices,
        mock_greenhouse_jobs,
    ):
        """Test job fetching with department and office filters"""
        mock_get.side_effect = [
            Mock(status_code=200, json=lambda: mock_greenhouse_departments),
            Mock(status_code=200, json=lambda: mock_greenhouse_offices),
            Mock(status_code=200, json=lambda: mock_greenhouse_jobs),
        ]

        result = greenhouse_service.fetch_jobs(
            board_token="testcompany", department_id="1", office_id="1"
        )

        # Verify filters were passed
        assert mock_get.call_count == 3
        jobs_call = mock_get.call_args_list[2]
        assert jobs_call[1]["params"]["department_id"] == "1"
        assert jobs_call[1]["params"]["office_id"] == "1"

    @patch("app.services.greenhouse_service.requests.get")
    def test_fetch_jobs_api_error(self, mock_get, greenhouse_service):
        """Test handling of API errors"""
        mock_get.side_effect = requests.exceptions.RequestException("API Error")

        from app.core.exceptions import ServiceError

        with pytest.raises(ServiceError):
            greenhouse_service.fetch_jobs(board_token="testcompany")

    @patch("app.services.greenhouse_service.requests.get")
    def test_fetch_jobs_http_error(self, mock_get, greenhouse_service):
        """Test handling of HTTP errors"""
        mock_response = Mock()
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError(
            "404"
        )
        mock_get.return_value = mock_response

        from app.core.exceptions import ServiceError

        with pytest.raises(ServiceError):
            greenhouse_service.fetch_jobs(board_token="testcompany")


class TestJobParsing:
    """Test job data parsing"""

    def test_parse_greenhouse_job_remote(self, greenhouse_service):
        """Test parsing remote job"""
        from app.schemas.job_feed import GreenhouseDepartment, GreenhouseOffice

        job_data = {
            "id": 123,
            "title": "Software Engineer",
            "departments": [{"id": 1}],
            "offices": [{"id": 1}],
            "location": {"name": "Remote"},
            "absolute_url": "https://example.com/jobs/123",
            "updated_at": "2025-10-24T00:00:00Z",
            "requisition_id": "REQ-001",
            "metadata": [],
            "content": "Remote position...",
        }

        departments = [GreenhouseDepartment(id="1", name="Engineering")]
        offices = [GreenhouseOffice(id="1", name="Remote", location="Remote")]

        result = greenhouse_service._parse_greenhouse_job(
            job_data, departments, offices
        )

        assert result.id == "123"
        assert result.title == "Software Engineer"
        assert result.location_type == "remote"
        assert len(result.departments) == 1
        assert result.departments[0].name == "Engineering"

    def test_parse_greenhouse_job_hybrid(self, greenhouse_service):
        """Test parsing hybrid job"""
        from app.schemas.job_feed import GreenhouseDepartment, GreenhouseOffice

        job_data = {
            "id": 456,
            "title": "Product Manager",
            "departments": [],
            "offices": [{"id": 1}],
            "location": {"name": "Hybrid - SF"},
            "absolute_url": "https://example.com/jobs/456",
            "updated_at": "2025-10-24T00:00:00Z",
            "requisition_id": "REQ-002",
            "metadata": [],
            "content": "Hybrid role...",
        }

        departments = []
        offices = [GreenhouseOffice(id="1", name="SF Office", location="Hybrid - SF")]

        result = greenhouse_service._parse_greenhouse_job(
            job_data, departments, offices
        )

        assert result.location_type == "hybrid"

    def test_parse_greenhouse_job_onsite(self, greenhouse_service):
        """Test parsing onsite job"""
        from app.schemas.job_feed import GreenhouseDepartment, GreenhouseOffice

        job_data = {
            "id": 789,
            "title": "Data Scientist",
            "departments": [{"id": 2}],
            "offices": [{"id": 1}],
            "location": {"name": "New York, NY"},
            "absolute_url": "https://example.com/jobs/789",
            "updated_at": "2025-10-24T00:00:00Z",
            "requisition_id": None,
            "metadata": [],
            "content": "Onsite position...",
        }

        departments = [GreenhouseDepartment(id="2", name="Data")]
        offices = [GreenhouseOffice(id="1", name="NY Office", location="New York, NY")]

        result = greenhouse_service._parse_greenhouse_job(
            job_data, departments, offices
        )

        assert result.location_type == "onsite"
        assert result.location == "New York, NY"


class TestJobDetails:
    """Test fetching job details"""

    @patch("app.services.greenhouse_service.requests.get")
    def test_fetch_job_details_success(self, mock_get, greenhouse_service):
        """Test successful job details fetch"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": 123,
            "title": "Engineer",
            "content": "Full job description...",
        }
        mock_get.return_value = mock_response

        result = greenhouse_service.fetch_job_details(
            board_token="testcompany", job_id="123"
        )

        assert result["id"] == 123
        assert "content" in result


class TestBoardValidation:
    """Test board token validation"""

    @patch("app.services.greenhouse_service.requests.get")
    def test_validate_board_token_valid(self, mock_get, greenhouse_service):
        """Test validation of valid board token"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"jobs": []}
        mock_get.return_value = mock_response

        assert greenhouse_service.validate_board_token("validcompany") is True

    @patch("app.services.greenhouse_service.requests.get")
    def test_validate_board_token_invalid(self, mock_get, greenhouse_service):
        """Test validation of invalid board token"""
        mock_get.side_effect = requests.exceptions.RequestException("Not found")

        assert greenhouse_service.validate_board_token("invalidcompany") is False


class TestBoardDiscovery:
    """Test company board discovery"""

    @patch("app.services.greenhouse_service.requests.get")
    def test_get_boards_for_companies(self, mock_get, greenhouse_service):
        """Test discovering Greenhouse boards for companies"""

        def side_effect(url, *args, **kwargs):
            if "company1" in url:
                return Mock(status_code=200)
            elif "company2" in url:
                return Mock(status_code=404)
            else:
                raise requests.exceptions.RequestException()

        mock_get.side_effect = side_effect

        result = greenhouse_service.get_boards_for_companies(
            ["company1.com", "company2.com", "company3.com"]
        )

        assert "company1.com" in result
        assert "company2.com" not in result
        assert "company3.com" not in result


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
