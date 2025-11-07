"""Unit Tests for Job Service

Tests job posting functionality with TDD approach:
- Job CRUD operations
- Subscription limit enforcement
- Field validation
- Authorization checks
- Soft deletes
- Status management

Test Approach: BDD-style with Given-When-Then pattern
"""
import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy.orm import Session

from app.services.job_service import JobService
from app.db.models.company import Company, CompanyMember
from app.db.models.job import Job
from app.db.models.user import User
from app.schemas.job import JobCreate, JobUpdate, JobStatus


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def sample_company_with_owner(db_session: Session):
    """Create a sample company with owner for testing"""
    # Create user
    owner = User(
        id=uuid4(),
        email="owner@testcompany.com",
        hashed_password="hashed_password_123",
        is_active=True,
    )
    db_session.add(owner)

    # Create company with Starter plan (1 job limit)
    company = Company(
        id=uuid4(),
        name="Test Company",
        domain="testcompany.com",
        industry="Technology",
        size="1-10",
        subscription_tier="starter",
        subscription_status="active",
        max_active_jobs=1,
        max_candidate_views=10,
    )
    db_session.add(company)

    # Create company member (owner)
    member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=owner.id,
        role="owner",
        status="active",
        joined_at=datetime.utcnow(),
    )
    db_session.add(member)

    db_session.commit()
    db_session.refresh(company)
    db_session.refresh(owner)
    db_session.refresh(member)

    return {"company": company, "owner": owner, "member": member}


@pytest.fixture
def sample_growth_company(db_session: Session):
    """Create a company with Growth plan (10 jobs limit)"""
    owner = User(
        id=uuid4(),
        email="growth_owner@company.com",
        hashed_password="hashed_password_123",
        is_active=True,
    )
    db_session.add(owner)

    company = Company(
        id=uuid4(),
        name="Growth Company",
        subscription_tier="growth",
        subscription_status="active",
        max_active_jobs=10,
        max_candidate_views=100,
    )
    db_session.add(company)

    member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=owner.id,
        role="owner",
        status="active",
        joined_at=datetime.utcnow(),
    )
    db_session.add(member)

    db_session.commit()
    db_session.refresh(company)
    db_session.refresh(owner)

    return {"company": company, "owner": owner, "member": member}


@pytest.fixture
def sample_job_data():
    """Sample job data for testing"""
    return JobCreate(
        title="Senior Software Engineer",
        company_name="Test Company",
        department="Engineering",
        location="San Francisco, CA",
        location_type="hybrid",
        employment_type="full_time",
        experience_level="senior",
        experience_min_years=5,
        experience_max_years=10,
        salary_min=130000,
        salary_max=170000,
        description="We are seeking a talented Senior Software Engineer...",
        required_skills=["Python", "FastAPI", "PostgreSQL", "React"],
        preferred_skills=["AWS", "Docker", "Kubernetes"],
        requirements=[
            "5+ years of software development experience",
            "Strong Python and JavaScript skills",
            "Experience with REST APIs",
        ],
        responsibilities=[
            "Design and implement scalable backend services",
            "Collaborate with cross-functional teams",
            "Mentor junior developers",
        ],
        benefits=[
            "Competitive salary",
            "Health insurance",
            "401(k) matching",
            "Remote work options",
        ],
    )


# ============================================================================
# Job Creation Tests
# ============================================================================


def test_create_job_success(
    db_session: Session, sample_company_with_owner, sample_job_data
):
    """
    GIVEN: A company with available job slots
    WHEN: create_job() is called with valid data
    THEN: Job is created successfully with correct fields
    """
    service = JobService(db_session)
    company = sample_company_with_owner["company"]

    job = service.create_job(company_id=company.id, job_data=sample_job_data)

    # Verify job was created
    assert job.id is not None
    assert job.company_id == company.id
    assert job.title == "Senior Software Engineer"
    assert job.location == "San Francisco, CA"
    assert job.location_type == "hybrid"
    assert job.employment_type == "full_time"
    assert job.experience_level == "senior"
    assert job.salary_min == 130000
    assert job.salary_max == 170000
    assert job.required_skills == ["Python", "FastAPI", "PostgreSQL", "React"]
    assert job.source == "employer"
    assert job.is_active is True
    assert job.posted_date is not None

    # Verify it's in the database
    db_job = db_session.query(Job).filter(Job.id == job.id).first()
    assert db_job is not None
    assert db_job.title == "Senior Software Engineer"


