"""
Unit Tests: Email Webhook Service - Issue #52
Tests for Resend webhook handling following BDD scenarios from:
backend/tests/features/email-service.feature (lines 150-250)
"""

import pytest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch
from sqlalchemy.orm import Session

from app.services.email_webhook_service import EmailWebhookService
from app.db.models.email_delivery import (
    EmailDeliveryLog,
    EmailDeliveryStatus,
    EmailBlocklist,
    EmailUnsubscribe,
)
from app.db.models.user import User


# =========================================================================
# Fixtures
# =========================================================================


@pytest.fixture
def db_session():
    """Mock database session"""
    return Mock(spec=Session)


@pytest.fixture
def webhook_service(db_session):
    """Email webhook service instance"""
    return EmailWebhookService(db_session)


@pytest.fixture
def email_log():
    """Sample email delivery log with proper defaults"""
    return EmailDeliveryLog(
        id=1,
        user_id=1,
        to_email="test@example.com",
        from_email="noreply@hireflux.com",
        subject="Test Email",
        email_type="test",
        message_id="resend_msg_123",
        status="sent",
        sent_at=datetime.now(),
        # Initialize counters to 0 (matching model defaults)
        retry_count=0,
        max_retries=3,
        open_count=0,
        click_count=0,
        # Initialize arrays
        clicked_urls=[],
        webhook_events=[],
    )


# =========================================================================
# Test: Handle Delivered Webhook
# =========================================================================


def test_handle_delivered_updates_status(webhook_service, db_session, email_log):
    """
    Scenario: Handle successful email delivery
    Given an email was sent via Resend
    When Resend webhook sends "delivered" event
    Then delivery status should be updated to "delivered"
    And delivery timestamp should be recorded
    """
    # Arrange
    db_session.query.return_value.filter.return_value.first.return_value = email_log
    webhook_data = {
        "type": "email.delivered",
        "data": {
            "email_id": "resend_msg_123",
            "to": "test@example.com",
            "delivered_at": "2025-11-23T10:30:00Z",
        },
    }

    # Act
    result = webhook_service.handle_delivered(webhook_data)

    # Assert
    assert result["success"] is True
    assert email_log.status == "delivered"
    assert email_log.delivered_at is not None
    db_session.commit.assert_called_once()


def test_handle_delivered_with_missing_email(webhook_service, db_session):
    """
    Scenario: Handle delivered webhook for non-existent email
    When webhook received for unknown message_id
    Then should log error and return success (idempotent)
    """
    # Arrange
    db_session.query.return_value.filter.return_value.first.return_value = None
    webhook_data = {
        "type": "email.delivered",
        "data": {"email_id": "unknown_msg", "to": "test@example.com"},
    }

    # Act
    result = webhook_service.handle_delivered(webhook_data)

    # Assert
    assert result["success"] is True  # Idempotent - don't fail
    assert "not found" in result.get("warning", "")


# =========================================================================
# Test: Handle Bounced Webhook (Hard Bounce)
# =========================================================================


def test_handle_hard_bounce_adds_to_blocklist(webhook_service, db_session, email_log):
    """
    Scenario: Handle email bounce (hard)
    Given an email was sent to invalid address
    When Resend webhook sends "bounced" event with permanent error
    Then delivery status should be updated to "bounced"
    And the email address should be marked as invalid
    And future emails to this address should be blocked
    """
    # Arrange
    # Mock query to return email_log first, then None for blocklist check
    query_mock = Mock()
    filter_mock = Mock()
    filter_mock.first.side_effect = [email_log, None]  # email_log, then no existing blocklist
    query_mock.filter.return_value = filter_mock
    db_session.query.return_value = query_mock

    webhook_data = {
        "type": "email.bounced",
        "data": {
            "email_id": "resend_msg_123",
            "to": "invalid@example.com",
            "bounce_type": "hard",
            "bounce_reason": "Address does not exist",
            "smtp_code": "550",
        },
    }

    # Act
    result = webhook_service.handle_bounced(webhook_data)

    # Assert
    assert result["success"] is True
    assert email_log.status == "bounced"
    assert email_log.bounce_type == "hard"
    assert email_log.bounce_reason == "Address does not exist"

    # Verify blocklist entry created
    db_session.add.assert_called()
    added_blocklist = db_session.add.call_args[0][0]
    assert isinstance(added_blocklist, EmailBlocklist)
    # Note: webhook data has "to" field, but email_log has to_email field
    # The service uses email_log.to_email, not data["to"]
    assert added_blocklist.email == "test@example.com"  # from email_log
    assert added_blocklist.reason == "hard_bounce"


