"""Interview Scheduling Service - Sprint 13-14

Following Test-Driven Development: This service is implemented to satisfy the tests
in test_interview_scheduling_service.py.

Service Responsibilities:
- Interview scheduling (create, update, cancel, reschedule)
- Interviewer assignment and management
- Candidate availability requests and submissions
- Calendar integration (Google Calendar, Outlook)
- Interview feedback collection and aggregation
- Interview reminders (24h before)
"""
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID

from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.db.models.webhook import (
    InterviewSchedule,
    InterviewFeedback,
    CandidateAvailability,
)
from app.db.models.application import Application
from app.db.models.company import CompanyMember


class InterviewSchedulingService:
    """Service for interview scheduling and management"""

    def __init__(self, db: Session):
        self.db = db

    # ============================================================================
    # INTERVIEW SCHEDULING
    # ============================================================================

    async def create_interview(
        self,
        application_id: UUID,
        schedule_data: Dict[str, Any],
    ) -> InterviewSchedule:
        """
        Create a new interview schedule

        Args:
            application_id: Application ID
            schedule_data: Interview details (type, time, duration, interviewers, etc.)

        Returns:
            InterviewSchedule: Created interview

        Raises:
            ValueError: If application not found or validation fails
        """
        # Verify application exists
        application = (
            self.db.query(Application).filter(Application.id == application_id).first()
        )
        if not application:
            raise ValueError("Application not found")

        # Extract and validate data
        interview_type = schedule_data.get("interview_type", "phone_screen")
        interview_round = schedule_data.get("interview_round", 1)
        scheduled_at = schedule_data.get("scheduled_at")
        duration_minutes = schedule_data.get("duration_minutes", 30)
        timezone = schedule_data.get("timezone", "UTC")
        meeting_platform = schedule_data.get("meeting_platform")
        meeting_link = schedule_data.get("meeting_link")
        interviewer_ids = schedule_data.get("interviewer_ids", [])

        # Create interview
        interview = InterviewSchedule(
            application_id=application_id,
            user_id=application.user_id,
            interview_type=interview_type,
            interview_round=interview_round,
            scheduled_at=scheduled_at,
            duration_minutes=duration_minutes,
            timezone=timezone,
            meeting_platform=meeting_platform,
            meeting_link=meeting_link,
            interviewer_ids=interviewer_ids,
            status="scheduled",
            confirmation_status="pending",
            reminders_config={"24h": True, "1h": True},
        )

        self.db.add(interview)
        self.db.commit()
        self.db.refresh(interview)

        return interview

    async def update_interview(
        self,
        interview_id: UUID,
        schedule_data: Dict[str, Any],
    ) -> InterviewSchedule:
        """
        Update an existing interview

        Args:
            interview_id: Interview ID
            schedule_data: Updated interview details

        Returns:
            InterviewSchedule: Updated interview

        Raises:
            ValueError: If interview not found
        """
        interview = (
            self.db.query(InterviewSchedule)
            .filter(InterviewSchedule.id == interview_id)
            .first()
        )

        if not interview:
            raise ValueError("Interview not found")

        # Update fields if provided
        if "scheduled_at" in schedule_data:
            interview.scheduled_at = schedule_data["scheduled_at"]
        if "duration_minutes" in schedule_data:
            interview.duration_minutes = schedule_data["duration_minutes"]
        if "timezone" in schedule_data:
            interview.timezone = schedule_data["timezone"]
        if "meeting_platform" in schedule_data:
            interview.meeting_platform = schedule_data["meeting_platform"]
        if "meeting_link" in schedule_data:
            interview.meeting_link = schedule_data["meeting_link"]
        if "location" in schedule_data:
            interview.location = schedule_data["location"]

        interview.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(interview)

        return interview

    async def cancel_interview(
        self,
        interview_id: UUID,
        reason: Optional[str] = None,
    ) -> None:
        """
        Cancel an interview

        Args:
            interview_id: Interview ID
            reason: Cancellation reason

        Raises:
            ValueError: If interview not found
        """
        interview = (
            self.db.query(InterviewSchedule)
            .filter(InterviewSchedule.id == interview_id)
            .first()
        )

        if not interview:
            raise ValueError("Interview not found")

        interview.status = "cancelled"
        if reason:
            interview.notes = (
                interview.notes or ""
            ) + f"\nCancellation reason: {reason}"

        interview.updated_at = datetime.utcnow()

        self.db.commit()

    async def reschedule_interview(
        self,
        interview_id: UUID,
        new_time: datetime,
    ) -> InterviewSchedule:
        """
        Reschedule an interview to a new time

        Args:
            interview_id: Interview ID
            new_time: New scheduled time

        Returns:
            InterviewSchedule: Rescheduled interview

        Raises:
            ValueError: If interview not found
        """
        interview = (
            self.db.query(InterviewSchedule)
            .filter(InterviewSchedule.id == interview_id)
            .first()
        )

        if not interview:
            raise ValueError("Interview not found")

        interview.scheduled_at = new_time
        interview.status = "rescheduled"
        interview.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(interview)

        return interview

    # ============================================================================
    # INTERVIEWER ASSIGNMENT
    # ============================================================================

    async def assign_interviewers(
        self,
        interview_id: UUID,
        interviewer_ids: List[UUID],
    ) -> InterviewSchedule:
        """
        Assign interviewers to an interview

        Args:
            interview_id: Interview ID
            interviewer_ids: List of company member IDs

        Returns:
            InterviewSchedule: Updated interview

        Raises:
            ValueError: If interview not found
        """
        interview = (
            self.db.query(InterviewSchedule)
            .filter(InterviewSchedule.id == interview_id)
            .first()
        )

        if not interview:
            raise ValueError("Interview not found")

        # Convert UUIDs to strings for JSON storage
        interview.interviewer_ids = [str(id) for id in interviewer_ids]
        interview.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(interview)

        return interview

    async def remove_interviewer(
        self,
        interview_id: UUID,
        interviewer_id: UUID,
    ) -> InterviewSchedule:
        """
        Remove an interviewer from an interview

        Args:
            interview_id: Interview ID
            interviewer_id: Company member ID to remove

        Returns:
            InterviewSchedule: Updated interview

        Raises:
            ValueError: If interview not found
        """
        interview = (
            self.db.query(InterviewSchedule)
            .filter(InterviewSchedule.id == interview_id)
            .first()
        )

        if not interview:
            raise ValueError("Interview not found")

        # Remove interviewer from list
        if interview.interviewer_ids:
            interview.interviewer_ids = [
                id for id in interview.interviewer_ids if id != str(interviewer_id)
            ]

        interview.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(interview)

        return interview

    # ============================================================================
    # CANDIDATE AVAILABILITY
    # ============================================================================

    async def request_candidate_availability(
        self,
        application_id: UUID,
        deadline: datetime,
    ) -> Dict[str, Any]:
        """
        Request availability from candidate

        Args:
            application_id: Application ID
            deadline: Deadline for submission

        Returns:
            Dict: Request details

        Raises:
            ValueError: If application not found
        """
        application = (
            self.db.query(Application).filter(Application.id == application_id).first()
        )

        if not application:
            raise ValueError("Application not found")

        # Send email to candidate (mocked in tests)
        await self._send_availability_request_email(application, deadline)

        return {
            "application_id": application_id,
            "deadline": deadline,
            "status": "requested",
        }

    async def _send_availability_request_email(
        self, application: Application, deadline: datetime
    ):
        """Send availability request email (to be implemented with email service)"""
        pass

    async def submit_candidate_availability(
        self,
        application_id: UUID,
        candidate_id: UUID,
        slots: List[Dict[str, str]],
        timezone: str,
        preferred_platform: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> CandidateAvailability:
        """
        Candidate submits available time slots

        Args:
            application_id: Application ID
            candidate_id: Candidate user ID
            slots: List of time slots [{"start": ISO8601, "end": ISO8601}, ...]
            timezone: Candidate's timezone
            preferred_platform: Preferred meeting platform
            notes: Additional notes

        Returns:
            CandidateAvailability: Created availability record

        Raises:
            ValueError: If application not found or validation fails
        """
        application = (
            self.db.query(Application).filter(Application.id == application_id).first()
        )

        if not application:
            raise ValueError("Application not found")

        if application.user_id != candidate_id:
            raise ValueError("Candidate ID mismatch")

        # Set expiration (7 days from now)
        expires_at = datetime.utcnow() + timedelta(days=7)

        # Create availability record
        availability = CandidateAvailability(
            application_id=application_id,
            candidate_id=candidate_id,
            available_slots=slots,
            timezone=timezone,
            preferred_platform=preferred_platform,
            notes=notes,
            expires_at=expires_at,
        )

        self.db.add(availability)
        self.db.commit()
        self.db.refresh(availability)

        return availability

    async def get_candidate_availability(
        self,
        application_id: UUID,
    ) -> Optional[CandidateAvailability]:
        """
        Get candidate availability for an application

        Args:
            application_id: Application ID

        Returns:
            CandidateAvailability: Availability record or None
        """
        availability = (
            self.db.query(CandidateAvailability)
            .filter(CandidateAvailability.application_id == application_id)
            .order_by(CandidateAvailability.created_at.desc())
            .first()
        )

        return availability

    # ============================================================================
    # CALENDAR INTEGRATION
    # ============================================================================

    async def sync_to_calendar(
        self,
        interview_id: UUID,
        platform: str = "google",
    ) -> str:
        """
        Sync interview to calendar (Google Calendar, Outlook)

        Args:
            interview_id: Interview ID
            platform: Calendar platform ('google', 'microsoft')

        Returns:
            str: Calendar event ID

        Raises:
            ValueError: If interview not found
        """
        interview = (
            self.db.query(InterviewSchedule)
            .filter(InterviewSchedule.id == interview_id)
            .first()
        )

        if not interview:
            raise ValueError("Interview not found")

        # Create calendar event (mocked in tests)
        if platform == "google":
            event_id = self._create_google_calendar_event(interview)
        elif platform == "microsoft":
            event_id = self._create_microsoft_calendar_event(interview)
        else:
            raise ValueError(f"Unsupported platform: {platform}")

        # Store event ID
        interview.calendar_event_id = event_id
        interview.updated_at = datetime.utcnow()

        self.db.commit()

        return event_id

    def _create_google_calendar_event(self, interview: InterviewSchedule) -> str:
        """Create Google Calendar event (to be implemented)"""
        # Placeholder for Google Calendar API integration
        return f"gcal_event_{interview.id}"

    def _create_microsoft_calendar_event(self, interview: InterviewSchedule) -> str:
        """Create Microsoft Calendar event (to be implemented)"""
        # Placeholder for Microsoft Graph API integration
        return f"outlook_event_{interview.id}"

    async def send_calendar_invite(
        self,
        interview_id: UUID,
    ) -> None:
        """
        Send calendar invite to all participants

        Args:
            interview_id: Interview ID

        Raises:
            ValueError: If interview not found
        """
        interview = (
            self.db.query(InterviewSchedule)
            .filter(InterviewSchedule.id == interview_id)
            .first()
        )

        if not interview:
            raise ValueError("Interview not found")

        # Send email invites (mocked in tests)
        await self._send_calendar_email(interview)

        interview.calendar_invite_sent = True
        interview.updated_at = datetime.utcnow()

        self.db.commit()

    async def _send_calendar_email(self, interview: InterviewSchedule):
        """Send calendar invite email (to be implemented with email service)"""
        pass

    # ============================================================================
    # INTERVIEW FEEDBACK
    # ============================================================================

    async def submit_feedback(
        self,
        interview_id: UUID,
        interviewer_id: UUID,
        feedback_data: Dict[str, Any],
    ) -> InterviewFeedback:
        """
        Submit interview feedback

        Args:
            interview_id: Interview ID
            interviewer_id: Interviewer company member ID
            feedback_data: Feedback details (ratings, strengths, concerns, etc.)

        Returns:
            InterviewFeedback: Created feedback

        Raises:
            ValueError: If interview not found or validation fails
        """
        interview = (
            self.db.query(InterviewSchedule)
            .filter(InterviewSchedule.id == interview_id)
            .first()
        )

        if not interview:
            raise ValueError("Interview not found")

        # Validate ratings (1-5)
        for rating_key in [
            "overall_rating",
            "technical_rating",
            "communication_rating",
            "culture_fit_rating",
        ]:
            rating = feedback_data.get(rating_key)
            if rating is not None and (rating < 1 or rating > 5):
                raise ValueError(f"Rating must be between 1 and 5, got {rating}")

        # Create feedback
        feedback = InterviewFeedback(
            interview_id=interview_id,
            interviewer_id=interviewer_id,
            application_id=interview.application_id,
            overall_rating=feedback_data.get("overall_rating"),
            technical_rating=feedback_data.get("technical_rating"),
            communication_rating=feedback_data.get("communication_rating"),
            culture_fit_rating=feedback_data.get("culture_fit_rating"),
            strengths=feedback_data.get("strengths", []),
            concerns=feedback_data.get("concerns", []),
            notes=feedback_data.get("notes"),
            recommendation=feedback_data.get("recommendation"),
            next_steps=feedback_data.get("next_steps"),
            is_submitted=True,
            submitted_at=datetime.utcnow(),
        )

        self.db.add(feedback)
        self.db.commit()
        self.db.refresh(feedback)

        return feedback

    async def get_interview_feedback(
        self,
        interview_id: UUID,
    ) -> List[InterviewFeedback]:
        """
        Get all feedback for an interview

        Args:
            interview_id: Interview ID

        Returns:
            List[InterviewFeedback]: List of feedback
        """
        feedbacks = (
            self.db.query(InterviewFeedback)
            .filter(InterviewFeedback.interview_id == interview_id)
            .all()
        )

        return feedbacks

    async def get_aggregated_feedback(
        self,
        application_id: UUID,
    ) -> Dict[str, Any]:
        """
        Get aggregated feedback across all interviews for an application

        Args:
            application_id: Application ID

        Returns:
            Dict: Aggregated feedback metrics
        """
        feedbacks = (
            self.db.query(InterviewFeedback)
            .filter(InterviewFeedback.application_id == application_id)
            .all()
        )

        if not feedbacks:
            return {
                "total_feedbacks": 0,
                "average_overall_rating": None,
                "recommendations": {},
            }

        # Calculate averages
        total_feedbacks = len(feedbacks)
        overall_ratings = [f.overall_rating for f in feedbacks if f.overall_rating]

        average_overall = (
            sum(overall_ratings) / len(overall_ratings) if overall_ratings else None
        )

        # Count recommendations
        recommendations = {}
        for feedback in feedbacks:
            if feedback.recommendation:
                recommendations[feedback.recommendation] = (
                    recommendations.get(feedback.recommendation, 0) + 1
                )

        # Aggregate strengths and concerns
        all_strengths = []
        all_concerns = []
        for feedback in feedbacks:
            if feedback.strengths:
                all_strengths.extend(feedback.strengths)
            if feedback.concerns:
                all_concerns.extend(feedback.concerns)

        return {
            "total_feedbacks": total_feedbacks,
            "average_overall_rating": average_overall,
            "recommendations": recommendations,
            "common_strengths": all_strengths,
            "common_concerns": all_concerns,
        }

    # ============================================================================
    # REMINDERS
    # ============================================================================

    async def send_interview_reminders(
        self,
        hours_before: int = 24,
    ) -> int:
        """
        Send reminders for upcoming interviews

        Args:
            hours_before: Hours before interview to send reminder

        Returns:
            int: Number of reminders sent
        """
        # Find interviews happening in the specified timeframe
        now = datetime.utcnow()
        reminder_window_start = now + timedelta(hours=hours_before - 1)
        reminder_window_end = now + timedelta(hours=hours_before + 1)

        interviews = (
            self.db.query(InterviewSchedule)
            .filter(
                InterviewSchedule.status == "scheduled",
                InterviewSchedule.reminder_sent == False,
                InterviewSchedule.scheduled_at >= reminder_window_start,
                InterviewSchedule.scheduled_at <= reminder_window_end,
            )
            .all()
        )

        count = 0
        for interview in interviews:
            await self._send_reminder_email(interview)

            interview.reminder_sent = True
            interview.reminder_sent_at = datetime.utcnow()
            count += 1

        self.db.commit()

        return count

    async def _send_reminder_email(self, interview: InterviewSchedule):
        """Send reminder email (to be implemented with email service)"""
        pass

    # ============================================================================
    # LISTING
    # ============================================================================

    async def list_interviews(
        self,
        company_id: UUID,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[InterviewSchedule]:
        """
        List interviews for a company with filters

        Args:
            company_id: Company ID
            filters: Optional filters (status, type, date range)

        Returns:
            List[InterviewSchedule]: List of interviews
        """
        # Get all applications for jobs belonging to the company
        from app.db.models.job import Job

        query = (
            self.db.query(InterviewSchedule)
            .join(Application, InterviewSchedule.application_id == Application.id)
            .join(Job, Application.job_id == Job.id)
            .filter(Job.company_id == company_id)
        )

        # Apply filters
        if filters:
            if "status" in filters:
                query = query.filter(InterviewSchedule.status == filters["status"])
            if "interview_type" in filters:
                query = query.filter(
                    InterviewSchedule.interview_type == filters["interview_type"]
                )

        interviews = query.order_by(InterviewSchedule.scheduled_at.desc()).all()

        return interviews

    async def list_upcoming_interviews(
        self,
        member_id: UUID,
    ) -> List[InterviewSchedule]:
        """
        Get upcoming interviews for a specific team member

        Args:
            member_id: Company member ID

        Returns:
            List[InterviewSchedule]: List of upcoming interviews
        """
        now = datetime.utcnow()

        # Find interviews where member is assigned as interviewer
        interviews = (
            self.db.query(InterviewSchedule)
            .filter(
                InterviewSchedule.status.in_(["scheduled", "confirmed"]),
                InterviewSchedule.scheduled_at >= now,
            )
            .all()
        )

        # Filter by interviewer_ids (stored as JSON array)
        member_interviews = [
            interview
            for interview in interviews
            if interview.interviewer_ids and str(member_id) in interview.interviewer_ids
        ]

        return sorted(member_interviews, key=lambda x: x.scheduled_at)
