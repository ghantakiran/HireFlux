"""Add company profile settings fields

Revision ID: 20251116_0009
Revises: 20251116_0008
Create Date: 2025-11-16

Sprint 19-20 Week 39 Day 4 - Issue #21: Company Profile Management & Settings

Adds fields for:
- Social links (LinkedIn, Twitter)
- Timezone settings
- Notification preferences (JSON)
- Default job template reference
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251116_0009'
down_revision = '20251116_0008'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add social links columns
    op.add_column('companies', sa.Column('linkedin_url', sa.String(length=255), nullable=True))
    op.add_column('companies', sa.Column('twitter_url', sa.String(length=255), nullable=True))

    # Add timezone setting (defaults to UTC)
    op.add_column('companies', sa.Column('timezone', sa.String(length=50), nullable=True, server_default='UTC'))

    # Add notification settings as JSON
    # Format: {"email": {"new_application": true, "stage_change": true, "team_mention": true, "weekly_digest": false}, "in_app": {"new_application": true, "team_activity": true}}
    op.add_column('companies', sa.Column('notification_settings', postgresql.JSON(astext_type=sa.Text()), nullable=True))

    # Add default job template ID (foreign key to job_templates table)
    op.add_column('companies', sa.Column('default_job_template_id', postgresql.UUID(as_uuid=True), nullable=True))

    # Add foreign key constraint for default_job_template_id
    # Note: This will only work if job_templates table exists. If not, this will be added in a future migration when that table is created.
    try:
        op.create_foreign_key(
            'fk_companies_default_job_template_id',
            'companies',
            'job_templates',
            ['default_job_template_id'],
            ['id'],
            ondelete='SET NULL'
        )
    except Exception:
        # Table doesn't exist yet, will be added later
        pass


def downgrade() -> None:
    # Drop foreign key constraint if it exists
    try:
        op.drop_constraint('fk_companies_default_job_template_id', 'companies', type_='foreignkey')
    except Exception:
        pass

    # Drop columns
    op.drop_column('companies', 'default_job_template_id')
    op.drop_column('companies', 'notification_settings')
    op.drop_column('companies', 'timezone')
    op.drop_column('companies', 'twitter_url')
    op.drop_column('companies', 'linkedin_url')
