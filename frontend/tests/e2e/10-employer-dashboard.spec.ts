/**
 * E2E Tests for Employer Dashboard
 * Sprint 19-20 Week 39 Day 3
 *
 * Tests the complete employer dashboard with statistics, activity feed, and quick actions
 */

import { test, expect } from '@playwright/test';

test.describe('Employer Dashboard - Normal View', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/employer-dashboard');

    // Wait for dashboard to load
    await expect(page.getByRole('heading', { name: /techcorp inc/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display company name and welcome message', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /techcorp inc/i })).toBeVisible();
    await expect(page.getByText(/welcome back.*hiring overview/i)).toBeVisible();
  });

  test('should display all stat cards with correct data', async ({ page }) => {
    // Active Jobs stat
    const activeJobsStat = page.getByTestId('active-jobs-stat');
    await expect(activeJobsStat).toBeVisible();
    await expect(activeJobsStat).toContainText('Active Jobs');
    await expect(activeJobsStat).toContainText('12');
    await expect(activeJobsStat).toContainText('Currently hiring');

    // New Applications stat
    const newApplicationsStat = page.getByTestId('new-applications-stat');
    await expect(newApplicationsStat).toBeVisible();
    await expect(newApplicationsStat).toContainText('New Applications Today');
    await expect(newApplicationsStat).toContainText('8');
    await expect(newApplicationsStat).toContainText('Last 24 hours');

    // Candidate Quality stat
    const candidateQualityStat = page.getByTestId('candidate-quality-stat');
    await expect(candidateQualityStat).toBeVisible();
    await expect(candidateQualityStat).toContainText('Candidate Quality');
    await expect(candidateQualityStat).toContainText('78');
    await expect(candidateQualityStat).toContainText('Average Fit Index');

    // Time to Fill stat
    const timeToFillStat = page.getByTestId('time-to-fill-stat');
    await expect(timeToFillStat).toBeVisible();
    await expect(timeToFillStat).toContainText('Time to Fill');
    await expect(timeToFillStat).toContainText('24 days');
    await expect(timeToFillStat).toContainText('Average duration');
  });

  test('should display all quick action buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /post new job/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /view all applications/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /search candidates/i })).toBeVisible();
  });

  test('should trigger post job action', async ({ page }) => {
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Post Job');
      dialog.accept();
    });

    await page.getByRole('button', { name: /post new job/i }).click();
  });

  test('should trigger view applications action', async ({ page }) => {
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('View Applications');
      dialog.accept();
    });

    await page.getByRole('button', { name: /view all applications/i }).click();
  });

  test('should trigger search candidates action', async ({ page }) => {
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Search Candidates');
      dialog.accept();
    });

    await page.getByRole('button', { name: /search candidates/i }).click();
  });

  test('should display top performing jobs', async ({ page }) => {
    const topJobsSection = page.getByTestId('top-performing-jobs');
    await expect(topJobsSection).toBeVisible();
    await expect(topJobsSection.getByRole('heading', { name: /top performing jobs/i })).toBeVisible();

    // Check first job
    await expect(topJobsSection.getByRole('heading', { name: 'Senior Frontend Developer' })).toBeVisible();
    await expect(topJobsSection.getByText('34 applications')).toBeVisible();
    await expect(topJobsSection.getByText('245 views')).toBeVisible();
    await expect(topJobsSection.getByText('5 days ago')).toBeVisible();

    // Check second job
    await expect(topJobsSection.getByRole('heading', { name: 'Backend Engineer' })).toBeVisible();
    await expect(topJobsSection.getByText('28 applications')).toBeVisible();

    // Check third job
    await expect(topJobsSection.getByRole('heading', { name: 'Full Stack Developer' })).toBeVisible();
    await expect(topJobsSection.getByText('19 applications')).toBeVisible();
  });

  test('should display applications by status pipeline', async ({ page }) => {
    await expect(page.getByText(/applications by status/i)).toBeVisible();

    // Check all pipeline stages with counts
    const pipelineSection = page.getByTestId('applications-by-status');
    await expect(pipelineSection.getByText(/^new$/i)).toBeVisible();
    await expect(pipelineSection.getByText('23')).toBeVisible();

    await expect(pipelineSection.getByText(/reviewing/i)).toBeVisible();
    await expect(pipelineSection.getByText('45')).toBeVisible();

    await expect(pipelineSection.getByText(/interview/i)).toBeVisible();
    await expect(pipelineSection.getByText('18')).toBeVisible();

    await expect(pipelineSection.getByText(/offer/i)).toBeVisible();
    await expect(pipelineSection.getByText('7')).toBeVisible();

    await expect(pipelineSection.getByText(/hired/i)).toBeVisible();
    await expect(pipelineSection.getByText('32')).toBeVisible();
  });

  test('should display recent activity feed', async ({ page }) => {
    await expect(page.getByText(/recent activity/i)).toBeVisible();

    // Check activity items
    await expect(page.getByText(/john doe applied/i)).toBeVisible();
    await expect(page.getByText(/2 minutes ago/i)).toBeVisible();

    await expect(page.getByText(/jane smith moved to interview/i)).toBeVisible();
    await expect(page.getByText(/1 hour ago/i)).toBeVisible();

    await expect(page.getByText(/new job posted.*full stack developer/i)).toBeVisible();
    await expect(page.getByText(/3 hours ago/i)).toBeVisible();
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Focus on the first quick action button directly to start keyboard navigation
    const postJobButton = page.getByRole('button', { name: /post new job/i });
    await postJobButton.focus();

    // Verify Post New Job button is focused
    await expect(postJobButton).toBeFocused();

    // Tab to next button
    await page.keyboard.press('Tab');
    const viewApplicationsButton = page.getByRole('button', { name: /view all applications/i });
    await expect(viewApplicationsButton).toBeFocused();

    // Tab to third button
    await page.keyboard.press('Tab');
    const searchCandidatesButton = page.getByRole('button', { name: /search candidates/i });
    await expect(searchCandidatesButton).toBeFocused();
  });

  test('should have accessible stat cards with ARIA labels', async ({ page }) => {
    const activeJobsStat = page.getByTestId('active-jobs-stat');
    await expect(activeJobsStat).toHaveAttribute('role', 'region');
    await expect(activeJobsStat).toHaveAttribute('aria-label', 'Active jobs statistic');

    const newApplicationsStat = page.getByTestId('new-applications-stat');
    await expect(newApplicationsStat).toHaveAttribute('role', 'region');
    await expect(newApplicationsStat).toHaveAttribute('aria-label', 'New applications statistic');
  });
});

