# Architectural Roadmap - HireFlux 2025

**Document Version**: 1.0
**Last Updated**: October 28, 2025
**Status**: ACTIVE ROADMAP
**Review Cycle**: Weekly Sprint Reviews

---

## Executive Summary

### Current State Analysis

**Backend**: **95% Complete** ✅
- 22/22 services fully implemented
- 111 API endpoints across 13 modules
- 249 unit/integration tests passing
- Database migrations current (version: `86ee369868da`)
- Docker Compose environment configured (PostgreSQL + Redis)
- Performance optimization indexes deployed (23 indexes)

**Frontend**: **50% Complete** ⚠️
- **Authentication System**: **95% Complete** ✅ (JUST COMPLETED)
  - Enhanced Zustand auth store with persistence
  - Protected route HOC
  - Dashboard layout with responsive sidebar
  - OAuth UI ready (backend integration pending)
  - Session restoration and token refresh

- **Other Pages**: **35% Complete** 🔴
  - 20 pages created (file structure exists)
  - Most are placeholder implementations
  - Need full API integration, state management, forms, UI components

**Infrastructure**: **40% Complete** ⚠️
- Local development: Docker Compose ready
- CI/CD: Not configured
- Staging: Documentation ready, not deployed
- Monitoring: Not configured

### Critical Gap Identified

**The primary blocker to MVP is frontend page implementation.** Backend is production-ready, but frontend pages need:
- API integration with backend endpoints
- State management (Zustand stores)
- Form handling (React Hook Form + Zod)
- Complete UI components (shadcn/ui)
- Error handling and loading states
- E2E testing

### Strategic Recommendation

**Accelerated Frontend Sprint** - 4 weeks instead of 6:
- Week 1: Resume Management (3 pages)
- Week 2: Job Matching & Applications (5 pages)
- Week 3: Cover Letters, Settings & Billing (4 pages)
- Week 4: Interview Buddy, Auto-Apply & Polish (3 pages)

**Rationale**: Authentication system completion (which was planned for Week 1-2) is now done, allowing us to accelerate timeline by 2 weeks.

---

## Phase 2A: Frontend Implementation Sprint (4 Weeks)

### Week 1: Resume Management
**Dates**: November 4-8, 2025
**Priority**: CRITICAL 🔴
**Dependencies**: Auth system (✅ Complete)

#### Objectives
1. Implement resume list page with CRUD operations
2. Build resume builder form (form-based MVP)
3. Create resume detail/view page
4. Add resume versioning UI
5. Integrate ATS recommendations display

#### Deliverables

**1. Resume List Page** (`/dashboard/resumes`)
- Display user's resumes with metadata (title, last updated, version)
- Create new resume button
- Edit/delete actions
- Search and filter functionality
- API Integration: `GET /api/v1/resume/list`

**2. Resume Builder** (`/dashboard/resumes/builder` or `/dashboard/resumes/new`)
- Multi-step form (Personal Info → Experience → Education → Skills)
- Real-time validation with Zod schemas
- Auto-save functionality (debounced)
- AI-powered content suggestions
- API Integration:
  - `POST /api/v1/resume/create`
  - `POST /api/v1/ai/enhance-resume`

**3. Resume Detail/View Page** (`/dashboard/resumes/[id]`)
- Preview resume in formatted view
- Edit mode toggle
- Version history display
- Download as PDF/DOCX
- ATS score display
- API Integration:
  - `GET /api/v1/resume/{resume_id}`
  - `GET /api/v1/resume/{resume_id}/versions`
  - `POST /api/v1/resume/{resume_id}/download`

#### Technical Requirements
- **State Management**: Create `useResumeStore` Zustand store
- **Forms**: React Hook Form with Zod validation
- **Components**: Resume preview, version history timeline, ATS score card
- **API Client**: Extend existing `api.ts` with resume endpoints

#### Success Metrics
- Users can create resume in < 10 minutes
- Resume builder auto-saves every 30 seconds
- ATS score visible on detail page
- All CRUD operations functional

