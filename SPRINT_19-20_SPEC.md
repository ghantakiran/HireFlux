# Sprint 19-20: Complete Assessment Platform
## Candidate Journey + Grading Interface

**Sprint Duration**: 4 weeks (Weeks 37-40)
**Status**: Planning → Implementation
**Started**: 2025-11-11
**Target Completion**: 2025-12-09

---

## Executive Summary

Sprint 17-18 delivered the **Skills Assessment Builder** (employer creates assessments). Sprint 19-20 completes the assessment lifecycle by delivering:

1. **Candidate Assessment Journey** (Weeks 37-38) - Candidates take assessments
2. **Grading & Review Interface** (Weeks 39-40) - Employers grade and review

**Business Impact**: Delivers end-to-end technical screening capability, differentiating HireFlux from competitors who lack integrated assessment platforms.

---

## Phase 1: Candidate Assessment Journey (Weeks 37-38)

### 1.1 Feature Overview

**User Story**: As a candidate, I want to take a technical assessment so that I can demonstrate my skills to potential employers.

**Core Features**:
- ✅ Assessment access via unique link/access token
- ✅ Assessment timer with auto-submit
- ✅ Question navigation (previous/next, jump to question)
- ✅ Code editor for coding challenges (Monaco Editor)
- ✅ Real-time code execution (Judge0/Piston API)
- ✅ Auto-save progress (every 30 seconds)
- ✅ Anti-cheating detection (tab switching, copy-paste, IP tracking)
- ✅ Assessment submission workflow
- ✅ Results viewing (after grading)

### 1.2 Database Schema (Existing - Already Created in Sprint 17-18)

```sql
-- Assessment attempts (tracks candidate progress)
CREATE TABLE assessment_attempts (
    id UUID PRIMARY KEY,
    assessment_id UUID REFERENCES assessments(id),
    candidate_id UUID REFERENCES users(id),
    job_application_id UUID REFERENCES job_applications(id),

    -- Access control
    access_token VARCHAR(255) UNIQUE,
    access_token_expires_at TIMESTAMP,

    -- Status
    status VARCHAR(50), -- 'not_started', 'in_progress', 'submitted', 'graded'
    started_at TIMESTAMP,
    submitted_at TIMESTAMP,
    time_spent_seconds INT,

    -- Score
    total_score INT,
    max_possible_score INT,
    percentage_score DECIMAL(5,2),

    -- Anti-cheating
    tab_switches INT DEFAULT 0,
    copy_paste_count INT DEFAULT 0,
    ip_address VARCHAR(45),
    suspicious_activity JSONB,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Assessment responses (candidate answers)
CREATE TABLE assessment_responses (
    id UUID PRIMARY KEY,
    attempt_id UUID REFERENCES assessment_attempts(id),
    question_id UUID REFERENCES assessment_questions(id),

    -- Answer content (varies by question type)
    answer_text TEXT,
    answer_options INTEGER[], -- For MCQ
    code_answer TEXT, -- For coding challenges
    file_url VARCHAR(500), -- For file uploads

    -- Grading
    is_correct BOOLEAN,
    points_earned INT,
    points_possible INT,

    -- Execution results (for coding)
    execution_output TEXT,
    execution_time_ms INT,
    test_cases_passed INT,
    test_cases_total INT,

    -- Metadata
    time_spent_seconds INT,
    answered_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 1.3 Backend API Endpoints (New - Week 37)

**Candidate Assessment Taking APIs**:
```typescript
// Access assessment
GET    /api/v1/assessments/access/{access_token}
  Response: { assessment: Assessment, attempt: AssessmentAttempt }

// Start assessment
POST   /api/v1/assessments/{id}/start
  Body: { access_token: string }
  Response: { attempt: AssessmentAttempt }

// Get current progress
GET    /api/v1/assessments/attempts/{attempt_id}
  Response: { attempt: AssessmentAttempt, responses: AssessmentResponse[] }

// Submit answer
POST   /api/v1/assessments/attempts/{attempt_id}/responses
  Body: {
    question_id: string,
    answer_text?: string,
    answer_options?: number[],
    code_answer?: string,
    file_url?: string
  }
  Response: { response: AssessmentResponse, auto_graded?: boolean }

