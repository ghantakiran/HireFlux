"""add_billing_tables

Revision ID: 20251023_2330
Revises: 0d287936cc84
Create Date: 2025-10-23 23:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

# revision identifiers, used by Alembic.
revision = '20251023_2330'
down_revision = '0d287936cc84'
branch_labels = None
depends_on = None


def upgrade():
    # Create credit_wallets table
    op.execute('''
        CREATE TABLE IF NOT EXISTS credit_wallets (
            id TEXT NOT NULL PRIMARY KEY,
            user_id TEXT NOT NULL UNIQUE,
            ai_credits INTEGER DEFAULT 0,
            cover_letter_credits INTEGER DEFAULT 3,
            auto_apply_credits INTEGER DEFAULT 0,
            job_suggestion_credits INTEGER DEFAULT 10,
            total_earned INTEGER DEFAULT 0,
            total_spent INTEGER DEFAULT 0,
            last_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    op.execute('CREATE INDEX IF NOT EXISTS ix_credit_wallets_user_id ON credit_wallets (user_id)')

    # Create credit_ledger table
    op.execute('''
        CREATE TABLE IF NOT EXISTS credit_ledger (
            id TEXT NOT NULL PRIMARY KEY,
            user_id TEXT NOT NULL,
            credit_type VARCHAR(50),
            amount INTEGER,
            balance_after INTEGER,
            operation VARCHAR(50),
            description TEXT,
            reference_id TEXT,
            stripe_payment_intent_id VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    op.execute('CREATE INDEX IF NOT EXISTS ix_credit_ledger_user_id ON credit_ledger (user_id)')

    # Create subscriptions table
    op.execute('''
        CREATE TABLE IF NOT EXISTS subscriptions (
            id TEXT NOT NULL PRIMARY KEY,
            user_id TEXT NOT NULL,
            stripe_customer_id VARCHAR(255),
            stripe_subscription_id VARCHAR(255) UNIQUE,
            stripe_price_id VARCHAR(255),
            plan VARCHAR(50) DEFAULT 'free',
            status VARCHAR(50) DEFAULT 'active',
            billing_interval VARCHAR(20) DEFAULT 'month',
            current_period_start TIMESTAMP,
            current_period_end TIMESTAMP,
            trial_start TIMESTAMP,
            trial_end TIMESTAMP,
            cancel_at_period_end BOOLEAN DEFAULT FALSE,
            canceled_at TIMESTAMP,
            cancellation_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    op.execute('CREATE INDEX IF NOT EXISTS ix_subscriptions_user_id ON subscriptions (user_id)')

    # Create stripe_webhook_events table
    op.execute('''
        CREATE TABLE IF NOT EXISTS stripe_webhook_events (
            id TEXT NOT NULL PRIMARY KEY,
            stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
            event_type VARCHAR(100),
            processed BOOLEAN DEFAULT FALSE,
            processed_at TIMESTAMP,
            error TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    op.execute('CREATE INDEX IF NOT EXISTS ix_stripe_webhook_events_stripe_event_id ON stripe_webhook_events (stripe_event_id)')

    # Create payment_methods table
    op.execute('''
        CREATE TABLE IF NOT EXISTS payment_methods (
            id TEXT NOT NULL PRIMARY KEY,
            user_id TEXT NOT NULL,
            stripe_payment_method_id VARCHAR(255) UNIQUE,
            type VARCHAR(50),
            card_brand VARCHAR(50),
            card_last4 VARCHAR(4),
            card_exp_month INTEGER,
            card_exp_year INTEGER,
            is_default BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    ''')
    op.execute('CREATE INDEX IF NOT EXISTS ix_payment_methods_user_id ON payment_methods (user_id)')


def downgrade():
    # Drop tables in reverse order
    op.execute('DROP TABLE IF EXISTS payment_methods')
    op.execute('DROP TABLE IF EXISTS stripe_webhook_events')
    op.execute('DROP TABLE IF EXISTS subscriptions')
    op.execute('DROP TABLE IF EXISTS credit_ledger')
    op.execute('DROP TABLE IF EXISTS credit_wallets')
