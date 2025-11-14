/**
 * E2E Tests for Candidate Detail Modal Component
 * Sprint 19-20 Week 40 Day 1
 *
 * Tests the comprehensive candidate detail modal with:
 * - Modal open/close behavior
 * - Tab navigation (Overview, AI Fit Score, Notes)
 * - Status change workflow
 * - Notes management
 * - Accessibility
 */

import { test, expect } from '@playwright/test';

test.describe('Candidate Detail Modal - Basic Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/candidate-detail-modal');
    await expect(page.getByRole('heading', { name: /candidate detail modal test page/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display test page with all scenario cards', async ({ page }) => {
    await expect(page.getByText('High Fit Candidate')).toBeVisible();
    await expect(page.getByText('Medium Fit Candidate')).toBeVisible();
    await expect(page.getByText('Low Fit Candidate')).toBeVisible();
    await expect(page.getByText('With Existing Notes')).toBeVisible();
    await expect(page.getByText('No Notes Yet')).toBeVisible();
    await expect(page.getByText('Error Scenario')).toBeVisible();
  });

  test('should display mock mode controls', async ({ page }) => {
    await expect(page.getByRole('button', { name: /✓ Success/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /⏱ Slow/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /⚠ Error/i })).toBeVisible();
  });

  test('should show test results badge', async ({ page }) => {
    await expect(page.getByText(/56\/56 tests passing/i)).toBeVisible();
  });
});

test.describe('Candidate Detail Modal - Modal Open/Close', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/candidate-detail-modal');
    await expect(page.getByRole('heading', { name: /candidate detail modal test page/i })).toBeVisible({ timeout: 10000 });
  });

  test('should open modal when View Details clicked', async ({ page }) => {
    const viewButton = page.getByRole('button', { name: 'View Details' }).first();
    await viewButton.click();

    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();
  });

  test('should close modal when X button clicked', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    // Close via X button
    const closeButton = page.locator('button').filter({ has: page.locator('svg path[d*="M6 18L18 6"]') }).first();
    await closeButton.click();

    await expect(page.getByRole('heading', { name: 'Candidate Details' })).not.toBeVisible();
  });

  test('should close modal when Close button clicked', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    // Close via footer button
    await page.getByRole('button', { name: /^Close$/i }).click();

    await expect(page.getByRole('heading', { name: 'Candidate Details' })).not.toBeVisible();
  });

  test('should close modal when backdrop clicked', async ({ page }) => {
    // Open modal
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    // Click backdrop (outside modal)
    await page.locator('.bg-black.bg-opacity-50').click({ position: { x: 10, y: 10 } });

    await expect(page.getByRole('heading', { name: 'Candidate Details' })).not.toBeVisible();
  });

  test('should log modal open event', async ({ page }) => {
    await page.getByRole('button', { name: 'View Details' }).first().click();

    await expect(page.getByText(/Opening modal for: High Fit Candidate/i)).toBeVisible();
  });

  test('should log modal close event', async ({ page }) => {
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await page.getByRole('button', { name: /^Close$/i }).click();

    await expect(page.getByText(/Modal closed/i)).toBeVisible();
  });
});

test.describe('Candidate Detail Modal - Tab Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/candidate-detail-modal');
    await expect(page.getByRole('heading', { name: /candidate detail modal test page/i })).toBeVisible({ timeout: 10000 });

    // Open modal
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();
  });

  test('should display all three tabs', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('button', { name: /AI Fit Score/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Notes/i })).toBeVisible();
  });

  test('should default to Overview tab', async ({ page }) => {
    const overviewTab = page.getByRole('button', { name: 'Overview' });
    await expect(overviewTab).toHaveClass(/border-blue-500/);
  });

  test('should switch to AI Fit Score tab', async ({ page }) => {
    await page.getByRole('button', { name: /AI Fit Score/i }).click();

    await expect(page.getByText('Fit Score')).toBeVisible();
    await expect(page.getByText('Score Breakdown')).toBeVisible();
  });

  test('should switch to Notes tab', async ({ page }) => {
    await page.getByRole('button', { name: /Notes/i }).click();

    await expect(page.getByRole('heading', { name: 'Add Note' })).toBeVisible();
  });

  test('should highlight active tab', async ({ page }) => {
    const fitTab = page.getByRole('button', { name: /AI Fit Score/i });
    await fitTab.click();

    await expect(fitTab).toHaveClass(/border-blue-500/);
  });

  test('should show note count in tab label', async ({ page }) => {
    // Close and open with notes scenario
    await page.getByRole('button', { name: /^Close$/i }).click();
    await page.getByText('With Existing Notes').locator('..').locator('button').click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await expect(page.getByRole('button', { name: /Notes \(\d+\)/i })).toBeVisible();
  });
});

