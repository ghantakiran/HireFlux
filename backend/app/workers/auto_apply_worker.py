"""Celery worker tasks for auto-apply processing"""
import logging
from datetime import datetime, timedelta
from typing import List
import uuid

from app.core.celery_app import celery_app
from app.db.session import SessionLocal
from app.services.auto_apply_service import AutoApplyService
from app.services.notification_service import NotificationService
from app.db.models.auto_apply import AutoApplyJob, AutoApplyConfig
from app.schemas.auto_apply import AutoApplyStatus
from app.schemas.notification import NotificationCreate, NotificationType
from sqlalchemy import and_

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="app.workers.auto_apply_worker.process_single_job")
def process_single_job(self, auto_apply_job_id: str):
    """Process a single auto-apply job"""
    db = SessionLocal()
    auto_apply_service = AutoApplyService(db)
    notification_service = NotificationService()

    try:
        logger.info(f"Processing auto-apply job {auto_apply_job_id}")

        # Process the job
        result = auto_apply_service.process_job(auto_apply_job_id)

        # Send success notification if enabled
        auto_apply_job = (
            db.query(AutoApplyJob)
            .filter(AutoApplyJob.id == uuid.UUID(auto_apply_job_id))
            .first()
        )

        if auto_apply_job:
            config = (
                db.query(AutoApplyConfig)
                .filter(AutoApplyConfig.user_id == auto_apply_job.user_id)
                .first()
            )

            if config and config.notify_on_apply:
                # Get user
                user = auto_apply_job.user

                notification = NotificationCreate(
                    type=NotificationType.APPLICATION_STATUS,
                    title="Application Submitted",
                    message=f"Successfully applied to {auto_apply_job.company_name} - {auto_apply_job.job.title}",
                    action_url=f"/dashboard/applications/{auto_apply_job.application_id}",
                    metadata={
                        "auto_apply_job_id": str(auto_apply_job.id),
                        "job_id": str(auto_apply_job.job_id),
                        "company": auto_apply_job.company_name,
                    },
                )

                notification_service.create_notification(db, user, notification)

        logger.info(f"Successfully processed job {auto_apply_job_id}")
        return {"success": True, "job_id": auto_apply_job_id}

    except Exception as e:
        logger.error(f"Failed to process job {auto_apply_job_id}: {str(e)}")

        # Send error notification if enabled
        try:
            auto_apply_job = (
                db.query(AutoApplyJob)
                .filter(AutoApplyJob.id == uuid.UUID(auto_apply_job_id))
                .first()
            )

            if auto_apply_job:
                config = (
                    db.query(AutoApplyConfig)
                    .filter(AutoApplyConfig.user_id == auto_apply_job.user_id)
                    .first()
                )

                if config and config.notify_on_error:
                    user = auto_apply_job.user

                    notification = NotificationCreate(
                        type=NotificationType.SYSTEM_ALERT,
                        title="Application Failed",
                        message=f"Failed to apply to {auto_apply_job.company_name} - {auto_apply_job.job.title}: {str(e)}",
                        action_url=f"/dashboard/auto-apply",
                        metadata={
                            "auto_apply_job_id": str(auto_apply_job.id),
                            "error": str(e),
                        },
                    )

                    notification_service.create_notification(db, user, notification)
        except Exception as notif_error:
            logger.error(f"Failed to send error notification: {str(notif_error)}")

        raise

    finally:
        db.close()