// Execute code (coding challenges)
POST   /api/v1/assessments/attempts/{attempt_id}/execute-code
  Body: {
    question_id: string,
    code: string,
    language: string,
    test_case_index?: number
  }
  Response: {
    output: string,
    execution_time_ms: number,
    status: string,
    test_cases_passed: number,
    test_cases_total: number
  }

// Track anti-cheating event
POST   /api/v1/assessments/attempts/{attempt_id}/track-event
  Body: {
    event_type: 'tab_switch' | 'copy' | 'paste' | 'blur',
    timestamp: Date
  }
  Response: { tracked: boolean, warning?: string }

// Submit assessment
POST   /api/v1/assessments/attempts/{attempt_id}/submit
  Response: { attempt: AssessmentAttempt, auto_graded_score?: number }

// Get results (after grading)
GET    /api/v1/assessments/attempts/{attempt_id}/results
  Response: {
    attempt: AssessmentAttempt,
    responses: AssessmentResponse[],
    feedback: string,
    breakdown: { question: string, score: number }[]
  }
```

### 1.4 Backend Services (New - Week 37)

**CandidateAssessmentService** (`backend/app/services/candidate_assessment_service.py`):
```python
class CandidateAssessmentService:
    async def access_assessment(access_token: str) -> tuple[Assessment, AssessmentAttempt]
    async def start_assessment(assessment_id: str, access_token: str) -> AssessmentAttempt
    async def get_attempt_progress(attempt_id: str) -> dict
    async def submit_answer(attempt_id: str, question_id: str, answer_data: dict) -> AssessmentResponse
    async def execute_code(attempt_id: str, question_id: str, code: str, language: str) -> dict
    async def track_event(attempt_id: str, event_type: str) -> bool
    async def submit_assessment(attempt_id: str) -> AssessmentAttempt
    async def get_results(attempt_id: str) -> dict
    async def auto_grade_mcq(response: AssessmentResponse) -> int
    async def auto_grade_coding(response: AssessmentResponse) -> int
```

### 1.5 Frontend Pages (New - Week 38)

**Candidate Assessment Taking UI**:

1. **Assessment Access Page** (`/assessments/take/[token]`)
   - Access token validation
   - Assessment overview (title, duration, question count)
   - Instructions and rules
   - "Start Assessment" button
   - Warning about anti-cheating measures

2. **Assessment Taking Page** (`/assessments/attempt/[attemptId]`)
   - **Header**:
     - Timer (countdown with auto-submit)
     - Progress indicator (5/20 questions)
     - Auto-save status
   - **Question Display**:
     - Question text with rich formatting
     - Question type indicator
     - Points display
   - **Answer Interface** (varies by type):
     - **MCQ Single**: Radio buttons
     - **MCQ Multiple**: Checkboxes
     - **Text**: Textarea with character count
     - **Coding**: Monaco code editor with:
       - Language selector
       - Run code button
       - Test case results
       - Console output
     - **File Upload**: Drag-and-drop file uploader
   - **Navigation**:
     - Previous/Next buttons
     - Question palette (jump to any question)
     - Mark for review
   - **Footer**:
     - Submit assessment button
     - Warnings (tab switches, time remaining)

3. **Assessment Results Page** (`/assessments/results/[attemptId]`)
   - Overall score (75/100)
   - Percentage and pass/fail status
   - Question-by-question breakdown
   - Correct answers (if enabled)
   - Employer feedback
   - Next steps

### 1.6 Anti-Cheating Implementation

**Client-Side Detection**:
```typescript
// Track tab visibility changes
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    trackEvent('tab_switch');
    incrementTabSwitches();
    showWarning('Tab switching detected');
  }
});

// Track copy/paste
document.addEventListener('copy', () => {
  trackEvent('copy');
});

document.addEventListener('paste', (e) => {
  trackEvent('paste');
  // Allow paste in code editor, block elsewhere
  if (!isCodeEditor(e.target)) {
    e.preventDefault();
    showWarning('Paste disabled during assessment');
  }
});

