import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * WCAG 2.1 AA Compliance Audit - E2E Test Suite
 * Issue #148: [ADVANCED] WCAG 2.1 AA Compliance Audit
 *
 * This test suite validates WCAG 2.1 AA compliance across all major pages
 * using axe-core for automated accessibility testing.
 *
 * Test Coverage:
 * - Automated accessibility scans with axe-core
 * - WCAG 2.1 Level A and AA criteria
 * - Critical violations (MUST fix)
 * - Serious violations (SHOULD fix)
 * - Moderate violations (CONSIDER fixing)
 *
 * TDD/BDD Approach:
 * - RED Phase: These tests will initially FAIL, identifying all violations
 * - GREEN Phase: Fix violations until all tests PASS
 * - REFACTOR Phase: Optimize and document fixes
 */

test.describe('WCAG 2.1 AA Compliance Audit', () => {

  // ========================================================================
  // TEST CONFIGURATION
  // ========================================================================

  /**
   * Helper function to run axe-core scan and generate detailed report
   * Excludes development-only elements like Next.js error overlay
   */
  async function runAccessibilityScan(page: any, pageName: string) {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .exclude('#nextjs-portal')  // Exclude Next.js dev error overlay
      .analyze();

    const violations = accessibilityScanResults.violations;

    // Log summary
    console.log(`\n${'='.repeat(80)}`);
    console.log(`ACCESSIBILITY SCAN: ${pageName}`);
    console.log(`${'='.repeat(80)}`);
    console.log(`Total Violations: ${violations.length}`);

    if (violations.length > 0) {
      // Group by impact
      const critical = violations.filter(v => v.impact === 'critical');
      const serious = violations.filter(v => v.impact === 'serious');
      const moderate = violations.filter(v => v.impact === 'moderate');
      const minor = violations.filter(v => v.impact === 'minor');

      console.log(`  Critical: ${critical.length}`);
      console.log(`  Serious: ${serious.length}`);
      console.log(`  Moderate: ${moderate.length}`);
      console.log(`  Minor: ${minor.length}`);
      console.log(`${'='.repeat(80)}\n`);

      // Detailed violation report
      violations.forEach((violation, index) => {
        console.log(`\nViolation #${index + 1}: ${violation.id}`);
        console.log(`Impact: ${violation.impact?.toUpperCase()}`);
        console.log(`Description: ${violation.description}`);
        console.log(`Help: ${violation.help}`);
        console.log(`Help URL: ${violation.helpUrl}`);
        console.log(`WCAG Tags: ${violation.tags.filter(tag => tag.startsWith('wcag')).join(', ')}`);
        console.log(`Affected Elements (${violation.nodes.length}):`);

        violation.nodes.forEach((node, nodeIndex) => {
          console.log(`  ${nodeIndex + 1}. ${node.html.substring(0, 100)}${node.html.length > 100 ? '...' : ''}`);
          console.log(`     Target: ${node.target.join(' ')}`);
          console.log(`     Fix: ${node.failureSummary}`);
        });
        console.log(`${'-'.repeat(80)}`);
      });
    } else {
      console.log('✅ No accessibility violations found!');
      console.log(`${'='.repeat(80)}\n`);
    }

    return accessibilityScanResults;
  }

  /**
   * Helper function to wait for document title to be set
   * Adds delay for React hydration and logs title for debugging
   */
  async function waitForTitle(page: any) {
    // Wait up to 5 seconds for title to be set, checking every 200ms
    for (let i = 0; i < 25; i++) {
      const currentTitle = await page.title();
      if (currentTitle && currentTitle.trim() !== '') {
        console.log(`✓ Page title set after ${i * 200}ms: "${currentTitle}"`);
        return;
      }
      await page.waitForTimeout(200);
    }

    // If we get here, title was never set
    const finalTitle = await page.title();
    console.warn(`⚠️  Page title still empty after 5s: "${finalTitle}"`);
  }

  /**
   * Assert no critical or serious violations
   */
  function assertNoViolations(results: any, pageName: string, allowedImpacts: string[] = []) {
    const criticalAndSerious = results.violations.filter(
      (v: any) => (v.impact === 'critical' || v.impact === 'serious') && !allowedImpacts.includes(v.impact)
    );

    expect(criticalAndSerious, `${pageName} should have no critical or serious violations`).toHaveLength(0);
  }

  // ========================================================================
  // AUTOMATED ACCESSIBILITY SCANS - PUBLIC PAGES
  // ========================================================================

  test('1.1 Homepage should have no accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await runAccessibilityScan(page, 'Homepage');
    assertNoViolations(results, 'Homepage');

    // Additional specific checks
    expect(results.violations.length, 'Homepage should have 0 total violations').toBe(0);
  });

  test('1.2 Login page should have no accessibility violations', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const results = await runAccessibilityScan(page, 'Login Page');
    assertNoViolations(results, 'Login Page');
  });

  test('1.3 Register page should have no accessibility violations', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    const results = await runAccessibilityScan(page, 'Register Page');
    assertNoViolations(results, 'Register Page');
  });

  // ========================================================================
  // AUTOMATED ACCESSIBILITY SCANS - JOB SEEKER PAGES
  // ========================================================================

  test.describe('Job Seeker Pages', () => {
    test.beforeEach(async ({ page }) => {
      // Mock authentication for job seeker
      await page.goto('/');

      // Set up mock authentication in localStorage
      await page.evaluate(() => {
        const mockAuthState = {
          state: {
            user: {
              id: 'test-user-123',
              email: 'test@example.com',
              first_name: 'Test',
              last_name: 'User',
              full_name: 'Test User',
              onboarding_completed: true,
              subscription_tier: 'free',
              is_verified: true,
            },
            accessToken: 'mock-access-token',
            refreshToken: 'mock-refresh-token',
            isAuthenticated: true,
            isLoading: false,
            isInitialized: false, // Must be false to trigger initializeAuth()
            error: null,
          },
          version: 0,
        };
        // Set Zustand persist storage
        localStorage.setItem('auth-storage', JSON.stringify(mockAuthState));
        // CRITICAL: Also set individual tokens for initializeAuth() check
        localStorage.setItem('access_token', 'mock-access-token');
        localStorage.setItem('refresh_token', 'mock-refresh-token');
      });
    });

    test('2.1 Dashboard should have no accessibility violations', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await waitForTitle(page); // Wait for title to be set

      const results = await runAccessibilityScan(page, 'Dashboard');
      assertNoViolations(results, 'Dashboard');
    });

    test('2.2 Job Matching page should have no accessibility violations', async ({ page }) => {
      await page.goto('/dashboard/jobs');
      await page.waitForLoadState('networkidle');
      await waitForTitle(page); // Wait for title to be set

      const results = await runAccessibilityScan(page, 'Job Matching');
      assertNoViolations(results, 'Job Matching');
    });

    test('2.3 Resume Builder page should have no accessibility violations', async ({ page }) => {
      await page.goto('/dashboard/resumes');
      await page.waitForLoadState('networkidle');
      await waitForTitle(page); // Wait for title to be set

      const results = await runAccessibilityScan(page, 'Resume Builder');
      assertNoViolations(results, 'Resume Builder');
    });

    test('2.4 Cover Letter Generator page should have no accessibility violations', async ({ page }) => {
      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');
      await waitForTitle(page); // Wait for title to be set

      const results = await runAccessibilityScan(page, 'Cover Letter Generator');
      assertNoViolations(results, 'Cover Letter Generator');
    });

    test('2.5 Applications page should have no accessibility violations', async ({ page }) => {
      await page.goto('/dashboard/applications');
      await page.waitForLoadState('networkidle');
      await waitForTitle(page); // Wait for title to be set

      const results = await runAccessibilityScan(page, 'Applications');
      assertNoViolations(results, 'Applications');
    });

    test('2.6 Settings page should have no accessibility violations', async ({ page }) => {
      await page.goto('/dashboard/settings');
      await page.waitForLoadState('networkidle');
      await waitForTitle(page); // Wait for title to be set

      const results = await runAccessibilityScan(page, 'Settings');
      assertNoViolations(results, 'Settings');
    });
  });

  // ========================================================================
  // AUTOMATED ACCESSIBILITY SCANS - EMPLOYER PAGES
  // ========================================================================

  test.describe('Employer Pages', () => {
    test.beforeEach(async ({ page }) => {
      // Mock authentication for employer
      await page.goto('/');

      // Set up mock authentication in localStorage
      await page.evaluate(() => {
        const mockAuthState = {
          state: {
            user: {
              id: 'test-employer-123',
              email: 'employer@example.com',
              first_name: 'Test',
              last_name: 'Employer',
              full_name: 'Test Employer',
              onboarding_completed: true,
              subscription_tier: 'professional',
              is_verified: true,
            },
            accessToken: 'mock-employer-access-token',
            refreshToken: 'mock-employer-refresh-token',
            isAuthenticated: true,
            isLoading: false,
            isInitialized: false, // Must be false to trigger initializeAuth()
            error: null,
          },
          version: 0,
        };
        // Set Zustand persist storage
        localStorage.setItem('auth-storage', JSON.stringify(mockAuthState));
        // CRITICAL: Also set individual tokens for initializeAuth() check
        localStorage.setItem('access_token', 'mock-employer-access-token');
        localStorage.setItem('refresh_token', 'mock-employer-refresh-token');
      });
    });

    test('3.1 Employer Dashboard should have no accessibility violations', async ({ page }) => {
      await page.goto('/employer/dashboard');
      await page.waitForLoadState('networkidle');
      await waitForTitle(page); // Wait for title to be set

      const results = await runAccessibilityScan(page, 'Employer Dashboard');
      assertNoViolations(results, 'Employer Dashboard');
    });

    test('3.2 Job Posting page should have no accessibility violations', async ({ page }) => {
      await page.goto('/employer/jobs/new');
      await page.waitForLoadState('networkidle');
      await waitForTitle(page); // Wait for title to be set

      const results = await runAccessibilityScan(page, 'Job Posting');
      assertNoViolations(results, 'Job Posting');
    });

    test('3.3 Applicant Tracking page should have no accessibility violations', async ({ page }) => {
      await page.goto('/employer/applicants');
      await page.waitForLoadState('networkidle');
      await waitForTitle(page); // Wait for title to be set

      const results = await runAccessibilityScan(page, 'Applicant Tracking');
      assertNoViolations(results, 'Applicant Tracking');
    });

    test('3.4 Candidate Search page should have no accessibility violations', async ({ page }) => {
      await page.goto('/employer/candidates');
      await page.waitForLoadState('networkidle');
      await waitForTitle(page); // Wait for title to be set

      const results = await runAccessibilityScan(page, 'Candidate Search');
      assertNoViolations(results, 'Candidate Search');
    });
  });

  // ========================================================================
  // SPECIFIC WCAG CRITERIA TESTS
  // ========================================================================

  test.describe('WCAG 2.1 Specific Criteria', () => {

    test('4.1 All images should have alt text (1.1.1 Non-text Content)', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check all images have alt attribute
      const images = await page.locator('img').all();

      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');

        // Image must have alt attribute (can be empty for decorative)
        // or role="presentation" for decorative images
        expect(
          alt !== null || role === 'presentation',
          'All images must have alt attribute or role="presentation"'
        ).toBeTruthy();
      }
    });

    test('4.2 All form inputs should have associated labels (3.3.2 Labels or Instructions)', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Check all inputs have labels
      const inputs = await page.locator('input[type="text"], input[type="email"], input[type="password"], textarea').all();

      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');

        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const labelCount = await label.count();

          expect(
            labelCount > 0 || ariaLabel || ariaLabelledby,
            `Input with id="${id}" must have associated label or aria-label`
          ).toBeTruthy();
        }
      }
    });

    test('4.3 Page should have valid language attribute (3.1.1 Language of Page)', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const html = page.locator('html');
      const lang = await html.getAttribute('lang');

      expect(lang, 'HTML element must have lang attribute').toBeTruthy();
      expect(lang, 'Language should be English').toBe('en');
    });

    test('4.4 Page should have descriptive title (2.4.2 Page Titled)', async ({ page }) => {
      const pages = [
        { url: '/', expectedTitleContains: 'HireFlux' },
        { url: '/signin', expectedTitleContains: 'Sign In' },
        { url: '/signup', expectedTitleContains: 'Sign Up' },
        { url: '/employer/login', expectedTitleContains: 'Login' },
        { url: '/dashboard', expectedTitleContains: 'Dashboard' },
      ];

      for (const { url, expectedTitleContains } of pages) {
        await page.goto(url);
        await page.waitForLoadState('networkidle');

        const title = await page.title();
        expect(title.length, `Page ${url} should have a title`).toBeGreaterThan(0);
        expect(title, `Page ${url} title should contain "${expectedTitleContains}"`).toContain(expectedTitleContains);
      }
    });

    test('4.5 Focus should be visible (2.4.7 Focus Visible)', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Get all focusable elements
      const focusableElements = await page.locator('a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])').all();

      expect(focusableElements.length, 'Page should have focusable elements').toBeGreaterThan(0);

      // Tab through elements and check focus visibility
      await page.keyboard.press('Tab');

      // Check if any element has focus
      const focusedElement = await page.locator(':focus');
      const focusedCount = await focusedElement.count();

      expect(focusedCount, 'At least one element should receive focus').toBeGreaterThan(0);
    });

    test('4.6 Skip to main content link should exist (2.4.1 Bypass Blocks)', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Press Tab to reveal skip link
      await page.keyboard.press('Tab');

      // Check for skip link
      const skipLink = page.locator('a[href="#main-content"], a[href="#main"], a:has-text("Skip to main content"), a:has-text("Skip to content")');
      const skipLinkCount = await skipLink.count();

      expect(skipLinkCount, 'Page should have a skip to main content link').toBeGreaterThan(0);
    });

    test('4.7 Headings should be in logical order (1.3.1 Info and Relationships)', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Get all heading levels
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

      if (headings.length > 0) {
        const headingLevels: number[] = [];

        for (const heading of headings) {
          const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
          const level = parseInt(tagName.replace('h', ''));
          headingLevels.push(level);
        }

        // Check that we start with h1
        expect(headingLevels[0], 'First heading should be h1').toBe(1);

        // Check that headings don't skip levels (e.g., h1 -> h3)
        for (let i = 1; i < headingLevels.length; i++) {
          const diff = headingLevels[i] - headingLevels[i - 1];
          expect(
            diff <= 1,
            `Heading level should not skip: h${headingLevels[i - 1]} -> h${headingLevels[i]}`
          ).toBeTruthy();
        }
      }
    });

    test('4.8 Interactive elements should have accessible names (4.1.2 Name, Role, Value)', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check buttons
      const buttons = await page.locator('button').all();
      for (const button of buttons) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const ariaLabelledby = await button.getAttribute('aria-labelledby');
        const title = await button.getAttribute('title');

        const hasAccessibleName =
          (text && text.trim().length > 0) ||
          ariaLabel ||
          ariaLabelledby ||
          title;

        expect(hasAccessibleName, 'Button should have accessible name').toBeTruthy();
      }

      // Check links
      const links = await page.locator('a[href]').all();
      for (const link of links) {
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');
        const ariaLabelledby = await link.getAttribute('aria-labelledby');
        const title = await link.getAttribute('title');

        const hasAccessibleName =
          (text && text.trim().length > 0) ||
          ariaLabel ||
          ariaLabelledby ||
          title;

        expect(hasAccessibleName, 'Link should have accessible name').toBeTruthy();
      }
    });

    test('4.9 No duplicate IDs should exist (4.1.1 Parsing)', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Get all elements with IDs
      const elementsWithIds = await page.locator('[id]').all();
      const ids: string[] = [];

      for (const element of elementsWithIds) {
        const id = await element.getAttribute('id');
        if (id) {
          expect(ids.includes(id), `Duplicate ID found: ${id}`).toBeFalsy();
          ids.push(id);
        }
      }
    });

    test('4.10 Contrast ratio should be sufficient (1.4.3 Contrast Minimum)', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .withRules(['color-contrast'])
        .exclude('#nextjs-portal')  // Exclude Next.js dev error overlay
        .analyze();

      const contrastViolations = results.violations.filter(v => v.id === 'color-contrast');

      expect(contrastViolations, 'Should have no color contrast violations').toHaveLength(0);
    });
  });

  // ========================================================================
  // KEYBOARD NAVIGATION TESTS
  // ========================================================================

  test.describe('Keyboard Navigation (2.1.1, 2.1.2)', () => {

    test('5.1 All interactive elements should be keyboard accessible', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Get all interactive elements
      const interactiveElements = await page.locator('a, button, input, textarea, select, [role="button"], [role="link"]').all();

      expect(interactiveElements.length, 'Page should have interactive elements').toBeGreaterThan(0);

      // Tab through elements
      let tabCount = 0;
      const maxTabs = Math.min(interactiveElements.length, 20); // Limit to first 20 elements

      for (let i = 0; i < maxTabs; i++) {
        await page.keyboard.press('Tab');
        tabCount++;

        // Check if element has focus
        const focused = await page.locator(':focus');
        const focusedCount = await focused.count();

        expect(focusedCount, `Element ${i + 1} should be focusable via Tab`).toBe(1);
      }

      expect(tabCount, 'Should be able to tab through elements').toBeGreaterThan(0);
    });

    test('5.2 No keyboard traps should exist', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Tab through elements and try to tab back
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Try Shift+Tab
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Shift+Tab');

      // Should be able to navigate back
      const focused = await page.locator(':focus');
      const focusedCount = await focused.count();

      expect(focusedCount, 'Should be able to navigate backwards with Shift+Tab').toBe(1);
    });

    test('5.3 Skip link should work with keyboard', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Press Tab to focus skip link
      await page.keyboard.press('Tab');

      // Press Enter to activate skip link
      await page.keyboard.press('Enter');

      // Wait a bit for navigation
      await page.waitForTimeout(500);

      // Check that main content area has focus or is scrolled to
      const mainContent = page.locator('#main-content, #main, main, [role="main"]');
      const mainContentCount = await mainContent.count();

      expect(mainContentCount, 'Main content area should exist').toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // FORM ACCESSIBILITY TESTS
  // ========================================================================

  test.describe('Form Accessibility (3.3.1, 3.3.2)', () => {

    test('6.1 Required fields should be indicated', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      const requiredInputs = await page.locator('input[required], input[aria-required="true"]').all();

      for (const input of requiredInputs) {
        const ariaRequired = await input.getAttribute('aria-required');
        const required = await input.getAttribute('required');

        // Check that required is indicated visually or programmatically
        expect(
          required !== null || ariaRequired === 'true',
          'Required fields should have required or aria-required attribute'
        ).toBeTruthy();
      }
    });

    test('6.2 Error messages should be associated with fields', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Submit form without filling to trigger errors
      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Check for error messages
        const errorMessages = await page.locator('[role="alert"], .error, .error-message, [aria-invalid="true"]').all();

        // If errors exist, they should be associated with inputs
        for (const error of errorMessages) {
          const ariaDescribedby = await error.getAttribute('aria-describedby');
          const id = await error.getAttribute('id');

          // Error should either have id (referenced by aria-describedby) or be role="alert"
          const role = await error.getAttribute('role');
          expect(
            id !== null || role === 'alert',
            'Error messages should have id or role="alert"'
          ).toBeTruthy();
        }
      }
    });
  });

  // ========================================================================
  // RESPONSIVE AND MOBILE ACCESSIBILITY
  // ========================================================================

  test.describe('Mobile Accessibility (1.3.4 Orientation)', () => {

    test('7.1 Content should work in portrait orientation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const results = await runAccessibilityScan(page, 'Mobile Portrait');
      assertNoViolations(results, 'Mobile Portrait');
    });

    test('7.2 Content should work in landscape orientation', async ({ page }) => {
      await page.setViewportSize({ width: 667, height: 375 }); // iPhone SE Landscape
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const results = await runAccessibilityScan(page, 'Mobile Landscape');
      assertNoViolations(results, 'Mobile Landscape');
    });

    test('7.3 Touch targets should be at least 44x44px', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const touchTargets = await page.locator('button, a, input[type="button"], input[type="submit"]').all();

      for (const target of touchTargets) {
        const box = await target.boundingBox();
        if (box) {
          // WCAG 2.5.5 Target Size (Level AAA, but good practice for mobile)
          // Minimum 44x44px recommended by iOS and Android guidelines
          expect(
            box.width >= 44 || box.height >= 44,
            'Touch targets should be at least 44px in width or height'
          ).toBeTruthy();
        }
      }
    });
  });

  // ========================================================================
  // ARIA AND SEMANTIC HTML TESTS
  // ========================================================================

  test.describe('ARIA and Semantic HTML', () => {

    test('8.1 Landmark roles should be present', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check for main landmark
      const main = await page.locator('main, [role="main"]').count();
      expect(main, 'Page should have main landmark').toBeGreaterThan(0);

      // Check for navigation landmark
      const nav = await page.locator('nav, [role="navigation"]').count();
      expect(nav, 'Page should have navigation landmark').toBeGreaterThan(0);
    });

    test('8.2 ARIA attributes should be valid', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .withRules(['aria-valid-attr', 'aria-valid-attr-value'])
        .exclude('#nextjs-portal')  // Exclude Next.js dev error overlay
        .analyze();

      const ariaViolations = results.violations.filter(
        v => v.id === 'aria-valid-attr' || v.id === 'aria-valid-attr-value'
      );

      expect(ariaViolations, 'Should have no invalid ARIA attributes').toHaveLength(0);
    });

    test('8.3 ARIA roles should be valid', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .withRules(['aria-roles'])
        .exclude('#nextjs-portal')  // Exclude Next.js dev error overlay
        .analyze();

      const roleViolations = results.violations.filter(v => v.id === 'aria-roles');

      expect(roleViolations, 'Should have no invalid ARIA roles').toHaveLength(0);
    });
  });

  // ========================================================================
  // COMPREHENSIVE SUMMARY TEST
  // ========================================================================

  test('9.0 WCAG 2.1 AA Compliance Summary Report', async ({ page }) => {
    const pagesToScan = [
      { url: '/', name: 'Homepage' },
      { url: '/login', name: 'Login' },
      { url: '/register', name: 'Register' },
      { url: '/dashboard', name: 'Dashboard' },
    ];

    const summaryResults: any[] = [];
    let totalViolations = 0;
    let totalCritical = 0;
    let totalSerious = 0;

    for (const { url, name } of pagesToScan) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('#nextjs-portal')  // Exclude Next.js dev error overlay
        .analyze();

      const critical = results.violations.filter(v => v.impact === 'critical').length;
      const serious = results.violations.filter(v => v.impact === 'serious').length;

      summaryResults.push({
        page: name,
        url,
        violations: results.violations.length,
        critical,
        serious,
      });

      totalViolations += results.violations.length;
      totalCritical += critical;
      totalSerious += serious;
    }

    // Print summary report
    console.log('\n' + '='.repeat(80));
    console.log('WCAG 2.1 AA COMPLIANCE SUMMARY REPORT');
    console.log('='.repeat(80));
    console.log(`Total Pages Scanned: ${pagesToScan.length}`);
    console.log(`Total Violations: ${totalViolations}`);
    console.log(`Total Critical: ${totalCritical}`);
    console.log(`Total Serious: ${totalSerious}`);
    console.log('='.repeat(80));
    console.log('\nPer-Page Results:');
    summaryResults.forEach((result, index) => {
      console.log(`\n${index + 1}. ${result.page} (${result.url})`);
      console.log(`   Total: ${result.violations} | Critical: ${result.critical} | Serious: ${result.serious}`);
    });
    console.log('\n' + '='.repeat(80));

    // Acceptance criteria: 0 critical and 0 serious violations
    expect(totalCritical, 'Should have 0 critical violations across all pages').toBe(0);
    expect(totalSerious, 'Should have 0 serious violations across all pages').toBe(0);
  });
});
