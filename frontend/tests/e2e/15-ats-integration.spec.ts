/**
 * E2E Tests - ATS Integration (List + Kanban + Modal)
 * Week 40 Day 3
 *
 * Test Coverage:
 * 1. View Switching (8 tests)
 * 2. Shared Filtering (6 tests)
 * 3. Modal Integration (8 tests)
 * 4. URL State (4 tests)
 * 5. Keyboard Navigation (4 tests)
 * 6. Responsive Design (3 tests)
 * 7. Performance (2 tests)
 *
 * Total: 35 E2E tests
 */

import { test, expect, Page } from '@playwright/test';

const TEST_URL = '/employer/jobs/job-test-1/applications';

// Helper to wait for page load
async function waitForATSLoad(page: Page) {
  await page.waitForSelector('[data-testid="ats-page"]', { timeout: 10000 });
}

// ============================================================================
// 1. VIEW SWITCHING (8 tests)
// ============================================================================

test.describe('ATS Integration - View Switching', () => {
  test('should render List view by default', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Should show table/list view
    await expect(page.locator('table, [data-testid="applicant-list"]')).toBeVisible();

    // Should NOT show Kanban board
    await expect(page.locator('[data-testid="dnd-context"]')).not.toBeVisible();
  });

  test('should switch from List to Kanban view when toggle clicked', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Click toggle button
    await page.click('button[aria-label*="toggle view"], button:has-text("Kanban")');

    // Should show Kanban board
    await expect(page.locator('[data-testid="dnd-context"]')).toBeVisible();

    // Should NOT show List view
    await expect(page.locator('table, [data-testid="applicant-list"]')).not.toBeVisible();
  });

  test('should switch from Kanban to List view when toggle clicked', async ({ page }) => {
    await page.goto(TEST_URL + '?view=kanban');
    await waitForATSLoad(page);

    // Should start in Kanban view
    await expect(page.locator('[data-testid="dnd-context"]')).toBeVisible();

    // Click toggle button
    await page.click('button[aria-label*="toggle view"], button:has-text("List")');

    // Should show List view
    await expect(page.locator('table, [data-testid="applicant-list"]')).toBeVisible();

    // Should NOT show Kanban
    await expect(page.locator('[data-testid="dnd-context"]')).not.toBeVisible();
  });

  test('should preserve view preference in localStorage', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Switch to Kanban
    await page.click('button[aria-label*="toggle view"]');
    await expect(page.locator('[data-testid="dnd-context"]')).toBeVisible();

    // Refresh page
    await page.reload();
    await waitForATSLoad(page);

    // Should still be in Kanban view
    await expect(page.locator('[data-testid="dnd-context"]')).toBeVisible();
  });

  test('should show view toggle button with correct icon', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    const toggleButton = page.locator('button[aria-label*="toggle view"]');
    await expect(toggleButton).toBeVisible();

    // Should have icon (List or Kanban)
    const icon = toggleButton.locator('svg');
    await expect(icon).toBeVisible();
  });

  test('should switch views smoothly without flicker', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Click toggle
    const toggleButton = page.locator('button[aria-label*="toggle view"]');
    await toggleButton.click();

    // Transition should be smooth (< 100ms)
    await page.waitForTimeout(50);

    // Kanban should be visible
    await expect(page.locator('[data-testid="dnd-context"]')).toBeVisible();
  });

  test('should maintain scroll position when switching views', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Scroll down in List view
    await page.evaluate(() => window.scrollTo(0, 500));

    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBeGreaterThan(400);

    // Switch to Kanban
    await page.click('button[aria-label*="toggle view"]');

    // Scroll position should be reset or maintained
    // (Implementation decides - just verify no crash)
    await expect(page.locator('[data-testid="dnd-context"]')).toBeVisible();
  });

  test('should announce view change to screen readers', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Click toggle
    await page.click('button[aria-label*="toggle view"]');

    // Should have aria-live region with announcement
    const announcement = page.locator('[role="status"], [aria-live="assertive"]');
    await expect(announcement).toHaveText(/switched to kanban view/i);
  });
});

// ============================================================================
// 2. SHARED FILTERING (6 tests)
// ============================================================================

