"""Unit tests for Interview Scheduling Service (Sprint 13-14 - TDD Approach)

Following Test-Driven Development: Write tests FIRST, then implement service.

Test Coverage:
- Interview scheduling (create, update, cancel, reschedule)
- Interviewer assignment (assign, remove)
- Candidate availability (request, submit, get)
- Calendar integration (sync, send invites)
- Interview feedback (submit, get, aggregate)
- Reminders (send 24h before)

Test Strategy:
- Use SQLite in-memory database for isolation
- Mock calendar services (Google Calendar, Outlook)
- Test all interview types: phone_screen, technical, behavioral, onsite, final
- Test feedback ratings (1-5 scale) and recommendations
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from uuid import uuid4
from unittest.mock import Mock, patch, AsyncMock

from app.services.interview_scheduling_service import InterviewSchedulingService
from app.db.models.webhook import (
    InterviewSchedule,
    InterviewFeedback,
    CandidateAvailability,
)
from app.db.models.company import Company, CompanyMember
from app.db.models.application import Application
from app.db.models.user import User
from app.db.models.job import Job


# ===========================================================================
# Test Fixtures
# ===========================================================================


@pytest.fixture
def sample_application(db_session: Session):
    """Create a sample application with candidate and company for testing"""
    # Create candidate user
    candidate_user = User(
        id=uuid4(),
        email="candidate@example.com",
        hashed_password="hashed",
        user_type="seeker",
    )
    db_session.add(candidate_user)
    db_session.flush()

    # Create company
    company = Company(
        id=uuid4(),
        name="Tech Company",
        subscription_tier="growth",
        subscription_status="active",
    )
    db_session.add(company)
    db_session.flush()

    # Create job
    job = Job(
        id=uuid4(),
        title="Senior Software Engineer",
        company_id=company.id,
        status="active",
    )
    db_session.add(job)
    db_session.flush()

    # Create application
    application = Application(
        id=uuid4(),
        user_id=candidate_user.id,
        job_id=job.id,
        status="interview",
    )
    db_session.add(application)

    # Create interviewer (company member)
    interviewer_user = User(
        id=uuid4(),
        email="interviewer@techcompany.com",
        hashed_password="hashed",
        user_type="employer",
    )
    db_session.add(interviewer_user)
    db_session.flush()

    interviewer_member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=interviewer_user.id,
        role="interviewer",
        status="active",
    )
    db_session.add(interviewer_member)

    db_session.commit()
    db_session.refresh(application)

    return {
        "application": application,
        "candidate_user": candidate_user,
        "company": company,
        "job": job,
        "interviewer_member": interviewer_member,
    }


# ===========================================================================
# Test Cases: Interview Scheduling (Happy Path)
# ===========================================================================


@pytest.mark.asyncio
async def test_create_interview_success(db_session: Session, sample_application: dict):
    """Test: Successfully schedule a new interview"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]
    interview_time = datetime.utcnow() + timedelta(days=3)

    # Act
    interview = await service.create_interview(
        application_id=application.id,
        schedule_data={
            "interview_type": "phone_screen",
            "interview_round": 1,
            "scheduled_at": interview_time,
            "duration_minutes": 30,
            "timezone": "America/New_York",
            "meeting_platform": "zoom",
            "meeting_link": "https://zoom.us/j/123456789",
        },
    )

    # Assert
    assert interview is not None
    assert interview.application_id == application.id
    assert interview.interview_type == "phone_screen"
    assert interview.interview_round == 1
    assert interview.duration_minutes == 30
    assert interview.status == "scheduled"
    assert interview.meeting_platform == "zoom"
    assert interview.meeting_link == "https://zoom.us/j/123456789"


