# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: HireFlux

AI-powered Job Application Copilot that streamlines job search with tailored resumes/cover letters, high-fit role matching, consent-based auto-apply, and interview preparation.

## Tech Stack

### Frontend
- **Framework**: Next.js (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS or CSS-in-JS
- **Auth**: Supabase Auth or Auth.js with JWT sessions

### Backend
- **Framework**: FastAPI (Python)
- **Workers**: Celery or RQ for async generation/apply jobs
- **Queue**: Redis

### Data & Storage
- **Database**: Supabase/Postgres
- **Vector DB**: Pinecone (embeddings for skills/job matching)
- **Storage**: Supabase Storage or S3 for artifacts (resumes, cover letters)

### AI & External Services
- **LLM**: OpenAI GPT-4/GPT-4 Turbo (option to swap to Claude for tone)
- **Payments**: Stripe (subscriptions + usage-based credits)
- **Email**: Resend or SendGrid
- **Speech**: Whisper or equivalent STT (phase 2)
- **Observability**: OpenTelemetry + Sentry

### Integrations
- Job feeds: Greenhouse, Lever APIs, partner feeds
- LLM: OpenAI with rate limiting, retry with backoff, cost logging
- Payments: Stripe Subscriptions + Metered usage

## Data Model (High-Level)

Core tables:
- `users`, `profiles` - User identity and preferences
- `resumes`, `resume_versions` - Multiple resume versions per job family
- `cover_letters` - Generated cover letters
- `jobs`, `job_sources`, `match_scores` - Job matching engine
- `applications` - Application tracking with artifact bundles
- `interview_sessions` - Interview coach data
- `credit_wallets`, `credit_ledger` - Credit system with refunds
- `subscriptions` - Stripe billing integration
- `events_audit` - Immutable audit logs for compliance

## Architecture Patterns

### Core Flows
1. **Resume Generation**: Upload parsing (PDF/DOCX) → extraction → ATS optimization → versioning
2. **Job Matching**: Skills embeddings + recency + seniority → 0-100 "Fit Index" with rationale
3. **Auto-Apply**: Two modes (Apply Assist with user confirm, Auto-Apply with pre-approval) → credit system with refunds
4. **Interview Coach**: Mock interviews → STT → LLM feedback (STAR framework) → scoring

### Key Technical Requirements
- **Performance**: p95 page TTFB < 300ms; p95 generation < 6s
- **Availability**: 99.9% uptime; graceful degradation on provider errors
- **Security**: SOC2-ready; encrypted PII at rest; least-privilege authZ
- **Compliance**: GDPR/CCPA; explicit consent; immutable audit logs
- **Accessibility**: WCAG 2.1 AA

### AI/LLM Patterns
- Dynamic tone styles: formal, concise, conversational
- Hallucination guardrails: company facts require source or neutral phrasing
- Cost optimization: caching, prompt compression, batch jobs, model fallback
- Provider-level tracing and token cost logging per request

### Credit System
- Free: 3 cover letters, 10 job suggestions/month
- Plus ($19/mo): Unlimited resumes/letters, 100 weekly suggestions
- Pro ($49/mo): +50 auto-apply credits/month
- Refund logic: Invalid/mismatched jobs (JD unavailable or below threshold)

## Development Commands

*To be added once project structure is established:*
- Setup and installation
- Database migrations
- Running dev servers (frontend/backend)
- Running tests
- Linting and formatting
- Building for production

## Key Features

1. **AI Resume Builder**: ATS-optimized, multiple tones, versioning, <3min to first resume
2. **Cover Letter Generator**: Fine-tuned prompts, achievement injection, hallucination guards
3. **Job Match Engine**: Embeddings-based, Fit Index 0-100, filters (remote/visa/salary)
4. **Auto Apply System**: Compliance-first, credit-based, audit logs, refund policy
5. **Interview Sim Coach**: Job-specific questions, STAR feedback, transcript storage
6. **Job Insights Dashboard**: Pipeline tracking, metrics, anomaly detection
7. **Notifications**: High-fit roles, status changes, credit updates

## Success Metrics (KPIs)

- Activation: ≥30% complete resume + 1 letter in first session
- Match Quality: ≥40% CTR on Top Matches email
- Conversion: Free→Paid ≥8% within 14 days
- Apply-to-Interview: ≥15% by week 4
- Churn: <6% monthly (Plus), <4% (Pro)
- LLM Cost/User: <$1.20/month average

## Compliance & Legal Considerations

- **Job board ToS**: Only use approved APIs/partners; no ToS-violating scraping
- **Automation**: Explicit user consent; Apply Assist where auto-apply disallowed
- **Audit trail**: Immutable event logs for all applications
- **PII**: Minimization, encryption at rest/transit, deletion on request
- **Rate limits**: Respect per-site policies; user-configurable thresholds

## Phase Targets

- **MVP (6-8 weeks)**: Resume/letter generation, job matching, Apply Assist, Plus plan, Stripe
- **Beta (12 weeks)**: Auto-Apply with refunds, Interview Coach (text), gamification
- **GA (16 weeks)**: Pro plan, admin console, compliance baseline, accessibility AA

## Important Notes

- All AI outputs must avoid template sameness via dynamic tone + achievement injection
- Job matching uses transparent Fit Index with "why this matches" rationale
- Credit refunds are objective and audit-driven (build trust)
- Compliance-first approach: never violate site ToS, always get user consent
- Cost consciousness: cache aggressively, log all LLM token usage, implement fallbacks
