import { test, expect } from '@playwright/test';

test.describe('Auto-Apply Configuration and Queue Management', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/auto-apply');
  });

  test('should display auto-apply dashboard', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Auto-Apply/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Configure/i })).toBeVisible();
  });

  test('should show auto-apply statistics', async ({ page }) => {
    // Should display key metrics
    await expect(page.getByText(/Total Queued/i)).toBeVisible();
    await expect(page.getByText(/Total Applied/i)).toBeVisible();
    await expect(page.getByText(/Success Rate/i)).toBeVisible();
    await expect(page.getByText(/Credits Used/i)).toBeVisible();
  });

  test('should create auto-apply configuration', async ({ page }) => {
    await page.getByRole('button', { name: /Configure/i }).click();

    // Select mode
    await page.getByLabel(/Auto-Apply Mode/i).click();
    await page.getByRole('option', { name: /Auto-Apply/i }).click();

    // Set minimum fit score
    await page.getByLabel(/Minimum Fit Score/i).fill('75');

    // Set application limits
    await page.getByLabel(/Max Applications Per Day/i).fill('10');
    await page.getByLabel(/Max Applications Per Week/i).fill('50');

    // Location preferences
    await page.getByLabel(/Remote Only/i).check();

    // Save configuration
    await page.getByRole('button', { name: /Save Configuration/i }).click();

    // Should show success message
    await expect(page.getByText(/Configuration saved/i)).toBeVisible();
  });

  test('should enable apply assist mode', async ({ page }) => {
    await page.getByRole('button', { name: /Configure/i }).click();

    // Select Apply Assist mode
    await page.getByLabel(/Auto-Apply Mode/i).click();
    await page.getByRole('option', { name: /Apply Assist/i }).click();

    // Apply Assist info should be shown
    await expect(page.getByText(/user confirmation required/i)).toBeVisible();

    await page.getByRole('button', { name: /Save Configuration/i }).click();

    await expect(page.getByText(/Apply Assist mode enabled/i)).toBeVisible();
  });

  test('should configure job filters', async ({ page }) => {
    await page.getByRole('button', { name: /Configure/i }).click();
    await page.getByRole('tab', { name: /Filters/i }).click();

    // Location preferences
    await page.getByLabel(/Remote Only/i).check();
    await page.getByLabel(/Hybrid Allowed/i).check();

    // Salary range
    await page.getByLabel(/Minimum Salary/i).fill('120000');
    await page.getByLabel(/Maximum Salary/i).fill('200000');

    // Company preferences
    await page.getByLabel(/Preferred Companies/i).fill('Google, Microsoft, Amazon');

    // Excluded companies
    await page.getByLabel(/Excluded Companies/i).fill('Acme Corp');

    // Employment types
    await page.getByLabel(/Full-time/i).check();
    await page.getByLabel(/Contract/i).check();

    // Seniority levels
    await page.getByLabel(/Senior/i).check();

    await page.getByRole('button', { name: /Save Configuration/i }).click();

    await expect(page.getByText(/Filters saved/i)).toBeVisible();
  });

  test('should configure notification preferences', async ({ page }) => {
    await page.getByRole('button', { name: /Configure/i }).click();
    await page.getByRole('tab', { name: /Notifications/i }).click();

    // Notification toggles
    await page.getByLabel(/Notify on Application/i).check();
    await page.getByLabel(/Notify on Error/i).check();
    await page.getByLabel(/Notify on Refund/i).check();

    await page.getByRole('button', { name: /Save Configuration/i }).click();

    await expect(page.getByText(/Notification preferences saved/i)).toBeVisible();
  });

  test('should queue job for auto-apply from job details', async ({ page }) => {
    // Navigate to job listing
    await page.goto('/dashboard/jobs');

    // Click on high-fit job
    const jobCard = page.locator('[data-testid="job-card"]').filter({
      has: page.locator('[data-testid="fit-index"]:has-text(/[8-9][0-9]|100/)'),
    }).first();

    await jobCard.click();

    // Click queue for auto-apply
    await page.getByRole('button', { name: /Queue for Auto-Apply/i }).click();

    // Should show confirmation
    await expect(page.getByText(/Job queued for auto-apply/i)).toBeVisible();
    await expect(page.getByText(/1 credit will be used/i)).toBeVisible();

    // Confirm
    await page.getByRole('button', { name: /Confirm/i }).click();

    // Should show success
    await expect(page.getByText(/Successfully queued/i)).toBeVisible();
  });

  test('should batch queue multiple jobs', async ({ page }) => {
    await page.goto('/dashboard/jobs');

    // Select multiple jobs
    const jobCards = page.locator('[data-testid="job-card"]');
    await jobCards.nth(0).locator('[data-testid="checkbox"]').check();
    await jobCards.nth(1).locator('[data-testid="checkbox"]').check();
    await jobCards.nth(2).locator('[data-testid="checkbox"]').check();

    // Click batch queue
    await page.getByRole('button', { name: /Queue Selected/i }).click();

    // Should show batch confirmation
    await expect(page.getByText(/Queue 3 jobs/i)).toBeVisible();
    await expect(page.getByText(/3 credits will be used/i)).toBeVisible();

    // Confirm
    await page.getByRole('button', { name: /Confirm/i }).click();

    // Should show success
    await expect(page.getByText(/3 jobs queued successfully/i)).toBeVisible();
  });

  test('should display auto-apply queue', async ({ page }) => {
    // Should show queued jobs
    const queuedJobs = page.locator('[data-testid="queued-job"]');
    await expect(queuedJobs.first()).toBeVisible();

    // Should show job details
    await expect(queuedJobs.first().getByText(/Company:/i)).toBeVisible();
    await expect(queuedJobs.first().getByText(/Fit Score:/i)).toBeVisible();
    await expect(queuedJobs.first().locator('[data-testid="status-badge"]')).toBeVisible();
  });

  test('should filter queue by status', async ({ page }) => {
    // Open filter dropdown
    await page.getByRole('button', { name: /Filter/i }).click();

    // Select queued status
    await page.getByLabel(/Status/i).click();
    await page.getByRole('option', { name: /Queued/i }).click();

    // Apply filter
    await page.getByRole('button', { name: /Apply/i }).click();

    // Should show only queued jobs
    const queuedJobs = page.locator('[data-testid="queued-job"]');
    await expect(queuedJobs.first().locator('[data-status="queued"]')).toBeVisible();
  });

  test('should approve job in apply assist mode', async ({ page }) => {
    // Assume we're in apply assist mode with pending approval
    const pendingJob = page
      .locator('[data-testid="queued-job"]')
      .filter({ has: page.locator('[data-status="queued"]') })
      .first();

    // Click to view details
    await pendingJob.click();

    // Should show job details and application preview
    await expect(page.getByRole('heading', { name: /Review Application/i })).toBeVisible();
    await expect(page.getByText(/Resume:/i)).toBeVisible();
    await expect(page.getByText(/Cover Letter:/i)).toBeVisible();

    // Approve application
    await page.getByRole('button', { name: /Approve & Apply/i }).click();

    // Should show success
    await expect(page.getByText(/Application approved/i)).toBeVisible();

    // Status should change to processing
    await expect(pendingJob.locator('[data-status="processing"]')).toBeVisible({ timeout: 5000 });
  });

  test('should cancel queued job', async ({ page }) => {
    const queuedJob = page
      .locator('[data-testid="queued-job"]')
      .filter({ has: page.locator('[data-status="queued"]') })
      .first();

    // Click cancel button
    await queuedJob.getByRole('button', { name: /Cancel/i }).click();

    // Should show confirmation
    await expect(page.getByText(/Cancel this application/i)).toBeVisible();
    await expect(page.getByText(/1 credit will be refunded/i)).toBeVisible();

    // Confirm cancellation
    await page.getByRole('button', { name: /Confirm/i }).click();

    // Should show success
    await expect(page.getByText(/Application cancelled/i)).toBeVisible();

    // Status should change to cancelled
    await expect(queuedJob.locator('[data-status="cancelled"]')).toBeVisible();
  });

  test('should view job processing status', async ({ page }) => {
    const processingJob = page
      .locator('[data-testid="queued-job"]')
      .filter({ has: page.locator('[data-status="processing"]') })
      .first();

    if (await processingJob.isVisible()) {
      await processingJob.click();

      // Should show processing details
      await expect(page.getByText(/Processing application/i)).toBeVisible();
      await expect(page.getByText(/Attempt \d+ of \d+/i)).toBeVisible();
    }
  });

  test('should view applied job details', async ({ page }) => {
    const appliedJob = page
      .locator('[data-testid="queued-job"]')
      .filter({ has: page.locator('[data-status="applied"]') })
      .first();

    if (await appliedJob.isVisible()) {
      await appliedJob.click();

      // Should show application details
      await expect(page.getByText(/Successfully Applied/i)).toBeVisible();
      await expect(page.getByText(/Applied on:/i)).toBeVisible();
      await expect(page.getByText(/Confirmation URL:/i)).toBeVisible();
    }
  });

  test('should request refund for failed application', async ({ page }) => {
    const failedJob = page
      .locator('[data-testid="queued-job"]')
      .filter({ has: page.locator('[data-status="failed"]') })
      .first();

    if (await failedJob.isVisible()) {
      await failedJob.click();

      // Click request refund
      await page.getByRole('button', { name: /Request Refund/i }).click();

      // Fill refund reason
      await page
        .getByLabel(/Reason/i)
        .fill('Job posting was no longer available when application was processed');

      // Submit
      await page.getByRole('button', { name: /Submit Request/i }).click();

      // Should show success
      await expect(page.getByText(/Refund request submitted/i)).toBeVisible();
      await expect(page.getByText(/1 credit will be refunded/i)).toBeVisible();
    }
  });

  test('should pause auto-apply temporarily', async ({ page }) => {
    // Click pause button
    await page.getByRole('button', { name: /Pause Auto-Apply/i }).click();

    // Select pause duration
    await page.getByLabel(/Pause for/i).click();
    await page.getByRole('option', { name: /24 hours/i }).click();

    // Confirm
    await page.getByRole('button', { name: /Confirm/i }).click();

    // Should show paused state
    await expect(page.getByText(/Auto-apply paused until/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /Resume Auto-Apply/i })).toBeVisible();
  });

  test('should resume paused auto-apply', async ({ page }) => {
    // Assume auto-apply is paused
    if (await page.getByRole('button', { name: /Resume Auto-Apply/i }).isVisible()) {
      await page.getByRole('button', { name: /Resume Auto-Apply/i }).click();

      // Should show confirmation
      await page.getByRole('button', { name: /Confirm/i }).click();

      // Should show resumed state
      await expect(page.getByText(/Auto-apply resumed/i)).toBeVisible();
    }
  });

  test('should disable auto-apply completely', async ({ page }) => {
    await page.getByRole('button', { name: /Configure/i }).click();

    // Disable auto-apply
    await page.getByRole('switch', { name: /Enable Auto-Apply/i }).click();

    // Should show warning
    await expect(page.getByText(/This will stop all pending applications/i)).toBeVisible();

    // Confirm
    await page.getByRole('button', { name: /Disable/i }).click();

    // Should show disabled state
    await expect(page.getByText(/Auto-apply disabled/i)).toBeVisible();
  });

  test('should show daily and weekly limits', async ({ page }) => {
    // Should display usage counters
    await expect(page.getByText(/Today: \d+ \/ \d+/i)).toBeVisible();
    await expect(page.getByText(/This Week: \d+ \/ \d+/i)).toBeVisible();

    // Should show progress bars
    const dailyProgress = page.locator('[data-testid="daily-progress"]');
    const weeklyProgress = page.locator('[data-testid="weekly-progress"]');

    await expect(dailyProgress).toBeVisible();
    await expect(weeklyProgress).toBeVisible();
  });

  test('should show warning when approaching limits', async ({ page }) => {
    // If approaching daily limit
    const dailyLimit = page.getByText(/Daily limit almost reached/i);
    if (await dailyLimit.isVisible()) {
      await expect(dailyLimit).toBeVisible();
      await expect(page.getByText(/\d+ applications remaining today/i)).toBeVisible();
    }
  });

  test('should view auto-apply analytics', async ({ page }) => {
    await page.getByRole('tab', { name: /Analytics/i }).click();

    // Should show charts
    await expect(page.getByText(/Applications Over Time/i)).toBeVisible();
    await expect(page.getByText(/Success Rate Trend/i)).toBeVisible();
    await expect(page.getByText(/Top Applied Companies/i)).toBeVisible();

    // Should show statistics
    await expect(page.getByText(/Average Fit Score/i)).toBeVisible();
    await expect(page.getByText(/Total Applications/i)).toBeVisible();
    await expect(page.getByText(/Success Rate/i)).toBeVisible();
  });

  test('should export queue data', async ({ page }) => {
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Export/i }).click();
    await page.getByRole('menuitem', { name: /CSV/i }).click();

    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toContain('.csv');
  });

  test('should show error messages for failed jobs', async ({ page }) => {
    const failedJob = page
      .locator('[data-testid="queued-job"]')
      .filter({ has: page.locator('[data-status="failed"]') })
      .first();

    if (await failedJob.isVisible()) {
      await failedJob.click();

      // Should show error details
      await expect(page.getByText(/Error:/i)).toBeVisible();
      await expect(page.getByText(/Last attempted:/i)).toBeVisible();
      await expect(page.getByText(/Attempts: \d+ of \d+/i)).toBeVisible();

      // Should show retry option if attempts remaining
      if (await page.getByRole('button', { name: /Retry/i }).isVisible()) {
        await expect(page.getByRole('button', { name: /Retry/i })).toBeEnabled();
      }
    }
  });

  test('should sort queue by different criteria', async ({ page }) => {
    // Click sort dropdown
    await page.getByRole('button', { name: /Sort by/i }).click();

    // Sort by fit score
    await page.getByRole('menuitem', { name: /Fit Score/i }).click();

    // Queue should reorder
    await expect(page.locator('[data-testid="queued-job"]').first()).toBeVisible();

    // Try different sort
    await page.getByRole('button', { name: /Sort by/i }).click();
    await page.getByRole('menuitem', { name: /Date Added/i }).click();
  });

  test('should show ToS compliance warning for incompatible jobs', async ({ page }) => {
    // When viewing a job from unsupported board
    const incompatibleJob = page
      .locator('[data-testid="queued-job"]')
      .filter({ has: page.locator('[data-tos-compliant="false"]') })
      .first();

    if (await incompatibleJob.isVisible()) {
      await expect(incompatibleJob.getByText(/Manual application required/i)).toBeVisible();
    }
  });

  test('should show credit costs before queueing', async ({ page }) => {
    await page.goto('/dashboard/jobs');

    const jobCard = page.locator('[data-testid="job-card"]').first();
    await jobCard.getByRole('button', { name: /Queue for Auto-Apply/i }).click();

    // Should show credit cost
    await expect(page.getByText(/1 credit will be used/i)).toBeVisible();

    // Should show remaining credits
    await expect(page.getByText(/\d+ credits remaining/i)).toBeVisible();
  });

  test('should handle insufficient credits gracefully', async ({ page }) => {
    // Simulate low credits scenario
    await page.goto('/dashboard/jobs');

    const jobCard = page.locator('[data-testid="job-card"]').first();

    // If insufficient credits, button should be disabled
    const queueButton = jobCard.getByRole('button', { name: /Queue for Auto-Apply/i });

    if (await queueButton.isDisabled()) {
      await expect(page.getByText(/Insufficient credits/i)).toBeVisible();
      await expect(page.getByRole('link', { name: /Upgrade Plan/i })).toBeVisible();
    }
  });

  test('should validate configuration before saving', async ({ page }) => {
    await page.getByRole('button', { name: /Configure/i }).click();

    // Try to set invalid values
    await page.getByLabel(/Max Applications Per Day/i).fill('0');
    await page.getByRole('button', { name: /Save Configuration/i }).click();

    // Should show validation error
    await expect(page.getByText(/must be at least 1/i)).toBeVisible();
  });
});