# =========================================================================
# Test: Handle Bounced Webhook (Soft Bounce)
# =========================================================================


def test_handle_soft_bounce_schedules_retry(webhook_service, db_session, email_log):
    """
    Scenario: Handle email bounce (soft)
    Given an email was sent to valid address
    When Resend webhook sends "bounced" event with temporary error
    Then delivery status should be updated to "soft_bounced"
    And retry should be scheduled for 1 hour later
    And retry count should be incremented
    """
    # Arrange
    db_session.query.return_value.filter.return_value.first.return_value = email_log
    webhook_data = {
        "type": "email.bounced",
        "data": {
            "email_id": "resend_msg_123",
            "to": "test@example.com",
            "bounce_type": "soft",
            "bounce_reason": "Mailbox full",
            "smtp_code": "452",
        },
    }

    # Act
    result = webhook_service.handle_bounced(webhook_data)

    # Assert
    assert result["success"] is True
    assert email_log.status == "soft_bounced"
    assert email_log.bounce_type == "soft"
    assert email_log.retry_count == 1
    assert email_log.next_retry_at is not None

    # Verify retry scheduled for ~1 hour later (allow 5 min variance)
    time_diff = (email_log.next_retry_at - datetime.now()).total_seconds()
    assert 3300 < time_diff < 3900  # 55-65 minutes


def test_soft_bounce_max_retries_adds_to_blocklist(
    webhook_service, db_session, email_log
):
    """
    Scenario: Soft bounce exceeds max retries
    Given an email has soft bounced 3 times
    When 4th soft bounce occurs
    Then should treat as hard bounce
    And add to blocklist
    """
    # Arrange
    email_log.retry_count = 3  # Already at max retries

    # Mock query to return email_log first, then None for blocklist check
    query_mock = Mock()
    filter_mock = Mock()
    filter_mock.first.side_effect = [email_log, None]  # email_log, then no existing blocklist
    query_mock.filter.return_value = filter_mock
    db_session.query.return_value = query_mock

    webhook_data = {
        "type": "email.bounced",
        "data": {
            "email_id": "resend_msg_123",
            "to": "test@example.com",
            "bounce_type": "soft",
            "bounce_reason": "Mailbox full",
        },
    }

    # Act
    result = webhook_service.handle_bounced(webhook_data)

    # Assert
    assert email_log.status == "bounced"  # Permanent
    db_session.add.assert_called()  # Blocklist entry added


# =========================================================================
# Test: Handle Complained Webhook
# =========================================================================


def test_handle_complained_auto_unsubscribes(webhook_service, db_session, email_log):
    """
    Scenario: Handle spam complaint
    Given an email was sent successfully
    When Resend webhook sends "complained" event
    Then delivery status should be updated to "complained"
    And the email address should be unsubscribed
    And analytics should track complaint rate
    """
    # Arrange
    # Mock multiple queries: email_log, unsubscribe check, complaint rate calc
    query_mock = Mock()
    filter_mock = Mock()

    # First .first() returns email_log, second returns None (no existing unsubscribe)
    filter_mock.first.side_effect = [email_log, None]
    # Mock count() for complaint rate calculation
    filter_mock.count.side_effect = [100, 1]  # 100 sent, 1 complained

    query_mock.filter.return_value = filter_mock
    db_session.query.return_value = query_mock

    webhook_data = {
        "type": "email.complained",
        "data": {
            "email_id": "resend_msg_123",
            "to": "complainer@example.com",
            "complained_at": "2025-11-23T10:30:00Z",
        },
    }

    # Act
    result = webhook_service.handle_complained(webhook_data)

    # Assert
    assert result["success"] is True
    assert email_log.status == "complained"

    # Verify unsubscribe entry created
    db_session.add.assert_called()
    added_unsubscribe = db_session.add.call_args[0][0]
    assert isinstance(added_unsubscribe, EmailUnsubscribe)
    assert added_unsubscribe.email == "complainer@example.com"
    assert added_unsubscribe.unsubscribe_all is True
    assert added_unsubscribe.unsubscribed_via == "spam_complaint"


