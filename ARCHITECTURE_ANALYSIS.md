# HireFlux Architecture Analysis & Two-Sided Marketplace Design

**Document Version**: 1.0
**Last Updated**: 2025-10-31
**Scope**: Technical architecture transformation from one-sided to two-sided marketplace

---

## Executive Summary

This document provides a comprehensive architectural analysis of the HireFlux platform and outlines the technical strategy for transforming it from a one-sided job seeker platform into a two-sided AI recruiting marketplace serving both job seekers and employers.

**Key Findings**:
- ✅ **Strong Foundation**: Robust job seeker platform with 16 API endpoints, 24 services, 14 database models
- ❌ **Critical Gap**: Zero employer-side infrastructure (0% implementation)
- 🔧 **Technical Debt**: Monolithic architecture requires refactoring for scale
- 🎯 **Target State**: Microservices architecture supporting 1M+ job seekers, 500K+ employers, 10M+ applications/year

**Investment Required**: ~$500-750K over 12 months (6-8 FTE engineers)

---

## Table of Contents

1. [Current State Architecture](#1-current-state-architecture)
2. [Architectural Gaps Analysis](#2-architectural-gaps-analysis)
3. [Target State Architecture](#3-target-state-architecture)
4. [Database Schema Design](#4-database-schema-design)
5. [API Architecture & Service Boundaries](#5-api-architecture--service-boundaries)
6. [Technical Implementation Roadmap](#6-technical-implementation-roadmap)
7. [Architectural Decision Records (ADRs)](#7-architectural-decision-records-adrs)
8. [Risk Mitigation Strategy](#8-risk-mitigation-strategy)

---

## 1. Current State Architecture

### 1.1 Technology Stack

**Backend** (Python/FastAPI)
```
Framework: FastAPI 0.104.1 + Uvicorn
Database: PostgreSQL (SQLAlchemy 2.0.23, Alembic migrations)
Cache/Queue: Redis 5.0.1 + RQ 1.15.1
AI/ML: OpenAI 1.12.0, Pinecone 2.2.4
Payments: Stripe 7.8.0
Email: Resend 0.7.0
Storage: AWS S3 (boto3)
Monitoring: Sentry + OpenTelemetry
```

**Frontend** (Next.js/TypeScript)
```
Framework: Next.js 14 (App Router)
State Management: Zustand 4.4.0
Data Fetching: TanStack Query 5.90.5
Forms: React Hook Form 7.48.0 + Zod 3.22.0
UI: Tailwind CSS + Radix UI + Lucide icons
Monitoring: Sentry
Testing: Playwright E2E, Jest unit tests
```

### 1.2 Current Database Models (14 tables)

**Job Seeker Models** (10 tables):
```python
- User, Profile         # Identity & preferences
- Resume, ResumeVersion # Resume management & versioning
- CoverLetter           # Generated cover letters
- Job, JobSource        # Job aggregation (3rd party feeds)
- MatchScore            # AI matching scores (job ↔ candidate)
- Application           # Application tracking
- InterviewSession      # Interview coach data
```

**Billing Models** (3 tables):
```python
- CreditWallet          # Credit balances
- CreditLedger          # Transaction history
- Subscription          # Stripe subscriptions
```

**Shared Models** (1 table):
```python
- EventAudit            # Immutable audit logs
```

### 1.3 Current API Structure (16 endpoints)

```
/api/v1/
├── auth/               # Authentication (signup, login, OAuth)
├── onboarding/         # User onboarding flow
├── resume/             # Resume CRUD + generation
├── cover_letter/       # Cover letter generation
├── jobs/               # Job search + matching
├── auto_apply/         # Auto-apply system
├── interview/          # Interview coach
├── analytics/          # Job seeker analytics
├── ai_generation/      # AI content generation
├── billing/            # Stripe billing
├── notification/       # Notification management
└── webhooks/           # Stripe/external webhooks
```

### 1.4 Current Services (24 services)

**AI Services**:
- `ai_generation_service.py` - LLM orchestration
- `openai_service.py` - OpenAI API wrapper
- `pinecone_service.py` - Vector embeddings

**Job Services**:
- `job_matching_service.py` - Candidate ↔ job matching
- `job_ingestion_service.py` - Job feed ingestion
- `job_normalization_service.py` - Job data cleanup
- `greenhouse_service.py` - Greenhouse API integration
- `lever_service.py` - Lever API integration

**Application Services**:
- `auto_apply_service.py` - Automated application submission
- `resume_service.py` - Resume management
- `resume_parser.py` - Resume parsing (PDF/DOCX)
- `cover_letter_service.py` - Cover letter generation

**Platform Services**:
- `auth.py` - Authentication
- `oauth.py` - OAuth providers
- `onboarding.py` - User onboarding
- `credit_service.py` - Credit system
- `stripe_service.py` - Stripe integration
- `email_service.py` - Email notifications
- `notification_service.py` - In-app notifications
- `interview_service.py` - Interview coach
- `analytics_service.py` - Analytics & insights
- `webhook_service.py` - Webhook handling

### 1.5 Current Frontend Structure

```
frontend/app/
├── auth/               # Auth pages (signin, signup)
├── onboarding/         # Onboarding flow
├── dashboard/          # Job seeker dashboard
│   ├── resumes/        # Resume builder
│   ├── applications/   # Application tracking
│   ├── jobs/           # Job search
│   ├── cover-letters/  # Cover letter manager
│   ├── interview-buddy/# Interview coach
│   ├── auto-apply/     # Auto-apply settings
│   ├── notifications/  # Notifications
│   └── settings/       # User settings
├── pricing/            # Pricing page
├── terms/              # Terms of service
└── privacy/            # Privacy policy
```

### 1.6 Infrastructure

**Current**:
- Deployment: Vercel (frontend), unknown (backend - likely manual/VM)
- CI/CD: GitHub Actions (mobile E2E, desktop E2E, Vercel preview tests)
- Database: PostgreSQL (likely managed service - Supabase/RDS)
- Cache: Redis (likely managed service)
- Storage: S3 (AWS)

---

## 2. Architectural Gaps Analysis

### 2.1 Critical Gaps (Blockers for Two-Sided Marketplace)

#### Gap 1: Zero Employer Infrastructure (🔴 Critical)

**Current State**: 0 employer models, 0 employer endpoints, 0 employer services
**Impact**: Cannot onboard employers or post jobs
**Effort**: 16 weeks (Phase 1 MVP)

**Missing Components**:
```
Database:
❌ companies, company_members, company_subscriptions
❌ jobs (native posting), job_templates
❌ job_applications, application_notes
❌ interview_schedules, candidate_views
❌ employer_candidate_rankings, bulk_job_uploads

APIs (30+ endpoints needed):
❌ /api/v1/employers/* (registration, profile, dashboard)
❌ /api/v1/employer/jobs/* (CRUD, templates, AI generation)
❌ /api/v1/employer/applicants/* (ranking, filtering, search)
❌ /api/v1/employer/ats/* (pipeline, notes, scheduling)
❌ /api/v1/employer/team/* (members, roles, permissions)
❌ /api/v1/employer/analytics/* (sourcing, pipeline, ROI)
❌ /api/v1/employer/billing/* (subscriptions, usage tracking)

Services (10+ new services):
❌ employer_service.py - Company management
❌ job_posting_service.py - Job creation & management
❌ candidate_ranking_service.py - AI-powered ranking
❌ ats_service.py - Applicant tracking
❌ candidate_search_service.py - Search & filtering
❌ bulk_posting_service.py - Mass job uploads
❌ team_collaboration_service.py - Team management
❌ employer_analytics_service.py - Hiring metrics
❌ employer_billing_service.py - Billing & limits
❌ multi_board_distribution_service.py - Job syndication

Frontend (15+ pages):
❌ /employer/register, /employer/dashboard
❌ /employer/jobs, /employer/jobs/new
❌ /employer/jobs/[id]/applicants
❌ /employer/candidates, /employer/team
❌ /employer/analytics, /employer/billing
❌ /employer/settings
```

#### Gap 2: Monolithic Architecture (🟡 Important)

**Current State**: Single FastAPI application, all logic in one codebase
**Impact**: Difficult to scale, deploy, and maintain as platform grows
**Effort**: 8-12 weeks (refactoring)

**Problems**:
- No service boundaries (shared database, tight coupling)
- Cannot scale job seeker and employer services independently
- Single deployment = higher risk of downtime
- Difficult to assign different teams to different domains

**Solution**: Migrate to microservices architecture (see Section 3)

#### Gap 3: No Multi-Tenancy Support (🟡 Important)

**Current State**: Single `user` table, no concept of organizations
**Impact**: Cannot support employer teams with multiple users
**Effort**: 4 weeks (data model + RBAC)

**Missing**:
```python
# Need to support:
Company (tenant) ─┬─> CompanyMember (user_id, role, permissions)
                  ├─> Jobs (owned by company)
                  └─> Subscriptions (company-level billing)

# Current: Single user per account
User ──> Profile (1:1, no org support)
```

#### Gap 4: Insufficient RBAC (Role-Based Access Control) (🟡 Important)

**Current State**: Binary permissions (authenticated vs. unauthenticated)
**Impact**: Cannot support employer team collaboration (6 role types needed)
**Effort**: 3 weeks

**Needed**:
```python
class EmployerRole(str, Enum):
    OWNER = "owner"             # Full access + billing
    ADMIN = "admin"             # Full access except billing
    HIRING_MANAGER = "hiring_manager"  # Post jobs, manage applications
    RECRUITER = "recruiter"     # View candidates, schedule interviews
    INTERVIEWER = "interviewer" # View assigned, leave feedback
    VIEWER = "viewer"           # Read-only

# Permissions matrix for each role
Permissions: 6 roles × 20 actions = 120 permission checks
```

#### Gap 5: No Candidate Public Profiles (🟡 Important)

**Current State**: Resume data only visible to user, not searchable by employers
**Impact**: Employers cannot proactively source candidates
**Effort**: 4 weeks

**Missing**:
```python
class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    user_id = Column(UUID, ForeignKey("users.id"))
    visibility = Column(Enum("public", "private"))  # ❌ Not implemented
    headline = Column(String)
    open_to_work = Column(Boolean)
    portfolio = Column(JSONB)  # Portfolio items
    skills = Column(ARRAY(String))  # Searchable
    # ... searchable/indexable fields
```

#### Gap 6: Shared User Authentication (🟠 Moderate)

**Current State**: Single auth system for job seekers
**Impact**: Employers and job seekers share same user pool - no separation
**Effort**: 2 weeks

**Problem**:
```
Current: users table (type: "job_seeker" implicit)
Needed:  users table with type: "job_seeker" | "employer"
         + employers link to companies table
```

---

### 2.2 Technical Debt

#### Debt 1: No Database Partitioning/Sharding Strategy

**Impact**: Will hit scaling limits at ~10M applications
**Resolution**: Design sharding strategy now (by company_id for employer data)

#### Debt 2: No API Versioning Strategy

**Impact**: Breaking changes will affect all clients
**Resolution**: Enforce /api/v1, /api/v2 versioning from start of employer features

#### Debt 3: Insufficient Observability

**Current**: Sentry + OpenTelemetry (basic setup)
**Needed**: Distributed tracing across services, request IDs, performance monitoring

#### Debt 4: No Rate Limiting

**Impact**: Vulnerable to abuse (API spam, credential stuffing)
**Resolution**: Implement rate limiting (Redis-based, per user/IP/endpoint)

#### Debt 5: No Caching Strategy

**Current**: No caching layer (every request hits database)
**Impact**: High latency, high database load
**Resolution**: Implement Redis caching (job listings, match scores, profiles)

---

## 3. Target State Architecture

### 3.1 Microservices Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (FastAPI)                    │
│  - Authentication                                             │
│  - Rate limiting                                              │
│  - Request routing                                            │
│  - API versioning (/v1, /v2)                                  │
└──────────────┬─────────────────────────┬─────────────────────┘
               │                         │
    ┌──────────▼───────────┐   ┌────────▼──────────┐
    │ Job Seeker Service   │   │ Employer Service   │
    ├──────────────────────┤   ├────────────────────┤
    │ - Resume management  │   │ - Job posting      │
    │ - Cover letters      │   │ - Candidate ranking│
    │ - Job search         │   │ - ATS pipeline     │
    │ - Auto-apply         │   │ - Team management  │
    │ - Interview coach    │   │ - Analytics        │
    │ - Applications       │   │ - Billing          │
    └──────────┬───────────┘   └─────────┬──────────┘
               │                         │
    ┌──────────▼─────────────────────────▼──────────┐
    │         Shared Services (Platform)             │
    ├────────────────────────────────────────────────┤
    │ - AI Service (OpenAI, embeddings)              │
    │ - Matching Service (candidate ↔ job)           │
    │ - Notification Service (email, in-app)         │
    │ - Billing Service (Stripe)                     │
    │ - Audit Service (event logs)                   │
    │ - Search Service (Elasticsearch)               │
    │ - Storage Service (S3)                         │
    └────────────────────────────────────────────────┘
```

### 3.2 Service Boundaries

**Principle**: Domain-Driven Design (DDD)

1. **Job Seeker Service** (bounded context: candidate experience)
   - Owns: users, profiles, resumes, cover_letters, applications, interview_sessions
   - Communicates with: AI Service, Matching Service, Billing Service

2. **Employer Service** (bounded context: hiring workflow)
   - Owns: companies, company_members, jobs (native), job_applications, ats_pipeline
   - Communicates with: AI Service, Matching Service, Billing Service

3. **Matching Service** (bounded context: job ↔ candidate matching)
   - Owns: match_scores, employer_candidate_rankings
   - Consumed by: Both Job Seeker and Employer services

4. **AI Service** (bounded context: LLM operations)
   - Stateless (no database)
   - Provides: Resume generation, cover letter generation, job description generation, candidate ranking

5. **Notification Service** (bounded context: communications)
   - Owns: notifications, email_queue
   - Consumed by: All services

6. **Billing Service** (bounded context: payments & subscriptions)
   - Owns: subscriptions, credit_wallets, credit_ledger, invoices
   - Consumed by: Job Seeker Service, Employer Service

### 3.3 Data Ownership & Communication Patterns

**Anti-Pattern** ❌: Shared database (current state)
```
Job Seeker Service ──┐
                     ├──> Shared PostgreSQL DB
Employer Service ────┘
```

**Target Pattern** ✅: Database per service + API/Event-driven communication
```
Job Seeker Service ──> Job Seeker DB (PostgreSQL)
     │
     ├─ API call ──> Matching Service ──> Matching DB (PostgreSQL)
     │
     └─ Event ────> Notification Service ──> Queue (Redis)

Employer Service ──> Employer DB (PostgreSQL)
     │
     └─ API call ──> Matching Service ──> Matching DB (PostgreSQL)
```

**Communication Methods**:
- **Synchronous**: REST API (request/response)
  - Use when: Immediate response needed (e.g., get candidate ranking)
- **Asynchronous**: Event queue (Redis/RQ)
  - Use when: Background processing (e.g., send email, generate report)

---

## 4. Database Schema Design

### 4.1 New Employer Tables (10 tables)

#### 4.1.1 Company & Team Management

```sql
-- Company (tenant)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,        -- Company email domain (e.g., "google.com")
    industry VARCHAR(100),               -- "Technology", "Healthcare", etc.
    size VARCHAR(50),                    -- "1-10", "11-50", "51-200", "201-500", "501+"
    location VARCHAR(255),               -- HQ location
    website VARCHAR(255),
    logo_url VARCHAR(500),
    description TEXT,

    -- Subscription & billing
    subscription_tier VARCHAR(50),       -- "starter", "growth", "professional", "enterprise"
    subscription_status VARCHAR(50),     -- "active", "trial", "past_due", "canceled"
    trial_ends_at TIMESTAMP,
    billing_email VARCHAR(255),

    -- Limits (based on subscription)
    max_active_jobs INT DEFAULT 1,       -- Plan limit
    max_candidate_views INT DEFAULT 10,  -- Monthly limit
    max_team_members INT DEFAULT 1,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_companies_domain (domain),
    INDEX idx_companies_subscription_tier (subscription_tier)
);

-- Company members (users who work at company)
CREATE TABLE company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    role VARCHAR(50) NOT NULL,           -- "owner", "admin", "hiring_manager", "recruiter", "interviewer", "viewer"
    permissions JSONB,                    -- Granular permissions per role

    status VARCHAR(50) DEFAULT 'active', -- "active", "invited", "suspended"
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP,
    joined_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, user_id),
    INDEX idx_company_members_company (company_id),
    INDEX idx_company_members_user (user_id),
    INDEX idx_company_members_role (role)
);

-- Company subscriptions (separate from job seeker subscriptions)
CREATE TABLE company_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),

    plan_tier VARCHAR(50) NOT NULL,      -- "starter", "growth", "professional", "enterprise"
    plan_interval VARCHAR(20),            -- "month", "year"
    plan_amount DECIMAL(10, 2),           -- Monthly/yearly price

    status VARCHAR(50) NOT NULL,          -- "active", "trialing", "past_due", "canceled", "unpaid"
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,

    -- Usage tracking
    jobs_posted_this_month INT DEFAULT 0,
    candidate_views_this_month INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_company_subscriptions_company (company_id),
    INDEX idx_company_subscriptions_stripe (stripe_subscription_id)
);
```

#### 4.1.2 Native Job Posting

```sql
-- Jobs (employer-created, not 3rd party feeds)
CREATE TABLE jobs_native (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),  -- Company member who created

    -- Job details
    title VARCHAR(255) NOT NULL,
    department VARCHAR(100),
    location VARCHAR(255),
    location_type VARCHAR(20),            -- "remote", "hybrid", "onsite"
    employment_type VARCHAR(50),          -- "full_time", "part_time", "contract", "internship"
    experience_level VARCHAR(50),         -- "entry", "mid", "senior", "lead", "executive"

    -- Compensation
    salary_min DECIMAL(10, 2),
    salary_max DECIMAL(10, 2),
    salary_currency VARCHAR(3) DEFAULT 'USD',

    -- Content (generated by AI or manual)
    description TEXT NOT NULL,             -- Full job description
    requirements TEXT[],                   -- Array of requirements
    responsibilities TEXT[],               -- Array of responsibilities
    skills VARCHAR(100)[],                 -- Array of skills (searchable)

    -- AI metadata
    skills_embedding VECTOR(1536),         -- OpenAI embedding for skills matching
    description_tone VARCHAR(50),          -- "formal", "casual", "technical"

    -- Status & visibility
    status VARCHAR(50) DEFAULT 'draft',    -- "draft", "active", "paused", "closed"
    published_at TIMESTAMP,
    expires_at TIMESTAMP,

    -- Analytics
    views INT DEFAULT 0,
    applications_count INT DEFAULT 0,
    avg_fit_index DECIMAL(5, 2),           -- Average Fit Index of applicants

    -- Multi-board distribution
    distributed_to JSONB,                  -- {"linkedin": true, "indeed": true}
    external_ids JSONB,                    -- {"linkedin": "12345", "indeed": "67890"}

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_jobs_native_company (company_id),
    INDEX idx_jobs_native_status (status),
    INDEX idx_jobs_native_location_type (location_type),
    INDEX idx_jobs_native_skills (skills),
    INDEX idx_jobs_native_published (published_at)
);

-- Job templates (reusable job descriptions)
CREATE TABLE job_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),

    name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    requirements TEXT[],
    responsibilities TEXT[],
    skills VARCHAR(100)[],

    is_public BOOLEAN DEFAULT FALSE,      -- Public templates available to all companies
    use_count INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_job_templates_company (company_id),
    INDEX idx_job_templates_public (is_public)
);
```

#### 4.1.3 Applicant Tracking System (ATS)

```sql
-- Job applications (employer view of applications)
CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs_native(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Duplicate reference to job seeker's "applications" table
    application_id UUID REFERENCES applications(id),  -- Link to job seeker's application

    -- ATS pipeline
    stage VARCHAR(50) DEFAULT 'new',      -- "new", "screening", "interview", "offer", "hired", "rejected"
    stage_updated_at TIMESTAMP DEFAULT NOW(),
    stage_history JSONB,                   -- [{stage, timestamp, changed_by}]

    -- AI ranking (calculated on application)
    fit_index INT,                         -- 0-100 score
    fit_explanation JSONB,                 -- {strengths: [...], concerns: [...]}

    -- Application materials
    resume_url VARCHAR(500),
    cover_letter_text TEXT,
    portfolio_url VARCHAR(500),

    -- Assignment & ownership
    assigned_to UUID REFERENCES users(id), -- Recruiter/hiring manager assigned
    assigned_at TIMESTAMP,

    -- Flags & tags
    is_starred BOOLEAN DEFAULT FALSE,
    tags VARCHAR(50)[],                    -- ["remote", "senior", "python"]

    -- Communication
    last_contacted_at TIMESTAMP,
    next_follow_up_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(job_id, candidate_id),
    INDEX idx_job_applications_job (job_id),
    INDEX idx_job_applications_company (company_id),
    INDEX idx_job_applications_candidate (candidate_id),
    INDEX idx_job_applications_stage (stage),
    INDEX idx_job_applications_assigned (assigned_to)
);

