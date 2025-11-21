"""Billing and subscription endpoints"""

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
import uuid
from typing import List, Optional

from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.db.models.user import User
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
from app.schemas.usage_limits import (
    UsageLimitsResponse,
    UsageCheckRequest,
    UsageCheckResponse,
    ResourceUsageSchema,
    UpgradeRecommendationResponse,
)
from app.services.stripe_service import StripeService
from app.services.credit_service import CreditService
from app.services.usage_limit_service import UsageLimitService
from app.db.models.company import Company

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


# ============================================================================
# Usage Limits Endpoints (Issue #64)
# ============================================================================


@router.get("/usage-limits", response_model=UsageLimitsResponse)
def get_usage_limits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get current usage limits for employer account

    Returns usage statistics for:
    - Job postings (used/limit/remaining)
    - Candidate views (used/limit/remaining)
    - Team members (used/limit/remaining)

    **Response includes**:
    - Current plan tier
    - Usage percentage for each resource
    - Warning flags when approaching limits (80%)
    """
    # Get user's company
    company = db.query(Company).join(
        Company.members
    ).filter(
        Company.members.any(user_id=uuid.UUID(current_user.id))
    ).first()

    if not company:
        raise HTTPException(
            status_code=404,
            detail="No company found for this user. Please create a company profile first."
        )

    service = UsageLimitService(db)
    summary = service.get_usage_summary(company.id)

    # Calculate percentages
    def calc_percentage(used: int, limit: int, unlimited: bool) -> float:
        if unlimited or limit <= 0:
            return 0.0
        return round((used / limit) * 100, 2)

    return UsageLimitsResponse(
        plan=summary.plan,
        jobs=ResourceUsageSchema(
            used=summary.jobs.used,
            limit=summary.jobs.limit,
            remaining=summary.jobs.remaining,
            unlimited=summary.jobs.unlimited,
            percentage=calc_percentage(
                summary.jobs.used, summary.jobs.limit, summary.jobs.unlimited
            ),
        ),
        candidate_views=ResourceUsageSchema(
            used=summary.candidate_views.used,
            limit=summary.candidate_views.limit,
            remaining=summary.candidate_views.remaining,
            unlimited=summary.candidate_views.unlimited,
            percentage=calc_percentage(
                summary.candidate_views.used,
                summary.candidate_views.limit,
                summary.candidate_views.unlimited,
            ),
        ),
        team_members=ResourceUsageSchema(
            used=summary.team_members.used,
            limit=summary.team_members.limit,
            remaining=summary.team_members.remaining,
            unlimited=summary.team_members.unlimited,
            percentage=calc_percentage(
                summary.team_members.used,
                summary.team_members.limit,
                summary.team_members.unlimited,
            ),
        ),
    )


@router.post("/usage-limits/check", response_model=UsageCheckResponse)
def check_usage_limit(
    request: UsageCheckRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Check if action is allowed based on usage limits

    **Request body**:
    - resource: "jobs" | "candidate_views" | "team_members"

    **Response**:
    - allowed: Whether action can proceed
    - current_usage: Current count
    - limit: Maximum allowed
    - remaining: Available usage
    - warning: True if at 80% of limit
    - upgrade_required: True if at limit
    - message: User-friendly message with upgrade CTA

    **Use cases**:
    - Before posting a job: POST /usage-limits/check {resource: "jobs"}
    - Before viewing candidate: POST /usage-limits/check {resource: "candidate_views"}
    - Before inviting team member: POST /usage-limits/check {resource: "team_members"}
    """
    # Get user's company
    company = db.query(Company).join(
        Company.members
    ).filter(
        Company.members.any(user_id=uuid.UUID(current_user.id))
    ).first()

    if not company:
        raise HTTPException(status_code=404, detail="No company found")

    service = UsageLimitService(db)

    # Route to appropriate check method
    if request.resource == "jobs":
        result = service.check_job_posting_limit(company.id)
    elif request.resource == "candidate_views":
        result = service.check_candidate_view_limit(company.id)
    elif request.resource == "team_members":
        # Get current member count
        from app.db.models.company import CompanyMember
        current_members = db.query(CompanyMember).filter(
            CompanyMember.company_id == company.id,
            CompanyMember.status == "active"
        ).count()
        result = service.check_team_member_limit(company.id, current_members)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid resource type: {request.resource}. Must be one of: jobs, candidate_views, team_members"
        )

    return UsageCheckResponse(
        allowed=result.allowed,
        current_usage=result.current_usage,
        limit=result.limit,
        remaining=result.remaining,
        unlimited=result.unlimited,
        warning=result.warning,
        upgrade_required=result.upgrade_required,
        message=result.message,
    )


