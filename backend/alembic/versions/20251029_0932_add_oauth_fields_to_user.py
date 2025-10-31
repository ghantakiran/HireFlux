"""add_oauth_fields_to_user

Revision ID: 78c008adc024
Revises: a2fe65bd1a0d
Create Date: 2025-10-29 09:32:51.349209

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '78c008adc024'
down_revision = 'a2fe65bd1a0d'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make hashed_password nullable for OAuth users
    op.alter_column('users', 'hashed_password', nullable=True, existing_type=sa.String(255))

    # Add OAuth fields
    op.add_column('users', sa.Column('oauth_provider', sa.String(50), nullable=True))
    op.add_column('users', sa.Column('oauth_provider_id', sa.String(255), nullable=True))
    op.add_column('users', sa.Column('oauth_picture', sa.String(500), nullable=True))

    # Add index on oauth_provider_id for faster lookups
    op.create_index('ix_users_oauth_provider_id', 'users', ['oauth_provider_id'])


def downgrade() -> None:
    # Remove index
    op.drop_index('ix_users_oauth_provider_id', 'users')

    # Remove OAuth fields
    op.drop_column('users', 'oauth_picture')
    op.drop_column('users', 'oauth_provider_id')
    op.drop_column('users', 'oauth_provider')

    # Make hashed_password not nullable again
    op.alter_column('users', 'hashed_password', nullable=False, existing_type=sa.String(255))
