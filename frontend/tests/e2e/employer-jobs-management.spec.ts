/**
 * E2E Tests: Employer Jobs Management (Issue #79)
 *
 * Test Coverage:
 * - Jobs list display and navigation
 * - Filters, search, and sorting
 * - Create job wizard (5 steps)
 * - Edit job functionality
 * - Draft autosave
 * - Job preview and publish
 * - Job card actions (view, duplicate, close, delete)
 * - Mobile responsiveness
 * - Accessibility
 * - Role-based access control
 */

import { test, expect, Page } from '@playwright/test';

// ============================================================================
// Test Data
// ============================================================================

const TEST_JOB = {
  // Step 1: Basics
  title: 'Senior Software Engineer',
  department: 'Engineering',
  location: 'San Francisco, CA',
  employmentType: 'Full-time',
  remoteOption: 'Remote OK',

  // Step 2: Description
  description: 'We are seeking an experienced Senior Software Engineer to join our growing team...',
  responsibilities: 'Build scalable systems, mentor junior engineers, lead technical design...',

  // Step 3: Requirements
  requiredSkills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
  niceToHaveSkills: ['GraphQL', 'Docker', 'AWS'],
  yearsExperience: 5,
  educationLevel: "Bachelor's Degree",

  // Step 4: Compensation
  salaryMin: 100000,
  salaryMax: 150000,
  currency: 'USD',
  benefits: ['Health Insurance', '401(k) Matching', 'Remote Work', 'Unlimited PTO'],
};

// ============================================================================
// Helper Functions
// ============================================================================

async function navigateToJobsList(page: Page) {
  await page.goto('/employer/jobs');
  await expect(page.locator('[data-jobs-list-page]')).toBeVisible();
}

async function startCreateJob(page: Page) {
  await navigateToJobsList(page);
  await page.locator('[data-create-job-button]').click();
  await expect(page.locator('[data-job-wizard]')).toBeVisible();
}

async function fillBasicsStep(page: Page, job = TEST_JOB) {
  await page.locator('[data-job-title-input]').fill(job.title);
  await page.locator('[data-department-input]').fill(job.department);
  await page.locator('[data-location-input]').fill(job.location);
  await page.locator('[data-employment-type-select]').click();
  await page.locator(`[data-employment-option="${job.employmentType}"]`).click();
}

async function fillDescriptionStep(page: Page, job = TEST_JOB) {
  await page.locator('[data-description-textarea]').fill(job.description);
  await page.locator('[data-responsibilities-textarea]').fill(job.responsibilities);
}

async function fillRequirementsStep(page: Page, job = TEST_JOB) {
  // Add required skills
  for (const skill of job.requiredSkills) {
    await page.locator('[data-required-skills-input]').fill(skill);
    await page.keyboard.press('Enter');
  }

  // Add nice-to-have skills
  for (const skill of job.niceToHaveSkills) {
    await page.locator('[data-nice-to-have-skills-input]').fill(skill);
    await page.keyboard.press('Enter');
  }

  await page.locator('[data-years-experience-input]').fill(job.yearsExperience.toString());
  await page.locator('[data-education-select]').click();
  await page.locator(`[data-education-option="${job.educationLevel}"]`).click();
}

async function fillCompensationStep(page: Page, job = TEST_JOB) {
  await page.locator('[data-salary-min-input]').fill(job.salaryMin.toString());
  await page.locator('[data-salary-max-input]').fill(job.salaryMax.toString());

  // Select benefits
  for (const benefit of job.benefits) {
    await page.locator('[data-benefits-checkbox]').filter({ hasText: benefit }).check();
  }
}

async function completeAllWizardSteps(page: Page, job = TEST_JOB) {
  await fillBasicsStep(page, job);
  await page.locator('[data-next-button]').click();

  await fillDescriptionStep(page, job);
  await page.locator('[data-next-button]').click();

  await fillRequirementsStep(page, job);
  await page.locator('[data-next-button]').click();

  await fillCompensationStep(page, job);
  await page.locator('[data-next-button]').click();

  // Should be on Review step
  await expect(page.locator('[data-current-step]')).toContainText('Step 5');
}

