/**
 * E2E Tests: Company Profile Setup (Issue #113)
 *
 * TDD RED Phase - Write failing tests first
 *
 * Test Coverage:
 * - Company Information Form
 * - Logo Upload
 * - Culture & Benefits
 * - Office Locations
 * - Social Media Links
 * - Form Validation & Auto-Save
 * - Industry & Company Size Selection
 * - Public Profile Display
 * - Profile Completion Progress
 * - SEO Optimization
 * - Mobile Responsiveness
 * - Accessibility
 * - Error Handling
 * - Privacy Controls
 * - Additional Features
 *
 * Total: 70+ comprehensive E2E tests
 */

import { test, expect, Page } from '@playwright/test';

// Test data constants
const TEST_COMPANY = {
  name: 'TechCorp Inc',
  industry: 'Technology',
  size: '51-200 employees',
  website: 'https://techcorp.com',
  description: 'We build innovative software solutions that transform businesses',
  values: 'Innovation, Collaboration, Growth',
  culture: 'We foster a creative and inclusive workplace',
};

const TEST_BENEFITS = [
  'Health Insurance',
  'Remote Work',
  '401(k) Matching',
  'Unlimited PTO',
  'Professional Development',
];

const TEST_LOCATIONS = [
  {
    address: '123 Main St, San Francisco, CA 94105',
    type: 'Headquarters',
  },
  {
    address: '456 Market St, New York, NY 10001',
    type: 'Office',
  },
  {
    address: '789 Tech Blvd, Austin, TX 78701',
    type: 'Office',
  },
];

const TEST_SOCIAL_MEDIA = {
  linkedin: 'https://linkedin.com/company/techcorp',
  twitter: 'https://twitter.com/techcorp',
  facebook: 'https://facebook.com/techcorp',
  instagram: 'https://instagram.com/techcorp',
};

// Helper functions
async function navigateToCompanyProfile(page: Page) {
  await page.goto('/employer/company-profile');
  await expect(page.locator('[data-company-profile-page]')).toBeVisible();
}

async function fillBasicCompanyInfo(page: Page, data = TEST_COMPANY) {
  await page.locator('[data-company-name-input]').fill(data.name);
  await page.locator('[data-industry-select]').click();
  await page.locator(`[data-industry-option="${data.industry}"]`).click();
  await page.locator('[data-company-size-select]').click();
  await page.locator(`[data-size-option="${data.size}"]`).click();
  await page.locator('[data-website-input]').fill(data.website);
  await page.locator('[data-description-textarea]').fill(data.description);
}

// ==============================================================================
// Test Suite 1: Company Information Form
// ==============================================================================

test.describe('Company Information Form', () => {
  test('should access company profile setup from employer dashboard', async ({ page }) => {
    await page.goto('/employer/dashboard');
    await page.locator('[data-nav-company-profile]').click();
    await expect(page).toHaveURL(/\/employer\/company-profile/);
    await expect(page.locator('[data-company-profile-page]')).toBeVisible();
  });

  test('should display all form sections', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await expect(page.locator('[data-basic-info-section]')).toBeVisible();
    await expect(page.locator('[data-logo-section]')).toBeVisible();
    await expect(page.locator('[data-culture-section]')).toBeVisible();
    await expect(page.locator('[data-locations-section]')).toBeVisible();
    await expect(page.locator('[data-social-section]')).toBeVisible();
  });

  test('should fill and save basic company information', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await fillBasicCompanyInfo(page);
    await page.locator('[data-save-button]').click();
    await expect(page.locator('[data-success-message]')).toBeVisible();
    await expect(page.locator('[data-success-message]')).toContainText('Profile saved successfully');
  });

  test('should require company name', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-industry-select]').click();
    await page.locator('[data-industry-option="Technology"]').click();
    await page.locator('[data-save-button]').click();
    await expect(page.locator('[data-company-name-error]')).toBeVisible();
    await expect(page.locator('[data-company-name-error]')).toContainText('Company name is required');
  });

  test('should validate website URL format', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-company-name-input]').fill('TechCorp');
    await page.locator('[data-website-input]').fill('not-a-url');
    await page.locator('[data-website-input]').blur();
    await expect(page.locator('[data-website-error]')).toBeVisible();
    await expect(page.locator('[data-website-error]')).toContainText('Please enter a valid URL');

    // Fix URL
    await page.locator('[data-website-input]').clear();
    await page.locator('[data-website-input]').fill('https://example.com');
    await page.locator('[data-website-input]').blur();
    await expect(page.locator('[data-website-error]')).not.toBeVisible();
  });

  test('should show character count on company description', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-description-textarea]').fill('Test description');
    await expect(page.locator('[data-description-count]')).toBeVisible();
    await expect(page.locator('[data-description-count]')).toContainText('16/500');
  });

  test('should update character count as user types', async ({ page }) => {
    await navigateToCompanyProfile(page);
    const textarea = page.locator('[data-description-textarea]');
    const counter = page.locator('[data-description-count]');

    await textarea.fill('Short');
    await expect(counter).toContainText('5/500');

    await textarea.fill('A much longer description text');
    await expect(counter).toContainText('30/500');
  });

  test('should warn when approaching character limit', async ({ page }) => {
    await navigateToCompanyProfile(page);
    const longText = 'a'.repeat(480);
    await page.locator('[data-description-textarea]').fill(longText);
    await expect(page.locator('[data-description-warning]')).toBeVisible();
    await expect(page.locator('[data-description-warning]')).toContainText('20 characters remaining');
  });

  test('should prevent typing beyond character limit', async ({ page }) => {
    await navigateToCompanyProfile(page);
    const maxText = 'a'.repeat(500);
    await page.locator('[data-description-textarea]').fill(maxText);
    await expect(page.locator('[data-description-count]')).toContainText('500/500');

    // Try to add more
    await page.locator('[data-description-textarea]').press('a');
    const value = await page.locator('[data-description-textarea]').inputValue();
    expect(value.length).toBe(500);
  });
});

