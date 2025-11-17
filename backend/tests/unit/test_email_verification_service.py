"""Unit tests for Email Verification Service (TDD Approach)

Following Test-Driven Development: Write tests FIRST, then implement service.

Test Coverage (Issue #20 - Employer Registration):
- Send verification code to email
- Validate 6-digit verification code
- Code expiration (10 minutes)
- Rate limiting (max 3 attempts per hour)
- Resend code functionality
- Invalid/expired code handling
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from uuid import uuid4
from unittest.mock import Mock, patch

from app.services.email_verification_service import EmailVerificationService
from app.schemas.email_verification import (
    SendVerificationCodeRequest,
    VerifyCodeRequest,
)


# ===========================================================================
# Test Fixtures
# ===========================================================================


@pytest.fixture
def verification_service(db_session: Session):
    """Email verification service instance"""
    return EmailVerificationService(db_session)


@pytest.fixture
def valid_email():
    """Valid company email"""
    return "founder@testcompany.com"


# ===========================================================================
# Test Cases: Send Verification Code (Happy Path)
# ===========================================================================


def test_send_verification_code_success(verification_service, valid_email):
    """
    GIVEN: Valid company email
    WHEN: send_verification_code() is called
    THEN: 6-digit code is generated and sent via email
    """
    # Execute
    result = verification_service.send_verification_code(valid_email)

    # Assert
    assert result["success"] is True
    assert result["message"] == "Verification code sent to your email"
    assert "code_id" in result
    assert result["expires_in_seconds"] == 600  # 10 minutes


def test_send_verification_code_generates_6_digits(verification_service, valid_email):
    """
    GIVEN: Valid email
    WHEN: send_verification_code() is called
    THEN: Generated code is exactly 6 digits
    """
    result = verification_service.send_verification_code(valid_email)
    code_id = result["code_id"]

    # Get the code from database (for testing purposes)
    code_record = verification_service.get_verification_code(code_id)

    assert len(code_record.code) == 6
    assert code_record.code.isdigit()


def test_send_verification_code_sets_expiration(verification_service, valid_email):
    """
    GIVEN: Verification code request
    WHEN: send_verification_code() is called
    THEN: Code expires in exactly 10 minutes (600 seconds)
    """
    result = verification_service.send_verification_code(valid_email)
    code_id = result["code_id"]

    code_record = verification_service.get_verification_code(code_id)
    expected_expiry = datetime.utcnow() + timedelta(minutes=10)

    # Allow 5 seconds tolerance for test execution
    assert abs((code_record.expires_at - expected_expiry).total_seconds()) < 5


@patch("app.services.email_verification_service.send_email")
def test_send_verification_code_sends_email(
    mock_send_email, verification_service, valid_email
):
    """
    GIVEN: Valid email
    WHEN: send_verification_code() is called
    THEN: Email is sent via Resend with the 6-digit code
    """
    result = verification_service.send_verification_code(valid_email)

    # Assert email was sent
    mock_send_email.assert_called_once()
    call_args = mock_send_email.call_args

    assert call_args[1]["to"] == valid_email
    assert "verification code" in call_args[1]["subject"].lower()
    assert "6-digit code" in call_args[1]["html_body"].lower()


# ===========================================================================
# Test Cases: Verify Code (Happy Path)
# ===========================================================================


def test_verify_code_success(verification_service, valid_email):
    """
    GIVEN: Valid verification code sent to email
    WHEN: verify_code() is called with correct code
    THEN: Verification succeeds
    """
    # Send code
    send_result = verification_service.send_verification_code(valid_email)
    code_id = send_result["code_id"]

    # Get the actual code (in real scenario, user gets this via email)
    code_record = verification_service.get_verification_code(code_id)
    actual_code = code_record.code

    # Verify code
    verify_result = verification_service.verify_code(valid_email, actual_code)

    assert verify_result["success"] is True
    assert verify_result["message"] == "Email verified successfully"
    assert verify_result["email"] == valid_email


def test_verify_code_marks_as_used(verification_service, valid_email):
    """
    GIVEN: Valid verification code
    WHEN: verify_code() is called successfully
    THEN: Code is marked as used and cannot be reused
    """
    # Send and verify code
    send_result = verification_service.send_verification_code(valid_email)
    code_id = send_result["code_id"]
    code_record = verification_service.get_verification_code(code_id)

    verification_service.verify_code(valid_email, code_record.code)

    # Attempt to reuse the same code
    with pytest.raises(ValueError, match="Code has already been used"):
        verification_service.verify_code(valid_email, code_record.code)


# ===========================================================================
# Test Cases: Verification Code Errors
# ===========================================================================


def test_verify_code_invalid_code(verification_service, valid_email):
    """
    GIVEN: Email with verification code sent
    WHEN: verify_code() is called with incorrect code
    THEN: ValidationError is raised
    """
    verification_service.send_verification_code(valid_email)

    with pytest.raises(ValueError, match="Invalid verification code"):
        verification_service.verify_code(valid_email, "999999")


def test_verify_code_expired(verification_service, valid_email):
    """
    GIVEN: Verification code that has expired (>10 minutes old)
    WHEN: verify_code() is called
    THEN: ValidationError is raised with "expired" message
    """
    # Send code
    send_result = verification_service.send_verification_code(valid_email)
    code_id = send_result["code_id"]
    code_record = verification_service.get_verification_code(code_id)

    # Manually expire the code by setting expires_at to past
    code_record.expires_at = datetime.utcnow() - timedelta(minutes=1)
    verification_service.db.commit()

    with pytest.raises(ValueError, match="Verification code expired"):
        verification_service.verify_code(valid_email, code_record.code)


def test_verify_code_wrong_email(verification_service):
    """
    GIVEN: Verification code sent to email1@test.com
    WHEN: verify_code() is called for email2@test.com with same code
    THEN: ValidationError is raised (code doesn't match email)
    """
    email1 = "email1@test.com"
    email2 = "email2@test.com"

    # Send code to email1
    send_result = verification_service.send_verification_code(email1)
    code_id = send_result["code_id"]
    code_record = verification_service.get_verification_code(code_id)

    # Try to verify with email2
    with pytest.raises(ValueError, match="Invalid verification code"):
        verification_service.verify_code(email2, code_record.code)


def test_verify_code_not_6_digits(verification_service, valid_email):
    """
    GIVEN: Invalid code format
    WHEN: verify_code() is called with non-6-digit code
    THEN: ValidationError is raised
    """
    with pytest.raises(ValueError, match="must be exactly 6 digits"):
        verification_service.verify_code(valid_email, "12345")  # Only 5 digits

    with pytest.raises(ValueError, match="must be exactly 6 digits"):
        verification_service.verify_code(valid_email, "1234567")  # 7 digits

    with pytest.raises(ValueError, match="must be exactly 6 digits"):
        verification_service.verify_code(valid_email, "abcdef")  # Not digits


# ===========================================================================
# Test Cases: Rate Limiting
# ===========================================================================


def test_send_verification_code_rate_limit_3_per_hour(
    verification_service, valid_email
):
    """
    GIVEN: 3 verification codes already sent in the last hour
    WHEN: send_verification_code() is called again
    THEN: RateLimitError is raised
    """
    # Send 3 codes
    for _ in range(3):
        verification_service.send_verification_code(valid_email)

    # 4th attempt should fail
    with pytest.raises(ValueError, match="Too many attempts"):
        verification_service.send_verification_code(valid_email)


def test_send_verification_code_rate_limit_resets_after_hour(
    verification_service, valid_email
):
    """
    GIVEN: 3 codes sent, with oldest >1 hour ago
    WHEN: send_verification_code() is called
    THEN: New code is sent successfully (old codes don't count)
    """
    # Send 2 codes within current hour
    for _ in range(2):
        verification_service.send_verification_code(valid_email)

    # Manually set one code to >1 hour ago
    old_codes = verification_service.get_recent_codes(valid_email, hours=2)
    if old_codes:
        old_codes[0].created_at = datetime.utcnow() - timedelta(hours=2)
        verification_service.db.commit()

    # Should succeed (only 2 codes in last hour)
    result = verification_service.send_verification_code(valid_email)
    assert result["success"] is True


# ===========================================================================
# Test Cases: Resend Code
# ===========================================================================


def test_resend_verification_code_success(verification_service, valid_email):
    """
    GIVEN: Verification code already sent
    WHEN: resend_verification_code() is called
    THEN: New code is generated and sent
    """
    # Send initial code
    first_result = verification_service.send_verification_code(valid_email)
    first_code_id = first_result["code_id"]

    # Resend code
    resend_result = verification_service.resend_verification_code(valid_email)

    # Assert new code generated
    assert resend_result["success"] is True
    assert resend_result["code_id"] != first_code_id
    assert resend_result["message"] == "New verification code sent"


def test_resend_verification_code_invalidates_old_code(
    verification_service, valid_email
):
    """
    GIVEN: Existing verification code
    WHEN: resend_verification_code() is called
    THEN: Old code is invalidated (cannot be used)
    """
    # Send initial code
    first_result = verification_service.send_verification_code(valid_email)
    first_code = verification_service.get_verification_code(first_result["code_id"])
    old_code = first_code.code

    # Resend code
    verification_service.resend_verification_code(valid_email)

    # Try to use old code
    with pytest.raises(ValueError, match="Invalid verification code|expired"):
        verification_service.verify_code(valid_email, old_code)


# ===========================================================================
# Test Cases: Email Validation
# ===========================================================================


def test_send_verification_code_invalid_email_format(verification_service):
    """
    GIVEN: Invalid email format
    WHEN: send_verification_code() is called
    THEN: ValidationError is raised
    """
    with pytest.raises(ValueError, match="Invalid email"):
        verification_service.send_verification_code("not-an-email")


def test_send_verification_code_empty_email(verification_service):
    """
    GIVEN: Empty email string
    WHEN: send_verification_code() is called
    THEN: ValidationError is raised
    """
    with pytest.raises(ValueError, match="Email is required"):
        verification_service.send_verification_code("")


# ===========================================================================
# Test Cases: Code Attempts Tracking
# ===========================================================================


def test_verify_code_tracks_failed_attempts(verification_service, valid_email):
    """
    GIVEN: Verification code sent
    WHEN: verify_code() is called with wrong code 3 times
    THEN: Failed attempts are tracked
    """
    verification_service.send_verification_code(valid_email)

    # Make 3 failed attempts
    for _ in range(3):
        try:
            verification_service.verify_code(valid_email, "000000")
        except ValueError:
            pass

    # Check attempts count
    attempts = verification_service.get_failed_attempts(valid_email)
    assert attempts >= 3


def test_verify_code_max_attempts_exceeded(verification_service, valid_email):
    """
    GIVEN: 3 failed verification attempts
    WHEN: verify_code() is called again (4th attempt)
    THEN: TooManyAttemptsError is raised
    """
    send_result = verification_service.send_verification_code(valid_email)
    code_record = verification_service.get_verification_code(send_result["code_id"])

    # Make 3 failed attempts
    for _ in range(3):
        try:
            verification_service.verify_code(valid_email, "000000")
        except ValueError:
            pass

    # 4th attempt should be blocked
    with pytest.raises(ValueError, match="Too many failed attempts"):
        verification_service.verify_code(valid_email, code_record.code)


# ===========================================================================
# BDD-Style Feature Tests
# ===========================================================================


def test_feature_complete_email_verification_flow(verification_service):
    """
    Feature: Email verification for employer registration

    Scenario: Founder verifies email successfully
      Given a founder wants to register with email "founder@startup.com"
      When they request a verification code
      Then a 6-digit code is sent to their email
      And the code expires in 10 minutes
      When they enter the correct code
      Then their email is verified successfully
      And the code cannot be reused
    """
    email = "founder@startup.com"

    # Step 1: Request verification code
    send_result = verification_service.send_verification_code(email)

    assert send_result["success"] is True
    assert "code_id" in send_result
    assert send_result["expires_in_seconds"] == 600

    # Step 2: Get code (simulating email delivery)
    code_record = verification_service.get_verification_code(send_result["code_id"])
    assert len(code_record.code) == 6
    assert code_record.code.isdigit()

    # Step 3: Verify code
    verify_result = verification_service.verify_code(email, code_record.code)

    assert verify_result["success"] is True
    assert verify_result["email"] == email

    # Step 4: Ensure code cannot be reused
    with pytest.raises(ValueError, match="already been used"):
        verification_service.verify_code(email, code_record.code)


def test_feature_expired_code_requires_resend(verification_service):
    """
    Feature: Expired verification code handling

    Scenario: Founder's code expires and they resend
      Given a founder requested a verification code
      And 11 minutes have passed (code expired)
      When they try to use the expired code
      Then they see an "expired" error
      When they request a new code
      Then a fresh code is sent
      And they can verify successfully with the new code
    """
    email = "founder@startup.com"

    # Step 1: Request code
    send_result = verification_service.send_verification_code(email)
    code_record = verification_service.get_verification_code(send_result["code_id"])
    old_code = code_record.code

    # Step 2: Expire the code
    code_record.expires_at = datetime.utcnow() - timedelta(minutes=1)
    verification_service.db.commit()

    # Step 3: Try to use expired code
    with pytest.raises(ValueError, match="expired"):
        verification_service.verify_code(email, old_code)

    # Step 4: Resend code
    resend_result = verification_service.resend_verification_code(email)
    new_code_record = verification_service.get_verification_code(
        resend_result["code_id"]
    )

    # Step 5: Verify with new code
    verify_result = verification_service.verify_code(email, new_code_record.code)
    assert verify_result["success"] is True
