"""add_analytics_performance_indexes

Revision ID: a2fe65bd1a0d
Revises: 86ee369868da
Create Date: 2025-10-27 13:49:13.615335

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a2fe65bd1a0d'
down_revision = '86ee369868da'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Add performance indexes for analytics queries.

    These indexes optimize the most common analytics queries:
    - User-specific application queries
    - Time-range filtered queries
    - Status-based filtering
    - Activity timeline queries
    - Pipeline statistics
    """

    # Applications table indexes
    # ============================================================================

    # Index for user + created_at (timeline queries, trends)
    op.create_index(
        'idx_applications_user_created',
        'applications',
        ['user_id', 'created_at'],
        unique=False
    )

    # Index for user + status (pipeline stats, status filtering)
    op.create_index(
        'idx_applications_user_status',
        'applications',
        ['user_id', 'status'],
        unique=False
    )

    # Index for user + applied_at (application trends, date range queries)
    op.create_index(
        'idx_applications_user_applied',
        'applications',
        ['user_id', 'applied_at'],
        unique=False
    )

    # Index for user + updated_at (activity detection, recent changes)
    op.create_index(
        'idx_applications_user_updated',
        'applications',
        ['user_id', 'updated_at'],
        unique=False
    )

    # Composite index for user + status + created_at (filtered pipeline queries)
    op.create_index(
        'idx_applications_user_status_created',
        'applications',
        ['user_id', 'status', 'created_at'],
        unique=False
    )

    # Activity Events table indexes (if exists)
    # ============================================================================

    # Index for user + timestamp (activity timeline)
    op.create_index(
        'idx_activity_user_timestamp',
        'activity_events',
        ['user_id', 'timestamp'],
        unique=False
    )

    # Index for user + event_type (filtered activity queries)
    op.create_index(
        'idx_activity_user_type',
        'activity_events',
        ['user_id', 'event_type'],
        unique=False
    )

    # Resumes table indexes
    # ============================================================================

    # Index for user + updated_at (recent resume activity)
    op.create_index(
        'idx_resumes_user_updated',
        'resumes',
        ['user_id', 'updated_at'],
        unique=False
    )

    # Index for user + is_active (active resume queries)
    op.create_index(
        'idx_resumes_user_active',
        'resumes',
        ['user_id', 'is_active'],
        unique=False
    )

    # Jobs table indexes
    # ============================================================================

    # Index for posted_date (trending jobs, recent jobs)
    op.create_index(
        'idx_jobs_posted_date',
        'jobs',
        ['posted_date'],
        unique=False
    )

    # Index for is_active (active job filtering)
    op.create_index(
        'idx_jobs_active',
        'jobs',
        ['is_active'],
        unique=False
    )

    # Index for company (company-based filtering)
    op.create_index(
        'idx_jobs_company',
        'jobs',
        ['company'],
        unique=False
    )

    # Job Matches table indexes
    # ============================================================================

    # Index for user + match_score (top matches queries)
    op.create_index(
        'idx_job_matches_user_score',
        'job_matches',
        ['user_id', 'match_score'],
        unique=False
    )

    # Index for user + created_at (recent matches)
    op.create_index(
        'idx_job_matches_user_created',
        'job_matches',
        ['user_id', 'created_at'],
        unique=False
    )

    # Cover Letters table indexes
    # ============================================================================

    # Index for user + created_at (recent cover letters)
    op.create_index(
        'idx_cover_letters_user_created',
        'cover_letters',
        ['user_id', 'created_at'],
        unique=False
    )

    # Interview Sessions table indexes
    # ============================================================================

    # Index for user + scheduled_at (upcoming interviews)
    op.create_index(
        'idx_interviews_user_scheduled',
        'interview_sessions',
        ['user_id', 'scheduled_at'],
        unique=False
    )

    # Index for user + status (active interviews)
    op.create_index(
        'idx_interviews_user_status',
        'interview_sessions',
        ['user_id', 'status'],
        unique=False
    )


def downgrade() -> None:
    """
    Remove all performance indexes.
    """

    # Applications indexes
    op.drop_index('idx_applications_user_created', table_name='applications')
    op.drop_index('idx_applications_user_status', table_name='applications')
    op.drop_index('idx_applications_user_applied', table_name='applications')
    op.drop_index('idx_applications_user_updated', table_name='applications')
    op.drop_index('idx_applications_user_status_created', table_name='applications')

    # Activity Events indexes
    op.drop_index('idx_activity_user_timestamp', table_name='activity_events')
    op.drop_index('idx_activity_user_type', table_name='activity_events')

    # Resumes indexes
    op.drop_index('idx_resumes_user_updated', table_name='resumes')
    op.drop_index('idx_resumes_user_active', table_name='resumes')

    # Jobs indexes
    op.drop_index('idx_jobs_posted_date', table_name='jobs')
    op.drop_index('idx_jobs_active', table_name='jobs')
    op.drop_index('idx_jobs_company', table_name='jobs')

    # Job Matches indexes
    op.drop_index('idx_job_matches_user_score', table_name='job_matches')
    op.drop_index('idx_job_matches_user_created', table_name='job_matches')

    # Cover Letters indexes
    op.drop_index('idx_cover_letters_user_created', table_name='cover_letters')

    # Interview Sessions indexes
    op.drop_index('idx_interviews_user_scheduled', table_name='interview_sessions')
    op.drop_index('idx_interviews_user_status', table_name='interview_sessions')