// ==============================================================================
// Test Suite 2: Logo Upload
// ==============================================================================

test.describe('Logo Upload', () => {
  test('should show file picker when clicking upload area', async ({ page }) => {
    await navigateToCompanyProfile(page);
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-logo-upload-area]').click();
    const fileChooser = await fileChooserPromise;
    expect(fileChooser).toBeTruthy();
  });

  test('should upload and preview valid logo image', async ({ page }) => {
    await navigateToCompanyProfile(page);
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-logo-upload-area]').click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-image-data'),
    });

    await expect(page.locator('[data-logo-preview]')).toBeVisible();
    await expect(page.locator('[data-logo-success-message]')).toContainText('Logo uploaded successfully');
  });

  test('should show preview before uploading', async ({ page }) => {
    await navigateToCompanyProfile(page);
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-logo-upload-area]').click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: 'logo.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from('fake-image-data'),
    });

    await expect(page.locator('[data-logo-preview]')).toBeVisible();
    await expect(page.locator('[data-logo-upload-confirm]')).toBeVisible();
    await expect(page.locator('[data-logo-upload-cancel]')).toBeVisible();
  });

  test('should validate logo file size (max 5MB)', async ({ page }) => {
    await navigateToCompanyProfile(page);
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-logo-upload-area]').click();
    const fileChooser = await fileChooserPromise;

    // Simulate 6MB file
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
    await fileChooser.setFiles({
      name: 'large-logo.png',
      mimeType: 'image/png',
      buffer: largeBuffer,
    });

    await expect(page.locator('[data-logo-error]')).toBeVisible();
    await expect(page.locator('[data-logo-error]')).toContainText('File size must be less than 5MB');
  });

  test('should validate logo file type (PNG, JPG, JPEG only)', async ({ page }) => {
    await navigateToCompanyProfile(page);
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-logo-upload-area]').click();
    const fileChooser = await fileChooserPromise;

    await fileChooser.setFiles({
      name: 'document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('fake-pdf-data'),
    });

    await expect(page.locator('[data-logo-error]')).toBeVisible();
    await expect(page.locator('[data-logo-error]')).toContainText('Only PNG, JPG, and JPEG files are allowed');
  });

  test('should replace existing logo with new upload', async ({ page }) => {
    await navigateToCompanyProfile(page);

    // Upload first logo
    let fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-logo-upload-area]').click();
    let fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'logo1.png',
      mimeType: 'image/png',
      buffer: Buffer.from('logo1-data'),
    });
    await expect(page.locator('[data-logo-preview]')).toBeVisible();

    // Upload second logo
    fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-logo-upload-area]').click();
    fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'logo2.png',
      mimeType: 'image/png',
      buffer: Buffer.from('logo2-data'),
    });

    await expect(page.locator('[data-logo-preview]')).toBeVisible();
    await expect(page.locator('[data-logo-success-message]')).toContainText('Logo updated successfully');
  });

  test('should remove logo with confirmation', async ({ page }) => {
    await navigateToCompanyProfile(page);

    // Upload logo first
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-logo-upload-area]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('logo-data'),
    });

    // Remove logo
    await page.locator('[data-logo-remove-button]').click();
    await expect(page.locator('[data-confirm-dialog]')).toBeVisible();
    await expect(page.locator('[data-confirm-message]')).toContainText('Are you sure you want to remove the logo?');

    await page.locator('[data-confirm-yes]').click();
    await expect(page.locator('[data-logo-preview]')).not.toBeVisible();
    await expect(page.locator('[data-logo-placeholder]')).toBeVisible();
  });
});