#### Testing Requirements
- Unit tests for resume store
- Integration tests for API calls
- E2E tests for full resume creation flow

---

### Week 2: Job Matching & Applications
**Dates**: November 11-15, 2025
**Priority**: CRITICAL 🔴
**Dependencies**: Resume management (Week 1)

#### Objectives
1. Implement job search with filters
2. Build job detail page/modal
3. Create applications tracking interface
4. Add pipeline visualization (Kanban board)
5. Implement "Apply" functionality

#### Deliverables

**1. Job Search Page** (`/dashboard/jobs`)
- Search bar with keyword search
- Filters: remote, visa sponsorship, salary range, location, seniority
- Job cards displaying:
  - Job title, company, location
  - **Fit Index (0-100)** with color coding
  - Match rationale ("Why this matches")
  - Salary range, posted date
- Pagination or infinite scroll
- Save job functionality
- API Integration:
  - `GET /api/v1/jobs/search`
  - `GET /api/v1/jobs/recommendations`
  - `POST /api/v1/jobs/{job_id}/save`

**2. Job Detail Page** (`/dashboard/jobs/[id]`)
- Full job description
- Company information
- Detailed Fit Index breakdown (skills match, experience match, etc.)
- "Quick Apply" button
- "Save for Later" button
- Similar jobs section
- API Integration:
  - `GET /api/v1/jobs/{job_id}`
  - `GET /api/v1/jobs/{job_id}/fit-score`
  - `POST /api/v1/auto-apply/apply`

**3. Applications Tracking** (`/dashboard/applications`)
- List view with filters (status, date range, company)
- Pipeline view (Kanban board):
  - Saved
  - Applied
  - Interview Scheduled
  - Interviewing
  - Offer Received
  - Accepted/Rejected
- Drag-and-drop status updates
- Application detail modal
- Analytics summary (total apps, response rate, etc.)
- API Integration:
  - `GET /api/v1/auto-apply/applications`
  - `PATCH /api/v1/auto-apply/applications/{id}/status`
  - `GET /api/v1/analytics/pipeline-stats`

#### Technical Requirements
- **State Management**: Create `useJobStore` and `useApplicationStore`
- **Components**:
  - Job card component
  - Fit Index badge with tooltip
  - Kanban board (use `@dnd-kit/core` for drag-drop)
  - Application detail modal
- **API Client**: Job and application endpoints

#### Success Metrics
- Job search returns results in < 2 seconds
- Fit Index clearly displayed and understandable
- Users can update application status via drag-drop
- Pipeline view intuitive and responsive

#### Testing Requirements
- E2E test: Search jobs → View detail → Apply
- E2E test: Drag-drop application status update
- Integration tests for job matching API

---

### Week 3: Cover Letters, Settings & Billing
**Dates**: November 18-22, 2025
**Priority**: HIGH 🟡
**Dependencies**: Job matching (Week 2)

#### Objectives
1. Implement cover letter generation flow
2. Build user settings page
3. Create billing/subscription management UI
4. Add credit wallet display
5. Implement Stripe checkout flow

#### Deliverables

**1. Cover Letter Generation** (`/dashboard/cover-letters`)
- List of generated cover letters
- "Generate New" button
- Generation form:
  - Select resume
  - Select job (or paste JD)
  - Choose tone (formal, concise, conversational)
  - Optional: Custom achievements
- Real-time generation with loading state
- Preview and edit functionality
- Download as PDF/TXT
- API Integration:
  - `POST /api/v1/cover-letters/generate`
  - `GET /api/v1/cover-letters/list`
  - `PUT /api/v1/cover-letters/{id}`
  - `POST /api/v1/cover-letters/{id}/download`

**2. User Settings** (`/dashboard/settings`)
- **Profile Tab**:
  - Edit personal information
  - Upload profile photo
  - Change password
- **Preferences Tab**:
  - Job search preferences (remote, visa, salary range)
  - Notification preferences
  - AI tone preference (default)