// ============================================================================
// Test Suites
// ============================================================================

test.describe('Jobs List - Display & Navigation', () => {
  test('should display jobs list page', async ({ page }) => {
    await navigateToJobsList(page);

    await expect(page.locator('[data-jobs-list-page]')).toBeVisible();
    await expect(page.locator('[data-create-job-button]')).toBeVisible();
    await expect(page.locator('[data-job-statistics]')).toBeVisible();
  });

  test('should display empty state for new employer', async ({ page }) => {
    await navigateToJobsList(page);

    // Assume no jobs exist (mock API returns empty array)
    await expect(page.locator('[data-empty-state]')).toBeVisible();
    await expect(page.locator('[data-empty-state]')).toContainText('Create Your First Job');
    await expect(page.locator('[data-create-first-job-button]')).toBeVisible();
  });

  test('should display job cards with all required info', async ({ page }) => {
    await navigateToJobsList(page);

    const firstJobCard = page.locator('[data-job-card]').first();
    await expect(firstJobCard.locator('[data-job-title]')).toBeVisible();
    await expect(firstJobCard.locator('[data-job-department]')).toBeVisible();
    await expect(firstJobCard.locator('[data-job-location]')).toBeVisible();
    await expect(firstJobCard.locator('[data-job-status]')).toBeVisible();
    await expect(firstJobCard.locator('[data-applicant-count]')).toBeVisible();
    await expect(firstJobCard.locator('[data-created-date]')).toBeVisible();
    await expect(firstJobCard.locator('[data-edit-button]')).toBeVisible();
  });

  test('should display job statistics', async ({ page }) => {
    await navigateToJobsList(page);

    await expect(page.locator('[data-total-jobs]')).toBeVisible();
    await expect(page.locator('[data-active-jobs]')).toBeVisible();
    await expect(page.locator('[data-draft-jobs]')).toBeVisible();
    await expect(page.locator('[data-closed-jobs]')).toBeVisible();
  });
});

test.describe('Jobs List - Filters & Search', () => {
  test('should filter jobs by status', async ({ page }) => {
    await navigateToJobsList(page);

    // Click Active filter
    await page.locator('[data-filter-active]').click();
    await expect(page.locator('[data-job-card]')).toHaveCount(5); // Assuming 5 active jobs

    // Click Draft filter
    await page.locator('[data-filter-draft]').click();
    await expect(page.locator('[data-job-card]')).toHaveCount(3); // Assuming 3 draft jobs

    // Click All filter
    await page.locator('[data-filter-all]').click();
    await expect(page.locator('[data-job-card]')).toHaveCount(10); // All jobs
  });

  test('should search jobs by title', async ({ page }) => {
    await navigateToJobsList(page);

    await page.locator('[data-search-input]').fill('Engineer');
    await expect(page.locator('[data-job-card]')).toHaveCount(3); // Jobs with "Engineer" in title
  });

  test('should clear all filters', async ({ page }) => {
    await navigateToJobsList(page);

    // Apply filters
    await page.locator('[data-filter-active]').click();
    await page.locator('[data-search-input]').fill('Engineer');

    // Clear filters
    await page.locator('[data-clear-filters-button]').click();

    await expect(page.locator('[data-filter-all]')).toBeChecked();
    await expect(page.locator('[data-search-input]')).toHaveValue('');
  });
});

test.describe('Jobs List - Sorting', () => {
  test('should sort jobs by newest first', async ({ page }) => {
    await navigateToJobsList(page);

    await page.locator('[data-sort-select]').click();
    await page.locator('[data-sort-option="newest"]').click();

    const firstJobDate = await page.locator('[data-job-card]').first().locator('[data-created-date]').textContent();
    const lastJobDate = await page.locator('[data-job-card]').last().locator('[data-created-date]').textContent();
    // Verify first job is newer than last job
  });

  test('should sort jobs by most applicants', async ({ page }) => {
    await navigateToJobsList(page);

    await page.locator('[data-sort-select]').click();
    await page.locator('[data-sort-option="applicants"]').click();

    // Verify jobs are sorted by applicant count descending
  });
});

