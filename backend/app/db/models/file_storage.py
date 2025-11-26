"""
File Storage Models - Issue #53
Database models for tracking S3-stored files
"""

from sqlalchemy import Column, String, Integer, Boolean, DateTime, JSON, ForeignKey, Index, Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid
import enum

from app.db.base import Base


class FileType(str, enum.Enum):
    """File type enumeration"""
    RESUME = "resume"
    COVER_LETTER = "cover_letter"
    COMPANY_LOGO = "company_logo"
    BULK_UPLOAD_CSV = "bulk_upload_csv"
    INTERVIEW_TRANSCRIPT = "interview_transcript"
    ASSESSMENT_RESULT = "assessment_result"
    APPLICATION_ATTACHMENT = "application_attachment"
    CONTRACT_TEMPLATE = "contract_template"


class FileStatus(str, enum.Enum):
    """File status enumeration"""
    UPLOADING = "uploading"
    SCANNING = "scanning"
    AVAILABLE = "available"
    QUARANTINED = "quarantined"
    ARCHIVED = "archived"
    DELETED = "deleted"
    EXPIRED = "expired"


class StorageClass(str, enum.Enum):
    """S3 storage class"""
    STANDARD = "STANDARD"
    INTELLIGENT_TIERING = "INTELLIGENT_TIERING"
    GLACIER = "GLACIER"
    DEEP_ARCHIVE = "DEEP_ARCHIVE"


class FileMetadata(Base):
    """
    File metadata for S3-stored documents
    Tracks all uploaded files with security and compliance data
    """
    __tablename__ = "file_metadata"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Ownership
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    company_id = Column(UUID(as_uuid=True), ForeignKey("companies.id", ondelete="CASCADE"), nullable=True, index=True)

    # File identification
    file_type = Column(String(50), nullable=False, index=True)  # FileType enum as string
    file_name = Column(String(255), nullable=False)  # Original filename
    s3_key = Column(String(1024), nullable=False, unique=True, index=True)  # Full S3 path
    s3_bucket = Column(String(255), nullable=False, default="hireflux-documents")

    # File properties
    file_size = Column(Integer, nullable=False)  # Size in bytes
    mime_type = Column(String(100), nullable=False)
    file_hash = Column(String(64), nullable=True)  # SHA-256 hash for deduplication

    # Versioning
    version = Column(Integer, nullable=False, default=1)
    is_current_version = Column(Boolean, nullable=False, default=True)
    replaces_file_id = Column(UUID(as_uuid=True), ForeignKey("file_metadata.id"), nullable=True)

    # Security
    encrypted = Column(Boolean, nullable=False, default=True)
    virus_scan_status = Column(String(50), nullable=True)  # clean, infected, pending, error
    virus_scan_timestamp = Column(DateTime, nullable=True)

    # Status
    status = Column(String(50), nullable=False, default="uploading")  # FileStatus enum as string
    storage_class = Column(String(50), nullable=False, default="STANDARD")  # StorageClass enum

    # Timestamps
    upload_started_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    upload_completed_at = Column(DateTime, nullable=True)
    last_accessed_at = Column(DateTime, nullable=True)
    archived_at = Column(DateTime, nullable=True)
    deleted_at = Column(DateTime, nullable=True)

    # Metadata
    extra_metadata = Column(JSON, nullable=True)  # Additional custom metadata

    # Relationships (optional for linking)
    application_id = Column(UUID(as_uuid=True), ForeignKey("applications.id", ondelete="SET NULL"), nullable=True)
    resume_id = Column(UUID(as_uuid=True), ForeignKey("resumes.id", ondelete="SET NULL"), nullable=True)
    cover_letter_id = Column(UUID(as_uuid=True), ForeignKey("cover_letters.id", ondelete="SET NULL"), nullable=True)

    # Audit
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="files")
    company = relationship("Company", foreign_keys=[company_id])
    application = relationship("Application", foreign_keys=[application_id])

    # Indexes
    __table_args__ = (
        Index("idx_file_user_type", "user_id", "file_type"),
        Index("idx_file_company_type", "company_id", "file_type"),
        Index("idx_file_status", "status"),
        Index("idx_file_s3_key", "s3_key"),
    )

    def __repr__(self):
        return f"<FileMetadata(id={self.id}, s3_key={self.s3_key}, status={self.status})>"

    @property
    def public_url(self):
        """Generate public CDN URL (for public assets like logos)"""
        if self.file_type == FileType.COMPANY_LOGO.value:
            return f"https://cdn.hireflux.com/{self.s3_key}"
        return None

    @property
    def is_safe(self):
        """Check if file passed virus scan"""
        return self.virus_scan_status == "clean"

    @property
    def is_available(self):
        """Check if file is available for download"""
        return self.status == FileStatus.AVAILABLE.value and self.is_safe

    @property
    def size_mb(self):
        """File size in megabytes"""
        return round(self.file_size / (1024 * 1024), 2)