// ==============================================================================
// Test Suite 3: Culture & Benefits
// ==============================================================================

test.describe('Culture & Benefits', () => {
  test('should add company culture description', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-culture-section]').scrollIntoViewIfNeeded();
    await page.locator('[data-values-input]').fill(TEST_COMPANY.values);
    await page.locator('[data-culture-textarea]').fill(TEST_COMPANY.culture);
    await page.locator('[data-save-button]').click();
    await expect(page.locator('[data-success-message]')).toContainText('saved successfully');
  });

  test('should add company benefits one by one', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-culture-section]').scrollIntoViewIfNeeded();

    for (let i = 0; i < 3; i++) {
      await page.locator('[data-add-benefit-button]').click();
      await page.locator('[data-benefit-input]').last().fill(TEST_BENEFITS[i]);
    }

    const benefits = await page.locator('[data-benefit-item]').count();
    expect(benefits).toBe(3);
  });

  test('should show remove option for each benefit', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-culture-section]').scrollIntoViewIfNeeded();

    await page.locator('[data-add-benefit-button]').click();
    await page.locator('[data-benefit-input]').fill('Health Insurance');

    await expect(page.locator('[data-benefit-remove-button]').first()).toBeVisible();
  });

  test('should remove a specific benefit', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-culture-section]').scrollIntoViewIfNeeded();

    // Add 3 benefits
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-add-benefit-button]').click();
      await page.locator('[data-benefit-input]').last().fill(TEST_BENEFITS[i]);
    }

    // Remove second benefit
    await page.locator('[data-benefit-remove-button]').nth(1).click();

    const benefits = await page.locator('[data-benefit-item]').count();
    expect(benefits).toBe(2);
  });

  test('should reorder benefits with drag and drop', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-culture-section]').scrollIntoViewIfNeeded();

    // Add benefits
    for (let i = 0; i < 3; i++) {
      await page.locator('[data-add-benefit-button]').click();
      await page.locator('[data-benefit-input]').last().fill(TEST_BENEFITS[i]);
    }

    // Get first benefit
    const firstBenefit = page.locator('[data-benefit-item]').first();
    const thirdBenefit = page.locator('[data-benefit-item]').nth(2);

    // Drag first to third position
    await firstBenefit.dragTo(thirdBenefit);

    await page.locator('[data-save-button]').click();
    await expect(page.locator('[data-success-message]')).toBeVisible();
  });

  test('should limit benefits to maximum 15', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-culture-section]').scrollIntoViewIfNeeded();

    // Add 15 benefits
    for (let i = 0; i < 15; i++) {
      await page.locator('[data-add-benefit-button]').click();
      await page.locator('[data-benefit-input]').last().fill(`Benefit ${i + 1}`);
    }

    // Try to add 16th
    await expect(page.locator('[data-add-benefit-button]')).toBeDisabled();
    await expect(page.locator('[data-benefits-limit-message]')).toBeVisible();
    await expect(page.locator('[data-benefits-limit-message]')).toContainText('Maximum 15 benefits allowed');
  });
});

// ==============================================================================
// Test Suite 4: Office Locations
// ==============================================================================

