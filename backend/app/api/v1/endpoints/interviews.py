"""Interview Scheduling endpoints (Sprint 13-14)

API endpoints for interview management:
- Interview scheduling and management (CRUD)
- Interviewer assignment
- Interview rescheduling and cancellation
- Candidate availability requests
- Interview feedback collection
- Calendar integration
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta

from app.db.session import get_db
from app.schemas.interview_scheduling import (
    InterviewScheduleCreate,
    InterviewScheduleUpdate,
    InterviewScheduleResponse,
    InterviewRescheduleRequest,
    InterviewCancelRequest,
    InterviewerAssignRequest,
    InterviewerRemoveRequest,
    AvailabilityRequestCreate,
    AvailabilitySubmit,
    CandidateAvailabilityResponse,
    InterviewFeedbackCreate,
    InterviewFeedbackResponse,
    AggregatedFeedbackResponse,
    InterviewListResponse,
    CalendarSyncRequest,
    CalendarSyncResponse,
    CalendarInviteRequest,
)
from app.services.interview_scheduling_service import InterviewSchedulingService
from app.api.dependencies import get_current_user
from app.db.models.user import User
from app.db.models.company import CompanyMember
from app.db.models.application import Application


router = APIRouter(prefix="/interviews", tags=["Interview Scheduling"])


# ============================================================================
# Helper Functions
# ============================================================================


def get_current_company_member(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CompanyMember:
    """
    Get current user's company membership.

    Validates:
    - User is an employer
    - User belongs to a company

    Returns:
        CompanyMember: Current user's membership

    Raises:
        HTTPException: If not employer or no company found
    """
    if current_user.user_type != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can access interview scheduling",
        )

    member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No company membership found for this user",
        )

    return member


async def check_member_permission(
    action: str,
    member: CompanyMember,
    db: Session,
) -> None:
    """
    Check if member has permission for action.

    Args:
        action: Permission action to check
        member: Company member
        db: Database session

    Raises:
        HTTPException: If permission denied
    """
    from app.services.team_collaboration_service import TeamCollaborationService

    service = TeamCollaborationService(db)
    has_permission = await service.check_permission(member.id, action)

    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You don't have permission to {action}",
        )


async def validate_application_access(
    application_id: UUID,
    company_id: UUID,
    db: Session,
) -> Application:
    """
    Validate that application belongs to company.

    Args:
        application_id: Application ID
        company_id: Company ID
        db: Database session

    Returns:
        Application: Validated application

    Raises:
        HTTPException: If application not found or not owned by company
    """
    application = db.query(Application).filter(Application.id == application_id).first()

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )

    # Verify application belongs to company's job
    from app.db.models.job import Job

    job = db.query(Job).filter(Job.id == application.job_id).first()

    if not job or job.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this application",
        )

    return application


# ============================================================================
# Interview CRUD Endpoints
# ============================================================================


@router.post(
    "", response_model=InterviewScheduleResponse, status_code=status.HTTP_201_CREATED
)
async def schedule_interview(
    interview_data: InterviewScheduleCreate,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Schedule a new interview for an application.

    **Requires:** `schedule_interviews` permission (Owner, Admin, Hiring Manager, Recruiter)

    **Features:**
    - Multiple interview types (phone_screen, technical, behavioral, onsite, final)
    - Multi-interviewer support
    - Calendar integration options
    - Automatic reminder configuration
    - Email notifications to candidate and interviewers

    **Interview Types:**
    - phone_screen: Initial screening call
    - technical: Technical assessment
    - behavioral: Behavioral interview
    - onsite: In-person interview
    - final: Final round interview
    - cultural_fit: Culture fit assessment

    **Meeting Platforms:**
    - zoom: Zoom meeting
    - google_meet: Google Meet
    - microsoft_teams: Microsoft Teams
    - in_person: Physical location
    """
    # Check permission
    await check_member_permission("schedule_interviews", member, db)

    # Validate application access
    await validate_application_access(
        application_id=interview_data.application_id,
        company_id=member.company_id,
        db=db,
    )

    service = InterviewSchedulingService(db)

    try:
        interview = await service.create_interview(
            application_id=interview_data.application_id,
            schedule_data=interview_data.model_dump(),
        )

        return interview

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to schedule interview: {str(e)}",
        )


