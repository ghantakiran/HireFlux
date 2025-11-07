"""Auto-apply service for background job applications"""

import uuid
from typing import List, Optional, Dict, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func

from app.db.models.auto_apply import AutoApplyConfig, AutoApplyJob
from app.db.models.application import Application
from app.db.models.job import Job
from app.db.models.resume import Resume
from app.db.models.cover_letter import CoverLetter
from app.schemas.auto_apply import (
    AutoApplyConfigCreate,
    AutoApplyConfigUpdate,
    AutoApplyConfigResponse,
    AutoApplyJobCreate,
    AutoApplyJobUpdate,
    AutoApplyJobResponse,
    AutoApplyStatus,
    AutoApplyMode,
    RefundRequest,
    RefundResponse,
    AutoApplyStats,
    QueueResponse,
)
from app.core.exceptions import NotFoundError, ValidationError, ServiceError
from app.services.credit_service import CreditService
from app.services.greenhouse_service import GreenhouseService
from app.services.lever_service import LeverService


class AutoApplyService:
    """Service for managing auto-apply functionality"""

    def __init__(self, db: Session):
        self.db = db
        self.credit_service = CreditService(db)
        self.greenhouse_service = GreenhouseService(db)
        self.lever_service = LeverService(db)

    # Configuration Management

    def create_config(
        self, user_id: uuid.UUID, config_data: AutoApplyConfigCreate
    ) -> AutoApplyConfigResponse:
        """Create auto-apply configuration for user"""
        # Check if config already exists
        existing = (
            self.db.query(AutoApplyConfig)
            .filter(AutoApplyConfig.user_id == user_id)
            .first()
        )

        if existing:
            raise ValidationError(
                "Auto-apply configuration already exists for this user"
            )

        # Create new config
        config = AutoApplyConfig(
            id=uuid.uuid4(),
            user_id=user_id,
            **config_data.model_dump(exclude={"employment_types", "seniority_levels"}),
        )

        # Convert enums to strings for JSON storage
        if config_data.employment_types:
            config.employment_types = [e.value for e in config_data.employment_types]
        if config_data.seniority_levels:
            config.seniority_levels = [s.value for s in config_data.seniority_levels]

        # Set default resume if provided
        if config_data.default_resume_id:
            config.default_resume_id = uuid.UUID(config_data.default_resume_id)

        # Initialize counters
        config.daily_application_count = 0
        config.weekly_application_count = 0
        config.last_daily_reset = datetime.utcnow()
        config.last_weekly_reset = datetime.utcnow()

        self.db.add(config)
        self.db.commit()
        self.db.refresh(config)

        return AutoApplyConfigResponse.model_validate(config)

    def get_config(self, user_id: uuid.UUID) -> AutoApplyConfigResponse:
        """Get user's auto-apply configuration, create default if not exists"""
        config = (
            self.db.query(AutoApplyConfig)
            .filter(AutoApplyConfig.user_id == user_id)
            .first()
        )

        if not config:
            # Create default configuration
            config = AutoApplyConfig(
                id=uuid.uuid4(),
                user_id=user_id,
                enabled=False,
                mode=AutoApplyMode.APPLY_ASSIST.value,
                min_fit_score=70,
                max_applications_per_day=5,
                max_applications_per_week=25,
                remote_only=False,
                hybrid_allowed=True,
                onsite_allowed=False,
                use_default_resume=True,
                auto_generate_cover_letter=True,
                notify_on_apply=True,
                notify_on_error=True,
                notify_on_refund=True,
                daily_application_count=0,
                weekly_application_count=0,
                last_daily_reset=datetime.utcnow(),
                last_weekly_reset=datetime.utcnow(),
            )
            self.db.add(config)
            self.db.commit()
            self.db.refresh(config)

        return AutoApplyConfigResponse.model_validate(config)

    def update_config(
        self, user_id: uuid.UUID, updates: AutoApplyConfigUpdate
    ) -> AutoApplyConfigResponse:
        """Update auto-apply configuration"""
        config = (
            self.db.query(AutoApplyConfig)
            .filter(AutoApplyConfig.user_id == user_id)
            .first()
        )

        if not config:
            raise NotFoundError("Auto-apply configuration not found")

        # Update fields
        update_data = updates.model_dump(exclude_unset=True)

        for field, value in update_data.items():
            if value is not None:
                # Convert enums to strings for JSON storage
                if field == "employment_types" and value:
                    value = [e.value if hasattr(e, "value") else e for e in value]
                elif field == "seniority_levels" and value:
                    value = [s.value if hasattr(s, "value") else s for s in value]
                elif field == "mode" and hasattr(value, "value"):
                    value = value.value
                elif field == "default_resume_id" and value:
                    value = uuid.UUID(value)

                setattr(config, field, value)

        config.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(config)

        return AutoApplyConfigResponse.model_validate(config)

    def disable_auto_apply(self, user_id: uuid.UUID) -> AutoApplyConfigResponse:
        """Disable auto-apply for user"""
        config = (
            self.db.query(AutoApplyConfig)
            .filter(AutoApplyConfig.user_id == user_id)
            .first()
        )

        if not config:
            raise NotFoundError("Auto-apply configuration not found")

        config.enabled = False
        config.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(config)

        return AutoApplyConfigResponse.model_validate(config)

    def pause_auto_apply(
        self, user_id: uuid.UUID, pause_until: datetime
    ) -> AutoApplyConfigResponse:
        """Pause auto-apply until specified time"""
        config = (
            self.db.query(AutoApplyConfig)
            .filter(AutoApplyConfig.user_id == user_id)
            .first()
        )

        if not config:
            raise NotFoundError("Auto-apply configuration not found")

        config.pause_until = pause_until
        config.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(config)

        return AutoApplyConfigResponse.model_validate(config)

    # Job Queueing

    def queue_job(
        self, user_id: uuid.UUID, job_data: AutoApplyJobCreate
    ) -> AutoApplyJobResponse:
        """Queue a job for auto-apply"""
        # Get job
        job = self.db.query(Job).filter(Job.id == uuid.UUID(job_data.job_id)).first()

        if not job:
            raise NotFoundError("Job not found")

        # Check if already queued
        existing_queue = (
            self.db.query(AutoApplyJob)
            .filter(
                and_(
                    AutoApplyJob.user_id == user_id,
                    AutoApplyJob.job_id == job.id,
                    AutoApplyJob.status.in_(
                        [
                            AutoApplyStatus.QUEUED.value,
                            AutoApplyStatus.PROCESSING.value,
                            AutoApplyStatus.APPLIED.value,
                        ]
                    ),
                )
            )
            .first()
        )

        if existing_queue:
            raise ValidationError("Job is already queued or applied")

        # Check if already applied manually
        existing_app = (
            self.db.query(Application)
            .filter(and_(Application.user_id == user_id, Application.job_id == job.id))
            .first()
        )

        if existing_app:
            raise ValidationError("You have already applied to this job")

        # Check eligibility
        eligible, reason = self._check_eligibility(user_id, job, job_data.fit_score)
        if not eligible:
            raise ValidationError(f"Job is not eligible for auto-apply: {reason}")

        # Deduct credit
        if not self._deduct_credit(user_id, str(job.id)):
            raise ValidationError("Insufficient credits for auto-apply")

        # Create auto-apply job
        auto_apply_job = AutoApplyJob(
            id=uuid.uuid4(),
            user_id=user_id,
            job_id=job.id,
            status=AutoApplyStatus.QUEUED.value,
            priority=job_data.priority,
            fit_score=job_data.fit_score,
            fit_rationale=job_data.fit_rationale,
            resume_version_id=(
                uuid.UUID(job_data.resume_version_id)
                if job_data.resume_version_id
                else None
            ),
            cover_letter_id=(
                uuid.UUID(job_data.cover_letter_id)
                if job_data.cover_letter_id
                else None
            ),
            job_source=job.source or "unknown",
            job_board_url=job.external_url or "",
            company_name=job.company,
            credits_used=1,
            tos_compliant=self._check_tos_compliance(job),
            scheduled_at=datetime.utcnow(),
        )

        self.db.add(auto_apply_job)

        # Update daily/weekly counters
        config = (
            self.db.query(AutoApplyConfig)
            .filter(AutoApplyConfig.user_id == user_id)
            .first()
        )
        if config:
            self._reset_counts_if_needed(config)
            config.daily_application_count += 1
            config.weekly_application_count += 1

        self.db.commit()
        self.db.refresh(auto_apply_job)

        return AutoApplyJobResponse.model_validate(auto_apply_job)

    def batch_queue_jobs(
        self, user_id: uuid.UUID, job_ids: List[str], priority: int = 0
    ) -> Dict:
        """Queue multiple jobs at once"""
        results = {"successful": 0, "failed": 0, "errors": [], "queued_job_ids": []}

        for job_id in job_ids:
            try:
                job_data = AutoApplyJobCreate(
                    job_id=job_id, fit_score=75, priority=priority  # Default fit score
                )
                result = self.queue_job(user_id, job_data)
                results["successful"] += 1
                results["queued_job_ids"].append(str(result.id))
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"Job {job_id}: {str(e)}")

        return results

    # Eligibility Checking

    def _check_eligibility(
        self, user_id: uuid.UUID, job: Job, fit_score: float
    ) -> Tuple[bool, Optional[str]]:
        """Check if job meets user's auto-apply criteria"""
        config = (
            self.db.query(AutoApplyConfig)
            .filter(AutoApplyConfig.user_id == user_id)
            .first()
        )

        if not config or not config.enabled:
            return False, "Auto-apply is not enabled"

        # Check if paused
        if config.pause_until and config.pause_until > datetime.utcnow():
            return False, "Auto-apply is temporarily paused"

        # Reset counters if needed
        self._reset_counts_if_needed(config)

        # Check fit score
        if fit_score < config.min_fit_score:
            return (
                False,
                f"Fit score {fit_score} is below minimum {config.min_fit_score}",
            )

        # Check daily limit
        if config.daily_application_count >= config.max_applications_per_day:
            return False, "Daily application limit reached"

        # Check weekly limit
        if config.weekly_application_count >= config.max_applications_per_week:
            return False, "Weekly application limit reached"

        # Check location type
        if config.remote_only and job.location_type != "remote":
            return False, "Job is not remote"

        if not config.hybrid_allowed and job.location_type == "hybrid":
            return False, "Hybrid positions are excluded"

        if not config.onsite_allowed and job.location_type == "onsite":
            return False, "Onsite positions are excluded"

        # Check salary
        if config.min_salary and job.salary_max and job.salary_max < config.min_salary:
            return False, f"Salary is below minimum ${config.min_salary}"

        # Check excluded companies
        if config.excluded_companies and job.company in config.excluded_companies:
            return False, f"Company {job.company} is excluded"

        # Check excluded locations
        if config.excluded_locations and job.location in config.excluded_locations:
            return False, f"Location {job.location} is excluded"

        # Check employment types
        if (
            config.employment_types
            and job.employment_type
            and job.employment_type not in config.employment_types
        ):
            return (
                False,
                f"Employment type {job.employment_type} does not match preferences",
            )

        return True, None

    def _reset_counts_if_needed(self, config: AutoApplyConfig):
        """Reset daily/weekly counters if time window has passed"""
        now = datetime.utcnow()

        # Reset daily count if > 24 hours
        if config.last_daily_reset and (now - config.last_daily_reset) > timedelta(
            days=1
        ):
            config.daily_application_count = 0
            config.last_daily_reset = now

        # Reset weekly count if > 7 days
        if config.last_weekly_reset and (now - config.last_weekly_reset) > timedelta(
            days=7
        ):
            config.weekly_application_count = 0
            config.last_weekly_reset = now

    # Credit Management

    def _deduct_credit(self, user_id: uuid.UUID, reference_id: str) -> bool:
        """Deduct auto-apply credit from user's wallet"""
        try:
            self.credit_service.deduct_credits(
                user_id=user_id,
                credit_type="auto_apply",
                amount=1,
                description="Auto-apply job application",
                reference_id=uuid.UUID(reference_id),
            )
            return True
        except ValidationError:
            return False

    def _refund_credit(
        self, user_id: uuid.UUID, auto_apply_job_id: uuid.UUID, reason: str
    ) -> bool:
        """Refund auto-apply credit"""
        try:
            self.credit_service.refund_credits(
                user_id=user_id,
                credit_type="auto_apply",
                amount=1,
                reason=reason,
                reference_id=auto_apply_job_id,
            )
            return True
        except Exception:
            return False

    def request_refund(
        self, user_id: uuid.UUID, auto_apply_job_id: str, refund_request: RefundRequest
    ) -> RefundResponse:
        """Request credit refund for failed/invalid application"""
        auto_apply_job = (
            self.db.query(AutoApplyJob)
            .filter(
                and_(
                    AutoApplyJob.id == uuid.UUID(auto_apply_job_id),
                    AutoApplyJob.user_id == user_id,
                )
            )
            .first()
        )

        if not auto_apply_job:
            raise NotFoundError("Auto-apply job not found")

        if auto_apply_job.credits_refunded:
            raise ValidationError(
                "Credits have already been refunded for this application"
            )

        # Refund credit
        success = self._refund_credit(user_id, auto_apply_job.id, refund_request.reason)

        if success:
            auto_apply_job.credits_refunded = True
            auto_apply_job.refund_reason = refund_request.reason
            auto_apply_job.refunded_at = datetime.utcnow()
            auto_apply_job.status = AutoApplyStatus.REFUNDED.value
            self.db.commit()

            return RefundResponse(
                success=True,
                credits_refunded=auto_apply_job.credits_used,
                message="Credit successfully refunded",
            )
        else:
            return RefundResponse(
                success=False, credits_refunded=0, message="Failed to refund credits"
            )

    # Job Processing

    def process_job(self, auto_apply_job_id: str) -> AutoApplyJobResponse:
        """Process a queued auto-apply job"""
        auto_apply_job = (
            self.db.query(AutoApplyJob)
            .filter(AutoApplyJob.id == uuid.UUID(auto_apply_job_id))
            .first()
        )

        if not auto_apply_job:
            raise NotFoundError("Auto-apply job not found")

        # Update status to processing
        auto_apply_job.status = AutoApplyStatus.PROCESSING.value
        auto_apply_job.started_at = datetime.utcnow()
        auto_apply_job.attempts += 1
        self.db.commit()

        try:
            # Submit application
            success = self._submit_application(auto_apply_job)

            if success:
                auto_apply_job.status = AutoApplyStatus.APPLIED.value
                auto_apply_job.completed_at = datetime.utcnow()
            else:
                raise Exception("Application submission failed")

        except Exception as e:
            # Handle failure
            auto_apply_job.error_message = str(e)
            auto_apply_job.error_type = type(e).__name__
            auto_apply_job.last_error_at = datetime.utcnow()

            # Check if max attempts reached
            if auto_apply_job.attempts >= auto_apply_job.max_attempts:
                auto_apply_job.status = AutoApplyStatus.FAILED.value
                # Refund credit on permanent failure
                self._refund_credit(
                    auto_apply_job.user_id,
                    auto_apply_job.id,
                    f"Failed after {auto_apply_job.attempts} attempts",
                )
                auto_apply_job.credits_refunded = True
            else:
                # Requeue for retry
                auto_apply_job.status = AutoApplyStatus.QUEUED.value

            self.db.commit()
            raise

        self.db.commit()
        self.db.refresh(auto_apply_job)

        return AutoApplyJobResponse.model_validate(auto_apply_job)

    def _submit_application(self, auto_apply_job: AutoApplyJob) -> bool:
        """Submit job application to job board"""
        # This is a placeholder - actual implementation would integrate with
        # job board APIs (Greenhouse, Lever, etc.)

        job = auto_apply_job.job

        if not job:
            raise ServiceError("Job not found")

        # Validate job data
        if not self._validate_job_data(job):
            raise ValidationError("Invalid job data")

        # Create application record
        application = Application(
            id=uuid.uuid4(),
            user_id=auto_apply_job.user_id,
            job_id=job.id,
            resume_version_id=auto_apply_job.resume_version_id,
            cover_letter_id=auto_apply_job.cover_letter_id,
            status="applied",
            applied_at=datetime.utcnow(),
            is_auto_applied=True,
            application_mode="auto_apply",
        )

        self.db.add(application)
        auto_apply_job.application_id = application.id

        return True

    # Queue Management

    def get_queue(
        self,
        user_id: uuid.UUID,
        status: Optional[AutoApplyStatus] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> Dict:
        """Get user's auto-apply queue with pagination"""
        query = self.db.query(AutoApplyJob).filter(AutoApplyJob.user_id == user_id)

        if status:
            query = query.filter(AutoApplyJob.status == status.value)

        total = query.count()

        jobs = (
            query.order_by(AutoApplyJob.priority.desc(), AutoApplyJob.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        return {
            "total": total,
            "jobs": [AutoApplyJobResponse.model_validate(j) for j in jobs],
            "page": skip // limit + 1 if limit > 0 else 1,
            "page_size": limit,
            "has_more": (skip + limit) < total,
        }

    def cancel_job(
        self, user_id: uuid.UUID, auto_apply_job_id: str
    ) -> AutoApplyJobResponse:
        """Cancel a queued auto-apply job"""
        auto_apply_job = (
            self.db.query(AutoApplyJob)
            .filter(
                and_(
                    AutoApplyJob.id == uuid.UUID(auto_apply_job_id),
                    AutoApplyJob.user_id == user_id,
                )
            )
            .first()
        )

        if not auto_apply_job:
            raise NotFoundError("Auto-apply job not found")

        if auto_apply_job.status not in [
            AutoApplyStatus.QUEUED.value,
            AutoApplyStatus.PROCESSING.value,
        ]:
            raise ValidationError("Job cannot be cancelled - already processed")

        # Refund credit
        if not auto_apply_job.credits_refunded:
            self._refund_credit(
                user_id, auto_apply_job.id, "User cancelled application"
            )
            auto_apply_job.credits_refunded = True

        auto_apply_job.status = AutoApplyStatus.CANCELLED.value
        auto_apply_job.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(auto_apply_job)

        return AutoApplyJobResponse.model_validate(auto_apply_job)

    # Statistics

    def get_stats(self, user_id: uuid.UUID) -> AutoApplyStats:
        """Get user's auto-apply statistics"""
        # Count by status
        total_queued = (
            self.db.query(AutoApplyJob)
            .filter(
                and_(
                    AutoApplyJob.user_id == user_id,
                    AutoApplyJob.status == AutoApplyStatus.QUEUED.value,
                )
            )
            .count()
        )

        total_processing = (
            self.db.query(AutoApplyJob)
            .filter(
                and_(
                    AutoApplyJob.user_id == user_id,
                    AutoApplyJob.status == AutoApplyStatus.PROCESSING.value,
                )
            )
            .count()
        )

        total_applied = (
            self.db.query(AutoApplyJob)
            .filter(
                and_(
                    AutoApplyJob.user_id == user_id,
                    AutoApplyJob.status == AutoApplyStatus.APPLIED.value,
                )
            )
            .count()
        )

        total_failed = (
            self.db.query(AutoApplyJob)
            .filter(
                and_(
                    AutoApplyJob.user_id == user_id,
                    AutoApplyJob.status == AutoApplyStatus.FAILED.value,
                )
            )
            .count()
        )

        total_refunded = (
            self.db.query(AutoApplyJob)
            .filter(
                and_(
                    AutoApplyJob.user_id == user_id,
                    AutoApplyJob.status == AutoApplyStatus.REFUNDED.value,
                )
            )
            .count()
        )

        total_cancelled = (
            self.db.query(AutoApplyJob)
            .filter(
                and_(
                    AutoApplyJob.user_id == user_id,
                    AutoApplyJob.status == AutoApplyStatus.CANCELLED.value,
                )
            )
            .count()
        )

        # Get config for today's stats
        config = (
            self.db.query(AutoApplyConfig)
            .filter(AutoApplyConfig.user_id == user_id)
            .first()
        )

        credits_used_today = config.daily_application_count if config else 0
        credits_used_this_week = config.weekly_application_count if config else 0

        # Calculate success rate
        success_rate = self._calculate_success_rate(user_id)
        avg_fit_score = self._get_avg_fit_score(user_id)

        return AutoApplyStats(
            total_queued=total_queued,
            total_processing=total_processing,
            total_applied=total_applied,
            total_failed=total_failed,
            total_refunded=total_refunded,
            total_cancelled=total_cancelled,
            credits_used_today=credits_used_today,
            credits_used_this_week=credits_used_this_week,
            applications_today=credits_used_today,
            applications_this_week=credits_used_this_week,
            success_rate=success_rate,
            avg_fit_score=avg_fit_score,
            most_applied_companies=[],  # TODO: Implement
            most_common_errors=[],  # TODO: Implement
        )

    def _calculate_success_rate(self, user_id: uuid.UUID) -> float:
        """Calculate application success rate"""
        total = (
            self.db.query(AutoApplyJob).filter(AutoApplyJob.user_id == user_id).count()
        )

        if total == 0:
            return 0.0

        successful = (
            self.db.query(AutoApplyJob)
            .filter(
                and_(
                    AutoApplyJob.user_id == user_id,
                    AutoApplyJob.status == AutoApplyStatus.APPLIED.value,
                )
            )
            .count()
        )

        return (successful / total) * 100

    def _get_avg_fit_score(self, user_id: uuid.UUID) -> float:
        """Get average fit score of queued jobs"""
        result = (
            self.db.query(func.avg(AutoApplyJob.fit_score))
            .filter(AutoApplyJob.user_id == user_id)
            .scalar()
        )

        return float(result) if result else 0.0

    # Compliance and Validation

    def _check_tos_compliance(self, job: Job) -> bool:
        """Check if job board allows automated applications"""
        # Greenhouse and Lever both allow API-based applications
        allowed_sources = ["greenhouse", "lever"]

        return job.source in allowed_sources

    def _validate_job_data(self, job: Job) -> bool:
        """Validate that job has required data for application"""
        if not job.external_url:
            return False

        if not job.company:
            return False

        if not job.title:
            return False

        return True