def test_create_job_with_minimal_fields(db_session: Session, sample_company_with_owner):
    """
    GIVEN: A company with available job slots
    WHEN: create_job() is called with only required fields
    THEN: Job is created with defaults for optional fields
    """
    service = JobService(db_session)
    company = sample_company_with_owner["company"]

    minimal_job_data = JobCreate(
        title="Junior Developer",
        company_name="Test Company",
        location="Remote",
        location_type="remote",
        employment_type="full_time",
        description="Entry level position",
    )

    job = service.create_job(company_id=company.id, job_data=minimal_job_data)

    assert job.id is not None
    assert job.title == "Junior Developer"
    assert job.location == "Remote"
    assert job.required_skills == []
    assert job.preferred_skills == []
    assert job.is_active is True


def test_create_job_exceeds_subscription_limit(
    db_session: Session, sample_company_with_owner, sample_job_data
):
    """
    GIVEN: A Starter plan company with 1 active job (at limit)
    WHEN: Attempting to create another job
    THEN: Raises exception with subscription limit message
    """
    service = JobService(db_session)
    company = sample_company_with_owner["company"]

    # Create first job (uses up the 1 job limit)
    first_job = service.create_job(company_id=company.id, job_data=sample_job_data)
    assert first_job.is_active is True

    # Attempt to create second job
    second_job_data = JobCreate(
        title="Another Job",
        company_name="Test Company",
        location="Remote",
        location_type="remote",
        employment_type="full_time",
        description="Another position",
    )

    with pytest.raises(Exception) as exc_info:
        service.create_job(company_id=company.id, job_data=second_job_data)

    assert (
        "subscription limit" in str(exc_info.value).lower()
        or "maximum" in str(exc_info.value).lower()
    )


def test_create_job_growth_plan_allows_multiple(
    db_session: Session, sample_growth_company, sample_job_data
):
    """
    GIVEN: A Growth plan company (10 jobs limit)
    WHEN: Creating multiple jobs within the limit
    THEN: All jobs are created successfully
    """
    service = JobService(db_session)
    company = sample_growth_company["company"]

    # Create 3 jobs (well within the 10 job limit)
    jobs = []
    for i in range(3):
        job_data = JobCreate(
            title=f"Software Engineer {i+1}",
            company_name="Growth Company",
            location="Remote",
            location_type="remote",
            employment_type="full_time",
            description=f"Position {i+1}",
        )
        job = service.create_job(company_id=company.id, job_data=job_data)
        jobs.append(job)

    assert len(jobs) == 3
    assert all(job.is_active for job in jobs)

    # Verify count in database
    active_jobs = (
        db_session.query(Job)
        .filter(Job.company_id == company.id, Job.is_active == True)
        .count()
    )
    assert active_jobs == 3


def test_create_job_requires_company_exists(db_session: Session, sample_job_data):
    """
    GIVEN: A non-existent company ID
    WHEN: Attempting to create a job
    THEN: Raises exception indicating company not found
    """
    service = JobService(db_session)
    fake_company_id = uuid4()

    with pytest.raises(Exception) as exc_info:
        service.create_job(company_id=fake_company_id, job_data=sample_job_data)

    assert (
        "company" in str(exc_info.value).lower()
        and "not found" in str(exc_info.value).lower()
    )


def test_create_job_validates_required_fields(
    db_session: Session, sample_company_with_owner
):
    """
    GIVEN: Job data missing required fields
    WHEN: Attempting to create a job
    THEN: Validation error is raised
    """
    service = JobService(db_session)
    company = sample_company_with_owner["company"]

    # Missing title
    with pytest.raises(Exception):
        invalid_data = JobCreate(
            title="",  # Empty title
            company_name="Test Company",
            location="Remote",
            location_type="remote",
            employment_type="full_time",
            description="Description",
        )
        service.create_job(company_id=company.id, job_data=invalid_data)


# ============================================================================
# Job Retrieval Tests
# ============================================================================


