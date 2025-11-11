# Sprint 17-18 Phase 4: Skills Assessment Backend Implementation Plan
## TDD/BDD Approach with MCP Integration

**Date:** November 11, 2025
**Status:** Implementation Plan
**Phase:** Backend API Development
**Frontend Status:** ✅ DEPLOYED to Vercel
**Backend Status:** ❌ NOT STARTED

---

## 📋 Executive Summary

This document outlines the **Test-Driven Development (TDD)** and **Behavior-Driven Development (BDD)** approach for implementing the Skills Assessment Platform backend APIs to connect with the deployed frontend.

### Current State
- ✅ **Frontend**: 7 pages deployed (2,737 LOC) using mock data
- ✅ **Database**: Schema defined in specification
- ✅ **E2E Tests**: 35+ scenarios written (infrastructure proven)
- ❌ **Backend**: Services and APIs not implemented
- ❌ **Integration**: Frontend/backend not connected

### Implementation Scope
**Estimated Effort**: ~900 LOC (Backend Services + APIs)
- Services: ~500 LOC
- API Endpoints: ~300 LOC
- Unit Tests: ~200 LOC
- Integration Tests: ~100 LOC

**Timeline**: 3-5 days

---

## 🎯 Implementation Strategy

### Phase 1: Database Setup (Day 1, ~2 hours)
**TDD Approach**: Schema-first development

1. **Create Migration** (`backend/alembic/versions/`)
   ```bash
   cd backend
   source venv/bin/activate
   alembic revision -m "sprint_17_18_phase_4_skills_assessment"
   ```

2. **Tables to Create**:
   - `assessments` (21 columns)
   - `assessment_questions` (15 columns)
   - `assessment_attempts` (18 columns)
   - `assessment_answers` (11 columns)
   - `question_bank` (14 columns)

3. **Test Migration**:
   ```bash
   alembic upgrade head
   alembic downgrade -1
   alembic upgrade head
   ```

### Phase 2: SQLAlchemy Models (Day 1, ~2 hours)
**TDD Approach**: Model-first with validation

1. **Create Models** (`backend/app/db/models/assessment.py`)
   - `Assessment` model with relationships
   - `AssessmentQuestion` model
   - `AssessmentAttempt` model
   - `AssessmentAnswer` model
   - `QuestionBank` model

2. **Write Model Tests** (`backend/tests/unit/test_assessment_models.py`)
   ```python
   def test_assessment_creation():
       """Test creating assessment with valid data"""

   def test_assessment_validation():
       """Test assessment field validation"""

   def test_assessment_relationships():
       """Test relationships with questions and attempts"""
   ```

3. **Run Tests**: `pytest tests/unit/test_assessment_models.py -v`

### Phase 3: Pydantic Schemas (Day 1, ~3 hours)
**TDD Approach**: Contract-first API design

1. **Create Schemas** (`backend/app/schemas/assessment.py`)
   ```python
   # Request schemas
   class AssessmentCreate(BaseModel):
       title: str
       description: Optional[str]
       assessment_type: str
       # ... all fields with validation

   class QuestionCreate(BaseModel):
       question_text: str
       question_type: str
       # ... question-specific fields

   class AssessmentAttemptStart(BaseModel):
       candidate_id: UUID

   class AssessmentAnswerSubmit(BaseModel):
       question_id: UUID
       answer: Union[str, List[str], Dict]

   # Response schemas
   class AssessmentResponse(BaseModel):
       id: UUID
       title: str
       # ... all fields
       questions: List[QuestionResponse]
       stats: AssessmentStats

   class AttemptResponse(BaseModel):
       id: UUID
       score: Optional[Decimal]
       status: str
       # ... all fields
   ```

2. **Write Schema Tests** (`backend/tests/unit/test_assessment_schemas.py`)
   ```python
   def test_assessment_create_validation():
       """Test assessment creation schema validation"""

   def test_question_type_validation():
       """Test different question types validate correctly"""

   def test_answer_format_validation():
       """Test answer submission formats"""
   ```

3. **Run Tests**: `pytest tests/unit/test_assessment_schemas.py -v`

### Phase 4: Service Layer (Day 2, ~6 hours)
**TDD Approach**: Write tests BEFORE implementation

#### 4.1 Assessment Service

**Test File**: `backend/tests/unit/test_assessment_service.py`

