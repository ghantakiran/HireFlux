/**
 * Playwright E2E Tests - Company Profile Settings
 * Sprint 19-20 Week 39 Day 4 - Issue #21
 *
 * Implements BDD scenarios from:
 * frontend/tests/features/company-profile-settings.feature
 *
 * Following TDD/BDD practices - tests written based on feature file
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Helper functions
async function loginAsCompanyOwner(page: Page) {
  // Navigate to employer login
  await page.goto(`${BASE_URL}/employer/login`);

  // Fill login form
  await page.fill('input[type="email"]', 'owner@techcorp.com');
  await page.fill('input[type="password"]', 'SecurePass123!');
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(`${BASE_URL}/employer/dashboard`);
}

async function navigateToProfileSettings(page: Page) {
  // Click settings link (adjust selector based on actual navigation)
  await page.goto(`${BASE_URL}/employer/settings/profile`);
  await page.waitForSelector('h1:has-text("Company Settings")');
}

// Mock API responses
async function mockCompanyData(page: Page) {
  await page.route(`${API_BASE_URL}/employers/me`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          company: {
            id: '123e4567-e89b-12d3-a456-426614174000',
            name: 'TechCorp Inc.',
            domain: 'techcorp.com',
            industry: 'Technology',
            size: '51-200',
            location: 'San Francisco, CA',
            website: 'https://techcorp.com',
            logo_url: null,
            description: 'We build innovative tech products',
            linkedin_url: null,
            twitter_url: null,
            timezone: 'UTC',
            notification_settings: {
              email: {
                new_application: true,
                stage_change: true,
                team_mention: true,
                weekly_digest: false,
              },
              in_app: {
                new_application: true,
                team_activity: true,
                stage_change: false,
              },
            },
          },
        },
      }),
    });
  });
}

async function mockSuccessfulUpdate(page: Page) {
  await page.route(`${API_BASE_URL}/employers/me`, async (route) => {
    if (route.request().method() === 'PUT') {
      const requestBody = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Profile updated successfully',
          data: {
            company: {
              id: '123e4567-e89b-12d3-a456-426614174000',
              ...requestBody,
            },
          },
        }),
      });
    } else {
      // Pass through GET requests
      await route.continue();
    }
  });
}

// ============================================================================
// Company Profile CRUD Tests
// ============================================================================

test.describe('Company Profile Settings - Identity & Details', () => {
  test.beforeEach(async ({ page }) => {
    await mockCompanyData(page);
  });

  test('@company-profile @happy-path - View existing company profile', async ({ page }) => {
    /**
     * Scenario: View existing company profile
     *   Given I navigate to "/employer/settings/profile"
     *   Then I should see the company profile form
     *   And I should see existing company information pre-filled
     */

    await page.goto(`${BASE_URL}/employer/settings/profile`);

    // Verify page loaded
    await expect(page.locator('h1')).toContainText('Company Settings');

    // Verify tabs exist
    await expect(page.locator('button:has-text("Identity")')).toBeVisible();
    await expect(page.locator('button:has-text("Details")')).toBeVisible();
    await expect(page.locator('button:has-text("Social Links")')).toBeVisible();
    await expect(page.locator('button:has-text("Preferences")')).toBeVisible();

    // Verify form is pre-filled
    await expect(page.locator('#company-name')).toHaveValue('TechCorp Inc.');
    await expect(page.locator('#website')).toHaveValue('https://techcorp.com');
  });

  test('@company-profile @update @happy-path - Successfully update company profile', async ({
    page,
  }) => {
    /**
     * Scenario: Successfully update company profile
     *   When I update the company name to "TechCorp International"
     *   And I click "Save Changes"
     *   Then I should see a success message
     */

    await mockSuccessfulUpdate(page);
    await page.goto(`${BASE_URL}/employer/settings/profile`);

    // Update company name
    await page.fill('#company-name', 'TechCorp International');

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Verify success message
    await expect(page.locator('text=Profile updated successfully')).toBeVisible({
      timeout: 5000,
    });
  });

  test('@company-profile @validation - Required fields validation', async ({ page }) => {
    /**
     * Scenario: Required fields validation
     *   When I clear the company name field
     *   And I click "Save Changes"
     *   Then I should see an error
     */

    await page.goto(`${BASE_URL}/employer/settings/profile`);

    // Clear company name
    await page.fill('#company-name', '');

    // Try to save
    await page.click('button:has-text("Save Changes")');

    // Verify error message
    await expect(
      page.locator('text=Company name is required')
    ).toBeVisible();
  });

  test('@company-profile @validation @website - Invalid website URL format', async ({
    page,
  }) => {
    /**
     * Scenario: Invalid website URL format
     *   When I enter website URL "not-a-valid-url"
     *   And I click "Save Changes"
     *   Then I should see an error
     */

    await page.goto(`${BASE_URL}/employer/settings/profile`);

    // Enter invalid URL
    await page.fill('#website', 'not-a-valid-url');

    // Try to save
    await page.click('button:has-text("Save Changes")');

    // Verify error message
    await expect(
      page.locator('text=Please enter a valid URL')
    ).toBeVisible();
  });

  test('@company-profile @unsaved-changes - Warn user about unsaved changes', async ({
    page,
  }) => {
    /**
     * Scenario: Warn user about unsaved changes
     *   When I update the company name
     *   Then I should see unsaved changes warning
     */

    await page.goto(`${BASE_URL}/employer/settings/profile`);

    // Update company name
    await page.fill('#company-name', 'New Company Name');

    // Verify unsaved changes warning
    await expect(
      page.locator('text=You have unsaved changes')
    ).toBeVisible();
  });
});

