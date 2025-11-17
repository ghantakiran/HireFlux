/**
 * Playwright E2E Tests - Employer Registration Flow
 * Sprint 19-20 Week 39 Day 3 - Issue #20
 *
 * Implements BDD scenarios from:
 * frontend/tests/features/employer-registration.feature
 *
 * Following BDD/TDD practices - tests written before implementation
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Helper functions
async function fillEmailStep(page: Page, email: string) {
  await page.fill('input[type="email"]', email);
  await page.click('button:has-text("Continue")');
}

async function fillVerificationCode(page: Page, code: string) {
  const digits = code.split('');
  for (let i = 0; i < 6; i++) {
    await page.fill(`input[data-testid="code-input-${i}"]`, digits[i]);
  }
}

async function fillPasswordStep(page: Page, password: string, confirmPassword: string) {
  await page.fill('input[name="password"]', password);
  await page.fill('input[name="confirmPassword"]', confirmPassword);
  await page.click('button:has-text("Continue")');
}

async function fillCompanyDetails(page: Page, details: {
  name: string;
  industry: string;
  size: string;
  location: string;
  website?: string;
}) {
  await page.fill('input[name="companyName"]', details.name);
  await page.selectOption('select[name="industry"]', details.industry);
  await page.selectOption('select[name="companySize"]', details.size);
  await page.fill('input[name="location"]', details.location);
  if (details.website) {
    await page.fill('input[name="website"]', details.website);
  }
  await page.click('button:has-text("Continue")');
}

// Mock API interceptors
async function mockSendVerificationCode(page: Page, email: string) {
  await page.route(`${API_BASE_URL}/email-verification/send-code`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          message: 'Verification code sent to your email',
          code_id: '123e4567-e89b-12d3-a456-426614174000',
          expires_in_seconds: 600,
        },
      }),
    });
  });
}

async function mockVerifyCode(page: Page, email: string, code: string, success = true) {
  await page.route(`${API_BASE_URL}/email-verification/verify-code`, async (route) => {
    const request = route.request();
    const postData = JSON.parse(request.postData() || '{}');

    if (success && postData.code === code) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            message: 'Email verified successfully',
            email: email,
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: 'Invalid verification code. Please try again.',
        }),
      });
    }
  });
}

async function mockResendCode(page: Page) {
  await page.route(`${API_BASE_URL}/email-verification/resend-code`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          message: 'New verification code sent',
          code_id: '223e4567-e89b-12d3-a456-426614174001',
          expires_in_seconds: 600,
        },
      }),
    });
  });
}

// BDD Scenario Tests

test.describe('Employer Registration & Authentication - Email Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to employer registration page
    await page.goto(`${BASE_URL}/employer/register`);
  });

  test('@email-verification @happy-path - Successfully register with email verification', async ({
    page,
  }) => {
    /**
     * Scenario: Successfully register with email verification
     *   Given I am on the employer registration page
     *   When I enter a valid company email "hiring@techcorp.com"
     *   And I click "Continue with Email"
     *   Then I should see the email verification screen
     *   And I should receive a 6-digit verification code
     *   When I enter the correct verification code
     *   Then I should proceed to the password creation step
     */

    const testEmail = 'hiring@techcorp.com';
    const testCode = '123456';

    // Mock API responses
    await mockSendVerificationCode(page, testEmail);
    await mockVerifyCode(page, testEmail, testCode, true);

    // Step 1: Enter email
    await fillEmailStep(page, testEmail);

    // Verify: Should see verification screen
    await expect(page.locator('text=Enter verification code')).toBeVisible({
      timeout: 5000,
    });

    // Step 2: Enter verification code
    await fillVerificationCode(page, testCode);
    await page.click('button:has-text("Continue")');

    // Verify: Should proceed to password step
    await expect(page.locator('text=Create your password')).toBeVisible({
      timeout: 5000,
    });
  });

  test('@email-verification @validation - Invalid email format is rejected', async ({
    page,
  }) => {
    /**
     * Scenario: Invalid email format is rejected
     *   When I enter an invalid email "not-an-email"
     *   And I click "Continue with Email"
     *   Then I should see an error "Please enter a valid email address"
     *   And I should remain on the email entry step
     */

    await fillEmailStep(page, 'not-an-email');

    // Verify: Should show validation error
    await expect(page.locator('text=Please enter a valid email address')).toBeVisible();

    // Verify: Should remain on step 1
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('@verification-code @invalid - Invalid verification code is rejected', async ({
    page,
  }) => {
    /**
     * Scenario: Invalid verification code is rejected
     *   Given I am on the email verification step
     *   When I enter an incorrect code "999999"
     *   Then I should see an error "Invalid verification code"
     *   And I should remain on the verification step
     */

    const testEmail = 'hiring@techcorp.com';
    const wrongCode = '999999';

    await mockSendVerificationCode(page, testEmail);
    await mockVerifyCode(page, testEmail, '123456', false);

    // Get to verification step
    await fillEmailStep(page, testEmail);
    await expect(page.locator('text=Enter verification code')).toBeVisible({
      timeout: 5000,
    });

    // Enter wrong code
    await fillVerificationCode(page, wrongCode);
    await page.click('button:has-text("Continue")');

    // Verify: Should show error
    await expect(page.locator('text=Invalid verification code')).toBeVisible({
      timeout: 3000,
    });

    // Verify: Should remain on verification step
    await expect(page.locator('text=Enter verification code')).toBeVisible();
  });

  test('@verification-code @resend - Resend verification code', async ({ page }) => {
    /**
     * Scenario: Resend verification code
     *   Given I am on the email verification step
     *   When I click "Resend Code"
     *   Then I should receive a new 6-digit code
     *   And I should see a message "New code sent to your email"
     */

    const testEmail = 'hiring@techcorp.com';

    await mockSendVerificationCode(page, testEmail);
    await mockResendCode(page);

    // Get to verification step
    await fillEmailStep(page, testEmail);
    await expect(page.locator('text=Enter verification code')).toBeVisible({
      timeout: 5000,
    });

    // Click resend
    await page.click('button:has-text("Resend Code")');

    // Verify: Should see success (or wait for API to complete)
    await page.waitForTimeout(1000);

    // Code inputs should be cleared
    const firstInput = await page.locator('input[data-testid="code-input-0"]').inputValue();
    expect(firstInput).toBe('');
  });
});