@router.get("", response_model=InterviewListResponse)
async def list_interviews(
    status_filter: Optional[str] = Query(
        None, description="Filter by status (scheduled, completed, cancelled)"
    ),
    interview_type: Optional[str] = Query(None, description="Filter by interview type"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
    interviewer_id: Optional[UUID] = Query(
        None, description="Filter by interviewer ID"
    ),
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    List all interviews for the company with optional filters.

    **Requires:** Company membership

    **Query Parameters:**
    - status: Filter by interview status
    - interview_type: Filter by type (phone_screen, technical, etc.)
    - start_date: Filter interviews after this date
    - end_date: Filter interviews before this date
    - interviewer_id: Filter by specific interviewer

    **Returns:**
    - List of interviews with candidate and job details
    - Total count
    - Filtered count
    """
    service = InterviewSchedulingService(db)

    try:
        interviews = await service.list_interviews(
            company_id=member.company_id,
            status=status_filter,
            interview_type=interview_type,
            start_date=start_date,
            end_date=end_date,
            interviewer_id=interviewer_id,
        )

        return InterviewListResponse(
            interviews=interviews,
            total=len(interviews),
            filtered_total=len(interviews),
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list interviews: {str(e)}",
        )


@router.get("/upcoming", response_model=List[InterviewScheduleResponse])
async def get_upcoming_interviews(
    days: int = Query(
        7, ge=1, le=90, description="Number of days to look ahead (default: 7, max: 90)"
    ),
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Get upcoming interviews for the next N days.

    **Requires:** Company membership

    **Query Parameters:**
    - days: Number of days to look ahead (default: 7, max: 90)

    **Returns:**
    - List of scheduled interviews sorted by date
    - Includes candidate and job details
    - Shows assigned interviewers
    """
    service = InterviewSchedulingService(db)

    try:
        interviews = await service.get_upcoming_interviews(
            company_id=member.company_id,
            days=days,
        )

        return interviews

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get upcoming interviews: {str(e)}",
        )


@router.get("/{interview_id}", response_model=InterviewScheduleResponse)
async def get_interview(
    interview_id: UUID,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Get details of a specific interview.

    **Requires:** Company membership

    **Returns:**
    - Interview details
    - Candidate information
    - Job details
    - Assigned interviewers
    - Calendar integration status
    """
    service = InterviewSchedulingService(db)

    try:
        interview = await service.get_interview(
            interview_id=interview_id,
            company_id=member.company_id,
        )

        return interview

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.patch("/{interview_id}", response_model=InterviewScheduleResponse)
async def update_interview(
    interview_id: UUID,
    update_data: InterviewScheduleUpdate,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Update interview details (time, platform, location, notes).

    **Requires:** `schedule_interviews` permission (Owner, Admin, Hiring Manager, Recruiter)

    **Note:** For rescheduling, use the `/reschedule` endpoint instead.
    This endpoint is for minor updates without notification overhead.
    """
    await check_member_permission("schedule_interviews", member, db)

    service = InterviewSchedulingService(db)

    try:
        interview = await service.update_interview(
            interview_id=interview_id,
            company_id=member.company_id,
            update_data=update_data.model_dump(exclude_unset=True),
        )

        return interview

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{interview_id}/reschedule", response_model=InterviewScheduleResponse)
async def reschedule_interview(
    interview_id: UUID,
    reschedule_data: InterviewRescheduleRequest,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Reschedule an interview to a new time.

    **Requires:** `schedule_interviews` permission (Owner, Admin, Hiring Manager, Recruiter)

    **Features:**
    - Updates interview time
    - Sends rescheduling notification to candidate and interviewers
    - Updates calendar events
    - Records reason for audit trail
    - Increments rescheduling count
    """
    await check_member_permission("schedule_interviews", member, db)

    service = InterviewSchedulingService(db)

    try:
        interview = await service.reschedule_interview(
            interview_id=interview_id,
            company_id=member.company_id,
            new_time=reschedule_data.new_time,
            reason=reschedule_data.reason,
        )

        return interview

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/{interview_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_interview(
    interview_id: UUID,
    cancel_data: InterviewCancelRequest,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Cancel a scheduled interview.

    **Requires:** `schedule_interviews` permission (Owner, Admin, Hiring Manager, Recruiter)

    **Features:**
    - Marks interview as cancelled
    - Sends cancellation notification
    - Removes calendar events
    - Records cancellation reason
    - Preserves interview record for audit
    """
    await check_member_permission("schedule_interviews", member, db)

    service = InterviewSchedulingService(db)

    try:
        await service.cancel_interview(
            interview_id=interview_id,
            company_id=member.company_id,
            reason=cancel_data.reason,
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ============================================================================
# Interviewer Assignment Endpoints
# ============================================================================


@router.post("/{interview_id}/assign", response_model=InterviewScheduleResponse)
async def assign_interviewers(
    interview_id: UUID,
    assign_data: InterviewerAssignRequest,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Assign interviewers to an interview.

    **Requires:** `schedule_interviews` permission (Owner, Admin, Hiring Manager, Recruiter)

    **Features:**
    - Assign multiple interviewers
    - Validates interviewer permissions
    - Sends notification to assigned interviewers
    - Updates calendar invites
    """
    await check_member_permission("schedule_interviews", member, db)

    service = InterviewSchedulingService(db)

    try:
        interview = await service.assign_interviewers(
            interview_id=interview_id,
            company_id=member.company_id,
            interviewer_ids=assign_data.interviewer_ids,
        )

        return interview

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete(
    "/{interview_id}/interviewers/{interviewer_id}",
    response_model=InterviewScheduleResponse,
)
async def remove_interviewer(
    interview_id: UUID,
    interviewer_id: UUID,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Remove an interviewer from an interview.

    **Requires:** `schedule_interviews` permission (Owner, Admin, Hiring Manager, Recruiter)

    **Features:**
    - Removes interviewer assignment
    - Sends notification to removed interviewer
    - Updates calendar invites
    """
    await check_member_permission("schedule_interviews", member, db)

    service = InterviewSchedulingService(db)

    try:
        interview = await service.remove_interviewer(
            interview_id=interview_id,
            company_id=member.company_id,
            interviewer_id=interviewer_id,
        )

        return interview

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ============================================================================
# Candidate Availability Endpoints
# ============================================================================


@router.post("/applications/{application_id}/request-availability", response_model=dict)
async def request_candidate_availability(
    application_id: UUID,
    request_data: AvailabilityRequestCreate,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Request availability from candidate (employer endpoint).

    **Requires:** `schedule_interviews` permission (Owner, Admin, Hiring Manager, Recruiter)

    **Features:**
    - Sends availability request email to candidate
    - Sets deadline for response
    - Generates secure access token
    - Tracks request status
    """
    await check_member_permission("schedule_interviews", member, db)

    # Validate application access
    await validate_application_access(
        application_id=application_id,
        company_id=member.company_id,
        db=db,
    )

    service = InterviewSchedulingService(db)

    try:
        result = await service.request_candidate_availability(
            application_id=application_id,
            deadline=request_data.deadline,
        )

        return {
            "success": True,
            "message": "Availability request sent to candidate",
            "deadline": request_data.deadline.isoformat(),
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/applications/{application_id}/availability",
    response_model=CandidateAvailabilityResponse,
)
async def get_candidate_availability(
    application_id: UUID,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Get candidate's submitted availability (employer endpoint).

    **Requires:** `schedule_interviews` permission (Owner, Admin, Hiring Manager, Recruiter)

    **Returns:**
    - Available time slots
    - Timezone
    - Preferred platform
    - Additional notes from candidate
    """
    await check_member_permission("schedule_interviews", member, db)

    # Validate application access
    await validate_application_access(
        application_id=application_id,
        company_id=member.company_id,
        db=db,
    )

    service = InterviewSchedulingService(db)

    try:
        availability = await service.get_candidate_availability(
            application_id=application_id,
        )

        return availability

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# Note: Candidate availability submission endpoint will be in candidate-facing API
# POST /api/v1/candidate/applications/{application_id}/availability


# ============================================================================
# Interview Feedback Endpoints
# ============================================================================


@router.post(
    "/{interview_id}/feedback",
    response_model=InterviewFeedbackResponse,
    status_code=status.HTTP_201_CREATED,
)
async def submit_interview_feedback(
    interview_id: UUID,
    feedback_data: InterviewFeedbackCreate,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Submit interview feedback (interviewer endpoint).

    **Requires:** `leave_feedback` permission (Owner, Admin, Hiring Manager, Recruiter, Interviewer)

    **Features:**
    - Multiple rating dimensions (overall, technical, communication, culture fit)
    - Structured strengths and concerns
    - Recommendation levels (strong_yes, yes, maybe, no, strong_no)
    - Next steps suggestions
    - Marks feedback as submitted

    **Rating Scale:** 1-5
    - 1: Poor
    - 2: Below Average
    - 3: Average
    - 4: Good
    - 5: Excellent

    **Recommendations:**
    - strong_yes: Highly recommend hiring
    - yes: Recommend hiring
    - maybe: Neutral/needs more evaluation
    - no: Do not recommend hiring
    - strong_no: Strongly against hiring
    """
    await check_member_permission("leave_feedback", member, db)

    service = InterviewSchedulingService(db)

    try:
        feedback = await service.submit_feedback(
            interview_id=interview_id,
            interviewer_id=member.id,
            feedback_data=feedback_data.model_dump(),
        )

        return feedback

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{interview_id}/feedback", response_model=List[InterviewFeedbackResponse])
async def get_interview_feedback(
    interview_id: UUID,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Get all feedback for an interview.

    **Requires:** `view_all_candidates` permission (Owner, Admin, Hiring Manager, Recruiter, Viewer)
    OR assigned interviewer for this interview

    **Returns:**
    - All submitted feedback from interviewers
    - Interviewer details
    - Ratings and recommendations
    - Notes and next steps
    """
    await check_member_permission("view_all_candidates", member, db)

    service = InterviewSchedulingService(db)

    try:
        feedback_list = await service.get_interview_feedback(
            interview_id=interview_id,
            company_id=member.company_id,
        )

        return feedback_list

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/applications/{application_id}/feedback/aggregated",
    response_model=AggregatedFeedbackResponse,
)
async def get_aggregated_feedback(
    application_id: UUID,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Get aggregated feedback across all interviews for an application.

    **Requires:** `view_all_candidates` permission (Owner, Admin, Hiring Manager, Recruiter, Viewer)

    **Returns:**
    - Total feedback count
    - Average ratings across all dimensions
    - Recommendation distribution
    - Common strengths and concerns
    - Overall hiring sentiment
    """
    await check_member_permission("view_all_candidates", member, db)

    # Validate application access
    await validate_application_access(
        application_id=application_id,
        company_id=member.company_id,
        db=db,
    )

    service = InterviewSchedulingService(db)

    try:
        aggregated = await service.get_aggregated_feedback(
            application_id=application_id,
        )

        return aggregated

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ============================================================================
# Calendar Integration Endpoints (Phase 2)
# ============================================================================


@router.post("/{interview_id}/calendar/sync", response_model=CalendarSyncResponse)
async def sync_to_calendar(
    interview_id: UUID,
    sync_data: CalendarSyncRequest,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Sync interview to calendar (Google Calendar or Microsoft Outlook).

    **Requires:** `schedule_interviews` permission (Owner, Admin, Hiring Manager, Recruiter)

    **Status:** Phase 2 - Currently returns mock response

    **Platforms:**
    - google: Google Calendar
    - microsoft: Microsoft Outlook
    """
    await check_member_permission("schedule_interviews", member, db)

    service = InterviewSchedulingService(db)

    try:
        result = await service.sync_to_calendar(
            interview_id=interview_id,
            company_id=member.company_id,
            platform=sync_data.platform,
        )

        return result

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/{interview_id}/calendar/invite", response_model=dict)
async def send_calendar_invite(
    interview_id: UUID,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Send calendar invite to candidate and interviewers.

    **Requires:** `schedule_interviews` permission (Owner, Admin, Hiring Manager, Recruiter)

    **Status:** Phase 2 - Currently returns mock response

    **Features:**
    - iCal format
    - Includes meeting link/location
    - Automatic RSVP tracking
    """
    await check_member_permission("schedule_interviews", member, db)

    service = InterviewSchedulingService(db)

    try:
        result = await service.send_calendar_invite(
            interview_id=interview_id,
            company_id=member.company_id,
        )

        return {
            "success": True,
            "message": "Calendar invites sent successfully",
            "recipients": result.get("recipients", []),
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