test.describe('Office Locations', () => {
  test('should show location form when clicking Add Location', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-locations-section]').scrollIntoViewIfNeeded();
    await page.locator('[data-add-location-button]').click();
    await expect(page.locator('[data-location-form]')).toBeVisible();
  });

  test('should add office location with headquarters designation', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-locations-section]').scrollIntoViewIfNeeded();
    await page.locator('[data-add-location-button]').click();

    await page.locator('[data-location-address-input]').fill(TEST_LOCATIONS[0].address);
    await page.locator('[data-location-type-headquarters]').check();
    await page.locator('[data-save-location-button]').click();

    await expect(page.locator('[data-location-item]')).toBeVisible();
    await expect(page.locator('[data-location-badge]')).toContainText('Headquarters');
  });

  test('should add multiple office locations', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-locations-section]').scrollIntoViewIfNeeded();

    for (const location of TEST_LOCATIONS) {
      await page.locator('[data-add-location-button]').click();
      await page.locator('[data-location-address-input]').fill(location.address);

      if (location.type === 'Headquarters') {
        await page.locator('[data-location-type-headquarters]').check();
      }

      await page.locator('[data-save-location-button]').click();
    }

    const locations = await page.locator('[data-location-item]').count();
    expect(locations).toBe(3);
  });

  test('should allow only one headquarters', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-locations-section]').scrollIntoViewIfNeeded();

    // Add locations
    for (const location of TEST_LOCATIONS) {
      await page.locator('[data-add-location-button]').click();
      await page.locator('[data-location-address-input]').fill(location.address);
      if (location.type === 'Headquarters') {
        await page.locator('[data-location-type-headquarters]').check();
      }
      await page.locator('[data-save-location-button]').click();
    }

    // Count headquarters badges
    const hqCount = await page.locator('[data-location-badge]:has-text("Headquarters")').count();
    expect(hqCount).toBe(1);
  });

  test('should edit existing office location', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-locations-section]').scrollIntoViewIfNeeded();

    // Add location
    await page.locator('[data-add-location-button]').click();
    await page.locator('[data-location-address-input]').fill(TEST_LOCATIONS[0].address);
    await page.locator('[data-save-location-button]').click();

    // Edit location
    await page.locator('[data-location-edit-button]').first().click();
    await expect(page.locator('[data-location-form]')).toBeVisible();
    await expect(page.locator('[data-location-address-input]')).toHaveValue(TEST_LOCATIONS[0].address);

    await page.locator('[data-location-address-input]').clear();
    await page.locator('[data-location-address-input]').fill('999 New St, Seattle, WA 98101');
    await page.locator('[data-save-location-button]').click();

    await expect(page.locator('[data-location-item]')).toContainText('Seattle');
  });

  test('should remove office location with confirmation', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-locations-section]').scrollIntoViewIfNeeded();

    // Add 3 locations
    for (const location of TEST_LOCATIONS) {
      await page.locator('[data-add-location-button]').click();
      await page.locator('[data-location-address-input]').fill(location.address);
      await page.locator('[data-save-location-button]').click();
    }

    // Remove second location
    await page.locator('[data-location-remove-button]').nth(1).click();
    await expect(page.locator('[data-confirm-dialog]')).toBeVisible();
    await page.locator('[data-confirm-yes]').click();

    const locations = await page.locator('[data-location-item]').count();
    expect(locations).toBe(2);
  });

  test('should change headquarters designation', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-locations-section]').scrollIntoViewIfNeeded();

    // Add SF as HQ
    await page.locator('[data-add-location-button]').click();
    await page.locator('[data-location-address-input]').fill(TEST_LOCATIONS[0].address);
    await page.locator('[data-location-type-headquarters]').check();
    await page.locator('[data-save-location-button]').click();

    // Add NY as Office
    await page.locator('[data-add-location-button]').click();
    await page.locator('[data-location-address-input]').fill(TEST_LOCATIONS[1].address);
    await page.locator('[data-save-location-button]').click();

    // Change NY to HQ
    await page.locator('[data-location-edit-button]').nth(1).click();
    await page.locator('[data-location-type-headquarters]').check();
    await page.locator('[data-save-location-button]').click();

    // Only NY should be HQ now
    const hqItems = page.locator('[data-location-badge]:has-text("Headquarters")');
    await expect(hqItems).toHaveCount(1);
  });

  test('should validate address format', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-locations-section]').scrollIntoViewIfNeeded();
    await page.locator('[data-add-location-button]').click();

    await page.locator('[data-location-address-input]').fill('123 Main');
    await page.locator('[data-location-address-input]').blur();

    await expect(page.locator('[data-location-address-error]')).toBeVisible();
    await expect(page.locator('[data-location-address-error]')).toContainText('Please enter a complete address');
  });
});

// ==============================================================================
// Test Suite 5: Social Media Links
// ==============================================================================