test.describe('Candidate Detail Modal - Loading States', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/candidate-detail-modal');
    await expect(page.getByRole('heading', { name: /candidate detail modal test page/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show loading spinner initially', async ({ page }) => {
    // Switch to slow mode
    await page.getByRole('button', { name: /⏱ Slow/i }).click();

    // Open modal
    await page.getByRole('button', { name: 'View Details' }).first().click();

    // Check for spinner
    const spinner = page.locator('.animate-spin');
    await expect(spinner).toBeVisible();
  });

  test('should hide loading spinner after data loads', async ({ page }) => {
    await page.getByRole('button', { name: 'View Details' }).first().click();

    await expect(page.getByText('Change Status')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Candidate Detail Modal - Overview Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/candidate-detail-modal');
    await expect(page.getByRole('heading', { name: /candidate detail modal test page/i })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();
  });

  test('should display candidate information section', async ({ page }) => {
    await expect(page.getByText('Candidate Information')).toBeVisible();
  });

  test('should display placeholder for candidate profile', async ({ page }) => {
    await expect(page.getByText(/Detailed candidate profile will be displayed/i)).toBeVisible();
  });

  test('should display Change Status section', async ({ page }) => {
    await expect(page.getByText('Change Status')).toBeVisible();
  });

  test('should display all 7 status buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Reviewing' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Phone Screen' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Technical' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Final Interview' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Offer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Hired' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Rejected' })).toBeVisible();
  });

  test('should allow clicking status buttons', async ({ page }) => {
    const reviewingBtn = page.getByRole('button', { name: 'Reviewing' });
    await reviewingBtn.click();

    // Check activity log
    await expect(page.getByText(/API Call: updateApplicationStatus/i)).toBeVisible();
  });
});

test.describe('Candidate Detail Modal - AI Fit Score Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/candidate-detail-modal');
    await expect(page.getByRole('heading', { name: /candidate detail modal test page/i })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await page.getByRole('button', { name: /AI Fit Score/i }).click();
  });

  test('should display overall fit score', async ({ page }) => {
    await expect(page.getByText('Fit Score')).toBeVisible();
    await expect(page.getByText('92')).toBeVisible();
  });

  test('should display Score Breakdown section', async ({ page }) => {
    await expect(page.getByText('Score Breakdown')).toBeVisible();
  });

  test('should display factor explanations', async ({ page }) => {
    await expect(page.getByText(/skills match/i)).toBeVisible();
    await expect(page.getByText(/experience/i)).toBeVisible();
    await expect(page.getByText(/location/i)).toBeVisible();
  });

  test('should display factor scores', async ({ page }) => {
    await expect(page.getByText('95/100')).toBeVisible();
    await expect(page.getByText('90/100')).toBeVisible();
    await expect(page.getByText('100/100')).toBeVisible();
  });

  test('should display progress bars', async ({ page }) => {
    const progressBars = page.locator('.bg-blue-600.h-2');
    await expect(progressBars.first()).toBeVisible();
  });

  test('should display Candidate Strengths section', async ({ page }) => {
    await expect(page.getByText('Candidate Strengths')).toBeVisible();
  });

  test('should display strengths list', async ({ page }) => {
    await expect(page.getByText(/Extensive React and TypeScript experience/i)).toBeVisible();
  });

  test('should display Potential Concerns section', async ({ page }) => {
    await expect(page.getByText('Potential Concerns')).toBeVisible();
  });

  test('should display concerns list', async ({ page }) => {
    await expect(page.getByText(/No GraphQL experience/i)).toBeVisible();
  });
});

