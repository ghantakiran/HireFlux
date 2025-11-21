"""Unit tests for Applicant Filtering Service

Test-Driven Development (TDD) for Issue #59
Following BDD pattern: Given-When-Then
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from app.services.applicant_filtering_service import ApplicantFilteringService, FilterParams
from app.db.models.application import Application
from app.db.models.job import Job
from app.db.models.company import Company
from app.db.models.user import User, Profile


class TestApplicantFilteringService:
    """Test suite for applicant filtering and sorting"""

    @pytest.fixture
    def company(self, db_session):
        """Given a company with a job posting"""
        company = Company(
            id=uuid4(),
            name="Test Company",
            domain="testcompany.com",
            subscription_tier="growth",
        )
        db_session.add(company)
        db_session.commit()
        return company

    @pytest.fixture
    def job(self, db_session, company):
        """Given a job posting"""
        job = Job(
            id=uuid4(),
            company_id=company.id,
            title="Senior Software Engineer",
            description="Great opportunity",
            source="employer",
        )
        db_session.add(job)
        db_session.commit()
        return job

    @pytest.fixture
    def applicants(self, db_session, job):
        """Given 10 applicants with varying fit scores and statuses"""
        applicants = []
        statuses = ["new", "screening", "interview", "offer", "hired", "rejected"]

        for i in range(10):
            user_id = uuid4()
            user = User(
                id=user_id,
                email=f"candidate{i}@test.com",
                password_hash="hashed",
            )
            db_session.add(user)

            profile = Profile(
                id=uuid4(),
                user_id=user_id,
                first_name=f"John{i}",
                last_name=f"Doe{i}",
            )
            db_session.add(profile)

            application = Application(
                id=uuid4(),
                user_id=user.id,
                job_id=job.id,
                status=statuses[i % len(statuses)],
                fit_index=70 + (i * 3),  # 70, 73, 76, 79, 82, 85, 88, 91, 94, 97
                applied_at=datetime.utcnow() - timedelta(days=i),
                tags=["starred"] if i % 2 == 0 else [],
                assigned_to=[str(uuid4())] if i < 5 else [],
            )
            db_session.add(application)
            applicants.append(application)

        db_session.commit()
        return applicants

    # Test 1: Filter by single status
    def test_filter_by_single_status(self, db_session, job, applicants):
        """Scenario: Filter applicants by single status
        Given 10 applicants with various statuses
        When filtering by status='new'
        Then only 'new' applicants are returned
        """
        service = ApplicantFilteringService(db_session)
        filters = FilterParams(status=["new"])

        results = service.filter_applicants(job.id, filters)

        assert len(results) > 0
        for app in results:
            assert app.status == "new"

    # Test 2: Filter by multiple statuses
    def test_filter_by_multiple_statuses(self, db_session, job, applicants):
        """Scenario: Filter by multiple statuses
        Given 10 applicants
        When filtering by status=['new', 'screening']
        Then only applicants with those statuses are returned
        """
        service = ApplicantFilteringService(db_session)
        filters = FilterParams(status=["new", "screening"])

        results = service.filter_applicants(job.id, filters)

        assert len(results) > 0
        for app in results:
            assert app.status in ["new", "screening"]

    # Test 3: Filter by minimum fit index
    def test_filter_by_min_fit_index(self, db_session, job, applicants):
        """Scenario: Filter high-quality applicants by fit index
        Given applicants with fit scores 70-97
        When filtering by minFitIndex=85
        Then only applicants with fit_index >= 85 are returned
        """
        service = ApplicantFilteringService(db_session)
        filters = FilterParams(min_fit_index=85)

        results = service.filter_applicants(job.id, filters)

        assert len(results) > 0
        for app in results:
            assert app.fit_index >= 85

    # Test 4: Filter by fit index range
    def test_filter_by_fit_index_range(self, db_session, job, applicants):
        """Scenario: Filter by fit index range
        Given applicants with various fit scores
        When filtering by minFitIndex=75 and maxFitIndex=85
        Then only applicants in that range are returned
        """
        service = ApplicantFilteringService(db_session)
        filters = FilterParams(min_fit_index=75, max_fit_index=85)

        results = service.filter_applicants(job.id, filters)

        assert len(results) > 0
        for app in results:
            assert 75 <= app.fit_index <= 85

    # Test 5: Filter by date range (recent applicants)
    def test_filter_by_recent_date(self, db_session, job, applicants):
        """Scenario: Filter recent applicants
        Given applicants from last 10 days
        When filtering by appliedAfter=7 days ago
        Then only applicants from last 7 days are returned
        """
        service = ApplicantFilteringService(db_session)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        filters = FilterParams(applied_after=seven_days_ago)

        results = service.filter_applicants(job.id, filters)

        assert len(results) > 0
        for app in results:
            assert app.applied_at >= seven_days_ago

    # Test 6: Filter by tags
    def test_filter_by_tags(self, db_session, job, applicants):
        """Scenario: Filter starred applicants
        Given applicants with various tags
        When filtering by tags=['starred']
        Then only starred applicants are returned
        """
        service = ApplicantFilteringService(db_session)
        filters = FilterParams(tags=["starred"])

        results = service.filter_applicants(job.id, filters)

        assert len(results) > 0
        for app in results:
            assert "starred" in app.tags

    # Test 7: Filter by assigned team member
    def test_filter_by_assigned_to(self, db_session, job, applicants):
        """Scenario: Filter applicants assigned to specific team member
        Given applicants assigned to various team members
        When filtering by specific user_id
        Then only applicants assigned to that user are returned
        """
        service = ApplicantFilteringService(db_session)
        assigned_user_id = applicants[0].assigned_to[0] if applicants[0].assigned_to else None

        if assigned_user_id:
            filters = FilterParams(assigned_to=assigned_user_id)
            results = service.filter_applicants(job.id, filters)

            assert len(results) > 0
            for app in results:
                assert assigned_user_id in app.assigned_to

    # Test 8: Search by candidate name
    def test_search_by_candidate_name(self, db_session, job, applicants):
        """Scenario: Search for candidate by name
        Given applicants named John0-John9
        When searching for 'John5'
        Then only applicants matching the name are returned
        """
        service = ApplicantFilteringService(db_session)
        filters = FilterParams(search="John5")

        results = service.filter_applicants(job.id, filters)

        # Should find the candidate with name containing "John5"
        assert len(results) >= 1

    # Test 9: Sort by fit index descending
    def test_sort_by_fit_index_desc(self, db_session, job, applicants):
        """Scenario: Sort applicants by fit index (highest first)
        Given applicants with various fit scores
        When sorting by fit_index desc
        Then applicants are returned in descending order of fit score
        """
        service = ApplicantFilteringService(db_session)
        filters = FilterParams(sort_by="fit_index", order="desc")

        results = service.filter_applicants(job.id, filters)

        assert len(results) > 0
        # Verify descending order
        for i in range(len(results) - 1):
            assert results[i].fit_index >= results[i + 1].fit_index

    # Test 10: Sort by application date (newest first)
    def test_sort_by_applied_date_desc(self, db_session, job, applicants):
        """Scenario: Sort by application date (newest first)
        Given applicants from various dates
        When sorting by applied_at desc
        Then newest applicants appear first
        """
        service = ApplicantFilteringService(db_session)
        filters = FilterParams(sort_by="applied_at", order="desc")

        results = service.filter_applicants(job.id, filters)

        assert len(results) > 0
        # Verify descending order (newest first)
        for i in range(len(results) - 1):
            assert results[i].applied_at >= results[i + 1].applied_at

    # Test 11: Combined filters (status + fit + date)
    def test_combined_filters(self, db_session, job, applicants):
        """Scenario: Apply multiple filters simultaneously
        Given 10 applicants
        When filtering by status='new' AND fit_index>=80 AND recent (7 days)
        Then only applicants matching ALL criteria are returned
        """
        service = ApplicantFilteringService(db_session)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        filters = FilterParams(
            status=["new"],
            min_fit_index=80,
            applied_after=seven_days_ago
        )

        results = service.filter_applicants(job.id, filters)

        for app in results:
            assert app.status == "new"
            assert app.fit_index >= 80
            assert app.applied_at >= seven_days_ago

    # Test 12: Pagination
    def test_pagination(self, db_session, job, applicants):
        """Scenario: Paginate results
        Given 10 applicants
        When requesting page 1 with limit 5
        Then 5 applicants are returned with pagination info
        """
        service = ApplicantFilteringService(db_session)
        filters = FilterParams(page=1, limit=5)

        results, total_count = service.filter_applicants_with_pagination(job.id, filters)

        assert len(results) == 5
        assert total_count == 10

    # Test 13: Empty results for non-matching filters
    def test_empty_results_for_non_matching_filters(self, db_session, job, applicants):
        """Scenario: No applicants match the filters
        Given applicants with fit scores 70-97
        When filtering by fit_index >= 100
        Then empty list is returned
        """
        service = ApplicantFilteringService(db_session)
        filters = FilterParams(min_fit_index=100)

        results = service.filter_applicants(job.id, filters)

        assert len(results) == 0

    # Test 14: Filter by unassigned applicants
    def test_filter_unassigned_applicants(self, db_session, job, applicants):
        """Scenario: Filter applicants not yet assigned to anyone
        Given applicants, some assigned and some unassigned
        When filtering by assigned_to=None (unassigned)
        Then only unassigned applicants are returned
        """
        service = ApplicantFilteringService(db_session)
        filters = FilterParams(unassigned=True)

        results = service.filter_applicants(job.id, filters)

        assert len(results) > 0
        for app in results:
            assert not app.assigned_to or len(app.assigned_to) == 0

    # Test 15: Performance with 500+ applicants
    def test_performance_with_large_dataset(self, db_session, job):
        """Scenario: Query performance with 500+ applicants
        Given 500 applicants
        When applying complex filters
        Then query completes in < 2 seconds
        """
        import time

        # Create 500 applicants
        for i in range(500):
            user_id = uuid4()
            user = User(
                id=user_id,
                email=f"bulk{i}@test.com",
                password_hash="hashed",
            )
            db_session.add(user)

            profile = Profile(
                id=uuid4(),
                user_id=user_id,
                first_name=f"Bulk{i}",
                last_name="Candidate",
            )
            db_session.add(profile)

            application = Application(
                id=uuid4(),
                user_id=user.id,
                job_id=job.id,
                status=["new", "screening", "interview"][i % 3],
                fit_index=60 + (i % 40),
                applied_at=datetime.utcnow() - timedelta(days=i % 60),
            )
            db_session.add(application)

        db_session.commit()

        # Measure query time
        service = ApplicantFilteringService(db_session)
        filters = FilterParams(
            status=["new", "screening"],
            min_fit_index=75,
            sort_by="fit_index",
            order="desc"
        )

        start_time = time.time()
        results = service.filter_applicants(job.id, filters)
        end_time = time.time()

        query_time = end_time - start_time

        assert len(results) > 0
        assert query_time < 2.0  # Must complete in under 2 seconds
