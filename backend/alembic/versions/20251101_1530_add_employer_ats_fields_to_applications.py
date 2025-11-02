"""add_employer_ats_fields_to_applications

Revision ID: a1b2c3d4e5f6
Revises: 865cdf357eae
Create Date: 2025-11-01 15:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON
from app.db.types import GUID


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '865cdf357eae'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Add employer ATS fields to applications table.

    New fields:
    - fit_index: AI-calculated candidate fit score (0-100)
    - assigned_to: Array of user IDs (team members reviewing this application)
    - tags: Array of tags for categorization (e.g., "strong_candidate", "needs_review")
    """
    # Add fit_index column (0-100 score)
    op.add_column('applications',
        sa.Column('fit_index', sa.Integer(), nullable=True)
    )

    # Add assigned_to column (JSON array of user IDs)
    op.add_column('applications',
        sa.Column('assigned_to', JSON, nullable=True, server_default='[]')
    )

    # Add tags column (JSON array of strings)
    op.add_column('applications',
        sa.Column('tags', JSON, nullable=True, server_default='[]')
    )

    # Create index on fit_index for sorting/filtering
    op.create_index(
        'ix_applications_fit_index',
        'applications',
        ['fit_index'],
        unique=False
    )


def downgrade() -> None:
    """Remove employer ATS fields from applications table"""
    # Drop index
    op.drop_index('ix_applications_fit_index', table_name='applications')

    # Drop columns
    op.drop_column('applications', 'tags')
    op.drop_column('applications', 'assigned_to')
    op.drop_column('applications', 'fit_index')
