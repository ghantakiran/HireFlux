"""Billing models: CreditWallet, CreditLedger, Subscription"""
from sqlalchemy import Column, String, TIMESTAMP, ForeignKey, Integer, Text, Boolean, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID


class CreditWallet(Base):
    """User credit balance - multiple credit types"""
    __tablename__ = "credit_wallets"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    # Different credit types
    ai_credits = Column(Integer, default=0)  # For AI resume/cover letter generation
    cover_letter_credits = Column(Integer, default=3)  # Free tier gets 3
    auto_apply_credits = Column(Integer, default=0)  # For auto-apply feature
    job_suggestion_credits = Column(Integer, default=10)  # Monthly allocation

    # Lifetime totals
    total_earned = Column(Integer, default=0)
    total_spent = Column(Integer, default=0)

    # Last reset date for monthly credits
    last_reset = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="credit_wallet")


class CreditLedger(Base):
    """Credit transaction history - immutable audit log"""
    __tablename__ = "credit_ledger"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Transaction details
    credit_type = Column(String(50))  # 'ai', 'cover_letter', 'auto_apply', 'job_suggestion'
    amount = Column(Integer)  # Positive for credit, negative for debit
    balance_after = Column(Integer)  # Balance after this transaction
    operation = Column(String(50))  # 'deduct', 'add', 'refund', 'reset'

    # Context
    description = Column(Text)
    reference_id = Column(GUID())  # Resume ID, cover letter ID, application ID, etc.
    stripe_payment_intent_id = Column(String(255))  # For purchases

    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="credit_ledger")


class Subscription(Base):
    """User subscription plans"""
    __tablename__ = "subscriptions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # Stripe integration
    stripe_customer_id = Column(String(255))
    stripe_subscription_id = Column(String(255), unique=True)
    stripe_price_id = Column(String(255))

    # Subscription details
    plan = Column(String(50), default='free')  # 'free', 'plus', 'pro'
    status = Column(String(50), default='active')  # 'active', 'canceled', 'past_due', 'trialing'
    billing_interval = Column(String(20), default='month')  # 'month', 'year'

    # Periods
    current_period_start = Column(TIMESTAMP)
    current_period_end = Column(TIMESTAMP)
    trial_start = Column(TIMESTAMP)
    trial_end = Column(TIMESTAMP)

    # Cancellation
    cancel_at_period_end = Column(Boolean, default=False)
    canceled_at = Column(TIMESTAMP)
    cancellation_reason = Column(Text)

    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now())
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="subscriptions")


class StripeWebhookEvent(Base):
    """Stripe webhook events for idempotency"""
    __tablename__ = "stripe_webhook_events"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    stripe_event_id = Column(String(255), unique=True, index=True)
    event_type = Column(String(100))
    processed = Column(Boolean, default=False)
    processed_at = Column(TIMESTAMP)
    error = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now())


class PaymentMethod(Base):
    """User payment methods"""
    __tablename__ = "payment_methods"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    stripe_payment_method_id = Column(String(255), unique=True)

    # Card details (last 4 digits only)
    type = Column(String(50))  # 'card', 'bank_account'
    card_brand = Column(String(50))
    card_last4 = Column(String(4))
    card_exp_month = Column(Integer)
    card_exp_year = Column(Integer)

    # Status
    is_default = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="payment_methods")
