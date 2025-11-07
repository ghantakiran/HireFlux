"""Job Service for Employer Job Posting

Provides CRUD operations for job postings with subscription limit enforcement.
"""

from datetime import datetime
from typing import List, Optional, Tuple
from uuid import UUID
import math

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models.company import Company
from app.db.models.job import Job
from app.schemas.job import JobCreate, JobUpdate, JobStatus


class JobService:
    """Service for managing employer job postings"""

    def __init__(self, db: Session):
        self.db = db

    def create_job(self, company_id: UUID, job_data: JobCreate) -> Job:
        """
        Create a new job posting for a company.

        Args:
            company_id: Company UUID
            job_data: Job creation data

        Returns:
            Created Job instance

        Raises:
            Exception: If company not found or subscription limit reached
        """
        # Verify company exists
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise Exception(f"Company {company_id} not found")

        # Check subscription limits
        active_jobs_count = (
            self.db.query(func.count(Job.id))
            .filter(Job.company_id == company_id, Job.is_active == True)
            .scalar()
        ) or 0

        if active_jobs_count >= company.max_active_jobs:
            raise Exception(
                f"Subscription limit reached. Your {company.subscription_tier} plan allows "
                f"{company.max_active_jobs} active job(s). Please upgrade or close existing jobs."
            )

        # Validate required fields
        if not job_data.title or job_data.title.strip() == "":
            raise Exception("Job title is required")

        # Create job instance
        job = Job(
            company_id=company_id,
            source="employer",  # Jobs posted by employers on the platform
            title=job_data.title,
            company=job_data.company_name,
            department=job_data.department,
            location=job_data.location,
            location_type=job_data.location_type.value,
            employment_type=job_data.employment_type.value,
            experience_level=(
                job_data.experience_level.value if job_data.experience_level else None
            ),
            experience_min_years=job_data.experience_min_years,
            experience_max_years=job_data.experience_max_years,
            experience_requirement=job_data.experience_requirement,
            salary_min=job_data.salary_min,
            salary_max=job_data.salary_max,
            description=job_data.description,
            required_skills=job_data.required_skills,
            preferred_skills=job_data.preferred_skills,
            requires_visa_sponsorship=job_data.requires_visa_sponsorship,
            external_url=job_data.external_url,
            expires_at=job_data.expires_at,
            is_active=True,
            posted_date=datetime.utcnow(),
        )

        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        return job

    def get_job(self, job_id: UUID) -> Optional[Job]:
        """
        Get a single job by ID.

        Args:
            job_id: Job UUID

        Returns:
            Job instance or None if not found
        """
        return self.db.query(Job).filter(Job.id == job_id).first()

    def list_jobs(
        self,
        company_id: UUID,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 10,
    ) -> Tuple[List[Job], int]:
        """
        List jobs for a company with pagination and filtering.

        Args:
            company_id: Company UUID
            status: Filter by status ('active', 'closed', etc.)
            page: Page number (1-indexed)
            limit: Number of jobs per page

        Returns:
            Tuple of (jobs list, total count)
        """
        query = self.db.query(Job).filter(Job.company_id == company_id)

        # Filter by status
        if status == "active":
            query = query.filter(Job.is_active == True)
        elif status == "closed":
            query = query.filter(Job.is_active == False)

        # Get total count
        total = query.count()

        # Apply pagination
        offset = (page - 1) * limit
        jobs = query.order_by(Job.created_at.desc()).offset(offset).limit(limit).all()

        return jobs, total

    def update_job(self, job_id: UUID, job_data: JobUpdate) -> Job:
        """
        Update an existing job.

        Args:
            job_id: Job UUID
            job_data: Job update data (partial)

        Returns:
            Updated Job instance

        Raises:
            Exception: If job not found
        """
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise Exception(f"Job {job_id} not found")

        # Update only provided fields
        update_data = job_data.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            # Handle enum conversions
            if (
                field in ["location_type", "employment_type", "experience_level"]
                and value is not None
            ):
                setattr(job, field, value.value)
            else:
                setattr(job, field, value)

        job.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(job)

        return job

    def update_job_status(self, job_id: UUID, status: JobStatus) -> Job:
        """
        Update job status.

        Args:
            job_id: Job UUID
            status: New job status

        Returns:
            Updated Job instance

        Raises:
            Exception: If job not found
        """
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise Exception(f"Job {job_id} not found")

        # Handle status changes
        if status == JobStatus.CLOSED:
            # Closed jobs are soft deleted (is_active = False)
            job.is_active = False
        elif status == JobStatus.ACTIVE:
            job.is_active = True
        elif status == JobStatus.PAUSED:
            # Paused jobs remain active but applications may be disabled
            # (they still count toward subscription limits)
            job.is_active = True

        job.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(job)

        return job

    def delete_job(self, job_id: UUID) -> bool:
        """
        Delete a job (soft delete by setting is_active = False).

        Args:
            job_id: Job UUID

        Returns:
            True if deleted successfully

        Raises:
            Exception: If job not found
        """
        job = self.db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise Exception(f"Job {job_id} not found")

        # Soft delete
        job.is_active = False
        job.updated_at = datetime.utcnow()

        self.db.commit()

        return True

    def get_active_jobs_count(self, company_id: UUID) -> int:
        """
        Get count of active jobs for a company.

        Args:
            company_id: Company UUID

        Returns:
            Number of active jobs
        """
        return (
            self.db.query(func.count(Job.id))
            .filter(Job.company_id == company_id, Job.is_active == True)
            .scalar()
        ) or 0

    def check_can_post_job(self, company_id: UUID) -> Tuple[bool, str]:
        """
        Check if company can post another job.

        Args:
            company_id: Company UUID

        Returns:
            Tuple of (can_post: bool, message: str)
        """
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            return False, "Company not found"

        active_jobs_count = self.get_active_jobs_count(company_id)

        if active_jobs_count >= company.max_active_jobs:
            return False, (
                f"Subscription limit reached. Your {company.subscription_tier} plan allows "
                f"{company.max_active_jobs} active job(s). Please upgrade or close existing jobs."
            )

        return (
            True,
            f"You can post {company.max_active_jobs - active_jobs_count} more job(s)",
        )
