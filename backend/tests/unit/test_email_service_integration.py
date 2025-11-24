"""
Unit Tests: Email Service Delivery Tracking Integration - Issue #52
Tests for email service integration with EmailDeliveryLog database tracking
"""

import pytest
from datetime import datetime
from unittest.mock import Mock, patch, MagicMock
from sqlalchemy.orm import Session

from app.services.email_service import EmailService
from app.schemas.notification import EmailSend
from app.db.models.email_delivery import EmailDeliveryLog


# =========================================================================
# Fixtures
# =========================================================================


@pytest.fixture
def db_session():
    """Mock database session"""
    session = Mock(spec=Session)
    session.add = Mock()
    session.commit = Mock()
    session.rollback = Mock()
    return session


@pytest.fixture
def mock_resend_client():
    """Mock Resend client"""
    client = Mock()
    client.emails = Mock()
    client.emails.send = Mock()
    return client


# =========================================================================
# Test: Email Delivery Logging with Database
# =========================================================================


@patch("app.services.email_service.resend")
@patch("app.services.email_service.settings")
def test_send_email_logs_to_database(mock_settings, mock_resend, db_session, mock_resend_client):
    """
    Scenario: Send email with database tracking
    Given email service is configured with database session
    When email is sent successfully
    Then EmailDeliveryLog record should be created
    And delivery status should be 'sent'
    """
    # Arrange
    mock_settings.RESEND_API_KEY = "test_api_key"
    mock_settings.FROM_EMAIL = "noreply@hireflux.com"
    mock_settings.FROM_NAME = "HireFlux"

    service = EmailService(db=db_session)
    service.client = mock_resend_client
    mock_resend_client.emails.send.return_value = {"id": "resend_msg_12345"}

    email_request = EmailSend(
        to_email="test@example.com",
        subject="Test Email",
        html_body="<p>Test content</p>",
        email_type="transactional",
        user_id="user_123",
    )

    # Act
    result = service.send_email(email_request)

    # Assert
    assert result["success"] is True
    assert result["message_id"] == "resend_msg_12345"

    # Verify database logging
    db_session.add.assert_called_once()
    email_log = db_session.add.call_args[0][0]

    assert isinstance(email_log, EmailDeliveryLog)
    assert email_log.to_email == "test@example.com"
    assert email_log.subject == "Test Email"
    assert email_log.email_type == "transactional"
    assert email_log.user_id == "user_123"
    assert email_log.message_id == "resend_msg_12345"
    assert email_log.status == "sent"
    assert email_log.from_email == "noreply@hireflux.com"

    db_session.commit.assert_called_once()


@patch("app.services.email_service.resend")
@patch("app.services.email_service.settings")
def test_send_email_without_database_logs_to_console(mock_settings, mock_resend, mock_resend_client):
    """
    Scenario: Send email without database session
    Given email service is configured without database session
    When email is sent successfully
    Then email should send successfully
    And should log to console only (no database error)
    """
    # Arrange
    mock_settings.RESEND_API_KEY = "test_api_key"
    mock_settings.FROM_EMAIL = "noreply@hireflux.com"
    mock_settings.FROM_NAME = "HireFlux"

    service = EmailService(db=None)
    service.client = mock_resend_client
    mock_resend_client.emails.send.return_value = {"id": "resend_msg_67890"}

    email_request = EmailSend(
        to_email="test@example.com",
        subject="Test Email",
        html_body="<p>Test content</p>",
        email_type="transactional",
    )

    # Act
    result = service.send_email(email_request)

    # Assert
    assert result["success"] is True
    assert result["message_id"] == "resend_msg_67890"
    # No database errors should occur


# =========================================================================
# Test: Email Type Tracking
# =========================================================================


@patch("app.services.email_service.resend")
@patch("app.services.email_service.settings")
def test_send_job_match_email_tracks_type(mock_settings, mock_resend, db_session, mock_resend_client):
    """
    Scenario: Send job match email with type tracking
    Given job match email is sent
    When email delivery is logged
    Then email_type should be 'job_match'
    """
    # Arrange
    mock_settings.RESEND_API_KEY = "test_api_key"
    mock_settings.FROM_EMAIL = "noreply@hireflux.com"
    mock_settings.FROM_NAME = "HireFlux"
    mock_settings.CORS_ORIGINS = ["https://hireflux.com"]

    service = EmailService(db=db_session)
    service.client = mock_resend_client
    mock_resend_client.emails.send.return_value = {"id": "resend_msg_job_123"}

    job_data = {
        "job_title": "Senior Software Engineer",
        "company_name": "TechCorp",
        "fit_score": 95,
        "job_url": "/jobs/123",
        "user_id": "user_456",
    }

    # Act
    result = service.send_job_match_email(
        to_email="candidate@example.com",
        user_name="John Doe",
        job_data=job_data,
    )

    # Assert
    assert result["success"] is True

    # Verify email type is tracked
    email_log = db_session.add.call_args[0][0]
    assert email_log.email_type == "job_match"
    assert email_log.user_id == "user_456"


# =========================================================================
# Test: Error Handling
# =========================================================================


@patch("app.services.email_service.resend")
@patch("app.services.email_service.settings")
def test_database_error_does_not_fail_email_send(mock_settings, mock_resend, db_session, mock_resend_client):
    """
    Scenario: Database logging fails but email still sends
    Given database commit fails
    When email is sent
    Then email should still send successfully
    And error should be logged but not raised
    """
    # Arrange
    mock_settings.RESEND_API_KEY = "test_api_key"
    mock_settings.FROM_EMAIL = "noreply@hireflux.com"
    mock_settings.FROM_NAME = "HireFlux"

    service = EmailService(db=db_session)
    service.client = mock_resend_client
    mock_resend_client.emails.send.return_value = {"id": "resend_msg_error_123"}
    db_session.commit.side_effect = Exception("Database error")

    email_request = EmailSend(
        to_email="test@example.com",
        subject="Test Email",
        html_body="<p>Test content</p>",
        email_type="transactional",
    )

    # Act
    result = service.send_email(email_request)

    # Assert
    assert result["success"] is True  # Email still sent
    assert result["message_id"] == "resend_msg_error_123"
    db_session.rollback.assert_called_once()
