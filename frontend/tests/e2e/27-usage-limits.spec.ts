/**
 * E2E Tests for Usage Limit Enforcement
 * Issue #64: Critical for revenue protection
 *
 * Following BDD (Given-When-Then) pattern
 * Tests comprehensive subscription limit enforcement
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Test data for different subscription plans
const PLAN_LIMITS = {
  starter: {
    jobs: 1,
    candidateViews: 10,
    teamMembers: 1,
  },
  growth: {
    jobs: 10,
    candidateViews: 100,
    teamMembers: 3,
  },
  professional: {
    jobs: -1, // Unlimited
    candidateViews: -1,
    teamMembers: 10,
  },
};

// Helper function to login as employer with specific plan
async function loginAsEmployer(page: Page, plan: string = 'starter') {
  await page.goto(`${BASE_URL}/employer/login`);
  await page.fill('input[name="email"]', `employer-${plan}@testcompany.com`);
  await page.fill('input[name="password"]', 'testpassword123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/employer/**');
}

// Helper to create mock jobs for testing
async function createMockJobs(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    await page.goto(`${BASE_URL}/employer/jobs/new`);
    await page.fill('input[name="title"]', `Test Job ${i + 1}`);
    await page.fill('textarea[name="description"]', `Description for job ${i + 1}`);
    await page.click('button[type="submit"]:has-text("Publish")');
    await page.waitForURL('**/employer/jobs**');
  }
}

// Helper to simulate viewing candidate profiles
async function viewCandidateProfiles(page: Page, count: number) {
  for (let i = 0; i < count; i++) {
    await page.goto(`${BASE_URL}/employer/candidates`);
    await page.click(`[data-testid="candidate-card-${i}"]`);
    await page.waitForLoadState('networkidle');
    await page.click('[aria-label="Close"]');
  }
}

test.describe('Job Posting Limits', () => {
  test('Starter plan: Cannot create more than 1 active job', async ({ page }) => {
    // Given: Employer with Starter plan and 1 active job
    await loginAsEmployer(page, 'starter');
    await createMockJobs(page, 1);

    // When: Attempt to create a new job
    await page.goto(`${BASE_URL}/employer/jobs/new`);
    await page.fill('input[name="title"]', 'Second Job');
    await page.fill('textarea[name="description"]', 'This should be blocked');
    await page.click('button[type="submit"]:has-text("Publish")');

    // Then: Error message and upgrade modal shown
    await expect(page.locator('text=/reached your job posting limit/i')).toBeVisible();
    await expect(page.locator('text=/Upgrade to Growth/i')).toBeVisible();

    // And: Job was not created
    await page.goto(`${BASE_URL}/employer/jobs`);
    const jobCards = page.locator('[data-testid="job-card"]');
    await expect(jobCards).toHaveCount(1);
  });

  test('Growth plan: Can create up to 10 active jobs', async ({ page }) => {
    // Given: Employer with Growth plan and 9 active jobs
    await loginAsEmployer(page, 'growth');
    await createMockJobs(page, 9);

    // When: Create the 10th job
    await page.goto(`${BASE_URL}/employer/jobs/new`);
    await page.fill('input[name="title"]', 'Tenth Job');
    await page.fill('textarea[name="description"]', 'This should succeed');
    await page.click('button[type="submit"]:has-text("Publish")');

    // Then: Job is created successfully
    await expect(page.locator('text=/Job posted successfully/i')).toBeVisible();

    // And: Usage indicator shows 10/10
    await page.goto(`${BASE_URL}/employer/dashboard`);
    await expect(page.locator('text=/10\/10 jobs/i')).toBeVisible();
  });

  test('Professional plan: Unlimited job postings', async ({ page }) => {
    // Given: Employer with Professional plan and 50 active jobs
    await loginAsEmployer(page, 'professional');

    // When: Attempt to create a new job (51st)
    await page.goto(`${BASE_URL}/employer/jobs/new`);
    await page.fill('input[name="title"]', 'Job 51');
    await page.fill('textarea[name="description"]', 'No limits');
    await page.click('button[type="submit"]:has-text("Publish")');

    // Then: Job is created successfully
    await expect(page.locator('text=/Job posted successfully/i')).toBeVisible();

    // And: No limit warnings shown
    await page.goto(`${BASE_URL}/employer/dashboard`);
    await expect(page.locator('text=/Unlimited/i')).toBeVisible();
    await expect(page.locator('text=/upgrade/i')).not.toBeVisible();
  });

  test('Draft jobs do not count against limit', async ({ page }) => {
    // Given: Starter plan with 1 active job and 3 drafts
    await loginAsEmployer(page, 'starter');
    await createMockJobs(page, 1);

    // Create draft jobs
    for (let i = 0; i < 3; i++) {
      await page.goto(`${BASE_URL}/employer/jobs/new`);
      await page.fill('input[name="title"]', `Draft Job ${i + 1}`);
      await page.fill('textarea[name="description"]', 'Draft description');
      await page.click('button:has-text("Save as Draft")');
    }

    // When: View job posting limit
    await page.goto(`${BASE_URL}/employer/dashboard`);

    // Then: Usage shows only active jobs
    await expect(page.locator('text=/1\/1 active jobs/i')).toBeVisible();

    // And: Drafts listed separately
    await page.goto(`${BASE_URL}/employer/jobs?status=draft`);
    const draftCards = page.locator('[data-testid="job-card"]');
    await expect(draftCards).toHaveCount(3);
  });

  test('Show warning at 80% usage for job postings', async ({ page }) => {
    // Given: Growth plan with 8 active jobs
    await loginAsEmployer(page, 'growth');
    await createMockJobs(page, 8);

    // When: View employer dashboard
    await page.goto(`${BASE_URL}/employer/dashboard`);

    // Then: Warning banner is visible
    await expect(page.locator('text=/using 8\/10 job slots/i')).toBeVisible();
    await expect(page.locator('a:has-text("Upgrade to Professional")')).toBeVisible();
  });

  test('Deleting a job frees up a slot', async ({ page }) => {
    // Given: Starter plan with 1 active job
    await loginAsEmployer(page, 'starter');
    await createMockJobs(page, 1);

    // When: Delete the active job
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.click('[data-testid="job-actions-menu"]');
    await page.click('text=/Delete/i');
    await page.click('button:has-text("Confirm")');

    // Then: Usage shows 0/1
    await page.goto(`${BASE_URL}/employer/dashboard`);
    await expect(page.locator('text=/0\/1 active jobs/i')).toBeVisible();

    // And: Can create a new job
    await page.goto(`${BASE_URL}/employer/jobs/new`);
    await page.fill('input[name="title"]', 'New Job After Delete');
    await page.click('button[type="submit"]:has-text("Publish")');
    await expect(page.locator('text=/Job posted successfully/i')).toBeVisible();
  });
});

