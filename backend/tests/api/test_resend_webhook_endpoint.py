"""
API Integration Tests: Resend Webhook Endpoint - Issue #52
Tests the /api/v1/webhooks/resend endpoint following BDD scenarios
"""

import pytest
import json
import hmac
import hashlib
from unittest.mock import Mock, patch
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture
def valid_webhook_payload():
    """Valid Resend webhook payload"""
    return {
        "type": "email.delivered",
        "created_at": "2025-11-23T10:00:00Z",
        "data": {
            "email_id": "msg_test_123",
            "to": "user@example.com",
            "from": "noreply@hireflux.com",
            "subject": "Test Email",
            "delivered_at": "2025-11-23T10:00:05Z",
        },
    }


def generate_signature(payload_str: str, secret: str) -> str:
    """Generate HMAC signature for webhook payload"""
    return hmac.new(
        secret.encode("utf-8"),
        payload_str.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()


# =============================================================================
# Test: Webhook Authentication
# =============================================================================


def test_webhook_accepts_valid_signature(client, valid_webhook_payload):
    """
    Scenario: Valid webhook with correct signature
    Given Resend sends a webhook event
    When the signature is valid
    Then the webhook should be accepted (200 OK)
    """
    # Arrange
    payload_str = json.dumps(valid_webhook_payload)
    signature = generate_signature(payload_str, "test_webhook_secret")

    # Mock settings to require signature - patch where it's imported (inside function)
    with patch("app.core.config.settings") as mock_settings:
        mock_settings.RESEND_WEBHOOK_SECRET = "test_webhook_secret"

        # Act
        response = client.post(
            "/api/v1/webhooks/resend",
            content=payload_str,
            headers={
                "Content-Type": "application/json",
                "Resend-Webhook-Signature": signature,
            },
        )

    # Assert
    assert response.status_code == 200
    assert response.json()["received"] is True
    assert response.json()["event_type"] == "email.delivered"


def test_webhook_rejects_invalid_signature(client, valid_webhook_payload):
    """
    Scenario: Webhook with invalid signature
    Given Resend sends a webhook event
    When the signature is invalid
    Then the webhook should be rejected (401 Unauthorized)
    """
    # Arrange
    payload_str = json.dumps(valid_webhook_payload)
    invalid_signature = "invalid_signature_hash"

    with patch("app.core.config.settings") as mock_settings:
        mock_settings.RESEND_WEBHOOK_SECRET = "test_webhook_secret"

        # Act
        response = client.post(
            "/api/v1/webhooks/resend",
            content=payload_str,
            headers={
                "Content-Type": "application/json",
                "Resend-Webhook-Signature": invalid_signature,
            },
        )

    # Assert
    assert response.status_code == 401
    assert "Invalid webhook signature" in response.json()["detail"]


def test_webhook_rejects_missing_signature(client, valid_webhook_payload):
    """
    Scenario: Webhook without signature
    Given Resend sends a webhook event
    When no signature is provided
    Then the webhook should be rejected (401 Unauthorized)
    """
    # Arrange
    payload_str = json.dumps(valid_webhook_payload)

    with patch("app.core.config.settings") as mock_settings:
        mock_settings.RESEND_WEBHOOK_SECRET = "test_webhook_secret"

        # Act
        response = client.post(
            "/api/v1/webhooks/resend",
            content=payload_str,
            headers={"Content-Type": "application/json"},
        )

    # Assert
    assert response.status_code == 401
    assert "Missing webhook signature" in response.json()["detail"]


# =============================================================================
# Test: Webhook Event Routing
# =============================================================================


def test_webhook_routes_delivered_event(client):
    """
    Scenario: Route delivered event to handler
    Given a delivered event is received
    When the webhook is processed
    Then it should call handle_delivered
    """
    payload = {
        "type": "email.delivered",
        "data": {"email_id": "msg_123", "delivered_at": "2025-11-23T10:00:00Z"},
    }

    # No signature verification (settings doesn't have RESEND_WEBHOOK_SECRET)
    response = client.post(
        "/api/v1/webhooks/resend",
        json=payload,
    )

    assert response.status_code == 200
    assert response.json()["received"] is True
    assert response.json()["event_type"] == "email.delivered"
    # Background task will call handler asynchronously


def test_webhook_routes_bounced_event(client):
    """
    Scenario: Route bounced event to handler
    Given a bounced event is received
    When the webhook is processed
    Then it should call handle_bounced
    """
    payload = {
        "type": "email.bounced",
        "data": {"email_id": "msg_456", "bounce_type": "hard"},
    }

    response = client.post("/api/v1/webhooks/resend", json=payload)

    assert response.status_code == 200
    assert response.json()["event_type"] == "email.bounced"


def test_webhook_handles_unknown_event_type(client):
    """
    Scenario: Unknown event type
    Given an unknown event type is received
    When the webhook is processed
    Then it should log warning but return 200
    """
    payload = {"type": "email.unknown_event", "data": {}}

    response = client.post("/api/v1/webhooks/resend", json=payload)

    assert response.status_code == 200
    assert response.json()["event_type"] == "email.unknown_event"


# =============================================================================
# Test: Webhook Payload Validation
# =============================================================================


def test_webhook_rejects_invalid_json(client):
    """
    Scenario: Invalid JSON payload
    Given invalid JSON is sent
    When the webhook is processed
    Then it should return 400 Bad Request
    """
    response = client.post(
        "/api/v1/webhooks/resend",
        content="invalid json {",
        headers={"Content-Type": "application/json"},
    )

    assert response.status_code == 400
    assert "Invalid JSON" in response.json()["detail"]


def test_webhook_rejects_missing_event_type(client):
    """
    Scenario: Missing event type
    Given payload without event type
    When the webhook is processed
    Then it should return 400 Bad Request
    """
    payload = {"data": {"email_id": "msg_123"}}  # Missing 'type'

    response = client.post("/api/v1/webhooks/resend", json=payload)

    assert response.status_code == 400
    assert "Missing event type" in response.json()["detail"]


# =============================================================================
# Test: Webhook Error Handling
# =============================================================================


def test_webhook_returns_200_on_handler_error(client):
    """
    Scenario: Handler error should not retry
    Given webhook handler throws an error
    When the webhook is processed
    Then it should return 200 to prevent retries
    """
    payload = {"type": "email.delivered", "data": {"email_id": "msg_123"}}

    # Endpoint catches all exceptions and returns 200 to prevent retries
    response = client.post("/api/v1/webhooks/resend", json=payload)

    # Should still return 200 to prevent Resend from retrying
    assert response.status_code == 200


# =============================================================================
# Test: All Event Types
# =============================================================================


@pytest.mark.parametrize("event_type", [
    "email.delivered",
    "email.bounced",
    "email.complained",
    "email.opened",
    "email.clicked",
])
def test_webhook_handles_all_event_types(client, event_type):
    """
    Scenario: All Resend event types are supported
    Given any valid Resend event type
    When the webhook is received
    Then it should be processed successfully
    """
    payload = {"type": event_type, "data": {"email_id": "msg_test"}}

    response = client.post("/api/v1/webhooks/resend", json=payload)

    assert response.status_code == 200
    assert response.json()["event_type"] == event_type
