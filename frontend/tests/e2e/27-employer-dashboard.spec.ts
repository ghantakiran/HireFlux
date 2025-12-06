/**
 * Playwright E2E Tests - Employer Dashboard
 * Sprint 19-20 Week 40 Day 4 - Issue #22
 *
 * Implements BDD scenarios from:
 * frontend/tests/features/employer-dashboard.feature
 *
 * Following TDD/BDD practices - tests based on feature file
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Helper functions
async function mockDashboardData(page: Page) {
  // Mock dashboard stats endpoint
  await page.route(`${API_BASE_URL}/employers/dashboard/stats`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          active_jobs: 5,
          new_applications_today: 12,
          avg_fit_index: 85.5,
          avg_time_to_fill: 24.0,
          total_applications: 87,
          applications_by_status: [
            { status: 'new', count: 20 },
            { status: 'screening', count: 15 },
            { status: 'interview', count: 10 },
            { status: 'offer', count: 5 },
            { status: 'hired', count: 7 },
            { status: 'rejected', count: 30 },
          ],
          top_jobs: [
            {
              job_id: '123e4567-e89b-12d3-a456-426614174001',
              job_title: 'Senior Software Engineer',
              total_applications: 23,
              avg_candidate_fit: 88.5,
            },
            {
              job_id: '123e4567-e89b-12d3-a456-426614174002',
              job_title: 'Product Manager',
              total_applications: 18,
              avg_candidate_fit: 82.0,
            },
            {
              job_id: '123e4567-e89b-12d3-a456-426614174003',
              job_title: 'UX Designer',
              total_applications: 15,
              avg_candidate_fit: 90.0,
            },
          ],
        },
      }),
    });
  });

  // Mock pipeline endpoint
  await page.route(`${API_BASE_URL}/employers/dashboard/pipeline`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          new: 20,
          screening: 15,
          interview: 10,
          offer: 5,
          hired: 7,
          rejected: 30,
          total: 87,
        },
      }),
    });
  });

  // Mock activity endpoint
  await page.route(`${API_BASE_URL}/employers/dashboard/activity*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          events: [
            {
              id: '1',
              type: 'application_received',
              description: 'John Doe applied to Senior Software Engineer',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              metadata: {},
            },
            {
              id: '2',
              type: 'stage_change',
              description: 'Jane Smith moved to Interview stage',
              timestamp: new Date(Date.now() - 7200000).toISOString(),
              metadata: {},
            },
            {
              id: '3',
              type: 'job_posted',
              description: 'New job posted: Backend Developer',
              timestamp: new Date(Date.now() - 10800000).toISOString(),
              metadata: {},
            },
          ],
          total: 3,
          has_more: false,
        },
      }),
    });
  });
}

async function mockEmptyDashboard(page: Page) {
  // Mock empty dashboard (new company with no data)
  await page.route(`${API_BASE_URL}/employers/dashboard/stats`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          active_jobs: 0,
          new_applications_today: 0,
          avg_fit_index: null,
          avg_time_to_fill: null,
          total_applications: 0,
          applications_by_status: [],
          top_jobs: [],
        },
      }),
    });
  });

  await page.route(`${API_BASE_URL}/employers/dashboard/activity*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          events: [],
          total: 0,
          has_more: false,
        },
      }),
    });
  });
}

// ============================================================================
// Dashboard Overview Metrics Tests
// ============================================================================

test.describe('Employer Dashboard - Overview Metrics', () => {
  test.beforeEach(async ({ page }) => {
    // Set E2E mock auth token (must start with 'mock-' to bypass ProtectedRoute)
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'mock-test-token-123');
    });
  });

  test('@dashboard @overview @happy-path - View dashboard overview metrics', async ({ page }) => {
    /**
     * Scenario: View dashboard overview metrics
     *   Given I navigate to "/employer/dashboard"
     *   When the dashboard loads
     *   Then I should see the following metric cards:
     *     - Active Jobs, New Applications, Avg Fit Index, Avg Time to Fill
     */

    await mockDashboardData(page);

    // Navigate to a base page first to set up context
    await page.goto(`${BASE_URL}/`);

    // Now navigate to dashboard with mocked data
    await page.goto(`${BASE_URL}/employer/dashboard`);

    // Wait for dashboard to load
    await page.waitForSelector('h1:has-text("Dashboard")');

    // Verify all 4 metric cards
    await expect(page.locator('text=Active Jobs')).toBeVisible();
    await expect(page.locator('text=5').first()).toBeVisible(); // active jobs count

    await expect(page.locator('text=New Applications Today')).toBeVisible();
    await expect(page.locator('text=12').first()).toBeVisible(); // new apps count

    await expect(page.locator('text=Avg Fit Index')).toBeVisible();
    await expect(page.locator('text=85.5')).toBeVisible();

    await expect(page.locator('text=Avg Time to Fill')).toBeVisible();
    await expect(page.locator('text=24')).toBeVisible();
  });

  test('@dashboard @metrics @empty-state - Dashboard with no data shows zero states', async ({
    page,
  }) => {
    /**
     * Scenario: Dashboard with no data shows zero states
     *   Given my company has no active jobs
     *   And my company has no applications
     *   When I load the dashboard
     *   Then the overview metrics should show zeros or "--"
     */

    await mockEmptyDashboard(page);
    await page.goto(`${BASE_URL}/employer/dashboard`);

    await page.waitForSelector('h1:has-text("Dashboard")');

    // Verify zero states
    await expect(page.locator('text=Active Jobs').locator('..').locator('text=0')).toBeVisible();
    await expect(
      page.locator('text=New Applications Today').locator('..').locator('text=0')
    ).toBeVisible();

    // Avg Fit Index and Time to Fill should show "--" when no data
    await expect(page.locator('text=Avg Fit Index').locator('..').locator('text=--')).toBeVisible();
    await expect(
      page.locator('text=Avg Time to Fill').locator('..').locator('text=--')
    ).toBeVisible();
  });

  test('@dashboard @metrics @refresh - Dashboard auto-refreshes every 30 seconds', async ({
    page,
  }) => {
    /**
     * Scenario: Dashboard polls for updates every 30 seconds
     *   Given I am viewing the dashboard
     *   When 30 seconds pass
     *   Then the dashboard should make an API call to fetch latest stats
     */

    await mockDashboardData(page);

    let apiCallCount = 0;
    await page.route(`${API_BASE_URL}/employers/dashboard/stats`, async (route) => {
      apiCallCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            active_jobs: 5 + apiCallCount, // Increment to show change
            new_applications_today: 12,
            total_applications: 87,
            applications_by_status: [],
            top_jobs: [],
          },
        }),
      });
    });

    await page.goto(`${BASE_URL}/employer/dashboard`);
    await page.waitForSelector('h1:has-text("Dashboard")');

    // Initial load
    expect(apiCallCount).toBe(1);

    // Wait 31 seconds (auto-refresh triggers at 30s)
    await page.waitForTimeout(31000);

    // Should have made second API call
    expect(apiCallCount).toBe(2);
  });

  test('@dashboard @loading @skeleton - Dashboard shows loading skeletons while fetching data', async ({
    page,
  }) => {
    /**
     * Scenario: Dashboard shows loading skeletons while fetching data
     *   Given I navigate to "/employer/dashboard"
     *   When the page is loading
     *   Then I should see loading skeleton placeholders
     */

    // Delay API response to see loading state
    await page.route(`${API_BASE_URL}/employers/dashboard/stats`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s delay
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: {} }),
      });
    });

    await page.goto(`${BASE_URL}/employer/dashboard`);

    // Should see skeleton loaders
    const skeletons = page.locator('[class*="skeleton"]');
    await expect(skeletons.first()).toBeVisible();
  });
});

