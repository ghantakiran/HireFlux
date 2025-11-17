"""Email Verification Schemas

Pydantic schemas for email verification requests and responses.
Sprint 19-20 Week 39 Day 3 - Issue #20
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


class SendVerificationCodeRequest(BaseModel):
    """Request to send verification code"""

    email: EmailStr = Field(..., description="Email address to send code to")


class SendVerificationCodeResponse(BaseModel):
    """Response after sending verification code"""

    success: bool = True
    message: str = "Verification code sent to your email"
    code_id: UUID
    expires_in_seconds: int = 600  # 10 minutes


class VerifyCodeRequest(BaseModel):
    """Request to verify code"""

    email: EmailStr = Field(..., description="Email address being verified")
    code: str = Field(
        ..., min_length=6, max_length=6, description="6-digit verification code"
    )

    @field_validator("code")
    @classmethod
    def validate_code_format(cls, v: str) -> str:
        """Ensure code is exactly 6 digits"""
        if not v.isdigit():
            raise ValueError("Code must contain only digits")
        if len(v) != 6:
            raise ValueError("Code must be exactly 6 digits")
        return v


class VerifyCodeResponse(BaseModel):
    """Response after verifying code"""

    success: bool = True
    message: str = "Email verified successfully"
    email: str


class ResendCodeRequest(BaseModel):
    """Request to resend verification code"""

    email: EmailStr = Field(..., description="Email address to resend code to")


class ResendCodeResponse(BaseModel):
    """Response after resending code"""

    success: bool = True
    message: str = "New verification code sent"
    code_id: UUID
    expires_in_seconds: int = 600


class EmailVerificationCodeResponse(BaseModel):
    """Email verification code database record response"""

    id: UUID
    email: str
    code: str
    is_used: bool
    is_valid: bool
    expires_at: datetime
    failed_attempts: int
    created_at: datetime

    class Config:
        from_attributes = True