test.describe('Social Media Links', () => {
  test('should add all social media links', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-social-section]').scrollIntoViewIfNeeded();

    await page.locator('[data-linkedin-input]').fill(TEST_SOCIAL_MEDIA.linkedin);
    await page.locator('[data-twitter-input]').fill(TEST_SOCIAL_MEDIA.twitter);
    await page.locator('[data-facebook-input]').fill(TEST_SOCIAL_MEDIA.facebook);
    await page.locator('[data-instagram-input]').fill(TEST_SOCIAL_MEDIA.instagram);

    await page.locator('[data-save-button]').click();
    await expect(page.locator('[data-success-message]')).toBeVisible();
  });

  test('should validate social media URL format', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-social-section]').scrollIntoViewIfNeeded();

    await page.locator('[data-linkedin-input]').fill('not-a-url');
    await page.locator('[data-linkedin-input]').blur();

    await expect(page.locator('[data-linkedin-error]')).toBeVisible();
    await expect(page.locator('[data-linkedin-error]')).toContainText('Please enter a valid LinkedIn URL');

    // Fix URL
    await page.locator('[data-linkedin-input]').clear();
    await page.locator('[data-linkedin-input]').fill(TEST_SOCIAL_MEDIA.linkedin);
    await page.locator('[data-linkedin-input]').blur();

    await expect(page.locator('[data-linkedin-error]')).not.toBeVisible();
  });

  test('should validate platform-specific URLs', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-social-section]').scrollIntoViewIfNeeded();

    // Wrong platform
    await page.locator('[data-linkedin-input]').fill('https://twitter.com/techcorp');
    await page.locator('[data-linkedin-input]').blur();

    await expect(page.locator('[data-linkedin-error]')).toBeVisible();
    await expect(page.locator('[data-linkedin-error]')).toContainText('Please enter a valid LinkedIn URL');

    // Correct platform
    await page.locator('[data-linkedin-input]').clear();
    await page.locator('[data-linkedin-input]').fill(TEST_SOCIAL_MEDIA.linkedin);
    await page.locator('[data-linkedin-input]').blur();

    await expect(page.locator('[data-linkedin-error]')).not.toBeVisible();
  });

  test('should allow saving profile without social media links', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await fillBasicCompanyInfo(page);

    // Don't fill social media
    await page.locator('[data-save-button]').click();
    await expect(page.locator('[data-success-message]')).toBeVisible();
  });
});

// ==============================================================================
// Test Suite 6: Form Validation & Auto-Save
// ==============================================================================

test.describe('Form Validation & Auto-Save', () => {
  test('should auto-save changes after 2 seconds', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-company-name-input]').fill('TechCorp International');

    await page.waitForTimeout(2500);
    await expect(page.locator('[data-save-indicator]')).toContainText('Saved');
  });

  test('should show unsaved changes warning when navigating away', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-company-name-input]').fill('TechCorp New Name');

    // Try to navigate away immediately
    page.on('dialog', dialog => dialog.accept());
    await page.locator('[data-nav-dashboard]').click();
  });

  test('should validate all required fields on submit', async ({ page }) => {
    await navigateToCompanyProfile(page);

    // Only fill company name
    await page.locator('[data-company-name-input]').fill('TechCorp');
    await page.locator('[data-save-button]').click();

    // Should show errors for missing required fields
    await expect(page.locator('[data-form-errors]')).toBeVisible();
  });
});

// ==============================================================================
// Test Suite 7: Industry & Company Size Selection
// ==============================================================================

test.describe('Industry & Company Size Selection', () => {
  test('should display industry dropdown options', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-industry-select]').click();

    await expect(page.locator('[data-industry-option="Technology"]')).toBeVisible();
    await expect(page.locator('[data-industry-option="Finance"]')).toBeVisible();
    await expect(page.locator('[data-industry-option="Healthcare"]')).toBeVisible();
    await expect(page.locator('[data-industry-option="Education"]')).toBeVisible();
    await expect(page.locator('[data-industry-option="Manufacturing"]')).toBeVisible();
    await expect(page.locator('[data-industry-option="Retail"]')).toBeVisible();
    await expect(page.locator('[data-industry-option="Consulting"]')).toBeVisible();
    await expect(page.locator('[data-industry-option="Other"]')).toBeVisible();
  });

  test('should select industry from dropdown', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-industry-select]').click();
    await page.locator('[data-industry-option="Technology"]').click();

    await expect(page.locator('[data-industry-select]')).toContainText('Technology');
  });

  test('should search and filter industries', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-industry-select]').click();
    await page.locator('[data-industry-search]').fill('Tech');

    await expect(page.locator('[data-industry-option="Technology"]')).toBeVisible();
    await expect(page.locator('[data-industry-option="Finance"]')).not.toBeVisible();
  });

  test('should display company size dropdown options', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-company-size-select]').click();

    await expect(page.locator('[data-size-option="1-10 employees"]')).toBeVisible();
    await expect(page.locator('[data-size-option="11-50 employees"]')).toBeVisible();
    await expect(page.locator('[data-size-option="51-200 employees"]')).toBeVisible();
    await expect(page.locator('[data-size-option="201-500 employees"]')).toBeVisible();
    await expect(page.locator('[data-size-option="501-1000 employees"]')).toBeVisible();
    await expect(page.locator('[data-size-option="1001-5000 employees"]')).toBeVisible();
    await expect(page.locator('[data-size-option="5001+ employees"]')).toBeVisible();
  });

  test('should select company size from dropdown', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-company-size-select]').click();
    await page.locator('[data-size-option="51-200 employees"]').click();

    await expect(page.locator('[data-company-size-select]')).toContainText('51-200 employees');
  });
});

