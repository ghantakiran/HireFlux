"""add_candidate_views_table

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2025-11-02 10:01:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func
from app.db.types import GUID


# revision identifiers, used by Alembic.
revision = 'd4e5f6g7h8i9'
down_revision = 'c3d4e5f6g7h8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create candidate_views table to track employer views.

    Tracks which employers/company members viewed which candidates,
    for analytics and usage billing purposes.
    """
    op.create_table(
        'candidate_views',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('company_id', GUID(), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('viewer_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),  # Company member who viewed
        sa.Column('candidate_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),  # Candidate being viewed

        # Context
        sa.Column('source', sa.String(50)),  # 'search', 'application', 'referral', 'invite'
        sa.Column('context_job_id', GUID(), sa.ForeignKey('jobs.id', ondelete='SET NULL')),  # If viewed in context of a job

        # Timestamp
        sa.Column('created_at', sa.TIMESTAMP(), server_default=func.now(), nullable=False),
    )

    # Create indexes
    op.create_index(
        'ix_candidate_views_company_id',
        'candidate_views',
        ['company_id'],
        unique=False
    )

    op.create_index(
        'ix_candidate_views_viewer_id',
        'candidate_views',
        ['viewer_id'],
        unique=False
    )

    op.create_index(
        'ix_candidate_views_candidate_id',
        'candidate_views',
        ['candidate_id'],
        unique=False
    )

    op.create_index(
        'ix_candidate_views_created_at',
        'candidate_views',
        ['created_at'],
        unique=False
    )

    # Composite index for usage tracking per company per month
    op.create_index(
        'ix_candidate_views_company_created',
        'candidate_views',
        ['company_id', 'created_at'],
        unique=False
    )


def downgrade() -> None:
    """Remove candidate_views table"""
    # Drop indexes
    op.drop_index('ix_candidate_views_company_created', table_name='candidate_views')
    op.drop_index('ix_candidate_views_created_at', table_name='candidate_views')
    op.drop_index('ix_candidate_views_candidate_id', table_name='candidate_views')
    op.drop_index('ix_candidate_views_viewer_id', table_name='candidate_views')
    op.drop_index('ix_candidate_views_company_id', table_name='candidate_views')

    # Drop table
    op.drop_table('candidate_views')
