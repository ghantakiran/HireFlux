"""
File Storage API Endpoints - Issue #53
Handles file upload, download, and management operations with AWS S3

Features:
- Pre-signed URL generation for secure uploads/downloads
- File validation (type, size, path traversal)
- Virus scanning integration
- Access control enforcement
- Audit logging
- File versioning support
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.db.session import get_db
from app.services.s3_service import S3Service, FileUploadConfig
from app.api.dependencies import get_current_user
from app.db.models.user import User
from app.db.models.file_storage import FileMetadata, FileType, FileStatus
from app.schemas.file_storage import (
    FileUploadRequest,
    FileUploadResponse,
    FileUploadCompleteRequest,
    FileDownloadResponse,
    FileMetadataResponse,
    FileListResponse,
    VirusScanResultRequest,
    FileDeleteRequest,
    FileErrorResponse,
)
from app.core.exceptions import ServiceError, NotFoundError
from app.core.logging import logger


router = APIRouter(prefix="/files", tags=["File Storage"])


# ============================================================================
# FILE UPLOAD ENDPOINTS
# ============================================================================

@router.post(
    "/upload/initiate",
    response_model=FileUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Initiate file upload",
    description="""
    Generate pre-signed URL for direct browser-to-S3 upload.

    **Supported file types:**
    - Resume: PDF/DOCX (max 10MB)
    - Cover Letter: PDF (max 5MB)
    - Company Logo: PNG/JPG (max 2MB)
    - Bulk Upload CSV: CSV (max 50MB)

    **Security:**
    - File type validation
    - Size limit enforcement
    - Path traversal prevention
    - XSS protection in filenames

    **Returns:**
    - Pre-signed upload URL (valid for 1 hour)
    - File ID for tracking
    - S3 key for reference
    """,
)
async def initiate_file_upload(
    request: FileUploadRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Initiate file upload by generating pre-signed URL

    This endpoint:
    1. Validates file type and size
    2. Generates unique S3 key
    3. Creates file metadata record
    4. Returns pre-signed URL for direct upload
    """
    try:
        # Create S3 service
        s3_service = S3Service(db=db)

        # Build file upload config
        config = FileUploadConfig(
            file_name=request.file_name,
            file_type=request.file_type,
            mime_type=request.mime_type,
            file_size=request.file_size,
            user_id=str(current_user.id),
            company_id=str(current_user.company_id) if hasattr(current_user, 'company_id') else None,
            application_id=str(request.application_id) if request.application_id else None,
            resume_id=str(request.resume_id) if request.resume_id else None,
            cover_letter_id=str(request.cover_letter_id) if request.cover_letter_id else None,
        )

        # Initiate upload
        upload_data = s3_service.initiate_upload(config)

        return FileUploadResponse(
            file_id=upload_data["file_id"],
            upload_url=upload_data["upload_url"],
            upload_fields=upload_data["upload_fields"],
            s3_key=upload_data["s3_key"],
            expiration=upload_data.get("expiration"),
        )

    except ServiceError as e:
        logger.error(f"File upload initiation failed: {str(e)}")

        # Determine appropriate status code
        if "too large" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        elif "invalid" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        elif "forbidden" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(e)
            )
        elif "unavailable" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Storage service temporarily unavailable. Please try again later."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to initiate file upload"
            )

    except Exception as e:
        logger.error(f"Unexpected error in file upload initiation: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )


@router.post(
    "/upload/complete",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Mark upload as complete",
    description="""
    Notify system that file upload to S3 is complete.

    **Process:**
    1. Updates file status to 'scanning'
    2. Triggers virus scan (async)
    3. File becomes available after scan passes

    **Note:**
    - Call this AFTER successfully uploading to the pre-signed URL
    - Virus scan typically completes within 30 seconds
    - Check file status via GET /files/{file_id}
    """,
)
async def complete_file_upload(
    request: FileUploadCompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark file upload as complete and trigger virus scan
    """
    try:
        # Create S3 service
        s3_service = S3Service(db=db)

        # Mark upload complete (triggers virus scan)
        s3_service.mark_upload_complete(request.file_id)

        return {
            "message": "Upload marked as complete. Virus scan initiated.",
            "file_id": str(request.file_id),
            "status": "scanning"
        }

    except ServiceError as e:
        logger.error(f"Failed to mark upload complete: {str(e)}")

        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )

    except Exception as e:
        logger.error(f"Unexpected error marking upload complete: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to process upload completion"
        )


# ============================================================================
# FILE DOWNLOAD ENDPOINTS
# ============================================================================

@router.get(
    "/{file_id}/download",
    response_model=FileDownloadResponse,
    status_code=status.HTTP_200_OK,
    summary="Get download URL",
    description="""
    Generate pre-signed download URL for file.

    **Access Control:**
    - Users can download their own files
    - Employers can download applicant files (with application link)
    - URLs expire after 1 hour

    **Security:**
    - Strict access control enforcement
    - All downloads are audit logged
    - Quarantined files cannot be downloaded
    """,
)
async def get_file_download_url(
    file_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate pre-signed download URL for file
    """
    try:
        # Create S3 service
        s3_service = S3Service(db=db)

        # Generate download URL (includes access control check)
        download_data = s3_service.generate_download_url(
            file_id=file_id,
            user_id=current_user.id,
        )

        return FileDownloadResponse(
            url=download_data["url"],
            expiration=download_data["expiration"],
            file_name=download_data["file_name"],
            file_size=download_data["file_size"],
            mime_type=download_data["mime_type"],
        )

    except ServiceError as e:
        logger.error(f"Failed to generate download URL: {str(e)}")

        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        elif "forbidden" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this file"
            )
        elif "not available" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to generate download URL"
            )

    except Exception as e:
        logger.error(f"Unexpected error generating download URL: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )


# ============================================================================
# FILE METADATA ENDPOINTS
# ============================================================================

@router.get(
    "/{file_id}",
    response_model=FileMetadataResponse,
    status_code=status.HTTP_200_OK,
    summary="Get file metadata",
    description="Retrieve metadata for a specific file",
)
async def get_file_metadata(
    file_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get file metadata"""
    try:
        file_metadata = db.query(FileMetadata).filter(
            FileMetadata.id == file_id
        ).first()

        if not file_metadata:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )

        # Access control: user owns file or has permission
        if file_metadata.user_id != current_user.id:
            # TODO: Check if user has permission (employer accessing applicant file)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden"
            )

        return file_metadata

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving file metadata: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve file metadata"
        )


@router.get(
    "",
    response_model=FileListResponse,
    status_code=status.HTTP_200_OK,
    summary="List user files",
    description="""
    List all files owned by current user with optional filtering.

    **Filters:**
    - file_type: Filter by file type (resume, cover_letter, etc.)
    - status: Filter by status (available, scanning, etc.)

    **Pagination:**
    - page: Page number (default: 1)
    - page_size: Items per page (default: 20, max: 100)
    """,
)
async def list_user_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    file_type: Optional[str] = Query(None, description="Filter by file type"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
):
    """List files owned by current user"""
    try:
        # Build query
        query = db.query(FileMetadata).filter(
            FileMetadata.user_id == current_user.id
        )

        # Apply filters
        if file_type:
            query = query.filter(FileMetadata.file_type == file_type)

        if status_filter:
            query = query.filter(FileMetadata.status == status_filter)

        # Get total count
        total = query.count()

        # Apply pagination
        offset = (page - 1) * page_size
        files = query.order_by(
            FileMetadata.created_at.desc()
        ).offset(offset).limit(page_size).all()

        return FileListResponse(
            files=files,
            total=total,
            page=page,
            page_size=page_size,
        )

    except Exception as e:
        logger.error(f"Error listing files: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve file list"
        )


# ============================================================================
# FILE DELETION ENDPOINTS
# ============================================================================

@router.delete(
    "/{file_id}",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Delete file",
    description="""
    Delete file (soft delete by default, hard delete with parameter).

    **Soft Delete (default):**
    - File marked as deleted in database
    - File remains in S3 (for recovery)
    - Access denied to deleted files

    **Hard Delete (hard_delete=true):**
    - File permanently deleted from S3
    - Cannot be recovered
    - Use for GDPR compliance
    """,
)
async def delete_file(
    file_id: uuid.UUID,
    hard_delete: bool = Query(False, description="Permanently delete from S3"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete file (soft or hard delete)"""
    try:
        # Create S3 service
        s3_service = S3Service(db=db)

        # Delete file (includes access control check)
        s3_service.delete_file(
            file_id=file_id,
            user_id=current_user.id,
            hard_delete=hard_delete,
        )

        return {
            "message": "File deleted successfully",
            "file_id": str(file_id),
            "hard_delete": hard_delete,
        }

    except ServiceError as e:
        logger.error(f"File deletion failed: {str(e)}")

        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        elif "forbidden" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this file"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete file"
            )

    except Exception as e:
        logger.error(f"Unexpected error deleting file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred"
        )


# ============================================================================
# VIRUS SCAN WEBHOOK ENDPOINT
# ============================================================================

@router.patch(
    "/{file_id}/scan-result",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Update virus scan result (webhook)",
    description="""
    Webhook endpoint for virus scanner to report results.

    **Authentication:** Requires API key
    **Called by:** ClamAV / VirusTotal service

    **Scan Statuses:**
    - clean: File safe, mark as available
    - infected: File quarantined, access denied
    - error: Scan failed, file unavailable
    - pending: Scan in progress
    """,
)
async def update_virus_scan_result(
    file_id: uuid.UUID,
    request: VirusScanResultRequest,
    db: Session = Depends(get_db),
    # TODO: Add API key authentication
    # api_key: str = Depends(verify_api_key),
):
    """
    Update virus scan result (webhook from scanner service)

    Note: This endpoint should be protected with API key authentication
    """
    try:
        # Create S3 service
        s3_service = S3Service(db=db)

        # Update scan result
        s3_service.update_scan_result(
            file_id=file_id,
            scan_status=request.scan_status,
        )

        logger.info(
            f"Virus scan updated for file {file_id}: {request.scan_status}",
            extra={"file_id": str(file_id), "scan_status": request.scan_status}
        )

        return {
            "message": "Scan result updated successfully",
            "file_id": str(file_id),
            "scan_status": request.scan_status,
        }

    except ServiceError as e:
        logger.error(f"Failed to update scan result: {str(e)}")

        if "not found" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="File not found"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=str(e)
            )

    except Exception as e:
        logger.error(f"Unexpected error updating scan result: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update scan result"
        )


# Endpoint summary:
# - POST /upload/initiate - Generate pre-signed upload URL
# - POST /upload/complete - Mark upload complete, trigger scan
# - GET /{file_id}/download - Generate pre-signed download URL
# - GET /{file_id} - Get file metadata
# - GET / - List user files with pagination/filters
# - DELETE /{file_id} - Delete file (soft/hard)
# - PATCH /{file_id}/scan-result - Update virus scan result (webhook)
#
# Security features:
# - Authentication required (except webhook)
# - Access control enforcement
# - File validation (type, size, path traversal)
# - Audit logging
# - XSS prevention in filenames
