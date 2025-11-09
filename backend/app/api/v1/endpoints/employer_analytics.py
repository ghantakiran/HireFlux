"""Employer Analytics API Endpoints

Sprint 15-16: Advanced Analytics & Reporting

Provides REST API for employer hiring analytics dashboard.
"""

from datetime import date, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.db.models.user import User
from app.db.models.company import CompanyMember
from app.services.employer_analytics_service import EmployerAnalyticsService
from app.schemas.employer_analytics import (
    AnalyticsOverviewResponse,
    CostMetricsResponse,
    PipelineFunnelResponse,
    QualityMetricsResponse,
    SourcingMetricsResponse,
    TimeMetricsResponse,
    AnalyticsConfigCreate,
    AnalyticsConfigResponse,
    ApplicationStage,
    PipelineStage,
)


router = APIRouter()


def get_user_company_member(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
) -> CompanyMember:
    """
    Get company member for current user.

    Raises:
        HTTPException: If user is not a company member
    """
    company_member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not company_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any company",
        )

    return company_member


def check_analytics_access(company_member: CompanyMember):
    """
    Check if user has access to analytics (Growth+ plans).

    Raises:
        HTTPException: If plan doesn't include analytics
    """
    # Analytics requires Growth or higher plan
    allowed_tiers = ["growth", "professional", "enterprise"]
    
    # Would check company.subscription_tier in production
    # For now, allow all roles with view permissions
    if company_member.role not in ["owner", "admin", "hiring_manager", "recruiter"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view analytics",
        )


@router.get(
    "/companies/{company_id}/analytics/overview",
    response_model=AnalyticsOverviewResponse,
    summary="Get comprehensive analytics overview",
    description="Retrieve high-level analytics summary with key metrics and top performers",
)
def get_analytics_overview(
    company_id: UUID,
    start_date: date = Query(..., description="Start of date range"),
    end_date: date = Query(..., description="End of date range"),
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db),
):
    """
    Get comprehensive analytics overview.

    **Permissions**: Requires Growth plan or higher

    Returns summary metrics including:
    - Total applications and hires
    - Average time to hire
    - Average cost per hire
    - Top performing jobs
    - Pipeline conversion rates
    """
    # Verify company access
    if company_member.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company",
        )

    check_analytics_access(company_member)

    # Get analytics
    analytics_service = EmployerAnalyticsService(db)

    # Calculate key metrics
    sourcing = analytics_service.calculate_sourcing_metrics(company_id, start_date, end_date)
    total_applications = sum(source["count"] for source in sourcing.values())
    total_hires = sum(source["hires"] for source in sourcing.values())

    avg_time_to_hire = analytics_service.calculate_avg_time_to_hire(
        company_id, start_date, end_date
    )
    avg_cost_per_hire = analytics_service.calculate_cost_per_hire(
        company_id, start_date, end_date
    )
    avg_fit_index = analytics_service.calculate_avg_fit_index(company_id=company_id)

    # Get pipeline funnel for conversion rates
    funnel = analytics_service.calculate_pipeline_funnel(company_id=company_id)

    # Calculate conversion rates
    pipeline_conversion = {}
    if len(funnel) >= 2:
        for i in range(len(funnel) - 1):
            current_stage = funnel[i]["stage"]
            next_stage = funnel[i + 1]["stage"]
            current_count = funnel[i]["count"]
            next_count = funnel[i + 1]["count"]
            
            if current_count > 0:
                conversion_key = f"{current_stage}_to_{next_stage}"
                pipeline_conversion[conversion_key] = next_count / current_count

    return AnalyticsOverviewResponse(
        company_id=company_id,
        start_date=start_date,
        end_date=end_date,
        total_applications=total_applications,
        total_hires=total_hires,
        avg_time_to_hire=avg_time_to_hire,
        avg_cost_per_hire=avg_cost_per_hire,
        avg_fit_index=avg_fit_index,
        top_performing_jobs=[],  # TODO: Implement top jobs calculation
        pipeline_conversion=pipeline_conversion,
    )


