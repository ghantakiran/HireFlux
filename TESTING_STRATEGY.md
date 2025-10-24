# HireFlux Testing Strategy

## Overview
Comprehensive testing strategy for HireFlux covering unit tests, integration tests, BDD scenarios, and end-to-end UX testing with Playwright.

## Testing Pyramid

```
           /\
          /E2E\          10% - End-to-End (Playwright)
         /------\
        /  API  \        30% - Integration Tests
       /----------\
      /   Unit     \     60% - Unit Tests
     /--------------\
```

## Test Categories

### 1. BDD Scenarios (Behavior-Driven Development) ✅

**Location**: `backend/tests/features/`

**Completed Features**:
- ✅ `ai_resume_generation.feature` - 20+ scenarios
- ✅ `cover_letter_generation.feature` - 28 scenarios
- ✅ `stripe_billing.feature` - 40+ scenarios
- ✅ `job_matching.feature` - 40+ scenarios
- ✅ `job_feed_integration.feature` - 50+ scenarios

**Total**: 180+ BDD scenarios covering all major features

**Tools**:
- Gherkin syntax for readability
- pytest-bdd for execution (when implemented)

**Benefits**:
- Living documentation
- Stakeholder-readable tests
- Behavior-focused validation

### 2. Unit Tests

**Location**: `backend/tests/unit/`

**Completed**:
- ✅ `test_ai_generation_service.py`
- ✅ `test_openai_service.py`

**To Be Implemented**:
- Service layer tests
  * `test_stripe_service.py`
  * `test_credit_service.py`
  * `test_pinecone_service.py`
  * `test_job_matching_service.py`
  * `test_greenhouse_service.py`
  * `test_lever_service.py`

- Utility tests
  * `test_validators.py`
  * `test_parsers.py`
  * `test_helpers.py`

**Coverage Target**: 80%

**Tools**:
- pytest
- pytest-cov for coverage reports
- pytest-mock for mocking

**Example**:
```python
def test_deduct_credits():
    service = CreditService(mock_db)
    result = service.deduct_credits(
        user_id=user_id,
        credit_type="ai",
        amount=10,
        description="Resume generation"
    )
    assert result == True
    assert mock_db.query.called
```

### 3. Integration Tests

**Location**: `backend/tests/integration/`

**Scope**: Test interactions between components

**Test Areas**:
- **API Endpoints**: Full request/response cycle
  * Authentication flow
  * Resume upload and generation
  * Cover letter creation
  * Job search and matching
  * Billing operations

- **Database Operations**:
  * Model relationships
  * Transaction integrity
  * Migration testing

- **External Services**:
  * OpenAI API integration
  * Stripe webhooks
  * Pinecone vector operations
  * Job board API calls

**Tools**:
- pytest with FastAPI TestClient
- Factory Boy for test data
- Docker for service dependencies

**Example**:
```python
def test_create_subscription_endpoint(client, auth_headers):
    response = client.post(
        "/api/v1/billing/subscriptions/create",
        json={
            "plan": "plus",
            "billing_interval": "month",
            "success_url": "http://app.com/success",
            "cancel_url": "http://app.com/cancel"
        },
        headers=auth_headers
    )
    assert response.status_code == 200
    assert "session_id" in response.json()
```

### 4. End-to-End Tests (Playwright) 📋

**Location**: `backend/tests/e2e/`

**Documentation**: See `tests/e2e/README.md`

**Test Suites**:

1. **Authentication & Onboarding**
   - User registration
   - Login (email/password, OAuth)
   - Onboarding wizard
   - Profile setup

2. **Resume Management**
   - Upload (PDF, DOCX)
   - Parsing verification
   - AI generation (multiple tones)
   - Version management
   - Download

3. **Cover Letter Generation**
   - Job-specific creation
   - Tone customization
   - Multi-variation generation
   - Preview and edit

4. **Job Matching**
   - Search with filters
   - Fit Index display
   - Match rationale
   - Application tracking

5. **Billing & Subscriptions**
   - Stripe checkout
   - Plan upgrades/downgrades
   - Credit management
   - Subscription cancellation

6. **Full User Journey**
   - Register → Upload Resume → Search Jobs → Generate Cover Letter → Apply
   - Performance benchmarks
   - Cross-feature integration

**Tools**:
- Playwright (TypeScript/Python)
- Page Object Model
- Visual regression testing
- Performance profiling

**Key Metrics**:
- Page load < 2 seconds
- Resume generation < 6 seconds
- API response < 300ms (p95)
- Accessibility: WCAG 2.1 AA

### 5. Performance Tests

**Tools**:
- Locust or k6 for load testing
- Playwright for frontend performance

**Scenarios**:
- 100 concurrent users
- 1000 requests/minute
- Database query optimization
- API rate limiting validation

**Benchmarks**:
- p95 API response < 300ms
- p95 page TTFB < 300ms
- p95 AI generation < 6s
- Database queries < 100ms

### 6. Security Tests

**Areas**:
- Input validation
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- Authentication/Authorization