@celery_app.task(name="app.workers.auto_apply_worker.process_queued_jobs")
def process_queued_jobs():
    """Process all queued auto-apply jobs (periodic task)"""
    db = SessionLocal()

    try:
        logger.info("Processing queued auto-apply jobs")

        # Get all queued jobs, ordered by priority and creation time
        queued_jobs = (
            db.query(AutoApplyJob)
            .filter(AutoApplyJob.status == AutoApplyStatus.QUEUED.value)
            .order_by(AutoApplyJob.priority.desc(), AutoApplyJob.created_at.asc())
            .limit(100)  # Process up to 100 jobs per run
            .all()
        )

        logger.info(f"Found {len(queued_jobs)} queued jobs")

        # Check if users have auto-apply enabled and not paused
        processed = 0
        for job in queued_jobs:
            config = (
                db.query(AutoApplyConfig)
                .filter(AutoApplyConfig.user_id == job.user_id)
                .first()
            )

            if not config or not config.enabled:
                logger.info(
                    f"Skipping job {job.id} - auto-apply disabled for user {job.user_id}"
                )
                continue

            if config.pause_until and config.pause_until > datetime.utcnow():
                logger.info(
                    f"Skipping job {job.id} - auto-apply paused until {config.pause_until}"
                )
                continue

            # For apply_assist mode, require user approval
            if config.mode == "apply_assist" and not job.user_approved:
                logger.info(
                    f"Skipping job {job.id} - requires user approval in apply_assist mode"
                )
                continue

            # Queue job for processing
            process_single_job.delay(str(job.id))
            processed += 1

        logger.info(f"Queued {processed} jobs for processing")
        return {"queued": processed, "total": len(queued_jobs)}

    except Exception as e:
        logger.error(f"Error in process_queued_jobs: {str(e)}")
        raise

    finally:
        db.close()


@celery_app.task(name="app.workers.auto_apply_worker.cleanup_old_jobs")
def cleanup_old_jobs():
    """Clean up old completed/failed jobs (periodic task)"""
    db = SessionLocal()

    try:
        logger.info("Cleaning up old auto-apply jobs")

        # Delete jobs older than 90 days
        cutoff_date = datetime.utcnow() - timedelta(days=90)

        deleted = (
            db.query(AutoApplyJob)
            .filter(
                and_(
                    AutoApplyJob.created_at < cutoff_date,
                    AutoApplyJob.status.in_(
                        [
                            AutoApplyStatus.APPLIED.value,
                            AutoApplyStatus.FAILED.value,
                            AutoApplyStatus.CANCELLED.value,
                            AutoApplyStatus.REFUNDED.value,
                        ]
                    ),
                )
            )
            .delete()
        )

        db.commit()

        logger.info(f"Deleted {deleted} old auto-apply jobs")
        return {"deleted": deleted}

    except Exception as e:
        logger.error(f"Error in cleanup_old_jobs: {str(e)}")
        db.rollback()
        raise

    finally:
        db.close()


@celery_app.task(name="app.workers.auto_apply_worker.retry_failed_jobs")
def retry_failed_jobs():
    """Retry failed jobs that haven't exceeded max attempts"""
    db = SessionLocal()

    try:
        logger.info("Retrying failed auto-apply jobs")

        # Get failed jobs that can be retried
        failed_jobs = (
            db.query(AutoApplyJob)
            .filter(
                and_(
                    AutoApplyJob.status == AutoApplyStatus.FAILED.value,
                    AutoApplyJob.attempts < AutoApplyJob.max_attempts,
                    AutoApplyJob.last_error_at
                    > datetime.utcnow() - timedelta(hours=24),  # Failed in last 24h
                )
            )
            .limit(50)
            .all()
        )

        logger.info(f"Found {len(failed_jobs)} failed jobs to retry")

        retried = 0
        for job in failed_jobs:
            # Reset status to queued
            job.status = AutoApplyStatus.QUEUED.value
            db.commit()

            # Queue for processing
            process_single_job.delay(str(job.id))
            retried += 1

        logger.info(f"Queued {retried} failed jobs for retry")
        return {"retried": retried}

    except Exception as e:
        logger.error(f"Error in retry_failed_jobs: {str(e)}")
        raise

    finally:
        db.close()


@celery_app.task(
    bind=True,
    name="app.workers.auto_apply_worker.batch_process_jobs",
    max_retries=3,
)
def batch_process_jobs(self, job_ids: List[str]):
    """Process multiple jobs in batch"""
    db = SessionLocal()

    try:
        logger.info(f"Batch processing {len(job_ids)} jobs")

        results = {"successful": 0, "failed": 0, "errors": []}

        for job_id in job_ids:
            try:
                process_single_job.delay(job_id)
                results["successful"] += 1
            except Exception as e:
                results["failed"] += 1
                results["errors"].append(f"Job {job_id}: {str(e)}")
                logger.error(f"Failed to queue job {job_id}: {str(e)}")

        logger.info(
            f"Batch processing complete: {results['successful']} successful, {results['failed']} failed"
        )
        return results

    except Exception as e:
        logger.error(f"Error in batch_process_jobs: {str(e)}")
        raise

    finally:
        db.close()
