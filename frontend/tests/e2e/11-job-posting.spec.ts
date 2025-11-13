/**
 * E2E Tests for Job Posting Component
 * Sprint 19-20 Week 39 Day 4
 *
 * Tests the complete job posting flow with multi-step form and AI generation
 */

import { test, expect } from '@playwright/test';

test.describe('Job Posting - Create Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/job-posting');
    await expect(page.getByRole('heading', { name: /job posting test page/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display multi-step form with step 1 initially', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /create job posting/i })).toBeVisible();
    await expect(page.getByText(/step 1/i)).toBeVisible();
    await expect(page.getByText(/basic information/i)).toBeVisible();
  });

  test('should display all step 1 fields', async ({ page }) => {
    await expect(page.getByLabel(/job title/i)).toBeVisible();
    await expect(page.getByLabel(/department/i)).toBeVisible();
    await expect(page.getByLabel(/^location\b/i)).toBeVisible();
    await expect(page.getByLabel(/workplace type/i)).toBeVisible();
    await expect(page.getByLabel(/employment type/i)).toBeVisible();
    await expect(page.getByLabel(/experience level/i)).toBeVisible();
    await expect(page.getByLabel(/minimum salary/i)).toBeVisible();
    await expect(page.getByLabel(/maximum salary/i)).toBeVisible();
  });

  test('should validate required fields before progression', async ({ page }) => {
    const nextButton = page.getByRole('button', { name: /^next$/i });
    await nextButton.click();

    await expect(page.getByText(/job title is required/i)).toBeVisible();
  });

  test('should navigate to step 2 after filling required fields', async ({ page }) => {
    await page.getByLabel(/job title/i).fill('Senior Software Engineer');
    await page.getByLabel(/^location\b/i).fill('San Francisco, CA');

    await page.getByRole('button', { name: /^next$/i }).click();

    await expect(page.getByText(/step 2/i)).toBeVisible();
    await expect(page.getByLabel(/job description/i)).toBeVisible();
  });

  test('should display AI generation button on step 2', async ({ page }) => {
    // Navigate to step 2
    await page.getByLabel(/job title/i).fill('Software Engineer');
    await page.getByLabel(/^location\b/i).fill('San Francisco');
    await page.getByRole('button', { name: /^next$/i }).click();

    await expect(page.getByRole('button', { name: /generate.*ai/i })).toBeVisible();
  });

  test('should navigate through all 4 steps', async ({ page }) => {
    // Step 1
    await page.getByLabel(/job title/i).fill('DevOps Engineer');
    await page.getByLabel(/^location\b/i).fill('Remote');
    await page.getByRole('button', { name: /^next$/i }).click();

    // Step 2
    await expect(page.getByText(/step 2/i)).toBeVisible();
    await page.getByLabel(/job description/i).fill('Looking for an experienced DevOps engineer...');
    await page.getByRole('button', { name: /^next$/i }).click();

    // Step 3
    await expect(page.getByText(/step 3/i)).toBeVisible();
    await expect(page.getByText(/requirements/i)).toBeVisible();
    await page.getByRole('button', { name: /^next$/i }).click();

    // Step 4
    await expect(page.getByText(/step 4/i)).toBeVisible();
    await expect(page.getByText(/review/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /publish job/i })).toBeVisible();
  });

  test('should allow back navigation between steps', async ({ page }) => {
    // Navigate to step 2
    await page.getByLabel(/job title/i).fill('Engineer');
    await page.getByLabel(/^location\b/i).fill('NYC');
    await page.getByRole('button', { name: /^next$/i }).click();

    await expect(page.getByText(/step 2/i)).toBeVisible();

    // Go back to step 1
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page.getByText(/step 1/i)).toBeVisible();
    await expect(page.getByLabel(/job title/i)).toHaveValue('Engineer');
  });

  test('should save draft', async ({ page }) => {
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('Draft saved');
      dialog.accept();
    });

    await page.getByLabel(/job title/i).fill('Backend Developer');
    await page.getByRole('button', { name: /save draft/i }).click();
  });

  test('should publish complete job', async ({ page }) => {
    // Fill step 1
    await page.getByLabel(/job title/i).fill('Full Stack Developer');
    await page.getByLabel(/^location\b/i).fill('Austin, TX');
    await page.getByRole('button', { name: /^next$/i }).click();

    // Fill step 2
    await page.getByLabel(/job description/i).fill('We are looking for a talented developer...');
    await page.getByRole('button', { name: /^next$/i }).click();

    // Skip step 3
    await page.getByRole('button', { name: /^next$/i }).click();

    // Publish from step 4
    page.on('dialog', dialog => {
      expect(dialog.message()).toContain('published');
      dialog.accept();
    });

    // Simulate publishing
    await page.getByRole('button', { name: /simulate publishing/i }).click();
    await expect(page.getByRole('button', { name: /publishing/i })).toBeVisible();
  });
});

