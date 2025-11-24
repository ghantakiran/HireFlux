"""add_email_delivery_tracking_models_issue_52

Revision ID: d28a8b9f7fc5
Revises: cee773b221a9
Create Date: 2025-11-23 14:08:29.010425

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON, ENUM


# revision identifiers, used by Alembic.
revision = 'd28a8b9f7fc5'
down_revision = 'cee773b221a9'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create email delivery status enum (if not exists)
    from sqlalchemy import inspect
    conn = op.get_bind()
    inspector = inspect(conn)

    # Check if enum type exists
    enum_exists = conn.execute(sa.text(
        "SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'emaildeliverystatus')"
    )).scalar()

    if not enum_exists:
        email_delivery_status_enum = sa.Enum(
            'queued', 'sent', 'delivered', 'bounced', 'soft_bounced', 'complained', 'opened', 'clicked',
            name='emaildeliverystatus'
        )
        email_delivery_status_enum.create(op.get_bind())

    # Use the enum type
    email_delivery_status_enum = sa.Enum(
        'queued', 'sent', 'delivered', 'bounced', 'soft_bounced', 'complained', 'opened', 'clicked',
        name='emaildeliverystatus'
    )

    # Create email_delivery_logs table
    op.create_table(
        'email_delivery_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('to_email', sa.String(255), nullable=False),
        sa.Column('from_email', sa.String(255), nullable=False),
        sa.Column('subject', sa.String(500), nullable=False),
        sa.Column('email_type', sa.String(50), nullable=False),
        sa.Column('template_name', sa.String(100), nullable=True),
        sa.Column('message_id', sa.String(255), nullable=True),
        sa.Column('status', sa.Enum('queued', 'sent', 'delivered', 'bounced', 'soft_bounced', 'complained', 'opened', 'clicked', name='emaildeliverystatus', create_type=False), nullable=False, server_default='queued'),
        sa.Column('queued_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('delivered_at', sa.DateTime(), nullable=True),
        sa.Column('bounced_at', sa.DateTime(), nullable=True),
        sa.Column('complained_at', sa.DateTime(), nullable=True),
        sa.Column('opened_at', sa.DateTime(), nullable=True),
        sa.Column('clicked_at', sa.DateTime(), nullable=True),
        sa.Column('bounce_type', sa.String(50), nullable=True),
        sa.Column('bounce_reason', sa.Text(), nullable=True),
        sa.Column('bounce_code', sa.String(50), nullable=True),
        sa.Column('retry_count', sa.Integer(), server_default='0'),
        sa.Column('max_retries', sa.Integer(), server_default='3'),
        sa.Column('next_retry_at', sa.DateTime(), nullable=True),
        sa.Column('open_count', sa.Integer(), server_default='0'),
        sa.Column('click_count', sa.Integer(), server_default='0'),
        sa.Column('last_opened_at', sa.DateTime(), nullable=True),
        sa.Column('last_clicked_at', sa.DateTime(), nullable=True),
        sa.Column('clicked_urls', JSON, nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_code', sa.String(50), nullable=True),
        sa.Column('webhook_events', JSON, nullable=True),
        sa.Column('extra_metadata', JSON, nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
    )

    # Create indexes
    op.create_index('ix_email_delivery_logs_user_id', 'email_delivery_logs', ['user_id'])
    op.create_index('ix_email_delivery_logs_to_email', 'email_delivery_logs', ['to_email'])
    op.create_index('ix_email_delivery_logs_email_type', 'email_delivery_logs', ['email_type'])
    op.create_index('ix_email_delivery_logs_message_id', 'email_delivery_logs', ['message_id'], unique=True)
    op.create_index('ix_email_delivery_logs_status', 'email_delivery_logs', ['status'])
    op.create_index('ix_email_delivery_logs_created_at', 'email_delivery_logs', ['created_at'])
    op.create_index('ix_email_delivery_logs_status_created', 'email_delivery_logs', ['status', 'created_at'])
    op.create_index('ix_email_delivery_logs_email_type_status', 'email_delivery_logs', ['email_type', 'status'])
    op.create_index('ix_email_delivery_logs_user_created', 'email_delivery_logs', ['user_id', 'created_at'])

    # Create email_blocklist table
    op.create_table(
        'email_blocklist',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('reason', sa.String(50), nullable=False),
        sa.Column('reason_detail', sa.Text(), nullable=True),
        sa.Column('blocked_by_system', sa.Boolean(), server_default='true'),
        sa.Column('blocked_by_user_id', sa.Integer(), nullable=True),
        sa.Column('blocked_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('last_attempt_at', sa.DateTime(), nullable=True),
        sa.Column('attempt_count', sa.Integer(), server_default='1'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['blocked_by_user_id'], ['users.id']),
    )
    op.create_index('ix_email_blocklist_email', 'email_blocklist', ['email'], unique=True)
    op.create_index('ix_email_blocklist_reason', 'email_blocklist', ['reason'])

    # Create email_unsubscribes table
    op.create_table(
        'email_unsubscribes',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('email_type', sa.String(50), nullable=True),
        sa.Column('unsubscribe_all', sa.Boolean(), server_default='false'),
        sa.Column('unsubscribed_via', sa.String(50), nullable=False),
        sa.Column('message_id', sa.String(255), nullable=True),
        sa.Column('ip_address', sa.String(50), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('unsubscribed_at', sa.DateTime(), server_default=sa.func.now()),
        sa.Column('resubscribed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_email_unsubscribes_email', 'email_unsubscribes', ['email'])
    op.create_index('ix_email_unsubscribes_email_type', 'email_unsubscribes', ['email', 'email_type'])


def downgrade() -> None:
    # Drop tables
    op.drop_index('ix_email_unsubscribes_email_type', table_name='email_unsubscribes')
    op.drop_index('ix_email_unsubscribes_email', table_name='email_unsubscribes')
    op.drop_table('email_unsubscribes')

    op.drop_index('ix_email_blocklist_reason', table_name='email_blocklist')
    op.drop_index('ix_email_blocklist_email', table_name='email_blocklist')
    op.drop_table('email_blocklist')

    op.drop_index('ix_email_delivery_logs_user_created', table_name='email_delivery_logs')
    op.drop_index('ix_email_delivery_logs_email_type_status', table_name='email_delivery_logs')
    op.drop_index('ix_email_delivery_logs_status_created', table_name='email_delivery_logs')
    op.drop_index('ix_email_delivery_logs_created_at', table_name='email_delivery_logs')
    op.drop_index('ix_email_delivery_logs_status', table_name='email_delivery_logs')
    op.drop_index('ix_email_delivery_logs_message_id', table_name='email_delivery_logs')
    op.drop_index('ix_email_delivery_logs_email_type', table_name='email_delivery_logs')
    op.drop_index('ix_email_delivery_logs_to_email', table_name='email_delivery_logs')
    op.drop_index('ix_email_delivery_logs_user_id', table_name='email_delivery_logs')
    op.drop_table('email_delivery_logs')

    # Drop enum
    sa.Enum(name='emaildeliverystatus').drop(op.get_bind())
