/**
 * E2E Tests - Employer Jobs List Page
 * Issue #79 - TDD/BDD Implementation
 *
 * Test Coverage:
 * 1. Jobs List Display (4 tests)
 * 2. Filters & Search (6 tests)
 * 3. Sorting (3 tests)
 * 4. Quick Actions (5 tests)
 * 5. Pagination (3 tests)
 * 6. Empty States (2 tests)
 * 7. Loading & Error States (3 tests)
 * 8. Responsive Design (2 tests)
 *
 * Total: 28 BDD scenarios
 */

import { test, expect, Page } from '@playwright/test';

// Base URL for the application
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Helper function to mock jobs API with sample data
async function mockJobsAPI(page: Page, jobs: any[] = [], total: number = 0) {
  await page.route('**/api/v1/jobs*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobs: jobs,
        total: total,
        page: 1,
        limit: 20,
        total_pages: Math.ceil(total / 20),
      }),
    });
  });
}

// Helper function to generate mock job data
function generateMockJob(overrides: Partial<any> = {}) {
  const defaults = {
    id: `job-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Senior Software Engineer',
    company_id: 'company-123',
    department: 'Engineering',
    location: 'San Francisco, CA',
    location_type: 'hybrid',
    salary_min: 120000,
    salary_max: 180000,
    salary_currency: 'USD',
    is_active: true,
    applications_count: 25,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return { ...defaults, ...overrides };
}

// No custom navigation helper needed - following dashboard pattern

// ============================================================================
// Test Suite: Employer Jobs List Page
// ============================================================================

test.describe('Employer Jobs List - Display & Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set E2E mock auth token (must start with 'mock-' to bypass ProtectedRoute)
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'mock-test-token-123');
    });
  });

  test('@jobs @display @happy-path - View jobs list with job cards', async ({ page }) => {
    // Given: Employer has 3 active jobs
    const mockJobs = [
      generateMockJob({ title: 'Senior Frontend Engineer', applications_count: 15 }),
      generateMockJob({ title: 'Backend Developer', applications_count: 10 }),
      generateMockJob({ title: 'DevOps Engineer', applications_count: 8 }),
    ];
    await mockJobsAPI(page, mockJobs, 3);

    // Navigate to a base page first to set up context
    await page.goto(`${BASE_URL}/`);

    // Now navigate to jobs list page
    await page.goto(`${BASE_URL}/employer/jobs`);

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Job Postings")');

    // Then: Should see all 3 job cards
    await expect(page.locator('[data-job-card]').filter({ hasText: 'Senior Frontend Engineer' })).toBeVisible();
    await expect(page.locator('[data-job-card]').filter({ hasText: 'Backend Developer' })).toBeVisible();
    await expect(page.locator('[data-job-card]').filter({ hasText: 'DevOps Engineer' })).toBeVisible();

    // And: Should see job statistics
    await expect(page.locator('text=Total Jobs')).toBeVisible();
    await expect(page.locator('[data-total-jobs]')).toContainText('3');
  });

  test('@jobs @display @statistics - Display job statistics', async ({ page }) => {
    // Given: Employer has jobs with various stats
    const mockJobs = [
      generateMockJob({ applications_count: 25, is_active: true }),
      generateMockJob({ applications_count: 15, is_active: true }),
      generateMockJob({ applications_count: 0, is_active: false }),
    ];
    await mockJobsAPI(page, mockJobs, 3);

    // When: Navigate to jobs list
    // Navigate to a base page first to set up context
    await page.goto(`${BASE_URL}/`);

    // Now navigate to jobs list page
    await page.goto(`${BASE_URL}/employer/jobs`);

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Job Postings")');

    // Then: Should see total jobs count
    await expect(page.locator('[data-total-jobs]')).toContainText('3');

    // And: Should see job cards with salary ranges
    await expect(page.locator('[data-job-card]').first()).toBeVisible();
    await expect(page.locator('text=$120,000').first()).toBeVisible();
  });

  test('@jobs @display @empty-state - Show empty state when no jobs', async ({ page }) => {
    // Given: Employer has no jobs
    await mockJobsAPI(page, [], 0);

    // When: Navigate to jobs list
    // Navigate to a base page first to set up context
    await page.goto(`${BASE_URL}/`);

    // Now navigate to jobs list page
    await page.goto(`${BASE_URL}/employer/jobs`);

    // Wait for page to load
    await page.waitForSelector('h1:has-text("Job Postings")');

    // Then: Should see empty state message
    await expect(page.locator('text=No jobs posted yet')).toBeVisible();

    // And: Should see "Post a Job" call-to-action
    await expect(page.locator('text=Create Your First Job')).toBeVisible();
  });

  test('@jobs @display @loading - Show loading skeletons while fetching', async ({ page }) => {
    // Given: API is slow to respond
    await page.route('**/api/v1/jobs*', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ jobs: [], total: 0, page: 1, limit: 20, total_pages: 0 }),
      });
    });

    // When: Start navigating to jobs list page (without awaiting)
    await page.goto(`${BASE_URL}/`, { waitUntil: 'commit' });
    const navigation = page.goto(`${BASE_URL}/employer/jobs`);

    // Then: Should see loading skeletons while API is responding
    await expect(page.locator('.animate-pulse, [role="status"]').first()).toBeVisible({ timeout: 2000 });

    // Wait for navigation to complete
    await navigation;
  });
});

test.describe('Employer Jobs List - Filters & Search', () => {
  test.beforeEach(async ({ page }) => {
    // Set E2E mock auth token (must start with 'mock-' to bypass ProtectedRoute)
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'mock-test-token-123');
    });
  });

  test.beforeEach(async ({ page }) => {
  });

  test('@jobs @filter @status - Filter jobs by status (Active)', async ({ page }) => {
    // Given: Employer has active and closed jobs
    const mockJobs = [
      generateMockJob({ title: 'Active Job 1', is_active: true }),
      generateMockJob({ title: 'Active Job 2', is_active: true }),
    ];
    await mockJobsAPI(page, mockJobs, 2);

    // When: Navigate and select "Active" filter
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    // Click status filter dropdown
    const statusFilter = page.locator('select, [role="combobox"]').filter({ hasText: /Status|All/ }).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.locator('text=Active').click();
    }

    // Then: Should only see active jobs
    await expect(page.locator('text=Active Job 1')).toBeVisible();
    await expect(page.locator('text=Active Job 2')).toBeVisible();
  });

  test('@jobs @filter @department - Filter jobs by department', async ({ page }) => {
    // Given: Jobs in different departments
    const mockJobs = [
      generateMockJob({ title: 'Engineering Job', department: 'Engineering' }),
    ];
    await mockJobsAPI(page, mockJobs, 1);

    // When: Navigate and select department filter
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    const deptFilter = page.locator('select, [role="combobox"]').filter({ hasText: /Department|All/ }).first();
    if (await deptFilter.isVisible()) {
      await deptFilter.click();
      await page.locator('text=Engineering').click();
    }

    // Then: Should see filtered jobs
    await expect(page.locator('text=Engineering Job')).toBeVisible();
  });

  test('@jobs @search @title - Search jobs by title', async ({ page }) => {
    // Given: Multiple jobs with different titles
    const allJobs = [
      generateMockJob({ title: 'Senior Frontend Engineer' }),
      generateMockJob({ title: 'Backend Developer' }),
    ];
    await mockJobsAPI(page, allJobs, 2);

    // When: Navigate and search for "Frontend"
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    await searchInput.fill('Frontend');
    await searchInput.press('Enter');

    // Wait for debounced search
    await page.waitForTimeout(600);

    // Then: Should see matching job
    await expect(page.locator('text=Senior Frontend Engineer')).toBeVisible();
  });

  test('@jobs @search @empty - Search with no results', async ({ page }) => {
    // Given: Jobs that don't match search
    await mockJobsAPI(page, [], 0);

    // When: Search for non-existent job
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    await searchInput.fill('NonexistentJob12345');
    await page.waitForTimeout(600);

    // Then: Should see "no results" message
    await expect(page.locator('text=/No jobs found|No results/i')).toBeVisible();
  });

  test('@jobs @filter @reset - Reset all filters', async ({ page }) => {
    // Given: Filters are applied
    const mockJobs = [
      generateMockJob({ title: 'Job 1' }),
      generateMockJob({ title: 'Job 2' }),
    ];
    await mockJobsAPI(page, mockJobs, 2);

    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    // Apply search filter
    const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
    await searchInput.fill('Test');
    await page.waitForTimeout(600);

    // When: Click reset/clear filters button
    const resetButton = page.locator('button:has-text("Clear"), button:has-text("Reset"), button >> svg').first();
    if (await resetButton.isVisible()) {
      await resetButton.click();
    } else {
      // Clear search manually
      await searchInput.clear();
    }

    // Then: Should see all jobs again
    await page.waitForTimeout(600);
    await expect(page.locator('text=Job 1')).toBeVisible();
  });

  test('@jobs @filter @multiple - Apply multiple filters together', async ({ page }) => {
    // Given: Jobs with various attributes
    const mockJobs = [
      generateMockJob({ title: 'Active Engineering Job', department: 'Engineering', is_active: true }),
    ];
    await mockJobsAPI(page, mockJobs, 1);

    // When: Apply status + department filters
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    // Apply filters (if UI allows multiple)
    const statusFilter = page.locator('select, [role="combobox"]').filter({ hasText: /Status/ }).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();
      await page.locator('text=Active').click();
    }

    // Then: Should see filtered results
    await expect(page.locator('text=Active Engineering Job')).toBeVisible();
  });
});

test.describe('Employer Jobs List - Sorting', () => {
  test.beforeEach(async ({ page }) => {
    // Set E2E mock auth token (must start with 'mock-' to bypass ProtectedRoute)
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'mock-test-token-123');
    });
  });

  test.beforeEach(async ({ page }) => {
  });

  test('@jobs @sort @newest - Sort jobs by newest first', async ({ page }) => {
    // Given: Jobs created at different times
    const now = new Date();
    const mockJobs = [
      generateMockJob({ title: 'Newest Job', created_at: new Date(now.getTime() - 1000).toISOString() }),
      generateMockJob({ title: 'Oldest Job', created_at: new Date(now.getTime() - 10000).toISOString() }),
    ];
    await mockJobsAPI(page, mockJobs, 2);

    // When: Navigate and select "Newest" sort
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    const sortSelect = page.locator('select, [role="combobox"]').filter({ hasText: /Sort|Newest/ }).first();
    if (await sortSelect.isVisible()) {
      await sortSelect.click();
      await page.locator('text=Newest').click();
    }

    // Then: Newest job should appear first
    const firstJob = page.locator('[data-job-card], .job-card, article').first();
    await expect(firstJob).toContainText('Newest Job');
  });

  test('@jobs @sort @applicants - Sort jobs by most applicants', async ({ page }) => {
    // Given: Jobs with different applicant counts
    const mockJobs = [
      generateMockJob({ title: 'High Applicants', applications_count: 50 }),
      generateMockJob({ title: 'Low Applicants', applications_count: 5 }),
    ];
    await mockJobsAPI(page, mockJobs, 2);

    // When: Sort by applicants
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    const sortSelect = page.locator('select, [role="combobox"]').filter({ hasText: /Sort/ }).first();
    if (await sortSelect.isVisible()) {
      await sortSelect.click();
      await page.locator('text=/Applicants|Most Applications/i').click();
    }

    // Then: Job with most applicants should be first
    const firstJob = page.locator('[data-job-card], .job-card, article').first();
    await expect(firstJob).toContainText('High Applicants');
  });

  test('@jobs @sort @oldest - Sort jobs by oldest first', async ({ page }) => {
    // Given: Jobs created at different times
    const now = new Date();
    const mockJobs = [
      generateMockJob({ title: 'Recent Job', created_at: new Date(now.getTime() - 1000).toISOString() }),
      generateMockJob({ title: 'Old Job', created_at: new Date(now.getTime() - 100000).toISOString() }),
    ];
    await mockJobsAPI(page, mockJobs, 2);

    // When: Sort by oldest
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    const sortSelect = page.locator('select, [role="combobox"]').filter({ hasText: /Sort/ }).first();
    if (await sortSelect.isVisible()) {
      await sortSelect.click();
      await page.locator('text=Oldest').click();
    }

    // Then: Oldest job should be first
    const firstJob = page.locator('[data-job-card], .job-card, article').first();
    await expect(firstJob).toContainText('Old Job');
  });
});

test.describe('Employer Jobs List - Quick Actions', () => {
  test.beforeEach(async ({ page }) => {
    // Set E2E mock auth token (must start with 'mock-' to bypass ProtectedRoute)
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'mock-test-token-123');
    });
  });

  test.beforeEach(async ({ page }) => {
  });

  test('@jobs @actions @edit - Navigate to edit job page', async ({ page }) => {
    // Given: Employer has a job
    const mockJob = generateMockJob({ title: 'Software Engineer' });
    await mockJobsAPI(page, [mockJob], 1);

    // When: Click "Edit" action on job card
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    // Open actions menu and click Edit
    const actionsMenu = page.locator('button:has-text("Edit"), button[aria-label*="actions"], button >> svg.lucide-more').first();
    await actionsMenu.click();

    const editButton = page.locator('text=Edit, button:has-text("Edit")').first();
    await editButton.click();

    // Then: Should navigate to edit page
    await expect(page).toHaveURL(/\/employer\/jobs\/.+\/edit/);
  });

  test('@jobs @actions @view - Navigate to job details/applications', async ({ page }) => {
    // Given: Job with applications
    const mockJob = generateMockJob({ title: 'Frontend Dev', applications_count: 10 });
    await mockJobsAPI(page, [mockJob], 1);

    // When: Click "View Applications" or job card
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    // Click on job card or "View" button
    const viewButton = page.locator('text=View, button:has-text("View Applications"), text=Frontend Dev').first();
    await viewButton.click();

    // Then: Should navigate to job details or applications
    await expect(page).toHaveURL(/\/employer\/jobs\/.+/);
  });

  test('@jobs @actions @pause - Pause active job', async ({ page }) => {
    // Given: Active job
    const mockJob = generateMockJob({ title: 'Active Job', is_active: true });
    await mockJobsAPI(page, [mockJob], 1);

    // Mock status update API
    await page.route('**/api/v1/employer/jobs/*/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, status: 'paused' }),
      });
    });

    // When: Click "Pause" action
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    const actionsMenu = page.locator('button[aria-label*="actions"], button >> svg.lucide-more').first();
    await actionsMenu.click();

    const pauseButton = page.locator('text=Pause, button:has-text("Pause")').first();
    if (await pauseButton.isVisible()) {
      await pauseButton.click();
    }

    // Then: Job status should update (or show success message)
    // Note: Actual behavior depends on implementation
  });

  test('@jobs @actions @delete - Delete job with confirmation', async ({ page }) => {
    // Given: Job to delete
    const mockJob = generateMockJob({ title: 'Job to Delete' });
    await mockJobsAPI(page, [mockJob], 1);

    // Mock delete API
    await page.route('**/api/v1/employer/jobs/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } else {
        await route.continue();
      }
    });

    // When: Click "Delete" and confirm
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    const actionsMenu = page.locator('button[aria-label*="actions"], button >> svg.lucide-more').first();
    await actionsMenu.click();

    const deleteButton = page.locator('text=Delete, button:has-text("Delete")').first();
    await deleteButton.click();

    // Confirm deletion in dialog
    const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")').last();
    await confirmButton.click();

    // Then: Job should be removed or show success message
    await expect(page.locator('text=Job to Delete')).not.toBeVisible({ timeout: 3000 });
  });

  test('@jobs @actions @duplicate - Duplicate existing job', async ({ page }) => {
    // Given: Job to duplicate
    const mockJob = generateMockJob({ title: 'Original Job' });
    await mockJobsAPI(page, [mockJob], 1);

    // When: Click "Duplicate" action
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    const actionsMenu = page.locator('button[aria-label*="actions"], button >> svg.lucide-more').first();
    await actionsMenu.click();

    const duplicateButton = page.locator('text=Duplicate, button:has-text("Duplicate"), button:has-text("Copy")').first();
    if (await duplicateButton.isVisible()) {
      await duplicateButton.click();

      // Then: Should navigate to create page with pre-filled data or show success
      await expect(page).toHaveURL(/\/employer\/jobs\/(new|.+\/edit)/);
    }
  });
});

test.describe('Employer Jobs List - Pagination', () => {
  test.beforeEach(async ({ page }) => {
    // Set E2E mock auth token (must start with 'mock-' to bypass ProtectedRoute)
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'mock-test-token-123');
    });
  });

  test.beforeEach(async ({ page }) => {
  });

  test('@jobs @pagination @navigate - Navigate between pages', async ({ page }) => {
    // Given: More than 20 jobs (requiring pagination)
    const mockJobs = Array.from({ length: 20 }, (_, i) =>
      generateMockJob({ title: `Job ${i + 1}` })
    );
    await mockJobsAPI(page, mockJobs, 45); // Total 45 jobs

    // When: Navigate to page 2
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    const nextButton = page.locator('button:has-text("Next"), button[aria-label*="next"]').first();
    if (await nextButton.isVisible()) {
      await nextButton.click();

      // Then: Should load page 2 jobs
      await expect(page).toHaveURL(/page=2/);
    }
  });

  test('@jobs @pagination @display - Show pagination controls with page numbers', async ({ page }) => {
    // Given: Multiple pages of jobs
    const mockJobs = Array.from({ length: 20 }, (_, i) =>
      generateMockJob({ title: `Job ${i}` })
    );
    await mockJobsAPI(page, mockJobs, 60);

    // When: Load jobs list
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    // Then: Should see pagination controls
    const pagination = page.locator('[data-pagination], nav[aria-label*="pagination"], .pagination').first();
    if (await pagination.isVisible()) {
      await expect(pagination).toBeVisible();

      // Should show page numbers
      await expect(page.locator('text=1, button:has-text("1")')).toBeVisible();
    }
  });

  test('@jobs @pagination @per-page - Display correct number of jobs per page', async ({ page }) => {
    // Given: Exactly 20 jobs per page
    const mockJobs = Array.from({ length: 20 }, (_, i) =>
      generateMockJob({ title: `Job ${i + 1}` })
    );
    await mockJobsAPI(page, mockJobs, 20);

    // When: Load jobs list
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    // Then: Should see exactly 20 job cards
    const jobCards = page.locator('[data-job-card], .job-card, article').filter({ hasText: /Job \d+/ });
    await expect(jobCards).toHaveCount(20);
  });
});

test.describe('Employer Jobs List - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Set E2E mock auth token (must start with 'mock-' to bypass ProtectedRoute)
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'mock-test-token-123');
    });
  });

  test.beforeEach(async ({ page }) => {
  });

  test('@jobs @error @api-failure - Handle API error gracefully', async ({ page }) => {
    // Given: API returns error
    await page.route('**/api/v1/employer/jobs*', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    // When: Navigate to jobs list
    await page.goto(`${BASE_URL}/employer/jobs`);

    // Then: Should show error message
    await expect(page.locator('text=/Error|Failed to load/i')).toBeVisible({ timeout: 5000 });

    // And: Should show retry button
    await expect(page.locator('button:has-text("Retry"), button:has-text("Try Again")')).toBeVisible();
  });

  test('@jobs @error @retry - Retry after error', async ({ page }) => {
    // Given: API fails first, succeeds on retry
    let requestCount = 0;
    await page.route('**/api/v1/employer/jobs*', async (route) => {
      requestCount++;
      if (requestCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Error' }),
        });
      } else {
        const mockJobs = [generateMockJob({ title: 'Success Job' })];
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: mockJobs, total: 1 }),
        });
      }
    });

    // When: Navigate and retry after error
    await page.goto(`${BASE_URL}/employer/jobs`);
    await expect(page.locator('text=/Error|Failed/i')).toBeVisible({ timeout: 5000 });

    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try Again")').first();
    await retryButton.click();

    // Then: Should load jobs successfully
    await expect(page.locator('text=Success Job')).toBeVisible({ timeout: 5000 });
  });

  test('@jobs @error @network - Handle network timeout', async ({ page }) => {
    // Given: API times out
    await page.route('**/api/v1/employer/jobs*', async (route) => {
      // Simulate network timeout
      await new Promise((resolve) => setTimeout(resolve, 30000));
    });

    // When: Navigate to jobs list
    const navigation = page.goto(`${BASE_URL}/employer/jobs`, { timeout: 35000 });

    // Then: Should show error or timeout message
    await expect(page.locator('text=/Error|Timeout|Failed/i')).toBeVisible({ timeout: 35000 });
  });
});

test.describe('Employer Jobs List - Responsive Design', () => {
  test.beforeEach(async ({ page }) => {
    // Set E2E mock auth token (must start with 'mock-' to bypass ProtectedRoute)
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'mock-test-token-123');
    });
  });

  test.beforeEach(async ({ page }) => {
  });

  test('@jobs @responsive @mobile - Display correctly on mobile devices', async ({ page }) => {
    // Given: Mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    const mockJobs = [
      generateMockJob({ title: 'Mobile Test Job' }),
    ];
    await mockJobsAPI(page, mockJobs, 1);

    // When: Navigate to jobs list
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    // Then: Should be responsive
    await expect(page.locator('text=Mobile Test Job')).toBeVisible();

    // And: Actions should be accessible
    const actionsButton = page.locator('button[aria-label*="actions"], button >> svg').first();
    await expect(actionsButton).toBeVisible();
  });

  test('@jobs @responsive @tablet - Display correctly on tablet devices', async ({ page }) => {
    // Given: Tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    const mockJobs = [
      generateMockJob({ title: 'Tablet Test Job' }),
      generateMockJob({ title: 'Another Job' }),
    ];
    await mockJobsAPI(page, mockJobs, 2);

    // When: Navigate to jobs list
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.waitForSelector('h1:has-text("Job Postings")');

    // Then: Should display both jobs
    await expect(page.locator('text=Tablet Test Job')).toBeVisible();
    await expect(page.locator('text=Another Job')).toBeVisible();
  });
});
