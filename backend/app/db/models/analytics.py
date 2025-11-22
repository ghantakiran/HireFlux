"""Analytics Database Models

Models for Sprint 15-16: Advanced Analytics & Reporting
"""

from datetime import datetime, date
from decimal import Decimal
from typing import Optional, Dict, Any
from uuid import UUID, uuid4

from sqlalchemy import Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric, String, Text, Index, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.base import Base
from app.db.types import GUID


class AnalyticsSnapshot(Base):
    """
    Cached analytics snapshots for performance.

    Stores pre-aggregated metrics to avoid expensive real-time calculations.
    Generated daily by background jobs.
    """

    __tablename__ = "analytics_snapshots"

    id = Column(GUID(), primary_key=True, default=uuid4)
    company_id = Column(GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True)
    snapshot_date = Column(Date, nullable=False)
    metric_type = Column(String(50), nullable=False)  # 'sourcing', 'pipeline', 'time', 'quality', 'cost'

    # Aggregated metrics (flexible JSON structure, JSONB for PostgreSQL)
    metrics = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)

    # Metadata
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    # Relationships
    company = relationship("Company", back_populates="analytics_snapshots")

    # Indexes
    __table_args__ = (
        Index('idx_analytics_snapshots_unique', 'company_id', 'snapshot_date', 'metric_type', unique=True),
        Index('idx_analytics_snapshots_company_date', 'company_id', 'snapshot_date'),
        Index('idx_analytics_snapshots_metric_type', 'metric_type'),
    )

    def __repr__(self) -> str:
        return f"<AnalyticsSnapshot(company_id={self.company_id}, date={self.snapshot_date}, type={self.metric_type})>"


class ApplicationStageHistory(Base):
    """
    Audit trail for application stage transitions.

    Tracks every status change to calculate time-in-stage and time-to-hire metrics.
    """

    __tablename__ = "application_stage_history"

    id = Column(GUID(), primary_key=True, default=uuid4)
    application_id = Column(GUID(), ForeignKey("applications.id", ondelete="CASCADE"), nullable=False, index=True)

    # Stage transition
    from_stage = Column(String(50), nullable=True)  # NULL for initial stage
    to_stage = Column(String(50), nullable=False)
    changed_by = Column(GUID(), ForeignKey("company_members.id", ondelete="SET NULL"), nullable=True)

    # Timestamps
    changed_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)

    # Metadata
    notes = Column(Text, nullable=True)
    automated = Column(Boolean, default=False)  # True if system-triggered (e.g., auto-reject)

    # Relationships
    application = relationship("Application", back_populates="stage_history")
    changed_by_member = relationship("CompanyMember")

    # Indexes
    __table_args__ = (
        Index('idx_stage_history_application', 'application_id'),
        Index('idx_stage_history_changed_at', 'changed_at'),
    )

    def __repr__(self) -> str:
        return f"<ApplicationStageHistory(app_id={self.application_id}, {self.from_stage} → {self.to_stage})>"


class CompanyAnalyticsConfig(Base):
    """
    Analytics configuration and benchmarks for a company.

    Stores target metrics and snapshot generation settings.
    """

    __tablename__ = "company_analytics_config"

    id = Column(GUID(), primary_key=True, default=uuid4)
    company_id = Column(GUID(), ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    # Benchmark targets
    target_time_to_hire_days = Column(Integer, default=30)
    target_cost_per_hire_usd = Column(Numeric(10, 2), nullable=True)

    # Snapshot schedule
    snapshot_frequency = Column(String(20), default='daily')  # 'hourly', 'daily', 'weekly'

    # Metadata
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    company = relationship("Company", back_populates="analytics_config", uselist=False)

    # Indexes
    __table_args__ = (
        Index('idx_company_analytics_config_company_id', 'company_id', unique=True),
    )

    def __repr__(self) -> str:
        return f"<CompanyAnalyticsConfig(company_id={self.company_id}, target_hire_days={self.target_time_to_hire_days})>"