- **Security Tab**:
  - Active sessions
  - Two-factor authentication (optional, MVP can defer)
- API Integration:
  - `GET /api/v1/users/me`
  - `PATCH /api/v1/users/me`
  - `POST /api/v1/auth/change-password`

**3. Billing & Subscription** (`/dashboard/settings/billing`)
- Current plan display (Free, Plus, Pro)
- Upgrade/downgrade buttons
- Credit wallet balance
- Credit usage history
- Payment method management
- Billing history
- Stripe checkout integration
- API Integration:
  - `GET /api/v1/billing/subscription`
  - `POST /api/v1/billing/create-checkout-session`
  - `POST /api/v1/billing/manage-subscription` (portal URL)
  - `GET /api/v1/billing/credits/balance`
  - `GET /api/v1/billing/credits/ledger`

**4. Pricing Page** (`/pricing`)
- Plan comparison table (Free, Plus $19/mo, Pro $49/mo)
- Feature breakdown
- "Get Started" buttons → Stripe checkout
- Already implemented (static), needs Stripe integration

#### Technical Requirements
- **State Management**:
  - `useUserStore` for profile settings
  - `useBillingStore` for subscription and credits
- **Components**:
  - Cover letter editor (rich text or markdown)
  - Settings form with tabs
  - Pricing table with Stripe buttons
  - Credit wallet widget (for dashboard sidebar)
- **Stripe Integration**:
  - `@stripe/stripe-js` and `@stripe/react-stripe-js`
  - Checkout session creation
  - Subscription portal redirect

#### Success Metrics
- Cover letter generation completes in < 15 seconds
- Users can edit and download cover letters
- Stripe checkout works end-to-end
- Credit balance visible in sidebar

#### Testing Requirements
- E2E test: Generate cover letter from job
- E2E test: Stripe checkout flow (test mode)
- Integration test: Cover letter API calls

---

### Week 4: Interview Buddy, Auto-Apply & Polish
**Dates**: November 25-29, 2025
**Priority**: MEDIUM 🟢
**Dependencies**: Applications tracking (Week 2)

#### Objectives
1. Implement Interview Buddy (mock interview UI)
2. Build Auto-Apply configuration page
3. Add notifications page
4. Polish UI/UX across all pages
5. Add error handling and loading states
6. Accessibility improvements (WCAG 2.1 AA)

#### Deliverables

**1. Interview Buddy** (`/dashboard/interview-buddy`)
- **Start Interview Screen**:
  - Select job (or enter custom)
  - Choose interview type (behavioral, technical, etc.)
  - Start interview button
- **Interview Session**:
  - Display interview question
  - Text input for answer (MVP: text-based, defer STT to post-MVP)
  - Submit answer
  - Receive AI feedback (STAR framework, score, suggestions)
  - Next question
- **Session History**:
  - Past interview sessions
  - View transcript and feedback
- API Integration:
  - `POST /api/v1/interview/session/start`
  - `POST /api/v1/interview/session/{id}/answer`
  - `GET /api/v1/interview/session/{id}/feedback`
  - `GET /api/v1/interview/sessions`

**2. Auto-Apply Configuration** (`/dashboard/auto-apply`)
- **Settings**:
  - Enable/disable auto-apply
  - Set daily application limit
  - Minimum Fit Index threshold (e.g., only apply to jobs > 70)
  - Blacklist companies
  - Preferred locations/remote
- **Approved Jobs**:
  - List of jobs pending auto-apply
  - Review and approve/reject each
  - Bulk approve
- **Activity Log**:
  - Recent auto-apply actions
  - Success/failure status
  - Credit usage
- API Integration:
  - `GET /api/v1/auto-apply/config`
  - `PATCH /api/v1/auto-apply/config`
  - `GET /api/v1/auto-apply/queue`
  - `POST /api/v1/auto-apply/approve`
  - `GET /api/v1/auto-apply/activity`

