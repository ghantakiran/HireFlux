"""add_company_id_to_jobs_for_employer_postings

Revision ID: 865cdf357eae
Revises: cb0688fac175
Create Date: 2025-11-01 00:59:10.490550

"""
from alembic import op
import sqlalchemy as sa
from app.db.types import GUID


# revision identifiers, used by Alembic.
revision = '865cdf357eae'
down_revision = 'cb0688fac175'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Add company_id to jobs table to support employer-posted jobs.

    Jobs can now be:
    - Posted by employers on the platform (company_id NOT NULL)
    - Sourced from external job boards (company_id NULL)
    """
    # Add company_id column
    op.add_column('jobs',
        sa.Column('company_id', GUID(), nullable=True)
    )

    # Create foreign key constraint
    op.create_foreign_key(
        'fk_jobs_company_id',
        'jobs',
        'companies',
        ['company_id'],
        ['id'],
        ondelete='CASCADE'
    )

    # Create index for performance
    op.create_index(
        'ix_jobs_company_id',
        'jobs',
        ['company_id'],
        unique=False
    )


def downgrade() -> None:
    """Remove company_id from jobs table"""
    # Drop index
    op.drop_index('ix_jobs_company_id', table_name='jobs')

    # Drop foreign key
    op.drop_constraint('fk_jobs_company_id', 'jobs', type_='foreignkey')

    # Drop column
    op.drop_column('jobs', 'company_id')
