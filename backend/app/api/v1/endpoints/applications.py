"""Application/ATS API Endpoints for Employers

Provides REST API for employer applicant tracking system.
"""

import math
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.company import CompanyMember
from app.services.application_service import ApplicationService
from app.services.ranking_service import CandidateRankingService
from app.schemas.application import (
    ATSApplicationResponse,
    ATSApplicationListResponse,
    ATSApplicationStatus,
    ApplicationStatusUpdate,
    ApplicationNoteCreate,
    ApplicationNoteUpdate,
    ApplicationNoteResponse,
    ApplicationAssignUpdate,
    ApplicationBulkUpdate,
    FitIndexResponse,
)


router = APIRouter()


def get_user_company_member(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> CompanyMember:
    """
    Get company member for current user.

    Raises:
        HTTPException: If user is not a company member
    """
    company_member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not company_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any company",
        )

    return company_member


@router.get(
    "/jobs/{job_id}/applications",
    response_model=ATSApplicationListResponse,
    summary="List applications for a job",
    description="Get paginated list of applications with AI ranking and filtering",
)
def list_job_applications(
    job_id: UUID,
    status_filter: Optional[str] = Query(
        None, alias="status", description="Filter by status"
    ),
    min_fit_index: Optional[int] = Query(
        None, ge=0, le=100, description="Minimum fit score"
    ),
    sort_by: str = Query("fit_index", description="Sort field: fit_index, applied_at"),
    order: str = Query("desc", pattern="^(asc|desc)$", description="Sort order"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db),
):
    """
    List all applications for a job with filtering and sorting.

    **Permissions**: All company members can view applications

    **Query Parameters**:
    - status: Filter by application status
    - min_fit_index: Filter by minimum fit score (0-100)
    - sort_by: Sort field (fit_index, applied_at)
    - order: Sort order (asc, desc)
    - page: Page number (default: 1)
    - limit: Items per page (default: 20, max: 100)
    """
    # Verify job belongs to user's company
    from app.db.models.job import Job

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
        )

    if job.company_id != company_member.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this job",
        )

    # Get applications via service
    app_service = ApplicationService(db)
    applications, total = app_service.get_applications_for_job(
        job_id=job_id,
        status=status_filter,
        min_fit_index=min_fit_index,
        sort_by=sort_by,
        order=order,
        page=page,
        limit=limit,
    )

    total_pages = math.ceil(total / limit) if total > 0 else 0

    return ATSApplicationListResponse(
        applications=[
            ATSApplicationResponse.model_validate(app) for app in applications
        ],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get(
    "/jobs/{job_id}/applications/ranked",
    summary="Get AI-ranked applications",
    description="Get all applications ranked by AI fit score with detailed explanations",
)
def get_ranked_applications(
    job_id: UUID,
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db),
):
    """
    Get AI-ranked applications for a job.

    **Permissions**: All company members can view rankings

    Returns applications sorted by fit index with:
    - Fit score (0-100)
    - Explanations for each scoring factor
    - Candidate strengths
    - Potential concerns
    """
    # Verify job belongs to user's company
    from app.db.models.job import Job

    job = db.query(Job).filter(Job.id == job_id).first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
        )

    if job.company_id != company_member.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this job",
        )

    # Rank candidates via service
    ranking_service = CandidateRankingService(db)
    ranked_results = ranking_service.rank_candidates_for_job(
        job_id=job_id, update_applications=True  # Update fit_index on applications
    )

    return {
        "job_id": str(job_id),
        "total_candidates": len(ranked_results),
        "ranked_candidates": ranked_results,
    }


