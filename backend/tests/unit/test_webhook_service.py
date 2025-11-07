"""Unit tests for WebhookService"""

import hashlib
import hmac
import json
import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, Mock, patch

import pytest
from sqlalchemy.exc import IntegrityError

from app.schemas.webhook import (
    ApplicationStatus,
    ApplicationStatusHistoryCreate,
    ConfirmationStatus,
    InterviewScheduleCreate,
    InterviewStatus,
    InterviewType,
    StatusChangeSource,
    WebhookEventCreate,
    WebhookEventStatus,
    WebhookEventType,
    WebhookSource,
    WebhookSubscriptionCreate,
)


# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_db():
    """Mock database session"""
    db = MagicMock()
    db.add = Mock()
    db.commit = Mock()
    db.refresh = Mock()
    db.rollback = Mock()
    db.query = Mock()
    return db


@pytest.fixture
def mock_user():
    """Mock user"""
    user = Mock()
    user.id = uuid.uuid4()
    user.email = "test@example.com"
    user.full_name = "Test User"
    return user


@pytest.fixture
def mock_application():
    """Mock application"""
    app = Mock()
    app.id = uuid.uuid4()
    app.user_id = uuid.uuid4()
    app.job_id = uuid.uuid4()
    app.status = "submitted"
    app.applied_at = datetime.utcnow()
    return app


@pytest.fixture
def webhook_service(mock_db):
    """WebhookService instance with mocked dependencies"""
    from app.services.webhook_service import WebhookService

    return WebhookService(mock_db)


@pytest.fixture
def greenhouse_payload():
    """Sample Greenhouse webhook payload"""
    return {
        "action": "candidate_stage_change",
        "payload": {
            "candidate": {
                "id": 12345,
                "first_name": "John",
                "last_name": "Doe",
                "email": "john@example.com",
            },
            "application": {
                "id": 67890,
                "status": "active",
                "current_stage": "phone_screen",
            },
            "stage": {
                "id": 111,
                "name": "Phone Screen",
            },
        },
    }


@pytest.fixture
def lever_payload():
    """Sample Lever webhook payload"""
    return {
        "triggeredAt": 1234567890,
        "event": "candidateStageChange",
        "data": {
            "candidateId": "candidate-uuid",
            "opportunityId": "opportunity-uuid",
            "contact": "john@example.com",
            "name": "John Doe",
            "stage": "phone-interview",
        },
    }


@pytest.fixture
def interview_scheduled_payload():
    """Sample interview scheduled webhook payload"""
    return {
        "action": "interview_scheduled",
        "payload": {
            "candidate": {"id": 12345, "email": "john@example.com"},
            "application": {"id": 67890},
            "interview": {
                "id": "interview-123",
                "scheduled_at": "2025-11-01T14:00:00Z",
                "duration": 60,
                "interview_type": "technical",
                "location": "https://zoom.us/j/123456789",
                "interviewers": [
                    {"name": "Jane Smith", "email": "jane@company.com"},
                ],
            },
        },
    }


# ============================================================================
# TEST WEBHOOK EVENT CREATION
# ============================================================================


class TestWebhookEventCreation:
    """Test webhook event creation and storage"""

    def test_create_webhook_event_success(
        self, webhook_service, mock_db, greenhouse_payload
    ):
        """Should create webhook event successfully"""
        event_data = WebhookEventCreate(
            source=WebhookSource.GREENHOUSE,
            event_type=WebhookEventType.CANDIDATE_STAGE_CHANGE,
            payload=greenhouse_payload,
            is_verified=True,
        )

        mock_db.query().filter().first.return_value = None

        result = webhook_service.create_webhook_event(event_data)

        assert mock_db.add.called
        assert mock_db.commit.called
        assert result is not None

    def test_create_webhook_event_with_headers(self, webhook_service, mock_db):
        """Should store webhook headers"""
        event_data = WebhookEventCreate(
            source=WebhookSource.GREENHOUSE,
            event_type=WebhookEventType.APPLICATION_SUBMITTED,
            payload={"test": "data"},
            headers={
                "X-Greenhouse-Signature": "signature",
                "Content-Type": "application/json",
            },
        )

        result = webhook_service.create_webhook_event(event_data)

        assert mock_db.add.called

    def test_create_duplicate_event_id(self, webhook_service, mock_db):
        """Should handle duplicate event IDs gracefully"""
        event_data = WebhookEventCreate(
            source=WebhookSource.GREENHOUSE,
            event_type=WebhookEventType.APPLICATION_SUBMITTED,
            event_id="duplicate-event-123",
            payload={"test": "data"},
        )

        # Simulate existing event
        mock_db.query().filter().first.return_value = Mock(
            event_id="duplicate-event-123"
        )

        with pytest.raises(ValueError, match="already processed"):
            webhook_service.create_webhook_event(event_data)