// ============================================================================
// Applications Pipeline Tests
// ============================================================================

test.describe('Employer Dashboard - Applications Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'mock-test-token-123');
    });
    await mockDashboardData(page);
  });

  test('@dashboard @pipeline - View applications pipeline chart', async ({ page }) => {
    /**
     * Scenario: View applications pipeline chart
     *   Given my company has applications in various stages
     *   When I view the dashboard
     *   Then I should see a pipeline chart with correct counts
     */

    await page.goto(`${BASE_URL}/employer/dashboard`);
    await page.waitForSelector('h1:has-text("Dashboard")');

    // Verify pipeline section exists
    await expect(page.locator('text=Applications Pipeline')).toBeVisible();

    // Verify each stage is displayed
    await expect(page.locator('text=new').first()).toBeVisible();
    await expect(page.locator('text=screening').first()).toBeVisible();
    await expect(page.locator('text=interview').first()).toBeVisible();
    await expect(page.locator('text=offer').first()).toBeVisible();
    await expect(page.locator('text=hired').first()).toBeVisible();
    await expect(page.locator('text=rejected').first()).toBeVisible();

    // Verify counts are displayed
    await expect(page.locator('text=20').first()).toBeVisible(); // new count
    await expect(page.locator('text=15').first()).toBeVisible(); // screening count
  });

  test('@dashboard @pipeline @empty-state - Pipeline with no applications', async ({ page }) => {
    /**
     * Scenario: Pipeline chart with no applications
     *   Given my company has no applications
     *   When I view the dashboard
     *   Then I should see a pipeline chart placeholder
     */

    await mockEmptyDashboard(page);
    await page.goto(`${BASE_URL}/employer/dashboard`);
    await page.waitForSelector('h1:has-text("Dashboard")');

    await expect(page.locator('text=Applications Pipeline')).toBeVisible();
    await expect(page.locator('text=No applications yet')).toBeVisible();
    await expect(page.locator('button:has-text("Post Your First Job")')).toBeVisible();
  });
});