**3. Notifications** (`/dashboard/notifications`)
- Notification list (inbox-style)
- Mark as read/unread
- Filter by type (job match, application update, system)
- Real-time updates (WebSocket or polling)
- API Integration:
  - `GET /api/v1/notifications`
  - `PATCH /api/v1/notifications/{id}/mark-read`
  - `DELETE /api/v1/notifications/{id}`

**4. UI/UX Polish**
- **Error Handling**:
  - Global error boundary
  - Toast notifications for errors
  - Friendly error messages
  - Retry buttons on failures
- **Loading States**:
  - Skeleton loaders for content
  - Spinners for actions
  - Progress bars for long operations (e.g., AI generation)
- **Accessibility**:
  - Keyboard navigation
  - ARIA labels
  - Focus management
  - Color contrast (WCAG AA)
- **Responsive Design**:
  - Mobile-friendly layouts
  - Touch-friendly buttons
  - Collapsible sidebar on mobile

#### Technical Requirements
- **Components**:
  - Interview question card
  - Answer input with character count
  - Feedback display with score visualization
  - Notification list with read/unread states
  - Toast notification system (use `react-hot-toast`)
  - Error boundary component
  - Skeleton loaders
- **State Management**:
  - `useInterviewStore`
  - `useAutoApplyStore`
  - `useNotificationStore`
- **Accessibility**:
  - `@radix-ui` primitives (already used via shadcn/ui)
  - Test with keyboard navigation
  - Test with screen reader (VoiceOver/NVDA)

#### Success Metrics
- Interview session completes without errors
- Auto-apply queue functional
- Notifications display and update in real-time
- All pages accessible via keyboard
- Mobile layouts work on 375px width

#### Testing Requirements
- E2E test: Complete interview session
- E2E test: Configure auto-apply settings
- E2E test: Mark notification as read
- Accessibility audit with Lighthouse (score > 90)

---

## Phase 2B: DevOps & Infrastructure (Parallel with Frontend)

### Week 1-2: CI/CD Pipeline
**Priority**: HIGH 🟡
**Can run parallel with frontend Week 1-2**

#### Objectives
1. Set up GitHub Actions workflows
2. Configure automated testing
3. Add code quality checks
4. Set up Docker build and push

#### Deliverables

**1. GitHub Actions Workflows**

**`.github/workflows/backend-ci.yml`**:
```yaml
name: Backend CI

on:
  push:
    branches: [main, develop]
    paths:
      - 'backend/**'
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt

      - name: Run migrations
        run: |
          cd backend
          alembic upgrade head
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/test_db

      - name: Run tests
        run: |
          cd backend
          pytest tests/ -v --cov=app --cov-report=xml
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost/test_db
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./backend/coverage.xml

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install linting tools
        run: |
          pip install black flake8 mypy

      - name: Run black
        run: black backend/app --check

      - name: Run flake8
        run: flake8 backend/app --max-line-length=100

      - name: Run mypy
        run: mypy backend/app
```

**`.github/workflows/frontend-ci.yml`**:
```yaml
name: Frontend CI

on:
  push:
    branches: [main, develop]
    paths:
      - 'frontend/**'
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Run type check
        run: |
          cd frontend
          npm run type-check

      - name: Run linting
        run: |
          cd frontend
          npm run lint

      - name: Run unit tests
        run: |
          cd frontend
          npm run test

      - name: Run E2E tests
        run: |
          cd frontend
          npx playwright install --with-deps
          npm run test:e2e
        env:
          NEXT_PUBLIC_API_URL: http://localhost:8000/api/v1
```

**`.github/workflows/deploy-staging.yml`** (triggered on push to `develop`):
```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Railway
        run: |
          # Railway deployment steps
          # Configure via Railway CLI or API

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        run: |
          # Vercel deployment steps
          # Configure via Vercel CLI
```

#### Success Metrics
- All tests pass on every push
- CI pipeline completes in < 5 minutes
- Test coverage reports available
- Failed builds block PR merges

---

### Week 3: Staging Environment Deployment
**Priority**: HIGH 🟡
**Can run parallel with frontend Week 3**

