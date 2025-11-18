"""Issue 26: Add AI ranking fields to profiles

Revision ID: 20251118_0656
Revises: 0f28d1979fa3
Create Date: 2025-11-18 06:56:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251118_0656'
down_revision = '0f28d1979fa3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add AI ranking fields to profiles table"""
    # Add years_experience
    op.add_column('profiles', sa.Column('years_experience', sa.Integer(), nullable=True))

    # Add expected salary range
    op.add_column('profiles', sa.Column('expected_salary_min', sa.Integer(), nullable=True))
    op.add_column('profiles', sa.Column('expected_salary_max', sa.Integer(), nullable=True))

    # Add availability status
    op.add_column('profiles', sa.Column('availability_status', sa.String(length=50), nullable=True, server_default='actively_looking'))

    # Add preferred location type
    op.add_column('profiles', sa.Column('preferred_location_type', sa.String(length=50), nullable=True))


def downgrade() -> None:
    """Remove AI ranking fields from profiles table"""
    op.drop_column('profiles', 'preferred_location_type')
    op.drop_column('profiles', 'availability_status')
    op.drop_column('profiles', 'expected_salary_max')
    op.drop_column('profiles', 'expected_salary_min')
    op.drop_column('profiles', 'years_experience')
