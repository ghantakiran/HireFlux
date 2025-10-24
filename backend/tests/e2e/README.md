# End-to-End Testing with Playwright

## Overview
This directory contains Playwright-based end-to-end tests for HireFlux, testing the complete user journey from frontend to backend.

## Setup

### Install Playwright
```bash
npm install --save-dev @playwright/test
npx playwright install
```

### Python Playwright (Alternative)
```bash
pip install playwright pytest-playwright
playwright install
```

## Test Structure

```
tests/e2e/
├── README.md
├── playwright.config.ts       # Playwright configuration
├── fixtures/                  # Test data and fixtures
├── pages/                     # Page Object Models
│   ├── auth.page.ts
│   ├── onboarding.page.ts
│   ├── resume.page.ts
│   ├── jobs.page.ts
│   └── billing.page.ts
└── specs/                     # Test specifications
    ├── auth.spec.ts
    ├── onboarding.spec.ts
    ├── resume-generation.spec.ts
    ├── cover-letter.spec.ts
    ├── job-matching.spec.ts
    ├── billing.spec.ts
    └── full-user-journey.spec.ts
```

## Running Tests

### Run all tests
```bash
npx playwright test
```

### Run specific test file
```bash
npx playwright test specs/auth.spec.ts
```

### Run in headed mode (see browser)
```bash
npx playwright test --headed
```

### Run in debug mode
```bash
npx playwright test --debug
```

### Generate test report
```bash
npx playwright show-report
```

## Test Categories

### 1. Authentication & Onboarding
- User registration flow
- Email/password login
- OAuth login (Google, LinkedIn)
- Onboarding wizard completion
- Profile setup

### 2. Resume Management
- Resume upload (PDF, DOCX)
- Resume parsing verification
- AI resume generation
- Resume versioning
- Resume download

### 3. Cover Letter Generation
- Cover letter creation
- Tone customization
- Multi-variation generation
- Job-specific targeting

### 4. Job Matching
- Job search with filters
- Fit Index display
- Match rationale viewing
- Job application tracking

### 5. Billing & Subscriptions
- Stripe checkout flow
- Plan upgrades/downgrades
- Credit usage tracking
- Subscription cancellation

### 6. Full User Journey
- End-to-end user flow
- Cross-feature integration
- Performance benchmarks

## Example Tests

### Authentication Test (TypeScript)
```typescript
import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should register new user', async ({ page }) => {
    await page.goto('http://localhost:3000/register');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // Verify redirect to onboarding
    await expect(page).toHaveURL(/.*onboarding/);
  });

  test('should login existing user', async ({ page }) => {
    await page.goto('http://localhost:3000/login');

    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // Verify dashboard loads
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
});
```

### Resume Generation Test
```typescript
test.describe('Resume Generation', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
  });

  test('should upload and generate AI-optimized resume', async ({ page }) => {
    await page.goto('http://localhost:3000/resume/upload');

    // Upload resume
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('fixtures/sample-resume.pdf');

    // Wait for parsing
    await page.waitForSelector('.parsing-complete');

    // Navigate to AI generation
    await page.click('button:has-text("Generate AI Resume")');

    // Select tone
    await page.click('input[value="formal"]');
    await page.fill('input[name="targetTitle"]', 'Senior Software Engineer');
    await page.click('button:has-text("Generate")');

    // Wait for generation (max 10 seconds)
    await page.waitForSelector('.resume-generated', { timeout: 10000 });

    // Verify content
    await expect(page.locator('.resume-content')).toBeVisible();
    await expect(page.locator('.fit-score')).toBeVisible();
  });

  test('should handle insufficient credits', async ({ page }) => {
    // Assuming user has 0 credits
    await page.goto('http://localhost:3000/resume/generate');

    await page.click('button:has-text("Generate")');

    // Should show upgrade prompt
    await expect(page.locator('.upgrade-modal')).toBeVisible();
    await expect(page.locator('text=Insufficient credits')).toBeVisible();
  });
});
```

### Job Matching Test
```typescript
test.describe('Job Matching', () => {
  test('should display top job matches', async ({ page, request }) => {
    await page.goto('http://localhost:3000/jobs');

    // Wait for jobs to load
    await page.waitForSelector('.job-card');

    // Verify Fit Index is displayed
    const fitIndexes = page.locator('.fit-index');
    await expect(fitIndexes.first()).toBeVisible();

    // All fit indexes should be numbers between 0-100
    const count = await fitIndexes.count();
    for (let i = 0; i < count; i++) {
      const text = await fitIndexes.nth(i).textContent();
      const score = parseInt(text || '0');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
  });

  test('should filter jobs by location', async ({ page }) => {
    await page.goto('http://localhost:3000/jobs');

    // Select remote filter
    await page.check('input[value="remote"]');

    // Wait for filtered results
    await page.waitForTimeout(500);

    // Verify all jobs are remote
    const locationBadges = page.locator('.location-badge');
    const count = await locationBadges.count();
    for (let i = 0; i < count; i++) {
      await expect(locationBadges.nth(i)).toContainText('Remote');
    }
  });
});
```

