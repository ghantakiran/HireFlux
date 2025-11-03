"""add_candidate_profiles_table

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2025-11-02 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.sql import func
from app.db.types import GUID


# revision identifiers, used by Alembic.
revision = 'c3d4e5f6g7h8'
down_revision = 'b2c3d4e5f6g7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Create candidate_profiles table for employer discovery.

    Job seekers can opt-in to make their profiles visible to employers
    for proactive sourcing and invitations to apply.
    """
    op.create_table(
        'candidate_profiles',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('user_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True),

        # Visibility & status
        sa.Column('visibility', sa.String(20), nullable=False, server_default='private'),  # 'public' or 'private'
        sa.Column('open_to_work', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('open_to_remote', sa.Boolean(), nullable=False, server_default='false'),

        # Profile content
        sa.Column('headline', sa.String(255)),  # "Senior Full-Stack Engineer | Python | React"
        sa.Column('bio', sa.Text()),
        sa.Column('location', sa.String(255)),
        sa.Column('profile_picture_url', sa.String(500)),

        # Skills & experience (searchable)
        sa.Column('skills', ARRAY(sa.String(100))),
        sa.Column('years_experience', sa.Integer()),
        sa.Column('experience_level', sa.String(50)),  # 'entry', 'mid', 'senior', 'lead', 'executive'

        # Preferred roles
        sa.Column('preferred_roles', ARRAY(sa.String(100))),
        sa.Column('preferred_location_type', sa.String(20)),  # 'remote', 'hybrid', 'onsite', 'any'

        # Salary expectations
        sa.Column('expected_salary_min', sa.Numeric(10, 2)),
        sa.Column('expected_salary_max', sa.Numeric(10, 2)),
        sa.Column('expected_salary_currency', sa.String(3), server_default='USD'),

        # Availability
        sa.Column('availability_status', sa.String(50), server_default='not_looking'),  # 'actively_looking', 'open_to_offers', 'not_looking'
        sa.Column('availability_start_date', sa.Date()),
        sa.Column('availability_updated_at', sa.TIMESTAMP(), server_default=func.now()),

        # Portfolio (JSONB array)
        sa.Column('portfolio', JSONB(), server_default='[]'),  # [{type, title, description, url, thumbnail}]

        # Resume summary
        sa.Column('resume_summary', sa.Text()),  # 2-3 sentence summary
        sa.Column('latest_resume_url', sa.String(500)),

        # Analytics
        sa.Column('profile_views', sa.Integer(), server_default='0'),
        sa.Column('invites_received', sa.Integer(), server_default='0'),

        # Timestamps
        sa.Column('created_at', sa.TIMESTAMP(), server_default=func.now(), nullable=False),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=func.now(), onupdate=func.now(), nullable=False),
    )

    # Create indexes for search performance
    op.create_index(
        'ix_candidate_profiles_user_id',
        'candidate_profiles',
        ['user_id'],
        unique=True
    )

    op.create_index(
        'ix_candidate_profiles_visibility',
        'candidate_profiles',
        ['visibility'],
        unique=False
    )

    op.create_index(
        'ix_candidate_profiles_open_to_work',
        'candidate_profiles',
        ['open_to_work'],
        unique=False
    )

    op.create_index(
        'ix_candidate_profiles_skills',
        'candidate_profiles',
        ['skills'],
        unique=False,
        postgresql_using='gin'  # GIN index for array containment queries
    )

    op.create_index(
        'ix_candidate_profiles_location',
        'candidate_profiles',
        ['location'],
        unique=False
    )

    op.create_index(
        'ix_candidate_profiles_experience_level',
        'candidate_profiles',
        ['experience_level'],
        unique=False
    )


def downgrade() -> None:
    """Remove candidate_profiles table"""
    # Drop indexes
    op.drop_index('ix_candidate_profiles_experience_level', table_name='candidate_profiles')
    op.drop_index('ix_candidate_profiles_location', table_name='candidate_profiles')
    op.drop_index('ix_candidate_profiles_skills', table_name='candidate_profiles')
    op.drop_index('ix_candidate_profiles_open_to_work', table_name='candidate_profiles')
    op.drop_index('ix_candidate_profiles_visibility', table_name='candidate_profiles')
    op.drop_index('ix_candidate_profiles_user_id', table_name='candidate_profiles')

    # Drop table
    op.drop_table('candidate_profiles')
