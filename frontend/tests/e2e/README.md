# End-to-End (E2E) Testing Guide

Comprehensive guide for writing and running E2E tests for HireFlux using Playwright.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Project Structure](#project-structure)
- [Best Practices](#best-practices)
- [CI/CD Integration](#cicd-integration)
- [Troubleshooting](#troubleshooting)

## Overview

HireFlux uses **Playwright** for end-to-end testing. Playwright provides:

- ✅ **Cross-browser testing** (Chromium, Firefox, WebKit)
- ✅ **Automatic waiting** for elements
- ✅ **Network interception** for API mocking
- ✅ **Screenshot and video recording** on failures
- ✅ **Parallel test execution**
- ✅ **Visual regression testing**

### Test Coverage

Current E2E test suites:

1. **Authentication** (01-authentication.spec.ts) - Sign in/up, OAuth, password reset
2. **Onboarding** (02-onboarding.spec.ts) - User profile setup
3. **Resume Generation** (03-resume-generation.spec.ts) - Upload, parse, generate
4. **Job Matching** (04-job-matching.spec.ts) - Search, filters, fit index
5. **Cover Letters** (05-cover-letter.spec.ts) - AI generation, customization
6. **Interview Buddy** (06-interview-buddy.spec.ts) - Mock interviews, feedback
7. **Notifications** (07-notifications.spec.ts) - In-app, email, preferences
8. **Auto Apply** (08-auto-apply.spec.ts) - Job application automation
9. **Dashboard & Analytics** (09-dashboard-analytics.spec.ts) - Metrics, insights

## Prerequisites

### Required Software

- **Node.js** >= 18.x
- **npm** >= 9.x
- **Python** >= 3.12 (for backend)
- **PostgreSQL** >= 15
- **Redis** >= 7

### Installation

```bash
# Install frontend dependencies
cd frontend
npm install

# Install Playwright browsers
npx playwright install

# Install backend dependencies
cd ../backend
pip install -r requirements.txt

# Run database migrations
alembic upgrade head
```

### Environment Setup

Create `.env.local` in the frontend directory:

```bash
# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
PLAYWRIGHT_BASE_URL=http://localhost:3000

# Test Credentials
E2E_TEST_EMAIL=test@example.com
E2E_TEST_PASSWORD=TestPassword123!

# API Keys (for E2E tests)
OPENAI_API_KEY=your-test-key
PINECONE_API_KEY=your-test-key
```

## Running Tests

### Local Development

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/01-authentication.spec.ts

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests in debug mode
npx playwright test --debug

# Run specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit

# Run tests matching pattern
npx playwright test --grep "sign in"

# Run tests in parallel
npx playwright test --workers=4

# Generate HTML report
npx playwright show-report
```

### Watch Mode (Development)

```bash
# Watch for file changes and re-run tests
npx playwright test --ui
```

### With Backend Server

```bash
# Terminal 1: Start backend
cd backend
uvicorn app.main:app --reload

# Terminal 2: Start frontend
cd frontend
npm run dev

# Terminal 3: Run E2E tests
cd frontend
npm run test:e2e
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    // Setup before each test
    await page.goto('/dashboard');
  });

  test('should do something', async ({ page }) => {
    // Arrange
    const button = page.getByRole('button', { name: /submit/i });

    // Act
    await button.click();

    // Assert
    await expect(page).toHaveURL('/success');
  });
});
```

### Using Page Object Models

```typescript
import { test, expect } from '@playwright/test';
import { SignInPage } from './pages/auth.page';
import { DashboardPage } from './pages/dashboard.page';

test('should navigate after sign in', async ({ page }) => {
  const signInPage = new SignInPage(page);
  const dashboardPage = new DashboardPage(page);

  await signInPage.goto();
  await signInPage.signIn('user@example.com', 'password123');

  await expect(page).toHaveURL(/.*dashboard/);
  await expect(await dashboardPage.isNavigationVisible()).toBe(true);
});
```

### Using Helpers

```typescript
import { test, expect } from '@playwright/test';
import { signIn, generateTestUser } from './helpers/auth.helper';
import { createTestResume } from './factories/resume.factory';

test('should create resume', async ({ page }) => {
  // Generate test data
  const user = generateTestUser();
  const resume = createTestResume();

  // Sign in using helper
  await signIn(page, user);

  // Continue with test...
});
```

### Using Test Fixtures

```typescript
import { test as base } from '@playwright/test';
import { createTestUser } from './factories/user.factory';

// Extend base test with custom fixtures
const test = base.extend({
  authenticatedPage: async ({ page }, use) => {
    const user = createTestUser();
    await signIn(page, user);
    await use(page);
  },
});

test('authenticated test', async ({ authenticatedPage }) => {
  // authenticatedPage is already signed in
  await authenticatedPage.goto('/dashboard');
  // ...
});
```

### API Mocking

```typescript
import { test, expect } from '@playwright/test';

test('should handle API error', async ({ page }) => {
  // Mock API response
  await page.route('**/api/v1/jobs', (route) => {
    route.fulfill({
      status: 500,
      body: JSON.stringify({ error: 'Server error' }),
    });
  });

  await page.goto('/dashboard/jobs');

  // Verify error handling
  await expect(page.getByText(/something went wrong/i)).toBeVisible();
});
```

### Visual Regression Testing

```typescript
import { test, expect } from '@playwright/test';