#### Objectives
1. Deploy backend to Railway (or Render)
2. Deploy frontend to Vercel
3. Configure Supabase PostgreSQL
4. Configure Upstash Redis
5. Set up environment variables
6. Test end-to-end on staging

#### Deliverables

**1. Backend Deployment (Railway)**
- Follow `STAGING_ENVIRONMENT_SETUP.md` (already created)
- Configure environment variables:
  - `DATABASE_URL` (Supabase)
  - `REDIS_URL` (Upstash)
  - `OPENAI_API_KEY`
  - `STRIPE_SECRET_KEY`
  - `PINECONE_API_KEY`
  - `JWT_SECRET`
- Run migrations on staging database
- Verify health endpoint: `https://api-staging.hireflux.com/health`

**2. Frontend Deployment (Vercel)**
- Connect GitHub repo to Vercel
- Configure build settings:
  - Framework: Next.js
  - Root directory: `frontend`
  - Build command: `npm run build`
  - Output directory: `.next`
- Set environment variables:
  - `NEXT_PUBLIC_API_URL=https://api-staging.hireflux.com/api/v1`
  - OAuth client IDs (if available)
- Deploy: `https://staging.hireflux.com`

**3. Database Setup (Supabase)**
- Create Supabase project
- Enable Row Level Security (RLS) policies
- Run Alembic migrations
- Seed with test data (optional)

**4. Redis Setup (Upstash)**
- Create Upstash Redis instance
- Configure connection string in Railway

#### Success Metrics
- Staging environment accessible via HTTPS
- Authentication works end-to-end
- Can create resume and generate cover letter
- Job search returns results
- Stripe checkout works (test mode)

#### Testing Checklist
- [ ] User registration and login
- [ ] Create resume
- [ ] Generate cover letter
- [ ] Search jobs
- [ ] Apply to job
- [ ] View dashboard analytics
- [ ] Stripe checkout (test mode)

---

### Week 4: Monitoring & Observability
**Priority**: MEDIUM 🟢
**Can run parallel with frontend Week 4**

#### Objectives
1. Set up Sentry for error tracking
2. Configure OpenTelemetry tracing
3. Add performance monitoring
4. Create monitoring dashboards
5. Set up alerts

#### Deliverables

**1. Sentry Integration**

**Backend** (`backend/app/main.py`):
```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    integrations=[
        FastApiIntegration(),
        SqlalchemyIntegration(),
    ],
    traces_sample_rate=0.1,  # 10% of transactions
    profiles_sample_rate=0.1,
    environment=settings.ENVIRONMENT,
)
```

**Frontend** (`frontend/app/layout.tsx`):
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV,
});
```

**2. Performance Monitoring**
- Track key metrics:
  - API response times (p50, p95, p99)
  - AI generation times
  - Database query times
  - Page load times
- Alerts for:
  - API p95 > 500ms
  - AI generation p95 > 10s
  - Error rate > 1%

**3. Monitoring Dashboards**
- Sentry dashboard for errors and performance
- Vercel Analytics for frontend metrics
- Railway metrics for backend resource usage

#### Success Metrics
- Error tracking functional on staging
- Performance metrics visible in dashboards
- Alerts configured and tested

---

## Phase 3: Testing & Quality Assurance (1 Week)

### Week 5: Comprehensive Testing
**Dates**: December 2-6, 2025
**Priority**: HIGH 🟡

#### Objectives
1. Fix all failing tests
2. Increase test coverage to 80%
3. Run full E2E test suite
4. Performance testing
5. Security audit

#### Deliverables

**1. Backend Testing**
- Fix analytics test mocks (currently 12/38 passing)
- Add missing unit tests for edge cases
- Integration tests for all critical flows
- Target: 80% code coverage

**2. Frontend Testing**
- Unit tests for all Zustand stores
- Component tests for key components
- E2E tests for critical user flows:
  - Sign up → Create resume → Apply to job
  - Generate cover letter
  - Stripe checkout
- Target: 60% code coverage

**3. Performance Testing**
- Load testing with k6 or Artillery
- Target: 100 concurrent users
- Metrics:
  - API p95 < 300ms
  - AI generation p95 < 6s
  - Page load p95 < 500ms

**4. Security Audit**
- OWASP Top 10 checklist
- Dependency vulnerability scan (`npm audit`, `safety check`)
- Penetration testing (manual)
- SQL injection testing
- XSS testing
- CSRF protection verification

#### Success Metrics
- All tests passing (249+ backend, 50+ frontend E2E)
- Code coverage: Backend 80%, Frontend 60%
- Performance benchmarks met
- No critical security vulnerabilities

---

## Phase 4: Beta Launch (1 Week)

### Week 6: Beta Launch
**Dates**: December 9-13, 2025
**Priority**: CRITICAL 🔴

#### Objectives
1. Deploy to production
2. Invite beta users (50-100)
3. Set up support infrastructure
4. Monitor performance and bugs
5. Gather user feedback

#### Deliverables

**1. Production Deployment**
- Deploy backend to Railway (production)
- Deploy frontend to Vercel (production)
- Configure production database (Supabase)
- Configure production Redis (Upstash)
- Enable HTTPS and custom domain
- Production URLs:
  - Frontend: `https://app.hireflux.com`
  - Backend: `https://api.hireflux.com`