# ============================================================================
# TEST SIGNATURE VERIFICATION
# ============================================================================


class TestSignatureVerification:
    """Test webhook signature verification for different job boards"""

    def test_verify_greenhouse_signature_valid(self, webhook_service):
        """Should verify valid Greenhouse signature"""
        secret = "webhook-secret-key"
        payload = json.dumps({"action": "test"})
        signature = hmac.new(
            secret.encode(), payload.encode(), hashlib.sha256
        ).hexdigest()

        result = webhook_service.verify_greenhouse_signature(payload, signature, secret)

        assert result is True

    def test_verify_greenhouse_signature_invalid(self, webhook_service):
        """Should reject invalid Greenhouse signature"""
        secret = "webhook-secret-key"
        payload = json.dumps({"action": "test"})
        invalid_signature = "invalid-signature"

        result = webhook_service.verify_greenhouse_signature(
            payload, invalid_signature, secret
        )

        assert result is False

    def test_verify_lever_signature_valid(self, webhook_service):
        """Should verify valid Lever signature"""
        secret = "webhook-secret-key"
        payload = json.dumps({"event": "test"})
        signature = hmac.new(
            secret.encode(), payload.encode(), hashlib.sha256
        ).hexdigest()

        result = webhook_service.verify_lever_signature(payload, signature, secret)

        assert result is True

    def test_verify_lever_signature_invalid(self, webhook_service):
        """Should reject invalid Lever signature"""
        secret = "webhook-secret-key"
        payload = json.dumps({"event": "test"})
        invalid_signature = "invalid-signature"

        result = webhook_service.verify_lever_signature(
            payload, invalid_signature, secret
        )

        assert result is False

    def test_verify_signature_missing_secret(self, webhook_service):
        """Should handle missing secret gracefully"""
        payload = json.dumps({"test": "data"})
        signature = "any-signature"

        result = webhook_service.verify_greenhouse_signature(payload, signature, None)

        assert result is False


# ============================================================================
# TEST EVENT PROCESSING
# ============================================================================


class TestEventProcessing:
    """Test webhook event processing"""

    def test_process_greenhouse_application_submitted(
        self, webhook_service, mock_db, mock_application, greenhouse_payload
    ):
        """Should process Greenhouse application.submitted event"""
        event = Mock()
        event.id = uuid.uuid4()
        event.source = WebhookSource.GREENHOUSE
        event.event_type = WebhookEventType.APPLICATION_SUBMITTED
        event.payload = greenhouse_payload
        event.status = WebhookEventStatus.PENDING

        mock_db.query().filter().first.return_value = mock_application

        result = webhook_service.process_event(event.id)

        assert mock_db.commit.called
        assert result is not None

    def test_process_lever_stage_change(
        self, webhook_service, mock_db, mock_application, lever_payload
    ):
        """Should process Lever candidateStageChange event"""
        event = Mock()
        event.id = uuid.uuid4()
        event.source = WebhookSource.LEVER
        event.event_type = WebhookEventType.CANDIDATE_STAGE_CHANGE
        event.payload = lever_payload
        event.status = WebhookEventStatus.PENDING

        mock_db.query().filter().first.return_value = mock_application

        result = webhook_service.process_event(event.id)

        assert mock_db.commit.called

    def test_process_event_not_found(self, webhook_service, mock_db):
        """Should handle event not found"""
        mock_db.query().filter().first.return_value = None

        with pytest.raises(ValueError, match="not found"):
            webhook_service.process_event(uuid.uuid4())

    def test_process_event_already_processed(self, webhook_service, mock_db):
        """Should skip already processed events"""
        event = Mock()
        event.id = uuid.uuid4()
        event.status = WebhookEventStatus.PROCESSED
        event.processed_at = datetime.utcnow()

        mock_db.query().filter().first.return_value = event

        with pytest.raises(ValueError, match="already processed"):
            webhook_service.process_event(event.id)

    def test_process_event_retry_logic(self, webhook_service, mock_db):
        """Should retry failed events with backoff"""
        event = Mock()
        event.id = uuid.uuid4()
        event.status = WebhookEventStatus.FAILED
        event.retry_count = 1
        event.max_retries = 3
        event.payload = {"test": "data"}

        mock_db.query().filter().first.return_value = event

        # Simulate processing error
        with patch.object(
            webhook_service,
            "_process_greenhouse_event",
            side_effect=Exception("Processing error"),
        ):
            with pytest.raises(Exception):
                webhook_service.process_event(event.id)

        # Should increment retry count
        assert mock_db.commit.called

    def test_process_event_max_retries_exceeded(self, webhook_service, mock_db):
        """Should mark event as failed after max retries"""
        event = Mock()
        event.id = uuid.uuid4()
        event.status = WebhookEventStatus.FAILED
        event.retry_count = 3
        event.max_retries = 3

        mock_db.query().filter().first.return_value = event

        with pytest.raises(ValueError, match="max retries"):
            webhook_service.process_event(event.id)


