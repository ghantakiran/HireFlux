"""add_bulk_job_posting_tables

Revision ID: e5f6g7h8i9j0
Revises: d4e5f6g7h8i9
Create Date: 2025-11-03 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from app.db.types import GUID


# revision identifiers, used by Alembic.
revision = 'e5f6g7h8i9j0'
down_revision = 'd4e5f6g7h8i9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create bulk_job_uploads and job_distributions tables for Sprint 11-12.

    Enables employers to:
    - Upload multiple jobs via CSV (max 500)
    - AI-powered normalization and enrichment
    - Duplicate detection
    - Multi-board distribution (LinkedIn, Indeed, Glassdoor)
    - Scheduled posting
    - Performance tracking per channel
    """

    # ENUM types - skip creation as they already exist or will be auto-created
    # The create_type=False parameter on Enum columns uses existing types

    # Create bulk_job_uploads table
    op.create_table(
        'bulk_job_uploads',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('company_id', GUID(), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('uploaded_by_user_id', GUID(), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),

        # Upload metadata
        sa.Column('filename', sa.String(255), nullable=False),
        sa.Column('total_jobs', sa.Integer(), server_default='0'),
        sa.Column('valid_jobs', sa.Integer(), server_default='0'),
        sa.Column('invalid_jobs', sa.Integer(), server_default='0'),
        sa.Column('duplicate_jobs', sa.Integer(), server_default='0'),

        # Status tracking
        sa.Column('status', sa.Enum('uploaded', 'validating', 'enriching', 'ready', 'publishing', 'completed', 'failed', 'cancelled', name='bulkuploadstatus', create_type=False), nullable=False, server_default='uploaded'),
        sa.Column('error_message', sa.Text()),

        # Job data
        sa.Column('raw_jobs_data', JSONB()),  # Original CSV data
        sa.Column('enriched_jobs_data', JSONB()),  # After AI normalization
        sa.Column('validation_errors', JSONB()),  # Per-job validation errors
        sa.Column('duplicate_info', JSONB()),  # Duplicate detection results

        # AI enrichment tracking
        sa.Column('enrichment_started_at', sa.TIMESTAMP()),
        sa.Column('enrichment_completed_at', sa.TIMESTAMP()),
        sa.Column('enrichment_cost', sa.Integer(), server_default='0'),  # LLM token cost in cents

        # Distribution settings
        sa.Column('distribution_channels', JSONB()),  # List of selected channels
        sa.Column('scheduled_publish_at', sa.TIMESTAMP()),  # Future publish time

        # Timestamps
        sa.Column('created_at', sa.TIMESTAMP(), server_default=func.now(), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=func.now(), onupdate=func.now(), nullable=False),
        sa.Column('completed_at', sa.TIMESTAMP()),
    )

    # Create job_distributions table
    op.create_table(
        'job_distributions',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('bulk_upload_id', GUID(), sa.ForeignKey('bulk_job_uploads.id', ondelete='CASCADE'), nullable=True),
        sa.Column('job_id', GUID(), sa.ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('company_id', GUID(), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),

        # Distribution channel
        sa.Column('channel', sa.Enum('linkedin', 'indeed', 'glassdoor', 'internal', name='distributionchannel', create_type=False), nullable=False),

        # Status tracking
        sa.Column('status', sa.Enum('pending', 'publishing', 'published', 'failed', 'retrying', name='distributionstatus', create_type=False), nullable=False, server_default='pending'),

        # External tracking
        sa.Column('external_post_id', sa.String(255)),  # ID from job board
        sa.Column('external_post_url', sa.Text()),  # Direct link to posting

        # Performance metrics
        sa.Column('views_count', sa.Integer(), server_default='0'),
        sa.Column('applications_count', sa.Integer(), server_default='0'),
        sa.Column('clicks_count', sa.Integer(), server_default='0'),

        # Error handling
        sa.Column('retry_count', sa.Integer(), server_default='0'),
        sa.Column('max_retries', sa.Integer(), server_default='3'),
        sa.Column('error_message', sa.Text()),

        # Scheduling
        sa.Column('scheduled_publish_at', sa.TIMESTAMP()),
        sa.Column('published_at', sa.TIMESTAMP()),
        sa.Column('expires_at', sa.TIMESTAMP()),

        # Timestamps
        sa.Column('created_at', sa.TIMESTAMP(), server_default=func.now(), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=func.now(), onupdate=func.now(), nullable=False),
    )

    # Create indexes for bulk_job_uploads
    op.create_index(
        'ix_bulk_job_uploads_company_id',
        'bulk_job_uploads',
        ['company_id'],
        unique=False
    )

    op.create_index(
        'ix_bulk_job_uploads_uploaded_by_user_id',
        'bulk_job_uploads',
        ['uploaded_by_user_id'],
        unique=False
    )

    op.create_index(
        'ix_bulk_job_uploads_status',
        'bulk_job_uploads',
        ['status'],
        unique=False
    )

    op.create_index(
        'ix_bulk_job_uploads_created_at',
        'bulk_job_uploads',
        ['created_at'],
        unique=False
    )

    # Create indexes for job_distributions
    op.create_index(
        'ix_job_distributions_bulk_upload_id',
        'job_distributions',
        ['bulk_upload_id'],
        unique=False
    )

    op.create_index(
        'ix_job_distributions_job_id',
        'job_distributions',
        ['job_id'],
        unique=False
    )

    op.create_index(
        'ix_job_distributions_company_id',
        'job_distributions',
        ['company_id'],
        unique=False
    )

    op.create_index(
        'ix_job_distributions_channel',
        'job_distributions',
        ['channel'],
        unique=False
    )

    op.create_index(
        'ix_job_distributions_status',
        'job_distributions',
        ['status'],
        unique=False
    )

    op.create_index(
        'ix_job_distributions_created_at',
        'job_distributions',
        ['created_at'],
        unique=False
    )

    # Composite index for querying distributions by job and channel
    op.create_index(
        'ix_job_distributions_job_channel',
        'job_distributions',
        ['job_id', 'channel'],
        unique=False
    )


def downgrade() -> None:
    """Remove bulk job posting tables"""

    # Drop indexes for job_distributions
    op.drop_index('ix_job_distributions_job_channel', table_name='job_distributions')
    op.drop_index('ix_job_distributions_created_at', table_name='job_distributions')
    op.drop_index('ix_job_distributions_status', table_name='job_distributions')
    op.drop_index('ix_job_distributions_channel', table_name='job_distributions')
    op.drop_index('ix_job_distributions_company_id', table_name='job_distributions')
    op.drop_index('ix_job_distributions_job_id', table_name='job_distributions')
    op.drop_index('ix_job_distributions_bulk_upload_id', table_name='job_distributions')

    # Drop indexes for bulk_job_uploads
    op.drop_index('ix_bulk_job_uploads_created_at', table_name='bulk_job_uploads')
    op.drop_index('ix_bulk_job_uploads_status', table_name='bulk_job_uploads')
    op.drop_index('ix_bulk_job_uploads_uploaded_by_user_id', table_name='bulk_job_uploads')
    op.drop_index('ix_bulk_job_uploads_company_id', table_name='bulk_job_uploads')

    # Drop tables
    op.drop_table('job_distributions')
    op.drop_table('bulk_job_uploads')

    # Drop ENUM types
    op.execute('DROP TYPE distributionchannel')
    op.execute('DROP TYPE distributionstatus')
    op.execute('DROP TYPE bulkuploadstatus')
