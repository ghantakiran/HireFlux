"""Email Verification Models

Database models for email verification codes used in employer registration.
Sprint 19-20 Week 39 Day 3 - Issue #20
"""

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Column, DateTime, String, Boolean, Integer
from app.db.base import Base
from app.db.types import GUID


class EmailVerificationCode(Base):
    """Email verification code model for registration"""

    __tablename__ = "email_verification_codes"

    id = Column(GUID(), primary_key=True, default=uuid4)
    email = Column(String(255), nullable=False, index=True)
    code = Column(String(6), nullable=False)  # 6-digit verification code

    # Status tracking
    is_used = Column(Boolean, default=False, nullable=False)
    is_valid = Column(Boolean, default=True, nullable=False)  # Invalidated on resend
    verified_at = Column(DateTime, nullable=True)

    # Expiration
    expires_at = Column(DateTime, nullable=False)  # 10 minutes from creation

    # Attempt tracking
    failed_attempts = Column(Integer, default=0, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def __repr__(self):
        return f"<EmailVerificationCode {self.email} - {self.code}>"