test('dashboard visual regression @visual', async ({ page }) => {
  await page.goto('/dashboard');

  // Take screenshot and compare
  await expect(page).toHaveScreenshot('dashboard.png', {
    fullPage: true,
    maxDiffPixels: 100,
  });
});
```

## Project Structure

```
frontend/tests/e2e/
├── .auth/                    # Stored authentication state
│   └── user.json
├── helpers/                  # Reusable helper functions
│   ├── auth.helper.ts        # Authentication helpers
│   └── api.helper.ts         # API interaction helpers
├── pages/                    # Page Object Models
│   ├── auth.page.ts          # Sign in/up pages
│   ├── dashboard.page.ts     # Dashboard page
│   └── ...
├── factories/                # Test data factories
│   ├── user.factory.ts       # User data generation
│   ├── resume.factory.ts     # Resume data generation
│   └── ...
├── fixtures/                 # Static test files
│   └── sample-resume.txt
├── 01-authentication.spec.ts # Test specs
├── 02-onboarding.spec.ts
├── ...
├── global-setup.ts           # Global test setup
└── README.md                 # This file
```

## Best Practices

### 1. Use Semantic Selectors

```typescript
// ✅ Good - Accessible and semantic
await page.getByRole('button', { name: /sign in/i });
await page.getByLabel(/email/i);
await page.getByPlaceholder(/search/i);

// ❌ Bad - Fragile
await page.locator('#submit-btn');
await page.locator('.login-form input:nth-child(2)');
```

### 2. Wait for Specific Conditions

```typescript
// ✅ Good - Wait for specific condition
await page.waitForURL('**/dashboard**');
await expect(page.getByText('Welcome')).toBeVisible();

// ❌ Bad - Arbitrary waits
await page.waitForTimeout(5000);
```

### 3. Use Page Object Models

```typescript
// ✅ Good - Reusable and maintainable
const dashboardPage = new DashboardPage(page);
await dashboardPage.navigateToJobs();

// ❌ Bad - Repetitive
await page.goto('/dashboard');
await page.click('[href="/dashboard/jobs"]');
```

### 4. Generate Test Data Dynamically

```typescript
// ✅ Good - Unique data for each test
const user = generateTestUser();
const resume = createTestResume();

// ❌ Bad - Hardcoded data (may cause conflicts)
const email = 'test@example.com';
```

### 5. Clean Up After Tests

```typescript
test.afterEach(async ({ page }, testInfo) => {
  // Take screenshot on failure
  if (testInfo.status !== 'passed') {
    await page.screenshot({ path: `failure-${testInfo.title}.png` });
  }

  // Clean up test data
  await cleanupTestData(testInfo.testId);
});
```

### 6. Test Isolation

```typescript
// ✅ Good - Each test is independent
test('test A', async ({ page }) => {
  const user = generateTestUser();
  await signIn(page, user);
  // Test specific to user A
});

test('test B', async ({ page }) => {
  const user = generateTestUser();
  await signIn(page, user);
  // Test specific to user B
});
```

### 7. Use Descriptive Test Names

```typescript
// ✅ Good - Clear intent
test('should display error when email is invalid', async ({ page }) => {});

// ❌ Bad - Vague
test('email test', async ({ page }) => {});
```

## CI/CD Integration

E2E tests run automatically on:

- ✅ **Push to main/develop branches**
- ✅ **Pull requests**
- ✅ **Daily scheduled runs** (2 AM UTC)
- ✅ **Manual workflow dispatch**

### GitHub Actions Workflow

Located at `.github/workflows/e2e-tests.yml`

**Features:**
- Multi-browser matrix testing (Chromium, Firefox, WebKit)
- PostgreSQL and Redis service containers
- Automatic backend/frontend server startup
- Test result artifacts and videos
- PR comments with test results

### Viewing Test Results

**Locally:**
```bash
npx playwright show-report
```

**In CI:**
- Check Actions tab in GitHub
- Download artifacts from workflow run
- View HTML reports and failure videos

## Troubleshooting

### Tests Failing Locally

**Backend not running:**
```bash
# Check if backend is running
curl http://localhost:8000/health

# Start backend
cd backend && uvicorn app.main:app --reload
```

**Frontend not running:**
```bash
# Check if frontend is running
curl http://localhost:3000

# Start frontend
cd frontend && npm run dev
```

**Database not migrated:**
```bash
cd backend
alembic upgrade head
```

### Flaky Tests

**Add explicit waits:**
```typescript
await page.waitForLoadState('networkidle');
await page.waitForSelector('[data-testid="loaded"]');
```

**Increase timeout:**
```typescript
test('slow test', async ({ page }) => {
  test.setTimeout(60000); // 60 seconds
  // ...
});
```

### Authentication Issues

**Clear auth state:**
```bash
rm -rf tests/e2e/.auth
```

**Regenerate auth state:**
```bash
npx playwright test global-setup.ts
```

### Browser Issues

**Update browsers:**
```bash
npx playwright install --with-deps
```

**Use specific browser:**
```bash
npx playwright test --project=chromium --headed
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Page Object Model](https://playwright.dev/docs/pom)
- [Accessibility Testing](https://playwright.dev/docs/accessibility-testing)

## Getting Help

- Check existing tests for examples
- Review Playwright documentation
- Ask team members in #qa-testing channel
- Create an issue with `[E2E]` prefix
