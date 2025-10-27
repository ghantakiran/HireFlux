"""Unit tests for LeverService"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
import requests

from app.services.lever_service import LeverService
from app.schemas.job_feed import JobSource


@pytest.fixture
def mock_db():
    """Create mock database session"""
    return Mock()


@pytest.fixture
def lever_service(mock_db):
    """Create LeverService instance"""
    return LeverService(mock_db)


@pytest.fixture
def mock_lever_jobs():
    """Mock Lever jobs response"""
    return [
        {
            "id": "abc123",
            "text": "Senior Software Engineer",
            "hostedUrl": "https://jobs.lever.co/netflix/abc123",
            "applyUrl": "https://jobs.lever.co/netflix/abc123/apply",
            "createdAt": 1698796800000,
            "categories": {
                "commitment": "Full-time",
                "team": "Engineering",
                "department": "Backend",
                "location": "Remote",
                "level": "Senior",
            },
            "description": "<p>Join our engineering team...</p>",
            "descriptionPlain": "Join our engineering team...",
            "lists": [],
            "additional": "",
            "additionalPlain": "",
            "workplaceType": "remote",
        },
        {
            "id": "def456",
            "text": "Product Manager",
            "hostedUrl": "https://jobs.lever.co/netflix/def456",
            "applyUrl": "https://jobs.lever.co/netflix/def456/apply",
            "createdAt": 1698883200000,
            "categories": {
                "commitment": "Full-time",
                "team": "Product",
                "location": "San Francisco, CA",
                "level": "Mid",
            },
            "description": "<p>Lead product strategy...</p>",
            "descriptionPlain": "Lead product strategy...",
            "lists": [],
            "workplaceType": "onsite",
        },
    ]


@pytest.fixture
def mock_lever_job_details():
    """Mock detailed Lever job response"""
    return {
        "id": "abc123",
        "text": "Senior Software Engineer",
        "hostedUrl": "https://jobs.lever.co/netflix/abc123",
        "applyUrl": "https://jobs.lever.co/netflix/abc123/apply",
        "createdAt": 1698796800000,
        "categories": {
            "commitment": "Full-time",
            "team": "Engineering",
            "location": "Remote",
        },
        "description": "<p>Detailed description...</p>",
        "descriptionPlain": "Detailed description...",
        "lists": [
            {"text": "Responsibilities", "content": "<li>Build scalable systems</li>"}
        ],
        "additional": "<p>Benefits...</p>",
        "additionalPlain": "Benefits...",
    }


class TestRateLimiting:
    """Test rate limiting functionality"""

    def test_rate_limit_allows_requests_within_limit(self, lever_service):
        """Test that requests within limit are allowed"""
        # Lever allows up to 100 requests per minute
        for _ in range(100):
            assert lever_service._check_rate_limit() is True
            lever_service._request_times.append(datetime.utcnow())

    def test_rate_limit_blocks_excess_requests(self, lever_service):
        """Test that requests exceeding limit are blocked"""
        # Fill up rate limit (100 requests)
        for _ in range(100):
            lever_service._request_times.append(datetime.utcnow())

        # Next request should be blocked
        assert lever_service._check_rate_limit() is False

    def test_rate_limit_resets_after_window(self, lever_service):
        """Test that rate limit resets after time window"""
        from datetime import timedelta

        # Add old requests (> 60 seconds ago)
        old_time = datetime.utcnow() - timedelta(seconds=61)
        for _ in range(100):
            lever_service._request_times.append(old_time)

        # Should allow new requests after window
        assert lever_service._check_rate_limit() is True


class TestJobFetching:
    """Test job fetching functionality"""

    @patch("app.services.lever_service.requests.get")
    def test_fetch_jobs_success(self, mock_get, lever_service, mock_lever_jobs):
        """Test successful job fetching"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_lever_jobs
        mock_get.return_value = mock_response

        result = lever_service.fetch_jobs(company_site="netflix")

        assert result.source == JobSource.LEVER
        assert len(result.jobs) == 2
        assert result.metadata.total_fetched == 2
        assert result.metadata.failed_jobs == 0

    @patch("app.services.lever_service.requests.get")
    def test_fetch_jobs_with_filters(self, mock_get, lever_service, mock_lever_jobs):
        """Test job fetching with filters"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_lever_jobs
        mock_get.return_value = mock_response

        result = lever_service.fetch_jobs(
            company_site="netflix",
            team="Engineering",
            location="Remote",
            commitment="Full-time",
        )

        # Verify filters were passed
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert call_args[1]["params"]["team"] == "Engineering"
        assert call_args[1]["params"]["location"] == "Remote"
        assert call_args[1]["params"]["commitment"] == "Full-time"

    @patch("app.services.lever_service.requests.get")
    def test_fetch_jobs_api_error(self, mock_get, lever_service):
        """Test handling of API errors"""
        mock_get.side_effect = requests.exceptions.RequestException("API Error")

        from app.core.exceptions import ServiceError

        with pytest.raises(ServiceError):
            lever_service.fetch_jobs(company_site="netflix")

    @patch("app.services.lever_service.requests.get")
    def test_fetch_jobs_http_error(self, mock_get, lever_service):
        """Test handling of HTTP errors"""
        mock_response = Mock()
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError(
            "404"
        )
        mock_get.return_value = mock_response

        from app.core.exceptions import ServiceError

        with pytest.raises(ServiceError):
            lever_service.fetch_jobs(company_site="invalid")

    @patch("app.services.lever_service.requests.get")
    def test_fetch_jobs_with_parsing_errors(self, mock_get, lever_service):
        """Test handling of job parsing errors"""
        mock_response = Mock()
        mock_response.status_code = 200
        # Malformed job data
        mock_response.json.return_value = [
            {"id": "abc123"},  # Missing required fields
            {
                "id": "def456",
                "text": "Valid Job",
                "hostedUrl": "https://example.com",
                "applyUrl": "https://example.com/apply",
                "categories": {"location": "Remote"},
            },
        ]
        mock_get.return_value = mock_response

        result = lever_service.fetch_jobs(company_site="netflix")

        # Should have 1 successful, 1 failed
        assert len(result.jobs) == 1
        assert result.metadata.failed_jobs == 1
        assert len(result.metadata.errors) == 1


class TestJobParsing:
    """Test job data parsing"""

    def test_parse_lever_job_remote(self, lever_service):
        """Test parsing remote job"""
        job_data = {
            "id": "abc123",
            "text": "Software Engineer",
            "hostedUrl": "https://jobs.lever.co/company/abc123",
            "applyUrl": "https://jobs.lever.co/company/abc123/apply",
            "createdAt": 1698796800000,
            "categories": {
                "commitment": "Full-time",
                "team": "Engineering",
                "location": "Remote",
            },
            "description": "Remote position...",
            "descriptionPlain": "Remote position...",
        }

        result = lever_service._parse_lever_job(job_data)

        assert result.id == "abc123"
        assert result.text == "Software Engineer"
        assert result.location_type == "remote"
        assert result.employment_type == "full-time"
        assert len(result.categories) == 1
        assert result.categories[0].team == "Engineering"

    def test_parse_lever_job_hybrid(self, lever_service):
        """Test parsing hybrid job"""
        job_data = {
            "id": "def456",
            "text": "Product Manager",
            "hostedUrl": "https://jobs.lever.co/company/def456",
            "applyUrl": "https://jobs.lever.co/company/def456/apply",
            "createdAt": 1698796800000,
            "categories": {"location": "Hybrid - San Francisco"},
            "description": "Hybrid role...",
            "descriptionPlain": "Hybrid role...",
        }

        result = lever_service._parse_lever_job(job_data)

        assert result.location_type == "hybrid"

    def test_parse_lever_job_onsite(self, lever_service):
        """Test parsing onsite job"""
        job_data = {
            "id": "ghi789",
            "text": "Data Scientist",
            "hostedUrl": "https://jobs.lever.co/company/ghi789",
            "applyUrl": "https://jobs.lever.co/company/ghi789/apply",
            "createdAt": 1698796800000,
            "categories": {"location": "New York, NY", "commitment": "Full-time"},
            "description": "Onsite position...",
            "descriptionPlain": "Onsite position...",
        }

        result = lever_service._parse_lever_job(job_data)

        assert result.location_type == "onsite"

    def test_parse_lever_job_employment_types(self, lever_service):
        """Test parsing various employment types"""
        test_cases = [
            ("Full-time", "full-time"),
            ("Part-time", "part-time"),
            ("Contract", "contract"),
            ("Internship", "internship"),
        ]

        for commitment, expected_type in test_cases:
            job_data = {
                "id": "test123",
                "text": "Test Job",
                "hostedUrl": "https://example.com",
                "applyUrl": "https://example.com/apply",
                "createdAt": 1698796800000,
                "categories": {"commitment": commitment},
            }

            result = lever_service._parse_lever_job(job_data)
            assert result.employment_type == expected_type

    def test_parse_lever_job_minimal_data(self, lever_service):
        """Test parsing job with minimal data"""
        job_data = {
            "id": "minimal123",
            "text": "Minimal Job",
            "hostedUrl": "https://example.com",
            "applyUrl": "https://example.com/apply",
        }

        result = lever_service._parse_lever_job(job_data)

        assert result.id == "minimal123"
        assert result.text == "Minimal Job"
        assert result.location_type == "onsite"  # Default
        assert result.employment_type is None
        assert result.categories == []


class TestJobDetails:
    """Test fetching job details"""

    @patch("app.services.lever_service.requests.get")
    def test_fetch_job_details_success(
        self, mock_get, lever_service, mock_lever_job_details
    ):
        """Test successful job details fetch"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = mock_lever_job_details
        mock_get.return_value = mock_response

        result = lever_service.fetch_job_details(
            company_site="netflix", job_id="abc123"
        )

        assert result["id"] == "abc123"
        assert "description" in result
        assert "lists" in result

    @patch("app.services.lever_service.requests.get")
    def test_fetch_job_details_not_found(self, mock_get, lever_service):
        """Test job details fetch with 404"""
        mock_response = Mock()
        mock_response.raise_for_status.side_effect = requests.exceptions.HTTPError(
            "404"
        )
        mock_get.return_value = mock_response

        from app.core.exceptions import ServiceError

        with pytest.raises(ServiceError):
            lever_service.fetch_job_details("netflix", "nonexistent")


