"""Domain Verification Service
Issue #67: Company Domain Verification - Prevent Fake Companies

Supports three verification methods:
1. Email verification (admin@, postmaster@, webmaster@)
2. DNS TXT record verification
3. File upload verification (hireflux-verification.txt at website root)

Security features:
- Cryptographically secure token generation
- 24-hour token expiry
- Rate limiting (5 attempts per 24 hours)
- Domain spoofing prevention
- Duplicate domain prevention
"""

import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from uuid import UUID
from enum import Enum

from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.db.models.company import Company
from app.core.email import send_email
from app.core.config import settings


class VerificationMethod(str, Enum):
    """Verification method types"""
    EMAIL = "email"
    DNS = "dns"
    FILE = "file"
    MANUAL = "manual"  # Manual verification by support team


class VerificationStatus(str, Enum):
    """Verification status"""
    PENDING = "pending"
    VERIFIED = "verified"
    FAILED = "failed"
    EXPIRED = "expired"
    RATE_LIMITED = "rate_limited"


class DomainVerificationService:
    """Service for managing company domain verification"""

    # Constants
    TOKEN_EXPIRY_HOURS = 24
    MAX_ATTEMPTS_PER_DAY = 5
    TOKEN_LENGTH = 32  # Will be 64 chars in hex

    # Admin email addresses to try for email verification
    ADMIN_EMAILS = ["admin", "postmaster", "webmaster"]

    def __init__(self, db: Session):
        self.db = db

    def _generate_secure_token(self) -> str:
        """Generate cryptographically secure verification token"""
        random_bytes = secrets.token_bytes(self.TOKEN_LENGTH)
        return hashlib.sha256(random_bytes).hexdigest()

    def _check_rate_limit(self, company: Company) -> bool:
        """Check if company has exceeded verification attempt rate limit"""
        if company.verification_attempts >= self.MAX_ATTEMPTS_PER_DAY:
            # Check if 24 hours have passed since last attempt
            if company.last_verification_attempt:
                time_since_last = datetime.utcnow() - company.last_verification_attempt
                if time_since_last < timedelta(hours=24):
                    return False  # Still rate limited
                # Reset attempts after 24 hours
                company.verification_attempts = 0
        return True  # Not rate limited

    def _check_domain_ownership(self, company_id: UUID, domain: str) -> None:
        """
        Verify company owns the domain being verified

        Raises:
            ValueError: If domain mismatch or already verified by another company
        """
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise ValueError(f"Company {company_id} not found")

        # Check domain matches
        if company.domain != domain:
            raise ValueError(
                f"Domain mismatch: Company registered with {company.domain} "
                f"but attempting to verify {domain}"
            )

        # Check if domain already verified by another company
        existing = (
            self.db.query(Company)
            .filter(
                and_(
                    Company.domain == domain,
                    Company.domain_verified == True,
                    Company.id != company_id
                )
            )
            .first()
        )

        if existing:
            raise ValueError(
                f"Domain {domain} already verified by another company. "
                "Please contact support if you believe this is an error."
            )

    # =========================================================================
    # Email Verification
    # =========================================================================

    def initiate_email_verification(
        self, company_id: UUID, domain: str
    ) -> Dict[str, Any]:
        """
        Initiate email verification by sending verification emails

        Args:
            company_id: Company UUID
            domain: Domain to verify

        Returns:
            Dict with verification_id, method, instructions, verification_token

        Raises:
            ValueError: If rate limited, domain mismatch, or already verified
        """
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise ValueError(f"Company {company_id} not found")

        # Check rate limit
        if not self._check_rate_limit(company):
            raise ValueError(
                f"Too many verification attempts. Please wait 24 hours before trying again. "
                f"Attempts: {company.verification_attempts}/{self.MAX_ATTEMPTS_PER_DAY}"
            )

        # Check domain ownership
        self._check_domain_ownership(company_id, domain)

        # Generate verification token
        token = self._generate_secure_token()
        expires_at = datetime.utcnow() + timedelta(hours=self.TOKEN_EXPIRY_HOURS)

        # Update company
        company.verification_token = token
        company.verification_method = VerificationMethod.EMAIL
        company.verification_token_expires_at = expires_at
        company.verification_attempts += 1
        company.last_verification_attempt = datetime.utcnow()

        self.db.commit()

        # Send verification emails to admin addresses
        verification_url = f"{settings.FRONTEND_URL}/employer/verify-domain?token={token}"

        admin_emails = [f"{admin}@{domain}" for admin in self.ADMIN_EMAILS]

        for email in admin_emails:
            send_verification_email(
                to_email=email,
                company_name=company.name,
                verification_url=verification_url,
                expires_hours=self.TOKEN_EXPIRY_HOURS
            )

        return {
            "verification_id": str(company.id),
            "method": VerificationMethod.EMAIL,
            "verification_token": token,
            "expires_at": expires_at.isoformat(),
            "instructions": (
                f"Verification emails sent to {', '.join(admin_emails)}. "
                f"Click the link in the email to verify your domain. "
                f"Link expires in {self.TOKEN_EXPIRY_HOURS} hours."
            ),
        }

    def verify_email_token(self, token: str) -> Dict[str, Any]:
        """
        Verify domain using email token

        Args:
            token: Verification token from email link

        Returns:
            Dict with verified status and company_id

        Raises:
            ValueError: If token invalid or expired
        """
        company = (
            self.db.query(Company)
            .filter(Company.verification_token == token)
            .first()
        )

        if not company:
            raise ValueError("Invalid verification token")

        # Check expiry
        if company.verification_token_expires_at < datetime.utcnow():
            raise ValueError(
                "Verification token has expired. Please request a new verification email."
            )

        # Mark as verified
        company.domain_verified = True
        company.verified_at = datetime.utcnow()
        company.verification_token = None  # Clear token for security
        company.verification_token_expires_at = None

        self.db.commit()

        return {
            "verified": True,
            "company_id": str(company.id),
            "domain": company.domain,
            "verified_at": company.verified_at.isoformat(),
        }

    # =========================================================================
    # DNS Verification
    # =========================================================================

    def initiate_dns_verification(
        self, company_id: UUID, domain: str
    ) -> Dict[str, Any]:
        """
        Initiate DNS TXT record verification

        Args:
            company_id: Company UUID
            domain: Domain to verify

        Returns:
            Dict with method, txt_record, txt_record_value, instructions
        """
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise ValueError(f"Company {company_id} not found")

        # Check rate limit
        if not self._check_rate_limit(company):
            raise ValueError("Too many verification attempts. Please wait 24 hours.")

        # Check domain ownership
        self._check_domain_ownership(company_id, domain)

        # Generate verification code
        verification_code = secrets.token_hex(16)  # 32 char hex string

        # Update company
        company.verification_token = verification_code
        company.verification_method = VerificationMethod.DNS
        company.verification_attempts += 1
        company.last_verification_attempt = datetime.utcnow()

        self.db.commit()

        return {
            "method": VerificationMethod.DNS,
            "txt_record": f"hireflux-verification={verification_code}",
            "txt_record_value": verification_code,
            "instructions": (
                f"Add the following TXT record to your DNS settings for {domain}:\\n"
                f"Name: @ (or {domain})\\n"
                f"Type: TXT\\n"
                f"Value: hireflux-verification={verification_code}\\n\\n"
                "After adding the record, click 'Verify DNS' below. "
                "Note: DNS changes may take up to 48 hours to propagate."
            ),
        }

    def verify_dns_record(self, company_id: UUID) -> Dict[str, Any]:
        """
        Verify domain by checking DNS TXT record

        Args:
            company_id: Company UUID

        Returns:
            Dict with verified status

        Raises:
            ValueError: If DNS record not found or doesn't match
        """
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise ValueError(f"Company {company_id} not found")

        if company.verification_method != VerificationMethod.DNS:
            raise ValueError("DNS verification not initiated for this company")

        # Check DNS TXT record
        if check_dns_txt_record(company.domain, company.verification_token):
            # Mark as verified
            company.domain_verified = True
            company.verified_at = datetime.utcnow()
            company.verification_token = None

            self.db.commit()

            return {
                "verified": True,
                "company_id": str(company.id),
                "domain": company.domain,
                "method": VerificationMethod.DNS,
            }
        else:
            raise ValueError(
                f"DNS TXT record not found or does not match. "
                f"Expected: hireflux-verification={company.verification_token}"
            )

    # =========================================================================
    # File Upload Verification
    # =========================================================================

    def initiate_file_verification(
        self, company_id: UUID, domain: str
    ) -> Dict[str, Any]:
        """
        Initiate file upload verification

        Args:
            company_id: Company UUID
            domain: Domain to verify

        Returns:
            Dict with method, filename, file_content, instructions
        """
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise ValueError(f"Company {company_id} not found")

        # Check rate limit
        if not self._check_rate_limit(company):
            raise ValueError("Too many verification attempts. Please wait 24 hours.")

        # Check domain ownership
        self._check_domain_ownership(company_id, domain)

        # Generate verification code
        verification_code = secrets.token_hex(16)

        # Update company
        company.verification_token = verification_code
        company.verification_method = VerificationMethod.FILE
        company.verification_attempts += 1
        company.last_verification_attempt = datetime.utcnow()

        self.db.commit()

        return {
            "method": VerificationMethod.FILE,
            "filename": "hireflux-verification.txt",
            "file_content": verification_code,
            "instructions": (
                f"1. Create a file named 'hireflux-verification.txt'\\n"
                f"2. Add this content to the file: {verification_code}\\n"
                f"3. Upload the file to your website root: https://{domain}/hireflux-verification.txt\\n"
                f"4. Click 'Verify File' below to complete verification"
            ),
        }

    def verify_file(self, company_id: UUID) -> Dict[str, Any]:
        """
        Verify domain by fetching verification file from website

        Args:
            company_id: Company UUID

        Returns:
            Dict with verified status

        Raises:
            ValueError: If file not found or content doesn't match
        """
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise ValueError(f"Company {company_id} not found")

        if company.verification_method != VerificationMethod.FILE:
            raise ValueError("File verification not initiated for this company")

        # Fetch verification file
        file_content = fetch_verification_file(company.domain)

        if file_content and file_content.strip() == company.verification_token:
            # Mark as verified
            company.domain_verified = True
            company.verified_at = datetime.utcnow()
            company.verification_token = None

            self.db.commit()

            return {
                "verified": True,
                "company_id": str(company.id),
                "domain": company.domain,
                "method": VerificationMethod.FILE,
            }
        else:
            raise ValueError(
                "Verification file content does not match. "
                "Please ensure the file contains the exact verification code."
            )

    # =========================================================================
    # Helper Methods
    # =========================================================================

    def get_verification_status(self, company_id: UUID) -> Dict[str, Any]:
        """Get current verification status for a company"""
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise ValueError(f"Company {company_id} not found")

        return {
            "verified": company.domain_verified,
            "domain": company.domain,
            "method": company.verification_method,
            "attempts": company.verification_attempts,
            "last_attempt": company.last_verification_attempt.isoformat() if company.last_verification_attempt else None,
            "verified_at": company.verified_at.isoformat() if company.verified_at else None,
        }

    def resend_verification_email(self, company_id: UUID) -> Dict[str, Any]:
        """Resend verification email with existing token"""
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise ValueError(f"Company {company_id} not found")

        if company.verification_method != VerificationMethod.EMAIL:
            raise ValueError("Email verification not initiated")

        if not company.verification_token:
            raise ValueError("No active verification token. Please initiate new verification.")

        # Check if token expired
        if company.verification_token_expires_at < datetime.utcnow():
            raise ValueError("Verification token expired. Please initiate new verification.")

        # Resend emails
        verification_url = f"{settings.FRONTEND_URL}/employer/verify-domain?token={company.verification_token}"
        admin_emails = [f"{admin}@{company.domain}" for admin in self.ADMIN_EMAILS]

        for email in admin_emails:
            send_verification_email(
                to_email=email,
                company_name=company.name,
                verification_url=verification_url,
                expires_hours=self.TOKEN_EXPIRY_HOURS
            )

        return {
            "success": True,
            "message": f"Verification emails resent to {', '.join(admin_emails)}",
        }

    def clear_verification(self, company_id: UUID) -> None:
        """Clear verification data (e.g., when changing domain)"""
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise ValueError(f"Company {company_id} not found")

        company.domain_verified = False
        company.verification_token = None
        company.verification_method = None
        company.verification_token_expires_at = None
        company.verified_at = None

        self.db.commit()