// ============================================================================
// Top Performing Jobs Tests
// ============================================================================

test.describe('Employer Dashboard - Top Performing Jobs', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'mock-test-token-123');
    });
    await mockDashboardData(page);
  });

  test('@dashboard @top-jobs - View top performing jobs table', async ({ page }) => {
    /**
     * Scenario: View top performing jobs table
     *   Given my company has 10 active jobs
     *   When I view the dashboard
     *   Then I should see a "Top Performing Jobs" section
     *   And the table should display up to 5 jobs
     */

    await page.goto(`${BASE_URL}/employer/dashboard`);
    await page.waitForSelector('h1:has-text("Dashboard")');

    await expect(page.locator('text=Top Performing Jobs')).toBeVisible();

    // Verify jobs are displayed
    await expect(page.locator('text=Senior Software Engineer')).toBeVisible();
    await expect(page.locator('text=23 applications')).toBeVisible();
    await expect(page.locator('text=88.5').first()).toBeVisible(); // fit score

    await expect(page.locator('text=Product Manager')).toBeVisible();
    await expect(page.locator('text=UX Designer')).toBeVisible();
  });

  test('@dashboard @top-jobs @navigation - Navigate to job details from top jobs', async ({
    page,
  }) => {
    /**
     * Scenario: Navigate to job details from top jobs table
     *   Given I am viewing the top performing jobs table
     *   When I click a job
     *   Then I should be navigated to the job details page
     */

    await page.goto(`${BASE_URL}/employer/dashboard`);
    await page.waitForSelector('text=Senior Software Engineer');

    // Click on job title
    await page.click('text=Senior Software Engineer');

    // Should navigate to job details
    await page.waitForURL(/\/employer\/jobs\/.*/);
  });

  test('@dashboard @top-jobs @empty-state - Top jobs with no active jobs', async ({ page }) => {
    /**
     * Scenario: Top jobs table with no active jobs
     *   Given my company has no active jobs
     *   When I view the dashboard
     *   Then the "Top Performing Jobs" section should show empty state
     */

    await mockEmptyDashboard(page);
    await page.goto(`${BASE_URL}/employer/dashboard`);
    await page.waitForSelector('h1:has-text("Dashboard")');

    await expect(page.locator('text=Top Performing Jobs')).toBeVisible();
    await expect(page.locator('text=No active jobs yet')).toBeVisible();
    await expect(page.locator('button:has-text("Post a Job")')).toBeVisible();
  });
});

// ============================================================================
// Recent Activity Feed Tests
// ============================================================================

test.describe('Employer Dashboard - Recent Activity', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'mock-test-token-123');
    });
    await mockDashboardData(page);
  });

  test('@dashboard @activity - View recent activity feed', async ({ page }) => {
    /**
     * Scenario: View recent activity feed
     *   Given my company has recent recruitment activity
     *   When I view the dashboard
     *   Then I should see a "Recent Activity" section
     *   And the feed should display recent events
     */

    await page.goto(`${BASE_URL}/employer/dashboard`);
    await page.waitForSelector('h1:has-text("Dashboard")');

    await expect(page.locator('text=Recent Activity')).toBeVisible();

    // Verify activity events are displayed
    await expect(page.locator('text=John Doe applied to Senior Software Engineer')).toBeVisible();
    await expect(page.locator('text=Jane Smith moved to Interview stage')).toBeVisible();
    await expect(page.locator('text=New job posted: Backend Developer')).toBeVisible();
  });

  test('@dashboard @activity @empty-state - Activity feed with no recent activity', async ({
    page,
  }) => {
    /**
     * Scenario: Activity feed with no recent activity
     *   Given my company has no recent activity
     *   When I view the dashboard
     *   Then the activity feed should show empty state
     */

    await mockEmptyDashboard(page);
    await page.goto(`${BASE_URL}/employer/dashboard`);
    await page.waitForSelector('h1:has-text("Dashboard")');

    await expect(page.locator('text=Recent Activity')).toBeVisible();
    await expect(page.locator('text=No recent activity')).toBeVisible();
  });
});