@pytest.mark.asyncio
async def test_create_interview_with_interviewers(
    db_session: Session, sample_application: dict
):
    """Test: Schedule interview and assign interviewers"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]
    interviewer = sample_application["interviewer_member"]
    interview_time = datetime.utcnow() + timedelta(days=5)

    # Act
    interview = await service.create_interview(
        application_id=application.id,
        schedule_data={
            "interview_type": "technical",
            "scheduled_at": interview_time,
            "duration_minutes": 60,
            "interviewer_ids": [str(interviewer.id)],
        },
    )

    # Assert
    assert interview.interviewer_ids == [str(interviewer.id)]


@pytest.mark.asyncio
async def test_update_interview_success(db_session: Session, sample_application: dict):
    """Test: Successfully update an existing interview"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]

    # Create interview
    interview = await service.create_interview(
        application_id=application.id,
        schedule_data={
            "interview_type": "behavioral",
            "scheduled_at": datetime.utcnow() + timedelta(days=2),
            "duration_minutes": 45,
        },
    )

    # Act
    new_time = datetime.utcnow() + timedelta(days=4)
    updated_interview = await service.update_interview(
        interview_id=interview.id,
        schedule_data={
            "scheduled_at": new_time,
            "duration_minutes": 60,
        },
    )

    # Assert
    assert updated_interview.duration_minutes == 60
    assert updated_interview.scheduled_at == new_time


@pytest.mark.asyncio
async def test_cancel_interview_success(db_session: Session, sample_application: dict):
    """Test: Successfully cancel an interview"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]

    # Create interview
    interview = await service.create_interview(
        application_id=application.id,
        schedule_data={
            "interview_type": "onsite",
            "scheduled_at": datetime.utcnow() + timedelta(days=7),
        },
    )

    # Act
    await service.cancel_interview(
        interview_id=interview.id,
        reason="Candidate unavailable",
    )

    # Assert
    db_session.refresh(interview)
    assert interview.status == "cancelled"
    assert "Candidate unavailable" in (interview.notes or "")


@pytest.mark.asyncio
async def test_reschedule_interview_success(
    db_session: Session, sample_application: dict
):
    """Test: Successfully reschedule an interview"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]

    # Create interview
    original_time = datetime.utcnow() + timedelta(days=3)
    interview = await service.create_interview(
        application_id=application.id,
        schedule_data={
            "interview_type": "final",
            "scheduled_at": original_time,
        },
    )

    # Act
    new_time = datetime.utcnow() + timedelta(days=5)
    rescheduled = await service.reschedule_interview(
        interview_id=interview.id,
        new_time=new_time,
    )

    # Assert
    assert rescheduled.status == "rescheduled"
    assert rescheduled.scheduled_at == new_time


# ===========================================================================
# Test Cases: Interviewer Assignment
# ===========================================================================


@pytest.mark.asyncio
async def test_assign_interviewers_success(
    db_session: Session, sample_application: dict
):
    """Test: Assign multiple interviewers to an interview"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]
    company = sample_application["company"]

    # Create interview
    interview = await service.create_interview(
        application_id=application.id,
        schedule_data={
            "interview_type": "technical",
            "scheduled_at": datetime.utcnow() + timedelta(days=2),
        },
    )

    # Create additional interviewer
    user2 = User(
        id=uuid4(),
        email="interviewer2@techcompany.com",
        hashed_password="hashed",
        user_type="employer",
    )
    db_session.add(user2)
    db_session.flush()

    interviewer2 = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=user2.id,
        role="hiring_manager",
        status="active",
    )
    db_session.add(interviewer2)
    db_session.commit()

    interviewer1 = sample_application["interviewer_member"]

    # Act
    updated = await service.assign_interviewers(
        interview_id=interview.id,
        interviewer_ids=[interviewer1.id, interviewer2.id],
    )

    # Assert
    assert len(updated.interviewer_ids) == 2
    assert str(interviewer1.id) in updated.interviewer_ids
    assert str(interviewer2.id) in updated.interviewer_ids


@pytest.mark.asyncio
async def test_remove_interviewer_success(
    db_session: Session, sample_application: dict
):
    """Test: Remove an interviewer from an interview"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]
    interviewer = sample_application["interviewer_member"]

    # Create interview with interviewer
    interview = await service.create_interview(
        application_id=application.id,
        schedule_data={
            "interview_type": "behavioral",
            "scheduled_at": datetime.utcnow() + timedelta(days=3),
            "interviewer_ids": [str(interviewer.id)],
        },
    )

    # Act
    updated = await service.remove_interviewer(
        interview_id=interview.id,
        interviewer_id=interviewer.id,
    )

    # Assert
    assert str(interviewer.id) not in (updated.interviewer_ids or [])


