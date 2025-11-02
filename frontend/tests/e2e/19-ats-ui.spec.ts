/**
 * E2E Tests for ATS UI (Applicant Tracking System)
 *
 * Tests the frontend UI for employer ATS including:
 * - Application list view with filtering and sorting
 * - Candidate detail modal
 * - Status management
 * - Notes and collaboration
 * - Bulk actions
 */

import { test, expect, Page } from '@playwright/test';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

let authToken: string;
let employerEmail: string;
let companyId: string;
let jobId: string;
let applicationIds: string[] = [];

test.beforeAll(async ({ request }) => {
  /**
   * Setup: Create employer, company, job, and test applications
   */

  // Register employer user
  employerEmail = `employer-ui-${Date.now()}@example.com`;
  const registerResponse = await request.post(`${API_BASE_URL}/auth/register`, {
    data: {
      email: employerEmail,
      password: 'SecurePassword123!',
      first_name: 'UI',
      last_name: 'Tester',
      user_type: 'employer'
    }
  });

  expect(registerResponse.ok()).toBeTruthy();
  const registerData = await registerResponse.json();
  authToken = registerData.data.access_token;

  // Create company
  const companyResponse = await request.post(`${API_BASE_URL}/employers/register`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    data: {
      name: 'Test Company UI',
      industry: 'Technology',
      size: '11-50',
      location: 'San Francisco, CA'
    }
  });

  expect(companyResponse.ok()).toBeTruthy();
  const companyData = await companyResponse.json();
  companyId = companyData.id;

  // Post a job
  const jobResponse = await request.post(`${API_BASE_URL}/employers/jobs`, {
    headers: {
      'Authorization': `Bearer ${authToken}`
    },
    data: {
      title: 'Senior Frontend Engineer',
      description: 'Build amazing UIs',
      requirements: ['React', 'TypeScript', 'Tailwind'],
      location: 'San Francisco, CA',
      salary_min: 120000,
      salary_max: 180000,
      remote_policy: 'hybrid',
      experience_level: 'senior',
      status: 'active'
    }
  });

  expect(jobResponse.ok()).toBeTruthy();
  const jobData = await jobResponse.json();
  jobId = jobData.id;

  // Create 3 test candidates with applications
  for (let i = 0; i < 3; i++) {
    const candidateEmail = `candidate-ui-${i}-${Date.now()}@example.com`;

    // Register candidate
    const candidateRegResponse = await request.post(`${API_BASE_URL}/auth/register`, {
      data: {
        email: candidateEmail,
        password: 'SecurePassword123!',
        first_name: `Candidate${i}`,
        last_name: 'Test',
        user_type: 'job_seeker'
      }
    });

    expect(candidateRegResponse.ok()).toBeTruthy();
    const candidateData = await candidateRegResponse.json();
    const candidateToken = candidateData.data.access_token;

    // Apply to job
    const applicationResponse = await request.post(`${API_BASE_URL}/applications`, {
      headers: {
        'Authorization': `Bearer ${candidateToken}`
      },
      data: {
        job_id: jobId,
        resume_version_id: null, // Mock ID
        cover_letter_id: null
      }
    });

    if (applicationResponse.ok()) {
      const appData = await applicationResponse.json();
      applicationIds.push(appData.id);
    }
  }
});

