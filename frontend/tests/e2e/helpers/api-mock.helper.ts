/**
 * API Mock Helper for E2E Tests
 * Intercepts API calls and returns mock data
 */

import { Page, Route } from '@playwright/test';
import {
  getMockJobs,
  getMockDashboardData,
  getMockActivities,
  MockJob,
  MockDashboardData,
} from '../fixtures/mock-data';

/**
 * Setup API mocks for a page
 * Intercepts API calls and returns mock data
 */
export async function setupAPIMocks(page: Page) {
  // Mock jobs API
  await page.route('**/api/v1/jobs**', async (route: Route) => {
    const url = new URL(route.request().url());
    const query = url.searchParams.get('query') || '';
    const remote_policy = url.searchParams.get('remote_policy') || 'any';
    const min_fit_index = parseInt(url.searchParams.get('min_fit_index') || '0');
    const page_num = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    const jobs = getMockJobs({
      query,
      remote_policy: remote_policy === 'any' ? undefined : remote_policy,
      min_fit_index,
    });

    const start = (page_num - 1) * limit;
    const end = start + limit;
    const paginatedJobs = jobs.slice(start, end);

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          jobs: paginatedJobs,
          pagination: {
            page: page_num,
            limit,
            total: jobs.length,
            total_pages: Math.ceil(jobs.length / limit),
          },
        },
      }),
    });
  });

  // Mock single job API
  await page.route('**/api/v1/jobs/*', async (route: Route) => {
    const url = route.request().url();
    const jobId = url.split('/').pop()?.split('?')[0];
    const jobs = getMockJobs();
    const job = jobs.find((j) => j.id === jobId);

    if (job) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: job,
        }),
      });
    } else {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          message: 'Job not found',
        }),
      });
    }
  });

  // Mock saved jobs API
  await page.route('**/api/v1/jobs/saved**', async (route: Route) => {
    const savedJobs = getMockJobs({ limit: 3 });

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          jobs: savedJobs,
        },
      }),
    });
  });

  // Mock dashboard overview API
  await page.route('**/api/v1/analytics/dashboard**', async (route: Route) => {
    const dashboardData = getMockDashboardData();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: dashboardData,
      }),
    });
  });

  // Mock health score API
  await page.route('**/api/v1/analytics/health-score**', async (route: Route) => {
    const dashboardData = getMockDashboardData();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: dashboardData.health_score,
      }),
    });
  });

  // Mock pipeline stats API
  await page.route('**/api/v1/analytics/pipeline**', async (route: Route) => {
    const dashboardData = getMockDashboardData();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: dashboardData.pipeline_stats,
      }),
    });
  });

  // Mock activity timeline API
  await page.route('**/api/v1/analytics/activity**', async (route: Route) => {
    const activities = getMockActivities();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: activities,
      }),
    });
  });

  // Mock save/unsave job APIs
  await page.route('**/api/v1/jobs/*/save', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Job saved successfully',
      }),
    });
  });

  await page.route('**/api/v1/jobs/*/unsave', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        message: 'Job unsaved successfully',
      }),
    });
  });

  // Mock applications API
  await page.route('**/api/v1/applications**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          applications: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            total_pages: 0,
          },
        },
      }),
    });
  });

  // Mock user profile API
  await page.route('**/api/v1/users/me**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: 'user-123',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          user_type: 'job_seeker',
          is_verified: true,
          subscription_tier: 'plus',
        },
      }),
    });
  });

  console.log('✓ API mocks configured for E2E tests');
}

/**
 * Setup empty state API mocks (for testing empty states)
 */
export async function setupEmptyStateAPIMocks(page: Page) {
  await page.route('**/api/v1/jobs**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          jobs: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            total_pages: 0,
          },
        },
      }),
    });
  });

  await page.route('**/api/v1/analytics/dashboard**', async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: null,
      }),
    });
  });

  console.log('✓ Empty state API mocks configured');
}

/**
 * Clear all API mocks
 */
export async function clearAPIMocks(page: Page) {
  await page.unroute('**/api/v1/**');
  console.log('✓ API mocks cleared');
}

/**
 * Mock a specific API endpoint with custom data
 */
export async function mockAPIEndpoint(
  page: Page,
  endpoint: string,
  data: any,
  statusCode: number = 200
) {
  await page.route(endpoint, async (route: Route) => {
    await route.fulfill({
      status: statusCode,
      contentType: 'application/json',
      body: JSON.stringify(data),
    });
  });
}
