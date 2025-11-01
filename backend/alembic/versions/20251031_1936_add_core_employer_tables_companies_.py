"""Add core employer tables (companies, company_members, company_subscriptions)

Revision ID: cb0688fac175
Revises: 78c008adc024
Create Date: 2025-10-31 19:36:58.715778

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'cb0688fac175'
down_revision = '78c008adc024'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add user_type column to existing users table
    op.add_column('users', sa.Column('user_type', sa.String(20), nullable=False, server_default='job_seeker'))

    # Create companies table
    op.create_table(
        'companies',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('domain', sa.String(255), nullable=True),
        sa.Column('industry', sa.String(100), nullable=True),
        sa.Column('size', sa.String(50), nullable=True),
        sa.Column('location', sa.String(255), nullable=True),
        sa.Column('website', sa.String(255), nullable=True),
        sa.Column('logo_url', sa.String(500), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('subscription_tier', sa.String(50), nullable=True, server_default='starter'),
        sa.Column('subscription_status', sa.String(50), nullable=True, server_default='active'),
        sa.Column('trial_ends_at', sa.DateTime(), nullable=True),
        sa.Column('billing_email', sa.String(255), nullable=True),
        sa.Column('max_active_jobs', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('max_candidate_views', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('max_team_members', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('domain')
    )
    op.create_index('idx_companies_domain', 'companies', ['domain'])
    op.create_index('idx_companies_subscription_tier', 'companies', ['subscription_tier'])

    # Create company_members table
    op.create_table(
        'company_members',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('permissions', sa.JSON(), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='active'),
        sa.Column('invited_by', sa.UUID(), nullable=True),
        sa.Column('invited_at', sa.DateTime(), nullable=True),
        sa.Column('joined_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['invited_by'], ['users.id'], ondelete='SET NULL'),
        sa.UniqueConstraint('company_id', 'user_id', name='uq_company_member')
    )
    op.create_index('idx_company_members_company', 'company_members', ['company_id'])
    op.create_index('idx_company_members_user', 'company_members', ['user_id'])
    op.create_index('idx_company_members_role', 'company_members', ['role'])

    # Create company_subscriptions table
    op.create_table(
        'company_subscriptions',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('stripe_subscription_id', sa.String(255), nullable=True),
        sa.Column('stripe_customer_id', sa.String(255), nullable=True),
        sa.Column('plan_tier', sa.String(50), nullable=False),
        sa.Column('plan_interval', sa.String(20), nullable=True),
        sa.Column('plan_amount', sa.Numeric(10, 2), nullable=True),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('current_period_start', sa.DateTime(), nullable=True),
        sa.Column('current_period_end', sa.DateTime(), nullable=True),
        sa.Column('cancel_at_period_end', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('jobs_posted_this_month', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('candidate_views_this_month', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('NOW()')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('stripe_subscription_id')
    )
    op.create_index('idx_company_subscriptions_company', 'company_subscriptions', ['company_id'])
    op.create_index('idx_company_subscriptions_stripe', 'company_subscriptions', ['stripe_subscription_id'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_index('idx_company_subscriptions_stripe', table_name='company_subscriptions')
    op.drop_index('idx_company_subscriptions_company', table_name='company_subscriptions')
    op.drop_table('company_subscriptions')

    op.drop_index('idx_company_members_role', table_name='company_members')
    op.drop_index('idx_company_members_user', table_name='company_members')
    op.drop_index('idx_company_members_company', table_name='company_members')
    op.drop_table('company_members')

    op.drop_index('idx_companies_subscription_tier', table_name='companies')
    op.drop_index('idx_companies_domain', table_name='companies')
    op.drop_table('companies')

    # Remove user_type column from users table
    op.drop_column('users', 'user_type')
