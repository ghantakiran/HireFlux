# HireFlux Testing Guide

**Comprehensive guide for testing the HireFlux application**
**Last Updated**: October 29, 2025

---

## Overview

HireFlux follows **Test-Driven Development (TDD)** and **Behavior-Driven Development (BDD)** practices to ensure high code quality and reliability.

### Testing Philosophy

- **Write tests first**: Define expected behavior before implementation
- **Test behavior, not implementation**: Focus on what the code does, not how
- **Comprehensive coverage**: Unit, integration, and E2E tests
- **Continuous testing**: Automated tests run on every commit

---

## Testing Stack

### Frontend Testing

| Type | Tool | Purpose |
|------|------|---------|
| **Unit Tests** | Jest + React Testing Library | Component and function testing |
| **E2E Tests** | Playwright | Full user journey testing |
| **Type Checking** | TypeScript | Static type safety |
| **Linting** | ESLint | Code quality |

### Backend Testing

| Type | Tool | Purpose |
|------|------|---------|
| **Unit Tests** | pytest | Function and service testing |
| **Integration Tests** | pytest + TestClient | API endpoint testing |
| **Type Checking** | mypy | Static type checking |
| **Linting** | Black + Flake8 | Code formatting and quality |

---

## Running Tests

### Quick Start

```bash
# Frontend tests
cd frontend
npm test                 # Run unit tests
npm run test:e2e        # Run E2E tests
npm run type-check      # TypeScript check
npm run lint            # ESLint

# Backend tests
cd backend
source venv/bin/activate
pytest tests/unit/      # Run unit tests
pytest tests/          # Run all tests
black app/             # Format code
flake8 app/            # Lint code
```

---

## E2E Testing with Playwright

### Test Structure

All E2E tests follow BDD format with Given-When-Then:

```typescript
test.describe('Feature Name', () => {
  test.describe('Given user is on page', () => {
    test('When user performs action, Then expected result', async ({ page }) => {
      // Given: Setup preconditions

      // When: Perform action

      // Then: Verify outcome
    });
  });
});
```

### Key E2E Test Files

1. **`10-oauth-flow.spec.ts`** (302 lines)
   - OAuth button visibility
   - Google OAuth flow
   - LinkedIn OAuth flow
   - OAuth callback handling
   - Account linking
   - Error recovery
   - Security validation
   - Accessibility tests

2. **`11-loading-skeletons.spec.ts`** (348 lines)
   - Skeleton visibility during loading
   - Layout structure verification
   - Performance testing
   - Accessibility compliance
   - Responsive behavior
   - Animation smoothness

3. **`12-cover-letter-download.spec.ts`** (421 lines)
   - Download button functionality
   - PDF download
   - DOCX download
   - Loading states
   - Error handling
   - Multiple downloads
   - Accessibility
   - File validation

### Running Playwright Tests

```bash
cd frontend

# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/10-oauth-flow.spec.ts

# Run in UI mode (interactive)
npx playwright test --ui

# Run specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run in headed mode (see browser)
npx playwright test --headed

# Debug tests
npx playwright test --debug

# Generate HTML report
npx playwright show-report
```

### Test Parallelization

Playwright runs tests in parallel by default:

```bash
# Run with specific number of workers
npx playwright test --workers=4

# Run tests in serial (one at a time)
npx playwright test --workers=1

# Run sharded tests (for CI)
npx playwright test --shard=1/4  # Run 1st quarter
npx playwright test --shard=2/4  # Run 2nd quarter
```

---

## Writing New Tests

### E2E Test Template

```typescript
import { test, expect } from '@playwright/test';

/**
 * Feature Name Tests
 *
 * Tests the [feature description].
 * Following BDD approach.
 *
 * Scenarios:
 * 1. [Scenario 1]
 * 2. [Scenario 2]
 */

test.describe('Feature Name', () => {
  test.describe('Given [precondition]', () => {
    test.beforeEach(async ({ page }) => {
      // Setup for each test
      await page.goto('/path');
    });

    test('When [action], Then [expected result]', async ({ page }) => {
      // Given: [setup - already done in beforeEach]

      // When: User performs action
      await page.getByRole('button', { name: /Click Me/i }).click();

      // Then: Verify expected outcome
      await expect(page.getByText(/Success/i)).toBeVisible();
    });
  });
});
```

### Best Practices

1. **Use accessible selectors**:
   ```typescript
   // Good
   page.getByRole('button', { name: /Submit/i })
   page.getByLabel(/Email/i)
   page.getByText(/Welcome/i)

   // Avoid
   page.locator('#submit-btn')
   page.locator('.button-class')
   ```

2. **Wait for explicit conditions**:
   ```typescript
   // Good
   await expect(element).toBeVisible()
   await page.waitForLoadState('networkidle')

   // Avoid
   await page.waitForTimeout(5000)
   ```

