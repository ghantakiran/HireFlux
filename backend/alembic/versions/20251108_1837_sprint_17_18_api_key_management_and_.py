"""sprint_17_18_api_key_management_and_webhooks

Revision ID: 8539e112fb57
Revises: g7h8i9j0k1l2
Create Date: 2025-11-08 18:37:58.958859

Sprint 17-18: Enterprise Features & Scale
- API key management for public API access
- Webhook system for event notifications
- Usage tracking and rate limiting
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '8539e112fb57'
down_revision = 'g7h8i9j0k1l2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create api_keys table
    op.create_table(
        'api_keys',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(255), nullable=False, comment='Human-readable name for the API key'),
        sa.Column('key_prefix', sa.String(20), nullable=False, comment='First 8 chars of key for identification (e.g., "hf_live_")'),
        sa.Column('key_hash', sa.String(255), nullable=False, comment='SHA-256 hash of the full API key'),
        sa.Column('permissions', postgresql.JSONB, nullable=False, server_default='{}', comment='Scoped permissions: {"jobs": ["read", "write"], "candidates": ["read"]}'),
        sa.Column('rate_limit_tier', sa.String(50), nullable=False, server_default='standard', comment='Rate limit tier: "standard", "elevated", "enterprise"'),
        sa.Column('rate_limit_requests_per_minute', sa.Integer, nullable=False, server_default='60'),
        sa.Column('rate_limit_requests_per_hour', sa.Integer, nullable=False, server_default='3000'),
        sa.Column('last_used_at', sa.DateTime, nullable=True, comment='Last API request timestamp'),
        sa.Column('last_used_ip', sa.String(45), nullable=True, comment='Last IP address that used this key'),
        sa.Column('expires_at', sa.DateTime, nullable=True, comment='Optional expiration date'),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
        sa.Column('revoked_at', sa.DateTime, nullable=True, comment='Timestamp when key was revoked'),
        sa.Column('revoked_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='active', comment='Status: "active", "revoked", "expired"'),
    )

    # Create indexes for api_keys
    op.create_index('ix_api_keys_company_id', 'api_keys', ['company_id'])
    op.create_index('ix_api_keys_key_prefix', 'api_keys', ['key_prefix'])
    op.create_index('ix_api_keys_status', 'api_keys', ['status'])
    op.create_index('ix_api_keys_created_at', 'api_keys', ['created_at'])

    # Create api_key_usage table for rate limiting and analytics
    op.create_table(
        'api_key_usage',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('api_key_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('api_keys.id', ondelete='CASCADE'), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('endpoint', sa.String(255), nullable=False, comment='API endpoint path (e.g., "/api/v1/jobs")'),
        sa.Column('method', sa.String(10), nullable=False, comment='HTTP method (GET, POST, PUT, DELETE)'),
        sa.Column('status_code', sa.Integer, nullable=False, comment='HTTP status code'),
        sa.Column('response_time_ms', sa.Integer, nullable=True, comment='Response time in milliseconds'),
        sa.Column('request_size_bytes', sa.Integer, nullable=True, comment='Request payload size'),
        sa.Column('response_size_bytes', sa.Integer, nullable=True, comment='Response payload size'),
        sa.Column('ip_address', sa.String(45), nullable=True, comment='Client IP address'),
        sa.Column('user_agent', sa.String(500), nullable=True, comment='Client user agent'),
        sa.Column('error_message', sa.Text, nullable=True, comment='Error message if request failed'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()'), comment='Request timestamp'),
    )

    # Create indexes for api_key_usage (for rate limiting queries)
    op.create_index('ix_api_key_usage_api_key_id', 'api_key_usage', ['api_key_id'])
    op.create_index('ix_api_key_usage_company_id', 'api_key_usage', ['company_id'])
    op.create_index('ix_api_key_usage_created_at', 'api_key_usage', ['created_at'])
    op.create_index('ix_api_key_usage_endpoint', 'api_key_usage', ['endpoint'])
    # Composite index for rate limiting queries
    op.create_index('ix_api_key_usage_rate_limit', 'api_key_usage', ['api_key_id', 'created_at'])

    # Create webhooks table
    op.create_table(
        'webhooks',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('url', sa.String(500), nullable=False, comment='Webhook endpoint URL'),
        sa.Column('description', sa.Text, nullable=True, comment='Human-readable description'),
        sa.Column('events', postgresql.JSONB, nullable=False, server_default='[]', comment='Array of subscribed events: ["application.created", "job.published"]'),
        sa.Column('secret', sa.String(255), nullable=False, comment='HMAC secret for signature verification'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('retry_policy', postgresql.JSONB, nullable=False, server_default='{"max_attempts": 3, "backoff_seconds": [60, 300, 900]}', comment='Retry configuration'),
        sa.Column('headers', postgresql.JSONB, nullable=True, comment='Custom headers to include in webhook requests'),
        sa.Column('last_triggered_at', sa.DateTime, nullable=True, comment='Last successful delivery timestamp'),
        sa.Column('failure_count', sa.Integer, nullable=False, server_default='0', comment='Consecutive failure count'),
        sa.Column('disabled_at', sa.DateTime, nullable=True, comment='Auto-disabled timestamp after too many failures'),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()')),
    )

    # Create indexes for webhooks
    op.create_index('ix_webhooks_company_id', 'webhooks', ['company_id'])
    op.create_index('ix_webhooks_is_active', 'webhooks', ['is_active'])

    # Create webhook_deliveries table for tracking delivery attempts
    op.create_table(
        'webhook_deliveries',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('webhook_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('webhooks.id', ondelete='CASCADE'), nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('event_type', sa.String(100), nullable=False, comment='Event type (e.g., "application.created")'),
        sa.Column('event_id', postgresql.UUID(as_uuid=True), nullable=True, comment='ID of the event entity'),
        sa.Column('payload', postgresql.JSONB, nullable=False, comment='Full webhook payload sent'),
        sa.Column('attempt_number', sa.Integer, nullable=False, server_default='1', comment='Delivery attempt number (1-based)'),
        sa.Column('status', sa.String(50), nullable=False, comment='Delivery status: "pending", "success", "failed", "retrying"'),
        sa.Column('http_status_code', sa.Integer, nullable=True, comment='HTTP response status code'),
        sa.Column('response_body', sa.Text, nullable=True, comment='Response body from webhook endpoint'),
        sa.Column('response_time_ms', sa.Integer, nullable=True, comment='Response time in milliseconds'),
        sa.Column('error_message', sa.Text, nullable=True, comment='Error message if delivery failed'),
        sa.Column('next_retry_at', sa.DateTime, nullable=True, comment='Scheduled time for next retry'),
        sa.Column('delivered_at', sa.DateTime, nullable=True, comment='Successful delivery timestamp'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('NOW()'), comment='Delivery attempt timestamp'),
    )

    # Create indexes for webhook_deliveries
    op.create_index('ix_webhook_deliveries_webhook_id', 'webhook_deliveries', ['webhook_id'])
    op.create_index('ix_webhook_deliveries_company_id', 'webhook_deliveries', ['company_id'])
    op.create_index('ix_webhook_deliveries_status', 'webhook_deliveries', ['status'])
    op.create_index('ix_webhook_deliveries_created_at', 'webhook_deliveries', ['created_at'])
    op.create_index('ix_webhook_deliveries_next_retry_at', 'webhook_deliveries', ['next_retry_at'])
    op.create_index('ix_webhook_deliveries_event_type', 'webhook_deliveries', ['event_type'])


def downgrade() -> None:
    # Drop tables in reverse order (due to foreign keys)
    op.drop_table('webhook_deliveries')
    op.drop_table('webhooks')
    op.drop_table('api_key_usage')
    op.drop_table('api_keys')
