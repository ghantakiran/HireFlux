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
    """
    NOTE: OAuth fields already exist in users table from initial migration.
    This migration is a no-op to maintain migration chain integrity.

    The initial migration (cae7bbeff042) already includes:
    - oauth_provider VARCHAR(50)
    - oauth_provider_id VARCHAR(255)
    - oauth_picture VARCHAR(500)
    - ix_users_oauth_provider_id index
    - hashed_password is already nullable
    """
    pass


def downgrade() -> None:
    """No-op downgrade since nothing was changed in upgrade"""
    pass
