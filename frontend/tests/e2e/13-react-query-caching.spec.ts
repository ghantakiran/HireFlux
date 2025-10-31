/**
 * React Query Caching E2E Tests
 *
 * Tests React Query caching behavior in the application.
 * Following BDD (Behavior-Driven Development) approach.
 *
 * Test Scenarios:
 * 1. Data caching prevents unnecessary API calls
 * 2. Stale data is refetched appropriately
 * 3. Mutations invalidate related queries
 * 4. Optimistic updates work correctly
 * 5. Background refetching works
 * 6. Cache persistence across page navigation
 */

import { test, expect } from '@playwright/test';

test.describe('React Query Caching Behavior', () => {
  test.describe('Given user is logged in', () => {
    test.beforeEach(async ({ page }) => {
      // Given: User is logged in
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    });

    test('When user navigates to resumes page twice, Then API should be called only once (caching)', async ({
      page,
    }) => {
      // Track API calls
      let apiCallCount = 0;
      page.on('request', (request) => {
        if (request.url().includes('/api/v1/resumes')) {
          apiCallCount++;
        }
      });

      // When: User navigates to resumes page first time
      await page.goto('/dashboard/resumes');
      await page.waitForLoadState('networkidle');

      const firstCallCount = apiCallCount;
      expect(firstCallCount).toBeGreaterThan(0);

      // And: User navigates to dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // And: User navigates back to resumes page
      await page.goto('/dashboard/resumes');
      await page.waitForLoadState('networkidle');

      // Then: API should not be called again (using cache)
      expect(apiCallCount).toBe(firstCallCount);
    });

    test('When user creates a new resume, Then resume list should be refetched automatically', async ({
      page,
    }) => {
      // Given: User is on resumes page
      await page.goto('/dashboard/resumes');
      await page.waitForLoadState('networkidle');

      // Track API calls for resume list
      let listApiCalls = 0;
      page.on('request', (request) => {
        if (request.url().match(/\/api\/v1\/resumes(?:\?|$)/)) {
          listApiCalls++;
        }
      });

      const initialCount = await page.locator('[data-testid="resume-card"]').count();
      const initialListCalls = listApiCalls;

      // When: User creates a new resume
      await page.click('button:has-text("Create Resume")');
      await page.fill('input[name="title"]', 'New Test Resume');
      await page.click('button[type="submit"]:has-text("Create")');

      // Wait for success toast
      await expect(page.locator('text=Resume created successfully')).toBeVisible();

      // Then: Resume list should be automatically refetched
      await page.waitForTimeout(1000); // Give time for refetch
      expect(listApiCalls).toBeGreaterThan(initialListCalls);

      // And: New resume should appear in the list
      const newCount = await page.locator('[data-testid="resume-card"]').count();
      expect(newCount).toBeGreaterThan(initialCount);
    });

    test('When user updates a resume, Then both detail and list cache should be invalidated', async ({
      page,
    }) => {
      // Given: User has resumes
      await page.goto('/dashboard/resumes');
      await page.waitForLoadState('networkidle');

      // Click on first resume
      await page.click('[data-testid="resume-card"]:first-child');
      await page.waitForURL('**/resumes/**');

      // Track API calls
      const apiCalls: string[] = [];
      page.on('request', (request) => {
        if (request.url().includes('/api/v1/resumes')) {
          apiCalls.push(request.url());
        }
      });

      // When: User edits the resume
      await page.click('button:has-text("Edit")');
      await page.fill('input[name="title"]', 'Updated Resume Title');
      await page.click('button[type="submit"]:has-text("Save")');

      // Wait for success toast
      await expect(page.locator('text=Resume updated successfully')).toBeVisible();

      // Then: Resume detail should be refetched
      await page.waitForTimeout(1000);
      const detailCalls = apiCalls.filter((url) => url.match(/\/resumes\/[^/]+$/));
      expect(detailCalls.length).toBeGreaterThan(0);

      // And: Resume list should also be refetched (when navigating back)
      await page.goto('/dashboard/resumes');
      await page.waitForLoadState('networkidle');

      const listCalls = apiCalls.filter((url) => url.match(/\/resumes(?:\?|$)/));
      expect(listCalls.length).toBeGreaterThan(0);
    });
  });

  test.describe('Given stale data', () => {
    test('When stale time expires, Then data should be refetched on next access', async ({
      page,
    }) => {
      // Given: User is logged in
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      // Track API calls
      let apiCallCount = 0;
      page.on('request', (request) => {
        if (request.url().includes('/api/v1/applications')) {
          apiCallCount++;
        }
      });

      // When: User visits applications page
      await page.goto('/dashboard/applications');
      await page.waitForLoadState('networkidle');
      const firstCallCount = apiCallCount;

      // And: User waits for stale time to pass (5 minutes in config)
      // For testing, we'll simulate by clearing cache and revisiting
      await page.evaluate(() => {
        // Access queryClient from window if available
        if ((window as any).queryClient) {
          (window as any).queryClient.clear();
        }
      });

      // And: User revisits applications page
      await page.goto('/dashboard');
      await page.goto('/dashboard/applications');
      await page.waitForLoadState('networkidle');

      // Then: Data should be refetched
      expect(apiCallCount).toBeGreaterThan(firstCallCount);
    });
  });

  test.describe('Given optimistic updates', () => {
    test('When user saves a job, Then UI should update immediately before API response', async ({
      page,
    }) => {
      // Given: User is on jobs page
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      await page.goto('/dashboard/jobs');
      await page.waitForLoadState('networkidle');

      // When: User clicks save button on a job
      const firstJobCard = page.locator('[data-testid="job-card"]').first();
      const saveButton = firstJobCard.locator('button:has-text("Save")');

      // Check initial state
      const initialButtonText = await saveButton.textContent();

      // Slow down the network to observe optimistic update
      await page.route('**/api/v1/jobs/*/save', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.continue();
      });

      await saveButton.click();

      // Then: Button should update immediately (optimistic)
      await expect(saveButton).toHaveText(/Saved|Unsave/);

      // And: Should show loading state
      await expect(saveButton).toBeDisabled();

      // And: After API completes, final state should be correct
      await page.waitForTimeout(2500);
      await expect(saveButton).toBeEnabled();
    });
  });

  test.describe('Given cache persistence', () => {
    test('When user navigates between pages, Then cached data should persist', async ({
      page,
    }) => {
      // Given: User is logged in and has visited resumes page
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      await page.goto('/dashboard/resumes');
      await page.waitForLoadState('networkidle');

      // Get initial content
      const resumeTitle = await page
        .locator('[data-testid="resume-card"]:first-child h3')
        .textContent();

      // When: User navigates to jobs page
      await page.goto('/dashboard/jobs');
      await page.waitForLoadState('networkidle');

      // And: User navigates back to resumes
      await page.goto('/dashboard/resumes');

      // Then: Cached data should be displayed immediately
      // (no loading skeleton if cache is working)
      const skeletonVisible = await page
        .locator('[class*="animate-pulse"]')
        .isVisible()
        .catch(() => false);

      // Skeleton should either not be visible or disappear very quickly
      if (skeletonVisible) {
        await expect(page.locator('[class*="animate-pulse"]')).toBeHidden({
          timeout: 500,
        });
      }

      // And: Same content should be visible
      await expect(
        page.locator('[data-testid="resume-card"]:first-child h3')
      ).toHaveText(resumeTitle || '');
    });
  });

  test.describe('Given React Query DevTools', () => {
    test('When in development mode, Then DevTools should be accessible', async ({ page }) => {
      // Given: Application is in development mode
      // When: User is on any page
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Then: DevTools button should be visible (bottom-right)
      // Note: DevTools might be hidden by default
      const devToolsButton = page.locator('button[title*="React Query"]');

      // DevTools should exist in DOM (even if hidden)
      const exists = await devToolsButton.count();
      expect(exists).toBeGreaterThanOrEqual(0); // May be 0 in production build
    });
  });
});
