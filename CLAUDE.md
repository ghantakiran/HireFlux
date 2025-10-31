# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project: HireFlux

**Two-Sided AI Recruiting Marketplace** that serves both job seekers and employers.

**Job Seeker Side**: AI-powered application copilot with tailored resumes/cover letters, high-fit role matching, consent-based auto-apply, and interview preparation.

**Employer Side**: AI-powered recruiting platform with job posting, candidate ranking, applicant tracking, mass posting capabilities, and intelligent candidate profiling.

**Vision**: Become the leading AI-based recruiting company that eases hiring for both job seekers AND companies through intelligent automation and minimal input requirements.

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

### Job Seeker Tables
- `users`, `profiles` - User identity and preferences
- `resumes`, `resume_versions` - Multiple resume versions per job family
- `cover_letters` - Generated cover letters
- `jobs`, `job_sources`, `match_scores` - Job matching engine
- `applications` - Application tracking with artifact bundles
- `interview_sessions` - Interview coach data
- `credit_wallets`, `credit_ledger` - Credit system with refunds
- `subscriptions` - Stripe billing integration
- `candidate_profiles` - Public opt-in profiles for employer discovery

### Employer Tables
- `companies`, `company_members` - Company identity and team access
- `company_subscriptions` - Employer billing and plan limits
- `jobs` (native posting) - Employer-created job postings
- `job_applications` - Application submissions from job seekers
- `application_notes` - Hiring team notes and feedback
- `interview_schedules` - Interview coordination
- `employer_candidate_rankings` - AI-powered fit index scores
- `candidate_views` - Candidate profile view tracking
- `bulk_job_uploads` - Mass posting operations

### Shared Tables
- `events_audit` - Immutable audit logs for compliance (both sides)

## Architecture Patterns

### Core Flows

#### Job Seeker Flows
1. **Resume Generation**: Upload parsing (PDF/DOCX) → extraction → ATS optimization → versioning
2. **Job Matching**: Skills embeddings + recency + seniority → 0-100 "Fit Index" with rationale
3. **Auto-Apply**: Two modes (Apply Assist with user confirm, Auto-Apply with pre-approval) → credit system with refunds
4. **Interview Coach**: Mock interviews → STT → LLM feedback (STAR framework) → scoring

#### Employer Flows
5. **Job Posting with AI**: Minimal input (title, key points) → AI generates full JD → skills extraction → multi-board distribution
6. **Candidate Ranking**: Application received → AI calculates Fit Index (0-100) → multi-factor scoring (skills 30%, experience 20%, location 15%, salary 10%, culture 15%, availability 10%) → ranked list with explanations
7. **Applicant Tracking**: Pipeline management (8 stages: New → Screening → Interview → Offer → Hired/Rejected) → team notes → interview scheduling
8. **Mass Posting**: CSV upload (max 500 jobs) → AI normalization → duplicate detection → scheduled publishing → multi-board syndication

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

### Pricing & Credit System

#### Job Seeker Plans
- **Free**: 3 cover letters, 10 job suggestions/month
- **Plus ($19/mo)**: Unlimited resumes/letters, 100 weekly suggestions
- **Pro ($49/mo)**: +50 auto-apply credits/month
- **Premium ($99/mo)**: Unlimited auto-apply, priority matching, interview coach unlimited
- **Refund logic**: Invalid/mismatched jobs (JD unavailable or below threshold)

#### Employer Plans
- **Starter (Free)**: 1 active job, 10 candidate views/month, basic application inbox
- **Growth ($99/mo)**: 10 active jobs, 100 candidate views/month, AI ranking, basic ATS, 3 team seats
- **Professional ($299/mo)**: Unlimited jobs, unlimited candidate views, full ATS, 10 team seats, mass posting, advanced analytics
- **Enterprise (Custom)**: Unlimited everything, API access, white-label, dedicated support, SLA

## Development Commands

*To be added once project structure is established:*
- Setup and installation
- Database migrations
- Running dev servers (frontend/backend)
- Running tests
- Linting and formatting
- Building for production

## Key Features

### Job Seeker Features
1. **AI Resume Builder**: ATS-optimized, multiple tones, versioning, <3min to first resume
2. **Cover Letter Generator**: Fine-tuned prompts, achievement injection, hallucination guards
3. **Job Match Engine**: Embeddings-based, Fit Index 0-100, filters (remote/visa/salary)
4. **Auto Apply System**: Compliance-first, credit-based, audit logs, refund policy
5. **Interview Sim Coach**: Job-specific questions, STAR feedback, transcript storage
6. **Job Insights Dashboard**: Pipeline tracking, metrics, anomaly detection
7. **Candidate Profiles**: Public opt-in profiles for employer discovery, portfolio showcase

### Employer Features
8. **AI Job Description Generator**: Minimal input → full JD with requirements, responsibilities, skills
9. **Candidate Ranking Engine**: AI-powered Fit Index (0-100) for each applicant with explanations
10. **Applicant Tracking System**: Full pipeline management (8 stages), team notes, interview scheduling
11. **Candidate Search & Profiling**: Advanced filters, proactive sourcing, invite to apply
12. **Mass Posting with AI**: CSV bulk upload (500 jobs), AI normalization, multi-board distribution
13. **Team Collaboration**: 6 role types (Owner/Admin/Manager/Recruiter/Interviewer/Viewer), @mentions, activity feed
14. **Employer Analytics**: Sourcing, pipeline, time-to-hire, quality, cost metrics, funnel visualization
15. **Company Dashboard**: Overview metrics, quick actions, active jobs, new applications