// Track suspicious patterns
const activityTracker = new ActivityTracker({
  idleTimeout: 60000, // Flag if idle > 60 seconds
  rapidSubmission: true, // Flag if all questions answered < 1 minute
});
```

**Server-Side Validation**:
```python
def validate_attempt(attempt: AssessmentAttempt) -> list[str]:
    warnings = []

    # Tab switches
    if attempt.tab_switches > 3:
        warnings.append(f"Excessive tab switching ({attempt.tab_switches} times)")

    # Time spent
    avg_time_per_question = attempt.time_spent_seconds / attempt.total_questions
    if avg_time_per_question < 30:  # < 30 seconds per question
        warnings.append("Suspiciously fast completion")

    # Copy/paste
    if attempt.copy_paste_count > 10:
        warnings.append(f"Excessive copy/paste ({attempt.copy_paste_count} times)")

    # IP changes
    if len(set(attempt.ip_addresses)) > 1:
        warnings.append("Multiple IP addresses detected")

    return warnings
```

---

## Phase 2: Grading & Review Interface (Weeks 39-40)

### 2.1 Feature Overview

**User Story**: As an employer, I want to review and grade candidate assessments so that I can evaluate technical skills objectively.

**Core Features**:
- ✅ View all candidate attempts for an assessment
- ✅ Filter by status (submitted, graded, pending review)
- ✅ Manual grading for text/file response questions
- ✅ Review auto-graded coding challenges
- ✅ Bulk grading operations
- ✅ Provide written feedback
- ✅ Finalize grading and notify candidates
- ✅ Export results to CSV

### 2.2 Backend API Endpoints (New - Week 39)

**Employer Grading APIs**:
```typescript
// List attempts for assessment
GET    /api/v1/employer/assessments/{id}/attempts
  Query: { status?: string, sort?: string, page: number, limit: number }
  Response: { attempts: AssessmentAttempt[], total: number }

// Get attempt details for grading
GET    /api/v1/employer/assessments/attempts/{attempt_id}/grade
  Response: {
    attempt: AssessmentAttempt,
    candidate: User,
    responses: AssessmentResponse[],
    questions: AssessmentQuestion[],
    anti_cheating_warnings: string[]
  }

// Grade single response
POST   /api/v1/employer/assessments/responses/{response_id}/grade
  Body: {
    points_earned: number,
    feedback?: string,
    is_correct: boolean
  }
  Response: { response: AssessmentResponse }

// Bulk grade responses
POST   /api/v1/employer/assessments/attempts/{attempt_id}/bulk-grade
  Body: {
    grades: Array<{
      response_id: string,
      points_earned: number,
      is_correct: boolean
    }>
  }
  Response: { graded_count: number }

// Add feedback and finalize
POST   /api/v1/employer/assessments/attempts/{attempt_id}/finalize
  Body: {
    overall_feedback: string,
    notify_candidate: boolean
  }
  Response: { attempt: AssessmentAttempt }

// Export results
GET    /api/v1/employer/assessments/{id}/export
  Query: { format: 'csv' | 'json' }
  Response: File download
```

### 2.3 Backend Services (New - Week 39)

**AssessmentGradingService** (`backend/app/services/assessment_grading_service.py`):
```python
class AssessmentGradingService:
    async def get_attempts_for_grading(assessment_id: str, filters: dict) -> list[AssessmentAttempt]
    async def get_attempt_details(attempt_id: str) -> dict
    async def grade_response(response_id: str, points: int, feedback: str) -> AssessmentResponse
    async def bulk_grade_responses(attempt_id: str, grades: list[dict]) -> int
    async def calculate_total_score(attempt_id: str) -> dict
    async def finalize_grading(attempt_id: str, feedback: str, notify: bool) -> AssessmentAttempt
    async def export_results(assessment_id: str, format: str) -> bytes
    async def send_results_notification(attempt_id: str) -> bool
