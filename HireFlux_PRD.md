### Product Requirements Document (PRD)
HireFlux — AI-powered Job Application Copilot

Document version: v1.0  
Owner: Product  
Stakeholders: Engineering, Design, Growth, Legal, Support  
Target Milestones: MVP (6–8 weeks), Beta (12 weeks), GA (16 weeks)

---

### 1) Overview
- **Problem**: Job seekers spend excessive time customizing resumes/cover letters, finding relevant roles, and filling repetitive applications—often with generic output and low reply rates.
- **Vision**: HireFlux is an AI copilot that streamlines job search: builds tailored resumes/letters, finds high-fit roles, applies with consent-based automation, and preps candidates for interviews.
- **Goals (12 weeks)**:
  - Activate 30% of signups to create resume + generate 1 cover letter.
  - 20% of paid users apply to ≥10 jobs in week 1.
  - Deliver ≥15% apply-to-reply rate on tracked applications.

---

### 2) Target Users and Personas
- **Career Switchers (22–35)**: Need clarity and speed; low confidence in positioning.
- **Working Professionals (25–40)**: Tech, data, business roles; time-constrained; want efficiency and personalization.
- **International Candidates**: Need ATS compliance, localized tone, and visa-friendly filters.

---

### 3) Core Value Proposition
- **Personalized, authentic applications at scale**: dynamic tone, role-specific keywording, ATS optimization.
- **High-signal role matching**: skills embeddings + recency + seniority alignment.
- **Consent-based auto-apply**: configurable automation with transparency, audit trail, and credits refunded for mismatches.

---

### 4) Key Features and Requirements

1) AI Resume Builder
- Generate ATS-optimized resume tailored to target title.
- Upload parsing (PDF, DOCX), extraction of experience/skills.
- Multiple tone styles: formal, concise, conversational; export (PDF/DOCX).
- Versioning per job or job family.
- Must-have metrics: time-to-first-resume < 3 minutes.

2) Cover Letter Generator
- Uses fine-tuned prompting with successful exemplars.
- Pulls from job description and resume versions.
- Output options: tone, length, company personalization.
- One-click insert of quantified achievements.
- Guardrails for hallucination; company facts require source or neutral phrasing.

3) Job Match Engine
- Sources: ATS feeds (Greenhouse, Lever), partner job feeds, APIs; optional curated marketplaces.
- Matching model: embeddings (skills, seniority, location, salary range), keyword overlap, recency.
- Score 0–100 “HireFlux Fit Index” with explanation “why this matches”.
- Filters: remote/on-site/hybrid, visa-friendly, compensation, recency.
- Weekly “Top Matches” report (email + in-app).

4) Auto Apply System (Credits/Tokens)
- Two modes:
  - Apply Assist: pre-fill + user confirms (always compliant).
  - Auto-Apply: user pre-approves constraints (sites supported via API/partner, not ToS-violating scraping).
- Credit usage rules; refund if mismatch (e.g., JD no longer available or < threshold after parse).
- Application artifact bundle: resume version + letter + answers snapshot.
- Audit log; user pausing thresholds; rate limits per site policy.
- Compliance-first: only approved sources, respect ToS/captcha; explicit consent.

5) Interview Sim Coach
- Mock interviews (voice/text), job-specific question sets.
- Speech-to-text, LLM feedback: clarity, structure (STAR), content depth.
- Scoring + improvement suggestions; save transcripts and highlights.
- Bank of common questions by role + company type.

6) Job Insights Dashboard
- Pipeline: saved → applied → interview → offer.
- Metrics: Fit Index distribution, response rates, time-to-response, conversion.
- Leaderboards/gamification: streaks for applications/interview practice.
- Refund credits shown; anomaly flags (e.g., low response for seniority → prompt to adjust materials).

7) Onboarding & Identity
- OAuth (Google/LinkedIn), email/password.
- Guided onboarding: target roles, salary prefs, industries, locations, skills map.

8) Billing & Plans (Stripe)
- Free: resume preview, 3 cover letters, 10 job suggestions/month.
- Plus $19/month: unlimited resumes/letters, interview coach, 100 job suggestions/week.
- Pro $49/month: auto-apply pack (e.g., 50/month), analytics, live feedback queue.
- Add-on credits: 10 applies = $10, 100 = $50; rollover for paid plans.

9) Notifications
- New high-fit roles, application status changes, credit usage/refunds, interview reminders.
- Channels: email, in-app; later: WhatsApp/Telegram.

10) Admin & Ops
- User management, refunds, abuse detection.
- Prompt versioning, model switch controls, content quality review.
- Observability: latency, error rates, token costs, provider health.

---