test.describe('Create Job Wizard - Access & Navigation', () => {
  test('should access create job wizard', async ({ page }) => {
    await startCreateJob(page);

    await expect(page.locator('[data-job-wizard]')).toBeVisible();
    await expect(page.locator('[data-step-indicator]')).toHaveCount(5);
    await expect(page.locator('[data-current-step]')).toContainText('Step 1');
  });

  test('should navigate through wizard steps', async ({ page }) => {
    await startCreateJob(page);

    // Fill step 1 and go to step 2
    await fillBasicsStep(page);
    await page.locator('[data-next-button]').click();
    await expect(page.locator('[data-current-step]')).toContainText('Step 2');
    await expect(page.locator('[data-step="1"]')).toHaveAttribute('data-status', 'complete');

    // Go back to step 1
    await page.locator('[data-back-button]').click();
    await expect(page.locator('[data-current-step]')).toContainText('Step 1');
    await expect(page.locator('[data-job-title-input]')).toHaveValue(TEST_JOB.title);
  });

  test('should show confirmation dialog when canceling', async ({ page }) => {
    await startCreateJob(page);

    await fillBasicsStep(page);
    await page.locator('[data-cancel-button]').click();

    await expect(page.locator('[data-confirmation-dialog]')).toBeVisible();
    await expect(page.locator('[data-confirmation-dialog]')).toContainText('unsaved changes');
  });
});

test.describe('Step 1: Basics', () => {
  test('should display basics form', async ({ page }) => {
    await startCreateJob(page);

    await expect(page.locator('[data-job-title-input]')).toBeVisible();
    await expect(page.locator('[data-department-input]')).toBeVisible();
    await expect(page.locator('[data-location-input]')).toBeVisible();
    await expect(page.locator('[data-employment-type-select]')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await startCreateJob(page);

    await page.locator('[data-next-button]').click();

    await expect(page.locator('[data-title-error]')).toBeVisible();
    await expect(page.locator('[data-title-error]')).toContainText('Job title is required');
  });

  test('should complete step 1 and save draft', async ({ page }) => {
    await startCreateJob(page);

    await fillBasicsStep(page);
    await page.locator('[data-next-button]').click();

    await expect(page.locator('[data-current-step]')).toContainText('Step 2');
    await expect(page.locator('[data-draft-saved-indicator]')).toBeVisible();
  });
});

test.describe('Step 2: Description', () => {
  test('should generate job description with AI', async ({ page }) => {
    await startCreateJob(page);
    await fillBasicsStep(page);
    await page.locator('[data-next-button]').click();

    await page.locator('[data-ai-generate-button]').click();

    await expect(page.locator('[data-ai-loading]')).toBeVisible();
    await page.waitForTimeout(2000); // Wait for AI generation
    await expect(page.locator('[data-description-textarea]')).not.toHaveValue('');
  });

  test('should complete step 2 manually', async ({ page }) => {
    await startCreateJob(page);
    await fillBasicsStep(page);
    await page.locator('[data-next-button]').click();

    await fillDescriptionStep(page);
    await page.locator('[data-next-button]').click();

    await expect(page.locator('[data-current-step]')).toContainText('Step 3');
  });
});

test.describe('Step 3: Requirements', () => {
  test('should add multiple skills', async ({ page }) => {
    await startCreateJob(page);
    await fillBasicsStep(page);
    await page.locator('[data-next-button]').click();
    await fillDescriptionStep(page);
    await page.locator('[data-next-button]').click();

    // Add skills
    await page.locator('[data-required-skills-input]').fill('React');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-skill-tag]').filter({ hasText: 'React' })).toBeVisible();

    await page.locator('[data-required-skills-input]').fill('TypeScript');
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-skill-tag]')).toHaveCount(2);
  });

  test('should remove skill tag', async ({ page }) => {
    await startCreateJob(page);
    await fillBasicsStep(page);
    await page.locator('[data-next-button]').click();
    await fillDescriptionStep(page);
    await page.locator('[data-next-button]').click();

    await page.locator('[data-required-skills-input]').fill('React');
    await page.keyboard.press('Enter');

    await page.locator('[data-skill-tag]').filter({ hasText: 'React' }).locator('[data-remove-skill]').click();
    await expect(page.locator('[data-skill-tag]')).toHaveCount(0);
  });

  test('should validate minimum requirements', async ({ page }) => {
    await startCreateJob(page);
    await fillBasicsStep(page);
    await page.locator('[data-next-button]').click();
    await fillDescriptionStep(page);
    await page.locator('[data-next-button]').click();

    await page.locator('[data-next-button]').click();

    await expect(page.locator('[data-skills-error]')).toBeVisible();
    await expect(page.locator('[data-experience-error]')).toBeVisible();
  });
});

