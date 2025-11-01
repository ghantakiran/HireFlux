"""add_billing_tables

Revision ID: 20251023_2330
Revises: 0d287936cc84
Create Date: 2025-10-23 23:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from app.db.types import GUID

# revision identifiers, used by Alembic.
revision = '20251023_2330'
down_revision = '0d287936cc84'
branch_labels = None
depends_on = None


def upgrade():
    # Create credit_wallets table
    op.create_table('credit_wallets',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('user_id', GUID(), nullable=False),
        sa.Column('ai_credits', sa.Integer(), server_default='0', nullable=True),
        sa.Column('cover_letter_credits', sa.Integer(), server_default='3', nullable=True),
        sa.Column('auto_apply_credits', sa.Integer(), server_default='0', nullable=True),
        sa.Column('job_suggestion_credits', sa.Integer(), server_default='10', nullable=True),
        sa.Column('total_earned', sa.Integer(), server_default='0', nullable=True),
        sa.Column('total_spent', sa.Integer(), server_default='0', nullable=True),
        sa.Column('last_reset', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id')
    )
    op.create_index(op.f('ix_credit_wallets_user_id'), 'credit_wallets', ['user_id'], unique=False)

    # Create credit_ledger table (NOTE: Already exists in initial migration - skipping)
    # op.create_table('credit_ledger',
    #     sa.Column('id', GUID(), nullable=False),
    #     sa.Column('user_id', GUID(), nullable=False),
    #     sa.Column('credit_type', sa.String(length=50), nullable=True),
    #     sa.Column('amount', sa.Integer(), nullable=True),
    #     sa.Column('balance_after', sa.Integer(), nullable=True),
    #     sa.Column('operation', sa.String(length=50), nullable=True),
    #     sa.Column('description', sa.Text(), nullable=True),
    #     sa.Column('reference_id', GUID(), nullable=True),
    #     sa.Column('stripe_payment_intent_id', sa.String(length=255), nullable=True),
    #     sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
    #     sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    #     sa.PrimaryKeyConstraint('id')
    # )
    # op.create_index(op.f('ix_credit_ledger_user_id'), 'credit_ledger', ['user_id'], unique=False)

    # Create subscriptions table (NOTE: Already exists in initial migration - skipping)
    # Skipping if it already exists from initial migration
    # op.create_table('subscriptions',
    #     sa.Column('id', GUID(), nullable=False),
    #     sa.Column('user_id', GUID(), nullable=False),
    #     sa.Column('stripe_customer_id', sa.String(length=255), nullable=True),
    #     sa.Column('stripe_subscription_id', sa.String(length=255), nullable=True),
    #     sa.Column('stripe_price_id', sa.String(length=255), nullable=True),
    #     sa.Column('plan', sa.String(length=50), server_default='free', nullable=True),
    #     sa.Column('status', sa.String(length=50), server_default='active', nullable=True),
    #     sa.Column('billing_interval', sa.String(length=20), server_default='month', nullable=True),
    #     sa.Column('current_period_start', sa.TIMESTAMP(), nullable=True),
    #     sa.Column('current_period_end', sa.TIMESTAMP(), nullable=True),
    #     sa.Column('trial_start', sa.TIMESTAMP(), nullable=True),
    #     sa.Column('trial_end', sa.TIMESTAMP(), nullable=True),
    #     sa.Column('cancel_at_period_end', sa.Boolean(), server_default='FALSE', nullable=True),
    #     sa.Column('canceled_at', sa.TIMESTAMP(), nullable=True),
    #     sa.Column('cancellation_reason', sa.Text(), nullable=True),
    #     sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
    #     sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
    #     sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    #     sa.PrimaryKeyConstraint('id'),
    #     sa.UniqueConstraint('stripe_subscription_id')
    # )
    # op.create_index(op.f('ix_subscriptions_user_id'), 'subscriptions', ['user_id'], unique=False)

    # Create stripe_webhook_events table
    op.create_table('stripe_webhook_events',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('stripe_event_id', sa.String(length=255), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=True),
        sa.Column('processed', sa.Boolean(), server_default='FALSE', nullable=True),
        sa.Column('processed_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stripe_event_id')
    )
    op.create_index(op.f('ix_stripe_webhook_events_stripe_event_id'), 'stripe_webhook_events', ['stripe_event_id'], unique=False)

    # Create payment_methods table
    op.create_table('payment_methods',
        sa.Column('id', GUID(), nullable=False),
        sa.Column('user_id', GUID(), nullable=False),
        sa.Column('stripe_payment_method_id', sa.String(length=255), nullable=True),
        sa.Column('type', sa.String(length=50), nullable=True),
        sa.Column('card_brand', sa.String(length=50), nullable=True),
        sa.Column('card_last4', sa.String(length=4), nullable=True),
        sa.Column('card_exp_month', sa.Integer(), nullable=True),
        sa.Column('card_exp_year', sa.Integer(), nullable=True),
        sa.Column('is_default', sa.Boolean(), server_default='FALSE', nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.text('CURRENT_TIMESTAMP'), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('stripe_payment_method_id')
    )
    op.create_index(op.f('ix_payment_methods_user_id'), 'payment_methods', ['user_id'], unique=False)


def downgrade():
    # Drop tables in reverse order (only tables created by this migration)
    op.drop_index(op.f('ix_payment_methods_user_id'), table_name='payment_methods')
    op.drop_table('payment_methods')
    op.drop_index(op.f('ix_stripe_webhook_events_stripe_event_id'), table_name='stripe_webhook_events')
    op.drop_table('stripe_webhook_events')
    # Subscriptions table is from initial migration - don't drop
    # op.drop_index(op.f('ix_subscriptions_user_id'), table_name='subscriptions')
    # op.drop_table('subscriptions')
    # Credit ledger table is from initial migration - don't drop
    # op.drop_index(op.f('ix_credit_ledger_user_id'), table_name='credit_ledger')
    # op.drop_table('credit_ledger')
    op.drop_index(op.f('ix_credit_wallets_user_id'), table_name='credit_wallets')
    op.drop_table('credit_wallets')
