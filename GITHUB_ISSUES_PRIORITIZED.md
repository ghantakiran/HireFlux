# HireFlux: Prioritized GitHub Issues for Architects & Engineers
## Product Gap Analysis & Implementation Roadmap

**Generated**: 2025-11-14
**Source Documents**: PRODUCT_GAP_ANALYSIS.md, EMPLOYER_FEATURES_SPEC.md, CLAUDE.md, ARCHITECTURE_ANALYSIS.md
**Current Sprint**: Sprint 19-20, Week 40 Day 3 Complete
**Prepared By**: Product Management

---

## Executive Summary

Based on comprehensive analysis of strategic documents, HireFlux has **59 critical gaps** preventing transformation from one-sided job seeker platform to two-sided AI recruiting marketplace:

### Current State
- ✅ **Job Seeker Platform**: 16 APIs, 24 services, 14 database models (100% complete)
- ❌ **Employer Platform**: 0 APIs, 0 services, 0 database models (0% complete)
- ⚠️ **Architecture**: Monolithic (needs microservices for scale)

### Investment Required
- **Timeline**: 12 months (48 weeks, 6 sprints)
- **Budget**: $500K-750K
- **Team**: 6-8 FTE (2 backend, 2 frontend, 1 DevOps, 1 QA, 1 architect, 1 PM)
- **Target Revenue**: $6M annual run rate by Month 12

### Priority Distribution
- **P0 (Critical)**: 12 issues - Must fix immediately (Weeks 1-4)
- **P1 (High)**: 18 issues - Employer MVP (Weeks 5-16)
- **P2 (Medium)**: 17 issues - Advanced features (Weeks 17-32)
- **P3 (Low)**: 12 issues - Enterprise & scale (Weeks 33-48)

---

## Table of Contents

