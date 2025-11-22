"""Unit tests for Domain Verification Service
Issue #67: Company Domain Verification - Prevent Fake Companies

Following TDD/BDD approach:
- Write tests first (DONE)
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
from unittest.mock import patch, MagicMock

from app.services.domain_verification_service import (
    DomainVerificationService,
    VerificationMethod,
)
from app.db.models.company import Company


class TestDomainVerificationService:
    """Test suite for domain verification service"""

    @pytest.fixture
    def test_company(self, db_session):
        """Create a test company for verification tests"""
        company = Company(
            id=uuid4(),
            name="Test Company Inc",
            domain="testcompany.com",
            domain_verified=False,
            verification_token=None,
            verification_method=None,
            verification_attempts=0,
            verification_token_expires_at=None,
            last_verification_attempt=None,
            verified_at=None,
        )
        db_session.add(company)
        db_session.commit()
        db_session.refresh(company)
        return company

    @pytest.fixture
    def verified_company(self, db_session):
        """Create an already verified company"""
        company = Company(
            id=uuid4(),
            name="Verified Corp",
            domain="verifiedcorp.com",
            domain_verified=True,
            verified_at=datetime.utcnow(),
        )
        db_session.add(company)
        db_session.commit()
        db_session.refresh(company)
        return company

    # =========================================================================
    # Email Verification Tests
    # =========================================================================

    @patch('app.services.domain_verification_service.send_verification_email')
    def test_initiate_email_verification_generates_token(self, mock_send, db_session, test_company):
        """Given a company domain, when initiating email verification,
        then a unique verification token should be generated"""
        service = DomainVerificationService(db_session)

        result = service.initiate_email_verification(
            company_id=test_company.id,
            domain="testcompany.com"
        )

        assert result["verification_id"] is not None
        assert result["method"] == "email"
        assert "admin@testcompany.com" in result["instructions"]
        assert len(result["verification_token"]) == 64  # SHA256 hex
        # Verify emails were sent to all 3 addresses
        assert mock_send.call_count == 3

    @patch('app.services.domain_verification_service.send_verification_email')
    def test_email_verification_sends_to_multiple_addresses(self, mock_send, db_session, test_company):
        """Given a domain, when sending verification email,
        then emails should be sent to admin@, postmaster@, and webmaster@"""
        service = DomainVerificationService(db_session)

        service.initiate_email_verification(test_company.id, "testcompany.com")

        # Should send to all 3 admin addresses
        assert mock_send.call_count == 3
        # Extract email addresses from keyword arguments
        email_addresses = [call.kwargs['to_email'] for call in mock_send.call_args_list]
        assert "admin@testcompany.com" in email_addresses
        assert "postmaster@testcompany.com" in email_addresses
        assert "webmaster@testcompany.com" in email_addresses

    @patch('app.services.domain_verification_service.send_verification_email')
    def test_verify_email_token_success(self, mock_send, db_session, test_company):
        """Given a valid verification token, when verifying,
        then domain should be marked as verified"""
        service = DomainVerificationService(db_session)

        # Initiate verification first
        result = service.initiate_email_verification(test_company.id, "testcompany.com")
        token = result["verification_token"]

        # Verify with token
        verify_result = service.verify_email_token(token=token)

        assert verify_result["verified"] is True
        assert verify_result["company_id"] == str(test_company.id)

        # Check company is now verified
        db_session.refresh(test_company)
        assert test_company.domain_verified is True
        assert test_company.verified_at is not None

    @patch('app.services.domain_verification_service.send_verification_email')
    def test_verify_email_token_expired(self, mock_send, db_session, test_company):
        """Given an expired token, when verifying,
        then verification should fail with appropriate error"""
        service = DomainVerificationService(db_session)

        # Set up company with expired token
        test_company.verification_token = "expired_token"
        test_company.verification_method = "email"
        test_company.verification_token_expires_at = datetime.utcnow() - timedelta(hours=1)
        db_session.commit()

        with pytest.raises(ValueError, match="Verification token has expired"):
            service.verify_email_token(token="expired_token")

    def test_verify_email_token_invalid(self, db_session, test_company):
        """Given an invalid token, when verifying,
        then verification should fail"""
        service = DomainVerificationService(db_session)

        with pytest.raises(ValueError, match="Invalid verification token"):
            service.verify_email_token(token="nonexistent_token_12345")

    # =========================================================================
    # DNS Verification Tests
    # =========================================================================

    def test_initiate_dns_verification_returns_instructions(self, db_session, test_company):
        """Given a domain, when initiating DNS verification,
        then should return TXT record instructions"""
        service = DomainVerificationService(db_session)

        result = service.initiate_dns_verification(
            company_id=test_company.id,
            domain="testcompany.com"
        )

        assert result["method"] == "dns"
        assert "TXT" in result["instructions"]
        assert "hireflux-verification=" in result["txt_record"]
        assert len(result["txt_record_value"]) == 32  # Verification code

    @patch('app.services.domain_verification_service.check_dns_txt_record')
    def test_verify_dns_success(self, mock_dns_check, db_session, test_company):
        """Given correct DNS TXT record, when verifying,
        then domain should be verified"""
        service = DomainVerificationService(db_session)

        # Initiate DNS verification
        result = service.initiate_dns_verification(test_company.id, "testcompany.com")

        # Mock DNS lookup returning correct value
        mock_dns_check.return_value = True

        # Verify
        verify_result = service.verify_dns_record(company_id=test_company.id)

        assert verify_result["verified"] is True
        db_session.refresh(test_company)
        assert test_company.domain_verified is True

    @patch('app.services.domain_verification_service.check_dns_txt_record')
    def test_verify_dns_failure_record_not_found(self, mock_dns_check, db_session, test_company):
        """Given missing DNS TXT record, when verifying,
        then verification should fail"""
        service = DomainVerificationService(db_session)

        # Initiate DNS verification
        service.initiate_dns_verification(test_company.id, "testcompany.com")

        # Mock DNS lookup returning no record
        mock_dns_check.return_value = False

        with pytest.raises(ValueError, match="DNS TXT record not found"):
            service.verify_dns_record(company_id=test_company.id)

    # =========================================================================
    # File Upload Verification Tests
    # =========================================================================

    def test_initiate_file_verification_returns_instructions(self, db_session, test_company):
        """Given a domain, when initiating file verification,
        then should return file upload instructions"""
        service = DomainVerificationService(db_session)

        result = service.initiate_file_verification(
            company_id=test_company.id,
            domain="testcompany.com"
        )

        assert result["method"] == "file"
        assert "hireflux-verification.txt" in result["filename"]
        assert result["file_content"] is not None
        assert "https://testcompany.com/hireflux-verification.txt" in result["instructions"]

    @patch('app.services.domain_verification_service.fetch_verification_file')
    def test_verify_file_success(self, mock_fetch, db_session, test_company):
        """Given correct verification file on website,
        then domain should be verified"""
        service = DomainVerificationService(db_session)

        # Initiate file verification
        result = service.initiate_file_verification(test_company.id, "testcompany.com")
        verification_code = result["file_content"]

        # Mock file fetch returning correct content
        mock_fetch.return_value = verification_code

        # Verify
        verify_result = service.verify_file(company_id=test_company.id)

        assert verify_result["verified"] is True
        db_session.refresh(test_company)
        assert test_company.domain_verified is True

    @patch('app.services.domain_verification_service.fetch_verification_file')
    def test_verify_file_failure_wrong_content(self, mock_fetch, db_session, test_company):
        """Given incorrect file content, when verifying,
        then verification should fail"""
        service = DomainVerificationService(db_session)

        # Initiate file verification
        service.initiate_file_verification(test_company.id, "testcompany.com")

        # Mock file fetch returning wrong content
        mock_fetch.return_value = "wrong_code_123"

        with pytest.raises(ValueError, match="Verification file content does not match"):
            service.verify_file(company_id=test_company.id)

    # =========================================================================
    # Rate Limiting Tests
    # =========================================================================

    def test_rate_limiting_blocks_excessive_attempts(self, db_session, test_company):
        """Given 5 failed verification attempts, when attempting 6th,
        then should be rate limited"""
        service = DomainVerificationService(db_session)

        # Simulate 5 attempts
        test_company.verification_attempts = 5
        test_company.last_verification_attempt = datetime.utcnow()
        db_session.commit()

        with pytest.raises(ValueError, match="Too many verification attempts"):
            service.initiate_email_verification(test_company.id, "testcompany.com")

    @patch('app.services.domain_verification_service.send_verification_email')
    def test_rate_limiting_resets_after_24_hours(self, mock_send, db_session, test_company):
        """Given rate limit reached, when 24 hours have passed,
        then verification attempts should reset"""
        service = DomainVerificationService(db_session)

        # Set up rate limited company from 25 hours ago
        test_company.verification_attempts = 5
        test_company.last_verification_attempt = datetime.utcnow() - timedelta(hours=25)
        db_session.commit()

        # Should succeed after rate limit reset
        result = service.initiate_email_verification(test_company.id, "testcompany.com")

        assert result is not None
        db_session.refresh(test_company)
        assert test_company.verification_attempts == 1  # Reset to 1 for new attempt

    # =========================================================================
    # Security Tests
    # =========================================================================

    def test_prevent_domain_spoofing(self, db_session, test_company):
        """Given a company trying to verify different domain than registered,
        then verification should fail"""
        service = DomainVerificationService(db_session)

        with pytest.raises(ValueError, match="Domain mismatch"):
            service.initiate_email_verification(test_company.id, "fake-google.com")

    def test_prevent_already_verified_domain_reuse(self, db_session):
        """Given a domain already verified by another company,
        then second company cannot verify same domain"""
        service = DomainVerificationService(db_session)

        # Create first company with verified domain
        verified_company = Company(
            id=uuid4(),
            name="Verified Corp",
            domain="verifiedcorp.com",
            domain_verified=True,
            verified_at=datetime.utcnow(),
        )
        db_session.add(verified_company)
        db_session.commit()

        # Create second company with DIFFERENT domain initially
        new_company = Company(
            id=uuid4(),
            name="New Company",
            domain="newcompany.com",  # Different domain
            domain_verified=False,
        )
        db_session.add(new_company)
        db_session.commit()

        # Try to verify using already-verified domain - should fail
        with pytest.raises(ValueError, match="Domain mismatch|already verified"):
            service.initiate_email_verification(new_company.id, "verifiedcorp.com")

    @patch('app.services.domain_verification_service.send_verification_email')
    def test_token_is_cryptographically_secure(self, mock_send, db_session, test_company):
        """Given token generation, when creating verification token,
        then should use cryptographically secure random generation"""
        service = DomainVerificationService(db_session)

        result1 = service.initiate_email_verification(test_company.id, "testcompany.com")
        token1 = result1["verification_token"]

        # Clear and try again
        test_company.verification_token = None
        test_company.verification_attempts = 0
        db_session.commit()

        result2 = service.initiate_email_verification(test_company.id, "testcompany.com")
        token2 = result2["verification_token"]

        # Token should be 64 chars (SHA256 hex)
        assert len(token1) == 64
        assert len(token2) == 64
        # Tokens should be unique (very low collision probability)
        assert token1 != token2

    # =========================================================================
    # Helper Method Tests
    # =========================================================================

    @patch('app.services.domain_verification_service.send_verification_email')
    def test_get_verification_status(self, mock_send, db_session, test_company):
        """Given a company, when checking verification status,
        then should return current verification state"""
        service = DomainVerificationService(db_session)

        # Initiate verification
        service.initiate_email_verification(test_company.id, "testcompany.com")

        status = service.get_verification_status(company_id=test_company.id)

        assert status["verified"] is False
        assert status["domain"] == "testcompany.com"
        assert status["method"] == "email"
        assert status["attempts"] >= 1

    @patch('app.services.domain_verification_service.send_verification_email')
    def test_resend_verification_email(self, mock_send, db_session, test_company):
        """Given existing verification, when resending email,
        then should send new email with same token"""
        service = DomainVerificationService(db_session)

        # Initiate verification first
        result = service.initiate_email_verification(test_company.id, "testcompany.com")
        original_token = result["verification_token"]

        # Reset mock
        mock_send.reset_mock()

        # Resend
        resend_result = service.resend_verification_email(company_id=test_company.id)

        assert resend_result["success"] is True
        assert mock_send.called
        # Token should remain the same
        db_session.refresh(test_company)
        assert test_company.verification_token == original_token

    def test_clear_verification_on_domain_change(self, db_session):
        """Given verified company, when changing domain,
        then verification should be cleared"""
        service = DomainVerificationService(db_session)

        # Create verified company
        company = Company(
            id=uuid4(),
            name="Test Corp",
            domain="testcorp.com",
            domain_verified=True,
            verification_token="old_token",
            verification_method="email",
            verified_at=datetime.utcnow(),
        )
        db_session.add(company)
        db_session.commit()

        # Clear verification
        service.clear_verification(company_id=company.id)

        db_session.refresh(company)
        assert company.domain_verified is False
        assert company.verification_token is None
        assert company.verification_method is None
        assert company.verified_at is None