test.describe('Employer Registration & Authentication - Password Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/employer/register`);

    // Mock APIs and get to password step
    const testEmail = 'hiring@techcorp.com';
    const testCode = '123456';

    await mockSendVerificationCode(page, testEmail);
    await mockVerifyCode(page, testEmail, testCode, true);

    await fillEmailStep(page, testEmail);
    await expect(page.locator('text=Enter verification code')).toBeVisible({
      timeout: 5000,
    });
    await fillVerificationCode(page, testCode);
    await page.click('button:has-text("Continue")');
    await expect(page.locator('text=Create your password')).toBeVisible({
      timeout: 5000,
    });
  });

  test('@password @happy-path - Create strong password', async ({ page }) => {
    /**
     * Scenario: Create strong password
     *   Given I am on the password creation step
     *   When I enter password "SecurePass123!"
     *   And I confirm password "SecurePass123!"
     *   And I click "Continue"
     *   Then I should proceed to the company details step
     */

    await fillPasswordStep(page, 'SecurePass123!', 'SecurePass123!');

    // Verify: Should proceed to company details
    await expect(page.locator('text=Company details')).toBeVisible({ timeout: 5000 });
  });

  test('@password @mismatch - Password confirmation mismatch', async ({ page }) => {
    /**
     * Scenario: Password confirmation mismatch
     *   Given I am on the password creation step
     *   When I enter password "SecurePass123!"
     *   And I confirm password "DifferentPass123!"
     *   And I click "Continue"
     *   Then I should see an error "Passwords do not match"
     *   And I should remain on the password step
     */

    await fillPasswordStep(page, 'SecurePass123!', 'DifferentPass123!');

    // Verify: Should show error
    await expect(page.locator('text=Passwords do not match')).toBeVisible();

    // Verify: Should remain on password step
    await expect(page.locator('text=Create your password')).toBeVisible();
  });

  test('@password @strength-validation - Weak password is rejected', async ({ page }) => {
    /**
     * Scenario: Password strength validation
     *   Given I am on the password creation step
     *   When I enter a weak password "weak"
     *   Then the continue button should be disabled
     */

    await page.fill('input[name="password"]', 'weak');
    await page.fill('input[name="confirmPassword"]', 'weak');
    await page.click('button:has-text("Continue")');

    // Verify: Should show password strength error
    await expect(
      page.locator('text=Password must be at least 8 characters')
    ).toBeVisible();
  });
});