test.describe('Candidate View Limits', () => {
  test('Starter plan: Cannot view more than 10 candidates per month', async ({ page }) => {
    // Given: Starter plan that has viewed 10 candidates
    await loginAsEmployer(page, 'starter');
    await viewCandidateProfiles(page, 10);

    // When: Attempt to view 11th candidate
    await page.goto(`${BASE_URL}/employer/candidates`);
    await page.click('[data-testid="candidate-card-10"]');

    // Then: Upgrade modal is shown
    await expect(page.locator('text=/Upgrade to view more candidates/i')).toBeVisible();
    await expect(page.locator('text=/Growth.*\\$99/i')).toBeVisible();

    // And: Candidate profile is not displayed
    await expect(page.locator('[data-testid="candidate-detail"]')).not.toBeVisible();
  });

  test('Growth plan: Candidate views reset monthly', async ({ page }) => {
    // Given: Growth plan on first day of billing cycle
    await loginAsEmployer(page, 'growth');

    // When: View usage statistics
    await page.goto(`${BASE_URL}/employer/dashboard`);

    // Then: Shows 0/100 candidate views
    await expect(page.locator('text=/0\/100 candidate views/i')).toBeVisible();
  });

  test('Viewing same candidate multiple times counts as one view', async ({ page }) => {
    // Given: Growth plan that has viewed "John Doe" once
    await loginAsEmployer(page, 'growth');
    await page.goto(`${BASE_URL}/employer/candidates`);
    await page.click('[data-candidate-id="john-doe"]');
    await page.waitForLoadState('networkidle');

    // Store initial count
    await page.goto(`${BASE_URL}/employer/dashboard`);
    const initialCount = await page.locator('[data-testid="candidate-view-count"]').textContent();

    // When: View same candidate again
    await page.goto(`${BASE_URL}/employer/candidates`);
    await page.click('[data-candidate-id="john-doe"]');
    await page.waitForLoadState('networkidle');

    // Then: View count does not increase
    await page.goto(`${BASE_URL}/employer/dashboard`);
    const newCount = await page.locator('[data-testid="candidate-view-count"]').textContent();
    expect(newCount).toBe(initialCount);
  });

  test('Show warning at 80% usage for candidate views', async ({ page }) => {
    // Given: Growth plan with 81 candidate views
    await loginAsEmployer(page, 'growth');
    await viewCandidateProfiles(page, 81);

    // When: Navigate to candidate search
    await page.goto(`${BASE_URL}/employer/candidates`);

    // Then: Warning notification is visible
    await expect(page.locator('text=/19 candidate views remaining/i')).toBeVisible();
    await expect(page.locator('button:has-text("Upgrade")')).toBeVisible();
  });
});

