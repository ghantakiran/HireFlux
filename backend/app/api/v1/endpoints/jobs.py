"""Job Posting API Endpoints

Provides REST API for employer job posting management.
"""

from typing import Optional
from uuid import UUID
import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.db.models.user import User
from app.db.models.company import CompanyMember
from app.services.job_service import JobService
from app.schemas.job import (
    JobCreate,
    JobUpdate,
    JobResponse,
    JobListResponse,
    JobStatusUpdate,
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


def check_job_management_permissions(company_member: CompanyMember) -> bool:
    """
    Check if user has permissions to manage jobs.

    Allowed roles: owner, admin, hiring_manager
    """
    allowed_roles = ["owner", "admin", "hiring_manager"]
    if company_member.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}",
        )
    return True


@router.post(
    "",
    response_model=JobResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new job posting",
    description="Create a new job posting for your company. Requires hiring_manager, admin, or owner role.",
)
def create_job(
    job_data: JobCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new job posting.

    **Permissions**: owner, admin, hiring_manager

    **Subscription Limits**:
    - Starter: 1 active job
    - Growth: 10 active jobs
    - Professional: Unlimited jobs

    **Required Fields**:
    - title
    - company_name
    - location
    - location_type (remote/hybrid/onsite)
    - employment_type (full_time/part_time/contract/internship)
    - description
    """
    # Get company member and check permissions
    company_member = get_user_company_member(current_user, db)
    check_job_management_permissions(company_member)

    # Create job via service
    job_service = JobService(db)

    try:
        job = job_service.create_job(
            company_id=company_member.company_id, job_data=job_data
        )
        return JobResponse.model_validate(job)

    except Exception as e:
        # Check if it's a subscription limit error
        if "subscription limit" in str(e).lower() or "maximum" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=str(e)
            )
        # Other errors
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "",
    response_model=JobListResponse,
    summary="List all jobs for your company",
    description="Get a paginated list of all jobs posted by your company with optional filtering.",
)
def list_jobs(
    status_filter: Optional[str] = Query(
        None, alias="status", description="Filter by status: active, closed"
    ),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all jobs for your company with pagination and filtering.

    **Permissions**: All company members can view jobs

    **Query Parameters**:
    - status: Filter by job status (active, closed)
    - page: Page number (default: 1)
    - limit: Items per page (default: 10, max: 100)
    """
    # Get company member (all roles can view jobs)
    company_member = get_user_company_member(current_user, db)

    # List jobs via service
    job_service = JobService(db)
    jobs, total = job_service.list_jobs(
        company_id=company_member.company_id,
        status=status_filter,
        page=page,
        limit=limit,
    )

    total_pages = math.ceil(total / limit) if total > 0 else 0

    return JobListResponse(
        jobs=[JobResponse.model_validate(job) for job in jobs],
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
    )


@router.get(
    "/{job_id}",
    response_model=JobResponse,
    summary="Get a specific job",
    description="Retrieve detailed information about a specific job posting.",
)
def get_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a specific job.

    **Permissions**: All company members can view jobs
    """
    # Get company member
    company_member = get_user_company_member(current_user, db)

    # Get job via service
    job_service = JobService(db)
    job = job_service.get_job(job_id=job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
        )

    # Verify job belongs to user's company
    if job.company_id != company_member.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this job",
        )

    return JobResponse.model_validate(job)


@router.put(
    "/{job_id}",
    response_model=JobResponse,
    summary="Update a job posting",
    description="Update an existing job posting. Requires hiring_manager, admin, or owner role.",
)
def update_job(
    job_id: UUID,
    job_data: JobUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update an existing job posting.

    **Permissions**: owner, admin, hiring_manager

    All fields are optional - only provided fields will be updated.
    """
    # Get company member and check permissions
    company_member = get_user_company_member(current_user, db)
    check_job_management_permissions(company_member)

    # Get job and verify ownership
    job_service = JobService(db)
    job = job_service.get_job(job_id=job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
        )

    if job.company_id != company_member.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this job",
        )

    # Update job
    try:
        updated_job = job_service.update_job(job_id=job_id, job_data=job_data)
        return JobResponse.model_validate(updated_job)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch(
    "/{job_id}/status",
    response_model=JobResponse,
    summary="Update job status",
    description="Change the status of a job (active, paused, closed). Requires hiring_manager, admin, or owner role.",
)
def update_job_status(
    job_id: UUID,
    status_data: JobStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update job status.

    **Permissions**: owner, admin, hiring_manager

    **Status Options**:
    - active: Job is live and accepting applications
    - paused: Job is temporarily paused (still counts toward subscription limit)
    - closed: Job is closed and no longer accepting applications (frees subscription slot)
    """
    # Get company member and check permissions
    company_member = get_user_company_member(current_user, db)
    check_job_management_permissions(company_member)

    # Get job and verify ownership
    job_service = JobService(db)
    job = job_service.get_job(job_id=job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
        )

    if job.company_id != company_member.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this job",
        )

    # Update status
    try:
        updated_job = job_service.update_job_status(
            job_id=job_id, status=status_data.status
        )
        return JobResponse.model_validate(updated_job)

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete(
    "/{job_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a job posting",
    description="Soft delete a job posting (sets is_active to False). Requires hiring_manager, admin, or owner role.",
)
def delete_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a job posting (soft delete).

    **Permissions**: owner, admin, hiring_manager

    This performs a soft delete by setting is_active to False.
    The job data is preserved but no longer visible in active listings.
    """
    # Get company member and check permissions
    company_member = get_user_company_member(current_user, db)
    check_job_management_permissions(company_member)

    # Get job and verify ownership
    job_service = JobService(db)
    job = job_service.get_job(job_id=job_id)

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
        )

    if job.company_id != company_member.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this job",
        )

    # Delete job
    try:
        job_service.delete_job(job_id=job_id)
        return None  # 204 No Content

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/check/can-post",
    summary="Check if company can post more jobs",
    description="Check if your company has available job slots based on subscription plan.",
)
def check_can_post_job(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Check if company can post more jobs based on subscription limits.

    Returns:
        {
            "can_post": true/false,
            "message": "You can post 5 more jobs"
        }
    """
    # Get company member
    company_member = get_user_company_member(current_user, db)

    # Check via service
    job_service = JobService(db)
    can_post, message = job_service.check_can_post_job(
        company_id=company_member.company_id
    )

    return {"can_post": can_post, "message": message}
