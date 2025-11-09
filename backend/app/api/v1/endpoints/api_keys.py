"""API Key Management Endpoints - Sprint 17-18

Endpoints for managing API keys for public API access.
"""

from datetime import datetime, timedelta
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from app.api import deps
from app.db.models.user import User
from app.db.models.company import CompanyMember
from app.schemas.api_key import (
    APIKeyCreate,
    APIKeyResponse,
    APIKeyUpdate,
    APIKeyList,
    APIKeyUsageStats,
)
from app.services.api_key_service import APIKeyService


router = APIRouter()


# ============================================================================
# DEPENDENCIES
# ============================================================================


def get_api_key_service(db: Session = Depends(deps.get_db)) -> APIKeyService:
    """Get API key service instance"""
    return APIKeyService(db=db)


def require_admin_or_owner(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
) -> CompanyMember:
    """
    Require user to be company admin or owner for API key management

    Only admins and owners can manage API keys for security reasons.
    """
    # Get user's company membership
    membership = (
        db.query(CompanyMember)
        .filter(CompanyMember.user_id == current_user.id)
        .filter(CompanyMember.status == "active")
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a company member to manage API keys",
        )

    if membership.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners and admins can manage API keys",
        )

    return membership


# ============================================================================
# API KEY CRUD ENDPOINTS
# ============================================================================


@router.post(
    "/",
    response_model=APIKeyResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create API Key",
    description="Create a new API key for public API access. **IMPORTANT:** The plaintext key is only shown once!",
)
def create_api_key(
    key_data: APIKeyCreate,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: APIKeyService = Depends(get_api_key_service),
):
    """
    Create a new API key

    The response includes the full plaintext API key in the `key` field.
    **This is the only time you'll see the full key - store it securely!**

    Required subscription: Professional or Enterprise

    Permissions:
    - Only company owners and admins can create API keys
    """
    try:
        result = service.create_api_key(
            company_id=membership.company_id,
            user_id=membership.user_id,
            key_data=key_data,
        )

        # Add plaintext key to response (only shown once!)
        response = APIKeyResponse.model_validate(result["api_key"])
        response.key = result["plaintext_key"]

        return response

    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.get(
    "/",
    response_model=APIKeyList,
    summary="List API Keys",
    description="List all API keys for your company with pagination",
)
def list_api_keys(
    page: int = 1,
    page_size: int = 20,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: APIKeyService = Depends(get_api_key_service),
):
    """
    List all API keys for the company

    Returns paginated list of API keys (plaintext keys are never shown again after creation)

    Permissions:
    - Only company owners and admins can list API keys
    """
    result = service.list_api_keys(
        company_id=membership.company_id,
        page=page,
        page_size=page_size,
    )

    return APIKeyList(
        keys=[APIKeyResponse.model_validate(key) for key in result["keys"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
    )


@router.get(
    "/{key_id}",
    response_model=APIKeyResponse,
    summary="Get API Key",
    description="Get details of a specific API key",
)
def get_api_key(
    key_id: UUID,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: APIKeyService = Depends(get_api_key_service),
):
    """
    Get API key details by ID

    Permissions:
    - Only company owners and admins can view API key details
    """
    api_key = service.get_api_key(
        key_id=key_id,
        company_id=membership.company_id,
    )

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    return APIKeyResponse.model_validate(api_key)


@router.patch(
    "/{key_id}",
    response_model=APIKeyResponse,
    summary="Update API Key",
    description="Update API key properties (name, permissions, rate limit tier)",
)
def update_api_key(
    key_id: UUID,
    update_data: APIKeyUpdate,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: APIKeyService = Depends(get_api_key_service),
):
    """
    Update API key properties

    You can update:
    - Name
    - Permissions
    - Rate limit tier

    You cannot:
    - Change the key itself (create a new one instead)
    - Un-revoke a key (create a new one instead)

    Permissions:
    - Only company owners and admins can update API keys
    """
    api_key = service.update_api_key(
        key_id=key_id,
        company_id=membership.company_id,
        update_data=update_data,
    )

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    return APIKeyResponse.model_validate(api_key)


@router.delete(
    "/{key_id}",
    response_model=APIKeyResponse,
    summary="Revoke API Key",
    description="Revoke an API key (cannot be undone)",
)
def revoke_api_key(
    key_id: UUID,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: APIKeyService = Depends(get_api_key_service),
):
    """
    Revoke an API key

    This is a soft delete - the key is marked as revoked and will no longer work.
    This action cannot be undone. Create a new API key if needed.

    Permissions:
    - Only company owners and admins can revoke API keys
    """
    api_key = service.revoke_api_key(
        key_id=key_id,
        company_id=membership.company_id,
        revoked_by=membership.user_id,
    )

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    return APIKeyResponse.model_validate(api_key)


# ============================================================================
# API KEY USAGE & ANALYTICS
# ============================================================================


@router.get(
    "/{key_id}/usage",
    response_model=APIKeyUsageStats,
    summary="Get API Key Usage Statistics",
    description="Get usage statistics for an API key over a time period",
)
def get_api_key_usage(
    key_id: UUID,
    days: int = 30,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: APIKeyService = Depends(get_api_key_service),
):
    """
    Get usage statistics for an API key

    Returns:
    - Total requests
    - Requests by endpoint
    - Requests by status code
    - Average response time
    - Error rate

    Permissions:
    - Only company owners and admins can view usage statistics
    """
    # Verify API key belongs to company
    api_key = service.get_api_key(
        key_id=key_id,
        company_id=membership.company_id,
    )

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    # Calculate date range
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    # Get usage stats
    stats = service.get_usage_stats(
        api_key_id=key_id,
        start_date=start_date,
        end_date=end_date,
    )

    return APIKeyUsageStats(**stats)


# ============================================================================
# API KEY VALIDATION (Internal use by API middleware)
# ============================================================================


@router.post(
    "/validate",
    response_model=APIKeyResponse,
    summary="Validate API Key (Internal)",
    description="Validate an API key and check permissions. Used by API middleware.",
    include_in_schema=False,  # Hide from public docs
)
def validate_api_key(
    x_api_key: str = Header(..., description="API key from request header"),
    x_forwarded_for: str = Header(None, description="Client IP address"),
    service: APIKeyService = Depends(get_api_key_service),
):
    """
    Validate API key (internal endpoint for middleware)

    This endpoint is used by the API middleware to validate incoming requests.
    Not meant for direct use by external clients.
    """
    api_key = service.validate_api_key(
        plaintext_key=x_api_key,
        ip_address=x_forwarded_for,
    )

    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or revoked API key",
        )

    # Check rate limits
    if not service.check_rate_limit(api_key, window="minute"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded (per minute)",
        )

    if not service.check_rate_limit(api_key, window="hour"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded (per hour)",
        )

    return APIKeyResponse.model_validate(api_key)
