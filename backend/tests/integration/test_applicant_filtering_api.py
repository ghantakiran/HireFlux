"""Integration tests for Applicant Filtering API endpoints

Test-Driven Development (TDD) for Issue #59 API layer
Tests the GET /api/v1/employer/jobs/{job_id}/applicants endpoint
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from fastapi.testclient import TestClient

from app.main import app
from app.db.models.application import Application
from app.db.models.job import Job
from app.db.models.company import Company, CompanyMember
from app.db.models.user import User, Profile


class TestApplicantFilteringAPI:
    """Integration tests for applicant filtering API"""

    @pytest.fixture
    def employer_user(self, test_db):
        """Given an employer user"""
        user_id = uuid4()
        user = User(
            id=user_id,
            email="employer@testcompany.com",
            password_hash="hashed_password",
            user_type="employer",
        )
        test_db.add(user)
        test_db.commit()
        return user

    @pytest.fixture
    def company(self, test_db, employer_user):
        """Given a company with employer as owner"""
        company_id = uuid4()
        company = Company(
            id=company_id,
            name="Test Company",
            domain="testcompany.com",
            subscription_tier="growth",
        )
        test_db.add(company)

        # Add employer as company owner
        member = CompanyMember(
            id=uuid4(),
            company_id=company_id,
            user_id=employer_user.id,
            role="owner",
            permissions=["all"],
        )
        test_db.add(member)
        test_db.commit()
        return company

    @pytest.fixture
    def job(self, test_db, company):
        """Given a job posting"""
        job = Job(
            id=uuid4(),
            company_id=company.id,
            title="Senior Software Engineer",
            description="Great opportunity",
            source="employer",
        )
        test_db.add(job)
        test_db.commit()
        return job

    @pytest.fixture
    def applicants(self, test_db, job):
        """Given 20 applicants with varying attributes"""
        applicants = []
        statuses = ["new", "screening", "interview", "offer", "hired", "rejected"]

        for i in range(20):
            user_id = uuid4()
            user = User(
                id=user_id,
                email=f"candidate{i}@test.com",
                password_hash="hashed",
                user_type="candidate",
            )
            test_db.add(user)

            profile = Profile(
                id=uuid4(),
                user_id=user_id,
                first_name=f"Candidate{i}",
                last_name=f"Test{i}",
            )
            test_db.add(profile)

            application = Application(
                id=uuid4(),
                user_id=user.id,
                job_id=job.id,
                status=statuses[i % len(statuses)],
                fit_index=60 + (i * 2),  # 60, 62, 64, ..., 98
                applied_at=datetime.utcnow() - timedelta(days=i),
                tags=["starred"] if i % 3 == 0 else [],
                assigned_to=[str(uuid4())] if i < 10 else [],
            )
            test_db.add(application)
            applicants.append(application)

        test_db.commit()
        return applicants

    @pytest.fixture
    def auth_token(self, employer_user):
        """Mock JWT token for authentication"""
        from app.services.auth import AuthService
        from app.db.session import get_db

        db = next(get_db())
        auth_service = AuthService(db)
        tokens = auth_service.create_tokens(employer_user.id)
        return tokens["access_token"]

    # Test 1: Get all applicants (no filters)
    def test_get_all_applicants(
        self, client, job, applicants, auth_token
    ):
        """
        Scenario: Get all applicants for a job
        Given 20 applicants for a job
        When GET /api/v1/employers/jobs/{job_id}/applicants
        Then all 20 applicants are returned
        """
        response = client.get(
            f"/api/v1/employers/jobs/{job.id}/applicants",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["data"]["applications"]) == 20
        assert data["data"]["total_count"] == 20
        assert "filter_stats" in data["data"]

    # Test 2: Filter by status (single)
    def test_filter_by_single_status(
        self, client, job, applicants, auth_token
    ):
        """
        Scenario: Filter applicants by status
        Given 20 applicants with various statuses
        When filtering by status=new
        Then only 'new' applicants are returned
        """
        response = client.get(
            f"/api/v1/employers/jobs/{job.id}/applicants?status=new",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        applications = data["data"]["applications"]
        assert len(applications) > 0

        for app in applications:
            assert app["status"] == "new"

    # Test 3: Filter by multiple statuses
    def test_filter_by_multiple_statuses(
        self, client, job, applicants, auth_token
    ):
        """
        Scenario: Filter by multiple statuses
        Given 20 applicants
        When filtering by status=new&status=screening
        Then only applicants with those statuses are returned
        """
        response = client.get(
            f"/api/v1/employers/jobs/{job.id}/applicants?status=new&status=screening",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        applications = data["data"]["applications"]
        for app in applications:
            assert app["status"] in ["new", "screening"]

    # Test 4: Filter by fit index range
    def test_filter_by_fit_index(
        self, client, job, applicants, auth_token
    ):
        """
        Scenario: Filter by minimum fit index
        Given applicants with fit scores 60-98
        When filtering by minFitIndex=80
        Then only applicants with fit_index >= 80 are returned
        """
        response = client.get(
            f"/api/v1/employers/jobs/{job.id}/applicants?minFitIndex=80",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        applications = data["data"]["applications"]
        assert len(applications) > 0

        for app in applications:
            assert app["fit_index"] >= 80

    # Test 5: Search by candidate name
    def test_search_by_name(
        self, client, job, applicants, auth_token
    ):
        """
        Scenario: Search for candidate by name
        Given applicants named Candidate0-Candidate19
        When searching for 'Candidate5'
        Then only matching candidate is returned
        """
        response = client.get(
            f"/api/v1/employers/jobs/{job.id}/applicants?search=Candidate5",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        applications = data["data"]["applications"]
        assert len(applications) >= 1

    # Test 6: Sort by fit index descending
    def test_sort_by_fit_index(
        self, client, job, applicants, auth_token
    ):
        """
        Scenario: Sort applicants by fit index
        Given applicants with various fit scores
        When sorting by sortBy=fitIndex&order=desc
        Then applicants are returned in descending order of fit
        """
        response = client.get(
            f"/api/v1/employers/jobs/{job.id}/applicants?sortBy=fitIndex&order=desc",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        applications = data["data"]["applications"]
        assert len(applications) > 0

        # Verify descending order
        for i in range(len(applications) - 1):
            assert applications[i]["fit_index"] >= applications[i + 1]["fit_index"]

    # Test 7: Pagination
    def test_pagination(
        self, client, job, applicants, auth_token
    ):
        """
        Scenario: Paginate results
        Given 20 applicants
        When requesting page=1&limit=10
        Then 10 applicants are returned with pagination info
        """
        response = client.get(
            f"/api/v1/employers/jobs/{job.id}/applicants?page=1&limit=10",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        assert len(data["data"]["applications"]) == 10
        assert data["data"]["total_count"] == 20
        assert data["data"]["page"] == 1
        assert data["data"]["limit"] == 10
        assert data["data"]["has_more"] is True

        # Test page 2
        response = client.get(
            f"/api/v1/employers/jobs/{job.id}/applicants?page=2&limit=10",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        assert len(data["data"]["applications"]) == 10
        assert data["data"]["page"] == 2
        assert data["data"]["has_more"] is False

    # Test 8: Combined filters
    def test_combined_filters(
        self, client, job, applicants, auth_token
    ):
        """
        Scenario: Apply multiple filters
        Given 20 applicants
        When filtering by status=new AND minFitIndex=80
        Then only applicants matching ALL criteria are returned
        """
        response = client.get(
            f"/api/v1/employers/jobs/{job.id}/applicants?status=new&minFitIndex=80",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        applications = data["data"]["applications"]
        for app in applications:
            assert app["status"] == "new"
            assert app["fit_index"] >= 80

    # Test 9: Filter statistics
    def test_filter_statistics(
        self, client, job, applicants, auth_token
    ):
        """
        Scenario: Get filter statistics
        Given 20 applicants
        When requesting applicants
        Then filter_stats includes status counts and fit ranges
        """
        response = client.get(
            f"/api/v1/employers/jobs/{job.id}/applicants",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        assert response.status_code == 200
        data = response.json()

        filter_stats = data["data"]["filter_stats"]
        assert "status_counts" in filter_stats
        assert "fit_index_counts" in filter_stats
        assert "unassigned_count" in filter_stats

        # Verify status counts
        status_counts = filter_stats["status_counts"]
        assert isinstance(status_counts, dict)

        # Verify fit index counts
        fit_counts = filter_stats["fit_index_counts"]
        assert "high" in fit_counts
        assert "medium" in fit_counts
        assert "low" in fit_counts

    # Test 10: Unauthorized access (no token)
    def test_unauthorized_access(self, client, job):
        """
        Scenario: Access endpoint without authentication
        Given a job with applicants
        When requesting applicants without auth token
        Then 401 Unauthorized is returned
        """
        response = client.get(f"/api/v1/employers/jobs/{job.id}/applicants")

        assert response.status_code == 401

    # Test 11: Job not found
    def test_job_not_found(self, client, auth_token):
        """
        Scenario: Request applicants for non-existent job
        Given a non-existent job ID
        When requesting applicants
        Then 404 Not Found is returned
        """
        fake_job_id = uuid4()
        response = client.get(
            f"/api/v1/employers/jobs/{fake_job_id}/applicants",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        assert response.status_code == 404

    # Test 12: Invalid query parameters
    def test_invalid_query_parameters(
        self, client, job, auth_token
    ):
        """
        Scenario: Invalid query parameters
        Given a job with applicants
        When providing invalid parameters (negative page)
        Then 400 Bad Request is returned
        """
        response = client.get(
            f"/api/v1/employers/jobs/{job.id}/applicants?page=-1",
            headers={"Authorization": f"Bearer {auth_token}"},
        )

        assert response.status_code == 400