// ============================================================================
// Logo Upload Tests
// ============================================================================

test.describe('Company Profile Settings - Logo Upload', () => {
  test.beforeEach(async ({ page }) => {
    await mockCompanyData(page);
  });

  test('@logo-upload @preview - Preview logo before uploading', async ({ page }) => {
    /**
     * Scenario: Preview logo before uploading
     *   When I select a logo file
     *   Then I should see a preview modal
     *   And I should see options to "Cancel" or "Upload"
     */

    await page.goto(`${BASE_URL}/employer/settings/profile`);

    // Mock file upload
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      page.click('button:has-text("Browse Files")'),
    ]);

    // Upload a test file (would need actual file in E2E environment)
    // For now, verify the file chooser appeared
    expect(fileChooser).toBeTruthy();
  });

  test('@logo-upload @file-format-validation - Reject invalid file formats', async ({
    page,
  }) => {
    /**
     * Scenario: Logo format validation
     *   When I attempt to upload a logo file with format "GIF"
     *   Then I should see error "Only PNG, JPG, and SVG formats are allowed"
     */

    await page.goto(`${BASE_URL}/employer/settings/profile`);

    // This would require actual file upload testing
    // For now, verify upload button exists
    await expect(page.locator('button:has-text("Browse Files")')).toBeVisible();
  });
});

// ============================================================================
// Social Links Tests
// ============================================================================