@router.patch(
    "/applications/{application_id}/status",
    response_model=ATSApplicationResponse,
    summary="Update application status",
    description="Move application through pipeline stages (reviewing, phone_screen, etc.)",
)
def update_application_status(
    application_id: UUID,
    status_data: ApplicationStatusUpdate,
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db),
):
    """
    Update application status.

    **Permissions**: hiring_manager, admin, owner

    **Status Options**:
    - new: Initial application received
    - reviewing: Application under review
    - phone_screen: Scheduled for phone screen
    - technical_interview: Technical interview stage
    - final_interview: Final interview stage
    - offer: Offer extended
    - hired: Candidate hired
    - rejected: Application rejected
    """
    # Check permissions
    allowed_roles = ["owner", "admin", "hiring_manager"]
    if company_member.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}",
        )

    # Verify application belongs to user's company
    from app.db.models.application import Application

    application = (
        db.query(Application)
        .join(Application.job)
        .filter(Application.id == application_id)
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )

    if application.job.company_id != company_member.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this application",
        )

    # Update status via service (Issue #58: Enhanced with email support)
    try:
        app_service = ApplicationService(db)
        updated_app = app_service.update_application_status(
            application_id=application_id,
            status_data=status_data,
            send_email=status_data.send_email,
            rejection_reason=status_data.rejection_reason,
            custom_message=status_data.custom_message,
        )
        return ATSApplicationResponse.model_validate(updated_app)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/applications/{application_id}/notes",
    response_model=ApplicationNoteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add internal note to application",
    description="Add private or team-visible note on an application",
)
def add_application_note(
    application_id: UUID,
    note_data: ApplicationNoteCreate,
    current_user: User = Depends(get_current_user),
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db),
):
    """
    Add internal note to application.

    **Permissions**: All company members can add notes

    **Visibility Options**:
    - team: Visible to all team members
    - private: Only visible to note author
    """
    # Verify application belongs to user's company
    from app.db.models.application import Application

    application = (
        db.query(Application)
        .join(Application.job)
        .filter(Application.id == application_id)
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )

    if application.job.company_id != company_member.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this application",
        )

    # Add note via service
    app_service = ApplicationService(db)
    note = app_service.add_application_note(
        application_id=application_id, author_id=current_user.id, note_data=note_data
    )

    # Extract @mentions from note content (Issue #27)
    mentioned_users = app_service.extract_mentions(note.content)

    # Convert to response with mentioned_users
    response = ApplicationNoteResponse.model_validate(note)
    response.mentioned_users = mentioned_users

    # TODO: Send notifications to mentioned users (future enhancement)
    # For now, just return the note with extracted mentions

    return response


@router.get(
    "/applications/{application_id}/notes",
    response_model=list[ApplicationNoteResponse],
    summary="Get application notes",
    description="Get all notes for an application (team notes + your private notes)",
)
def get_application_notes(
    application_id: UUID,
    current_user: User = Depends(get_current_user),
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db),
):
    """
    Get notes for an application.

    **Permissions**: All company members can view notes

    Returns team-visible notes + your own private notes.
    """
    # Verify application belongs to user's company
    from app.db.models.application import Application

    application = (
        db.query(Application)
        .join(Application.job)
        .filter(Application.id == application_id)
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )

    if application.job.company_id != company_member.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this application",
        )

    # Get notes via service
    app_service = ApplicationService(db)
    notes = app_service.get_application_notes(
        application_id=application_id, author_id=current_user.id
    )

    return [ApplicationNoteResponse.model_validate(note) for note in notes]


@router.put(
    "/notes/{note_id}",
    response_model=ApplicationNoteResponse,
    summary="Update application note",
    description="Update note content (only within 5-minute edit window, only by author)",
)
def update_application_note(
    note_id: UUID,
    note_data: ApplicationNoteUpdate,
    current_user: User = Depends(get_current_user),
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db),
):
    """
    Update an existing application note (Issue #27).

    **Permissions**: Only note author can update their own notes
    **Time Limit**: Can only update within 5 minutes of creation

    **Raises**:
    - 403: Not the note author
    - 404: Note not found
    - 400: Outside 5-minute edit window
    """
    app_service = ApplicationService(db)

    try:
        updated_note = app_service.update_application_note(
            note_id=note_id, author_id=current_user.id, note_data=note_data
        )
        return ApplicationNoteResponse.model_validate(updated_note)
    except Exception as e:
        error_msg = str(e).lower()
        if "not found" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
            )
        elif "only edit your own" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
            )
        elif "edit window" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
            )


@router.delete(
    "/notes/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete application note",
    description="Delete note (only within 5-minute edit window, only by author)",
)
def delete_application_note(
    note_id: UUID,
    current_user: User = Depends(get_current_user),
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db),
):
    """
    Delete an existing application note (Issue #27).

    **Permissions**: Only note author can delete their own notes
    **Time Limit**: Can only delete within 5 minutes of creation

    **Raises**:
    - 403: Not the note author
    - 404: Note not found
    - 400: Outside 5-minute edit window
    """
    app_service = ApplicationService(db)

    try:
        app_service.delete_application_note(note_id=note_id, author_id=current_user.id)
        return None  # 204 No Content
    except Exception as e:
        error_msg = str(e).lower()
        if "not found" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
            )
        elif "only delete your own" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
            )
        elif "edit window" in error_msg:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
            )