# ============================================================================
# TEST APPLICATION STATUS TRACKING
# ============================================================================


class TestApplicationStatusTracking:
    """Test application status tracking functionality"""

    def test_create_status_change_success(
        self, webhook_service, mock_db, mock_application
    ):
        """Should create status change record successfully"""
        status_data = ApplicationStatusHistoryCreate(
            application_id=mock_application.id,
            old_status=ApplicationStatus.SUBMITTED,
            new_status=ApplicationStatus.IN_REVIEW,
            changed_by=StatusChangeSource.WEBHOOK,
            change_reason="Automatically updated via webhook",
        )

        mock_db.query().filter().first.return_value = mock_application

        result = webhook_service.create_status_change(status_data)

        assert mock_db.add.called
        assert mock_db.commit.called

    def test_update_application_status(
        self, webhook_service, mock_db, mock_application
    ):
        """Should update application status and create history"""
        new_status = ApplicationStatus.PHONE_SCREEN

        mock_db.query().filter().first.return_value = mock_application

        result = webhook_service.update_application_status(
            mock_application.id, new_status, StatusChangeSource.WEBHOOK
        )

        assert mock_application.status == new_status.value
        assert mock_db.commit.called

    def test_get_status_history(self, webhook_service, mock_db, mock_application):
        """Should retrieve status history for application"""
        mock_history = [
            Mock(
                id=uuid.uuid4(),
                application_id=mock_application.id,
                old_status="submitted",
                new_status="in_review",
                changed_at=datetime.utcnow(),
            )
        ]
        mock_db.query().filter().order_by().all.return_value = mock_history

        result = webhook_service.get_status_history(mock_application.id)

        assert len(result) > 0

    def test_prevent_duplicate_status_change(
        self, webhook_service, mock_db, mock_application
    ):
        """Should not create duplicate consecutive status changes"""
        mock_application.status = "in_review"

        mock_db.query().filter().first.return_value = mock_application

        # Try to set same status
        result = webhook_service.update_application_status(
            mock_application.id, ApplicationStatus.IN_REVIEW, StatusChangeSource.WEBHOOK
        )

        # Should skip the update
        assert result is None or result == "skipped"


# ============================================================================
# TEST INTERVIEW SCHEDULING
# ============================================================================