class TestCompanySiteValidation:
    """Test company site validation"""

    @patch("app.services.lever_service.requests.get")
    def test_validate_company_site_valid(self, mock_get, lever_service):
        """Test validation of valid company site"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = []
        mock_get.return_value = mock_response

        assert lever_service.validate_company_site("netflix") is True

    @patch("app.services.lever_service.requests.get")
    def test_validate_company_site_invalid(self, mock_get, lever_service):
        """Test validation of invalid company site"""
        mock_get.side_effect = requests.exceptions.RequestException("Not found")

        assert lever_service.validate_company_site("invalidcompany") is False


class TestCompanyDiscovery:
    """Test company board discovery"""

    @patch("app.services.lever_service.requests.get")
    def test_get_companies_with_lever(self, mock_get, lever_service):
        """Test discovering companies with Lever boards"""

        def side_effect(url, *args, **kwargs):
            if "netflix" in url:
                mock_response = Mock(status_code=200)
                mock_response.json.return_value = [{"id": "job1"}]
                return mock_response
            elif "google" in url:
                mock_response = Mock(status_code=200)
                mock_response.json.return_value = []  # No active jobs
                return mock_response
            else:
                raise requests.exceptions.RequestException()

        mock_get.side_effect = side_effect

        result = lever_service.get_companies_with_lever(
            ["netflix", "google", "invalidcompany"]
        )

        assert "netflix" in result
        assert "google" not in result  # No active jobs
        assert "invalidcompany" not in result


class TestLocationAndTeamDiscovery:
    """Test location and team discovery"""

    @patch("app.services.lever_service.requests.get")
    def test_get_all_locations(self, mock_get, lever_service):
        """Test fetching all unique locations"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {"id": "job1", "categories": {"location": "Remote"}},
            {"id": "job2", "categories": {"location": "San Francisco, CA"}},
            {"id": "job3", "categories": {"location": "Remote"}},  # Duplicate
        ]
        mock_get.return_value = mock_response

        result = lever_service.get_all_locations("netflix")

        assert len(result) == 2
        assert "Remote" in result
        assert "San Francisco, CA" in result
        assert result == sorted(result)  # Should be sorted

    @patch("app.services.lever_service.requests.get")
    def test_get_all_teams(self, mock_get, lever_service):
        """Test fetching all unique teams"""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = [
            {
                "id": "job1",
                "categories": {"team": "Engineering", "department": "Backend"},
            },
            {"id": "job2", "categories": {"team": "Product"}},
            {"id": "job3", "categories": {"department": "Design"}},
        ]
        mock_get.return_value = mock_response

        result = lever_service.get_all_teams("netflix")

        assert len(result) == 4
        assert "Engineering" in result
        assert "Backend" in result
        assert "Product" in result
        assert "Design" in result
        assert result == sorted(result)  # Should be sorted

    @patch("app.services.lever_service.requests.get")
    def test_get_locations_error_handling(self, mock_get, lever_service):
        """Test location fetching with API error"""
        mock_get.side_effect = requests.exceptions.RequestException("API Error")

        from app.core.exceptions import ServiceError

        with pytest.raises(ServiceError):
            lever_service.get_all_locations("netflix")

    @patch("app.services.lever_service.requests.get")
    def test_get_teams_error_handling(self, mock_get, lever_service):
        """Test team fetching with API error"""
        mock_get.side_effect = requests.exceptions.RequestException("API Error")

        from app.core.exceptions import ServiceError

        with pytest.raises(ServiceError):
            lever_service.get_all_teams("netflix")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
