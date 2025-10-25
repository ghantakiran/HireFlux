"""Resume management endpoints"""
from fastapi import APIRouter, Depends, UploadFile, File, status, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.db.session import get_db
from app.services.resume_service import ResumeService
from app.api.dependencies import get_current_user
from app.db.models.user import User
from app.schemas.resume import (
    ResumeUploadResponse,
    ResumeDetail,
    ResumeListResponse,
    ResumeMetadata,
    ResumeUpdateRequest,
    ParseStatus,
)
from app.core.exceptions import NotFoundError, ValidationError


router = APIRouter(prefix="/resumes", tags=["Resumes"])


@router.post("/upload", response_model=dict, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a resume file (PDF or DOCX).

    **File Requirements:**
    - Format: PDF or DOCX
    - Max size: 10MB
    - Content: Should contain resume information

    **Process:**
    1. File is validated for size and format
    2. File is stored securely
    3. Resume is parsed to extract information
    4. Structured data is stored in database

    **Returns:**
    - Resume ID
    - Upload status
    - Parse status
    - File metadata
    """
    try:
        resume_service = ResumeService(db)

        # Read file content
        content = await file.read()
        file_size = len(content)

        # Upload and parse
        import io

        file_io = io.BytesIO(content)

        resume = resume_service.upload_resume(
            user_id=current_user.id,
            file=file_io,
            filename=file.filename,
            file_size=file_size,
            mime_type=file.content_type,
        )

        return {
            "success": True,
            "message": "Resume uploaded successfully",
            "data": {
                "id": str(resume.id),
                "user_id": str(resume.user_id),
                "file_name": resume.file_name,
                "file_size": int(resume.file_size),
                "file_type": resume.file_type,
                "parse_status": resume.parse_status,
                "created_at": resume.created_at.isoformat(),
            },
        }
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("", response_model=dict, status_code=status.HTTP_200_OK)
def list_resumes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all resumes for the authenticated user.

    **Returns:**
    - List of resume metadata (excludes detailed parsed data)
    - Total count
    - Default resume ID if set

    **Sorted by:** Most recent first
    """
    resume_service = ResumeService(db)
    resumes = resume_service.list_resumes(current_user.id)

    # Find default resume
    default_resume_id = None
    for resume in resumes:
        if resume.is_default:
            default_resume_id = str(resume.id)
            break

    # Convert to response format
    resume_list = [
        {
            "id": str(resume.id),
            "user_id": str(resume.user_id),
            "file_name": resume.file_name,
            "file_size": int(resume.file_size),
            "file_type": resume.file_type,
            "parse_status": resume.parse_status,
            "is_default": resume.is_default,
            "created_at": resume.created_at.isoformat(),
            "parsed_at": resume.parsed_at.isoformat() if resume.parsed_at else None,
        }
        for resume in resumes
    ]

    return {
        "success": True,
        "data": {
            "resumes": resume_list,
            "total": len(resume_list),
            "default_resume_id": default_resume_id,
        },
    }


@router.get("/{resume_id}", response_model=dict, status_code=status.HTTP_200_OK)
def get_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get detailed resume information including parsed data.

    **Parameters:**
    - resume_id: UUID of the resume

    **Returns:**
    - Complete resume details
    - Parsed contact information
    - Work experience
    - Education
    - Skills
    - Certifications

    **Authorization:** User can only access their own resumes
    """
    try:
        resume_service = ResumeService(db)
        resume = resume_service.get_resume(uuid.UUID(resume_id), current_user.id)

        return {
            "success": True,
            "data": {
                "id": str(resume.id),
                "user_id": str(resume.user_id),
                "file_name": resume.file_name,
                "file_size": int(resume.file_size),
                "file_type": resume.file_type,
                "original_file_url": resume.original_file_url,
                "parse_status": resume.parse_status,
                "is_default": resume.is_default,
                "parsed_data": resume.parsed_data or {},
                "parse_error": resume.parse_error,
                "created_at": resume.created_at.isoformat(),
                "parsed_at": resume.parsed_at.isoformat() if resume.parsed_at else None,
            },
        }
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid resume ID format")


@router.delete("/{resume_id}", response_model=dict, status_code=status.HTTP_200_OK)
def delete_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a resume (soft delete).

    **Parameters:**
    - resume_id: UUID of the resume

    **Note:**
    - This is a soft delete; the file is retained but marked as deleted
    - Resume will not appear in listings
    - Cannot be recovered once deleted

    **Authorization:** User can only delete their own resumes
    """
    try:
        resume_service = ResumeService(db)
        resume_service.delete_resume(uuid.UUID(resume_id), current_user.id)

        return {
            "success": True,
            "message": "Resume deleted successfully",
        }
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid resume ID format")


@router.post(
    "/{resume_id}/set-default", response_model=dict, status_code=status.HTTP_200_OK
)
def set_default_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Set a resume as the default for job applications.

    **Parameters:**
    - resume_id: UUID of the resume

    **Behavior:**
    - Previous default resume is automatically unmarked
    - Default resume is used for quick-apply features
    - Only one resume can be default at a time

    **Authorization:** User can only modify their own resumes
    """
    try:
        resume_service = ResumeService(db)
        resume = resume_service.set_default_resume(
            uuid.UUID(resume_id), current_user.id
        )

        return {
            "success": True,
            "message": "Default resume set successfully",
            "data": {
                "id": str(resume.id),
                "is_default": resume.is_default,
            },
        }
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid resume ID format")


@router.put(
    "/{resume_id}/parsed-data", response_model=dict, status_code=status.HTTP_200_OK
)
def update_parsed_data(
    resume_id: str,
    update_data: ResumeUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Manually update parsed resume data.

    **Use Case:**
    - Correct parsing errors
    - Add missing information
    - Update outdated information

    **Parameters:**
    - resume_id: UUID of the resume
    - parsed_data: Complete parsed data structure

    **Note:**
    - Original file remains unchanged
    - Manual edits override parsed data
    - All fields must be provided (full replacement)

    **Authorization:** User can only modify their own resumes
    """
    try:
        resume_service = ResumeService(db)
        resume = resume_service.update_parsed_data(
            uuid.UUID(resume_id), current_user.id, update_data.parsed_data
        )

        return {
            "success": True,
            "message": "Parsed data updated successfully",
            "data": {
                "id": str(resume.id),
                "parsed_data": resume.parsed_data,
            },
        }
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{resume_id}/download", status_code=status.HTTP_200_OK)
def download_resume(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Download the original resume file.

    **Parameters:**
    - resume_id: UUID of the resume

    **Returns:**
    - Original file content
    - Appropriate content-type header
    - Content-disposition header for download

    **Authorization:** User can only download their own resumes

    **Note:** File serving implementation pending
    """
    try:
        resume_service = ResumeService(db)
        resume = resume_service.get_resume(uuid.UUID(resume_id), current_user.id)

        # TODO: Implement actual file serving from storage
        # For now, return file metadata
        return {
            "success": True,
            "message": "File download not yet implemented",
            "data": {
                "file_url": resume.original_file_url,
                "file_name": resume.file_name,
            },
        }
    except NotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/default/current", response_model=dict, status_code=status.HTTP_200_OK)
def get_default_resume(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the user's current default resume.

    **Returns:**
    - Default resume details if set
    - Null if no default resume

    **Use Case:**
    - Quick-apply features
    - Resume previews
    - Default selections
    """
    resume_service = ResumeService(db)
    default_resume = resume_service.get_default_resume(current_user.id)

    if not default_resume:
        return {
            "success": True,
            "data": None,
            "message": "No default resume set",
        }

    return {
        "success": True,
        "data": {
            "id": str(default_resume.id),
            "file_name": default_resume.file_name,
            "parse_status": default_resume.parse_status,
            "created_at": default_resume.created_at.isoformat(),
        },
    }
