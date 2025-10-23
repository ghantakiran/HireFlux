# HireFlux Sprint Plan - MVP Phase

**Version**: 1.0
**Last Updated**: 2025-10-22
**Sprint Duration**: 2 weeks
**Team Capacity**: ~80 story points per sprint (assuming 7-person team)

---

## Sprint Overview - MVP (Weeks 1-8)

**Goal**: Deliver core HireFlux MVP with resume/cover letter generation, job matching, Apply Assist, and Stripe billing.

**Total MVP Story Points**: ~150
**Number of Sprints**: 4 sprints (2 weeks each)

---

## Sprint 1 (Weeks 1-2): Foundation & Authentication

### Sprint Goal
Establish development infrastructure, authentication, and database foundation to enable feature development.

### Sprint Capacity
**Total Points**: 42

### Stories Included

| ID | Story | Points | Owner | Status |
|---|---|---|---|---|
| US-001 | Project Setup & Infrastructure | 8 | Backend | Todo |
| US-002 | Authentication System | 8 | Backend | Todo |
| US-003 | Database Schema v1 | 8 | Backend | Todo |
| US-004 | Observability & Monitoring Setup | 5 | DevOps | Todo |
| US-048 | Testing Infrastructure | 5 | Backend | Todo |
| US-043 | Security Hardening | 8 | Backend | Todo |

### Sprint Deliverables
- [ ] Next.js + FastAPI projects initialized
- [ ] Supabase/Postgres database provisioned with all tables
- [ ] OAuth (Google, LinkedIn) + email/password auth working
- [ ] Sentry + OpenTelemetry integrated
- [ ] Jest, Pytest frameworks configured
- [ ] Basic CI/CD pipeline running tests
- [ ] Security headers and encryption at rest enabled

### Sprint Risks
- **Risk**: Supabase setup complexity
  - **Mitigation**: Assign experienced developer, allocate extra time
- **Risk**: OAuth integration delays
  - **Mitigation**: Use Supabase Auth to simplify

### Sprint Ceremonies
- **Sprint Planning**: Day 1 (Monday)
- **Daily Standups**: Every day, 15 minutes
- **Sprint Review**: Day 10 (Friday Week 2)
- **Sprint Retrospective**: Day 10 (Friday Week 2)

---

## Sprint 2 (Weeks 3-4): Onboarding & AI Resume Builder

### Sprint Goal
Enable users to onboard, upload resumes, and generate AI-optimized resumes with multiple versions.

### Sprint Capacity
**Total Points**: 40

### Stories Included

| ID | Story | Points | Owner | Status |
|---|---|---|---|---|
| US-005 | User Onboarding Flow | 5 | Frontend | Todo |
| US-006 | Resume Upload & Parsing | 8 | Backend | Todo |
| US-007 | User Profile Management | 3 | Frontend | Todo |
| US-008 | OpenAI Integration | 5 | Backend | Todo |
| US-009 | AI Resume Generation | 8 | Backend + Frontend | Todo |
| US-010 | Resume Versioning | 5 | Backend + Frontend | Todo |
| US-011 | Resume Export | 5 | Backend | Todo |
| US-042 | GDPR/CCPA Compliance | 5 | Backend + Legal | Todo |

### Sprint Deliverables
- [ ] 5-step onboarding flow complete
- [ ] Resume upload (PDF/DOCX) with parsing
- [ ] OpenAI GPT-4 integration with cost tracking
- [ ] Generate ATS-optimized resume in <6s (p95)
- [ ] Save multiple resume versions
- [ ] Export resume as PDF/DOCX
- [ ] Privacy policy, ToS, data export/deletion
- [ ] Unit tests for AI generation logic

### Sprint Risks
- **Risk**: Resume parsing accuracy issues
  - **Mitigation**: Use proven library (e.g., pyresparser), fallback to manual input
- **Risk**: OpenAI rate limits or latency
  - **Mitigation**: Implement retry logic, use GPT-4 Turbo for speed
- **Risk**: PDF export formatting challenges
  - **Mitigation**: Use template library (e.g., Puppeteer, WeasyPrint)

### Key Metrics to Track
- Onboarding completion rate
- Resume generation success rate
- Average generation time (target: <6s p95)
- OpenAI token cost per resume

---

## Sprint 3 (Weeks 5-6): Cover Letters & Job Matching

### Sprint Goal
Enable cover letter generation and implement job matching engine with embeddings.

### Sprint Capacity
**Total Points**: 39

### Stories Included

| ID | Story | Points | Owner | Status |
|---|---|---|---|---|
| US-012 | Cover Letter Generation | 8 | Backend + Frontend | Todo |
| US-013 | Cover Letter Library | 3 | Frontend | Todo |
| US-014 | Pinecone Vector DB Setup | 5 | Backend | Todo |
| US-015 | Job Feed Integration | 8 | Backend | Todo |
| US-016 | Skills Embedding & User Vectorization | 5 | Backend/ML | Todo |
| US-017 | Job Matching Algorithm | 8 | Backend/ML | Todo |
| US-018 | Job Search & Filtering | 5 | Frontend | Todo |