-- Application notes (team collaboration)
CREATE TABLE application_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id),

    content TEXT NOT NULL,
    note_type VARCHAR(50),                -- "internal", "feedback", "interview_notes"
    visibility VARCHAR(50) DEFAULT 'team', -- "private", "team", "all"

    -- Mentions (e.g., "@john review this")
    mentions UUID[],                       -- Array of user IDs mentioned

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_application_notes_application (application_id),
    INDEX idx_application_notes_author (author_id)
);

-- Interview schedules
CREATE TABLE interview_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES jobs_native(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    candidate_id UUID NOT NULL REFERENCES users(id),

    -- Interview details
    interview_type VARCHAR(50),           -- "phone_screen", "technical", "behavioral", "final"
    scheduled_at TIMESTAMP NOT NULL,
    duration_minutes INT DEFAULT 60,
    location VARCHAR(255),                 -- Physical address or "Video call"
    meeting_link VARCHAR(500),

    -- Participants
    interviewers UUID[],                   -- Array of user IDs (company members)
    organizer_id UUID REFERENCES users(id),

    -- Status
    status VARCHAR(50) DEFAULT 'scheduled', -- "scheduled", "completed", "canceled", "no_show"
    feedback TEXT,                          -- Post-interview feedback

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_interview_schedules_application (application_id),
    INDEX idx_interview_schedules_scheduled_at (scheduled_at)
);
```

#### 4.1.4 Candidate Search & Profiling

```sql
-- Candidate public profiles (opt-in for employer discovery)
CREATE TABLE candidate_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    -- Visibility & status
    visibility VARCHAR(20) DEFAULT 'private', -- "public", "private"
    open_to_work BOOLEAN DEFAULT FALSE,
    open_to_remote BOOLEAN DEFAULT FALSE,

    -- Profile content
    headline VARCHAR(255),                 -- "Senior Full-Stack Engineer | Python | React"
    bio TEXT,
    location VARCHAR(255),

    -- Skills & experience (searchable)
    skills VARCHAR(100)[],
    years_experience INT,
    experience_level VARCHAR(50),          -- "entry", "mid", "senior", "lead"

    -- Expectations
    expected_salary_min DECIMAL(10, 2),
    expected_salary_max DECIMAL(10, 2),
    expected_salary_currency VARCHAR(3) DEFAULT 'USD',

    -- Portfolio
    portfolio JSONB,                       -- [{title, description, url, image}]

    -- AI embeddings for search
    skills_embedding VECTOR(1536),
    bio_embedding VECTOR(1536),

    -- Analytics
    profile_views INT DEFAULT 0,
    invites_received INT DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_candidate_profiles_visibility (visibility),
    INDEX idx_candidate_profiles_open_to_work (open_to_work),
    INDEX idx_candidate_profiles_skills (skills),
    INDEX idx_candidate_profiles_location (location)
);

