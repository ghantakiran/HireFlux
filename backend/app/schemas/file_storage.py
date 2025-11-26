"""
File Storage Schemas - Issue #53
Pydantic schemas for file upload/download API requests and responses
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any
from datetime import datetime
from uuid import UUID

from app.db.models.file_storage import FileType, FileStatus, StorageClass


class FileUploadRequest(BaseModel):
    """Request schema for initiating file upload"""
    file_name: str = Field(..., min_length=1, max_length=255, description="Original filename")
    file_type: FileType = Field(..., description="Type of file being uploaded")
    mime_type: str = Field(..., description="MIME type of the file")
    file_size: int = Field(..., gt=0, description="File size in bytes")

    # Optional linking fields
    application_id: Optional[UUID] = Field(None, description="Link to application")
    resume_id: Optional[UUID] = Field(None, description="Link to resume")
    cover_letter_id: Optional[UUID] = Field(None, description="Link to cover letter")

    @validator('file_name')
    def validate_filename(cls, v):
        """Validate filename doesn't contain path traversal"""
        if '..' in v or '/' in v or '\\' in v:
            raise ValueError('Filename contains invalid characters')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "file_name": "john_doe_resume.pdf",
                "file_type": "resume",
                "mime_type": "application/pdf",
                "file_size": 512000,
                "resume_id": "123e4567-e89b-12d3-a456-426614174000"
            }
        }


class FileUploadResponse(BaseModel):
    """Response schema for file upload initiation"""
    file_id: str = Field(..., description="Unique file identifier")
    upload_url: str = Field(..., description="Pre-signed URL for upload")
    upload_fields: Dict[str, str] = Field(..., description="Fields to include in upload request")
    s3_key: str = Field(..., description="S3 object key")
    expiration: datetime = Field(..., description="URL expiration time")

    class Config:
        json_schema_extra = {
            "example": {
                "file_id": "123e4567-e89b-12d3-a456-426614174000",
                "upload_url": "https://s3.amazonaws.com/hireflux-documents",
                "upload_fields": {
                    "key": "resumes/user123/resume.pdf",
                    "policy": "base64-encoded-policy"
                },
                "s3_key": "resumes/user123/resume.pdf",
                "expiration": "2025-11-26T12:00:00Z"
            }
        }


class FileUploadCompleteRequest(BaseModel):
    """Request schema for marking upload as complete"""
    file_id: UUID = Field(..., description="File ID from upload initiation")

    class Config:
        json_schema_extra = {
            "example": {
                "file_id": "123e4567-e89b-12d3-a456-426614174000"
            }
        }


class FileDownloadResponse(BaseModel):
    """Response schema for file download"""
    url: str = Field(..., description="Pre-signed download URL")
    expiration: datetime = Field(..., description="URL expiration time")
    file_name: str = Field(..., description="Original filename")
    file_size: int = Field(..., description="File size in bytes")
    mime_type: str = Field(..., description="MIME type")

    class Config:
        json_schema_extra = {
            "example": {
                "url": "https://s3.amazonaws.com/hireflux-documents/resumes/user123/resume.pdf?signature=...",
                "expiration": "2025-11-26T12:00:00Z",
                "file_name": "john_doe_resume.pdf",
                "file_size": 512000,
                "mime_type": "application/pdf"
            }
        }


class FileMetadataResponse(BaseModel):
    """Response schema for file metadata"""
    id: UUID
    user_id: Optional[UUID]
    company_id: Optional[UUID]
    file_type: str
    file_name: str
    s3_key: str
    file_size: int
    mime_type: str
    version: int
    is_current_version: bool
    status: str
    virus_scan_status: Optional[str]
    encrypted: bool
    created_at: datetime
    upload_completed_at: Optional[datetime]

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "file_type": "resume",
                "file_name": "john_doe_resume.pdf",
                "s3_key": "resumes/user123/resume.pdf",
                "file_size": 512000,
                "mime_type": "application/pdf",
                "version": 1,
                "is_current_version": True,
                "status": "available",
                "virus_scan_status": "clean",
                "encrypted": True,
                "created_at": "2025-11-26T10:00:00Z",
                "upload_completed_at": "2025-11-26T10:01:00Z"
            }
        }


class FileListResponse(BaseModel):
    """Response schema for listing files"""
    files: list[FileMetadataResponse]
    total: int
    page: int
    page_size: int

    class Config:
        json_schema_extra = {
            "example": {
                "files": [],
                "total": 10,
                "page": 1,
                "page_size": 20
            }
        }


class VirusScanResultRequest(BaseModel):
    """Request schema for updating virus scan result (webhook from scanner)"""
    file_id: UUID
    scan_status: str = Field(..., description="Scan result: clean, infected, error")
    scan_details: Optional[Dict[str, Any]] = Field(None, description="Additional scan details")

    @validator('scan_status')
    def validate_scan_status(cls, v):
        """Validate scan status value"""
        if v not in ['clean', 'infected', 'error', 'pending']:
            raise ValueError('Invalid scan status')
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "file_id": "123e4567-e89b-12d3-a456-426614174000",
                "scan_status": "clean",
                "scan_details": {
                    "scanner": "ClamAV",
                    "version": "0.103.0",
                    "signatures": "26000"
                }
            }
        }


class FileDeleteRequest(BaseModel):
    """Request schema for file deletion"""
    file_id: UUID
    hard_delete: bool = Field(False, description="If true, permanently delete from S3")

    class Config:
        json_schema_extra = {
            "example": {
                "file_id": "123e4567-e89b-12d3-a456-426614174000",
                "hard_delete": False
            }
        }


class FileAccessLogResponse(BaseModel):
    """Response schema for file access log"""
    id: UUID
    file_id: UUID
    user_id: Optional[UUID]
    operation: str
    status: str
    timestamp: datetime
    ip_address: Optional[str]
    error_message: Optional[str]

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174002",
                "file_id": "123e4567-e89b-12d3-a456-426614174000",
                "user_id": "123e4567-e89b-12d3-a456-426614174001",
                "operation": "download",
                "status": "success",
                "timestamp": "2025-11-26T11:00:00Z",
                "ip_address": "192.168.1.1"
            }
        }


# Error response schemas
class FileErrorResponse(BaseModel):
    """Error response schema"""
    error: str
    details: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "error": "File too large",
                "details": "Maximum file size is 10MB"
            }
        }
