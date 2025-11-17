"""Email Verification API Endpoints

API endpoints for email verification during employer registration.
Sprint 19-20 Week 39 Day 3 - Issue #20
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.email_verification import (
    SendVerificationCodeRequest,
    SendVerificationCodeResponse,
    VerifyCodeRequest,
    VerifyCodeResponse,
    ResendCodeRequest,
    ResendCodeResponse,
)
from app.services.email_verification_service import EmailVerificationService

router = APIRouter(prefix="/email-verification", tags=["Email Verification"])


@router.post(
    "/send-code",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def send_verification_code(
    request: SendVerificationCodeRequest,
    db: Session = Depends(get_db),
):
    """
    Send 6-digit verification code to email.

    Used during employer registration (Step 1).

    **Rate Limiting:**
    - Max 3 verification codes per email per hour

    **Code Expiration:**
    - Codes expire after 10 minutes

    **Request Body:**
    - `email`: Email address to send code to

    **Response:**
    - `success`: True if code sent successfully
    - `message`: Success message
    - `code_id`: UUID of verification code (for tracking)
    - `expires_in_seconds`: 600 (10 minutes)

    **Error Codes:**
    - 400: Invalid email format
    - 429: Too many attempts (rate limit exceeded)
    - 500: Email sending failed
    """
    service = EmailVerificationService(db)

    try:
        result = service.send_verification_code(request.email)

        return {
            "success": True,
            "data": result,
        }

    except ValueError as e:
        error_msg = str(e)

        # Check if it's a rate limit error
        if "too many attempts" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=error_msg,
            )

        # Invalid email or other validation error
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send verification code: {str(e)}",
        )


@router.post(
    "/verify-code",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def verify_code(
    request: VerifyCodeRequest,
    db: Session = Depends(get_db),
):
    """
    Verify 6-digit code for email.

    Used during employer registration (Step 2).

    **Code Validation:**
    - Code must be exactly 6 digits
    - Code must not be expired (>10 minutes old)
    - Code must not have been used already
    - Max 3 failed attempts per code

    **Request Body:**
    - `email`: Email address being verified
    - `code`: 6-digit verification code

    **Response:**
    - `success`: True if verification successful
    - `message`: Success message
    - `email`: Verified email address

    **Error Codes:**
    - 400: Invalid code format
    - 401: Invalid or expired code
    - 429: Too many failed attempts
    - 500: Verification failed
    """
    service = EmailVerificationService(db)

    try:
        result = service.verify_code(request.email, request.code)

        return {
            "success": True,
            "data": result,
        }

    except ValueError as e:
        error_msg = str(e)

        # Check if it's too many attempts
        if "too many" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=error_msg,
            )

        # Invalid or expired code
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_msg,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to verify code: {str(e)}",
        )


@router.post(
    "/resend-code",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
def resend_verification_code(
    request: ResendCodeRequest,
    db: Session = Depends(get_db),
):
    """
    Resend verification code (generates new code).

    Invalidates all previous codes for the email and sends a fresh one.

    **Rate Limiting:**
    - Max 3 codes per email per hour (includes original + resends)

    **Request Body:**
    - `email`: Email address to resend code to

    **Response:**
    - `success`: True if code resent successfully
    - `message`: "New verification code sent"
    - `code_id`: UUID of new verification code
    - `expires_in_seconds`: 600 (10 minutes)

    **Error Codes:**
    - 429: Too many attempts (rate limit exceeded)
    - 500: Email sending failed
    """
    service = EmailVerificationService(db)

    try:
        result = service.resend_verification_code(request.email)

        return {
            "success": True,
            "data": result,
        }

    except ValueError as e:
        error_msg = str(e)

        if "too many attempts" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=error_msg,
            )

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resend verification code: {str(e)}",
        )