```

### 2.4 Frontend Pages (New - Week 40)

**Employer Grading UI**:

1. **Assessment Attempts List** (`/employer/assessments/[id]/attempts`)
   - Table view of all attempts
   - Columns:
     - Candidate name
     - Status (submitted, graded, pending)
     - Auto-graded score (if available)
     - Submission date
     - Time spent
     - Anti-cheating warnings
     - Actions (Grade, View)
   - Filters: Status, date range, score range
   - Bulk actions: Export, notify all

2. **Grading Interface** (`/employer/assessments/attempts/[attemptId]/grade`)
   - **Candidate Summary**:
     - Name, email, application link
     - Submission timestamp
     - Time spent
     - Anti-cheating flags
   - **Question-by-Question Grading**:
     - **Auto-Graded Questions** (MCQ, Coding):
       - Show candidate answer
       - Show correct answer
       - Show auto-calculated points
       - Option to override points
     - **Manual Grading** (Text, File):
       - Show candidate response
       - Input field for points (0 to max)
       - Textarea for feedback
       - Mark as correct/incorrect
   - **Coding Challenge Review**:
     - Show code with syntax highlighting
     - Show test case results
     - Show execution output
     - Option to re-run code
   - **Overall Feedback**:
     - Rich text editor for comprehensive feedback
     - Template suggestions
   - **Actions**:
     - Save draft
     - Finalize and notify candidate
     - Export to PDF

3. **Bulk Grading View** (`/employer/assessments/[id]/bulk-grade`)
   - Side-by-side comparison of multiple attempts
   - Quick grade entry for text questions
   - Rubric-based grading (optional)
   - Batch finalize

---

## Technical Implementation Plan

### Week 37: Candidate Assessment Backend

**Day 1-2: Database & Models**
- ✅ Tables already exist from Sprint 17-18
- Verify migrations are applied
- Add indexes for performance

**Day 3-4: CandidateAssessmentService**
- TDD: Write 40+ unit tests first
- Implement access token validation
- Implement assessment start workflow
- Implement answer submission
- Implement auto-save logic

**Day 5: Code Execution Integration**
- Integrate Judge0/Piston API
- Implement test case execution
- Handle timeouts and errors
- Cache execution results

**Day 6-7: API Endpoints**
- Implement 8 candidate assessment APIs
- Add authentication and authorization
- Add rate limiting (prevent spam)
- Document with OpenAPI

**Week 37 Deliverable**: Fully functional backend for candidate assessment taking

---

### Week 38: Candidate Assessment Frontend

**Day 1-2: Assessment Access Page**
- Create `/assessments/take/[token]` page
- Token validation and error handling
- Assessment overview display
- Instructions and rules UI
- Start assessment flow

**Day 3-5: Assessment Taking Page**
- Create `/assessments/attempt/[attemptId]` page
- Build question display components
- Build answer input components:
  - MCQSelector (radio/checkboxes)
  - TextAnswerInput
  - CodeEditor (Monaco integration)
  - FileUploader
- Implement timer with auto-submit
- Implement navigation (prev/next, jump)
- Implement auto-save (30-second intervals)

**Day 6: Anti-Cheating UI**
- Tab switch detection and warnings
- Copy/paste tracking
- Warning modal system
- Activity tracking

**Day 7: Results Page**
- Create `/assessments/results/[attemptId]` page
- Score display and breakdown
- Feedback rendering
- Next steps UI

**Week 38 Deliverable**: Fully functional candidate assessment taking UI

---

### Week 39: Grading Interface Backend

**Day 1-2: AssessmentGradingService**
- TDD: Write 30+ unit tests first
- Implement attempt fetching with filters
- Implement manual grading logic
- Implement bulk grading
- Implement score calculation

**Day 3-4: Finalization & Notifications**
- Implement grading finalization
- Implement candidate email notifications
- Add feedback templates
- Add anti-cheating report generation

**Day 5: Export Functionality**
- Implement CSV export
- Implement JSON export
- Add results aggregation
- Add statistics calculation

**Day 6-7: API Endpoints**
- Implement 6 grading APIs
- Add employer authorization checks
- Add audit logging
- Document with OpenAPI

**Week 39 Deliverable**: Fully functional grading backend

---

### Week 40: Grading Interface Frontend

**Day 1-2: Attempts List Page**
- Create `/employer/assessments/[id]/attempts` page
- Table with sorting and filtering
- Status indicators
- Anti-cheating warnings display
- Bulk action toolbar

**Day 3-5: Grading Interface**
- Create `/employer/assessments/attempts/[attemptId]/grade` page
- Candidate summary card
- Question-by-question grading UI
- Auto-graded question review
- Manual grading inputs
- Coding challenge review with syntax highlighting
- Overall feedback editor

**Day 6: Bulk Grading**
- Create `/employer/assessments/[id]/bulk-grade` page
- Side-by-side comparison view
- Quick grade entry
- Batch finalize

**Day 7: Export & Polish**
- Export to CSV/PDF
- Loading states and error handling
- Toast notifications
- UI polish

**Week 40 Deliverable**: Fully functional grading UI

---

## Testing Strategy

### TDD (Test-Driven Development)

**Backend Unit Tests** (Write FIRST, then implement):
```python
# backend/tests/unit/test_candidate_assessment_service.py (40+ tests)
test_access_assessment_valid_token()
test_access_assessment_expired_token()
test_start_assessment_creates_attempt()
test_submit_answer_mcq_single()
test_submit_answer_mcq_multiple()
test_submit_answer_text()
test_submit_answer_coding()
test_submit_answer_file_upload()
test_execute_code_python()
test_execute_code_javascript()
test_auto_grade_mcq_correct()
test_auto_grade_mcq_incorrect()
test_auto_grade_coding_all_pass()
test_auto_grade_coding_partial_pass()
test_track_tab_switch()
test_submit_assessment_finalizes_attempt()
test_submit_assessment_auto_grades()
# ... 25+ more tests

