"""Unit tests for WebhookDeliveryService (TDD)

Sprint 17-18: Enterprise Features - Webhook Delivery System

This service delivers webhooks TO external systems (employer integration endpoints),
distinct from the existing webhook_service.py which receives webhooks FROM job boards.

Test-Driven Development approach:
1. Write tests first (RED phase)
2. Implement minimal code to pass tests (GREEN phase)
3. Refactor for quality (REFACTOR phase)
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from unittest.mock import Mock, MagicMock, patch, AsyncMock
import json
import hmac
import hashlib

from app.services.webhook_delivery_service import WebhookDeliveryService
from app.db.models.company import Company
from app.db.models.user import User
from app.db.models.api_key import Webhook, WebhookDelivery
from app.schemas.api_key import WebhookCreate, WebhookUpdate


# ============================================================================
# TEST FIXTURES
# ============================================================================


@pytest.fixture
def mock_db():
    """Mock database session"""
    return MagicMock()


@pytest.fixture
def webhook_delivery_service(mock_db):
    """Initialize WebhookDeliveryService with mocked DB"""
    return WebhookDeliveryService(db=mock_db)


@pytest.fixture
def test_company():
    """Test company with Professional plan"""
    return Company(
        id=uuid4(),
        name="TechCorp Inc",
        subscription_tier="professional",
        subscription_status="active",
        created_at=datetime.utcnow(),
    )


@pytest.fixture
def test_user():
    """Test user (company admin)"""
    return User(
        id=uuid4(),
        email="admin@techcorp.com",
        created_at=datetime.utcnow(),
    )


@pytest.fixture
def test_webhook(test_company, test_user):
    """Test webhook configuration"""
    return Webhook(
        id=uuid4(),
        company_id=test_company.id,
        url="https://api.example.com/webhooks/hireflux",
        description="Production webhook",
        events=["application.created", "job.published"],
        secret="whsec_test123456789abcdefghijklmnopqrstuvwxyz123456",
        is_active=True,
        retry_policy={"max_attempts": 3, "backoff_seconds": [60, 300, 900]},
        headers={"X-Custom-Header": "value"},
        failure_count=0,
        created_by=test_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )


# ============================================================================
# TEST SUITE 1: WEBHOOK CREATION & MANAGEMENT
# ============================================================================


class TestWebhookCreation:
    """Test suite for creating and managing webhook configurations"""

    def test_create_webhook_success(
        self, webhook_delivery_service, test_company, test_user
    ):
        """
        GIVEN: Valid webhook creation request
        WHEN: create_webhook(company_id, user_id, data)
        THEN: Returns webhook with generated secret
        """
        # Arrange
        webhook_data = WebhookCreate(
            url="https://api.example.com/webhooks",
            description="Test webhook",
            events=["application.created", "job.published"],
        )

        webhook_delivery_service.db.add = Mock()
        webhook_delivery_service.db.commit = Mock()
        webhook_delivery_service.db.refresh = Mock()

        # Act
        result = webhook_delivery_service.create_webhook(
            company_id=test_company.id,
            user_id=test_user.id,
            webhook_data=webhook_data,
        )

        # Assert
        assert result is not None
        assert result.url == "https://api.example.com/webhooks"
        assert result.events == ["application.created", "job.published"]
        assert result.secret is not None
        assert result.secret.startswith("whsec_")
        assert len(result.secret) == 56  # whsec_ + 48 chars
        assert result.is_active is True
        webhook_delivery_service.db.add.assert_called_once()
        webhook_delivery_service.db.commit.assert_called_once()

    def test_list_webhooks(self, webhook_delivery_service, test_company):
        """
        GIVEN: Company with 3 webhooks
        WHEN: list_webhooks(company_id)
        THEN: Returns all webhooks with pagination
        """
        # Arrange
        mock_webhooks = [
            Webhook(id=uuid4(), company_id=test_company.id, url="https://ex1.com"),
            Webhook(id=uuid4(), company_id=test_company.id, url="https://ex2.com"),
            Webhook(id=uuid4(), company_id=test_company.id, url="https://ex3.com"),
        ]
        webhook_delivery_service.db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = (
            mock_webhooks
        )
        webhook_delivery_service.db.query.return_value.filter.return_value.count.return_value = (
            3
        )

        # Act
        result = webhook_delivery_service.list_webhooks(
            company_id=test_company.id, page=1, page_size=20
        )

        # Assert
        assert result["webhooks"] == mock_webhooks
        assert result["total"] == 3


# ============================================================================
# TEST SUITE 2: WEBHOOK DELIVERY
# ============================================================================


class TestWebhookDelivery:
    """Test suite for delivering webhooks to external endpoints"""

    @pytest.mark.asyncio
    async def test_deliver_webhook_success(
        self, webhook_delivery_service, test_webhook
    ):
        """
        GIVEN: Webhook with valid URL and event payload
        WHEN: deliver_webhook(webhook, event_type, payload)
        THEN: Sends HTTP POST with HMAC signature and logs success
        """
        # Arrange
        event_type = "application.created"
        payload = {
            "event": "application.created",
            "data": {
                "application_id": str(uuid4()),
                "job_id": str(uuid4()),
                "candidate_id": str(uuid4()),
            },
            "timestamp": datetime.utcnow().isoformat(),
        }

        # Mock HTTP client
        with patch("aiohttp.ClientSession") as mock_session:
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.text = AsyncMock(return_value="OK")
            mock_post = AsyncMock(return_value=mock_response)
            mock_session.return_value.__aenter__.return_value.post = mock_post

            webhook_delivery_service.db.add = Mock()
            webhook_delivery_service.db.commit = Mock()

            # Act
            delivery = await webhook_delivery_service.deliver_webhook(
                webhook=test_webhook,
                event_type=event_type,
                payload=payload,
            )

            # Assert
            assert delivery.status == "success"
            assert delivery.http_status_code == 200
            assert delivery.event_type == event_type
            assert delivery.attempt_number == 1
            assert delivery.delivered_at is not None
            webhook_delivery_service.db.add.assert_called()

    @pytest.mark.asyncio
    async def test_deliver_webhook_with_hmac_signature(
        self, webhook_delivery_service, test_webhook
    ):
        """
        GIVEN: Webhook with secret
        WHEN: deliver_webhook(webhook, event_type, payload)
        THEN: Includes HMAC signature in headers
        """
        # Arrange
        event_type = "application.created"
        payload = {"event": "application.created", "data": {}}

        captured_headers = {}

        async def capture_post(url, **kwargs):
            captured_headers.update(kwargs.get("headers", {}))
            mock_response = AsyncMock()
            mock_response.status = 200
            mock_response.text = AsyncMock(return_value="OK")
            return mock_response

        with patch("aiohttp.ClientSession") as mock_session:
            mock_session.return_value.__aenter__.return_value.post = capture_post

            webhook_delivery_service.db.add = Mock()
            webhook_delivery_service.db.commit = Mock()

            # Act
            await webhook_delivery_service.deliver_webhook(
                webhook=test_webhook,
                event_type=event_type,
                payload=payload,
            )

            # Assert
            assert "X-Webhook-Signature" in captured_headers

            # Verify HMAC
            payload_str = json.dumps(payload, sort_keys=True)
            expected_sig = hmac.new(
                test_webhook.secret.encode(),
                payload_str.encode(),
                hashlib.sha256,
            ).hexdigest()
            assert captured_headers["X-Webhook-Signature"] == f"sha256={expected_sig}"

    @pytest.mark.asyncio
    async def test_deliver_webhook_retry_on_failure(
        self, webhook_delivery_service, test_webhook
    ):
        """
        GIVEN: Webhook delivery fails (500 error)
        WHEN: deliver_webhook(webhook, event_type, payload)
        THEN: Logs failure and schedules retry
        """
        # Arrange
        event_type = "application.created"
        payload = {"event": "application.created"}

        with patch("aiohttp.ClientSession") as mock_session:
            mock_response = AsyncMock()
            mock_response.status = 500
            mock_response.text = AsyncMock(return_value="Internal Server Error")
            mock_post = AsyncMock(return_value=mock_response)
            mock_session.return_value.__aenter__.return_value.post = mock_post

            webhook_delivery_service.db.add = Mock()
            webhook_delivery_service.db.commit = Mock()

            # Act
            delivery = await webhook_delivery_service.deliver_webhook(
                webhook=test_webhook,
                event_type=event_type,
                payload=payload,
                attempt_number=1,
            )

            # Assert
            assert delivery.status == "failed"
            assert delivery.http_status_code == 500
            assert delivery.next_retry_at is not None
            # First retry after 60 seconds
            expected_retry = datetime.utcnow() + timedelta(seconds=60)
            assert abs((delivery.next_retry_at - expected_retry).total_seconds()) < 5


# ============================================================================
# TEST SUITE 3: EVENT SUBSCRIPTION & VALIDATION
# ============================================================================


class TestEventSubscription:
    """Test suite for webhook event subscription management"""

    def test_is_event_subscribed_returns_true(
        self, webhook_delivery_service, test_webhook
    ):
        """
        GIVEN: Webhook subscribed to application.created
        WHEN: is_event_subscribed(webhook, 'application.created')
        THEN: Returns True
        """
        # Act
        result = webhook_delivery_service.is_event_subscribed(
            webhook=test_webhook, event_type="application.created"
        )

        # Assert
        assert result is True

    def test_is_event_subscribed_returns_false(
        self, webhook_delivery_service, test_webhook
    ):
        """
        GIVEN: Webhook not subscribed to interview.scheduled
        WHEN: is_event_subscribed(webhook, 'interview.scheduled')
        THEN: Returns False
        """
        # Act
        result = webhook_delivery_service.is_event_subscribed(
            webhook=test_webhook, event_type="interview.scheduled"
        )

        # Assert
        assert result is False

    def test_get_webhooks_for_event(self, webhook_delivery_service, test_company):
        """
        GIVEN: 2 active webhooks subscribed to application.created
        WHEN: get_webhooks_for_event(company_id, 'application.created')
        THEN: Returns only subscribed and active webhooks
        """
        # Arrange
        webhook1 = Webhook(
            id=uuid4(),
            company_id=test_company.id,
            events=["application.created"],
            is_active=True,
        )
        webhook2 = Webhook(
            id=uuid4(),
            company_id=test_company.id,
            events=["application.created", "job.published"],
            is_active=True,
        )
        webhook3 = Webhook(
            id=uuid4(),
            company_id=test_company.id,
            events=["job.published"],
            is_active=True,
        )
        webhook4 = Webhook(
            id=uuid4(),
            company_id=test_company.id,
            events=["application.created"],
            is_active=False,  # Inactive
        )

        all_webhooks = [webhook1, webhook2, webhook3, webhook4]
        webhook_delivery_service.db.query.return_value.filter.return_value.all.return_value = (
            all_webhooks
        )

        # Act
        result = webhook_delivery_service.get_webhooks_for_event(
            company_id=test_company.id, event_type="application.created"
        )

        # Assert
        assert len(result) == 2
        assert webhook1 in result
        assert webhook2 in result
        assert webhook3 not in result
        assert webhook4 not in result  # Inactive excluded


# ============================================================================
# TEST SUITE 4: WEBHOOK SECURITY
# ============================================================================


class TestWebhookSecurity:
    """Test suite for webhook security features"""

    def test_generate_webhook_secret(self, webhook_delivery_service):
        """
        GIVEN: Generate multiple webhook secrets
        WHEN: _generate_webhook_secret()
        THEN: Each secret is unique and properly formatted
        """
        # Act
        secrets = [webhook_delivery_service._generate_webhook_secret() for _ in range(10)]

        # Assert
        assert len(set(secrets)) == 10  # All unique
        for secret in secrets:
            assert secret.startswith("whsec_")
            assert len(secret) == 56

    def test_compute_signature(self, webhook_delivery_service, test_webhook):
        """
        GIVEN: Webhook payload
        WHEN: _compute_signature(webhook, payload)
        THEN: Returns consistent HMAC signature
        """
        # Arrange
        payload = {"event": "test", "data": {}}
        payload_str = json.dumps(payload, sort_keys=True)

        # Act
        sig1 = webhook_delivery_service._compute_signature(test_webhook, payload_str)
        sig2 = webhook_delivery_service._compute_signature(test_webhook, payload_str)

        # Assert
        assert sig1 == sig2  # Deterministic
        assert sig1.startswith("sha256=")
        assert len(sig1) == 71  # sha256= + 64 hex chars


# ============================================================================
# TEST SUITE 5: FAILURE HANDLING & AUTO-DISABLE
# ============================================================================


class TestFailureHandling:
    """Test suite for webhook failure handling"""

    def test_increment_failure_count(self, webhook_delivery_service, test_webhook):
        """
        GIVEN: Webhook with 5 failures
        WHEN: record_failure(webhook)
        THEN: Increments failure count
        """
        # Arrange
        test_webhook.failure_count = 5
        webhook_delivery_service.db.commit = Mock()

        # Act
        webhook_delivery_service.record_failure(test_webhook)

        # Assert
        assert test_webhook.failure_count == 6
        webhook_delivery_service.db.commit.assert_called_once()

    def test_auto_disable_after_10_failures(
        self, webhook_delivery_service, test_webhook
    ):
        """
        GIVEN: Webhook with 9 failures
        WHEN: record_failure(webhook) for 10th time
        THEN: Auto-disables webhook
        """
        # Arrange
        test_webhook.failure_count = 9
        webhook_delivery_service.db.commit = Mock()

        # Act
        webhook_delivery_service.record_failure(test_webhook)

        # Assert
        assert test_webhook.failure_count == 10
        assert test_webhook.is_active is False
        assert test_webhook.disabled_at is not None

    def test_reset_failure_count_on_success(
        self, webhook_delivery_service, test_webhook
    ):
        """
        GIVEN: Webhook with 5 failures
        WHEN: record_success(webhook)
        THEN: Resets failure count to 0
        """
        # Arrange
        test_webhook.failure_count = 5
        webhook_delivery_service.db.commit = Mock()

        # Act
        webhook_delivery_service.record_success(test_webhook)

        # Assert
        assert test_webhook.failure_count == 0
        assert test_webhook.last_triggered_at is not None


# ============================================================================
# TEST SUITE 6: RETRY LOGIC
# ============================================================================


class TestRetryLogic:
    """Test suite for webhook retry logic"""

    def test_calculate_next_retry_time(self, webhook_delivery_service, test_webhook):
        """
        GIVEN: Webhook with exponential backoff policy
        WHEN: calculate_next_retry(webhook, attempt_number)
        THEN: Returns correct retry time based on attempt
        """
        # Act
        retry1 = webhook_delivery_service.calculate_next_retry(test_webhook, 1)
        retry2 = webhook_delivery_service.calculate_next_retry(test_webhook, 2)
        retry3 = webhook_delivery_service.calculate_next_retry(test_webhook, 3)

        # Assert
        now = datetime.utcnow()
        assert abs((retry1 - (now + timedelta(seconds=60))).total_seconds()) < 5
        assert abs((retry2 - (now + timedelta(seconds=300))).total_seconds()) < 5
        assert abs((retry3 - (now + timedelta(seconds=900))).total_seconds()) < 5

    def test_should_retry_returns_true_within_max_attempts(
        self, webhook_delivery_service, test_webhook
    ):
        """
        GIVEN: Webhook with max_attempts=3
        WHEN: should_retry(webhook, attempt_number=2)
        THEN: Returns True (not exceeded)
        """
        # Act
        result = webhook_delivery_service.should_retry(test_webhook, attempt_number=2)

        # Assert
        assert result is True

    def test_should_retry_returns_false_when_exceeded(
        self, webhook_delivery_service, test_webhook
    ):
        """
        GIVEN: Webhook with max_attempts=3
        WHEN: should_retry(webhook, attempt_number=4)
        THEN: Returns False (exceeded)
        """
        # Act
        result = webhook_delivery_service.should_retry(test_webhook, attempt_number=4)

        # Assert
        assert result is False


# ============================================================================
# TEST SUITE 7: WEBHOOK DELIVERY HISTORY
# ============================================================================


class TestDeliveryHistory:
    """Test suite for webhook delivery history tracking"""

    def test_get_delivery_history(self, webhook_delivery_service, test_webhook):
        """
        GIVEN: Webhook with 5 delivery attempts
        WHEN: get_delivery_history(webhook_id, limit=10)
        THEN: Returns delivery records ordered by created_at DESC
        """
        # Arrange
        mock_deliveries = [
            WebhookDelivery(
                id=uuid4(),
                webhook_id=test_webhook.id,
                event_type="application.created",
                status="success",
                created_at=datetime.utcnow() - timedelta(minutes=i),
            )
            for i in range(5)
        ]
        webhook_delivery_service.db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = (
            mock_deliveries
        )

        # Act
        result = webhook_delivery_service.get_delivery_history(
            webhook_id=test_webhook.id, limit=10
        )

        # Assert
        assert len(result) == 5

    def test_get_delivery_stats(self, webhook_delivery_service, test_webhook):
        """
        GIVEN: Webhook with mixed delivery results
        WHEN: get_delivery_stats(webhook_id, days=30)
        THEN: Returns success/failure counts and avg response time
        """
        # Arrange
        webhook_delivery_service.db.query.return_value.filter.return_value.filter.return_value.count.side_effect = [
            100,  # Total
            90,  # Success
            10,  # Failed
        ]
        webhook_delivery_service.db.query.return_value.filter.return_value.filter.return_value.scalar.return_value = (
            250  # Avg response time
        )

        # Act
        stats = webhook_delivery_service.get_delivery_stats(
            webhook_id=test_webhook.id, days=30
        )

        # Assert
        assert stats["total_deliveries"] == 100
        assert stats["successful_deliveries"] == 90
        assert stats["failed_deliveries"] == 10
        assert stats["success_rate"] == 90.0
        assert stats["avg_response_time_ms"] == 250
