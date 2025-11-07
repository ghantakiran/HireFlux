"""Stripe billing service"""

import stripe
import uuid
from typing import Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ValidationError, ServiceError
from app.db.models.billing import (
    Subscription,
    CreditWallet,
    CreditLedger,
    StripeWebhookEvent,
    PaymentMethod,
)
from app.schemas.billing import (
    SubscriptionPlan,
    SubscriptionCreateRequest,
    CheckoutSessionResponse,
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
            "job_suggestion_credits": 10,
        },
        SubscriptionPlan.PLUS: {
            "ai_credits": -1,  # -1 = unlimited
            "cover_letter_credits": -1,
            "auto_apply_credits": 0,
            "job_suggestion_credits": 100,
        },
        SubscriptionPlan.PRO: {
            "ai_credits": -1,
            "cover_letter_credits": -1,
            "auto_apply_credits": 50,
            "job_suggestion_credits": 100,
        },
    }

    def __init__(self, db: Session):
        self.db = db

    def create_checkout_session(
        self, user_id: uuid.UUID, request: SubscriptionCreateRequest
    ) -> CheckoutSessionResponse:
        """Create Stripe checkout session"""
        try:
            # Get or create Stripe customer
            subscription = (
                self.db.query(Subscription)
                .filter(Subscription.user_id == user_id)
                .first()
            )

            if subscription and subscription.stripe_customer_id:
                customer_id = subscription.stripe_customer_id
            else:
                customer = stripe.Customer.create(metadata={"user_id": str(user_id)})
                customer_id = customer.id

            # Determine price ID
            price_key = f"{request.plan.value}_{request.billing_interval.value}ly"
            price_id = self.PLAN_PRICES.get(price_key)

            if not price_id:
                raise ValidationError(f"Price ID not configured for {price_key}")

            # Create checkout session
            session_params = {
                "customer": customer_id,
                "mode": "subscription",
                "line_items": [{"price": price_id, "quantity": 1}],
                "success_url": request.success_url,
                "cancel_url": request.cancel_url,
                "metadata": {"user_id": str(user_id), "plan": request.plan.value},
            }

            # Add promo code if provided
            if request.promo_code:
                session_params["discounts"] = [{"coupon": request.promo_code}]

            session = stripe.checkout.Session.create(**session_params)

            return CheckoutSessionResponse(
                session_id=session.id,
                session_url=session.url,
                public_key=settings.STRIPE_PUBLISHABLE_KEY,
            )
        except stripe.error.StripeError as e:
            raise ServiceError(f"Stripe error: {str(e)}")
        except Exception as e:
            raise ServiceError(f"Failed to create checkout session: {str(e)}")

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
        existing = (
            self.db.query(StripeWebhookEvent)
            .filter(StripeWebhookEvent.stripe_event_id == event.id)
            .first()
        )

        if existing and existing.processed:
            return {"status": "already_processed"}

        # Store event
        webhook_event = StripeWebhookEvent(
            id=uuid.uuid4(),
            stripe_event_id=event.id,
            event_type=event.type,
            processed=False,
        )
        self.db.add(webhook_event)
        self.db.commit()

        try:
            # Handle event types
            if event.type == "checkout.session.completed":
                self._handle_checkout_completed(event.data.object)
            elif event.type == "invoice.payment_succeeded":
                self._handle_payment_succeeded(event.data.object)
            elif event.type == "invoice.payment_failed":
                self._handle_payment_failed(event.data.object)
            elif event.type == "customer.subscription.deleted":
                self._handle_subscription_deleted(event.data.object)
            elif event.type == "customer.subscription.updated":
                self._handle_subscription_updated(event.data.object)

            # Mark as processed
            webhook_event.processed = True
            webhook_event.processed_at = datetime.utcnow()
            self.db.commit()

            return {"status": "success", "event_type": event.type}
        except Exception as e:
            webhook_event.error = str(e)
            self.db.commit()
            raise ServiceError(f"Webhook processing error: {str(e)}")

    def _handle_checkout_completed(self, session):
        """Handle successful checkout"""
        user_id = uuid.UUID(session.metadata["user_id"])
        plan = session.metadata["plan"]

        # Create or update subscription
        subscription = (
            self.db.query(Subscription).filter(Subscription.user_id == user_id).first()
        )

        if not subscription:
            subscription = Subscription(id=uuid.uuid4(), user_id=user_id)
            self.db.add(subscription)

        subscription.stripe_customer_id = session.customer
        subscription.stripe_subscription_id = session.subscription
        subscription.plan = plan
        subscription.status = "active"

        self.db.commit()

        # Allocate credits
        self._allocate_plan_credits(user_id, SubscriptionPlan(plan))

    def _handle_payment_succeeded(self, invoice):
        """Handle successful payment"""
        subscription_id = invoice.subscription

        if not subscription_id:
            return

        subscription = (
            self.db.query(Subscription)
            .filter(Subscription.stripe_subscription_id == subscription_id)
            .first()
        )

        if subscription:
            subscription.status = "active"
            self.db.commit()

            # Reset monthly credits on renewal
            self._reset_monthly_credits(subscription.user_id)

    def _handle_payment_failed(self, invoice):
        """Handle failed payment"""
        subscription_id = invoice.subscription

        if not subscription_id:
            return

        subscription = (
            self.db.query(Subscription)
            .filter(Subscription.stripe_subscription_id == subscription_id)
            .first()
        )

        if subscription:
            subscription.status = "past_due"
            self.db.commit()

    def _handle_subscription_deleted(self, stripe_subscription):
        """Handle subscription cancellation"""
        subscription = (
            self.db.query(Subscription)
            .filter(Subscription.stripe_subscription_id == stripe_subscription.id)
            .first()
        )

        if subscription:
            subscription.status = "canceled"
            subscription.canceled_at = datetime.utcnow()
            subscription.plan = "free"
            self.db.commit()

            # Reset to free tier credits
            self._allocate_plan_credits(subscription.user_id, SubscriptionPlan.FREE)

    def _handle_subscription_updated(self, stripe_subscription):
        """Handle subscription updates"""
        subscription = (
            self.db.query(Subscription)
            .filter(Subscription.stripe_subscription_id == stripe_subscription.id)
            .first()
        )

        if subscription:
            subscription.status = stripe_subscription.status
            subscription.current_period_start = datetime.fromtimestamp(
                stripe_subscription.current_period_start
            )
            subscription.current_period_end = datetime.fromtimestamp(
                stripe_subscription.current_period_end
            )
            subscription.cancel_at_period_end = stripe_subscription.cancel_at_period_end
            self.db.commit()

    def _allocate_plan_credits(self, user_id: uuid.UUID, plan: SubscriptionPlan):
        """Allocate credits based on plan"""
        wallet = (
            self.db.query(CreditWallet).filter(CreditWallet.user_id == user_id).first()
        )

        if not wallet:
            wallet = CreditWallet(id=uuid.uuid4(), user_id=user_id)
            self.db.add(wallet)

        credits = self.PLAN_CREDITS[plan]
        wallet.ai_credits = credits["ai_credits"]
        wallet.cover_letter_credits = credits["cover_letter_credits"]
        wallet.auto_apply_credits = credits["auto_apply_credits"]
        wallet.job_suggestion_credits = credits["job_suggestion_credits"]
        wallet.last_reset = datetime.utcnow()

        self.db.commit()

    def _reset_monthly_credits(self, user_id: uuid.UUID):
        """Reset monthly credits on renewal"""
        subscription = (
            self.db.query(Subscription).filter(Subscription.user_id == user_id).first()
        )

        if subscription and subscription.plan != "free":
            plan = SubscriptionPlan(subscription.plan)
            self._allocate_plan_credits(user_id, plan)

    def cancel_subscription(
        self, user_id: uuid.UUID, immediate: bool = False
    ) -> Dict[str, Any]:
        """Cancel user subscription"""
        subscription = (
            self.db.query(Subscription).filter(Subscription.user_id == user_id).first()
        )

        if not subscription or not subscription.stripe_subscription_id:
            raise ValidationError("No active subscription found")

        try:
            if immediate:
                stripe.Subscription.delete(subscription.stripe_subscription_id)
                subscription.status = "canceled"
                subscription.canceled_at = datetime.utcnow()
                subscription.plan = "free"
            else:
                stripe.Subscription.modify(
                    subscription.stripe_subscription_id, cancel_at_period_end=True
                )
                subscription.cancel_at_period_end = True

            self.db.commit()
            return {"status": "success", "immediate": immediate}
        except stripe.error.StripeError as e:
            raise ServiceError(f"Stripe error: {str(e)}")

    def get_subscription(self, user_id: uuid.UUID) -> Optional[Subscription]:
        """Get user's subscription"""
        return (
            self.db.query(Subscription).filter(Subscription.user_id == user_id).first()
        )