### 5) Success Metrics (KPIs)
- Activation: ≥30% complete resume + 1 letter in first session.
- Match Quality: ≥40% CTR on Top Matches email.
- Conversion: Free→Paid ≥8% within 14 days.
- Apply-to-Interview: ≥15% by week 4 for paid cohort.
- Churn: <6% monthly for Plus; <4% for Pro.
- LLM Cost/User: <$1.20/month at Plus average usage.

---

### 6) Non-Functional Requirements
- Performance: p95 page TTFB < 300 ms; p95 generation < 6 s.
- Availability: 99.9% for core flows; graceful degradation on provider errors.
- Privacy/Security: SOC2-ready controls; encrypted PII at rest; least-privilege authZ.
- Compliance: GDPR, CCPA fundamentals; explicit consent for data usage.
- Accessibility: WCAG 2.1 AA.
- Internationalization: EN at launch; architecture ready for locales.

---

### 7) Technical Architecture

- Frontend: Next.js (App Router), TypeScript, Tailwind or CSS-in-JS.
- Backend: FastAPI (Python), async workers (Celery/RQ) for generation/apply jobs.
- Data: Supabase/Postgres (user, resumes, job cache, applications).
- Vector DB: Pinecone (embeddings for skills/jobs).
- AI Providers: OpenAI GPT‑4/GPT‑4 Turbo; option to swap to Claude for tone.
- Storage: Supabase storage/S3 for artifacts.
- Queue: Redis.
- Payments: Stripe (subscriptions + usage-based credits).
- Auth: Supabase Auth or Auth.js with JWT sessions.
- Observability: OpenTelemetry + Sentry; provider-level tracing.

Data Model (high-level)
- users, profiles, resumes, resume_versions, cover_letters, jobs, job_sources, match_scores, applications, interview_sessions, credit_wallets, credit_ledger, subscriptions, events_audit.

---

### 8) Integrations
- Job feeds: Greenhouse, Lever, partner APIs; internal scraper only where permitted.
- LLM: OpenAI; rate limiting + retry with backoff; cost logging per request.
- Payments: Stripe Subscriptions + Metered usage for credits.
- Email: Resend/SendGrid; Domain auth (SPF/DKIM).
- Speech: Whisper or equivalent STT; WebRTC for voice sessions (phase 2).

---

### 9) Pricing & Packaging
- Free: AI resume preview, 3 cover letters, 10 job suggestions/month.
- Plus ($19/mo): Unlimited resumes/letters, interview coach, job insights, 100 weekly suggestions.
- Pro ($49/mo): Includes 50 auto-apply credits/month, advanced analytics, priority support.
- Credits: 10 applies=$10; 100=$50; refunds for invalid/mismatched jobs.
- Trials/Discounts: 7-day trial; student/early-career 30% off.

---

### 10) Go-To-Market Plan
- Phase 1 (MVP): Product Hunt, LinkedIn, Reddit r/jobhunting. Founders-as-creators content.
- Phase 2 (Growth): SEO pillars (“AI resume”, “cover letter generator”, “ATS resume”), influencer UGC (TikTok/YouTube/LinkedIn). Target CAC <$10.
- Phase 3 (Retention/B2B): Weekly job reports, skills-gap newsletters, university/career-coach white-label.

---

### 11) Risks & Mitigations
- Job board ToS/compliance: Use approved APIs/partners; Apply Assist defaults where automation disallowed; explicit consent and audit logs.
- Generic output risk: Dynamic tone, profile memory, achievements injection, user review loop.
- LLM cost spikes: Cache, prompt compression, batch jobs, model fallback, guard rails on heavy tasks.
- Provider outages: Active-active failover to secondary LLM; job queue retries; feature flags.

---

### 12) Acceptance Criteria by Phase

MVP (Weeks 1–8)
- Onboarding captures target roles and imports resume.
- Generate ATS resume and 3 cover letters in < 6 s p95.
- Job Match Engine returns ≥30 high-fit roles/week with Fit Index + rationale.
- Apply Assist works on ≥2 approved sources (e.g., Lever/Greenhouse external forms).
- Stripe checkout live; Plus and credits purchasable; ledger accurate.
- Dashboard tracks pipeline; email for Top Matches weekly.
- p95 latency and basic observability in place.

Beta (Weeks 9–12)
- Auto-Apply with pre-approval rules and refunds; audit log.
- Interview Coach (text first, optional voice); score + feedback.
- Gamification (streaks); per-user insights and suggestions.
- Churn instrumentation; NPS collection.

GA (Weeks 13–16)
- Pro plan with 50 monthly auto-apply credits.
- Admin console (refunds, prompts, feature flags).
- Compliance review; security baseline; accessibility AA.

---

### 13) User Stories (Representative)
- As a time-pressed PM, I want a tailored resume and cover letter for each posting in minutes.
- As a data analyst pivoting to ML ops, I want the tool to highlight transferable skills and quantify impact.
- As a user, I want to pre-approve where and how auto-apply works and get credits back if it misfires.
- As a user, I want weekly high-fit roles with explanations and one-click apply.
- As a user, I want interview simulations and concrete, role-specific feedback.

