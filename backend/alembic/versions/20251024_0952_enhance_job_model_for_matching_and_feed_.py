"""enhance_job_model_for_matching_and_feed_integration

Revision ID: 86ee369868da
Revises: 20251023_2330
Create Date: 2025-10-24 09:52:04.172097

"""
from alembic import op
import sqlalchemy as sa
from app.db.types import GUID


# revision identifiers, used by Alembic.
revision = '86ee369868da'
down_revision = '20251023_2330'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Enhance Job model with fields for job matching and feed integration.

    NOTE: Jobs table already exists from initial migration.
    This migration adds new columns to enhance the existing table.
    """

    # Create job_sources table
    op.create_table('job_sources',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=True),
        sa.Column('api_url', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='TRUE', nullable=True),
        sa.Column('last_sync_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Add new columns to existing jobs table
    # Jobs table already has: id, title, company, description, location,
    # salary_min, salary_max, remote_policy, visa_friendly, source,
    # external_url, posted_at, created_at

    # Add source_id column with foreign key
    op.add_column('jobs', sa.Column('source_id', GUID(), nullable=True))
    op.create_foreign_key('fk_jobs_source_id', 'jobs', 'job_sources', ['source_id'], ['id'], ondelete='SET NULL')

    # Add new string/text columns
    op.add_column('jobs', sa.Column('external_id', sa.String(length=255), nullable=True))
    op.add_column('jobs', sa.Column('location_type', sa.String(length=50), nullable=True))
    op.add_column('jobs', sa.Column('department', sa.String(length=255), nullable=True))
    op.add_column('jobs', sa.Column('employment_type', sa.String(length=50), nullable=True))

    # Add JSON/text columns for skills (stored as JSON arrays)
    op.add_column('jobs', sa.Column('required_skills', sa.Text(), server_default='[]', nullable=True))
    op.add_column('jobs', sa.Column('preferred_skills', sa.Text(), server_default='[]', nullable=True))

    # Add experience-related columns
    op.add_column('jobs', sa.Column('experience_requirement', sa.String(length=100), nullable=True))
    op.add_column('jobs', sa.Column('experience_min_years', sa.Integer(), nullable=True))
    op.add_column('jobs', sa.Column('experience_max_years', sa.Integer(), nullable=True))
    op.add_column('jobs', sa.Column('experience_level', sa.String(length=50), nullable=True))

    # Add date and status columns
    op.add_column('jobs', sa.Column('expires_at', sa.TIMESTAMP(), nullable=True))
    op.add_column('jobs', sa.Column('is_active', sa.Boolean(), server_default='TRUE', nullable=True))
    op.add_column('jobs', sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True))
    op.add_column('jobs', sa.Column('requires_visa_sponsorship', sa.Boolean(), server_default='FALSE', nullable=True))

    # Create indexes for performance (only on new columns)
    op.create_index('ix_jobs_is_active', 'jobs', ['is_active'], unique=False)
    # Note: ix_jobs_title and ix_jobs_company already exist from initial migration

    # Drop match_scores table if it exists (will be recreated with correct types)
    op.execute('DROP TABLE IF EXISTS match_scores')

    # Create match_scores table with UUID
    op.create_table('match_scores',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('user_id', GUID(), nullable=False),
        sa.Column('job_id', GUID(), nullable=False),
        sa.Column('fit_index', sa.Integer(), nullable=True),
        sa.Column('rationale', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_match_scores_user_id', 'match_scores', ['user_id'], unique=False)
    op.create_index('ix_match_scores_job_id', 'match_scores', ['job_id'], unique=False)


def downgrade() -> None:
    """Remove enhancements to job model"""
    # Drop match_scores table
    op.drop_index('ix_match_scores_job_id', table_name='match_scores')
    op.drop_index('ix_match_scores_user_id', table_name='match_scores')
    op.drop_table('match_scores')

    # Drop new indexes
    op.drop_index('ix_jobs_is_active', table_name='jobs')

    # Drop new columns from jobs table
    op.drop_column('jobs', 'requires_visa_sponsorship')
    op.drop_column('jobs', 'updated_at')
    op.drop_column('jobs', 'is_active')
    op.drop_column('jobs', 'expires_at')
    op.drop_column('jobs', 'experience_level')
    op.drop_column('jobs', 'experience_max_years')
    op.drop_column('jobs', 'experience_min_years')
    op.drop_column('jobs', 'experience_requirement')
    op.drop_column('jobs', 'preferred_skills')
    op.drop_column('jobs', 'required_skills')
    op.drop_column('jobs', 'employment_type')
    op.drop_column('jobs', 'department')
    op.drop_column('jobs', 'location_type')
    op.drop_column('jobs', 'external_id')

    # Drop foreign key and source_id column
    op.drop_constraint('fk_jobs_source_id', 'jobs', type_='foreignkey')
    op.drop_column('jobs', 'source_id')

    # Drop job_sources table
    op.drop_table('job_sources')
