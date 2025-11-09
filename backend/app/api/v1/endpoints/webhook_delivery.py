"""Webhook Delivery Management Endpoints - Sprint 17-18

Endpoints for managing webhook deliveries to external systems.
This is for DELIVERING webhooks TO employer systems, distinct from
webhooks.py which receives webhooks FROM job boards.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.api import deps
from app.db.models.user import User
from app.db.models.company import CompanyMember
from app.schemas.api_key import (
    WebhookCreate,
    WebhookResponse,
    WebhookUpdate,
    WebhookList,
    WebhookDeliveryResponse,
    WebhookDeliveryList,
    WebhookTestRequest,
)
from app.services.webhook_delivery_service import WebhookDeliveryService


router = APIRouter()


# ============================================================================
# DEPENDENCIES
# ============================================================================


def get_webhook_delivery_service(db: Session = Depends(deps.get_db)) -> WebhookDeliveryService:
    """Get webhook delivery service instance"""
    return WebhookDeliveryService(db=db)


def require_admin_or_owner(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
) -> CompanyMember:
    """
    Require user to be company admin or owner for webhook management

    Only admins and owners can manage webhooks for security reasons.
    """
    membership = (
        db.query(CompanyMember)
        .filter(CompanyMember.user_id == current_user.id)
        .filter(CompanyMember.status == "active")
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a company member to manage webhooks",
        )

    if membership.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners and admins can manage webhooks",
        )

    return membership


# ============================================================================
# WEBHOOK CRUD ENDPOINTS
# ============================================================================


@router.post(
    "/",
    response_model=WebhookResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Webhook",
    description="Create a new webhook endpoint to receive event notifications from HireFlux",
)
def create_webhook(
    webhook_data: WebhookCreate,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WebhookDeliveryService = Depends(get_webhook_delivery_service),
):
    """
    Create a new webhook endpoint

    Subscribe to events and receive real-time notifications at your endpoint.

    **Event Types:**
    - `application.created`: New application received
    - `application.updated`: Application details changed
    - `application.status_changed`: Application moved to new stage
    - `job.published`: New job posted
    - `job.closed`: Job posting closed
    - `interview.scheduled`: Interview scheduled with candidate
    - `candidate.viewed`: Candidate profile viewed by team member

    **HMAC Signature:**
    All webhook requests include an `X-Webhook-Signature` header with SHA-256 HMAC.
    Verify the signature using your webhook secret to ensure authenticity.

    Required plan: Professional or Enterprise
    """
    try:
        webhook = service.create_webhook(
            company_id=membership.company_id,
            user_id=membership.user_id,
            webhook_data=webhook_data,
        )

        return WebhookResponse.model_validate(webhook)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.get(
    "/",
    response_model=WebhookList,
    summary="List Webhooks",
    description="List all configured webhooks for your company",
)
def list_webhooks(
    page: int = 1,
    page_size: int = 20,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WebhookDeliveryService = Depends(get_webhook_delivery_service),
):
    """
    List all webhooks for the company

    Returns paginated list of webhook configurations.
    """
    result = service.list_webhooks(
        company_id=membership.company_id,
        page=page,
        page_size=page_size,
    )

    return WebhookList(
        webhooks=[WebhookResponse.model_validate(wh) for wh in result["webhooks"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
    )


@router.get(
    "/{webhook_id}",
    response_model=WebhookResponse,
    summary="Get Webhook",
    description="Get details of a specific webhook",
)
def get_webhook(
    webhook_id: UUID,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WebhookDeliveryService = Depends(get_webhook_delivery_service),
):
    """Get webhook details by ID"""
    webhook = service.get_webhook(
        webhook_id=webhook_id,
        company_id=membership.company_id,
    )

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found",
        )

    return WebhookResponse.model_validate(webhook)


@router.patch(
    "/{webhook_id}",
    response_model=WebhookResponse,
    summary="Update Webhook",
    description="Update webhook configuration (URL, events, active status)",
)
def update_webhook(
    webhook_id: UUID,
    update_data: WebhookUpdate,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WebhookDeliveryService = Depends(get_webhook_delivery_service),
):
    """
    Update webhook configuration

    You can update:
    - URL endpoint
    - Subscribed events
    - Active status
    - Custom headers

    You cannot change the webhook secret (delete and recreate instead).
    """
    try:
        webhook = service.update_webhook(
            webhook_id=webhook_id,
            company_id=membership.company_id,
            update_data=update_data,
        )

        if not webhook:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Webhook not found",
            )

        return WebhookResponse.model_validate(webhook)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.delete(
    "/{webhook_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Webhook",
    description="Delete a webhook (cannot be undone)",
)
def delete_webhook(
    webhook_id: UUID,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WebhookDeliveryService = Depends(get_webhook_delivery_service),
):
    """
    Delete a webhook

    This action cannot be undone. All delivery history will be retained
    but no further events will be delivered to this endpoint.
    """
    webhook = service.delete_webhook(
        webhook_id=webhook_id,
        company_id=membership.company_id,
    )

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found",
        )

    return None  # 204 No Content


# ============================================================================
# WEBHOOK DELIVERY HISTORY
# ============================================================================


@router.get(
    "/{webhook_id}/deliveries",
    response_model=WebhookDeliveryList,
    summary="Get Delivery History",
    description="Get delivery attempts for a webhook",
)
def get_delivery_history(
    webhook_id: UUID,
    limit: int = 50,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WebhookDeliveryService = Depends(get_webhook_delivery_service),
):
    """
    Get delivery history for a webhook

    Returns recent delivery attempts with status, response times, and error messages.
    """
    # Verify webhook belongs to company
    webhook = service.get_webhook(
        webhook_id=webhook_id,
        company_id=membership.company_id,
    )

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found",
        )

    deliveries = service.get_delivery_history(
        webhook_id=webhook_id,
        limit=limit,
    )

    return WebhookDeliveryList(
        deliveries=[WebhookDeliveryResponse.model_validate(d) for d in deliveries],
        total=len(deliveries),
        page=1,
        page_size=limit,
    )


@router.get(
    "/{webhook_id}/stats",
    summary="Get Delivery Statistics",
    description="Get delivery statistics for a webhook over a time period",
)
def get_delivery_stats(
    webhook_id: UUID,
    days: int = 30,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WebhookDeliveryService = Depends(get_webhook_delivery_service),
):
    """
    Get delivery statistics

    Returns:
    - Total deliveries
    - Successful deliveries
    - Failed deliveries
    - Success rate
    - Average response time

    Default period: last 30 days
    """
    # Verify webhook belongs to company
    webhook = service.get_webhook(
        webhook_id=webhook_id,
        company_id=membership.company_id,
    )

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found",
        )

    stats = service.get_delivery_stats(
        webhook_id=webhook_id,
        days=days,
    )

    return stats


# ============================================================================
# WEBHOOK TESTING
# ============================================================================


@router.post(
    "/{webhook_id}/test",
    summary="Test Webhook",
    description="Send a test event to your webhook endpoint",
)
async def test_webhook(
    webhook_id: UUID,
    test_data: WebhookTestRequest,
    background_tasks: BackgroundTasks,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WebhookDeliveryService = Depends(get_webhook_delivery_service),
):
    """
    Test webhook delivery

    Sends a test event to your webhook endpoint to verify configuration.
    The test payload will include sample data for the selected event type.
    """
    # Verify webhook belongs to company
    webhook = service.get_webhook(
        webhook_id=webhook_id,
        company_id=membership.company_id,
    )

    if not webhook:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Webhook not found",
        )

    # Create test payload
    test_payload = {
        "event": test_data.event_type,
        "test": True,
        "data": {
            "message": "This is a test webhook delivery",
            "timestamp": datetime.utcnow().isoformat(),
        },
        "timestamp": datetime.utcnow().isoformat(),
    }

    # Deliver webhook in background
    async def deliver_test():
        await service.deliver_webhook(
            webhook=webhook,
            event_type=test_data.event_type,
            payload=test_payload,
        )

    background_tasks.add_task(deliver_test)

    return {
        "message": "Test webhook scheduled for delivery",
        "event_type": test_data.event_type,
    }