**Tools**:
- OWASP ZAP
- Bandit (Python security linter)
- Safety (dependency vulnerability check)

### 7. Accessibility Tests

**Standard**: WCAG 2.1 AA

**Tools**:
- axe-core
- Lighthouse
- Playwright accessibility checks

**Requirements**:
- Keyboard navigation
- Screen reader compatibility
- Color contrast ratios
- ARIA labels
- Focus management

## Test Data Management

### Fixtures
**Location**: `backend/tests/fixtures/`

**Files**:
- `sample-resume.pdf`
- `sample-resume.docx`
- `job-descriptions.json`
- `user-profiles.json`
- `mock-stripe-events.json`

### Factories
```python
# factories.py
import factory
from app.db.models import User, Resume

class UserFactory(factory.Factory):
    class Meta:
        model = User

    email = factory.Faker('email')
    full_name = factory.Faker('name')

class ResumeFactory(factory.Factory):
    class Meta:
        model = Resume

    user_id = factory.SubFactory(UserFactory)
    title = "Software Engineer"
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.12'
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install pytest pytest-cov
      - name: Run unit tests
        run: pytest tests/unit/ --cov=app --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v3

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v3
      - name: Run integration tests
        run: pytest tests/integration/

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Playwright
        run: |
          npm ci
          npx playwright install --with-deps
      - name: Start backend
        run: |
          cd backend
          python -m venv venv
          source venv/bin/activate
          pip install -r requirements.txt
          uvicorn app.main:app --host 0.0.0.0 --port 8000 &
      - name: Start frontend
        run: |
          cd frontend
          npm install
          npm run build
          npm run start &
      - name: Run E2E tests
        run: npx playwright test
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Execution

### Local Development
```bash
# Unit tests
pytest tests/unit/ -v

# Integration tests
pytest tests/integration/ -v

# Specific test file
pytest tests/unit/test_stripe_service.py -v

# With coverage
pytest --cov=app --cov-report=html

# E2E tests
npx playwright test

# E2E in headed mode
npx playwright test --headed

# E2E specific suite
npx playwright test specs/auth.spec.ts
```

### Pre-commit Hook
```bash
#!/bin/bash
# .git/hooks/pre-commit

# Run linter
flake8 app/
black app/ --check

# Run unit tests
pytest tests/unit/ -q

# Exit on failure
if [ $? -ne 0 ]; then
    echo "Tests failed. Commit aborted."
    exit 1
fi
```

## Coverage Reports

**Target**: 80% code coverage

**Tools**:
- pytest-cov
- Codecov.io for tracking

**Command**:
```bash
pytest --cov=app --cov-report=html --cov-report=term
open htmlcov/index.html
```

## Test Maintenance

### Regular Tasks
- [ ] Review and update BDD scenarios monthly
- [ ] Add tests for new features (TDD approach)
- [ ] Update test data fixtures
- [ ] Review flaky tests
- [ ] Update Playwright browser versions
- [ ] Monitor test execution times
- [ ] Refactor slow tests

### Quality Gates
- ✅ All tests must pass before merge
- ✅ Code coverage must not decrease
- ✅ E2E tests run on staging before production
- ✅ Performance benchmarks met
- ✅ No accessibility violations

## Monitoring & Reporting

### Metrics to Track
- Test execution time
- Test failure rate
- Code coverage percentage
- Flaky test count
- API response times
- Page load times
- Error rates

### Reporting Tools
- Pytest HTML reports
- Playwright reports
- Codecov dashboards
- GitHub Actions summaries

## Best Practices

1. **Write Tests First** (TDD)
   - Write BDD scenario
   - Write failing test
   - Implement feature
   - Verify test passes

2. **Test Isolation**
   - Each test is independent
   - No shared state
   - Clean up after tests

3. **Meaningful Assertions**
   - Test behavior, not implementation
   - Clear error messages
   - Single responsibility per test

4. **DRY Principle**
   - Reusable fixtures
   - Helper functions
   - Page Object Models for E2E

5. **Performance**
   - Parallel test execution
   - Optimize slow tests
   - Use test markers

6. **Documentation**
   - Self-documenting test names
   - Comments for complex logic
   - Keep README updated

## Resources

- [Pytest Documentation](https://docs.pytest.org)
- [Playwright Documentation](https://playwright.dev)
- [BDD with Pytest](https://pytest-bdd.readthedocs.io)
- [Testing Best Practices](https://testingjavascript.com/)

## Next Steps

1. ✅ Complete BDD scenarios (Done - 180+ scenarios)
2. ⏳ Implement unit tests for all services
3. ⏳ Create integration tests for API endpoints
4. ⏳ Set up Playwright E2E test suite
5. ⏳ Configure CI/CD pipeline
6. ⏳ Set up coverage tracking
7. ⏳ Implement performance tests
8. ⏳ Add accessibility tests
9. ⏳ Create test data management system
10. ⏳ Set up monitoring and reporting

---

**Last Updated**: 2025-10-24
**Coverage Target**: 80%
**BDD Scenarios**: 180+
**Test Pyramid**: 60% Unit / 30% Integration / 10% E2E