# backend/tests/unit/test_assessment_grading_service.py (30+ tests)
test_get_attempts_for_grading()
test_get_attempt_details()
test_grade_response_manual()
test_bulk_grade_responses()
test_calculate_total_score()
test_finalize_grading_with_notification()
test_export_results_csv()
test_export_results_json()
# ... 22+ more tests
```

### BDD (Behavior-Driven Development)

**E2E Tests** (Playwright with Gherkin-style scenarios):
```typescript
// frontend/tests/e2e/candidate-assessment.spec.ts (25+ scenarios)

// Feature: Candidate Assessment Taking
describe('Candidate Assessment Taking', () => {
  test('should access assessment with valid token', async ({ page }) => {
    // Given I have a valid access token
    // When I visit the assessment access page
    // Then I should see the assessment overview
  });

  test('should start assessment and display first question', async ({ page }) => {
    // Given I am on the assessment access page
    // When I click "Start Assessment"
    // Then I should see the first question
    // And the timer should start
  });

  test('should submit MCQ answer and navigate to next question', async ({ page }) => {
    // Given I am taking an assessment
    // When I select an answer option
    // And I click "Next"
    // Then my answer should be saved
    // And I should see the next question
  });

  test('should execute Python code and see results', async ({ page }) => {
    // Given I am on a coding challenge question
    // When I write Python code
    // And I click "Run Code"
    // Then I should see the execution output
    // And I should see test case results
  });

  test('should detect tab switching and show warning', async ({ page }) => {
    // Given I am taking an assessment
    // When I switch to another tab
    // Then I should see a warning message
    // And the tab switch count should increment
  });

  test('should auto-submit when timer expires', async ({ page }) => {
    // Given I am taking an assessment with 1 minute remaining
    // When the timer reaches 0:00
    // Then the assessment should auto-submit
    // And I should see the submission confirmation
  });

  test('should view results after grading', async ({ page }) => {
    // Given my assessment has been graded
    // When I visit the results page
    // Then I should see my score
    // And I should see feedback from the employer
  });
});