test.describe('Employer Dashboard - Loading State', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/employer-dashboard');
    await page.getByRole('button', { name: /loading state/i }).click();
  });

  test('should display loading indicator', async ({ page }) => {
    await expect(page.getByText(/loading dashboard/i)).toBeVisible();
  });

  test('should display skeleton loaders', async ({ page }) => {
    // Check for skeleton loaders (aria-label="Loading stat")
    const skeletonLoaders = page.getByRole('status', { name: /loading stat/i });
    await expect(skeletonLoaders).toHaveCount(4);
  });
});

test.describe('Employer Dashboard - Error State', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/employer-dashboard');
    await page.getByRole('button', { name: /error state/i }).click();
  });

  test('should display error message', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /failed to load dashboard/i })).toBeVisible();
    await expect(page.getByText(/failed to load dashboard data.*try again/i)).toBeVisible();
  });

  test('should display retry button', async ({ page }) => {
    const retryButton = page.getByRole('button', { name: /try again/i });
    await expect(retryButton).toBeVisible();
  });

  test('should handle retry action', async ({ page }) => {
    const retryButton = page.getByRole('button', { name: /try again/i });
    await retryButton.click();

    // Should switch back to normal view
    await expect(page.getByRole('heading', { name: /techcorp inc/i })).toBeVisible({ timeout: 10000 });

    // Check retry count increased
    await expect(page.getByText(/retry count: 1/i)).toBeVisible();
  });
});

test.describe('Employer Dashboard - Empty State', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/employer-dashboard');
    await page.getByRole('button', { name: /empty state/i }).click();
  });

  test('should display company name even when empty', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /startupco/i })).toBeVisible();
  });

  test('should display empty state message', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /no active jobs/i })).toBeVisible();
    await expect(page.getByText(/get started by posting your first job/i)).toBeVisible();
  });

  test('should display empty state CTA button', async ({ page }) => {
    const postFirstJobButton = page.getByRole('button', { name: /post your first job/i });
    await expect(postFirstJobButton).toBeVisible();
  });

  test('should trigger post job action from empty state', async ({ page }) => {
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Post Job');
      dialog.accept();
    });

    await page.getByRole('button', { name: /post your first job/i }).click();
  });

  test('should display zero stats', async ({ page }) => {
    await expect(page.getByText('0 days')).toBeVisible(); // Time to fill
  });

  test('should show "No jobs yet" in top performing jobs', async ({ page }) => {
    await expect(page.getByText(/top performing jobs/i)).toBeVisible();
    await expect(page.getByText(/no jobs yet/i)).toBeVisible();
  });

  test('should show "No recent activity"', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /recent activity/i })).toBeVisible();
    await expect(page.getByText(/no recent activity/i)).toBeVisible();
  });
});

test.describe('Employer Dashboard - Responsive Design', () => {
  test('should work on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/test/employer-dashboard');

    await expect(page.getByRole('heading', { name: /techcorp inc/i })).toBeVisible({ timeout: 10000 });

    // Stats should stack vertically on mobile
    const activeJobsText = page.getByText(/active jobs/i);
    await expect(activeJobsText).toBeVisible();

    // Quick actions should be visible
    await expect(page.getByRole('button', { name: /post new job/i })).toBeVisible();
  });

  test('should work on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/test/employer-dashboard');

    await expect(page.getByRole('heading', { name: /techcorp inc/i })).toBeVisible({ timeout: 10000 });

    // All sections should be visible
    await expect(page.getByText(/top performing jobs/i)).toBeVisible();
    await expect(page.getByText(/applications by status/i)).toBeVisible();
  });
});

test.describe('Employer Dashboard - State Switching', () => {
  test('should switch between different view modes', async ({ page }) => {
    await page.goto('/test/employer-dashboard');

    // Start with normal view
    await expect(page.getByRole('heading', { name: /techcorp inc/i })).toBeVisible({ timeout: 10000 });

    // Switch to loading
    await page.getByRole('button', { name: /loading state/i }).click();
    await expect(page.getByText(/loading dashboard/i)).toBeVisible();

    // Switch to error
    await page.getByRole('button', { name: /error state/i }).click();
    await expect(page.getByRole('heading', { name: /failed to load/i })).toBeVisible();

    // Switch to empty
    await page.getByRole('button', { name: /empty state/i }).click();
    await expect(page.getByRole('heading', { name: /no active jobs/i })).toBeVisible();

    // Switch back to normal
    await page.getByRole('button', { name: /normal view/i }).click();
    await expect(page.getByRole('heading', { name: /techcorp inc/i })).toBeVisible();
  });
});
