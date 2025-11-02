"""add_application_notes_table

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2025-11-01 15:31:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func
from app.db.types import GUID


# revision identifiers, used by Alembic.
revision = 'b2c3d4e5f6g7'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create application_notes table for employer ATS internal notes.

    Team members can leave private or team-visible notes on applications.
    """
    op.create_table(
        'application_notes',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('application_id', GUID(), sa.ForeignKey('applications.id', ondelete='CASCADE'), nullable=False),
        sa.Column('author_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('visibility', sa.String(50), nullable=False, server_default='team'),  # 'private' or 'team'
        sa.Column('created_at', sa.TIMESTAMP(), server_default=func.now(), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=func.now(), onupdate=func.now(), nullable=False),
    )

    # Create indexes for performance
    op.create_index(
        'ix_application_notes_application_id',
        'application_notes',
        ['application_id'],
        unique=False
    )

    op.create_index(
        'ix_application_notes_author_id',
        'application_notes',
        ['author_id'],
        unique=False
    )

    op.create_index(
        'ix_application_notes_created_at',
        'application_notes',
        ['created_at'],
        unique=False
    )


def downgrade() -> None:
    """Remove application_notes table"""
    # Drop indexes
    op.drop_index('ix_application_notes_created_at', table_name='application_notes')
    op.drop_index('ix_application_notes_author_id', table_name='application_notes')
    op.drop_index('ix_application_notes_application_id', table_name='application_notes')

    # Drop table
    op.drop_table('application_notes')