### Sprint Deliverables
- [ ] Cover letter generation with tone/length options
- [ ] Cover letter library (view, edit, export)
- [ ] Pinecone index setup for job/skills embeddings
- [ ] Greenhouse + Lever API integration
- [ ] Job feed ETL pipeline (daily refresh)
- [ ] Fit Index (0-100) calculation with rationale
- [ ] Job search UI with filters (remote, salary, visa, etc.)
- [ ] Unit + integration tests for matching algorithm

### Sprint Risks
- **Risk**: Job feed API reliability or access issues
  - **Mitigation**: Start with 1-2 sources, add more later; mock data for testing
- **Risk**: Embedding generation cost
  - **Mitigation**: Batch embeddings, cache user profile embeddings
- **Risk**: Matching algorithm accuracy concerns
  - **Mitigation**: A/B test with sample users, gather feedback

### Key Metrics to Track
- Cover letter generation success rate
- Job feed refresh time
- Matching algorithm precision (manual eval on sample)
- Average Fit Index for matched jobs

---

## Sprint 4 (Weeks 7-8): Apply Assist, Billing & Dashboard

### Sprint Goal
Enable Apply Assist, Stripe billing, credit system, and basic analytics dashboard to complete MVP.

### Sprint Capacity
**Total Points**: 41

### Stories Included

| ID | Story | Points | Owner | Status |
|---|---|---|---|---|
| US-019 | Job Details View | 3 | Frontend | Todo |
| US-020 | Weekly Top Matches Report | 5 | Backend | Todo |
| US-021 | Apply Assist - Pre-fill Application | 8 | Backend + Frontend | Todo |
| US-022 | Application Tracking | 5 | Backend + Frontend | Todo |
| US-023 | Stripe Integration | 5 | Backend | Todo |
| US-024 | Subscription Plans - Free & Plus | 8 | Backend + Frontend | Todo |
| US-025 | Credit Wallet System | 5 | Backend | Todo |
| US-027 | Application Pipeline Dashboard | 5 | Frontend | Todo |
| US-036 | Email Notification System | 5 | Backend | Todo |
| US-037 | In-App Notifications | 5 | Frontend | Todo |

**Note**: US-026 (Credit Refund) moved to Beta

### Sprint Deliverables
- [ ] Job details page with Fit Index rationale
- [ ] Weekly email with top 10-15 job matches
- [ ] Apply Assist for Greenhouse/Lever external forms
- [ ] Application tracking dashboard
- [ ] Stripe checkout for Plus plan ($19/mo)
- [ ] Credit purchase (10/$10, 100/$50)
- [ ] Feature gating (Free vs Plus)
- [ ] Pipeline dashboard (saved → applied → interview → offer)
- [ ] Email notifications (Resend/SendGrid)
- [ ] In-app notification center
- [ ] E2E tests for critical flows (US-050 partial)

### Sprint Risks
- **Risk**: Stripe webhook reliability
  - **Mitigation**: Idempotency keys, retry logic, thorough testing
- **Risk**: Apply Assist form compatibility issues
  - **Mitigation**: Start with 2 sources (Greenhouse, Lever), expand later
- **Risk**: Notification delivery failures
  - **Mitigation**: Queue-based system, retry failed emails

### Key Metrics to Track
- Stripe checkout conversion rate
- Apply Assist success rate
- Email delivery rate
- Notification engagement (open, click)

---

## Post-MVP Sprint Planning (Beta - Weeks 9-12)

### Sprint 5 (Weeks 9-10): Interview Coach & Advanced Analytics

**Capacity**: 35 points

**Stories**:
- US-026: Credit Refund System (5 pts)
- US-028: Job Match Analytics (5 pts)
- US-029: Gamification - Streaks (3 pts)
- US-030: Interview Question Bank (5 pts)
- US-031: Mock Interview Session (Text) (8 pts)
- US-032: Interview Session History (3 pts)
- US-045: Frontend Performance (5 pts)
- US-046: Backend Performance (5 pts)

**Deliverables**:
- Credit refund automation
- Advanced analytics (Fit Index trends, response rates)
- Streak tracking and gamification
- Text-based interview coach
- Performance optimization (meet p95 targets)

---

### Sprint 6 (Weeks 11-12): Auto-Apply & Admin Tools

**Capacity**: 35 points

**Stories**:
- US-033: Auto-Apply Configuration (5 pts)
- US-034: Auto-Apply Worker (13 pts - breakdown required)
- US-035: Auto-Apply Audit Log (3 pts)
- US-038: Admin Dashboard (8 pts)
- US-039: User Management (5 pts)
- US-040: Manual Refund Processing (3 pts)
- US-044: Accessibility (5 pts)
- US-047: AI Generation Performance (5 pts)