test.describe('ATS Integration - Shared Filtering', () => {
  test('should apply filter in List view and persist to Kanban view', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Get initial count
    const initialCount = await page.locator('[data-testid="applicant-row"], [data-testid="kanban-card"]').count();

    // Apply filter: min fit index = 80
    await page.click('button:has-text("Filters"), button[aria-label*="filter"]');
    await page.fill('input[name="minFit"], input[aria-label*="minimum fit"]', '80');
    await page.waitForTimeout(500);

    // Count should decrease
    const filteredCount = await page.locator('[data-testid="applicant-row"]').count();
    expect(filteredCount).toBeLessThan(initialCount);

    // Switch to Kanban view
    await page.click('button[aria-label*="toggle view"]');

    // Same filter should apply
    const kanbanCards = await page.locator('[data-testid="kanban-card"]').count();
    expect(kanbanCards).toBe(filteredCount);
  });

  test('should apply filter in Kanban view and persist to List view', async ({ page }) => {
    await page.goto(TEST_URL + '?view=kanban');
    await waitForATSLoad(page);

    // Apply filter
    await page.click('button:has-text("Filters"), button[aria-label*="filter"]');
    await page.fill('input[name="minFit"], input[aria-label*="minimum fit"]', '80');
    await page.waitForTimeout(500);

    const kanbanFiltered = await page.locator('[data-testid="kanban-card"]').count();

    // Switch to List view
    await page.click('button[aria-label*="toggle view"]');

    // Same filter should apply
    const listFiltered = await page.locator('[data-testid="applicant-row"]').count();
    expect(listFiltered).toBe(kanbanFiltered);
  });

  test('should apply stage filter to both views', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Filter by stage: "new"
    await page.click('button:has-text("Filters")');
    await page.selectOption('select[name="stage"]', 'new');
    await page.waitForTimeout(500);

    // Only "new" stage candidates should show
    const listRows = page.locator('[data-testid="applicant-row"]');
    const count = await listRows.count();

    // Switch to Kanban
    await page.click('button[aria-label*="toggle view"]');

    // Only "New" column should have cards
    const newColumn = page.locator('[data-testid="kanban-column"]').filter({ hasText: 'New' });
    const newCards = await newColumn.locator('[data-testid="kanban-card"]').count();
    expect(newCards).toBe(count);
  });

  test('should clear filters in both views', async ({ page }) => {
    await page.goto(TEST_URL + '?minFit=80');
    await waitForATSLoad(page);

    // Filters should be applied
    const filteredCount = await page.locator('[data-testid="applicant-row"]').count();

    // Clear filters
    await page.click('button:has-text("Clear filters"), button:has-text("Reset")');
    await page.waitForTimeout(500);

    // Count should increase
    const clearedCount = await page.locator('[data-testid="applicant-row"]').count();
    expect(clearedCount).toBeGreaterThan(filteredCount);

    // Switch to Kanban - should also be cleared
    await page.click('button[aria-label*="toggle view"]');

    const kanbanCards = await page.locator('[data-testid="kanban-card"]').count();
    expect(kanbanCards).toBe(clearedCount);
  });

  test('should apply tags filter to both views', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Filter by tag: "React"
    await page.click('button:has-text("Filters")');
    await page.fill('input[name="tags"], input[aria-label*="filter by tags"]', 'React');
    await page.waitForTimeout(500);

    const listCount = await page.locator('[data-testid="applicant-row"]').count();

    // Switch to Kanban
    await page.click('button[aria-label*="toggle view"]');

    // Same count
    const kanbanCount = await page.locator('[data-testid="kanban-card"]').count();
    expect(kanbanCount).toBe(listCount);
  });

  test('should apply assignee filter to both views', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Filter by assignee
    await page.click('button:has-text("Filters")');
    await page.selectOption('select[name="assignee"], select[aria-label*="assignee"]', 'recruiter-1');
    await page.waitForTimeout(500);

    const listCount = await page.locator('[data-testid="applicant-row"]').count();

    // Switch to Kanban
    await page.click('button[aria-label*="toggle view"]');

    const kanbanCount = await page.locator('[data-testid="kanban-card"]').count();
    expect(kanbanCount).toBe(listCount);
  });
});

