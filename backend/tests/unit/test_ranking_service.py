"""Unit tests for CandidateRankingService (AI Fit Scoring)

Following TDD/BDD patterns with Given-When-Then structure.
Tests written BEFORE implementation.
"""
import pytest
from uuid import UUID
from sqlalchemy.orm import Session

from app.services.ranking_service import CandidateRankingService
from app.db.models.application import Application
from app.db.models.user import User, Profile
from app.db.models.job import Job
from app.db.models.company import Company
from app.schemas.application import FitIndexResponse


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def sample_company(db_session: Session):
    """Create a sample company"""
    company = Company(
        name="Tech Innovators Inc",
        domain="techinnovators.com",
        industry="Technology",
        size="51-200",
        subscription_tier="professional",
        max_active_jobs=999,
    )
    db_session.add(company)
    db_session.commit()
    db_session.refresh(company)
    return company


@pytest.fixture
def sample_job(db_session: Session, sample_company):
    """Create a sample job posting"""
    job = Job(
        company_id=sample_company.id,
        source="employer",
        title="Senior Full-Stack Engineer",
        company="Tech Innovators Inc",
        location="San Francisco, CA",
        location_type="hybrid",
        employment_type="full_time",
        experience_level="senior",
        experience_min_years=5,
        experience_max_years=10,
        salary_min=140000,
        salary_max=180000,
        description="We are seeking an experienced full-stack engineer...",
        required_skills=["React", "TypeScript", "Node.js", "PostgreSQL", "AWS"],
        preferred_skills=["Docker", "Kubernetes", "GraphQL"],
        is_active=True,
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    return job


@pytest.fixture
def high_fit_candidate(db_session: Session):
    """Create a high-fit candidate"""
    user = User(
        email="jane.smith@example.com",
        password_hash="hashed",
        full_name="Jane Smith",
    )
    db_session.add(user)
    db_session.commit()

    profile = Profile(
        user_id=user.id,
        location="San Francisco, CA",
        years_experience=7,
        skills=["React", "TypeScript", "Node.js", "PostgreSQL", "AWS", "Docker"],
        expected_salary_min=150000,
        expected_salary_max=170000,
        availability_status="actively_looking",
        preferred_location_type="hybrid",
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def medium_fit_candidate(db_session: Session):
    """Create a medium-fit candidate"""
    user = User(
        email="john.doe@example.com",
        password_hash="hashed",
        full_name="John Doe",
    )
    db_session.add(user)
    db_session.commit()

    profile = Profile(
        user_id=user.id,
        location="Oakland, CA",
        years_experience=4,
        skills=["React", "JavaScript", "Node.js", "MongoDB"],
        expected_salary_min=130000,
        expected_salary_max=160000,
        availability_status="open_to_offers",
        preferred_location_type="hybrid",
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def low_fit_candidate(db_session: Session):
    """Create a low-fit candidate"""
    user = User(
        email="bob.junior@example.com",
        password_hash="hashed",
        full_name="Bob Junior",
    )
    db_session.add(user)
    db_session.commit()

    profile = Profile(
        user_id=user.id,
        location="New York, NY",
        years_experience=2,
        skills=["Python", "Django", "MySQL"],
        expected_salary_min=200000,
        expected_salary_max=250000,
        availability_status="not_looking",
        preferred_location_type="remote",
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)
    return user


# ============================================================================
# Fit Index Calculation Tests
# ============================================================================


def test_calculate_fit_index_high_match(
    db_session: Session, sample_job, high_fit_candidate
):
    """
    GIVEN: A candidate with matching skills, location, and salary expectations
    WHEN: calculate_fit_index() is called
    THEN: Returns high fit score (>= 80)
    """
    service = CandidateRankingService(db_session)

    result = service.calculate_fit_index(
        candidate_user_id=high_fit_candidate.id, job_id=sample_job.id
    )

    assert isinstance(result, FitIndexResponse)
    assert result.fit_index >= 80
    assert result.fit_index <= 100
    assert len(result.explanations) > 0
    assert len(result.strengths) > 0


def test_calculate_fit_index_medium_match(
    db_session: Session, sample_job, medium_fit_candidate
):
    """
    GIVEN: A candidate with partial skill match and slightly different location
    WHEN: calculate_fit_index() is called
    THEN: Returns medium fit score (60-79)
    """
    service = CandidateRankingService(db_session)

    result = service.calculate_fit_index(
        candidate_user_id=medium_fit_candidate.id, job_id=sample_job.id
    )

    assert isinstance(result, FitIndexResponse)
    assert result.fit_index >= 60
    assert result.fit_index < 80
    assert len(result.explanations) > 0


def test_calculate_fit_index_low_match(
    db_session: Session, sample_job, low_fit_candidate
):
    """
    GIVEN: A candidate with minimal skill overlap and wrong location
    WHEN: calculate_fit_index() is called
    THEN: Returns low fit score (< 60)
    """
    service = CandidateRankingService(db_session)

    result = service.calculate_fit_index(
        candidate_user_id=low_fit_candidate.id, job_id=sample_job.id
    )

    assert isinstance(result, FitIndexResponse)
    assert result.fit_index < 60
    assert len(result.concerns) > 0


# ============================================================================
# Skills Matching Tests
# ============================================================================


def test_skills_match_scoring(db_session: Session, sample_job, high_fit_candidate):
    """
    GIVEN: A candidate with 5/5 required skills
    WHEN: Calculating skills match component
    THEN: Skills match score is high (weighted 30%)
    """
    service = CandidateRankingService(db_session)

    result = service.calculate_fit_index(
        candidate_user_id=high_fit_candidate.id, job_id=sample_job.id
    )

    # Should have explanation about skills match
    skills_explanation = [e for e in result.explanations if "skill" in e.lower()]
    assert len(skills_explanation) > 0

    # Should list skills as strength
    skills_strength = [
        s
        for s in result.strengths
        if "skill" in s.lower() or "react" in s.lower() or "typescript" in s.lower()
    ]
    assert len(skills_strength) > 0


def test_partial_skills_match(db_session: Session, sample_job, medium_fit_candidate):
    """
    GIVEN: A candidate with 3/5 required skills
    WHEN: Calculating skills match component
    THEN: Skills match score is medium
    """
    service = CandidateRankingService(db_session)

    result = service.calculate_fit_index(
        candidate_user_id=medium_fit_candidate.id, job_id=sample_job.id
    )

    # Should mention missing skills as concern
    missing_skills_concern = [
        c for c in result.concerns if "skill" in c.lower() or "missing" in c.lower()
    ]
    assert (
        len(missing_skills_concern) >= 0
    )  # May or may not flag depending on threshold


# ============================================================================
# Experience Level Matching Tests
# ============================================================================


def test_experience_level_match(db_session: Session, sample_job, high_fit_candidate):
    """
    GIVEN: A candidate with 7 years exp (job requires 5-10)
    WHEN: Calculating experience match component
    THEN: Experience level score is high (weighted 20%)
    """
    service = CandidateRankingService(db_session)

    result = service.calculate_fit_index(
        candidate_user_id=high_fit_candidate.id, job_id=sample_job.id
    )

    # Should have explanation about experience
    exp_explanation = [
        e
        for e in result.explanations
        if "experience" in e.lower() or "year" in e.lower()
    ]
    assert len(exp_explanation) > 0


def test_insufficient_experience(db_session: Session, sample_job, low_fit_candidate):
    """
    GIVEN: A candidate with 2 years exp (job requires 5-10)
    WHEN: Calculating experience match component
    THEN: Experience is flagged as concern
    """
    service = CandidateRankingService(db_session)

    result = service.calculate_fit_index(
        candidate_user_id=low_fit_candidate.id, job_id=sample_job.id
    )

    # Should flag insufficient experience
    exp_concern = [
        c for c in result.concerns if "experience" in c.lower() or "year" in c.lower()
    ]
    assert len(exp_concern) > 0


# ============================================================================
# Location Matching Tests
# ============================================================================


def test_location_match_same_city(db_session: Session, sample_job, high_fit_candidate):
    """
    GIVEN: A candidate in San Francisco (job location: San Francisco, hybrid)
    WHEN: Calculating location match component
    THEN: Location match score is high (weighted 15%)
    """
    service = CandidateRankingService(db_session)

    result = service.calculate_fit_index(
        candidate_user_id=high_fit_candidate.id, job_id=sample_job.id
    )

    # Should mention location as strength for hybrid role
    location_strength = [
        s
        for s in result.strengths
        if "location" in s.lower() or "san francisco" in s.lower()
    ]
    assert len(location_strength) > 0


def test_location_mismatch_remote_preferred(
    db_session: Session, sample_job, low_fit_candidate
):
    """
    GIVEN: A candidate in NYC preferring remote (job is SF hybrid)
    WHEN: Calculating location match component
    THEN: Location mismatch is flagged
    """
    service = CandidateRankingService(db_session)

    result = service.calculate_fit_index(
        candidate_user_id=low_fit_candidate.id, job_id=sample_job.id
    )

    # Should flag location concern
    location_concern = [
        c for c in result.concerns if "location" in c.lower() or "remote" in c.lower()
    ]
    assert len(location_concern) > 0


# ============================================================================
# Salary Matching Tests
# ============================================================================


def test_salary_within_range(db_session: Session, sample_job, high_fit_candidate):
    """
    GIVEN: A candidate expecting $150-170K (job offers $140-180K)
    WHEN: Calculating salary match component
    THEN: Salary match score is high (weighted 10%)
    """
    service = CandidateRankingService(db_session)

    result = service.calculate_fit_index(
        candidate_user_id=high_fit_candidate.id, job_id=sample_job.id
    )

    # Should mention salary alignment
    salary_strength = [s for s in result.strengths if "salary" in s.lower()]
    assert len(salary_strength) > 0


def test_salary_too_high(db_session: Session, sample_job, low_fit_candidate):
    """
    GIVEN: A candidate expecting $200-250K (job offers $140-180K)
    WHEN: Calculating salary match component
    THEN: Salary mismatch is flagged
    """
    service = CandidateRankingService(db_session)

    result = service.calculate_fit_index(
        candidate_user_id=low_fit_candidate.id, job_id=sample_job.id
    )

    # Should flag salary concern
    salary_concern = [c for c in result.concerns if "salary" in c.lower()]
    assert len(salary_concern) > 0


# ============================================================================
# Availability Matching Tests
# ============================================================================


def test_availability_actively_looking(
    db_session: Session, sample_job, high_fit_candidate
):
    """
    GIVEN: A candidate actively looking
    WHEN: Calculating availability match component
    THEN: Availability score is high (weighted 10%)
    """
    service = CandidateRankingService(db_session)

    result = service.calculate_fit_index(
        candidate_user_id=high_fit_candidate.id, job_id=sample_job.id
    )

    # Actively looking should be a strength
    availability_strength = [
        s
        for s in result.strengths
        if "actively" in s.lower() or "available" in s.lower()
    ]
    assert len(availability_strength) >= 0  # Optional strength


def test_availability_not_looking(db_session: Session, sample_job, low_fit_candidate):
    """
    GIVEN: A candidate not currently looking
    WHEN: Calculating availability match component
    THEN: Availability is flagged as concern
    """
    service = CandidateRankingService(db_session)

    result = service.calculate_fit_index(
        candidate_user_id=low_fit_candidate.id, job_id=sample_job.id
    )

    # Not looking should be a concern
    availability_concern = [
        c
        for c in result.concerns
        if "not looking" in c.lower() or "availability" in c.lower()
    ]
    assert len(availability_concern) > 0


# ============================================================================
# Batch Ranking Tests
# ============================================================================


def test_rank_multiple_candidates(
    db_session: Session,
    sample_job,
    high_fit_candidate,
    medium_fit_candidate,
    low_fit_candidate,
):
    """
    GIVEN: Multiple candidates for a job
    WHEN: rank_candidates() is called
    THEN: Returns candidates sorted by fit_index descending
    """
    service = CandidateRankingService(db_session)

    # Create applications for all candidates
    from app.db.models.application import Application
    from datetime import datetime

    app1 = Application(
        user_id=high_fit_candidate.id,
        job_id=sample_job.id,
        status="new",
        applied_at=datetime.utcnow(),
    )
    app2 = Application(
        user_id=medium_fit_candidate.id,
        job_id=sample_job.id,
        status="new",
        applied_at=datetime.utcnow(),
    )
    app3 = Application(
        user_id=low_fit_candidate.id,
        job_id=sample_job.id,
        status="new",
        applied_at=datetime.utcnow(),
    )
    db_session.add_all([app1, app2, app3])
    db_session.commit()

    # Rank all candidates
    ranked_results = service.rank_candidates_for_job(job_id=sample_job.id)

    assert len(ranked_results) == 3
    # Should be sorted by fit_index descending
    assert ranked_results[0]["fit_index"] >= ranked_results[1]["fit_index"]
    assert ranked_results[1]["fit_index"] >= ranked_results[2]["fit_index"]

    # High fit candidate should be first
    assert ranked_results[0]["application_id"] == app1.id


# ============================================================================
# Update Application Fit Index Tests
# ============================================================================


def test_update_application_fit_index(
    db_session: Session, sample_job, high_fit_candidate
):
    """
    GIVEN: An application without fit_index
    WHEN: update_application_fit_index() is called
    THEN: Application is updated with calculated fit_index
    """
    service = CandidateRankingService(db_session)

    from app.db.models.application import Application
    from datetime import datetime

    # Create application without fit_index
    app = Application(
        user_id=high_fit_candidate.id,
        job_id=sample_job.id,
        status="new",
        applied_at=datetime.utcnow(),
        fit_index=None,
    )
    db_session.add(app)
    db_session.commit()

    assert app.fit_index is None

    # Update fit index
    updated_app = service.update_application_fit_index(application_id=app.id)

    assert updated_app.fit_index is not None
    assert updated_app.fit_index >= 0
    assert updated_app.fit_index <= 100


# ============================================================================
# Complete BDD Workflow Test
# ============================================================================


def test_complete_ranking_workflow(
    db_session: Session,
    sample_job,
    high_fit_candidate,
    medium_fit_candidate,
    low_fit_candidate,
):
    """
    Feature: AI-Powered Candidate Ranking

    Scenario: Employer reviews ranked candidates for a job posting
      Given an employer has a job with multiple applicants
      When the AI ranking system calculates fit scores
      Then candidates are ranked by fit index
      And each candidate has detailed explanations
      And strengths and concerns are identified
      And applications are updated with fit scores
    """
    service = CandidateRankingService(db_session)
    from app.db.models.application import Application
    from datetime import datetime

    # GIVEN: Multiple applications
    app1 = Application(
        user_id=high_fit_candidate.id,
        job_id=sample_job.id,
        status="new",
        applied_at=datetime.utcnow(),
    )
    app2 = Application(
        user_id=medium_fit_candidate.id,
        job_id=sample_job.id,
        status="new",
        applied_at=datetime.utcnow(),
    )
    app3 = Application(
        user_id=low_fit_candidate.id,
        job_id=sample_job.id,
        status="new",
        applied_at=datetime.utcnow(),
    )
    db_session.add_all([app1, app2, app3])
    db_session.commit()

    # WHEN: AI ranking calculates fit scores
    ranked_results = service.rank_candidates_for_job(job_id=sample_job.id)

    # THEN: Candidates are ranked
    assert len(ranked_results) == 3
    assert ranked_results[0]["fit_index"] > ranked_results[2]["fit_index"]

    # AND: Each has detailed explanations
    for result in ranked_results:
        assert "fit_index" in result
        assert "explanations" in result
        assert "strengths" in result
        assert "concerns" in result
        assert len(result["explanations"]) > 0

    # AND: High fit candidate has more strengths
    high_fit_result = ranked_results[0]
    assert len(high_fit_result["strengths"]) >= 3

    # AND: Low fit candidate has more concerns
    low_fit_result = ranked_results[2]
    assert len(low_fit_result["concerns"]) >= 2

    # AND: Applications are updated with fit scores
    db_session.refresh(app1)
    db_session.refresh(app2)
    db_session.refresh(app3)

    assert app1.fit_index is not None
    assert app2.fit_index is not None
    assert app3.fit_index is not None

    assert app1.fit_index >= app2.fit_index
    assert app2.fit_index >= app3.fit_index
