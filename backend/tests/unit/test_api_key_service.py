"""Unit tests for APIKeyService (TDD)

Sprint 17-18: Enterprise Features & Scale - API Key Management

Test-Driven Development approach:
1. Write tests first (RED phase)
2. Implement minimal code to pass tests (GREEN phase)
3. Refactor for quality (REFACTOR phase)
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from unittest.mock import Mock, MagicMock, patch
import hashlib
import secrets

from app.services.api_key_service import APIKeyService
from app.db.models.company import Company
from app.db.models.user import User
from app.db.models.api_key import APIKey, APIKeyUsage
from app.schemas.api_key import APIKeyCreate, APIKeyPermissions, APIKeyUpdate


# ============================================================================
# TEST FIXTURES
# ============================================================================


@pytest.fixture
def mock_db():
    """Mock database session"""
    return MagicMock()


@pytest.fixture
def api_key_service(mock_db):
    """Initialize APIKeyService with mocked DB"""
    return APIKeyService(db=mock_db)


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
def test_api_key(test_company, test_user):
    """Test API key"""
    return APIKey(
        id=uuid4(),
        company_id=test_company.id,
        name="Production API Key",
        key_prefix="hf_live_abc12345",
        key_hash=hashlib.sha256("test_key".encode()).hexdigest(),
        permissions={
            "jobs": ["read", "write"],
            "candidates": ["read"],
            "applications": ["read", "write"],
        },
        rate_limit_tier="elevated",
        rate_limit_requests_per_minute=120,
        rate_limit_requests_per_hour=6000,
        status="active",
        created_by=test_user.id,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )


# ============================================================================
# TEST SUITE 1: API KEY CREATION
# ============================================================================


class TestAPIKeyCreation:
    """Test suite for creating API keys"""

    def test_create_api_key_success(self, api_key_service, test_company, test_user):
        """
        GIVEN: Valid API key creation request with permissions
        WHEN: create_api_key(company_id, user_id, data)
        THEN: Returns API key with plaintext key and proper hash
        """
        # Arrange
        key_data = APIKeyCreate(
            name="Production API",
            permissions=APIKeyPermissions(
                jobs=["read", "write"],
                candidates=["read"],
            ),
            rate_limit_tier="elevated",
        )

        # Mock DB save
        api_key_service.db.add = Mock()
        api_key_service.db.commit = Mock()
        api_key_service.db.refresh = Mock()

        # Act
        result = api_key_service.create_api_key(
            company_id=test_company.id,
            user_id=test_user.id,
            key_data=key_data,
        )

        # Assert
        assert result is not None
        assert result["api_key"] is not None
        assert result["plaintext_key"] is not None
        assert result["plaintext_key"].startswith("hf_live_")
        assert len(result["plaintext_key"]) == 56  # hf_live_ + 48 char random
        assert result["api_key"].name == "Production API"
        assert result["api_key"].key_prefix == result["plaintext_key"][:16]
        assert result["api_key"].status == "active"
        assert result["api_key"].rate_limit_tier == "elevated"
        assert result["api_key"].rate_limit_requests_per_minute == 120
        api_key_service.db.add.assert_called_once()
        api_key_service.db.commit.assert_called_once()

    def test_create_api_key_with_default_permissions(
        self, api_key_service, test_company, test_user
    ):
        """
        GIVEN: API key creation without explicit permissions
        WHEN: create_api_key(company_id, user_id, data)
        THEN: Returns API key with default read-only permissions
        """
        # Arrange
        key_data = APIKeyCreate(
            name="Read-Only API",
            rate_limit_tier="standard",
        )

        api_key_service.db.add = Mock()
        api_key_service.db.commit = Mock()
        api_key_service.db.refresh = Mock()

        # Act
        result = api_key_service.create_api_key(
            company_id=test_company.id,
            user_id=test_user.id,
            key_data=key_data,
        )

        # Assert
        assert result["api_key"].permissions["jobs"] == ["read"]
        assert result["api_key"].permissions["candidates"] == ["read"]
        assert result["api_key"].rate_limit_tier == "standard"
        assert result["api_key"].rate_limit_requests_per_minute == 60

    def test_create_api_key_with_expiration(
        self, api_key_service, test_company, test_user
    ):
        """
        GIVEN: API key creation with expiration date
        WHEN: create_api_key(company_id, user_id, data)
        THEN: Returns API key with expires_at set
        """
        # Arrange
        expires_at = datetime.utcnow() + timedelta(days=90)
        key_data = APIKeyCreate(
            name="Temporary API",
            expires_at=expires_at,
        )

        api_key_service.db.add = Mock()
        api_key_service.db.commit = Mock()
        api_key_service.db.refresh = Mock()

        # Act
        result = api_key_service.create_api_key(
            company_id=test_company.id,
            user_id=test_user.id,
            key_data=key_data,
        )

        # Assert
        assert result["api_key"].expires_at is not None
        assert result["api_key"].expires_at == expires_at

    def test_create_api_key_plan_limit_check(
        self, api_key_service, test_company, test_user
    ):
        """
        GIVEN: Company on Starter plan (no API access)
        WHEN: create_api_key(company_id, user_id, data)
        THEN: Raises PermissionError
        """
        # Arrange
        test_company.subscription_tier = "starter"
        key_data = APIKeyCreate(name="Should Fail")

        # Act & Assert
        with pytest.raises(PermissionError) as exc:
            api_key_service.create_api_key(
                company_id=test_company.id,
                user_id=test_user.id,
                key_data=key_data,
            )
        assert "API access not available" in str(exc.value)


# ============================================================================
# TEST SUITE 2: API KEY VALIDATION
# ============================================================================


class TestAPIKeyValidation:
    """Test suite for validating API keys"""

    def test_validate_api_key_success(self, api_key_service, test_api_key):
        """
        GIVEN: Valid active API key with correct plaintext
        WHEN: validate_api_key(plaintext_key)
        THEN: Returns API key object and updates last_used_at
        """
        # Arrange
        plaintext_key = "test_key"
        key_hash = hashlib.sha256(plaintext_key.encode()).hexdigest()
        test_api_key.key_hash = key_hash
        test_api_key.key_prefix = "hf_live_test"

        # Mock DB query
        api_key_service.db.query.return_value.filter.return_value.first.return_value = (
            test_api_key
        )
        api_key_service.db.commit = Mock()

        # Act
        result = api_key_service.validate_api_key(
            plaintext_key=plaintext_key,
            ip_address="192.168.1.1",
        )

        # Assert
        assert result is not None
        assert result.id == test_api_key.id
        assert result.last_used_at is not None
        assert result.last_used_ip == "192.168.1.1"
        api_key_service.db.commit.assert_called_once()

    def test_validate_api_key_invalid_hash(self, api_key_service, test_api_key):
        """
        GIVEN: API key with incorrect plaintext
        WHEN: validate_api_key(wrong_plaintext_key)
        THEN: Returns None
        """
        # Arrange
        test_api_key.key_hash = hashlib.sha256("correct_key".encode()).hexdigest()
        api_key_service.db.query.return_value.filter.return_value.first.return_value = (
            test_api_key
        )

        # Act
        result = api_key_service.validate_api_key(
            plaintext_key="wrong_key",
            ip_address="192.168.1.1",
        )

        # Assert
        assert result is None

    def test_validate_api_key_revoked(self, api_key_service, test_api_key):
        """
        GIVEN: Revoked API key
        WHEN: validate_api_key(plaintext_key)
        THEN: Returns None
        """
        # Arrange
        test_api_key.status = "revoked"
        test_api_key.revoked_at = datetime.utcnow()
        api_key_service.db.query.return_value.filter.return_value.first.return_value = (
            test_api_key
        )

        # Act
        result = api_key_service.validate_api_key(
            plaintext_key="test_key",
            ip_address="192.168.1.1",
        )

        # Assert
        assert result is None

    def test_validate_api_key_expired(self, api_key_service, test_api_key):
        """
        GIVEN: Expired API key
        WHEN: validate_api_key(plaintext_key)
        THEN: Returns None
        """
        # Arrange
        test_api_key.expires_at = datetime.utcnow() - timedelta(days=1)
        api_key_service.db.query.return_value.filter.return_value.first.return_value = (
            test_api_key
        )

        # Act
        result = api_key_service.validate_api_key(
            plaintext_key="test_key",
            ip_address="192.168.1.1",
        )

        # Assert
        assert result is None


# ============================================================================
# TEST SUITE 3: API KEY MANAGEMENT
# ============================================================================


class TestAPIKeyManagement:
    """Test suite for managing API keys"""

    def test_list_api_keys(self, api_key_service, test_company):
        """
        GIVEN: Company with 3 API keys (2 active, 1 revoked)
        WHEN: list_api_keys(company_id)
        THEN: Returns all API keys with pagination
        """
        # Arrange
        mock_keys = [
            APIKey(id=uuid4(), company_id=test_company.id, status="active"),
            APIKey(id=uuid4(), company_id=test_company.id, status="active"),
            APIKey(id=uuid4(), company_id=test_company.id, status="revoked"),
        ]
        api_key_service.db.query.return_value.filter.return_value.order_by.return_value.offset.return_value.limit.return_value.all.return_value = (
            mock_keys
        )
        api_key_service.db.query.return_value.filter.return_value.count.return_value = 3

        # Act
        result = api_key_service.list_api_keys(
            company_id=test_company.id, page=1, page_size=20
        )

        # Assert
        assert result["keys"] == mock_keys
        assert result["total"] == 3
        assert result["page"] == 1

    def test_revoke_api_key_success(
        self, api_key_service, test_api_key, test_user
    ):
        """
        GIVEN: Active API key
        WHEN: revoke_api_key(key_id, user_id)
        THEN: Marks key as revoked with timestamp
        """
        # Arrange
        api_key_service.db.query.return_value.filter.return_value.first.return_value = (
            test_api_key
        )
        api_key_service.db.commit = Mock()

        # Act
        result = api_key_service.revoke_api_key(
            key_id=test_api_key.id,
            company_id=test_api_key.company_id,
            revoked_by=test_user.id,
        )

        # Assert
        assert result.status == "revoked"
        assert result.revoked_at is not None
        assert result.revoked_by == test_user.id
        api_key_service.db.commit.assert_called_once()

    def test_update_api_key_permissions(self, api_key_service, test_api_key):
        """
        GIVEN: API key with limited permissions
        WHEN: update_api_key(key_id, new_permissions)
        THEN: Updates permissions and updated_at
        """
        # Arrange
        update_data = APIKeyUpdate(
            permissions=APIKeyPermissions(
                jobs=["read", "write", "delete"],
                candidates=["read", "write"],
            )
        )
        api_key_service.db.query.return_value.filter.return_value.first.return_value = (
            test_api_key
        )
        api_key_service.db.commit = Mock()

        # Act
        result = api_key_service.update_api_key(
            key_id=test_api_key.id,
            company_id=test_api_key.company_id,
            update_data=update_data,
        )

        # Assert
        assert result.permissions["jobs"] == ["read", "write", "delete"]
        assert result.permissions["candidates"] == ["read", "write"]
        api_key_service.db.commit.assert_called_once()


# ============================================================================
# TEST SUITE 4: RATE LIMITING
# ============================================================================


class TestRateLimiting:
    """Test suite for rate limiting checks"""

    def test_check_rate_limit_within_limits(self, api_key_service, test_api_key):
        """
        GIVEN: API key with 50 requests in last minute (limit: 60)
        WHEN: check_rate_limit(api_key_id)
        THEN: Returns True (allowed)
        """
        # Arrange
        one_minute_ago = datetime.utcnow() - timedelta(minutes=1)
        mock_count = 50
        api_key_service.db.query.return_value.filter.return_value.filter.return_value.count.return_value = (
            mock_count
        )

        # Act
        result = api_key_service.check_rate_limit(
            api_key=test_api_key, window="minute"
        )

        # Assert
        assert result is True

    def test_check_rate_limit_exceeded(self, api_key_service, test_api_key):
        """
        GIVEN: API key with 125 requests in last minute (limit: 120)
        WHEN: check_rate_limit(api_key_id)
        THEN: Returns False (blocked)
        """
        # Arrange
        mock_count = 125
        api_key_service.db.query.return_value.filter.return_value.filter.return_value.count.return_value = (
            mock_count
        )

        # Act
        result = api_key_service.check_rate_limit(
            api_key=test_api_key, window="minute"
        )

        # Assert
        assert result is False

    def test_check_rate_limit_hourly(self, api_key_service, test_api_key):
        """
        GIVEN: API key with 5500 requests in last hour (limit: 6000)
        WHEN: check_rate_limit(api_key_id, window='hour')
        THEN: Returns True (allowed)
        """
        # Arrange
        mock_count = 5500
        api_key_service.db.query.return_value.filter.return_value.filter.return_value.count.return_value = (
            mock_count
        )

        # Act
        result = api_key_service.check_rate_limit(
            api_key=test_api_key, window="hour"
        )

        # Assert
        assert result is True


# ============================================================================
# TEST SUITE 5: USAGE TRACKING
# ============================================================================


class TestUsageTracking:
    """Test suite for API usage tracking"""

    def test_log_api_usage_success(self, api_key_service, test_api_key):
        """
        GIVEN: API request details
        WHEN: log_api_usage(api_key, endpoint, method, status, response_time)
        THEN: Creates APIKeyUsage record
        """
        # Arrange
        api_key_service.db.add = Mock()
        api_key_service.db.commit = Mock()

        # Act
        api_key_service.log_api_usage(
            api_key=test_api_key,
            endpoint="/api/v1/jobs",
            method="GET",
            status_code=200,
            response_time_ms=45,
            ip_address="192.168.1.1",
            user_agent="HireFlux-SDK/1.0",
        )

        # Assert
        api_key_service.db.add.assert_called_once()
        api_key_service.db.commit.assert_called_once()
        call_args = api_key_service.db.add.call_args[0][0]
        assert isinstance(call_args, APIKeyUsage)
        assert call_args.endpoint == "/api/v1/jobs"
        assert call_args.method == "GET"
        assert call_args.status_code == 200

    def test_get_usage_stats(self, api_key_service, test_api_key):
        """
        GIVEN: API key with usage history
        WHEN: get_usage_stats(api_key_id, date_range)
        THEN: Returns aggregated statistics
        """
        # Arrange
        start_date = datetime.utcnow() - timedelta(days=30)
        end_date = datetime.utcnow()

        mock_usage = [
            APIKeyUsage(
                endpoint="/api/v1/jobs",
                method="GET",
                status_code=200,
                response_time_ms=50,
            ),
            APIKeyUsage(
                endpoint="/api/v1/candidates",
                method="GET",
                status_code=200,
                response_time_ms=75,
            ),
            APIKeyUsage(
                endpoint="/api/v1/jobs",
                method="POST",
                status_code=400,
                response_time_ms=30,
            ),
        ]
        api_key_service.db.query.return_value.filter.return_value.filter.return_value.all.return_value = (
            mock_usage
        )

        # Act
        stats = api_key_service.get_usage_stats(
            api_key_id=test_api_key.id,
            start_date=start_date,
            end_date=end_date,
        )

        # Assert
        assert stats["total_requests"] == 3
        assert stats["requests_by_endpoint"]["/api/v1/jobs"] == 2
        assert stats["requests_by_status"]["200"] == 2
        assert stats["requests_by_status"]["400"] == 1
        assert stats["avg_response_time_ms"] == pytest.approx(51.67, rel=0.1)
        assert stats["error_rate"] == pytest.approx(33.33, rel=0.1)


# ============================================================================
# TEST SUITE 6: SECURITY
# ============================================================================


class TestSecurityFeatures:
    """Test suite for security features"""

    def test_api_key_hash_uniqueness(self, api_key_service):
        """
        GIVEN: Two identical plaintext keys
        WHEN: Hashing both keys
        THEN: Hashes are identical (deterministic)
        """
        # Arrange & Act
        plaintext = "test_key_12345"
        hash1 = api_key_service._hash_api_key(plaintext)
        hash2 = api_key_service._hash_api_key(plaintext)

        # Assert
        assert hash1 == hash2
        assert len(hash1) == 64  # SHA-256 produces 64 hex characters

    def test_api_key_generation_randomness(self, api_key_service):
        """
        GIVEN: Multiple API key generations
        WHEN: Generating keys
        THEN: Each key is unique
        """
        # Act
        keys = [api_key_service._generate_api_key() for _ in range(10)]

        # Assert
        assert len(set(keys)) == 10  # All unique
        for key in keys:
            assert key.startswith("hf_live_")
            assert len(key) == 56

    def test_permissions_validation(self, api_key_service, test_api_key):
        """
        GIVEN: API key with specific permissions
        WHEN: check_permission(api_key, resource, action)
        THEN: Returns correct permission status
        """
        # Arrange
        test_api_key.permissions = {
            "jobs": ["read", "write"],
            "candidates": ["read"],
        }

        # Act & Assert
        assert api_key_service.has_permission(test_api_key, "jobs", "read") is True
        assert api_key_service.has_permission(test_api_key, "jobs", "write") is True
        assert api_key_service.has_permission(test_api_key, "jobs", "delete") is False
        assert (
            api_key_service.has_permission(test_api_key, "candidates", "read") is True
        )
        assert (
            api_key_service.has_permission(test_api_key, "candidates", "write")
            is False
        )
