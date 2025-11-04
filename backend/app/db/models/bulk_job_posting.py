"""Bulk Job Posting and Distribution models (Sprint 11-12)"""
from sqlalchemy import (
    Column,
    String,
    TIMESTAMP,
    ForeignKey,
    Text,
    Integer,
    Boolean,
    JSON,
    Enum,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
import enum

from app.db.base import Base
from app.db.types import GUID


class BulkUploadStatus(str, enum.Enum):
    """Status of a bulk job upload session"""
    UPLOADED = "uploaded"  # CSV uploaded and parsed
    VALIDATING = "validating"  # Validating job data
    ENRICHING = "enriching"  # AI normalization in progress
    READY = "ready"  # Ready for publishing
    PUBLISHING = "publishing"  # Publishing to job boards
    COMPLETED = "completed"  # All jobs published successfully
    FAILED = "failed"  # Upload or processing failed
    CANCELLED = "cancelled"  # Cancelled by user


class DistributionStatus(str, enum.Enum):
    """Status of a job distribution to a specific channel"""
    PENDING = "pending"  # Scheduled for publishing
    PUBLISHING = "publishing"  # Currently publishing
    PUBLISHED = "published"  # Successfully published
    FAILED = "failed"  # Publishing failed
    RETRYING = "retrying"  # Retrying after failure


class DistributionChannel(str, enum.Enum):
    """Job board distribution channels"""
    LINKEDIN = "linkedin"
    INDEED = "indeed"
    GLASSDOOR = "glassdoor"
    INTERNAL = "internal"  # HireFlux platform only


class BulkJobUpload(Base):
    """Bulk job upload sessions for mass posting"""

    __tablename__ = "bulk_job_uploads"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    # Company/employer relationship
    company_id = Column(
        GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    uploaded_by_user_id = Column(
        GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # Upload metadata
    filename = Column(String(255), nullable=False)
    total_jobs = Column(Integer, default=0)
    valid_jobs = Column(Integer, default=0)
    invalid_jobs = Column(Integer, default=0)
    duplicate_jobs = Column(Integer, default=0)

    # Status tracking
    status = Column(
        Enum(BulkUploadStatus),
        default=BulkUploadStatus.UPLOADED,
        nullable=False,
        index=True
    )
    error_message = Column(Text)  # Error details if failed

    # Parsed job data
    raw_jobs_data = Column(JSON)  # Original parsed CSV data
    enriched_jobs_data = Column(JSON)  # After AI normalization
    validation_errors = Column(JSON)  # Per-job validation errors
    duplicate_info = Column(JSON)  # Duplicate detection results

    # AI enrichment tracking
    enrichment_started_at = Column(TIMESTAMP)
    enrichment_completed_at = Column(TIMESTAMP)
    enrichment_cost = Column(Integer, default=0)  # LLM token cost in cents

    # Distribution settings
    distribution_channels = Column(JSON)  # List of selected channels
    scheduled_publish_at = Column(TIMESTAMP)  # Future publish time (optional)

    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())
    completed_at = Column(TIMESTAMP)

    # Relationships
    company = relationship("Company", back_populates="bulk_job_uploads")
    uploaded_by = relationship("User")
    distributions = relationship(
        "JobDistribution", back_populates="bulk_upload", cascade="all, delete-orphan"
    )


class JobDistribution(Base):
    """Individual job distribution tracking for multi-board publishing"""

    __tablename__ = "job_distributions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    # Relationships
    bulk_upload_id = Column(
        GUID(),
        ForeignKey("bulk_job_uploads.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    job_id = Column(
        GUID(),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    company_id = Column(
        GUID(),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Distribution channel
    channel = Column(
        Enum(DistributionChannel),
        nullable=False,
        index=True
    )

    # Status tracking
    status = Column(
        Enum(DistributionStatus),
        default=DistributionStatus.PENDING,
        nullable=False,
        index=True
    )

    # External tracking
    external_post_id = Column(String(255))  # ID from job board (e.g., LinkedIn post ID)
    external_post_url = Column(Text)  # Direct link to job posting

    # Performance metrics
    views_count = Column(Integer, default=0)
    applications_count = Column(Integer, default=0)
    clicks_count = Column(Integer, default=0)

    # Error handling
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    error_message = Column(Text)  # Error details if failed

    # Scheduling
    scheduled_publish_at = Column(TIMESTAMP)  # When to publish
    published_at = Column(TIMESTAMP)  # Actual publish time
    expires_at = Column(TIMESTAMP)  # Job expiration

    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    bulk_upload = relationship("BulkJobUpload", back_populates="distributions")
    job = relationship("Job", back_populates="distributions")
    company = relationship("Company", back_populates="job_distributions")


# Add relationship to Company model (to be added in company.py)
# bulk_job_uploads = relationship("BulkJobUpload", back_populates="company")
# job_distributions = relationship("JobDistribution", back_populates="company")

# Add relationship to Job model (to be added in job.py)
# distributions = relationship("JobDistribution", back_populates="job")