def test_handle_complained_triggers_alert_if_high_rate(
    webhook_service, db_session, email_log
):
    """
    Scenario: High complaint rate triggers alert
    Given complaint rate exceeds 0.1%
    When complaint is processed
    Then alert should be sent to admins
    """
    # Arrange
    # Mock queries for email_log, unsubscribe check, and complaint rate
    query_mock = Mock()
    filter_mock = Mock()

    filter_mock.first.side_effect = [email_log, None]  # email_log, no existing unsubscribe
    filter_mock.count.side_effect = [1000, 2]  # 1000 sent, 2 complained = 0.2%

    query_mock.filter.return_value = filter_mock
    db_session.query.return_value = query_mock

    # Mock the admin alert method
    webhook_service._send_admin_alert = Mock()

    webhook_data = {
        "type": "email.complained",
        "data": {"email_id": "resend_msg_123", "to": "test@example.com"},
    }

    # Act
    webhook_service.handle_complained(webhook_data)

    # Assert
    webhook_service._send_admin_alert.assert_called_once()
    alert_msg = webhook_service._send_admin_alert.call_args[0][0]
    assert "complaint rate" in alert_msg.lower()
    assert "0.2%" in alert_msg or "0.20%" in alert_msg


# =========================================================================
# Test: Handle Opened Webhook
# =========================================================================


def test_handle_opened_records_first_open(webhook_service, db_session, email_log):
    """
    Scenario: Handle email open tracking
    Given an email was delivered
    When recipient opens the email
    Then Resend webhook sends "opened" event
    And open timestamp should be recorded
    And open count should be incremented
    """
    # Arrange
    email_log.status = "delivered"
    db_session.query.return_value.filter.return_value.first.return_value = email_log
    webhook_data = {
        "type": "email.opened",
        "data": {
            "email_id": "resend_msg_123",
            "to": "test@example.com",
            "opened_at": "2025-11-23T10:30:00Z",
        },
    }

    # Act
    result = webhook_service.handle_opened(webhook_data)

    # Assert
    assert result["success"] is True
    assert email_log.status == "opened"
    assert email_log.opened_at is not None  # First open timestamp
    assert email_log.open_count == 1
    assert email_log.last_opened_at is not None


def test_handle_opened_multiple_times(webhook_service, db_session, email_log):
    """
    Scenario: Email opened multiple times
    When recipient opens email again
    Then open count increments
    But first opened_at stays the same
    """
    # Arrange
    first_open_time = datetime.now() - timedelta(hours=1)
    email_log.status = "opened"
    email_log.opened_at = first_open_time
    email_log.open_count = 1
    db_session.query.return_value.filter.return_value.first.return_value = email_log

    webhook_data = {
        "type": "email.opened",
        "data": {"email_id": "resend_msg_123", "to": "test@example.com"},
    }

    # Act
    webhook_service.handle_opened(webhook_data)

    # Assert
    assert email_log.open_count == 2
    assert email_log.opened_at == first_open_time  # Unchanged
    assert email_log.last_opened_at > first_open_time


# =========================================================================
# Test: Handle Clicked Webhook
# =========================================================================


def test_handle_clicked_records_url(webhook_service, db_session, email_log):
    """
    Scenario: Handle email click tracking
    Given an email was delivered with tracked links
    When recipient clicks a link
    Then Resend webhook sends "clicked" event
    And click timestamp should be recorded
    And clicked URL should be recorded
    """
    # Arrange
    email_log.status = "opened"
    # Mock the record methods to prevent side effects
    email_log.record_click = Mock()
    email_log.record_webhook_event = Mock()

    db_session.query.return_value.filter.return_value.first.return_value = email_log
    webhook_data = {
        "type": "email.clicked",
        "data": {
            "email_id": "resend_msg_123",
            "to": "test@example.com",
            "url": "https://hireflux.com/jobs/123",
            "clicked_at": "2025-11-23T10:30:00Z",
        },
    }

    # Act
    result = webhook_service.handle_clicked(webhook_data)

    # Assert
    assert result["success"] is True
    assert email_log.status == "clicked"
    assert email_log.click_count == 1  # Should increment from 0 to 1
    assert email_log.clicked_at is not None
    email_log.record_click.assert_called_once_with("https://hireflux.com/jobs/123")


