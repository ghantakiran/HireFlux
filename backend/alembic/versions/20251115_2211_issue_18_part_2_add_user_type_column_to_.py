"""Issue #18 Part 2: Add user_type column to users table

Revision ID: 054b2a6b84ed
Revises: cb77e5da119e
Create Date: 2025-11-15 22:11:46.557230

Implements Issue #18 - Database Schema for Employer MVP
Part 2: Add user_type column to distinguish job seekers from employers

Changes:
- Add user_type column to users table with CHECK constraint
- Default value: 'job_seeker' for backward compatibility
- Index on user_type for efficient filtering
- Update existing users to have user_type='job_seeker'

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '054b2a6b84ed'
down_revision = 'cb77e5da119e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Note: user_type column already exists from migration cb0688fac175
    # This migration adds the missing CHECK constraint, index, and documentation

    # Add CHECK constraint to ensure valid values
    op.create_check_constraint(
        'ck_users_user_type',
        'users',
        "user_type IN ('job_seeker', 'employer')"
    )

    # Create index for efficient filtering by user_type
    op.create_index(
        'idx_users_user_type',
        'users',
        ['user_type']
    )

    # Add comment to column for documentation
    op.execute("""
        COMMENT ON COLUMN users.user_type IS 'User account type: job_seeker or employer';
    """)


def downgrade() -> None:
    # Drop index
    op.drop_index('idx_users_user_type', 'users')

    # Drop CHECK constraint
    op.drop_constraint('ck_users_user_type', 'users', type_='check')

    # Note: We don't drop the column itself as it was created in a previous migration
