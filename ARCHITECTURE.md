# HireFlux - Technical Architecture Document

**Version**: 1.0
**Last Updated**: 2025-10-22
**Document Owner**: Architecture Team
**Status**: Draft

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Overview](#system-overview)
3. [Architecture Principles](#architecture-principles)
4. [High-Level Architecture](#high-level-architecture)
5. [Component Architecture](#component-architecture)
6. [Data Architecture](#data-architecture)
7. [Integration Architecture](#integration-architecture)
8. [Security Architecture](#security-architecture)
9. [Infrastructure Architecture](#infrastructure-architecture)
10. [Scalability & Performance](#scalability--performance)
11. [Deployment Architecture](#deployment-architecture)
12. [Monitoring & Observability](#monitoring--observability)

---

## Executive Summary

HireFlux is a cloud-native, AI-powered job application platform built on a modern microservices-inspired architecture. The system leverages:

- **Frontend**: Next.js 14+ (App Router) with TypeScript
- **Backend**: FastAPI (Python 3.11+) with async workers
- **Database**: PostgreSQL (Supabase) with vector search (Pinecone)
- **AI/ML**: OpenAI GPT-4 for generation, embeddings for matching
- **Infrastructure**: Cloud-native (Vercel/AWS/GCP) with containerization

**Key Architectural Decisions**:
- Serverless-first for frontend and API gateway
- Async job processing for long-running AI tasks
- Vector database for semantic job matching
- Event-driven architecture for notifications and analytics
- Multi-layer caching for performance and cost optimization

---

## System Overview

### System Context Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        HireFlux System                          │
│                                                                 │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐ │
│  │   Web App    │      │  Mobile Web  │      │    Admin     │ │
│  │  (Next.js)   │      │  (Responsive)│      │   Portal     │ │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘ │
│         │                     │                     │         │
│         └─────────────────────┼─────────────────────┘         │
│                               │                               │
│                      ┌────────▼────────┐                       │
│                      │   API Gateway   │                       │
│                      │   (FastAPI)     │                       │
│                      └────────┬────────┘                       │
│                               │                               │
│         ┌─────────────────────┼─────────────────────┐         │
│         │                     │                     │         │
│    ┌────▼─────┐        ┌─────▼─────┐        ┌─────▼─────┐   │
│    │  Auth    │        │  Core API │        │  AI/ML    │   │
│    │ Service  │        │  Service  │        │  Service  │   │
│    └────┬─────┘        └─────┬─────┘        └─────┬─────┘   │
│         │                    │                     │         │
│         │              ┌─────▼─────┐               │         │
│         │              │  Worker   │               │         │
│         │              │  Service  │               │         │
│         │              └─────┬─────┘               │         │
│         │                    │                     │         │
│    ┌────▼────────────────────▼─────────────────────▼─────┐  │
│    │              Data & Storage Layer                   │  │
│    │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │  │
│    │  │PostgreSQL│ │ Pinecone │ │  Redis   │ │   S3   │ │  │
│    │  └──────────┘ └──────────┘ └──────────┘ └────────┘ │  │
│    └──────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
   ┌────▼────┐          ┌──────▼──────┐        ┌─────▼─────┐
   │ OpenAI  │          │   Stripe    │        │  Job Feed │
   │   API   │          │  Payments   │        │   APIs    │
   └─────────┘          └─────────────┘        └───────────┘
```

### Key Subsystems

1. **User-Facing Applications**
   - Web application (Next.js)
   - Admin portal (shared codebase)

2. **API Layer**
   - API Gateway (routing, auth, rate limiting)
   - Core API Service (business logic)
   - Auth Service (authentication, authorization)
   - AI/ML Service (generation, embeddings)

3. **Worker Layer**
   - Resume generation workers
   - Cover letter generation workers
   - Job sync workers
   - Email notification workers
   - Auto-apply workers

4. **Data Layer**
   - PostgreSQL (relational data)
   - Pinecone (vector embeddings)
   - Redis (cache, sessions, queues)
   - S3/Supabase Storage (files)

5. **External Integrations**
   - OpenAI (GPT-4, embeddings)
   - Stripe (payments)
   - Job boards (Greenhouse, Lever)
   - Email (Resend/SendGrid)

---

## Architecture Principles

### 1. Scalability First
- Horizontal scaling for stateless services
- Async processing for heavy workloads
- Caching at multiple levels

### 2. Cost Optimization
- LLM call minimization (caching, batching)
- Serverless for variable loads
- Resource pooling and reuse

### 3. Security by Design
- Zero-trust architecture
- Encryption at rest and in transit
- Least-privilege access control
- PII data isolation

### 4. Reliability & Resilience
- Graceful degradation
- Circuit breakers for external services
- Retry with exponential backoff
- 99.9% uptime target

### 5. Observability
- Distributed tracing
- Structured logging
- Real-time metrics
- Alerting and incident response

### 6. Developer Experience
- API-first design
- Clear separation of concerns
- Comprehensive testing
- Self-documenting code

---

## High-Level Architecture

### Layered Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Presentation Layer                    │
│  - Next.js App Router (Server Components + Client)     │
│  - React Components (shadcn/ui, Tailwind)              │
│  - State Management (React Context, Zustand)           │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS/REST
┌────────────────────────▼────────────────────────────────┐
│                    API Gateway Layer                    │
│  - FastAPI Router                                       │
│  - Authentication Middleware (JWT)                      │
│  - Rate Limiting (Redis)                                │
│  - Request Validation (Pydantic)                        │
│  - CORS, Security Headers                               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                   Business Logic Layer                  │
│  - User Service (profiles, onboarding)                  │
│  - Resume Service (generation, versioning)              │
│  - Job Service (matching, search)                       │
│  - Application Service (Apply Assist, tracking)         │
│  - Billing Service (Stripe, credits)                    │
│  - Notification Service (email, in-app)                 │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                      Data Access Layer                  │
│  - Repository Pattern (CRUD operations)                 │
│  - ORM (SQLAlchemy)                                     │
│  - Query Optimization                                   │
│  - Transaction Management                               │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│                       Data Layer                        │
│  - PostgreSQL (primary datastore)                       │
│  - Pinecone (vector search)                             │
│  - Redis (cache, queues)                                │
│  - S3 (file storage)                                    │
└─────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Frontend Components

```
frontend/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/
│   │   ├── signup/
│   │   └── reset-password/
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Authenticated layout
│   │   ├── dashboard/
│   │   ├── resumes/
│   │   ├── cover-letters/
│   │   ├── jobs/
│   │   ├── applications/
│   │   └── settings/
│   ├── (public)/
│   │   ├── page.tsx              # Landing page
│   │   └── pricing/
│   └── api/                      # API routes (proxy to backend)
│
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── auth/                     # Auth forms, providers
│   ├── resumes/                  # Resume builder components
│   ├── jobs/                     # Job search, cards
│   └── shared/                   # Shared components
│
├── lib/
│   ├── api.ts                    # API client
│   ├── auth.ts                   # Auth helpers
│   ├── utils.ts                  # Utilities
│   └── hooks/                    # Custom React hooks
│
├── types/                        # TypeScript types
└── styles/                       # Global styles
```

### Backend Services

```
backend/
├── app/
│   ├── main.py                   # FastAPI app entry
│   ├── config.py                 # Configuration
│   │
│   ├── api/                      # API routes
│   │   ├── v1/
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── resumes.py
│   │   │   ├── cover_letters.py
│   │   │   ├── jobs.py
│   │   │   ├── applications.py
│   │   │   ├── subscriptions.py
│   │   │   └── webhooks.py
│   │   └── deps.py               # Dependencies (DB, auth)
│   │
│   ├── services/                 # Business logic
│   │   ├── auth_service.py
│   │   ├── resume_service.py
│   │   ├── ai_service.py
│   │   ├── job_service.py
│   │   ├── matching_service.py
│   │   ├── billing_service.py
│   │   └── notification_service.py
│   │
│   ├── workers/                  # Background workers
│   │   ├── resume_worker.py
│   │   ├── job_sync_worker.py
│   │   ├── email_worker.py
│   │   └── auto_apply_worker.py
│   │
│   ├── models/                   # SQLAlchemy models
│   │   ├── user.py
│   │   ├── resume.py
│   │   ├── job.py
│   │   ├── application.py
│   │   └── subscription.py
│   │
│   ├── schemas/                  # Pydantic schemas (DTOs)
│   │   ├── user.py
│   │   ├── resume.py
│   │   └── ...
│   │
│   ├── repositories/             # Data access layer
│   │   ├── base.py
│   │   ├── user_repo.py
│   │   ├── resume_repo.py
│   │   └── ...
│   │
│   ├── core/                     # Core utilities
│   │   ├── security.py           # JWT, hashing
│   │   ├── cache.py              # Redis cache
│   │   ├── queue.py              # Task queue
│   │   └── exceptions.py         # Custom exceptions
│   │
│   ├── integrations/             # External services
│   │   ├── openai_client.py
│   │   ├── pinecone_client.py
│   │   ├── stripe_client.py
│   │   ├── greenhouse_client.py
│   │   └── email_client.py
│   │
│   └── db/                       # Database
│       ├── session.py            # DB session
│       └── migrations/           # Alembic migrations
│
├── tests/                        # Test suite
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── scripts/                      # Utility scripts
    ├── seed_db.py
    └── sync_jobs.py
```

---

## Data Architecture

### Database Schema (PostgreSQL)

**Core Entities**:
- `users` - User accounts
- `profiles` - User profiles (1:1 with users)
- `resumes` - Uploaded resumes
- `resume_versions` - Generated resume versions
- `cover_letters` - Generated cover letters
- `jobs` - Job postings
- `job_sources` - Job board sources
- `match_scores` - Job-user match scores
- `applications` - Application tracking
- `credit_wallets` - User credit balances
- `credit_ledger` - Credit transactions
- `subscriptions` - Stripe subscriptions
- `interview_sessions` - Interview practice data
- `events_audit` - Audit log

**Relationships**:
```
users (1) ──── (1) profiles
users (1) ──── (N) resumes
users (1) ──── (N) resume_versions
users (1) ──── (N) cover_letters
users (1) ──── (N) applications
users (1) ──── (1) credit_wallets
users (1) ──── (N) credit_ledger
users (1) ──── (1) subscriptions

jobs (1) ──── (N) match_scores
jobs (1) ──── (N) applications

resume_versions (1) ──── (N) cover_letters
resume_versions (1) ──── (N) applications
```

### Vector Database (Pinecone)

**Indexes**:
1. **job-embeddings** (dimension: 1536)
   - Stores job title + description embeddings
   - Metadata: job_id, title, company, location, salary, remote_policy

2. **user-skills-embeddings** (dimension: 1536)
   - Stores user skills + target titles embeddings
   - Metadata: user_id, target_titles, seniority

### Cache Layer (Redis)

**Key Patterns**:
- `session:{user_id}` - User sessions (TTL: 24h)
- `rate_limit:{user_id}:{endpoint}` - Rate limiting counters
- `job_matches:{user_id}` - Cached job matches (TTL: 1h)
- `resume_cache:{resume_id}` - Cached resume data (TTL: 6h)
- `embedding_cache:{text_hash}` - Cached embeddings (TTL: 7d)
- `queue:resume_generation` - Job queue for resume generation
- `queue:email_notifications` - Job queue for emails

### File Storage (S3/Supabase)

**Buckets**:
- `resumes/` - Original uploaded resumes
- `generated_resumes/` - Generated resume PDFs
- `cover_letters/` - Generated cover letter PDFs
- `avatars/` - User profile pictures

---

## Integration Architecture

### OpenAI Integration

**Endpoints Used**:
- `POST /v1/chat/completions` - Resume/cover letter generation
- `POST /v1/embeddings` - Text embeddings for matching

**Flow**:
```
API Request → Rate Limiter → OpenAI Client → Retry Logic → Response Cache → API Response
                                    ↓
                              Token Logger → Database/Analytics
```

**Cost Optimization**:
- Response caching (Redis) - 1h TTL for similar prompts
- Prompt compression (remove unnecessary tokens)
- Batch embeddings (up to 2048 inputs per request)
- Model selection (GPT-4 Turbo for speed, GPT-4 for quality)

### Stripe Integration

**Webhook Events**:
- `checkout.session.completed` → Create subscription
- `invoice.paid` → Renew subscription
- `invoice.payment_failed` → Notify user, retry
- `customer.subscription.updated` → Update subscription status
- `customer.subscription.deleted` → Cancel subscription

**Idempotency**:
- Use `idempotency_key` for all Stripe API calls
- Store webhook event IDs to prevent duplicate processing

### Job Board Integration

**Sources**:
- Greenhouse API (authenticated)
- Lever API (authenticated)
- Future: LinkedIn Jobs, Indeed (scraping with permission)

**ETL Pipeline**:
```
Scheduled Job (daily) → Fetch Jobs → Normalize Data → Deduplicate →
  Generate Embeddings → Upsert to Pinecone → Upsert to PostgreSQL
```

---

## Security Architecture

### Authentication Flow

```
User Login → Validate Credentials → Generate JWT (access + refresh) →
  Store in httpOnly Cookie → Return to Client

Protected Request → Extract JWT → Verify Signature → Check Expiry →
  Extract User Claims → Authorize Access
```

**JWT Structure**:
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "plan": "plus",
  "exp": 1234567890,
  "iat": 1234567890
}
```

### Authorization

**Role-Based Access Control (RBAC)**:
- `user` - Standard user
- `admin` - Admin user (full access)
- `support` - Support user (read-only, limited write)

**Permission Checks**:
- API middleware checks user role
- Resource ownership verification (user can only access their own data)
- Feature gating based on subscription plan

### Data Encryption

**At Rest**:
- PostgreSQL: Transparent Data Encryption (TDE)
- S3: Server-Side Encryption (SSE-S3)
- Sensitive fields: Application-level encryption (PII)

**In Transit**:
- HTTPS/TLS 1.3 for all traffic
- Certificate pinning for mobile (future)

### Compliance

**GDPR/CCPA**:
- Data export API (`GET /api/users/me/export`)
- Data deletion API (`DELETE /api/users/me`)
- Consent tracking in `events_audit`
- PII minimization

**Audit Logging**:
- All auto-apply actions logged to `events_audit`
- Immutable logs (append-only)
- Retention: 2 years

---

## Infrastructure Architecture

### Deployment Environments

1. **Development** (local)
   - Docker Compose
   - Local PostgreSQL, Redis
   - Mock external services

2. **Staging** (cloud)
   - Mirrors production
   - Separate databases
   - Test mode for Stripe

3. **Production** (cloud)
   - Multi-region (future)
   - Auto-scaling
   - Live mode for Stripe

### Cloud Architecture (AWS Example)

```
┌─────────────────────────────────────────────────────────────┐
│                         AWS Cloud                           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   CloudFront (CDN)                   │  │
│  └────────────────────────┬─────────────────────────────┘  │
│                           │                                │
│  ┌────────────────────────▼─────────────────────────────┐  │
│  │          Application Load Balancer (ALB)            │  │
│  └────────────┬───────────────────────┬─────────────────┘  │
│               │                       │                    │
│  ┌────────────▼────────┐  ┌──────────▼──────────┐         │
│  │  ECS/Fargate        │  │  ECS/Fargate        │         │
│  │  (Frontend)         │  │  (Backend API)      │         │
│  │  Next.js            │  │  FastAPI            │         │
│  └─────────────────────┘  └──────────┬──────────┘         │
│                                      │                    │
│                          ┌───────────▼───────────┐        │
│                          │   ECS/Fargate         │        │
│                          │   (Workers)           │        │
│                          └───────────┬───────────┘        │
│                                      │                    │
│  ┌───────────────────────────────────▼──────────────────┐ │
│  │              Data & Storage Layer                   │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │ │
│  │  │   RDS    │ │ElastiCache│ │   S3    │ │Secrets │ │ │
│  │  │(Postgres)│ │  (Redis)  │ │         │ │Manager │ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────┘ │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Scalability Strategy

**Horizontal Scaling**:
- API servers: Auto-scale based on CPU (target: 70%)
- Workers: Scale based on queue depth
- Database: Read replicas for heavy reads

**Vertical Scaling**:
- Database: Increase instance size for complex queries
- Redis: Increase memory for larger cache

**Caching Strategy**:
- L1: In-memory cache (application)
- L2: Redis (distributed cache)
- L3: CDN (static assets)

---

## Scalability & Performance

### Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page TTFB | < 300ms (p95) | CloudFront + Next.js |
| API Latency (non-AI) | < 300ms (p95) | FastAPI |
| AI Generation | < 6s (p95) | OpenAI + caching |
| Database Query | < 100ms (p95) | PostgreSQL indexes |
| Job Match Search | < 500ms (p95) | Pinecone |

### Optimization Techniques

1. **Database Optimization**:
   - Indexes on frequently queried columns
   - Materialized views for complex queries
   - Connection pooling (max 20 connections)
   - Query result caching (Redis)

2. **API Optimization**:
   - Response compression (gzip)
   - Pagination (default: 20 items)
   - Field selection (sparse fieldsets)
   - ETags for conditional requests

3. **AI Optimization**:
   - Prompt caching (Redis, 1h TTL)
   - Embedding caching (Redis, 7d TTL)
   - Batch processing (embeddings, emails)
   - Async processing (workers)

4. **Frontend Optimization**:
   - Code splitting (Next.js automatic)
   - Image optimization (Next.js Image)
   - Lazy loading (components, routes)
   - Prefetching (critical data)

---

## Monitoring & Observability

### Logging

**Structured Logging** (JSON format):
```json
{
  "timestamp": "2025-10-22T10:30:00Z",
  "level": "INFO",
  "service": "api",
  "request_id": "abc123",
  "user_id": "user_456",
  "message": "Resume generated successfully",
  "duration_ms": 4500,
  "model": "gpt-4-turbo",
  "tokens": 2000,
  "cost_usd": 0.12
}
```

### Tracing

**OpenTelemetry**:
- Trace ID propagation across services
- Span creation for each operation
- Export to Jaeger or cloud provider

**Example Trace**:
```
POST /api/resumes/generate
  ├─ validate_request (10ms)
  ├─ get_user_profile (50ms)
  │   └─ db_query (45ms)
  ├─ generate_resume (4500ms)
  │   ├─ build_prompt (100ms)
  │   ├─ openai_api_call (4200ms)
  │   └─ parse_response (200ms)
  └─ save_resume_version (100ms)
      └─ db_insert (95ms)
```

### Metrics

**Key Metrics**:
- Request rate (req/s)
- Error rate (%)
- Latency (p50, p95, p99)
- Active users (DAU, MAU)
- AI costs ($/user/month)
- Conversion rate (Free → Paid)

**Dashboards**:
- System health (CPU, memory, disk)
- API performance (latency, errors)
- Business metrics (signups, conversions, MRR)
- Cost tracking (OpenAI, infrastructure)

### Alerting

**Alert Conditions**:
- Error rate > 5% (5min window) → PagerDuty
- p95 latency > 1s (5min window) → Slack
- Database CPU > 80% → Email
- OpenAI cost spike > 2x avg → Email
- Failed payments > 10/hour → Slack

---

## Deployment Architecture

### CI/CD Pipeline

```
Git Push → GitHub Actions →
  ├─ Install Dependencies
  ├─ Run Linters (ESLint, Black)
  ├─ Run Unit Tests (Jest, Pytest)
  ├─ Run Integration Tests
  ├─ Build (Next.js, Docker)
  ├─ Security Scan (Snyk, Trivy)
  └─ Deploy to Staging

Manual Approval →
  └─ Deploy to Production
      ├─ Blue-Green Deployment
      ├─ Health Checks
      ├─ Smoke Tests
      └─ Rollback (if failed)
```

### Database Migrations

**Alembic Migration Strategy**:
- Migrations run automatically on deployment
- Backward-compatible changes only
- Zero-downtime migrations (additive changes first)

**Example Migration Flow**:
1. Add new column (nullable)
2. Deploy application code (reads/writes new column)
3. Backfill data (background job)
4. Make column non-nullable (next deployment)

---

## Technology Stack Summary

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript 5.0+
- **UI Library**: React 18+
- **Styling**: Tailwind CSS 3.0+
- **Components**: shadcn/ui, Radix UI
- **State Management**: React Context, Zustand
- **Forms**: React Hook Form, Zod validation
- **HTTP Client**: Fetch API / Axios
- **Testing**: Jest, React Testing Library, Playwright

### Backend
- **Framework**: FastAPI 0.104+
- **Language**: Python 3.11+
- **ORM**: SQLAlchemy 2.0+
- **Validation**: Pydantic 2.0+
- **Workers**: RQ or Celery
- **HTTP Server**: Uvicorn (ASGI)
- **Testing**: Pytest, Pytest-asyncio

### Database & Storage
- **Primary Database**: PostgreSQL 15+ (Supabase)
- **Vector Database**: Pinecone
- **Cache & Queue**: Redis 7.0+
- **File Storage**: S3 or Supabase Storage

### AI & ML
- **LLM**: OpenAI GPT-4, GPT-4 Turbo
- **Embeddings**: OpenAI text-embedding-ada-002
- **Prompt Management**: Custom (database-backed)

### Infrastructure
- **Hosting**: Vercel (frontend), AWS/GCP (backend)
- **CDN**: CloudFront or Vercel Edge
- **Containerization**: Docker, Docker Compose
- **Orchestration**: ECS/Fargate or Kubernetes (future)

### Integrations
- **Payments**: Stripe
- **Email**: Resend or SendGrid
- **Auth**: Supabase Auth or Auth.js
- **Monitoring**: Sentry (errors), OpenTelemetry (tracing)
- **Analytics**: PostHog or Mixpanel

### DevOps
- **CI/CD**: GitHub Actions
- **IaC**: Terraform or Pulumi (future)
- **Secrets**: AWS Secrets Manager or Doppler
- **Logging**: CloudWatch or Datadog

---

## Appendix

### Architectural Decision Records (ADRs)

**ADR-001: Why FastAPI over Flask/Django**
- **Decision**: Use FastAPI
- **Rationale**: Async support, automatic API docs, Pydantic validation, performance
- **Trade-offs**: Smaller ecosystem than Django

**ADR-002: Why Pinecone over pgvector**
- **Decision**: Use Pinecone for vector search
- **Rationale**: Managed service, better performance for large-scale embeddings, dedicated for vector search
- **Trade-offs**: Additional cost, vendor lock-in

**ADR-003: Why Next.js App Router over Pages Router**
- **Decision**: Use App Router
- **Rationale**: Server Components, better performance, future-proof
- **Trade-offs**: Newer, smaller ecosystem

**ADR-004: Why Supabase over self-hosted PostgreSQL**
- **Decision**: Use Supabase
- **Rationale**: Managed service, built-in auth, real-time subscriptions, storage
- **Trade-offs**: Vendor lock-in, less control

---

**Document Status**: Draft
**Next Review**: 2025-11-01
**Approvers**: Engineering Lead, CTO, Product Owner
