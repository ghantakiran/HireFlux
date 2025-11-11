"""Employer Analytics Schemas

Sprint 15-16: Advanced Analytics & Reporting
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================================================
# ENUMS
# ============================================================================

class ApplicationSource(str, Enum):
    """Application sources for sourcing metrics"""
    AUTO_APPLY = "auto_apply"
    MANUAL = "manual"
    REFERRAL = "referral"
    JOB_BOARD = "job_board"
    CAREER_SITE = "career_site"


class ApplicationStage(str, Enum):
    """Application pipeline stages"""
    NEW = "new"
    REVIEWING = "reviewing"
    PHONE_SCREEN = "phone_screen"
    TECHNICAL_INTERVIEW = "technical_interview"
    FINAL_INTERVIEW = "final_interview"
    OFFER = "offer"
    HIRED = "hired"
    REJECTED = "rejected"


class MetricType(str, Enum):
    """Analytics metric types for snapshots"""
    SOURCING = "sourcing"
    PIPELINE = "pipeline"
    TIME = "time"
    QUALITY = "quality"
    COST = "cost"


# ============================================================================
# SOURCING METRICS
# ============================================================================

class SourcingMetric(BaseModel):
    """Metrics for a single application source"""
    source: ApplicationSource
    count: int = Field(..., ge=0, description="Total applications from this source")
    avg_fit_index: Optional[float] = Field(None, ge=0, le=100, description="Average Fit Index (0-100)")
    hires: int = Field(0, ge=0, description="Successful hires from this source")
    conversion_rate: float = Field(..., ge=0, le=1, description="Hire rate (hires/count)")

    class Config:
        json_schema_extra = {
            "example": {
                "source": "auto_apply",
                "count": 150,
                "avg_fit_index": 78.5,
                "hires": 12,
                "conversion_rate": 0.08
            }
        }


class SourcingMetricsResponse(BaseModel):
    """Response for sourcing analytics"""
    company_id: UUID
    start_date: date
    end_date: date
    sources: List[SourcingMetric]
    total_applications: int
    total_hires: int


# ============================================================================
# PIPELINE METRICS
# ============================================================================

class PipelineStage(BaseModel):
    """Single stage in hiring pipeline"""
    stage: ApplicationStage
    count: int = Field(..., ge=0, description="Applications in this stage")
    avg_days_in_stage: Optional[float] = Field(None, ge=0, description="Average days spent in this stage")
    drop_off_rate: Optional[float] = Field(None, ge=0, le=1, description="% that dropped off from this stage")


class PipelineFunnelResponse(BaseModel):
    """Pipeline funnel visualization data"""
    company_id: UUID
    job_id: Optional[UUID] = None
    stages: List[PipelineStage]
    overall_conversion_rate: float = Field(..., ge=0, le=1, description="Overall hire rate")

    class Config:
        json_schema_extra = {
            "example": {
                "company_id": "550e8400-e29b-41d4-a716-446655440000",
                "job_id": None,
                "stages": [
                    {"stage": "new", "count": 100, "avg_days_in_stage": 2.5, "drop_off_rate": 0.4},
                    {"stage": "reviewing", "count": 60, "avg_days_in_stage": 5.0, "drop_off_rate": 0.5},
                    {"stage": "phone_screen", "count": 30, "avg_days_in_stage": 7.0, "drop_off_rate": 0.33},
                    {"stage": "hired", "count": 10, "avg_days_in_stage": None, "drop_off_rate": None}
                ],
                "overall_conversion_rate": 0.10
            }
        }


# ============================================================================
# TIME METRICS
# ============================================================================

class TimeMetricsResponse(BaseModel):
    """Time-to-hire and related metrics"""
    company_id: UUID
    start_date: date
    end_date: date
    avg_time_to_first_application: Optional[float] = Field(None, ge=0, description="Days from job post to first app")
    avg_time_to_shortlist: Optional[float] = Field(None, ge=0, description="Days from app to phone_screen")
    avg_time_to_offer: Optional[float] = Field(None, ge=0, description="Days from app to offer")
    avg_time_to_hire: Optional[float] = Field(None, ge=0, description="Days from app to hired")
    target_time_to_hire: int = Field(30, ge=0, description="Company's target days")
    performance_vs_target: Optional[float] = Field(None, description="% difference from target (negative is better)")

    class Config:
        json_schema_extra = {
            "example": {
                "company_id": "550e8400-e29b-41d4-a716-446655440000",
                "start_date": "2025-01-01",
                "end_date": "2025-03-31",
                "avg_time_to_first_application": 3.5,
                "avg_time_to_shortlist": 7.2,
                "avg_time_to_offer": 25.0,
                "avg_time_to_hire": 28.5,
                "target_time_to_hire": 30,
                "performance_vs_target": -5.0
            }
        }


# ============================================================================
# QUALITY METRICS
# ============================================================================

class QualityMetricsResponse(BaseModel):
    """Quality of hire metrics"""
    company_id: UUID
    avg_fit_index: Optional[float] = Field(None, ge=0, le=100, description="Average Fit Index across all applications")
    interview_show_up_rate: float = Field(..., ge=0, le=1, description="% of scheduled interviews attended")
    offer_acceptance_rate: float = Field(..., ge=0, le=1, description="% of offers accepted")
    six_month_retention_rate: Optional[float] = Field(None, ge=0, le=1, description="% still employed after 6 months")
    twelve_month_retention_rate: Optional[float] = Field(None, ge=0, le=1, description="% still employed after 12 months")

    class Config:
        json_schema_extra = {
            "example": {
                "company_id": "550e8400-e29b-41d4-a716-446655440000",
                "avg_fit_index": 78.5,
                "interview_show_up_rate": 0.92,
                "offer_acceptance_rate": 0.85,
                "six_month_retention_rate": 0.88,
                "twelve_month_retention_rate": 0.75
            }
        }


# ============================================================================
# COST METRICS
# ============================================================================

class CostMetricsResponse(BaseModel):
    """Cost per application and cost per hire"""
    company_id: UUID
    start_date: date
    end_date: date
    total_subscription_cost: Decimal = Field(..., ge=0, description="Total subscription cost for period")
    total_applications: int = Field(..., ge=0)
    total_hires: int = Field(..., ge=0)
    cost_per_application: Optional[Decimal] = Field(None, ge=0, description="Total cost / applications")
    cost_per_hire: Optional[Decimal] = Field(None, ge=0, description="Total cost / hires")
    roi: Optional[Decimal] = Field(None, description="Return on investment ratio")

    class Config:
        json_schema_extra = {
            "example": {
                "company_id": "550e8400-e29b-41d4-a716-446655440000",
                "start_date": "2025-01-01",
                "end_date": "2025-01-31",
                "total_subscription_cost": "99.00",
                "total_applications": 100,
                "total_hires": 5,
                "cost_per_application": "0.99",
                "cost_per_hire": "19.80",
                "roi": "25.25"
            }
        }


# ============================================================================
# OVERVIEW ANALYTICS
# ============================================================================

class AnalyticsOverviewResponse(BaseModel):
    """Comprehensive analytics overview"""
    company_id: UUID
    start_date: date
    end_date: date
    
    # Summary metrics
    total_applications: int
    total_hires: int
    avg_time_to_hire: Optional[float]
    avg_cost_per_hire: Optional[Decimal]
    avg_fit_index: Optional[float]
    
    # Top performers
    top_performing_jobs: List[Dict[str, Any]] = Field(default_factory=list, description="Jobs with highest conversion rates")
    
    # Pipeline conversion
    pipeline_conversion: Dict[str, float] = Field(default_factory=dict, description="Conversion rates between stages")

    class Config:
        json_schema_extra = {
            "example": {
                "company_id": "550e8400-e29b-41d4-a716-446655440000",
                "start_date": "2025-01-01",
                "end_date": "2025-03-31",
                "total_applications": 250,
                "total_hires": 15,
                "avg_time_to_hire": 28.5,
                "avg_cost_per_hire": "66.00",
                "avg_fit_index": 78.5,
                "top_performing_jobs": [
                    {"job_id": "...", "title": "Senior Developer", "conversion_rate": 0.12}
                ],
                "pipeline_conversion": {
                    "new_to_reviewing": 0.75,
                    "reviewing_to_phone_screen": 0.50,
                    "phone_screen_to_hired": 0.20
                }
            }
        }


# ============================================================================
# ANALYTICS CONFIG
# ============================================================================

class AnalyticsConfigCreate(BaseModel):
    """Create analytics configuration"""
    target_time_to_hire_days: int = Field(30, ge=1, le=365)
    target_cost_per_hire_usd: Optional[Decimal] = Field(None, ge=0)
    snapshot_frequency: str = Field("daily", pattern="^(hourly|daily|weekly)$")


class AnalyticsConfigResponse(BaseModel):
    """Analytics configuration response"""
    id: UUID
    company_id: UUID
    target_time_to_hire_days: int
    target_cost_per_hire_usd: Optional[Decimal]
    snapshot_frequency: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
