"""Unit tests for Usage Limit Enforcement Service

Test-Driven Development (TDD) for Issue #64
Following BDD pattern: Given-When-Then
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4

from app.services.usage_limit_service import UsageLimitService, UsageLimitError
from app.db.models.company import Company, CompanySubscription


class TestUsageLimitService:
    """Test suite for usage limit enforcement"""

    @pytest.fixture
    def starter_company(self, db_session):
        """Given a company with Starter plan (1 job, 10 views, 1 member)"""
        company = Company(
            id=uuid4(),
            name="Test Startup",
            domain="teststartup.com",
            subscription_tier="starter",
            max_active_jobs=1,
            max_candidate_views=10,
            max_team_members=1,
        )
        subscription = CompanySubscription(
            company_id=company.id,
            plan_tier="starter",
            status="active",
            jobs_posted_this_month=0,
            candidate_views_this_month=0,
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow() + timedelta(days=30),
        )
        db_session.add(company)
        db_session.add(subscription)
        db_session.commit()
        return company

    @pytest.fixture
    def growth_company(self, db_session):
        """Given a company with Growth plan (10 jobs, 100 views, 3 members)"""
        company = Company(
            id=uuid4(),
            name="Growing Company",
            domain="growingco.com",
            subscription_tier="growth",
            max_active_jobs=10,
            max_candidate_views=100,
            max_team_members=3,
        )
        subscription = CompanySubscription(
            company_id=company.id,
            plan_tier="growth",
            status="active",
            jobs_posted_this_month=5,
            candidate_views_this_month=50,
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow() + timedelta(days=30),
        )
        db_session.add(company)
        db_session.add(subscription)
        db_session.commit()
        return company

    @pytest.fixture
    def professional_company(self, db_session):
        """Given a company with Professional plan (unlimited)"""
        company = Company(
            id=uuid4(),
            name="Pro Company",
            domain="procompany.com",
            subscription_tier="professional",
            max_active_jobs=-1,  # -1 means unlimited
            max_candidate_views=-1,
            max_team_members=10,
        )
        subscription = CompanySubscription(
            company_id=company.id,
            plan_tier="professional",
            status="active",
            jobs_posted_this_month=50,
            candidate_views_this_month=500,
        )
        db_session.add(company)
        db_session.add(subscription)
        db_session.commit()
        return company

    # Test 1: Job Posting Limits - Starter Plan
    def test_starter_can_post_first_job(self, db_session, starter_company):
        """Scenario: Starter plan posts their first job
        Given a Starter company with 0 jobs posted
        When they attempt to post a job
        Then the job should be allowed
        """
        service = UsageLimitService(db_session)
        result = service.check_job_posting_limit(starter_company.id)

        assert result.allowed is True
        assert result.current_usage == 0
        assert result.limit == 1
        assert result.upgrade_required is False

    def test_starter_cannot_post_second_job(self, db_session, starter_company):
        """Scenario: Starter plan tries to exceed job limit
        Given a Starter company with 1 job already posted
        When they attempt to post another job
        Then the request should be blocked with upgrade prompt
        """
        # Simulate 1 job already posted
        subscription = db_session.query(CompanySubscription).filter_by(
            company_id=starter_company.id
        ).first()
        subscription.jobs_posted_this_month = 1
        db_session.commit()

        service = UsageLimitService(db_session)
        result = service.check_job_posting_limit(starter_company.id)

        assert result.allowed is False
        assert result.current_usage == 1
        assert result.limit == 1
        assert result.upgrade_required is True
        assert "Upgrade to Growth" in result.message

    # Test 2: Job Posting Limits - Growth Plan
    def test_growth_can_post_within_limit(self, db_session, growth_company):
        """Scenario: Growth plan posts within limit
        Given a Growth company with 5 jobs posted (limit: 10)
        When they attempt to post a job
        Then the job should be allowed
        """
        service = UsageLimitService(db_session)
        result = service.check_job_posting_limit(growth_company.id)

        assert result.allowed is True
        assert result.current_usage == 5
        assert result.limit == 10
        assert result.remaining == 5

    def test_growth_warned_at_80_percent(self, db_session, growth_company):
        """Scenario: Growth plan approaching limit (80%)
        Given a Growth company with 8 jobs posted (limit: 10)
        When they check limits
        Then they should receive a warning about approaching limit
        """
        subscription = db_session.query(CompanySubscription).filter_by(
            company_id=growth_company.id
        ).first()
        subscription.jobs_posted_this_month = 8
        db_session.commit()

        service = UsageLimitService(db_session)
        result = service.check_job_posting_limit(growth_company.id)

        assert result.allowed is True
        assert result.warning is True
        assert "approaching" in result.message.lower()

    # Test 3: Candidate View Limits
    def test_starter_can_view_within_limit(self, db_session, starter_company):
        """Scenario: Starter plan views candidates within limit
        Given a Starter company with 5 candidate views (limit: 10)
        When they attempt to view a candidate
        Then the view should be allowed
        """
        subscription = db_session.query(CompanySubscription).filter_by(
            company_id=starter_company.id
        ).first()
        subscription.candidate_views_this_month = 5
        db_session.commit()

        service = UsageLimitService(db_session)
        result = service.check_candidate_view_limit(starter_company.id)

        assert result.allowed is True
        assert result.current_usage == 5
        assert result.limit == 10

    def test_starter_blocked_at_view_limit(self, db_session, starter_company):
        """Scenario: Starter plan exceeds candidate view limit
        Given a Starter company with 10 views already used
        When they attempt to view another candidate
        Then the request should be blocked
        """
        subscription = db_session.query(CompanySubscription).filter_by(
            company_id=starter_company.id
        ).first()
        subscription.candidate_views_this_month = 10
        db_session.commit()

        service = UsageLimitService(db_session)
        result = service.check_candidate_view_limit(starter_company.id)

        assert result.allowed is False
        assert result.upgrade_required is True

    # Test 4: Professional Plan - Unlimited
    def test_professional_unlimited_jobs(self, db_session, professional_company):
        """Scenario: Professional plan has unlimited jobs
        Given a Professional company with 50 jobs posted
        When they attempt to post another job
        Then the job should be allowed (no limit)
        """
        service = UsageLimitService(db_session)
        result = service.check_job_posting_limit(professional_company.id)

        assert result.allowed is True
        assert result.unlimited is True
        assert result.upgrade_required is False

    def test_professional_unlimited_views(self, db_session, professional_company):
        """Scenario: Professional plan has unlimited candidate views
        Given a Professional company with 500 views used
        When they attempt to view another candidate
        Then the view should be allowed (no limit)
        """
        service = UsageLimitService(db_session)
        result = service.check_candidate_view_limit(professional_company.id)

        assert result.allowed is True
        assert result.unlimited is True

    # Test 5: Usage Tracking & Incrementing
    def test_increment_job_posting_count(self, db_session, starter_company):
        """Scenario: Job posting increments usage counter
        Given a Starter company with 0 jobs posted
        When they successfully post a job
        Then the job count should increment to 1
        """
        service = UsageLimitService(db_session)
        service.increment_job_posting(starter_company.id)

        subscription = db_session.query(CompanySubscription).filter_by(
            company_id=starter_company.id
        ).first()
        assert subscription.jobs_posted_this_month == 1

    def test_increment_candidate_view_count(self, db_session, starter_company):
        """Scenario: Candidate view increments usage counter
        Given a Starter company with 0 views used
        When they view a candidate profile
        Then the view count should increment to 1
        """
        service = UsageLimitService(db_session)
        service.increment_candidate_view(starter_company.id)

        subscription = db_session.query(CompanySubscription).filter_by(
            company_id=starter_company.id
        ).first()
        assert subscription.candidate_views_this_month == 1

    # Test 6: Monthly Reset
    def test_usage_reset_on_new_billing_period(self, db_session, starter_company):
        """Scenario: Usage counters reset on new billing period
        Given a Starter company at end of billing period with limits reached
        When the billing period renews
        Then usage counters should reset to 0
        """
        subscription = db_session.query(CompanySubscription).filter_by(
            company_id=starter_company.id
        ).first()
        subscription.jobs_posted_this_month = 1
        subscription.candidate_views_this_month = 10
        subscription.current_period_end = datetime.utcnow() - timedelta(days=1)  # Expired
        db_session.commit()

        service = UsageLimitService(db_session)
        service.reset_usage_if_new_period(starter_company.id)

        db_session.refresh(subscription)
        assert subscription.jobs_posted_this_month == 0
        assert subscription.candidate_views_this_month == 0

    # Test 7: Team Member Limits
    def test_starter_cannot_add_second_member(self, db_session, starter_company):
        """Scenario: Starter plan tries to add second team member
        Given a Starter company with 1 member (owner)
        When they attempt to invite another member
        Then the request should be blocked
        """
        service = UsageLimitService(db_session)
        result = service.check_team_member_limit(starter_company.id, current_members=1)

        assert result.allowed is False
        assert result.limit == 1
        assert result.upgrade_required is True

    # Test 8: Expired/Inactive Subscription
    def test_expired_subscription_blocks_usage(self, db_session, starter_company):
        """Scenario: Expired subscription blocks all usage
        Given a company with an expired subscription
        When they attempt any action
        Then all requests should be blocked
        """
        subscription = db_session.query(CompanySubscription).filter_by(
            company_id=starter_company.id
        ).first()
        subscription.status = "past_due"
        db_session.commit()

        service = UsageLimitService(db_session)
        result = service.check_job_posting_limit(starter_company.id)

        assert result.allowed is False
        assert "subscription" in result.message.lower()

    # Test 9: Get Usage Summary
    def test_get_usage_summary(self, db_session, growth_company):
        """Scenario: Employer checks usage summary
        Given a Growth company with some usage
        When they request usage summary
        Then they should see current usage for all resources
        """
        service = UsageLimitService(db_session)
        summary = service.get_usage_summary(growth_company.id)

        assert summary.plan == "growth"
        assert summary.jobs.used == 5
        assert summary.jobs.limit == 10
        assert summary.jobs.remaining == 5
        assert summary.candidate_views.used == 50
        assert summary.candidate_views.limit == 100
        assert summary.candidate_views.remaining == 50

    # Test 10: Rate Limiting Prevention
    def test_cannot_bypass_limit_with_rapid_requests(self, db_session, starter_company):
        """Scenario: Prevent limit bypass with concurrent requests
        Given a Starter company at job limit
        When multiple rapid requests attempt to post jobs
        Then all requests after the first should be blocked
        """
        subscription = db_session.query(CompanySubscription).filter_by(
            company_id=starter_company.id
        ).first()
        subscription.jobs_posted_this_month = 0
        db_session.commit()

        service = UsageLimitService(db_session)

        # First request should succeed
        result1 = service.check_and_increment_job_posting(starter_company.id)
        assert result1.allowed is True

        # Second request should fail (limit reached)
        result2 = service.check_and_increment_job_posting(starter_company.id)
        assert result2.allowed is False
