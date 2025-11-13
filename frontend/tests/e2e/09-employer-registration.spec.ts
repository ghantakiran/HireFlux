/**
 * E2E Tests for Employer Registration Flow
 * Sprint 19-20 Week 39 Day 2
 *
 * Tests the complete 6-step employer registration wizard
 */

import { test, expect } from '@playwright/test';

test.describe('Employer Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/employer-registration');
  });

  test('should complete full registration flow with Starter (free) plan', async ({ page }) => {
    // Step 1: Email Entry
    await expect(page.getByRole('heading', { name: /create.*employer account/i })).toBeVisible();
    await expect(page.getByText('Step 1 of 6')).toBeVisible();

    const emailInput = page.getByLabel(/company email/i);
    await emailInput.fill('hiring@testcompany.com');

    // Verify domain detection
    await expect(page.getByText('testcompany.com')).toBeVisible();

    await page.getByRole('button', { name: /continue/i }).click();

    // Step 2: Email Verification
    await expect(page.getByText('Step 2 of 6')).toBeVisible();
    await expect(page.getByText(/verify.*email/i)).toBeVisible();

    // Fill verification code
    const codeInputs = page.getByRole('textbox', { name: /digit/i });
    await expect(codeInputs).toHaveCount(6);

    for (let i = 0; i < 6; i++) {
      await codeInputs.nth(i).fill('1');
    }

    await page.getByRole('button', { name: /continue/i }).click();

    // Step 3: Password Creation
    await expect(page.getByText('Step 3 of 6')).toBeVisible();
    await expect(page.getByText(/create a password/i)).toBeVisible();

    await page.getByLabel(/^password$/i).fill('TestP@ssw0rd123');
    await page.getByLabel(/confirm password/i).fill('TestP@ssw0rd123');

    // Verify password strength indicator
    await expect(page.getByText(/strong/i)).toBeVisible();

    await page.getByRole('button', { name: /continue/i }).click();

    // Step 4: Company Details
    await expect(page.getByText('Step 4 of 6')).toBeVisible();
    await expect(page.getByText(/tell us about your company/i)).toBeVisible();

    // Company name should be pre-filled from email domain
    const companyNameInput = page.getByLabel(/company name/i);
    await expect(companyNameInput).toHaveValue(/testcompany/i);

    await page.getByLabel(/industry/i).selectOption('Technology');
    await page.getByLabel(/company size/i).selectOption('11-50');
    await page.getByLabel(/location/i).fill('San Francisco, CA');
    await page.getByLabel(/website/i).fill('https://testcompany.com');

    await page.getByRole('button', { name: /continue/i }).click();

    // Step 5: Plan Selection
    await expect(page.getByText('Step 5 of 6')).toBeVisible();
    await expect(page.getByText(/choose your plan/i)).toBeVisible();

    // Verify all plans are displayed
    await expect(page.getByRole('heading', { name: /starter/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /growth/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /professional/i })).toBeVisible();

    // Verify recommended badge on Growth plan
    await expect(page.getByText('Recommended')).toBeVisible();

    // Select Starter (free) plan
    const starterPlan = page.getByRole('button', { name: /select starter plan/i });
    await starterPlan.click();

    await page.getByRole('button', { name: /continue/i }).click();

    // Should skip Step 6 (payment) for free plan and complete
    await expect(page.getByText(/registration.*complete/i)).toBeVisible();
  });

  test('should show payment form for paid plans', async ({ page }) => {
    // Navigate to plan selection (using helper pattern)
    await page.getByLabel(/company email/i).fill('test@company.com');
    await page.getByRole('button', { name: /continue/i }).click();

    // Fill verification code
    const codeInputs = page.getByRole('textbox', { name: /digit/i });
    for (let i = 0; i < 6; i++) {
      await codeInputs.nth(i).fill('1');
    }
    await page.getByRole('button', { name: /continue/i }).click();

    // Password
    await page.getByLabel(/^password$/i).fill('TestP@ssw0rd123');
    await page.getByLabel(/confirm password/i).fill('TestP@ssw0rd123');
    await page.getByRole('button', { name: /continue/i }).click();

    // Company details
    await page.getByLabel(/industry/i).selectOption('Technology');
    await page.getByLabel(/company size/i).selectOption('11-50');
    await page.getByLabel(/location/i).fill('San Francisco, CA');
    await page.getByRole('button', { name: /continue/i }).click();

    // Select Growth (paid) plan
    const growthPlan = page.getByRole('button', { name: /select growth plan/i });
    await growthPlan.click();
    await page.getByRole('button', { name: /continue/i }).click();

    // Step 6: Payment Information should be displayed
    await expect(page.getByText('Step 6 of 6')).toBeVisible();
    await expect(page.getByText(/payment information/i)).toBeVisible();
    await expect(page.getByLabel(/card number/i)).toBeVisible();
    await expect(page.getByLabel(/expiry date/i)).toBeVisible();
    await expect(page.getByLabel(/cvv/i)).toBeVisible();
    await expect(page.getByLabel(/billing address/i)).toBeVisible();
  });

  test('should validate email format', async ({ page }) => {
    const emailInput = page.getByLabel(/company email/i);
    await emailInput.fill('invalid-email');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText(/valid email address/i)).toBeVisible();
  });

  test('should warn about personal email domains', async ({ page }) => {
    const emailInput = page.getByLabel(/company email/i);
    await emailInput.fill('john@gmail.com');

    await expect(page.getByText(/personal email/i)).toBeVisible();
  });

  test('should show password strength indicator', async ({ page }) => {
    // Navigate to password step
    await page.getByLabel(/company email/i).fill('test@company.com');
    await page.getByRole('button', { name: /continue/i }).click();

    const codeInputs = page.getByRole('textbox', { name: /digit/i });
    for (let i = 0; i < 6; i++) {
      await codeInputs.nth(i).fill('1');
    }
    await page.getByRole('button', { name: /continue/i }).click();

    // Test weak password
    const passwordInput = page.getByLabel(/^password$/i);
    await passwordInput.fill('weak');
    await expect(page.getByText(/weak/i)).toBeVisible();

    // Test strong password
    await passwordInput.fill('StrongP@ssw0rd123');
    await expect(page.getByText(/strong/i)).toBeVisible();
  });

  test('should validate password requirements', async ({ page }) => {
    // Navigate to password step
    await page.getByLabel(/company email/i).fill('test@company.com');
    await page.getByRole('button', { name: /continue/i }).click();

    const codeInputs = page.getByRole('textbox', { name: /digit/i });
    for (let i = 0; i < 6; i++) {
      await codeInputs.nth(i).fill('1');
    }
    await page.getByRole('button', { name: /continue/i }).click();

    // Try to continue with short password
    await page.getByLabel(/^password$/i).fill('short');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test('should validate password confirmation', async ({ page }) => {
    // Navigate to password step
    await page.getByLabel(/company email/i).fill('test@company.com');
    await page.getByRole('button', { name: /continue/i }).click();

    const codeInputs = page.getByRole('textbox', { name: /digit/i });
    for (let i = 0; i < 6; i++) {
      await codeInputs.nth(i).fill('1');
    }
    await page.getByRole('button', { name: /continue/i }).click();

    // Enter mismatched passwords
    await page.getByLabel(/^password$/i).fill('TestP@ssw0rd123');
    await page.getByLabel(/confirm password/i).fill('DifferentPassword');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText(/passwords.*match/i)).toBeVisible();
  });

  test('should allow navigation back and preserve form data', async ({ page }) => {
    const email = 'test@company.com';
    await page.getByLabel(/company email/i).fill(email);
    await page.getByRole('button', { name: /continue/i }).click();

    // Go back
    await page.getByRole('button', { name: /back/i }).click();

    // Email should be preserved
    const emailInput = page.getByLabel(/company email/i);
    await expect(emailInput).toHaveValue(email);
  });

  test('should show progress indicator', async ({ page }) => {
    await expect(page.getByText('Step 1 of 6')).toBeVisible();
    await expect(page.getByText('17% complete')).toBeVisible();

    // Navigate to next step
    await page.getByLabel(/company email/i).fill('test@company.com');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText('Step 2 of 6')).toBeVisible();
    await expect(page.getByText('33% complete')).toBeVisible();
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Tab to email input
    await page.keyboard.press('Tab');
    const emailInput = page.getByLabel(/company email/i);
    await expect(emailInput).toBeFocused();

    // Tab to continue button
    await page.keyboard.press('Tab');
    const continueButton = page.getByRole('button', { name: /continue/i });
    await expect(continueButton).toBeFocused();
  });
});

test.describe('Employer Registration - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should work on mobile devices', async ({ page }) => {
    await page.goto('/test/employer-registration');

    await expect(page.getByRole('heading', { name: /create.*employer account/i })).toBeVisible();

    // Test mobile form interaction
    await page.getByLabel(/company email/i).fill('mobile@company.com');
    await page.getByRole('button', { name: /continue/i }).click();

    await expect(page.getByText('Step 2 of 6')).toBeVisible();
  });
});
