"""Bulk Job Upload Service (Sprint 11-12)

Handles CSV parsing, validation, duplicate detection, and upload session management.
"""
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime
import uuid
from difflib import SequenceMatcher

from app.db.models.bulk_job_posting import BulkJobUpload, BulkUploadStatus
from app.schemas.bulk_job_posting import (
    CSVJobRow,
    BulkUploadCreate,
    BulkUploadStatusEnum,
    JobValidationError,
    DuplicateInfo,
)


class BulkJobUploadService:
    """Service for managing bulk job uploads"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_upload_session(
        self,
        company_id: str,
        user_id: str,
        upload_request: BulkUploadCreate,
    ) -> BulkJobUpload:
        """
        Create a new bulk job upload session.

        Args:
            company_id: ID of the company
            user_id: ID of the user uploading
            upload_request: Upload request with job data

        Returns:
            Created BulkJobUpload instance
        """
        # Validate job count
        await self.validate_job_count(upload_request.jobs_data)

        # Validate jobs
        validation_result = await self.validate_jobs(upload_request.jobs_data)

        # Detect duplicates
        duplicate_info = await self.detect_duplicates(upload_request.jobs_data)

        # Convert jobs_data to JSON-serializable format
        raw_jobs_data = [job.model_dump() for job in upload_request.jobs_data]

        # Create upload session
        upload = BulkJobUpload(
            id=uuid.uuid4(),
            company_id=uuid.UUID(company_id),
            uploaded_by_user_id=uuid.UUID(user_id),
            filename=upload_request.filename,
            total_jobs=len(upload_request.jobs_data),
            valid_jobs=validation_result["valid_count"],
            invalid_jobs=validation_result["invalid_count"],
            duplicate_jobs=len(duplicate_info),
            status=BulkUploadStatus.UPLOADED,
            raw_jobs_data=raw_jobs_data,
            validation_errors=validation_result["errors"],
            duplicate_info=[d.model_dump() for d in duplicate_info]
            if duplicate_info
            else [],
            distribution_channels=[
                c.value for c in upload_request.distribution_channels
            ],
            scheduled_publish_at=upload_request.scheduled_publish_at,
        )

        self.db.add(upload)
        await self.db.commit()
        await self.db.refresh(upload)

        return upload

    async def validate_job_count(self, jobs: List[CSVJobRow]) -> None:
        """
        Validate that job count is within limits.

        Args:
            jobs: List of job data

        Raises:
            ValueError: If job count exceeds limit
        """
        if len(jobs) > 500:
            raise ValueError("Maximum 500 jobs allowed per upload")
        if len(jobs) == 0:
            raise ValueError("At least 1 job required")

    async def validate_jobs(self, jobs: List[CSVJobRow]) -> Dict[str, Any]:
        """
        Validate job data and return validation results.

        Args:
            jobs: List of job data to validate

        Returns:
            Dictionary with validation results:
            - valid_count: Number of valid jobs
            - invalid_count: Number of invalid jobs
            - errors: List of validation errors
        """
        errors = []
        valid_count = 0

        for idx, job in enumerate(jobs):
            job_errors = self._validate_single_job(job, idx)
            if job_errors:
                errors.extend(job_errors)
            else:
                valid_count += 1

        return {
            "valid_count": valid_count,
            "invalid_count": len(jobs) - valid_count,
            "errors": errors,
        }

    def _validate_single_job(
        self, job: CSVJobRow, row_index: int
    ) -> List[Dict[str, Any]]:
        """
        Validate a single job entry.

        Args:
            job: Job data to validate
            row_index: Row index for error reporting

        Returns:
            List of validation errors (empty if valid)
        """
        errors = []

        # Required fields
        if not job.title or len(job.title.strip()) == 0:
            errors.append(
                {
                    "row_index": row_index,
                    "field": "title",
                    "error_message": "Title is required",
                }
            )

        # Salary validation
        if job.salary_min is not None and job.salary_max is not None:
            if job.salary_min > job.salary_max:
                errors.append(
                    {
                        "row_index": row_index,
                        "field": "salary",
                        "error_message": "Minimum salary cannot exceed maximum salary",
                    }
                )

        if job.salary_min is not None and job.salary_min < 0:
            errors.append(
                {
                    "row_index": row_index,
                    "field": "salary_min",
                    "error_message": "Salary must be positive",
                }
            )

        if job.salary_max is not None and job.salary_max < 0:
            errors.append(
                {
                    "row_index": row_index,
                    "field": "salary_max",
                    "error_message": "Salary must be positive",
                }
            )

        # Validate location_type values
        valid_location_types = ["remote", "hybrid", "onsite", "any"]
        if job.location_type and job.location_type.lower() not in valid_location_types:
            errors.append(
                {
                    "row_index": row_index,
                    "field": "location_type",
                    "error_message": f"Location type must be one of: {', '.join(valid_location_types)}",
                }
            )

        return errors

    async def detect_duplicates(
        self, jobs: List[CSVJobRow], similarity_threshold: float = 0.85
    ) -> List[DuplicateInfo]:
        """
        Detect duplicate jobs using fuzzy string matching.

        Args:
            jobs: List of job data
            similarity_threshold: Minimum similarity score (0-1) to consider duplicate

        Returns:
            List of duplicate information
        """
        duplicates = []

        for i in range(len(jobs)):
            for j in range(i + 1, len(jobs)):
                similarity = self._calculate_job_similarity(jobs[i], jobs[j])

                if similarity >= similarity_threshold:
                    duplicates.append(
                        DuplicateInfo(
                            row_index=j,
                            duplicate_of=i,
                            similarity_score=similarity,
                            matching_fields=self._get_matching_fields(jobs[i], jobs[j]),
                        )
                    )

        return duplicates

    def _calculate_job_similarity(self, job1: CSVJobRow, job2: CSVJobRow) -> float:
        """
        Calculate similarity score between two jobs.

        Uses fuzzy string matching on title and location.

        Args:
            job1: First job
            job2: Second job

        Returns:
            Similarity score between 0 and 1
        """
        # Calculate title similarity
        title1 = job1.title.lower().strip()
        title2 = job2.title.lower().strip()
        title_similarity = SequenceMatcher(None, title1, title2).ratio()

        # Calculate location similarity
        location1 = (job1.location or "").lower().strip()
        location2 = (job2.location or "").lower().strip()
        location_similarity = (
            SequenceMatcher(None, location1, location2).ratio()
            if location1 and location2
            else 0
        )

        # Weighted average (title is more important)
        similarity = (title_similarity * 0.7) + (location_similarity * 0.3)

        return similarity

    def _get_matching_fields(self, job1: CSVJobRow, job2: CSVJobRow) -> List[str]:
        """
        Get list of fields that match between two jobs.

        Args:
            job1: First job
            job2: Second job

        Returns:
            List of matching field names
        """
        matching_fields = []

        if job1.title == job2.title:
            matching_fields.append("title")
        if job1.location == job2.location:
            matching_fields.append("location")
        if job1.department == job2.department:
            matching_fields.append("department")
        if job1.experience_level == job2.experience_level:
            matching_fields.append("experience_level")

        return matching_fields

    async def get_upload_by_id(
        self, upload_id: str, company_id: str
    ) -> Optional[BulkJobUpload]:
        """
        Retrieve an upload session by ID.

        Args:
            upload_id: Upload session ID
            company_id: Company ID (for authorization)

        Returns:
            BulkJobUpload instance or None
        """
        query = select(BulkJobUpload).where(
            and_(
                BulkJobUpload.id == uuid.UUID(upload_id),
                BulkJobUpload.company_id == uuid.UUID(company_id),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update_upload_status(
        self, upload_id: str, company_id: str, status: BulkUploadStatusEnum
    ) -> None:
        """
        Update upload session status.

        Args:
            upload_id: Upload session ID
            company_id: Company ID (for authorization)
            status: New status
        """
        upload = await self.get_upload_by_id(upload_id, company_id)
        if not upload:
            raise ValueError("Upload not found")

        upload.status = status
        await self.db.commit()

    async def list_uploads_by_company(
        self,
        company_id: str,
        page: int = 1,
        limit: int = 20,
        status: Optional[BulkUploadStatusEnum] = None,
    ) -> List[BulkJobUpload]:
        """
        List upload sessions for a company.

        Args:
            company_id: Company ID
            page: Page number (1-indexed)
            limit: Items per page
            status: Optional status filter

        Returns:
            List of BulkJobUpload instances
        """
        offset = (page - 1) * limit

        conditions = [BulkJobUpload.company_id == uuid.UUID(company_id)]
        if status:
            conditions.append(BulkJobUpload.status == status)

        query = (
            select(BulkJobUpload)
            .where(and_(*conditions))
            .order_by(BulkJobUpload.created_at.desc())
            .offset(offset)
            .limit(limit)
        )

        result = await self.db.execute(query)
        return result.scalars().all()

    async def delete_upload(self, upload_id: str, company_id: str) -> None:
        """
        Delete an upload session.

        Args:
            upload_id: Upload session ID
            company_id: Company ID (for authorization)
        """
        upload = await self.get_upload_by_id(upload_id, company_id)
        if not upload:
            raise ValueError("Upload not found")

        await self.db.delete(upload)
        await self.db.commit()

    async def cancel_upload(self, upload_id: str, company_id: str) -> None:
        """
        Cancel an in-progress upload session.

        Args:
            upload_id: Upload session ID
            company_id: Company ID (for authorization)

        Raises:
            ValueError: If upload cannot be cancelled
        """
        upload = await self.get_upload_by_id(upload_id, company_id)
        if not upload:
            raise ValueError("Upload not found")

        # Cannot cancel completed or failed uploads
        if upload.status in [BulkUploadStatus.COMPLETED, BulkUploadStatus.FAILED]:
            raise ValueError(
                f"Upload with status {upload.status.value} cannot be cancelled"
            )

        upload.status = BulkUploadStatus.CANCELLED
        await self.db.commit()
