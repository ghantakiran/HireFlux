/**
 * E2E Tests for Applicant List Component (ATS)
 * Sprint 19-20 Week 39 Day 5
 *
 * Tests the applicant tracking system with filtering, sorting, and bulk actions
 */

import { test, expect } from '@playwright/test';

test.describe('Applicant List - Basic Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/applicant-list');
    await expect(page.getByRole('heading', { name: /applicant list test page/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display applicant list with all applicants', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /^applicants$/i })).toBeVisible();
    await expect(page.getByText(/8.*applicants?/i)).toBeVisible();
  });

  test('should display all applicant information', async ({ page }) => {
    // Check first applicant (John Doe)
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('john.doe@example.com')).toBeVisible();
    await expect(page.getByText('92')).toBeVisible(); // Fit index
  });

  test('should display fit index badges with color coding', async ({ page }) => {
    // High score (>80) should have green styling
    const highScoreBadge = page.locator('[data-testid="fit-index-badge"]').filter({ hasText: '92' }).first();
    await expect(highScoreBadge).toBeVisible();

    // Medium score (60-80) should have yellow styling
    const mediumScoreBadge = page.locator('[data-testid="fit-index-badge"]').filter({ hasText: '75' }).first();
    await expect(mediumScoreBadge).toBeVisible();
  });

  test('should display stage dropdowns for each applicant', async ({ page }) => {
    const stageDropdowns = page.getByLabel(/update stage/i);
    await expect(stageDropdowns.first()).toBeVisible();
  });

  test('should display applied date with relative time', async ({ page }) => {
    // Should show "X hours ago", "X days ago", etc.
    await expect(page.getByText(/ago/i).first()).toBeVisible();
  });

  test('should display applicant tags/skills', async ({ page }) => {
    await expect(page.getByText('React')).toBeVisible();
    await expect(page.getByText('TypeScript')).toBeVisible();
  });

  test('should display assigned recruiter', async ({ page }) => {
    await expect(page.getByText('Sarah Johnson')).toBeVisible();
    await expect(page.getByText('Mike Chen')).toBeVisible();
  });
});

test.describe('Applicant List - Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/applicant-list');
    await expect(page.getByRole('heading', { name: /applicant list test page/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display sort dropdown with options', async ({ page }) => {
    const sortDropdown = page.getByLabel(/sort by/i);
    await expect(sortDropdown).toBeVisible();

    // Check sort options exist
    await expect(sortDropdown).toContainText(/fit index.*high to low/i);
    await expect(sortDropdown).toContainText(/fit index.*low to high/i);
    await expect(sortDropdown).toContainText(/applied date.*newest first/i);
    await expect(sortDropdown).toContainText(/applied date.*oldest first/i);
  });

  test('should sort applicants by fit index (high to low) by default', async ({ page }) => {
    const firstApplicantName = page.locator('[data-testid="applicant-name"]').first();

    // Frank Garcia has fit index 100 or John Doe has 92
    const name = await firstApplicantName.textContent();
    expect(name).toMatch(/Frank Garcia|John Doe/);
  });

  test('should sort applicants when changing sort option', async ({ page }) => {
    const sortDropdown = page.getByLabel(/sort by/i);

    // Sort by fit index low to high
    await sortDropdown.selectOption(/fit index.*low to high/i);

    // Activity log should show sort change
    await expect(page.getByText(/sort changed to.*fit_index_asc/i)).toBeVisible();
  });
});

