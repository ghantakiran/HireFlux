"""merge_migration_heads

Revision ID: e26a8c7ee13d
Revises: 9259f5b5bd02, 20251122_0433
Create Date: 2025-11-22 14:58:15.456278

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'e26a8c7ee13d'
down_revision = ('9259f5b5bd02', '20251122_0433')
branch_labels = None
depends_on = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