// ============================================================================
// Quick Actions Tests
// ============================================================================

test.describe('Employer Dashboard - Quick Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'mock-test-token-123');
    });
    await mockDashboardData(page);
  });

  test('@dashboard @quick-actions - Quick actions provide shortcuts to key features', async ({
    page,
  }) => {
    /**
     * Scenario: Quick actions provide shortcuts to key features
     *   Given I am viewing the dashboard
     *   Then I should see a "Quick Actions" section with buttons
     */

    await page.goto(`${BASE_URL}/employer/dashboard`);
    await page.waitForSelector('h1:has-text("Dashboard")');

    await expect(page.locator('text=Quick Actions')).toBeVisible();

    // Verify all quick action buttons
    await expect(page.locator('button:has-text("Post a Job")')).toBeVisible();
    await expect(page.locator('button:has-text("View Applications")')).toBeVisible();
    await expect(page.locator('button:has-text("Search Candidates")')).toBeVisible();
    await expect(page.locator('button:has-text("Analytics")')).toBeVisible();
  });

  test('@dashboard @quick-actions @post-job - Post a job from quick actions', async ({
    page,
  }) => {
    /**
     * Scenario: Post a job from quick actions
     *   Given I am viewing the dashboard
     *   When I click the "Post a Job" quick action button
     *   Then I should be navigated to "/employer/jobs/new"
     */

    await page.goto(`${BASE_URL}/employer/dashboard`);
    await page.waitForSelector('h1:has-text("Dashboard")');

    await page.click('button:has-text("Post a Job")');
    await page.waitForURL(/\/employer\/jobs\/new/);
  });

  test('@dashboard @quick-actions @view-applications - View applications from quick actions', async ({
    page,
  }) => {
    /**
     * Scenario: View applications from quick actions
     *   Given I am viewing the dashboard
     *   When I click the "View Applications" quick action button
     *   Then I should be navigated to "/employer/applications"
     */

    await page.goto(`${BASE_URL}/employer/dashboard`);
    await page.waitForSelector('h1:has-text("Dashboard")');

    await page.click('button:has-text("View Applications")');
    await page.waitForURL(/\/employer\/applications/);
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

test.describe('Employer Dashboard - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'mock-test-token-123');
    });
  });

  test('@dashboard @error @api-failure - Dashboard handles API errors gracefully', async ({
    page,
  }) => {
    /**
     * Scenario: Dashboard handles API errors gracefully
     *   Given the dashboard stats API is unavailable
     *   When I load the dashboard
     *   Then I should see an error message
     *   And there should be a "Retry" button
     */

    // Mock API error
    await page.route(`${API_BASE_URL}/employers/dashboard/stats`, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto(`${BASE_URL}/employer/dashboard`);

    // Should see error state
    await expect(page.locator('text=Error Loading Dashboard')).toBeVisible();
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });
});

// ============================================================================
// Responsive Design Tests
// ============================================================================

test.describe('Employer Dashboard - Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'mock-test-token-123');
    });
    await mockDashboardData(page);
  });

  test('@dashboard @responsive @mobile - Dashboard is responsive on mobile devices', async ({
    page,
  }) => {
    /**
     * Scenario: Dashboard is responsive on mobile devices
     *   Given I am on a mobile device (viewport 375px)
     *   When I view the dashboard
     *   Then the metric cards should stack vertically
     */

    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto(`${BASE_URL}/employer/dashboard`);
    await page.waitForSelector('h1:has-text("Dashboard")');

    // Verify page is visible and scrollable
    await expect(page.locator('text=Active Jobs')).toBeVisible();
    await expect(page.locator('text=Quick Actions')).toBeVisible();

    // Elements should fit in mobile viewport
    const metricsCard = page.locator('text=Active Jobs').locator('..');
    const box = await metricsCard.boundingBox();
    expect(box?.width).toBeLessThan(375);
  });
});

// ============================================================================
// Total Tests: 15
// Coverage: Overview metrics, pipeline, top jobs, activity, quick actions,
//           loading states, error handling, responsive design, navigation
// ============================================================================