def test_get_job_by_id_success(
    db_session: Session, sample_company_with_owner, sample_job_data
):
    """
    GIVEN: An existing job
    WHEN: get_job() is called with the job ID
    THEN: Returns the job with all fields
    """
    service = JobService(db_session)
    company = sample_company_with_owner["company"]

    created_job = service.create_job(company_id=company.id, job_data=sample_job_data)

    retrieved_job = service.get_job(job_id=created_job.id)

    assert retrieved_job is not None
    assert retrieved_job.id == created_job.id
    assert retrieved_job.title == "Senior Software Engineer"
    assert retrieved_job.company_id == company.id


def test_get_job_not_found(db_session: Session):
    """
    GIVEN: A non-existent job ID
    WHEN: get_job() is called
    THEN: Returns None or raises exception
    """
    service = JobService(db_session)
    fake_job_id = uuid4()

    job = service.get_job(job_id=fake_job_id)
    assert job is None


def test_list_jobs_for_company(db_session: Session, sample_growth_company):
    """
    GIVEN: A company with multiple jobs
    WHEN: list_jobs() is called
    THEN: Returns all jobs for the company with pagination
    """
    service = JobService(db_session)
    company = sample_growth_company["company"]

    # Create 5 jobs
    for i in range(5):
        job_data = JobCreate(
            title=f"Position {i+1}",
            company_name="Growth Company",
            location="Remote",
            location_type="remote",
            employment_type="full_time",
            description=f"Description {i+1}",
        )
        service.create_job(company_id=company.id, job_data=job_data)

    # List all jobs
    jobs, total = service.list_jobs(company_id=company.id, page=1, limit=10)

    assert total == 5
    assert len(jobs) == 5
    assert all(job.company_id == company.id for job in jobs)


def test_list_jobs_pagination(db_session: Session, sample_growth_company):
    """
    GIVEN: A company with 7 jobs
    WHEN: list_jobs() is called with page=2, limit=3
    THEN: Returns jobs 4-6 (second page)
    """
    service = JobService(db_session)
    company = sample_growth_company["company"]

    # Create 7 jobs
    for i in range(7):
        job_data = JobCreate(
            title=f"Job {i+1}",
            company_name="Growth Company",
            location="Remote",
            location_type="remote",
            employment_type="full_time",
            description=f"Description {i+1}",
        )
        service.create_job(company_id=company.id, job_data=job_data)

    # Get page 2 with limit 3
    jobs, total = service.list_jobs(company_id=company.id, page=2, limit=3)

    assert total == 7
    assert len(jobs) == 3  # Jobs 4-6


def test_list_jobs_filter_by_status_active(db_session: Session, sample_growth_company):
    """
    GIVEN: A company with 3 active and 2 inactive jobs
    WHEN: list_jobs() is called with status="active"
    THEN: Returns only active jobs
    """
    service = JobService(db_session)
    company = sample_growth_company["company"]

    # Create 3 active jobs
    for i in range(3):
        job_data = JobCreate(
            title=f"Active Job {i+1}",
            company_name="Growth Company",
            location="Remote",
            location_type="remote",
            employment_type="full_time",
            description=f"Active position {i+1}",
        )
        service.create_job(company_id=company.id, job_data=job_data)

    # Create 2 jobs and mark them as inactive
    for i in range(2):
        job_data = JobCreate(
            title=f"Inactive Job {i+1}",
            company_name="Growth Company",
            location="Remote",
            location_type="remote",
            employment_type="full_time",
            description=f"Closed position {i+1}",
        )
        job = service.create_job(company_id=company.id, job_data=job_data)
        service.update_job_status(job_id=job.id, status=JobStatus.CLOSED)

    # Filter by active status
    jobs, total = service.list_jobs(
        company_id=company.id, status="active", page=1, limit=10
    )

    assert total == 3
    assert len(jobs) == 3
    assert all(job.is_active for job in jobs)


# ============================================================================
# Job Update Tests
# ============================================================================


