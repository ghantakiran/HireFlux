"""sprint_15_16_advanced_analytics_and_reporting

Revision ID: g7h8i9j0k1l2
Revises: f6g7h8i9j0k1
Create Date: 2025-11-07 09:00:00.000000

Sprint 15-16: Advanced Analytics & Reporting

This migration adds:
1. Analytics snapshots for caching aggregated metrics
2. Application stage history for time-to-hire tracking
3. Company analytics configuration for benchmarks
4. Source tracking and cost attribution for applications
5. Interview attendance tracking
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func
from app.db.types import GUID


# revision identifiers, used by Alembic.
revision = 'g7h8i9j0k1l2'
down_revision = 'f6g7h8i9j0k1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Upgrade to Sprint 15-16 schema.

    Advanced Analytics & Reporting:
    - analytics_snapshots: Cached materialized views for performance
    - application_stage_history: Audit trail for pipeline transitions
    - company_analytics_config: Analytics settings and benchmarks
    - Enhanced applications: Source tracking and cost attribution
    - Enhanced interview_schedules: Attendance tracking
    """

    # ========================================================================
    # PART 1: Create analytics_snapshots table
    # ========================================================================

    op.create_table(
        'analytics_snapshots',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('company_id', GUID(), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('snapshot_date', sa.Date(), nullable=False),
        sa.Column('metric_type', sa.String(50), nullable=False),  # 'sourcing', 'pipeline', 'time', 'quality', 'cost'

        # Aggregated metrics (JSONB for flexibility)
        sa.Column('metrics', JSONB, nullable=False),

        # Metadata
        sa.Column('created_at', sa.DateTime(), server_default=func.now(), nullable=False),
    )

    # Unique constraint: one snapshot per company/date/type
    op.create_index(
        'idx_analytics_snapshots_unique',
        'analytics_snapshots',
        ['company_id', 'snapshot_date', 'metric_type'],
        unique=True
    )

    # Indexes for analytics_snapshots
    op.create_index('idx_analytics_snapshots_company_date', 'analytics_snapshots', ['company_id', 'snapshot_date'])
    op.create_index('idx_analytics_snapshots_metric_type', 'analytics_snapshots', ['metric_type'])

    # ========================================================================
    # PART 2: Create application_stage_history table
    # ========================================================================

    op.create_table(
        'application_stage_history',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('application_id', GUID(), sa.ForeignKey('applications.id', ondelete='CASCADE'), nullable=False),

        # Stage transition
        sa.Column('from_stage', sa.String(50), nullable=True),  # NULL for initial stage
        sa.Column('to_stage', sa.String(50), nullable=False),
        sa.Column('changed_by', GUID(), sa.ForeignKey('company_members.id', ondelete='SET NULL'), nullable=True),

        # Timestamps
        sa.Column('changed_at', sa.DateTime(), server_default=func.now(), nullable=False),

        # Metadata
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('automated', sa.Boolean(), server_default='false'),  # True if system-triggered
    )

    # Indexes for application_stage_history
    op.create_index('idx_stage_history_application', 'application_stage_history', ['application_id'])
    op.create_index('idx_stage_history_changed_at', 'application_stage_history', ['changed_at'])

    # ========================================================================
    # PART 3: Create company_analytics_config table
    # ========================================================================

    op.create_table(
        'company_analytics_config',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('company_id', GUID(), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, unique=True),

        # Benchmark targets
        sa.Column('target_time_to_hire_days', sa.Integer(), server_default='30'),
        sa.Column('target_cost_per_hire_usd', sa.Numeric(10, 2), nullable=True),

        # Snapshot schedule
        sa.Column('snapshot_frequency', sa.String(20), server_default='daily'),  # 'hourly', 'daily', 'weekly'

        # Metadata
        sa.Column('created_at', sa.DateTime(), server_default=func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=func.now(), onupdate=func.now(), nullable=False),
    )

    # Index for company_analytics_config
    op.create_index('idx_company_analytics_config_company_id', 'company_analytics_config', ['company_id'], unique=True)

    # ========================================================================
    # PART 4: Enhance existing tables
    # ========================================================================

    # Add source tracking to applications
    op.add_column(
        'applications',
        sa.Column('source', sa.String(50), nullable=True)  # 'auto_apply', 'manual', 'referral', 'job_board'
    )

    # Add cost attribution to applications
    op.add_column(
        'applications',
        sa.Column('cost_attribution', sa.Numeric(10, 2), nullable=True)
    )

    # Add attendance tracking to interview_schedules
    op.add_column(
        'interview_schedules',
        sa.Column('candidate_showed_up', sa.Boolean(), nullable=True)  # NULL = not yet completed
    )

    # Create index on application source for analytics queries
    op.create_index('idx_applications_source', 'applications', ['source'])


def downgrade() -> None:
    """
    Downgrade from Sprint 15-16 schema.

    Removes all analytics tables and columns.
    """

    # ========================================================================
    # PART 1: Remove enhanced columns from existing tables
    # ========================================================================

    # Remove columns from interview_schedules
    op.drop_column('interview_schedules', 'candidate_showed_up')

    # Remove index and columns from applications
    op.drop_index('idx_applications_source', 'applications')
    op.drop_column('applications', 'cost_attribution')
    op.drop_column('applications', 'source')

    # ========================================================================
    # PART 2: Drop new tables (reverse order of creation)
    # ========================================================================

    # Drop company_analytics_config table
    op.drop_index('idx_company_analytics_config_company_id', 'company_analytics_config')
    op.drop_table('company_analytics_config')

    # Drop application_stage_history table
    op.drop_index('idx_stage_history_changed_at', 'application_stage_history')
    op.drop_index('idx_stage_history_application', 'application_stage_history')
    op.drop_table('application_stage_history')

    # Drop analytics_snapshots table
    op.drop_index('idx_analytics_snapshots_metric_type', 'analytics_snapshots')
    op.drop_index('idx_analytics_snapshots_company_date', 'analytics_snapshots')
    op.drop_index('idx_analytics_snapshots_unique', 'analytics_snapshots')
    op.drop_table('analytics_snapshots')
