"""Domain Verification API Endpoints
Issue #67: Company Domain Verification - Prevent Fake Companies

REST API for employer domain verification flow:
- Initiate verification (email/DNS/file)
- Check/verify domain
- Get verification status
- Resend verification email
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.db.models.user import User
from app.db.models.company import CompanyMember
from app.services.domain_verification_service import DomainVerificationService
from app.schemas.domain_verification import (
    DomainVerificationInitiateRequest,
    DomainVerificationInitiateResponse,
    DomainVerificationCheckRequest,
    DomainVerificationCheckResponse,
    DomainVerificationStatusResponse,
    DomainVerificationResendResponse,
    VerifiedBadgeResponse,
)


router = APIRouter()


def get_user_company_member(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> CompanyMember:
    """
    Get company member for current user.

    Raises:
        HTTPException: If user is not a company member
    """
    company_member = (
        db.query(CompanyMember)
        .filter(CompanyMember.user_id == current_user.id)
        .first()
    )

    if not company_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any company. Please create a company first.",
        )

    return company_member


def check_company_owner_or_admin(company_member: CompanyMember) -> bool:
    """
    Check if user is owner or admin (required for domain verification).

    Raises:
        HTTPException: If insufficient permissions
    """
    allowed_roles = ["owner", "admin"]
    if company_member.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Only company owners and admins can verify domain. Your role: {company_member.role}",
        )
    return True


@router.post(
    "/initiate",
    response_model=DomainVerificationInitiateResponse,
    status_code=status.HTTP_200_OK,
    summary="Initiate domain verification",
    description="Start domain verification process using email, DNS, or file upload method.",
)
def initiate_domain_verification(
    request: DomainVerificationInitiateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Initiate domain verification for your company.

    **Required Permissions**: Owner or Admin

    **Verification Methods**:
    - **email**: Sends verification link to admin@domain, postmaster@domain, webmaster@domain
    - **dns**: Provides TXT record to add to DNS settings
    - **file**: Provides file to upload to website root

    **Rate Limiting**: Maximum 5 attempts per 24 hours

    **Returns**:
    - Verification instructions specific to chosen method
    - Verification token (email) or code (DNS/file)
    """
    # Get company member and check permissions
    company_member = get_user_company_member(current_user, db)
    check_company_owner_or_admin(company_member)

    # Initialize service
    service = DomainVerificationService(db)

    try:
        # Call appropriate method based on verification type
        if request.method == "email":
            result = service.initiate_email_verification(
                company_id=company_member.company_id,
                domain=request.domain
            )
        elif request.method == "dns":
            result = service.initiate_dns_verification(
                company_id=company_member.company_id,
                domain=request.domain
            )
        elif request.method == "file":
            result = service.initiate_file_verification(
                company_id=company_member.company_id,
                domain=request.domain
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid verification method: {request.method}"
            )

        return DomainVerificationInitiateResponse(
            success=True,
            **result
        )

    except ValueError as e:
        # Business logic errors (rate limit, domain mismatch, etc.)
        error_msg = str(e)
        if "rate limit" in error_msg.lower() or "too many" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=error_msg
            )
        elif "domain mismatch" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        elif "already verified" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=error_msg
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )


