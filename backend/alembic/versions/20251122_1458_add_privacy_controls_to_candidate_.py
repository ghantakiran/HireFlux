"""add_privacy_controls_to_candidate_profiles

Revision ID: cee773b221a9
Revises: e26a8c7ee13d
Create Date: 2025-11-22 14:58:19.959656

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'cee773b221a9'
down_revision = 'e26a8c7ee13d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add privacy control columns to candidate_profiles table
    op.add_column('candidate_profiles', sa.Column('show_salary', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('candidate_profiles', sa.Column('show_contact', sa.Boolean(), server_default='false', nullable=False))
    op.add_column('candidate_profiles', sa.Column('show_location', sa.Boolean(), server_default='true', nullable=False))


def downgrade() -> None:
    # Remove privacy control columns
    op.drop_column('candidate_profiles', 'show_location')
    op.drop_column('candidate_profiles', 'show_contact')
    op.drop_column('candidate_profiles', 'show_salary')