### Billing Test
```typescript
test.describe('Billing', () => {
  test('should complete Stripe checkout', async ({ page, context }) => {
    await page.goto('http://localhost:3000/billing/upgrade');

    // Select Plus plan
    await page.click('button:has-text("Upgrade to Plus")');

    // Should redirect to Stripe checkout
    await page.waitForURL(/.*stripe.com.*/);

    // Fill Stripe test card
    const stripeFrame = page.frameLocator('iframe[name*="stripe"]');
    await stripeFrame.locator('input[name="cardnumber"]').fill('4242424242424242');
    await stripeFrame.locator('input[name="exp-date"]').fill('12/34');
    await stripeFrame.locator('input[name="cvc"]').fill('123');
    await stripeFrame.locator('input[name="postal"]').fill('12345');

    // Submit payment
    await page.click('button:has-text("Subscribe")');

    // Should redirect back to success page
    await page.waitForURL(/.*success/);
    await expect(page.locator('text=Subscription successful')).toBeVisible();
  });
});
```

### Full User Journey Test
```typescript
test.describe('Complete User Journey', () => {
  test('should complete full application flow', async ({ page }) => {
    // 1. Register
    await page.goto('http://localhost:3000/register');
    const email = `test-${Date.now()}@example.com`;
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', 'SecurePass123!');
    await page.fill('input[name="confirmPassword"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // 2. Complete onboarding
    await expect(page).toHaveURL(/.*onboarding/);
    await page.fill('input[name="fullName"]', 'Test User');
    await page.fill('input[name="jobTitle"]', 'Software Engineer');
    await page.click('button:has-text("Continue")');

    // 3. Upload resume
    await page.setInputFiles('input[type="file"]', 'fixtures/sample-resume.pdf');
    await page.waitForSelector('.parsing-complete');

    // 4. Search jobs
    await page.goto('http://localhost:3000/jobs');
    await page.waitForSelector('.job-card');

    // 5. View high-fit job
    await page.click('.job-card:has(.fit-index:has-text("85"))');
    await expect(page.locator('.job-details')).toBeVisible();

    // 6. Generate cover letter
    await page.click('button:has-text("Generate Cover Letter")');
    await page.waitForSelector('.cover-letter-preview');

    // 7. Apply to job
    await page.click('button:has-text("Apply Now")');
    await expect(page.locator('text=Application submitted')).toBeVisible();

    // Verify entire flow took reasonable time
    // (Should complete within 30 seconds)
  });
});
```

## Performance Testing

```typescript
test.describe('Performance', () => {
  test('should load dashboard within 2 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - start;

    expect(loadTime).toBeLessThan(2000);
  });

  test('should generate resume within 6 seconds', async ({ page }) => {
    await page.goto('http://localhost:3000/resume/generate');

    const start = Date.now();
    await page.click('button:has-text("Generate")');
    await page.waitForSelector('.resume-generated');
    const genTime = Date.now() - start;

    expect(genTime).toBeLessThan(6000);
  });
});
```

## Accessibility Testing

```typescript
test.describe('Accessibility', () => {
  test('should meet WCAG 2.1 AA standards', async ({ page }) => {
    await page.goto('http://localhost:3000');

    // Run axe accessibility tests
    const accessibilityScanResults = await page.evaluate(() => {
      return window.axe.run();
    });

    expect(accessibilityScanResults.violations).toHaveLength(0);
  });
});
```

## CI/CD Integration

### GitHub Actions
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: npm ci
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Best Practices

1. **Use Page Object Model**: Separate page logic from tests
2. **Wait Strategically**: Use specific waits, avoid arbitrary timeouts
3. **Test Data Isolation**: Each test should be independent
4. **Clean Up**: Reset state between tests
5. **Meaningful Assertions**: Test user value, not implementation
6. **Performance Benchmarks**: Track page load and API times
7. **Visual Regression**: Use screenshot comparison for UI changes
8. **Mobile Testing**: Test responsive designs
9. **Error Scenarios**: Test unhappy paths
10. **Parallel Execution**: Run tests in parallel for speed

## Troubleshooting

### Tests Failing Intermittently
- Increase timeouts for slow operations
- Use waitForSelector instead of waitForTimeout
- Check for race conditions

### Tests Running Slowly
- Run in headless mode
- Use parallel workers: `npx playwright test --workers=4`
- Optimize test data setup

### Screenshots Not Working
- Ensure screenshots directory exists
- Check file permissions
- Verify Playwright installation

## Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [CI/CD Setup](https://playwright.dev/docs/ci)