test.describe('Candidate Detail Modal - Fit Score Variations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/candidate-detail-modal');
    await expect(page.getByRole('heading', { name: /candidate detail modal test page/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display high fit score (92)', async ({ page }) => {
    await page.getByText('High Fit Candidate').locator('..').locator('button').click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await page.getByRole('button', { name: /AI Fit Score/i }).click();
    await expect(page.getByText('92')).toBeVisible();
  });

  test('should display medium fit score (68)', async ({ page }) => {
    await page.getByText('Medium Fit Candidate').locator('..').locator('button').click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await page.getByRole('button', { name: /AI Fit Score/i }).click();
    await expect(page.getByText('68')).toBeVisible();
  });

  test('should display low fit score (42)', async ({ page }) => {
    await page.getByText('Low Fit Candidate').locator('..').locator('button').click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await page.getByRole('button', { name: /AI Fit Score/i }).click();
    await expect(page.getByText('42')).toBeVisible();
  });

  test('should display different concern counts for low fit', async ({ page }) => {
    await page.getByText('Low Fit Candidate').locator('..').locator('button').click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await page.getByRole('button', { name: /AI Fit Score/i }).click();

    // Should have more concerns
    await expect(page.getByText(/Lacks required years of experience/i)).toBeVisible();
    await expect(page.getByText(/No production React experience/i)).toBeVisible();
  });
});

test.describe('Candidate Detail Modal - Notes Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/candidate-detail-modal');
    await expect(page.getByRole('heading', { name: /candidate detail modal test page/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display add note form', async ({ page }) => {
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await page.getByRole('button', { name: /Notes/i }).click();

    await expect(page.getByRole('heading', { name: 'Add Note' })).toBeVisible();
    await expect(page.getByPlaceholder(/Enter your note/i)).toBeVisible();
  });

  test('should allow typing in note textarea', async ({ page }) => {
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await page.getByRole('button', { name: /Notes/i }).click();

    const textarea = page.getByPlaceholder(/Enter your note/i);
    await textarea.fill('This is a test note');

    await expect(textarea).toHaveValue('This is a test note');
  });

  test('should display visibility radio buttons', async ({ page }) => {
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await page.getByRole('button', { name: /Notes/i }).click();

    await expect(page.getByText('Team Visible')).toBeVisible();
    await expect(page.getByText('Private')).toBeVisible();
  });

  test('should allow toggling visibility', async ({ page }) => {
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await page.getByRole('button', { name: /Notes/i }).click();

    const privateRadio = page.getByLabel('Private');
    await privateRadio.click();

    await expect(privateRadio).toBeChecked();
  });

  test('should display Add Note button', async ({ page }) => {
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await page.getByRole('button', { name: /Notes/i }).click();

    await expect(page.getByRole('button', { name: /Add Note/i })).toBeVisible();
  });

  test('should submit note when button clicked', async ({ page }) => {
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await page.getByRole('button', { name: /Notes/i }).click();

    await page.getByPlaceholder(/Enter your note/i).fill('Test note');
    await page.getByRole('button', { name: /Add Note/i }).click();

    await expect(page.getByText(/API Call: addApplicationNote/i)).toBeVisible();
  });

  test('should display existing notes', async ({ page }) => {
    await page.getByText('With Existing Notes').locator('..').locator('button').click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await page.getByRole('button', { name: /Notes/i }).click();

    await expect(page.getByText(/Great technical interview/i)).toBeVisible();
    await expect(page.getByText('Sarah Johnson')).toBeVisible();
  });

  test('should display note visibility badges', async ({ page }) => {
    await page.getByText('With Existing Notes').locator('..').locator('button').click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await page.getByRole('button', { name: /Notes/i }).click();

    await expect(page.getByText('Team').first()).toBeVisible();
    await expect(page.getByText('Private').first()).toBeVisible();
  });

  test('should display empty state when no notes', async ({ page }) => {
    await page.getByText('No Notes Yet').locator('..').locator('button').click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await page.getByRole('button', { name: /Notes/i }).click();

    await expect(page.getByText('No notes yet')).toBeVisible();
  });

  test('should display notes count', async ({ page }) => {
    await page.getByText('With Existing Notes').locator('..').locator('button').click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await page.getByRole('button', { name: /Notes/i }).click();

    await expect(page.getByText(/All Notes \(\d+\)/i)).toBeVisible();
  });
});

