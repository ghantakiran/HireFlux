"""add_note_type_field_to_application_notes

Revision ID: 0f28d1979fa3
Revises: 20251116_0009
Create Date: 2025-11-16 21:21:05.444711

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0f28d1979fa3'
down_revision = '20251116_0009'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add note_type column to application_notes table
    op.add_column(
        'application_notes',
        sa.Column(
            'note_type',
            sa.String(length=50),
            nullable=False,
            server_default='internal',
        )
    )

    # Add index on note_type for filtering
    op.create_index(
        'ix_application_notes_note_type',
        'application_notes',
        ['note_type']
    )


def downgrade() -> None:
    # Remove index
    op.drop_index('ix_application_notes_note_type', table_name='application_notes')

    # Remove note_type column
    op.drop_column('application_notes', 'note_type')