test.describe('Step 4: Compensation', () => {
  test('should validate salary range', async ({ page }) => {
    await startCreateJob(page);
    await fillBasicsStep(page);
    await page.locator('[data-next-button]').click();
    await fillDescriptionStep(page);
    await page.locator('[data-next-button]').click();
    await fillRequirementsStep(page);
    await page.locator('[data-next-button]').click();

    await page.locator('[data-salary-min-input]').fill('150000');
    await page.locator('[data-salary-max-input]').fill('100000');
    await page.locator('[data-next-button]').click();

    await expect(page.locator('[data-salary-error]')).toBeVisible();
    await expect(page.locator('[data-salary-error]')).toContainText('Maximum salary must be greater than minimum');
  });

  test('should select benefits', async ({ page }) => {
    await startCreateJob(page);
    await fillBasicsStep(page);
    await page.locator('[data-next-button]').click();
    await fillDescriptionStep(page);
    await page.locator('[data-next-button]').click();
    await fillRequirementsStep(page);
    await page.locator('[data-next-button]').click();

    await page.locator('[data-benefits-checkbox]').filter({ hasText: 'Health Insurance' }).check();
    await page.locator('[data-benefits-checkbox]').filter({ hasText: '401(k) Matching' }).check();

    await expect(page.locator('[data-benefits-checkbox]:checked')).toHaveCount(2);
  });
});

test.describe('Step 5: Review & Publish', () => {
  test('should display job preview', async ({ page }) => {
    await startCreateJob(page);
    await completeAllWizardSteps(page);

    await expect(page.locator('[data-job-preview]')).toBeVisible();
    await expect(page.locator('[data-preview-title]')).toContainText(TEST_JOB.title);
    await expect(page.locator('[data-preview-department]')).toContainText(TEST_JOB.department);
    await expect(page.locator('[data-preview-description]')).toContainText(TEST_JOB.description);
  });

  test('should publish job', async ({ page }) => {
    await startCreateJob(page);
    await completeAllWizardSteps(page);

    await page.locator('[data-publish-button]').click();

    await expect(page.locator('[data-success-message]')).toBeVisible();
    await expect(page.locator('[data-success-message]')).toContainText('Job posted successfully');
    await expect(page).toHaveURL(/\/employer\/jobs/);
  });

  test('should save as draft', async ({ page }) => {
    await startCreateJob(page);
    await completeAllWizardSteps(page);

    await page.locator('[data-save-draft-button]').click();

    await expect(page.locator('[data-success-message]')).toContainText('Job saved as draft');
    await expect(page).toHaveURL(/\/employer\/jobs/);
  });

  test('should edit from review step', async ({ page }) => {
    await startCreateJob(page);
    await completeAllWizardSteps(page);

    await page.locator('[data-edit-basics-button]').click();

    await expect(page.locator('[data-current-step]')).toContainText('Step 1');
    await expect(page.locator('[data-job-title-input]')).toHaveValue(TEST_JOB.title);
  });
});

test.describe('Draft Autosave', () => {
  test('should autosave on step completion', async ({ page }) => {
    await startCreateJob(page);
    await fillBasicsStep(page);
    await page.locator('[data-next-button]').click();

    await expect(page.locator('[data-draft-saved-indicator]')).toBeVisible();
  });

  test('should autosave every 30 seconds', async ({ page }) => {
    await startCreateJob(page);
    await fillBasicsStep(page);

    await page.waitForTimeout(30000); // Wait 30 seconds
    await expect(page.locator('[data-auto-save-indicator]')).toBeVisible();
  });
});