test.describe('Job Posting - Edit Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/job-posting');
    await page.getByRole('button', { name: /edit mode/i }).click();
    await page.getByRole('button', { name: /with initial data/i }).click();
  });

  test('should load with pre-filled data in edit mode', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /edit job posting/i })).toBeVisible();
    await expect(page.getByDisplayValue(/senior frontend developer/i)).toBeVisible();
  });

  test('should allow editing existing fields', async ({ page }) => {
    const titleField = page.getByLabel(/job title/i);
    await titleField.clear();
    await titleField.fill('Lead Frontend Developer');
    await expect(titleField).toHaveValue('Lead Frontend Developer');
  });
});

test.describe('Job Posting - Preview Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/job-posting');
    await page.getByRole('button', { name: /preview mode/i }).click();
    await page.getByRole('button', { name: /with initial data/i }).click();
  });

  test('should start on step 4 (review) in preview mode', async ({ page }) => {
    await expect(page.getByText(/step 4/i)).toBeVisible();
    await expect(page.getByText(/review your job posting/i)).toBeVisible();
  });

  test('should display all job details in preview', async ({ page }) => {
    await expect(page.getByText(/senior frontend developer/i)).toBeVisible();
    await expect(page.getByText(/san francisco/i)).toBeVisible();
    await expect(page.getByText(/\$130,000.*\$170,000/i)).toBeVisible();
  });
});

test.describe('Job Posting - AI Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/job-posting');
  });

  test('should show loading state during AI generation', async ({ page }) => {
    await page.getByRole('button', { name: /simulate ai generation/i }).click();
    await expect(page.getByText(/generating.*ai/i)).toBeVisible();
  });

  test('should display generation error', async ({ page }) => {
    await page.getByRole('button', { name: /trigger ai error/i }).click();
    await expect(page.getByText(/failed to generate/i)).toBeVisible();
  });
});

test.describe('Job Posting - Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/job-posting');
  });

  test('should validate salary range (min < max)', async ({ page }) => {
    await page.getByLabel(/job title/i).fill('Engineer');
    await page.getByLabel(/^location\b/i).fill('NYC');
    await page.getByLabel(/minimum salary/i).fill('150000');
    await page.getByLabel(/maximum salary/i).fill('100000');

    await page.getByRole('button', { name: /^next$/i }).click();

    await expect(page.getByText(/maximum salary.*greater.*minimum/i)).toBeVisible();
  });
});

test.describe('Job Posting - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/job-posting');
  });

  test('should support keyboard navigation through form fields', async ({ page }) => {
    await page.keyboard.press('Tab'); // Skip test controls
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should focus on job title field
    const titleField = page.getByLabel(/job title/i);
    await expect(titleField).toBeFocused();
  });

  test('should have proper ARIA labels on all form fields', async ({ page }) => {
    await expect(page.getByLabel(/job title/i)).toHaveAttribute('id');
    await expect(page.getByLabel(/department/i)).toHaveAttribute('id');
    await expect(page.getByLabel(/^location\b/i)).toHaveAttribute('id');
  });
});

test.describe('Job Posting - Responsive Design', () => {
  test('should work on mobile devices', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/test/job-posting');

    await expect(page.getByRole('heading', { name: /job posting test page/i })).toBeVisible();
    await expect(page.getByLabel(/job title/i)).toBeVisible();
  });

  test('should work on tablet devices', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/test/job-posting');

    await expect(page.getByRole('heading', { name: /job posting test page/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^next$/i })).toBeVisible();
  });
});

test.describe('Job Posting - Progress Indicator', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/job-posting');
  });

  test('should show progress through steps', async ({ page }) => {
    // Step 1 should be highlighted
    await expect(page.getByText(/step 1/i)).toBeVisible();

    // Navigate to step 2
    await page.getByLabel(/job title/i).fill('Engineer');
    await page.getByLabel(/^location\b/i).fill('SF');
    await page.getByRole('button', { name: /^next$/i }).click();

    // Step 2 should be highlighted
    await expect(page.getByText(/step 2/i)).toBeVisible();
  });
});