```python
import pytest
from unittest.mock import Mock, patch
from app.services.assessment_service import AssessmentService

class TestAssessmentService:
    """BDD-style tests for Assessment Service"""

    def test_create_assessment_with_questions(self, db_session):
        """
        GIVEN: Valid assessment data with 5 questions
        WHEN: create_assessment() is called
        THEN: Assessment is created with all questions
        AND: Returns assessment with generated IDs
        """

    def test_create_assessment_without_company_permission(self, db_session):
        """
        GIVEN: User without company owner/admin role
        WHEN: create_assessment() is called
        THEN: Raises PermissionError
        """

    def test_get_assessment_with_questions(self, db_session):
        """
        GIVEN: Existing assessment ID
        WHEN: get_assessment() is called
        THEN: Returns assessment with all questions loaded
        AND: Questions are in display_order
        """

    def test_update_assessment_metadata(self, db_session):
        """
        GIVEN: Existing assessment and updated data
        WHEN: update_assessment() is called
        THEN: Metadata is updated
        AND: Questions remain unchanged
        """

    def test_add_question_to_assessment(self, db_session):
        """
        GIVEN: Existing assessment
        WHEN: add_question() is called
        THEN: Question is added with next display_order
        """

    def test_delete_question_reorders_remaining(self, db_session):
        """
        GIVEN: Assessment with 5 questions
        WHEN: delete_question() removes question 3
        THEN: Questions 4,5 are renumbered to 3,4
        """

    def test_archive_assessment_with_active_attempts(self, db_session):
        """
        GIVEN: Assessment with in-progress attempts
        WHEN: archive_assessment() is called
        THEN: Raises ValidationError (cannot archive with active attempts)
        """
```

**Service Implementation**: `backend/app/services/assessment_service.py`

```python
from typing import List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from app.db.models.assessment import Assessment, AssessmentQuestion
from app.schemas.assessment import AssessmentCreate, QuestionCreate

class AssessmentService:
    """Service for managing assessments and questions"""

    def __init__(self, db: Session):
        self.db = db

    def create_assessment(
        self,
        company_id: UUID,
        user_id: UUID,
        data: AssessmentCreate
    ) -> Assessment:
        """Create new assessment with questions"""
        # Implementation after tests are written

    def get_assessment(
        self,
        assessment_id: UUID,
        company_id: UUID
    ) -> Optional[Assessment]:
        """Get assessment by ID with all questions"""
        # Implementation after tests are written

    def update_assessment(
        self,
        assessment_id: UUID,
        company_id: UUID,
        data: AssessmentUpdate
    ) -> Assessment:
        """Update assessment metadata"""
        # Implementation after tests are written

    def add_question(
        self,
        assessment_id: UUID,
        company_id: UUID,
        data: QuestionCreate
    ) -> AssessmentQuestion:
        """Add question to assessment"""
        # Implementation after tests are written

    def delete_question(
        self,
        question_id: UUID,
        company_id: UUID
    ) -> None:
        """Delete question and reorder remaining"""
        # Implementation after tests are written

    def archive_assessment(
        self,
        assessment_id: UUID,
        company_id: UUID
    ) -> Assessment:
        """Archive assessment (soft delete)"""
        # Implementation after tests are written
```

#### 4.2 Question Bank Service

**Test File**: `backend/tests/unit/test_question_bank_service.py`

```python
class TestQuestionBankService:
    """BDD-style tests for Question Bank Service"""

    def test_create_public_question(self, db_session):
        """
        GIVEN: Valid question data with is_public=True
        WHEN: create_question() is called
        THEN: Question is created and visible to all companies
        """

    def test_create_private_question(self, db_session):
        """
        GIVEN: Valid question data with is_public=False
        WHEN: create_question() is called
        THEN: Question is created and visible only to company
        """

    def test_search_questions_by_type(self, db_session):
        """
        GIVEN: Question bank with multiple types
        WHEN: search_questions(type="coding") is called
        THEN: Returns only coding questions
        """

    def test_duplicate_question_from_bank(self, db_session):
        """
        GIVEN: Public question in bank
        WHEN: duplicate_to_assessment() is called
        THEN: Creates copy in target assessment
        AND: Original question unchanged
        """
```

**Service Implementation**: `backend/app/services/question_bank_service.py`

#### 4.3 Coding Execution Service

**Test File**: `backend/tests/unit/test_coding_execution_service.py`

```python
class TestCodingExecutionService:
    """BDD-style tests for code execution"""

    def test_execute_python_code_with_test_cases(self):
        """
        GIVEN: Python code and 3 test cases
        WHEN: execute_code() is called
        THEN: Runs code in sandbox
        AND: Returns pass/fail for each test case
        """

    def test_execute_code_with_timeout(self):
        """
        GIVEN: Infinite loop code
        WHEN: execute_code() is called with timeout=5s
        THEN: Execution is terminated after 5s
        AND: Returns timeout error
        """

    def test_execute_unsafe_code_is_blocked(self):
        """
        GIVEN: Code with os.system() call
        WHEN: execute_code() is called
        THEN: Raises SecurityError
        AND: Code is not executed
        """
```

