/**
 * E2E Tests for Usage Limits (Issue #64)
 * Tests user workflows for usage limit enforcement
 */

import { test, expect } from '@playwright/test';

test.describe('Usage Limits - Employer Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as employer
    await page.goto('/login');
    await page.fill('input[name="email"]', 'employer@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/employer/dashboard');
  });

  test('displays usage meters with correct values for Growth plan', async ({ page }) => {
    // Given: A Growth company with 5/10 jobs, 50/100 views, 2/3 members
    await page.goto('/employer/usage');

    // Then: Usage meters show correct values
    const jobsMeter = page.locator('[data-testid="usage-dashboard-jobs-meter"]');
    await expect(jobsMeter).toBeVisible();
    await expect(jobsMeter.locator('[data-testid="usage-dashboard-jobs-meter-used"]')).toHaveText('5');
    await expect(jobsMeter.locator('[data-testid="usage-dashboard-jobs-meter-limit"]')).toHaveText('10');
    await expect(jobsMeter.locator('[data-testid="usage-dashboard-jobs-meter-percentage"]')).toHaveText('50%');

    const viewsMeter = page.locator('[data-testid="usage-dashboard-views-meter"]');
    await expect(viewsMeter).toBeVisible();
    await expect(viewsMeter.locator('[data-testid="usage-dashboard-views-meter-used"]')).toHaveText('50');
    await expect(viewsMeter.locator('[data-testid="usage-dashboard-views-meter-limit"]')).toHaveText('100');

    const membersMeter = page.locator('[data-testid="usage-dashboard-members-meter"]');
    await expect(membersMeter).toBeVisible();
    await expect(membersMeter.locator('[data-testid="usage-dashboard-members-meter-used"]')).toHaveText('2');
    await expect(membersMeter.locator('[data-testid="usage-dashboard-members-meter-limit"]')).toHaveText('3');
  });

  test('shows warning banner at 80% usage', async ({ page }) => {
    // Given: A Growth company with 8/10 jobs (80%)
    await page.goto('/employer/usage');

    // Then: Warning banner is displayed
    const warningBanner = page.locator('[data-testid="usage-dashboard-jobs-warning"]');
    await expect(warningBanner).toBeVisible();
    await expect(warningBanner.locator('[data-testid="usage-dashboard-jobs-warning-title"]'))
      .toContainText('Approaching Job Posting Limit');
    await expect(warningBanner.locator('[data-testid="usage-dashboard-jobs-warning-message"]'))
      .toContainText('80%');
  });

  test('shows error state when limit reached', async ({ page }) => {
    // Given: A Starter company with 1/1 jobs (100%)
    await page.goto('/employer/usage');

    // Then: Error banner and upgrade CTA are displayed
    const warningBanner = page.locator('[data-testid="usage-dashboard-jobs-warning"]');
    await expect(warningBanner).toBeVisible();
    await expect(warningBanner.locator('[data-testid="usage-dashboard-jobs-warning-title"]'))
      .toContainText('Job Posting Limit Reached');

    const jobsMeter = page.locator('[data-testid="usage-dashboard-jobs-meter"]');
    const upgradeButton = jobsMeter.locator('[data-testid="usage-dashboard-jobs-meter-upgrade-button"]');
    await expect(upgradeButton).toBeVisible();
    await expect(upgradeButton).toHaveText('Upgrade Plan');
  });

  test('dismisses warning banner when dismiss clicked', async ({ page }) => {
    // Given: Warning banner is visible
    await page.goto('/employer/usage');
    const warningBanner = page.locator('[data-testid="usage-dashboard-jobs-warning"]');
    await expect(warningBanner).toBeVisible();

    // When: User clicks dismiss
    await warningBanner.locator('[data-testid="usage-dashboard-jobs-warning-dismiss"]').click();

    // Then: Warning banner is hidden
    await expect(warningBanner).not.toBeVisible();
  });

  test('opens upgrade modal when upgrade clicked', async ({ page }) => {
    // Given: User is on usage dashboard
    await page.goto('/employer/usage');

    // When: User clicks upgrade button
    await page.click('[data-testid="usage-dashboard-upgrade-cta"]');

    // Then: Upgrade modal is displayed
    const modal = page.locator('[data-testid="usage-dashboard-upgrade-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('[data-testid="usage-dashboard-upgrade-modal-title"]'))
      .toContainText('Upgrade to');
  });

  test('displays upgrade modal with correct benefits', async ({ page }) => {
    // Given: Starter plan at limit
    await page.goto('/employer/usage');
    await page.click('[data-testid="usage-dashboard-upgrade-cta"]');

    // Then: Modal shows Growth plan benefits
    const modal = page.locator('[data-testid="usage-dashboard-upgrade-modal"]');
    await expect(modal).toBeVisible();

    const benefits = modal.locator('[data-testid="usage-dashboard-upgrade-modal-benefits"] li');
    await expect(benefits).toHaveCount(5); // Growth plan has 5 benefits
    await expect(benefits.first()).toContainText('10 job postings/month');

    const price = modal.locator('[data-testid="usage-dashboard-upgrade-modal-price"]');
    await expect(price).toHaveText('$99');
  });

  test('closes upgrade modal when cancel clicked', async ({ page }) => {
    // Given: Upgrade modal is open
    await page.goto('/employer/usage');
    await page.click('[data-testid="usage-dashboard-upgrade-cta"]');
    const modal = page.locator('[data-testid="usage-dashboard-upgrade-modal"]');
    await expect(modal).toBeVisible();

    // When: User clicks cancel
    await page.click('[data-testid="usage-dashboard-upgrade-modal-cancel"]');

    // Then: Modal is closed
    await expect(modal).not.toBeVisible();
  });

  test('navigates to upgrade flow when upgrade confirmed', async ({ page }) => {
    // Given: Upgrade modal is open
    await page.goto('/employer/usage');
    await page.click('[data-testid="usage-dashboard-upgrade-cta"]');

    // When: User clicks upgrade
    await page.click('[data-testid="usage-dashboard-upgrade-modal-confirm"]');

    // Then: Navigates to billing upgrade page
    await expect(page).toHaveURL(/\/employer\/billing\/upgrade\?plan=/);
  });

  test('blocks job posting when at limit', async ({ page }) => {
    // Given: Starter company at job limit (1/1)
    await page.goto('/employer/jobs/new');

    // When: User tries to create a job
    await page.fill('input[name="title"]', 'Senior Software Engineer');
    await page.fill('textarea[name="description"]', 'Great opportunity');
    await page.click('button[type="submit"]');

    // Then: Error message is displayed with upgrade CTA
    const errorMessage = page.locator('[role="alert"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('reached your job posting limit');
    await expect(errorMessage).toContainText('Upgrade');
  });

  test('shows unlimited for Professional plan', async ({ page }) => {
    // Given: Professional company with unlimited jobs
    await page.goto('/employer/usage');

    // Then: Jobs meter shows unlimited badge
    const jobsMeter = page.locator('[data-testid="usage-dashboard-jobs-meter"]');
    await expect(jobsMeter).toContainText('Unlimited');

    const unlimitedBadge = jobsMeter.locator('svg + span:has-text("Unlimited")');
    await expect(unlimitedBadge).toBeVisible();
  });

  test('displays current plan correctly', async ({ page }) => {
    // Given: User is on usage dashboard
    await page.goto('/employer/usage');

    // Then: Current plan is displayed
    const planLabel = page.locator('[data-testid="usage-dashboard-plan"]');
    await expect(planLabel).toBeVisible();
    await expect(planLabel).toContainText(/starter|growth|professional/i);
  });

  test('handles API error gracefully', async ({ page }) => {
    // Given: API returns error
    await page.route('**/api/v1/billing/usage-limits', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: { message: 'Internal server error' } })
      });
    });

    // When: User visits usage page
    await page.goto('/employer/usage');

    // Then: Error message is displayed with retry option
    const errorMessage = page.locator('[data-testid="usage-dashboard-error"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText('Failed to load usage limits');

    const retryButton = errorMessage.locator('button:has-text("Retry")');
    await expect(retryButton).toBeVisible();
  });

  test('updates usage after action', async ({ page }) => {
    // Given: User has 5/10 jobs
    await page.goto('/employer/usage');
    const jobsMeter = page.locator('[data-testid="usage-dashboard-jobs-meter"]');
    await expect(jobsMeter.locator('[data-testid="usage-dashboard-jobs-meter-used"]')).toHaveText('5');

    // When: User posts a new job
    await page.goto('/employer/jobs/new');
    await page.fill('input[name="title"]', 'Frontend Developer');
    await page.fill('textarea[name="description"]', 'Build amazing UIs');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/employer\/jobs\/\d+/);

    // Then: Usage is updated
    await page.goto('/employer/usage');
    await expect(jobsMeter.locator('[data-testid="usage-dashboard-jobs-meter-used"]')).toHaveText('6');
  });
});

test.describe('Usage Limits - Mobile View', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('displays usage meters stacked on mobile', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'employer@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/employer/dashboard');

    await page.goto('/employer/usage');

    // Verify meters are stacked (full width)
    const metersGrid = page.locator('[data-testid="usage-dashboard"] > div:nth-child(2)');
    await expect(metersGrid).toHaveClass(/grid-cols-1/);
  });

  test('upgrade modal is responsive on mobile', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', 'employer@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/employer/dashboard');

    await page.goto('/employer/usage');
    await page.click('[data-testid="usage-dashboard-upgrade-cta"]');

    const modal = page.locator('[data-testid="usage-dashboard-upgrade-modal-panel"]');
    await expect(modal).toBeVisible();

    // Verify modal fits within viewport
    const boundingBox = await modal.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(375);
  });
});
