"""Webhook service for job board integrations"""

import hashlib
import hmac
import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, desc, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models.application import Application
from app.db.models.webhook import (
    ApplicationStatusHistory,
    InterviewSchedule,
    WebhookEvent,
    WebhookSubscription,
)
from app.schemas.webhook import (
    ApplicationStatus,
    ApplicationStatusHistoryCreate,
    ApplicationStatusHistoryResponse,
    ApplicationStatusStatistics,
    ConfirmationStatus,
    InterviewScheduleCreate,
    InterviewScheduleResponse,
    InterviewStatistics,
    InterviewStatus,
    InterviewType,
    ProcessWebhookResponse,
    StatusChangeSource,
    WebhookEventCreate,
    WebhookEventResponse,
    WebhookEventStatus,
    WebhookEventType,
    WebhookSource,
    WebhookStatistics,
    WebhookSubscriptionCreate,
    WebhookSubscriptionResponse,
)

logger = logging.getLogger(__name__)


class WebhookService:
    """Service for managing webhook events and integrations"""

    def __init__(self, db: Session):
        self.db = db

    # =========================================================================
    # WEBHOOK EVENT MANAGEMENT
    # =========================================================================

    def create_webhook_event(
        self, event_data: WebhookEventCreate
    ) -> WebhookEventResponse:
        """Create a new webhook event"""
        # Check for duplicate event_id
        if event_data.event_id:
            existing = (
                self.db.query(WebhookEvent)
                .filter(
                    and_(
                        WebhookEvent.source == event_data.source,
                        WebhookEvent.event_id == event_data.event_id,
                    )
                )
                .first()
            )
            if existing:
                raise ValueError(f"Event {event_data.event_id} already processed")

        # Create event
        event = WebhookEvent(
            source=event_data.source,
            event_type=event_data.event_type,
            event_id=event_data.event_id,
            payload=event_data.payload,
            headers=event_data.headers,
            signature=event_data.signature,
            is_verified=event_data.is_verified,
            status=WebhookEventStatus.PENDING,
        )

        self.db.add(event)
        self.db.commit()
        self.db.refresh(event)

        logger.info(
            f"Created webhook event {event.id} from {event_data.source} "
            f"type={event_data.event_type}"
        )

        return WebhookEventResponse.model_validate(event)

    def get_webhook_event(self, event_id: uuid.UUID) -> Optional[WebhookEventResponse]:
        """Get webhook event by ID"""
        event = self.db.query(WebhookEvent).filter(WebhookEvent.id == event_id).first()
        if not event:
            return None
        return WebhookEventResponse.model_validate(event)

    def process_event(self, event_id: uuid.UUID) -> ProcessWebhookResponse:
        """Process a webhook event"""
        event = self.db.query(WebhookEvent).filter(WebhookEvent.id == event_id).first()
        if not event:
            raise ValueError(f"Webhook event {event_id} not found")

        # Check if already processed
        if event.status == WebhookEventStatus.PROCESSED:
            raise ValueError(
                f"Event {event_id} already processed at {event.processed_at}"
            )

        # Check retry limit
        if event.retry_count >= event.max_retries:
            raise ValueError(
                f"Event {event_id} exceeded max retries ({event.max_retries})"
            )

        # Update status to processing
        event.status = WebhookEventStatus.PROCESSING
        self.db.commit()

        status_changes: List[ApplicationStatusHistoryResponse] = []
        interviews_scheduled: List[InterviewScheduleResponse] = []
        error_message = None

        try:
            # Route to appropriate processor
            if event.source == WebhookSource.GREENHOUSE:
                result = self._process_greenhouse_event(event)
            elif event.source == WebhookSource.LEVER:
                result = self._process_lever_event(event)
            else:
                raise ValueError(f"Unsupported webhook source: {event.source}")

            status_changes = result.get("status_changes", [])
            interviews_scheduled = result.get("interviews_scheduled", [])

            # Mark as processed
            event.status = WebhookEventStatus.PROCESSED
            event.processed_at = datetime.utcnow()

            logger.info(f"Successfully processed webhook event {event_id}")

        except Exception as e:
            error_message = str(e)
            event.status = WebhookEventStatus.FAILED
            event.error_message = error_message
            event.retry_count += 1

            logger.error(f"Failed to process webhook event {event_id}: {e}")

            if event.retry_count < event.max_retries:
                event.status = WebhookEventStatus.RETRY_SCHEDULED

        self.db.commit()
        self.db.refresh(event)

        return ProcessWebhookResponse(
            event_id=event.id,
            status=event.status,
            processed_at=event.processed_at,
            application_id=event.application_id,
            status_changes=status_changes,
            interviews_scheduled=interviews_scheduled,
            error_message=error_message,
        )

    # =========================================================================
    # SIGNATURE VERIFICATION
    # =========================================================================

    def verify_greenhouse_signature(
        self, payload: str, signature: str, secret: Optional[str]
    ) -> bool:
        """Verify Greenhouse webhook signature"""
        if not secret:
            logger.warning("No webhook secret provided for Greenhouse verification")
            return False

        try:
            expected_signature = hmac.new(
                secret.encode(), payload.encode(), hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(signature, expected_signature)
        except Exception as e:
            logger.error(f"Error verifying Greenhouse signature: {e}")
            return False

    def verify_lever_signature(
        self, payload: str, signature: str, secret: Optional[str]
    ) -> bool:
        """Verify Lever webhook signature"""
        if not secret:
            logger.warning("No webhook secret provided for Lever verification")
            return False

        try:
            expected_signature = hmac.new(
                secret.encode(), payload.encode(), hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(signature, expected_signature)
        except Exception as e:
            logger.error(f"Error verifying Lever signature: {e}")
            return False

    # =========================================================================
    # GREENHOUSE EVENT PROCESSING
    # =========================================================================

    def _process_greenhouse_event(self, event: WebhookEvent) -> Dict[str, Any]:
        """Process Greenhouse webhook event"""
        result = {"status_changes": [], "interviews_scheduled": []}

        if event.event_type == WebhookEventType.APPLICATION_SUBMITTED:
            parsed = self._parse_greenhouse_payload(event.event_type, event.payload)
            application = self._find_or_create_application(
                parsed, WebhookSource.GREENHOUSE
            )
            event.application_id = application.id
            event.user_id = application.user_id

        elif event.event_type == WebhookEventType.CANDIDATE_STAGE_CHANGE:
            parsed = self._parse_greenhouse_payload(event.event_type, event.payload)
            application = self._find_application_by_external_id(
                parsed["application_id"], WebhookSource.GREENHOUSE
            )

            if application:
                new_status = self._map_greenhouse_stage_to_status(parsed["new_stage"])
                status_change = self.update_application_status(
                    application.id, new_status, StatusChangeSource.WEBHOOK
                )
                if status_change:
                    result["status_changes"].append(
                        ApplicationStatusHistoryResponse.model_validate(status_change)
                    )
                event.application_id = application.id
                event.user_id = application.user_id

        elif event.event_type == WebhookEventType.INTERVIEW_SCHEDULED:
            interview = self._process_interview_scheduled(event)
            if interview:
                result["interviews_scheduled"].append(
                    InterviewScheduleResponse.model_validate(interview)
                )

        elif event.event_type == WebhookEventType.INTERVIEW_RESCHEDULED:
            interview = self._process_interview_rescheduled(event)
            if interview:
                result["interviews_scheduled"].append(
                    InterviewScheduleResponse.model_validate(interview)
                )

        elif event.event_type == WebhookEventType.INTERVIEW_CANCELLED:
            interview = self._process_interview_cancelled(event)
            if interview:
                result["interviews_scheduled"].append(
                    InterviewScheduleResponse.model_validate(interview)
                )

        return result

    def _parse_greenhouse_payload(
        self, event_type: WebhookEventType, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Parse Greenhouse webhook payload"""
        parsed = {}

        if "payload" in payload:
            data = payload["payload"]
        else:
            data = payload

        # Extract candidate info
        if "candidate" in data:
            candidate = data["candidate"]
            parsed["candidate_email"] = candidate.get("email")
            parsed["candidate_name"] = (
                f"{candidate.get('first_name', '')} {candidate.get('last_name', '')}".strip()
            )

        # Extract application info
        if "application" in data:
            application = data["application"]
            parsed["application_id"] = application.get("id")
            parsed["current_stage"] = application.get("current_stage")

        # Extract stage info
        if "stage" in data:
            stage = data["stage"]
            parsed["new_stage"] = stage.get("name")

        return parsed

    def _map_greenhouse_stage_to_status(self, stage_name: str) -> ApplicationStatus:
        """Map Greenhouse stage name to internal status"""
        stage_lower = stage_name.lower()

        if "phone" in stage_lower or "screening" in stage_lower:
            return ApplicationStatus.PHONE_SCREEN
        elif "technical" in stage_lower or "coding" in stage_lower:
            return ApplicationStatus.TECHNICAL_INTERVIEW
        elif "onsite" in stage_lower or "on-site" in stage_lower:
            return ApplicationStatus.ONSITE_INTERVIEW
        elif "final" in stage_lower:
            return ApplicationStatus.FINAL_INTERVIEW
        elif "offer" in stage_lower:
            return ApplicationStatus.OFFER
        elif "reject" in stage_lower or "decline" in stage_lower:
            return ApplicationStatus.REJECTED
        elif "hire" in stage_lower:
            return ApplicationStatus.HIRED
        else:
            return ApplicationStatus.IN_REVIEW

    # =========================================================================
    # LEVER EVENT PROCESSING
    # =========================================================================

    def _process_lever_event(self, event: WebhookEvent) -> Dict[str, Any]:
        """Process Lever webhook event"""
        result = {"status_changes": [], "interviews_scheduled": []}

        if event.event_type == WebhookEventType.CANDIDATE_STAGE_CHANGE:
            parsed = self._parse_lever_payload(event.event_type, event.payload)
            application = self._find_application_by_external_id(
                parsed["opportunity_id"], WebhookSource.LEVER
            )

            if application:
                new_status = self._map_lever_stage_to_status(parsed["new_stage"])
                status_change = self.update_application_status(
                    application.id, new_status, StatusChangeSource.WEBHOOK
                )
                if status_change:
                    result["status_changes"].append(
                        ApplicationStatusHistoryResponse.model_validate(status_change)
                    )
                event.application_id = application.id
                event.user_id = application.user_id

        return result

    def _parse_lever_payload(
        self, event_type: WebhookEventType, payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Parse Lever webhook payload"""
        parsed = {}

        data = payload.get("data", payload)

        parsed["candidate_email"] = data.get("contact")
        parsed["candidate_name"] = data.get("name")
        parsed["opportunity_id"] = data.get("opportunityId")
        parsed["new_stage"] = data.get("stage")

        return parsed

    def _map_lever_stage_to_status(self, stage_name: str) -> ApplicationStatus:
        """Map Lever stage name to internal status"""
        stage_lower = stage_name.lower()

        mapping = {
            "applicant-new": ApplicationStatus.SUBMITTED,
            "phone-interview": ApplicationStatus.PHONE_SCREEN,
            "phone-screen": ApplicationStatus.PHONE_SCREEN,
            "technical-interview": ApplicationStatus.TECHNICAL_INTERVIEW,
            "onsite": ApplicationStatus.ONSITE_INTERVIEW,
            "offer": ApplicationStatus.OFFER,
            "rejected": ApplicationStatus.REJECTED,
            "hired": ApplicationStatus.HIRED,
        }

        return mapping.get(stage_lower, ApplicationStatus.IN_REVIEW)

    # =========================================================================
    # APPLICATION STATUS TRACKING
    # =========================================================================

    def create_status_change(
        self, status_data: ApplicationStatusHistoryCreate
    ) -> ApplicationStatusHistoryResponse:
        """Create application status change record"""
        # Verify application exists
        application = (
            self.db.query(Application)
            .filter(Application.id == status_data.application_id)
            .first()
        )
        if not application:
            raise ValueError(f"Application {status_data.application_id} not found")

        status_change = ApplicationStatusHistory(
            application_id=status_data.application_id,
            old_status=status_data.old_status,
            new_status=status_data.new_status,
            changed_by=status_data.changed_by,
            change_reason=status_data.change_reason,
            notes=status_data.notes,
            extra_data=status_data.extra_data,
            webhook_event_id=status_data.webhook_event_id,
        )

        self.db.add(status_change)
        self.db.commit()
        self.db.refresh(status_change)

        logger.info(
            f"Created status change for application {status_data.application_id}: "
            f"{status_data.old_status} -> {status_data.new_status}"
        )

        return ApplicationStatusHistoryResponse.model_validate(status_change)

    def update_application_status(
        self,
        application_id: uuid.UUID,
        new_status: ApplicationStatus,
        source: StatusChangeSource,
        reason: Optional[str] = None,
        webhook_event_id: Optional[uuid.UUID] = None,
    ) -> Optional[ApplicationStatusHistory]:
        """Update application status and create history record"""
        application = (
            self.db.query(Application).filter(Application.id == application_id).first()
        )
        if not application:
            raise ValueError(f"Application {application_id} not found")

        old_status = application.status

        # Skip if status hasn't changed
        if old_status == new_status.value:
            logger.info(f"Status unchanged for application {application_id}, skipping")
            return None

        # Update application status
        application.status = new_status.value
        application.updated_at = datetime.utcnow()

        # Create status history
        status_change = ApplicationStatusHistory(
            application_id=application_id,
            old_status=old_status,
            new_status=new_status.value,
            changed_by=source.value,
            change_reason=reason,
            webhook_event_id=webhook_event_id,
        )

        self.db.add(status_change)
        self.db.commit()
        self.db.refresh(status_change)

        logger.info(
            f"Updated application {application_id} status: {old_status} -> {new_status.value}"
        )

        return status_change

    def get_status_history(
        self, application_id: uuid.UUID
    ) -> List[ApplicationStatusHistoryResponse]:
        """Get status history for an application"""
        history = (
            self.db.query(ApplicationStatusHistory)
            .filter(ApplicationStatusHistory.application_id == application_id)
            .order_by(desc(ApplicationStatusHistory.changed_at))
            .all()
        )

        return [ApplicationStatusHistoryResponse.model_validate(h) for h in history]

    # =========================================================================
    # INTERVIEW SCHEDULING
    # =========================================================================

    def create_interview_schedule(
        self, interview_data: InterviewScheduleCreate
    ) -> InterviewScheduleResponse:
        """Create interview schedule"""
        # Verify application exists
        application = (
            self.db.query(Application)
            .filter(Application.id == interview_data.application_id)
            .first()
        )
        if not application:
            raise ValueError(f"Application {interview_data.application_id} not found")

        interview = InterviewSchedule(
            application_id=interview_data.application_id,
            user_id=interview_data.user_id,
            interview_type=interview_data.interview_type,
            interview_round=interview_data.interview_round,
            scheduled_at=interview_data.scheduled_at,
            duration_minutes=interview_data.duration_minutes,
            timezone=interview_data.timezone,
            location=interview_data.location,
            meeting_link=interview_data.meeting_link,
            dial_in_info=interview_data.dial_in_info,
            interviewer_names=interview_data.interviewer_names,
            interviewer_emails=interview_data.interviewer_emails,
            notes=interview_data.notes,
            extra_data=interview_data.extra_data,
            webhook_event_id=interview_data.webhook_event_id,
            external_event_id=interview_data.external_event_id,
        )

        self.db.add(interview)
        self.db.commit()
        self.db.refresh(interview)

        logger.info(
            f"Created interview schedule {interview.id} for application {interview_data.application_id}"
        )

        return InterviewScheduleResponse.model_validate(interview)

    def update_interview_schedule(
        self, interview_id: uuid.UUID, update_data: Dict[str, Any]
    ) -> InterviewScheduleResponse:
        """Update interview schedule"""
        interview = (
            self.db.query(InterviewSchedule)
            .filter(InterviewSchedule.id == interview_id)
            .first()
        )
        if not interview:
            raise ValueError(f"Interview {interview_id} not found")

        # Update fields
        for key, value in update_data.items():
            if hasattr(interview, key):
                setattr(interview, key, value)

        interview.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(interview)

        logger.info(f"Updated interview schedule {interview_id}")

        return InterviewScheduleResponse.model_validate(interview)

    def cancel_interview(
        self, interview_id: uuid.UUID, reason: Optional[str] = None
    ) -> InterviewScheduleResponse:
        """Cancel interview"""
        interview = (
            self.db.query(InterviewSchedule)
            .filter(InterviewSchedule.id == interview_id)
            .first()
        )
        if not interview:
            raise ValueError(f"Interview {interview_id} not found")

        interview.status = InterviewStatus.CANCELLED
        if reason:
            interview.notes = (
                f"{interview.notes or ''}\nCancellation reason: {reason}".strip()
            )
        interview.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(interview)

        logger.info(f"Cancelled interview {interview_id}")

        return InterviewScheduleResponse.model_validate(interview)

    def complete_interview(
        self,
        interview_id: uuid.UUID,
        outcome: Optional[str] = None,
        feedback: Optional[str] = None,
    ) -> InterviewScheduleResponse:
        """Mark interview as completed"""
        interview = (
            self.db.query(InterviewSchedule)
            .filter(InterviewSchedule.id == interview_id)
            .first()
        )
        if not interview:
            raise ValueError(f"Interview {interview_id} not found")

        interview.status = InterviewStatus.COMPLETED
        interview.completed_at = datetime.utcnow()
        if outcome:
            interview.outcome = outcome
        if feedback:
            interview.feedback = feedback
        interview.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(interview)

        logger.info(f"Completed interview {interview_id} with outcome: {outcome}")

        return InterviewScheduleResponse.model_validate(interview)

    def get_upcoming_interviews(
        self, user_id: uuid.UUID
    ) -> List[InterviewScheduleResponse]:
        """Get upcoming interviews for user"""
        now = datetime.utcnow()
        interviews = (
            self.db.query(InterviewSchedule)
            .filter(
                and_(
                    InterviewSchedule.user_id == user_id,
                    InterviewSchedule.scheduled_at >= now,
                    InterviewSchedule.status.in_(
                        [InterviewStatus.SCHEDULED, InterviewStatus.CONFIRMED]
                    ),
                )
            )
            .order_by(InterviewSchedule.scheduled_at)
            .all()
        )

        return [InterviewScheduleResponse.model_validate(i) for i in interviews]

    # =========================================================================
    # INTERVIEW EVENT PROCESSING
    # =========================================================================

    def _process_interview_scheduled(
        self, event: WebhookEvent
    ) -> Optional[InterviewSchedule]:
        """Process interview.scheduled event"""
        payload = event.payload
        if "payload" in payload:
            data = payload["payload"]
        else:
            data = payload

        interview_data = data.get("interview", {})
        application_data = data.get("application", {})

        # Find application
        application = self._find_application_by_external_id(
            application_data.get("id"), event.source
        )
        if not application:
            logger.warning(f"Application not found for interview event {event.id}")
            return None

        # Parse interview details
        scheduled_at_str = interview_data.get("scheduled_at")
        if scheduled_at_str:
            scheduled_at = datetime.fromisoformat(
                scheduled_at_str.replace("Z", "+00:00")
            )
        else:
            scheduled_at = None

        # Map interview type
        interview_type_str = interview_data.get("interview_type", "other")
        try:
            interview_type = InterviewType(interview_type_str)
        except ValueError:
            interview_type = InterviewType.OTHER

        # Create interview schedule
        interview = InterviewSchedule(
            application_id=application.id,
            user_id=application.user_id,
            interview_type=interview_type,
            scheduled_at=scheduled_at,
            duration_minutes=interview_data.get("duration", 60),
            meeting_link=interview_data.get("location"),
            interviewer_emails=[
                interviewer.get("email")
                for interviewer in interview_data.get("interviewers", [])
                if interviewer.get("email")
            ],
            interviewer_names=[
                interviewer.get("name")
                for interviewer in interview_data.get("interviewers", [])
                if interviewer.get("name")
            ],
            external_event_id=interview_data.get("id"),
            webhook_event_id=event.id,
        )

        self.db.add(interview)
        self.db.commit()
        self.db.refresh(interview)

        event.application_id = application.id
        event.user_id = application.user_id

        return interview

    def _process_interview_rescheduled(
        self, event: WebhookEvent
    ) -> Optional[InterviewSchedule]:
        """Process interview.rescheduled event"""
        payload = event.payload
        interview_data = payload.get("interview", {})

        # Find interview by external ID
        interview = (
            self.db.query(InterviewSchedule)
            .filter(InterviewSchedule.external_event_id == interview_data.get("id"))
            .first()
        )

        if not interview:
            logger.warning(f"Interview not found for rescheduled event {event.id}")
            return None

        # Update schedule
        scheduled_at_str = interview_data.get("scheduled_at")
        if scheduled_at_str:
            interview.scheduled_at = datetime.fromisoformat(
                scheduled_at_str.replace("Z", "+00:00")
            )
        interview.status = InterviewStatus.RESCHEDULED
        interview.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(interview)

        return interview

    def _process_interview_cancelled(
        self, event: WebhookEvent
    ) -> Optional[InterviewSchedule]:
        """Process interview.cancelled event"""
        payload = event.payload
        interview_data = payload.get("interview", {})

        # Find interview by external ID
        interview = (
            self.db.query(InterviewSchedule)
            .filter(InterviewSchedule.external_event_id == interview_data.get("id"))
            .first()
        )

        if not interview:
            logger.warning(f"Interview not found for cancelled event {event.id}")
            return None

        # Mark as cancelled
        interview.status = InterviewStatus.CANCELLED
        cancellation_reason = interview_data.get("cancellation_reason")
        if cancellation_reason:
            interview.notes = (
                f"{interview.notes or ''}\nCancelled: {cancellation_reason}".strip()
            )
        interview.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(interview)

        return interview

    # =========================================================================
    # SUBSCRIPTION MANAGEMENT
    # =========================================================================

    def create_subscription(
        self, subscription_data: WebhookSubscriptionCreate
    ) -> WebhookSubscriptionResponse:
        """Create webhook subscription"""
        subscription = WebhookSubscription(
            source=subscription_data.source,
            source_company_id=subscription_data.source_company_id,
            webhook_url=subscription_data.webhook_url,
            webhook_secret=subscription_data.webhook_secret,
            event_types=subscription_data.event_types,
            is_active=subscription_data.is_active,
        )

        self.db.add(subscription)
        self.db.commit()
        self.db.refresh(subscription)

        logger.info(
            f"Created webhook subscription {subscription.id} for {subscription_data.source}"
        )

        return WebhookSubscriptionResponse.model_validate(subscription)

    def verify_subscription(
        self, subscription_id: uuid.UUID
    ) -> WebhookSubscriptionResponse:
        """Verify webhook subscription"""
        subscription = (
            self.db.query(WebhookSubscription)
            .filter(WebhookSubscription.id == subscription_id)
            .first()
        )
        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")

        subscription.verified = True
        subscription.verified_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(subscription)

        logger.info(f"Verified webhook subscription {subscription_id}")

        return WebhookSubscriptionResponse.model_validate(subscription)

    def deactivate_subscription(
        self, subscription_id: uuid.UUID
    ) -> WebhookSubscriptionResponse:
        """Deactivate webhook subscription"""
        subscription = (
            self.db.query(WebhookSubscription)
            .filter(WebhookSubscription.id == subscription_id)
            .first()
        )
        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")

        subscription.is_active = False

        self.db.commit()
        self.db.refresh(subscription)

        logger.info(f"Deactivated webhook subscription {subscription_id}")

        return WebhookSubscriptionResponse.model_validate(subscription)

    def record_subscription_failure(
        self, subscription_id: uuid.UUID, error_message: str
    ) -> None:
        """Record subscription failure"""
        subscription = (
            self.db.query(WebhookSubscription)
            .filter(WebhookSubscription.id == subscription_id)
            .first()
        )
        if not subscription:
            raise ValueError(f"Subscription {subscription_id} not found")

        subscription.consecutive_failures += 1
        subscription.last_failure_at = datetime.utcnow()
        subscription.last_failure_reason = error_message

        # Auto-deactivate after 10 consecutive failures
        if subscription.consecutive_failures >= 10:
            subscription.is_active = False
            logger.warning(
                f"Auto-deactivated subscription {subscription_id} after 10 failures"
            )

        self.db.commit()

    # =========================================================================
    # STATISTICS
    # =========================================================================

    def get_webhook_statistics(self) -> WebhookStatistics:
        """Get webhook statistics"""
        total_events = self.db.query(func.count(WebhookEvent.id)).scalar() or 0

        pending = (
            self.db.query(func.count(WebhookEvent.id))
            .filter(WebhookEvent.status == WebhookEventStatus.PENDING)
            .scalar()
            or 0
        )

        processing = (
            self.db.query(func.count(WebhookEvent.id))
            .filter(WebhookEvent.status == WebhookEventStatus.PROCESSING)
            .scalar()
            or 0
        )

        processed = (
            self.db.query(func.count(WebhookEvent.id))
            .filter(WebhookEvent.status == WebhookEventStatus.PROCESSED)
            .scalar()
            or 0
        )

        failed = (
            self.db.query(func.count(WebhookEvent.id))
            .filter(WebhookEvent.status == WebhookEventStatus.FAILED)
            .scalar()
            or 0
        )

        return WebhookStatistics(
            total_events=total_events,
            pending_events=pending,
            processing_events=processing,
            processed_events=processed,
            failed_events=failed,
            events_by_source={},
            events_by_type={},
        )

    def get_application_status_statistics(self) -> ApplicationStatusStatistics:
        """Get application status statistics"""
        total_applications = self.db.query(func.count(Application.id)).scalar() or 0

        return ApplicationStatusStatistics(
            total_applications=total_applications,
            status_distribution={},
            total_status_changes=0,
            recent_status_changes=[],
            webhook_triggered_changes=0,
            user_triggered_changes=0,
        )

    def get_interview_statistics(self) -> InterviewStatistics:
        """Get interview statistics"""
        total_interviews = self.db.query(func.count(InterviewSchedule.id)).scalar() or 0

        return InterviewStatistics(
            total_interviews=total_interviews,
            upcoming_interviews=0,
            completed_interviews=0,
            cancelled_interviews=0,
            interviews_by_type={},
            interviews_by_outcome={},
        )

    # =========================================================================
    # HELPER METHODS
    # =========================================================================

    def _find_application_by_external_id(
        self, external_id: Any, source: WebhookSource
    ) -> Optional[Application]:
        """Find application by external job board ID"""
        # This is a placeholder - in production, you'd maintain a mapping table
        # between external IDs and internal application IDs
        application = (
            self.db.query(Application)
            .filter(Application.external_id == str(external_id))
            .first()
        )

        if not application:
            raise ValueError(
                f"Application with external ID {external_id} not found for {source}"
            )

        return application

    def _find_or_create_application(
        self, parsed_data: Dict[str, Any], source: WebhookSource
    ) -> Application:
        """Find or create application from webhook data"""
        # Placeholder implementation
        # In production, this would create an application record
        raise NotImplementedError(
            "Application creation from webhook not yet implemented"
        )
