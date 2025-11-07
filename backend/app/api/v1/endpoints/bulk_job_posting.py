"""REST API endpoints for bulk job posting (Sprint 11-12)"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
import csv
import io
from datetime import datetime

from app.api.dependencies import get_db, get_current_user
from app.db.models.user import User
from app.services.bulk_job_upload_service import BulkJobUploadService
from app.schemas.bulk_job_posting import (
    BulkUploadCreate,
    BulkUploadResponse,
    BulkUploadDetail,
    BulkUploadListResponse,
    BulkUploadFilter,
    CSVJobRow,
    BulkUploadStatusEnum,
    DistributionChannelEnum,
)

router = APIRouter(prefix="/bulk-job-posting", tags=["Bulk Job Posting"])


@router.post(
    "/upload", response_model=BulkUploadResponse, status_code=status.HTTP_201_CREATED
)
async def create_bulk_upload(
    file: UploadFile = File(...),
    channels: Optional[str] = None,  # Comma-separated channel names
    scheduled_at: Optional[datetime] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Upload CSV file with multiple job postings.

    **Requirements:**
    - User must be an employer (have company_id)
    - CSV must have headers: title, department, location, location_type, employment_type,
      experience_level, salary_min, salary_max, description, requirements
    - Maximum 500 jobs per upload

    **Returns:**
    - Upload session with validation results
    - List of validation errors if any
    - List of detected duplicates if any
    """
    # Verify user is an employer
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can upload jobs",
        )

    # Parse distribution channels
    distribution_channels = []
    if channels:
        channel_names = [c.strip().upper() for c in channels.split(",")]
        for channel_name in channel_names:
            try:
                distribution_channels.append(DistributionChannelEnum[channel_name])
            except KeyError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid channel: {channel_name}. Valid channels: LINKEDIN, INDEED, GLASSDOOR, INTERNAL",
                )
    else:
        distribution_channels = [DistributionChannelEnum.INTERNAL]

    # Read and parse CSV
    try:
        contents = await file.read()
        csv_text = contents.decode("utf-8")
        csv_reader = csv.DictReader(io.StringIO(csv_text))

        jobs_data = []
        for row in csv_reader:
            # Parse CSV row into CSVJobRow
            job = CSVJobRow(
                title=row.get("title", ""),
                department=row.get("department"),
                location=row.get("location"),
                location_type=row.get("location_type"),
                employment_type=row.get("employment_type"),
                experience_level=row.get("experience_level"),
                salary_min=int(row["salary_min"]) if row.get("salary_min") else None,
                salary_max=int(row["salary_max"]) if row.get("salary_max") else None,
                description=row.get("description"),
                requirements=row.get("requirements"),
            )
            jobs_data.append(job)

        if len(jobs_data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="CSV file is empty or has no valid data rows",
            )

    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file encoding. Please upload UTF-8 encoded CSV",
        )
    except KeyError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing required CSV column: {str(e)}",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid data format: {str(e)}",
        )

    # Create upload request
    upload_request = BulkUploadCreate(
        filename=file.filename or "upload.csv",
        jobs_data=jobs_data,
        distribution_channels=distribution_channels,
        scheduled_publish_at=scheduled_at,
    )

    # Create upload session
    service = BulkJobUploadService(db)
    try:
        upload = await service.create_upload_session(
            company_id=str(current_user.company_id),
            user_id=str(current_user.id),
            upload_request=upload_request,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return BulkUploadResponse.model_validate(upload)


@router.get("/uploads", response_model=BulkUploadListResponse)
async def list_uploads(
    page: int = 1,
    limit: int = 20,
    status: Optional[BulkUploadStatusEnum] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all bulk upload sessions for the current company.

    **Query Parameters:**
    - page: Page number (default: 1)
    - limit: Items per page (default: 20, max: 100)
    - status: Filter by upload status

    **Returns:**
    - Paginated list of upload sessions
    """
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can view uploads",
        )

    if limit > 100:
        limit = 100

    service = BulkJobUploadService(db)
    uploads = await service.list_uploads_by_company(
        company_id=str(current_user.company_id),
        page=page,
        limit=limit,
        status=status,
    )

    # Convert to response models
    upload_responses = [BulkUploadResponse.model_validate(u) for u in uploads]

    return BulkUploadListResponse(
        uploads=upload_responses,
        total=len(upload_responses),  # TODO: Add count query
        page=page,
        limit=limit,
    )


@router.get("/uploads/{upload_id}", response_model=BulkUploadDetail)
async def get_upload_detail(
    upload_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed information about a specific upload session.

    **Returns:**
    - Upload session with raw and enriched job data
    - Validation errors
    - Duplicate detection results
    """
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can view uploads",
        )

    service = BulkJobUploadService(db)
    upload = await service.get_upload_by_id(upload_id, str(current_user.company_id))

    if not upload:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Upload not found"
        )

    return BulkUploadDetail.model_validate(upload)


@router.patch("/uploads/{upload_id}/status")
async def update_upload_status(
    upload_id: str,
    new_status: BulkUploadStatusEnum,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update the status of an upload session.

    **Note:** This is typically used by background workers.
    Employers should use the cancel endpoint instead.
    """
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can update uploads",
        )

    service = BulkJobUploadService(db)
    try:
        await service.update_upload_status(
            upload_id, str(current_user.company_id), new_status
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    return {"message": "Status updated successfully"}


@router.post("/uploads/{upload_id}/cancel")
async def cancel_upload(
    upload_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cancel an in-progress upload session.

    **Note:** Cannot cancel completed or failed uploads.
    """
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can cancel uploads",
        )

    service = BulkJobUploadService(db)
    try:
        await service.cancel_upload(upload_id, str(current_user.company_id))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    return {"message": "Upload cancelled successfully"}


@router.delete("/uploads/{upload_id}")
async def delete_upload(
    upload_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete an upload session and all associated data.

    **Warning:** This action cannot be undone.
    """
    if not current_user.company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can delete uploads",
        )

    service = BulkJobUploadService(db)
    try:
        await service.delete_upload(upload_id, str(current_user.company_id))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

    return {"message": "Upload deleted successfully"}


@router.get("/template")
async def download_csv_template():
    """
    Download a CSV template for bulk job uploads.

    **Returns:**
    - CSV file with sample data and headers
    """
    # Create sample CSV
    csv_content = """title,department,location,location_type,employment_type,experience_level,salary_min,salary_max,description,requirements
Senior Software Engineer,Engineering,San Francisco CA,hybrid,full-time,senior,150000,200000,"Build scalable distributed systems","5+ years Python, AWS, Docker"
Product Manager,Product,Remote,remote,full-time,mid,120000,160000,"Define product roadmap and strategy","3+ years PM experience, B2B SaaS"
Data Scientist,Data,New York NY,onsite,full-time,mid,130000,170000,"Build ML models for recommendations","Python, TensorFlow, SQL"
"""

    return {
        "filename": "job_upload_template.csv",
        "content": csv_content,
        "mime_type": "text/csv",
    }