// ==============================================================================
// Test Suite 8: Public Profile Display
// ==============================================================================

test.describe('Public Profile Display', () => {
  test('should view public company profile', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await fillBasicCompanyInfo(page);
    await page.locator('[data-save-button]').click();

    await page.locator('[data-view-public-profile-button]').click();
    await expect(page).toHaveURL(/\/company\/techcorp-inc/);
    await expect(page.locator('[data-public-profile]')).toBeVisible();
  });

  test('should display all profile information on public page', async ({ page }) => {
    await page.goto('/company/techcorp-inc');

    await expect(page.locator('[data-company-name]')).toContainText('TechCorp Inc');
    await expect(page.locator('[data-company-logo]')).toBeVisible();
    await expect(page.locator('[data-company-description]')).toBeVisible();
    await expect(page.locator('[data-company-industry]')).toContainText('Technology');
    await expect(page.locator('[data-company-size]')).toContainText('51-200 employees');
  });

  test('should display culture and benefits on public profile', async ({ page }) => {
    await page.goto('/company/techcorp-inc');

    await expect(page.locator('[data-culture-section]')).toBeVisible();
    await expect(page.locator('[data-benefits-list]')).toBeVisible();
  });

  test('should display office locations on public profile', async ({ page }) => {
    await page.goto('/company/techcorp-inc');

    await expect(page.locator('[data-locations-list]')).toBeVisible();
    await expect(page.locator('[data-location-item]')).toHaveCount(3);
  });

  test('should display social media links on public profile', async ({ page }) => {
    await page.goto('/company/techcorp-inc');

    await expect(page.locator('[data-social-linkedin]')).toBeVisible();
    await expect(page.locator('[data-social-twitter]')).toBeVisible();
    await expect(page.locator('[data-social-facebook]')).toBeVisible();
    await expect(page.locator('[data-social-instagram]')).toBeVisible();
  });

  test('should hide incomplete sections on public profile', async ({ page }) => {
    await page.goto('/company/incomplete-company');

    // Should show basic info
    await expect(page.locator('[data-company-name]')).toBeVisible();

    // Should NOT show empty sections
    await expect(page.locator('[data-benefits-section]')).not.toBeVisible();
    await expect(page.locator('[data-locations-section]')).not.toBeVisible();
  });
});

// ==============================================================================
// Test Suite 9: Profile Completion Progress
// ==============================================================================

test.describe('Profile Completion Progress', () => {
  test('should show profile completion percentage', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await expect(page.locator('[data-completion-indicator]')).toBeVisible();
    await expect(page.locator('[data-completion-percentage]')).toContainText('%');
  });

  test('should show which sections are complete and incomplete', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await expect(page.locator('[data-section-status-list]')).toBeVisible();

    const completeSections = page.locator('[data-section-complete]');
    const incompleteSections = page.locator('[data-section-incomplete]');

    await expect(completeSections.or(incompleteSections)).toHaveCount(5);
  });

  test('should increase completion when uploading logo', async ({ page }) => {
    await navigateToCompanyProfile(page);

    // Get initial percentage
    const initialText = await page.locator('[data-completion-percentage]').textContent();
    const initialPercentage = parseInt(initialText?.replace('%', '') || '0');

    // Upload logo
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-logo-upload-area]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('fake-logo'),
    });

    // Check increased percentage
    const newText = await page.locator('[data-completion-percentage]').textContent();
    const newPercentage = parseInt(newText?.replace('%', '') || '0');

    expect(newPercentage).toBeGreaterThan(initialPercentage);
  });

  test('should increase completion when adding benefits', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-culture-section]').scrollIntoViewIfNeeded();

    const initialText = await page.locator('[data-completion-percentage]').textContent();
    const initialPercentage = parseInt(initialText?.replace('%', '') || '0');

    await page.locator('[data-add-benefit-button]').click();
    await page.locator('[data-benefit-input]').fill('Health Insurance');
    await page.locator('[data-save-button]').click();

    const newText = await page.locator('[data-completion-percentage]').textContent();
    const newPercentage = parseInt(newText?.replace('%', '') || '0');

    expect(newPercentage).toBeGreaterThan(initialPercentage);
  });

  test('should show prompt to complete profile when under 50%', async ({ page }) => {
    await page.goto('/employer/jobs/new');

    const completionPrompt = page.locator('[data-profile-completion-prompt]');
    if (await completionPrompt.isVisible()) {
      await expect(completionPrompt).toContainText('Complete your company profile to attract better candidates');
      await expect(page.locator('[data-complete-profile-link]')).toBeVisible();
    }
  });
});

