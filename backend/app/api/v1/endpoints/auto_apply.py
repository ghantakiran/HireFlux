"""Auto-apply API endpoints"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import uuid

from app.api.deps import get_db, get_current_user
from app.db.models.user import User
from app.services.auto_apply_service import AutoApplyService
from app.schemas.auto_apply import (
    AutoApplyConfigCreate,
    AutoApplyConfigUpdate,
    AutoApplyConfigResponse,
    AutoApplyJobCreate,
    AutoApplyJobUpdate,
    AutoApplyJobResponse,
    AutoApplyJobDetailResponse,
    AutoApplyBatchCreate,
    AutoApplyBatchResponse,
    RefundRequest,
    RefundResponse,
    AutoApplyStats,
    AutoApplyStatus,
    QueueResponse,
)
from app.core.exceptions import NotFoundError, ValidationError
from app.workers.auto_apply_worker import process_single_job

router = APIRouter(prefix="/auto-apply", tags=["auto-apply"])


# Configuration Endpoints


@router.post("/config", response_model=AutoApplyConfigResponse)
def create_auto_apply_config(
    config_data: AutoApplyConfigCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create auto-apply configuration for user"""
    try:
        service = AutoApplyService(db)
        return service.create_config(current_user.id, config_data)
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/config", response_model=AutoApplyConfigResponse)
def get_auto_apply_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user's auto-apply configuration"""
    service = AutoApplyService(db)
    return service.get_config(current_user.id)


@router.patch("/config", response_model=AutoApplyConfigResponse)
def update_auto_apply_config(
    updates: AutoApplyConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update auto-apply configuration"""
    try:
        service = AutoApplyService(db)
        return service.update_config(current_user.id, updates)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/config/disable", response_model=AutoApplyConfigResponse)
def disable_auto_apply(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Disable auto-apply"""
    try:
        service = AutoApplyService(db)
        return service.disable_auto_apply(current_user.id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/config/pause", response_model=AutoApplyConfigResponse)
def pause_auto_apply(
    hours: int = Query(
        ..., ge=1, le=168, description="Pause duration in hours (1-168)"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pause auto-apply for specified hours"""
    from datetime import datetime, timedelta

    try:
        service = AutoApplyService(db)
        pause_until = datetime.utcnow() + timedelta(hours=hours)
        return service.pause_auto_apply(current_user.id, pause_until)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# Job Queue Endpoints


@router.post("/queue", response_model=AutoApplyJobResponse)
def queue_job_for_auto_apply(
    job_data: AutoApplyJobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Queue a job for auto-apply"""
    try:
        service = AutoApplyService(db)
        result = service.queue_job(current_user.id, job_data)

        # Trigger background processing if auto-apply mode
        config = service.get_config(current_user.id)
        if config.mode == "auto_apply" and config.enabled:
            process_single_job.delay(str(result.id))

        return result
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/queue/batch", response_model=AutoApplyBatchResponse)
def batch_queue_jobs(
    batch_data: AutoApplyBatchCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Queue multiple jobs for auto-apply"""
    service = AutoApplyService(db)
    result = service.batch_queue_jobs(
        current_user.id, batch_data.job_ids, batch_data.priority
    )

    return AutoApplyBatchResponse(
        total_queued=len(batch_data.job_ids),
        successful=result["successful"],
        failed=result["failed"],
        errors=result["errors"],
        queued_job_ids=result["queued_job_ids"],
    )


@router.get("/queue", response_model=QueueResponse)
def get_auto_apply_queue(
    status_filter: Optional[AutoApplyStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user's auto-apply queue"""
    service = AutoApplyService(db)
    result = service.get_queue(current_user.id, status_filter, skip, limit)

    return QueueResponse(
        total=result["total"],
        jobs=result["jobs"],
        page=result["page"],
        page_size=result["page_size"],
        has_more=result["has_more"],
    )


@router.get("/queue/{job_id}", response_model=AutoApplyJobDetailResponse)
def get_auto_apply_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get detailed information about an auto-apply job"""
    from app.db.models.auto_apply import AutoApplyJob
    from sqlalchemy import and_

    try:
        auto_apply_job = (
            db.query(AutoApplyJob)
            .filter(
                and_(
                    AutoApplyJob.id == uuid.UUID(job_id),
                    AutoApplyJob.user_id == current_user.id,
                )
            )
            .first()
        )

        if not auto_apply_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Auto-apply job not found"
            )

        return AutoApplyJobDetailResponse.model_validate(auto_apply_job)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid job ID"
        )


@router.patch("/queue/{job_id}", response_model=AutoApplyJobResponse)
def update_auto_apply_job(
    job_id: str,
    updates: AutoApplyJobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update an auto-apply job (e.g., approve it in apply_assist mode)"""
    from app.db.models.auto_apply import AutoApplyJob
    from sqlalchemy import and_

    try:
        auto_apply_job = (
            db.query(AutoApplyJob)
            .filter(
                and_(
                    AutoApplyJob.id == uuid.UUID(job_id),
                    AutoApplyJob.user_id == current_user.id,
                )
            )
            .first()
        )

        if not auto_apply_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Auto-apply job not found"
            )

        # Update fields
        update_data = updates.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                if field == "status" and hasattr(value, "value"):
                    value = value.value
                setattr(auto_apply_job, field, value)

        db.commit()
        db.refresh(auto_apply_job)

        # If job was approved, trigger processing
        if updates.user_approved:
            process_single_job.delay(str(auto_apply_job.id))

        return AutoApplyJobResponse.model_validate(auto_apply_job)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid job ID"
        )


@router.delete("/queue/{job_id}", response_model=AutoApplyJobResponse)
def cancel_auto_apply_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel a queued auto-apply job"""
    try:
        service = AutoApplyService(db)
        return service.cancel_job(current_user.id, job_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# Refund Endpoints


@router.post("/queue/{job_id}/refund", response_model=RefundResponse)
def request_refund_for_job(
    job_id: str,
    refund_request: RefundRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Request credit refund for failed/invalid application"""
    try:
        service = AutoApplyService(db)
        return service.request_refund(current_user.id, job_id, refund_request)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# Statistics Endpoints


@router.get("/stats", response_model=AutoApplyStats)
def get_auto_apply_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get user's auto-apply statistics"""
    service = AutoApplyService(db)
    return service.get_stats(current_user.id)


# Manual Processing Endpoints (for testing/admin)


@router.post("/queue/{job_id}/process")
def manually_process_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger processing of an auto-apply job (for testing)"""
    from app.db.models.auto_apply import AutoApplyJob
    from sqlalchemy import and_

    try:
        # Verify job belongs to user
        auto_apply_job = (
            db.query(AutoApplyJob)
            .filter(
                and_(
                    AutoApplyJob.id == uuid.UUID(job_id),
                    AutoApplyJob.user_id == current_user.id,
                )
            )
            .first()
        )

        if not auto_apply_job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Auto-apply job not found"
            )

        # Trigger background task
        task = process_single_job.delay(job_id)

        return {
            "message": "Job queued for processing",
            "job_id": job_id,
            "task_id": task.id,
        }
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid job ID"
        )
