import { test, expect } from '@playwright/test';

test.describe('Onboarding Flow', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    // Assume user is logged in via storage state
    await page.goto('/onboarding');
  });

  test('should display onboarding welcome screen', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Welcome to HireFlux/i })).toBeVisible();
    await expect(page.getByText(/Let's set up your profile/i)).toBeVisible();
  });

  test('should complete Step 1: Basic Profile', async ({ page }) => {
    // Fill out basic profile information
    await page.getByLabel(/First Name/i).fill('John');
    await page.getByLabel(/Last Name/i).fill('Doe');
    await page.getByLabel(/Phone/i).fill('+1234567890');
    await page.getByLabel(/Location/i).fill('San Francisco, CA');

    // Proceed to next step
    await page.getByRole('button', { name: /Continue/i }).click();

    // Should be on Step 2
    await expect(page.getByText(/Job Preferences/i)).toBeVisible();
  });

  test('should complete Step 2: Job Preferences', async ({ page }) => {
    // Navigate to step 2
    await page.goto('/onboarding?step=2');

    // Select target job titles
    await page.getByLabel(/Target Job Titles/i).click();
    await page.getByRole('option', { name: /Software Engineer/i }).click();
    await page.getByRole('option', { name: /Full Stack Developer/i }).click();

    // Set salary range
    await page.getByLabel(/Minimum Salary/i).fill('100000');
    await page.getByLabel(/Maximum Salary/i).fill('180000');

    // Select industries
    await page.getByLabel(/Industries/i).click();
    await page.getByRole('option', { name: /Technology/i }).click();
    await page.getByRole('option', { name: /Healthcare/i }).click();

    // Continue to next step
    await page.getByRole('button', { name: /Continue/i }).click();

    // Should be on Step 3
    await expect(page.getByText(/Skills/i)).toBeVisible();
  });

  test('should complete Step 3: Skills', async ({ page }) => {
    await page.goto('/onboarding?step=3');

    // Add technical skills
    const skillsInput = page.getByLabel(/Add Skills/i);
    await skillsInput.fill('React');
    await page.keyboard.press('Enter');
    await skillsInput.fill('Node.js');
    await page.keyboard.press('Enter');
    await skillsInput.fill('TypeScript');
    await page.keyboard.press('Enter');
    await skillsInput.fill('Python');
    await page.keyboard.press('Enter');

    // Verify skills are added
    await expect(page.getByText('React')).toBeVisible();
    await expect(page.getByText('Node.js')).toBeVisible();

    // Continue to next step
    await page.getByRole('button', { name: /Continue/i }).click();

    // Should be on Step 4
    await expect(page.getByText(/Work Preferences/i)).toBeVisible();
  });

  test('should complete Step 4: Work Preferences', async ({ page }) => {
    await page.goto('/onboarding?step=4');

    // Select remote preference
    await page.getByLabel(/Remote/i).check();

    // Select visa sponsorship preference
    await page.getByLabel(/Require Visa Sponsorship/i).check();

    // Select company size preference
    await page.getByLabel(/Company Size/i).click();
    await page.getByRole('option', { name: /Startup.*50/i }).click();

    // Complete onboarding
    await page.getByRole('button', { name: /Complete Onboarding/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
  });

  test('should validate required fields in each step', async ({ page }) => {
    // Try to proceed without filling required fields
    await page.getByRole('button', { name: /Continue/i }).click();

    // Should show validation errors
    await expect(page.getByText(/First name.*required/i)).toBeVisible();
    await expect(page.getByText(/Last name.*required/i)).toBeVisible();
  });

  test('should allow navigation between steps', async ({ page }) => {
    // Complete step 1
    await page.getByLabel(/First Name/i).fill('John');
    await page.getByLabel(/Last Name/i).fill('Doe');
    await page.getByRole('button', { name: /Continue/i }).click();

    // Should be on step 2
    await expect(page.getByText(/Job Preferences/i)).toBeVisible();

    // Go back to step 1
    await page.getByRole('button', { name: /Back/i }).click();

    // Should be back on step 1
    await expect(page.getByLabel(/First Name/i)).toHaveValue('John');
  });

  test('should show progress indicator', async ({ page }) => {
    // Check progress bar exists
    const progressBar = page.getByRole('progressbar');
    await expect(progressBar).toBeVisible();

    // Progress should be 25% on step 1 (1/4)
    await expect(progressBar).toHaveAttribute('aria-valuenow', '25');
  });

  test('should save draft progress', async ({ page }) => {
    // Fill some information
    await page.getByLabel(/First Name/i).fill('Jane');
    await page.getByLabel(/Last Name/i).fill('Smith');

    // Navigate away and come back
    await page.goto('/dashboard');
    await page.goto('/onboarding');

    // Data should be preserved
    await expect(page.getByLabel(/First Name/i)).toHaveValue('Jane');
    await expect(page.getByLabel(/Last Name/i)).toHaveValue('Smith');
  });
});