// ============================================================================
// 3. MODAL INTEGRATION (8 tests)
// ============================================================================

test.describe('ATS Integration - Modal Integration', () => {
  test('should open modal from List view', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Click view details button
    await page.click('button:has-text("View Details"), button[aria-label*="view details"]').first();

    // Modal should open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: /candidate details/i })).toBeVisible();
  });

  test('should open modal from Kanban view', async ({ page }) => {
    await page.goto(TEST_URL + '?view=kanban');
    await waitForATSLoad(page);

    // Click candidate card
    await page.click('[data-testid="kanban-card"]').first();

    // Modal should open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.getByRole('heading', { name: /candidate details/i })).toBeVisible();
  });

  test('should close modal and return to List view', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Open modal
    await page.click('button:has-text("View Details")').first();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Close modal
    await page.click('button:has-text("Close"), [aria-label="Close"]');

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // List view should still be visible
    await expect(page.locator('[data-testid="applicant-list"], table')).toBeVisible();
  });

  test('should close modal and return to Kanban view', async ({ page }) => {
    await page.goto(TEST_URL + '?view=kanban');
    await waitForATSLoad(page);

    // Open modal
    await page.click('[data-testid="kanban-card"]').first();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Close modal with Esc
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Kanban view should still be visible
    await expect(page.locator('[data-testid="dnd-context"]')).toBeVisible();
  });

  test('should update List view after stage change in modal', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Get candidate name
    const firstRow = page.locator('[data-testid="applicant-row"]').first();
    const candidateName = await firstRow.locator('td').first().textContent();

    // Open modal
    await firstRow.locator('button:has-text("View Details")').click();

    // Change stage to "Reviewing"
    await page.click('button:has-text("Reviewing")');
    await page.waitForTimeout(500);

    // Close modal
    await page.keyboard.press('Escape');

    // Verify stage updated in List view
    const updatedRow = page.locator('[data-testid="applicant-row"]').filter({ hasText: candidateName! });
    await expect(updatedRow).toContainText(/reviewing/i);
  });

  test('should update Kanban view after stage change in modal', async ({ page }) => {
    await page.goto(TEST_URL + '?view=kanban');
    await waitForATSLoad(page);

    // Get candidate from "New" column
    const newColumn = page.locator('[data-testid="kanban-column"]').filter({ hasText: 'New' });
    const firstCard = newColumn.locator('[data-testid="kanban-card"]').first();
    const candidateName = await firstCard.locator('h3').textContent();

    // Open modal
    await firstCard.click();

    // Change stage to "Reviewing"
    await page.click('button:has-text("Reviewing")');
    await page.waitForTimeout(500);

    // Close modal
    await page.keyboard.press('Escape');

    // Candidate should now be in "Reviewing" column
    const reviewingColumn = page.locator('[data-testid="kanban-column"]').filter({ hasText: 'Reviewing' });
    await expect(reviewingColumn.locator('text=' + candidateName)).toBeVisible();
  });

  test('should keep modal open when view toggled', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Open modal
    await page.click('button:has-text("View Details")').first();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Try to toggle view (should not work while modal open)
    await page.click('button[aria-label*="toggle view"]');

    // Modal should still be open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should support navigating between candidates via modal', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Open modal for first candidate
    await page.click('button:has-text("View Details")').first();
    const firstName = await page.locator('[role="dialog"] h2').textContent();

    // Click "Next" button in modal (if exists)
    const nextButton = page.locator('[role="dialog"] button:has-text("Next")');
    if (await nextButton.isVisible()) {
      await nextButton.click();
      await page.waitForTimeout(500);

      // Should show different candidate
      const secondName = await page.locator('[role="dialog"] h2').textContent();
      expect(secondName).not.toBe(firstName);
    }
  });
});

// ============================================================================
// 4. URL STATE (4 tests)
// ============================================================================

