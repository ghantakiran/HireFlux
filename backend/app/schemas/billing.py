"""Schemas for billing and subscription management"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class SubscriptionPlan(str, Enum):
    """Subscription plan types"""

    FREE = "free"
    PLUS = "plus"
    PRO = "pro"


class SubscriptionStatus(str, Enum):
    """Subscription status"""

    ACTIVE = "active"
    PAST_DUE = "past_due"
    CANCELED = "canceled"
    INCOMPLETE = "incomplete"
    TRIALING = "trialing"


class BillingInterval(str, Enum):
    """Billing interval"""

    MONTH = "month"
    YEAR = "year"


class CreditOperation(str, Enum):
    """Credit operation types"""

    DEDUCT = "deduct"
    ADD = "add"
    REFUND = "refund"
    RESET = "reset"


class SubscriptionCreateRequest(BaseModel):
    """Request to create subscription"""

    plan: SubscriptionPlan = Field(..., description="Subscription plan")
    billing_interval: BillingInterval = Field(
        default=BillingInterval.MONTH, description="Billing interval"
    )
    promo_code: Optional[str] = Field(
        None, max_length=50, description="Promotional code"
    )
    success_url: str = Field(..., description="Success redirect URL")
    cancel_url: str = Field(..., description="Cancel redirect URL")


class SubscriptionResponse(BaseModel):
    """Subscription information"""

    id: str
    user_id: str
    stripe_customer_id: Optional[str]
    stripe_subscription_id: Optional[str]
    plan: SubscriptionPlan
    status: SubscriptionStatus
    billing_interval: BillingInterval
    current_period_start: Optional[datetime]
    current_period_end: Optional[datetime]
    cancel_at_period_end: bool
    trial_end: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]


class CheckoutSessionResponse(BaseModel):
    """Stripe checkout session response"""

    session_id: str
    session_url: str
    public_key: str


class CreditPurchaseRequest(BaseModel):
    """Request to purchase credits"""

    amount: int = Field(
        ..., ge=10, le=1000, description="Number of credits to purchase"
    )
    success_url: str = Field(..., description="Success redirect URL")
    cancel_url: str = Field(..., description="Cancel redirect URL")


class CreditWalletResponse(BaseModel):
    """User's credit wallet"""

    user_id: str
    ai_credits: int
    cover_letter_credits: int
    auto_apply_credits: int
    job_suggestion_credits: int
    total_earned: int
    total_spent: int
    last_reset: Optional[datetime]


class CreditTransaction(BaseModel):
    """Credit transaction record"""

    id: str
    user_id: str
    operation: CreditOperation
    credit_type: str
    amount: int
    balance_after: int
    description: str
    reference_id: Optional[str]  # Resume ID, cover letter ID, etc.
    created_at: datetime


class CreditTransactionRequest(BaseModel):
    """Request to create credit transaction"""

    credit_type: str = Field(
        ..., description="Type of credit (ai, cover_letter, auto_apply)"
    )
    amount: int = Field(..., description="Amount to deduct/add")
    description: str = Field(..., max_length=500)
    reference_id: Optional[str] = None


class InvoiceResponse(BaseModel):
    """Stripe invoice information"""

    id: str
    invoice_number: Optional[str]
    amount_paid: float
    amount_due: float
    currency: str
    status: str
    invoice_pdf: Optional[str]
    hosted_invoice_url: Optional[str]
    created: datetime
    due_date: Optional[datetime]
    period_start: datetime
    period_end: datetime


class PaymentMethodResponse(BaseModel):
    """Payment method information"""

    id: str
    type: str  # card, bank_account, etc.
    card_brand: Optional[str]
    card_last4: Optional[str]
    card_exp_month: Optional[int]
    card_exp_year: Optional[int]
    is_default: bool


class UpdatePaymentMethodRequest(BaseModel):
    """Request to update payment method"""

    payment_method_id: str = Field(..., description="Stripe payment method ID")
    set_as_default: bool = Field(
        default=True, description="Set as default payment method"
    )


class WebhookEvent(BaseModel):
    """Stripe webhook event"""

    id: str
    type: str
    data: Dict[str, Any]
    created: datetime


class SubscriptionCancelRequest(BaseModel):
    """Request to cancel subscription"""

    immediate: bool = Field(
        default=False, description="Cancel immediately vs at period end"
    )
    reason: Optional[str] = Field(
        None, max_length=500, description="Cancellation reason"
    )


class PlanLimits(BaseModel):
    """Plan limits and features"""

    plan: SubscriptionPlan
    price_monthly: float
    price_yearly: Optional[float]
    ai_credits_monthly: Optional[int]  # None = unlimited
    cover_letter_credits_monthly: Optional[int]
    auto_apply_credits_monthly: int
    job_suggestions_weekly: int
    resume_generation_unlimited: bool
    priority_support: bool
    features: List[str]


class BillingStats(BaseModel):
    """Billing statistics"""

    total_revenue: float
    monthly_recurring_revenue: float
    active_subscriptions: int
    churned_subscriptions: int
    trial_conversions: float
    by_plan: Dict[str, int]


class RefundRequest(BaseModel):
    """Request for refund"""

    transaction_id: str = Field(..., description="Transaction ID to refund")
    reason: str = Field(..., max_length=500, description="Refund reason")
    amount: Optional[int] = Field(
        None, description="Partial refund amount (None = full)"
    )


class PromoCodeValidation(BaseModel):
    """Promo code validation result"""

    valid: bool
    code: str
    discount_percent: Optional[int]
    discount_amount: Optional[float]
    duration: Optional[str]  # once, forever, repeating
    duration_in_months: Optional[int]
    restrictions: Optional[Dict[str, Any]]


class UsageReport(BaseModel):
    """Credit usage report"""

    user_id: str
    period_start: datetime
    period_end: datetime
    ai_generations: int
    cover_letters: int
    auto_applies: int
    total_credits_used: int
    total_cost: float
    by_operation: Dict[str, int]