test.describe('Team Member Limits', () => {
  test('Starter plan: Cannot add team members', async ({ page }) => {
    // Given: Starter plan employer
    await loginAsEmployer(page, 'starter');

    // When: Attempt to invite a team member
    await page.goto(`${BASE_URL}/employer/settings/team`);
    await page.click('button:has-text("Invite Team Member")');
    await page.fill('input[name="email"]', 'newmember@company.com');
    await page.click('button[type="submit"]:has-text("Send Invite")');

    // Then: Error message is shown
    await expect(page.locator('text=/Upgrade to Growth to add team members/i')).toBeVisible();

    // And: Invitation is not sent
    const invites = page.locator('[data-testid="pending-invite"]');
    await expect(invites).toHaveCount(0);
  });

  test('Growth plan: Can add up to 3 team members', async ({ page }) => {
    // Given: Growth plan with 2 members (including owner)
    await loginAsEmployer(page, 'growth');

    // When: Invite a new team member
    await page.goto(`${BASE_URL}/employer/settings/team`);
    await page.click('button:has-text("Invite Team Member")');
    await page.fill('input[name="email"]', 'member3@company.com');
    await page.select('select[name="role"]', 'Recruiter');
    await page.click('button[type="submit"]:has-text("Send Invite")');

    // Then: Invitation is sent successfully
    await expect(page.locator('text=/Invitation sent successfully/i')).toBeVisible();

    // And: Usage shows 3/3
    await expect(page.locator('text=/3\/3 team members/i')).toBeVisible();
  });

  test('Growth plan: Cannot exceed 3 team members', async ({ page }) => {
    // Given: Growth plan with 3 team members
    await loginAsEmployer(page, 'growth');

    // Assume 3 members already exist
    await page.goto(`${BASE_URL}/employer/settings/team`);

    // When: Attempt to invite another member
    await page.click('button:has-text("Invite Team Member")');
    await page.fill('input[name="email"]', 'member4@company.com');
    await page.click('button[type="submit"]:has-text("Send Invite")');

    // Then: Error with upgrade message
    await expect(page.locator('text=/Upgrade to Professional for more seats/i')).toBeVisible();

    // And: Invitation is not sent
    await expect(page.locator('text=/Invitation sent/i')).not.toBeVisible();
  });
});

test.describe('Upgrade Flow', () => {
  test('Upgrade from Starter to Growth via job posting limit', async ({ page }) => {
    // Given: Starter plan at job posting limit
    await loginAsEmployer(page, 'starter');
    await createMockJobs(page, 1);

    // When: Attempt to create new job and see upgrade modal
    await page.goto(`${BASE_URL}/employer/jobs/new`);
    await page.fill('input[name="title"]', 'Blocked Job');
    await page.click('button[type="submit"]:has-text("Publish")');

    // And: Click upgrade button
    await expect(page.locator('text=/Upgrade to Growth/i')).toBeVisible();
    await page.click('button:has-text("Upgrade Now for $99/month")');

    // Then: Redirected to Stripe checkout
    await page.waitForURL('**/checkout**', { timeout: 5000 });
    expect(page.url()).toContain('checkout');
  });

  test('Display prorated pricing for mid-cycle upgrade', async ({ page }) => {
    // Given: Growth plan wanting to upgrade
    await loginAsEmployer(page, 'growth');

    // When: Click upgrade to Professional
    await page.goto(`${BASE_URL}/employer/settings/billing`);
    await page.click('button:has-text("Upgrade to Professional")');

    // Then: See prorated pricing
    await expect(page.locator('text=/Prorated amount/i')).toBeVisible();
    await expect(page.locator('[data-testid="prorated-price"]')).toBeVisible();
  });
});

