"""Usage Limit Enforcement Service

Implements subscription plan limits for Issue #64
Prevents revenue loss from free tier abuse
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.db.models.company import Company, CompanySubscription


class UsageLimitError(Exception):
    """Raised when usage limit is exceeded"""
    pass


@dataclass
class UsageCheckResult:
    """Result of a usage limit check"""
    allowed: bool
    current_usage: int
    limit: int
    remaining: int = 0
    unlimited: bool = False
    warning: bool = False
    upgrade_required: bool = False
    message: str = ""

    def __post_init__(self):
        if not self.unlimited:
            self.remaining = max(0, self.limit - self.current_usage)


@dataclass
class ResourceUsage:
    """Usage details for a specific resource"""
    used: int
    limit: int
    remaining: int
    unlimited: bool = False


@dataclass
class UsageSummary:
    """Complete usage summary for a company"""
    plan: str
    jobs: ResourceUsage
    candidate_views: ResourceUsage
    team_members: ResourceUsage


class UsageLimitService:
    """Service for enforcing subscription plan limits"""

    # Plan limits configuration
    PLAN_LIMITS = {
        "starter": {
            "jobs": 1,
            "candidate_views": 10,
            "team_members": 1,
        },
        "growth": {
            "jobs": 10,
            "candidate_views": 100,
            "team_members": 3,
        },
        "professional": {
            "jobs": -1,  # -1 = unlimited
            "candidate_views": -1,
            "team_members": 10,
        },
        "enterprise": {
            "jobs": -1,
            "candidate_views": -1,
            "team_members": -1,
        },
    }

    WARNING_THRESHOLD = 0.8  # Warn at 80% usage

    def __init__(self, db: Session):
        self.db = db

    def _get_company_and_subscription(
        self, company_id: UUID
    ) -> tuple[Company, CompanySubscription]:
        """Get company and subscription, raise if not found"""
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise ValueError(f"Company {company_id} not found")

        subscription = (
            self.db.query(CompanySubscription)
            .filter(CompanySubscription.company_id == company_id)
            .first()
        )
        if not subscription:
            raise ValueError(f"No subscription found for company {company_id}")

        return company, subscription

    def _is_subscription_active(self, subscription: CompanySubscription) -> bool:
        """Check if subscription is active"""
        return subscription.status in ["active", "trialing"]

    def _is_unlimited(self, limit: int) -> bool:
        """Check if limit is unlimited (-1)"""
        return limit == -1

    def check_job_posting_limit(self, company_id: UUID) -> UsageCheckResult:
        """Check if company can post a job"""
        company, subscription = self._get_company_and_subscription(company_id)

        # Check subscription status
        if not self._is_subscription_active(subscription):
            return UsageCheckResult(
                allowed=False,
                current_usage=subscription.jobs_posted_this_month,
                limit=company.max_active_jobs,
                upgrade_required=True,
                message="Your subscription is not active. Please update your billing information.",
            )

        # Check if unlimited
        if self._is_unlimited(company.max_active_jobs):
            return UsageCheckResult(
                allowed=True,
                current_usage=subscription.jobs_posted_this_month,
                limit=company.max_active_jobs,
                unlimited=True,
                message="Unlimited job postings with your Professional plan.",
            )

        # Check limit
        current_usage = subscription.jobs_posted_this_month
        limit = company.max_active_jobs
        remaining = limit - current_usage

        if remaining <= 0:
            return UsageCheckResult(
                allowed=False,
                current_usage=current_usage,
                limit=limit,
                upgrade_required=True,
                message=f"You've reached your job posting limit ({limit} jobs/month). Upgrade to Growth plan for 10 jobs/month.",
            )

        # Warning at 80% usage
        warning = (current_usage / limit) >= self.WARNING_THRESHOLD
        message = ""
        if warning:
            message = f"You're approaching your job posting limit ({current_usage}/{limit} used). Consider upgrading to post more jobs."

        return UsageCheckResult(
            allowed=True,
            current_usage=current_usage,
            limit=limit,
            warning=warning,
            message=message,
        )

    def check_candidate_view_limit(self, company_id: UUID) -> UsageCheckResult:
        """Check if company can view a candidate profile"""
        company, subscription = self._get_company_and_subscription(company_id)

        # Check subscription status
        if not self._is_subscription_active(subscription):
            return UsageCheckResult(
                allowed=False,
                current_usage=subscription.candidate_views_this_month,
                limit=company.max_candidate_views,
                upgrade_required=True,
                message="Your subscription is not active.",
            )

        # Check if unlimited
        if self._is_unlimited(company.max_candidate_views):
            return UsageCheckResult(
                allowed=True,
                current_usage=subscription.candidate_views_this_month,
                limit=company.max_candidate_views,
                unlimited=True,
                message="Unlimited candidate views with your Professional plan.",
            )

        # Check limit
        current_usage = subscription.candidate_views_this_month
        limit = company.max_candidate_views
        remaining = limit - current_usage

        if remaining <= 0:
            return UsageCheckResult(
                allowed=False,
                current_usage=current_usage,
                limit=limit,
                upgrade_required=True,
                message=f"You've reached your candidate view limit ({limit} views/month). Upgrade to Growth plan for 100 views/month.",
            )

        # Warning at 80% usage
        warning = (current_usage / limit) >= self.WARNING_THRESHOLD
        message = ""
        if warning:
            message = f"You're approaching your candidate view limit ({current_usage}/{limit} used)."

        return UsageCheckResult(
            allowed=True,
            current_usage=current_usage,
            limit=limit,
            warning=warning,
            message=message,
        )

    def check_team_member_limit(
        self, company_id: UUID, current_members: int
    ) -> UsageCheckResult:
        """Check if company can add a team member"""
        company, subscription = self._get_company_and_subscription(company_id)

        if not self._is_subscription_active(subscription):
            return UsageCheckResult(
                allowed=False,
                current_usage=current_members,
                limit=company.max_team_members,
                upgrade_required=True,
                message="Your subscription is not active.",
            )

        # Check if unlimited
        if self._is_unlimited(company.max_team_members):
            return UsageCheckResult(
                allowed=True,
                current_usage=current_members,
                limit=company.max_team_members,
                unlimited=True,
            )

        limit = company.max_team_members
        remaining = limit - current_members

        if remaining <= 0:
            return UsageCheckResult(
                allowed=False,
                current_usage=current_members,
                limit=limit,
                upgrade_required=True,
                message=f"You've reached your team member limit ({limit} members). Upgrade to add more team members.",
            )

        return UsageCheckResult(
            allowed=True,
            current_usage=current_members,
            limit=limit,
        )

    def increment_job_posting(self, company_id: UUID) -> None:
        """Increment job posting counter after successful post"""
        _, subscription = self._get_company_and_subscription(company_id)
        subscription.jobs_posted_this_month += 1
        self.db.commit()

    def increment_candidate_view(self, company_id: UUID) -> None:
        """Increment candidate view counter after successful view"""
        _, subscription = self._get_company_and_subscription(company_id)
        subscription.candidate_views_this_month += 1
        self.db.commit()

    def check_and_increment_job_posting(self, company_id: UUID) -> UsageCheckResult:
        """Atomic check and increment for job posting"""
        result = self.check_job_posting_limit(company_id)
        if result.allowed and not result.unlimited:
            self.increment_job_posting(company_id)
        return result

    def check_and_increment_candidate_view(self, company_id: UUID) -> UsageCheckResult:
        """Atomic check and increment for candidate view"""
        result = self.check_candidate_view_limit(company_id)
        if result.allowed and not result.unlimited:
            self.increment_candidate_view(company_id)
        return result

    def reset_usage_if_new_period(self, company_id: UUID) -> bool:
        """Reset usage counters if we're in a new billing period"""
        _, subscription = self._get_company_and_subscription(company_id)

        # Check if period has ended
        if subscription.current_period_end and subscription.current_period_end < datetime.utcnow():
            # Reset counters
            subscription.jobs_posted_this_month = 0
            subscription.candidate_views_this_month = 0

            # Update period (assume monthly billing)
            from dateutil.relativedelta import relativedelta
            subscription.current_period_start = subscription.current_period_end
            subscription.current_period_end = subscription.current_period_end + relativedelta(months=1)

            self.db.commit()
            return True

        return False

    def get_usage_summary(self, company_id: UUID) -> UsageSummary:
        """Get complete usage summary for a company"""
        company, subscription = self._get_company_and_subscription(company_id)

        # Get current team member count
        from app.db.models.company import CompanyMember
        team_member_count = (
            self.db.query(CompanyMember)
            .filter(CompanyMember.company_id == company_id)
            .filter(CompanyMember.status == "active")
            .count()
        )

        return UsageSummary(
            plan=company.subscription_tier,
            jobs=ResourceUsage(
                used=subscription.jobs_posted_this_month,
                limit=company.max_active_jobs,
                remaining=max(0, company.max_active_jobs - subscription.jobs_posted_this_month)
                if company.max_active_jobs > 0
                else 0,
                unlimited=self._is_unlimited(company.max_active_jobs),
            ),
            candidate_views=ResourceUsage(
                used=subscription.candidate_views_this_month,
                limit=company.max_candidate_views,
                remaining=max(
                    0, company.max_candidate_views - subscription.candidate_views_this_month
                )
                if company.max_candidate_views > 0
                else 0,
                unlimited=self._is_unlimited(company.max_candidate_views),
            ),
            team_members=ResourceUsage(
                used=team_member_count,
                limit=company.max_team_members,
                remaining=max(0, company.max_team_members - team_member_count)
                if company.max_team_members > 0
                else 0,
                unlimited=self._is_unlimited(company.max_team_members),
            ),
        )