# ===========================================================================
# Test Cases: Candidate Availability
# ===========================================================================


@pytest.mark.asyncio
async def test_request_candidate_availability_success(
    db_session: Session, sample_application: dict
):
    """Test: Request availability from candidate"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]
    deadline = datetime.utcnow() + timedelta(days=2)

    # Act
    with patch.object(
        service, "_send_availability_request_email", new_callable=AsyncMock
    ):
        result = await service.request_candidate_availability(
            application_id=application.id,
            deadline=deadline,
        )

    # Assert
    assert result is not None
    assert result["application_id"] == application.id
    assert result["deadline"] == deadline


@pytest.mark.asyncio
async def test_submit_candidate_availability_success(
    db_session: Session, sample_application: dict
):
    """Test: Candidate submits available time slots"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]
    candidate = sample_application["candidate_user"]

    # Define time slots
    slots = [
        {
            "start": (datetime.utcnow() + timedelta(days=3, hours=10)).isoformat(),
            "end": (datetime.utcnow() + timedelta(days=3, hours=11)).isoformat(),
        },
        {
            "start": (datetime.utcnow() + timedelta(days=4, hours=14)).isoformat(),
            "end": (datetime.utcnow() + timedelta(days=4, hours=15)).isoformat(),
        },
        {
            "start": (datetime.utcnow() + timedelta(days=5, hours=9)).isoformat(),
            "end": (datetime.utcnow() + timedelta(days=5, hours=10)).isoformat(),
        },
    ]

    # Act
    availability = await service.submit_candidate_availability(
        application_id=application.id,
        candidate_id=candidate.id,
        slots=slots,
        timezone="America/New_York",
        preferred_platform="zoom",
    )

    # Assert
    assert availability is not None
    assert availability.application_id == application.id
    assert availability.candidate_id == candidate.id
    assert len(availability.available_slots) == 3
    assert availability.timezone == "America/New_York"
    assert availability.preferred_platform == "zoom"


@pytest.mark.asyncio
async def test_get_candidate_availability_success(
    db_session: Session, sample_application: dict
):
    """Test: Recruiter retrieves candidate availability"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]
    candidate = sample_application["candidate_user"]

    # Submit availability
    slots = [
        {
            "start": (datetime.utcnow() + timedelta(days=3, hours=10)).isoformat(),
            "end": (datetime.utcnow() + timedelta(days=3, hours=11)).isoformat(),
        }
    ]
    await service.submit_candidate_availability(
        application_id=application.id,
        candidate_id=candidate.id,
        slots=slots,
        timezone="UTC",
    )

    # Act
    availability = await service.get_candidate_availability(
        application_id=application.id
    )

    # Assert
    assert availability is not None
    assert availability.application_id == application.id
    assert len(availability.available_slots) == 1


# ===========================================================================
# Test Cases: Calendar Integration (Mocked)
# ===========================================================================


@pytest.mark.asyncio
async def test_sync_to_calendar_success(db_session: Session, sample_application: dict):
    """Test: Sync interview to Google Calendar"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]

    # Create interview
    interview = await service.create_interview(
        application_id=application.id,
        schedule_data={
            "interview_type": "technical",
            "scheduled_at": datetime.utcnow() + timedelta(days=5),
            "duration_minutes": 60,
        },
    )

    # Act
    with patch.object(
        service, "_create_google_calendar_event", return_value="gcal_event_123"
    ):
        event_id = await service.sync_to_calendar(
            interview_id=interview.id,
            platform="google",
        )

    # Assert
    assert event_id == "gcal_event_123"
    db_session.refresh(interview)
    assert interview.calendar_event_id == "gcal_event_123"


