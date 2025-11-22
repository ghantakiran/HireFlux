/**
 * Domain Verification E2E Tests - Issue #67
 *
 * End-to-end tests for domain verification feature using Playwright.
 * Tests all three verification methods: Email, DNS, and File.
 *
 * Following TDD/BDD approach based on:
 * frontend/tests/features/domain-verification.feature
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const TEST_COMPANY = {
  name: 'Test Company Inc',
  domain: 'testcompany.com',
  email: 'owner@testcompany.com',
  password: 'TestPassword123!',
};

// Helper functions
async function loginAsCompanyOwner(page: Page) {
  await page.goto('/employer/login');
  await page.fill('[data-testid="email-input"]', TEST_COMPANY.email);
  await page.fill('[data-testid="password-input"]', TEST_COMPANY.password);
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('**/employer/dashboard');
}

async function navigateToDomainVerification(page: Page) {
  await page.goto('/employer/settings/verification');
  await page.waitForLoadState('networkidle');
}

test.describe('Domain Verification', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsCompanyOwner(page);
  });

  test('should display domain verification page with all sections', async ({ page }) => {
    await navigateToDomainVerification(page);

    // Check page title
    await expect(page.locator('h1')).toContainText('Domain Verification');

    // Check "Why verify?" section
    await expect(page.getByText('Why verify your domain?')).toBeVisible();
    await expect(page.getByText('Build Trust')).toBeVisible();
    await expect(page.getByText('Prevent Impersonation')).toBeVisible();

    // Check verification method tabs
    await expect(page.locator('[data-testid="method-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="method-dns"]')).toBeVisible();
    await expect(page.locator('[data-testid="method-file"]')).toBeVisible();

    // Check domain is displayed
    await expect(page.getByText(TEST_COMPANY.domain)).toBeVisible();
  });

  test('should initiate email verification successfully', async ({ page }) => {
    await navigateToDomainVerification(page);

    // Select email method (should be default)
    await page.click('[data-testid="method-email"]');

    // Click send verification email
    await page.click('[data-testid="initiate-verification-button"]');

    // Wait for success message
    await expect(page.locator('[data-testid="verification-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="verification-success"]')).toContainText(
      'Verification emails sent'
    );

    // Check that email addresses are displayed
    await expect(page.getByText(`admin@${TEST_COMPANY.domain}`)).toBeVisible();
    await expect(page.getByText(`postmaster@${TEST_COMPANY.domain}`)).toBeVisible();
    await expect(page.getByText(`webmaster@${TEST_COMPANY.domain}`)).toBeVisible();

    // Check resend button is visible
    await expect(page.locator('[data-testid="resend-email-button"]')).toBeVisible();
  });

  test('should resend verification email', async ({ page }) => {
    await navigateToDomainVerification(page);

    // Initiate email verification first
    await page.click('[data-testid="initiate-verification-button"]');
    await expect(page.locator('[data-testid="resend-email-button"]')).toBeVisible();

    // Click resend
    await page.click('[data-testid="resend-email-button"]');

    // Check success message
    await expect(page.locator('[data-testid="verification-success"]')).toContainText(
      'resent successfully'
    );
  });

  test('should initiate DNS verification and display instructions', async ({ page }) => {
    await navigateToDomainVerification(page);

    // Select DNS method
    await page.click('[data-testid="method-dns"]');

    // Click generate DNS record
    await page.click('[data-testid="initiate-dns-button"]');

    // Wait for instructions to appear
    await page.waitForSelector('code:has-text("hireflux-verification=")');

    // Check TXT record is displayed
    const txtRecord = await page.locator('code').first().textContent();
    expect(txtRecord).toContain('hireflux-verification=');

    // Check copy buttons are visible
    await expect(page.locator('[data-testid="copy-txt-record"]')).toBeVisible();
    await expect(page.locator('[data-testid="copy-txt-value"]')).toBeVisible();

    // Check verify button is visible
    await expect(page.locator('[data-testid="verify-dns-button"]')).toBeVisible();
  });

  test('should copy DNS record to clipboard', async ({ page, context }) => {
    await navigateToDomainVerification(page);

    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Initiate DNS verification
    await page.click('[data-testid="method-dns"]');
    await page.click('[data-testid="initiate-dns-button"]');
    await page.waitForSelector('[data-testid="copy-txt-record"]');

    // Get the TXT record value before copying
    const txtRecordValue = await page.locator('code').first().textContent();

    // Click copy button
    await page.click('[data-testid="copy-txt-record"]');

    // Check copied message appears
    await expect(page.getByText('Copied to clipboard!')).toBeVisible();

    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(txtRecordValue);
  });

  test('should initiate file verification and display instructions', async ({ page }) => {
    await navigateToDomainVerification(page);

    // Select file method
    await page.click('[data-testid="method-file"]');

    // Click generate file
    await page.click('[data-testid="initiate-file-button"]');

    // Wait for instructions
    await page.waitForSelector('code:has-text("hireflux-verification.txt")');

    // Check filename is displayed
    await expect(page.getByText('hireflux-verification.txt')).toBeVisible();

    // Check upload instructions
    await expect(
      page.getByText(`https://${TEST_COMPANY.domain}/hireflux-verification.txt`)
    ).toBeVisible();

    // Check copy button and verify button
    await expect(page.locator('[data-testid="copy-file-content"]')).toBeVisible();
    await expect(page.locator('[data-testid="verify-file-button"]')).toBeVisible();
  });

  test('should show error when verification fails', async ({ page }) => {
    await navigateToDomainVerification(page);

    // Initiate DNS verification
    await page.click('[data-testid="method-dns"]');
    await page.click('[data-testid="initiate-dns-button"]');
    await page.waitForSelector('[data-testid="verify-dns-button"]');

    // Try to verify without adding DNS record (should fail)
    await page.click('[data-testid="verify-dns-button"]');

    // Wait for error message
    await expect(page.locator('[data-testid="verification-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="verification-error"]')).toContainText(
      'DNS TXT record not found'
    );
  });

  test('should display already verified status', async ({ page }) => {
    // Mock API response to return verified status
    await page.route('**/api/employer/domain-verification/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          verified: true,
          domain: TEST_COMPANY.domain,
          method: 'email',
          verified_at: new Date().toISOString(),
          attempts: 1,
          can_retry: true,
          remaining_attempts: 4,
        }),
      });
    });

    await navigateToDomainVerification(page);

    // Check verified badge is shown
    await expect(page.locator('[data-testid="domain-verification-verified"]')).toBeVisible();
    await expect(page.locator('[data-testid="verified-badge"]')).toBeVisible();
    await expect(page.getByText('Domain Verified')).toBeVisible();
    await expect(page.getByText(`Your domain ${TEST_COMPANY.domain} has been verified`)).toBeVisible();
  });

  test('should show rate limit warning when approaching limit', async ({ page }) => {
    // Mock API response with 2 remaining attempts
    await page.route('**/api/employer/domain-verification/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          verified: false,
          domain: TEST_COMPANY.domain,
          attempts: 3,
          can_retry: true,
          remaining_attempts: 2,
        }),
      });
    });

    await navigateToDomainVerification(page);

    // Check warning message
    await expect(page.getByText(/2 verification attempt.*remaining today/i)).toBeVisible();
  });

  test('should disable buttons when rate limit reached', async ({ page }) => {
    // Mock API response with rate limit reached
    await page.route('**/api/employer/domain-verification/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          verified: false,
          domain: TEST_COMPANY.domain,
          attempts: 5,
          can_retry: false,
          remaining_attempts: 0,
        }),
      });
    });

    await navigateToDomainVerification(page);

    // Check error message
    await expect(
      page.getByText(/reached the maximum verification attempts/i)
    ).toBeVisible();

    // Check buttons are disabled
    await expect(page.locator('[data-testid="initiate-verification-button"]')).toBeDisabled();
  });

  test('should show error when domain is not set', async ({ page }) => {
    // Mock company without domain
    await page.route('**/api/employer/company/profile', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '123',
          name: TEST_COMPANY.name,
          // domain is missing
        }),
      });
    });

    await navigateToDomainVerification(page);

    // Check alert message
    await expect(
      page.getByText('Please set your company domain in profile settings first')
    ).toBeVisible();

    // Check buttons are disabled
    await expect(page.locator('[data-testid="initiate-verification-button"]')).toBeDisabled();
  });

  test('should switch between verification methods', async ({ page }) => {
    await navigateToDomainVerification(page);

    // Start with email (default)
    await expect(page.getByText('We\'ll send verification emails')).toBeVisible();

    // Switch to DNS
    await page.click('[data-testid="method-dns"]');
    await expect(page.getByText('Add a TXT record to your domain\'s DNS')).toBeVisible();
    await expect(page.locator('[data-testid="initiate-dns-button"]')).toBeVisible();

    // Switch to File
    await page.click('[data-testid="method-file"]');
    await expect(page.getByText('Upload a verification file')).toBeVisible();
    await expect(page.locator('[data-testid="initiate-file-button"]')).toBeVisible();

    // Switch back to Email
    await page.click('[data-testid="method-email"]');
    await expect(page.getByText('We\'ll send verification emails')).toBeVisible();
  });

  test('should display verified badge on company profile after verification', async ({ page }) => {
    // Mock verified status
    await page.route('**/api/employer/domain-verification/badge**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          verified: true,
          verified_at: new Date().toISOString(),
        }),
      });
    });

    // Navigate to company profile
    await page.goto('/employer/settings/profile');

    // Check for verified badge
    await expect(page.locator('[data-testid="verified-badge"]')).toBeVisible();
    await expect(page.locator('[data-testid="verified-badge"]')).toContainText('Verified');
  });

  test('should show help section with contact information', async ({ page }) => {
    await navigateToDomainVerification(page);

    // Check help section
    await expect(page.getByText('Need Help?')).toBeVisible();
    await expect(page.getByText(/Email verification.*Fastest method/i)).toBeVisible();
    await expect(page.getByText(/DNS verification.*Requires access to/i)).toBeVisible();
    await expect(page.getByText(/File verification.*Requires ability/i)).toBeVisible();
    await expect(page.getByText('support@hireflux.com')).toBeVisible();
  });
});

test.describe('Domain Verification - Mobile', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should be responsive on mobile devices', async ({ page }) => {
    await loginAsCompanyOwner(page);
    await navigateToDomainVerification(page);

    // Check main elements are visible
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="domain-verification-card"]')).toBeVisible();

    // Check tabs are stacked properly
    const tabs = page.locator('[data-testid^="method-"]');
    await expect(tabs).toHaveCount(3);

    // Test tab switching on mobile
    await page.click('[data-testid="method-dns"]');
    await expect(page.getByText('Add a TXT record')).toBeVisible();
  });
});