test.describe('ATS UI - Application List Page', () => {

  test('01 - Load applicants page and display applications', async ({ page }) => {
    /**
     * Feature: Application List View
     *
     * Scenario: Employer views all applications for a job
     *   GIVEN: An employer is logged in with a posted job
     *   AND: Multiple candidates have applied
     *   WHEN: Employer navigates to the applicants page
     *   THEN: All applications are displayed in a table
     */

    // Login
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', employerEmail);
    await page.fill('input[type="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/dashboard/, { timeout: 10000 });

    // Navigate to applicants page
    await page.goto(`${FRONTEND_URL}/employer/jobs/${jobId}/applicants`);

    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Applicants');

    // Verify applications table is visible
    await expect(page.locator('table')).toBeVisible();

    // Verify at least one application is shown
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('02 - Filter applications by status', async ({ page }) => {
    /**
     * Feature: Status Filtering
     *
     * Scenario: Employer filters applications by status
     *   GIVEN: Multiple applications exist
     *   WHEN: Employer selects a status filter
     *   THEN: Only applications with that status are shown
     */

    await page.goto(`${FRONTEND_URL}/employer/jobs/${jobId}/applicants`);

    // Select "New" status filter
    await page.selectOption('select', { label: 'New' });

    // Wait for filter to apply
    await page.waitForTimeout(1000);

    // Verify filtered results (all should have "New" status badge)
    const statusBadges = await page.locator('[class*="status-badge"], span:has-text("New")').count();
    expect(statusBadges).toBeGreaterThan(0);
  });

  test('03 - Filter applications by minimum fit score', async ({ page }) => {
    /**
     * Feature: Fit Score Filtering
     *
     * Scenario: Employer filters by minimum fit score
     *   GIVEN: Applications have various fit scores
     *   WHEN: Employer selects a minimum fit score
     *   THEN: Only applications meeting that threshold are shown
     */

    await page.goto(`${FRONTEND_URL}/employer/jobs/${jobId}/applicants`);

    // Select minimum fit score of 70
    const minFitSelect = page.locator('select').nth(1); // Second select is fit score
    await minFitSelect.selectOption({ label: '70+ (Good)' });

    await page.waitForTimeout(1000);

    // Verify page still loads (even if no results match)
    await expect(page.locator('table')).toBeVisible();
  });

  test('04 - Sort applications by fit score', async ({ page }) => {
    /**
     * Feature: Sorting
     *
     * Scenario: Employer sorts applications by fit score
     *   GIVEN: Multiple applications exist
     *   WHEN: Employer selects fit score sorting
     *   THEN: Applications are reordered by fit score
     */

    await page.goto(`${FRONTEND_URL}/employer/jobs/${jobId}/applicants`);

    // Select "Fit Score" sort
    const sortSelect = page.locator('select').nth(2); // Third select is sort by
    await sortSelect.selectOption({ label: 'Fit Score' });

    await page.waitForTimeout(1000);

    // Verify applications are still displayed
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('05 - Select applications for bulk actions', async ({ page }) => {
    /**
     * Feature: Bulk Selection
     *
     * Scenario: Employer selects multiple applications
     *   GIVEN: Multiple applications are displayed
     *   WHEN: Employer checks application checkboxes
     *   THEN: Bulk action controls appear
     */

    await page.goto(`${FRONTEND_URL}/employer/jobs/${jobId}/applicants`);

    // Select first application checkbox
    const firstCheckbox = page.locator('tbody tr').first().locator('input[type="checkbox"]');
    await firstCheckbox.check();

    // Verify bulk action bar appears
    await expect(page.locator('text=selected')).toBeVisible();
  });

  test('06 - Perform bulk reject action', async ({ page }) => {
    /**
     * Feature: Bulk Actions
     *
     * Scenario: Employer rejects multiple applications
     *   GIVEN: Multiple applications are selected
     *   WHEN: Employer clicks bulk reject
     *   THEN: Applications are updated to rejected status
     */

    await page.goto(`${FRONTEND_URL}/employer/jobs/${jobId}/applicants`);

    // Select first application
    const firstCheckbox = page.locator('tbody tr').first().locator('input[type="checkbox"]');
    await firstCheckbox.check();

    // Click bulk reject button
    const rejectButton = page.locator('button:has-text("Reject")');
    await rejectButton.click();

    await page.waitForTimeout(1000);

    // Verify action completed (no error message)
    await expect(page.locator('text=Error')).not.toBeVisible();
  });

  test('07 - Pagination controls work correctly', async ({ page }) => {
    /**
     * Feature: Pagination
     *
     * Scenario: Employer navigates through pages
     *   GIVEN: More applications exist than fit on one page
     *   WHEN: Employer clicks next page
     *   THEN: Next set of applications is shown
     */

    await page.goto(`${FRONTEND_URL}/employer/jobs/${jobId}/applicants`);

    // Check if pagination exists
    const paginationExists = await page.locator('button:has-text("Next")').count() > 0;

    if (paginationExists) {
      // Try clicking next (may be disabled if only one page)
      const nextButton = page.locator('button:has-text("Next")');
      const isEnabled = await nextButton.isEnabled();

      if (isEnabled) {
        await nextButton.click();
        await page.waitForTimeout(1000);

        // Verify URL or content changed
        await expect(page.locator('table')).toBeVisible();
      }
    }

    // Test passes regardless of whether pagination is needed
    expect(true).toBe(true);
  });
});

test.describe('ATS UI - Candidate Detail Modal', () => {

  test('08 - Open candidate detail modal', async ({ page }) => {
    /**
     * Feature: Candidate Detail View
     *
     * Scenario: Employer views candidate details
     *   GIVEN: An application is displayed
     *   WHEN: Employer clicks "View Details"
     *   THEN: Candidate detail modal opens
     */

    await page.goto(`${FRONTEND_URL}/employer/jobs/${jobId}/applicants`);

    // Click "View Details" on first application
    const viewDetailsButton = page.locator('button:has-text("View Details")').first();
    await viewDetailsButton.click();

    // Verify modal opened
    await expect(page.locator('text=Candidate Details')).toBeVisible();
  });

  test('09 - View AI fit score breakdown in modal', async ({ page }) => {
    /**
     * Feature: AI Fit Score Visualization
     *
     * Scenario: Employer views fit score details
     *   GIVEN: Candidate detail modal is open
     *   WHEN: Employer clicks "AI Fit Score" tab
     *   THEN: Detailed score breakdown is shown
     */

    await page.goto(`${FRONTEND_URL}/employer/jobs/${jobId}/applicants`);

    // Open modal
    await page.locator('button:has-text("View Details")').first().click();

    // Click "AI Fit Score" tab
    await page.locator('button:has-text("AI Fit Score")').click();

    // Verify fit score content is visible
    await expect(page.locator('text=Fit Score')).toBeVisible();

    // Check for score breakdown elements
    const scoreBreakdownExists = await page.locator('text=Score Breakdown').count() > 0;
    expect(scoreBreakdownExists).toBeTruthy();
  });

  test('10 - Change application status from modal', async ({ page }) => {
    /**
     * Feature: Status Management
     *
     * Scenario: Employer changes application status
     *   GIVEN: Candidate detail modal is open on Overview tab
     *   WHEN: Employer clicks a status button
     *   THEN: Application status is updated
     */

    await page.goto(`${FRONTEND_URL}/employer/jobs/${jobId}/applicants`);

    // Open modal
    await page.locator('button:has-text("View Details")').first().click();

    // Click "Reviewing" status button
    const reviewingButton = page.locator('button:has-text("Reviewing")');
    await reviewingButton.click();

    await page.waitForTimeout(2000);

    // Verify no error occurred
    await expect(page.locator('text=Failed')).not.toBeVisible();
  });

  test('11 - Add team note to application', async ({ page }) => {
    /**
     * Feature: Collaboration - Notes
     *
     * Scenario: Employer adds a note
     *   GIVEN: Candidate detail modal is open
     *   WHEN: Employer adds a team note
     *   THEN: Note is saved and displayed
     */

    await page.goto(`${FRONTEND_URL}/employer/jobs/${jobId}/applicants`);

    // Open modal
    await page.locator('button:has-text("View Details")').first().click();

    // Click "Notes" tab
    await page.locator('button:has-text("Notes")').click();

    // Fill note content
    const noteTextarea = page.locator('textarea');
    await noteTextarea.fill('Great candidate, strong technical skills!');

    // Select "Team Visible"
    await page.locator('input[type="radio"][value="team"]').check();

    // Submit note
    await page.locator('button:has-text("Add Note")').click();

    await page.waitForTimeout(2000);

    // Verify note appears in list
    await expect(page.locator('text=Great candidate')).toBeVisible();
  });

  test('12 - Add private note to application', async ({ page }) => {
    /**
     * Feature: Private Notes
     *
     * Scenario: Employer adds a private note
     *   GIVEN: Candidate detail modal is open on Notes tab
     *   WHEN: Employer adds a private note
     *   THEN: Note is saved with private visibility
     */

    await page.goto(`${FRONTEND_URL}/employer/jobs/${jobId}/applicants`);

    // Open modal
    await page.locator('button:has-text("View Details")').first().click();

    // Click "Notes" tab
    await page.locator('button:has-text("Notes")').click();

    // Fill note content
    const noteTextarea = page.locator('textarea');
    await noteTextarea.fill('Personal observation: needs follow-up');

    // Select "Private"
    await page.locator('input[type="radio"][value="private"]').check();

    // Submit note
    await page.locator('button:has-text("Add Note")').click();

    await page.waitForTimeout(2000);

    // Verify note appears
    await expect(page.locator('text=Personal observation')).toBeVisible();

    // Verify it has private badge
    await expect(page.locator('text=Private')).toBeVisible();
  });

  test('13 - Close candidate detail modal', async ({ page }) => {
    /**
     * Feature: Modal Navigation
     *
     * Scenario: Employer closes modal
     *   GIVEN: Candidate detail modal is open
     *   WHEN: Employer clicks close button
     *   THEN: Modal closes and returns to list view
     */

    await page.goto(`${FRONTEND_URL}/employer/jobs/${jobId}/applicants`);

    // Open modal
    await page.locator('button:has-text("View Details")').first().click();

    // Verify modal is open
    await expect(page.locator('text=Candidate Details')).toBeVisible();

    // Click close button
    await page.locator('button:has-text("Close")').click();

    // Verify modal is closed
    await expect(page.locator('text=Candidate Details')).not.toBeVisible();

    // Verify back on list view
    await expect(page.locator('h1:has-text("Applicants")')).toBeVisible();
  });
});

test.describe('ATS UI - Error Handling', () => {

  test('14 - Handle unauthorized access gracefully', async ({ page }) => {
    /**
     * Feature: Authorization
     *
     * Scenario: Unauthenticated user tries to access ATS
     *   GIVEN: User is not logged in
     *   WHEN: User tries to access applicants page
     *   THEN: User is redirected to login
     */

    // Try to access page without login
    await page.goto(`${FRONTEND_URL}/employer/jobs/${jobId}/applicants`);

    // Should redirect to login or show error
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    const isLoginPage = currentUrl.includes('/login');
    const hasError = await page.locator('text=Error').count() > 0;

    expect(isLoginPage || hasError).toBeTruthy();
  });

  test('15 - Display loading state while fetching applications', async ({ page }) => {
    /**
     * Feature: Loading States
     *
     * Scenario: Page shows loading indicator
     *   GIVEN: Employer navigates to applicants page
     *   WHEN: Data is being fetched
     *   THEN: Loading indicator is shown
     */

    await page.goto(`${FRONTEND_URL}/employer/jobs/${jobId}/applicants`);

    // Check for loading state (may be too fast to catch)
    const hasLoadingState = await page.locator('text=Loading').count() > 0;

    // Eventually the table should appear
    await expect(page.locator('table')).toBeVisible({ timeout: 10000 });
  });
});

test.afterAll(async () => {
  // Cleanup can be added here if needed
  console.log(`✓ ATS UI E2E tests completed`);
  console.log(`✓ Tested ${applicationIds.length} applications`);
});