1. [P0: Critical Blockers (12 issues)](#p0-critical-blockers)
2. [P1: Employer MVP (18 issues)](#p1-employer-mvp)
3. [P2: Advanced Features (17 issues)](#p2-advanced-features)
4. [P3: Enterprise & Scale (12 issues)](#p3-enterprise--scale)
5. [Issue Templates](#issue-templates)
6. [Success Metrics](#success-metrics)

---

# P0: Critical Blockers
## Must Fix Immediately (Weeks 1-4)

### P0-1: [BUG] Week 40 Day 3: ATS Integration Page Runtime Error

**Priority**: 🔴 P0 - CRITICAL BLOCKER
**Status**: Open
**Assignee**: @frontend-lead
**Labels**: `P0-critical`, `bug`, `frontend`, `ATS`, `Week-40-Day-4`
**Effort**: 2-3 days
**Sprint**: Sprint 19-20 Week 40 Day 4

#### Problem
ATS Integration page (`/employer/jobs/[jobId]/applications`) fails to render. All 35 E2E tests failing with timeout errors.

#### Current State
- ✅ 15/30 unit tests passing (50%)
- ✅ Zustand store implemented
- ✅ ATSViewToggle working
- ❌ Page won't load in browser
- ❌ 35/35 E2E tests failing

#### Root Cause
Type mismatch and component integration issues:
- ApplicantList/Kanban props don't match ATSPage expectations
- API mocks incomplete in test suites
- Runtime error: "missing required error components"

#### Acceptance Criteria
- [ ] Page loads successfully
- [ ] No console errors
- [ ] 25+/30 unit tests passing (83%+)
- [ ] 30+/35 E2E tests passing (85%+)
- [ ] View toggle works (List ↔ Kanban)

#### Files
- `app/employer/jobs/[jobId]/applications/page.tsx` (287 lines)
- `components/employer/ApplicantList.tsx` (20K lines)
- `components/employer/ApplicantKanbanBoard.tsx` (19K lines)
- `hooks/useATSStore.ts` (273 lines)

#### Technical Debt Impact
**Blocks**: Week 40 Day 4+ work, E2E testing, deployment

---

### P0-2: [ARCHITECTURE] Zero Employer Infrastructure - Database Schema Design

**Priority**: 🔴 P0 - CRITICAL GAP
**Status**: Open
**Assignee**: @architect, @backend-lead
**Labels**: `P0-critical`, `architecture`, `database`, `backend`
**Effort**: 2 weeks
**Sprint**: Phase 1 - Weeks 1-2

#### Problem
**0% employer infrastructure exists**. Cannot onboard employers or post jobs.

#### Gap Analysis
```
Missing Database Tables: 10 tables
- companies, company_members, company_subscriptions
- jobs_native, job_templates
- job_applications, application_notes
- interview_schedules, candidate_views
- employer_candidate_rankings, bulk_job_uploads

Missing APIs: 30+ endpoints
Missing Services: 10+ services
Missing Frontend: 15+ pages
```

#### Business Impact
- **$0 revenue** from employers (missing 50% of market)
- **No two-sided marketplace** = no network effects
- **Cannot compete** with Mercor, AIApply
- **Missing $200K/month** potential employer revenue

#### Acceptance Criteria
- [ ] 10 new database tables created with migrations
- [ ] All tables indexed properly (company_id, job_id, etc.)
- [ ] Foreign key constraints enforced
- [ ] Row-level security (RLS) policies defined
- [ ] Migration scripts tested (up/down)
- [ ] Database ER diagram updated
- [ ] Data dictionary documented

#### Schema Design
```sql
-- Priority 1: Company & Team (Week 1)
companies (13 columns, 3 indexes)
company_members (10 columns, RBAC support)
company_subscriptions (14 columns, Stripe integration)

-- Priority 2: Job Posting (Week 2)
jobs_native (20+ columns, vector embeddings)
job_templates (reusable JDs)

-- Priority 3: ATS (Week 2)
job_applications (25+ columns, pipeline stages)
application_notes (team collaboration)
interview_schedules (calendar integration)

-- Priority 4: Candidate Discovery (Week 2)
candidate_profiles (public opt-in profiles)
candidate_views (tracking)
employer_candidate_rankings (AI fit scores)
```

#### Technical Specifications
- **Database**: PostgreSQL 14+
- **ORM**: SQLAlchemy 2.0.23
- **Migrations**: Alembic
- **Vector**: pgvector extension for embeddings
- **Partitioning**: By company_id (future sharding)

#### Dependencies
- Blocks: All P1 employer features
- Requires: Database access, migration environment

---

### P0-3: [ARCHITECTURE] API Gateway Setup - Rate Limiting & Routing

**Priority**: 🔴 P0 - FOUNDATIONAL
**Status**: Open
**Assignee**: @architect, @backend-lead
**Labels**: `P0-critical`, `architecture`, `backend`, `infrastructure`
**Effort**: 1 week
**Sprint**: Phase 1 - Weeks 3-4

#### Problem
No API gateway, no rate limiting, no versioning strategy. Vulnerable to abuse and breaking changes.

#### Current State
- ❌ No rate limiting (open to API spam, credential stuffing)
- ❌ No API versioning (/api/v1 vs /api/v2)
- ❌ No request routing (monolithic FastAPI app)
- ❌ No authentication middleware at gateway level
- ❌ No distributed tracing (request IDs)

#### Target State
```
┌─────────────────────────────────────┐
│       API Gateway (FastAPI)         │
│  - Authentication (JWT validation)  │
│  - Rate limiting (Redis-based)      │
│  - Request routing (/v1, /v2)       │
│  - CORS handling                    │
│  - Request/response logging         │
│  - Distributed tracing              │
└──────────┬─────────────┬────────────┘
           │             │
    ┌──────▼──────┐ ┌───▼──────────┐
    │ Job Seeker  │ │ Employer     │
    │ Service     │ │ Service      │
    └─────────────┘ └──────────────┘
```

#### Acceptance Criteria
- [ ] Rate limiting implemented (100 req/min per user)
- [ ] API versioning enforced (/api/v1, /api/v2)
- [ ] Request routing by service domain
- [ ] JWT authentication at gateway
- [ ] Distributed tracing (request IDs in headers)
- [ ] CORS properly configured
- [ ] Health check endpoints (/_health, /_ready)
- [ ] Metrics endpoint (/_metrics)

#### Technical Specifications
```python
# Rate Limiting
- Library: slowapi or fastapi-limiter
- Backend: Redis
- Limits:
  - Unauthenticated: 10 req/min
  - Free tier: 100 req/min
  - Paid tier: 1000 req/min
  - Per endpoint overrides (e.g., AI generation: 10/min)

# Versioning
- URL-based: /api/v1/*, /api/v2/*
- Header fallback: Accept: application/vnd.hireflux.v1+json

# Routing
- Pattern matching: /api/v1/employer/* → Employer Service
- Pattern matching: /api/v1/jobs/* → Job Seeker Service
```

#### Dependencies
- Requires: Redis instance
- Blocks: P1 employer API development

---

### P0-4: [ARCHITECTURE] Microservices Migration Strategy

**Priority**: 🔴 P0 - FOUNDATIONAL
**Status**: Open
**Assignee**: @architect
**Labels**: `P0-critical`, `architecture`, `backend`, `migration`
**Effort**: 4 weeks (phased)
**Sprint**: Phase 1 - Background work

#### Problem
Current monolithic architecture won't scale to support two-sided marketplace (1M+ job seekers, 500K+ employers, 10M+ applications/year).

#### Current Architecture (Monolith)
```
FastAPI App (Single Deployment)
└── All 24 services in one codebase
    └── Shared PostgreSQL database
```

#### Target Architecture (Microservices)
```
API Gateway
├── Job Seeker Service (owns: users, resumes, applications)
├── Employer Service (owns: companies, jobs, ats_pipeline)
├── Matching Service (owns: match_scores, rankings)
├── AI Service (stateless: LLM operations)
├── Notification Service (owns: notifications, email_queue)
└── Billing Service (owns: subscriptions, credits)
```

#### Migration Strategy (Phased)
**Phase 1: Extract Employer Service (Weeks 1-4)**
- Create new FastAPI app for employer features
- New database (employer_db) with 10 tables
- API gateway routes /api/v1/employer/* to new service
- Shared services (AI, Billing) remain in monolith

**Phase 2: Extract Shared Services (Weeks 5-8)**
- AI Service (stateless)
- Billing Service (with database)
- Notification Service (with database)

**Phase 3: Refactor Job Seeker Service (Weeks 9-12)**
- Extract from monolith into dedicated service
- Database remains, but ownership clarified

#### Acceptance Criteria
- [ ] Service boundaries defined (DDD bounded contexts)
- [ ] Database per service strategy documented
- [ ] Communication patterns defined (REST vs events)
- [ ] Migration runbook created
- [ ] Rollback plan documented
- [ ] Feature flags for gradual rollout
- [ ] Integration tests for cross-service calls
- [ ] Monitoring & alerting per service

#### ADR (Architectural Decision Record)
**Decision**: Microservices with database per service
**Rationale**:
- ✅ Independent scaling
- ✅ Team autonomy
- ✅ Faster deployments (deploy one service)
- ❌ Increased complexity (distributed systems)
- ❌ Network latency (service-to-service calls)

#### Dependencies
- Requires: API Gateway (P0-3)
- Blocks: Scaling past 100K users

---

### P0-5: [BACKEND] User Type Separation - Job Seeker vs Employer

**Priority**: 🔴 P0 - DATA MODEL
**Status**: Open
**Assignee**: @backend-lead
**Labels**: `P0-critical`, `backend`, `database`, `auth`
**Effort**: 3 days
**Sprint**: Phase 1 - Week 2

#### Problem
Single `users` table with no concept of user type. Cannot distinguish job seekers from employers.

#### Current Schema
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),
    -- No user_type column!
    created_at TIMESTAMP
);
```

#### Required Changes
```sql
ALTER TABLE users
ADD COLUMN user_type VARCHAR(20) NOT NULL DEFAULT 'job_seeker';
-- Values: 'job_seeker' | 'employer'

-- Index for filtering
CREATE INDEX idx_users_type ON users(user_type);

-- Update auth endpoints to set user_type on registration
```

#### Acceptance Criteria
- [ ] Migration script created (add `user_type` column)
- [ ] All existing users set to `'job_seeker'`
- [ ] Registration API updated (POST /api/v1/auth/register)
  - Job seeker: `user_type = 'job_seeker'`
  - Employer: `user_type = 'employer'`
- [ ] Login API validates user type
- [ ] Dashboard routing based on user type:
  - Job seeker → `/dashboard/*`
  - Employer → `/employer/*`
- [ ] Unit tests for user type logic

#### Breaking Changes
**None** - Backward compatible (defaults to 'job_seeker')

#### Dependencies
- Blocks: P0-2 (employer infrastructure)
- Requires: Database migration access

---

### P0-6: [BACKEND] RBAC Foundation - 6 Employer Roles & Permissions

**Priority**: 🔴 P0 - SECURITY
**Status**: Open
**Assignee**: @backend-lead, @security-engineer
**Labels**: `P0-critical`, `backend`, `security`, `RBAC`
**Effort**: 1 week
**Sprint**: Phase 1 - Week 4

#### Problem
No role-based access control (RBAC). Cannot support employer teams with multiple users and different permission levels.

#### Current State
- Binary permissions: authenticated vs unauthenticated
- No concept of roles or permissions
- No multi-user accounts (companies)

#### Required Roles
```python
class EmployerRole(str, Enum):
    OWNER = "owner"             # Full access + billing
    ADMIN = "admin"             # Full access except billing
    HIRING_MANAGER = "hiring_manager"  # Post jobs, manage applications
    RECRUITER = "recruiter"     # View candidates, schedule interviews
    INTERVIEWER = "interviewer" # View assigned, leave feedback
    VIEWER = "viewer"           # Read-only access

# Permissions Matrix (6 roles × 12 actions = 72 permission checks)
PERMISSIONS = {
    "owner": {
        "can_post_jobs": True,
        "can_edit_jobs": True,
        "can_delete_jobs": True,
        "can_view_candidates": True,
        "can_search_candidates": True,
        "can_change_application_status": True,
        "can_schedule_interviews": True,
        "can_view_analytics": True,
        "can_invite_members": True,
        "can_remove_members": True,
        "can_change_roles": True,
        "can_manage_billing": True,
    },
    "admin": {
        # All except can_manage_billing
    },
    # ... 4 more roles
}
```

#### Database Schema
```sql
CREATE TABLE company_members (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id),
    user_id UUID REFERENCES users(id),
    role VARCHAR(50) NOT NULL,  -- "owner", "admin", etc.
    permissions JSONB,           -- Custom overrides
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);
```

#### Acceptance Criteria
- [ ] 6 roles defined with permission matrices
- [ ] `company_members` table created
- [ ] Permission check middleware implemented
  ```python
  @require_permission("can_post_jobs")
  def create_job(...)
  ```
- [ ] Role inheritance logic (e.g., OWNER has all ADMIN permissions)
- [ ] Custom permissions support (JSONB overrides)
- [ ] Unit tests for all 72 permission checks
- [ ] API endpoints:
  - `PUT /api/v1/employer/team/members/{id}/role`
  - `GET /api/v1/employer/team/permissions`

#### Security Considerations
- **Row-Level Security (RLS)**: Users only see their company's data
- **Audit Logging**: Track all permission changes
- **Principle of Least Privilege**: Default to minimal permissions

#### Dependencies
- Requires: P0-2 (company_members table)
- Blocks: P1 team collaboration features

---

### P0-7: [FRONTEND] Employer Portal Foundation - Routing & Layout

**Priority**: 🔴 P0 - FRONTEND
**Status**: Open
**Assignee**: @frontend-lead
**Labels**: `P0-critical`, `frontend`, `routing`
**Effort**: 3 days
**Sprint**: Phase 1 - Week 3

#### Problem
No employer portal structure. All routes are job seeker-focused (`/dashboard/*`).

#### Current Routes
```
/dashboard/*        - Job seeker dashboard (✅ exists)
/employer/*         - Employer portal (❌ missing)
```

#### Required Routes (Phase 1 MVP)
```
/employer/register           - Company registration
/employer/onboarding         - Onboarding flow
/employer/dashboard          - Overview metrics
/employer/jobs               - Job management (list)
/employer/jobs/new           - Create job
/employer/jobs/[id]/edit     - Edit job
/employer/jobs/[id]/applicants - View applicants (ATS)
/employer/candidates         - Candidate search
/employer/team               - Team management
/employer/analytics          - Hiring metrics
/employer/billing            - Subscription & usage
/employer/settings           - Company settings
```

#### Layout Structure
```tsx
// app/employer/layout.tsx
export default function EmployerLayout({ children }) {
  return (
    <div className="employer-portal">
      <EmployerSidebar />
      <main className="employer-content">
        {children}
      </main>
    </div>
  );
}

// Sidebar Navigation
- Dashboard
- Jobs (with badge: active count)
- Candidates
- Team
- Analytics
- Settings
- Billing
```

#### Acceptance Criteria
- [ ] Employer layout component created
- [ ] 12 route pages created (can be placeholders)
- [ ] Sidebar navigation with active states
- [ ] Protected routes (require employer auth)
- [ ] Role-based route guards (RBAC integration)
- [ ] Breadcrumbs for navigation
- [ ] Mobile-responsive layout

#### Design System
- **Sidebar**: Dark theme (differentiate from job seeker)
- **Primary Color**: Blue #2563EB (vs job seeker green)
- **Icons**: Lucide icons (consistent with job seeker)
- **Components**: Shadcn/ui + Radix primitives

#### Dependencies
- Requires: P0-5 (user type separation)
- Blocks: All P1 employer frontend work

---

### P0-8: [INFRA] CI/CD Pipeline for Microservices

**Priority**: 🔴 P0 - DEVOPS
**Status**: Open
**Assignee**: @devops-lead
**Labels**: `P0-critical`, `infrastructure`, `CI/CD`
**Effort**: 1 week
**Sprint**: Phase 1 - Week 4

#### Problem
Current CI/CD only supports monolithic frontend deployment (Vercel). Need multi-service deployment strategy.

#### Current State
- ✅ Frontend: Vercel (auto-deploy on push to main)
- ✅ E2E Tests: GitHub Actions (Playwright)
- ❌ Backend: Manual deployment (no CI/CD)
- ❌ Multi-service orchestration
- ❌ Database migrations automation

#### Target State
```yaml
# .github/workflows/deploy.yml
jobs:
  deploy-api-gateway:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Build Docker image
      - Run tests
      - Deploy to production (if main branch)

  deploy-employer-service:
    runs-on: ubuntu-latest
    steps:
      - Checkout
      - Build Docker image
      - Run database migrations
      - Run tests
      - Deploy to production

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - Deploy to Vercel (existing)
```

#### Acceptance Criteria
- [ ] Dockerfiles created for each service
- [ ] Docker Compose for local development
- [ ] GitHub Actions workflows for each service
- [ ] Automated testing in CI (unit + integration)
- [ ] Database migration automation (Alembic)
- [ ] Environment-specific configs (dev, staging, prod)
- [ ] Secrets management (GitHub Secrets → env vars)
- [ ] Deployment notifications (Slack/Discord)

#### Infrastructure
**Options**:
1. **Docker + AWS ECS** (Fargate)
2. **Kubernetes (EKS)**
3. **Railway.app** (simple PaaS)

**Recommendation**: Start with Railway.app for speed, migrate to ECS later for scale.

#### Dependencies
- Requires: P0-4 (microservices strategy)
- Blocks: Continuous deployment

---

### P0-9: [TESTING] E2E Test Infrastructure for Employer Portal

**Priority**: 🔴 P0 - QA
**Status**: Open
**Assignee**: @qa-lead, @frontend-lead
**Labels**: `P0-critical`, `testing`, `E2E`
**Effort**: 4 days
**Sprint**: Phase 1 - Week 3

#### Problem
Current E2E tests only cover job seeker flows. Need employer-specific test infrastructure.

#### Current Coverage
- ✅ Job Seeker: 8 E2E test files, 200+ scenarios
- ❌ Employer: 0 test files, 0 scenarios

#### Required Test Suites
```
tests/e2e/employer/
├── 01-employer-registration.spec.ts      (15 tests)
├── 02-company-onboarding.spec.ts         (12 tests)
├── 03-job-posting.spec.ts                (25 tests)
├── 04-ai-job-generation.spec.ts          (10 tests)
├── 05-ats-pipeline.spec.ts               (30 tests)
├── 06-candidate-ranking.spec.ts          (20 tests)
├── 07-team-management.spec.ts            (15 tests)
├── 08-interview-scheduling.spec.ts       (18 tests)
├── 09-candidate-search.spec.ts           (22 tests)
├── 10-analytics-dashboard.spec.ts        (12 tests)
└── 11-billing-subscription.spec.ts       (10 tests)

Total: 11 files, ~189 test scenarios
```

#### Test Data Strategy
```typescript
// Setup test company
await setupTestCompany({
  name: "Test Corp",
  domain: "testcorp.com",
  subscription: "professional",
  members: [
    { email: "owner@testcorp.com", role: "owner" },
    { email: "recruiter@testcorp.com", role: "recruiter" },
  ],
  jobs: [
    { title: "Senior Engineer", status: "active", applicants: 50 },
    { title: "Product Manager", status: "draft", applicants: 0 },
  ],
});
```

#### Acceptance Criteria
- [ ] Test fixtures for employer data
- [ ] Authentication helpers (employer login)
- [ ] Page object models for employer pages
- [ ] 11 E2E test files created (can start with happy paths)
- [ ] CI integration (run on PR)
- [ ] Visual regression testing (Percy.io)

#### Dependencies
- Requires: P0-7 (employer routes)
- Blocks: P1 employer feature development

---

### P0-10: [DOCS] API Documentation - OpenAPI/Swagger

**Priority**: 🔴 P0 - DOCUMENTATION
**Status**: Open
**Assignee**: @backend-lead, @technical-writer
**Labels**: `P0-critical`, `documentation`, `API`
**Effort**: 3 days
**Sprint**: Phase 1 - Week 4

#### Problem
No API documentation for developers. Critical for:
- Frontend team consuming backend APIs
- Future enterprise customers using API access
- Third-party integrations

#### Current State
- ❌ No OpenAPI/Swagger docs
- ❌ No Postman collections
- ❌ No API versioning documentation

#### Target State
```
https://api.hireflux.com/docs        - Swagger UI
https://api.hireflux.com/redoc       - ReDoc alternative
https://api.hireflux.com/openapi.json - OpenAPI spec
```

#### Acceptance Criteria
- [ ] FastAPI auto-documentation enabled
- [ ] All endpoints documented with:
  - Description
  - Request schemas (Pydantic models)
  - Response schemas
  - Example requests/responses
  - Error codes and messages
- [ ] Authentication documented (JWT bearer token)
- [ ] Rate limits documented
- [ ] Versioning strategy documented (/v1, /v2)
- [ ] Postman collection exported

#### Example Documentation
```python
@router.post(
    "/employer/jobs",
    response_model=JobResponse,
    status_code=201,
    summary="Create a new job posting",
    description="Creates a new job posting with AI-assisted description generation. Requires hiring_manager role.",
    responses={
        201: {"description": "Job created successfully"},
        400: {"description": "Invalid job data"},
        401: {"description": "Unauthorized"},
        403: {"description": "Insufficient permissions"},
        429: {"description": "Rate limit exceeded"},
    },
    tags=["Jobs", "Employer"],
)
async def create_job(
    job_data: JobCreateRequest,
    current_user: User = Depends(get_current_employer),
) -> JobResponse:
    """
    Create a new job posting.

    - **title**: Job title (required)
    - **description**: Full job description (optional - can be AI-generated)
    - **skills**: Array of required skills
    - **salary_min/max**: Salary range in USD

    Returns the created job with auto-generated job_id.
    """
    ...
```

#### Dependencies
- None (can be done in parallel)
- Benefits: All teams (frontend, mobile, partners)

---

### P0-11: [SECURITY] Authentication Hardening - JWT + RBAC

**Priority**: 🔴 P0 - SECURITY
**Status**: Open
**Assignee**: @security-engineer, @backend-lead
**Labels**: `P0-critical`, `security`, `auth`
**Effort**: 1 week
**Sprint**: Phase 1 - Week 2

#### Problem
Current authentication too basic for two-sided marketplace with teams and RBAC.

#### Current Implementation
```python
# Simple JWT without role/permission claims
token = create_access_token(data={"sub": user.email})
```

#### Required Enhancements

**1. JWT Claims Enhancement**
```python
# Enhanced JWT payload
token = create_access_token(data={
    "sub": user.id,
    "email": user.email,
    "user_type": "employer",  # "job_seeker" | "employer"
    "company_id": "uuid",      # For employers
    "role": "hiring_manager",  # For company members
    "permissions": ["can_post_jobs", "can_view_candidates"],
    "exp": datetime.utcnow() + timedelta(hours=24),
    "iat": datetime.utcnow(),
})
```

**2. RBAC Middleware**
```python
def require_permission(permission: str):
    def decorator(func):
        def wrapper(current_user: User = Depends(get_current_user)):
            if not has_permission(current_user, permission):
                raise HTTPException(403, "Insufficient permissions")
            return func(current_user)
        return wrapper
    return decorator

# Usage
@require_permission("can_post_jobs")
async def create_job(...):
    ...
```

**3. Multi-Factor Authentication (MFA)**
- TOTP (Time-based One-Time Password)
- SMS fallback
- Required for Owner/Admin roles

**4. Session Management**
- Refresh tokens (7-day expiry)
- Token revocation (Redis blacklist)
- Device tracking (detect suspicious logins)

#### Acceptance Criteria
- [ ] JWT claims include user_type, role, permissions
- [ ] RBAC middleware implemented
- [ ] Permission check decorators tested
- [ ] MFA for Owner/Admin roles
- [ ] Refresh token rotation
- [ ] Token revocation on logout
- [ ] Suspicious login detection (geo-location, device fingerprint)
- [ ] Security audit passed (OWASP Top 10)

#### Security Standards
- **OWASP Top 10** compliance
- **SOC2** requirements (audit logging)
- **GDPR** (consent tracking, data deletion)

#### Dependencies
- Requires: P0-6 (RBAC foundation)
- Blocks: All employer features (authentication required)

---

### P0-12: [MONITORING] Observability - Logging, Tracing, Metrics

**Priority**: 🔴 P0 - OPERATIONS
**Status**: Open
**Assignee**: @devops-lead, @backend-lead
**Labels**: `P0-critical`, `infrastructure`, `monitoring`
**Effort**: 1 week
**Sprint**: Phase 1 - Week 4

#### Problem
Insufficient observability for distributed microservices architecture. Cannot debug issues or track performance.

#### Current State
- ⚠️ Sentry (error tracking) - basic setup
- ⚠️ OpenTelemetry - mentioned but not fully implemented
- ❌ No distributed tracing (request IDs)
- ❌ No centralized logging (CloudWatch, ELK)
- ❌ No performance monitoring (APM)
- ❌ No custom metrics (Prometheus)

#### Required: 3 Pillars of Observability

**1. Logging**
```python
import structlog

logger = structlog.get_logger()

# Structured logging
logger.info(
    "job_created",
    job_id=job.id,
    company_id=job.company_id,
    user_id=current_user.id,
    duration_ms=duration,
)

# Aggregation: CloudWatch Logs or ELK Stack
```

**2. Distributed Tracing**
```python
from opentelemetry import trace

tracer = trace.get_tracer(__name__)

@tracer.start_as_current_span("create_job")
def create_job(...):
    # Auto-instrumented with trace_id, span_id
    # Propagates across services
    ...

# Visualization: Jaeger or Honeycomb
```

**3. Metrics**
```python
from prometheus_client import Counter, Histogram

jobs_created = Counter("jobs_created_total", "Total jobs created")
api_latency = Histogram("api_latency_seconds", "API request latency")

@api_latency.time()
async def create_job(...):
    jobs_created.inc()
    ...

# Export to Prometheus → Grafana dashboards
```

#### Acceptance Criteria
- [ ] Structured logging (JSON format)
- [ ] Centralized log aggregation (CloudWatch or ELK)
- [ ] Distributed tracing with request IDs
- [ ] Trace visualization (Jaeger/Honeycomb)
- [ ] Custom metrics (Prometheus)
- [ ] Grafana dashboards:
  - API latency (p50, p95, p99)
  - Error rates
  - Request throughput
  - Database query performance
  - LLM API costs
- [ ] Alerting (PagerDuty/OpsGenie):
  - Error rate > 1%
  - Latency p95 > 2s
  - Database connections > 80%

#### Dashboards
1. **Application Health**: Error rate, latency, throughput
2. **Database**: Query performance, connection pool, slow queries
3. **LLM Costs**: OpenAI token usage, costs per feature
4. **Business Metrics**: Jobs posted, applications submitted, match rate

#### Dependencies
- Requires: P0-3 (API gateway for request IDs)
- Benefits: Faster debugging, performance optimization

---

# P1: Employer MVP
## Essential Features for Launch (Weeks 5-16)

### P1-1: [BACKEND] Employer Registration & Onboarding API

**Priority**: 🟠 P1 - HIGH
**Status**: Open
**Assignee**: @backend-lead
**Labels**: `P1-high`, `backend`, `employer`, `auth`
**Effort**: 1 week
**Sprint**: Sprint 3-4, Weeks 5-6

#### User Story
> As a hiring manager, I want to create a company account so that I can post jobs and find candidates.

#### API Endpoints (5 endpoints)
```
POST   /api/v1/employers/register
POST   /api/v1/employers/verify-email
GET    /api/v1/employers/me
PUT    /api/v1/employers/me
PUT    /api/v1/employers/{company_id}
```

#### Registration Flow
```
1. POST /api/v1/employers/register
   - Input: email, password, companyName, industry, size
   - Output: user_id, company_id, access_token
   - Action: Create user + company, send verification email

2. POST /api/v1/employers/verify-email
   - Input: email, verification_code (6 digits)
   - Output: verified: true
   - Action: Mark email as verified

3. GET /api/v1/employers/me
   - Output: User profile + company profile
   - Action: Return current employer's data

4. PUT /api/v1/employers/me
   - Input: Profile updates (name, phone, etc.)
   - Output: Updated user

5. PUT /api/v1/employers/{company_id}
   - Input: Company updates (name, website, logo, etc.)
   - Output: Updated company
   - RBAC: Requires OWNER or ADMIN role
```

#### Data Models
```python
class EmployerRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    company_name: str = Field(min_length=2, max_length=255)
    industry: str
    company_size: str  # "1-10", "11-50", etc.
    location: str
    website: Optional[HttpUrl]

class EmployerResponse(BaseModel):
    user_id: UUID
    company_id: UUID
    email: EmailStr
    company_name: str
    role: str  # "owner" (first user)
    access_token: str
    refresh_token: str
```

#### Business Logic
- First user to register becomes OWNER role
- Auto-create Starter (Free) subscription
- Send welcome email with onboarding checklist
- Track onboarding completion (profile, first job post, etc.)

#### Acceptance Criteria
- [ ] 5 API endpoints implemented
- [ ] Email verification (6-digit code, 10-minute expiry)
- [ ] Password strength validation (min 8 chars, 1 uppercase, 1 number)
- [ ] Company domain auto-detection (email → company domain)
- [ ] Unit tests (15+ tests)
- [ ] API documentation (OpenAPI/Swagger)

#### Dependencies
- Requires: P0-2 (companies table), P0-5 (user_type)
- Blocks: P1-2 (employer dashboard)

---

### P1-2: [FRONTEND] Employer Registration & Onboarding Flow

**Priority**: 🟠 P1 - HIGH
**Status**: Open
**Assignee**: @frontend-lead
**Labels**: `P1-high`, `frontend`, `employer`
**Effort**: 1 week
**Sprint**: Sprint 3-4, Weeks 5-6

#### User Story
> As a hiring manager, I want a smooth registration experience so that I can start posting jobs quickly.

#### Pages
```
1. /employer/register           - Multi-step registration form
2. /employer/verify-email       - Email verification (6-digit code)
3. /employer/onboarding         - Onboarding checklist
4. /employer/dashboard          - Post-onboarding redirect
```

#### Registration Form (Multi-Step)
**Step 1: Account Details**
- Email (auto-detect company domain)
- Password (strength indicator)
- Confirm password

**Step 2: Company Info**
- Company name (auto-filled from email domain if possible)
- Industry (dropdown: Technology, Healthcare, Finance, etc.)
- Company size (dropdown: 1-10, 11-50, 51-200, etc.)
- Location (autocomplete)
- Website (optional)

**Step 3: Logo & Branding**
- Upload company logo (optional, can skip)
- Color theme selection (optional)

**Step 4: Plan Selection**
- Starter (Free) - Default
- Growth ($99/mo)
- Professional ($299/mo)

#### Onboarding Checklist
```tsx
<OnboardingChecklist
  steps={[
    { id: 1, title: "Complete company profile", completed: true },
    { id: 2, title: "Post your first job", completed: false },
    { id: 3, title: "Invite a team member", completed: false },
    { id: 4, title: "Set up notifications", completed: false },
  ]}
/>
```

#### Acceptance Criteria
- [ ] Multi-step form with progress indicator
- [ ] Email verification flow (6-digit code input)
- [ ] Form validation (Zod schemas)
- [ ] Password strength indicator
- [ ] Company domain auto-detection
- [ ] Logo upload (drag-and-drop or file picker)
- [ ] Plan selection with comparison table
- [ ] Onboarding checklist (dismissible)
- [ ] Mobile-responsive
- [ ] E2E tests (15+ scenarios)

#### Design
- **Style**: Clean, professional (B2B audience)
- **Colors**: Blue primary (differentiate from job seeker green)
- **Progress**: 4 steps, show progress bar
- **Validation**: Inline errors, real-time feedback

#### Dependencies
- Requires: P1-1 (backend APIs)
- Blocks: Employer can start posting jobs

---

### P1-3: [BACKEND] AI Job Description Generator API

**Priority**: 🟠 P1 - HIGH
**Status**: Open
**Assignee**: @ai-engineer, @backend-lead
**Labels**: `P1-high`, `backend`, `AI`, `employer`
**Effort**: 1 week
**Sprint**: Sprint 5-6, Weeks 9-10

#### User Story
> As a recruiter, I want to quickly create a job posting with AI assistance so that I can fill positions faster.

#### Problem
Writing full job descriptions is time-consuming (30-60 minutes per job). Employers want AI to do the heavy lifting.

#### Solution
**Input**: Minimal job details (title + 3-5 bullet points)
**Output**: Full job description (description, requirements, responsibilities, skills)

#### API Endpoints (3 endpoints)
```
POST   /api/v1/employer/jobs/generate-description
POST   /api/v1/employer/jobs/suggest-skills
POST   /api/v1/employer/jobs/suggest-salary
```

#### 1. Generate Job Description
```typescript
POST /api/v1/employer/jobs/generate-description
{
  "title": "Senior Backend Engineer",
  "key_points": [
    "Build scalable APIs with FastAPI",
    "Work with PostgreSQL and Redis",
    "Lead technical architecture decisions"
  ],
  "experience_level": "senior",
  "location": "San Francisco, CA",
  "location_type": "hybrid"
}

Response:
{
  "description": "We are seeking a Senior Backend Engineer to join our growing team...",
  "requirements": [
    "5+ years of backend development experience",
    "Expert-level Python and FastAPI",
    "Strong PostgreSQL and Redis knowledge",
    "Experience with distributed systems"
  ],
  "responsibilities": [
    "Design and build scalable RESTful APIs",
    "Lead technical architecture discussions",
    "Mentor junior engineers",
    "Optimize database performance"
  ],
  "suggested_skills": [
    "Python", "FastAPI", "PostgreSQL", "Redis",
    "Docker", "AWS", "Microservices"
  ]
}
```

#### 2. Suggest Skills
```typescript
POST /api/v1/employer/jobs/suggest-skills
{
  "title": "Senior Backend Engineer",
  "description": "Build scalable APIs..."
}

Response:
{
  "required_skills": ["Python", "FastAPI", "PostgreSQL"],
  "nice_to_have": ["Redis", "Docker", "Kubernetes"],
  "confidence": 0.95
}
```

#### 3. Suggest Salary Range
```typescript
POST /api/v1/employer/jobs/suggest-salary
{
  "title": "Senior Backend Engineer",
  "location": "San Francisco, CA",
  "experience_level": "senior"
}

Response:
{
  "min": 140000,
  "max": 180000,
  "currency": "USD",
  "confidence": 0.88,
  "data_source": "market_data_2024"
}
```

#### Prompting Strategy
```python
def generate_job_description(title, key_points, experience_level, location):
    prompt = f"""
    Generate a professional job description for the following role:

    Title: {title}
    Experience Level: {experience_level}
    Location: {location}

    Key Responsibilities:
    {'\n'.join(f'- {point}' for point in key_points)}

    Generate:
    1. A compelling job description (2-3 paragraphs, 150-200 words)
    2. Required qualifications (5-7 bullet points)
    3. Key responsibilities (5-7 bullet points)
    4. Suggested skills (technical skills relevant to this role)

    Tone: Professional, engaging, inclusive
    Avoid: Discriminatory language, age/gender bias, unrealistic requirements
    """

    response = openai.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": "You are a professional technical recruiter."},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
        max_tokens=800,
    )

    return parse_response(response.choices[0].message.content)
```

#### Acceptance Criteria
- [ ] 3 API endpoints implemented
- [ ] OpenAI GPT-4 integration (fallback to GPT-3.5 if costs high)
- [ ] Prompt engineering for quality outputs
- [ ] Hallucination guards (no fake company facts)
- [ ] Bias detection (no discriminatory language)
- [ ] Rate limiting (10 generations/day for free tier)
- [ ] Cost tracking (log token usage per request)
- [ ] Unit tests (20+ tests)
- [ ] Caching (cache results for 24 hours)

#### Cost Optimization
- Cache common job titles ("Software Engineer" → pre-generated template)
- Batch requests if multiple jobs posted
- Use GPT-3.5 for simple jobs, GPT-4 for complex

#### Dependencies
- Requires: OpenAI API key
- Blocks: P1-5 (job posting UI)

---

### P1-4: [BACKEND] Job Posting CRUD APIs

**Priority**: 🟠 P1 - HIGH
**Status**: Open
**Assignee**: @backend-lead
**Labels**: `P1-high`, `backend`, `employer`
**Effort**: 1 week
**Sprint**: Sprint 5-6, Weeks 9-10

#### User Story
> As a hiring manager, I want to create, edit, and manage job postings so that I can attract candidates.

#### API Endpoints (8 endpoints)
```
POST   /api/v1/employer/jobs
GET    /api/v1/employer/jobs
GET    /api/v1/employer/jobs/{id}
PUT    /api/v1/employer/jobs/{id}
DELETE /api/v1/employer/jobs/{id}
POST   /api/v1/employer/jobs/{id}/publish
POST   /api/v1/employer/jobs/{id}/pause
POST   /api/v1/employer/jobs/{id}/close
```

#### 1. Create Job
```typescript
POST /api/v1/employer/jobs
{
  "title": "Senior Backend Engineer",
  "department": "Engineering",
  "location": "San Francisco, CA",
  "location_type": "hybrid",
  "employment_type": "full_time",
  "experience_level": "senior",
  "salary_min": 140000,
  "salary_max": 180000,
  "salary_currency": "USD",
  "description": "Full job description...",
  "requirements": ["5+ years Python", "FastAPI experience"],
  "responsibilities": ["Build APIs", "Mentor engineers"],
  "skills": ["Python", "FastAPI", "PostgreSQL"],
  "status": "draft"  // or "active" to publish immediately
}

Response:
{
  "id": "uuid",
  "company_id": "uuid",
  "created_by": "uuid",
  "status": "draft",
  "created_at": "2025-11-14T...",
  ...
}
```

#### 2. List Jobs (with Filters)
```typescript
GET /api/v1/employer/jobs?status=active&page=1&limit=20&sort_by=created_at&order=desc

Response:
{
  "jobs": [...],
  "total": 45,
  "page": 1,
  "pages": 3
}
```

#### 3. Get Job Details
```typescript
GET /api/v1/employer/jobs/{id}

Response:
{
  "job": {...},
  "analytics": {
    "views": 1234,
    "applications": 67,
    "avg_fit_index": 82
  }
}
```

#### 4. Update Job
```typescript
PUT /api/v1/employer/jobs/{id}
{
  "title": "Updated title",
  "description": "Updated description"
}

Response:
{
  "job": {...updated job...}
}
```

#### 5. Publish Job
```typescript
POST /api/v1/employer/jobs/{id}/publish

Response:
{
  "status": "active",
  "published_at": "2025-11-14T..."
}
```

#### Business Logic
- **Status Transitions**:
  - `draft` → `active` (publish)
  - `active` → `paused` (pause)
  - `paused` → `active` (resume)
  - `active` → `closed` (close)
  - `closed` → cannot reopen (create new job instead)

- **Subscription Limits**:
  - Free: 1 active job max
  - Growth: 10 active jobs max
  - Professional: Unlimited
  - Enforce limits in `POST /publish` endpoint

- **Skills Embedding**:
  - On create/update, generate vector embedding for skills
  - Store in `skills_embedding` column (PostgreSQL pgvector)
  - Used for candidate matching

#### Acceptance Criteria
- [ ] 8 API endpoints implemented
- [ ] Status workflow enforced (draft→active→paused→closed)
- [ ] Subscription limit checks (prevent over-limit publishing)
- [ ] Skills embedding generation (OpenAI embeddings API)
- [ ] RBAC checks (hiring_manager role required)
- [ ] Audit logging (track all job changes)
- [ ] Unit tests (25+ tests)
- [ ] Integration tests (job creation → embedding → retrieval)

#### Dependencies
- Requires: P0-2 (jobs_native table), P1-3 (AI generation)
- Blocks: P1-5 (job posting UI)

---

### P1-5: [FRONTEND] Job Posting UI - Create & Manage Jobs

**Priority**: 🟠 P1 - HIGH
**Status**: Open
**Assignee**: @frontend-lead
**Labels**: `P1-high`, `frontend`, `employer`
**Effort**: 2 weeks
**Sprint**: Sprint 5-6, Weeks 11-12

#### User Story
> As a recruiter, I want an intuitive UI to create and manage job postings so that I can fill positions quickly.

#### Pages (4 pages)
```
1. /employer/jobs               - Job list (table view)
2. /employer/jobs/new           - Create new job
3. /employer/jobs/[id]/edit     - Edit existing job
4. /employer/jobs/[id]/preview  - Preview before publishing
```

#### 1. Job List Page
**Features**:
- Table view with columns: Title, Status, Applications, Fit Index, Created Date
- Filters: Status (all, draft, active, paused, closed), Department, Date range
- Sorting: Title, Applications, Fit Index, Created Date
- Bulk actions: Publish, Pause, Close (multi-select)
- Quick actions per row: View Applicants, Edit, Duplicate, Archive

**Layout**:
```tsx
<JobListPage>
  <Header>
    <Title>Jobs ({totalJobs})</Title>
    <CreateJobButton />
  </Header>

  <Filters>
    <StatusFilter />
    <DepartmentFilter />
    <DateRangeFilter />
  </Filters>

  <JobTable
    columns={["Title", "Status", "Applications", "Fit Index", "Created"]}
    onRowClick={openJobDetails}
    onBulkAction={handleBulkAction}
  />

  <Pagination />
</JobListPage>
```

#### 2. Create Job Page
**Form Sections**:

**Section 1: Basic Info**
- Job Title (with AI autocomplete suggestions)
- Department (dropdown or custom)
- Location (Google Places autocomplete)
- Location Type (Remote, Hybrid, Onsite)
- Employment Type (Full-time, Part-time, Contract, Internship)
- Experience Level (Entry, Mid, Senior, Lead, Executive)

**Section 2: Compensation**
- Salary Range (min/max with currency)
- AI Salary Suggestion button (uses P1-3 API)

**Section 3: Job Description**
- **AI Generation Option**:
  - "Generate with AI" button
  - Modal: Enter 3-5 key points → AI generates full description
- **Manual Option**:
  - Rich text editor (TipTap or Quill)
  - Character count, formatting tools

**Section 4: Requirements & Responsibilities**
- Requirements (bullet list, drag to reorder)
- Responsibilities (bullet list, drag to reorder)
- AI suggestion based on title

**Section 5: Skills**
- Skills autocomplete (with suggestions)
- Tag interface (add/remove skills)

**Section 6: Preview & Publish**
- Preview job posting as candidate would see it
- Publish button (or Save as Draft)

#### 3. AI Generation Modal
```tsx
<AIJobGenerationModal>
  <Title>Generate Job Description with AI</Title>

  <Form>
    <Input label="Job Title" value={jobTitle} />

    <TextArea
      label="Key Points (3-5 bullet points)"
      placeholder="- Build scalable APIs with FastAPI
- Work with PostgreSQL and Redis
- Lead technical architecture decisions"
    />

    <Select label="Experience Level" options={levels} />
    <Input label="Location" value={location} />
  </Form>

  <Footer>
    <Button onClick={generateDescription}>
      Generate Description
    </Button>
  </Footer>

  {generatedDescription && (
    <Preview>
      <Description>{generatedDescription}</Description>
      <Button onClick={applyDescription}>Use This Description</Button>
    </Preview>
  )}
</AIJobGenerationModal>
```

#### Acceptance Criteria
- [ ] 4 pages implemented (List, Create, Edit, Preview)
- [ ] AI job description generation integrated
- [ ] AI salary suggestion integrated
- [ ] Rich text editor for manual description
- [ ] Skills autocomplete with suggestions
- [ ] Form validation (Zod schemas)
- [ ] Auto-save drafts (every 30 seconds)
- [ ] Preview before publish
- [ ] Subscription limit checks (show warning if at limit)
- [ ] Mobile-responsive
- [ ] E2E tests (25+ scenarios)

#### Design
- **Layout**: Clean, professional B2B interface
- **AI Features**: Prominent "Generate with AI" buttons
- **Feedback**: Loading states for AI generation (3-5 seconds)
- **Validation**: Inline errors, character limits

#### Dependencies
- Requires: P1-3 (AI APIs), P1-4 (CRUD APIs)
- Blocks: Employers can post jobs

---

### P1-6: [BACKEND] AI Candidate Ranking Engine

**Priority**: 🟠 P1 - HIGH (CORE DIFFERENTIATOR)
**Status**: Open
**Assignee**: @ai-engineer, @backend-lead
**Labels**: `P1-high`, `backend`, `AI`, `matching`
**Effort**: 2 weeks
**Sprint**: Sprint 7-8, Weeks 13-14

#### User Story
> As a hiring manager, I want candidates automatically ranked by fit so that I can focus on the best matches first.

#### Problem
Employers drown in applications (50-200+ per job). Manual review takes hours. AI ranking automates triage.

#### Solution
**Multi-Factor Scoring Algorithm**: Calculate 0-100 Fit Index based on 6 factors:
1. **Skills Match** (30% weight) - Embeddings similarity
2. **Experience Level** (20% weight) - Years of experience vs requirement
3. **Location Match** (15% weight) - Proximity, remote preference
4. **Salary Expectation** (10% weight) - Within budget range
5. **Culture Fit** (15% weight) - Resume tone analysis
6. **Availability** (10% weight) - Start date match

#### API Endpoints
```
GET    /api/v1/employer/jobs/{job_id}/applicants/ranked
POST   /api/v1/employer/applicants/{id}/rank
```

#### Ranking Algorithm
```python
def calculate_candidate_fit_index(candidate, job):
    """
    Calculate 0-100 Fit Index for candidate-job match.

    Returns:
    {
      "fit_index": 87,
      "explanations": ["95% skills match", "5 years experience matches senior level"],
      "strengths": ["Expert Python", "Remote experience", "Within salary range"],
      "concerns": ["Start date 60 days (prefer 30)"]
    }
    """
    factors = {
        "skills_match": 0.30,      # 30% weight
        "experience_level": 0.20,   # 20%
        "location_match": 0.15,     # 15%
        "salary_expectation": 0.10, # 10%
        "culture_fit": 0.15,        # 15%
        "availability": 0.10        # 10%
    }

    score = 0
    explanations = []
    strengths = []
    concerns = []

    # 1. Skills Matching (Embeddings)
    candidate_skills_embedding = get_embedding(candidate.skills)
    job_skills_embedding = get_embedding(job.skills)
    skills_similarity = cosine_similarity(
        candidate_skills_embedding,
        job_skills_embedding
    )
    skills_score = skills_similarity * 100
    score += skills_score * factors["skills_match"]

    if skills_similarity > 0.9:
        strengths.append(f"{int(skills_similarity * 100)}% skills match")
    elif skills_similarity < 0.5:
        concerns.append(f"Only {int(skills_similarity * 100)}% skills match")

    explanations.append(f"Skills match: {int(skills_similarity * 100)}%")

    # 2. Experience Level Matching
    exp_match = match_experience_level(
        candidate.years_experience,
        job.experience_level
    )
    exp_score = exp_match * 100
    score += exp_score * factors["experience_level"]

    if exp_match > 0.8:
        strengths.append(f"{candidate.years_experience} years experience matches {job.experience_level} level")

    # 3. Location Matching
    loc_match = match_location(
        candidate.location,
        job.location,
        job.location_type
    )
    loc_score = loc_match * 100
    score += loc_score * factors["location_match"]

    if job.location_type == "remote" or candidate.location == job.location:
        strengths.append("Location matches")

    # 4. Salary Matching
    salary_match = match_salary(
        candidate.expected_salary_min,
        candidate.expected_salary_max,
        job.salary_min,
        job.salary_max
    )
    salary_score = salary_match * 100
    score += salary_score * factors["salary_expectation"]

    if salary_match > 0.8:
        strengths.append(f"Salary expectation ${candidate.expected_salary_min}K-${candidate.expected_salary_max}K within your ${job.salary_min}K-${job.salary_max}K range")
    elif salary_match < 0.5:
        concerns.append(f"Salary expectation ${candidate.expected_salary_min}K above your max ${job.salary_max}K")

    # 5. Culture Fit (LLM-based tone analysis)
    culture_fit = analyze_culture_fit(candidate.resume, job.description)
    culture_score = culture_fit * 100
    score += culture_score * factors["culture_fit"]

    # 6. Availability
    avail_match = match_availability(
        candidate.start_date,
        job.desired_start_date
    )
    avail_score = avail_match * 100
    score += avail_score * factors["availability"]

    if avail_match < 0.5:
        concerns.append(f"Start date {candidate.start_date} (prefer {job.desired_start_date})")

    return {
        "fit_index": int(score),
        "explanations": explanations,
        "strengths": strengths[:5],  # Top 5
        "concerns": concerns[:3],     # Top 3
        "breakdown": {
            "skills_match": int(skills_score),
            "experience_level": int(exp_score),
            "location_match": int(loc_score),
            "salary_expectation": int(salary_score),
            "culture_fit": int(culture_score),
            "availability": int(avail_score),
        }
    }
```

#### Acceptance Criteria
- [ ] Ranking algorithm implemented (6 factors)
- [ ] Embeddings-based skills matching (OpenAI API)
- [ ] Fit Index stored in `employer_candidate_rankings` table
- [ ] Explanations generated (strengths, concerns)
- [ ] API returns ranked list (sorted by fit_index DESC)
- [ ] Caching (rank calculated once, cached for 7 days)
- [ ] Unit tests (30+ tests for each factor)
- [ ] Performance: <500ms per candidate ranking

#### Cost Optimization
- Pre-compute embeddings (don't regenerate on every ranking)
- Batch ranking (rank all applicants in single API call)
- Cache results (7-day TTL)

#### Dependencies
- Requires: P0-2 (employer_candidate_rankings table), Pinecone (embeddings)
- Blocks: P1-7 (ATS applicant list UI)

---

### P1-7: [BACKEND] Basic ATS - Application Pipeline APIs

**Priority**: 🟠 P1 - HIGH
**Status**: Open
**Assignee**: @backend-lead
**Labels**: `P1-high`, `backend`, `employer`, `ATS`
**Effort**: 1 week
**Sprint**: Sprint 7-8, Weeks 15-16

#### User Story
> As a recruiter, I want to manage candidates through hiring stages so that I can track progress and make decisions.

#### Pipeline Stages (8 stages)
```
1. New (auto-assigned when candidate applies)
2. Reviewing
3. Phone Screen
4. Technical Interview
5. Final Interview
6. Offer
7. Hired
8. Rejected
```

#### API Endpoints (8 endpoints)
```
GET    /api/v1/employer/jobs/{job_id}/applicants
GET    /api/v1/employer/applicants/{id}
PUT    /api/v1/employer/applicants/{id}/stage
POST   /api/v1/employer/applicants/{id}/notes
GET    /api/v1/employer/applicants/{id}/notes
POST   /api/v1/employer/applicants/{id}/assign
POST   /api/v1/employer/applicants/bulk-update
GET    /api/v1/employer/applicants/{id}/timeline
```

#### 1. List Applicants (with Filters & Ranking)
```typescript
GET /api/v1/employer/jobs/{job_id}/applicants?
  status=reviewing,phone_screen&
  min_fit_index=70&
  assigned_to=user_id&
  page=1&
  limit=20&
  sort_by=fit_index&
  order=desc

Response:
{
  "applicants": [
    {
      "id": "uuid",
      "candidate": {
        "id": "uuid",
        "name": "Alice Johnson",
        "email": "alice@example.com",
        "location": "San Francisco, CA",
        "years_experience": 7
      },
      "fit_index": 92,
      "strengths": ["Expert Python", "5+ years FastAPI"],
      "concerns": ["Salary $180K above budget"],
      "stage": "reviewing",
      "applied_at": "2025-11-10T...",
      "resume_url": "s3://...",
      "cover_letter_text": "...",
      "assigned_to": null,
      "is_starred": false,
      "tags": ["senior", "remote"]
    },
    ...
  ],
  "total": 67,
  "page": 1,
  "pages": 4
}
```

#### 2. Get Applicant Details
```typescript
GET /api/v1/employer/applicants/{id}

Response:
{
  "applicant": {...},
  "timeline": [
    { "event": "Applied", "timestamp": "2025-11-10T10:00:00Z" },
    { "event": "Moved to Reviewing", "by": "John Recruiter", "timestamp": "2025-11-10T11:00:00Z" },
    { "event": "Note added", "by": "Sarah Manager", "timestamp": "2025-11-11T09:00:00Z" }
  ],
  "notes": [...],
  "interviews": [...]
}
```

#### 3. Update Stage
```typescript
PUT /api/v1/employer/applicants/{id}/stage
{
  "stage": "phone_screen",
  "note": "Moving to phone screen based on strong Python skills"
}

Response:
{
  "applicant": {...updated...},
  "stage_history": [
    { "stage": "new", "timestamp": "...", "changed_by": null },
    { "stage": "reviewing", "timestamp": "...", "changed_by": "user_id" },
    { "stage": "phone_screen", "timestamp": "...", "changed_by": "user_id" }
  ]
}
```

#### 4. Add Note
```typescript
POST /api/v1/employer/applicants/{id}/notes
{
  "content": "Great interview! Strong technical skills. @john_recruiter please schedule final round.",
  "visibility": "team"  // "private" | "team"
}

Response:
{
  "note": {
    "id": "uuid",
    "content": "...",
    "author": {
      "id": "uuid",
      "name": "Sarah Manager"
    },
    "mentions": ["john_recruiter"],
    "created_at": "..."
  }
}
```

#### 5. Bulk Update
```typescript
POST /api/v1/employer/applicants/bulk-update
{
  "applicant_ids": ["uuid1", "uuid2", "uuid3"],
  "action": "move_to_stage",
  "target_stage": "rejected",
  "note": "Not a good fit for this role"
}

Response:
{
  "updated": 3,
  "failed": 0
}
```

#### Business Logic
- **Stage Transitions**: Validate allowed transitions (can't go from "hired" to "rejected")
- **Notifications**: Notify assigned recruiter when stage changes
- **Audit Trail**: Log all stage changes in `stage_history` JSONB column
- **@Mentions**: Parse notes for @mentions, send notifications

#### Acceptance Criteria
- [ ] 8 API endpoints implemented
- [ ] Stage workflow validated (8 stages, logical transitions)
- [ ] Filtering (status, fit_index, assigned_to, tags)
- [ ] Sorting (fit_index, applied_date, stage_updated_at)
- [ ] Notes with @mentions (parse and notify mentioned users)
- [ ] Bulk actions (move stage, assign, reject)
- [ ] Timeline/audit trail per applicant
- [ ] RBAC checks (recruiter role required)
- [ ] Unit tests (30+ tests)

#### Dependencies
- Requires: P0-2 (job_applications, application_notes tables), P1-6 (ranking)
- Blocks: P1-8 (ATS UI)

---

(Continuing with P1-8 through P1-18...)

Due to length constraints, I'll create a summary of remaining issues. Would you like me to:

1. **Continue with full details** for all remaining issues (P1-8 through P3-12)
2. **Create a condensed version** with summaries
3. **Export this to multiple files** (one per priority level)

Let me know your preference and I'll complete the comprehensive issue documentation.

---

## Quick Summary of Remaining Issues

### P1: Employer MVP (10 more issues)
- P1-8: ATS Frontend - Kanban Board & List Views
- P1-9: Employer Dashboard - Overview & Metrics
- P1-10: Company Settings & Team Management
- P1-11: Billing & Subscription Management (Stripe)
- P1-12: Email Notifications for Employers
- P1-13: Job Templates Library
- P1-14: Application Export (CSV, PDF)
- P1-15: Mobile-Responsive Employer Portal
- P1-16: Employer Onboarding Tutorial/Walkthrough
- P1-17: Employer Analytics - Basic Metrics
- P1-18: Integration Tests - Full Employer Flow

### P2: Advanced Features (17 issues)
- Candidate Search & Profiling (complete)
- Mass Posting with AI (CSV bulk upload)
- Interview Scheduling (calendar integration)
- Team Collaboration (activity feed, @mentions)
- Advanced Analytics (sourcing, pipeline, ROI)
- Multi-Board Distribution (LinkedIn, Indeed)
- Skills Assessments
- Reference Checking
- Offer Management
- Candidate Comparison Tool
- Saved Searches & Alerts
- Email Templates & Automation
- Browser Extension for sourcing
- Zapier/API Integrations
- Custom Job Board Widget
- Employer Referral Program
- White-Label Options (Enterprise)

### P3: Enterprise & Scale (12 issues)
- API Access (REST API for ATS integrations)
- Database Sharding Strategy
- Performance Optimization (caching, indexing)
- Advanced Compliance (SOC2, GDPR)
- Video Interview Integration
- Background Check Integration
- Skills Assessment Platform
- Advanced Security (SSO, SAML)
- Disaster Recovery
- Load Testing & Capacity Planning
- Advanced Observability
- Cost Optimization (LLM usage)

**Total**: 59 issues across 4 priority levels

---

## Success Metrics

### Phase 1: Employer MVP (Months 1-4)
- [ ] 500+ employers registered
- [ ] 1,000+ jobs posted
- [ ] 10,000+ applications received
- [ ] 15% free-to-paid conversion
- [ ] <10 min time to first job post

### Phase 2: Advanced Features (Months 5-8)
- [ ] 5,000+ employers
- [ ] 10,000+ jobs posted
- [ ] 100,000+ applications
- [ ] $200K/month employer revenue

### Phase 3: Enterprise & Scale (Months 9-12)
- [ ] 10,000+ employers
- [ ] 50,000+ jobs posted
- [ ] 1M+ applications
- [ ] $500K/month total revenue ($6M annual run rate)
- [ ] 10+ enterprise customers ($299+/month)

---

**Next Steps**:
1. Review and prioritize issues with stakeholders
2. Assign issues to sprint backlogs
3. Create GitHub issues (or use this document as source)
4. Track progress weekly in sprint planning

Would you like me to complete the full detailed version of all 59 issues?