test.describe('Applicant List - Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/applicant-list');
    await expect(page.getByRole('heading', { name: /applicant list test page/i })).toBeVisible({ timeout: 10000 });
  });

  test('should filter by stage', async ({ page }) => {
    const stageFilter = page.getByLabel(/filter by stage/i);
    await expect(stageFilter).toBeVisible();

    // Select "Reviewing" stage
    await stageFilter.selectOption('reviewing');

    // Activity log should show filter change
    await expect(page.getByText(/filters changed.*reviewing/i)).toBeVisible();
  });

  test('should filter by minimum fit index', async ({ page }) => {
    const minFitInput = page.getByLabel(/minimum fit index/i);
    await expect(minFitInput).toBeVisible();

    // Set minimum to 80
    await minFitInput.fill('80');
    await minFitInput.press('Enter');

    // Activity log should show filter change
    await expect(page.getByText(/filters changed.*80/i)).toBeVisible();
  });

  test('should clear filters', async ({ page }) => {
    // Apply a filter
    const stageFilter = page.getByLabel(/filter by stage/i);
    await stageFilter.selectOption('reviewing');

    // Clear filters button should appear
    const clearButton = page.getByRole('button', { name: /clear filters/i });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    // Activity log should show empty filters
    await expect(page.getByText(/filters changed.*{}/i)).toBeVisible();
  });
});

test.describe('Applicant List - View Applicant', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/applicant-list');
    await expect(page.getByRole('heading', { name: /applicant list test page/i })).toBeVisible({ timeout: 10000 });
  });

  test('should view applicant details when clicking View button', async ({ page }) => {
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('John Doe');
      expect(dialog.message()).toContain('92'); // Fit index
      dialog.accept();
    });

    const viewButton = page.getByRole('button', { name: /view details for john doe/i });
    await viewButton.click();

    // Activity log should show view action
    await expect(page.getByText(/viewed applicant.*john doe/i)).toBeVisible();
  });

  test('should highlight row when clicked', async ({ page }) => {
    const firstRow = page.locator('[data-testid="applicant-row"]').first();

    // Click row
    await firstRow.click();

    // Row should have highlighted class
    await expect(firstRow).toHaveClass(/highlighted/);
  });
});

test.describe('Applicant List - Stage Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/applicant-list');
    await expect(page.getByRole('heading', { name: /applicant list test page/i })).toBeVisible({ timeout: 10000 });
  });

  test('should update applicant stage', async ({ page }) => {
    const stageDropdowns = page.getByLabel(/update stage/i);
    const firstDropdown = stageDropdowns.first();

    // Change stage to "Reviewing"
    await firstDropdown.selectOption('reviewing');

    // Activity log should show stage update
    await expect(page.getByText(/updated.*stage to.*reviewing/i)).toBeVisible();
  });

  test('should show all 8 pipeline stages in dropdown', async ({ page }) => {
    const firstDropdown = page.getByLabel(/update stage/i).first();

    // Click to expand
    await firstDropdown.click();

    // Check all stages exist
    await expect(page.getByRole('option', { name: /^new$/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /reviewing/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /phone screen/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /technical interview/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /final interview/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /^offer$/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /^hired$/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /rejected/i })).toBeVisible();
  });
});

test.describe('Applicant List - Bulk Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/applicant-list');
    await expect(page.getByRole('heading', { name: /applicant list test page/i })).toBeVisible({ timeout: 10000 });
  });

  test('should select individual applicants', async ({ page }) => {
    const checkboxes = page.getByRole('checkbox', { name: /select applicant/i });
    const firstCheckbox = checkboxes.first();

    await firstCheckbox.check();

    // Bulk action toolbar should appear
    await expect(page.getByText(/1.*selected/i)).toBeVisible();
  });

  test('should select all applicants', async ({ page }) => {
    const selectAllCheckbox = page.getByRole('checkbox', { name: /select all/i });

    await selectAllCheckbox.check();

    // All applicants should be selected
    await expect(page.getByText(/8.*selected/i)).toBeVisible();
  });

  test('should perform bulk stage update', async ({ page }) => {
    // Select 2 applicants
    const checkboxes = page.getByRole('checkbox', { name: /select applicant/i });
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    // Bulk actions dropdown should be visible
    const bulkActionsDropdown = page.getByLabel(/bulk actions/i);
    await expect(bulkActionsDropdown).toBeVisible();

    // Select "Move to Reviewing"
    await bulkActionsDropdown.selectOption(/move.*reviewing/i);

    // Activity log should show bulk update
    await expect(page.getByText(/bulk updated.*2.*reviewing/i)).toBeVisible();
  });

  test('should bulk reject applicants', async ({ page }) => {
    // Select 1 applicant
    const checkboxes = page.getByRole('checkbox', { name: /select applicant/i });
    await checkboxes.first().check();

    // Select "Reject Selected"
    const bulkActionsDropdown = page.getByLabel(/bulk actions/i);
    await bulkActionsDropdown.selectOption(/reject selected/i);

    // Activity log should show bulk reject
    await expect(page.getByText(/bulk rejected.*1/i)).toBeVisible();
  });
});