**2. Beta User Onboarding**
- Create landing page for beta signup
- Send invitation emails (via Resend)
- Onboarding guide and tutorial
- Welcome email with instructions

**3. Support Infrastructure**
- Set up support email: `support@hireflux.com`
- Create Intercom or Zendesk for live chat
- Set up feedback form in app
- Create bug reporting mechanism

**4. Monitoring & Incident Response**
- 24/7 monitoring with Sentry alerts
- On-call rotation (if team size permits)
- Incident response playbook
- Weekly bug triage meetings

#### Success Metrics
- 50+ beta users onboarded
- < 5% critical bug rate
- NPS > 40 (measure after 2 weeks)
- Average session duration > 10 minutes
- Activation rate (complete resume) > 30%

---

## Post-MVP Roadmap (Phase 5-6)

### Deferred Features (Post-Beta)

**Phase 5: Enhancements** (January 2026)
1. **Interview Coach - Voice Mode**
   - Speech-to-text with Whisper
   - Real-time feedback
   - Video recording (optional)

2. **Auto-Apply - Full Automation**
   - Job board integrations (LinkedIn, Indeed)
   - Resume/cover letter auto-customization per job
   - Compliance with job board ToS

3. **Mobile App**
   - React Native app
   - Push notifications
   - Mobile-optimized interview coach

4. **Advanced Analytics**
   - Predictive analytics (success likelihood)
   - Competitor benchmarking
   - Industry trends

**Phase 6: Scale & Optimize** (February-March 2026)
1. **Performance Optimization**
   - Edge caching (Cloudflare/Vercel Edge)
   - Database query optimization
   - Redis caching strategy
   - React code splitting and lazy loading

2. **Admin Dashboard**
   - User management
   - Content moderation
   - Analytics and reporting
   - Support ticket system

3. **Enterprise Features**
   - Team accounts
   - Bulk user management
   - Custom branding
   - SSO (SAML)

---

## Risk Assessment & Mitigation

### High-Risk Items 🔴

**1. Frontend Implementation Delay**
- **Risk**: 4-week timeline is aggressive, delays could push back MVP launch
- **Mitigation**:
  - Prioritize critical path features (auth, resume, jobs, applications)
  - Defer interview buddy and auto-apply UI to post-MVP if needed
  - Daily standups to track progress
  - Identify blockers early

**2. Stripe Integration Issues**
- **Risk**: Payment processing bugs could prevent monetization
- **Mitigation**:
  - Thorough testing in Stripe test mode
  - Use Stripe's prebuilt Checkout (less custom code)
  - Test with multiple payment methods
  - Have fallback plan (manual invoicing for early users)

