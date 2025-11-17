# Issue #23: Job Posting CRUD with AI-Assisted Creation - Implementation Plan

**Priority**: P0 - Critical Blocker
**Sprint**: 5-6 (Weeks 9-12)
**Story Points**: 13
**Estimated Effort**: 2 weeks
**Dependencies**: #18 (Database ✓), #21 (Company Profile ✓)
**Status**: In Progress

---

## 📋 Executive Summary

Implement a comprehensive job posting system with AI-powered assistance for employers to quickly create high-quality job descriptions with minimal input (title + 3-5 bullet points → full JD).

---

## ✅ Existing Code Analysis

### Backend - What Exists

#### 1. **Job Model** (`backend/app/db/models/job.py`) ✅
Complete Job model with all required fields:
- Basic fields: `id`, `company_id`, `title`, `company`, `department`, `location`
- Type fields: `location_type`, `employment_type`, `experience_level`
- Experience: `experience_min_years`, `experience_max_years`, `experience_requirement`
- Salary: `salary_min`, `salary_max`
- Content: `description`, `required_skills`, `preferred_skills`
- Metadata: `source`, `external_id`, `external_url`, `requires_visa_sponsorship`
- Status: `is_active`, `posted_date`, `expires_at`
- Timestamps: `created_at`, `updated_at`

**Status**: ✅ **COMPLETE - No changes needed**

#### 2. **Job Schemas** (`backend/app/schemas/job.py`) ✅
Complete Pydantic schemas with validation:
- `JobStatus` enum: DRAFT, ACTIVE, PAUSED, CLOSED
- `LocationType` enum: REMOTE, HYBRID, ONSITE
- `EmploymentType` enum: FULL_TIME, PART_TIME, CONTRACT, INTERNSHIP
- `ExperienceLevel` enum: ENTRY, MID, SENIOR, LEAD, EXECUTIVE
- `JobCreate`: Full creation schema with validators
- `JobUpdate`: Partial update schema
- `JobResponse`: Response model
- `JobListResponse`: Paginated list response
- `JobStatusUpdate`: Status change schema

**Status**: ✅ **COMPLETE - No changes needed**

#### 3. **JobService** (`backend/app/services/job_service.py`) ✅
Complete CRUD service with 8 methods:
- `create_job(company_id, job_data)` - Creates job with subscription limit enforcement
- `get_job(job_id)` - Get single job
- `list_jobs(company_id, status, page, limit)` - Paginated list with filters
- `update_job(job_id, job_data)` - Update job
- `update_job_status(job_id, status)` - Change status (active/paused/closed)
- `delete_job(job_id)` - Soft delete (set is_active=False)
- `get_active_jobs_count(company_id)` - Count active jobs
- `check_can_post_job(company_id)` - Validate subscription limits

**Features**:
- Subscription limit enforcement (Starter: 1 job, Growth: 10 jobs, Professional: unlimited)
- Soft delete pattern
- Pagination support
- Status filtering

**Status**: ✅ **COMPLETE - No changes needed**

#### 4. **AI Generation Service** (`backend/app/services/ai_generation_service.py`) ✅
Existing AI service for resume generation:
- `AIGenerationService` class with OpenAI integration
- Methods: `generate_optimized_resume()`, `regenerate_section()`, `get_improvement_suggestions()`
- Pattern: Build prompt → Call OpenAI → Parse JSON → Log usage

**Status**: ✅ **EXISTS - Can reuse pattern for job generation**

#### 5. **OpenAI Service** (referenced in AI Generation Service) ✅
- `OpenAIService` class with GPT-4 integration
- Methods: `generate_completion()`, `parse_json_response()`, `calculate_cost()`, `log_usage()`

**Status**: ✅ **EXISTS - Will be used for AI endpoints**

---

## 🚧 What's Missing - Implementation Required

### Backend - New Implementation

#### 1. **Job AI Service** (NEW FILE: `backend/app/services/job_ai_service.py`)
New service for AI-powered job description generation.

