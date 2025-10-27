import { test, expect } from '@playwright/test';

test.describe('Dashboard Analytics Flow', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display dashboard overview', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
    await expect(page.getByText(/Applications/i)).toBeVisible();
    await expect(page.getByText(/Interviews/i)).toBeVisible();
  });

  test('should show pipeline statistics', async ({ page }) => {
    // Should display pipeline stats cards
    await expect(page.getByText(/Total Applications/i)).toBeVisible();
    await expect(page.getByText(/Response Rate/i)).toBeVisible();
    await expect(page.getByText(/Interview Rate/i)).toBeVisible();
    await expect(page.getByText(/Offer Rate/i)).toBeVisible();
  });

  test('should display health score widget', async ({ page }) => {
    const healthScore = page.locator('[data-testid="health-score"]');
    await expect(healthScore).toBeVisible();

    // Should show score value
    await expect(healthScore.locator('[data-testid="score-value"]')).toContainText(
      /\\d+/
    );

    // Should show health level
    await expect(healthScore).toContainText(
      /(Excellent|Good|Fair|Needs Improvement)/i
    );
  });

  test('should show health score components', async ({ page }) => {
    await page.locator('[data-testid="health-score"]').click();

    // Should expand and show components
    await expect(page.getByText(/Activity Score/i)).toBeVisible();
    await expect(page.getByText(/Quality Score/i)).toBeVisible();
    await expect(page.getByText(/Response Score/i)).toBeVisible();
    await expect(page.getByText(/Success Score/i)).toBeVisible();
  });

  test('should display recent activity timeline', async ({ page }) => {
    const activitySection = page.locator('[data-testid="activity-timeline"]');
    await expect(activitySection).toBeVisible();

    // Should show activity items
    const activityItems = page.locator('[data-testid="activity-item"]');
    await expect(activityItems.first()).toBeVisible();

    // Each item should have timestamp
    await expect(activityItems.first().locator('[data-testid="timestamp"]')).toBeVisible();
  });

  test('should display anomaly alerts', async ({ page }) => {
    // Check if anomaly section is present
    const anomaliesSection = page.locator('[data-testid="anomalies-section"]');

    if (await anomaliesSection.isVisible()) {
      // Should show anomaly count
      await expect(page.getByText(/\\d+ anomal(y|ies) detected/i)).toBeVisible();

      // Click to view details
      await anomaliesSection.click();

      // Should show anomaly details
      await expect(page.locator('[data-testid="anomaly-card"]').first()).toBeVisible();
    }
  });

  test('should show quick stats cards', async ({ page }) => {
    // Applications this week
    const appsCard = page.locator('[data-testid="stat-applications-week"]');
    await expect(appsCard).toBeVisible();
    await expect(appsCard).toContainText(/\\d+/);

    // Interviews this week
    const interviewsCard = page.locator('[data-testid="stat-interviews-week"]');
    await expect(interviewsCard).toBeVisible();

    // Pending offers
    const offersCard = page.locator('[data-testid="stat-offers-pending"]');
    await expect(offersCard).toBeVisible();

    // New matches
    const matchesCard = page.locator('[data-testid="stat-new-matches"]');
    await expect(matchesCard).toBeVisible();
  });

  test('should display application trends chart', async ({ page }) => {
    const trendsChart = page.locator('[data-testid="trends-chart"]');
    await expect(trendsChart).toBeVisible();

    // Should show chart legend
    await expect(page.getByText(/Applications/i)).toBeVisible();
    await expect(page.getByText(/Responses/i)).toBeVisible();
  });

  test('should filter analytics by time range', async ({ page }) => {
    // Open time range selector
    await page.getByRole('button', { name: /Last 30 Days/i }).click();

    // Select different time range
    await page.getByRole('option', { name: /Last 7 Days/i }).click();

    // Should update data
    await page.waitForLoadState('networkidle');

    // Verify URL or UI updated
    await expect(page.getByText(/Last 7 Days/i)).toBeVisible();
  });

  test('should navigate to pipeline distribution view', async ({ page }) => {
    // Click on pipeline stats
    await page.locator('[data-testid="pipeline-stats"]').click();

    // Should show detailed pipeline view
    await expect(page.getByRole('heading', { name: /Pipeline Distribution/i })).toBeVisible();

    // Should show stage breakdown
    await expect(page.getByText(/Saved/i)).toBeVisible();
    await expect(page.getByText(/Applied/i)).toBeVisible();
    await expect(page.getByText(/In Review/i)).toBeVisible();
  });

  test('should display conversion funnel', async ({ page }) => {
    // Navigate to detailed analytics
    await page.getByRole('link', { name: /View Details/i }).click();

    // Should show conversion funnel
    await expect(page.getByRole('heading', { name: /Conversion Funnel/i })).toBeVisible();

    // Should show funnel stages
    const funnelStages = page.locator('[data-testid="funnel-stage"]');
    await expect(funnelStages.first()).toBeVisible();

    // Should show conversion rates
    await expect(page.getByText(/\\d+\\.\\d+%/)).toBeVisible();
  });

  test('should show peer comparison', async ({ page }) => {
    // Navigate to benchmarks
    await page.getByRole('tab', { name: /Benchmarks/i }).click();

    // Should show peer comparison section
    await expect(page.getByRole('heading', { name: /Peer Comparison/i })).toBeVisible();

    // Should show metrics comparison
    await expect(page.getByText(/Platform Average/i)).toBeVisible();
    await expect(page.getByText(/Your Performance/i)).toBeVisible();

    // Should show percentile
    await expect(page.getByText(/\\d+(st|nd|rd|th) percentile/i)).toBeVisible();
  });

  test('should display success metrics breakdown', async ({ page }) => {
    // Navigate to success metrics
    await page.getByRole('tab', { name: /Success Metrics/i }).click();

    // Should show metrics cards
    await expect(page.getByText(/Total Applications/i)).toBeVisible();
    await expect(page.getByText(/Total Responses/i)).toBeVisible();
    await expect(page.getByText(/Total Interviews/i)).toBeVisible();
    await expect(page.getByText(/Total Offers/i)).toBeVisible();

    // Should show averages
    await expect(page.getByText(/Avg\\..*per week/i)).toBeVisible();
  });

  test('should show activity streaks', async ({ page }) => {
    // Should display streak information
    const streakCard = page.locator('[data-testid="activity-streak"]');
    await expect(streakCard).toBeVisible();

    // Should show current and longest streak
    await expect(streakCard.getByText(/Current Streak/i)).toBeVisible();
    await expect(streakCard.getByText(/Longest Streak/i)).toBeVisible();
    await expect(streakCard).toContainText(/\\d+ days/i);
  });

  test('should display recommendations', async ({ page }) => {
    // Health score recommendations
    const recommendations = page.locator('[data-testid="recommendations-section"]');
    await expect(recommendations).toBeVisible();

    // Should show actionable recommendations
    const recommendationItems = page.locator('[data-testid="recommendation-item"]');
    await expect(recommendationItems.first()).toBeVisible();

    // Each recommendation should have action button
    if (await recommendationItems.first().isVisible()) {
      await expect(
        recommendationItems.first().getByRole('button', { name: /Take Action/i })
      ).toBeVisible();
    }
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // For new users with no data
    // Mock or use a new user account

    // Should show empty state messages
    const emptyState = page.locator('[data-testid="empty-state"]');

    if (await emptyState.isVisible()) {
      await expect(emptyState).toContainText(/No applications yet/i);
      await expect(page.getByRole('button', { name: /Get Started/i })).toBeVisible();
    }
  });

  test('should export dashboard data', async ({ page }) => {
    // Click export button
    await page.getByRole('button', { name: /Export/i }).click();

    // Should show export options
    await expect(page.getByText(/Export Format/i)).toBeVisible();

    // Select CSV format
    await page.getByLabel(/CSV/i).check();

    // Confirm export
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download/i }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('dashboard');
  });

  test('should refresh dashboard data', async ({ page }) => {
    // Click refresh button
    await page.getByRole('button', { name: /Refresh/i }).click();

    // Should show loading state
    await expect(page.getByText(/Updating/i)).toBeVisible({ timeout: 1000 });

    // Should reload data
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="last-updated"]')).toBeVisible();
  });

  test('should navigate between dashboard sections', async ({ page }) => {
    // Navigate to different sections via tabs
    await page.getByRole('tab', { name: /Overview/i }).click();
    await expect(page.getByRole('heading', { name: /Overview/i })).toBeVisible();

    await page.getByRole('tab', { name: /Analytics/i }).click();
    await expect(page.getByRole('heading', { name: /Detailed Analytics/i })).toBeVisible();

    await page.getByRole('tab', { name: /Activity/i }).click();
    await expect(page.getByRole('heading', { name: /Activity Timeline/i })).toBeVisible();
  });

  test('should display trend indicators', async ({ page }) => {
    // Should show trend arrows/indicators
    const trendIndicators = page.locator('[data-testid="trend-indicator"]');

    if (await trendIndicators.first().isVisible()) {
      // Should have up/down/stable indicator
      await expect(trendIndicators.first()).toHaveAttribute(
        'data-trend',
        /(increasing|decreasing|stable)/
      );

      // Should show percentage change
      await expect(trendIndicators.first()).toContainText(/[\\+\\-]?\\d+%/);
    }
  });

  test('should show time series charts', async ({ page }) => {
    // Navigate to charts view
    await page.getByRole('tab', { name: /Charts/i }).click();

    // Should display multiple charts
    await expect(page.locator('[data-testid="chart-applications"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-responses"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-interviews"]')).toBeVisible();
  });

  test('should interact with chart tooltips', async ({ page }) => {
    const chart = page.locator('[data-testid="trends-chart"]');
    await expect(chart).toBeVisible();

    // Hover over chart data point
    await chart.locator('[data-testid="chart-point"]').first().hover();

    // Should show tooltip with details
    await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
    await expect(page.locator('[data-testid="chart-tooltip"]')).toContainText(/\\d+/);
  });

  test('should display anomaly severity levels', async ({ page }) => {
    const anomaliesSection = page.locator('[data-testid="anomalies-section"]');

    if (await anomaliesSection.isVisible()) {
      await anomaliesSection.click();

      // Should show severity indicators
      const anomalyCards = page.locator('[data-testid="anomaly-card"]');

      if (await anomalyCards.first().isVisible()) {
        // Should have severity badge
        await expect(
          anomalyCards.first().locator('[data-testid="severity-badge"]')
        ).toBeVisible();

        // Should show recommendation
        await expect(anomalyCards.first().getByText(/Recommendation:/i)).toBeVisible();
      }
    }
  });

  test('should show mobile-responsive dashboard', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Should adapt layout
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();

    // Should show hamburger menu or collapsed navigation
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.getByRole('navigation')).toBeVisible();
    }
  });

  test('should load dashboard data incrementally', async ({ page }) => {
    // Should show loading skeletons
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Check for skeleton loaders
    const skeletons = page.locator('[data-testid="skeleton-loader"]');

    if (await skeletons.first().isVisible({ timeout: 500 })) {
      await expect(skeletons.first()).toBeVisible();

      // Wait for actual data to load
      await page.waitForLoadState('networkidle');

      // Skeletons should be replaced with data
      await expect(skeletons.first()).not.toBeVisible();
    }
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API and return error
    await page.route('**/api/v1/analytics/dashboard', async (route) => {
      await route.abort('failed');
    });

    await page.goto('/dashboard');

    // Should show error message
    await expect(
      page.getByText(/Unable to load dashboard|Error loading data/i)
    ).toBeVisible({ timeout: 5000 });

    // Should show retry button
    await expect(page.getByRole('button', { name: /Retry|Try Again/i })).toBeVisible();
  });

  test('should persist time range selection', async ({ page }) => {
    // Select time range
    await page.getByRole('button', { name: /Last 30 Days/i }).click();
    await page.getByRole('option', { name: /Last 90 Days/i }).click();

    // Navigate away and back
    await page.goto('/dashboard/applications');
    await page.goto('/dashboard');

    // Should remember selection
    await expect(page.getByText(/Last 90 Days/i)).toBeVisible();
  });

  test('should show contextual help tooltips', async ({ page }) => {
    // Hover over help icons
    const helpIcon = page.locator('[data-testid="help-icon"]').first();

    if (await helpIcon.isVisible()) {
      await helpIcon.hover();

      // Should show tooltip with explanation
      await expect(page.locator('[role="tooltip"]')).toBeVisible();
      await expect(page.locator('[role="tooltip"]')).toContainText(/.+/);
    }
  });
});
