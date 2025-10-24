# Stripe Billing Implementation Guide

## Overview
This document outlines the Stripe billing integration for HireFlux, including subscription plans, credit system, and webhook handling.

## Completed Components

### 1. BDD Scenarios ✅
- **File**: `tests/features/stripe_billing.feature`
- **Scenarios**: 40+ comprehensive scenarios covering:
  - Subscription lifecycle (create, upgrade, downgrade, cancel)
  - Credit wallet operations (deduct, add, refund, reset)
  - Webhook handling (payment success/failure, subscription events)
  - Free trials and conversions
  - Payment method management
  - Promo codes and discounts
  - Refund processing
  - Fraud prevention

### 2. Schemas ✅
- **File**: `app/schemas/billing.py`
- **Schemas Created**:
  - `SubscriptionPlan` (FREE, PLUS, PRO)
  - `SubscriptionCreateRequest`
  - `SubscriptionResponse`
  - `CheckoutSessionResponse`
  - `CreditWalletResponse`
  - `CreditTransaction`
  - `InvoiceResponse`
  - `PaymentMethodResponse`
  - And 10+ more...

### 3. Database Models ✅
- **File**: `app/db/models/billing.py`
- **Models Created**:
  - `CreditWallet` - Multi-type credit balance (ai, cover_letter, auto_apply, job_suggestion)
  - `CreditLedger` - Immutable transaction log
  - `Subscription` - Full Stripe integration fields
  - `StripeWebhookEvent` - Idempotency for webhooks
  - `PaymentMethod` - Stored payment methods

### 4. Configuration ✅
- **File**: `app/core/config.py`
- Stripe keys already configured:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_PUBLISHABLE_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PLUS_PRICE_ID`
  - `STRIPE_PRO_PRICE_ID`

## Implementation Steps

### Step 1: Create Stripe Service
Create `app/services/stripe_service.py`:

```python
"""Stripe billing service"""
import stripe
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models.billing import (
    Subscription,
    CreditWallet,
    CreditLedger,
    StripeWebhookEvent,
    PaymentMethod
)
from app.schemas.billing import (
    SubscriptionPlan,
    SubscriptionCreateRequest,
    CheckoutSessionResponse
)

stripe.api_key = settings.STRIPE_SECRET_KEY

