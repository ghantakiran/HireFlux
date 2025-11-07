"""Unit tests for ApplicationService (Employer ATS)

Following TDD/BDD patterns with Given-When-Then structure.
Tests written BEFORE implementation.
"""

import pytest
from datetime import datetime
from uuid import UUID, uuid4
from sqlalchemy.orm import Session

from app.services.application_service import ApplicationService
from app.db.models.application import Application, ApplicationNote
from app.db.models.user import User
from app.db.models.job import Job
from app.db.models.company import Company, CompanyMember
from app.schemas.application import (
    ATSApplicationStatus,
    ApplicationStatusUpdate,
    ApplicationNoteCreate,
    ApplicationAssignUpdate,
    ApplicationBulkUpdate,
)


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def sample_company(db_session: Session):
    """Create a sample company"""
    company = Company(
        name="Test Company",
        domain="testcompany.com",
        industry="Technology",
        size="11-50",
        subscription_tier="growth",
        max_active_jobs=10,
    )
    db_session.add(company)
    db_session.commit()
    db_session.refresh(company)
    return company


@pytest.fixture
def sample_employer_user(db_session: Session):
    """Create a sample employer user"""
    user = User(
        email="employer@testcompany.com",
        password_hash="hashed_password",
        full_name="Employer User",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_company_member(db_session: Session, sample_company, sample_employer_user):
    """Create a company member"""
    member = CompanyMember(
        company_id=sample_company.id,
        user_id=sample_employer_user.id,
        role="hiring_manager",
        status="active",
    )
    db_session.add(member)
    db_session.commit()
    db_session.refresh(member)
    return member


@pytest.fixture
def sample_job(db_session: Session, sample_company):
    """Create a sample job"""
    job = Job(
        company_id=sample_company.id,
        source="employer",
        title="Senior Software Engineer",
        company="Test Company",
        location="San Francisco, CA",
        location_type="hybrid",
        employment_type="full_time",
        description="We are seeking a talented engineer...",
        required_skills=["Python", "FastAPI", "React"],
        salary_min=130000,
        salary_max=170000,
        is_active=True,
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    return job


@pytest.fixture
def sample_candidate_user(db_session: Session):
    """Create a sample candidate user"""
    user = User(
        email="candidate@example.com",
        password_hash="hashed_password",
        full_name="Jane Candidate",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_application(db_session: Session, sample_job, sample_candidate_user):
    """Create a sample application"""
    application = Application(
        user_id=sample_candidate_user.id,
        job_id=sample_job.id,
        status="applied",
        applied_at=datetime.utcnow(),
        fit_index=75,
        assigned_to=[],
        tags=["new"],
    )
    db_session.add(application)
    db_session.commit()
    db_session.refresh(application)
    return application


# ============================================================================
# Application Listing Tests
# ============================================================================


def test_get_applications_for_job_success(
    db_session: Session, sample_job, sample_application
):
    """
    GIVEN: A job with applications
    WHEN: get_applications_for_job() is called
    THEN: Returns paginated list of applications
    """
    service = ApplicationService(db_session)

    applications, total = service.get_applications_for_job(
        job_id=sample_job.id, page=1, limit=10
    )

    assert total == 1
    assert len(applications) == 1
    assert applications[0].id == sample_application.id
    assert applications[0].fit_index == 75


def test_get_applications_with_fit_index_filter(
    db_session: Session, sample_job, sample_candidate_user
):
    """
    GIVEN: Multiple applications with different fit scores
    WHEN: Filtering by minimum fit_index
    THEN: Returns only applications above threshold
    """
    service = ApplicationService(db_session)

    # Create applications with different fit scores
    app1 = Application(
        user_id=sample_candidate_user.id,
        job_id=sample_job.id,
        status="applied",
        fit_index=90,
        applied_at=datetime.utcnow(),
    )
    app2 = Application(
        user_id=sample_candidate_user.id,
        job_id=sample_job.id,
        status="applied",
        fit_index=60,
        applied_at=datetime.utcnow(),
    )
    app3 = Application(
        user_id=sample_candidate_user.id,
        job_id=sample_job.id,
        status="applied",
        fit_index=85,
        applied_at=datetime.utcnow(),
    )
    db_session.add_all([app1, app2, app3])
    db_session.commit()

    # Filter by min fit_index = 80
    applications, total = service.get_applications_for_job(
        job_id=sample_job.id, min_fit_index=80, page=1, limit=10
    )

    assert total == 2
    assert len(applications) == 2
    assert all(app.fit_index >= 80 for app in applications)


def test_get_applications_with_status_filter(
    db_session: Session, sample_job, sample_candidate_user
):
    """
    GIVEN: Applications in different pipeline stages
    WHEN: Filtering by status
    THEN: Returns only applications in specified status
    """
    service = ApplicationService(db_session)

    # Create applications with different statuses
    app1 = Application(
        user_id=sample_candidate_user.id,
        job_id=sample_job.id,
        status="reviewing",
        applied_at=datetime.utcnow(),
    )
    app2 = Application(
        user_id=sample_candidate_user.id,
        job_id=sample_job.id,
        status="phone_screen",
        applied_at=datetime.utcnow(),
    )
    app3 = Application(
        user_id=sample_candidate_user.id,
        job_id=sample_job.id,
        status="reviewing",
        applied_at=datetime.utcnow(),
    )
    db_session.add_all([app1, app2, app3])
    db_session.commit()

    # Filter by status = "reviewing"
    applications, total = service.get_applications_for_job(
        job_id=sample_job.id, status="reviewing", page=1, limit=10
    )

    assert total == 2
    assert len(applications) == 2
    assert all(app.status == "reviewing" for app in applications)


def test_get_applications_sorted_by_fit_index(
    db_session: Session, sample_job, sample_candidate_user
):
    """
    GIVEN: Applications with different fit scores
    WHEN: Sorting by fit_index descending
    THEN: Returns applications ordered by highest fit first
    """
    service = ApplicationService(db_session)

    # Create applications with different fit scores
    app1 = Application(
        user_id=sample_candidate_user.id,
        job_id=sample_job.id,
        status="applied",
        fit_index=70,
        applied_at=datetime.utcnow(),
    )
    app2 = Application(
        user_id=sample_candidate_user.id,
        job_id=sample_job.id,
        status="applied",
        fit_index=95,
        applied_at=datetime.utcnow(),
    )
    app3 = Application(
        user_id=sample_candidate_user.id,
        job_id=sample_job.id,
        status="applied",
        fit_index=82,
        applied_at=datetime.utcnow(),
    )
    db_session.add_all([app1, app2, app3])
    db_session.commit()

    # Get sorted applications
    applications, total = service.get_applications_for_job(
        job_id=sample_job.id, sort_by="fit_index", order="desc", page=1, limit=10
    )

    assert total == 3
    assert applications[0].fit_index == 95
    assert applications[1].fit_index == 82
    assert applications[2].fit_index == 70


# ============================================================================
# Application Status Update Tests
# ============================================================================


def test_update_application_status_success(db_session: Session, sample_application):
    """
    GIVEN: An application in "reviewing" status
    WHEN: update_application_status() is called with new status
    THEN: Status is updated and history is recorded
    """
    service = ApplicationService(db_session)

    status_data = ApplicationStatusUpdate(
        status=ATSApplicationStatus.PHONE_SCREEN,
        note="Strong technical skills, moving forward",
    )

    updated_app = service.update_application_status(
        application_id=sample_application.id, status_data=status_data
    )

    assert updated_app.status == "phone_screen"
    # Verify status history was created
    assert len(updated_app.status_history) > 0


def test_update_application_status_invalid_transition(
    db_session: Session, sample_application
):
    """
    GIVEN: An application in "rejected" status
    WHEN: Attempting to move to "phone_screen"
    THEN: Raises exception (can't revive rejected applications)
    """
    service = ApplicationService(db_session)

    # Set application to rejected
    sample_application.status = "rejected"
    db_session.commit()

    status_data = ApplicationStatusUpdate(status=ATSApplicationStatus.PHONE_SCREEN)

    with pytest.raises(Exception) as exc_info:
        service.update_application_status(
            application_id=sample_application.id, status_data=status_data
        )

    assert "Cannot change status of rejected application" in str(exc_info.value)


# ============================================================================
# Application Note Tests
# ============================================================================


def test_add_application_note_success(
    db_session: Session, sample_application, sample_employer_user
):
    """
    GIVEN: An application
    WHEN: add_application_note() is called
    THEN: Note is created and attached to application
    """
    service = ApplicationService(db_session)

    note_data = ApplicationNoteCreate(
        content="Candidate has strong React skills but needs backend experience",
        visibility="team",
    )

    note = service.add_application_note(
        application_id=sample_application.id,
        author_id=sample_employer_user.id,
        note_data=note_data,
    )

    assert note.id is not None
    assert note.application_id == sample_application.id
    assert note.author_id == sample_employer_user.id
    assert note.content == note_data.content
    assert note.visibility == "team"


def test_add_private_note(
    db_session: Session, sample_application, sample_employer_user
):
    """
    GIVEN: An application
    WHEN: Creating a private note
    THEN: Note visibility is set to "private"
    """
    service = ApplicationService(db_session)

    note_data = ApplicationNoteCreate(
        content="Salary expectations too high, may not proceed", visibility="private"
    )

    note = service.add_application_note(
        application_id=sample_application.id,
        author_id=sample_employer_user.id,
        note_data=note_data,
    )

    assert note.visibility == "private"


def test_get_application_notes(
    db_session: Session, sample_application, sample_employer_user
):
    """
    GIVEN: An application with multiple notes
    WHEN: get_application_notes() is called
    THEN: Returns all notes ordered by created_at desc
    """
    service = ApplicationService(db_session)

    # Create multiple notes
    note1 = service.add_application_note(
        application_id=sample_application.id,
        author_id=sample_employer_user.id,
        note_data=ApplicationNoteCreate(content="First note", visibility="team"),
    )

    note2 = service.add_application_note(
        application_id=sample_application.id,
        author_id=sample_employer_user.id,
        note_data=ApplicationNoteCreate(content="Second note", visibility="team"),
    )

    notes = service.get_application_notes(application_id=sample_application.id)

    assert len(notes) == 2
    # Most recent first
    assert notes[0].id == note2.id
    assert notes[1].id == note1.id


# ============================================================================
# Application Assignment Tests
# ============================================================================


def test_assign_reviewers_to_application(
    db_session: Session, sample_application, sample_employer_user
):
    """
    GIVEN: An application with no assigned reviewers
    WHEN: assign_reviewers() is called
    THEN: Team members are assigned to application
    """
    service = ApplicationService(db_session)

    assign_data = ApplicationAssignUpdate(assigned_to=[sample_employer_user.id])

    updated_app = service.assign_reviewers(
        application_id=sample_application.id, assign_data=assign_data
    )

    assert len(updated_app.assigned_to) == 1
    assert str(sample_employer_user.id) in [str(u) for u in updated_app.assigned_to]


def test_unassign_reviewers(
    db_session: Session, sample_application, sample_employer_user
):
    """
    GIVEN: An application with assigned reviewers
    WHEN: assign_reviewers() is called with empty list
    THEN: All reviewers are unassigned
    """
    service = ApplicationService(db_session)

    # First assign
    sample_application.assigned_to = [str(sample_employer_user.id)]
    db_session.commit()

    # Then unassign
    assign_data = ApplicationAssignUpdate(assigned_to=[])

    updated_app = service.assign_reviewers(
        application_id=sample_application.id, assign_data=assign_data
    )

    assert len(updated_app.assigned_to) == 0


# ============================================================================
# Bulk Update Tests
# ============================================================================


def test_bulk_reject_applications(
    db_session: Session, sample_job, sample_candidate_user
):
    """
    GIVEN: Multiple applications
    WHEN: bulk_update() is called with reject action
    THEN: All specified applications are rejected
    """
    service = ApplicationService(db_session)

    # Create multiple applications
    app1 = Application(
        user_id=sample_candidate_user.id,
        job_id=sample_job.id,
        status="reviewing",
        applied_at=datetime.utcnow(),
    )
    app2 = Application(
        user_id=sample_candidate_user.id,
        job_id=sample_job.id,
        status="reviewing",
        applied_at=datetime.utcnow(),
    )
    db_session.add_all([app1, app2])
    db_session.commit()

    bulk_data = ApplicationBulkUpdate(
        application_ids=[app1.id, app2.id],
        action="reject",
        target_status=ATSApplicationStatus.REJECTED,
    )

    updated_count = service.bulk_update_applications(bulk_data=bulk_data)

    assert updated_count == 2

    # Verify both applications are rejected
    db_session.refresh(app1)
    db_session.refresh(app2)
    assert app1.status == "rejected"
    assert app2.status == "rejected"


def test_bulk_move_to_stage(db_session: Session, sample_job, sample_candidate_user):
    """
    GIVEN: Multiple applications in "reviewing" status
    WHEN: bulk_update() is called to move to "phone_screen"
    THEN: All specified applications move to new stage
    """
    service = ApplicationService(db_session)

    # Create multiple applications
    app1 = Application(
        user_id=sample_candidate_user.id,
        job_id=sample_job.id,
        status="reviewing",
        applied_at=datetime.utcnow(),
    )
    app2 = Application(
        user_id=sample_candidate_user.id,
        job_id=sample_job.id,
        status="reviewing",
        applied_at=datetime.utcnow(),
    )
    db_session.add_all([app1, app2])
    db_session.commit()

    bulk_data = ApplicationBulkUpdate(
        application_ids=[app1.id, app2.id],
        action="move_to_stage",
        target_status=ATSApplicationStatus.PHONE_SCREEN,
    )

    updated_count = service.bulk_update_applications(bulk_data=bulk_data)

    assert updated_count == 2

    # Verify both moved to phone_screen
    db_session.refresh(app1)
    db_session.refresh(app2)
    assert app1.status == "phone_screen"
    assert app2.status == "phone_screen"


# ============================================================================
# Complete BDD Lifecycle Test
# ============================================================================


def test_complete_ats_workflow(
    db_session: Session,
    sample_job,
    sample_candidate_user,
    sample_employer_user,
):
    """
    Feature: Employer ATS Application Management

    Scenario: Complete hiring pipeline workflow
      Given an employer posts a job and receives applications
      When the employer reviews applications
      Then they can filter by fit score
      And move candidates through pipeline stages
      And add internal notes
      And assign team members
      And bulk reject unqualified candidates
    """
    service = ApplicationService(db_session)

    # GIVEN: Multiple applications with different fit scores
    app_high_fit = Application(
        user_id=sample_candidate_user.id,
        job_id=sample_job.id,
        status="new",
        fit_index=92,
        applied_at=datetime.utcnow(),
        tags=[],
    )
    app_medium_fit = Application(
        user_id=sample_candidate_user.id,
        job_id=sample_job.id,
        status="new",
        fit_index=75,
        applied_at=datetime.utcnow(),
        tags=[],
    )
    app_low_fit = Application(
        user_id=sample_candidate_user.id,
        job_id=sample_job.id,
        status="new",
        fit_index=55,
        applied_at=datetime.utcnow(),
        tags=[],
    )
    db_session.add_all([app_high_fit, app_medium_fit, app_low_fit])
    db_session.commit()

    # WHEN: Employer filters by high fit candidates (>= 80)
    high_fit_apps, total = service.get_applications_for_job(
        job_id=sample_job.id,
        min_fit_index=80,
        sort_by="fit_index",
        order="desc",
        page=1,
        limit=10,
    )

    # THEN: Only high fit candidate is returned
    assert total == 1
    assert high_fit_apps[0].fit_index == 92

    # AND: Move high fit candidate to reviewing
    updated_app = service.update_application_status(
        application_id=high_fit_apps[0].id,
        status_data=ApplicationStatusUpdate(
            status=ATSApplicationStatus.REVIEWING,
            note="Excellent fit, reviewing portfolio",
        ),
    )
    assert updated_app.status == "reviewing"

    # AND: Add internal note
    note = service.add_application_note(
        application_id=updated_app.id,
        author_id=sample_employer_user.id,
        note_data=ApplicationNoteCreate(
            content="Strong React skills, 5 years exp, great portfolio",
            visibility="team",
        ),
    )
    assert note.id is not None

    # AND: Assign to hiring manager
    assigned_app = service.assign_reviewers(
        application_id=updated_app.id,
        assign_data=ApplicationAssignUpdate(assigned_to=[sample_employer_user.id]),
    )
    assert len(assigned_app.assigned_to) == 1

    # AND: Move to phone screen
    phone_screen_app = service.update_application_status(
        application_id=assigned_app.id,
        status_data=ApplicationStatusUpdate(
            status=ATSApplicationStatus.PHONE_SCREEN, note="Moving to phone screen"
        ),
    )
    assert phone_screen_app.status == "phone_screen"

    # AND: Bulk reject low fit candidates
    bulk_reject_count = service.bulk_update_applications(
        bulk_data=ApplicationBulkUpdate(
            application_ids=[app_low_fit.id],
            action="reject",
            target_status=ATSApplicationStatus.REJECTED,
        )
    )
    assert bulk_reject_count == 1

    # Verify final state
    db_session.refresh(app_low_fit)
    assert app_low_fit.status == "rejected"

    db_session.refresh(app_high_fit)
    assert app_high_fit.status == "phone_screen"

    # Verify notes were created
    notes = service.get_application_notes(application_id=app_high_fit.id)
    assert len(notes) >= 1