-- Candidate views (track which employers viewed which candidates)
CREATE TABLE candidate_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    viewer_id UUID NOT NULL REFERENCES users(id),      -- Company member who viewed
    candidate_id UUID NOT NULL REFERENCES users(id),   -- Candidate being viewed

    source VARCHAR(50),                    -- "search", "application", "referral"
    context_job_id UUID REFERENCES jobs_native(id),    -- If viewed in context of a job

    created_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_candidate_views_company (company_id),
    INDEX idx_candidate_views_candidate (candidate_id),
    INDEX idx_candidate_views_created_at (created_at)
);
```

#### 4.1.5 Candidate Ranking

```sql
-- Employer candidate rankings (AI-calculated fit scores)
CREATE TABLE employer_candidate_rankings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs_native(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Fit index (0-100 score)
    fit_index INT NOT NULL CHECK (fit_index >= 0 AND fit_index <= 100),

    -- Factor breakdown (multi-factor scoring)
    skills_score DECIMAL(5, 2),            -- 0-100 (30% weight)
    experience_score DECIMAL(5, 2),        -- 0-100 (20% weight)
    location_score DECIMAL(5, 2),          -- 0-100 (15% weight)
    salary_score DECIMAL(5, 2),            -- 0-100 (10% weight)
    culture_fit_score DECIMAL(5, 2),       -- 0-100 (15% weight)
    availability_score DECIMAL(5, 2),      -- 0-100 (10% weight)

    -- Explanation
    strengths TEXT[],                      -- ["5+ years Python", "Remote experience"]
    concerns TEXT[],                       -- ["Salary expectation higher than budget"]

    -- Metadata
    calculated_at TIMESTAMP DEFAULT NOW(),
    algorithm_version VARCHAR(20),         -- "v1.0" (for tracking changes)

    UNIQUE(job_id, candidate_id),
    INDEX idx_employer_candidate_rankings_job (job_id),
    INDEX idx_employer_candidate_rankings_candidate (candidate_id),
    INDEX idx_employer_candidate_rankings_fit_index (fit_index DESC)
);
```

#### 4.1.6 Mass Posting

```sql
-- Bulk job uploads (CSV mass posting)
CREATE TABLE bulk_job_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES users(id),

    -- Upload metadata
    filename VARCHAR(255),
    total_rows INT,
    processed_rows INT DEFAULT 0,
    successful_rows INT DEFAULT 0,
    failed_rows INT DEFAULT 0,

    -- Status
    status VARCHAR(50) DEFAULT 'processing', -- "processing", "completed", "failed"
    error_log JSONB,                       -- [{row: 5, error: "Invalid salary"}]

    -- Created jobs
    created_job_ids UUID[],                -- Array of job IDs created

    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,

    INDEX idx_bulk_job_uploads_company (company_id),
    INDEX idx_bulk_job_uploads_status (status)
);
```

### 4.2 Modified Job Seeker Tables

**Changes to existing `users` table**:
```sql
ALTER TABLE users
ADD COLUMN user_type VARCHAR(20) DEFAULT 'job_seeker'; -- "job_seeker" | "employer"
```

**Changes to existing `applications` table**:
```sql
ALTER TABLE applications
ADD COLUMN employer_application_id UUID REFERENCES job_applications(id);
-- Link to employer's ATS view of same application
```

---

## 5. API Architecture & Service Boundaries

### 5.1 New Employer APIs (30+ endpoints)

#### 5.1.1 Employer Registration & Management

```
POST   /api/v1/employers/register
POST   /api/v1/employers/verify-email
GET    /api/v1/employers/me
PUT    /api/v1/employers/me
GET    /api/v1/employers/{company_id}
PUT    /api/v1/employers/{company_id}
DELETE /api/v1/employers/{company_id}
```

#### 5.1.2 Company Dashboard

```
GET    /api/v1/employer/dashboard/stats
GET    /api/v1/employer/dashboard/recent-activity
```

#### 5.1.3 Job Posting

```
POST   /api/v1/employer/jobs
GET    /api/v1/employer/jobs
GET    /api/v1/employer/jobs/{id}
PUT    /api/v1/employer/jobs/{id}
DELETE /api/v1/employer/jobs/{id}
POST   /api/v1/employer/jobs/{id}/publish
POST   /api/v1/employer/jobs/{id}/pause
POST   /api/v1/employer/jobs/{id}/close