**Service Implementation**: `backend/app/services/coding_execution_service.py`

### Phase 5: API Endpoints (Day 3, ~6 hours)
**TDD Approach**: Integration tests before implementation

#### 5.1 Assessment CRUD Endpoints

**Test File**: `backend/tests/integration/test_assessment_endpoints.py`

```python
import pytest
from fastapi.testclient import TestClient

class TestAssessmentEndpoints:
    """Integration tests for Assessment APIs"""

    def test_create_assessment_success(self, client: TestClient, auth_headers):
        """
        GIVEN: Authenticated employer
        WHEN: POST /api/v1/employer/assessments
        THEN: Returns 201 with assessment data
        AND: Assessment is in database
        """
        response = client.post(
            "/api/v1/employer/assessments",
            json={
                "title": "Senior Backend Engineer Assessment",
                "assessment_type": "technical",
                "time_limit_minutes": 60,
                "passing_score_percentage": 70.0,
                "questions": [...]
            },
            headers=auth_headers
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Senior Backend Engineer Assessment"
        assert len(data["questions"]) == 5

    def test_get_assessments_list(self, client: TestClient, auth_headers):
        """
        GIVEN: Company with 5 assessments
        WHEN: GET /api/v1/employer/assessments
        THEN: Returns 200 with list of assessments
        AND: Includes pagination metadata
        """

    def test_get_assessment_by_id(self, client: TestClient, auth_headers):
        """
        GIVEN: Existing assessment ID
        WHEN: GET /api/v1/employer/assessments/{id}
        THEN: Returns 200 with full assessment details
        AND: Includes all questions
        """

    def test_update_assessment(self, client: TestClient, auth_headers):
        """
        GIVEN: Existing assessment
        WHEN: PUT /api/v1/employer/assessments/{id}
        THEN: Returns 200 with updated assessment
        """

    def test_delete_assessment(self, client: TestClient, auth_headers):
        """
        GIVEN: Assessment with no attempts
        WHEN: DELETE /api/v1/employer/assessments/{id}
        THEN: Returns 204
        AND: Assessment is archived (soft delete)
        """

    def test_add_question_to_assessment(self, client: TestClient, auth_headers):
        """
        GIVEN: Existing assessment
        WHEN: POST /api/v1/employer/assessments/{id}/questions
        THEN: Returns 201 with question data
        AND: Question is added to assessment
        """
```

**API Implementation**: `backend/app/api/v1/endpoints/assessments.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, get_db
from app.schemas.assessment import AssessmentCreate, AssessmentResponse
from app.services.assessment_service import AssessmentService

router = APIRouter()

@router.post("/", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assessment(
    data: AssessmentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create new assessment"""
    service = AssessmentService(db)
    assessment = service.create_assessment(
        company_id=current_user.company_id,
        user_id=current_user.id,
        data=data
    )
    return assessment

@router.get("/", response_model=List[AssessmentResponse])
async def list_assessments(
    skip: int = 0,
    limit: int = 20,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List company assessments"""
    service = AssessmentService(db)
    assessments = service.list_assessments(
        company_id=current_user.company_id,
        skip=skip,
        limit=limit,
        status=status
    )
    return assessments

@router.get("/{assessment_id}", response_model=AssessmentResponse)
async def get_assessment(
    assessment_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get assessment by ID"""
    service = AssessmentService(db)
    assessment = service.get_assessment(
        assessment_id=assessment_id,
        company_id=current_user.company_id
    )
    if not assessment:
        raise HTTPException(status_code=404, detail="Assessment not found")
    return assessment

# ... more endpoints
```

### Phase 6: Integration with Frontend (Day 4, ~4 hours)

1. **Update Frontend API Client** (`frontend/lib/api.ts`)
   ```typescript
   // Replace mock data with real API calls
   export const assessmentApi = {
     createAssessment: async (data: AssessmentCreate) => {
       const response = await fetch('/api/v1/employer/assessments', {
         method: 'POST',
         headers: getAuthHeaders(),
         body: JSON.stringify(data)
       });
       return response.json();
     },

     getAssessments: async () => {
       const response = await fetch('/api/v1/employer/assessments', {
         headers: getAuthHeaders()
       });
       return response.json();
     },

     // ... more methods
   };
   ```

2. **Update Frontend Components**
   - Remove mock data imports
   - Add error handling
   - Add loading states
   - Test with real API

3. **Update E2E Tests**
   - Point to real backend
   - Remove API mocking
   - Add API response validation

### Phase 7: E2E Testing (Day 5, ~4 hours)

