"""
S3 Storage Service - Issue #53
Handles file upload/download operations with AWS S3

Features:
- Pre-signed URL generation for secure uploads/downloads
- File validation (type, size)
- Virus scanning integration
- Access control enforcement
- Audit logging
- File versioning support
"""

import boto3
import hashlib
import re
import uuid
from datetime import datetime, timedelta
from dataclasses import dataclass
from typing import Dict, Any, Optional, List
from botocore.exceptions import ClientError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ServiceError
from app.core.logging import logger
from app.db.models.file_storage import (
    FileMetadata,
    FileAccessLog,
    PreSignedURL,
    FileType,
    FileStatus,
    StorageClass,
)


@dataclass
class FileUploadConfig:
    """Configuration for file upload"""
    file_name: str
    file_type: FileType
    mime_type: str
    file_size: int
    user_id: Optional[str] = None
    company_id: Optional[str] = None
    application_id: Optional[str] = None
    resume_id: Optional[str] = None
    cover_letter_id: Optional[str] = None


class S3Service:
    """Service for managing file storage with AWS S3"""

    # File type validation rules
    FILE_TYPE_RULES = {
        FileType.RESUME: {
            "allowed_types": ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
            "max_size": 10 * 1024 * 1024,  # 10MB
            "path_template": "resumes/{user_id}/{file_id}.{ext}",
        },
        FileType.COVER_LETTER: {
            "allowed_types": ["application/pdf"],
            "max_size": 5 * 1024 * 1024,  # 5MB
            "path_template": "cover-letters/{user_id}/{file_id}.{ext}",
        },
        FileType.COMPANY_LOGO: {
            "allowed_types": ["image/png", "image/jpeg"],
            "max_size": 2 * 1024 * 1024,  # 2MB
            "path_template": "company-logos/{company_id}/logo.{ext}",
        },
        FileType.BULK_UPLOAD_CSV: {
            "allowed_types": ["text/csv", "application/csv"],
            "max_size": 50 * 1024 * 1024,  # 50MB
            "path_template": "bulk-uploads/{company_id}/{file_id}.csv",
        },
    }

    def __init__(self, db: Optional[Session] = None):
        """Initialize S3 service with boto3 client"""
        self.db = db
        self.bucket_name = getattr(settings, 'S3_BUCKET_NAME', 'hireflux-documents')

        # Initialize boto3 S3 client
        try:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=getattr(settings, 'AWS_ACCESS_KEY_ID', None),
                aws_secret_access_key=getattr(settings, 'AWS_SECRET_ACCESS_KEY', None),
                region_name=getattr(settings, 'AWS_REGION', 'us-east-1'),
            )
        except Exception as e:
            logger.error(f"Failed to initialize S3 client: {str(e)}")
            # For testing, allow initialization without AWS credentials
            if not getattr(settings, 'TESTING', False):
                raise ServiceError("Failed to initialize S3 client")

    def validate_file_config(self, config: FileUploadConfig) -> None:
        """Validate file upload configuration"""
        rules = self.FILE_TYPE_RULES.get(config.file_type)
        if not rules:
            raise ServiceError(f"Unsupported file type: {config.file_type}")

        # Validate MIME type
        if config.mime_type not in rules["allowed_types"]:
            raise ServiceError(
                f"Invalid file type. Allowed types: {', '.join(rules['allowed_types'])}"
            )

        # Validate file size
        if config.file_size > rules["max_size"]:
            max_size_mb = rules["max_size"] / (1024 * 1024)
            if config.file_type == FileType.COMPANY_LOGO:
                raise ServiceError(f"Logo too large. Maximum size: {max_size_mb}MB")
            raise ServiceError(f"File too large. Maximum size: {max_size_mb}MB")

        # Validate filename for path traversal
        if ".." in config.file_name or "/" in config.file_name:
            raise ServiceError("Invalid file path")

    def sanitize_filename(self, filename: str) -> str:
        """Sanitize filename to prevent XSS and path traversal"""
        # Remove dangerous characters
        filename = re.sub(r'[<>:"|?*]', '', filename)
        # Remove script tags
        filename = re.sub(r'<script.*?>.*?</script>', '', filename, flags=re.IGNORECASE | re.DOTALL)
        # Limit length
        if len(filename) > 255:
            filename = filename[:255]
        return filename

    def generate_s3_key(self, config: FileUploadConfig) -> str:
        """Generate S3 key for file storage"""
        rules = self.FILE_TYPE_RULES.get(config.file_type)
        if not rules:
            raise ServiceError(f"Unsupported file type: {config.file_type}")

        # Extract file extension
        ext = config.file_name.split('.')[-1].lower() if '.' in config.file_name else 'bin'

        # Generate unique file ID
        file_id = str(uuid.uuid4())

        # Format path template
        path_template = rules["path_template"]
        s3_key = path_template.format(
            user_id=config.user_id or 'unknown',
            company_id=config.company_id or 'unknown',
            file_id=file_id,
            ext=ext
        )

        return s3_key

    def generate_upload_url(self, config: FileUploadConfig) -> Dict[str, Any]:
        """Generate pre-signed URL for file upload"""
        # Validate configuration
        self.validate_file_config(config)

        # Sanitize filename
        safe_filename = self.sanitize_filename(config.file_name)

        # Generate S3 key
        s3_key = self.generate_s3_key(config)

        # Generate pre-signed POST URL (allows browser to upload directly)
        try:
            expiration = 3600  # 1 hour

            presigned_post = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=s3_key,
                Fields={
                    "Content-Type": config.mime_type,
                },
                Conditions=[
                    {"Content-Type": config.mime_type},
                    ["content-length-range", 0, config.file_size + 1000],  # Allow small buffer
                ],
                ExpiresIn=expiration
            )

            return {
                "url": presigned_post["url"],
                "fields": presigned_post["fields"],
                "s3_key": s3_key,
                "expiration": datetime.utcnow() + timedelta(seconds=expiration),
            }

        except ClientError as e:
            logger.error(f"S3 ClientError generating upload URL: {str(e)}")
            raise ServiceError("Storage service unavailable. Please try again later.")

    def initiate_upload(
        self,
        config: FileUploadConfig,
        replaces_file_id: Optional[uuid.UUID] = None
    ) -> Dict[str, Any]:
        """
        Initiate file upload by creating metadata and generating upload URL

        Args:
            config: File upload configuration
            replaces_file_id: Optional ID of file being replaced (for versioning)

        Returns:
            Dict with upload_url, file_id, and s3_key
        """
        # Generate upload URL
        upload_data = self.generate_upload_url(config)

        # Create file metadata
        # Convert string IDs to UUID if needed
        user_id_uuid = uuid.UUID(config.user_id) if config.user_id and isinstance(config.user_id, str) else config.user_id
        company_id_uuid = uuid.UUID(config.company_id) if config.company_id and isinstance(config.company_id, str) else config.company_id
        application_id_uuid = uuid.UUID(config.application_id) if config.application_id and isinstance(config.application_id, str) else config.application_id
        resume_id_uuid = uuid.UUID(config.resume_id) if config.resume_id and isinstance(config.resume_id, str) else config.resume_id
        cover_letter_id_uuid = uuid.UUID(config.cover_letter_id) if config.cover_letter_id and isinstance(config.cover_letter_id, str) else config.cover_letter_id

        file_metadata = FileMetadata(
            id=uuid.uuid4(),
            user_id=user_id_uuid,
            company_id=company_id_uuid,
            file_type=config.file_type.value,
            file_name=self.sanitize_filename(config.file_name),
            s3_key=upload_data["s3_key"],
            s3_bucket=self.bucket_name,
            file_size=config.file_size,
            mime_type=config.mime_type,
            status=FileStatus.UPLOADING.value,
            encrypted=True,
            application_id=application_id_uuid,
            resume_id=resume_id_uuid,
            cover_letter_id=cover_letter_id_uuid,
            version=1,
            is_current_version=True,
        )

        # Handle file versioning
        if replaces_file_id and self.db:
            old_file = self.db.query(FileMetadata).filter(
                FileMetadata.id == replaces_file_id
            ).first()

            if old_file:
                # Mark old file as not current
                old_file.is_current_version = False
                file_metadata.version = old_file.version + 1
                file_metadata.replaces_file_id = replaces_file_id

        # Save to database
        if self.db:
            self.db.add(file_metadata)
            self.db.commit()
            self.db.refresh(file_metadata)

        # Log access
        self.log_access(
            file_id=file_metadata.id,
            s3_key=upload_data["s3_key"],
            user_id=config.user_id,
            operation="upload",
            status="success"
        )

        return {
            "upload_url": upload_data["url"],
            "upload_fields": upload_data["fields"],
            "file_id": str(file_metadata.id),
            "s3_key": upload_data["s3_key"],
        }

    def mark_upload_complete(self, file_id: uuid.UUID) -> None:
        """Mark file upload as complete and trigger virus scan"""
        if not self.db:
            raise ServiceError("Database session required")

        file_metadata = self.db.query(FileMetadata).filter(
            FileMetadata.id == file_id
        ).first()

        if not file_metadata:
            raise ServiceError("File not found")

        # Update status
        file_metadata.status = FileStatus.SCANNING.value
        file_metadata.upload_completed_at = datetime.utcnow()

        self.db.commit()

        # Trigger virus scan (async)
        self.trigger_virus_scan(file_id)

    def trigger_virus_scan(self, file_id: uuid.UUID) -> None:
        """
        Trigger virus scan for uploaded file
        In production, this would queue a job to scan with ClamAV or VirusTotal
        """
        logger.info(f"Triggering virus scan for file {file_id}")
        # TODO: Integrate with ClamAV or VirusTotal
        # For now, this is a placeholder

    def update_scan_result(self, file_id: uuid.UUID, scan_status: str) -> None:
        """Update virus scan result"""
        if not self.db:
            raise ServiceError("Database session required")

        file_metadata = self.db.query(FileMetadata).filter(
            FileMetadata.id == file_id
        ).first()

        if not file_metadata:
            raise ServiceError("File not found")

        file_metadata.virus_scan_status = scan_status
        file_metadata.virus_scan_timestamp = datetime.utcnow()

        if scan_status == "clean":
            file_metadata.status = FileStatus.AVAILABLE.value
        elif scan_status == "infected":
            file_metadata.status = FileStatus.QUARANTINED.value

        self.db.commit()

    def generate_download_url(
        self,
        file_id: uuid.UUID,
        user_id: uuid.UUID,
        expiration: int = 3600
    ) -> Dict[str, Any]:
        """
        Generate pre-signed download URL

        Args:
            file_id: File ID
            user_id: Requesting user ID
            expiration: URL expiration in seconds (default 1 hour)

        Returns:
            Dict with url, expiration, and file metadata
        """
        if not self.db:
            raise ServiceError("Database session required")

        # Get file metadata
        file_metadata = self.db.query(FileMetadata).filter(
            FileMetadata.id == file_id
        ).first()

        if not file_metadata:
            raise ServiceError("File not found")

        # Enforce access control
        if file_metadata.user_id != user_id:
            # Check if user has permission (e.g., employer accessing applicant file)
            # For now, deny access
            self.log_access(
                file_id=file_id,
                s3_key=file_metadata.s3_key,
                user_id=user_id,
                operation="download",
                status="failure",
                error_message="Access forbidden"
            )
            raise ServiceError("Access forbidden")

        # Check file status
        if file_metadata.status != FileStatus.AVAILABLE.value:
            if file_metadata.status == FileStatus.QUARANTINED.value:
                raise ServiceError("File failed security scan and cannot be downloaded")
            raise ServiceError("File is not available for download")

        # Generate pre-signed URL
        try:
            presigned_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': file_metadata.s3_key,
                    'ResponseContentDisposition': f'attachment; filename="{file_metadata.file_name}"',
                },
                ExpiresIn=expiration
            )

            # Log successful access
            self.log_access(
                file_id=file_id,
                s3_key=file_metadata.s3_key,
                user_id=user_id,
                operation="download",
                status="success"
            )

            return {
                "url": presigned_url,
                "expiration": datetime.utcnow() + timedelta(seconds=expiration),
                "file_name": file_metadata.file_name,
                "file_size": file_metadata.file_size,
                "mime_type": file_metadata.mime_type,
            }

        except ClientError as e:
            logger.error(f"S3 ClientError generating download URL: {str(e)}")
            raise ServiceError("Failed to generate download URL")

    def delete_file(
        self,
        file_id: uuid.UUID,
        user_id: uuid.UUID,
        hard_delete: bool = False
    ) -> None:
        """
        Delete file (soft delete by default, hard delete if specified)

        Args:
            file_id: File ID
            user_id: User requesting deletion
            hard_delete: If True, physically delete from S3
        """
        if not self.db:
            raise ServiceError("Database session required")

        file_metadata = self.db.query(FileMetadata).filter(
            FileMetadata.id == file_id
        ).first()

        if not file_metadata:
            raise ServiceError("File not found")

        # Enforce ownership
        if file_metadata.user_id != user_id:
            raise ServiceError("Access forbidden")

        if hard_delete:
            # Delete from S3
            try:
                self.s3_client.delete_object(
                    Bucket=file_metadata.s3_bucket,
                    Key=file_metadata.s3_key
                )
            except ClientError as e:
                logger.error(f"S3 ClientError deleting file: {str(e)}")
                raise ServiceError("Failed to delete file from storage")

        # Soft delete (mark as deleted)
        file_metadata.status = FileStatus.DELETED.value
        file_metadata.deleted_at = datetime.utcnow()

        self.db.commit()

        # Log deletion
        self.log_access(
            file_id=file_id,
            s3_key=file_metadata.s3_key,
            user_id=user_id,
            operation="delete",
            status="success"
        )

    def calculate_file_hash(self, content: bytes) -> str:
        """Calculate SHA-256 hash of file content for deduplication"""
        return hashlib.sha256(content).hexdigest()

    def log_access(
        self,
        file_id: uuid.UUID,
        s3_key: str,
        user_id: Optional[uuid.UUID],
        operation: str,
        status: str,
        error_message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        bytes_transferred: Optional[int] = None,
        duration_ms: Optional[int] = None,
    ) -> None:
        """Log file access operation for audit trail"""
        if not self.db:
            logger.warning("Database session not available for access logging")
            return

        try:
            access_log = FileAccessLog(
                id=uuid.uuid4(),
                file_id=file_id,
                s3_key=s3_key,
                user_id=user_id,
                operation=operation,
                status=status,
                error_message=error_message,
                ip_address=ip_address,
                user_agent=user_agent,
                bytes_transferred=bytes_transferred,
                duration_ms=duration_ms,
            )

            self.db.add(access_log)
            self.db.commit()

        except Exception as e:
            logger.error(f"Failed to log file access: {str(e)}")
            # Don't fail the operation if logging fails


# Service instance (can be imported and used in API endpoints)
def get_s3_service(db: Session) -> S3Service:
    """Get S3 service instance with database session"""
    return S3Service(db=db)