# AI-assisted job creation
POST   /api/v1/employer/jobs/generate-description
POST   /api/v1/employer/jobs/suggest-skills
POST   /api/v1/employer/jobs/suggest-salary

# Templates
GET    /api/v1/employer/job-templates
POST   /api/v1/employer/job-templates
```

#### 5.1.4 Applicant Tracking System (ATS)

```
GET    /api/v1/employer/jobs/{job_id}/applicants
GET    /api/v1/employer/jobs/{job_id}/applicants/ranked
GET    /api/v1/employer/applicants/{id}
PUT    /api/v1/employer/applicants/{id}/stage
POST   /api/v1/employer/applicants/{id}/notes
GET    /api/v1/employer/applicants/{id}/notes
POST   /api/v1/employer/applicants/{id}/assign
POST   /api/v1/employer/applicants/{id}/star
POST   /api/v1/employer/applicants/bulk-update
```

#### 5.1.5 Interview Scheduling

```
POST   /api/v1/employer/interviews
GET    /api/v1/employer/interviews
GET    /api/v1/employer/interviews/{id}
PUT    /api/v1/employer/interviews/{id}
DELETE /api/v1/employer/interviews/{id}
POST   /api/v1/employer/interviews/{id}/cancel
POST   /api/v1/employer/interviews/{id}/feedback
```

#### 5.1.6 Candidate Search

```
GET    /api/v1/employer/candidates/search
GET    /api/v1/employer/candidates/{id}
POST   /api/v1/employer/candidates/{id}/invite
POST   /api/v1/employer/candidates/{id}/save
```

#### 5.1.7 Mass Posting

```
POST   /api/v1/employer/jobs/bulk-upload
GET    /api/v1/employer/jobs/bulk-upload/{id}/status
POST   /api/v1/employer/jobs/bulk-publish
```

#### 5.1.8 Team Management

```
GET    /api/v1/employer/team/members
POST   /api/v1/employer/team/members/invite
PUT    /api/v1/employer/team/members/{id}/role
DELETE /api/v1/employer/team/members/{id}
GET    /api/v1/employer/team/permissions
```

#### 5.1.9 Analytics

```
GET    /api/v1/employer/analytics/overview
GET    /api/v1/employer/analytics/sourcing
GET    /api/v1/employer/analytics/pipeline
GET    /api/v1/employer/analytics/time-to-hire
GET    /api/v1/employer/analytics/quality-of-hire
GET    /api/v1/employer/analytics/cost-per-hire
```

#### 5.1.10 Billing

```
GET    /api/v1/employer/billing/subscription
POST   /api/v1/employer/billing/subscription/upgrade
POST   /api/v1/employer/billing/subscription/cancel
GET    /api/v1/employer/billing/usage
GET    /api/v1/employer/billing/invoices
```

### 5.2 Service Dependencies

```
Employer Service
  │
  ├─> AI Service (job description generation, candidate ranking)
  ├─> Matching Service (candidate-job matching, fit index calculation)
  ├─> Billing Service (subscription management, usage tracking)
  ├─> Notification Service (team notifications, candidate emails)
  ├─> Audit Service (event logging)
  └─> Storage Service (company logos, attachments)
