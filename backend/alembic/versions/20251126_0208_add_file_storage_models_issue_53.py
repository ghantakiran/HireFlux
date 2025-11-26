"""add_file_storage_models_issue_53

Revision ID: e8a30f619615
Revises: d28a8b9f7fc5
Create Date: 2025-11-26 02:08:38.154402

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision = 'e8a30f619615'
down_revision = 'd28a8b9f7fc5'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create file_metadata table
    op.create_table(
        'file_metadata',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('company_id', UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=True, index=True),
        sa.Column('file_type', sa.String(50), nullable=False, index=True),
        sa.Column('file_name', sa.String(255), nullable=False),
        sa.Column('s3_key', sa.String(1024), nullable=False, unique=True, index=True),
        sa.Column('s3_bucket', sa.String(255), nullable=False, server_default='hireflux-documents'),
        sa.Column('file_size', sa.Integer, nullable=False),
        sa.Column('mime_type', sa.String(100), nullable=False),
        sa.Column('file_hash', sa.String(64), nullable=True),
        sa.Column('version', sa.Integer, nullable=False, server_default='1'),
        sa.Column('is_current_version', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('replaces_file_id', UUID(as_uuid=True), sa.ForeignKey('file_metadata.id'), nullable=True),
        sa.Column('encrypted', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('virus_scan_status', sa.String(50), nullable=True),
        sa.Column('virus_scan_timestamp', sa.DateTime, nullable=True),
        sa.Column('status', sa.String(50), nullable=False, server_default='uploading'),
        sa.Column('storage_class', sa.String(50), nullable=False, server_default='STANDARD'),
        sa.Column('upload_started_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('upload_completed_at', sa.DateTime, nullable=True),
        sa.Column('last_accessed_at', sa.DateTime, nullable=True),
        sa.Column('archived_at', sa.DateTime, nullable=True),
        sa.Column('deleted_at', sa.DateTime, nullable=True),
        sa.Column('extra_metadata', sa.JSON, nullable=True),
        sa.Column('application_id', UUID(as_uuid=True), sa.ForeignKey('applications.id', ondelete='SET NULL'), nullable=True),
        sa.Column('resume_id', UUID(as_uuid=True), sa.ForeignKey('resumes.id', ondelete='SET NULL'), nullable=True),
        sa.Column('cover_letter_id', UUID(as_uuid=True), sa.ForeignKey('cover_letters.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    # Create composite indexes
    op.create_index('idx_file_user_type', 'file_metadata', ['user_id', 'file_type'])
    op.create_index('idx_file_company_type', 'file_metadata', ['company_id', 'file_type'])
    op.create_index('idx_file_status', 'file_metadata', ['status'])

    # Create file_access_logs table
    op.create_table(
        'file_access_logs',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('file_id', UUID(as_uuid=True), sa.ForeignKey('file_metadata.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('s3_key', sa.String(1024), nullable=False),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL'), nullable=True, index=True),
        sa.Column('operation', sa.String(50), nullable=False, index=True),
        sa.Column('status', sa.String(50), nullable=False),
        sa.Column('error_message', sa.String(500), nullable=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('request_id', sa.String(100), nullable=True),
        sa.Column('bytes_transferred', sa.Integer, nullable=True),
        sa.Column('duration_ms', sa.Integer, nullable=True),
        sa.Column('timestamp', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP'), index=True),
    )

    # Create composite indexes for access logs
    op.create_index('idx_access_user_operation', 'file_access_logs', ['user_id', 'operation'])
    op.create_index('idx_access_file_timestamp', 'file_access_logs', ['file_id', 'timestamp'])

    # Create presigned_urls table
    op.create_table(
        'presigned_urls',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('file_id', UUID(as_uuid=True), sa.ForeignKey('file_metadata.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('s3_key', sa.String(1024), nullable=False),
        sa.Column('url_hash', sa.String(64), nullable=False, unique=True, index=True),
        sa.Column('operation', sa.String(50), nullable=False),
        sa.Column('expiration', sa.DateTime, nullable=False, index=True),
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('ip_address', sa.String(45), nullable=True),
        sa.Column('used', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('used_at', sa.DateTime, nullable=True),
        sa.Column('use_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime, nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )

    # Create composite indexes for presigned URLs
    op.create_index('idx_presigned_user', 'presigned_urls', ['user_id', 'created_at'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('presigned_urls')
    op.drop_table('file_access_logs')
    op.drop_table('file_metadata')