class FileAccessLog(Base):
    """
    Audit log for file access operations
    Tracks all upload, download, and delete operations for compliance
    """
    __tablename__ = "file_access_logs"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # File reference
    file_id = Column(UUID(as_uuid=True), ForeignKey("file_metadata.id", ondelete="CASCADE"), nullable=False, index=True)
    s3_key = Column(String(1024), nullable=False)  # Denormalized for history

    # Access details
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    operation = Column(String(50), nullable=False, index=True)  # upload, download, delete, update
    status = Column(String(50), nullable=False)  # success, failure
    error_message = Column(String(500), nullable=True)

    # Request metadata
    ip_address = Column(String(45), nullable=True)  # IPv6 support
    user_agent = Column(String(500), nullable=True)
    request_id = Column(String(100), nullable=True)

    # Performance metrics
    bytes_transferred = Column(Integer, nullable=True)
    duration_ms = Column(Integer, nullable=True)  # Operation duration in milliseconds

    # Timestamp
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow, index=True)

    # Relationships
    file = relationship("FileMetadata", foreign_keys=[file_id])
    user = relationship("User", foreign_keys=[user_id])

    # Indexes
    __table_args__ = (
        Index("idx_access_user_operation", "user_id", "operation"),
        Index("idx_access_timestamp", "timestamp"),
        Index("idx_access_file_timestamp", "file_id", "timestamp"),
    )

    def __repr__(self):
        return f"<FileAccessLog(id={self.id}, operation={self.operation}, status={self.status})>"


class PreSignedURL(Base):
    """
    Temporary pre-signed URL tracking
    Tracks generated URLs for security and rate limiting
    """
    __tablename__ = "presigned_urls"

    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # File reference
    file_id = Column(UUID(as_uuid=True), ForeignKey("file_metadata.id", ondelete="CASCADE"), nullable=False, index=True)
    s3_key = Column(String(1024), nullable=False)

    # URL details
    url_hash = Column(String(64), nullable=False, unique=True, index=True)  # SHA-256 of full URL
    operation = Column(String(50), nullable=False)  # upload, download
    expiration = Column(DateTime, nullable=False, index=True)

    # User tracking
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    ip_address = Column(String(45), nullable=True)

    # Usage tracking
    used = Column(Boolean, nullable=False, default=False)
    used_at = Column(DateTime, nullable=True)
    use_count = Column(Integer, nullable=False, default=0)

    # Timestamps
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    file = relationship("FileMetadata", foreign_keys=[file_id])
    user = relationship("User", foreign_keys=[user_id])

    # Indexes
    __table_args__ = (
        Index("idx_presigned_expiration", "expiration"),
        Index("idx_presigned_user", "user_id", "created_at"),
    )

    def __repr__(self):
        return f"<PreSignedURL(id={self.id}, operation={self.operation}, used={self.used})>"

    @property
    def is_expired(self):
        """Check if URL has expired"""
        return datetime.utcnow() > self.expiration

    @property
    def is_valid(self):
        """Check if URL is still valid"""
        return not self.is_expired and not self.used


# Summary:
# - 3 models: FileMetadata, FileAccessLog, PreSignedURL
# - Comprehensive file tracking with versioning
# - Security: virus scanning, encryption tracking
# - Compliance: full audit trail, GDPR-ready deletion
# - Performance: indexed queries, storage class tracking