test.describe('Candidate Detail Modal - Mock Modes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/candidate-detail-modal');
    await expect(page.getByRole('heading', { name: /candidate detail modal test page/i })).toBeVisible({ timeout: 10000 });
  });

  test('should log success mode activation', async ({ page }) => {
    await page.getByRole('button', { name: /✓ Success/i }).click();

    await expect(page.getByText(/Mock mode: Success/i)).toBeVisible();
  });

  test('should log slow mode activation', async ({ page }) => {
    await page.getByRole('button', { name: /⏱ Slow/i }).click();

    await expect(page.getByText(/Mock mode: Slow/i)).toBeVisible();
  });

  test('should log error mode activation', async ({ page }) => {
    await page.getByRole('button', { name: /⚠ Error/i }).click();

    await expect(page.getByText(/Mock mode: Error/i)).toBeVisible();
  });

  test('should show loading state in slow mode', async ({ page }) => {
    await page.getByRole('button', { name: /⏱ Slow/i }).click();
    await page.getByRole('button', { name: 'View Details' }).first().click();

    const spinner = page.locator('.animate-spin');
    await expect(spinner).toBeVisible();
  });
});

test.describe('Candidate Detail Modal - Activity Log', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/candidate-detail-modal');
    await expect(page.getByRole('heading', { name: /candidate detail modal test page/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display activity log section', async ({ page }) => {
    await page.getByRole('button', { name: 'View Details' }).first().click();

    await expect(page.getByText('Activity Log')).toBeVisible();
  });

  test('should log API calls', async ({ page }) => {
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    await expect(page.getByText(/API Call: calculateFit/i)).toBeVisible();
    await expect(page.getByText(/API Call: getApplicationNotes/i)).toBeVisible();
  });

  test('should allow clearing activity log', async ({ page }) => {
    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByText('Activity Log')).toBeVisible();

    const clearButton = page.getByRole('button', { name: 'Clear' }).first();
    await clearButton.click();

    // Activity log should be empty or hidden
    await expect(page.getByText(/API Call:/i)).not.toBeVisible();
  });
});

test.describe('Candidate Detail Modal - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/candidate-detail-modal');
    await expect(page.getByRole('heading', { name: /candidate detail modal test page/i })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();
  });

  test('should have accessible modal heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();
  });

  test('should have accessible tab navigation', async ({ page }) => {
    const tabs = await page.getByRole('button').filter({ hasText: /Overview|AI Fit Score|Notes/ }).count();
    expect(tabs).toBeGreaterThanOrEqual(3);
  });

  test('should have accessible form labels in notes', async ({ page }) => {
    await page.getByRole('button', { name: /Notes/i }).click();

    await expect(page.getByText('Team Visible')).toBeVisible();
    await expect(page.getByText('Private')).toBeVisible();
  });

  test('should have accessible close buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /Close/i })).toBeVisible();
  });

  test('should support keyboard navigation to close button', async ({ page }) => {
    const closeButton = page.getByRole('button', { name: /^Close$/i });
    await closeButton.focus();

    // Verify focus
    await expect(closeButton).toBeFocused();
  });
});

test.describe('Candidate Detail Modal - Responsive Design', () => {
  test('should work on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/test/candidate-detail-modal');

    await expect(page.getByRole('heading', { name: /candidate detail modal test page/i })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();
  });

  test('should work on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/test/candidate-detail-modal');

    await expect(page.getByRole('heading', { name: /candidate detail modal test page/i })).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();
  });

  test('should display tabs horizontally on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/test/candidate-detail-modal');

    await page.getByRole('button', { name: 'View Details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Candidate Details' })).toBeVisible();

    const overviewTab = page.getByRole('button', { name: 'Overview' });
    const fitTab = page.getByRole('button', { name: /AI Fit Score/i });

    await expect(overviewTab).toBeVisible();
    await expect(fitTab).toBeVisible();
  });
});
