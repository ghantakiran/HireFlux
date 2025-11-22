"""add_domain_verification_fields_to_companies

Issue #67: Company Domain Verification - Prevent Fake Companies

Adds fields to companies table to support domain verification via:
- Email verification (admin@domain, postmaster@domain, webmaster@domain)
- DNS TXT record verification
- File upload verification (hireflux-verification.txt)

Revision ID: 9259f5b5bd02
Revises: 20251118_0656
Create Date: 2025-11-22 02:14:18.041564

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9259f5b5bd02'
down_revision = '20251118_0656'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add domain verification fields to companies table
    op.add_column('companies', sa.Column('domain_verified', sa.Boolean(), nullable=False, server_default='false'))
    op.add_column('companies', sa.Column('verification_token', sa.String(255), nullable=True))
    op.add_column('companies', sa.Column('verification_method', sa.String(50), nullable=True))  # 'email', 'dns', 'file'
    op.add_column('companies', sa.Column('verification_token_expires_at', sa.DateTime(), nullable=True))
    op.add_column('companies', sa.Column('verification_attempts', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('companies', sa.Column('last_verification_attempt', sa.DateTime(), nullable=True))
    op.add_column('companies', sa.Column('verified_at', sa.DateTime(), nullable=True))

    # Create index on verification_token for fast lookups
    op.create_index('ix_companies_verification_token', 'companies', ['verification_token'])

    # Create index on domain_verified for filtering verified companies
    op.create_index('ix_companies_domain_verified', 'companies', ['domain_verified'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_companies_domain_verified', table_name='companies')
    op.drop_index('ix_companies_verification_token', table_name='companies')

    # Drop columns
    op.drop_column('companies', 'verified_at')
    op.drop_column('companies', 'last_verification_attempt')
    op.drop_column('companies', 'verification_attempts')
    op.drop_column('companies', 'verification_token_expires_at')
    op.drop_column('companies', 'verification_method')
    op.drop_column('companies', 'verification_token')
    op.drop_column('companies', 'domain_verified')
