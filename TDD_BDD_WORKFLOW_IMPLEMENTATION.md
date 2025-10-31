# TDD/BDD Workflow Implementation - HireFlux

**Date**: 2025-10-30  
**Sprint**: Post-Sprint 8 (Quality & Testing)  
**Status**: ✅ IMPLEMENTED

---

## Table of Contents
1. [Overview](#overview)
2. [TDD Implementation](#tdd-implementation)
3. [BDD Implementation](#bdd-implementation)
4. [CI/CD Pipeline](#cicd-pipeline)
5. [Test Coverage](#test-coverage)
6. [Best Practices](#best-practices)
7. [Running Tests](#running-tests)

---

## Overview

This document describes the Test-Driven Development (TDD) and Behavior-Driven Development (BDD) practices implemented in the HireFlux frontend application, along with the continuous integration/delivery pipeline.

### Principles Followed

1. **Test First**: Write failing tests before implementation
2. **Red-Green-Refactor**: Classic TDD cycle
3. **BDD Scenarios**: Given-When-Then structure for E2E tests
4. **Continuous Testing**: Automated tests on every PR/push
5. **Mobile-First**: Test mobile responsiveness from the start

---

## TDD Implementation

### TDD Cycle

```
1. RED    → Write failing test
2. GREEN  → Write minimal code to pass
3. REFACTOR → Clean up code
4. REPEAT → Next feature
```

### Example: OAuth Security Fix (TDD)

#### 1. RED Phase - Failing Test

```typescript
// tests/e2e/10-oauth-flow.spec.ts:228
test('Should not expose tokens in URL after callback processing', async ({ page }) => {
  // Navigate to OAuth callback with tokens
  await page.goto('/auth/callback?access_token=secret_token&refresh_token=secret_refresh&token_type=bearer');

  // Wait for processing
  await page.waitForURL('**/dashboard/**');

  // Then: URL should no longer contain tokens
  const url = page.url();
  expect(url).not.toContain('secret_token');  // ❌ FAILS
  expect(url).not.toContain('secret_refresh'); // ❌ FAILS
});
```

**Result**: ❌ Test fails - tokens remain in URL

#### 2. GREEN Phase - Implement Fix

```typescript
// app/auth/callback/page.tsx
useEffect(() => {
  const handleCallback = async () => {
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    // SECURITY: Clean URL immediately after extracting tokens
    router.replace('/auth/callback', { scroll: false });  // ✅ FIX

    // Store tokens securely
    setTokens(accessToken, refreshToken);
    
    // ... rest of auth flow
  };
  
  handleCallback();
}, [searchParams, router, setTokens, setUser]);
```

**Result**: ✅ Test passes - tokens removed from URL

#### 3. REFACTOR Phase

- Added security comment
- Used `router.replace()` instead of `push()` to avoid browser history
- Moved URL cleaning before any error handling

### Component Testing (TDD)

Example: Switch Component

```typescript
// __tests__/components/ui/switch.test.tsx

describe('Switch Component', () => {
  // 1. RED: Write test first
  it('should toggle state when clicked', () => {
    render(<Switch />);
    const switchEl = screen.getByRole('switch');

    expect(switchEl).toHaveAttribute('aria-checked', 'false');
    
    fireEvent.click(switchEl);
    expect(switchEl).toHaveAttribute('aria-checked', 'true');  // ❌ FAILS initially
  });

  // 2. GREEN: Implement component to pass
  // ... (see components/ui/switch.tsx)

  // 3. REFACTOR: Add edge cases
  it('should not toggle when disabled', () => {
    const handleChange = jest.fn();
    render(<Switch disabled onCheckedChange={handleChange} />);
    
    fireEvent.click(screen.getByRole('switch'));
    expect(handleChange).not.toHaveBeenCalled();  // ✅ PASSES
  });
});
```

---

## BDD Implementation

### BDD Structure

All E2E tests follow **Given-When-Then** (Gherkin-style) structure:

```gherkin
Feature: OAuth Authentication
  As a user
  I want to authenticate using OAuth
  So that I can access my account securely

  Scenario: Successful OAuth Login
    Given user is on sign in page
    When user clicks Google OAuth button
    Then redirect to Google OAuth should initiate
    And tokens should be securely stored
    And URL should be cleaned of sensitive data
```

### BDD Test Example

```typescript
// tests/e2e/10-oauth-flow.spec.ts

test.describe('OAuth Authentication Flow', () => {
  
  // Scenario: Sign In with OAuth
  test.describe('Given user is on sign in page', () => {
    
    test('When user sees OAuth options, Then Google and LinkedIn buttons should be visible', async ({ page }) => {
      // Given
      await page.goto('/signin');

      // Then
      const googleButton = page.locator('[data-testid="oauth-google"]');
      const linkedinButton = page.locator('[data-testid="oauth-linkedin"]');
      
      await expect(googleButton).toBeVisible();
      await expect(linkedinButton).toBeVisible();
    });

    test('When user clicks Google OAuth button, Then redirect to Google OAuth should initiate', async ({ page }) => {
      // Given
      await page.goto('/signin');

      // When
      const googleButton = page.locator('[data-testid="oauth-google"]');
      await googleButton.click();

      // Then
      await expect(page).toHaveURL(/accounts\.google\.com/);
    });
  });
});
```

### Mobile Responsiveness BDD

```typescript
// tests/e2e/mobile-responsiveness.spec.ts

test.describe('Mobile Responsiveness @mobile', () => {
  
  // Feature: Mobile-optimized landing page
  test.describe('Given user visits landing page on mobile', () => {
    
    test('When viewing on iPhone 13, Then layout should be mobile-optimized', async ({ browser }) => {
      // Given: Mobile device context
      const context = await browser.newContext({ ...devices['iPhone 13'] });
      const page = await context.newPage();

      // When: Navigate to page
      await page.goto('/');

      // Then: Mobile menu visible
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

      // Then: No horizontal scroll
      const hasHorizontalScroll = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(hasHorizontalScroll).toBeFalsy();

      // Then: Touch targets meet iOS guidelines (44x44px minimum)
      const buttons = page.locator('button');
      for (const button of await buttons.all()) {
        const box = await button.boundingBox();
        if (box) {
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }

      await context.close();
    });
  });
});
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

Located: `.github/workflows/frontend-ci.yml`

#### Pipeline Stages

```yaml
1. Lint & Type Check
   ├─ ESLint
   ├─ TypeScript compilation
   └─ Code formatting check

2. Unit & Component Tests
   ├─ Jest tests with coverage
   ├─ Upload to Codecov
   └─ PR coverage report

3. Build Application
   ├─ Next.js production build
   └─ Upload build artifacts

4. E2E Tests (Parallel)
   ├─ Desktop browsers (Chromium, Firefox) × 2 shards
   ├─ Upload Playwright reports
   └─ Upload test results

5. Mobile E2E Tests
   ├─ iPhone 13 tests
   ├─ Pixel 5 tests
   ├─ iPad Pro tests
   └─ Upload mobile test results

6. Security Audit
   ├─ npm audit
   └─ Vulnerability check

7. Lighthouse Audit (PRs only)
   ├─ Performance audit
   ├─ Accessibility check
   ├─ SEO analysis
   └─ Upload Lighthouse results

8. Accessibility Tests
   ├─ axe accessibility tests
   └─ WCAG 2.1 AA compliance

9. CI Summary
   ├─ Aggregate all results
   ├─ Comment on PR
   └─ Fail if required checks fail
```

#### Parallel Execution

The pipeline runs tests in parallel for efficiency:

- **E2E Tests**: 4 parallel jobs (Chromium×2, Firefox×2)
- **Mobile Tests**: 3 parallel jobs (iPhone, Pixel, iPad)
- **Total**: ~7 parallel jobs

**Benefits**:
- Faster feedback (10-15 min vs 30+ min sequential)
- Better resource utilization
- Early failure detection

#### Test Artifacts

All test runs produce artifacts:

```
playwright-report-{browser}-{shard}/
  ├─ index.html          # Visual test report
  ├─ screenshots/        # Failure screenshots
  └─ videos/             # Test recordings

test-results-{browser}-{shard}/
  ├─ test-results.json
  └─ error-context.md

lighthouse-results/
  ├─ lhr.html           # Lighthouse HTML report
  └─ lhr.json           # Lighthouse JSON data

accessibility-results/
  └─ axe-results.json
```

**Retention**: 7-14 days

---

## Test Coverage

### Current Coverage

| Category | Coverage | Target | Status |
|----------|----------|--------|--------|
| **Overall** | 15.13% | 40% | ⚠️ In Progress |
| **UI Components** | 64.12% | 60% | ✅ Exceeds |
| **E2E (Desktop)** | 18 scenarios | 20+ | ✅ Good |
| **E2E (Mobile)** | 15 scenarios | 15+ | ✅ Good |

### Test Distribution

```
Unit Tests (Jest):               162 passing
├─ Component Tests:              89 tests
├─ Hook Tests:                   12 tests
├─ Utility Tests:                8 tests
└─ Store Tests:                  53 tests

E2E Tests (Playwright):          27 scenarios
├─ OAuth Flow:                   18 tests
├─ Mobile Responsiveness:        15 tests
├─ Accessibility:                6 tests
└─ Performance:                  3 tests

Total Tests:                     189 tests
```

### Coverage by Component Type

| Component Type | Files | Coverage | Tests |
|----------------|-------|----------|-------|
| UI Components (New) | 6 | 100% | 73 tests |
| UI Components (Existing) | 5 | 90-100% | Pre-existing |
| Pages | 31 | 10-85% | 12 tests |
| Hooks | 5 | 0% | Need tests |
| Stores | 6 | 12.71% | 53 tests |
| Utils | 3 | 10-21% | 8 tests |

---

## Best Practices

### 1. TDD Best Practices

#### ✅ DO:
- Write test first (red phase)
- Write minimal code to pass (green phase)
- Refactor after passing
- Test one thing at a time
- Use descriptive test names
- Test edge cases

#### ❌ DON'T:
- Skip tests "temporarily"
- Write implementation before tests
- Test implementation details
- Ignore failing tests
- Write tests after the fact

### 2. BDD Best Practices

#### ✅ DO:
- Use Given-When-Then structure
- Write user-focused scenarios
- Use tags (@mobile, @accessibility)
- Test user flows, not functions
- Make tests readable by non-developers

#### ❌ DON'T:
- Test internal state
- Write technical jargon in scenarios
- Skip the "Given" context
- Forget the "Then" assertions

### 3. E2E Test Best Practices

#### ✅ DO:
- Use data-testid for stable selectors
- Test critical user paths
- Run in multiple browsers
- Test mobile devices
- Take screenshots on failure
- Use page objects for reusability

#### ❌ DON'T:
- Use CSS classes as selectors
- Test every possible path (focus on critical)
- Rely on timing (use waitFor)
- Skip mobile testing
- Ignore accessibility

### 4. CI/CD Best Practices

#### ✅ DO:
- Run tests on every PR
- Fail fast (stop on first failure)
- Cache dependencies
- Run tests in parallel
- Keep pipeline fast (<15 min)
- Generate test reports
- Comment PR with results

#### ❌ DON'T:
- Skip tests in CI
- Allow flaky tests
- Run sequentially if parallel possible
- Ignore test failures
- Let pipeline get too slow

---

## Running Tests

### Local Development

#### Unit Tests

```bash
# Run all unit tests
npm test

# Watch mode (TDD)
npm run test:watch

# With coverage
npm test -- --coverage
```

#### E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npm run test:e2e -- tests/e2e/10-oauth-flow.spec.ts

# Run mobile tests only
npm run test:e2e:mobile

# Run with headed browser (see tests run)
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug

# Specific browser
npm run test:e2e -- --project=chromium

# Specific test by name
npm run test:e2e -- --grep="OAuth Security"

# Mobile device
npm run test:e2e -- --project="iPhone 13"
```

#### Test Reports

```bash
# Show last Playwright report
npx playwright show-report

# Generate coverage report
npm test -- --coverage --watchAll=false

# View coverage in browser
open coverage/lcov-report/index.html
```

### CI/CD

Tests run automatically on:
- ✅ Push to `main` or `develop`
- ✅ Pull request to `main` or `develop`
- ✅ Manual workflow dispatch

#### Monitoring CI Results

1. **GitHub Actions Tab**: View live pipeline
2. **PR Checks**: See status on PR
3. **Artifacts**: Download test reports from Actions
4. **Summary**: View aggregated results in job summary

#### Debugging CI Failures

```bash
# 1. Check GitHub Actions logs
# 2. Download test artifacts (screenshots, videos)
# 3. Run locally with same conditions:

npm run test:e2e -- --project=chromium --shard=1/2

# 4. Check for:
#    - Flaky tests (timing issues)
#    - Environment differences
#    - Missing test data
```

---

## Test Organization

### Directory Structure

```
frontend/
├── __tests__/              # Unit/Component tests (Jest)
│   ├── components/
│   │   └── ui/            # UI component tests
│   │       ├── switch.test.tsx
│   │       ├── progress.test.tsx
│   │       ├── tabs.test.tsx
│   │       ├── alert-dialog.test.tsx
│   │       ├── table.test.tsx
│   │       └── separator.test.tsx
│   ├── lib/
│   │   ├── hooks/         # Hook tests
│   │   ├── stores/        # Store tests
│   │   └── utils/         # Utility tests
│   └── app/               # Page component tests
│
├── tests/
│   └── e2e/               # E2E tests (Playwright)
│       ├── 10-oauth-flow.spec.ts           # OAuth BDD tests
│       ├── mobile-responsiveness.spec.ts   # Mobile BDD tests
│       ├── global-setup.ts                 # Test setup
│       └── factories/                      # Test data factories
│
├── playwright.config.ts    # Playwright configuration
├── jest.config.js         # Jest configuration
└── .github/
    └── workflows/
        └── frontend-ci.yml # CI/CD pipeline
```

### Test Naming Conventions

#### Unit Tests
- Pattern: `{component}.test.tsx` or `{module}.test.ts`
- Example: `switch.test.tsx`, `utils.test.ts`

#### E2E Tests
- Pattern: `{order}-{feature}.spec.ts`
- Example: `10-oauth-flow.spec.ts`, `20-resume-builder.spec.ts`
- Order prefix ensures logical execution

#### Test Names
```typescript
// BDD Style (E2E)
test('Given user is authenticated, When accessing dashboard, Then should show personalized content')

// TDD Style (Unit)
test('should toggle state when clicked')
test('should not call onChange when disabled')
```

---

## Metrics & Monitoring

### Key Metrics

1. **Test Execution Time**
   - Unit Tests: <2 minutes
   - E2E Tests (Desktop): <10 minutes
   - E2E Tests (Mobile): <8 minutes
   - Total Pipeline: <15 minutes

2. **Test Success Rate**
   - Target: >95% pass rate
   - Flaky Test Tolerance: <2%

3. **Code Coverage**
   - Current: 15.13% overall, 64.12% UI components
   - Target: 40% overall, >60% critical paths

4. **Security Vulnerabilities**
   - High/Critical: 0 (fail CI)
   - Moderate: <5 (warn)

5. **Accessibility**
   - WCAG 2.1 AA: Target compliance
   - Axe violations: 0 critical

### Performance Benchmarks

```javascript
// Lighthouse Targets (PR checks)
{
  performance: 85,      // Load time, TTI
  accessibility: 90,    // WCAG compliance
  bestPractices: 90,    // Security, HTTPS
  seo: 85,             // Meta tags, structure
}

// Bundle Size
{
  maxBundleSize: '300KB',  // Per page
  maxSharedBundle: '260KB',
}

// Mobile Performance
{
  loadTime: '<5s',     // 3G network
  tti: '<3s',         // Time to Interactive
}
```

---

## Future Improvements

### Short Term (Sprint 9)
1. ✅ OAuth security fix (DONE)
2. ✅ Mobile E2E test suite (DONE)
3. ✅ CI/CD pipeline enhancement (DONE)
4. ⚠️ Increase overall coverage to 40%
5. ⚠️ Add visual regression tests
6. ⚠️ Performance monitoring

### Medium Term
1. Add contract testing (API)
2. Implement mutation testing
3. Add performance benchmarking
4. Chaos engineering tests
5. Load/stress testing

### Long Term
1. AI-powered test generation
2. Self-healing tests
3. Predictive test selection
4. Test impact analysis

---

## Conclusion

The HireFlux frontend now follows industry-standard TDD/BDD practices with:

✅ **TDD Cycle**: Red-Green-Refactor for all new code  
✅ **BDD E2E Tests**: Given-When-Then scenarios  
✅ **Mobile Testing**: Comprehensive mobile test suite  
✅ **CI/CD Pipeline**: Automated testing on every PR  
✅ **Security**: Automated vulnerability scanning  
✅ **Accessibility**: WCAG 2.1 AA testing  
✅ **Performance**: Lighthouse audits on PRs  

This foundation ensures high code quality, prevents regressions, and enables confident refactoring.

---

**Last Updated**: 2025-10-30  
**Maintained By**: Engineering Team  
**Related Docs**:
- `SPRINT_8_COMPLETION_SUMMARY.md`
- `SPRINT_8_PERFORMANCE_ANALYSIS.md`
- `.github/workflows/frontend-ci.yml`