**Methods to Implement** (3):
```python
class JobAIService:
    def __init__(self, db: Session):
        self.db = db
        self.openai_service = OpenAIService()

    def generate_job_description(
        self,
        title: str,
        key_points: List[str],
        experience_level: Optional[str] = None,
        location: Optional[str] = None,
        employment_type: Optional[str] = None,
        department: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate full job description from minimal input.

        Input: Title + 3-5 bullet points
        Output: {
            "description": "Full 2-3 paragraph description",
            "requirements": ["Requirement 1", "Requirement 2", ...],
            "responsibilities": ["Responsibility 1", ...],
            "suggested_skills": ["Skill 1", "Skill 2", ...]
        }

        Performance: <6s (p95)
        """
        pass

    def suggest_skills(
        self,
        title: str,
        description: Optional[str] = None,
        existing_skills: Optional[List[str]] = None
    ) -> List[str]:
        """
        Suggest relevant skills for job posting.

        Output: List of 8-12 skills (technical + soft skills)
        """
        pass

    def suggest_salary_range(
        self,
        title: str,
        experience_level: str,
        location: str
    ) -> Dict[str, int]:
        """
        Suggest salary range based on role, level, location.

        Output: {
            "salary_min": 120000,
            "salary_max": 160000,
            "market_data": {...}
        }
        """
        pass
```

**Effort**: 8 hours (1 day)

#### 2. **Job API Endpoints** (NEW FILE: `backend/app/api/v1/endpoints/jobs.py`)
RESTful API endpoints for job CRUD + AI assistance.

**Endpoints to Implement** (9):

**Job CRUD** (6):
```python
@router.post("/employer/jobs", response_model=JobResponse, status_code=201)
def create_job(
    job_data: JobCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new job posting with subscription limit check"""
    pass

@router.get("/employer/jobs", response_model=JobListResponse)
def list_jobs(
    status: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List jobs with pagination and filters"""
    pass

@router.get("/employer/jobs/{job_id}", response_model=JobResponse)
def get_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get single job by ID"""
    pass

@router.put("/employer/jobs/{job_id}", response_model=JobResponse)
def update_job(
    job_id: UUID,
    job_data: JobUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update existing job"""
    pass

@router.put("/employer/jobs/{job_id}/status", response_model=JobResponse)
def update_job_status(
    job_id: UUID,
    status_update: JobStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update job status (publish, pause, close)"""
    pass

@router.delete("/employer/jobs/{job_id}", status_code=204)
def delete_job(
    job_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete job (soft delete)"""
    pass
```

**AI Assistance** (3):
```python
@router.post("/employer/jobs/generate-description")
def generate_job_description(
    request: JobAIGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate full job description from title + key points.

    Performance requirement: <6s (p95)
    """
    pass

@router.post("/employer/jobs/suggest-skills")
def suggest_skills(
    request: JobSkillsSuggestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Suggest relevant skills for job posting"""
    pass

@router.post("/employer/jobs/suggest-salary")
def suggest_salary_range(
    request: JobSalarySuggestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Suggest salary range based on role, level, location"""
    pass
```

**Effort**: 6 hours

#### 3. **Job AI Schemas** (NEW FILE: `backend/app/schemas/job_ai.py`)
Request/response schemas for AI endpoints.

**Schemas to Create** (6):
```python
class JobAIGenerationRequest(BaseModel):
    title: str
    key_points: List[str] = Field(..., min_length=3, max_length=10)
    experience_level: Optional[ExperienceLevel] = None
    location: Optional[str] = None
    employment_type: Optional[EmploymentType] = None
    department: Optional[str] = None

class JobAIGenerationResponse(BaseModel):
    description: str
    requirements: List[str]
    responsibilities: List[str]
    suggested_skills: List[str]
    token_usage: int
    cost: float
    generation_time_ms: int

class JobSkillsSuggestionRequest(BaseModel):
    title: str
    description: Optional[str] = None
    existing_skills: Optional[List[str]] = None

class JobSkillsSuggestionResponse(BaseModel):
    suggested_skills: List[str]
    technical_skills: List[str]
    soft_skills: List[str]

class JobSalarySuggestionRequest(BaseModel):
    title: str
    experience_level: ExperienceLevel
    location: str

class JobSalarySuggestionResponse(BaseModel):
    salary_min: int
    salary_max: int
    currency: str = "USD"
    market_data: Optional[Dict[str, Any]] = None
```

**Effort**: 2 hours

#### 4. **Router Registration** (MODIFY: `backend/app/api/v1/router.py`)
Add jobs router to API.

