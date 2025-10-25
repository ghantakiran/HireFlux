import { test, expect } from '@playwright/test';

test.describe('Job Matching and Application Flow', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/jobs');
  });

  test('should display job matches dashboard', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Job Matches/i })).toBeVisible();
    await expect(page.getByText(/Top Matches for You/i)).toBeVisible();
  });

  test('should show jobs with fit index scores', async ({ page }) => {
    // Should display job cards
    const jobCards = page.locator('[data-testid="job-card"]');
    await expect(jobCards.first()).toBeVisible();

    // Each job should have fit index
    const fitIndex = jobCards.first().locator('[data-testid="fit-index"]');
    await expect(fitIndex).toBeVisible();
    await expect(fitIndex).toContainText(/\d+/); // Contains a number
  });

  test('should filter jobs by location type', async ({ page }) => {
    // Open filters
    await page.getByRole('button', { name: /Filters/i }).click();

    // Select remote only
    await page.getByLabel(/Remote/i).check();

    // Apply filters
    await page.getByRole('button', { name: /Apply Filters/i }).click();

    // All displayed jobs should show remote
    const jobCards = page.locator('[data-testid="job-card"]');
    await expect(jobCards.first().getByText(/Remote/i)).toBeVisible();
  });

  test('should filter jobs by salary range', async ({ page }) => {
    await page.getByRole('button', { name: /Filters/i }).click();

    // Set minimum salary
    await page.getByLabel(/Minimum Salary/i).fill('120000');

    await page.getByRole('button', { name: /Apply Filters/i }).click();

    // Should update job listings
    await expect(page.getByText(/Showing.*jobs/i)).toBeVisible();
  });

  test('should filter jobs by visa sponsorship', async ({ page }) => {
    await page.getByRole('button', { name: /Filters/i }).click();

    await page.getByLabel(/Visa Sponsorship/i).check();

    await page.getByRole('button', { name: /Apply Filters/i }).click();

    // Should show only jobs with visa sponsorship
    const jobCards = page.locator('[data-testid="job-card"]');
    await expect(jobCards.first().getByText(/Visa.*Sponsor/i)).toBeVisible();
  });

  test('should view job details', async ({ page }) => {
    // Click on first job card
    const jobCard = page.locator('[data-testid="job-card"]').first();
    await jobCard.click();

    // Should open job details panel
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Job Description/i)).toBeVisible();
    await expect(page.getByText(/Requirements/i)).toBeVisible();
    await expect(page.getByText(/Why This Matches/i)).toBeVisible();
  });

  test('should see skill match breakdown', async ({ page }) => {
    const jobCard = page.locator('[data-testid="job-card"]').first();
    await jobCard.click();

    // Should show matched and missing skills
    await expect(page.getByText(/Matched Skills/i)).toBeVisible();
    await expect(page.getByText(/Missing Skills/i)).toBeVisible();

    // Should highlight matched skills
    const matchedSkills = page.locator('[data-testid="matched-skill"]');
    await expect(matchedSkills.first()).toBeVisible();
  });

  test('should save job for later', async ({ page }) => {
    const jobCard = page.locator('[data-testid="job-card"]').first();

    // Click save button
    await jobCard.getByRole('button', { name: /Save/i }).click();

    // Should show saved indicator
    await expect(jobCard.getByRole('button', { name: /Saved/i })).toBeVisible();

    // Check saved jobs
    await page.getByRole('link', { name: /Saved Jobs/i }).click();

    // Should see saved job
    await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();
  });

  test('should apply to job with Apply Assist', async ({ page }) => {
    const jobCard = page.locator('[data-testid="job-card"]').first();
    await jobCard.click();

    // Click apply button
    await page.getByRole('button', { name: /Apply/i }).click();

    // Should show application options
    await expect(page.getByRole('heading', { name: /Apply to Job/i })).toBeVisible();

    // Select Apply Assist mode
    await page.getByRole('radio', { name: /Apply Assist/i }).check();

    // Select resume
    await page.getByLabel(/Select Resume/i).click();
    await page.getByRole('option').first().click();

    // Generate cover letter
    await page.getByRole('checkbox', { name: /Generate Cover Letter/i }).check();

    // Proceed
    await page.getByRole('button', { name: /Proceed/i }).click();

    // Should show application preview
    await expect(page.getByText(/Review Application/i)).toBeVisible();
    await expect(page.getByText(/Resume/i)).toBeVisible();
    await expect(page.getByText(/Cover Letter/i)).toBeVisible();

    // Confirm application
    await page.getByRole('button', { name: /Confirm & Apply/i }).click();

    // Should show success message
    await expect(page.getByText(/Application submitted/i)).toBeVisible();

    // Should deduct credits
    await expect(page.getByText(/1 credit used/i)).toBeVisible();
  });

  test('should enable auto-apply for high-fit jobs', async ({ page }) => {
    // Navigate to auto-apply settings
    await page.getByRole('button', { name: /Auto-Apply Settings/i }).click();

    // Enable auto-apply
    await page.getByRole('switch', { name: /Enable Auto-Apply/i }).click();

    // Set minimum fit index
    await page.getByLabel(/Minimum Fit Index/i).fill('75');

    // Set monthly limit
    await page.getByLabel(/Monthly Application Limit/i }).fill('20');

    // Save settings
    await page.getByRole('button', { name: /Save Settings/i }).click();

    // Should show confirmation
    await expect(page.getByText(/Auto-apply enabled/i)).toBeVisible();
  });

  test('should track application status', async ({ page }) => {
    // Navigate to applications
    await page.getByRole('link', { name: /My Applications/i }).click();

    // Should show applications pipeline
    await expect(page.getByText(/Applied/i)).toBeVisible();
    await expect(page.getByText(/In Review/i)).toBeVisible();
    await expect(page.getByText(/Interview/i)).toBeVisible();
    await expect(page.getByText(/Offer/i)).toBeVisible();

    // Should display application cards
    const appCard = page.locator('[data-testid="application-card"]').first();
    await expect(appCard).toBeVisible();
  });

  test('should view application details', async ({ page }) => {
    await page.getByRole('link', { name: /My Applications/i }).click();

    const appCard = page.locator('[data-testid="application-card"]').first();
    await appCard.click();

    // Should show application timeline
    await expect(page.getByText(/Application Timeline/i)).toBeVisible();
    await expect(page.getByText(/Applied on/i)).toBeVisible();

    // Should show submitted documents
    await expect(page.getByText(/Resume/i)).toBeVisible();
    await expect(page.getByText(/Cover Letter/i)).toBeVisible();
  });

  test('should request credit refund for invalid job', async ({ page }) => {
    await page.getByRole('link', { name: /My Applications/i }).click();

    const appCard = page.locator('[data-testid="application-card"]').first();
    await appCard.getByRole('button', { name: /More/i }).click();

    // Request refund
    await page.getByRole('menuitem', { name: /Request Refund/i }).click();

    // Select reason
    await page.getByLabel(/Reason/i).click();
    await page.getByRole('option', { name: /Job no longer available/i }).click();

    // Provide details
    await page.getByLabel(/Additional Details/i).fill('Job posting was removed from company website');

    // Submit request
    await page.getByRole('button', { name: /Submit Request/i }).click();

    // Should show confirmation
    await expect(page.getByText(/Refund request submitted/i)).toBeVisible();
  });

  test('should sort jobs by different criteria', async ({ page }) => {
    // Click sort dropdown
    await page.getByRole('button', { name: /Sort by/i }).click();

    // Sort by fit index
    await page.getByRole('menuitem', { name: /Best Match/i }).click();

    // Should reorder jobs
    await expect(page.locator('[data-testid="job-card"]').first()).toBeVisible();

    // Try different sort
    await page.getByRole('button', { name: /Sort by/i }).click();
    await page.getByRole('menuitem', { name: /Recently Posted/i }).click();
  });

  test('should search jobs by keywords', async ({ page }) => {
    // Enter search query
    await page.getByPlaceholder(/Search jobs/i).fill('Senior Software Engineer');
    await page.keyboard.press('Enter');

    // Should filter results
    await expect(page.getByText(/Showing.*results for.*Senior Software Engineer/i)).toBeVisible();

    // Results should match search
    const jobCards = page.locator('[data-testid="job-card"]');
    await expect(jobCards.first().getByText(/Software Engineer/i)).toBeVisible();
  });
});
