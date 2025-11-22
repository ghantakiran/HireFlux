"""add_performance_indexes_for_issue_66

Issue #66: Database Query Performance - Indexes & Optimization

This migration adds critical performance indexes to handle:
- High-volume application queries (10K+ applications)
- Candidate profile search (100K+ candidates)
- Job listing queries
- Analytics and reporting queries

Target: p95 query time <300ms
Current: p95 query time >3s (no indexes)

Revision ID: 20251122_0433
Revises: 8539e112fb57
Create Date: 2025-11-22 04:33:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20251122_0433'
down_revision: Union[str, None] = '8539e112fb57'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add performance indexes for critical query paths"""

    # =========================================================================
    # APPLICATIONS TABLE - Highest Query Volume
    # =========================================================================

    # Composite index for employer ATS view (job_id + stage + fit_index)
    # Query: SELECT * FROM applications WHERE job_id = ? AND stage = ? ORDER BY fit_index DESC
    op.create_index(
        'idx_applications_job_stage_fit',
        'applications',
        ['job_id', 'status', 'fit_index'],
        postgresql_ops={'fit_index': 'DESC'}
    )

    # Composite index for company view (user_id + status)
    # Query: SELECT * FROM applications WHERE user_id = ? AND status = ?
    op.create_index(
        'idx_applications_user_status',
        'applications',
        ['user_id', 'status']
    )

    # Index for timeline view (created_at DESC for recent applications)
    # Query: SELECT * FROM applications ORDER BY created_at DESC LIMIT 100
    op.create_index(
        'idx_applications_created_at',
        'applications',
        ['created_at'],
        postgresql_ops={'created_at': 'DESC'}
    )

    # Index for auto-apply filtering
    # Query: SELECT * FROM applications WHERE is_auto_applied = TRUE
    op.create_index(
        'idx_applications_auto_applied',
        'applications',
        ['is_auto_applied']
    )

    # Composite index for analytics queries (source + created_at)
    # Query: SELECT * FROM applications WHERE source = ? AND created_at > ?
    op.create_index(
        'idx_applications_source_created',
        'applications',
        ['source', 'created_at']
    )

    # =========================================================================
    # JOBS TABLE - High-Traffic Search Queries
    # =========================================================================

    # Composite index for active job listings (is_active + created_at)
    # Query: SELECT * FROM jobs WHERE is_active = TRUE ORDER BY created_at DESC
    op.create_index(
        'idx_jobs_active_created',
        'jobs',
        ['is_active', 'created_at'],
        postgresql_ops={'created_at': 'DESC'}
    )

    # Index for location-based search
    # Query: SELECT * FROM jobs WHERE location LIKE ?
    op.create_index(
        'idx_jobs_location',
        'jobs',
        ['location']
    )

    # Index for company-specific jobs
    # Query: SELECT * FROM jobs WHERE company = ?
    # Note: Already has index on 'company' column, no need to add

    # Index for job type filtering
    # Query: SELECT * FROM jobs WHERE job_type = ?
    op.create_index(
        'idx_jobs_type',
        'jobs',
        ['job_type']
    )

    # Composite index for location type filtering
    # Query: SELECT * FROM jobs WHERE location_type = 'remote'
    op.create_index(
        'idx_jobs_location_type_active',
        'jobs',
        ['location_type', 'is_active']
    )

    # =========================================================================
    # CANDIDATE_PROFILES TABLE - Search & Discovery Queries
    # =========================================================================

    # Composite index for public profile search (visibility + open_to_work)
    # Query: SELECT * FROM candidate_profiles WHERE visibility = 'public' AND open_to_work = TRUE
    op.create_index(
        'idx_candidate_profiles_public_open',
        'candidate_profiles',
        ['visibility', 'open_to_work']
    )

    # Index for years of experience filtering
    # Query: SELECT * FROM candidate_profiles WHERE years_experience >= ?
    op.create_index(
        'idx_candidate_profiles_experience',
        'candidate_profiles',
        ['years_experience']
    )

    # Index for location-based candidate search
    # Query: SELECT * FROM candidate_profiles WHERE current_location LIKE ?
    op.create_index(
        'idx_candidate_profiles_location',
        'candidate_profiles',
        ['current_location']
    )

    # Index for job title search
    # Query: SELECT * FROM candidate_profiles WHERE current_title LIKE ?
    op.create_index(
        'idx_candidate_profiles_title',
        'candidate_profiles',
        ['current_title']
    )

    # Composite index for active public profiles (visibility + updated_at)
    # Query: SELECT * FROM candidate_profiles WHERE visibility = 'public' ORDER BY updated_at DESC
    op.create_index(
        'idx_candidate_profiles_visibility_updated',
        'candidate_profiles',
        ['visibility', 'updated_at'],
        postgresql_ops={'updated_at': 'DESC'}
    )

    # =========================================================================
    # CANDIDATE_VIEWS TABLE - Analytics Queries
    # =========================================================================

    # Composite index for company view analytics (company_id + viewed_at)
    # Query: SELECT * FROM candidate_views WHERE company_id = ? AND viewed_at > ?
    op.create_index(
        'idx_candidate_views_company_date',
        'candidate_views',
        ['company_id', 'viewed_at'],
        postgresql_ops={'viewed_at': 'DESC'}
    )

    # Composite index for candidate popularity (candidate_id + viewed_at)
    # Query: SELECT COUNT(*) FROM candidate_views WHERE candidate_id = ?
    op.create_index(
        'idx_candidate_views_candidate_date',
        'candidate_views',
        ['candidate_id', 'viewed_at']
    )

    # =========================================================================
    # APPLICATION_NOTES TABLE - ATS Queries
    # =========================================================================

    # Composite index for note timeline (application_id + created_at)
    # Query: SELECT * FROM application_notes WHERE application_id = ? ORDER BY created_at DESC
    op.create_index(
        'idx_application_notes_app_created',
        'application_notes',
        ['application_id', 'created_at'],
        postgresql_ops={'created_at': 'DESC'}
    )

    # Index for note type filtering
    # Query: SELECT * FROM application_notes WHERE note_type = ?
    # Note: Already has index on 'note_type', no need to add

    # Composite index for author's notes (author_id + created_at)
    # Query: SELECT * FROM application_notes WHERE author_id = ? ORDER BY created_at DESC
    op.create_index(
        'idx_application_notes_author_created',
        'application_notes',
        ['author_id', 'created_at'],
        postgresql_ops={'created_at': 'DESC'}
    )

    # =========================================================================
    # RESUMES TABLE - User Profile Queries
    # =========================================================================

    # Composite index for user's active resumes (user_id + is_active)
    # Query: SELECT * FROM resumes WHERE user_id = ? AND is_active = TRUE
    op.create_index(
        'idx_resumes_user_active',
        'resumes',
        ['user_id', 'is_active']
    )

    # =========================================================================
    # COVER_LETTERS TABLE - Application Queries
    # =========================================================================

    # Composite index for user's cover letters (user_id + created_at)
    # Query: SELECT * FROM cover_letters WHERE user_id = ? ORDER BY created_at DESC
    op.create_index(
        'idx_cover_letters_user_created',
        'cover_letters',
        ['user_id', 'created_at'],
        postgresql_ops={'created_at': 'DESC'}
    )

    # =========================================================================
    # COMPANIES TABLE - Employer Queries
    # =========================================================================

    # Index for subscription tier filtering
    # Query: SELECT * FROM companies WHERE subscription_tier = ?
    op.create_index(
        'idx_companies_subscription',
        'companies',
        ['subscription_tier']
    )

    # Index for domain lookup (already added in domain verification migration)
    # Query: SELECT * FROM companies WHERE domain = ?
    # Note: Already has UNIQUE constraint which creates index

    # =========================================================================
    # COMPANY_MEMBERS TABLE - Team Queries
    # =========================================================================

    # Composite index for company team (company_id + role)
    # Query: SELECT * FROM company_members WHERE company_id = ? AND role = ?
    op.create_index(
        'idx_company_members_company_role',
        'company_members',
        ['company_id', 'role']
    )

    # Composite index for user's companies (user_id + status)
    # Query: SELECT * FROM company_members WHERE user_id = ? AND status = 'active'
    op.create_index(
        'idx_company_members_user_status',
        'company_members',
        ['user_id', 'status']
    )

    # =========================================================================
    # NOTIFICATIONS TABLE - Real-time Queries
    # =========================================================================

    # Composite index for user notifications (user_id + read + created_at)
    # Query: SELECT * FROM notifications WHERE user_id = ? AND read = FALSE ORDER BY created_at DESC
    op.create_index(
        'idx_notifications_user_read_created',
        'notifications',
        ['user_id', 'read', 'created_at'],
        postgresql_ops={'created_at': 'DESC'}
    )

    # =========================================================================
    # INTERVIEW_SCHEDULES TABLE - Calendar Queries
    # =========================================================================

    # Composite index for application interviews (application_id + scheduled_at)
    # Query: SELECT * FROM interview_schedules WHERE application_id = ? ORDER BY scheduled_at
    op.create_index(
        'idx_interview_schedules_app_date',
        'interview_schedules',
        ['application_id', 'scheduled_at']
    )

    # Composite index for interviewer calendar (interviewer_id + scheduled_at)
    # Query: SELECT * FROM interview_schedules WHERE interviewer_id = ? AND scheduled_at >= ?
    op.create_index(
        'idx_interview_schedules_interviewer_date',
        'interview_schedules',
        ['interviewer_id', 'scheduled_at']
    )

    # =========================================================================
    # AUTO_APPLY_JOBS TABLE - Auto-Apply Queries
    # =========================================================================

    # Composite index for user's auto-apply queue (user_id + status)
    # Query: SELECT * FROM auto_apply_jobs WHERE user_id = ? AND status = 'pending'
    op.create_index(
        'idx_auto_apply_jobs_user_status',
        'auto_apply_jobs',
        ['user_id', 'status']
    )

    # Composite index for scheduled jobs (status + scheduled_for)
    # Query: SELECT * FROM auto_apply_jobs WHERE status = 'pending' AND scheduled_for <= NOW()
    op.create_index(
        'idx_auto_apply_jobs_status_scheduled',
        'auto_apply_jobs',
        ['status', 'scheduled_for']
    )