@pytest.mark.asyncio
async def test_send_calendar_invite_success(
    db_session: Session, sample_application: dict
):
    """Test: Send calendar invite to all participants"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]
    interviewer = sample_application["interviewer_member"]

    # Create interview with interviewer
    interview = await service.create_interview(
        application_id=application.id,
        schedule_data={
            "interview_type": "behavioral",
            "scheduled_at": datetime.utcnow() + timedelta(days=4),
            "interviewer_ids": [str(interviewer.id)],
        },
    )

    # Act
    with patch.object(
        service, "_send_calendar_email", new_callable=AsyncMock
    ) as mock_send:
        await service.send_calendar_invite(interview_id=interview.id)

    # Assert
    assert mock_send.called
    db_session.refresh(interview)
    assert interview.calendar_invite_sent is True


# ===========================================================================
# Test Cases: Interview Feedback
# ===========================================================================


@pytest.mark.asyncio
async def test_submit_feedback_success(db_session: Session, sample_application: dict):
    """Test: Interviewer submits feedback after interview"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]
    interviewer = sample_application["interviewer_member"]

    # Create completed interview
    interview = await service.create_interview(
        application_id=application.id,
        schedule_data={
            "interview_type": "technical",
            "scheduled_at": datetime.utcnow() - timedelta(hours=2),
            "interviewer_ids": [str(interviewer.id)],
        },
    )

    # Mark as completed
    interview.status = "completed"
    interview.completed_at = datetime.utcnow()
    db_session.commit()

    # Act
    feedback = await service.submit_feedback(
        interview_id=interview.id,
        interviewer_id=interviewer.id,
        feedback_data={
            "overall_rating": 4,
            "technical_rating": 5,
            "communication_rating": 4,
            "culture_fit_rating": 4,
            "strengths": ["Strong Python skills", "Good problem-solving"],
            "concerns": ["Limited system design experience"],
            "recommendation": "yes",
            "next_steps": "Proceed to final round",
        },
    )

    # Assert
    assert feedback is not None
    assert feedback.interview_id == interview.id
    assert feedback.interviewer_id == interviewer.id
    assert feedback.overall_rating == 4
    assert feedback.technical_rating == 5
    assert feedback.recommendation == "yes"
    assert len(feedback.strengths) == 2
    assert feedback.is_submitted is True
    assert feedback.submitted_at is not None


@pytest.mark.asyncio
async def test_get_interview_feedback_success(
    db_session: Session, sample_application: dict
):
    """Test: Get all feedback for an interview"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]
    interviewer = sample_application["interviewer_member"]

    # Create interview and submit feedback
    interview = await service.create_interview(
        application_id=application.id,
        schedule_data={
            "interview_type": "onsite",
            "scheduled_at": datetime.utcnow() - timedelta(hours=1),
        },
    )
    interview.status = "completed"
    db_session.commit()

    await service.submit_feedback(
        interview_id=interview.id,
        interviewer_id=interviewer.id,
        feedback_data={
            "overall_rating": 5,
            "recommendation": "strong_yes",
        },
    )

    # Act
    feedbacks = await service.get_interview_feedback(interview_id=interview.id)

    # Assert
    assert len(feedbacks) == 1
    assert feedbacks[0].overall_rating == 5


@pytest.mark.asyncio
async def test_get_aggregated_feedback_success(
    db_session: Session, sample_application: dict
):
    """Test: Get aggregated feedback across all interviews"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]
    interviewer = sample_application["interviewer_member"]

    # Create multiple interviews with feedback
    for round_num in range(1, 3):
        interview = await service.create_interview(
            application_id=application.id,
            schedule_data={
                "interview_type": "technical",
                "interview_round": round_num,
                "scheduled_at": datetime.utcnow() - timedelta(days=round_num),
            },
        )
        interview.status = "completed"
        db_session.commit()

        await service.submit_feedback(
            interview_id=interview.id,
            interviewer_id=interviewer.id,
            feedback_data={
                "overall_rating": 4 + round_num,
                "recommendation": "yes",
            },
        )

    # Act
    aggregated = await service.get_aggregated_feedback(application_id=application.id)

    # Assert
    assert aggregated is not None
    assert "average_overall_rating" in aggregated
    assert aggregated["total_feedbacks"] == 2
    assert "recommendations" in aggregated


# ===========================================================================
# Test Cases: Reminders
# ===========================================================================