1. **Fix E2E Test Selectors** (33 tests)
   ```typescript
   // OLD (doesn't work with shadcn):
   await page.selectOption('[data-testid="type"]', 'technical');

   // NEW (works with shadcn):
   await page.click('[data-testid="type"]');
   await page.click('text=Technical');
   ```

2. **Run Full E2E Suite**
   ```bash
   cd frontend
   PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test
   ```

3. **Setup MCP Playwright**
   - Configure continuous testing
   - Set up test reports
   - Add to CI/CD pipeline

4. **Setup MCP GitHub**
   - Configure GitHub Actions
   - Add status checks
   - Set up auto-deployment

---

## 🧪 Testing Strategy

### Unit Tests (pytest)
```bash
# Run all unit tests
pytest tests/unit/ -v

# Run specific test file
pytest tests/unit/test_assessment_service.py -v

# Run with coverage
pytest tests/unit/ --cov=app/services --cov-report=html
```

### Integration Tests (pytest + TestClient)
```bash
# Run all integration tests
pytest tests/integration/ -v

# Run API endpoint tests
pytest tests/integration/test_assessment_endpoints.py -v
```

### E2E Tests (Playwright)
```bash
# Run E2E tests locally
cd frontend
npx playwright test

# Run in UI mode
npx playwright test --ui

# Run specific test file
npx playwright test tests/e2e/assessment-features.spec.ts
```

---

## 📊 Success Criteria

### Backend Implementation
- [ ] All database migrations pass
- [ ] All models have relationships configured
- [ ] All Pydantic schemas validate correctly
- [ ] 100% unit test coverage for services
- [ ] All API endpoints return correct status codes
- [ ] Integration tests pass

### Frontend Integration
- [ ] All pages fetch real data from backend
- [ ] Authentication works end-to-end
- [ ] CRUD operations work (create, read, update, delete)
- [ ] Error handling displays user-friendly messages
- [ ] Loading states work correctly

### E2E Testing
- [ ] 80%+ E2E test pass rate (target: 28/35 tests)
- [ ] All critical paths tested
- [ ] MCP Playwright configured
- [ ] MCP GitHub configured
- [ ] CI/CD pipeline operational

### Deployment
- [ ] Backend deployed and accessible
- [ ] Frontend connected to backend
- [ ] Zero console errors
- [ ] All pages return HTTP 200
- [ ] Vercel deployment successful

---

## 📝 Implementation Checklist

### Day 1: Database & Models
- [ ] Create Alembic migration
- [ ] Define SQLAlchemy models
- [ ] Write Pydantic schemas
- [ ] Write model tests
- [ ] Run and pass all tests

### Day 2: Services (TDD)
- [ ] Write AssessmentService tests
- [ ] Implement AssessmentService
- [ ] Write QuestionBankService tests
- [ ] Implement QuestionBankService
- [ ] Write CodingExecutionService tests
- [ ] Implement CodingExecutionService
- [ ] All tests pass

### Day 3: API Endpoints
- [ ] Write integration tests
- [ ] Implement assessment CRUD endpoints
- [ ] Implement question management endpoints
- [ ] Implement attempt/grading endpoints
- [ ] Add to router
- [ ] All tests pass

### Day 4: Frontend Integration
- [ ] Update API client
- [ ] Remove mock data
- [ ] Test all pages with real API
- [ ] Add error handling
- [ ] Add loading states
- [ ] Manual QA

### Day 5: E2E & Deployment
- [ ] Fix E2E test selectors
- [ ] Run full E2E suite
- [ ] Setup MCP Playwright
- [ ] Setup MCP GitHub
- [ ] Deploy backend
- [ ] Deploy frontend
- [ ] Verify end-to-end

---

## 🚀 Next Steps

**Immediate Action**: Start with Day 1 tasks
1. Create database migration
2. Define SQLAlchemy models
3. Write Pydantic schemas
4. Write and run tests

**Commands to Run**:
```bash
# Navigate to backend
cd /Users/kiranreddyghanta/Developer/HireFlux/backend

# Activate virtual environment
source venv/bin/activate

# Create migration
alembic revision -m "sprint_17_18_phase_4_skills_assessment"

# Edit migration file, then run
alembic upgrade head

# Run tests
pytest tests/unit/ -v
```

---

**Status**: ✅ **PLAN APPROVED - READY FOR IMPLEMENTATION**

**Timeline**: 3-5 days

**Next Action**: Create database migration

---

*Implementation plan created: November 11, 2025*
*Sprint: 17-18 Phase 4 Backend*
*Methodology: TDD/BDD with MCP Integration*
*Team: HireFlux Development*