---

### 14) Analytics & Reporting
- Funnel: signup → onboarding complete → first resume → first letter → first apply → conversion.
- Cohorts by role, region, seniority.
- Match quality: Fit Index vs. response rate correlation.
- Cost: tokens per feature, per user; margin by plan.
- A/B: tone presets, match thresholds, email subject lines.

---

### 15) Legal, Privacy, and Compliance
- Data processing addendum; user consent for data and automation.
- Clear disclosure of automation scope; no credential sharing to prohibited sites.
- Honor robots.txt, site ToS; support “Apply Assist” where automation is restricted.
- PII minimization; encryption at rest and in transit; deletion on request.
- Auditability: immutable event logs for applications and decisions.

---

### 16) Launch Checklist (MVP)
- Prod infra ready; secrets managed; rate limits configured.
- Stripe live keys; webhooks verified; refunds tested.
- Content and onboarding guides; sample resumes by role.
- Support playbooks; incident runbooks; status page.
- Public pricing page and ToS/Privacy Policy.

---

### 17) Open Questions
- Which regions at GA (US-only vs. US+EU)?  
- Priority verticals (tech first vs broader knowledge work)?  
- Voice coach at MVP or Beta?  
- Minimum Fit Index threshold for auto-apply defaults?

---

### 18) Differentiators (Moat)
- Dynamic tone + achievements injection to avoid template sameness.
- Embedding-driven matching with transparent rationale.
- Credit refund policy linked to objective mismatch/audit findings.
- Honest tracker: shows fail reasons and suggests targeted improvements.

---

### 19) Resourcing and Timeline (Indicative)
- Team: 1 PM, 1 Designer, 2 FE, 2 BE, 1 ML/Prompt, 1 Growth.  
- MVP (6–8 weeks): Core flows, Plus plan, Apply Assist.  
- Beta (12 weeks): Auto-Apply, Interview Coach, refunds.  
- GA (16 weeks): Pro plan, admin, compliance, accessibility.

---

### 20) Appendix (Prompts/Guardrails – brief)
- Resume prompt templates with role-specific rubrics and ATS keyword packs.
- Cover letter template with company-safe phrasing, source-required fact policy.
- Interview feedback rubric: structure, specificity, seniority expectation, actionability.

---

Summary:
- PRD defines HireFlux as an AI job application copilot with resume/letter generation, skills-embedding job matching, compliant auto-apply, interview coaching, and a transparent insights dashboard.
- Packaging: Free, Plus ($19), Pro ($49) with credits; SEO + influencer GTM; compliance-first automation with refunds.
- Clear KPIs, architecture (Next.js + FastAPI + Supabase + Pinecone + OpenAI), and phased acceptance criteria to ship MVP→GA quickly.

References:
[1](https://jobcopilot.com/aiapply-review/)
[2](https://foundertale.com/aiapply-15k-month-saas-business-helping-people-apply-to-jobs-with-ai/)
[3](https://scale.jobs/blog/is-aiapply-worth-it-scale-jobs-human-powered-alternative-review)
[4](https://www.saasworthy.com/product/aiapply-co/pricing)
[5](https://www.hulkapps.com/blogs/ecommerce-hub/revolutionizing-job-applications-how-aidan-cramers-aiapply-is-changing-the-game)
[6](https://inpages.ai/insight/marketing-strategy/aiapply.co)
[7](https://aiapply.co)
[8](https://www.youtube.com/watch?v=NMSo2fkjauw)
[9](https://www.reddit.com/r/replit/comments/1isrzmd/we_built_an_agentic_aipowered_website_for/)
[10](https://www.youtube.com/watch?v=SeybVD0NMQI)
[11](https://www.cbinsights.com/company/aiapply/alternatives-competitors)
[12](https://skywork.ai/skypage/en/ApplyAI:-A-Deep-Dive-into-the-Tools,-Strategies,-and-Policies-Shaping-Our-AI-Future/1976549733949304832)
[13](https://www.jobstronauts.com/blog/aiapply-pricing)
[14](https://blaze.today/blog/aiapply-alternatives/)
[15](https://www.reddit.com/r/replit/comments/1jn225z/has_anyone_built_an_app_using_replits_ai_share/)
[16](https://www.pineapplebuilder.com/ai-tools/aiapply)
[17](https://www.reddit.com/r/jobsearchhacks/comments/1ipouc7/which_ai_platform_is_better_at_job_applicatiions/)
[18](https://aiapply.co/auto-apply)
[19](https://www.futurepedia.io/tool/aiapply)
[20](https://www.jobstronauts.com/blog/aiapply-alternatives)