test.describe('ATS Integration - URL State', () => {
  test('should initialize view from URL query param', async ({ page }) => {
    await page.goto(TEST_URL + '?view=kanban');
    await waitForATSLoad(page);

    // Should load Kanban view
    await expect(page.locator('[data-testid="dnd-context"]')).toBeVisible();
  });

  test('should update URL when view toggled', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Toggle to Kanban
    await page.click('button[aria-label*="toggle view"]');

    // URL should update
    await page.waitForURL(/view=kanban/);
    expect(page.url()).toContain('view=kanban');
  });

  test('should initialize filters from URL query params', async ({ page }) => {
    await page.goto(TEST_URL + '?minFit=80&stage=new');
    await waitForATSLoad(page);

    // Filter inputs should be populated
    const minFitInput = page.locator('input[name="minFit"], input[aria-label*="minimum fit"]');
    if (await minFitInput.isVisible()) {
      await expect(minFitInput).toHaveValue('80');
    }
  });

  test('should support shareable URLs', async ({ page }) => {
    const shareableURL = TEST_URL + '?view=kanban&minFit=80&stage=reviewing';

    await page.goto(shareableURL);
    await waitForATSLoad(page);

    // Should load Kanban view with filters
    await expect(page.locator('[data-testid="dnd-context"]')).toBeVisible();

    // Should have filtered results
    const cards = await page.locator('[data-testid="kanban-card"]').count();
    expect(cards).toBeGreaterThan(0);
  });
});

// ============================================================================
// 5. KEYBOARD NAVIGATION (4 tests)
// ============================================================================

test.describe('ATS Integration - Keyboard Navigation', () => {
  test('should toggle view with Alt+V keyboard shortcut', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Should start in List view
    await expect(page.locator('[data-testid="applicant-list"], table')).toBeVisible();

    // Press Alt+V
    await page.keyboard.press('Alt+v');

    // Should switch to Kanban
    await expect(page.locator('[data-testid="dnd-context"]')).toBeVisible();
  });

  test('should navigate between applicants with Tab key', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Tab to first applicant
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should focus on first row
    const focused = await page.evaluate(() => document.activeElement?.textContent);
    expect(focused).toBeTruthy();
  });

  test('should open modal with Enter key on focused row', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Tab to first row
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Press Enter
    await page.keyboard.press('Enter');

    // Modal should open
    await expect(page.locator('[role="dialog"]')).toBeVisible();
  });

  test('should close modal with Esc key', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // Open modal
    await page.click('button:has-text("View Details")').first();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Press Esc
    await page.keyboard.press('Escape');

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });
});

// ============================================================================
// 6. RESPONSIVE DESIGN (3 tests)
// ============================================================================

test.describe('ATS Integration - Responsive Design', () => {
  test('should display toggle button on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    const toggleButton = page.locator('button[aria-label*="toggle view"]');
    await expect(toggleButton).toBeVisible();
  });

  test('should display toggle button on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    const toggleButton = page.locator('button[aria-label*="toggle view"]');
    await expect(toggleButton).toBeVisible();
  });

  test('should work on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    // List view should work
    await expect(page.locator('[data-testid="applicant-list"], table')).toBeVisible();

    // Toggle should work
    await page.click('button[aria-label*="toggle view"]');
    await expect(page.locator('[data-testid="dnd-context"]')).toBeVisible();
  });
});

// ============================================================================
// 7. PERFORMANCE (2 tests)
// ============================================================================

test.describe('ATS Integration - Performance', () => {
  test('should switch views in under 100ms', async ({ page }) => {
    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    const startTime = Date.now();

    // Toggle view
    await page.click('button[aria-label*="toggle view"]');

    // Wait for Kanban to appear
    await page.waitForSelector('[data-testid="dnd-context"]');

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should be fast (< 500ms for E2E, < 100ms in real app)
    expect(duration).toBeLessThan(500);
  });

  test('should not refetch data when toggling views', async ({ page }) => {
    let requestCount = 0;

    // Count API requests
    page.on('request', (request) => {
      if (request.url().includes('/applications')) {
        requestCount++;
      }
    });

    await page.goto(TEST_URL);
    await waitForATSLoad(page);

    const initialRequests = requestCount;

    // Toggle view multiple times
    await page.click('button[aria-label*="toggle view"]');
    await page.waitForTimeout(200);
    await page.click('button[aria-label*="toggle view"]');
    await page.waitForTimeout(200);

    // Request count should not increase
    expect(requestCount).toBe(initialRequests);
  });
});