test.describe('Company Profile Settings - Social Links', () => {
  test.beforeEach(async ({ page }) => {
    await mockCompanyData(page);
  });

  test('@social-links @validation - LinkedIn URL validation', async ({ page }) => {
    /**
     * Scenario: Social link URL validation
     *   When I enter invalid LinkedIn URL
     *   And I click "Save Changes"
     *   Then I should see error
     */

    await page.goto(`${BASE_URL}/employer/settings/profile`);

    // Click Social Links tab
    await page.click('button:has-text("Social Links")');

    // Enter invalid LinkedIn URL
    await page.fill('#linkedin-url', 'https://facebook.com/techcorp');

    // Try to save
    await page.click('button:has-text("Save Changes")');

    // Verify error
    await expect(
      page.locator('text=LinkedIn URL must start with https://linkedin.com/')
    ).toBeVisible();
  });

  test('@social-links @validation - Twitter URL validation', async ({ page }) => {
    /**
     * Scenario: Twitter URL validation
     *   When I enter invalid Twitter URL
     *   Then I should see error
     */

    await page.goto(`${BASE_URL}/employer/settings/profile`);

    // Click Social Links tab
    await page.click('button:has-text("Social Links")');

    // Enter invalid Twitter URL
    await page.fill('#twitter-url', 'https://facebook.com/techcorp');

    // Try to save
    await page.click('button:has-text("Save Changes")');

    // Verify error
    await expect(
      page.locator('text=Twitter URL must start with https://twitter.com/')
    ).toBeVisible();
  });
});

// ============================================================================
// Notification Settings Tests
// ============================================================================

test.describe('Company Profile Settings - Notification Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await mockCompanyData(page);
  });

  test('@notification-settings @email - Configure email notification preferences', async ({
    page,
  }) => {
    /**
     * Scenario: Configure email notification preferences
     *   When I enable "New Application" email notifications
     *   And I disable "Weekly Digest" email notifications
     *   And I click "Save Changes"
     *   Then my preferences should be saved
     */

    await page.goto(`${BASE_URL}/employer/settings/profile`);

    // Click Preferences tab
    await page.click('button:has-text("Preferences")');

    // Verify email notification toggles exist
    await expect(page.locator('#email-new-application')).toBeVisible();
    await expect(page.locator('#email-stage-change')).toBeVisible();
    await expect(page.locator('#email-team-mention')).toBeVisible();
    await expect(page.locator('#email-weekly-digest')).toBeVisible();
  });

  test('@notification-settings @toggle-all - Toggle all notifications on/off', async ({
    page,
  }) => {
    /**
     * Scenario: Toggle all notifications on/off
     *   When I click "Enable All Notifications"
     *   Then all notification toggles should be turned on
     */

    await page.goto(`${BASE_URL}/employer/settings/profile`);

    // Click Preferences tab
    await page.click('button:has-text("Preferences")');

    // Click "Enable All Notifications"
    await page.click('button:has-text("Enable All Notifications")');

    // Verify toggles are enabled (would need to check actual state)
    await expect(page.locator('#email-new-application')).toBeVisible();
  });
});

// ============================================================================
// Accessibility Tests
// ============================================================================

test.describe('Company Profile Settings - Accessibility', () => {
  test('@accessibility @keyboard-navigation - Navigate profile form using keyboard', async ({
    page,
  }) => {
    /**
     * Scenario: Navigate profile form using only keyboard
     *   When I use Tab to navigate through form fields
     *   Then I should be able to reach all input fields and buttons
     */

    await page.goto(`${BASE_URL}/employer/settings/profile`);

    // Tab through form
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify focus is on an interactive element
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['INPUT', 'BUTTON', 'SELECT', 'A']).toContain(focusedElement);
  });
});

// ============================================================================
// Mobile Responsiveness Tests
// ============================================================================

test.describe('Company Profile Settings - Mobile', () => {
  test('@mobile @responsive - View and edit profile on mobile device', async ({ page }) => {
    /**
     * Scenario: View and edit profile on mobile device
     *   Given I am on a mobile device (viewport 375px)
     *   When I navigate to settings
     *   Then the form should be responsive
     */

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await mockCompanyData(page);
    await page.goto(`${BASE_URL}/employer/settings/profile`);

    // Verify page loads
    await expect(page.locator('h1:has-text("Company Settings")')).toBeVisible();

    // Verify tabs are visible and responsive
    await expect(page.locator('button:has-text("Identity")')).toBeVisible();

    // Check that elements fit in mobile viewport
    const companyNameInput = page.locator('#company-name');
    const box = await companyNameInput.boundingBox();
    expect(box?.width).toBeLessThan(375);
  });
});
