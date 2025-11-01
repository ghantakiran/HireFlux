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
    # NOTE: activity_events table doesn't exist yet - skipping these indexes

    # # Index for user + timestamp (activity timeline)
    # op.create_index(
    #     'idx_activity_user_timestamp',
    #     'activity_events',
    #     ['user_id', 'timestamp'],
    #     unique=False
    # )

    # # Index for user + event_type (filtered activity queries)
    # op.create_index(
    #     'idx_activity_user_type',
    #     'activity_events',
    #     ['user_id', 'event_type'],
    #     unique=False
    # )

    # Resumes table indexes
    # ============================================================================
    # NOTE: resumes table doesn't have updated_at or is_active columns - skipping

    # # Index for user + updated_at (recent resume activity)
    # op.create_index(
    #     'idx_resumes_user_updated',
    #     'resumes',
    #     ['user_id', 'updated_at'],
    #     unique=False
    # )

    # # Index for user + is_active (active resume queries)
    # op.create_index(
    #     'idx_resumes_user_active',
    #     'resumes',
    #     ['user_id', 'is_active'],
    #     unique=False
    # )

    # Jobs table indexes
    # ============================================================================

    # Index for posted_at (trending jobs, recent jobs) - column is posted_at not posted_date
    op.create_index(
        'idx_jobs_posted_at',
        'jobs',
        ['posted_at'],
        unique=False
    )

    # NOTE: ix_jobs_is_active already created by enhancement migration - skip
    # NOTE: ix_jobs_company already created by initial migration - skip

    # Match Scores table indexes (table is called match_scores not job_matches)
    # ============================================================================

    # Index for user + fit_index (top matches queries) - column is fit_index not match_score
    op.create_index(
        'idx_match_scores_user_fit_index',
        'match_scores',
        ['user_id', 'fit_index'],
        unique=False
    )

    # Index for user + created_at (recent matches)
    op.create_index(
        'idx_match_scores_user_created',
        'match_scores',
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
    # NOTE: interview_sessions table doesn't exist yet - skipping these indexes

    # # Index for user + scheduled_at (upcoming interviews)
    # op.create_index(
    #     'idx_interviews_user_scheduled',
    #     'interview_sessions',
    #     ['user_id', 'scheduled_at'],
    #     unique=False
    # )

    # # Index for user + status (active interviews)
    # op.create_index(
    #     'idx_interviews_user_status',
    #     'interview_sessions',
    #     ['user_id', 'status'],
    #     unique=False
    # )


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

    # Activity Events indexes - skipped (table doesn't exist)
    # op.drop_index('idx_activity_user_timestamp', table_name='activity_events')
    # op.drop_index('idx_activity_user_type', table_name='activity_events')

    # Resumes indexes - skipped (columns don't exist)
    # op.drop_index('idx_resumes_user_updated', table_name='resumes')
    # op.drop_index('idx_resumes_user_active', table_name='resumes')

    # Jobs indexes
    op.drop_index('idx_jobs_posted_at', table_name='jobs')
    # idx_jobs_is_active already exists from enhancement migration - don't drop
    # idx_jobs_company already exists from initial migration - don't drop

    # Match Scores indexes (fixed table name from job_matches to match_scores)
    op.drop_index('idx_match_scores_user_fit_index', table_name='match_scores')
    op.drop_index('idx_match_scores_user_created', table_name='match_scores')

    # Cover Letters indexes
    op.drop_index('idx_cover_letters_user_created', table_name='cover_letters')

    # Interview Sessions indexes - skipped (table doesn't exist)
    # op.drop_index('idx_interviews_user_scheduled', table_name='interview_sessions')
    # op.drop_index('idx_interviews_user_status', table_name='interview_sessions')
