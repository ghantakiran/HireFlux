"""Sprint 17-18 Phase 3: White-Label & Branding

Revision ID: 20251108_2100_sprint_17_18_phase_3_white_label_branding
Revises: 20251108_1837_sprint_17_18_api_key_management_and_
Create Date: 2025-11-08 21:00:00.000000

Description:
    Add white-label branding support for Enterprise customers.

    Features:
    - Custom branding (logos, colors, fonts)
    - Custom domain support with DNS verification
    - Custom email templates
    - Branded career pages
    - Custom application form fields

    Tables Created:
    1. white_label_branding - Brand configuration per company
    2. white_label_application_fields - Custom application form fields
    3. white_label_domain_verification - Custom domain verification records
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251108_2100_sprint_17_18_phase_3_white_label_branding'
down_revision = '20251108_1837_sprint_17_18_api_key_management_and_'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Apply white-label branding schema changes"""

    # ========================================================================
    # TABLE 1: white_label_branding
    # ========================================================================
    op.create_table(
        'white_label_branding',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, unique=True),

        # Feature Enablement (Enterprise plan required)
        sa.Column('is_enabled', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('enabled_at', sa.TIMESTAMP(timezone=True)),

        # Brand Identity
        sa.Column('company_display_name', sa.String(255)),

        # Logos (multiple sizes for different contexts)
        sa.Column('logo_url', sa.String(500)),  # Primary logo (light background)
        sa.Column('logo_dark_url', sa.String(500)),  # Logo for dark backgrounds
        sa.Column('logo_icon_url', sa.String(500)),  # Icon/favicon (512x512)
        sa.Column('logo_email_url', sa.String(500)),  # Email header logo (600x200)

        # Color Scheme (hex colors)
        sa.Column('primary_color', sa.String(7), nullable=False, server_default='#3B82F6'),
        sa.Column('secondary_color', sa.String(7), nullable=False, server_default='#10B981'),
        sa.Column('accent_color', sa.String(7), nullable=False, server_default='#F59E0B'),
        sa.Column('text_color', sa.String(7), nullable=False, server_default='#1F2937'),
        sa.Column('background_color', sa.String(7), nullable=False, server_default='#FFFFFF'),

        # Typography
        sa.Column('font_family', sa.String(100), nullable=False, server_default='Inter'),
        sa.Column('heading_font_family', sa.String(100)),

        # Custom Domain
        sa.Column('custom_domain', sa.String(255)),
        sa.Column('custom_domain_verified', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('custom_domain_verification_token', sa.String(255)),
        sa.Column('custom_domain_ssl_enabled', sa.Boolean, nullable=False, server_default='false'),

        # Email Branding
        sa.Column('email_from_name', sa.String(255)),
        sa.Column('email_from_address', sa.String(255)),
        sa.Column('email_reply_to', sa.String(255)),
        sa.Column('email_footer_text', sa.Text),
        sa.Column('email_header_html', sa.Text),

        # Career Page Customization
        sa.Column('career_page_enabled', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('career_page_slug', sa.String(100)),
        sa.Column('career_page_title', sa.String(255)),
        sa.Column('career_page_description', sa.Text),
        sa.Column('career_page_header_html', sa.Text),
        sa.Column('career_page_footer_html', sa.Text),

        # Social Media Links
        sa.Column('social_links', postgresql.JSONB, server_default='{}'),

        # Custom CSS (advanced customization)
        sa.Column('custom_css', sa.Text),

        # Feature Flags
        sa.Column('hide_hireflux_branding', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('use_custom_application_form', sa.Boolean, nullable=False, server_default='false'),

        # Metadata
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # Indexes for white_label_branding
    op.create_index('idx_white_label_branding_company', 'white_label_branding', ['company_id'])
    op.create_index('idx_white_label_branding_custom_domain', 'white_label_branding', ['custom_domain'])
    op.create_index('idx_white_label_branding_enabled', 'white_label_branding', ['is_enabled'])

    # ========================================================================
    # TABLE 2: white_label_application_fields
    # ========================================================================
    op.create_table(
        'white_label_application_fields',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),

        # Field Configuration
        sa.Column('field_name', sa.String(100), nullable=False),
        sa.Column('field_label', sa.String(255), nullable=False),
        sa.Column('field_type', sa.String(50), nullable=False),  # "text", "textarea", "select", "checkbox", "file"
        sa.Column('field_options', postgresql.JSONB),  # For select/radio: ["Option 1", "Option 2"]

        sa.Column('is_required', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('display_order', sa.Integer, nullable=False, server_default='0'),

        sa.Column('help_text', sa.Text),

        # Status
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),

        # Metadata
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # Indexes for white_label_application_fields
    op.create_index('idx_white_label_fields_company', 'white_label_application_fields', ['company_id'])
    op.create_index('idx_white_label_fields_active', 'white_label_application_fields', ['is_active'])
    op.create_index('idx_white_label_fields_display_order', 'white_label_application_fields', ['company_id', 'display_order'])

    # ========================================================================
    # TABLE 3: white_label_domain_verification
    # ========================================================================
    op.create_table(
        'white_label_domain_verification',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),

        # Domain Information
        sa.Column('domain', sa.String(255), nullable=False),
        sa.Column('verification_method', sa.String(50)),  # "dns_txt", "dns_cname", "file_upload"
        sa.Column('verification_token', sa.String(255), nullable=False),

        # Verification Status
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),  # "pending", "verified", "failed"
        sa.Column('verified_at', sa.TIMESTAMP(timezone=True)),
        sa.Column('last_check_at', sa.TIMESTAMP(timezone=True)),

        # DNS Configuration
        sa.Column('dns_records', postgresql.JSONB),  # Required DNS records to add
        sa.Column('error_message', sa.Text),

        # Metadata
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # Indexes for white_label_domain_verification
    op.create_index('idx_white_label_domain_company', 'white_label_domain_verification', ['company_id'])
    op.create_index('idx_white_label_domain_status', 'white_label_domain_verification', ['status'])
    op.create_index('idx_white_label_domain_domain', 'white_label_domain_verification', ['domain'])


def downgrade() -> None:
    """Revert white-label branding schema changes"""

    # Drop tables in reverse order (respect foreign keys)
    op.drop_index('idx_white_label_domain_domain', table_name='white_label_domain_verification')
    op.drop_index('idx_white_label_domain_status', table_name='white_label_domain_verification')
    op.drop_index('idx_white_label_domain_company', table_name='white_label_domain_verification')
    op.drop_table('white_label_domain_verification')

    op.drop_index('idx_white_label_fields_display_order', table_name='white_label_application_fields')
    op.drop_index('idx_white_label_fields_active', table_name='white_label_application_fields')
    op.drop_index('idx_white_label_fields_company', table_name='white_label_application_fields')
    op.drop_table('white_label_application_fields')

    op.drop_index('idx_white_label_branding_enabled', table_name='white_label_branding')
    op.drop_index('idx_white_label_branding_custom_domain', table_name='white_label_branding')
    op.drop_index('idx_white_label_branding_company', table_name='white_label_branding')
    op.drop_table('white_label_branding')