def test_update_job_success(
    db_session: Session, sample_company_with_owner, sample_job_data
):
    """
    GIVEN: An existing job
    WHEN: update_job() is called with new data
    THEN: Job is updated with new values
    """
    service = JobService(db_session)
    company = sample_company_with_owner["company"]

    job = service.create_job(company_id=company.id, job_data=sample_job_data)

    update_data = JobUpdate(
        title="Lead Software Engineer",
        salary_min=150000,
        salary_max=200000,
        description="Updated description with new requirements",
    )

    updated_job = service.update_job(job_id=job.id, job_data=update_data)

    assert updated_job.title == "Lead Software Engineer"
    assert updated_job.salary_min == 150000
    assert updated_job.salary_max == 200000
    assert updated_job.description == "Updated description with new requirements"
    # Unchanged fields remain the same
    assert updated_job.location == "San Francisco, CA"
    assert updated_job.employment_type == "full_time"


def test_update_job_partial_update(
    db_session: Session, sample_company_with_owner, sample_job_data
):
    """
    GIVEN: An existing job
    WHEN: update_job() is called with only some fields
    THEN: Only specified fields are updated
    """
    service = JobService(db_session)
    company = sample_company_with_owner["company"]

    job = service.create_job(company_id=company.id, job_data=sample_job_data)

    original_title = job.title
    original_location = job.location

    # Update only salary
    update_data = JobUpdate(salary_min=140000, salary_max=180000)
    updated_job = service.update_job(job_id=job.id, job_data=update_data)

    assert updated_job.salary_min == 140000
    assert updated_job.salary_max == 180000
    assert updated_job.title == original_title  # Unchanged
    assert updated_job.location == original_location  # Unchanged


def test_update_job_not_found(db_session: Session):
    """
    GIVEN: A non-existent job ID
    WHEN: update_job() is called
    THEN: Raises exception indicating job not found
    """
    service = JobService(db_session)
    fake_job_id = uuid4()

    update_data = JobUpdate(title="New Title")

    with pytest.raises(Exception) as exc_info:
        service.update_job(job_id=fake_job_id, job_data=update_data)

    assert (
        "job" in str(exc_info.value).lower()
        and "not found" in str(exc_info.value).lower()
    )


# ============================================================================
# Job Status Management Tests
# ============================================================================


def test_update_job_status_to_paused(
    db_session: Session, sample_company_with_owner, sample_job_data
):
    """
    GIVEN: An active job
    WHEN: update_job_status() is called with status="paused"
    THEN: Job status is updated but is_active remains True
    """
    service = JobService(db_session)
    company = sample_company_with_owner["company"]

    job = service.create_job(company_id=company.id, job_data=sample_job_data)
    assert job.is_active is True

    updated_job = service.update_job_status(job_id=job.id, status=JobStatus.PAUSED)

    # Paused jobs are still "active" in terms of is_active flag
    # (they count toward subscription limits)
    assert updated_job.is_active is True


def test_update_job_status_to_closed(
    db_session: Session, sample_company_with_owner, sample_job_data
):
    """
    GIVEN: An active job
    WHEN: update_job_status() is called with status="closed"
    THEN: Job is soft deleted (is_active = False)
    """
    service = JobService(db_session)
    company = sample_company_with_owner["company"]

    job = service.create_job(company_id=company.id, job_data=sample_job_data)
    assert job.is_active is True

    updated_job = service.update_job_status(job_id=job.id, status=JobStatus.CLOSED)

    assert updated_job.is_active is False

    # Verify in database
    db_job = db_session.query(Job).filter(Job.id == job.id).first()
    assert db_job.is_active is False


def test_closed_job_doesnt_count_toward_limit(
    db_session: Session, sample_company_with_owner, sample_job_data
):
    """
    GIVEN: A company at job limit with a closed job
    WHEN: Attempting to create a new job
    THEN: New job is created successfully (closed jobs don't count)
    """
    service = JobService(db_session)
    company = sample_company_with_owner["company"]

    # Create and close a job
    first_job = service.create_job(company_id=company.id, job_data=sample_job_data)
    service.update_job_status(job_id=first_job.id, status=JobStatus.CLOSED)

    # Should be able to create another job since the first is closed
    second_job_data = JobCreate(
        title="New Position",
        company_name="Test Company",
        location="Remote",
        location_type="remote",
        employment_type="full_time",
        description="Another position",
    )

    second_job = service.create_job(company_id=company.id, job_data=second_job_data)
    assert second_job.is_active is True


