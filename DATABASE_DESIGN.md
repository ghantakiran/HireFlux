# HireFlux - Database Design Document

**Version**: 1.0
**Last Updated**: 2025-10-22
**Database**: PostgreSQL 15+
**ORM**: SQLAlchemy 2.0+

---

## Table of Contents

1. [Database Overview](#database-overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Table Schemas](#table-schemas)
4. [Indexes](#indexes)
5. [Constraints](#constraints)
6. [Data Types & Conventions](#data-types--conventions)
7. [Migration Strategy](#migration-strategy)
8. [Performance Optimization](#performance-optimization)
9. [Backup & Recovery](#backup--recovery)

---

## Database Overview

### Database Architecture

- **Primary Database**: PostgreSQL 15+ (Supabase hosted)
- **Connection Pooling**: SQLAlchemy pool (max 20 connections)
- **Replication**: Read replicas for heavy read operations (future)
- **Partitioning**: Time-based partitioning for audit logs (future)

### Design Principles

1. **Normalization**: 3NF for transactional data
2. **JSONB for flexibility**: Semi-structured data (parsed resumes, preferences)
3. **Audit trail**: Immutable `events_audit` table
4. **Soft deletes**: `deleted_at` timestamp for recoverable data
5. **UUID primary keys**: Scalability and security

---

## Entity Relationship Diagram

```
┌─────────────┐
│    users    │
└──────┬──────┘
       │
       │ 1:1
       ▼
┌─────────────┐
│  profiles   │
└─────────────┘

┌─────────────┐       ┌──────────────────┐       ┌─────────────────┐
│    users    │ 1:N   │     resumes      │ 1:N   │ resume_versions │
└──────┬──────┘◄──────┴──────────────────┘◄──────┴─────────────────┘
       │
       │ 1:N
       ▼
┌──────────────────┐
│  cover_letters   │
└──────────────────┘
       ▲
       │ N:1
       │
┌──────┴───────┐
│resume_versions│
└──────────────┘

┌─────────────┐       ┌──────────────┐
│    users    │ 1:N   │match_scores  │ N:1 ┌──────┐
└──────┬──────┘◄──────┴──────┬───────┘◄────┤ jobs │
       │                     │             └──────┘
       │ 1:N                 │                 ▲
       ▼                     │                 │ N:1
┌──────────────┐             │          ┌─────┴──────┐
│ applications │◄────────────┘          │job_sources │
└──────┬───────┘                        └────────────┘
       │ N:1
       ▼
┌──────────────────┐
│ resume_versions  │
└──────────────────┘
       │ N:1
       ▼
┌──────────────────┐
│  cover_letters   │
└──────────────────┘

┌─────────────┐ 1:1  ┌───────────────┐
│    users    │◄─────┤credit_wallets │
└──────┬──────┘      └───────────────┘
       │ 1:N
       ▼
┌───────────────┐
│ credit_ledger │
└───────────────┘

┌─────────────┐ 1:1  ┌───────────────┐
│    users    │◄─────┤ subscriptions │
└─────────────┘      └───────────────┘

┌─────────────┐ 1:N  ┌────────────────────┐
│    users    │◄─────┤interview_sessions  │
└─────────────┘      └────────────────────┘

┌─────────────┐ 1:N  ┌──────────────┐
│    users    │◄─────│ events_audit │
└─────────────┘      └──────────────┘
```

---

## Table Schemas

### 1. users

Stores user authentication and account information.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),  -- NULL for OAuth users
    oauth_provider VARCHAR(50),  -- 'google', 'linkedin', NULL
    oauth_id VARCHAR(255),       -- External OAuth user ID
    email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_admin BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,        -- Soft delete

    CONSTRAINT valid_oauth CHECK (
        (oauth_provider IS NULL AND oauth_id IS NULL AND password_hash IS NOT NULL) OR
        (oauth_provider IS NOT NULL AND oauth_id IS NOT NULL)
    )
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);
CREATE INDEX idx_users_active ON users(is_active) WHERE deleted_at IS NULL;
```

**Columns**:
- `id`: Unique identifier (UUID)
- `email`: User email (unique)
- `password_hash`: bcrypt hashed password
- `oauth_provider`: OAuth provider name
- `oauth_id`: External OAuth user ID
- `email_verified`: Email verification status
- `is_active`: Account active status
- `is_admin`: Admin role flag
- `last_login_at`: Last login timestamp
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp
- `deleted_at`: Soft delete timestamp

---

### 2. profiles

Stores user profile and job search preferences.

```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    location VARCHAR(255),
    avatar_url TEXT,

    -- Job search preferences
    target_titles TEXT[],        -- Array: ['Software Engineer', 'Backend Developer']
    salary_min INTEGER,
    salary_max INTEGER,
    currency VARCHAR(3) DEFAULT 'USD',
    industries TEXT[],           -- Array: ['Technology', 'FinTech']
    skills TEXT[],               -- Array: ['Python', 'FastAPI', 'PostgreSQL']

    -- Preferences (JSONB for flexibility)
    preferences JSONB DEFAULT '{}'::jsonb,
    /* Example preferences:
    {
        "remote_policy": "remote",  // 'remote', 'hybrid', 'onsite', 'any'
        "visa_sponsorship": false,
        "willing_to_relocate": true,
        "work_authorization": "US Citizen",
        "preferred_locations": ["San Francisco", "New York"],
        "excluded_companies": ["CompanyX"]
    }
    */

    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_completed_at TIMESTAMP,
    profile_completion_percentage INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_profiles_target_titles ON profiles USING gin(target_titles);
CREATE INDEX idx_profiles_skills ON profiles USING gin(skills);
```

---

### 3. resumes

Stores original uploaded resumes.

```sql
CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    original_filename VARCHAR(255),
    file_url TEXT NOT NULL,      -- S3/Supabase Storage URL
    file_size_bytes INTEGER,
    file_type VARCHAR(50),       -- 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

    -- Parsed data (JSONB)
    parsed_data JSONB,
    /* Example parsed_data:
    {
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "summary": "Experienced software engineer...",
        "experience": [
            {
                "company": "TechCorp",
                "title": "Senior Engineer",
                "start_date": "2020-01",
                "end_date": "2023-05",
                "description": "Led backend development...",
                "achievements": ["Reduced latency by 40%"]
            }
        ],
        "education": [
            {
                "institution": "University of XYZ",
                "degree": "BS Computer Science",
                "graduation_year": 2015
            }
        ],
        "skills": ["Python", "JavaScript", "SQL"]
    }
    */

    parsing_status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'completed', 'failed'
    parsing_error TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_status ON resumes(parsing_status);
```

---

### 4. resume_versions

Stores AI-generated resume versions.

```sql
CREATE TABLE resume_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,

    version_name VARCHAR(255) NOT NULL,  -- 'Tech Companies', 'Startups'
    target_title VARCHAR(255),           -- 'Senior Software Engineer'
    tone VARCHAR(50),                    -- 'professional', 'conversational', 'concise'

    -- Generated content (JSONB)
    content JSONB NOT NULL,
    /* Example content:
    {
        "summary": "Results-driven Senior Software Engineer...",
        "experience": [...],  // Similar to parsed_data but AI-optimized
        "skills": [...],
        "education": [...],
        "achievements_highlighted": ["40% latency reduction", "Led team of 5"]
    }
    */

    is_default BOOLEAN DEFAULT FALSE,
    generation_time_ms INTEGER,
    model_used VARCHAR(100),             -- 'gpt-4-turbo', 'gpt-4'
    tokens_used INTEGER,
    cost_usd DECIMAL(10, 4),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_resume_versions_user_id ON resume_versions(user_id);
CREATE INDEX idx_resume_versions_resume_id ON resume_versions(resume_id);
CREATE INDEX idx_resume_versions_default ON resume_versions(user_id, is_default) WHERE is_default = TRUE;
```

---

### 5. cover_letters

Stores AI-generated cover letters.

```sql
CREATE TABLE cover_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resume_version_id UUID REFERENCES resume_versions(id) ON DELETE SET NULL,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,

    content TEXT NOT NULL,
    tone VARCHAR(50),                    -- 'professional', 'conversational', 'enthusiastic'
    length VARCHAR(50),                  -- 'short', 'medium', 'long'
    word_count INTEGER,

    company_personalized BOOLEAN DEFAULT FALSE,

    generation_time_ms INTEGER,
    model_used VARCHAR(100),
    tokens_used INTEGER,
    cost_usd DECIMAL(10, 4),

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_cover_letters_user_id ON cover_letters(user_id);
CREATE INDEX idx_cover_letters_job_id ON cover_letters(job_id);
CREATE INDEX idx_cover_letters_resume_version_id ON cover_letters(resume_version_id);
```

---

### 6. job_sources

Stores job board/feed sources.

```sql
CREATE TABLE job_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,   -- 'Greenhouse', 'Lever', 'LinkedIn'
    api_url TEXT,
    api_key_encrypted TEXT,              -- Encrypted API key
    is_active BOOLEAN DEFAULT TRUE,

    last_sync_at TIMESTAMP,
    last_sync_status VARCHAR(50),        -- 'success', 'failed'
    last_sync_error TEXT,
    total_jobs_synced INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_job_sources_active ON job_sources(is_active);
```

---

### 7. jobs

Stores job postings.

```sql
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES job_sources(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL,   -- Job ID from source

    title VARCHAR(500) NOT NULL,
    company VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,

    location VARCHAR(255),
    remote_policy VARCHAR(50),           -- 'remote', 'hybrid', 'onsite'

    salary_min INTEGER,
    salary_max INTEGER,
    salary_currency VARCHAR(3) DEFAULT 'USD',

    visa_friendly BOOLEAN DEFAULT FALSE,

    required_skills TEXT[],
    preferred_skills TEXT[],
    experience_years_min INTEGER,
    experience_years_max INTEGER,

    apply_url TEXT NOT NULL,

    posted_at TIMESTAMP NOT NULL,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,

    -- Metadata (JSONB for additional fields)
    metadata JSONB DEFAULT '{}'::jsonb,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT unique_job_per_source UNIQUE(source_id, external_id)
);

CREATE INDEX idx_jobs_title ON jobs(title);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_remote ON jobs(remote_policy);
CREATE INDEX idx_jobs_active ON jobs(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX idx_jobs_salary ON jobs(salary_min, salary_max);
CREATE INDEX idx_jobs_skills ON jobs USING gin(required_skills);
```

---

### 8. match_scores

Stores job-user match scores.

```sql
CREATE TABLE match_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,

    fit_index INTEGER NOT NULL CHECK (fit_index >= 0 AND fit_index <= 100),

    -- Breakdown of scores
    embedding_similarity_score DECIMAL(5, 2),  -- 0.00 to 100.00
    keyword_match_score DECIMAL(5, 2),
    recency_score DECIMAL(5, 2),
    seniority_alignment_score DECIMAL(5, 2),
    location_score DECIMAL(5, 2),

    rationale TEXT,                      -- "Strong match based on Python, FastAPI..."
    matched_skills TEXT[],
    missing_skills TEXT[],

    created_at TIMESTAMP DEFAULT NOW(),

    CONSTRAINT unique_match_per_user_job UNIQUE(user_id, job_id)
);

CREATE INDEX idx_match_scores_user_id ON match_scores(user_id);
CREATE INDEX idx_match_scores_job_id ON match_scores(job_id);
CREATE INDEX idx_match_scores_fit_index ON match_scores(fit_index DESC);
CREATE INDEX idx_match_scores_user_fit ON match_scores(user_id, fit_index DESC);
```

---

### 9. applications

Stores job applications.

```sql
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
    resume_version_id UUID REFERENCES resume_versions(id) ON DELETE SET NULL,
    cover_letter_id UUID REFERENCES cover_letters(id) ON DELETE SET NULL,

    status VARCHAR(50) NOT NULL DEFAULT 'saved',  -- 'saved', 'applied', 'interview', 'offer', 'rejected'

    -- Application method
    application_method VARCHAR(50),      -- 'manual', 'apply_assist', 'auto_apply'

    -- Application data
    applied_at TIMESTAMP,
    artifact_bundle_url TEXT,            -- ZIP file with resume, cover letter, snapshot

    -- Additional answers (JSONB)
    answers JSONB DEFAULT '{}'::jsonb,
    /* Example answers:
    {
        "work_authorization": "Yes",
        "sponsorship_required": "No",
        "custom_question_1": "Answer..."
    }
    */

    notes TEXT,

    -- Tracking
    response_received BOOLEAN DEFAULT FALSE,
    response_received_at TIMESTAMP,
    response_type VARCHAR(50),           -- 'rejection', 'interview_request', 'offer'

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_applications_user_id ON applications(user_id);
CREATE INDEX idx_applications_job_id ON applications(job_id);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_applied_at ON applications(applied_at DESC);
CREATE INDEX idx_applications_user_status ON applications(user_id, status);
```

---

### 10. credit_wallets

Stores user credit balances.

```sql
CREATE TABLE credit_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_credit_wallets_user_id ON credit_wallets(user_id);
```

---

### 11. credit_ledger

Stores credit transaction history (immutable).

```sql
CREATE TABLE credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    amount INTEGER NOT NULL,             -- Positive for credit, negative for debit
    balance_after INTEGER NOT NULL,

    transaction_type VARCHAR(50) NOT NULL,  -- 'purchase', 'apply', 'refund', 'bonus'
    reason TEXT,

    application_id UUID REFERENCES applications(id) ON DELETE SET NULL,
    stripe_payment_intent_id VARCHAR(255),

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_credit_ledger_user_id ON credit_ledger(user_id);
CREATE INDEX idx_credit_ledger_type ON credit_ledger(transaction_type);
CREATE INDEX idx_credit_ledger_created_at ON credit_ledger(created_at DESC);
```

---

### 12. subscriptions

Stores Stripe subscription information.

```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    stripe_customer_id VARCHAR(255) NOT NULL,
    stripe_subscription_id VARCHAR(255) UNIQUE,

    plan VARCHAR(50) NOT NULL,           -- 'free', 'plus', 'pro'
    status VARCHAR(50) NOT NULL,         -- 'active', 'canceled', 'past_due', 'incomplete'

    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMP,

    trial_start TIMESTAMP,
    trial_end TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
```

---

### 13. interview_sessions

Stores interview practice sessions.

```sql
CREATE TABLE interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    role VARCHAR(255),                   -- 'software-engineer', 'product-manager'

    -- Questions and answers (JSONB arrays)
    questions JSONB NOT NULL,
    /* Example questions:
    [
        {
            "question_id": "q123",
            "question": "Tell me about a time...",
            "category": "behavioral"
        }
    ]
    */

    answers JSONB DEFAULT '[]'::jsonb,
    /* Example answers:
    [
        {
            "question_id": "q123",
            "answer": "In my previous role...",
            "score": 8,
            "feedback": "Good structure..."
        }
    ]
    */

    overall_score DECIMAL(3, 1),         -- 0.0 to 10.0

    started_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX idx_interview_sessions_started_at ON interview_sessions(started_at DESC);
```

---

### 14. events_audit

Immutable audit log for compliance.

```sql
CREATE TABLE events_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    event_type VARCHAR(100) NOT NULL,    -- 'auto_apply_submitted', 'data_exported', 'login'
    event_data JSONB NOT NULL,
    /* Example event_data:
    {
        "job_id": "job_123",
        "application_id": "app_456",
        "credits_used": 1,
        "source": "auto_apply_worker"
    }
    */

    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_events_audit_user_id ON events_audit(user_id);
CREATE INDEX idx_events_audit_type ON events_audit(event_type);
CREATE INDEX idx_events_audit_created_at ON events_audit(created_at DESC);

-- Partition by month for performance (future optimization)
-- CREATE TABLE events_audit_2025_10 PARTITION OF events_audit
--     FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');
```

---

### 15. notifications

In-app notifications.

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    type VARCHAR(50) NOT NULL,           -- 'job_match', 'application_update', 'credit', 'system'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,

    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,

    action_url TEXT,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read) WHERE read = FALSE;
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

---

## Indexes

### Primary Indexes
- All tables have UUID primary key with default index
- Unique constraints create implicit indexes

### Performance Indexes
```sql
-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_oauth ON users(oauth_provider, oauth_id);

-- Profiles
CREATE INDEX idx_profiles_target_titles ON profiles USING gin(target_titles);
CREATE INDEX idx_profiles_skills ON profiles USING gin(skills);

-- Jobs
CREATE INDEX idx_jobs_active_posted ON jobs(is_active, posted_at DESC) WHERE is_active = TRUE;
CREATE INDEX idx_jobs_title_trgm ON jobs USING gin(title gin_trgm_ops);  -- For fuzzy search

-- Match Scores
CREATE INDEX idx_match_scores_user_fit ON match_scores(user_id, fit_index DESC);

-- Applications
CREATE INDEX idx_applications_user_status_date ON applications(user_id, status, applied_at DESC);

-- Credit Ledger
CREATE INDEX idx_credit_ledger_user_date ON credit_ledger(user_id, created_at DESC);
```

### GIN Indexes for Arrays
```sql
-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN indexes for array columns
CREATE INDEX idx_profiles_skills ON profiles USING gin(skills);
CREATE INDEX idx_jobs_required_skills ON jobs USING gin(required_skills);
```

---

## Constraints

### Foreign Key Constraints
- All foreign keys use `ON DELETE CASCADE` or `ON DELETE SET NULL`
- Cascade deletes for dependent data (e.g., user deletion cascades to all user data)
- Set null for optional references (e.g., job deletion sets `job_id` to NULL in applications)

### Check Constraints
```sql
-- Users: OAuth validation
CONSTRAINT valid_oauth CHECK (...)

-- Match Scores: Fit Index range
CONSTRAINT valid_fit_index CHECK (fit_index >= 0 AND fit_index <= 100)

-- Credit Wallets: Non-negative balance
CONSTRAINT positive_balance CHECK (balance >= 0)

-- Subscriptions: Valid plan
CONSTRAINT valid_plan CHECK (plan IN ('free', 'plus', 'pro'))
```

### Unique Constraints
```sql
-- Users: Unique email
UNIQUE(email)

-- Jobs: Unique external_id per source
UNIQUE(source_id, external_id)

-- Match Scores: Unique match per user-job pair
UNIQUE(user_id, job_id)
```

---

## Data Types & Conventions

### Naming Conventions
- Tables: lowercase, plural (e.g., `users`, `resumes`)
- Columns: lowercase, snake_case (e.g., `created_at`, `user_id`)
- Indexes: `idx_{table}_{columns}` (e.g., `idx_users_email`)
- Foreign keys: `{table_singular}_id` (e.g., `user_id`, `job_id`)

### Standard Columns
All tables include:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `created_at TIMESTAMP DEFAULT NOW()`
- `updated_at TIMESTAMP DEFAULT NOW()` (for mutable tables)

### Timestamp Convention
- All timestamps in UTC
- Use `TIMESTAMP` (not `TIMESTAMPTZ`) and handle timezone in application

### JSONB Usage
- Semi-structured data (preferences, parsed resumes, metadata)
- Use JSONB (not JSON) for indexing and querying

---

## Migration Strategy

### Alembic Migrations

**Migration Workflow**:
1. Create migration: `alembic revision -m "description"`
2. Write upgrade/downgrade logic
3. Review migration in staging
4. Apply to production: `alembic upgrade head`

**Example Migration**:
```python
# alembic/versions/001_create_users_table.py
def upgrade():
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        # ...
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )

def downgrade():
    op.drop_table('users')
```

### Zero-Downtime Migrations

**Adding Nullable Column**:
1. Add column as nullable
2. Deploy code (writes new column)
3. Backfill data (background job)
4. Make column non-nullable (next deployment)

**Renaming Column**:
1. Add new column
2. Deploy code (reads old, writes both)
3. Backfill data
4. Deploy code (reads new, writes new)
5. Drop old column

---

## Performance Optimization

### Query Optimization
```sql
-- Use EXPLAIN ANALYZE to profile queries
EXPLAIN ANALYZE SELECT * FROM jobs WHERE is_active = TRUE AND posted_at > NOW() - INTERVAL '7 days';

-- Use indexes
CREATE INDEX idx_jobs_active_recent ON jobs(is_active, posted_at DESC) WHERE is_active = TRUE;

-- Avoid N+1 queries (use JOINs or eager loading in ORM)
SELECT a.*, j.title, j.company FROM applications a
JOIN jobs j ON a.job_id = j.id
WHERE a.user_id = 'user_123';
```

### Connection Pooling
```python
# SQLAlchemy connection pool
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=10,
    pool_pre_ping=True  # Verify connection before use
)
```

### Caching
- Cache frequent queries in Redis (1h TTL)
- Cache user profiles, job matches
- Invalidate cache on updates

---

## Backup & Recovery

### Backup Strategy
- **Automated Backups**: Daily (Supabase automatic)
- **Retention**: 30 days
- **Point-in-Time Recovery**: 7 days

### Disaster Recovery
- **RTO** (Recovery Time Objective): 4 hours
- **RPO** (Recovery Point Objective): 1 hour
- **Backup Location**: Multi-region (S3)

### Testing Backups
- Monthly restore test to staging
- Verify data integrity

---

## Appendix

### Sample Queries

**Get user's top job matches**:
```sql
SELECT j.*, ms.fit_index, ms.rationale
FROM match_scores ms
JOIN jobs j ON ms.job_id = j.id
WHERE ms.user_id = 'user_123'
    AND j.is_active = TRUE
    AND ms.fit_index >= 70
ORDER BY ms.fit_index DESC
LIMIT 20;
```

**Get application pipeline statistics**:
```sql
SELECT status, COUNT(*) as count
FROM applications
WHERE user_id = 'user_123'
GROUP BY status
ORDER BY
    CASE status
        WHEN 'saved' THEN 1
        WHEN 'applied' THEN 2
        WHEN 'interview' THEN 3
        WHEN 'offer' THEN 4
        WHEN 'rejected' THEN 5
    END;
```

**Get credit balance and recent transactions**:
```sql
SELECT
    cw.balance,
    (
        SELECT json_agg(row_to_json(cl.*))
        FROM (
            SELECT * FROM credit_ledger
            WHERE user_id = 'user_123'
            ORDER BY created_at DESC
            LIMIT 10
        ) cl
    ) as recent_transactions
FROM credit_wallets cw
WHERE cw.user_id = 'user_123';
```

---

**Document Status**: Draft
**Next Review**: 2025-11-01
