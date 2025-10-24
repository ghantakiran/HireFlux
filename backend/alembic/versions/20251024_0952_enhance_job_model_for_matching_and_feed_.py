"""enhance_job_model_for_matching_and_feed_integration

Revision ID: 86ee369868da
Revises: 20251023_2330
Create Date: 2025-10-24 09:52:04.172097

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '86ee369868da'
down_revision = '20251023_2330'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """
    Enhance Job model with fields for job matching and feed integration.
    Creates job_sources and jobs tables with all necessary fields.

    Note: Using raw SQL for SQLite compatibility (no ALTER TABLE ADD FOREIGN KEY)
    """

    # Create job_sources table
    op.execute('''
        CREATE TABLE IF NOT EXISTS job_sources (
            id TEXT NOT NULL PRIMARY KEY,
            name VARCHAR(255),
            api_url TEXT,
            is_active BOOLEAN DEFAULT 1,
            last_sync_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Create jobs table with enhanced fields
    op.execute('''
        CREATE TABLE IF NOT EXISTS jobs (
            id TEXT NOT NULL PRIMARY KEY,
            source_id TEXT,
            source VARCHAR(50),
            external_id VARCHAR(255),
            title VARCHAR(255),
            company VARCHAR(255),
            description TEXT,
            location VARCHAR(255),
            location_type VARCHAR(50),

            -- Skills (JSON arrays)
            required_skills TEXT DEFAULT '[]',
            preferred_skills TEXT DEFAULT '[]',

            -- Experience requirements
            experience_requirement VARCHAR(100),
            experience_min_years INTEGER,
            experience_max_years INTEGER,
            experience_level VARCHAR(50),

            -- Salary
            salary_min INTEGER,
            salary_max INTEGER,

            -- Additional info
            department VARCHAR(255),
            employment_type VARCHAR(50),
            requires_visa_sponsorship BOOLEAN DEFAULT 0,
            external_url TEXT,

            -- Dates and status
            posted_date TIMESTAMP,
            expires_at TIMESTAMP,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            -- Note: Foreign key to job_sources.id
            -- SQLite doesn't support ALTER TABLE ADD FOREIGN KEY
            FOREIGN KEY (source_id) REFERENCES job_sources(id) ON DELETE SET NULL
        )
    ''')

    # Create indexes for performance
    op.execute('CREATE INDEX IF NOT EXISTS ix_jobs_title ON jobs(title)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_jobs_company ON jobs(company)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_jobs_is_active ON jobs(is_active)')

    # Create match_scores table (if not exists)
    op.execute('''
        CREATE TABLE IF NOT EXISTS match_scores (
            id TEXT NOT NULL PRIMARY KEY,
            user_id TEXT NOT NULL,
            job_id TEXT NOT NULL,
            fit_index INTEGER,
            rationale TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
        )
    ''')

    op.execute('CREATE INDEX IF NOT EXISTS ix_match_scores_user_id ON match_scores(user_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_match_scores_job_id ON match_scores(job_id)')


def downgrade() -> None:
    """Drop job-related tables"""
    op.execute('DROP INDEX IF EXISTS ix_match_scores_job_id')
    op.execute('DROP INDEX IF EXISTS ix_match_scores_user_id')
    op.execute('DROP TABLE IF EXISTS match_scores')

    op.execute('DROP INDEX IF EXISTS ix_jobs_is_active')
    op.execute('DROP INDEX IF EXISTS ix_jobs_company')
    op.execute('DROP INDEX IF EXISTS ix_jobs_title')
    op.execute('DROP TABLE IF EXISTS jobs')

    op.execute('DROP TABLE IF EXISTS job_sources')