**Deliverables**:
- Auto-apply with pre-approval rules
- Background worker for automated applications
- Audit trail for transparency
- Admin dashboard and user management
- WCAG 2.1 AA compliance
- AI generation optimizations

---

## Sprint Metrics & KPIs

### Velocity Tracking
- **Target Velocity**: 35-42 points per 2-week sprint
- **Measure**: Completed story points vs. committed
- **Review**: Adjust capacity in sprint retrospective

### Quality Metrics
- **Code Coverage**: >80% for new code
- **Bug Escape Rate**: <5 bugs per sprint to production
- **PR Review Time**: <4 hours average
- **Build Success Rate**: >95%

### Performance Metrics
- **p95 Page TTFB**: <300ms
- **p95 AI Generation**: <6s
- **API Latency (non-AI)**: <300ms p95
- **Uptime**: >99.9%

### Business Metrics (Post-Launch)
- **Activation Rate**: ≥30% complete resume + 1 letter
- **Conversion**: Free→Paid ≥8% within 14 days
- **Churn**: <6% monthly (Plus plan)

---

## Sprint Best Practices

### Daily Standups (15 min)
1. What did you complete yesterday?
2. What will you work on today?
3. Any blockers?

### Sprint Planning (4 hours)
1. Review sprint goal
2. Review and estimate stories
3. Assign owners
4. Identify dependencies and risks
5. Commit to sprint backlog

### Sprint Review (2 hours)
1. Demo completed stories
2. Gather stakeholder feedback
3. Update product backlog

### Sprint Retrospective (1.5 hours)
1. What went well?
2. What didn't go well?
3. Action items for next sprint

---

## Definition of Ready (for Sprint Planning)

- [ ] User story has clear acceptance criteria
- [ ] Dependencies identified and resolved
- [ ] Story pointed by team
- [ ] Designs available (if UI work)
- [ ] API contracts defined (if integration)
- [ ] Security/compliance requirements known

---

## Definition of Done (for Story Completion)

- [ ] Code complete and peer-reviewed
- [ ] Unit tests written (>80% coverage)
- [ ] Integration tests written
- [ ] Deployed to staging
- [ ] QA tested
- [ ] Performance benchmarks met
- [ ] Accessibility checked
- [ ] Documentation updated
- [ ] Product owner approved

---

## Team Capacity Assumptions

**Team Composition** (7 people):
- 1 Product Manager (non-dev)
- 1 Designer (non-dev)
- 2 Frontend Engineers (20 pts/sprint each)
- 2 Backend Engineers (20 pts/sprint each)
- 1 ML/Prompt Engineer (15 pts/sprint)

**Total Dev Capacity**: ~75-80 points per 2-week sprint

**Adjusted for**:
- Meetings and ceremonies (10%)
- Bug fixes and tech debt (10%)
- Unknowns buffer (10%)

---

## Risk Management

### Top Risks Across MVP

1. **OpenAI API Reliability**
   - Impact: High (blocks resume/letter generation)
   - Mitigation: Retry logic, fallback to Claude, user communication

2. **Job Feed Access**
   - Impact: Medium (limits job matching)
   - Mitigation: Start with 2 sources, mock data for dev/testing

3. **Stripe Integration Complexity**
   - Impact: High (blocks monetization)
   - Mitigation: Use Stripe SDKs, thorough testing in test mode

4. **Scope Creep**
   - Impact: Medium (delays MVP)
   - Mitigation: Strict prioritization, ruthless descoping

5. **Team Capacity Overestimation**
   - Impact: Medium (missed sprint goals)
   - Mitigation: Conservative velocity, buffer in each sprint

---

## Communication Plan

### Stakeholder Updates
- **Frequency**: Weekly (every Monday)
- **Format**: Email + async Slack update
- **Content**: Sprint progress, blockers, upcoming milestones

### Demo Days
- **Frequency**: End of each sprint (bi-weekly)
- **Attendees**: Full team + stakeholders
- **Format**: Live demo of completed stories

### Office Hours
- **Frequency**: Twice per week (Tue/Thu)
- **Purpose**: Unblock team, answer questions, review designs

---

## Next Steps

1. **Week 1 Prep**:
   - Finalize team assignments
   - Provision dev environments
   - Schedule sprint planning for Sprint 1
   - Set up project management tool (Jira, Linear, etc.)

2. **Sprint 1 Kickoff**:
   - Sprint planning session (4 hours)
   - Align on sprint goal and deliverables
   - Begin development

3. **Ongoing**:
   - Update backlog based on learnings
   - Adjust velocity after each sprint
   - Refine Beta and GA stories