### Shared Features
16. **Notifications**: Job seekers (high-fit roles, status changes), Employers (new applications, team activity)
17. **Compliance & Audit**: Immutable audit logs, GDPR/CCPA compliance, explicit consent tracking

## Success Metrics (KPIs)

### Job Seeker Metrics
- **Activation**: ≥30% complete resume + 1 letter in first session
- **Match Quality**: ≥40% CTR on Top Matches email
- **Conversion**: Free→Paid ≥8% within 14 days
- **Apply-to-Interview**: ≥15% by week 4
- **Churn**: <6% monthly (Plus), <4% (Pro)
- **LLM Cost/User**: <$1.20/month average

### Employer Metrics
- **Time to First Job Post**: <10 minutes from registration
- **Application Quality**: ≥60% of applications rated "Good Fit" (Fit Index ≥70)
- **Time to Hire**: <30 days from job posting to offer accepted
- **Conversion**: Free→Paid ≥15% within 30 days
- **Job Fill Rate**: ≥70% of active jobs filled within 60 days
- **Churn**: <5% monthly (Growth/Professional), <3% (Enterprise)

### Marketplace Health
- **Supply/Demand Ratio**: 20-50 active candidates per job posting (healthy range)
- **Match Rate**: ≥30% of applications have Fit Index ≥70
- **Cross-Side Growth**: Each side growing 10%+ monthly
- **Network Effects**: Employer acquisition cost declining as candidate base grows

## Compliance & Legal Considerations

- **Job board ToS**: Only use approved APIs/partners; no ToS-violating scraping
- **Automation**: Explicit user consent; Apply Assist where auto-apply disallowed
- **Audit trail**: Immutable event logs for all applications
- **PII**: Minimization, encryption at rest/transit, deletion on request
- **Rate limits**: Respect per-site policies; user-configurable thresholds

## Phase Targets

### Job Seeker Side (Original Timeline)
- **MVP (6-8 weeks)**: Resume/letter generation, job matching, Apply Assist, Plus plan, Stripe
- **Beta (12 weeks)**: Auto-Apply with refunds, Interview Coach (text), gamification
- **GA (16 weeks)**: Pro plan, admin console, compliance baseline, accessibility AA

### Two-Sided Marketplace Expansion (New Timeline)
- **Phase 1: Employer MVP (Months 1-4, ~16 weeks)**
  - Employer registration & onboarding
  - AI job description generator
  - Job posting CRUD with templates
  - Basic ATS (pipeline management)
  - AI candidate ranking engine (Fit Index)
  - Employer dashboard with overview metrics
  - Growth plan ($99/mo) billing

- **Phase 2: Advanced Employer Features (Months 5-8)**
  - Candidate search & profiling
  - Mass posting with AI (CSV upload)
  - Team collaboration (roles, permissions, @mentions)
  - Interview scheduling
  - Advanced analytics & reporting
  - Professional plan ($299/mo)
  - Multi-board job distribution

- **Phase 3: Scale & Enterprise (Months 9-12)**
  - Enterprise features (API access, white-label)
  - Advanced compliance tools
  - Skills assessments & video interviews
  - Background check integrations
  - Referral programs & network effects optimization
  - Marketplace health monitoring
  - Revenue target: $500K/month ($6M annual run rate)

### Parallel Workstreams
- Continue enhancing job seeker features while building employer side
- Leverage existing AI infrastructure (embeddings, LLM pipelines) for both sides
- Unified audit logs and compliance framework across both sides

## Important Notes

### Job Seeker Side
- All AI outputs must avoid template sameness via dynamic tone + achievement injection
- Job matching uses transparent Fit Index with "why this matches" rationale
- Credit refunds are objective and audit-driven (build trust)
- Compliance-first approach: never violate site ToS, always get user consent
- Cost consciousness: cache aggressively, log all LLM token usage, implement fallbacks

### Employer Side
- AI job descriptions from minimal inputs (title + 3-5 bullet points)
- Candidate ranking must be explainable (show strengths/concerns)
- Mass posting handles normalization, deduplication, and validation automatically
- Team collaboration with granular permissions (6 role types)
- Compliance-first: audit all actions, respect candidate privacy

### Two-Sided Marketplace Strategy
- **Network Effects**: More job seekers → better candidates → attracts employers → more jobs → attracts job seekers
- **Differentiation**: Best-in-class AI on BOTH sides (competitors excel at one side only)
- **Cold Start**: Launch with existing job seeker base first, then onboard employers
- **Quality Over Quantity**: High Fit Index matches benefit both sides
- **Trust & Transparency**: Objective metrics (Fit Index), explainable AI, refund policies
- **Revenue Model**: Dual-sided monetization ($300K/mo job seekers + $200K/mo employers = $6M/year target)

### Technical Architecture
- **Shared Infrastructure**: Unified embeddings service, LLM pipeline, audit logs
- **Microservices**: Separate services for job seeker features vs. employer features
- **Scalability**: Design for 1M+ job seekers, 500K+ employers, 10M+ applications/year
- **Data Privacy**: Strict separation between employer view and candidate PII
