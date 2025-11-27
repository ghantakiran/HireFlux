"""add_messaging_system_tables_issue_70

Revision ID: 303ab86e8774
Revises: e8a30f619615
Create Date: 2025-11-26 19:49:41.389740

Database migration for Two-Way Messaging System (Issue #70)

Creates 3 tables:
1. message_threads - Conversation threads between employer and candidate
2. messages - Individual messages within threads
3. message_blocklist - User blocking for spam prevention

Business Value:
- Enable direct communication between employers and candidates
- 60% on-platform communication target
- EEOC compliance audit trail
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '303ab86e8774'
down_revision = 'e8a30f619615'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create message_threads table
    op.create_table(
        'message_threads',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('application_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('employer_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('candidate_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('subject', sa.String(500), nullable=True),
        sa.Column('last_message_at', sa.DateTime(), nullable=True),
        sa.Column('unread_count_employer', sa.Integer(), nullable=False, default=0),
        sa.Column('unread_count_candidate', sa.Integer(), nullable=False, default=0),
        sa.Column('archived_by_employer', sa.Boolean(), nullable=False, default=False),
        sa.Column('archived_by_candidate', sa.Boolean(), nullable=False, default=False),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, default=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),

        # Foreign keys
        sa.ForeignKeyConstraint(['application_id'], ['applications.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['employer_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['candidate_id'], ['users.id'], ondelete='CASCADE'),

        # Indexes for performance
        sa.Index('ix_message_threads_employer_id', 'employer_id'),
        sa.Index('ix_message_threads_candidate_id', 'candidate_id'),
        sa.Index('ix_message_threads_application_id', 'application_id'),
        sa.Index('ix_message_threads_last_message_at', 'last_message_at'),
    )

    # Create messages table
    op.create_table(
        'messages',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('thread_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('sender_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('recipient_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('subject', sa.String(500), nullable=True),
        sa.Column('body', sa.Text(), nullable=False),
        sa.Column('body_format', sa.String(20), nullable=False, default='plain'),
        sa.Column('message_type', sa.String(50), nullable=True),
        sa.Column('attachments', postgresql.JSONB(), nullable=False, default=list),
        sa.Column('is_read', sa.Boolean(), nullable=False, default=False),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('email_sent', sa.Boolean(), nullable=False, default=False),
        sa.Column('email_sent_at', sa.DateTime(), nullable=True),
        sa.Column('email_opened', sa.Boolean(), nullable=False, default=False),
        sa.Column('email_opened_at', sa.DateTime(), nullable=True),
        sa.Column('is_flagged', sa.Boolean(), nullable=False, default=False),
        sa.Column('flagged_reason', sa.String(255), nullable=True),
        sa.Column('flagged_at', sa.DateTime(), nullable=True),
        sa.Column('is_deleted', sa.Boolean(), nullable=False, default=False),
        sa.Column('deleted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),

        # Foreign keys
        sa.ForeignKeyConstraint(['thread_id'], ['message_threads.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recipient_id'], ['users.id'], ondelete='CASCADE'),

        # Indexes for performance
        sa.Index('ix_messages_thread_id', 'thread_id'),
        sa.Index('ix_messages_sender_id', 'sender_id'),
        sa.Index('ix_messages_recipient_id', 'recipient_id'),
        sa.Index('ix_messages_created_at', 'created_at'),
        sa.Index('ix_messages_is_read', 'is_read'),
    )

    # Create message_blocklist table
    op.create_table(
        'message_blocklist',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('blocker_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('blocked_id', postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column('reason', sa.String(50), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),

        # Foreign keys
        sa.ForeignKeyConstraint(['blocker_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['blocked_id'], ['users.id'], ondelete='CASCADE'),

        # Unique constraint to prevent duplicate blocks
        sa.UniqueConstraint('blocker_id', 'blocked_id', name='uq_message_blocklist_blocker_blocked'),

        # Indexes
        sa.Index('ix_message_blocklist_blocker_id', 'blocker_id'),
        sa.Index('ix_message_blocklist_blocked_id', 'blocked_id'),
    )


def downgrade() -> None:
    # Drop tables in reverse order (to respect foreign keys)
    op.drop_table('message_blocklist')
    op.drop_table('messages')
    op.drop_table('message_threads')