@router.patch(
    "/applications/{application_id}/assign",
    response_model=ATSApplicationResponse,
    summary="Assign team members to application",
    description="Assign or unassign team members to review an application",
)
def assign_application_reviewers(
    application_id: UUID,
    assign_data: ApplicationAssignUpdate,
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db),
):
    """
    Assign or unassign team members to application.

    **Permissions**: hiring_manager, admin, owner

    Pass empty array to unassign all reviewers.
    """
    # Check permissions
    allowed_roles = ["owner", "admin", "hiring_manager"]
    if company_member.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}",
        )

    # Verify application belongs to user's company
    from app.db.models.application import Application

    application = (
        db.query(Application)
        .join(Application.job)
        .filter(Application.id == application_id)
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )

    if application.job.company_id != company_member.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this application",
        )

    # Assign reviewers via service
    try:
        app_service = ApplicationService(db)
        updated_app = app_service.assign_reviewers(
            application_id=application_id, assign_data=assign_data
        )
        return ATSApplicationResponse.model_validate(updated_app)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/applications/bulk-update",
    summary="Bulk update applications",
    description="Perform bulk actions on multiple applications",
)
def bulk_update_applications(
    bulk_data: ApplicationBulkUpdate,
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db),
):
    """
    Bulk update multiple applications.

    **Permissions**: hiring_manager, admin, owner

    **Actions**:
    - reject: Bulk reject applications
    - shortlist: Add "shortlisted" tag
    - move_to_stage: Move all to specific pipeline stage
    """
    # Check permissions
    allowed_roles = ["owner", "admin", "hiring_manager"]
    if company_member.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}",
        )

    # Verify all applications belong to user's company
    from app.db.models.application import Application

    applications = (
        db.query(Application)
        .join(Application.job)
        .filter(Application.id.in_(bulk_data.application_ids))
        .all()
    )

    if not applications:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="No applications found"
        )

    # Verify all belong to company
    if not all(app.job.company_id == company_member.company_id for app in applications):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Some applications do not belong to your company",
        )

    # Perform bulk update via service (Issue #58: Enhanced with email support)
    try:
        app_service = ApplicationService(db)
        result = app_service.bulk_update_applications(
            bulk_data=bulk_data,
            send_emails=bulk_data.send_email,
            rejection_reason=bulk_data.rejection_reason,
            custom_message=bulk_data.custom_message,
        )

        # Return detailed result with success/failure counts
        return {
            "success": result.get("success", True),
            "success_count": result.get("success_count", 0),
            "failed_count": result.get("failed_count", 0),
            "errors": result.get("errors", []),
            "message": f"Successfully updated {result.get('success_count', 0)} application(s)"
            + (f", {result.get('failed_count', 0)} failed" if result.get("failed_count", 0) > 0 else ""),
        }

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/applications/{application_id}/email-preview",
    summary="Preview email before sending (Issue #58)",
    description="Preview email that will be sent to candidate on status change",
)
def preview_status_change_email(
    application_id: UUID,
    new_status: ATSApplicationStatus = Query(..., description="New status to preview"),
    rejection_reason: Optional[str] = Query(None, description="Rejection reason (if applicable)"),
    custom_message: Optional[str] = Query(None, description="Custom message from employer"),
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db),
):
    """
    Preview email that will be sent to candidate on status change.

    **Permissions**: All company members can preview emails

    Returns email subject and body HTML for preview.
    """
    # Verify application belongs to user's company
    from app.db.models.application import Application

    application = (
        db.query(Application)
        .join(Application.job)
        .filter(Application.id == application_id)
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )

    if application.job.company_id != company_member.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this application",
        )

    # Generate email preview
    from app.services.application_notification_service import ApplicationNotificationService

    notification_service = ApplicationNotificationService(db)

    try:
        preview = notification_service.preview_status_change_email(
            application_id=application_id,
            new_status=new_status.value,
            rejection_reason=rejection_reason,
            custom_message=custom_message,
        )
        return preview
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/applications/{application_id}/calculate-fit",
    response_model=FitIndexResponse,
    summary="Calculate AI fit score for application",
    description="Recalculate and return detailed AI fit scoring for a candidate",
)
def calculate_application_fit(
    application_id: UUID,
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db),
):
    """
    Calculate AI fit score for an application.

    **Permissions**: All company members can view fit scores

    Returns detailed AI scoring with:
    - Overall fit index (0-100)
    - Factor-by-factor explanations
    - Candidate strengths
    - Potential concerns
    """
    # Verify application belongs to user's company
    from app.db.models.application import Application

    application = (
        db.query(Application)
        .join(Application.job)
        .filter(Application.id == application_id)
        .first()
    )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Application not found"
        )

    if application.job.company_id != company_member.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this application",
        )

    # Calculate fit via ranking service
    ranking_service = CandidateRankingService(db)
    fit_result = ranking_service.calculate_fit_index(
        candidate_user_id=application.user_id, job_id=application.job_id
    )

    # Update application fit_index
    application.fit_index = fit_result.fit_index
    db.commit()

    return fit_result