**3. AI Generation Performance**
- **Risk**: OpenAI rate limits or slow response times
- **Mitigation**:
  - Implement request queuing with Celery
  - Show clear progress indicators to users
  - Set user expectations (e.g., "This may take 15-30 seconds")
  - Consider fallback to cached/templated content if API fails

### Medium-Risk Items 🟡

**4. E2E Test Flakiness**
- **Risk**: Flaky E2E tests block deployments
- **Mitigation**:
  - Use Playwright's auto-wait features
  - Add explicit waits for API responses
  - Run tests multiple times in CI
  - Quarantine flaky tests temporarily

**5. Database Migration Issues**
- **Risk**: Breaking changes in production database
- **Mitigation**:
  - Test all migrations on staging first
  - Keep migrations backward-compatible
  - Have rollback plan for each migration
  - Backup database before migrations

### Low-Risk Items 🟢

**6. OAuth Integration**
- **Risk**: Google/LinkedIn OAuth setup
- **Mitigation**:
  - UI already built (frontend complete)
  - Backend endpoints ready
  - Just needs OAuth app registration and testing

---

## Resource Requirements

### Team Composition (Current Sprint)

**Frontend Engineers** (2)
- Lead: Implement complex pages (resume builder, job matching)
- Junior: Implement settings, notifications, polish

**Backend Engineer** (1)
- Maintain APIs as frontend integrates
- Fix bugs and add missing endpoints if needed
- Support frontend team

**UI/UX Designer** (0.5 FTE)
- Design mockups for complex pages
- Provide design system guidance
- Review UI implementations

**QA Engineer** (1)
- Write E2E tests
- Manual testing of critical flows
- Bug triage and reporting

**DevOps/SRE** (0.5 FTE)
- Set up CI/CD pipelines
- Deploy staging and production
- Configure monitoring

**Product Manager** (0.5 FTE)
- Daily standups
- Sprint planning and review
- Prioritization decisions
- User feedback coordination

### External Services Budget (Monthly)

| Service | Plan | Cost |
|---------|------|------|
| Railway (Backend) | Hobby+ | $20 |
| Vercel (Frontend) | Pro | $20 |
| Supabase (Database) | Pro | $25 |
| Upstash (Redis) | Pay-as-you-go | $5 |
| OpenAI API | Pay-as-you-go | $50-200 (usage-based) |
| Stripe | 2.9% + $0.30/txn | $0 (until revenue) |
| Sentry | Team | $26 |
| Resend (Email) | Pro | $20 |
| **Total** | | **~$166-316/month** |

---

## Success Metrics & KPIs

### Technical KPIs (MVP Launch)

| Metric | Current | Target | Measurement |
|--------|---------|--------|-------------|
| Backend Test Coverage | 70% | 80% | pytest --cov |
| Frontend Test Coverage | 20% | 60% | jest --coverage |
| API p95 Latency | Unknown | < 300ms | Sentry |
| Page Load p95 | Unknown | < 500ms | Vercel Analytics |
| AI Generation p95 | Unknown | < 6s | Custom logging |
| Uptime | N/A | 99.5% | Sentry |
| Lighthouse Score | Unknown | > 90 | Lighthouse CI |

### Product KPIs (Post-Launch, Month 1)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Beta Signups | 100 | Database query |
| Activation Rate (complete resume) | 30% | Analytics |
| Resumes Created | 50 | Database query |
| Cover Letters Generated | 100 | Database query |
| Job Applications | 200 | Database query |
| Free → Paid Conversion | 5% | Stripe |
| NPS Score | > 40 | Survey |
| Average Session Duration | > 10 min | Analytics |
| Daily Active Users (DAU) | 30 | Analytics |
| Weekly Active Users (WAU) | 70 | Analytics |

---

## Timeline Summary

