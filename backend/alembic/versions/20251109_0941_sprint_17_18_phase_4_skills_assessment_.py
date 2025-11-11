"""Sprint 17-18 Phase 4: Skills Assessment & Testing Platform

Revision ID: assessments_20251109
Revises: wl_branding_20251108
Create Date: 2025-11-09 09:41:00.000000

Description:
    Add skills assessment and testing platform for Enterprise/Professional plans.

    Features:
    - Pre-screening assessments (MCQ, coding, text, file upload)
    - Auto-grading with partial credit support
    - Manual grading for subjective questions
    - Code execution integration (Judge0/Piston API)
    - Anti-cheating measures (tab switching, time limits, IP tracking)
    - Question bank for reusable questions
    - Assessment analytics and reporting

    Tables Created:
    1. assessments - Main assessment configuration
    2. assessment_questions - Questions for each assessment
    3. assessment_attempts - Candidate attempts tracking
    4. assessment_responses - Individual question responses
    5. question_bank - Reusable question library
    6. job_assessment_requirements - Link assessments to jobs
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'assessments_20251109'
down_revision = 'wl_branding_20251108'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Apply skills assessment schema changes"""

    # ========================================================================
    # TABLE 1: assessments
    # Main assessment configuration and metadata
    # ========================================================================
    op.create_table(
        'assessments',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),

        # Basic Information
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text),
        sa.Column('assessment_type', sa.String(50), nullable=False),  # "pre_screening", "technical", "personality", "skills_test"
        sa.Column('category', sa.String(100)),  # "Engineering", "Sales", "Marketing"

        # Configuration
        sa.Column('time_limit_minutes', sa.Integer),  # NULL = no time limit
        sa.Column('passing_score_percentage', sa.DECIMAL(5, 2), server_default='70.00'),
        sa.Column('max_attempts', sa.Integer, server_default='1'),

        # Question Behavior
        sa.Column('randomize_questions', sa.Boolean, server_default='false'),
        sa.Column('randomize_options', sa.Boolean, server_default='false'),
        sa.Column('show_correct_answers', sa.Boolean, server_default='false'),  # After submission
        sa.Column('show_results_immediately', sa.Boolean, server_default='true'),

        # Anti-Cheating / Proctoring
        sa.Column('enable_proctoring', sa.Boolean, server_default='false'),
        sa.Column('allow_tab_switching', sa.Boolean, server_default='true'),
        sa.Column('max_tab_switches', sa.Integer, server_default='5'),
        sa.Column('require_webcam', sa.Boolean, server_default='false'),
        sa.Column('track_ip_address', sa.Boolean, server_default='true'),

        # Status & Publishing
        sa.Column('status', sa.String(50), nullable=False, server_default='draft'),  # "draft", "published", "archived", "deleted"
        sa.Column('published_at', sa.TIMESTAMP(timezone=True)),

        # Analytics
        sa.Column('total_attempts', sa.Integer, server_default='0'),
        sa.Column('total_completions', sa.Integer, server_default='0'),
        sa.Column('avg_score', sa.DECIMAL(5, 2)),
        sa.Column('pass_rate', sa.DECIMAL(5, 2)),  # Percentage of attempts that passed
        sa.Column('avg_time_minutes', sa.Integer),

        # Metadata
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL')),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),

        # Indexes
        sa.Index('idx_assessments_company_id', 'company_id'),
        sa.Index('idx_assessments_status', 'status'),
        sa.Index('idx_assessments_assessment_type', 'assessment_type'),
        sa.Index('idx_assessments_created_at', 'created_at'),
    )

    # ========================================================================
    # TABLE 2: assessment_questions
    # Questions belonging to each assessment
    # ========================================================================
    op.create_table(
        'assessment_questions',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('assessment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assessments.id', ondelete='CASCADE'), nullable=False),

        # Question Content
        sa.Column('question_text', sa.Text, nullable=False),
        sa.Column('question_type', sa.String(50), nullable=False),  # "mcq_single", "mcq_multiple", "coding", "text", "file_upload"
        sa.Column('description', sa.Text),  # Additional context/instructions

        # MCQ Options (JSON array)
        sa.Column('options', postgresql.JSONB),  # ["Option A", "Option B", "Option C", "Option D"]
        sa.Column('correct_answers', postgresql.JSONB),  # ["Option B"] for single, ["Option A", "Option C"] for multiple

        # Coding Challenge Fields
        sa.Column('coding_language', sa.String(50)),  # "python", "javascript", "java", "cpp", "go"
        sa.Column('starter_code', sa.Text),  # Pre-filled code template
        sa.Column('solution_code', sa.Text),  # Reference solution (hidden from candidate)
        sa.Column('test_cases', postgresql.JSONB),  # [{"input": "...", "expected_output": "...", "points": 5, "is_hidden": false}]
        sa.Column('execution_timeout_seconds', sa.Integer, server_default='10'),

        # File Upload Fields
        sa.Column('allowed_file_types', postgresql.ARRAY(sa.String(50))),  # ["pdf", "docx", "zip"]
        sa.Column('max_file_size_mb', sa.Integer, server_default='10'),

        # Scoring
        sa.Column('points', sa.Integer, nullable=False, server_default='10'),
        sa.Column('is_required', sa.Boolean, server_default='true'),
        sa.Column('allow_partial_credit', sa.Boolean, server_default='true'),  # For MCQ multiple

        # Metadata
        sa.Column('difficulty', sa.String(20)),  # "easy", "medium", "hard"
        sa.Column('category', sa.String(100)),  # "Data Structures", "Algorithms", "System Design"
        sa.Column('tags', postgresql.ARRAY(sa.String(50))),  # ["python", "recursion", "dynamic-programming"]
        sa.Column('display_order', sa.Integer, nullable=False),

        # Timestamps
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),

        # Indexes
        sa.Index('idx_assessment_questions_assessment_id', 'assessment_id'),
        sa.Index('idx_assessment_questions_question_type', 'question_type'),
        sa.Index('idx_assessment_questions_display_order', 'assessment_id', 'display_order'),
    )

    # ========================================================================
    # TABLE 3: assessment_attempts
    # Candidate attempts at assessments
    # ========================================================================
    op.create_table(
        'assessment_attempts',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('assessment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assessments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('application_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('applications.id', ondelete='CASCADE')),  # Nullable for standalone tests
        sa.Column('candidate_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),

        # Attempt Metadata
        sa.Column('attempt_number', sa.Integer, nullable=False, server_default='1'),
        sa.Column('status', sa.String(50), nullable=False, server_default='not_started'),  # "not_started", "in_progress", "completed", "disqualified", "expired"

        # Timing
        sa.Column('started_at', sa.TIMESTAMP(timezone=True)),
        sa.Column('submitted_at', sa.TIMESTAMP(timezone=True)),
        sa.Column('time_elapsed_minutes', sa.Integer),  # Actual time taken
        sa.Column('auto_submitted', sa.Boolean, server_default='false'),  # True if auto-submitted due to time limit

        # Scoring
        sa.Column('total_points_possible', sa.Integer, nullable=False),
        sa.Column('points_earned', sa.DECIMAL(10, 2)),
        sa.Column('score_percentage', sa.DECIMAL(5, 2)),
        sa.Column('passed', sa.Boolean),

        # Questions Progress
        sa.Column('total_questions', sa.Integer, nullable=False),
        sa.Column('questions_answered', sa.Integer, server_default='0'),
        sa.Column('questions_correct', sa.Integer, server_default='0'),

        # Security & Proctoring
        sa.Column('access_token', sa.String(255), unique=True),  # Unique token for resuming
        sa.Column('ip_address', sa.String(45)),  # IPv4 or IPv6
        sa.Column('user_agent', sa.String(500)),
        sa.Column('tab_switch_count', sa.Integer, server_default='0'),
        sa.Column('suspicious_activity', postgresql.JSONB),  # {"copy_paste": 5, "right_click": 3, "ip_changed": true}

        # Grading Status
        sa.Column('grading_status', sa.String(50), server_default='pending'),  # "pending", "auto_graded", "manual_grading_required", "graded"
        sa.Column('graded_at', sa.TIMESTAMP(timezone=True)),
        sa.Column('graded_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL')),

        # Timestamps
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),

        # Constraints
        sa.UniqueConstraint('assessment_id', 'candidate_id', 'attempt_number', name='uq_assessment_candidate_attempt'),

        # Indexes
        sa.Index('idx_assessment_attempts_assessment_id', 'assessment_id'),
        sa.Index('idx_assessment_attempts_candidate_id', 'candidate_id'),
        sa.Index('idx_assessment_attempts_application_id', 'application_id'),
        sa.Index('idx_assessment_attempts_status', 'status'),
        sa.Index('idx_assessment_attempts_access_token', 'access_token'),
    )

    # ========================================================================
    # TABLE 4: assessment_responses
    # Individual question responses within an attempt
    # ========================================================================
    op.create_table(
        'assessment_responses',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('attempt_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assessment_attempts.id', ondelete='CASCADE'), nullable=False),
        sa.Column('question_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assessment_questions.id', ondelete='CASCADE'), nullable=False),

        # Response Content (polymorphic based on question_type)
        sa.Column('response_type', sa.String(50), nullable=False),  # Same as question_type

        # MCQ Response
        sa.Column('selected_options', postgresql.JSONB),  # ["Option A", "Option C"] for multiple choice

        # Text Response
        sa.Column('text_response', sa.Text),  # For text questions or coding

        # File Upload Response
        sa.Column('file_url', sa.String(500)),  # S3 URL
        sa.Column('file_name', sa.String(255)),
        sa.Column('file_size_bytes', sa.Integer),
        sa.Column('file_type', sa.String(50)),

        # Coding Response
        sa.Column('code_language', sa.String(50)),
        sa.Column('code_execution_output', postgresql.JSONB),  # {"stdout": "...", "stderr": "...", "test_results": [...]}
        sa.Column('code_execution_error', sa.Text),

        # Grading
        sa.Column('is_correct', sa.Boolean),  # Null for manual grading pending
        sa.Column('points_earned', sa.DECIMAL(10, 2)),
        sa.Column('auto_graded', sa.Boolean, server_default='false'),
        sa.Column('grader_comments', sa.Text),  # Manual grader feedback

        # Timing & Behavior
        sa.Column('time_spent_seconds', sa.Integer),  # Time spent on this question
        sa.Column('answered_at', sa.TIMESTAMP(timezone=True)),
        sa.Column('flagged_for_review', sa.Boolean, server_default='false'),  # Candidate can flag questions

        # Suspicious Activity Flags
        sa.Column('copy_paste_detected', sa.Boolean, server_default='false'),
        sa.Column('answer_changed_count', sa.Integer, server_default='0'),

        # Timestamps
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),

        # Constraints
        sa.UniqueConstraint('attempt_id', 'question_id', name='uq_attempt_question_response'),

        # Indexes
        sa.Index('idx_assessment_responses_attempt_id', 'attempt_id'),
        sa.Index('idx_assessment_responses_question_id', 'question_id'),
        sa.Index('idx_assessment_responses_is_correct', 'is_correct'),
    )

    # ========================================================================
    # TABLE 5: question_bank
    # Reusable question library for creating assessments
    # ========================================================================
    op.create_table(
        'question_bank',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('company_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE')),  # Nullable for public questions
        sa.Column('created_by', postgresql.UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='SET NULL')),

        # Question Content (same structure as assessment_questions)
        sa.Column('question_text', sa.Text, nullable=False),
        sa.Column('question_type', sa.String(50), nullable=False),
        sa.Column('description', sa.Text),

        # MCQ
        sa.Column('options', postgresql.JSONB),
        sa.Column('correct_answers', postgresql.JSONB),

        # Coding
        sa.Column('coding_language', sa.String(50)),
        sa.Column('starter_code', sa.Text),
        sa.Column('solution_code', sa.Text),
        sa.Column('test_cases', postgresql.JSONB),

        # File Upload
        sa.Column('allowed_file_types', postgresql.ARRAY(sa.String(50))),
        sa.Column('max_file_size_mb', sa.Integer),

        # Metadata
        sa.Column('points', sa.Integer, server_default='10'),
        sa.Column('difficulty', sa.String(20)),
        sa.Column('category', sa.String(100)),
        sa.Column('tags', postgresql.ARRAY(sa.String(50))),

        # Visibility & Sharing
        sa.Column('is_public', sa.Boolean, server_default='false'),  # Public questions available to all
        sa.Column('is_verified', sa.Boolean, server_default='false'),  # Verified by platform admins

        # Usage Statistics
        sa.Column('times_used', sa.Integer, server_default='0'),
        sa.Column('avg_success_rate', sa.DECIMAL(5, 2)),  # % of candidates who get it right
        sa.Column('avg_time_seconds', sa.Integer),

        # Timestamps
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),

        # Indexes
        sa.Index('idx_question_bank_company_id', 'company_id'),
        sa.Index('idx_question_bank_question_type', 'question_type'),
        sa.Index('idx_question_bank_is_public', 'is_public'),
        sa.Index('idx_question_bank_category', 'category'),
        sa.Index('idx_question_bank_difficulty', 'difficulty'),
    )

    # ========================================================================
    # TABLE 6: job_assessment_requirements
    # Link assessments to job postings
    # ========================================================================
    op.create_table(
        'job_assessment_requirements',

        # Primary Key
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('job_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('jobs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('assessment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('assessments.id', ondelete='CASCADE'), nullable=False),

        # Requirement Configuration
        sa.Column('is_required', sa.Boolean, server_default='true'),  # Must complete to proceed
        sa.Column('must_pass_to_proceed', sa.Boolean, server_default='false'),  # Must pass (not just complete) to proceed
        sa.Column('order', sa.Integer, nullable=False),  # Order in application flow (1 = first assessment)

        # Timing
        sa.Column('deadline_hours_after_application', sa.Integer),  # e.g., 168 hours = 7 days
        sa.Column('send_reminder_hours_before_deadline', sa.Integer),  # e.g., 24 hours

        # Visibility
        sa.Column('show_before_application', sa.Boolean, server_default='true'),  # Show assessment info before applying
        sa.Column('trigger_point', sa.String(50), server_default='after_application'),  # "after_application", "before_interview"

        # Timestamps
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),

        # Constraints
        sa.UniqueConstraint('job_id', 'assessment_id', name='uq_job_assessment'),

        # Indexes
        sa.Index('idx_job_assessment_requirements_job_id', 'job_id'),
        sa.Index('idx_job_assessment_requirements_assessment_id', 'assessment_id'),
        sa.Index('idx_job_assessment_requirements_order', 'job_id', 'order'),
    )


def downgrade() -> None:
    """Rollback skills assessment schema changes"""

    # Drop tables in reverse order (respecting foreign key constraints)
    op.drop_table('job_assessment_requirements')
    op.drop_table('question_bank')
    op.drop_table('assessment_responses')
    op.drop_table('assessment_attempts')
    op.drop_table('assessment_questions')
    op.drop_table('assessments')
