"""Celery application configuration"""
from celery import Celery
from app.core.config import settings

# Create Celery app
celery_app = Celery(
    "hireflux",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.workers.auto_apply_worker"],
)

# Configure Celery
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 minutes max per task
    task_soft_time_limit=240,  # 4 minute soft limit
    worker_prefetch_multiplier=1,  # Process one task at a time
    task_acks_late=True,  # Acknowledge task after completion
    task_reject_on_worker_lost=True,
    # Retry configuration
    task_autoretry_for=(Exception,),
    task_retry_kwargs={"max_retries": 3, "countdown": 60},  # Retry after 1 minute
    # Rate limiting
    task_default_rate_limit="10/m",  # 10 tasks per minute
    # Result backend
    result_expires=3600,  # Results expire after 1 hour
    # Beat schedule for periodic tasks
    beat_schedule={
        "process-queued-jobs": {
            "task": "app.workers.auto_apply_worker.process_queued_jobs",
            "schedule": 300.0,  # Run every 5 minutes
        },
        "cleanup-old-jobs": {
            "task": "app.workers.auto_apply_worker.cleanup_old_jobs",
            "schedule": 86400.0,  # Run daily
        },
    },
)
