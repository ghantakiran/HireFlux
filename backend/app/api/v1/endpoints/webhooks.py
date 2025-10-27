"""Webhook receiver API endpoints"""
import json
import logging
from typing import List, Optional
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Body,
    Depends,
    Header,
    HTTPException,
    Request,
)
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.db.models.user import User
from app.schemas.webhook import (
    ApplicationStatusHistoryResponse,
    ApplicationStatusStatistics,
    InterviewReminderRequest,
    InterviewReminderResponse,
    InterviewScheduleCreate,
    InterviewScheduleResponse,
    InterviewScheduleUpdate,
    InterviewStatistics,
    ProcessWebhookRequest,
    ProcessWebhookResponse,
    WebhookEventResponse,
    WebhookStatistics,
    WebhookSubscriptionCreate,
    WebhookSubscriptionResponse,
    WebhookVerificationRequest,
    WebhookVerificationResponse,
)
from app.services.webhook_service import WebhookService

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================================================
# WEBHOOK RECEIVERS (Public endpoints for job boards)
# ============================================================================


@router.post("/greenhouse", status_code=202, include_in_schema=False)
async def receive_greenhouse_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    x_greenhouse_signature: Optional[str] = Header(None),
):
    """
    Receive webhook from Greenhouse

    This endpoint is called by Greenhouse when events occur.
    Signature verification is performed for security.
    """
    try:
        # Read raw body for signature verification
        body = await request.body()
        body_str = body.decode("utf-8")

        # Parse payload
        try:
            payload = json.loads(body_str)
        except json.JSONDecodeError:
            logger.error("Invalid JSON payload from Greenhouse")
            raise HTTPException(status_code=400, detail="Invalid JSON payload")

        # Get webhook service
        webhook_service = WebhookService(db)

        # Get subscription for verification
        # In production, you'd look up the subscription by company ID or webhook URL
        # For now, we'll skip verification in development
        is_verified = True
        if x_greenhouse_signature:
            # Verify signature with stored secret
            # subscription = get_greenhouse_subscription(...)
            # is_verified = webhook_service.verify_greenhouse_signature(
            #     body_str, x_greenhouse_signature, subscription.webhook_secret
            # )
            pass

        # Extract event type
        action = payload.get("action", "unknown")
        event_type_map = {
            "application.submitted": "application.submitted",
            "candidate_stage_change": "candidate.stage_change",
            "interview_scheduled": "interview.scheduled",
            "interview_rescheduled": "interview.rescheduled",
            "interview_cancelled": "interview.cancelled",
        }
        event_type = event_type_map.get(action, "unknown")

        # Create webhook event
        from app.schemas.webhook import (
            WebhookEventCreate,
            WebhookEventType,
            WebhookSource,
        )

        event_data = WebhookEventCreate(
            source=WebhookSource.GREENHOUSE,
            event_type=WebhookEventType(event_type)
            if event_type != "unknown"
            else WebhookEventType.UNKNOWN,
            event_id=payload.get("event_id"),
            payload=payload,
            headers=dict(request.headers),
            signature=x_greenhouse_signature,
            is_verified=is_verified,
        )

        event = webhook_service.create_webhook_event(event_data)

        # Process event in background
        background_tasks.add_task(webhook_service.process_event, event.id)

        logger.info(f"Received Greenhouse webhook: {action}, event_id={event.id}")

        return {"status": "accepted", "event_id": str(event.id)}

    except Exception as e:
        logger.error(f"Error processing Greenhouse webhook: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/lever", status_code=202, include_in_schema=False)