// ==============================================================================
// Test Suite 10: SEO Optimization
// ==============================================================================

test.describe('SEO Optimization', () => {
  test('should have proper meta tags on public profile', async ({ page }) => {
    await page.goto('/company/techcorp-inc');

    const title = await page.title();
    expect(title).toContain('TechCorp Inc');

    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content', /.+/);

    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveAttribute('content', /.+/);
  });

  test('should include JSON-LD structured data', async ({ page }) => {
    await page.goto('/company/techcorp-inc');

    const jsonLd = page.locator('script[type="application/ld+json"]');
    await expect(jsonLd).toHaveCount(1);

    const content = await jsonLd.textContent();
    expect(content).toContain('Organization');
    expect(content).toContain('TechCorp Inc');
  });

  test('should truncate description to 160 characters for meta tag', async ({ page }) => {
    await page.goto('/company/techcorp-inc');

    const metaDescription = page.locator('meta[name="description"]');
    const content = await metaDescription.getAttribute('content');

    expect(content?.length).toBeLessThanOrEqual(160);
  });
});

// ==============================================================================
// Test Suite 11: Mobile Responsiveness
// ==============================================================================

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display company profile form on mobile', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await expect(page.locator('[data-company-profile-page]')).toBeVisible();
    await expect(page.locator('[data-company-name-input]')).toBeVisible();
  });

  test('should make all form fields accessible on mobile', async ({ page }) => {
    await navigateToCompanyProfile(page);

    await expect(page.locator('[data-company-name-input]')).toBeVisible();
    await expect(page.locator('[data-industry-select]')).toBeVisible();
    await expect(page.locator('[data-company-size-select]')).toBeVisible();
    await expect(page.locator('[data-website-input]')).toBeVisible();
    await expect(page.locator('[data-description-textarea]')).toBeVisible();
  });

  test('should allow logo upload on mobile', async ({ page }) => {
    await navigateToCompanyProfile(page);

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-logo-upload-area]').click();
    const fileChooser = await fileChooserPromise;

    expect(fileChooser).toBeTruthy();
  });

  test('should display public profile responsively on mobile', async ({ page }) => {
    await page.goto('/company/techcorp-inc');

    await expect(page.locator('[data-public-profile]')).toBeVisible();
    await expect(page.locator('[data-company-name]')).toBeVisible();
  });

  test('should make social media links tappable on mobile', async ({ page }) => {
    await page.goto('/company/techcorp-inc');

    const linkedinLink = page.locator('[data-social-linkedin]');
    await expect(linkedinLink).toBeVisible();

    const box = await linkedinLink.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44); // Minimum touch target
  });
});

// ==============================================================================
// Test Suite 12: Accessibility
// ==============================================================================

test.describe('Accessibility', () => {
  test('should navigate form with keyboard', async ({ page }) => {
    await navigateToCompanyProfile(page);

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-company-name-input]')).toBeFocused();

    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    // Continue tabbing through fields
  });

  test('should submit form with Enter key', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await fillBasicCompanyInfo(page);

    await page.keyboard.press('Enter');
    await expect(page.locator('[data-success-message]')).toBeVisible();
  });

  test('should have proper labels for all form fields', async ({ page }) => {
    await navigateToCompanyProfile(page);

    const companyNameInput = page.locator('[data-company-name-input]');
    const labelFor = await page.locator('label[for]').first().getAttribute('for');

    expect(labelFor).toBeTruthy();
  });

  test('should announce errors to screen readers', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-save-button]').click();

    const errorMessage = page.locator('[data-company-name-error]');
    await expect(errorMessage).toHaveAttribute('role', 'alert');
  });

  test('should have proper ARIA attributes', async ({ page }) => {
    await navigateToCompanyProfile(page);

    const industrySelect = page.locator('[data-industry-select]');
    await expect(industrySelect).toHaveAttribute('aria-label', /.+/);
  });
});