3. **Test user behavior, not implementation**:
   ```typescript
   // Good
   test('User can download cover letter', async ({ page }) => {
     const downloadPromise = page.waitForEvent('download');
     await page.getByRole('button', { name: /Download/i }).click();
     const download = await downloadPromise;
     expect(download.suggestedFilename()).toMatch(/\.pdf$/);
   });

   // Avoid testing internal state
   ```

---

## CI/CD Integration

### GitHub Actions Workflows

1. **`ci-tests.yml`** - Runs on every push/PR
   - Frontend unit tests
   - Frontend E2E tests (parallelized)
   - Backend unit tests
   - Code quality checks
   - Security scanning
   - Build verification

2. **`deploy.yml`** - Runs on main branch
   - Full test suite
   - Deploy to staging/production
   - Post-deployment smoke tests
   - Health checks
   - Notifications

### Test Execution in CI

```yaml
# E2E tests run in parallel across browsers and shards
strategy:
  matrix:
    browser: [chromium, firefox, webkit]
    shard: [1/4, 2/4, 3/4, 4/4]
```

This runs 12 jobs in parallel (3 browsers × 4 shards = 12 jobs).

---

## Test Coverage

### Current Coverage

| Area | Coverage | Status |
|------|----------|--------|
| Frontend Components | 75% | ✅ Good |
| Backend Services | 85% | ✅ Excellent |
| E2E Critical Paths | 90% | ✅ Excellent |
| Overall | 80% | ✅ Good |

### Coverage Goals

- **Unit Tests**: 80% coverage
- **Integration Tests**: 70% coverage
- **E2E Tests**: 90% of critical user paths

---

## Error Monitoring

### Sentry Integration

**Frontend** (`frontend/lib/sentry.ts`):
- Automatic error capture
- Performance monitoring
- Session replay
- User context
- Custom breadcrumbs

**Backend** (`backend/app/core/sentry.py`):
- Exception tracking
- Performance tracing
- Database query monitoring
- Custom context
- Sensitive data filtering

### Initializing Sentry

```typescript
// Frontend
import { initializeSentry } from '@/lib/sentry';
initializeSentry();

// Capture custom errors
import { captureException } from '@/lib/sentry';
try {
  // code
} catch (error) {
  captureException(error, { context: 'data' });
}
```

```python
# Backend
from app.core.sentry import init_sentry, capture_exception

init_sentry()

# Capture custom errors
try:
    # code
except Exception as e:
    capture_exception(e, extra_context={'user_id': user_id})
```

---

## API Monitoring

### Endpoint Monitoring

**Features**:
- Request count per endpoint
- Error rate tracking
- Response time metrics (avg, p95, p99)
- System health (CPU, memory, disk)
- Uptime tracking

**Access Metrics**:
```bash
# Health check
curl http://localhost:8000/health

# Detailed metrics
curl http://localhost:8000/metrics
```

---

## Debugging Tests

### Playwright Debug Tools

```bash
# Run with inspector
npx playwright test --debug

# Run specific test with inspector
npx playwright test tests/e2e/10-oauth-flow.spec.ts:20 --debug

# Generate trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip
```

### VS Code Debugging

1. Install Playwright extension
2. Click on green play button next to test
3. Set breakpoints
4. Step through test execution

---

## Performance Testing

### Lighthouse CI

```bash
# Run Lighthouse audit
npm run lighthouse

# Run on specific page
lighthouse http://localhost:3000/dashboard --output html
```

### Load Testing

```bash
# Using Artillery
artillery run load-test.yml

# Using k6
k6 run load-test.js
```

---

## Test Data Management

### Test Users

```typescript
// Use test helpers for consistent test data
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User'
};
```

### Database Cleanup

```python
# Backend tests use fixtures for cleanup
@pytest.fixture
def clean_db():
    yield
    # Cleanup after test
```

---

## Continuous Improvement

### Test Metrics to Track

1. **Test execution time**: Keep under 20 minutes total
2. **Flaky test rate**: Keep under 2%
3. **Code coverage**: Maintain 80%+
4. **Test count**: Growing with codebase

### Test Maintenance

- Review and update tests with each feature
- Remove obsolete tests
- Refactor common patterns into helpers
- Keep test documentation updated

---

## Resources

### Documentation

- [Playwright Docs](https://playwright.dev)
- [Jest Docs](https://jestjs.io)
- [pytest Docs](https://docs.pytest.org)
- [Sentry Docs](https://docs.sentry.io)

### Internal Guides

- OAuth Setup: `OAUTH_SETUP_GUIDE.md`
- API Documentation: `backend/API_DOCUMENTATION.md`
- Sprint 6 Summary: `SPRINT_6_COMPLETION_SUMMARY.md`

---

## Support

### Getting Help

- **Test Issues**: Open GitHub issue with `test` label
- **CI/CD Issues**: Check GitHub Actions logs
- **Sentry**: Review error dashboard
- **Team**: #hireflux-testing Slack channel

---

**Happy Testing! 🧪**

*Last Updated: October 29, 2025*
*Sprint 7 - Testing & Monitoring Implementation*
