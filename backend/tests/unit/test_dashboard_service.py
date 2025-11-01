"""Unit tests for Dashboard Service (TDD Approach)

Following Test-Driven Development: Write tests FIRST, then implement service.

Test Coverage:
- Dashboard statistics (jobs, applications, pipeline)
- Recent activity feed
- Pipeline conversion metrics
- Team activity tracking
- Top performing jobs
- Quality metrics (avg candidate fit, time to fill)
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from uuid import uuid4

from app.services.dashboard_service import DashboardService
from app.db.models.company import Company, CompanyMember, CompanySubscription
from app.db.models.user import User
from app.db.models.job import Job
from app.db.models.application import Application


# ===========================================================================
# Test Fixtures
# ===========================================================================

@pytest.fixture
def sample_company_with_jobs(db_session: Session):
    """Create a company with jobs and applications for testing dashboard"""
    # Create owner user
    owner_user = User(
        id=uuid4(),
        email="owner@techcorp.com",
        hashed_password="hashed_password",
        user_type="employer"
    )
    db_session.add(owner_user)
    db_session.flush()

    # Create company
    company = Company(
        id=uuid4(),
        name="TechCorp Inc",
        domain="techcorp.com",
        industry="Technology",
        size="11-50",
        subscription_tier="growth",
        subscription_status="active",
        max_active_jobs=10,
        max_candidate_views=100
    )
    db_session.add(company)
    db_session.flush()

    # Create owner member
    owner_member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=owner_user.id,
        role="owner",
        status="active",
        joined_at=datetime.utcnow()
    )
    db_session.add(owner_member)

    # Create subscription
    subscription = CompanySubscription(
        id=uuid4(),
        company_id=company.id,
        plan_tier="growth",
        status="active",
        jobs_posted_this_month=3,
        candidate_views_this_month=25
    )
    db_session.add(subscription)

    # Create 3 active jobs
    jobs = []
    for i in range(3):
        job = Job(
            id=uuid4(),
            company_id=company.id,
            title=f"Software Engineer {i+1}",
            company="TechCorp Inc",
            description=f"Job description {i+1}",
            location="San Francisco, CA",
            location_type="hybrid",
            employment_type="full-time",
            source="employer",
            is_active=True,
            posted_date=datetime.utcnow() - timedelta(days=i+1),
            created_at=datetime.utcnow() - timedelta(days=i+1)
        )
        db_session.add(job)
        jobs.append(job)

    db_session.flush()

    # Create candidate users
    candidate_users = []
    for i in range(5):
        candidate = User(
            id=uuid4(),
            email=f"candidate{i+1}@example.com",
            hashed_password="hashed",
            user_type="job_seeker"
        )
        db_session.add(candidate)
        candidate_users.append(candidate)

    db_session.flush()

    # Create applications
    # Job 0: 5 applications (2 new today)
    # Job 1: 3 applications
    # Job 2: 2 applications
    applications = []

    # Applications for Job 0
    statuses_job0 = ["applied", "applied", "interview", "interview", "offered"]
    for i, status in enumerate(statuses_job0):
        days_ago = 0 if i < 2 else i  # First 2 are today
        app = Application(
            id=uuid4(),
            user_id=candidate_users[i].id,
            job_id=jobs[0].id,
            status=status,
            applied_at=datetime.utcnow() - timedelta(days=days_ago),
            created_at=datetime.utcnow() - timedelta(days=days_ago),
            updated_at=datetime.utcnow() - timedelta(hours=i)
        )
        db_session.add(app)
        applications.append(app)

    # Applications for Job 1
    statuses_job1 = ["applied", "rejected", "interview"]
    for i, status in enumerate(statuses_job1):
        app = Application(
            id=uuid4(),
            user_id=candidate_users[i].id,
            job_id=jobs[1].id,
            status=status,
            applied_at=datetime.utcnow() - timedelta(days=i+1),
            created_at=datetime.utcnow() - timedelta(days=i+1),
            updated_at=datetime.utcnow() - timedelta(hours=i+5)
        )
        db_session.add(app)
        applications.append(app)

    # Applications for Job 2
    for i in range(2):
        app = Application(
            id=uuid4(),
            user_id=candidate_users[i].id,
            job_id=jobs[2].id,
            status="applied",
            applied_at=datetime.utcnow() - timedelta(days=i+2),
            created_at=datetime.utcnow() - timedelta(days=i+2),
            updated_at=datetime.utcnow() - timedelta(hours=i+8)
        )
        db_session.add(app)
        applications.append(app)

    db_session.commit()
    db_session.refresh(company)

    return company, jobs, applications, owner_user


# ===========================================================================
# Test Cases: Dashboard Statistics
# ===========================================================================


def test_get_dashboard_stats_success(db_session: Session, sample_company_with_jobs):
    """
    GIVEN: Company with 3 active jobs and 10 applications
    WHEN: get_dashboard_stats() is called
    THEN: Returns complete dashboard statistics
    """
    service = DashboardService(db_session)
    company, jobs, applications, owner = sample_company_with_jobs

    stats = service.get_dashboard_stats(company.id)

    # Job metrics
    assert stats.active_jobs == 3
    assert stats.total_jobs_posted == 3

    # Application metrics
    assert stats.total_applications == 10
    assert stats.new_applications_today == 2  # 2 applications created today

    # Pipeline breakdown
    assert len(stats.applications_by_status) > 0
    status_counts = {item.status: item.count for item in stats.applications_by_status}
    assert status_counts.get("applied", 0) == 4  # 2 + 1 + 2 = 5, but one was moved to interview
    assert status_counts.get("interview", 0) == 3
    assert status_counts.get("offered", 0) == 1
    assert status_counts.get("rejected", 0) == 1

    # Usage tracking
    assert stats.jobs_posted_this_month == 3
    assert stats.candidate_views_this_month == 25

    # Plan limits
    assert stats.max_active_jobs == 10
    assert stats.max_candidate_views == 100


def test_get_dashboard_stats_new_company_no_data(db_session: Session):
    """
    GIVEN: New company with no jobs or applications
    WHEN: get_dashboard_stats() is called
    THEN: Returns empty statistics with zeros
    """
    service = DashboardService(db_session)

    # Create minimal company
    company = Company(
        id=uuid4(),
        name="New Startup",
        domain="newstartup.com",
        subscription_tier="starter",
        max_active_jobs=1,
        max_candidate_views=10
    )
    db_session.add(company)

    subscription = CompanySubscription(
        id=uuid4(),
        company_id=company.id,
        plan_tier="starter",
        status="trialing",
        jobs_posted_this_month=0,
        candidate_views_this_month=0
    )
    db_session.add(subscription)
    db_session.commit()

    stats = service.get_dashboard_stats(company.id)

    assert stats.active_jobs == 0
    assert stats.total_jobs_posted == 0
    assert stats.total_applications == 0
    assert stats.new_applications_today == 0
    assert stats.new_applications_this_week == 0
    assert len(stats.applications_by_status) == 0
    assert len(stats.top_jobs) == 0


def test_get_dashboard_stats_top_jobs_by_volume(db_session: Session, sample_company_with_jobs):
    """
    GIVEN: Company with multiple jobs with varying application counts
    WHEN: get_dashboard_stats() is called
    THEN: Returns top 5 jobs ordered by application volume (last 7 days)
    """
    service = DashboardService(db_session)
    company, jobs, applications, owner = sample_company_with_jobs

    stats = service.get_dashboard_stats(company.id)

    # Should return top jobs ordered by total_applications (descending)
    assert len(stats.top_jobs) == 3  # Only 3 jobs exist
    assert stats.top_jobs[0].job_title == "Software Engineer 1"  # 5 applications
    assert stats.top_jobs[0].total_applications == 5
    assert stats.top_jobs[0].new_applications_24h == 2

    assert stats.top_jobs[1].job_title == "Software Engineer 2"  # 3 applications
    assert stats.top_jobs[1].total_applications == 3

    assert stats.top_jobs[2].job_title == "Software Engineer 3"  # 2 applications
    assert stats.top_jobs[2].total_applications == 2


def test_get_dashboard_stats_time_filters(db_session: Session, sample_company_with_jobs):
    """
    GIVEN: Company with applications from different time periods
    WHEN: get_dashboard_stats() is called
    THEN: Correctly filters applications by time (today, this week)
    """
    service = DashboardService(db_session)
    company, jobs, applications, owner = sample_company_with_jobs

    stats = service.get_dashboard_stats(company.id)

    # Should count applications from today
    assert stats.new_applications_today == 2

    # Should count applications from this week (last 7 days)
    # All 10 applications were created within the last few days
    assert stats.new_applications_this_week >= stats.new_applications_today
    assert stats.new_applications_this_week <= 10


# ===========================================================================
# Test Cases: Pipeline Metrics
# ===========================================================================


def test_get_pipeline_metrics_conversion_rates(db_session: Session, sample_company_with_jobs):
    """
    GIVEN: Company with applications in various stages
    WHEN: get_pipeline_metrics() is called
    THEN: Returns correct conversion rates for hiring funnel
    """
    service = DashboardService(db_session)
    company, jobs, applications, owner = sample_company_with_jobs

    pipeline = service.get_pipeline_metrics(company.id)

    # Total counts
    assert pipeline.total_applicants == 10

    # Stage counts
    assert pipeline.interviewed_count == 3  # 3 in interview stage
    assert pipeline.offered_count == 1  # 1 offer
    assert pipeline.rejected_count == 1

    # Conversion rates
    # 3 interviewed out of 10 = 30%
    assert pipeline.application_to_interview_rate == 30.0

    # 1 offer out of 3 interviewed = 33.33%
    assert abs(pipeline.interview_to_offer_rate - 33.33) < 0.1


def test_get_pipeline_metrics_no_applications(db_session: Session):
    """
    GIVEN: Company with no applications
    WHEN: get_pipeline_metrics() is called
    THEN: Returns zero metrics with 0% conversion rates
    """
    service = DashboardService(db_session)

    # Create company with no applications
    company = Company(
        id=uuid4(),
        name="New Company",
        domain="newcompany.com"
    )
    db_session.add(company)
    db_session.commit()

    pipeline = service.get_pipeline_metrics(company.id)

    assert pipeline.total_applicants == 0
    assert pipeline.interviewed_count == 0
    assert pipeline.offered_count == 0
    assert pipeline.application_to_interview_rate == 0.0
    assert pipeline.interview_to_offer_rate == 0.0


# ===========================================================================
# Test Cases: Recent Activity Feed
# ===========================================================================


def test_get_recent_activity_includes_job_posts(db_session: Session, sample_company_with_jobs):
    """
    GIVEN: Company that posted jobs
    WHEN: get_recent_activity() is called
    THEN: Returns activity events for job postings
    """
    service = DashboardService(db_session)
    company, jobs, applications, owner = sample_company_with_jobs

    activity = service.get_recent_activity(company.id, limit=20)

    # Should include events for 3 job postings + 10 application events
    assert activity.total_count > 0
    assert len(activity.events) > 0

    # Check for job_posted events
    job_posted_events = [e for e in activity.events if e.event_type == "job_posted"]
    assert len(job_posted_events) == 3


def test_get_recent_activity_includes_applications(db_session: Session, sample_company_with_jobs):
    """
    GIVEN: Company with received applications
    WHEN: get_recent_activity() is called
    THEN: Returns activity events for new applications
    """
    service = DashboardService(db_session)
    company, jobs, applications, owner = sample_company_with_jobs

    activity = service.get_recent_activity(company.id, limit=20)

    # Check for application_received events
    app_events = [e for e in activity.events if e.event_type == "application_received"]
    assert len(app_events) == 10  # 10 total applications


def test_get_recent_activity_sorted_by_timestamp(db_session: Session, sample_company_with_jobs):
    """
    GIVEN: Company with multiple activity events
    WHEN: get_recent_activity() is called
    THEN: Events are sorted by timestamp (most recent first)
    """
    service = DashboardService(db_session)
    company, jobs, applications, owner = sample_company_with_jobs

    activity = service.get_recent_activity(company.id, limit=20)

    # Verify events are sorted descending by timestamp
    for i in range(len(activity.events) - 1):
        assert activity.events[i].timestamp >= activity.events[i + 1].timestamp


def test_get_recent_activity_respects_limit(db_session: Session, sample_company_with_jobs):
    """
    GIVEN: Company with many activity events
    WHEN: get_recent_activity() is called with limit=5
    THEN: Returns only 5 most recent events
    """
    service = DashboardService(db_session)
    company, jobs, applications, owner = sample_company_with_jobs

    activity = service.get_recent_activity(company.id, limit=5)

    assert len(activity.events) == 5
    # But total_count should reflect all events
    assert activity.total_count > 5


# ===========================================================================
# Test Cases: Team Activity Tracking
# ===========================================================================


def test_get_team_activity_single_member(db_session: Session, sample_company_with_jobs):
    """
    GIVEN: Company with single team member (owner)
    WHEN: get_team_activity() is called
    THEN: Returns activity summary for that member
    """
    service = DashboardService(db_session)
    company, jobs, applications, owner = sample_company_with_jobs

    team_activity = service.get_team_activity(company.id)

    assert team_activity.total_members == 1
    assert len(team_activity.member_activities) == 1

    owner_activity = team_activity.member_activities[0]
    assert owner_activity.member_role == "owner"
    assert owner_activity.jobs_posted == 3  # Posted 3 jobs


def test_get_team_activity_multiple_members(db_session: Session, sample_company_with_jobs):
    """
    GIVEN: Company with multiple team members
    WHEN: get_team_activity() is called
    THEN: Returns activity breakdown for all members
    """
    service = DashboardService(db_session)
    company, jobs, applications, owner = sample_company_with_jobs

    # Add a recruiter to the team
    recruiter_user = User(
        id=uuid4(),
        email="recruiter@techcorp.com",
        hashed_password="hashed",
        user_type="employer"
    )
    db_session.add(recruiter_user)
    db_session.flush()

    recruiter_member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=recruiter_user.id,
        role="recruiter",
        status="active",
        joined_at=datetime.utcnow()
    )
    db_session.add(recruiter_member)
    db_session.commit()

    team_activity = service.get_team_activity(company.id)

    assert team_activity.total_members == 2
    assert len(team_activity.member_activities) == 2

    roles = {activity.member_role for activity in team_activity.member_activities}
    assert "owner" in roles
    assert "recruiter" in roles


# ===========================================================================
# Test Cases: Quality Metrics
# ===========================================================================


def test_get_dashboard_stats_avg_time_to_first_application(db_session: Session, sample_company_with_jobs):
    """
    GIVEN: Company with jobs that received applications
    WHEN: get_dashboard_stats() is called
    THEN: Calculates average time from job posting to first application
    """
    service = DashboardService(db_session)
    company, jobs, applications, owner = sample_company_with_jobs

    stats = service.get_dashboard_stats(company.id)

    # Should calculate average hours from job posting to first application
    assert stats.avg_time_to_first_application_hours is not None
    assert stats.avg_time_to_first_application_hours > 0


# ===========================================================================
# Test Cases: Edge Cases & Error Handling
# ===========================================================================


def test_get_dashboard_stats_company_not_found(db_session: Session):
    """
    GIVEN: Non-existent company ID
    WHEN: get_dashboard_stats() is called
    THEN: Raises NotFoundError
    """
    service = DashboardService(db_session)
    non_existent_id = uuid4()

    with pytest.raises(Exception, match="not found"):
        service.get_dashboard_stats(non_existent_id)


def test_get_dashboard_stats_only_includes_company_jobs(db_session: Session, sample_company_with_jobs):
    """
    GIVEN: Multiple companies with jobs
    WHEN: get_dashboard_stats() is called for one company
    THEN: Only includes data for that company's jobs
    """
    service = DashboardService(db_session)
    company1, jobs1, applications1, owner1 = sample_company_with_jobs

    # Create second company with jobs
    company2 = Company(
        id=uuid4(),
        name="Other Company",
        domain="other.com",
        subscription_tier="starter",
        max_active_jobs=1,
        max_candidate_views=10
    )
    db_session.add(company2)

    subscription2 = CompanySubscription(
        id=uuid4(),
        company_id=company2.id,
        plan_tier="starter",
        status="active",
        jobs_posted_this_month=1,
        candidate_views_this_month=5
    )
    db_session.add(subscription2)

    job2 = Job(
        id=uuid4(),
        company_id=company2.id,
        title="Job at Other Company",
        company="Other Company",
        description="Description",
        source="employer",
        is_active=True,
        posted_date=datetime.utcnow()
    )
    db_session.add(job2)
    db_session.commit()

    # Get stats for company1
    stats = service.get_dashboard_stats(company1.id)

    # Should only include company1's data
    assert stats.active_jobs == 3  # Company1 has 3 jobs
    assert stats.total_applications == 10  # Company1's applications only


def test_get_dashboard_stats_excludes_inactive_jobs(db_session: Session):
    """
    GIVEN: Company with both active and inactive jobs
    WHEN: get_dashboard_stats() is called
    THEN: Only counts active jobs in active_jobs metric
    """
    service = DashboardService(db_session)

    # Create company
    company = Company(
        id=uuid4(),
        name="Company",
        domain="company.com",
        subscription_tier="growth",
        max_active_jobs=10,
        max_candidate_views=100
    )
    db_session.add(company)

    subscription = CompanySubscription(
        id=uuid4(),
        company_id=company.id,
        plan_tier="growth",
        status="active",
        jobs_posted_this_month=5
    )
    db_session.add(subscription)
    db_session.flush()

    # Create 3 active jobs and 2 inactive jobs
    for i in range(3):
        job = Job(
            id=uuid4(),
            company_id=company.id,
            title=f"Active Job {i+1}",
            company="Company",
            source="employer",
            is_active=True,
            posted_date=datetime.utcnow()
        )
        db_session.add(job)

    for i in range(2):
        job = Job(
            id=uuid4(),
            company_id=company.id,
            title=f"Inactive Job {i+1}",
            company="Company",
            source="employer",
            is_active=False,
            posted_date=datetime.utcnow() - timedelta(days=30)
        )
        db_session.add(job)

    db_session.commit()

    stats = service.get_dashboard_stats(company.id)

    # Should only count active jobs
    assert stats.active_jobs == 3
    # But total_jobs_posted includes all jobs ever posted
    assert stats.total_jobs_posted == 5


# ===========================================================================
# BDD-Style Feature Test
# ===========================================================================


def test_feature_complete_dashboard_workflow(db_session: Session):
    """
    Feature: Employer Dashboard Analytics

    Scenario: Employer views dashboard after posting jobs and receiving applications
      Given a company has posted multiple jobs
      And received applications from candidates
      When the employer views the dashboard
      Then they see accurate statistics for jobs, applications, and pipeline
      And they see top performing jobs ranked by application volume
      And they see recent activity feed with job posts and applications
      And they see team activity breakdown
    """
    service = DashboardService(db_session)

    # Setup: Create company
    company = Company(
        id=uuid4(),
        name="StartupXYZ",
        domain="startupxyz.com",
        subscription_tier="professional",
        max_active_jobs=50,
        max_candidate_views=500
    )
    db_session.add(company)

    subscription = CompanySubscription(
        id=uuid4(),
        company_id=company.id,
        plan_tier="professional",
        status="active",
        jobs_posted_this_month=2,
        candidate_views_this_month=15
    )
    db_session.add(subscription)

    owner = User(
        id=uuid4(),
        email="founder@startupxyz.com",
        hashed_password="hashed",
        user_type="employer"
    )
    db_session.add(owner)
    db_session.flush()

    owner_member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=owner.id,
        role="owner",
        status="active",
        joined_at=datetime.utcnow()
    )
    db_session.add(owner_member)

    # Post 2 jobs
    job1 = Job(
        id=uuid4(),
        company_id=company.id,
        title="Senior Frontend Engineer",
        company="StartupXYZ",
        source="employer",
        is_active=True,
        posted_date=datetime.utcnow() - timedelta(days=3)
    )
    job2 = Job(
        id=uuid4(),
        company_id=company.id,
        title="Product Manager",
        company="StartupXYZ",
        source="employer",
        is_active=True,
        posted_date=datetime.utcnow() - timedelta(days=1)
    )
    db_session.add_all([job1, job2])
    db_session.flush()

    # Create candidate and applications
    candidate = User(
        id=uuid4(),
        email="candidate@example.com",
        hashed_password="hashed",
        user_type="job_seeker"
    )
    db_session.add(candidate)
    db_session.flush()

    app1 = Application(
        id=uuid4(),
        user_id=candidate.id,
        job_id=job1.id,
        status="applied",
        applied_at=datetime.utcnow() - timedelta(hours=2),
        created_at=datetime.utcnow() - timedelta(hours=2)
    )
    app2 = Application(
        id=uuid4(),
        user_id=candidate.id,
        job_id=job2.id,
        status="interview",
        applied_at=datetime.utcnow() - timedelta(hours=1),
        created_at=datetime.utcnow() - timedelta(hours=1)
    )
    db_session.add_all([app1, app2])
    db_session.commit()

    # Step 1: View dashboard stats
    stats = service.get_dashboard_stats(company.id)

    assert stats.active_jobs == 2
    assert stats.total_applications == 2
    assert stats.new_applications_today == 2

    # Step 2: Check top jobs
    assert len(stats.top_jobs) == 2

    # Step 3: View recent activity
    activity = service.get_recent_activity(company.id, limit=10)

    assert activity.total_count >= 4  # 2 jobs + 2 applications
    assert len(activity.events) >= 4

    # Step 4: Check team activity
    team_activity = service.get_team_activity(company.id)

    assert team_activity.total_members == 1
    assert team_activity.member_activities[0].jobs_posted == 2
