# HireFlux Employer Platform: Feature Specifications
## AI-Powered Recruiting Platform for Companies

**Date**: 2025-10-31
**Status**: Product Specification
**Target**: Two-Sided Marketplace - Employer Side
**Priority**: P0 (Critical for Market Competitiveness)

---

## Table of Contents

1. [Employer Registration & Onboarding](#employer-registration--onboarding)
2. [Company Dashboard](#company-dashboard)
3. [Job Posting & Management](#job-posting--management)
4. [AI Candidate Ranking](#ai-candidate-ranking)
5. [Applicant Tracking System (ATS)](#applicant-tracking-system-ats)
6. [Candidate Search & Profiling](#candidate-search--profiling)
7. [Mass Posting with AI](#mass-posting-with-ai)
8. [Team Collaboration](#team-collaboration)
9. [Employer Analytics](#employer-analytics)
10. [Billing & Subscriptions](#billing--subscriptions)

---

## 1. Employer Registration & Onboarding

### 1.1 Company Registration Flow

**User Story**: As a hiring manager, I want to create a company account so that I can post jobs and find candidates.

**Flow**:
```
1. Land on /employer/register
2. Enter company email (auto-detect domain)
3. Verify email (6-digit code)
4. Create password
5. Enter company details:
   - Company name
   - Industry
   - Company size
   - Location
   - Website
   - Logo upload
6. Select plan (Starter Free, Growth $99, Professional $299)
7. Enter payment info (if paid plan)
8. Complete onboarding checklist:
   ☐ Post first job
   ☐ Customize company profile
   ☐ Invite team member
   ☐ Set up notifications
```

**API Endpoints**:
```typescript
POST /api/v1/employers/register
  Body: { email, password, companyName, industry, size, location }
  Response: { companyId, userId, accessToken }

POST /api/v1/employers/verify-email
  Body: { email, code }
  Response: { verified: boolean }

PUT /api/v1/companies/{id}
  Body: { name, industry, size, location, website, logo }
  Response: { company: Company }

GET /api/v1/companies/{id}/onboarding-status
  Response: { steps: OnboardingStep[], completion: number }
```

**Data Model**:
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE,
  industry VARCHAR(100),
  size VARCHAR(50), -- "1-10", "11-50", "51-200", "201-500", "501+"
  location VARCHAR(255),
  website VARCHAR(255),
  logo_url VARCHAR(500),
  description TEXT,
  subscription_tier VARCHAR(50), -- "starter", "growth", "professional", "enterprise"
  subscription_status VARCHAR(50), -- "active", "cancelled", "expired"
  trial_ends_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE company_members (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  user_id UUID REFERENCES users(id),
  role VARCHAR(50), -- "owner", "admin", "hiring_manager", "recruiter", "viewer"
  permissions JSONB, -- {"can_post_jobs": true, "can_view_candidates": true, ...}
  invited_by UUID REFERENCES users(id),
  invited_at TIMESTAMP,
  joined_at TIMESTAMP,
  status VARCHAR(50), -- "invited", "active", "suspended"
  created_at TIMESTAMP DEFAULT NOW()
);
```

**UI Components**:
- `<EmployerRegistrationForm>` - Multi-step form
- `<CompanyProfileSetup>` - Company details
- `<OnboardingChecklist>` - Progress tracker
- `<PlanSelector>` - Subscription tier selection

---

## 2. Company Dashboard

### 2.1 Overview Dashboard

**User Story**: As a hiring manager, I want to see hiring metrics at a glance so that I can track recruitment performance.

**Dashboard Widgets**:
1. **Active Jobs** - Count and list
2. **New Applications** - Last 24 hours
3. **Applications by Status** - Pipeline chart
4. **Top Performing Jobs** - Most applications
5. **Time to Fill** - Average days
6. **Candidate Quality** - Avg Fit Index
7. **Quick Actions**:
   - Post New Job
   - View All Applications
   - Search Candidates

**API Endpoints**:
```typescript
GET /api/v1/companies/{id}/dashboard-stats
  Response: {
    activeJobs: number,
    newApplicationsToday: number,
    applicationsByStatus: { [status: string]: number },
    topJobs: Job[],
    avgTimeToFill: number,
    avgCandidateQuality: number
  }

GET /api/v1/companies/{id}/recent-activity
  Query: { limit: 10 }
  Response: { activities: Activity[] }
```

**UI Components**:
- `<EmployerDashboard>` - Main layout
- `<DashboardWidget>` - Reusable widget
- `<ApplicationsPieChart>` - Status distribution
- `<RecentActivity>` - Activity feed

---

## 3. Job Posting & Management

### 3.1 Job Creation

**User Story**: As a recruiter, I want to quickly create a job posting with AI assistance so that I can fill positions faster.

**Features**:
- **AI Job Description Generator**: Provide job title + 3-5 bullet points → Get full JD
- **Job Templates**: Save and reuse common job structures
- **Rich Text Editor**: Format job descriptions
- **Skills Autocomplete**: Suggest relevant skills
- **Salary Range Suggestion**: AI-powered based on role, location, experience

**Job Fields**:
```typescript
interface JobPosting {
  id: string;
  companyId: string;
  title: string;
  department: string;
  location: string;
  locationType: "remote" | "hybrid" | "onsite";
  employmentType: "full_time" | "part_time" | "contract" | "internship";
  experienceLevel: "entry" | "mid" | "senior" | "lead" | "executive";
  salaryMin: number;
  salaryMax: number;
  salaryCurrency: string;
  description: string; // Full job description
  requirements: string[]; // Required qualifications
  niceToHave: string[]; // Preferred qualifications
  responsibilities: string[]; // Key responsibilities
  benefits: string[]; // Company benefits
  skills: string[]; // Required skills
  applicationDeadline: Date;
  status: "draft" | "active" | "paused" | "closed";
  views: number;
  applications: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**AI Generation API**:
```typescript
POST /api/v1/jobs/generate-description
  Body: {
    title: string,
    keyPoints: string[],
    experienceLevel: string,
    location: string
  }
  Response: {
    description: string,
    requirements: string[],
    responsibilities: string[],
    suggestedSkills: string[]
  }

POST /api/v1/jobs/suggest-salary
  Body: { title: string, location: string, experienceLevel: string }
  Response: { min: number, max: number, currency: string, confidence: number }
```

**Job Management APIs**:
```typescript
POST /api/v1/jobs
  Body: JobPosting
  Response: { job: JobPosting }

GET /api/v1/companies/{id}/jobs
  Query: { status?: string, page: number, limit: number }
  Response: { jobs: JobPosting[], total: number }

PUT /api/v1/jobs/{id}
  Body: Partial<JobPosting>
  Response: { job: JobPosting }

DELETE /api/v1/jobs/{id}
  Response: { success: boolean }

PUT /api/v1/jobs/{id}/status
  Body: { status: "active" | "paused" | "closed" }
  Response: { job: JobPosting }
```

**UI Components**:
- `<JobPostingForm>` - Create/edit job
- `<AIJobDescriptionGenerator>` - AI assistance
- `<JobTemplateSelector>` - Template library
- `<SkillsAutocomplete>` - Skills input
- `<SalaryRangePicker>` - Salary input with AI suggestion
- `<JobPreview>` - Preview before publishing
- `<JobsTable>` - List all jobs with filters

---

## 4. AI Candidate Ranking

### 4.1 Intelligent Candidate Scoring

**User Story**: As a hiring manager, I want candidates automatically ranked by fit so that I can focus on the best matches first.

**Ranking Algorithm**:
```python
def calculate_candidate_fit_index(candidate, job):
    """
    Calculate 0-100 Fit Index for candidate-job match
    """
    factors = {
        "skills_match": 0.30,      # 30% weight
        "experience_level": 0.20,   # 20% weight
        "location_match": 0.15,     # 15% weight
        "salary_expectation": 0.10, # 10% weight
        "culture_fit": 0.15,        # 15% weight (from resume tone)
        "availability": 0.10        # 10% weight (start date)
    }

    score = 0
    explanations = []

    # Skills matching (embeddings similarity)
    candidate_skills_embedding = get_embedding(candidate.skills)
    job_skills_embedding = get_embedding(job.skills)
    skills_similarity = cosine_similarity(candidate_skills_embedding, job_skills_embedding)
    score += skills_similarity * factors["skills_match"] * 100
    explanations.append(f"Skills match: {skills_similarity * 100:.0f}%")

    # Experience level matching
    exp_match = match_experience_level(candidate.years_experience, job.experienceLevel)
    score += exp_match * factors["experience_level"] * 100
    explanations.append(f"Experience level: {'Excellent' if exp_match > 0.8 else 'Good'}")

    # Location matching
    loc_match = match_location(candidate.location, job.location, job.locationType)
    score += loc_match * factors["location_match"] * 100

    # Salary matching
    salary_match = match_salary(candidate.expectedSalary, job.salaryMin, job.salaryMax)
    score += salary_match * factors["salary_expectation"] * 100

    # Culture fit (from resume tone and values)
    culture_fit = analyze_culture_fit(candidate.resume, job.description)
    score += culture_fit * factors["culture_fit"] * 100

    # Availability
    avail_match = match_availability(candidate.startDate, job.desiredStartDate)
    score += avail_match * factors["availability"] * 100

    return {
        "fitIndex": int(score),
        "explanations": explanations,
        "strengths": get_top_strengths(candidate, job),
        "concerns": get_potential_concerns(candidate, job)
    }
```

**Ranking API**:
```typescript
GET /api/v1/jobs/{jobId}/applicants/ranked
  Query: {
    minFitIndex?: number, // Filter by minimum fit
    sortBy: "fitIndex" | "appliedDate" | "experience",
    order: "desc" | "asc",
    page: number,
    limit: number
  }
  Response: {
    applicants: Array<{
      id: string,
      candidate: Candidate,
      fitIndex: number,
      explanations: string[],
      strengths: string[],
      concerns: string[],
      appliedAt: Date,
      status: string
    }>,
    total: number
  }

POST /api/v1/jobs/{jobId}/applicants/{applicantId}/rank
  Body: { force_refresh: boolean }
  Response: {
    fitIndex: number,
    explanations: string[],
    strengths: string[],
    concerns: string[]
  }
```

**UI Components**:
- `<RankedApplicantsList>` - Ranked list with Fit Index
- `<FitIndexBadge>` - Visual score (0-100 with color)
- `<MatchExplanation>` - Detailed breakdown
- `<StrengthsList>` - Top 3-5 strengths
- `<ConcernsList>` - Potential red flags
- `<ApplicantComparisonView>` - Side-by-side compare

**Match Explanation Example**:
```
Fit Index: 87/100

✅ Strengths:
- 95% skills match (React, TypeScript, Node.js)
- 5 years experience (Matches Senior level requirement)
- Based in San Francisco (Local for hybrid role)
- Salary expectation $140K (Within your $130-150K range)

⚠️ Considerations:
- Start date: 60 days (You prefer 30 days)
- No experience with AWS (Listed as "nice to have")
```

---

## 5. Applicant Tracking System (ATS)

### 5.1 Application Pipeline

**User Story**: As a recruiter, I want to manage candidates through hiring stages so that I can track progress and make decisions.

**Pipeline Stages**:
1. **New** (auto-assigned)
2. **Reviewing**
3. **Phone Screen**
4. **Technical Interview**
5. **Final Interview**
6. **Offer**
7. **Hired**
8. **Rejected**

**Application Management**:
```typescript
interface Application {
  id: string;
  jobId: string;
  candidateId: string;
  status: ApplicationStatus;
  fitIndex: number;
  appliedAt: Date;
  statusHistory: ApplicationStatusChange[];
  notes: ApplicationNote[];
  interviewSchedules: InterviewSchedule[];
  assignedTo: string[]; // User IDs of reviewers
  tags: string[]; // "strong_candidate", "needs_review", etc.
  source: "auto_apply" | "manual_apply" | "referral" | "sourced";
}

interface ApplicationNote {
  id: string;
  applicationId: string;
  authorId: string;
  content: string;
  visibility: "private" | "team"; // Private to author or visible to team
  createdAt: Date;
}

interface InterviewSchedule {
  id: string;
  applicationId: string;
  type: "phone_screen" | "technical" | "behavioral" | "final";
  scheduledAt: Date;
  duration: number; // minutes
  interviewers: string[]; // User IDs
  location: string; // Zoom link or physical address
  status: "scheduled" | "completed" | "cancelled";
  feedback: InterviewFeedback[];
}
```

**ATS APIs**:
```typescript
GET /api/v1/jobs/{jobId}/applications
  Query: {
    status?: ApplicationStatus[],
    minFitIndex?: number,
    assignedTo?: string,
    page: number,
    limit: number
  }
  Response: { applications: Application[], total: number }

PUT /api/v1/applications/{id}/status
  Body: { status: ApplicationStatus, note?: string }
  Response: { application: Application }

POST /api/v1/applications/bulk-update
  Body: {
    applicationIds: string[],
    action: "reject" | "shortlist" | "move_to_stage",
    targetStatus?: ApplicationStatus
  }
  Response: { updated: number }

POST /api/v1/applications/{id}/notes
  Body: { content: string, visibility: "private" | "team" }
  Response: { note: ApplicationNote }

POST /api/v1/applications/{id}/interviews
  Body: InterviewSchedule
  Response: { interview: InterviewSchedule }
```

**UI Components**:
- `<ApplicationsKanbanBoard>` - Drag-and-drop pipeline
- `<ApplicationsListView>` - Table view with filters
- `<ApplicationDetailsSidebar>` - Full candidate details
- `<BulkActionsToolbar>` - Multi-select actions
- `<ApplicationNotes>` - Notes section
- `<InterviewScheduler>` - Calendar integration
- `<StatusChangeModal>` - Confirm status change

---

## 6. Candidate Search & Profiling

### 6.1 Proactive Candidate Discovery

**User Story**: As a recruiter, I want to search our candidate pool so that I can proactively source talent.

**Search Features**:
- **Skills-based search**: "React AND TypeScript AND (AWS OR GCP)"
- **Experience range**: 3-7 years
- **Location filter**: City, state, remote
- **Salary expectations**: $100K-150K
- **Availability**: Available now, 30 days, 60 days
- **Job preferences**: Remote, hybrid, onsite
- **Recent activity**: Applied in last 30 days

**Candidate Public Profile** (Opt-In):
```typescript
interface CandidateProfile {
  id: string;
  userId: string;
  visibility: "public" | "private"; // Opt-in
  profilePicture: string;
  headline: string; // "Senior Full-Stack Engineer"
  location: string;
  openToWork: boolean;
  preferredRoles: string[];
  skills: string[];
  yearsExperience: number;
  experienceLevel: string;
  expectedSalary: { min: number, max: number, currency: string };
  preferredLocationType: "remote" | "hybrid" | "onsite" | "any";
  startDate: Date;
  portfolio: PortfolioItem[];
  resume: {
    latestVersion: string, // URL
    summary: string // 2-3 sentence summary
  };
  endorsements: Endorsement[];
  availability: {
    status: "actively_looking" | "open_to_offers" | "not_looking",
    lastUpdated: Date
  };
}

interface PortfolioItem {
  id: string;
  type: "project" | "github" | "website" | "article";
  title: string;
  description: string;
  url: string;
  thumbnail: string;
}
```

**Search API**:
```typescript
POST /api/v1/candidates/search
  Body: {
    query: string, // Free text search
    skills: string[], // Required skills
    experienceMin: number,
    experienceMax: number,
    location: string,
    locationType: string,
    salaryMin: number,
    salaryMax: number,
    availability: string,
    openToWork: boolean
  }
  Query: { page: number, limit: number }
  Response: {
    candidates: CandidateProfile[],
    total: number,
    facets: {
      skills: { [skill: string]: number },
      locations: { [location: string]: number },
      experienceLevels: { [level: string]: number }
    }
  }

GET /api/v1/candidates/{id}/public-profile
  Response: { profile: CandidateProfile }

POST /api/v1/candidates/{id}/invite-to-apply
  Body: { jobId: string, message: string }
  Response: { invited: boolean }
```

**UI Components**:
- `<CandidateSearchForm>` - Advanced search filters
- `<CandidateSearchResults>` - Grid or list view
- `<CandidateProfileCard>` - Preview card
- `<CandidateProfilePage>` - Full profile
- `<InviteToApplyModal>` - Personalized invite

---

## 7. Mass Posting with AI

### 7.1 Bulk Job Upload & Distribution

**User Story**: As a staffing agency, I want to post 100+ jobs quickly so that I can fill positions at scale.

**Features**:
- **CSV Upload**: Bulk job data (title, description, requirements, location, salary)
- **AI Normalization**: Standardize job titles, extract skills, suggest categories
- **Duplicate Detection**: Prevent duplicate postings
- **Template Application**: Apply company branding to all jobs
- **Multi-Board Distribution**: Publish to LinkedIn, Indeed, Glassdoor in one click
- **Scheduled Posting**: Stagger job posts over time

**Bulk Upload Flow**:
```
1. Upload CSV (max 500 jobs)
2. AI validates and enriches data:
   - Normalize job titles
   - Extract skills from descriptions
   - Suggest salary ranges
   - Detect duplicates
3. Review and edit jobs (table view)
4. Select distribution channels
5. Schedule posting (now or later)
6. Track posting status per job
```

**CSV Format**:
```csv
title,department,location,locationType,employmentType,experienceLevel,salaryMin,salaryMax,description,requirements
"Senior Software Engineer","Engineering","San Francisco, CA","hybrid","full_time","senior",130000,170000,"We are seeking...","5+ years experience, React, Node.js"
"Product Manager","Product","Remote","remote","full_time","mid",100000,130000,"Join our team...","3+ years PM experience, Agile"
```

**Mass Posting APIs**:
```typescript
POST /api/v1/jobs/bulk-upload
  Body: FormData (CSV file)
  Response: {
    uploadId: string,
    totalRows: number,
    status: "processing"
  }

GET /api/v1/jobs/bulk-upload/{uploadId}/status
  Response: {
    status: "processing" | "completed" | "failed",
    processed: number,
    total: number,
    jobs: Array<{
      rowNumber: number,
      status: "valid" | "error",
      job: JobPosting,
      errors: string[],
      aiSuggestions: {
        normalizedTitle: string,
        extractedSkills: string[],
        suggestedSalaryRange: { min: number, max: number },
        isDuplicate: boolean
      }
    }>
  }

POST /api/v1/jobs/bulk-publish
  Body: {
    jobIds: string[],
    distributionChannels: ("linkedin" | "indeed" | "glassdoor")[],
    schedule: "now" | Date
  }
  Response: {
    published: number,
    failed: number,
    scheduled: number
  }

GET /api/v1/jobs/{id}/distribution-status
  Response: {
    channels: Array<{
      channel: string,
      status: "pending" | "published" | "failed",
      externalId: string,
      url: string,
      views: number,
      applications: number
    }>
  }
```

**AI Enrichment API**:
```typescript
POST /api/v1/jobs/enrich
  Body: {
    title: string,
    description: string,
    location: string
  }
  Response: {
    normalizedTitle: string,
    category: string,
    extractedSkills: string[],
    suggestedSalaryRange: { min: number, max: number, currency: string },
    experienceLevel: string,
    similarJobs: Job[] // Duplicate detection
  }
```

**UI Components**:
- `<BulkJobUpload>` - CSV upload with preview
- `<JobEnrichmentTable>` - Review AI suggestions
- `<DuplicateDetectionWarning>` - Highlight duplicates
- `<DistributionChannelSelector>` - Multi-select channels
- `<BulkPublishScheduler>` - Schedule posting
- `<DistributionDashboard>` - Track performance per channel

---

## 8. Team Collaboration

### 8.1 Multi-User Accounts

**User Story**: As a hiring manager, I want to collaborate with my team so that we can make hiring decisions together.

**Roles & Permissions**:
```typescript
enum Role {
  OWNER = "owner",           // Full access, billing
  ADMIN = "admin",           // Full access except billing
  HIRING_MANAGER = "hiring_manager", // Post jobs, manage applications
  RECRUITER = "recruiter",   // View candidates, schedule interviews
  INTERVIEWER = "interviewer", // View assigned candidates, leave feedback
  VIEWER = "viewer"          // Read-only access
}

interface Permissions {
  canPostJobs: boolean;
  canEditJobs: boolean;
  canDeleteJobs: boolean;
  canViewCandidates: boolean;
  canSearchCandidates: boolean;
  canChangeApplicationStatus: boolean;
  canScheduleInterviews: boolean;
  canViewAnalytics: boolean;
  canInviteMembers: boolean;
  canManageBilling: boolean;
}
```

**Team Management APIs**:
```typescript
POST /api/v1/companies/{id}/members/invite
  Body: {
    email: string,
    role: Role,
    customPermissions?: Partial<Permissions>
  }
  Response: { invitation: Invitation }

GET /api/v1/companies/{id}/members
  Response: { members: CompanyMember[] }

PUT /api/v1/companies/{id}/members/{userId}/role
  Body: { role: Role }
  Response: { member: CompanyMember }

DELETE /api/v1/companies/{id}/members/{userId}
  Response: { success: boolean }

POST /api/v1/applications/{id}/assign
  Body: { assignedTo: string[] } // User IDs
  Response: { application: Application }
```

**Collaboration Features**:
- **Application Assignments**: Assign specific applications to team members
- **Internal Notes**: Leave private notes on candidates
- **@Mentions**: Notify team members in notes
- **Activity Feed**: See all team actions on applications
- **Interview Coordination**: Assign interviewers, collect feedback

**UI Components**:
- `<TeamMembersTable>` - List team with roles
- `<InviteMemberModal>` - Invite form
- `<RoleSelector>` - Role dropdown
- `<PermissionsEditor>` - Custom permissions
- `<AssignReviewersModal>` - Assign applications
- `<TeamActivityFeed>` - Recent team actions

---

## 9. Employer Analytics

### 9.1 Hiring Metrics Dashboard

**User Story**: As a hiring manager, I want to see recruitment analytics so that I can optimize our hiring process.

**Key Metrics**:
1. **Sourcing Metrics**:
   - Applications per job
   - Application sources (auto-apply, manual, referral)
   - Candidate quality distribution (Fit Index)

2. **Pipeline Metrics**:
   - Applications by stage
   - Stage conversion rates
   - Drop-off analysis

3. **Time Metrics**:
   - Time to first application
   - Time to shortlist
   - Time to offer
   - Time to hire

4. **Quality Metrics**:
   - Average Fit Index per job
   - Interview show-up rate
   - Offer acceptance rate
   - Quality of hire (6-month retention)

5. **Cost Metrics**:
   - Cost per application
   - Cost per hire
   - ROI per job posting

**Analytics APIs**:
```typescript
GET /api/v1/companies/{id}/analytics/overview
  Query: { startDate: Date, endDate: Date }
  Response: {
    totalApplications: number,
    totalHires: number,
    avgTimeToHire: number,
    avgCostPerHire: number,
    topPerformingJobs: Job[],
    pipelineConversion: { [stage: string]: number }
  }

GET /api/v1/companies/{id}/analytics/funnel
  Query: { jobId?: string }
  Response: {
    stages: Array<{
      stage: ApplicationStatus,
      count: number,
      avgDaysInStage: number,
      dropOffRate: number
    }>
  }

GET /api/v1/companies/{id}/analytics/sources
  Response: {
    sources: Array<{
      source: string,
      applications: number,
      hires: number,
      avgFitIndex: number,
      conversionRate: number
    }>
  }
```

**UI Components**:
- `<AnalyticsDashboard>` - Overview page
- `<MetricCard>` - Individual metric display
- `<FunnelChart>` - Pipeline visualization
- `<TimeToHireChart>` - Timeline chart
- `<SourcesTable>` - Source performance
- `<DateRangePicker>` - Filter by date

---

## 10. Billing & Subscriptions

### 10.1 Subscription Management

**User Story**: As a company owner, I want to manage our subscription so that I can control costs.

**Plans**:
| Plan | Price | Jobs/Month | Candidate Views | Features |
|------|-------|-----------|----------------|----------|
| **Starter** | Free | 1 | 10 | Basic posting, application inbox |
| **Growth** | $99/mo | 10 | 100 | AI ranking, basic ATS, 3 seats |
| **Professional** | $299/mo | Unlimited | Unlimited | Full ATS, 10 seats, mass posting, analytics |
| **Enterprise** | Custom | Unlimited | Unlimited | API, integrations, white-label, SLA |

**Billing APIs**:
```typescript
GET /api/v1/companies/{id}/subscription
  Response: {
    plan: string,
    status: string,
    currentPeriodStart: Date,
    currentPeriodEnd: Date,
    usage: {
      jobsPosted: number,
      jobsLimit: number,
      candidateViews: number,
      candidateViewsLimit: number
    }
  }

POST /api/v1/companies/{id}/subscription/upgrade
  Body: { plan: "growth" | "professional" | "enterprise" }
  Response: { subscription: Subscription, paymentUrl: string }

POST /api/v1/companies/{id}/subscription/cancel
  Response: { subscription: Subscription, effectiveDate: Date }

GET /api/v1/companies/{id}/invoices
  Response: { invoices: Invoice[] }
```

**UI Components**:
- `<SubscriptionOverview>` - Current plan and usage
- `<PlanComparisonTable>` - Upgrade options
- `<UsageMeters>` - Visual usage limits
- `<InvoicesList>` - Billing history
- `<PaymentMethodManager>` - Update card

---

## Implementation Priority

### Phase 1: Core Employer Features (Months 1-4)
1. ✅ Employer registration and authentication
2. ✅ Company profile setup
3. ✅ Job posting UI (single jobs)
4. ✅ Application inbox (basic ATS)
5. ✅ AI candidate ranking
6. ✅ Status management

### Phase 2: Advanced Features (Months 5-8)
1. ✅ Candidate search and profiling
2. ✅ Mass posting with AI
3. ✅ Team collaboration
4. ✅ Interview scheduling

### Phase 3: Scale & Optimize (Months 9-12)
1. ✅ Analytics dashboard
2. ✅ Multi-board distribution
3. ✅ API access
4. ✅ Enterprise features

---

## Success Metrics

**Employer Acquisition**:
- 100 companies signed up in Month 1
- 1000 companies by Month 12
- 15% free-to-paid conversion

**Engagement**:
- 2+ jobs posted per company per month
- 50+ candidate views per job
- <10 min time to first job post

**Retention**:
- <5% monthly churn
- 30%+ jobs reposted
- NPS ≥40

---

**Document Created**: 2025-10-31
**Status**: Product Specification
**Owner**: Product Management
**Next**: Technical architecture and implementation planning