class TestInterviewScheduling:
    """Test interview scheduling functionality"""

    def test_create_interview_schedule_success(
        self, webhook_service, mock_db, mock_application, mock_user
    ):
        """Should create interview schedule successfully"""
        interview_data = InterviewScheduleCreate(
            application_id=mock_application.id,
            user_id=mock_user.id,
            interview_type=InterviewType.TECHNICAL,
            interview_round=1,
            scheduled_at=datetime.utcnow() + timedelta(days=3),
            duration_minutes=60,
            meeting_link="https://zoom.us/j/123456789",
            interviewer_emails=["jane@company.com"],
        )

        mock_db.query().filter().first.return_value = mock_application

        result = webhook_service.create_interview_schedule(interview_data)

        assert mock_db.add.called
        assert mock_db.commit.called

    def test_update_interview_schedule(self, webhook_service, mock_db):
        """Should update interview schedule"""
        interview = Mock()
        interview.id = uuid.uuid4()
        interview.status = InterviewStatus.SCHEDULED

        mock_db.query().filter().first.return_value = interview

        result = webhook_service.update_interview_schedule(
            interview.id, {"status": InterviewStatus.CONFIRMED}
        )

        assert interview.status == InterviewStatus.CONFIRMED
        assert mock_db.commit.called

    def test_cancel_interview(self, webhook_service, mock_db):
        """Should cancel interview"""
        interview = Mock()
        interview.id = uuid.uuid4()
        interview.status = InterviewStatus.SCHEDULED

        mock_db.query().filter().first.return_value = interview

        result = webhook_service.cancel_interview(interview.id, "Candidate unavailable")

        assert interview.status == InterviewStatus.CANCELLED
        assert mock_db.commit.called

    def test_complete_interview_with_feedback(self, webhook_service, mock_db):
        """Should mark interview as completed with feedback"""
        interview = Mock()
        interview.id = uuid.uuid4()
        interview.status = InterviewStatus.CONFIRMED

        mock_db.query().filter().first.return_value = interview

        result = webhook_service.complete_interview(
            interview.id, outcome="passed", feedback="Strong technical skills"
        )

        assert interview.status == InterviewStatus.COMPLETED
        assert interview.completed_at is not None
        assert mock_db.commit.called

    def test_get_upcoming_interviews(self, webhook_service, mock_db, mock_user):
        """Should retrieve upcoming interviews for user"""
        mock_interviews = [
            Mock(
                id=uuid.uuid4(),
                user_id=mock_user.id,
                scheduled_at=datetime.utcnow() + timedelta(days=2),
                status=InterviewStatus.SCHEDULED,
            )
        ]
        mock_db.query().filter().filter().order_by().all.return_value = mock_interviews

        result = webhook_service.get_upcoming_interviews(mock_user.id)

        assert len(result) > 0


# ============================================================================
# TEST WEBHOOK SUBSCRIPTION MANAGEMENT
# ============================================================================


class TestWebhookSubscriptionManagement:
    """Test webhook subscription management"""

    def test_create_subscription_success(self, webhook_service, mock_db):
        """Should create webhook subscription successfully"""
        subscription_data = WebhookSubscriptionCreate(
            source=WebhookSource.GREENHOUSE,
            webhook_url="https://api.hireflux.com/webhooks/greenhouse",
            webhook_secret="super-secret-key",
            event_types=[
                WebhookEventType.APPLICATION_SUBMITTED,
                WebhookEventType.CANDIDATE_STAGE_CHANGE,
            ],
        )

        result = webhook_service.create_subscription(subscription_data)

        assert mock_db.add.called
        assert mock_db.commit.called

    def test_verify_subscription(self, webhook_service, mock_db):
        """Should verify webhook subscription"""
        subscription = Mock()
        subscription.id = uuid.uuid4()
        subscription.verified = False

        mock_db.query().filter().first.return_value = subscription

        result = webhook_service.verify_subscription(subscription.id)

        assert subscription.verified is True
        assert subscription.verified_at is not None
        assert mock_db.commit.called

    def test_deactivate_subscription(self, webhook_service, mock_db):
        """Should deactivate webhook subscription"""
        subscription = Mock()
        subscription.id = uuid.uuid4()
        subscription.is_active = True

        mock_db.query().filter().first.return_value = subscription

        result = webhook_service.deactivate_subscription(subscription.id)

        assert subscription.is_active is False
        assert mock_db.commit.called

    def test_record_subscription_failure(self, webhook_service, mock_db):
        """Should record subscription failure"""
        subscription = Mock()
        subscription.id = uuid.uuid4()
        subscription.consecutive_failures = 2

        mock_db.query().filter().first.return_value = subscription

        webhook_service.record_subscription_failure(
            subscription.id, "Connection timeout"
        )

        assert subscription.consecutive_failures == 3
        assert subscription.last_failure_reason == "Connection timeout"
        assert mock_db.commit.called

    def test_auto_deactivate_after_failures(self, webhook_service, mock_db):
        """Should auto-deactivate subscription after consecutive failures"""
        subscription = Mock()
        subscription.id = uuid.uuid4()
        subscription.consecutive_failures = 9
        subscription.is_active = True

        mock_db.query().filter().first.return_value = subscription

        webhook_service.record_subscription_failure(subscription.id, "Connection error")

        # After 10 consecutive failures, should auto-deactivate
        assert subscription.is_active is False


# ============================================================================
# TEST GREENHOUSE-SPECIFIC PROCESSING
# ============================================================================


