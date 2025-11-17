"""Issue #18 Part 1: Add job_templates table

Revision ID: cb77e5da119e
Revises: assessments_20251109
Create Date: 2025-11-15 20:50:30.791910

Implements Issue #18 - Database Schema for Employer MVP
Part 1: Job Templates table for reusable job descriptions

Changes:
- Add job_templates table with company relationship
- Support public and private templates
- Track template usage count
- Categories for organizing templates

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'cb77e5da119e'
down_revision = 'assessments_20251109'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create job_templates table
    op.create_table(
        'job_templates',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), nullable=True, index=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('category', sa.String(50), nullable=False, index=True),
        sa.Column('visibility', sa.String(50), nullable=False, default='private', index=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('department', sa.String(255), nullable=True),
        sa.Column('employment_type', sa.String(50), nullable=True),
        sa.Column('experience_level', sa.String(50), nullable=True),
        sa.Column('description', sa.Text, nullable=True),
        sa.Column('requirements', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('responsibilities', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('skills', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('usage_count', sa.Integer, nullable=False, default=0),
        sa.Column('created_at', sa.TIMESTAMP, server_default=sa.text('now()'), nullable=False, index=True),
        sa.Column('updated_at', sa.TIMESTAMP, server_default=sa.text('now()'), nullable=False),
    )

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_job_templates_company_id',
        'job_templates',
        'companies',
        ['company_id'],
        ['id'],
        ondelete='CASCADE'
    )

    # Add comment to table
    op.execute("""
        COMMENT ON TABLE job_templates IS 'Reusable job description templates for employers. Supports public templates (available to all) and private templates (company-specific).'
    """)


def downgrade() -> None:
    # Drop job_templates table (foreign key will be dropped automatically)
    op.drop_table('job_templates')