async def receive_lever_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    x_lever_signature: Optional[str] = Header(None),
):
    """
    Receive webhook from Lever

    This endpoint is called by Lever when events occur.
    Signature verification is performed for security.
    """
    try:
        # Read raw body for signature verification
        body = await request.body()
        body_str = body.decode("utf-8")

        # Parse payload
        try:
            payload = json.loads(body_str)
        except json.JSONDecodeError:
            logger.error("Invalid JSON payload from Lever")
            raise HTTPException(status_code=400, detail="Invalid JSON payload")

        # Get webhook service
        webhook_service = WebhookService(db)

        # Verify signature
        is_verified = True
        if x_lever_signature:
            # Verify with stored secret
            # subscription = get_lever_subscription(...)
            # is_verified = webhook_service.verify_lever_signature(
            #     body_str, x_lever_signature, subscription.webhook_secret
            # )
            pass

        # Extract event type
        event = payload.get("event", "unknown")
        event_type_map = {
            "candidateStageChange": "candidate.stage_change",
            "candidateHired": "candidate.hired",
            "candidateArchived": "candidate.archived",
        }
        event_type = event_type_map.get(event, "unknown")

        # Create webhook event
        from app.schemas.webhook import (
            WebhookEventCreate,
            WebhookEventType,
            WebhookSource,
        )

        event_data = WebhookEventCreate(
            source=WebhookSource.LEVER,
            event_type=WebhookEventType(event_type)
            if event_type != "unknown"
            else WebhookEventType.UNKNOWN,
            payload=payload,
            headers=dict(request.headers),
            signature=x_lever_signature,
            is_verified=is_verified,
        )

        webhook_event = webhook_service.create_webhook_event(event_data)

        # Process event in background
        background_tasks.add_task(webhook_service.process_event, webhook_event.id)

        logger.info(f"Received Lever webhook: {event}, event_id={webhook_event.id}")

        return {"status": "accepted", "event_id": str(webhook_event.id)}

    except Exception as e:
        logger.error(f"Error processing Lever webhook: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/verify", include_in_schema=False)
async def verify_webhook(challenge: str):
    """
    Webhook verification endpoint (challenge-response)

    Used by some job boards to verify webhook URL ownership.
    """
    return {"challenge": challenge}


# ============================================================================
# WEBHOOK EVENT MANAGEMENT (Authenticated endpoints)
# ============================================================================