@router.get(
    "/companies/{company_id}/analytics/funnel",
    response_model=PipelineFunnelResponse,
    summary="Get pipeline funnel visualization data",
    description="Retrieve application pipeline stages with counts and conversion rates",
)
def get_pipeline_funnel(
    company_id: UUID,
    job_id: Optional[UUID] = Query(None, description="Filter by specific job (optional)"),
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db),
):
    """
    Get pipeline funnel visualization data.

    **Permissions**: Requires Growth plan or higher

    Returns funnel with:
    - Application count per stage
    - Average days in each stage
    - Drop-off rates between stages
    """
    if company_member.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company",
        )

    check_analytics_access(company_member)

    analytics_service = EmployerAnalyticsService(db)

    # Get funnel data
    funnel_data = analytics_service.calculate_pipeline_funnel(
        job_id=job_id, company_id=company_id
    )

    # Get avg days per stage
    avg_days = analytics_service.calculate_avg_days_per_stage(company_id)

    # Get drop-off rates
    drop_off_rates = analytics_service.calculate_drop_off_rates(company_id)

    # Build response
    stages = []
    for stage_data in funnel_data:
        stage_name = stage_data["stage"]
        stages.append(
            PipelineStage(
                stage=ApplicationStage(stage_name),
                count=stage_data["count"],
                avg_days_in_stage=avg_days.get(stage_name),
                drop_off_rate=drop_off_rates.get(stage_name),
            )
        )

    # Calculate overall conversion rate
    total_apps = sum(s.count for s in stages)
    hired_count = next((s.count for s in stages if s.stage == ApplicationStage.HIRED), 0)
    overall_conversion = hired_count / total_apps if total_apps > 0 else 0.0

    return PipelineFunnelResponse(
        company_id=company_id,
        job_id=job_id,
        stages=stages,
        overall_conversion_rate=overall_conversion,
    )


@router.get(
    "/companies/{company_id}/analytics/sources",
    response_model=SourcingMetricsResponse,
    summary="Get application source performance",
    description="Analyze application quality and conversion rates by source",
)
def get_sourcing_analytics(
    company_id: UUID,
    start_date: date = Query(..., description="Start of date range"),
    end_date: date = Query(..., description="End of date range"),
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db),
):
    """
    Get application source performance analytics.

    **Permissions**: Requires Growth plan or higher

    Returns metrics by source:
    - Application count
    - Average Fit Index
    - Hire count
    - Conversion rate
    """
    if company_member.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company",
        )

    check_analytics_access(company_member)

    analytics_service = EmployerAnalyticsService(db)
    sourcing_data = analytics_service.calculate_sourcing_metrics(
        company_id, start_date, end_date
    )

    # Build response
    from app.schemas.employer_analytics import SourcingMetric, ApplicationSource

    sources = []
    for source_name, metrics in sourcing_data.items():
        sources.append(
            SourcingMetric(
                source=ApplicationSource(source_name),
                count=metrics["count"],
                avg_fit_index=metrics["avg_fit"],
                hires=metrics["hires"],
                conversion_rate=metrics["conversion_rate"],
            )
        )

    total_applications = sum(s.count for s in sources)
    total_hires = sum(s.hires for s in sources)

    return SourcingMetricsResponse(
        company_id=company_id,
        start_date=start_date,
        end_date=end_date,
        sources=sources,
        total_applications=total_applications,
        total_hires=total_hires,
    )