```python
from app.api.v1.endpoints import jobs

api_router.include_router(
    jobs.router,
    tags=["Jobs"]
)  # Job Posting CRUD with AI (Sprint 5-6 - Issue #23)
```

**Effort**: 5 minutes

#### 5. **Unit Tests** (NEW FILE: `backend/tests/unit/test_job_ai_service.py`)
Comprehensive tests for AI service.

**Test Coverage** (15+ tests):
- `test_generate_job_description_success()`
- `test_generate_job_description_with_all_params()`
- `test_generate_job_description_minimal_input()`
- `test_generate_job_description_performance_under_6s()`
- `test_suggest_skills_from_title()`
- `test_suggest_skills_with_existing()`
- `test_suggest_salary_range_by_level()`
- `test_suggest_salary_range_by_location()`
- `test_ai_generation_error_handling()`
- `test_ai_generation_cost_logging()`
- ... more edge cases

**Effort**: 4 hours

---

### Frontend - New Implementation

#### 1. **Job API Client** (NEW FILE: `frontend/lib/api/jobs.ts`)
TypeScript client for all job endpoints.

**Functions to Implement** (12):
```typescript
// Job CRUD
export async function createJob(jobData: JobCreateRequest): Promise<JobResponse>
export async function listJobs(filters?: JobListFilters): Promise<JobListResponse>
export async function getJob(jobId: string): Promise<JobResponse>
export async function updateJob(jobId: string, updates: JobUpdateRequest): Promise<JobResponse>
export async function updateJobStatus(jobId: string, status: JobStatus): Promise<JobResponse>
export async function deleteJob(jobId: string): Promise<void>

// AI Assistance
export async function generateJobDescription(request: JobAIGenerationRequest): Promise<JobAIGenerationResponse>
export async function suggestSkills(request: JobSkillsSuggestionRequest): Promise<JobSkillsSuggestionResponse>
export async function suggestSalary(request: JobSalarySuggestionRequest): Promise<JobSalarySuggestionResponse>

// Helper Functions
export function formatSalaryRange(min?: number, max?: number): string
export function getStatusBadgeColor(status: JobStatus): string
export function getLocationTypeLabel(locationType: LocationType): string
```

**Effort**: 4 hours

#### 2. **Job List Page** (NEW FILE: `frontend/app/employer/jobs/page.tsx`)
Main jobs dashboard with list view.

**Features**:
- Grid/table view of all jobs
- Filters: status (all/active/paused/closed), search
- Pagination
- Quick actions: View, Edit, Pause/Resume, Close, Delete
- Status badges
- Application count, views, avg fit index per job
- "Create Job" CTA button
- Loading skeletons
- Empty state

**Components**:
- JobCard (grid view)
- JobRow (table view)
- JobFilters
- JobStats

**Effort**: 6 hours

#### 3. **Job Creation Form** (NEW FILE: `frontend/app/employer/jobs/new/page.tsx`)
Multi-step job creation with AI assistance.

**Features**:
- **Step 1: AI Generator**
  - Title input
  - Key points (3-10 bullet points, dynamic add/remove)
  - "Generate with AI" button
  - Loading state (show progress: "Generating description... 3s")
  - Preview generated content

- **Step 2: Job Details**
  - Pre-filled from AI or manual entry
  - Rich text editor for description (TipTap or Lexical)
  - Requirements list (dynamic add/remove)
  - Responsibilities list (dynamic add/remove)
  - Skills autocomplete with AI suggestions
  - Salary range picker with AI suggestion button

- **Step 3: Additional Info**
  - Department, location, location type
  - Employment type, experience level
  - Visa sponsorship toggle
  - External URL (optional)
  - Expiration date

- **Step 4: Preview & Publish**
  - Full job preview
  - "Save as Draft" or "Publish" buttons
  - Subscription limit check (show remaining slots)

**Effort**: 12 hours (2 days)

#### 4. **Job Edit Page** (NEW FILE: `frontend/app/employer/jobs/[jobId]/edit/page.tsx`)
Edit existing job with same form as creation.

**Features**:
- Load existing job data
- Same multi-step form
- "Update" instead of "Publish"
- "Regenerate with AI" option
- Audit log of changes (optional)

**Effort**: 4 hours (reuses creation form components)

#### 5. **AI Description Generator Component** (NEW FILE: `frontend/components/employer/AIJobGenerator.tsx`)
Reusable AI generator component.