test.describe('API Enforcement', () => {
  test('Backend blocks job creation when limit reached', async ({ page, request }) => {
    // Given: Starter plan with 1 active job
    const context = await page.context();
    const cookies = await context.cookies();
    const authToken = cookies.find(c => c.name === 'auth_token')?.value;

    // When: Send POST request to create job
    const response = await request.post(`${BASE_URL}/api/v1/employer/jobs`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'API Test Job',
        description: 'Should be blocked',
        status: 'active',
      },
    });

    // Then: Receive 403 Forbidden
    expect(response.status()).toBe(403);

    // And: Response contains error details
    const body = await response.json();
    expect(body.detail).toContain('Job posting limit reached');
    expect(body.upgradeRequired).toBe(true);
  });

  test('Backend allows job creation when within limits', async ({ page, request }) => {
    // Given: Growth plan with 5 active jobs
    await loginAsEmployer(page, 'growth');

    const context = await page.context();
    const cookies = await context.cookies();
    const authToken = cookies.find(c => c.name === 'auth_token')?.value;

    // When: Send POST request to create job
    const response = await request.post(`${BASE_URL}/api/v1/employer/jobs`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        title: 'API Test Job',
        description: 'Should succeed',
        status: 'active',
      },
    });

    // Then: Receive 201 Created
    expect(response.status()).toBe(201);
  });
});

test.describe('Performance Tests', () => {
  test('Usage limit check completes in under 300ms', async ({ page }) => {
    // Given: Logged in employer
    await loginAsEmployer(page, 'growth');

    // When: Check subscription limits
    const startTime = Date.now();
    const response = await page.request.get(`${BASE_URL}/api/v1/employer/subscription/limits`);
    const endTime = Date.now();

    // Then: Response time is under 300ms
    const responseTime = endTime - startTime;
    expect(responseTime).toBeLessThan(300);

    // And: Response includes all usage metrics
    const body = await response.json();
    expect(body.limits.jobs).toBeDefined();
    expect(body.limits.candidateViews).toBeDefined();
    expect(body.limits.teamMembers).toBeDefined();
  });
});

test.describe('Security Tests', () => {
  test('Cannot bypass limits via direct API calls', async ({ page, request }) => {
    // Given: Starter plan with 1 active job
    await loginAsEmployer(page, 'starter');

    const context = await page.context();
    const cookies = await context.cookies();
    const authToken = cookies.find(c => c.name === 'auth_token')?.value;

    // When: Attempt to bypass limit using direct API
    const response = await request.post(`${BASE_URL}/api/v1/employer/jobs`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'X-Bypass-Limit': 'true', // Malicious header attempt
      },
      data: {
        title: 'Bypass Attempt',
        description: 'Should be blocked',
        status: 'active',
      },
    });

    // Then: Backend still enforces limit
    expect(response.status()).toBe(403);

    // And: Audit log records attempt (check in admin panel)
    await page.goto(`${BASE_URL}/admin/audit-logs`);
    await expect(page.locator('text=/Limit bypass attempt/i')).toBeVisible();
  });
});

test.describe('Edge Cases', () => {
  test('Professional plan upgrade removes all limits immediately', async ({ page }) => {
    // Given: Growth plan at usage limits
    await loginAsEmployer(page, 'growth');
    await createMockJobs(page, 10);

    // When: Upgrade to Professional
    await page.goto(`${BASE_URL}/employer/settings/billing`);
    await page.click('button:has-text("Upgrade to Professional")');
    // Simulate successful payment
    await page.waitForURL('**/success**');

    // Then: All limits show "Unlimited"
    await page.goto(`${BASE_URL}/employer/dashboard`);
    await expect(page.locator('text=/Unlimited.*jobs/i')).toBeVisible();
    await expect(page.locator('text=/Unlimited.*candidate views/i')).toBeVisible();

    // And: No usage warnings
    await expect(page.locator('text=/upgrade/i')).not.toBeVisible();

    // And: Can create new job immediately
    await page.goto(`${BASE_URL}/employer/jobs/new`);
    await page.fill('input[name="title"]', 'Job After Upgrade');
    await page.click('button[type="submit"]:has-text("Publish")');
    await expect(page.locator('text=/Job posted successfully/i')).toBeVisible();
  });

  test('Moving job to draft frees up active slot', async ({ page }) => {
    // Given: Growth plan with 10 active jobs
    await loginAsEmployer(page, 'growth');
    await createMockJobs(page, 10);

    // When: Change one job to draft
    await page.goto(`${BASE_URL}/employer/jobs`);
    await page.click('[data-testid="job-actions-menu"]:first-child');
    await page.click('text=/Move to Draft/i');

    // Then: Usage shows 9/10
    await page.goto(`${BASE_URL}/employer/dashboard`);
    await expect(page.locator('text=/9\/10 active jobs/i')).toBeVisible();

    // And: Can create new active job
    await page.goto(`${BASE_URL}/employer/jobs/new`);
    await page.fill('input[name="title"]', 'New Active Job');
    await page.click('button[type="submit"]:has-text("Publish")');
    await expect(page.locator('text=/Job posted successfully/i')).toBeVisible();
  });
});