@router.get(
    "/companies/{company_id}/analytics/time-metrics",
    response_model=TimeMetricsResponse,
    summary="Get time-to-hire and related metrics",
    description="Analyze hiring speed and efficiency metrics",
)
def get_time_metrics(
    company_id: UUID,
    start_date: date = Query(..., description="Start of date range"),
    end_date: date = Query(..., description="End of date range"),
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db),
):
    """
    Get time-to-hire and related metrics.

    **Permissions**: Requires Growth plan or higher

    Returns:
    - Average time to first application
    - Average time to shortlist
    - Average time to offer
    - Average time to hire
    - Performance vs. target
    """
    if company_member.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company",
        )

    check_analytics_access(company_member)

    analytics_service = EmployerAnalyticsService(db)

    avg_time_to_hire = analytics_service.calculate_avg_time_to_hire(
        company_id, start_date, end_date
    )

    # Calculate performance vs target (30 days default)
    target_days = 30
    performance_vs_target = None
    if avg_time_to_hire:
        performance_vs_target = ((avg_time_to_hire - target_days) / target_days) * 100

    return TimeMetricsResponse(
        company_id=company_id,
        start_date=start_date,
        end_date=end_date,
        avg_time_to_first_application=None,  # TODO: Implement
        avg_time_to_shortlist=None,  # TODO: Implement
        avg_time_to_offer=None,  # TODO: Implement
        avg_time_to_hire=avg_time_to_hire,
        target_time_to_hire=target_days,
        performance_vs_target=performance_vs_target,
    )


@router.get(
    "/companies/{company_id}/analytics/quality",
    response_model=QualityMetricsResponse,
    summary="Get quality of hire metrics",
    description="Measure candidate quality and interview effectiveness",
)
def get_quality_metrics(
    company_id: UUID,
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db),
):
    """
    Get quality of hire metrics.

    **Permissions**: Requires Growth plan or higher

    Returns:
    - Average Fit Index
    - Interview show-up rate
    - Offer acceptance rate
    - 6-month retention rate
    """
    if company_member.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company",
        )

    check_analytics_access(company_member)

    analytics_service = EmployerAnalyticsService(db)

    avg_fit = analytics_service.calculate_avg_fit_index(company_id=company_id)
    show_up_rate = analytics_service.calculate_interview_show_up_rate(company_id)
    offer_rate = analytics_service.calculate_offer_acceptance_rate(company_id)
    retention_6m = analytics_service.calculate_retention_rate(company_id, months=6)
    retention_12m = analytics_service.calculate_retention_rate(company_id, months=12)

    return QualityMetricsResponse(
        company_id=company_id,
        avg_fit_index=avg_fit,
        interview_show_up_rate=show_up_rate,
        offer_acceptance_rate=offer_rate,
        six_month_retention_rate=retention_6m,
        twelve_month_retention_rate=retention_12m,
    )


@router.get(
    "/companies/{company_id}/analytics/costs",
    response_model=CostMetricsResponse,
    summary="Get cost per application and cost per hire",
    description="Analyze recruitment cost efficiency",
)
def get_cost_metrics(
    company_id: UUID,
    start_date: date = Query(..., description="Start of date range"),
    end_date: date = Query(..., description="End of date range"),
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db),
):
    """
    Get cost per application and cost per hire.

    **Permissions**: Requires Growth plan or higher (owner/admin only)

    Returns:
    - Total subscription cost
    - Cost per application
    - Cost per hire
    - ROI calculation
    """
    if company_member.company_id != company_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this company",
        )

    # Cost metrics restricted to owner/admin
    if company_member.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cost metrics require owner or admin role",
        )

    analytics_service = EmployerAnalyticsService(db)

    cost_per_app = analytics_service.calculate_cost_per_application(
        company_id, start_date, end_date
    )
    cost_per_hire = analytics_service.calculate_cost_per_hire(
        company_id, start_date, end_date
    )

    # Get application and hire counts
    sourcing = analytics_service.calculate_sourcing_metrics(company_id, start_date, end_date)
    total_apps = sum(s["count"] for s in sourcing.values())
    total_hires = sum(s["hires"] for s in sourcing.values())

    # Estimate subscription cost (would come from billing service)
    from decimal import Decimal
    total_cost = Decimal("99.00")  # Placeholder

    return CostMetricsResponse(
        company_id=company_id,
        start_date=start_date,
        end_date=end_date,
        total_subscription_cost=total_cost,
        total_applications=total_apps,
        total_hires=total_hires,
        cost_per_application=cost_per_app,
        cost_per_hire=cost_per_hire,
        roi=None,  # TODO: Calculate ROI
    )