```

---

## 6. Technical Implementation Roadmap

### Phase 1: Employer MVP (Months 1-4, 16 weeks)

**Sprint 1-2: Foundation (Weeks 1-4)**
- [ ] Week 1-2: Database schema design & migrations (10 new tables)
- [ ] Week 3-4: API gateway setup (rate limiting, routing, versioning)

**Sprint 3-4: Employer Onboarding (Weeks 5-8)**
- [ ] Week 5: Employer registration & authentication
- [ ] Week 6: Company profile management
- [ ] Week 7-8: Employer dashboard (overview, stats)

**Sprint 5-6: Job Posting (Weeks 9-12)**
- [ ] Week 9: Job CRUD APIs + database integration
- [ ] Week 10: AI job description generator
- [ ] Week 11: Job templates & reusable content
- [ ] Week 12: Job publishing workflow + status management

**Sprint 7-8: Basic ATS + Ranking (Weeks 13-16)**
- [ ] Week 13: Applicant list view + filtering
- [ ] Week 14: AI candidate ranking engine (Fit Index 0-100)
- [ ] Week 15: Basic ATS pipeline (8 stages)
- [ ] Week 16: Application notes & assignment

### Phase 2: Advanced Employer Features (Months 5-8)

**Sprint 9-10: Candidate Search (Weeks 17-20)**
- [ ] Week 17-18: Public candidate profiles (opt-in)
- [ ] Week 19-20: Candidate search + invite to apply

**Sprint 11-12: Mass Posting (Weeks 21-24)**
- [ ] Week 21-22: CSV bulk upload + AI normalization
- [ ] Week 23-24: Multi-board distribution (LinkedIn, Indeed)

**Sprint 13-14: Team Collaboration (Weeks 25-28)**
- [ ] Week 25: Team member management (invite, roles)
- [ ] Week 26: RBAC (6 roles, permission matrix)
- [ ] Week 27: Interview scheduling
- [ ] Week 28: Activity feed + @mentions

**Sprint 15-16: Analytics & Reporting (Weeks 29-32)**
- [ ] Week 29-30: Employer analytics (sourcing, pipeline)
- [ ] Week 31-32: Reporting (time-to-hire, cost-per-hire, ROI)

### Phase 3: Scale & Enterprise (Months 9-12)

**Sprint 17-18: Enterprise Features (Weeks 33-36)**
- [ ] Week 33-34: API access (REST API for ATS integrations)
- [ ] Week 35-36: White-label support (custom branding)

**Sprint 19-20: Advanced Features (Weeks 37-40)**
- [ ] Week 37-38: Skills assessments (code challenges, quizzes)
- [ ] Week 39-40: Video interview integration (Zoom/Teams)

**Sprint 21-22: Optimization (Weeks 41-44)**
- [ ] Week 41-42: Database sharding strategy
- [ ] Week 43-44: Performance optimization (caching, indexing)

**Sprint 23-24: Launch Prep (Weeks 45-48)**
- [ ] Week 45-46: Compliance audit (GDPR, SOC2)
- [ ] Week 47-48: Load testing + security audit

---

## 7. Architectural Decision Records (ADRs)

### ADR-001: Microservices vs. Monolith

**Status**: Accepted
**Context**: Current monolithic FastAPI app will not scale to support two-sided marketplace
**Decision**: Migrate to microservices architecture with domain-driven service boundaries
**Consequences**:
- ✅ Independent scaling (job seeker vs. employer services)
- ✅ Team autonomy (different teams own different services)
- ❌ Increased operational complexity (deployment, monitoring, debugging)
- ❌ Network latency between services

### ADR-002: Database per Service vs. Shared Database

**Status**: Accepted
**Context**: Microservices should own their data to avoid coupling
**Decision**: Each service owns its database (Job Seeker DB, Employer DB, Matching DB)
**Consequences**:
- ✅ Service independence (no shared schema changes)
- ✅ Easier to scale databases independently
- ❌ Data consistency challenges (eventual consistency required)
- ❌ Joins across databases not possible (must use API calls)

### ADR-003: PostgreSQL vs. NoSQL for Employer Data

**Status**: Accepted
**Context**: Employer data requires strong consistency, transactions, complex queries
**Decision**: Use PostgreSQL for employer data (same as job seeker data)
**Consequences**:
- ✅ ACID transactions (critical for billing, ATS pipeline)
- ✅ Rich query support (SQL joins, aggregations)
- ✅ Team familiarity (already using PostgreSQL)
- ❌ Scaling requires sharding (not as easy as NoSQL)

### ADR-004: Synchronous REST vs. Asynchronous Events

**Status**: Accepted
**Context**: Services need to communicate for data and notifications
**Decision**: Use REST for synchronous queries, events (Redis queue) for async processing
**Consequences**:
- ✅ REST: Simple, easy to debug, immediate responses
- ✅ Events: Decoupling, fault tolerance (retries), better for notifications
- ❌ Hybrid approach = more complexity

### ADR-005: Vector Database (Pinecone) for Embeddings

**Status**: Accepted
**Context**: AI matching requires fast similarity search on embeddings
**Decision**: Continue using Pinecone for skills embeddings (candidate ↔ job matching)
**Consequences**:
- ✅ Fast vector similarity search (sub-second)
- ✅ Scales to millions of vectors
- ❌ Additional cost ($70/month per index)
- ❌ External dependency (vendor lock-in)

### ADR-006: Multi-Tenancy Model

**Status**: Accepted
**Context**: Employers have teams with multiple users accessing shared company data
**Decision**: Company-based multi-tenancy (company_id partition key)
**Consequences**:
- ✅ Data isolation per company (security, compliance)
- ✅ Easier billing (per-company subscriptions)
- ❌ Database sharding required for scale (shard by company_id)

---

## 8. Risk Mitigation Strategy

### Risk 1: Performance Degradation (🔴 High)

**Risk**: Adding employer features doubles database load
**Mitigation**:
- Implement Redis caching layer (cache job listings, candidate profiles)
- Database read replicas (separate read/write databases)
- Connection pooling (PgBouncer)
- Query optimization (add indexes, analyze slow queries)

### Risk 2: Data Migration Failure (🟡 Medium)

**Risk**: Migrating monolith to microservices causes data corruption
**Mitigation**:
- Phased migration (start with new employer features in new service)
- Dual-write strategy (write to both old and new databases during transition)
- Extensive testing (integration tests, end-to-end tests)
- Rollback plan (database backups, feature flags)

### Risk 3: Third-Party API Failures (🟡 Medium)

**Risk**: OpenAI, Pinecone, Stripe downtime affects platform
**Mitigation**:
- Graceful degradation (fallback to manual job posting if AI fails)
- Circuit breaker pattern (stop calling failed services)
- Retry with exponential backoff
- Multi-provider strategy (fallback to Claude if OpenAI fails)

### Risk 4: Security Vulnerabilities (🔴 High)

**Risk**: RBAC bugs allow unauthorized access to employer data
**Mitigation**:
- Comprehensive permission tests (unit + integration tests)
- Security audit before launch (penetration testing)
- Row-level security (PostgreSQL RLS policies)
- Audit logging (track all data access)

### Risk 5: Cost Overruns (🟡 Medium)

**Risk**: OpenAI API costs spike with employer usage
**Mitigation**:
- Rate limiting per company (e.g., max 10 AI job descriptions per day for free tier)
- Caching (cache AI-generated content)
- Usage tracking (alert if costs exceed budget)
- Tiered pricing (charge employers for high usage)

---

## Conclusion

This architectural analysis provides a comprehensive roadmap for transforming HireFlux from a one-sided job seeker platform into a scalable two-sided AI recruiting marketplace. The proposed microservices architecture, database schema, and phased implementation plan will enable HireFlux to serve 1M+ job seekers, 500K+ employers, and process 10M+ applications annually.

**Next Steps**:
1. Review and approve this architecture document
2. Begin Phase 1 implementation (Employer MVP, 16 weeks)
3. Hire engineering team (6-8 FTE: 2 backend, 2 frontend, 1 DevOps, 1 QA, 1 architect, 1 PM)
4. Set up infrastructure (microservices, CI/CD, monitoring)

**Success Metrics**:
- Phase 1 complete: 500+ employers onboarded
- Phase 2 complete: 10,000+ jobs posted
- Phase 3 complete: $500K/month revenue ($6M annual run rate)

---

**Document Owner**: HireFlux Architecture Team
**Reviewers**: CTO, VP Engineering, Lead Architect
**Approval Date**: Pending