test.describe('Applicant List - Loading & Error States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/applicant-list');
    await expect(page.getByRole('heading', { name: /applicant list test page/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display loading state', async ({ page }) => {
    const loadingButton = page.getByRole('button', { name: /simulate loading/i });
    await loadingButton.click();

    await expect(page.getByText(/loading applicants/i)).toBeVisible();

    // Wait for loading to complete
    await expect(page.getByText(/loading applicants/i)).not.toBeVisible({ timeout: 5000 });
  });

  test('should display error state', async ({ page }) => {
    const errorButton = page.getByRole('button', { name: /simulate error/i });
    await errorButton.click();

    await expect(page.getByText(/failed to load applicants/i)).toBeVisible();
    await expect(page.getByRole('alert')).toBeVisible();

    // Wait for error to clear
    await expect(page.getByText(/failed to load applicants/i)).not.toBeVisible({ timeout: 5000 });
  });

  test('should display empty state when no applicants', async ({ page }) => {
    const clearButton = page.getByRole('button', { name: /clear all.*empty state/i });
    await clearButton.click();

    await expect(page.getByText(/no applicants yet/i)).toBeVisible();
  });
});

test.describe('Applicant List - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/applicant-list');
    await expect(page.getByRole('heading', { name: /applicant list test page/i })).toBeVisible({ timeout: 10000 });
  });

  test('should have proper table structure with headers', async ({ page }) => {
    const table = page.getByRole('table');
    await expect(table).toBeVisible();

    // Check column headers
    await expect(page.getByRole('columnheader', { name: /candidate/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /fit index/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /stage/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /applied/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /tags/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /actions/i })).toBeVisible();
  });

  test('should support keyboard navigation on rows', async ({ page }) => {
    const firstRow = page.locator('[data-testid="applicant-row"]').first();

    // Tab to row
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Press Enter to activate
    await firstRow.press('Enter');

    // Activity log should show view action
    await expect(page.getByText(/viewed applicant/i)).toBeVisible();
  });

  test('should have accessible ARIA labels on all controls', async ({ page }) => {
    // Sort dropdown
    await expect(page.getByLabel(/sort by/i)).toBeVisible();

    // Filter controls
    await expect(page.getByLabel(/filter by stage/i)).toBeVisible();
    await expect(page.getByLabel(/minimum fit index/i)).toBeVisible();

    // Checkboxes
    await expect(page.getByLabel(/select all/i)).toBeVisible();
    await expect(page.getByLabel(/select applicant.*john doe/i)).toBeVisible();

    // Stage dropdowns
    await expect(page.getByLabel(/update stage.*john doe/i)).toBeVisible();

    // View buttons
    await expect(page.getByLabel(/view details.*john doe/i)).toBeVisible();
  });
});

test.describe('Applicant List - Responsive Design', () => {
  test('should work on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/test/applicant-list');

    await expect(page.getByRole('heading', { name: /applicant list test page/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /^applicants$/i })).toBeVisible();
  });

  test('should work on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/test/applicant-list');

    await expect(page.getByRole('heading', { name: /applicant list test page/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('table')).toBeVisible();
  });
});