**Features**:
- Title input
- Key points input (dynamic list)
- Experience level, location selectors
- "Generate" button with loading state
- Real-time token count estimate
- Cost estimate
- Generated content preview
- "Use This Content" or "Regenerate" buttons

**Effort**: 4 hours

#### 6. **Rich Text Editor Component** (NEW FILE: `frontend/components/employer/RichTextEditor.tsx`)
WYSIWYG editor for job descriptions.

**Features**:
- TipTap or Lexical integration
- Toolbar: Bold, italic, underline, bullet list, numbered list, links
- Character count
- Preview mode
- Paste from Word cleanup

**Effort**: 4 hours (using library, configuration only)

#### 7. **Skills Autocomplete Component** (NEW FILE: `frontend/components/employer/SkillsAutocomplete.tsx`)
Multi-select skills input with AI suggestions.

**Features**:
- Autocomplete with search
- AI "Suggest Skills" button
- Selected skills as removable chips
- Categorization: Technical vs Soft skills

**Effort**: 3 hours

#### 8. **Salary Range Picker Component** (NEW FILE: `frontend/components/employer/SalaryRangePicker.tsx`)
Dual slider for salary range with AI suggestion.

**Features**:
- Min/max sliders
- Input fields for exact values
- "Suggest Range" button (calls AI endpoint)
- Market data tooltip
- Currency selector

**Effort**: 3 hours

---

## 🧪 Testing Strategy

### BDD Scenarios (Gherkin Format)

**File**: `frontend/tests/features/job-posting.feature`

**Scenarios** (15):
1. View empty job list
2. View job list with existing jobs
3. Filter jobs by status
4. Search jobs by title
5. **Generate job description with AI** (title + key points → full JD)
6. **AI generation performance** (<6s)
7. Create job from AI-generated content
8. Create job manually
9. **Suggest skills with AI**
10. **Suggest salary range with AI**
11. Edit existing job
12. Pause/resume job
13. Close job
14. Delete job
15. Subscription limit enforcement

**Effort**: 3 hours

### E2E Tests (Playwright)

**File**: `frontend/__tests__/e2e/23-job-posting.spec.ts`

**Test Coverage** (25+ scenarios):

**Job List** (5 tests):
- Display job list with pagination
- Filter by status (active/paused/closed)
- Search jobs
- Display job stats (applications, views, fit index)
- Empty state

**AI Generation** (6 tests):
- Generate job description from title + key points
- AI generation completes in <6s
- Suggest skills from title
- Suggest skills with existing skills filter
- Suggest salary range by level and location
- Handle AI generation errors

**Job Creation** (5 tests):
- Create job with AI assistance (full flow)
- Create job manually
- Save job as draft
- Subscription limit reached error
- Validation errors (title required, salary range, etc.)

**Job Editing** (4 tests):
- Edit job details
- Regenerate description with AI
- Update job status
- Delete job with confirmation

**Rich Text Editor** (2 tests):
- Format description with toolbar
- Paste from Word cleanup

**Skills & Salary** (3 tests):
- Add/remove skills
- Autocomplete skills
- Adjust salary range with sliders

**Effort**: 8 hours (1 day)

---

## 📊 Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| AI job description generation | <6s (p95) | Backend timing logs |
| AI skills suggestion | <3s (p95) | Backend timing logs |
| AI salary suggestion | <2s (p95) | Backend timing logs |
| Job list page load | <500ms (p95) | Lighthouse, Web Vitals |
| Job creation (without AI) | <2s (p95) | E2E test timing |
| Job creation (with AI) | <8s (p95) | E2E test timing (6s AI + 2s save) |

---

## 🚀 Implementation Phases

### Phase 1: Backend AI Service (Day 1-2)
- [ ] Create `JobAIService` with 3 methods
- [ ] Create `job_ai.py` schemas
- [ ] Unit tests for AI service (15+ tests)
- [ ] Performance benchmarking (<6s requirement)

### Phase 2: Backend API Endpoints (Day 2-3)
- [ ] Create `jobs.py` endpoints (9 endpoints)
- [ ] Register router
- [ ] Integration tests for all endpoints
- [ ] Test subscription limit enforcement

### Phase 3: Frontend API Client (Day 3)
- [ ] Create `jobs.ts` API client
- [ ] TypeScript types/interfaces
- [ ] Error handling