# ============================================================================
# Job Deletion Tests
# ============================================================================


def test_delete_job_soft_delete(
    db_session: Session, sample_company_with_owner, sample_job_data
):
    """
    GIVEN: An existing job
    WHEN: delete_job() is called
    THEN: Job is soft deleted (is_active = False)
    """
    service = JobService(db_session)
    company = sample_company_with_owner["company"]

    job = service.create_job(company_id=company.id, job_data=sample_job_data)
    job_id = job.id

    result = service.delete_job(job_id=job_id)
    assert result is True

    # Job still exists in database but is_active = False
    db_job = db_session.query(Job).filter(Job.id == job_id).first()
    assert db_job is not None
    assert db_job.is_active is False


def test_delete_job_not_found(db_session: Session):
    """
    GIVEN: A non-existent job ID
    WHEN: delete_job() is called
    THEN: Returns False or raises exception
    """
    service = JobService(db_session)
    fake_job_id = uuid4()

    with pytest.raises(Exception) as exc_info:
        service.delete_job(job_id=fake_job_id)

    assert (
        "job" in str(exc_info.value).lower()
        and "not found" in str(exc_info.value).lower()
    )


# ============================================================================
# BDD Feature Test: Complete Job Lifecycle
# ============================================================================


def test_complete_job_lifecycle(db_session: Session, sample_growth_company):
    """
    Feature: Job Posting Lifecycle Management

    Scenario: Employer creates, updates, pauses, and closes a job
      Given an employer with Growth plan subscription
      When they create a new job posting
      Then the job is active and visible
      And when they update the job details
      Then the changes are saved
      And when they pause the job
      Then applications stop but job remains in dashboard
      And when they reactivate the job
      Then applications resume
      And when they close the job
      Then the job is removed from active listings
      And the job slot is freed for new postings
    """
    service = JobService(db_session)
    company = sample_growth_company["company"]

    # GIVEN: An employer with Growth plan
    assert company.subscription_tier == "growth"
    assert company.max_active_jobs == 10

    # WHEN: They create a new job posting
    job_data = JobCreate(
        title="Full Stack Engineer",
        company_name="Growth Company",
        location="San Francisco, CA",
        location_type="hybrid",
        employment_type="full_time",
        experience_level="mid",
        salary_min=100000,
        salary_max=140000,
        description="Join our growing team...",
        required_skills=["JavaScript", "Python", "PostgreSQL"],
    )

    job = service.create_job(company_id=company.id, job_data=job_data)

    # THEN: The job is active and visible
    assert job.id is not None
    assert job.is_active is True
    assert job.title == "Full Stack Engineer"

    # AND: When they update the job details
    update_data = JobUpdate(
        title="Senior Full Stack Engineer",
        salary_min=120000,
        salary_max=160000,
    )
    updated_job = service.update_job(job_id=job.id, job_data=update_data)

    # THEN: The changes are saved
    assert updated_job.title == "Senior Full Stack Engineer"
    assert updated_job.salary_min == 120000

    # AND: When they pause the job
    paused_job = service.update_job_status(job_id=job.id, status=JobStatus.PAUSED)

    # THEN: Job remains in dashboard (still counts toward limit)
    assert paused_job.is_active is True

    # AND: When they reactivate the job
    active_job = service.update_job_status(job_id=job.id, status=JobStatus.ACTIVE)
    assert active_job.is_active is True

    # AND: When they close the job
    closed_job = service.update_job_status(job_id=job.id, status=JobStatus.CLOSED)

    # THEN: The job is removed from active listings
    assert closed_job.is_active is False

    # AND: The job slot is freed for new postings
    active_jobs_count = (
        db_session.query(Job)
        .filter(Job.company_id == company.id, Job.is_active == True)
        .count()
    )
    assert active_jobs_count == 0

    # Can create a new job now
    new_job_data = JobCreate(
        title="Backend Engineer",
        company_name="Growth Company",
        location="Remote",
        location_type="remote",
        employment_type="full_time",
        description="Backend position",
    )
    new_job = service.create_job(company_id=company.id, job_data=new_job_data)
    assert new_job.is_active is True