class TestGreenhouseProcessing:
    """Test Greenhouse-specific webhook processing"""

    def test_parse_greenhouse_application_submitted(
        self, webhook_service, greenhouse_payload
    ):
        """Should parse Greenhouse application.submitted payload"""
        result = webhook_service._parse_greenhouse_payload(
            WebhookEventType.APPLICATION_SUBMITTED, greenhouse_payload
        )

        assert result["candidate_email"] == "john@example.com"
        assert result["application_id"] is not None

    def test_parse_greenhouse_stage_change(self, webhook_service, greenhouse_payload):
        """Should parse Greenhouse stage change payload"""
        result = webhook_service._parse_greenhouse_payload(
            WebhookEventType.CANDIDATE_STAGE_CHANGE, greenhouse_payload
        )

        assert result["new_stage"] == "Phone Screen"
        assert result["candidate_email"] == "john@example.com"

    def test_map_greenhouse_stage_to_status(self, webhook_service):
        """Should map Greenhouse stage names to internal statuses"""
        test_cases = [
            ("Phone Screen", ApplicationStatus.PHONE_SCREEN),
            ("Technical Interview", ApplicationStatus.TECHNICAL_INTERVIEW),
            ("Onsite Interview", ApplicationStatus.ONSITE_INTERVIEW),
            ("Offer", ApplicationStatus.OFFER),
            ("Rejected", ApplicationStatus.REJECTED),
        ]

        for stage_name, expected_status in test_cases:
            result = webhook_service._map_greenhouse_stage_to_status(stage_name)
            assert result == expected_status


# ============================================================================
# TEST LEVER-SPECIFIC PROCESSING
# ============================================================================


class TestLeverProcessing:
    """Test Lever-specific webhook processing"""

    def test_parse_lever_stage_change(self, webhook_service, lever_payload):
        """Should parse Lever candidateStageChange payload"""
        result = webhook_service._parse_lever_payload(
            WebhookEventType.CANDIDATE_STAGE_CHANGE, lever_payload
        )

        assert result["candidate_email"] == "john@example.com"
        assert result["new_stage"] == "phone-interview"

    def test_map_lever_stage_to_status(self, webhook_service):
        """Should map Lever stage names to internal statuses"""
        test_cases = [
            ("applicant-new", ApplicationStatus.SUBMITTED),
            ("phone-interview", ApplicationStatus.PHONE_SCREEN),
            ("onsite", ApplicationStatus.ONSITE_INTERVIEW),
            ("offer", ApplicationStatus.OFFER),
            ("rejected", ApplicationStatus.REJECTED),
        ]

        for stage_name, expected_status in test_cases:
            result = webhook_service._map_lever_stage_to_status(stage_name)
            assert result == expected_status


# ============================================================================
# TEST INTERVIEW WEBHOOK PROCESSING
# ============================================================================


class TestInterviewWebhookProcessing:
    """Test interview-related webhook processing"""

    def test_process_interview_scheduled(
        self, webhook_service, mock_db, mock_application, interview_scheduled_payload
    ):
        """Should process interview.scheduled webhook"""
        event = Mock()
        event.id = uuid.uuid4()
        event.source = WebhookSource.GREENHOUSE
        event.event_type = WebhookEventType.INTERVIEW_SCHEDULED
        event.payload = interview_scheduled_payload

        mock_db.query().filter().first.return_value = mock_application

        result = webhook_service._process_interview_scheduled(event)

        assert mock_db.add.called
        assert mock_db.commit.called

    def test_process_interview_rescheduled(self, webhook_service, mock_db):
        """Should update interview schedule for rescheduled event"""
        interview = Mock()
        interview.id = uuid.uuid4()
        interview.status = InterviewStatus.SCHEDULED

        event = Mock()
        event.payload = {
            "interview": {
                "id": "interview-123",
                "scheduled_at": "2025-11-05T14:00:00Z",
            }
        }

        mock_db.query().filter().first.return_value = interview

        result = webhook_service._process_interview_rescheduled(event)

        assert interview.status == InterviewStatus.RESCHEDULED
        assert mock_db.commit.called

    def test_process_interview_cancelled(self, webhook_service, mock_db):
        """Should mark interview as cancelled"""
        interview = Mock()
        interview.id = uuid.uuid4()
        interview.status = InterviewStatus.SCHEDULED

        event = Mock()
        event.payload = {
            "interview": {"id": "interview-123", "cancellation_reason": "Conflict"}
        }

        mock_db.query().filter().first.return_value = interview

        result = webhook_service._process_interview_cancelled(event)

        assert interview.status == InterviewStatus.CANCELLED
        assert mock_db.commit.called