### Phase 4: Frontend Components (Day 4-6)
- [ ] AIJobGenerator component
- [ ] RichTextEditor component
- [ ] SkillsAutocomplete component
- [ ] SalaryRangePicker component
- [ ] Job creation form (multi-step)
- [ ] Job list page
- [ ] Job edit page

### Phase 5: Testing (Day 7-8)
- [ ] Write BDD scenarios (15 scenarios)
- [ ] Write E2E tests (25+ tests)
- [ ] Local testing (backend + frontend)
- [ ] Performance validation
- [ ] Accessibility testing (WCAG 2.1 AA)

### Phase 6: Documentation & Deployment (Day 9-10)
- [ ] Update API documentation
- [ ] Create user guide for employers
- [ ] Deploy backend to production
- [ ] Deploy frontend to Vercel
- [ ] Run E2E tests on Vercel deployment
- [ ] Monitor for errors (Sentry)
- [ ] Close Issue #23

---

## 📁 File Manifest

### Backend (5 new files, 1 modified)
1. ✅ `app/db/models/job.py` - **EXISTS** (no changes)
2. ✅ `app/schemas/job.py` - **EXISTS** (no changes)
3. ✅ `app/services/job_service.py` - **EXISTS** (no changes)
4. ✅ `app/services/ai_generation_service.py` - **EXISTS** (reuse pattern)
5. 🆕 `app/services/job_ai_service.py` - **NEW** (400 lines)
6. 🆕 `app/schemas/job_ai.py` - **NEW** (150 lines)
7. 🆕 `app/api/v1/endpoints/jobs.py` - **NEW** (450 lines)
8. 📝 `app/api/v1/router.py` - **MODIFY** (+3 lines)
9. 🆕 `tests/unit/test_job_ai_service.py` - **NEW** (300 lines)

### Frontend (8 new files)
10. 🆕 `lib/api/jobs.ts` - **NEW** (600 lines)
11. 🆕 `app/employer/jobs/page.tsx` - **NEW** (400 lines)
12. 🆕 `app/employer/jobs/new/page.tsx` - **NEW** (500 lines)
13. 🆕 `app/employer/jobs/[jobId]/edit/page.tsx` - **NEW** (300 lines)
14. 🆕 `components/employer/AIJobGenerator.tsx` - **NEW** (250 lines)
15. 🆕 `components/employer/RichTextEditor.tsx` - **NEW** (200 lines)
16. 🆕 `components/employer/SkillsAutocomplete.tsx` - **NEW** (150 lines)
17. 🆕 `components/employer/SalaryRangePicker.tsx` - **NEW** (180 lines)

### Testing (2 new files)
18. 🆕 `tests/features/job-posting.feature` - **NEW** (200 lines)
19. 🆕 `__tests__/e2e/23-job-posting.spec.ts` - **NEW** (800 lines)

### Documentation (3 files)
20. 🆕 `ISSUE_23_IMPLEMENTATION_PLAN.md` - **NEW** (this file)
21. 🆕 `ISSUE_23_PROGRESS.md` - **NEW** (progress tracking)
22. 🆕 `ISSUE_23_COMPLETION_SUMMARY.md` - **NEW** (final summary)

**Total**: 22 files (~5,000 lines of code)

---

## 🎯 Success Criteria

### Functional Requirements ✓
- [ ] Job CRUD endpoints (6) implemented and tested
- [ ] AI assistance endpoints (3) implemented with <6s performance
- [ ] Job creation form with AI generator
- [ ] Job list page with filters and search
- [ ] Job edit page
- [ ] Rich text editor for descriptions
- [ ] Skills autocomplete with AI suggestions
- [ ] Salary range picker with AI suggestions
- [ ] Subscription limit enforcement

### Testing Requirements ✓
- [ ] 15+ unit tests for AI service (85%+ coverage)
- [ ] 15 BDD scenarios in Gherkin format
- [ ] 25+ E2E tests with Playwright
- [ ] Performance tests (<6s AI generation)
- [ ] Accessibility tests (WCAG 2.1 AA)

### Quality Requirements ✓
- [ ] Type safety (TypeScript frontend, Python type hints backend)
- [ ] Error handling (all endpoints, user-friendly messages)
- [ ] Loading states (AI generation progress)
- [ ] Empty states (no jobs)
- [ ] Responsive design (mobile-friendly)
- [ ] Input validation (client + server side)
- [ ] Cost logging (AI token usage)