def downgrade() -> None:
    """Remove performance indexes"""

    # Applications
    op.drop_index('idx_applications_job_stage_fit', table_name='applications')
    op.drop_index('idx_applications_user_status', table_name='applications')
    op.drop_index('idx_applications_created_at', table_name='applications')
    op.drop_index('idx_applications_auto_applied', table_name='applications')
    op.drop_index('idx_applications_source_created', table_name='applications')

    # Jobs
    op.drop_index('idx_jobs_active_created', table_name='jobs')
    op.drop_index('idx_jobs_location', table_name='jobs')
    op.drop_index('idx_jobs_type', table_name='jobs')
    op.drop_index('idx_jobs_location_type_active', table_name='jobs')

    # Candidate Profiles
    op.drop_index('idx_candidate_profiles_public_open', table_name='candidate_profiles')
    op.drop_index('idx_candidate_profiles_experience', table_name='candidate_profiles')
    op.drop_index('idx_candidate_profiles_location', table_name='candidate_profiles')
    op.drop_index('idx_candidate_profiles_title', table_name='candidate_profiles')
    op.drop_index('idx_candidate_profiles_visibility_updated', table_name='candidate_profiles')

    # Candidate Views
    op.drop_index('idx_candidate_views_company_date', table_name='candidate_views')
    op.drop_index('idx_candidate_views_candidate_date', table_name='candidate_views')

    # Application Notes
    op.drop_index('idx_application_notes_app_created', table_name='application_notes')
    op.drop_index('idx_application_notes_author_created', table_name='application_notes')

    # Resumes
    op.drop_index('idx_resumes_user_active', table_name='resumes')

    # Cover Letters
    op.drop_index('idx_cover_letters_user_created', table_name='cover_letters')

    # Companies
    op.drop_index('idx_companies_subscription', table_name='companies')

    # Company Members
    op.drop_index('idx_company_members_company_role', table_name='company_members')
    op.drop_index('idx_company_members_user_status', table_name='company_members')

    # Notifications
    op.drop_index('idx_notifications_user_read_created', table_name='notifications')

    # Interview Schedules
    op.drop_index('idx_interview_schedules_app_date', table_name='interview_schedules')
    op.drop_index('idx_interview_schedules_interviewer_date', table_name='interview_schedules')

    # Auto Apply Jobs
    op.drop_index('idx_auto_apply_jobs_user_status', table_name='auto_apply_jobs')
    op.drop_index('idx_auto_apply_jobs_status_scheduled', table_name='auto_apply_jobs')
