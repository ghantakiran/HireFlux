# E2E Authentication Investigation Report
**Date**: 2025-11-04
**Issue**: All E2E tests failing due to authentication

---

## Root Cause Analysis

### The Problem
All E2E tests are failing at the login step:
```typescript
await page.goto('/signin');
await page.getByLabel(/email/i).fill('employer@company.com');
await page.getByLabel(/password/i).fill('TestPassword123!');
await page.getByRole('button', { name: /sign in/i }).click();
await expect(page).toHaveURL(/.*employer.*dashboard/); // ❌ FAILS - stays on /signin
```

### Architecture Conflict

#### Current Setup
1. **Global Setup** (`tests/e2e/global-setup.ts`):
   - Creates mock authenticated session
   - User: `test@example.com`
   - Saves to `.auth/user.json`
   - Sets localStorage with mock tokens

2. **Test Files**:
   - Try to manually login via UI
   - Use different emails: `employer@company.com`, `jobseeker@test.com`
   - Expect actual backend authentication to work

3. **Playwright Config**:
   - Does NOT specify `storageState` in `use` section
   - Therefore, mock auth session is created but never used

### Why Tests Fail

The tests are attempting **real authentication** (filling forms, clicking buttons) but:

1. **No Backend Running**: E2E tests only start frontend dev server (`npm run dev`)
2. **No Database**: No PostgreSQL connection for user validation
3. **No Auth API**: FastAPI backend not running on port 8000
4. **Mock Auth Ignored**: Tests don't use the pre-authenticated storageState

**Result**: Login form submits credentials but has nowhere to authenticate against.

---

## Two Architectural Approaches

### Approach 1: Mock Authentication (Current Intent)
**Use pre-authenticated sessions without testing login flow**

**Advantages**:
- Fast test execution (no login overhead)
- No backend dependency
- Tests focus on feature functionality

**Changes Required**:
```typescript
// playwright.config.ts
use: {
  baseURL: 'http://localhost:3000',
  storageState: './tests/e2e/.auth/user.json', // ✅ Add this
  trace: 'on-first-retry',
}
```

**Test Changes**:
```typescript
// Remove manual login, just navigate directly
test('should upload CSV', async ({ page }) => {
  // No loginAsEmployer() call needed - already authenticated
  await page.goto('/employer/jobs/bulk-upload');
  // ... rest of test
});
```

**Global Setup Updates**:
```typescript
// Create role-specific auth states
await createEmployerAuthState('./tests/e2e/.auth/employer.json');
await createJobSeekerAuthState('./tests/e2e/.auth/jobseeker.json');
```

**Playwright Projects**:
```typescript
projects: [
  {
    name: 'employer-tests',
    use: {
      ...devices['Desktop Chrome'],
      storageState: './tests/e2e/.auth/employer.json'
    },
  },
  {
    name: 'jobseeker-tests',
    use: {
      ...devices['Desktop Chrome'],
      storageState: './tests/e2e/.auth/jobseeker.json'
    },
  },
]
```

---

### Approach 2: Full-Stack E2E (Real Authentication)
**Test entire stack including backend authentication**

**Advantages**:
- Tests real authentication flow
- Catches integration issues
- More confidence in production readiness

**Changes Required**:

1. **Update Playwright Config**:
```typescript
webServer: [
  {
    command: 'cd ../backend && source venv/bin/activate && uvicorn app.main:app --port 8000',
    url: 'http://localhost:8000/health',
    timeout: 60000,
    reuseExistingServer: !process.env.CI,
  },
  {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
]
```

2. **Create Test Database**:
```bash
# docker-compose.test.yml
services:
  test-db:
    image: postgres:15
    environment:
      POSTGRES_DB: hireflux_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
```

3. **Seed Test Users**:
```python
# backend/tests/e2e/seed_test_users.py
def seed_test_users():
    create_user(email='employer@company.com', password='TestPassword123!', role='employer')
    create_user(email='jobseeker@test.com', password='TestPassword123!', role='jobseeker')
```

4. **Global Setup**:
```typescript
// Start backend, wait for health check
await waitForBackend('http://localhost:8000/health');
// Seed test data
await exec('python ../backend/tests/e2e/seed_test_users.py');
```

---

## Recommended Solution: Hybrid Approach

**Separate Test Suites**:

### Suite 1: Feature Tests (Mock Auth) - 90% of tests
- Use pre-authenticated sessions
- No backend required
- Fast execution
- Focus on UI/UX behavior

### Suite 2: Integration Tests (Real Auth) - 10% of tests
- Test full authentication flow
- Requires backend + database
- Slower execution
- Critical path validation

**Implementation**:
```typescript
// playwright.config.ts
projects: [
  // Feature tests - mock auth, no backend
  {
    name: 'features-employer',
    testMatch: /.*\.feature\.spec\.ts/,
    use: {
      storageState: './tests/e2e/.auth/employer.json'
    },
  },

  // Integration tests - real backend
  {
    name: 'integration',
    testMatch: /.*\.integration\.spec\.ts/,
    dependencies: ['setup-backend'],
    use: {
      baseURL: 'http://localhost:3000',
      // No storageState - tests login manually
    },
  },

  // Setup backend before integration tests
  {
    name: 'setup-backend',
    testMatch: /setup-backend\.ts/,
  },
]
```

**File Naming Convention**:
- `*.feature.spec.ts` - Feature tests with mock auth (fast)
- `*.integration.spec.ts` - Integration tests with real backend (slow)

---

## Immediate Action Plan

### Phase 1: Quick Fix (Mock Auth) - 2 hours
1. ✅ Add `storageState` to Playwright config
2. ✅ Create role-specific auth states (employer, jobseeker)
3. ✅ Remove manual login calls from tests
4. ✅ Verify all tests run with mock auth

### Phase 2: Backend Integration - 1 day
5. ⏳ Add backend webServer to Playwright config
6. ⏳ Create test database docker-compose
7. ⏳ Implement test data seeding
8. ⏳ Separate integration tests from feature tests

### Phase 3: CI/CD - 2 hours
9. ⏳ Update GitHub Actions to run both test suites
10. ⏳ Add backend health checks
11. ⏳ Configure test database for CI

---

## Files Requiring Changes

### Immediate (Phase 1)
- [ ] `frontend/playwright.config.ts` - Add storageState
- [ ] `frontend/tests/e2e/global-setup.ts` - Create role-specific auth
- [ ] `frontend/tests/e2e/22-mass-job-posting.spec.ts` - Remove loginAsEmployer()
- [ ] `frontend/tests/e2e/20-candidate-profiles.spec.ts` - Remove loginAsJobSeeker()

### Backend Integration (Phase 2)
- [ ] `frontend/playwright.config.ts` - Add backend webServer
- [ ] `docker-compose.test.yml` - Test database setup
- [ ] `backend/tests/e2e/seed_test_users.py` - Test data seeding
- [ ] `.github/workflows/e2e-tests.yml` - CI configuration

---

## Summary

**Current State**: Tests try to authenticate against non-existent backend
**Root Cause**: Architectural mismatch between mock auth setup and real login tests
**Recommended Fix**: Use mock auth for feature tests, separate integration tests for auth flow
**Priority**: HIGH - blocks all E2E validation for Sprint 11-12

**Next Step**: Implement Phase 1 (Quick Fix with Mock Auth) to unblock E2E testing.

---

**Report Generated**: 2025-11-04 17:35 UTC