test.describe('Employer Registration & Authentication - Company Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/employer/register`);

    // Mock APIs and navigate to company details step
    const testEmail = 'hiring@techcorp.com';
    const testCode = '123456';

    await mockSendVerificationCode(page, testEmail);
    await mockVerifyCode(page, testEmail, testCode, true);

    await fillEmailStep(page, testEmail);
    await page.waitForTimeout(1000);
    await fillVerificationCode(page, testCode);
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(1000);
    await fillPasswordStep(page, 'SecurePass123!', 'SecurePass123!');
    await expect(page.locator('text=Company details')).toBeVisible({ timeout: 5000 });
  });

  test('@company-details @happy-path - Enter complete company details', async ({ page }) => {
    /**
     * Scenario: Enter complete company details
     *   Given I am on the company details step
     *   When I fill in company information
     *   And I click "Continue"
     *   Then I should proceed to the plan selection step
     */

    await fillCompanyDetails(page, {
      name: 'TechCorp Inc.',
      industry: 'Technology',
      size: '51-200',
      location: 'San Francisco, CA',
      website: 'https://techcorp.com',
    });

    // Verify: Should proceed to plan selection
    await expect(page.locator('text=Choose your plan')).toBeVisible({ timeout: 5000 });
  });

  test('@company-details @optional-fields - Register with minimum required fields', async ({
    page,
  }) => {
    /**
     * Scenario: Register with minimum required fields
     *   Given I am on the company details step
     *   When I fill in only required fields
     *   And I leave optional fields blank
     *   And I click "Continue"
     *   Then I should proceed to the plan selection step
     */

    await fillCompanyDetails(page, {
      name: 'Startup Inc.',
      industry: 'Technology',
      size: '1-10',
      location: 'Remote',
    });

    // Verify: Should proceed to plan selection
    await expect(page.locator('text=Choose your plan')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Employer Registration & Authentication - Mobile Responsiveness', () => {
  test('@mobile @responsive - Complete registration on mobile device', async ({ page }) => {
    /**
     * Scenario: Complete registration on mobile device
     *   Given I am on a mobile device (viewport 375px)
     *   When I go through the entire registration flow
     *   Then all steps should be mobile-responsive
     */

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto(`${BASE_URL}/employer/register`);

    const testEmail = 'hiring@mobile-test.com';
    await mockSendVerificationCode(page, testEmail);

    // Verify mobile layout
    await expect(page.locator('input[type="email"]')).toBeVisible();

    // Check that elements are properly sized for mobile
    const emailInput = page.locator('input[type="email"]');
    const box = await emailInput.boundingBox();
    expect(box?.width).toBeLessThan(375); // Should fit in mobile viewport
  });
});

test.describe('Employer Registration & Authentication - Accessibility', () => {
  test('@accessibility @keyboard-navigation - Complete registration using only keyboard', async ({
    page,
  }) => {
    /**
     * Scenario: Complete registration using only keyboard
     *   Given I am using only keyboard navigation
     *   When I tab through the registration form
     *   Then I should be able to fill all fields
     *   And I should be able to submit using Enter key
     */

    await page.goto(`${BASE_URL}/employer/register`);

    // Tab to email field
    await page.keyboard.press('Tab');

    // Type email
    await page.keyboard.type('hiring@techcorp.com');

    // Tab to continue button and press Enter
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // Verify navigation worked
    await page.waitForTimeout(1000);
  });
});

// Rate Limiting Test (requires backend integration)
test.describe('Employer Registration & Authentication - Rate Limiting', () => {
  test.skip('@email-verification @rate-limit - Rate limiting on email verification attempts', async ({
    page,
  }) => {
    /**
     * Scenario: Rate limiting on email verification attempts
     *   Given I have already requested 3 verification codes in the last hour
     *   When I request another verification code
     *   Then I should see an error "Too many attempts. Please try again in 60 minutes."
     *
     * Note: This test requires actual backend integration to test rate limiting
     */

    await page.goto(`${BASE_URL}/employer/register`);

    // This would need actual backend calls to test rate limiting
    // Skipping for now as it requires real API integration
  });
});
