"""Domain Verification Schemas
Issue #67: Company Domain Verification

API request/response schemas for domain verification endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class DomainVerificationInitiateRequest(BaseModel):
    """Request to initiate domain verification"""
    domain: str = Field(..., description="Domain to verify (e.g., example.com)")
    method: Literal["email", "dns", "file"] = Field(
        ...,
        description="Verification method: email, dns, or file"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "domain": "example.com",
                "method": "email"
            }
        }


class DomainVerificationInitiateResponse(BaseModel):
    """Response after initiating domain verification"""
    success: bool = Field(..., description="Whether initiation was successful")
    verification_id: str = Field(..., description="Verification ID (company ID)")
    method: str = Field(..., description="Verification method used")
    instructions: str = Field(..., description="Human-readable instructions")

    # Email verification fields
    verification_token: Optional[str] = Field(None, description="Verification token (email method)")
    expires_at: Optional[str] = Field(None, description="Token expiration timestamp")

    # DNS verification fields
    txt_record: Optional[str] = Field(None, description="DNS TXT record to add (dns method)")
    txt_record_value: Optional[str] = Field(None, description="TXT record value")

    # File verification fields
    filename: Optional[str] = Field(None, description="Filename to upload (file method)")
    file_content: Optional[str] = Field(None, description="File content")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "verification_id": "123e4567-e89b-12d3-a456-426614174000",
                "method": "email",
                "instructions": "Verification emails sent to admin@example.com, postmaster@example.com, webmaster@example.com",
                "verification_token": "abc123...",
                "expires_at": "2025-11-23T12:00:00"
            }
        }


class DomainVerificationCheckRequest(BaseModel):
    """Request to check/verify domain"""
    method: Literal["email", "dns", "file"] = Field(
        ...,
        description="Verification method to check"
    )
    token: Optional[str] = Field(
        None,
        description="Verification token (required for email method)"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "method": "email",
                "token": "abc123def456..."
            }
        }


class DomainVerificationCheckResponse(BaseModel):
    """Response after checking domain verification"""
    success: bool = Field(..., description="Whether verification was successful")
    verified: bool = Field(..., description="Whether domain is now verified")
    company_id: Optional[str] = Field(None, description="Company ID if verified")
    domain: Optional[str] = Field(None, description="Verified domain")
    method: str = Field(..., description="Verification method used")
    verified_at: Optional[str] = Field(None, description="Verification timestamp")
    message: str = Field(..., description="Status message")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "verified": True,
                "company_id": "123e4567-e89b-12d3-a456-426614174000",
                "domain": "example.com",
                "method": "email",
                "verified_at": "2025-11-22T12:00:00",
                "message": "Domain verified successfully"
            }
        }


class DomainVerificationStatusResponse(BaseModel):
    """Response for verification status check"""
    verified: bool = Field(..., description="Whether domain is verified")
    domain: Optional[str] = Field(None, description="Company domain")
    method: Optional[str] = Field(None, description="Verification method used")
    attempts: int = Field(..., description="Number of verification attempts")
    last_attempt: Optional[str] = Field(None, description="Last attempt timestamp")
    verified_at: Optional[str] = Field(None, description="Verification timestamp")
    can_retry: bool = Field(..., description="Whether user can retry verification")
    remaining_attempts: int = Field(..., description="Remaining attempts before rate limit")

    class Config:
        json_schema_extra = {
            "example": {
                "verified": False,
                "domain": "example.com",
                "method": "email",
                "attempts": 2,
                "last_attempt": "2025-11-22T10:00:00",
                "verified_at": None,
                "can_retry": True,
                "remaining_attempts": 3
            }
        }


class DomainVerificationResendRequest(BaseModel):
    """Request to resend verification email"""
    pass  # No body needed, uses current user's company


class DomainVerificationResendResponse(BaseModel):
    """Response after resending verification email"""
    success: bool = Field(..., description="Whether resend was successful")
    message: str = Field(..., description="Status message")
    emails_sent: int = Field(..., description="Number of emails sent")

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Verification emails resent successfully",
                "emails_sent": 3
            }
        }


class VerifiedBadgeResponse(BaseModel):
    """Response for verified badge display"""
    verified: bool = Field(..., description="Whether company is verified")
    verified_at: Optional[str] = Field(None, description="Verification timestamp")
    badge_html: Optional[str] = Field(None, description="HTML for verified badge")

    class Config:
        json_schema_extra = {
            "example": {
                "verified": True,
                "verified_at": "2025-11-22T12:00:00",
                "badge_html": '<span class="verified-badge">✓ Verified</span>'
            }
        }
