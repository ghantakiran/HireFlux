"""Job ingestion orchestration service"""
import uuid
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.db.models.job import Job, JobSource as JobSourceModel
from app.services.greenhouse_service import GreenhouseService
from app.services.lever_service import LeverService
from app.services.job_normalization_service import JobNormalizationService
from app.services.pinecone_service import PineconeService
from app.core.exceptions import ServiceError
from app.schemas.job_feed import (
    JobSource,
    JobIngestionRequest,
    JobIngestionResult,
    JobMetadata,
    NormalizedJob
)


class JobIngestionService:
    """
    Orchestrates job ingestion from multiple sources.
    Handles fetching, normalization, deduplication, and vector indexing.
    """

    def __init__(self, db: Session):
        self.db = db
        self.greenhouse = GreenhouseService(db)
        self.lever = LeverService(db)
        self.normalizer = JobNormalizationService()
        self.pinecone = PineconeService()

    def ingest_jobs(self, request: JobIngestionRequest) -> JobIngestionResult:
        """
        Ingest jobs from specified sources

        Args:
            request: Ingestion configuration

        Returns:
            JobIngestionResult with ingestion statistics
        """
        start_time = datetime.utcnow()
        all_jobs = []
        errors = []

        # Fetch from each source
        if request.sources:
            for source_config in request.sources:
                try:
                    if source_config.source == JobSource.GREENHOUSE:
                        jobs = self._ingest_from_greenhouse(source_config)
                        all_jobs.extend(jobs)
                    elif source_config.source == JobSource.LEVER:
                        jobs = self._ingest_from_lever(source_config)
                        all_jobs.extend(jobs)
                except Exception as e:
                    errors.append(f"Error ingesting from {source_config.source.value}: {str(e)}")

        # Process and save jobs
        new_count = 0
        updated_count = 0
        skipped_count = 0

        for normalized_job in all_jobs:
            try:
                result = self._save_or_update_job(normalized_job)
                if result == "new":
                    new_count += 1
                elif result == "updated":
                    updated_count += 1
                else:
                    skipped_count += 1
            except Exception as e:
                errors.append(f"Error saving job {normalized_job.external_id}: {str(e)}")

        duration = (datetime.utcnow() - start_time).total_seconds()

        metadata = JobMetadata(
            total_fetched=len(all_jobs),
            new_jobs=new_count,
            updated_jobs=updated_count,
            failed_jobs=len(errors),
            fetch_duration_seconds=duration,
            errors=errors
        )

        return JobIngestionResult(
            success=len(errors) == 0,
            message=f"Ingested {new_count} new jobs, updated {updated_count} jobs",
            metadata=metadata,
            jobs_skipped=skipped_count,
            errors=len(errors),
            processing_time_seconds=duration,
            error_messages=errors
        )

    def _ingest_from_greenhouse(self, source_config) -> List[NormalizedJob]:
        """Fetch and normalize jobs from Greenhouse"""

        board_token = source_config.config.get("board_token")
        company_name = source_config.config.get("company_name", "Unknown")

        if not board_token:
            raise ServiceError("board_token required for Greenhouse source")

        # Fetch jobs
        result = self.greenhouse.fetch_jobs(
            board_token=board_token,
            department_id=source_config.config.get("department_id"),
            office_id=source_config.config.get("office_id")
        )

        # Normalize jobs
        normalized_jobs = []
        for gh_job in result.jobs:
            try:
                normalized = self.normalizer.normalize_greenhouse_job(gh_job, company_name)
                normalized_jobs.append(normalized)
            except Exception as e:
                print(f"Error normalizing Greenhouse job {gh_job.id}: {e}")

        return normalized_jobs

    def _ingest_from_lever(self, source_config) -> List[NormalizedJob]:
        """Fetch and normalize jobs from Lever"""

        company_site = source_config.config.get("company_site")
        company_name = source_config.config.get("company_name", "Unknown")

        if not company_site:
            raise ServiceError("company_site required for Lever source")

        # Fetch jobs
        result = self.lever.fetch_jobs(
            company_site=company_site,
            team=source_config.config.get("team"),
            location=source_config.config.get("location"),
            commitment=source_config.config.get("commitment")
        )

        # Normalize jobs
        normalized_jobs = []
        for lever_job in result.jobs:
            try:
                normalized = self.normalizer.normalize_lever_job(lever_job, company_name)
                normalized_jobs.append(normalized)
            except Exception as e:
                print(f"Error normalizing Lever job {lever_job.id}: {e}")

        return normalized_jobs

    def _save_or_update_job(self, normalized_job: NormalizedJob) -> str:
        """
        Save new job or update existing job

        Returns:
            "new", "updated", or "skipped"
        """

        # Check if job already exists
        existing_job = self.db.query(Job).filter(
            and_(
                Job.external_id == normalized_job.external_id,
                Job.source == normalized_job.source.value
            )
        ).first()

        if existing_job:
            # Check if job needs updating (compare description hash or updated_at)
            if self._job_needs_update(existing_job, normalized_job):
                self._update_job(existing_job, normalized_job)
                return "updated"
            else:
                return "skipped"
        else:
            # Create new job
            self._create_job(normalized_job)
            return "new"

    def _job_needs_update(self, existing_job: Job, normalized_job: NormalizedJob) -> bool:
        """Check if existing job needs updating"""

        # Compare key fields
        if existing_job.title != normalized_job.title:
            return True
        if existing_job.description != normalized_job.description:
            return True
        if existing_job.location != normalized_job.location:
            return True

        # Check if posted date changed
        if normalized_job.posted_date and existing_job.posted_date:
            if normalized_job.posted_date > existing_job.posted_date:
                return True

        return False

    def _create_job(self, normalized_job: NormalizedJob):
        """Create new job in database and index in Pinecone"""

        job = Job(
            id=uuid.uuid4(),
            source=normalized_job.source.value,
            external_id=normalized_job.external_id,
            title=normalized_job.title,
            company=normalized_job.company,
            description=normalized_job.description,
            location=normalized_job.location,
            location_type=normalized_job.location_type,
            required_skills=normalized_job.required_skills,
            preferred_skills=normalized_job.preferred_skills,
            experience_requirement=normalized_job.experience_requirement,
            experience_min_years=normalized_job.experience_min_years,
            experience_max_years=normalized_job.experience_max_years,
            experience_level=normalized_job.experience_level,
            salary_min=normalized_job.salary.min_salary if normalized_job.salary else None,
            salary_max=normalized_job.salary.max_salary if normalized_job.salary else None,
            department=normalized_job.department,
            employment_type=normalized_job.employment_type,
            requires_visa_sponsorship=self.normalizer.detect_visa_sponsorship(
                normalized_job.description
            ),
            external_url=normalized_job.application_url,
            posted_date=normalized_job.posted_date,
            is_active=True
        )

        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)

        # Index in Pinecone
        try:
            self._index_job_in_pinecone(job)
        except Exception as e:
            print(f"Warning: Failed to index job {job.id} in Pinecone: {e}")

    def _update_job(self, existing_job: Job, normalized_job: NormalizedJob):
        """Update existing job in database and reindex in Pinecone"""

        # Update fields
        existing_job.title = normalized_job.title
        existing_job.description = normalized_job.description
        existing_job.location = normalized_job.location
        existing_job.location_type = normalized_job.location_type
        existing_job.required_skills = normalized_job.required_skills
        existing_job.preferred_skills = normalized_job.preferred_skills
        existing_job.experience_requirement = normalized_job.experience_requirement
        existing_job.experience_min_years = normalized_job.experience_min_years
        existing_job.experience_max_years = normalized_job.experience_max_years
        existing_job.experience_level = normalized_job.experience_level

        if normalized_job.salary:
            existing_job.salary_min = normalized_job.salary.min_salary
            existing_job.salary_max = normalized_job.salary.max_salary

        existing_job.department = normalized_job.department
        existing_job.employment_type = normalized_job.employment_type
        existing_job.requires_visa_sponsorship = self.normalizer.detect_visa_sponsorship(
            normalized_job.description
        )
        existing_job.external_url = normalized_job.application_url
        existing_job.updated_at = datetime.utcnow()

        self.db.commit()

        # Reindex in Pinecone
        try:
            self._index_job_in_pinecone(existing_job)
        except Exception as e:
            print(f"Warning: Failed to reindex job {existing_job.id} in Pinecone: {e}")

    def _index_job_in_pinecone(self, job: Job):
        """Index job in Pinecone vector database"""

        # Create searchable text from job
        searchable_text = f"{job.title} {job.company} {' '.join(job.required_skills or [])} {' '.join(job.preferred_skills or [])} {job.description[:500]}"

        # Index in Pinecone
        self.pinecone.index_job(
            job_id=str(job.id),
            title=job.title,
            company=job.company,
            description=job.description,
            required_skills=job.required_skills or [],
            preferred_skills=job.preferred_skills or [],
            location=job.location,
            location_type=job.location_type or "onsite",
            salary_min=job.salary_min,
            salary_max=job.salary_max,
            visa_sponsorship=job.requires_visa_sponsorship or False
        )

    def deactivate_stale_jobs(self, source: JobSource, days_old: int = 30):
        """
        Deactivate jobs that haven't been updated in X days

        Args:
            source: Job source to check
            days_old: Number of days after which to deactivate
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days_old)

        stale_jobs = self.db.query(Job).filter(
            and_(
                Job.source == source.value,
                Job.is_active == True,
                Job.updated_at < cutoff_date
            )
        ).all()

        for job in stale_jobs:
            job.is_active = False

        self.db.commit()

        return len(stale_jobs)

    def get_source_health(self, source: JobSource) -> Dict:
        """
        Get health metrics for a job source

        Returns:
            Dict with active jobs count, last sync time, etc.
        """
        active_count = self.db.query(Job).filter(
            and_(
                Job.source == source.value,
                Job.is_active == True
            )
        ).count()

        total_count = self.db.query(Job).filter(
            Job.source == source.value
        ).count()

        # Get last sync time from JobSource model
        source_record = self.db.query(JobSourceModel).filter(
            JobSourceModel.name == source.value
        ).first()

        last_sync = source_record.last_sync_at if source_record else None

        return {
            "source": source.value,
            "active_jobs": active_count,
            "total_jobs": total_count,
            "last_sync_at": last_sync,
            "is_healthy": active_count > 0 and (
                not last_sync or
                (datetime.utcnow() - last_sync).days < 7
            )
        }

    def update_source_sync_time(self, source: JobSource):
        """Update last sync timestamp for a source"""

        source_record = self.db.query(JobSourceModel).filter(
            JobSourceModel.name == source.value
        ).first()

        if not source_record:
            # Create source record
            source_record = JobSourceModel(
                id=uuid.uuid4(),
                name=source.value,
                is_active=True,
                last_sync_at=datetime.utcnow()
            )
            self.db.add(source_record)
        else:
            source_record.last_sync_at = datetime.utcnow()

        self.db.commit()
