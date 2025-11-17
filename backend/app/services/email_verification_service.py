"""Email Verification Service

Business logic for email verification during employer registration.
Sprint 19-20 Week 39 Day 3 - Issue #20

Responsibilities:
- Generate and send 6-digit verification codes
- Validate codes with expiration check (10 minutes)
- Rate limiting (max 3 codes per hour)
- Track failed verification attempts
- Support code resending

Following Test-Driven Development: This service is implemented to satisfy
the tests in test_email_verification_service.py.
"""

import random
import string
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy.orm import Session

from app.db.models.email_verification import EmailVerificationCode
from app.schemas.email_verification import (
    SendVerificationCodeResponse,
    VerifyCodeResponse,
    ResendCodeResponse,
)
from app.core.email import send_email  # Email sending utility


class EmailVerificationService:
    """Service for email verification operations"""

    MAX_CODES_PER_HOUR = 3
    CODE_EXPIRATION_MINUTES = 10
    MAX_FAILED_ATTEMPTS = 3

    def __init__(self, db: Session):
        self.db = db

    def send_verification_code(self, email: str) -> Dict:
        """
        Send 6-digit verification code to email

        Steps:
        1. Validate email format
        2. Check rate limiting (max 3 codes per hour)
        3. Generate random 6-digit code
        4. Store code in database with expiration
        5. Send email with code
        6. Return success response

        Args:
            email: Email address to send code to

        Returns:
            Dict with success, message, code_id, and expires_in_seconds

        Raises:
            ValueError: If email invalid or rate limit exceeded
        """
        # Validate email
        if not email:
            raise ValueError("Email is required")

        email = email.strip().lower()
        if "@" not in email or "." not in email.split("@")[1]:
            raise ValueError("Invalid email format")

        # Check rate limiting
        recent_codes = self.get_recent_codes(email, hours=1)
        if len(recent_codes) >= self.MAX_CODES_PER_HOUR:
            raise ValueError(
                "Too many attempts. Please try again in 60 minutes."
            )

        # Generate 6-digit code
        code = "".join(random.choices(string.digits, k=6))

        # Calculate expiration time
        expires_at = datetime.utcnow() + timedelta(minutes=self.CODE_EXPIRATION_MINUTES)

        # Create verification code record
        verification_code = EmailVerificationCode(
            id=uuid4(),
            email=email,
            code=code,
            is_used=False,
            is_valid=True,
            expires_at=expires_at,
            failed_attempts=0,
        )

        self.db.add(verification_code)
        self.db.commit()
        self.db.refresh(verification_code)

        # Send email
        self._send_verification_email(email, code)

        return {
            "success": True,
            "message": "Verification code sent to your email",
            "code_id": verification_code.id,
            "expires_in_seconds": self.CODE_EXPIRATION_MINUTES * 60,
        }

    def verify_code(self, email: str, code: str) -> Dict:
        """
        Verify 6-digit code for email

        Steps:
        1. Validate code format (exactly 6 digits)
        2. Find most recent valid code for email
        3. Check if code matches
        4. Check if code expired (>10 minutes)
        5. Check if code already used
        6. Check failed attempts limit
        7. Mark code as used
        8. Return success

        Args:
            email: Email address being verified
            code: 6-digit verification code

        Returns:
            Dict with success, message, and email

        Raises:
            ValueError: If code invalid, expired, or used
        """
        # Validate code format
        if not code or len(code) != 6:
            raise ValueError("Code must be exactly 6 digits")

        if not code.isdigit():
            raise ValueError("Code must be exactly 6 digits")

        email = email.strip().lower()

        # Find the most recent valid code for this email
        code_record = (
            self.db.query(EmailVerificationCode)
            .filter(
                EmailVerificationCode.email == email,
                EmailVerificationCode.code == code,
                EmailVerificationCode.is_valid == True,  # noqa: E712
            )
            .order_by(EmailVerificationCode.created_at.desc())
            .first()
        )

        if not code_record:
            # Track failed attempt
            self._increment_failed_attempts(email)

            # Check if too many failed attempts
            if self.get_failed_attempts(email) >= self.MAX_FAILED_ATTEMPTS:
                raise ValueError(
                    "Too many failed attempts. Please request a new code."
                )

            raise ValueError("Invalid verification code. Please try again.")

        # Check if code is expired
        if datetime.utcnow() > code_record.expires_at:
            raise ValueError("Verification code expired. Please request a new one.")

        # Check if code already used
        if code_record.is_used:
            raise ValueError("Code has already been used. Please request a new one.")

        # Check failed attempts for this specific code
        if code_record.failed_attempts >= self.MAX_FAILED_ATTEMPTS:
            raise ValueError("Too many failed attempts. Please request a new code.")

        # Mark code as used
        code_record.is_used = True
        code_record.verified_at = datetime.utcnow()
        self.db.commit()

        return {
            "success": True,
            "message": "Email verified successfully",
            "email": email,
        }

    def resend_verification_code(self, email: str) -> Dict:
        """
        Resend verification code (generates new code)

        Steps:
        1. Invalidate all previous codes for this email
        2. Generate and send new code
        3. Return new code_id

        Args:
            email: Email address to resend code to

        Returns:
            Dict with success, message, code_id, and expires_in_seconds

        Raises:
            ValueError: If rate limit exceeded
        """
        email = email.strip().lower()

        # Invalidate all previous codes for this email
        previous_codes = (
            self.db.query(EmailVerificationCode)
            .filter(
                EmailVerificationCode.email == email,
                EmailVerificationCode.is_valid == True,  # noqa: E712
                EmailVerificationCode.is_used == False,  # noqa: E712
            )
            .all()
        )

        for prev_code in previous_codes:
            prev_code.is_valid = False

        self.db.commit()

        # Send new code
        result = self.send_verification_code(email)
        result["message"] = "New verification code sent"

        return result

    def get_verification_code(self, code_id: UUID) -> EmailVerificationCode:
        """
        Get verification code by ID (for testing purposes)

        Args:
            code_id: UUID of verification code

        Returns:
            EmailVerificationCode record

        Raises:
            ValueError: If code not found
        """
        code_record = self.db.get(EmailVerificationCode, code_id)

        if not code_record:
            raise ValueError("Verification code not found")

        return code_record

    def get_recent_codes(self, email: str, hours: int = 1) -> List[EmailVerificationCode]:
        """
        Get verification codes sent to email in last N hours

        Args:
            email: Email address
            hours: Number of hours to look back

        Returns:
            List of EmailVerificationCode records
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        codes = (
            self.db.query(EmailVerificationCode)
            .filter(
                EmailVerificationCode.email == email,
                EmailVerificationCode.created_at >= cutoff_time,
            )
            .all()
        )

        return list(codes)

    def get_failed_attempts(self, email: str) -> int:
        """
        Get total failed verification attempts for email

        Args:
            email: Email address

        Returns:
            Total number of failed attempts
        """
        # Count failed attempts from all recent codes
        recent_codes = self.get_recent_codes(email, hours=1)

        total_attempts = sum(code.failed_attempts for code in recent_codes)

        return total_attempts

    def _increment_failed_attempts(self, email: str) -> None:
        """
        Increment failed attempts counter for most recent code

        Args:
            email: Email address
        """
        # Find most recent code for this email
        latest_code = (
            self.db.query(EmailVerificationCode)
            .filter(EmailVerificationCode.email == email)
            .order_by(EmailVerificationCode.created_at.desc())
            .first()
        )

        if latest_code:
            latest_code.failed_attempts += 1
            self.db.commit()

    def _send_verification_email(self, email: str, code: str) -> None:
        """
        Send verification email with code

        Args:
            email: Recipient email address
            code: 6-digit verification code
        """
        subject = "Verify your email for HireFlux"

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2563eb;">Welcome to HireFlux!</h2>

                <p>Thank you for registering as an employer. Please use the following
                6-digit code to verify your email address:</p>

                <div style="background-color: #f3f4f6; border-radius: 8px; padding: 20px;
                     text-align: center; margin: 30px 0;">
                    <h1 style="font-size: 36px; letter-spacing: 8px; margin: 0; color: #2563eb;">
                        {code}
                    </h1>
                </div>

                <p><strong>This code will expire in 10 minutes.</strong></p>

                <p>If you didn't request this code, please ignore this email.</p>

                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

                <p style="color: #6b7280; font-size: 14px;">
                    Best regards,<br>
                    The HireFlux Team
                </p>
            </div>
        </body>
        </html>
        """

        text_body = f"""
        Welcome to HireFlux!

        Thank you for registering as an employer. Please use the following
        6-digit code to verify your email address:

        {code}

        This code will expire in 10 minutes.

        If you didn't request this code, please ignore this email.

        Best regards,
        The HireFlux Team
        """

        send_email(
            to=email,
            subject=subject,
            html_body=html_body,
            text_body=text_body,
        )