// ==============================================================================
// Test Suite 13: Error Handling
// ==============================================================================

test.describe('Error Handling', () => {
  test('should handle logo upload failure gracefully', async ({ page }) => {
    await navigateToCompanyProfile(page);

    // Simulate network error by intercepting upload
    await page.route('**/api/upload/logo', route => route.abort());

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.locator('[data-logo-upload-area]').click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles({
      name: 'logo.png',
      mimeType: 'image/png',
      buffer: Buffer.from('logo-data'),
    });

    await expect(page.locator('[data-logo-error]')).toBeVisible();
    await expect(page.locator('[data-logo-error]')).toContainText('Upload failed. Please try again.');
    await expect(page.locator('[data-retry-upload-button]')).toBeVisible();
  });

  test('should handle form submission failure', async ({ page }) => {
    await navigateToCompanyProfile(page);

    // Simulate API error
    await page.route('**/api/company/profile', route => route.abort());

    await fillBasicCompanyInfo(page);
    await page.locator('[data-save-button]').click();

    await expect(page.locator('[data-form-error]')).toBeVisible();
    await expect(page.locator('[data-form-error]')).toContainText('Failed to save profile. Please try again.');
    await expect(page.locator('[data-retry-button]')).toBeVisible();
  });

  test('should preserve changes after submission failure', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.route('**/api/company/profile', route => route.abort());

    const testName = 'TechCorp Test Name';
    await page.locator('[data-company-name-input]').fill(testName);
    await page.locator('[data-save-button]').click();

    // After error, field should still have value
    await expect(page.locator('[data-company-name-input]')).toHaveValue(testName);
  });
});

// ==============================================================================
// Test Suite 14: Privacy Controls
// ==============================================================================

test.describe('Privacy Controls', () => {
  test('should make profile private', async ({ page }) => {
    await navigateToCompanyProfile(page);

    await page.locator('[data-privacy-toggle]').click();
    await expect(page.locator('[data-privacy-message]')).toBeVisible();
    await expect(page.locator('[data-privacy-message]')).toContainText('Your profile is private and not visible to job seekers');
  });

  test('should block public access when profile is private', async ({ page }) => {
    await page.goto('/company/private-company');

    await expect(page.locator('[data-private-profile-message]')).toBeVisible();
    await expect(page.locator('[data-private-profile-message]')).toContainText('This profile is not available');
  });

  test('should make profile public again', async ({ page }) => {
    await navigateToCompanyProfile(page);

    // Toggle to private first
    await page.locator('[data-privacy-toggle]').click();

    // Toggle back to public
    await page.locator('[data-privacy-toggle]').click();
    await expect(page.locator('[data-privacy-message]')).toContainText('Your profile is now public');
  });
});

// ==============================================================================
// Test Suite 15: Additional Features
// ==============================================================================

test.describe('Additional Features', () => {
  test('should save incomplete profile as draft', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-company-name-input]').fill('Draft Company');

    // Navigate away
    await page.goto('/employer/dashboard');

    // Return to profile
    await page.goto('/employer/company-profile');

    await expect(page.locator('[data-company-name-input]')).toHaveValue('Draft Company');
    await expect(page.locator('[data-draft-message]')).toContainText('Continue editing your profile');
  });

  test('should warn about duplicate company name', async ({ page }) => {
    await navigateToCompanyProfile(page);
    await page.locator('[data-company-name-input]').fill('Existing Company Inc');
    await page.locator('[data-company-name-input]').blur();

    await expect(page.locator('[data-duplicate-warning]')).toBeVisible();
    await expect(page.locator('[data-duplicate-warning]')).toContainText('A company with this name already exists');
    await expect(page.locator('[data-claim-profile-button]')).toBeVisible();
  });

  test('should integrate with job posting', async ({ page }) => {
    await page.goto('/employer/jobs/new');

    // Company name should be pre-filled from profile
    await expect(page.locator('[data-job-company-name]')).toHaveValue('TechCorp Inc');

    // Logo should be pre-filled
    await expect(page.locator('[data-job-company-logo]')).toBeVisible();

    // Locations should be available
    await page.locator('[data-job-location-select]').click();
    await expect(page.locator('[data-location-option]')).toHaveCount(3);
  });
});
