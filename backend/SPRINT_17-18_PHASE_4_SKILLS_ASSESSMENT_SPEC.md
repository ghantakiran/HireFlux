# Sprint 17-18 Phase 4: Skills Assessment & Testing Platform
## Enterprise-Grade Candidate Evaluation System

**Phase**: 4 of 6 (Sprint 17-18)
**Status**: Specification
**Priority**: P1 (Important for Enterprise)
**Estimated Effort**: ~1,500 LOC (Backend: 900, Frontend: 400, Tests: 200)
**Target Completion**: Week 35-36

---

## Executive Summary

Build a comprehensive skills assessment platform that allows employers to create custom tests, coding challenges, and evaluations to screen candidates objectively before interviews. This feature differentiates HireFlux from competitors by providing built-in assessment capabilities without requiring third-party integrations.

**Business Value**:
- **Enterprise Feature**: Required for Professional/Enterprise plans ($299+/month)
- **Time Savings**: Reduce interview time by 60% through pre-screening
- **Objective Hiring**: Remove bias with standardized assessments
- **Competitive Edge**: Few ATS platforms have built-in assessments

**Key Capabilities**:
1. Assessment builder with 5 question types
2. Question bank library (public + private)
3. Auto-grading for MCQs and coding challenges
4. Manual grading for subjective questions
5. Time limits and anti-cheating measures
6. Integration-ready for HackerRank/Codility APIs

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Database Schema](#database-schema)
3. [Service Layer Architecture](#service-layer-architecture)
4. [REST API Endpoints](#rest-api-endpoints)
5. [Assessment Types](#assessment-types)
6. [Grading System](#grading-system)
7. [Anti-Cheating Measures](#anti-cheating-measures)
8. [Frontend Components](#frontend-components)
9. [Third-Party Integrations](#third-party-integrations)
10. [Implementation Checklist](#implementation-checklist)

---

## Feature Overview

### Use Cases

**UC-1: Create Assessment**
```
GIVEN: Employer creating a new Software Engineer job
WHEN: They want to pre-screen for coding skills
THEN: Create assessment with 5 coding questions (easy/medium), 60-min time limit
AND: Require 70% passing score
```

**UC-2: Candidate Takes Assessment**
```
GIVEN: Candidate applied to a job with required assessment
WHEN: They start the assessment
THEN: Timer starts, questions displayed one-by-one or all at once
AND: Tab switching detected (warning on first, fail on third)
AND: Auto-submit when time expires
```

**UC-3: Auto-Grading**
```
GIVEN: Candidate submits MCQ assessment
WHEN: Submission received
THEN: Instantly grade correct/incorrect answers
AND: Calculate percentage score
AND: Update application status if passing (move to "Screening Passed")
```

**UC-4: Manual Grading**
```
GIVEN: Candidate submits subjective coding question
WHEN: Recruiter reviews submission
THEN: View code, add comments, assign score 0-100
AND: Aggregate scores across all questions
```

### Assessment Workflow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Employer Creates Assessment                              │
│    - Select question types                                   │
│    - Set passing score, time limit                           │
│    - Attach to job posting                                   │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│ 2. Candidate Applies                                         │
│    - Application submitted                                   │
│    - Assessment email sent (if required)                     │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│ 3. Candidate Takes Assessment                                │
│    - Unique assessment link (expires in 7 days)              │
│    - Timer starts on first question                          │
│    - Anti-cheating monitoring                                │
│    - Auto-submit on timeout                                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│ 4. Grading                                                   │
│    - Auto-grade: MCQ, coding (test cases)                    │
│    - Manual grade: Subjective, file uploads                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│ 5. Results & Decision                                        │
│    - Candidate sees score (if employer allows)               │
│    - Employer sees detailed breakdown                        │
│    - Auto-advance to next stage if passing                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Table: `assessments`

```sql
CREATE TABLE assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id),

    -- Assessment metadata
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assessment_type VARCHAR(50) NOT NULL, -- "pre_screening", "technical", "personality", "custom"

    -- Configuration
    time_limit_minutes INT, -- NULL = no time limit
    passing_score_percentage DECIMAL(5,2) NOT NULL DEFAULT 70.00, -- 0-100
    max_attempts INT DEFAULT 1,

    -- Question settings
    randomize_questions BOOLEAN DEFAULT FALSE,
    randomize_options BOOLEAN DEFAULT TRUE, -- For MCQ
    show_results_to_candidate BOOLEAN DEFAULT FALSE,
    show_correct_answers BOOLEAN DEFAULT FALSE,

    -- Anti-cheating
    enable_proctoring BOOLEAN DEFAULT FALSE,
    allow_tab_switching BOOLEAN DEFAULT FALSE,
    max_tab_switches INT DEFAULT 3,
    require_webcam BOOLEAN DEFAULT FALSE,

    -- Status
    status VARCHAR(50) DEFAULT 'draft', -- "draft", "active", "archived"
    is_template BOOLEAN DEFAULT FALSE, -- Reusable template

    -- Stats
    total_attempts INT DEFAULT 0,
    avg_score DECIMAL(5,2),
    pass_rate DECIMAL(5,2), -- Percentage of candidates who passed

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_assessments_company (company_id),
    INDEX idx_assessments_status (status),
    INDEX idx_assessments_created_by (created_by)
);
```

### Table: `assessment_questions`

```sql
CREATE TABLE assessment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,

    -- Question content
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- "mcq_single", "mcq_multiple", "coding", "text", "file_upload"

    -- For MCQ
    options JSONB, -- [{"id": "a", "text": "Option A"}, ...]
    correct_answers JSONB, -- ["a"] for single, ["a", "c"] for multiple

    -- For coding questions
    coding_language VARCHAR(50), -- "python", "javascript", "java", "cpp", etc.
    starter_code TEXT, -- Template code to start with
    test_cases JSONB, -- [{"input": "...", "expected_output": "...", "points": 10}]

    -- Grading
    points INT NOT NULL DEFAULT 10, -- Points for this question
    difficulty VARCHAR(20), -- "easy", "medium", "hard"

    -- Display
    display_order INT NOT NULL,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_assessment_questions_assessment (assessment_id),
    INDEX idx_assessment_questions_type (question_type)
);
```

### Table: `assessment_attempts`

```sql
CREATE TABLE assessment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- Attempt tracking
    attempt_number INT NOT NULL DEFAULT 1,
    status VARCHAR(50) DEFAULT 'not_started', -- "not_started", "in_progress", "submitted", "graded"

    -- Timing
    started_at TIMESTAMP,
    submitted_at TIMESTAMP,
    time_spent_seconds INT,

    -- Scoring
    total_points_possible INT NOT NULL,
    points_earned DECIMAL(10,2) DEFAULT 0,
    score_percentage DECIMAL(5,2),
    passed BOOLEAN,

    -- Auto vs manual grading
    auto_graded_at TIMESTAMP,
    manually_graded_at TIMESTAMP,
    graded_by UUID REFERENCES users(id),

    -- Anti-cheating tracking
    tab_switch_count INT DEFAULT 0,
    suspicious_activity JSONB, -- [{"timestamp": "...", "event": "tab_switched"}]
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Access control
    access_token VARCHAR(255) UNIQUE, -- Secure token for taking assessment
    access_expires_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(application_id, attempt_number),
    INDEX idx_assessment_attempts_assessment (assessment_id),
    INDEX idx_assessment_attempts_application (application_id),
    INDEX idx_assessment_attempts_candidate (candidate_id),
    INDEX idx_assessment_attempts_status (status),
    INDEX idx_assessment_attempts_access_token (access_token)
);
```

### Table: `assessment_responses`

```sql
CREATE TABLE assessment_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,

    -- Response content
    response_type VARCHAR(50) NOT NULL, -- "mcq", "coding", "text", "file"

    -- MCQ response
    selected_options JSONB, -- ["a"] or ["a", "c"]

    -- Text/coding response
    text_response TEXT,

    -- File upload response
    file_url VARCHAR(500),
    file_name VARCHAR(255),
    file_size_bytes INT,

    -- Coding execution (if applicable)
    code_execution_output JSONB, -- [{"test_case": 1, "passed": true, "output": "..."}]

    -- Grading
    is_correct BOOLEAN, -- For MCQ auto-grading
    points_earned DECIMAL(10,2) DEFAULT 0,
    max_points INT NOT NULL,

    -- Manual grading
    grader_comments TEXT,
    graded_by UUID REFERENCES users(id),
    graded_at TIMESTAMP,

    -- Timing
    time_spent_seconds INT,
    answered_at TIMESTAMP DEFAULT NOW(),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(attempt_id, question_id),
    INDEX idx_assessment_responses_attempt (attempt_id),
    INDEX idx_assessment_responses_question (question_id)
);
```

### Table: `question_bank`

```sql
CREATE TABLE question_bank (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE, -- NULL = public question
    created_by UUID NOT NULL REFERENCES users(id),

    -- Question content (same structure as assessment_questions)
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL,
    options JSONB,
    correct_answers JSONB,
    coding_language VARCHAR(50),
    starter_code TEXT,
    test_cases JSONB,

    -- Metadata
    category VARCHAR(100), -- "algorithms", "data_structures", "system_design", etc.
    tags VARCHAR(50)[], -- ["python", "arrays", "sorting"]
    difficulty VARCHAR(20),
    points INT DEFAULT 10,

    -- Visibility
    is_public BOOLEAN DEFAULT FALSE,

    -- Stats
    times_used INT DEFAULT 0,
    avg_score DECIMAL(5,2),

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_question_bank_company (company_id),
    INDEX idx_question_bank_category (category),
    INDEX idx_question_bank_difficulty (difficulty),
    INDEX idx_question_bank_tags (tags),
    INDEX idx_question_bank_public (is_public)
);
```

### Table: `job_assessment_requirements`

```sql
CREATE TABLE job_assessment_requirements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES jobs_native(id) ON DELETE CASCADE,
    assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,

    -- Requirement settings
    is_required BOOLEAN DEFAULT TRUE, -- If false, assessment is optional
    must_pass_to_proceed BOOLEAN DEFAULT TRUE, -- If true, failing = auto-reject

    -- Timing
    deadline_hours_after_application INT DEFAULT 168, -- 7 days default

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(job_id, assessment_id),
    INDEX idx_job_assessment_requirements_job (job_id),
    INDEX idx_job_assessment_requirements_assessment (assessment_id)
);
```

**Total Tables**: 6
**Total Fields**: ~120 fields across all tables

---

## Service Layer Architecture

### AssessmentService

**File**: `backend/app/services/assessment_service.py`

**Responsibilities**:
1. Assessment CRUD operations
2. Question management
3. Assessment attempt tracking
4. Auto-grading logic
5. Scoring calculations
6. Anti-cheating detection

**Key Methods** (15 methods):

```python
class AssessmentService:
    def create_assessment(self, company_id: UUID, data: AssessmentCreate) -> Assessment
    def get_assessment(self, assessment_id: UUID) -> Assessment
    def update_assessment(self, assessment_id: UUID, data: AssessmentUpdate) -> Assessment
    def delete_assessment(self, assessment_id: UUID) -> bool
    def list_assessments(self, company_id: UUID, filters: AssessmentFilters) -> List[Assessment]

    def add_question(self, assessment_id: UUID, question: QuestionCreate) -> AssessmentQuestion
    def update_question(self, question_id: UUID, data: QuestionUpdate) -> AssessmentQuestion
    def delete_question(self, question_id: UUID) -> bool
    def reorder_questions(self, assessment_id: UUID, question_ids: List[UUID]) -> bool

    def start_assessment(self, application_id: UUID, assessment_id: UUID) -> AssessmentAttempt
    def submit_response(self, attempt_id: UUID, question_id: UUID, response: ResponseCreate) -> AssessmentResponse
    def submit_assessment(self, attempt_id: UUID) -> AssessmentAttempt

    def auto_grade_attempt(self, attempt_id: UUID) -> AssessmentAttempt
    def manual_grade_response(self, response_id: UUID, score: float, comments: str) -> AssessmentResponse
    def calculate_attempt_score(self, attempt_id: UUID) -> Dict[str, Any]
```

### QuestionBankService

**File**: `backend/app/services/question_bank_service.py`

**Key Methods** (8 methods):

```python
class QuestionBankService:
    def create_question(self, company_id: UUID, data: QuestionBankCreate) -> QuestionBankItem
    def get_question(self, question_id: UUID) -> QuestionBankItem
    def search_questions(self, filters: QuestionBankFilters) -> List[QuestionBankItem]
    def import_question_to_assessment(self, question_id: UUID, assessment_id: UUID) -> AssessmentQuestion
    def bulk_import_questions(self, question_ids: List[UUID], assessment_id: UUID) -> List[AssessmentQuestion]
    def update_question(self, question_id: UUID, data: QuestionBankUpdate) -> QuestionBankItem
    def delete_question(self, question_id: UUID) -> bool
    def get_question_stats(self, question_id: UUID) -> Dict[str, Any]
```

### CodingExecutionService

**File**: `backend/app/services/coding_execution_service.py`

**Responsibilities**:
- Execute candidate code submissions
- Run test cases
- Sandbox execution environment
- Timeout handling

**Key Methods** (4 methods):

```python
class CodingExecutionService:
    def execute_code(self, code: str, language: str, test_cases: List[TestCase]) -> ExecutionResult
    def validate_syntax(self, code: str, language: str) -> bool
    def run_single_test_case(self, code: str, language: str, test_case: TestCase) -> TestCaseResult
    def calculate_code_metrics(self, code: str, language: str) -> Dict[str, Any]  # Lines, complexity, etc.
```

**Integration Points**:
- Judge0 API (free tier: 50 requests/day)
- Piston API (unlimited, self-hosted option)
- HackerRank CodePair API (paid)

---

## REST API Endpoints

### Assessment Management (8 endpoints)

```typescript
// Create assessment
POST /api/v1/employer/assessments
Body: {
  title: string,
  description: string,
  assessment_type: "pre_screening" | "technical" | "personality",
  time_limit_minutes: number,
  passing_score_percentage: number,
  questions: QuestionCreate[]
}
Response: { assessment: Assessment }

// List assessments
GET /api/v1/employer/assessments
Query: { status?: string, page: number, limit: number }
Response: { assessments: Assessment[], total: number }

// Get assessment details
GET /api/v1/employer/assessments/{id}
Response: { assessment: Assessment, questions: AssessmentQuestion[] }

// Update assessment
PATCH /api/v1/employer/assessments/{id}
Body: Partial<AssessmentUpdate>
Response: { assessment: Assessment }

// Delete assessment
DELETE /api/v1/employer/assessments/{id}
Response: { success: boolean }

// Attach assessment to job
POST /api/v1/employer/jobs/{job_id}/assessments
Body: { assessment_id: UUID, is_required: boolean }
Response: { job_assessment: JobAssessmentRequirement }

// Get assessment analytics
GET /api/v1/employer/assessments/{id}/analytics
Response: {
  total_attempts: number,
  avg_score: number,
  pass_rate: number,
  score_distribution: number[],
  avg_time_spent: number
}

// Duplicate assessment (create from template)
POST /api/v1/employer/assessments/{id}/duplicate
Response: { assessment: Assessment }
```

### Question Management (6 endpoints)

```typescript
// Add question to assessment
POST /api/v1/employer/assessments/{assessment_id}/questions
Body: QuestionCreate
Response: { question: AssessmentQuestion }

// Update question
PATCH /api/v1/employer/assessments/questions/{question_id}
Body: Partial<QuestionUpdate>
Response: { question: AssessmentQuestion }

// Delete question
DELETE /api/v1/employer/assessments/questions/{question_id}
Response: { success: boolean }

// Reorder questions
PUT /api/v1/employer/assessments/{assessment_id}/questions/reorder
Body: { question_ids: UUID[] }
Response: { questions: AssessmentQuestion[] }

// Preview question
GET /api/v1/employer/assessments/questions/{question_id}/preview
Response: { question: AssessmentQuestion, sample_response: any }

// Bulk import from question bank
POST /api/v1/employer/assessments/{assessment_id}/questions/bulk-import
Body: { question_ids: UUID[] }
Response: { questions: AssessmentQuestion[] }
```

### Question Bank (5 endpoints)

```typescript
// Search question bank
GET /api/v1/employer/question-bank
Query: {
  category?: string,
  difficulty?: string,
  tags?: string[],
  is_public?: boolean,
  page: number,
  limit: number
}
Response: { questions: QuestionBankItem[], total: number }

// Create question in bank
POST /api/v1/employer/question-bank
Body: QuestionBankCreate
Response: { question: QuestionBankItem }

// Get question from bank
GET /api/v1/employer/question-bank/{id}
Response: { question: QuestionBankItem, stats: QuestionStats }

// Update question in bank
PATCH /api/v1/employer/question-bank/{id}
Body: Partial<QuestionBankUpdate>
Response: { question: QuestionBankItem }

// Delete question from bank
DELETE /api/v1/employer/question-bank/{id}
Response: { success: boolean }
```

### Candidate Assessment Taking (8 endpoints)

```typescript
// Get assessment for candidate (via access token)
GET /api/v1/assessments/{access_token}
Response: {
  assessment: Assessment,
  attempt: AssessmentAttempt,
  questions: AssessmentQuestion[] // Without correct answers
}

// Start assessment
POST /api/v1/assessments/{access_token}/start
Response: { attempt: AssessmentAttempt, started_at: timestamp }

// Submit answer to question
POST /api/v1/assessments/{access_token}/responses
Body: {
  question_id: UUID,
  response: any, // Format depends on question type
  time_spent_seconds: number
}
Response: { response: AssessmentResponse }

// Get current progress
GET /api/v1/assessments/{access_token}/progress
Response: {
  questions_total: number,
  questions_answered: number,
  time_remaining_seconds: number,
  current_question: number
}

// Submit assessment (final submission)
POST /api/v1/assessments/{access_token}/submit
Response: {
  attempt: AssessmentAttempt,
  score_percentage: number,
  passed: boolean,
  show_results: boolean
}

// Get assessment results (if allowed)
GET /api/v1/assessments/{access_token}/results
Response: {
  score_percentage: number,
  passed: boolean,
  questions_correct: number,
  questions_total: number,
  breakdown: QuestionResult[] // If show_correct_answers = true
}

// Report suspicious activity
POST /api/v1/assessments/{access_token}/report-activity
Body: { event: "tab_switched" | "window_blur" | "copy_paste" }
Response: { warning: string, strikes_remaining: number }

// Execute code (for coding questions)
POST /api/v1/assessments/{access_token}/execute-code
Body: {
  question_id: UUID,
  code: string,
  language: string
}
Response: {
  output: string,
  execution_time_ms: number,
  test_cases_passed: number,
  test_cases_total: number
}
```

### Grading & Review (4 endpoints)

```typescript
// List attempts for assessment
GET /api/v1/employer/assessments/{assessment_id}/attempts
Query: { status?: string, passed?: boolean, page: number }
Response: { attempts: AssessmentAttempt[], total: number }

// Get attempt details (for manual grading)
GET /api/v1/employer/assessment-attempts/{attempt_id}
Response: {
  attempt: AssessmentAttempt,
  responses: AssessmentResponse[],
  candidate: CandidateProfile
}

// Grade response manually
PATCH /api/v1/employer/assessment-responses/{response_id}/grade
Body: {
  points_earned: number,
  grader_comments: string
}
Response: { response: AssessmentResponse }

// Finalize grading (recalculate total score)
POST /api/v1/employer/assessment-attempts/{attempt_id}/finalize
Response: {
  attempt: AssessmentAttempt,
  final_score: number,
  passed: boolean
}
```

**Total Endpoints**: 31

---

## Assessment Types

### 1. Multiple Choice (Single Answer)

**Example**:
```json
{
  "question_type": "mcq_single",
  "question_text": "What is the time complexity of binary search?",
  "options": [
    {"id": "a", "text": "O(n)"},
    {"id": "b", "text": "O(log n)"},
    {"id": "c", "text": "O(n^2)"},
    {"id": "d", "text": "O(1)"}
  ],
  "correct_answers": ["b"],
  "points": 10
}
```

**Auto-Grading**: YES
**Difficulty**: Easy to create

### 2. Multiple Choice (Multiple Answers)

**Example**:
```json
{
  "question_type": "mcq_multiple",
  "question_text": "Which of the following are JavaScript frameworks? (Select all that apply)",
  "options": [
    {"id": "a", "text": "React"},
    {"id": "b", "text": "Django"},
    {"id": "c", "text": "Vue"},
    {"id": "d", "text": "Flask"}
  ],
  "correct_answers": ["a", "c"],
  "points": 15
}
```

**Auto-Grading**: YES (partial credit for partially correct)
**Difficulty**: Medium to create

### 3. Coding Challenge

**Example**:
```json
{
  "question_type": "coding",
  "question_text": "Write a function to reverse a string",
  "coding_language": "python",
  "starter_code": "def reverse_string(s: str) -> str:\n    # Your code here\n    pass",
  "test_cases": [
    {
      "input": "\"hello\"",
      "expected_output": "\"olleh\"",
      "points": 5,
      "is_hidden": false
    },
    {
      "input": "\"world\"",
      "expected_output": "\"dlrow\"",
      "points": 5,
      "is_hidden": true
    }
  ],
  "points": 20
}
```

**Auto-Grading**: YES (via test case execution)
**Difficulty**: Hard to create (requires test cases)

### 4. Text Response (Short Answer)

**Example**:
```json
{
  "question_type": "text",
  "question_text": "Explain the difference between an abstract class and an interface in Java",
  "points": 10
}
```

**Auto-Grading**: NO (requires manual review)
**Difficulty**: Easy to create

### 5. File Upload

**Example**:
```json
{
  "question_type": "file_upload",
  "question_text": "Upload a diagram showing your proposed system architecture",
  "allowed_file_types": ["pdf", "png", "jpg"],
  "max_file_size_mb": 5,
  "points": 15
}
```

**Auto-Grading**: NO (requires manual review)
**Difficulty**: Easy to create

---

## Grading System

### Auto-Grading

**MCQ Questions**:
```python
def auto_grade_mcq(question: AssessmentQuestion, response: AssessmentResponse) -> float:
    correct_answers = set(question.correct_answers)
    selected_answers = set(response.selected_options)

    if question.question_type == "mcq_single":
        # All or nothing
        if selected_answers == correct_answers:
            return question.points
        return 0.0

    elif question.question_type == "mcq_multiple":
        # Partial credit
        if selected_answers == correct_answers:
            return question.points  # 100%

        # Calculate partial score
        correct_selections = len(selected_answers & correct_answers)
        incorrect_selections = len(selected_answers - correct_answers)
        total_correct = len(correct_answers)

        # Partial = (correct / total) - (incorrect / total) * 0.5
        partial_score = (correct_selections / total_correct) - (incorrect_selections / total_correct * 0.5)
        partial_score = max(0, partial_score)  # No negative scores

        return question.points * partial_score
```

**Coding Questions**:
```python
def auto_grade_coding(question: AssessmentQuestion, response: AssessmentResponse) -> float:
    total_points = 0

    for test_case in question.test_cases:
        result = execute_code(
            code=response.text_response,
            language=question.coding_language,
            test_case=test_case
        )

        if result.passed:
            total_points += test_case.points

    return total_points
```

### Manual Grading

**Rubric-Based Scoring**:
```python
class GradingRubric:
    criteria: List[RubricCriterion]

class RubricCriterion:
    name: str  # "Code quality", "Correctness", "Efficiency"
    description: str
    max_points: int

def manual_grade_response(
    response: AssessmentResponse,
    rubric: GradingRubric,
    scores: Dict[str, int],
    comments: str
) -> float:
    total_points = sum(scores.values())
    max_points = sum(c.max_points for c in rubric.criteria)

    percentage = (total_points / max_points) * 100
    points_earned = (percentage / 100) * response.max_points

    return points_earned
```

---

## Anti-Cheating Measures

### 1. Tab Switching Detection

```typescript
// Frontend monitoring
window.addEventListener('blur', () => {
  reportActivity('tab_switched');
  showWarning('Tab switching detected. You have 2 warnings remaining.');
});

// Backend tracking
if (attempt.tab_switch_count >= 3) {
  attempt.status = 'disqualified';
  attempt.suspicious_activity.append({
    timestamp: now(),
    event: 'too_many_tab_switches',
    action: 'auto_disqualified'
  });
}
```

### 2. Time Limits

```python
def enforce_time_limit(attempt: AssessmentAttempt, assessment: Assessment):
    if assessment.time_limit_minutes is None:
        return True  # No time limit

    elapsed_minutes = (datetime.now() - attempt.started_at).total_seconds() / 60

    if elapsed_minutes > assessment.time_limit_minutes:
        # Auto-submit
        submit_assessment(attempt.id)
        return False

    return True
```

### 3. Copy-Paste Detection (Frontend)

```typescript
document.addEventListener('paste', (e) => {
  if (isCodeQuestion) {
    reportActivity('code_pasted');
    // Don't block, just log
  }
});
```

### 4. IP Address Tracking

```python
def validate_ip_consistency(attempt: AssessmentAttempt, request_ip: str):
    if attempt.ip_address is None:
        attempt.ip_address = request_ip
    elif attempt.ip_address != request_ip:
        attempt.suspicious_activity.append({
            'timestamp': datetime.now(),
            'event': 'ip_address_changed',
            'old_ip': attempt.ip_address,
            'new_ip': request_ip
        })
```

### 5. Randomization

```python
def get_questions_for_attempt(assessment: Assessment) -> List[AssessmentQuestion]:
    questions = assessment.questions

    if assessment.randomize_questions:
        random.shuffle(questions)

    if assessment.randomize_options:
        for q in questions:
            if q.question_type.startswith('mcq_'):
                random.shuffle(q.options)

    return questions
```

---

## Frontend Components

### Assessment Builder UI

**Page**: `/employer/assessments/new`

**Components**:
1. `<AssessmentBuilderForm>` - Main form
2. `<QuestionTypeSelector>` - Choose question type
3. `<MCQQuestionEditor>` - Edit MCQ with options
4. `<CodingQuestionEditor>` - Code editor with test cases
5. `<TextQuestionEditor>` - Simple text input
6. `<QuestionBankDrawer>` - Import from question bank
7. `<AssessmentSettings>` - Time limit, passing score, anti-cheating
8. `<AssessmentPreview>` - Preview candidate view

### Candidate Assessment UI

**Page**: `/assessments/{access_token}`

**Components**:
1. `<AssessmentIntro>` - Instructions, start button
2. `<AssessmentTimer>` - Countdown timer
3. `<QuestionView>` - Display question based on type
4. `<MCQOptions>` - Radio/checkbox options
5. `<CodeEditor>` - Monaco editor for coding
6. `<FileUploader>` - Drag-and-drop file upload
7. `<NavigationControls>` - Next, previous, submit
8. `<ProgressBar>` - Questions answered / total
9. `<AssessmentResults>` - Show score if allowed

### Grading Interface

**Page**: `/employer/assessments/{id}/attempts/{attempt_id}`

**Components**:
1. `<AttemptOverview>` - Score, time, candidate info
2. `<ResponseList>` - List all responses
3. `<ManualGradingPanel>` - Score input, comments
4. `<CodeReview>` - Syntax-highlighted code review
5. `<RubricGrading>` - Rubric-based scoring UI

---

## Third-Party Integrations

### Option 1: Judge0 API (Recommended - Free Tier)

**Why**: Free tier (50 requests/day), supports 60+ languages

```python
import requests

def execute_with_judge0(code: str, language_id: int, test_input: str) -> dict:
    url = "https://judge0-ce.p.rapidapi.com/submissions"

    payload = {
        "language_id": language_id,
        "source_code": code,
        "stdin": test_input
    }

    headers = {
        "X-RapidAPI-Key": settings.JUDGE0_API_KEY,
        "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com"
    }

    response = requests.post(url, json=payload, headers=headers)
    token = response.json()["token"]

    # Poll for result
    result_url = f"{url}/{token}"
    result = requests.get(result_url, headers=headers)

    return result.json()
```

### Option 2: Piston API (Self-Hosted, Unlimited)

**Why**: Free, self-hosted, unlimited requests

```python
def execute_with_piston(code: str, language: str, test_input: str) -> dict:
    url = "https://emkc.org/api/v2/piston/execute"

    payload = {
        "language": language,
        "version": "*",
        "files": [
            {
                "name": "main.py",
                "content": code
            }
        ],
        "stdin": test_input
    }

    response = requests.post(url, json=payload)
    return response.json()
```

### Option 3: HackerRank CodePair API (Enterprise)

**Why**: Production-grade, anti-cheating, video recording

**Pricing**: $299/month (Professional plan includes 100 CodePair sessions)

**Integration**: Webhook-based, candidate redirected to HackerRank

---

## Implementation Checklist

### Phase 4A: Backend Foundation (Week 1)

**Database**:
- [ ] Create migration for 6 assessment tables
- [ ] Add SQLAlchemy models for all tables
- [ ] Add Pydantic schemas (Create, Update, Response)
- [ ] Create indexes for performance

**Unit Tests** (TDD - Write FIRST):
- [ ] 50+ unit tests for AssessmentService
- [ ] 20+ unit tests for QuestionBankService
- [ ] 15+ unit tests for CodingExecutionService
- [ ] Test auto-grading logic (MCQ, coding)
- [ ] Test anti-cheating detection

### Phase 4B: Service Implementation (Week 1)

**Services**:
- [ ] Implement AssessmentService (15 methods)
- [ ] Implement QuestionBankService (8 methods)
- [ ] Implement CodingExecutionService (4 methods)
- [ ] Integrate Judge0 API for code execution
- [ ] Implement auto-grading algorithms

### Phase 4C: REST API Endpoints (Week 2)

**Endpoints**:
- [ ] Assessment management (8 endpoints)
- [ ] Question management (6 endpoints)
- [ ] Question bank (5 endpoints)
- [ ] Candidate assessment taking (8 endpoints)
- [ ] Grading & review (4 endpoints)
- [ ] Add RBAC permissions (Owner/Admin only)

### Phase 4D: Frontend UI (Week 2)

**Employer UI**:
- [ ] Assessment builder page (`/employer/assessments/new`)
- [ ] Assessment list page (`/employer/assessments`)
- [ ] Question bank library (`/employer/question-bank`)
- [ ] Grading interface (`/employer/assessments/{id}/attempts`)

**Candidate UI**:
- [ ] Assessment taking page (`/assessments/{token}`)
- [ ] Code editor (Monaco)
- [ ] Timer component
- [ ] Results page

### Phase 4E: E2E Tests (Week 2)

**Playwright Tests** (BDD):
- [ ] 25+ test scenarios covering:
  - Assessment creation workflow
  - Question types (MCQ, coding, text, file)
  - Candidate taking assessment
  - Auto-grading
  - Manual grading
  - Anti-cheating detection
  - Time limits

### Phase 4F: Documentation & Deployment

**Documentation**:
- [ ] Update IMPLEMENTATION_PROGRESS.md
- [ ] Create API documentation (OpenAPI/Swagger)
- [ ] Create Phase 4 completion summary

**Testing**:
- [ ] Local testing with Judge0 integration
- [ ] Vercel deployment for E2E testing
- [ ] GitHub Actions for continuous testing

---

## Success Metrics

**Adoption**:
- 50+ assessments created in first month
- 500+ assessment attempts completed
- 70%+ auto-grading rate (reduce manual work)

**Quality**:
- 90%+ of candidates complete assessments
- <2% technical failures (code execution timeouts)
- <5% suspicious activity detected

**Business Impact**:
- 20%+ employers upgrade to Professional plan (for assessments)
- 60% reduction in time-to-first-interview
- 30% improvement in candidate quality (Fit Index correlation)

---

## Appendix

### Language Support (Judge0)

**Supported Languages**:
1. Python (2.7, 3.x)
2. JavaScript (Node.js)
3. Java
4. C++
5. C
6. C#
7. Ruby
8. Go
9. PHP
10. Swift

### Question Bank Categories

1. **Algorithms**: Sorting, searching, graph traversal
2. **Data Structures**: Arrays, linked lists, trees, hash maps
3. **System Design**: Scalability, microservices, databases
4. **Web Development**: HTML/CSS, React, APIs
5. **Databases**: SQL queries, normalization, indexing
6. **DevOps**: Docker, Kubernetes, CI/CD
7. **Soft Skills**: Communication, problem-solving, teamwork

---

**Document Status**: Specification Complete
**Next Step**: Begin Phase 4A - Backend Foundation (TDD)
**Estimated Completion**: 2 weeks (Week 35-36)