class StripeService:
    """Stripe billing operations"""

    PLAN_PRICES = {
        "plus_monthly": settings.STRIPE_PLUS_PRICE_ID,
        "pro_monthly": settings.STRIPE_PRO_PRICE_ID,
        # Add yearly prices when configured
    }

    PLAN_CREDITS = {
        SubscriptionPlan.FREE: {
            "ai_credits": 0,
            "cover_letter_credits": 3,
            "auto_apply_credits": 0,
            "job_suggestion_credits": 10
        },
        SubscriptionPlan.PLUS: {
            "ai_credits": -1,  # -1 = unlimited
            "cover_letter_credits": -1,
            "auto_apply_credits": 0,
            "job_suggestion_credits": 100
        },
        SubscriptionPlan.PRO: {
            "ai_credits": -1,
            "cover_letter_credits": -1,
            "auto_apply_credits": 50,
            "job_suggestion_credits": 100
        }
    }

    def __init__(self, db: Session):
        self.db = db

    def create_checkout_session(
        self,
        user_id: uuid.UUID,
        request: SubscriptionCreateRequest
    ) -> CheckoutSessionResponse:
        """Create Stripe checkout session"""
        # Get or create Stripe customer
        subscription = self.db.query(Subscription).filter(
            Subscription.user_id == user_id
        ).first()

        if subscription and subscription.stripe_customer_id:
            customer_id = subscription.stripe_customer_id
        else:
            customer = stripe.Customer.create(
                metadata={"user_id": str(user_id)}
            )
            customer_id = customer.id

        # Determine price ID
        price_id = self.PLAN_PRICES.get(f"{request.plan.value}_monthly")

        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer_id,
            mode="subscription",
            line_items=[{
                "price": price_id,
                "quantity": 1
            }],
            success_url=request.success_url,
            cancel_url=request.cancel_url,
            metadata={
                "user_id": str(user_id),
                "plan": request.plan.value
            }
        )

        return CheckoutSessionResponse(
            session_id=session.id,
            session_url=session.url,
            public_key=settings.STRIPE_PUBLISHABLE_KEY
        )

    def handle_webhook_event(self, payload: bytes, sig_header: str) -> Dict[str, Any]:
        """Handle Stripe webhook"""
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            raise ValueError("Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise ValueError("Invalid signature")

        # Check idempotency
        existing = self.db.query(StripeWebhookEvent).filter(
            StripeWebhookEvent.stripe_event_id == event.id
        ).first()

        if existing and existing.processed:
            return {"status": "already_processed"}

        # Store event
        webhook_event = StripeWebhookEvent(
            id=uuid.uuid4(),
            stripe_event_id=event.id,
            event_type=event.type,
            processed=False
        )
        self.db.add(webhook_event)
        self.db.commit()

        # Handle event types
        if event.type == "checkout.session.completed":
            self._handle_checkout_completed(event.data.object)
        elif event.type == "invoice.payment_succeeded":
            self._handle_payment_succeeded(event.data.object)
        elif event.type == "invoice.payment_failed":
            self._handle_payment_failed(event.data.object)
        elif event.type == "customer.subscription.deleted":
            self._handle_subscription_deleted(event.data.object)

        # Mark as processed
        webhook_event.processed = True
        webhook_event.processed_at = datetime.utcnow()
        self.db.commit()

        return {"status": "success"}

    def _handle_checkout_completed(self, session):
        """Handle successful checkout"""
        user_id = uuid.UUID(session.metadata["user_id"])
        plan = session.metadata["plan"]

        # Create or update subscription
        subscription = self.db.query(Subscription).filter(
            Subscription.user_id == user_id
        ).first()

        if not subscription:
            subscription = Subscription(
                id=uuid.uuid4(),
                user_id=user_id
            )
            self.db.add(subscription)

        subscription.stripe_customer_id = session.customer
        subscription.stripe_subscription_id = session.subscription
        subscription.plan = plan
        subscription.status = "active"

        self.db.commit()

        # Allocate credits
        self._allocate_plan_credits(user_id, SubscriptionPlan(plan))

    def _allocate_plan_credits(self, user_id: uuid.UUID, plan: SubscriptionPlan):
        """Allocate credits based on plan"""
        wallet = self.db.query(CreditWallet).filter(
            CreditWallet.user_id == user_id
        ).first()

        if not wallet:
            wallet = CreditWallet(id=uuid.uuid4(), user_id=user_id)
            self.db.add(wallet)

        credits = self.PLAN_CREDITS[plan]
        wallet.ai_credits = credits["ai_credits"]
        wallet.cover_letter_credits = credits["cover_letter_credits"]
        wallet.auto_apply_credits = credits["auto_apply_credits"]
        wallet.job_suggestion_credits = credits["job_suggestion_credits"]

        self.db.commit()
```

### Step 2: Create Credit Management Service
Create `app/services/credit_service.py`:

```python
"""Credit wallet management"""
import uuid
from sqlalchemy.orm import Session
from app.db.models.billing import CreditWallet, CreditLedger
from app.core.exceptions import ValidationError

class CreditService:
    def __init__(self, db: Session):
        self.db = db

    def deduct_credits(
        self,
        user_id: uuid.UUID,
        credit_type: str,
        amount: int,
        description: str,
        reference_id: Optional[uuid.UUID] = None
    ) -> bool:
        """Deduct credits from wallet"""
        wallet = self.db.query(CreditWallet).filter(
            CreditWallet.user_id == user_id
        ).first()

        if not wallet:
            raise ValidationError("Credit wallet not found")

        # Check balance
        current_balance = getattr(wallet, f"{credit_type}_credits", 0)
        if current_balance == -1:  # Unlimited
            return True

        if current_balance < amount:
            raise ValidationError(f"Insufficient {credit_type} credits")

        # Deduct credits
        setattr(wallet, f"{credit_type}_credits", current_balance - amount)
        wallet.total_spent += amount

        # Log transaction
        ledger_entry = CreditLedger(
            id=uuid.uuid4(),
            user_id=user_id,
            credit_type=credit_type,
            amount=-amount,
            balance_after=current_balance - amount,
            operation="deduct",
            description=description,
            reference_id=reference_id
        )
        self.db.add(ledger_entry)
        self.db.commit()

        return True

    def add_credits(
        self,
        user_id: uuid.UUID,
        credit_type: str,
        amount: int,
        description: str
    ):
        """Add credits to wallet"""
        wallet = self.db.query(CreditWallet).filter(
            CreditWallet.user_id == user_id
        ).first()

        current_balance = getattr(wallet, f"{credit_type}_credits", 0)
        if current_balance != -1:  # Not unlimited
            setattr(wallet, f"{credit_type}_credits", current_balance + amount)
            wallet.total_earned += amount

        ledger_entry = CreditLedger(
            id=uuid.uuid4(),
            user_id=user_id,
            credit_type=credit_type,
            amount=amount,
            balance_after=current_balance + amount,
            operation="add",
            description=description
        )
        self.db.add(ledger_entry)
        self.db.commit()
```

### Step 3: Create API Endpoints
Create `app/api/v1/endpoints/billing.py`:

```python
"""Billing and subscription endpoints"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.core.auth import get_current_user
from app.schemas.user import User
from app.schemas.billing import *
from app.services.stripe_service import StripeService
from app.services.credit_service import CreditService

router = APIRouter()

@router.post("/subscriptions/create", response_model=CheckoutSessionResponse)
def create_subscription(
    request: SubscriptionCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create Stripe checkout session"""
    service = StripeService(db)
    return service.create_checkout_session(
        user_id=uuid.UUID(current_user.id),
        request=request
    )

@router.post("/webhooks/stripe")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """Handle Stripe webhooks"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    service = StripeService(db)
    try:
        result = service.handle_webhook_event(payload, sig_header)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/credits", response_model=CreditWalletResponse)
def get_credits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's credit balance"""
    from app.db.models.billing import CreditWallet
    wallet = db.query(CreditWallet).filter(
        CreditWallet.user_id == uuid.UUID(current_user.id)
    ).first()

    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    return CreditWalletResponse(
        user_id=str(wallet.user_id),
        ai_credits=wallet.ai_credits,
        cover_letter_credits=wallet.cover_letter_credits,
        auto_apply_credits=wallet.auto_apply_credits,
        job_suggestion_credits=wallet.job_suggestion_credits,
        total_earned=wallet.total_earned,
        total_spent=wallet.total_spent,
        last_reset=wallet.last_reset
    )
```

### Step 4: Integrate Credit Deduction
Update AI generation services to deduct credits before operations.

## Testing

### Unit Tests
```python
# tests/unit/test_stripe_service.py
def test_create_checkout_session(stripe_service, mock_db):
    request = SubscriptionCreateRequest(
        plan=SubscriptionPlan.PLUS,
        billing_interval=BillingInterval.MONTH,
        success_url="https://app.com/success",
        cancel_url="https://app.com/cancel"
    )
    result = stripe_service.create_checkout_session(user_id, request)
    assert result.session_id is not None
    assert result.session_url.startswith("https://checkout.stripe.com")
```

### Integration Tests
```python
# tests/integration/test_billing_endpoints.py
def test_create_subscription_endpoint(client, auth_headers):
    response = client.post(
        "/api/v1/billing/subscriptions/create",
        json={
            "plan": "plus",
            "billing_interval": "month",
            "success_url": "https://app.com/success",
            "cancel_url": "https://app.com/cancel"
        },
        headers=auth_headers
    )
    assert response.status_code == 200
    assert "session_id" in response.json()
```

## Deployment Checklist

1. [ ] Set Stripe API keys in production environment
2. [ ] Configure webhook endpoint in Stripe Dashboard
3. [ ] Set up Stripe Price IDs for each plan
4. [ ] Test webhook signature verification
5. [ ] Configure retry logic for failed payments
6. [ ] Set up monitoring for subscription events
7. [ ] Configure email notifications
8. [ ] Test refund workflows
9. [ ] Set up fraud detection rules
10. [ ] Create admin dashboard for subscription management

## Next Steps

1. Implement the services outlined above
2. Create comprehensive unit and integration tests
3. Set up Stripe test mode for development
4. Configure webhook endpoints
5. Implement credit deduction in AI services
6. Add email notifications for billing events
7. Create admin endpoints for subscription management