@router.post(
    "/verify",
    response_model=DomainVerificationCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify domain",
    description="Complete domain verification using provided token or by checking DNS/file.",
)
def verify_domain(
    request: DomainVerificationCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Complete domain verification.

    **Required Permissions**: Owner or Admin

    **Methods**:
    - **email**: Provide verification token from email link
    - **dns**: System checks DNS TXT record
    - **file**: System fetches verification file from website

    **Returns**:
    - Verification status
    - Company ID if successful
    - Timestamp of verification
    """
    # Get company member and check permissions
    company_member = get_user_company_member(current_user, db)
    check_company_owner_or_admin(company_member)

    # Initialize service
    service = DomainVerificationService(db)

    try:
        # Call appropriate verification method
        if request.method == "email":
            if not request.token:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Token is required for email verification"
                )
            result = service.verify_email_token(token=request.token)
            message = "Domain verified successfully via email"

        elif request.method == "dns":
            result = service.verify_dns_record(company_id=company_member.company_id)
            message = "Domain verified successfully via DNS"

        elif request.method == "file":
            result = service.verify_file(company_id=company_member.company_id)
            message = "Domain verified successfully via file upload"

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid verification method: {request.method}"
            )

        return DomainVerificationCheckResponse(
            success=True,
            method=request.method,
            message=message,
            **result
        )

    except ValueError as e:
        error_msg = str(e)
        if "expired" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail=error_msg
            )
        elif "not found" in error_msg.lower() or "invalid" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=error_msg
            )
        elif "does not match" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )
        else:
            return DomainVerificationCheckResponse(
                success=False,
                verified=False,
                method=request.method,
                message=error_msg
            )


@router.get(
    "/status",
    response_model=DomainVerificationStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get verification status",
    description="Get current domain verification status for your company.",
)
def get_verification_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get current verification status for your company.

    **Returns**:
    - Whether domain is verified
    - Verification method used
    - Number of attempts made
    - Whether you can retry (rate limit check)
    """
    # Get company member
    company_member = get_user_company_member(current_user, db)

    # Initialize service
    service = DomainVerificationService(db)

    try:
        status_data = service.get_verification_status(company_id=company_member.company_id)

        # Calculate remaining attempts (max 5 per 24 hours)
        max_attempts = 5
        remaining = max_attempts - status_data.get("attempts", 0)
        can_retry = remaining > 0

        return DomainVerificationStatusResponse(
            verified=status_data["verified"],
            domain=status_data.get("domain"),
            method=status_data.get("method"),
            attempts=status_data.get("attempts", 0),
            last_attempt=status_data.get("last_attempt"),
            verified_at=status_data.get("verified_at"),
            can_retry=can_retry,
            remaining_attempts=max(0, remaining)
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )


@router.post(
    "/resend",
    response_model=DomainVerificationResendResponse,
    status_code=status.HTTP_200_OK,
    summary="Resend verification email",
    description="Resend verification email with existing token.",
)
def resend_verification_email(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Resend verification email.

    **Required Permissions**: Owner or Admin

    **Requirements**:
    - Email verification must already be initiated
    - Token must not be expired
    - Must have remaining rate limit attempts

    **Returns**:
    - Success status
    - Number of emails sent
    """
    # Get company member and check permissions
    company_member = get_user_company_member(current_user, db)
    check_company_owner_or_admin(company_member)

    # Initialize service
    service = DomainVerificationService(db)

    try:
        result = service.resend_verification_email(company_id=company_member.company_id)

        return DomainVerificationResendResponse(
            success=result["success"],
            message=result["message"],
            emails_sent=3  # Always sends to 3 addresses
        )

    except ValueError as e:
        error_msg = str(e)
        if "not initiated" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email verification not initiated. Please start verification first."
            )
        elif "expired" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Verification token expired. Please initiate new verification."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_msg
            )


@router.get(
    "/badge",
    response_model=VerifiedBadgeResponse,
    status_code=status.HTTP_200_OK,
    summary="Get verified badge",
    description="Get verified badge HTML for company profile display.",
)
def get_verified_badge(
    company_id: Optional[str] = Query(None, description="Company ID (optional, defaults to current user's company)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get verified badge for display on company profile.

    **Public Endpoint**: Can check any company's verification status

    **Returns**:
    - Whether company is verified
    - Verification timestamp
    - HTML badge snippet
    """
    # If no company_id provided, use current user's company
    if not company_id:
        company_member = get_user_company_member(current_user, db)
        company_id = str(company_member.company_id)

    # Initialize service
    service = DomainVerificationService(db)

    try:
        from uuid import UUID
        status_data = service.get_verification_status(company_id=UUID(company_id))

        badge_html = None
        if status_data["verified"]:
            badge_html = (
                '<span class="inline-flex items-center px-2 py-1 text-xs font-medium '
                'text-green-700 bg-green-100 rounded-full">'
                '<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">'
                '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>'
                '</svg>'
                'Verified'
                '</span>'
            )

        return VerifiedBadgeResponse(
            verified=status_data["verified"],
            verified_at=status_data.get("verified_at"),
            badge_html=badge_html
        )

    except ValueError:
        # Company not found or no verification data
        return VerifiedBadgeResponse(
            verified=False,
            verified_at=None,
            badge_html=None
        )
