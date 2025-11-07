"""sprint_13_14_team_collaboration_and_interview_scheduling

Revision ID: f6g7h8i9j0k1
Revises: e5f6g7h8i9j0
Create Date: 2025-11-06 14:00:00.000000

Sprint 13-14: Team Collaboration & Interview Scheduling

This migration adds:
1. Team collaboration features (RBAC, invitations, activity tracking, @mentions)
2. Enhanced interview scheduling (interviewers, feedback, availability)
3. Calendar integration support
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.sql import func
from app.db.types import GUID


# revision identifiers, used by Alembic.
revision = 'f6g7h8i9j0k1'
down_revision = 'e5f6g7h8i9j0'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Upgrade to Sprint 13-14 schema.

    Team Collaboration:
    - team_invitations: Secure token-based team invitations with 7-day expiry
    - team_activities: Audit trail of team actions with @mentions
    - team_mentions: Notification system for @mentions in activities
    - Enhanced company_members: Activity tracking and notification preferences

    Interview Scheduling:
    - Enhanced interview_schedules: Multi-interviewer support, calendar integration
    - interview_feedback: Structured feedback collection with ratings and recommendations
    - candidate_availability: Time slot management for interview scheduling
    """

    # ========================================================================
    # PART 1: Enhance existing tables
    # ========================================================================

    # Enhance company_members table (Sprint 13-14)
    op.add_column(
        'company_members',
        sa.Column('last_active_at', sa.DateTime(), nullable=True)
    )
    op.add_column(
        'company_members',
        sa.Column('notification_preferences', JSONB, nullable=True, server_default='{}')
    )

    # Enhance interview_schedules table (Sprint 13-14)
    op.add_column(
        'interview_schedules',
        sa.Column('interviewer_ids', JSONB, nullable=True)
    )
    op.add_column(
        'interview_schedules',
        sa.Column('meeting_platform', sa.String(50), nullable=True)
    )
    op.add_column(
        'interview_schedules',
        sa.Column('calendar_event_id', sa.String(255), nullable=True)
    )
    op.add_column(
        'interview_schedules',
        sa.Column('calendar_invite_sent', sa.Boolean(), server_default='false')
    )
    op.add_column(
        'interview_schedules',
        sa.Column('reminders_config', JSONB, nullable=True)
    )

    # ========================================================================
    # PART 2: Team Collaboration Tables
    # ========================================================================

    # Create team_invitations table
    op.create_table(
        'team_invitations',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('company_id', GUID(), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('invited_by', GUID(), sa.ForeignKey('company_members.id', ondelete='SET NULL'), nullable=True),
        sa.Column('invitation_token', sa.String(255), nullable=False, unique=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('status', sa.String(50), nullable=False, server_default='pending'),
        sa.Column('accepted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=func.now(), onupdate=func.now(), nullable=False),
    )

    # Indexes for team_invitations
    op.create_index('idx_team_invitations_company_id', 'team_invitations', ['company_id'])
    op.create_index('idx_team_invitations_email', 'team_invitations', ['email'])
    op.create_index('idx_team_invitations_token', 'team_invitations', ['invitation_token'])
    op.create_index('idx_team_invitations_status', 'team_invitations', ['status'])
    op.create_index('idx_team_invitations_expires_at', 'team_invitations', ['expires_at'])

    # Create team_activities table
    op.create_table(
        'team_activities',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('company_id', GUID(), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('member_id', GUID(), sa.ForeignKey('company_members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('action_type', sa.String(100), nullable=False),
        sa.Column('entity_type', sa.String(50), nullable=True),
        sa.Column('entity_id', GUID(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('activity_metadata', JSONB, nullable=True),  # Renamed from 'metadata' to avoid SQLAlchemy reserved name
        sa.Column('mentioned_members', JSONB, nullable=True),  # Array of mentioned member IDs
        sa.Column('created_at', sa.DateTime(), server_default=func.now(), nullable=False),
    )

    # Indexes for team_activities
    op.create_index('idx_team_activities_company_id', 'team_activities', ['company_id'])
    op.create_index('idx_team_activities_member_id', 'team_activities', ['member_id'])
    op.create_index('idx_team_activities_action_type', 'team_activities', ['action_type'])
    op.create_index('idx_team_activities_created_at', 'team_activities', ['created_at'])
    op.create_index('idx_team_activities_entity', 'team_activities', ['entity_type', 'entity_id'])

    # Create team_mentions table
    op.create_table(
        'team_mentions',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('activity_id', GUID(), sa.ForeignKey('team_activities.id', ondelete='CASCADE'), nullable=False),
        sa.Column('mentioned_member_id', GUID(), sa.ForeignKey('company_members.id', ondelete='CASCADE'), nullable=False),
        sa.Column('read', sa.Boolean(), server_default='false'),
        sa.Column('read_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=func.now(), nullable=False),
    )

    # Indexes for team_mentions
    op.create_index('idx_team_mentions_activity_id', 'team_mentions', ['activity_id'])
    op.create_index('idx_team_mentions_mentioned_member_id', 'team_mentions', ['mentioned_member_id'])
    op.create_index('idx_team_mentions_read', 'team_mentions', ['read'])

    # ========================================================================
    # PART 3: Interview Scheduling Tables
    # ========================================================================

    # Create interview_feedback table
    op.create_table(
        'interview_feedback',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('interview_id', GUID(), sa.ForeignKey('interview_schedules.id', ondelete='CASCADE'), nullable=False),
        sa.Column('interviewer_id', GUID(), sa.ForeignKey('company_members.id', ondelete='SET NULL'), nullable=True),
        sa.Column('application_id', GUID(), sa.ForeignKey('job_applications.id', ondelete='CASCADE'), nullable=False),

        # Rating dimensions (1-5 scale)
        sa.Column('overall_rating', sa.Integer(), nullable=True),
        sa.Column('technical_rating', sa.Integer(), nullable=True),
        sa.Column('communication_rating', sa.Integer(), nullable=True),
        sa.Column('culture_fit_rating', sa.Integer(), nullable=True),

        # Structured feedback
        sa.Column('strengths', JSONB, nullable=True),  # Array of strengths
        sa.Column('concerns', JSONB, nullable=True),  # Array of concerns
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('recommendation', sa.String(50), nullable=True),  # strong_yes, yes, maybe, no, strong_no
        sa.Column('next_steps', sa.Text(), nullable=True),

        # Submission tracking
        sa.Column('is_submitted', sa.Boolean(), server_default='false'),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=func.now(), onupdate=func.now(), nullable=False),
    )

    # Indexes for interview_feedback
    op.create_index('idx_interview_feedback_interview_id', 'interview_feedback', ['interview_id'])
    op.create_index('idx_interview_feedback_interviewer_id', 'interview_feedback', ['interviewer_id'])
    op.create_index('idx_interview_feedback_application_id', 'interview_feedback', ['application_id'])
    op.create_index('idx_interview_feedback_submitted', 'interview_feedback', ['is_submitted'])

    # Create candidate_availability table
    op.create_table(
        'candidate_availability',
        sa.Column('id', GUID(), primary_key=True),
        sa.Column('application_id', GUID(), sa.ForeignKey('job_applications.id', ondelete='CASCADE'), nullable=False),
        sa.Column('candidate_id', GUID(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),

        # Availability data
        sa.Column('available_slots', JSONB, nullable=False),  # Array of {start, end} time slots
        sa.Column('timezone', sa.String(100), nullable=False),
        sa.Column('preferred_platform', sa.String(50), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),

        # Request tracking
        sa.Column('requested_at', sa.DateTime(), server_default=func.now(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), server_default=func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=func.now(), onupdate=func.now(), nullable=False),
    )

    # Indexes for candidate_availability
    op.create_index('idx_candidate_availability_application_id', 'candidate_availability', ['application_id'])
    op.create_index('idx_candidate_availability_candidate_id', 'candidate_availability', ['candidate_id'])
    op.create_index('idx_candidate_availability_expires_at', 'candidate_availability', ['expires_at'])


def downgrade() -> None:
    """
    Downgrade from Sprint 13-14 schema.

    Removes all Sprint 13-14 features and reverts enhanced columns.
    """

    # ========================================================================
    # PART 1: Drop new tables (reverse order of creation)
    # ========================================================================

    # Drop candidate_availability table
    op.drop_index('idx_candidate_availability_expires_at', 'candidate_availability')
    op.drop_index('idx_candidate_availability_candidate_id', 'candidate_availability')
    op.drop_index('idx_candidate_availability_application_id', 'candidate_availability')
    op.drop_table('candidate_availability')

    # Drop interview_feedback table
    op.drop_index('idx_interview_feedback_submitted', 'interview_feedback')
    op.drop_index('idx_interview_feedback_application_id', 'interview_feedback')
    op.drop_index('idx_interview_feedback_interviewer_id', 'interview_feedback')
    op.drop_index('idx_interview_feedback_interview_id', 'interview_feedback')
    op.drop_table('interview_feedback')

    # Drop team_mentions table
    op.drop_index('idx_team_mentions_read', 'team_mentions')
    op.drop_index('idx_team_mentions_mentioned_member_id', 'team_mentions')
    op.drop_index('idx_team_mentions_activity_id', 'team_mentions')
    op.drop_table('team_mentions')

    # Drop team_activities table
    op.drop_index('idx_team_activities_entity', 'team_activities')
    op.drop_index('idx_team_activities_created_at', 'team_activities')
    op.drop_index('idx_team_activities_action_type', 'team_activities')
    op.drop_index('idx_team_activities_member_id', 'team_activities')
    op.drop_index('idx_team_activities_company_id', 'team_activities')
    op.drop_table('team_activities')

    # Drop team_invitations table
    op.drop_index('idx_team_invitations_expires_at', 'team_invitations')
    op.drop_index('idx_team_invitations_status', 'team_invitations')
    op.drop_index('idx_team_invitations_token', 'team_invitations')
    op.drop_index('idx_team_invitations_email', 'team_invitations')
    op.drop_index('idx_team_invitations_company_id', 'team_invitations')
    op.drop_table('team_invitations')

    # ========================================================================
    # PART 2: Remove enhanced columns from existing tables
    # ========================================================================

    # Remove columns from interview_schedules
    op.drop_column('interview_schedules', 'reminders_config')
    op.drop_column('interview_schedules', 'calendar_invite_sent')
    op.drop_column('interview_schedules', 'calendar_event_id')
    op.drop_column('interview_schedules', 'meeting_platform')
    op.drop_column('interview_schedules', 'interviewer_ids')

    # Remove columns from company_members
    op.drop_column('company_members', 'notification_preferences')
    op.drop_column('company_members', 'last_active_at')