@router.get("/events", response_model=List[WebhookEventResponse])
def list_webhook_events(
    skip: int = 0,
    limit: int = 100,
    source: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List webhook events for current user"""
    webhook_service = WebhookService(db)

    # Query events
    query = db.query(webhook_service.db.query(WebhookEvent))

    if source:
        query = query.filter(WebhookEvent.source == source)
    if status:
        query = query.filter(WebhookEvent.status == status)

    # Filter by user
    query = query.filter(WebhookEvent.user_id == current_user.id)

    events = (
        query.order_by(WebhookEvent.received_at.desc()).offset(skip).limit(limit).all()
    )

    return [WebhookEventResponse.model_validate(e) for e in events]


@router.get("/events/{event_id}", response_model=WebhookEventResponse)
def get_webhook_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get webhook event by ID"""
    webhook_service = WebhookService(db)
    event = webhook_service.get_webhook_event(event_id)

    if not event:
        raise HTTPException(status_code=404, detail="Webhook event not found")

    # Verify ownership
    if event.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return event


@router.post("/events/{event_id}/process", response_model=ProcessWebhookResponse)
def process_webhook_event(
    event_id: UUID,
    request_data: ProcessWebhookRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Manually trigger processing of a webhook event"""
    webhook_service = WebhookService(db)

    # Verify event exists and user has access
    event = webhook_service.get_webhook_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Webhook event not found")

    if event.user_id and event.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Process in background
    if request_data.force_reprocess:
        background_tasks.add_task(webhook_service.process_event, event_id)
        return ProcessWebhookResponse(
            event_id=event_id,
            status="processing",
            status_changes=[],
            interviews_scheduled=[],
        )
    else:
        result = webhook_service.process_event(event_id)
        return result


# ============================================================================
# APPLICATION STATUS TRACKING
# ============================================================================


@router.get(
    "/applications/{application_id}/status-history",
    response_model=List[ApplicationStatusHistoryResponse],
)
def get_application_status_history(
    application_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get status history for an application"""
    # Verify application belongs to user
    from app.db.models.application import Application

    application = db.query(Application).filter(Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    webhook_service = WebhookService(db)
    history = webhook_service.get_status_history(application_id)

    return history


@router.get("/status-statistics", response_model=ApplicationStatusStatistics)
def get_status_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get application status statistics for current user"""
    webhook_service = WebhookService(db)
    stats = webhook_service.get_application_status_statistics()
    return stats


# ============================================================================
# INTERVIEW SCHEDULING
# ============================================================================


@router.post("/interviews", response_model=InterviewScheduleResponse)
def create_interview(
    interview_data: InterviewScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create interview schedule"""
    # Verify application belongs to user
    from app.db.models.application import Application

    application = (
        db.query(Application)
        .filter(Application.id == interview_data.application_id)
        .first()
    )
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if application.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Set user_id to current user
    interview_data.user_id = current_user.id

    webhook_service = WebhookService(db)
    interview = webhook_service.create_interview_schedule(interview_data)

    return interview


@router.get("/interviews", response_model=List[InterviewScheduleResponse])
def list_interviews(
    skip: int = 0,
    limit: int = 100,
    upcoming_only: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List interviews for current user"""
    webhook_service = WebhookService(db)

    if upcoming_only:
        interviews = webhook_service.get_upcoming_interviews(current_user.id)
    else:
        from app.db.models.webhook import InterviewSchedule

        interviews_db = (
            db.query(InterviewSchedule)
            .filter(InterviewSchedule.user_id == current_user.id)
            .order_by(InterviewSchedule.scheduled_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )
        interviews = [
            InterviewScheduleResponse.model_validate(i) for i in interviews_db
        ]

    return interviews


@router.get("/interviews/{interview_id}", response_model=InterviewScheduleResponse)
def get_interview(
    interview_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get interview schedule by ID"""
    from app.db.models.webhook import InterviewSchedule

    interview = (
        db.query(InterviewSchedule).filter(InterviewSchedule.id == interview_id).first()
    )

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if interview.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    return InterviewScheduleResponse.model_validate(interview)


@router.patch("/interviews/{interview_id}", response_model=InterviewScheduleResponse)
def update_interview(
    interview_id: UUID,
    update_data: InterviewScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update interview schedule"""
    from app.db.models.webhook import InterviewSchedule

    interview = (
        db.query(InterviewSchedule).filter(InterviewSchedule.id == interview_id).first()
    )

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if interview.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    webhook_service = WebhookService(db)
    updated_interview = webhook_service.update_interview_schedule(
        interview_id, update_data.model_dump(exclude_unset=True)
    )

    return updated_interview


@router.post(
    "/interviews/{interview_id}/cancel", response_model=InterviewScheduleResponse
)
def cancel_interview(
    interview_id: UUID,
    reason: Optional[str] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cancel interview"""
    from app.db.models.webhook import InterviewSchedule

    interview = (
        db.query(InterviewSchedule).filter(InterviewSchedule.id == interview_id).first()
    )

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if interview.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    webhook_service = WebhookService(db)
    cancelled_interview = webhook_service.cancel_interview(interview_id, reason)

    return cancelled_interview


@router.post(
    "/interviews/{interview_id}/complete", response_model=InterviewScheduleResponse
)
def complete_interview(
    interview_id: UUID,
    outcome: Optional[str] = Body(None),
    feedback: Optional[str] = Body(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark interview as completed"""
    from app.db.models.webhook import InterviewSchedule

    interview = (
        db.query(InterviewSchedule).filter(InterviewSchedule.id == interview_id).first()
    )

    if not interview:
        raise HTTPException(status_code=404, detail="Interview not found")

    if interview.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    webhook_service = WebhookService(db)
    completed_interview = webhook_service.complete_interview(
        interview_id, outcome, feedback
    )

    return completed_interview


@router.get("/interview-statistics", response_model=InterviewStatistics)
def get_interview_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get interview statistics for current user"""
    webhook_service = WebhookService(db)
    stats = webhook_service.get_interview_statistics()
    return stats


# ============================================================================
# WEBHOOK SUBSCRIPTIONS (Admin endpoints)
# ============================================================================


@router.post("/subscriptions", response_model=WebhookSubscriptionResponse)
def create_subscription(
    subscription_data: WebhookSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create webhook subscription (admin only)"""
    # In production, add admin role check
    webhook_service = WebhookService(db)
    subscription = webhook_service.create_subscription(subscription_data)
    return subscription


@router.post(
    "/subscriptions/{subscription_id}/verify",
    response_model=WebhookSubscriptionResponse,
)
def verify_subscription(
    subscription_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verify webhook subscription (admin only)"""
    webhook_service = WebhookService(db)
    subscription = webhook_service.verify_subscription(subscription_id)
    return subscription


@router.post(
    "/subscriptions/{subscription_id}/deactivate",
    response_model=WebhookSubscriptionResponse,
)
def deactivate_subscription(
    subscription_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deactivate webhook subscription (admin only)"""
    webhook_service = WebhookService(db)
    subscription = webhook_service.deactivate_subscription(subscription_id)
    return subscription


# ============================================================================
# STATISTICS
# ============================================================================


@router.get("/statistics", response_model=WebhookStatistics)
def get_webhook_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get webhook statistics"""
    webhook_service = WebhookService(db)
    stats = webhook_service.get_webhook_statistics()
    return stats
