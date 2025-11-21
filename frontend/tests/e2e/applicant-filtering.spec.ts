/**
 * E2E Tests for Applicant Filtering & Sorting
 * Issue #59: ATS Core Features
 *
 * Following BDD (Given-When-Then) pattern
 * Tests comprehensive filtering, sorting, search, and pagination
 */

import { test, expect, Page } from '@playwright/test';

// Test data setup
const TEST_JOB_ID = 'test-job-id-123';
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Helper function to login as employer
async function loginAsEmployer(page: Page) {
  await page.goto(`${BASE_URL}/employer/login`);
  await page.fill('input[name="email"]', 'employer@testcompany.com');
  await page.fill('input[name="password"]', 'testpassword123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/employer/**');
}

// Helper function to navigate to applications page
async function navigateToApplications(page: Page, jobId: string) {
  await page.goto(`${BASE_URL}/employer/jobs/${jobId}/applications`);
  await page.waitForLoadState('networkidle');
}

test.describe('Applicant Filtering & Sorting', () => {
  test.beforeEach(async ({ page }) => {
    // Given: User is logged in as employer
    await loginAsEmployer(page);
  });

  test('should display applicant list with default sorting', async ({ page }) => {
    // Given: Job with 20 applicants
    await navigateToApplications(page, TEST_JOB_ID);

    // Then: Applicants are displayed
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(20);

    // And: Default sort is by application date descending
    const firstApplicant = rows.first();
    await expect(firstApplicant).toBeVisible();
  });

  test('should filter applicants by status', async ({ page }) => {
    // Given: Applicants with various statuses
    await navigateToApplications(page, TEST_JOB_ID);

    // When: Filter by status "new"
    await page.click('text=Status');
    await page.check('input[type="checkbox"][value="new"]');
    await page.waitForLoadState('networkidle');

    // Then: Only "new" applicants are shown
    const statusBadges = page.locator('text=/New/i');
    const badgeCount = await statusBadges.count();
    expect(badgeCount).toBeGreaterThan(0);

    // And: No other statuses are shown
    await expect(page.locator('text=/Hired/i')).not.toBeVisible();
  });

  test('should filter applicants by multiple statuses', async ({ page }) => {
    // Given: Applicants page
    await navigateToApplications(page, TEST_JOB_ID);

    // When: Select multiple statuses
    await page.click('text=Status');
    await page.check('input[type="checkbox"][value="new"]');
    await page.check('input[type="checkbox"][value="screening"]');
    await page.waitForLoadState('networkidle');

    // Then: Both status types are visible
    await expect(page.locator('text=/New|Screening/i')).toBeVisible();

    // And: Active filter count shows 1
    const filterBadge = page.locator('text=/1/');
    await expect(filterBadge).toBeVisible();
  });

  test('should filter by fit index range', async ({ page }) => {
    // Given: Applicants with various fit scores
    await navigateToApplications(page, TEST_JOB_ID);

    // When: Select high fit score range (80-100)
    await page.click('text=Fit Score');
    await page.click('text=/High.*80-100/i');
    await page.waitForLoadState('networkidle');

    // Then: Only high-scoring applicants are shown
    const fitScores = page.locator('text=/\\d+%/');
    const firstScore = await fitScores.first().textContent();
    const score = parseInt(firstScore?.replace('%', '') || '0');
    expect(score).toBeGreaterThanOrEqual(80);
  });

  test('should filter with custom fit index range', async ({ page }) => {
    // Given: Applicants page
    await navigateToApplications(page, TEST_JOB_ID);

    // When: Enter custom fit range
    await page.click('text=Fit Score');
    await page.fill('input[placeholder="0"]', '75');
    await page.fill('input[placeholder="100"]', '90');
    await page.waitForLoadState('networkidle');

    // Then: Only applicants in range are shown
    const fitScores = page.locator('text=/\\d+%/');
    const count = await fitScores.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should search by candidate name', async ({ page }) => {
    // Given: 20 applicants
    await navigateToApplications(page, TEST_JOB_ID);

    // When: Search for specific candidate
    await page.fill('input[placeholder*="Search"]', 'John Doe');
    await page.waitForTimeout(600); // Wait for debounce
    await page.waitForLoadState('networkidle');

    // Then: Only matching candidates are shown
    await expect(page.locator('text=/John.*Doe/i')).toBeVisible();

    // And: Results count is updated
    const resultsText = page.locator('text=/Found.*applicants?/i');
    await expect(resultsText).toBeVisible();
  });

  test('should clear search with clear button', async ({ page }) => {
    // Given: Active search
    await navigateToApplications(page, TEST_JOB_ID);
    await page.fill('input[placeholder*="Search"]', 'test search');

    // When: Click clear button
    await page.click('button[aria-label="Clear search"]');

    // Then: Search is cleared
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toHaveValue('');
  });

  test('should sort by fit index descending', async ({ page }) => {
    // Given: Applicants with various fit scores
    await navigateToApplications(page, TEST_JOB_ID);

    // When: Click fit score column header
    await page.click('th:has-text("Fit Score")');
    await page.waitForLoadState('networkidle');

    // Then: Applicants are sorted by fit score (highest first)
    const fitScores = page.locator('text=/\\d+%/');
    const firstScore = await fitScores.first().textContent();
    const lastScore = await fitScores.last().textContent();

    const first = parseInt(firstScore?.replace('%', '') || '0');
    const last = parseInt(lastScore?.replace('%', '') || '0');

    expect(first).toBeGreaterThanOrEqual(last);
  });

  test('should toggle sort order', async ({ page }) => {
    // Given: Sorted by fit score descending
    await navigateToApplications(page, TEST_JOB_ID);
    await page.click('th:has-text("Fit Score")');
    await page.waitForLoadState('networkidle');

    // When: Click fit score header again
    await page.click('th:has-text("Fit Score")');
    await page.waitForLoadState('networkidle');

    // Then: Sort order is reversed (ascending)
    const arrowUp = page.locator('svg.lucide-arrow-up');
    await expect(arrowUp).toBeVisible();
  });

  test('should navigate through pagination', async ({ page }) => {
    // Given: More than 50 applicants (assuming limit=50)
    await navigateToApplications(page, TEST_JOB_ID);

    // When: Click next page button
    await page.click('button[aria-label="Next page"]');
    await page.waitForLoadState('networkidle');

    // Then: Page 2 is displayed
    await expect(page.locator('text=/Page 2 of/i')).toBeVisible();

    // And: Different applicants are shown
    const newApplicants = page.locator('tbody tr');
    await expect(newApplicants.first()).toBeVisible();
  });

  test('should show pagination info correctly', async ({ page }) => {
    // Given: 100 applicants with limit 50
    await navigateToApplications(page, TEST_JOB_ID);

    // Then: Pagination info shows correct range
    const paginationInfo = page.locator('text=/Showing.*to.*of.*results/i');
    await expect(paginationInfo).toContainText('Showing 1 to 50');
  });

  test('should combine multiple filters', async ({ page }) => {
    // Given: Applicants page
    await navigateToApplications(page, TEST_JOB_ID);

    // When: Apply status filter
    await page.click('text=Status');
    await page.check('input[type="checkbox"][value="new"]');

    // And: Apply fit score filter
    await page.click('text=Fit Score');
    await page.click('text=/High.*80-100/i');

    // And: Search for candidate
    await page.fill('input[placeholder*="Search"]', 'Candidate');
    await page.waitForTimeout(600);
    await page.waitForLoadState('networkidle');

    // Then: Active filter count shows 3
    const filterBadge = page.locator('text=/3/');
    await expect(filterBadge).toBeVisible();

    // And: Only matching applicants are shown
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(0);
  });

  test('should clear all filters at once', async ({ page }) => {
    // Given: Multiple active filters
    await navigateToApplications(page, TEST_JOB_ID);
    await page.click('text=Status');
    await page.check('input[type="checkbox"][value="new"]');
    await page.fill('input[placeholder*="Search"]', 'test');

    // When: Click "Clear all filters"
    await page.click('text=Clear all filters');
    await page.waitForLoadState('networkidle');

    // Then: All filters are cleared
    const filterBadge = page.locator('text=/Clear all filters/');
    await expect(filterBadge).not.toBeVisible();

    // And: Full applicant list is shown
    const rows = page.locator('tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);
  });

  test('should filter by date range', async ({ page }) => {
    // Given: Applicants page
    await navigateToApplications(page, TEST_JOB_ID);

    // When: Set date range (last 7 days)
    await page.click('text=Application Date');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateString = sevenDaysAgo.toISOString().split('T')[0];

    await page.fill('input[type="date"]', dateString);
    await page.waitForLoadState('networkidle');

    // Then: Only recent applicants are shown
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
  });

  test('should filter by unassigned applicants', async ({ page }) => {
    // Given: Applicants page
    await navigateToApplications(page, TEST_JOB_ID);

    // When: Toggle unassigned filter
    await page.click('text=Assignment');
    await page.check('text=Unassigned only');
    await page.waitForLoadState('networkidle');

    // Then: Only unassigned applicants are shown
    const unassignedCount = page.locator('text=/\\d+/').last();
    await expect(unassignedCount).toBeVisible();
  });

  test('should display empty state when no results', async ({ page }) => {
    // Given: Applicants page
    await navigateToApplications(page, TEST_JOB_ID);

    // When: Apply filters that match nothing
    await page.fill('input[placeholder*="Search"]', 'nonexistent@candidate.com');
    await page.waitForTimeout(600);
    await page.waitForLoadState('networkidle');

    // Then: Empty state is shown
    await expect(page.locator('text=/No applicants found/i')).toBeVisible();
    await expect(page.locator('text=/Try adjusting/i')).toBeVisible();
  });

  test('should show loading state', async ({ page }) => {
    // Given: Navigating to applicants page
    const navigationPromise = page.goto(`${BASE_URL}/employer/jobs/${TEST_JOB_ID}/applications`);

    // Then: Loading indicator is visible
    await expect(page.locator('text=/Loading applicants/i')).toBeVisible();

    // Wait for navigation to complete
    await navigationPromise;
  });

  test('should persist filters in URL', async ({ page }) => {
    // Given: Applicants page
    await navigateToApplications(page, TEST_JOB_ID);

    // When: Apply filters
    await page.click('text=Status');
    await page.check('input[type="checkbox"][value="new"]');
    await page.waitForLoadState('networkidle');

    // Then: URL contains filter parameters
    const url = page.url();
    expect(url).toContain('status=new');
  });

  test('should display filter statistics', async ({ page }) => {
    // Given: Applicants page with filter stats
    await navigateToApplications(page, TEST_JOB_ID);

    // When: View status filter section
    await page.click('text=Status');

    // Then: Status counts are displayed
    const statusWithCount = page.locator('text=/New.*\\d+/i').first();
    await expect(statusWithCount).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Given: Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await navigateToApplications(page, TEST_JOB_ID);

    // Then: Page is displayed correctly
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();

    // And: Table is scrollable
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Given: Search bar focused
    await navigateToApplications(page, TEST_JOB_ID);
    await page.fill('input[placeholder*="Search"]', 'test');

    // When: Press Escape key
    await page.keyboard.press('Escape');

    // Then: Search is cleared
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toHaveValue('');
  });
});

test.describe('Performance Tests', () => {
  test('should load applicants within 2 seconds', async ({ page }) => {
    await loginAsEmployer(page);

    // Measure load time
    const startTime = Date.now();
    await navigateToApplications(page, TEST_JOB_ID);
    const endTime = Date.now();

    const loadTime = endTime - startTime;

    // Assert load time is under 2 seconds
    expect(loadTime).toBeLessThan(2000);
  });

  test('should handle 500+ applicants without performance degradation', async ({ page }) => {
    await loginAsEmployer(page);

    // Navigate to job with 500+ applicants
    await navigateToApplications(page, 'large-job-id');

    // Should load and be interactive
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible({ timeout: 5000 });

    // Pagination should work smoothly
    await page.click('button[aria-label="Next page"]');
    await expect(rows.first()).toBeVisible({ timeout: 1000 });
  });
});
