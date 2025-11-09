/**
 * E2E Tests: Employer Analytics Dashboard
 * Sprint 15-16: Advanced Analytics & Reporting
 * 
 * BDD Approach:
 * - GIVEN: Initial state and preconditions
 * - WHEN: User actions
 * - THEN: Expected outcomes
 */

import { test, expect, Page } from '@playwright/test';
import {
  mockAnalyticsOverview,
  mockPipelineFunnel,
  mockSourcingMetrics,
  mockTimeMetrics,
  mockQualityMetrics,
  mockCostMetrics,
  mockEmptyAnalytics,
  mockEmptyFunnel,
  dateRangePresets,
  analyticsRouteHandlers
} from './mocks/employer-analytics.mock';

test.describe('Employer Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // GIVEN: User is logged in as employer (Growth plan with analytics access)
    await page.goto('/login');
    await page.fill('[name="email"]', 'employer@techcorp.com');
    await page.fill('[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/employer/dashboard');

    // Mock all analytics API endpoints
    await page.route(analyticsRouteHandlers.overview, async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify(mockAnalyticsOverview) });
    });

    await page.route(analyticsRouteHandlers.funnel, async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify(mockPipelineFunnel) });
    });

    await page.route(analyticsRouteHandlers.sources, async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify(mockSourcingMetrics) });
    });

    await page.route(analyticsRouteHandlers.timeMetrics, async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify(mockTimeMetrics) });
    });

    await page.route(analyticsRouteHandlers.quality, async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify(mockQualityMetrics) });
    });

    await page.route(analyticsRouteHandlers.costs, async (route) => {
      await route.fulfill({ status: 200, body: JSON.stringify(mockCostMetrics) });
    });
  });

  test.describe('Analytics Overview Page', () => {
    test('should display analytics overview metrics', async ({ page }) => {
      // GIVEN: User is on the analytics page
      await page.click('nav >> text=Analytics');
      await page.waitForURL('/employer/analytics');

      // THEN: Overview cards should be visible with correct data
      await expect(page.locator('[data-testid="total-applications"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-applications"]')).toContainText('250');

      await expect(page.locator('[data-testid="total-hires"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-hires"]')).toContainText('15');

      await expect(page.locator('[data-testid="avg-time-to-hire"]')).toBeVisible();
      await expect(page.locator('[data-testid="avg-time-to-hire"]')).toContainText('28.5');

      await expect(page.locator('[data-testid="avg-cost-per-hire"]')).toBeVisible();
      await expect(page.locator('[data-testid="avg-cost-per-hire"]')).toContainText('$66');
    });

    test('should display average Fit Index', async ({ page }) => {
      // WHEN: User navigates to analytics
      await page.goto('/employer/analytics');

      // THEN: Fit Index metric should be displayed
      const fitIndexCard = page.locator('[data-testid="avg-fit-index"]');
      await expect(fitIndexCard).toBeVisible();
      await expect(fitIndexCard).toContainText('78.5');
      await expect(fitIndexCard).toContainText('Fit Index');
    });

    test('should display top performing jobs', async ({ page }) => {
      // WHEN: User views analytics overview
      await page.goto('/employer/analytics');

      // THEN: Top performing jobs list should be visible
      const topJobsSection = page.locator('[data-testid="top-performing-jobs"]');
      await expect(topJobsSection).toBeVisible();

      // AND: First job should show correct data
      const firstJob = topJobsSection.locator('[data-testid="job-card-0"]');
      await expect(firstJob).toContainText('Senior Python Developer');
      await expect(firstJob).toContainText('12%'); // conversion rate
      await expect(firstJob).toContainText('80'); // applications
    });
  });

  test.describe('Pipeline Funnel Visualization', () => {
    test('should render pipeline funnel chart with all stages', async ({ page }) => {
      // GIVEN: User is on analytics page
      await page.goto('/employer/analytics');

      // THEN: Funnel chart should be visible
      const funnelChart = page.locator('[data-testid="pipeline-funnel-chart"]');
      await expect(funnelChart).toBeVisible();

      // AND: All 8 stages should be present
      const expectedStages = [
        'New',
        'Reviewing',
        'Phone Screen',
        'Technical',
        'Final Interview',
        'Offer',
        'Hired',
        'Rejected'
      ];

      for (const stage of expectedStages) {
        await expect(funnelChart.locator(`text=${stage}`)).toBeVisible();
      }
    });

    test('should show stage counts and drop-off rates', async ({ page }) => {
      // WHEN: User views pipeline funnel
      await page.goto('/employer/analytics');

      // THEN: Each stage should show count
      await expect(page.locator('[data-testid="stage-new-count"]')).toContainText('100');
      await expect(page.locator('[data-testid="stage-reviewing-count"]')).toContainText('75');
      await expect(page.locator('[data-testid="stage-phone_screen-count"]')).toContainText('50');

      // AND: Drop-off rates should be displayed
      await expect(page.locator('[data-testid="stage-reviewing-dropoff"]')).toContainText('33%');
      await expect(page.locator('[data-testid="stage-phone_screen-dropoff"]')).toContainText('40%');
    });

    test('should drill down into funnel stage on click', async ({ page }) => {
      // GIVEN: User is viewing the funnel chart
      await page.goto('/employer/analytics');

      // WHEN: User clicks on "Phone Screen" stage
      await page.click('[data-testid="funnel-stage-phone_screen"]');

      // THEN: Stage details modal should open
      const modal = page.locator('[data-testid="stage-details-modal"]');
      await expect(modal).toBeVisible();
      await expect(modal.locator('text=Phone Screen')).toBeVisible();

      // AND: Should show applications in this stage
      await expect(modal.locator('[data-testid="applications-list"]')).toBeVisible();

      // AND: Should show average days in stage
      await expect(modal.locator('[data-testid="avg-days-in-stage"]')).toContainText('7.0 days');
    });

    test('should show overall conversion rate', async ({ page }) => {
      // WHEN: User views analytics page
      await page.goto('/employer/analytics');

      // THEN: Overall conversion rate should be displayed
      const conversionRate = page.locator('[data-testid="overall-conversion-rate"]');
      await expect(conversionRate).toBeVisible();
      await expect(conversionRate).toContainText('14%');
    });
  });

  test.describe('Date Range Filtering', () => {
    test('should filter analytics by date range - Last 30 Days', async ({ page }) => {
      // GIVEN: User is on analytics page
      await page.goto('/employer/analytics');

      // WHEN: User clicks date range picker
      await page.click('[data-testid="date-range-picker"]');

      // AND: Selects "Last 30 days"
      await page.click('text=Last 30 days');

      // THEN: URL should update with date params
      await expect(page).toHaveURL(/startDate=.*&endDate=.*/);

      // AND: Charts should reload with filtered data
      await page.waitForResponse((resp) =>
        resp.url().includes('/api/v1/employer/companies') &&
        resp.status() === 200
      );

      // AND: Date range display should update
      const dateDisplay = page.locator('[data-testid="selected-date-range"]');
      await expect(dateDisplay).toContainText('Last 30 Days');
    });

    test('should filter analytics by custom date range', async ({ page }) => {
      // GIVEN: User is on analytics page
      await page.goto('/employer/analytics');

      // WHEN: User opens date range picker
      await page.click('[data-testid="date-range-picker"]');

      // AND: Selects "Custom Range"
      await page.click('text=Custom Range');

      // AND: Enters custom dates
      await page.fill('[data-testid="start-date"]', '2025-01-01');
      await page.fill('[data-testid="end-date"]', '2025-03-31');
      await page.click('button:has-text("Apply")');

      // THEN: Analytics should update with custom range
      await expect(page).toHaveURL(/startDate=2025-01-01&endDate=2025-03-31/);

      // AND: Date display should show custom range
      await expect(page.locator('[data-testid="selected-date-range"]')).toContainText('Jan 1 - Mar 31, 2025');
    });

    test('should have preset date ranges', async ({ page }) => {
      // WHEN: User opens date range picker
      await page.goto('/employer/analytics');
      await page.click('[data-testid="date-range-picker"]');

      // THEN: All preset options should be visible
      await expect(page.locator('text=Last 7 Days')).toBeVisible();
      await expect(page.locator('text=Last 30 Days')).toBeVisible();
      await expect(page.locator('text=Last 90 Days')).toBeVisible();
      await expect(page.locator('text=Custom Range')).toBeVisible();
    });
  });

  test.describe('Sourcing Metrics', () => {
    test('should display sourcing metrics breakdown', async ({ page }) => {
      // GIVEN: User is on analytics page
      await page.goto('/employer/analytics');

      // THEN: Sourcing card should be visible
      const sourcingCard = page.locator('[data-testid="sourcing-metrics-card"]');
      await expect(sourcingCard).toBeVisible();

      // AND: All sources should be listed
      await expect(sourcingCard.locator('text=Auto-Apply')).toBeVisible();
      await expect(sourcingCard.locator('text=Manual')).toBeVisible();
      await expect(sourcingCard.locator('text=Referral')).toBeVisible();
      await expect(sourcingCard.locator('text=Job Board')).toBeVisible();
    });

    test('should show conversion rates by source', async ({ page }) => {
      // WHEN: User views sourcing metrics
      await page.goto('/employer/analytics');

      // THEN: Each source should show conversion rate
      const sourcingCard = page.locator('[data-testid="sourcing-metrics-card"]');

      // Auto-apply: 5.3% conversion (8/150)
      await expect(sourcingCard.locator('[data-testid="source-auto_apply-conversion"]')).toContainText('5.3%');

      // Manual: 8.3% conversion (5/60)
      await expect(sourcingCard.locator('[data-testid="source-manual-conversion"]')).toContainText('8.3%');

      // Referral: 12% conversion (3/25) - highest
      await expect(sourcingCard.locator('[data-testid="source-referral-conversion"]')).toContainText('12%');
    });

    test('should highlight best performing source', async ({ page }) => {
      // WHEN: User views sourcing metrics
      await page.goto('/employer/analytics');

      // THEN: Referral source should be highlighted (highest conversion)
      const referralRow = page.locator('[data-testid="source-referral"]');
      await expect(referralRow).toHaveClass(/highlighted|best-source/);
      await expect(referralRow.locator('[data-testid="badge"]')).toContainText('Best');
    });
  });

  test.describe('Time Metrics', () => {
    test('should display time-to-hire metrics', async ({ page }) => {
      // WHEN: User navigates to analytics
      await page.goto('/employer/analytics');

      // THEN: Time metrics card should be visible
      const timeCard = page.locator('[data-testid="time-metrics-card"]');
      await expect(timeCard).toBeVisible();

      // AND: Should show avg time to hire
      await expect(timeCard.locator('[data-testid="avg-time-to-hire"]')).toContainText('28.5 days');

      // AND: Should show performance vs target
      await expect(timeCard.locator('[data-testid="performance-vs-target"]')).toContainText('5% better');
    });

    test('should show time-to-hire chart visualization', async ({ page }) => {
      // GIVEN: User is on analytics page
      await page.goto('/employer/analytics');

      // THEN: Time metrics chart should render
      const chart = page.locator('[data-testid="time-to-hire-chart"]');
      await expect(chart).toBeVisible();

      // AND: Should show all time breakdowns
      await expect(chart).toContainText('Time to First App');
      await expect(chart).toContainText('Time to Shortlist');
      await expect(chart).toContainText('Time to Offer');
      await expect(chart).toContainText('Time to Hire');
    });

    test('should indicate if performance beats target', async ({ page }) => {
      // WHEN: User views time metrics
      await page.goto('/employer/analytics');

      // THEN: Should show green indicator for beating target
      const indicator = page.locator('[data-testid="performance-indicator"]');
      await expect(indicator).toHaveClass(/text-green|success/);
      await expect(indicator.locator('svg')).toHaveClass(/arrow-down|trending-down/);
    });
  });

  test.describe('Quality Metrics', () => {
    test('should display quality of hire metrics', async ({ page }) => {
      // WHEN: User navigates to analytics
      await page.goto('/employer/analytics');

      // THEN: Quality metrics grid should be visible
      const qualityGrid = page.locator('[data-testid="quality-metrics-grid"]');
      await expect(qualityGrid).toBeVisible();

      // AND: Should show interview show-up rate
      await expect(qualityGrid.locator('[data-testid="interview-show-up-rate"]')).toContainText('92%');

      // AND: Should show offer acceptance rate
      await expect(qualityGrid.locator('[data-testid="offer-acceptance-rate"]')).toContainText('85%');

      // AND: Should show retention rates
      await expect(qualityGrid.locator('[data-testid="six-month-retention"]')).toContainText('88%');
      await expect(qualityGrid.locator('[data-testid="twelve-month-retention"]')).toContainText('75%');
    });

    test('should visualize quality metrics with progress bars', async ({ page }) => {
      // GIVEN: User is on analytics page
      await page.goto('/employer/analytics');

      // THEN: Each metric should have a progress bar
      const qualityGrid = page.locator('[data-testid="quality-metrics-grid"]');

      // Show-up rate: 92%
      const showUpBar = qualityGrid.locator('[data-testid="show-up-rate-bar"]');
      await expect(showUpBar).toBeVisible();
      await expect(showUpBar).toHaveAttribute('aria-valuenow', '92');

      // Offer acceptance: 85%
      const acceptanceBar = qualityGrid.locator('[data-testid="acceptance-rate-bar"]');
      await expect(acceptanceBar).toBeVisible();
      await expect(acceptanceBar).toHaveAttribute('aria-valuenow', '85');
    });
  });

  test.describe('Cost Metrics (Owner/Admin Only)', () => {
    test('should display cost metrics for owner role', async ({ page }) => {
      // GIVEN: User is logged in as owner
      await page.goto('/employer/analytics');

      // THEN: Cost metrics card should be visible
      const costCard = page.locator('[data-testid="cost-metrics-card"]');
      await expect(costCard).toBeVisible();

      // AND: Should show cost per application
      await expect(costCard.locator('[data-testid="cost-per-application"]')).toContainText('$1.19');

      // AND: Should show cost per hire
      await expect(costCard.locator('[data-testid="cost-per-hire"]')).toContainText('$17.47');

      // AND: Should show ROI
      await expect(costCard.locator('[data-testid="roi"]')).toContainText('28.5x');
    });

    test('should hide cost metrics for non-owner/admin roles', async ({ page }) => {
      // GIVEN: User is logged in as recruiter (not owner/admin)
      await page.goto('/login');
      await page.fill('[name="email"]', 'recruiter@techcorp.com');
      await page.fill('[name="password"]', 'TestPass123!');
      await page.click('button[type="submit"]');

      // WHEN: User navigates to analytics
      await page.goto('/employer/analytics');

      // THEN: Cost metrics card should NOT be visible
      await expect(page.locator('[data-testid="cost-metrics-card"]')).not.toBeVisible();

      // AND: Should show permission message
      await expect(page.locator('[data-testid="cost-metrics-restricted"]')).toContainText('Owner/Admin access required');
    });
  });

  test.describe('Export Analytics Report', () => {
    test('should export analytics report as PDF', async ({ page }) => {
      // GIVEN: User is on analytics page
      await page.goto('/employer/analytics');

      // WHEN: User clicks export button
      await page.click('[data-testid="export-report-button"]');

      // AND: Selects PDF format
      await page.click('text=PDF Report');

      // THEN: Download should be triggered
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="confirm-export"]')
      ]);

      // AND: Filename should match pattern
      expect(download.suggestedFilename()).toMatch(/analytics-report-\d{4}-\d{2}-\d{2}\.pdf/);
    });

    test('should export analytics data as CSV', async ({ page }) => {
      // GIVEN: User is on analytics page
      await page.goto('/employer/analytics');

      // WHEN: User exports as CSV
      await page.click('[data-testid="export-report-button"]');
      await page.click('text=CSV Data');

      // THEN: CSV download should trigger
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.click('[data-testid="confirm-export"]')
      ]);

      expect(download.suggestedFilename()).toMatch(/analytics-data-\d{4}-\d{2}-\d{2}\.csv/);
    });
  });

  test.describe('Empty State Handling', () => {
    test('should handle empty analytics gracefully', async ({ page }) => {
      // GIVEN: Company has no applications yet
      await page.route(analyticsRouteHandlers.overview, async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify(mockEmptyAnalytics) });
      });

      await page.route(analyticsRouteHandlers.funnel, async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify(mockEmptyFunnel) });
      });

      // WHEN: User navigates to analytics
      await page.goto('/employer/analytics');

      // THEN: Empty state message should be visible
      await expect(page.locator('[data-testid="analytics-empty-state"]')).toBeVisible();
      await expect(page.locator('text=No analytics data yet')).toBeVisible();
      await expect(page.locator('text=Post your first job to start tracking metrics')).toBeVisible();

      // AND: Should show CTA button
      const ctaButton = page.locator('[data-testid="post-first-job-cta"]');
      await expect(ctaButton).toBeVisible();
      await expect(ctaButton).toContainText('Post a Job');
    });
  });

  test.describe('Plan Access Control', () => {
    test('should restrict analytics access for Starter plan', async ({ page }) => {
      // GIVEN: User is on Starter plan (free)
      await page.goto('/login');
      await page.fill('[name="email"]', 'starter@company.com');
      await page.fill('[name="password"]', 'TestPass123!');
      await page.click('button[type="submit"]');

      // WHEN: User tries to access analytics
      await page.goto('/employer/analytics');

      // THEN: Upgrade prompt should be displayed
      await expect(page.locator('[data-testid="upgrade-prompt"]')).toBeVisible();
      await expect(page.locator('text=Upgrade to Growth plan')).toBeVisible();

      // AND: Analytics charts should not be visible
      await expect(page.locator('[data-testid="pipeline-funnel-chart"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="sourcing-metrics-card"]')).not.toBeVisible();

      // AND: Should show pricing comparison
      await expect(page.locator('[data-testid="pricing-table"]')).toBeVisible();
    });

    test('should allow analytics access for Growth plan', async ({ page }) => {
      // GIVEN: User is on Growth plan
      await page.goto('/employer/analytics');

      // THEN: Full analytics should be accessible
      await expect(page.locator('[data-testid="pipeline-funnel-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="sourcing-metrics-card"]')).toBeVisible();
      await expect(page.locator('[data-testid="upgrade-prompt"]')).not.toBeVisible();
    });
  });

  test.describe('Responsive Design', () => {
    test('should be responsive on mobile', async ({ page }) => {
      // GIVEN: User is on mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      // WHEN: User navigates to analytics
      await page.goto('/employer/analytics');

      // THEN: Mobile navigation should be visible
      await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

      // AND: Charts should stack vertically
      const funnelChart = page.locator('[data-testid="pipeline-funnel-chart"]');
      const sourcingCard = page.locator('[data-testid="sourcing-metrics-card"]');

      const funnelBox = await funnelChart.boundingBox();
      const sourcingBox = await sourcingCard.boundingBox();

      // Verify vertical stacking (sourcing should be below funnel)
      expect(sourcingBox!.y).toBeGreaterThan(funnelBox!.y + funnelBox!.height);
    });

    test('should be responsive on tablet', async ({ page }) => {
      // GIVEN: User is on tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      // WHEN: User views analytics
      await page.goto('/employer/analytics');

      // THEN: Cards should display in grid layout
      const grid = page.locator('[data-testid="analytics-grid"]');
      await expect(grid).toHaveCSS('display', /grid|flex/);
    });
  });

  test.describe('Performance', () => {
    test('should load analytics page in < 2 seconds', async ({ page }) => {
      // WHEN: User navigates to analytics
      const startTime = Date.now();
      await page.goto('/employer/analytics');

      // Wait for all charts to render
      await page.waitForSelector('[data-testid="pipeline-funnel-chart"]');
      await page.waitForSelector('[data-testid="sourcing-metrics-card"]');

      const loadTime = Date.now() - startTime;

      // THEN: Page should load in < 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('should show loading skeletons during data fetch', async ({ page }) => {
      // GIVEN: API responses are delayed
      await page.route(analyticsRouteHandlers.overview, async (route) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({ status: 200, body: JSON.stringify(mockAnalyticsOverview) });
      });

      // WHEN: User navigates to analytics
      await page.goto('/employer/analytics');

      // THEN: Loading skeletons should be visible
      await expect(page.locator('[data-testid="analytics-skeleton"]')).toBeVisible();

      // AND: Real content should appear after loading
      await expect(page.locator('[data-testid="pipeline-funnel-chart"]')).toBeVisible();
      await expect(page.locator('[data-testid="analytics-skeleton"]')).not.toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      // GIVEN: User is on analytics page
      await page.goto('/employer/analytics');

      // WHEN: User tabs through elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // THEN: Focus should be visible on interactive elements
      const focused = await page.locator(':focus');
      await expect(focused).toBeVisible();
    });

    test('should have ARIA labels for charts', async ({ page }) => {
      // WHEN: User navigates to analytics
      await page.goto('/employer/analytics');

      // THEN: Charts should have aria-labels
      const funnelChart = page.locator('[data-testid="pipeline-funnel-chart"]');
      await expect(funnelChart).toHaveAttribute('aria-label', /pipeline funnel/i);

      // AND: Metrics should have aria-described-by
      const fitIndex = page.locator('[data-testid="avg-fit-index"]');
      await expect(fitIndex).toHaveAttribute('aria-describedby');
    });
  });
});
