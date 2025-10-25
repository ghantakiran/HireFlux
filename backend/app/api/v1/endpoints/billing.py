"""Billing and subscription endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
import uuid
from typing import List, Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.schemas.user import User
from app.schemas.billing import (
    SubscriptionCreateRequest,
    CheckoutSessionResponse,
    CreditWalletResponse,
    CreditTransaction,
    SubscriptionResponse,
    SubscriptionCancelRequest,
    SubscriptionStatus,
    BillingInterval,
)
from app.services.stripe_service import StripeService
from app.services.credit_service import CreditService

router = APIRouter()


@router.post("/subscriptions/create", response_model=CheckoutSessionResponse)
def create_subscription(
    request: SubscriptionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create Stripe checkout session for subscription

    - **plan**: Subscription plan (plus, pro)
    - **billing_interval**: month or year
    - **success_url**: URL to redirect after successful payment
    - **cancel_url**: URL to redirect if user cancels
    """
    service = StripeService(db)
    try:
        return service.create_checkout_session(
            user_id=uuid.UUID(current_user.id), request=request
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/subscriptions/current", response_model=SubscriptionResponse)
def get_current_subscription(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Get current user's subscription"""
    service = StripeService(db)
    subscription = service.get_subscription(uuid.UUID(current_user.id))

    if not subscription:
        raise HTTPException(status_code=404, detail="No subscription found")

    return SubscriptionResponse(
        id=str(subscription.id),
        user_id=str(subscription.user_id),
        stripe_customer_id=subscription.stripe_customer_id,
        stripe_subscription_id=subscription.stripe_subscription_id,
        plan=subscription.plan,
        status=SubscriptionStatus(subscription.status),
        billing_interval=BillingInterval(subscription.billing_interval),
        current_period_start=subscription.current_period_start,
        current_period_end=subscription.current_period_end,
        cancel_at_period_end=subscription.cancel_at_period_end,
        trial_end=subscription.trial_end,
        created_at=subscription.created_at,
        updated_at=subscription.updated_at,
    )


@router.post("/subscriptions/cancel")
def cancel_subscription(
    request: SubscriptionCancelRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cancel subscription

    - **immediate**: Cancel immediately (true) or at period end (false)
    - **reason**: Cancellation reason (optional)
    """
    service = StripeService(db)
    try:
        result = service.cancel_subscription(
            user_id=uuid.UUID(current_user.id), immediate=request.immediate
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Stripe webhook endpoint

    Handles webhook events from Stripe:
    - checkout.session.completed
    - invoice.payment_succeeded
    - invoice.payment_failed
    - customer.subscription.deleted
    - customer.subscription.updated
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    service = StripeService(db)
    try:
        result = service.handle_webhook_event(payload, sig_header)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/credits", response_model=CreditWalletResponse)
def get_credits(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Get user's credit balance

    Returns:
    - ai_credits: Credits for AI resume generation
    - cover_letter_credits: Credits for cover letter generation
    - auto_apply_credits: Credits for auto-apply feature
    - job_suggestion_credits: Credits for job suggestions
    - total_earned: Lifetime credits earned
    - total_spent: Lifetime credits spent
    """
    service = CreditService(db)
    return service.get_wallet(uuid.UUID(current_user.id))


@router.get("/credits/history", response_model=List[CreditTransaction])
def get_credit_history(
    credit_type: Optional[str] = Query(None, description="Filter by credit type"),
    limit: int = Query(
        50, ge=1, le=100, description="Number of transactions to return"
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get credit transaction history

    - **credit_type**: Optional filter (ai, cover_letter, auto_apply, job_suggestion)
    - **limit**: Number of transactions to return (max 100)
    """
    service = CreditService(db)
    return service.get_transaction_history(
        user_id=uuid.UUID(current_user.id), credit_type=credit_type, limit=limit
    )


@router.get("/credits/check/{credit_type}/{amount}")
def check_credits(
    credit_type: str,
    amount: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Check if user has sufficient credits

    - **credit_type**: Type of credit (ai, cover_letter, auto_apply, job_suggestion)
    - **amount**: Required amount
    """
    service = CreditService(db)
    has_credits = service.check_sufficient_credits(
        user_id=uuid.UUID(current_user.id), credit_type=credit_type, amount=amount
    )

    return {"sufficient": has_credits, "credit_type": credit_type, "required": amount}
