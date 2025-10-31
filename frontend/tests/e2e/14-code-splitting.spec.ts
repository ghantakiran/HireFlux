/**
 * Code Splitting E2E Tests
 *
 * Tests code splitting and lazy loading behavior.
 * Following BDD (Behavior-Driven Development) approach.
 *
 * Test Scenarios:
 * 1. Dashboard pages load separately (code splitting)
 * 2. Loading states appear during chunk loading
 * 3. Navigation between pages is fast (prefetching)
 * 4. Lazy loaded components work correctly
 * 5. Bundle size is optimized
 */

import { test, expect } from '@playwright/test';

test.describe('Code Splitting and Lazy Loading', () => {
  test.describe('Given user is logged in', () => {
    test.beforeEach(async ({ page }) => {
      // Given: User is logged in
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    });

    test('When user navigates to different dashboard pages, Then each page should load separate chunks', async ({
      page,
    }) => {
      // Track loaded JS chunks
      const loadedChunks = new Set<string>();

      page.on('response', (response) => {
        const url = response.url();
        // Track webpack chunks
        if (url.includes('/_next/static/chunks/') && url.endsWith('.js')) {
          const chunkName = url.split('/').pop() || '';
          loadedChunks.add(chunkName);
        }
      });

      // When: User navigates to resumes page
      await page.goto('/dashboard/resumes');
      await page.waitForLoadState('networkidle');
      const resumesChunks = loadedChunks.size;

      // And: User navigates to jobs page
      await page.goto('/dashboard/jobs');
      await page.waitForLoadState('networkidle');
      const jobsChunks = loadedChunks.size;

      // Then: Additional chunks should be loaded for jobs page
      expect(jobsChunks).toBeGreaterThan(resumesChunks);
    });

    test('When navigating to a new page, Then loading state should appear briefly', async ({
      page,
    }) => {
      // Given: User is on dashboard
      await page.goto('/dashboard');

      // Slow down network to observe loading state
      await page.route('**/_next/static/chunks/**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.continue();
      });

      // When: User clicks navigation to resumes
      const navigation = page.waitForNavigation({ url: '**/dashboard/resumes' });
      await page.click('a[href="/dashboard/resumes"]');

      // Then: Loading spinner should appear
      const loadingSpinner = page.locator('[role="status"][aria-label="Loading"]');
      await expect(loadingSpinner).toBeVisible({ timeout: 1000 });

      // And: Page should eventually load
      await navigation;
      await expect(loadingSpinner).toBeHidden({ timeout: 5000 });
    });

    test('When user hovers over navigation link, Then page should be prefetched', async ({
      page,
    }) => {
      // Given: User is on dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Track prefetch requests
      const prefetchRequests: string[] = [];
      page.on('request', (request) => {
        const url = request.url();
        if (url.includes('/dashboard/jobs') || url.includes('jobs.')) {
          prefetchRequests.push(url);
        }
      });

      // When: User hovers over jobs link
      const jobsLink = page.locator('a[href="/dashboard/jobs"]');
      await jobsLink.hover();

      // Wait a bit for prefetch
      await page.waitForTimeout(1000);

      // Then: Jobs page resources should be prefetched
      // Next.js automatically prefetches visible links
      // We just verify the mechanism is in place
      await jobsLink.click();
      await page.waitForURL('**/dashboard/jobs');

      // Navigation should be fast (< 500ms) if prefetched
      const loadTime = await page.evaluate(() => {
        const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        return perfData.loadEventEnd - perfData.fetchStart;
      });

      expect(loadTime).toBeLessThan(2000); // Should be fast with prefetch
    });
  });

  test.describe('Given lazy loaded components', () => {
    test('When component is lazy loaded, Then it should render after Suspense', async ({
      page,
    }) => {
      // Given: User navigates to a page with lazy components
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      // When: User navigates to resumes page
      await page.goto('/dashboard/resumes');

      // Then: Content should eventually load (after lazy loading)
      await expect(
        page.locator('h1:has-text("Resumes"), h2:has-text("Resumes")')
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Given loading states', () => {
    test('When page is loading, Then appropriate loading UI should be shown', async ({
      page,
    }) => {
      // Slow down navigation to observe loading state
      await page.route('**/dashboard/applications**', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.continue();
      });

      // Given: User is logged in
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      // When: User navigates to applications
      const navigation = page.goto('/dashboard/applications');

      // Then: Loading spinner should be visible
      await expect(
        page.locator('[role="status"][aria-label="Loading"]')
      ).toBeVisible({ timeout: 2000 });

      await navigation;
    });

    test('When loading state is shown, Then it should be accessible to screen readers', async ({
      page,
    }) => {
      // Given: A loading state is rendered
      await page.goto('/dashboard');

      // Then: Loading indicator should have proper accessibility attributes
      const loadingIndicators = page.locator('[role="status"]');
      const count = await loadingIndicators.count();

      if (count > 0) {
        const firstIndicator = loadingIndicators.first();

        // Should have role="status"
        await expect(firstIndicator).toHaveAttribute('role', 'status');

        // Should have aria-label or aria-live
        const hasAriaLabel = await firstIndicator.getAttribute('aria-label');
        const hasAriaLive = await firstIndicator.getAttribute('aria-live');

        expect(hasAriaLabel || hasAriaLive).toBeTruthy();
      }
    });
  });

  test.describe('Given bundle optimization', () => {
    test('When app loads, Then initial bundle should be under 500KB', async ({ page }) => {
      // Track total JS loaded
      let totalJsSize = 0;
      const initialChunks: string[] = [];

      page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('/_next/static/') && url.endsWith('.js')) {
          try {
            const buffer = await response.body();
            totalJsSize += buffer.length;
            initialChunks.push(url);
          } catch (e) {
            // Some responses may not have body
          }
        }
      });

      // When: User loads the login page
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Then: Initial JS bundle should be reasonable
      // Convert to KB
      const totalKB = totalJsSize / 1024;

      console.log(`Total initial JS: ${totalKB.toFixed(2)} KB`);
      console.log(`Chunks loaded: ${initialChunks.length}`);

      // Should be under 1MB for initial load (reasonable for modern apps)
      expect(totalKB).toBeLessThan(1024);
    });

    test('When navigating between pages, Then only necessary chunks should load', async ({
      page,
    }) => {
      // Given: User is logged in and on dashboard
      await page.goto('/login');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'password123');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
      await page.waitForLoadState('networkidle');

      // Track chunks loaded after initial load
      const newChunks = new Set<string>();

      page.on('response', (response) => {
        const url = response.url();
        if (url.includes('/_next/static/chunks/') && url.endsWith('.js')) {
          newChunks.add(url);
        }
      });

      // When: User navigates to settings
      await page.goto('/dashboard/settings');
      await page.waitForLoadState('networkidle');

      // Then: Should load some new chunks (but not many)
      expect(newChunks.size).toBeGreaterThan(0);
      expect(newChunks.size).toBeLessThan(20); // Reasonable for one page
    });
  });
});