@pytest.mark.asyncio
async def test_send_interview_reminders_success(db_session: Session):
    """Test: Send reminders for interviews happening in 24 hours"""
    # Arrange
    service = InterviewSchedulingService(db_session)

    # Create user and application
    candidate = User(
        id=uuid4(),
        email="candidate@example.com",
        hashed_password="hashed",
        user_type="seeker",
    )
    db_session.add(candidate)

    company = Company(id=uuid4(), name="Test Co")
    db_session.add(company)

    job = Job(id=uuid4(), title="Engineer", company_id=company.id)
    db_session.add(job)
    db_session.flush()

    application = Application(
        id=uuid4(),
        user_id=candidate.id,
        job_id=job.id,
    )
    db_session.add(application)
    db_session.flush()

    # Create interview 24 hours from now
    interview_time = datetime.utcnow() + timedelta(hours=24)
    interview = await service.create_interview(
        application_id=application.id,
        schedule_data={
            "interview_type": "phone_screen",
            "scheduled_at": interview_time,
        },
    )

    # Act
    with patch.object(
        service, "_send_reminder_email", new_callable=AsyncMock
    ) as mock_send:
        count = await service.send_interview_reminders(hours_before=24)

    # Assert
    assert count >= 1
    assert mock_send.called


# ===========================================================================
# Test Cases: Listing
# ===========================================================================


@pytest.mark.asyncio
async def test_list_interviews_with_filters(
    db_session: Session, sample_application: dict
):
    """Test: List interviews with status filters"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]
    company = sample_application["company"]

    # Create multiple interviews
    await service.create_interview(
        application_id=application.id,
        schedule_data={
            "interview_type": "phone_screen",
            "scheduled_at": datetime.utcnow() + timedelta(days=1),
        },
    )

    interview2 = await service.create_interview(
        application_id=application.id,
        schedule_data={
            "interview_type": "technical",
            "scheduled_at": datetime.utcnow() + timedelta(days=3),
        },
    )
    interview2.status = "completed"
    db_session.commit()

    # Act
    scheduled_interviews = await service.list_interviews(
        company_id=company.id,
        filters={"status": "scheduled"},
    )

    completed_interviews = await service.list_interviews(
        company_id=company.id,
        filters={"status": "completed"},
    )

    # Assert
    assert len(scheduled_interviews) >= 1
    assert len(completed_interviews) >= 1


@pytest.mark.asyncio
async def test_list_upcoming_interviews_for_member(
    db_session: Session, sample_application: dict
):
    """Test: Get upcoming interviews for specific interviewer"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]
    interviewer = sample_application["interviewer_member"]

    # Create interview assigned to interviewer
    await service.create_interview(
        application_id=application.id,
        schedule_data={
            "interview_type": "behavioral",
            "scheduled_at": datetime.utcnow() + timedelta(days=2),
            "interviewer_ids": [str(interviewer.id)],
        },
    )

    # Act
    upcoming = await service.list_upcoming_interviews(member_id=interviewer.id)

    # Assert
    assert len(upcoming) >= 1
    assert str(interviewer.id) in upcoming[0].interviewer_ids


# ===========================================================================
# Test Cases: Edge Cases & Validation
# ===========================================================================


@pytest.mark.asyncio
async def test_invalid_rating_fails(db_session: Session, sample_application: dict):
    """Test: Cannot submit feedback with invalid ratings"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    application = sample_application["application"]
    interviewer = sample_application["interviewer_member"]

    interview = await service.create_interview(
        application_id=application.id,
        schedule_data={"interview_type": "technical"},
    )

    # Act & Assert
    with pytest.raises(ValueError, match="Rating must be between 1 and 5"):
        await service.submit_feedback(
            interview_id=interview.id,
            interviewer_id=interviewer.id,
            feedback_data={
                "overall_rating": 6,  # Invalid: > 5
            },
        )


@pytest.mark.asyncio
async def test_interview_not_found_raises_error(db_session: Session):
    """Test: Operations on non-existent interview raise error"""
    # Arrange
    service = InterviewSchedulingService(db_session)
    fake_interview_id = uuid4()

    # Act & Assert
    with pytest.raises(ValueError, match="Interview not found"):
        await service.update_interview(
            interview_id=fake_interview_id,
            schedule_data={"duration_minutes": 45},
        )