@router.get("/usage-limits/upgrade-recommendation", response_model=UpgradeRecommendationResponse)
def get_upgrade_recommendation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get personalized upgrade recommendation based on usage patterns

    **Returns**:
    - Recommended plan tier
    - Reason for recommendation
    - List of benefits
    - Price increase amount

    **Recommendation logic**:
    - If at limit on any resource → recommend next tier
    - If at 80%+ on 2+ resources → recommend next tier
    - Otherwise → no upgrade needed
    """
    company = db.query(Company).join(
        Company.members
    ).filter(
        Company.members.any(user_id=uuid.UUID(current_user.id))
    ).first()

    if not company:
        raise HTTPException(status_code=404, detail="No company found")

    service = UsageLimitService(db)
    summary = service.get_usage_summary(company.id)

    # Determine recommendation
    current_plan = summary.plan

    # Plan upgrade paths
    upgrade_paths = {
        "starter": {
            "next": "growth",
            "price": 99.0,
            "benefits": [
                "10 job postings/month (vs. 1)",
                "100 candidate views/month (vs. 10)",
                "3 team members (vs. 1)",
                "AI candidate ranking",
                "Basic ATS features",
            ]
        },
        "growth": {
            "next": "professional",
            "price": 200.0,  # 299 - 99
            "benefits": [
                "Unlimited job postings",
                "Unlimited candidate views",
                "10 team members (vs. 3)",
                "Full ATS features",
                "Mass posting tools",
                "Advanced analytics",
                "Priority support",
            ]
        },
        "professional": {
            "next": "enterprise",
            "price": None,  # Custom pricing
            "benefits": [
                "Unlimited everything",
                "API access",
                "White-label options",
                "Dedicated account manager",
                "Custom integrations",
                "SLA guarantees",
            ]
        }
    }

    # Check if upgrade needed
    at_limit = (
        (summary.jobs.used >= summary.jobs.limit and summary.jobs.limit > 0) or
        (summary.candidate_views.used >= summary.candidate_views.limit and summary.candidate_views.limit > 0)
    )

    approaching_limit_count = sum([
        1 if not summary.jobs.unlimited and summary.jobs.limit > 0 and (summary.jobs.used / summary.jobs.limit) >= 0.8 else 0,
        1 if not summary.candidate_views.unlimited and summary.candidate_views.limit > 0 and (summary.candidate_views.used / summary.candidate_views.limit) >= 0.8 else 0,
    ])

    if at_limit or approaching_limit_count >= 2:
        upgrade_info = upgrade_paths.get(current_plan)
        if not upgrade_info:
            raise HTTPException(
                status_code=200,
                detail="You're on the highest plan. Contact sales for enterprise features."
            )

        reason = "You're at your limit" if at_limit else "You're approaching multiple limits"

        return UpgradeRecommendationResponse(
            recommended_plan=upgrade_info["next"],
            current_plan=current_plan,
            reason=reason,
            benefits=upgrade_info["benefits"],
            price_increase=upgrade_info["price"] or 0.0,
        )

    # No upgrade needed
    raise HTTPException(
        status_code=200,
        detail="No upgrade recommended at this time. You have sufficient limits for your usage."
    )
