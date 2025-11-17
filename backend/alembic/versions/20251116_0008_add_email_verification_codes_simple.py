"""Add email_verification_codes table (simple)

Revision ID: 20251116_0008
Revises: 054b2a6b84ed
Create Date: 2025-11-16 00:10:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251116_0008'
down_revision = '054b2a6b84ed'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create email_verification_codes table
    op.create_table(
        'email_verification_codes',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('code', sa.String(length=6), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_valid', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('failed_attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.PrimaryKeyConstraint('id')
    )

    # Create index on email for faster lookups
    op.create_index(
        op.f('ix_email_verification_codes_email'),
        'email_verification_codes',
        ['email'],
        unique=False
    )


def downgrade() -> None:
    # Drop index
    op.drop_index(op.f('ix_email_verification_codes_email'), table_name='email_verification_codes')

    # Drop table
    op.drop_table('email_verification_codes')