// Feature: Employer Grading Interface
describe('Employer Grading Interface', () => {
  test('should view list of candidate attempts', async ({ page }) => {
    // Given I am an employer
    // When I navigate to assessment attempts
    // Then I should see a list of all candidate attempts
  });

  test('should grade text response manually', async ({ page }) => {
    // Given I am grading a candidate attempt
    // When I assign points to a text response
    // And I provide feedback
    // And I click "Save"
    // Then the grade should be saved
  });

  test('should review auto-graded coding challenge', async ({ page }) => {
    // Given I am grading a candidate attempt
    // When I view a coding challenge response
    // Then I should see the candidate's code
    // And I should see test case results
    // And I should see the auto-calculated score
  });

  test('should finalize grading and notify candidate', async ({ page }) => {
    // Given I have graded all responses
    // When I provide overall feedback
    // And I click "Finalize & Notify"
    // Then the candidate should receive an email
    // And the attempt status should be "graded"
  });

  test('should export results to CSV', async ({ page }) => {
    // Given I am viewing assessment attempts
    // When I click "Export to CSV"
    // Then a CSV file should download
    // And it should contain all attempt data
  });
});
```

---

## CI/CD Integration

### GitHub Actions Workflow (Update existing)

```yaml
# .github/workflows/assessment-features-ci.yml (UPDATE)

jobs:
  # ... existing jobs ...

  # NEW: Candidate assessment tests
  candidate-assessment-backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run candidate assessment service tests
        run: |
          cd backend
          source venv/bin/activate
          pytest tests/unit/test_candidate_assessment_service.py -v

  candidate-assessment-e2e:
    needs: [backend-unit-tests, frontend-build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run candidate assessment E2E tests
        run: |
          npx playwright test tests/e2e/candidate-assessment.spec.ts \
            --project=chromium \
            --reporter=list

  # NEW: Grading interface tests
  grading-interface-backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run grading service tests
        run: |
          cd backend
          source venv/bin/activate
          pytest tests/unit/test_assessment_grading_service.py -v

  grading-interface-e2e:
    needs: [backend-unit-tests, frontend-build]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run grading interface E2E tests
        run: |
          npx playwright test tests/e2e/grading-interface.spec.ts \
            --project=chromium \
            --reporter=list
```

---

## Success Criteria

### Week 37 (Candidate Backend):
- [x] 40+ unit tests passing
- [x] 8 API endpoints functional
- [x] Code execution working for 10 languages
- [x] Auto-grading for MCQ and coding
- [x] Anti-cheating tracking operational

### Week 38 (Candidate Frontend):
- [x] Assessment access page working
- [x] Assessment taking page with all question types
- [x] Code editor with syntax highlighting
- [x] Timer with auto-submit
- [x] Anti-cheating warnings displayed
- [x] Results page rendering

### Week 39 (Grading Backend):
- [x] 30+ unit tests passing
- [x] 6 grading API endpoints functional
- [x] Manual grading logic working
- [x] CSV export generating correct data
- [x] Email notifications sent

### Week 40 (Grading Frontend):
- [x] Attempts list with filtering
- [x] Grading interface with all question types
- [x] Bulk grading operational
- [x] Export to CSV working
- [x] UI polished and responsive

### Overall Sprint 19-20:
- [x] 70+ backend tests passing (TDD)
- [x] 50+ E2E tests passing (BDD)
- [x] Complete candidate journey functional
- [x] Complete grading workflow functional
- [x] Deployed to Vercel production
- [x] Documentation updated

---

## Documentation Updates

### Files to Update:
1. **IMPLEMENTATION_PROGRESS.md** - Add Sprint 19-20 section
2. **DEPLOYMENT_SUCCESS_SPRINT_19-20.md** - Create deployment summary
3. **API_DOCUMENTATION.md** - Document new endpoints
4. **TESTING_GUIDE.md** - Update with new test scenarios

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Code execution API (Judge0) rate limits | High | Implement caching, fallback to Piston API |
| Monaco Editor bundle size | Medium | Lazy load, code-splitting |
| Anti-cheating false positives | Medium | Configurable thresholds, manual review |
| Grading UI complexity | Medium | Iterative design, user testing |

---

## Next Steps After Sprint 19-20

**Sprint 21-22 Options**:
1. **Mass Job Posting** (deferred from earlier) - CSV bulk upload, AI normalization
2. **Background Check Integrations** - Checkr, GoodHire APIs
3. **Video Interview Platform** - WebRTC, recording, AI analysis
4. **Advanced Reporting** - Custom reports, data exports, analytics

**Recommendation**: Mass Job Posting to complete all core employer features

---

**Document Created**: 2025-11-11
**Status**: Ready for Implementation
**Owner**: Engineering Team
**Reviewers**: Product Management, CTO