# =============================================================================
# Helper Functions (DNS & File verification)
# =============================================================================

def check_dns_txt_record(domain: str, expected_value: str) -> bool:
    """
    Check if DNS TXT record exists with expected value

    Args:
        domain: Domain to check
        expected_value: Expected TXT record value

    Returns:
        True if record exists and matches, False otherwise
    """
    import dns.resolver

    try:
        answers = dns.resolver.resolve(domain, 'TXT')
        for rdata in answers:
            for txt_string in rdata.strings:
                txt_value = txt_string.decode('utf-8')
                if f"hireflux-verification={expected_value}" in txt_value:
                    return True
        return False
    except Exception:
        return False


def fetch_verification_file(domain: str) -> Optional[str]:
    """
    Fetch verification file from website root

    Args:
        domain: Domain to fetch from

    Returns:
        File content if found, None otherwise
    """
    import requests

    url = f"https://{domain}/hireflux-verification.txt"

    try:
        response = requests.get(url, timeout=10)
        if response.status_code == 200:
            return response.text
        return None
    except Exception:
        return None


def send_verification_email(
    to_email: str,
    company_name: str,
    verification_url: str,
    expires_hours: int = 24
) -> None:
    """
    Send domain verification email

    Args:
        to_email: Recipient email
        company_name: Company name
        verification_url: Verification link
        expires_hours: Hours until link expires
    """
    subject = f"Verify your domain for {company_name} on HireFlux"

    html_content = f"""
    <html>
    <body>
        <h2>Verify Your Company Domain</h2>
        <p>Hello,</p>
        <p>You're receiving this email because someone at <strong>{company_name}</strong> is trying to verify domain ownership on HireFlux.</p>

        <p>To complete the verification process, please click the link below:</p>

        <p><a href="{verification_url}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; display: inline-block;">Verify Domain</a></p>

        <p>Or copy and paste this URL into your browser:<br>{verification_url}</p>

        <p><strong>This link will expire in {expires_hours} hours.</strong></p>

        <p>If you did not request this verification, please ignore this email.</p>

        <p>Best regards,<br>The HireFlux Team</p>
    </body>
    </html>
    """

    send_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content
    )