# ============================================================================
# TEST STATISTICS AND REPORTING
# ============================================================================


class TestStatisticsReporting:
    """Test webhook statistics and reporting"""

    def test_get_webhook_statistics(self, webhook_service, mock_db):
        """Should retrieve webhook statistics"""
        mock_db.query().count.return_value = 100
        mock_db.query().filter().count.return_value = 10

        result = webhook_service.get_webhook_statistics()

        assert result["total_events"] == 100

    def test_get_application_status_statistics(self, webhook_service, mock_db):
        """Should retrieve application status statistics"""
        mock_db.query().count.return_value = 50

        result = webhook_service.get_application_status_statistics()

        assert result["total_applications"] == 50

    def test_get_interview_statistics(self, webhook_service, mock_db):
        """Should retrieve interview statistics"""
        mock_db.query().count.return_value = 25

        result = webhook_service.get_interview_statistics()

        assert result["total_interviews"] == 25


# ============================================================================
# TEST ERROR HANDLING
# ============================================================================


class TestErrorHandling:
    """Test error handling in webhook processing"""

    def test_handle_malformed_payload(self, webhook_service, mock_db):
        """Should handle malformed webhook payloads"""
        event = Mock()
        event.id = uuid.uuid4()
        event.source = WebhookSource.GREENHOUSE
        event.payload = {"invalid": "structure"}
        event.status = WebhookEventStatus.PENDING

        mock_db.query().filter().first.return_value = event

        with pytest.raises(ValueError, match="malformed|invalid"):
            webhook_service.process_event(event.id)

    def test_handle_missing_application(self, webhook_service, mock_db):
        """Should handle missing application gracefully"""
        event = Mock()
        event.id = uuid.uuid4()
        event.payload = {"application": {"id": 99999}}

        # No application found
        mock_db.query().filter().first.return_value = None

        with pytest.raises(ValueError, match="not found"):
            webhook_service._find_application_by_external_id(
                99999, WebhookSource.GREENHOUSE
            )

    def test_handle_database_error(self, webhook_service, mock_db):
        """Should handle database errors gracefully"""
        mock_db.commit.side_effect = IntegrityError("constraint violation", None, None)

        with pytest.raises(IntegrityError):
            event_data = WebhookEventCreate(
                source=WebhookSource.GREENHOUSE,
                event_type=WebhookEventType.APPLICATION_SUBMITTED,
                payload={"test": "data"},
            )
            webhook_service.create_webhook_event(event_data)

        assert mock_db.rollback.called


# ============================================================================
# TEST INTEGRATION SCENARIOS
# ============================================================================


class TestIntegrationScenarios:
    """Test end-to-end integration scenarios"""

    def test_full_application_lifecycle(
        self, webhook_service, mock_db, mock_application
    ):
        """Should track full application lifecycle through webhooks"""
        # Application submitted
        webhook_service.update_application_status(
            mock_application.id, ApplicationStatus.SUBMITTED, StatusChangeSource.WEBHOOK
        )

        # Moved to phone screen
        webhook_service.update_application_status(
            mock_application.id,
            ApplicationStatus.PHONE_SCREEN,
            StatusChangeSource.WEBHOOK,
        )

        # Interview scheduled
        interview_data = InterviewScheduleCreate(
            application_id=mock_application.id,
            user_id=uuid.uuid4(),
            interview_type=InterviewType.PHONE_SCREEN,
            scheduled_at=datetime.utcnow() + timedelta(days=2),
        )
        webhook_service.create_interview_schedule(interview_data)

        # Should have multiple status changes
        assert mock_db.commit.call_count >= 3

    def test_concurrent_webhook_processing(self, webhook_service, mock_db):
        """Should handle concurrent webhook events safely"""
        # This would test race conditions in production
        # Mocking concurrent scenario
        event1 = Mock(id=uuid.uuid4(), status=WebhookEventStatus.PENDING)
        event2 = Mock(id=uuid.uuid4(), status=WebhookEventStatus.PENDING)

        # Both events should be processable
        mock_db.query().filter().first.side_effect = [event1, event2]

        # Process both (in reality would be concurrent)
        # Implementation should handle locks/transactions properly
        pass  # Placeholder for concurrent test
