/**
 * Custom test fixtures for Playwright
 * Extends base test with reusable setup and teardown
 */
import { test as base, Page } from '@playwright/test';
import { signIn, generateTestUser, TestUser } from '../helpers/auth.helper';
import { createTestUserAPI, getAuthTokenAPI } from '../helpers/api.helper';
import { DashboardPage } from '../pages/dashboard.page';
import { SignInPage, SignUpPage } from '../pages/auth.page';

// Define custom fixtures
type CustomFixtures = {
  // Authenticated page with signed-in user
  authenticatedPage: Page;

  // Test user credentials
  testUser: TestUser;

  // Auth token for API calls
  authToken: string;

  // Page Object Models
  dashboardPage: DashboardPage;
  signInPage: SignInPage;
  signUpPage: SignUpPage;

  // Auto cleanup flag
  autoCleanup: boolean;
};

/**
 * Extended test with custom fixtures
 */
export const test = base.extend<CustomFixtures>({
  /**
   * Generate test user credentials
   */
  testUser: async ({}, use) => {
    const user = generateTestUser();
    await use(user);
  },

  /**
   * Create authenticated page
   * Automatically signs in before test
   */
  authenticatedPage: async ({ page, testUser }, use) => {
    // Create user account via API
    try {
      await createTestUserAPI(testUser.email, testUser.password);
    } catch (error) {
      console.warn('User may already exist or API unavailable:', error);
    }

    // Sign in
    await signIn(page, testUser);

    // Provide authenticated page to test
    await use(page);
  },

  /**
   * Get auth token for API calls
   */
  authToken: async ({ testUser }, use) => {
    try {
      const token = await getAuthTokenAPI(testUser.email, testUser.password);
      await use(token);
    } catch (error) {
      console.error('Failed to get auth token:', error);
      await use('');
    }
  },

  /**
   * Dashboard Page Object
   */
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  /**
   * Sign In Page Object
   */
  signInPage: async ({ page }, use) => {
    const signInPage = new SignInPage(page);
    await use(signInPage);
  },

  /**
   * Sign Up Page Object
   */
  signUpPage: async ({ page }, use) => {
    const signUpPage = new SignUpPage(page);
    await use(signUpPage);
  },

  /**
   * Auto cleanup flag
   * Set to false to disable automatic cleanup
   */
  autoCleanup: true,
});

/**
 * Export custom expect
 */
export { expect } from '@playwright/test';

/**
 * Test hooks for common setup/teardown
 */
export const testHooks = {
  /**
   * Setup before all tests in a suite
   */
  beforeAll: (fn: () => Promise<void>) => {
    test.beforeAll(fn);
  },

  /**
   * Setup before each test
   */
  beforeEach: (fn: (args: { page: Page }) => Promise<void>) => {
    test.beforeEach(fn);
  },

  /**
   * Cleanup after each test
   */
  afterEach: (fn: (args: { page: Page }, testInfo: any) => Promise<void>) => {
    test.afterEach(fn);
  },

  /**
   * Cleanup after all tests in a suite
   */
  afterAll: (fn: () => Promise<void>) => {
    test.afterAll(fn);
  },
};

/**
 * Test describe with automatic cleanup
 */
export function describeWithCleanup(name: string, fn: () => void) {
  test.describe(name, () => {
    test.afterEach(async ({ page, autoCleanup }, testInfo) => {
      if (autoCleanup) {
        // Take screenshot on failure
        if (testInfo.status !== 'passed') {
          const screenshotPath = `test-results/failure-${testInfo.title.replace(/\s+/g, '-')}-${Date.now()}.png`;
          await page.screenshot({ path: screenshotPath, fullPage: true });
          console.log(`Screenshot saved: ${screenshotPath}`);
        }

        // Clear cookies and storage
        await page.context().clearCookies();
        await page.evaluate(() => {
          localStorage.clear();
          sessionStorage.clear();
        });
      }
    });

    fn();
  });
}

/**
 * Slow test decorator (increases timeout)
 */
export function slowTest(name: string, fn: (args: any) => Promise<void>) {
  test(name, async (args) => {
    test.setTimeout(60000); // 60 seconds
    await fn(args);
  });
}

/**
 * Visual regression test decorator
 */
export function visualTest(name: string, fn: (args: { page: Page }) => Promise<void>) {
  test(`${name} @visual`, async ({ page }) => {
    await fn({ page });

    // Take screenshot for visual comparison
    await page.screenshot({
      path: `test-results/visual-${name.replace(/\s+/g, '-')}.png`,
      fullPage: true,
    });
  });
}

/**
 * Mobile test decorator
 */
export function mobileTest(name: string, fn: (args: { page: Page }) => Promise<void>) {
  test(`${name} @mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await fn({ page });
  });
}

/**
 * Skip test conditionally
 */
export function skipIf(condition: boolean, reason: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (condition) {
        test.skip(true, reason);
      }
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Retry failed test automatically
 */
export function retryTest(times: number = 3) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      test.setTimeout(test.info().timeout * times);
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}