| Phase | Duration | Dates | Status | Deliverables |
|-------|----------|-------|--------|-------------|
| **Phase 1** | 8 weeks | Sept-Oct 2025 | ✅ COMPLETE | Backend + Auth + DevOps docs |
| **Phase 2A** | 4 weeks | Nov 4-29, 2025 | 🟡 IN PROGRESS | Frontend pages + integration |
| **Phase 2B** | 4 weeks | Nov 4-29, 2025 | 🟡 PARALLEL | CI/CD + Staging + Monitoring |
| **Phase 3** | 1 week | Dec 2-6, 2025 | ⏳ PENDING | Testing + QA + Security |
| **Phase 4** | 1 week | Dec 9-13, 2025 | ⏳ PENDING | Beta launch + 50 users |
| **Phase 5-6** | 2 months | Jan-Feb 2026 | ⏳ PLANNED | Enhancements + Scale |

**Total Timeline to Beta Launch**: **6 weeks** (Nov 4 - Dec 13, 2025)

---

## Next Actions (This Week)

### Immediate Priorities (Week of October 28, 2025)

**Frontend Team**:
1. ✅ Review completed authentication system
2. ⏭️ Start Week 1: Resume Management implementation
   - Set up `useResumeStore` Zustand store
   - Build resume list page
   - Start resume builder form

**Backend Team**:
3. ⏭️ Fix analytics test mocks (12/38 tests currently passing)
4. ⏭️ Support frontend integration (add CORS, verify endpoints)

**DevOps**:
5. ⏭️ Set up GitHub Actions CI/CD workflows (`.github/workflows/`)
6. ⏭️ Start staging environment setup (Railway + Vercel)

**QA**:
7. ⏭️ Test completed authentication system end-to-end
8. ⏭️ Set up E2E test infrastructure for new pages

---

## Appendices

### A. Critical Path Analysis

**MVP Critical Path** (cannot be parallelized):
1. Auth System ✅ (Complete)
2. → Resume Management (Week 1)
3. → Job Matching (Week 2)
4. → Applications Tracking (Week 2)
5. → Billing Integration (Week 3)
6. → Testing & QA (Week 5)
7. → Beta Launch (Week 6)

**Total Critical Path Duration**: 6 weeks

### B. Authentication System Completion Details

**Completed Components** (Oct 27-28, 2025):
- ✅ Enhanced Zustand auth store with localStorage persistence
- ✅ Protected route HOC with return URL support
- ✅ Dashboard layout with responsive sidebar (9 nav items)
- ✅ AuthProvider for app-wide initialization
- ✅ Updated sign-in page with OAuth UI
- ✅ Updated sign-up page with auto-redirect
- ✅ Session restoration on app load
- ✅ Automatic token refresh on 401
- ✅ Mobile-responsive hamburger menu
- ✅ User profile display with initials
- ✅ Logout functionality

**Pending**:
- ⏳ Backend OAuth endpoints (Google, LinkedIn) - Backend team
- ⏳ Email verification flow - Post-MVP
- ⏳ Password reset flow - Post-MVP
- ⏳ Two-factor authentication (2FA) - Post-MVP

### C. Technology Stack Validation

**Validated Choices**:
- ✅ Next.js 14 (App Router) - Good for SSR and SEO
- ✅ FastAPI - Fast, async, well-documented
- ✅ PostgreSQL - Reliable, feature-rich
- ✅ Redis - Essential for caching and queues
- ✅ Zustand - Lightweight, easy to use
- ✅ shadcn/ui - Accessible, customizable components
- ✅ Stripe - Industry standard for payments
- ✅ OpenAI - Best AI for generation tasks

**Potential Concerns**:
- ⚠️ Pinecone cost - Monitor usage, consider alternatives (Weaviate, Qdrant)
- ⚠️ OpenAI rate limits - Implement queuing and fallbacks
- ⚠️ Vercel serverless limits - Monitor function execution times

---

## Document Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Oct 28, 2025 | Claude Architect | Initial roadmap creation after workspace analysis |

---

**Next Review**: November 4, 2025 (Sprint Kickoff)
**Roadmap Owner**: Product Manager + Tech Lead
**Status**: ACTIVE - Ready for Sprint Planning