### Documentation Requirements ✓
- [ ] API documentation (endpoints, schemas)
- [ ] User guide (how to create jobs with AI)
- [ ] Implementation plan (this document)
- [ ] Progress tracking (daily updates)
- [ ] Completion summary (final report)

---

## 🔐 Security Considerations

1. **Authorization**: All endpoints require authentication + company-scoped access
2. **Input Validation**: Sanitize all user inputs (prevent XSS, SQL injection)
3. **Rate Limiting**: AI endpoints limited to prevent abuse
4. **Subscription Enforcement**: Validate job posting limits before creation
5. **Soft Delete**: Jobs are never hard-deleted (audit trail)
6. **PII Protection**: No sensitive data in AI prompts

---

## 💰 Cost Estimation

### AI Token Usage (GPT-4)
- **Job Description Generation**: ~2,000 tokens/request @ $0.03/1K = $0.06/generation
- **Skills Suggestion**: ~500 tokens/request @ $0.03/1K = $0.015/suggestion
- **Salary Suggestion**: ~300 tokens/request @ $0.03/1K = $0.009/suggestion

**Average Cost per Job Created with AI**: ~$0.08

**Monthly Estimate** (1,000 jobs/month with AI): $80/month in AI costs

---

## 📈 Business Impact

### Time Savings
- **Before**: 30-45 minutes to write job description
- **After**: 5-8 minutes with AI assistance (83% faster)

### Quality Improvement
- Consistent formatting across all job postings
- Comprehensive requirements and responsibilities
- Industry-standard skills suggestions
- Competitive salary ranges

### Conversion Impact
- **Expected**: 30%+ increase in job posting completion rate
- **Expected**: 20%+ increase in application quality (better JDs → better matches)

---

## 🎓 Technical Learnings

### Patterns Established
1. **AI Service Pattern**: `OpenAIService` → `build_prompt()` → `generate_completion()` → `parse_json()` → `log_usage()`
2. **Subscription Limits**: Check limits before write operations
3. **Soft Delete**: Set `is_active=False` instead of DELETE
4. **Multi-Step Forms**: State management with React hooks
5. **AI Progress Indicators**: Show generation time and cost estimates

---

## 🚦 Status Tracking

| Component | Status | Progress | Blocker |
|-----------|--------|----------|---------|
| Implementation Plan | ✅ Complete | 100% | None |
| BDD Scenarios | ⏳ Pending | 0% | None |
| Backend AI Service | ⏳ Pending | 0% | None |
| Backend API Endpoints | ⏳ Pending | 0% | None |
| Frontend API Client | ⏳ Pending | 0% | None |
| Job List Page | ⏳ Pending | 0% | None |
| Job Creation Form | ⏳ Pending | 0% | None |
| Job Edit Page | ⏳ Pending | 0% | None |
| E2E Tests | ⏳ Pending | 0% | None |
| Local Testing | ⏳ Pending | 0% | None |
| Vercel Deployment | ⏳ Pending | 0% | None |
| Issue Closure | ⏳ Pending | 0% | None |

**Overall Progress**: 8% (Plan Complete)

---

## 📝 Next Steps

1. ✅ **Create Implementation Plan** (this document)
2. ⏭️ **Write BDD Scenarios** (`job-posting.feature`)
3. ⏭️ **Implement Backend AI Service** (`job_ai_service.py`)
4. ⏭️ **Implement Backend API Endpoints** (`jobs.py`)
5. ⏭️ **Create Frontend Components** (AI generator, forms, pages)
6. ⏭️ **Write E2E Tests** (`23-job-posting.spec.ts`)
7. ⏭️ **Test Locally** (pytest + Playwright)
8. ⏭️ **Deploy to Vercel** (E2E tests on deployment)
9. ⏭️ **Close Issue #23**

---

**Plan Created**: November 17, 2025
**Plan Author**: Claude Code (Anthropic - Claude Sonnet 4.5)
**Methodology**: TDD/BDD Best Practices
**Estimated Completion**: November 27, 2025 (10 days)

---

🤖 *Generated with [Claude Code](https://claude.com/claude-code)*
*Anthropic - Claude Sonnet 4.5 | Following TDD/BDD Practices*
