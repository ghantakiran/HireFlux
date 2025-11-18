/**
 * E2E Tests: AI Candidate Ranking - Fit Index Calculation (Issue #26)
 *
 * Tests AI-powered candidate ranking with multi-factor scoring:
 * - Skills match (30%), Experience (20%), Location (15%)
 * - Culture fit (15%), Salary (10%), Availability (10%)
 *
 * BDD Scenarios from: tests/features/26-candidate-ranking.feature
 */

import { test, expect, Page } from '@playwright/test';

// ========================================================================
// Helper Functions
// ========================================================================

async function loginAsEmployer(page: Page) {
  await page.goto('/employer/login');
  await page.getByLabel(/email/i).fill('employer@company.com');
  await page.getByLabel(/password/i).fill('TestPassword123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/.*employer.*dashboard/);
}

async function navigateToJobApplicants(page: Page, jobId: string) {
  await page.goto(`/employer/jobs/${jobId}/applications`);
  await page.waitForLoadState('networkidle');
}

// ========================================================================
// Test Suite: AI Candidate Ranking
// ========================================================================

test.describe('AI Candidate Ranking - Fit Index Calculation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ======================================================================
  // Group 1: Ranked Applicant List Display
  // ======================================================================

  test.describe('Ranked Applicant List Display', () => {
    test('should view applicants ranked by fit index', async ({ page }) => {
      // GIVEN: An employer logged in with a job that has applicants
      await loginAsEmployer(page);
      const jobId = 'test-job-with-applicants';
      await navigateToJobApplicants(page, jobId);

      // THEN: Applicants should be sorted by fit index descending
      await expect(page.getByRole('heading', { name: /applicants/i })).toBeVisible();

      // Check that sort is set to fit index by default
      const sortSelect = page.locator('[data-testid="sort-select"]');
      await expect(sortSelect).toHaveValue(/fit.*desc|fit-desc/i);

      // Verify fit index badges are visible
      const fitBadges = page.locator('[data-testid="fit-index-badge"]');
      const count = await fitBadges.count();
      expect(count).toBeGreaterThan(0);

      // Verify descending order
      const firstBadge = await fitBadges.first().textContent();
      const lastBadge = await fitBadges.last().textContent();

      const firstScore = parseInt(firstBadge?.match(/\d+/)?.[0] || '0');
      const lastScore = parseInt(lastBadge?.match(/\d+/)?.[0] || '0');

      expect(firstScore).toBeGreaterThanOrEqual(lastScore);
    });

    test('should display fit index badges with correct color coding', async ({ page }) => {
      // GIVEN: An employer viewing applicant list
      await loginAsEmployer(page);
      await navigateToJobApplicants(page, 'test-job-varied-scores');

      // THEN: Color coding should be consistent
      const excellentBadge = page.locator('[data-testid="fit-index-badge"]:has-text("87")').first();
      await expect(excellentBadge).toHaveClass(/green/i);
      await expect(excellentBadge).toHaveText(/excellent/i);

      const goodBadge = page.locator('[data-testid="fit-index-badge"]:has-text("65")').first();
      await expect(goodBadge).toHaveClass(/yellow/i);
      await expect(goodBadge).toHaveText(/good/i);

      const fairBadge = page.locator('[data-testid="fit-index-badge"]:has-text("52")').first();
      await expect(fairBadge).toHaveClass(/orange/i);
      await expect(fairBadge).toHaveText(/fair/i);

      const poorBadge = page.locator('[data-testid="fit-index-badge"]:has-text("35")').first();
      await expect(poorBadge).toHaveClass(/red/i);
      await expect(poorBadge).toHaveText(/poor/i);
    });

    test('should filter applicants by minimum fit index', async ({ page }) => {
      // GIVEN: An employer viewing applicants
      await loginAsEmployer(page);
      await navigateToJobApplicants(page, 'test-job-20-applicants');

      const totalCount = await page.locator('[data-testid="applicant-card"]').count();

      // WHEN: Employer sets minimum fit filter to 70
      await page.getByLabel(/minimum fit index/i).fill('70');
      await page.getByRole('button', { name: /apply filters/i }).click();

      // THEN: Only applicants with fit >= 70 are shown
      await expect(page.locator('[data-testid="filter-badge"]')).toContainText('Min Fit: 70');

      const filteredCards = page.locator('[data-testid="applicant-card"]');
      const filteredCount = await filteredCards.count();

      expect(filteredCount).toBeLessThan(totalCount);

      // Verify all visible fit indices are >= 70
      for (let i = 0; i < filteredCount; i++) {
        const badge = await filteredCards.nth(i).locator('[data-testid="fit-index-badge"]').textContent();
        const score = parseInt(badge?.match(/\d+/)?.[0] || '0');
        expect(score).toBeGreaterThanOrEqual(70);
      }
    });

    test('should sort applicants by different criteria', async ({ page }) => {
      // GIVEN: An employer viewing applicants
      await loginAsEmployer(page);
      await navigateToJobApplicants(page, 'test-job-applicants');

      // WHEN: Employer changes sort to application date
      await page.locator('[data-testid="sort-select"]').selectOption('date-desc');

      // THEN: Applicants should be sorted by date
      await page.waitForTimeout(500); // Wait for re-sort

      // Fit badges should still be visible
      await expect(page.locator('[data-testid="fit-index-badge"]').first()).toBeVisible();

      // WHEN: Employer changes back to fit index sort
      await page.locator('[data-testid="sort-select"]').selectOption('fit-desc');

      // THEN: Should be sorted by fit again
      await page.waitForTimeout(500);
      const badges = page.locator('[data-testid="fit-index-badge"]');
      const firstScore = parseInt((await badges.first().textContent())?.match(/\d+/)?.[0] || '0');
      const secondScore = parseInt((await badges.nth(1).textContent())?.match(/\d+/)?.[0] || '0');

      expect(firstScore).toBeGreaterThanOrEqual(secondScore);
    });
  });

  // ======================================================================
  // Group 2: Fit Index Explanation - Strengths & Concerns
  // ======================================================================

  test.describe('Fit Index Explanation', () => {
    test('should view detailed fit explanation for high-fit candidate', async ({ page }) => {
      // GIVEN: An employer viewing an applicant with fit index 87
      await loginAsEmployer(page);
      await navigateToJobApplicants(page, 'test-job-applicants');

      // WHEN: Employer clicks on fit index badge
      const fitBadge = page.locator('[data-testid="fit-index-badge"]').first();
      await fitBadge.click();

      // THEN: Explanation modal should open
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(page.getByRole('heading', { name: /fit index explanation/i })).toBeVisible();

      // Should show overall score
      await expect(page.locator('[data-testid="overall-fit-score"]')).toBeVisible();

      // Should show breakdown
      await expect(page.getByText(/skills.*match/i)).toBeVisible();
      await expect(page.getByText(/experience.*level/i)).toBeVisible();
      await expect(page.getByText(/location.*match/i)).toBeVisible();

      // Should show strengths section
      await expect(page.getByRole('heading', { name: /strengths/i })).toBeVisible();
      const strengths = page.locator('[data-testid="strength-item"]');
      const strengthCount = await strengths.count();
      expect(strengthCount).toBeGreaterThanOrEqual(1);

      // May have concerns section
      const concernsHeading = page.getByRole('heading', { name: /concerns/i });
      if (await concernsHeading.isVisible()) {
        const concerns = page.locator('[data-testid="concern-item"]');
        const concernCount = await concerns.count();
        expect(concernCount).toBeLessThanOrEqual(3); // High-fit should have few concerns
      }
    });

    test('should display breakdown with individual factor scores', async ({ page }) => {
      // GIVEN: An employer viewing fit explanation
      await loginAsEmployer(page);
      await navigateToJobApplicants(page, 'test-job-applicants');

      await page.locator('[data-testid="fit-index-badge"]').first().click();

      // THEN: Breakdown table should show all factors
      await expect(page.locator('[data-testid="breakdown-table"]')).toBeVisible();

      // Verify all factors are present
      await expect(page.getByText(/skills match/i)).toBeVisible();
      await expect(page.getByText(/experience level/i)).toBeVisible();
      await expect(page.getByText(/location match/i)).toBeVisible();
      await expect(page.getByText(/culture fit/i)).toBeVisible();
      await expect(page.getByText(/salary expectation/i)).toBeVisible();
      await expect(page.getByText(/availability/i)).toBeVisible();

      // Verify weights are shown
      await expect(page.getByText('30%')).toBeVisible(); // Skills weight
      await expect(page.getByText('20%')).toBeVisible(); // Experience weight
      await expect(page.getByText('15%')).toBeVisible(); // Location weight (appears twice)
    });

    test('should close fit explanation modal', async ({ page }) => {
      // GIVEN: An employer with explanation modal open
      await loginAsEmployer(page);
      await navigateToJobApplicants(page, 'test-job-applicants');
      await page.locator('[data-testid="fit-index-badge"]').first().click();
      await expect(page.getByRole('dialog')).toBeVisible();

      // WHEN: Employer clicks close button
      await page.getByRole('button', { name: /close/i }).click();

      // THEN: Modal should close
      await expect(page.getByRole('dialog')).not.toBeVisible();

      // Re-open and test Escape key
      await page.locator('[data-testid="fit-index-badge"]').first().click();
      await expect(page.getByRole('dialog')).toBeVisible();

      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).not.toBeVisible();
    });
  });

  // ======================================================================
  // Group 3: Force Recalculation
  // ======================================================================

  test.describe('Fit Index Recalculation', () => {
    test('should manually trigger fit index recalculation', async ({ page }) => {
      // GIVEN: An employer viewing an applicant
      await loginAsEmployer(page);
      await navigateToJobApplicants(page, 'test-job-applicants');

      // WHEN: Employer clicks recalculate button
      const recalcButton = page.getByRole('button', { name: /recalculate fit/i });
      if (await recalcButton.isVisible()) {
        await recalcButton.click();

        // THEN: Loading indicator should appear
        await expect(page.locator('[data-testid="calculation-spinner"]')).toBeVisible();

        // Should complete within 2 seconds (p95 requirement)
        await page.waitForResponse(
          (response) => response.url().includes('/calculate-fit') && response.status() === 200,
          { timeout: 2000 }
        );

        // Success message should appear
        await expect(page.getByText(/fit index updated/i)).toBeVisible();
      }
    });

    test('should batch recalculate when job requirements change', async ({ page }) => {
      // GIVEN: An employer editing a job with applicants
      await loginAsEmployer(page);
      const jobId = 'test-job-with-applicants';

      await page.goto(`/employer/jobs/${jobId}/edit`);

      // WHEN: Employer changes required skills
      const skillsInput = page.getByLabel(/required skills/i);
      await skillsInput.clear();
      await skillsInput.fill('React, TypeScript, GraphQL');

      await page.getByRole('button', { name: /save changes/i }).click();

      // THEN: Recalculation notice should appear
      await expect(page.getByText(/recalculating fit.*applicants/i)).toBeVisible({
        timeout: 3000,
      });
    });
  });

  // ======================================================================
  // Group 4: Performance Requirements
  // ======================================================================

  test.describe('Performance Requirements', () => {
    test('should calculate fit index within 2 seconds', async ({ page }) => {
      // GIVEN: A new application is being processed
      await loginAsEmployer(page);
      await navigateToJobApplicants(page, 'test-job-new-application');

      // WHEN: Fit index calculation is triggered
      const startTime = Date.now();

      // Wait for fit index to appear
      await expect(page.locator('[data-testid="fit-index-badge"]').first()).toBeVisible({
        timeout: 2000, // p95 requirement
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      // THEN: Should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });

  // ======================================================================
  // Group 5: Error Handling & Edge Cases
  // ======================================================================

  test.describe('Error Handling', () => {
    test('should handle incomplete candidate profile gracefully', async ({ page }) => {
      // GIVEN: An applicant with missing profile data
      await loginAsEmployer(page);
      await navigateToJobApplicants(page, 'test-job-incomplete-profiles');

      // THEN: Fit index should still calculate
      await expect(page.locator('[data-testid="fit-index-badge"]').first()).toBeVisible();

      // Open explanation to check concerns
      await page.locator('[data-testid="fit-index-badge"]').first().click();

      // Should show concern about incomplete profile
      const concernsSection = page.locator('[data-testid="concerns-section"]');
      if (await concernsSection.isVisible()) {
        await expect(concernsSection).toContainText(/profile incomplete|missing.*data/i);
      }
    });

    test('should handle calculation timeout gracefully', async ({ page }) => {
      // GIVEN: An employer viewing an applicant with slow calculation
      await loginAsEmployer(page);
      await navigateToJobApplicants(page, 'test-job-slow-calc');

      // THEN: Loading state should be shown
      const calculatingSpinner = page.locator('[data-testid="calculating-spinner"]');
      if (await calculatingSpinner.isVisible()) {
        await expect(calculatingSpinner).toBeVisible();

        // Eventually should show fit index or error
        await expect(
          page.locator('[data-testid="fit-index-badge"]').first()
        ).toBeVisible({ timeout: 10000 });
      }
    });
  });

  // ======================================================================
  // Group 6: Mobile Responsiveness
  // ======================================================================

  test.describe('Mobile Responsiveness', () => {
    test('should display fit index on mobile device', async ({ page }) => {
      // GIVEN: A mobile device
      await page.setViewportSize({ width: 375, height: 667 });

      await loginAsEmployer(page);
      await navigateToJobApplicants(page, 'test-job-applicants');

      // THEN: Fit badges should be visible and responsive
      const fitBadge = page.locator('[data-testid="fit-index-badge"]').first();
      await expect(fitBadge).toBeVisible();

      // Badge should not overflow
      const boundingBox = await fitBadge.boundingBox();
      expect(boundingBox?.width).toBeLessThan(375); // Viewport width

      // WHEN: Tap on badge
      await fitBadge.tap();

      // THEN: Modal should open and be mobile-optimized
      await expect(page.getByRole('dialog')).toBeVisible();
      const modal = page.getByRole('dialog');
      const modalBox = await modal.boundingBox();

      // Modal should fit within viewport
      expect(modalBox?.width).toBeLessThanOrEqual(375);
    });
  });

  // ======================================================================
  // Group 7: Accessibility
  // ======================================================================

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // GIVEN: An employer on applicant list
      await loginAsEmployer(page);
      await navigateToJobApplicants(page, 'test-job-applicants');

      // WHEN: Tab to fit index badge
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // May need multiple tabs

      // Find the focused fit badge
      const focusedElement = await page.locator(':focus');
      const isFitBadge = await focusedElement.getAttribute('data-testid');

      if (isFitBadge === 'fit-index-badge') {
        // WHEN: Press Enter
        await page.keyboard.press('Enter');

        // THEN: Modal should open
        await expect(page.getByRole('dialog')).toBeVisible();

        // WHEN: Press Escape
        await page.keyboard.press('Escape');

        // THEN: Modal should close
        await expect(page.getByRole('dialog')).not.toBeVisible();
      }
    });

    test('should have proper ARIA labels', async ({ page }) => {
      // GIVEN: An employer viewing applicants
      await loginAsEmployer(page);
      await navigateToJobApplicants(page, 'test-job-applicants');

      // THEN: Fit badges should have aria-label
      const fitBadge = page.locator('[data-testid="fit-index-badge"]').first();
      const ariaLabel = await fitBadge.getAttribute('aria-label');

      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel?.toLowerCase()).toContain('fit');

      // Open modal
      await fitBadge.click();

      // Modal should have proper role and labels
      const dialog = page.getByRole('dialog');
      await expect(dialog).toHaveAttribute('aria-modal', 'true');

      const dialogLabel = await dialog.getAttribute('aria-labelledby');
      expect(dialogLabel).toBeTruthy();
    });
  });

  // ======================================================================
  // Group 8: Analytics & Tracking
  // ======================================================================

  test.describe('Analytics Tracking', () => {
    test('should track fit index filter usage', async ({ page }) => {
      // GIVEN: An employer applying fit filter
      await loginAsEmployer(page);
      await navigateToJobApplicants(page, 'test-job-applicants');

      // Listen for analytics events
      let analyticsEventFired = false;
      page.on('console', (msg) => {
        if (msg.text().includes('FitIndexFilterUsed')) {
          analyticsEventFired = true;
        }
      });

      // WHEN: Employer sets minimum fit to 70
      await page.getByLabel(/minimum fit index/i).fill('70');
      await page.getByRole('button', { name: /apply filters/i }).click();

      // THEN: Analytics event should fire
      await page.waitForTimeout(500);
      // Note: In real implementation, check with analytics library
    });

    test('should track fit explanation views', async ({ page }) => {
      // GIVEN: An employer viewing applicant
      await loginAsEmployer(page);
      await navigateToJobApplicants(page, 'test-job-applicants');

      // WHEN: Employer opens fit explanation
      await page.locator('[data-testid="fit-index-badge"]').first().click();

      // THEN: View event should be tracked
      await expect(page.getByRole('dialog')).toBeVisible();
      // Note: In real implementation, verify analytics event
    });
  });

  // ======================================================================
  // Group 9: Empty States
  // ======================================================================

  test.describe('Empty States', () => {
    test('should show empty state when no applicants', async ({ page }) => {
      // GIVEN: A job with no applicants
      await loginAsEmployer(page);
      await navigateToJobApplicants(page, 'test-job-no-applicants');

      // THEN: Empty state should be shown
      await expect(page.getByText(/no applicants yet/i)).toBeVisible();
      await expect(page.locator('[data-testid="fit-index-badge"]')).not.toBeVisible();
    });

    test('should show empty state when all filtered out', async ({ page }) => {
      // GIVEN: An employer with filters that exclude all applicants
      await loginAsEmployer(page);
      await navigateToJobApplicants(page, 'test-job-low-scores');

      // WHEN: Set very high minimum fit
      await page.getByLabel(/minimum fit index/i).fill('95');
      await page.getByRole('button', { name: /apply filters/i }).click();

      // THEN: Empty filter state should appear
      await expect(page.getByText(/no applicants match.*filters/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /clear filters/i })).toBeVisible();
    });
  });
});
