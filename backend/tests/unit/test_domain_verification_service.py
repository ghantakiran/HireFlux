"""Unit tests for Domain Verification Service
Issue #67: Company Domain Verification - Prevent Fake Companies

Following TDD/BDD approach:
- Write tests first
- Implement service to pass tests
- Refactor and optimize

Test Coverage:
- Email verification flow
- DNS TXT record verification
- File upload verification
- Token generation and validation
- Expiry handling (24h)
- Rate limiting
- Security tests (spoofing prevention)
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from unittest.mock import Mock, patch, MagicMock

from sqlalchemy.orm import Session

from app.services.domain_verification_service import (
    DomainVerificationService,
    VerificationMethod,
    VerificationStatus,
)
from app.db.models.company import Company


@pytest.fixture
def mock_db():
    """Mock database session"""
    db = Mock(spec=Session)
    db.query.return_value = db
    db.filter.return_value = db
    db.first.return_value = None
    return db


@pytest.fixture
def test_company(mock_db):
    """Create test company"""
    company = Company(
        id=uuid4(),
        name="Test Company Inc",
        domain="testcompany.com",
        domain_verified=False,
        verification_token=None,
        verification_method=None,
        verification_attempts=0,
        created_at=datetime.utcnow(),
    )
    mock_db.query.return_value.filter.return_value.first.return_value = company
    return company


class TestDomainVerificationService:
    """Test suite for domain verification service"""

    # =========================================================================
    # Email Verification Tests
    # =========================================================================

    def test_initiate_email_verification_generates_token(self, mock_db, test_company):
        """Given a company domain, when initiating email verification,
        then a unique verification token should be generated"""
        service = DomainVerificationService(mock_db)

        result = service.initiate_email_verification(
            company_id=test_company.id,
            domain="testcompany.com"
        )

        assert result["verification_id"] is not None
        assert result["method"] == "email"
        assert "admin@testcompany.com" in result["instructions"]
        assert len(result["verification_token"]) == 64  # SHA256 hex

    def test_email_verification_sends_to_multiple_addresses(self, mock_db, test_company):
        """Given a domain, when sending verification email,
        then emails should be sent to admin@, postmaster@, and webmaster@"""
        service = DomainVerificationService(mock_db)

        with patch('app.services.domain_verification_service.send_verification_email') as mock_send:
            service.initiate_email_verification(test_company.id, "testcompany.com")

            # Should send to all 3 admin addresses
            assert mock_send.call_count == 3
            email_addresses = [call[0][0] for call in mock_send.call_args_list]
            assert "admin@testcompany.com" in email_addresses
            assert "postmaster@testcompany.com" in email_addresses
            assert "webmaster@testcompany.com" in email_addresses

    def test_verify_email_token_success(self, mock_db, test_company):
        """Given a valid verification token, when verifying,
        then domain should be marked as verified"""
        service = DomainVerificationService(mock_db)

        # Set up company with pending verification
        test_company.verification_token = "valid_token_123"
        test_company.verification_token_expires_at = datetime.utcnow() + timedelta(hours=12)
        test_company.verification_method = "email"

        result = service.verify_email_token(token="valid_token_123")

        assert result["verified"] is True
        assert result["company_id"] == test_company.id
        assert test_company.domain_verified is True

    def test_verify_email_token_expired(self, mock_db, test_company):
        """Given an expired token, when verifying,
        then verification should fail with appropriate error"""
        service = DomainVerificationService(mock_db)

        # Set up company with expired token
        test_company.verification_token = "expired_token"
        test_company.verification_token_expires_at = datetime.utcnow() - timedelta(hours=1)

        with pytest.raises(ValueError, match="Verification token has expired"):
            service.verify_email_token(token="expired_token")

    def test_verify_email_token_invalid(self, mock_db):
        """Given an invalid token, when verifying,
        then verification should fail"""
        service = DomainVerificationService(mock_db)
        mock_db.query.return_value.filter.return_value.first.return_value = None

        with pytest.raises(ValueError, match="Invalid verification token"):
            service.verify_email_token(token="nonexistent_token")

    # =========================================================================
    # DNS Verification Tests
    # =========================================================================

    def test_initiate_dns_verification_returns_instructions(self, mock_db, test_company):
        """Given a domain, when initiating DNS verification,
        then should return TXT record instructions"""
        service = DomainVerificationService(mock_db)

        result = service.initiate_dns_verification(
            company_id=test_company.id,
            domain="testcompany.com"
        )

        assert result["method"] == "dns"
        assert "TXT" in result["instructions"]
        assert "hireflux-verification=" in result["txt_record"]
        assert len(result["txt_record_value"]) == 32  # Verification code

    @patch('app.services.domain_verification_service.check_dns_txt_record')
    def test_verify_dns_success(self, mock_dns_check, mock_db, test_company):
        """Given correct DNS TXT record, when verifying,
        then domain should be verified"""
        service = DomainVerificationService(mock_db)

        # Set up company with DNS verification pending
        test_company.verification_token = "dns_verification_code"
        test_company.verification_method = "dns"

        # Mock DNS lookup returning correct value
        mock_dns_check.return_value = True

        result = service.verify_dns_record(company_id=test_company.id)

        assert result["verified"] is True
        assert test_company.domain_verified is True

    @patch('app.services.domain_verification_service.check_dns_txt_record')
    def test_verify_dns_failure_record_not_found(self, mock_dns_check, mock_db, test_company):
        """Given missing DNS TXT record, when verifying,
        then verification should fail"""
        service = DomainVerificationService(mock_db)

        test_company.verification_token = "dns_code"
        test_company.verification_method = "dns"

        # Mock DNS lookup returning no record
        mock_dns_check.return_value = False

        with pytest.raises(ValueError, match="DNS TXT record not found"):
            service.verify_dns_record(company_id=test_company.id)

    # =========================================================================
    # File Upload Verification Tests
    # =========================================================================

    def test_initiate_file_verification_returns_instructions(self, mock_db, test_company):
        """Given a domain, when initiating file verification,
        then should return file upload instructions"""
        service = DomainVerificationService(mock_db)

        result = service.initiate_file_verification(
            company_id=test_company.id,
            domain="testcompany.com"
        )

        assert result["method"] == "file"
        assert "hireflux-verification.txt" in result["filename"]
        assert result["file_content"] is not None
        assert "https://testcompany.com/hireflux-verification.txt" in result["instructions"]

    @patch('app.services.domain_verification_service.fetch_verification_file')
    def test_verify_file_success(self, mock_fetch, mock_db, test_company):
        """Given correct verification file on website,
        then domain should be verified"""
        service = DomainVerificationService(mock_db)

        test_company.verification_token = "file_verification_code"
        test_company.verification_method = "file"

        # Mock file fetch returning correct content
        mock_fetch.return_value = "file_verification_code"

        result = service.verify_file(company_id=test_company.id)

        assert result["verified"] is True
        assert test_company.domain_verified is True

    @patch('app.services.domain_verification_service.fetch_verification_file')
    def test_verify_file_failure_wrong_content(self, mock_fetch, mock_db, test_company):
        """Given incorrect file content, when verifying,
        then verification should fail"""
        service = DomainVerificationService(mock_db)

        test_company.verification_token = "correct_code"
        test_company.verification_method = "file"

        # Mock file fetch returning wrong content
        mock_fetch.return_value = "wrong_code"

        with pytest.raises(ValueError, match="Verification file content does not match"):
            service.verify_file(company_id=test_company.id)

    # =========================================================================
    # Rate Limiting Tests
    # =========================================================================

    def test_rate_limiting_blocks_excessive_attempts(self, mock_db, test_company):
        """Given 5 failed verification attempts, when attempting 6th,
        then should be rate limited"""
        service = DomainVerificationService(mock_db)

        test_company.verification_attempts = 5
        test_company.last_verification_attempt = datetime.utcnow()

        with pytest.raises(ValueError, match="Too many verification attempts"):
            service.initiate_email_verification(test_company.id, "testcompany.com")

    def test_rate_limiting_resets_after_24_hours(self, mock_db, test_company):
        """Given rate limit reached, when 24 hours have passed,
        then verification attempts should reset"""
        service = DomainVerificationService(mock_db)

        # Set up rate limited company from 25 hours ago
        test_company.verification_attempts = 5
        test_company.last_verification_attempt = datetime.utcnow() - timedelta(hours=25)

        # Should succeed after rate limit reset
        result = service.initiate_email_verification(test_company.id, "testcompany.com")

        assert result is not None
        assert test_company.verification_attempts == 1  # Reset to 1 for new attempt

    # =========================================================================
    # Security Tests
    # =========================================================================

    def test_prevent_domain_spoofing(self, mock_db, test_company):
        """Given a company trying to verify different domain than registered,
        then verification should fail"""
        service = DomainVerificationService(mock_db)

        test_company.domain = "legitimate.com"

        with pytest.raises(ValueError, match="Domain mismatch"):
            service.initiate_email_verification(test_company.id, "fake-google.com")

    def test_prevent_already_verified_domain_reuse(self, mock_db):
        """Given a domain already verified by another company,
        then second company cannot verify same domain"""
        service = DomainVerificationService(mock_db)

        # Existing verified company with same domain
        existing_company = Company(
            id=uuid4(),
            name="Existing Company",
            domain="duplicate.com",
            domain_verified=True,
        )

        new_company = Company(
            id=uuid4(),
            name="New Company",
            domain="duplicate.com",
            domain_verified=False,
        )

        mock_db.query.return_value.filter.return_value.first.return_value = existing_company

        with pytest.raises(ValueError, match="Domain already verified by another company"):
            service.initiate_email_verification(new_company.id, "duplicate.com")

    def test_token_is_cryptographically_secure(self, mock_db, test_company):
        """Given token generation, when creating verification token,
        then should use cryptographically secure random generation"""
        service = DomainVerificationService(mock_db)

        result = service.initiate_email_verification(test_company.id, "testcompany.com")

        # Token should be 64 chars (SHA256 hex)
        assert len(result["verification_token"]) == 64
        # Token should be unique (very low collision probability)
        result2 = service.initiate_email_verification(test_company.id, "testcompany.com")
        assert result["verification_token"] != result2["verification_token"]

    # =========================================================================
    # Helper Method Tests
    # =========================================================================

    def test_get_verification_status(self, mock_db, test_company):
        """Given a company, when checking verification status,
        then should return current verification state"""
        service = DomainVerificationService(mock_db)

        test_company.domain_verified = False
        test_company.verification_method = "email"
        test_company.verification_attempts = 2

        status = service.get_verification_status(company_id=test_company.id)

        assert status["verified"] is False
        assert status["method"] == "email"
        assert status["attempts"] == 2

    def test_resend_verification_email(self, mock_db, test_company):
        """Given existing verification, when resending email,
        then should send new email with same token"""
        service = DomainVerificationService(mock_db)

        test_company.verification_token = "existing_token"
        test_company.verification_method = "email"

        with patch('app.services.domain_verification_service.send_verification_email') as mock_send:
            result = service.resend_verification_email(company_id=test_company.id)

            assert result["success"] is True
            assert mock_send.called
            # Should use same token
            assert test_company.verification_token == "existing_token"

    def test_clear_verification_on_domain_change(self, mock_db, test_company):
        """Given verified company, when changing domain,
        then verification should be cleared"""
        service = DomainVerificationService(mock_db)

        test_company.domain_verified = True
        test_company.verification_token = "old_token"

        service.clear_verification(company_id=test_company.id)

        assert test_company.domain_verified is False
        assert test_company.verification_token is None
        assert test_company.verification_method is None