def test_handle_clicked_multiple_urls(webhook_service, db_session, email_log):
    """
    Scenario: Multiple links clicked in same email
    When recipient clicks different links
    Then all URLs should be tracked
    """
    # Arrange
    email_log.status = "clicked"
    email_log.click_count = 1
    email_log.clicked_urls = [
        {"url": "https://hireflux.com/jobs/123", "clicked_at": "2025-11-23T10:00:00Z"}
    ]
    # Mock the record methods
    email_log.record_click = Mock()
    email_log.record_webhook_event = Mock()

    db_session.query.return_value.filter.return_value.first.return_value = email_log

    webhook_data = {
        "type": "email.clicked",
        "data": {
            "email_id": "resend_msg_123",
            "url": "https://hireflux.com/apply/123",
        },
    }

    # Act
    webhook_service.handle_clicked(webhook_data)

    # Assert
    assert email_log.click_count == 2  # Increments from 1 to 2
    email_log.record_click.assert_called_once_with("https://hireflux.com/apply/123")


# =========================================================================
# Test: Webhook Event Logging
# =========================================================================


def test_all_webhooks_logged_to_event_array(webhook_service, db_session, email_log):
    """
    Scenario: All webhook events are logged for audit
    When any webhook is processed
    Then event should be added to webhook_events array
    """
    # Arrange
    db_session.query.return_value.filter.return_value.first.return_value = email_log
    webhook_data = {
        "type": "email.delivered",
        "data": {"email_id": "resend_msg_123"},
    }

    # Act
    webhook_service.handle_delivered(webhook_data)

    # Assert
    assert email_log.webhook_events is not None
    assert len(email_log.webhook_events) > 0
    assert email_log.webhook_events[0]["type"] == "email.delivered"


# =========================================================================
# Test: Error Handling
# =========================================================================


def test_webhook_with_invalid_signature_rejected():
    """
    Scenario: Webhook with invalid signature
    When webhook received with wrong signature
    Then should reject with 401 Unauthorized
    """
    # This will be tested in API endpoint tests
    pass


def test_webhook_handles_database_error_gracefully(webhook_service, db_session):
    """
    Scenario: Database error during webhook processing
    When database commit fails
    Then should rollback and return error
    But not crash
    """
    # Arrange
    db_session.commit.side_effect = Exception("Database error")
    email_log = EmailDeliveryLog(message_id="test_123")
    db_session.query.return_value.filter.return_value.first.return_value = email_log

    webhook_data = {"type": "email.delivered", "data": {"email_id": "test_123"}}

    # Act
    result = webhook_service.handle_delivered(webhook_data)

    # Assert
    assert result["success"] is False
    assert "error" in result
    db_session.rollback.assert_called_once()


# =========================================================================
# Test: Analytics Calculations
# =========================================================================


def test_calculate_delivery_rate(webhook_service, db_session):
    """
    Scenario: Track email delivery rate
    Given 100 emails were sent in the past 24 hours
    And 99 were delivered successfully
    And 1 bounced
    When delivery rate is calculated
    Then delivery rate should be 99%
    """
    # Arrange
    mock_query = Mock()
    mock_query.filter.return_value.count.side_effect = [100, 99]  # Total, delivered
    db_session.query.return_value = mock_query

    # Act
    rate = webhook_service.calculate_delivery_rate(hours=24)

    # Assert
    assert rate == 99.0


def test_calculate_open_rate(webhook_service, db_session):
    """
    Scenario: Track email open rate
    Given 100 emails were delivered
    And 35 were opened
    When open rate is calculated
    Then open rate should be 35%
    """
    # Arrange
    mock_query = Mock()
    mock_query.filter.return_value.count.side_effect = [100, 35]  # Delivered, opened
    db_session.query.return_value = mock_query

    # Act
    rate = webhook_service.calculate_open_rate(hours=24)

    # Assert
    assert rate == 35.0


def test_calculate_click_through_rate(webhook_service, db_session):
    """
    Scenario: Track email click-through rate
    Given 100 emails were delivered
    And 14 had links clicked
    When click-through rate is calculated
    Then click-through rate should be 14%
    """
    # Arrange
    mock_query = Mock()
    mock_query.filter.return_value.count.side_effect = [100, 14]  # Delivered, clicked
    db_session.query.return_value = mock_query

    # Act
    rate = webhook_service.calculate_click_rate(hours=24)

    # Assert
    assert rate == 14.0