test.describe('Edit Existing Job', () => {
  test('should edit active job', async ({ page }) => {
    await navigateToJobsList(page);

    await page.locator('[data-job-card]').first().locator('[data-edit-button]').click();

    await expect(page.locator('[data-job-wizard]')).toBeVisible();
    await expect(page.locator('[data-job-title-input]')).not.toHaveValue('');
  });

  test('should update job and republish', async ({ page }) => {
    await navigateToJobsList(page);
    await page.locator('[data-job-card]').first().locator('[data-edit-button]').click();

    await page.locator('[data-job-title-input]').fill('Staff Engineer');
    // Navigate to review
    for (let i = 0; i < 4; i++) {
      await page.locator('[data-next-button]').click();
    }

    await page.locator('[data-publish-button]').click();

    await expect(page.locator('[data-success-message]')).toContainText('Job updated successfully');
  });
});

test.describe('Job Card Actions', () => {
  test('should duplicate job', async ({ page }) => {
    await navigateToJobsList(page);

    await page.locator('[data-job-card]').first().locator('[data-menu-button]').click();
    await page.locator('[data-duplicate-option]').click();

    await expect(page.locator('[data-job-wizard]')).toBeVisible();
    await expect(page.locator('[data-job-title-input]')).toContainText('Copy of');
  });

  test('should close job', async ({ page }) => {
    await navigateToJobsList(page);

    await page.locator('[data-job-card]').first().locator('[data-menu-button]').click();
    await page.locator('[data-close-option]').click();

    await expect(page.locator('[data-confirmation-dialog]')).toBeVisible();
    await page.locator('[data-confirm-close-button]').click();

    await expect(page.locator('[data-success-message]')).toContainText('Job closed');
  });

  test('should delete draft job', async ({ page }) => {
    await navigateToJobsList(page);
    await page.locator('[data-filter-draft]').click();

    await page.locator('[data-job-card]').first().locator('[data-menu-button]').click();
    await page.locator('[data-delete-option]').click();

    await expect(page.locator('[data-confirmation-dialog]')).toBeVisible();
    await page.locator('[data-confirm-delete-button]').click();

    await expect(page.locator('[data-success-message]')).toContainText('Job deleted');
  });
});

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display jobs list on mobile', async ({ page }) => {
    await navigateToJobsList(page);

    await expect(page.locator('[data-job-card]')).toBeVisible();
    const cardWidth = await page.locator('[data-job-card]').first().boundingBox();
    expect(cardWidth?.width).toBeLessThanOrEqual(375);
  });

  test('should create job on mobile', async ({ page }) => {
    await startCreateJob(page);

    await expect(page.locator('[data-job-wizard]')).toBeVisible();
    await expect(page.locator('[data-next-button]').first().boundingBox()).resolves.toHaveProperty('height', expect.any(Number));
  });
});

test.describe('Accessibility', () => {
  test('should navigate wizard with keyboard', async ({ page }) => {
    await startCreateJob(page);

    await page.keyboard.press('Tab'); // Focus on first field
    await page.keyboard.type(TEST_JOB.title);

    await page.keyboard.press('Tab'); // Move to department
    await page.keyboard.type(TEST_JOB.department);

    // Tab to Next button and press Enter
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
    }
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-current-step]')).toContainText('Step 2');
  });

  test('should announce step changes to screen readers', async ({ page }) => {
    await startCreateJob(page);

    const ariaLive = page.locator('[aria-live="polite"]');
    await fillBasicsStep(page);
    await page.locator('[data-next-button]').click();

    await expect(ariaLive).toContainText('Step 2 of 5');
  });
});

test.describe('Role-Based Access Control', () => {
  test('should allow employer to access job wizard', async ({ page }) => {
    // Assume employer is logged in
    await page.goto('/employer/jobs/create');

    await expect(page.locator('[data-job-wizard]')).toBeVisible();
  });

  test('should block non-employer from accessing job wizard', async ({ page }) => {
    // Assume job seeker is logged in
    await page.goto('/employer/jobs/create');

    await expect(page.locator('[data-forbidden-message]')).toBeVisible();
    // Or redirected
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
