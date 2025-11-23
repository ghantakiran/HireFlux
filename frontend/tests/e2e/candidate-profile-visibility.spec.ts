/**
 * E2E Tests: Candidate Profile Visibility & Portfolio - Issue #57
 *
 * Tests profile visibility controls, privacy settings, completeness meter,
 * and portfolio management following BDD scenarios from:
 * tests/features/candidate-profile-visibility.feature
 *
 * Test Coverage:
 * - Profile visibility toggle (public/private)
 * - Profile completeness meter
 * - Privacy controls (salary, contact, location)
 * - Portfolio management (add, remove, reorder)
 * - Validation rules
 */

import { test, expect, Page } from '@playwright/test';

// Mock auth state for job seeker
test.use({
  storageState: {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          {
            name: 'auth_token',
            value: 'mock_job_seeker_token',
          },
          {
            name: 'user_role',
            value: 'job_seeker',
          },
        ],
      },
    ],
  },
});

test.describe('Candidate Profile Visibility & Portfolio (Issue #57)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to profile settings page
    await page.goto('/candidate/profile/settings');
    await page.waitForSelector('[data-testid="profile-settings-page"]');
  });

  // =========================================================================
  // Profile Visibility Toggle
  // =========================================================================

  test.describe('Profile Visibility Toggle', () => {
    test('should enable public profile visibility', async ({ page }) => {
      // GIVEN: Profile visibility is private
      const visibilityToggle = page.locator('[data-testid="profile-visibility-toggle"]');
      await expect(visibilityToggle).toBeVisible();

      // Check current status
      const statusBadge = page.locator('[data-testid="visibility-status-badge"]');
      const currentStatus = await statusBadge.textContent();

      if (currentStatus?.includes('Private')) {
        // WHEN: User toggles visibility to public
        const visibilitySwitch = page.locator('[data-testid="visibility-switch"]');
        await visibilitySwitch.click();

        // THEN: Profile should be public
        await expect(statusBadge).toContainText('Public');
        await expect(page.locator('[data-testid="public-status-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="public-status-message"]')).toContainText(
          'Your profile is now public'
        );
      }
    });

    test('should show validation error if profile incomplete', async ({ page }) => {
      // GIVEN: Profile is less than 50% complete
      const completenessMeter = page.locator('[data-testid="profile-completeness-meter"]');
      await expect(completenessMeter).toBeVisible();

      const percentage = await page
        .locator('[data-testid="completeness-percentage"]')
        .textContent();
      const percentValue = parseInt(percentage || '0');

      if (percentValue < 50) {
        // WHEN: User tries to make profile public
        const visibilitySwitch = page.locator('[data-testid="visibility-switch"]');

        // Check if switch is disabled
        const isDisabled = await visibilitySwitch.isDisabled();

        if (!isDisabled) {
          await visibilitySwitch.click();
        }

        // THEN: Should show error or warning
        const error = page.locator('[data-testid="visibility-error"]');
        const warning = page.locator('[data-testid="requirements-warning"]');

        const errorVisible = await error.isVisible().catch(() => false);
        const warningVisible = await warning.isVisible().catch(() => false);

        expect(errorVisible || warningVisible).toBe(true);
      }
    });

    test('should disable public profile visibility', async ({ page }) => {
      // GIVEN: Profile visibility is public
      const statusBadge = page.locator('[data-testid="visibility-status-badge"]');
      const currentStatus = await statusBadge.textContent();

      if (currentStatus?.includes('Public')) {
        // WHEN: User toggles visibility to private
        const visibilitySwitch = page.locator('[data-testid="visibility-switch"]');
        await visibilitySwitch.click();

        // THEN: Profile should be private
        await expect(statusBadge).toContainText('Private');
        await expect(page.locator('[data-testid="private-status-message"]')).toBeVisible();
        await expect(page.locator('[data-testid="private-status-message"]')).toContainText(
          'Your profile is now private'
        );
      }
    });
  });

  // =========================================================================
  // Profile Completeness Meter
  // =========================================================================

  test.describe('Profile Completeness Meter', () => {
    test('should display profile completeness percentage', async ({ page }) => {
      // WHEN: User views the profile settings page
      const completenessMeter = page.locator('[data-testid="profile-completeness-meter"]');

      // THEN: Should show completeness meter
      await expect(completenessMeter).toBeVisible();

      // Should show percentage
      const percentage = page.locator('[data-testid="completeness-percentage"]');
      await expect(percentage).toBeVisible();
      const percentText = await percentage.textContent();
      expect(percentText).toMatch(/\d+%/);

      // Should show progress bar
      const progressBar = page.locator('[data-testid="completeness-progress-bar"]');
      await expect(progressBar).toBeVisible();
    });

    test('should display missing fields', async ({ page }) => {
      // GIVEN: Profile is incomplete
      const percentage = await page
        .locator('[data-testid="completeness-percentage"]')
        .textContent();
      const percentValue = parseInt(percentage || '0');

      if (percentValue < 100) {
        // THEN: Should show missing fields
        const missingFields = page.locator('[data-testid="missing-fields"]');
        await expect(missingFields).toBeVisible();

        // Should show at least one missing field
        const fieldItems = missingFields.locator('li');
        const count = await fieldItems.count();
        expect(count).toBeGreaterThan(0);
      }
    });

    test('should show encouragement message based on completion', async ({ page }) => {
      // WHEN: User views completeness meter
      const message = page.locator('[data-testid="completeness-message"]');

      // THEN: Should show appropriate message
      await expect(message).toBeVisible();
      const messageText = await message.textContent();
      expect(messageText).toBeTruthy();
    });
  });

  // =========================================================================
  // Privacy Controls
  // =========================================================================

  test.describe('Privacy Controls', () => {
    test('should toggle salary visibility', async ({ page }) => {
      // GIVEN: User is on profile settings
      const privacyControls = page.locator('[data-testid="privacy-controls"]');

      // Check if privacy controls are visible (only shown if profile is public)
      const isVisible = await privacyControls.isVisible().catch(() => false);

      if (isVisible) {
        // WHEN: User toggles salary visibility
        const salaryToggle = page.locator('[data-testid="salary-toggle"]');
        const initialState = await salaryToggle.isChecked();

        await salaryToggle.click();

        // THEN: Toggle state should change
        const newState = await salaryToggle.isChecked();
        expect(newState).toBe(!initialState);

        // Should show unsaved changes indicator
        const unsavedBar = page.locator('[data-testid="unsaved-changes-bar"]');
        await expect(unsavedBar).toBeVisible();
      }
    });

    test('should toggle contact information visibility', async ({ page }) => {
      // GIVEN: Privacy controls are available
      const privacyControls = page.locator('[data-testid="privacy-controls"]');
      const isVisible = await privacyControls.isVisible().catch(() => false);

      if (isVisible) {
        // WHEN: User toggles contact visibility
        const contactToggle = page.locator('[data-testid="contact-toggle"]');
        const initialState = await contactToggle.isChecked();

        await contactToggle.click();

        // THEN: Toggle state should change
        const newState = await contactToggle.isChecked();
        expect(newState).toBe(!initialState);
      }
    });

    test('should toggle location visibility', async ({ page }) => {
      // GIVEN: Privacy controls are available
      const privacyControls = page.locator('[data-testid="privacy-controls"]');
      const isVisible = await privacyControls.isVisible().catch(() => false);

      if (isVisible) {
        // WHEN: User toggles location visibility
        const locationToggle = page.locator('[data-testid="location-toggle"]');
        const initialState = await locationToggle.isChecked();

        await locationToggle.click();

        // THEN: Toggle state should change
        const newState = await locationToggle.isChecked();
        expect(newState).toBe(!initialState);
      }
    });
  });

  // =========================================================================
  // Portfolio Management
  // =========================================================================

  test.describe('Portfolio Management', () => {
    test('should show empty state when no portfolio items', async ({ page }) => {
      // GIVEN: User has no portfolio items
      const portfolioSection = page.locator('[data-testid="portfolio-management"]');
      await expect(portfolioSection).toBeVisible();

      // Check if there are any existing items
      const existingItems = await page.locator('[data-testid^="portfolio-item-"]').count();

      if (existingItems === 0) {
        // THEN: Should show empty state message
        await expect(page.getByText(/no portfolio items yet/i)).toBeVisible();
      }
    });

    test('should open add portfolio form', async ({ page }) => {
      // WHEN: User clicks "Add Portfolio Item" button
      const addButton = page.locator('[data-testid="add-portfolio-item-button"]');
      await addButton.click();

      // THEN: Add form should appear
      const addForm = page.locator('[data-testid="add-portfolio-form"]');
      await expect(addForm).toBeVisible();

      // Form should have all required fields
      await expect(page.locator('[data-testid="portfolio-type-select"]')).toBeVisible();
      await expect(page.locator('[data-testid="portfolio-title"]')).toBeVisible();
      await expect(page.locator('[data-testid="portfolio-url"]')).toBeVisible();
      await expect(page.locator('[data-testid="portfolio-description"]')).toBeVisible();
    });

    test('should add GitHub portfolio item', async ({ page }) => {
      // GIVEN: Add form is open
      const addButton = page.locator('[data-testid="add-portfolio-item-button"]');
      await addButton.click();

      // WHEN: User fills in GitHub repository details
      await page.locator('[data-testid="portfolio-title"]').fill('React Component Library');
      await page
        .locator('[data-testid="portfolio-url"]')
        .fill('https://github.com/user/react-components');
      await page
        .locator('[data-testid="portfolio-description"]')
        .fill('Open source component library with 1K+ stars');

      // Click Add button
      await page.locator('[data-testid="add-portfolio-button"]').click();

      // THEN: Portfolio item should be added
      await expect(page.locator('[data-testid="portfolio-item-0"]')).toBeVisible();
      await expect(page.locator('[data-testid="portfolio-item-0"]')).toContainText(
        'React Component Library'
      );

      // Should show unsaved changes
      await expect(page.locator('[data-testid="unsaved-changes-bar"]')).toBeVisible();
    });

    test('should validate required fields when adding portfolio item', async ({ page }) => {
      // GIVEN: Add form is open
      const addButton = page.locator('[data-testid="add-portfolio-item-button"]');
      await addButton.click();

      // WHEN: User tries to add without filling required fields
      await page.locator('[data-testid="add-portfolio-button"]').click();

      // THEN: Should show validation error
      await expect(page.getByText(/title is required/i)).toBeVisible();
    });

    test('should validate URL format', async ({ page }) => {
      // GIVEN: Add form is open
      const addButton = page.locator('[data-testid="add-portfolio-item-button"]');
      await addButton.click();

      // WHEN: User enters invalid URL
      await page.locator('[data-testid="portfolio-title"]').fill('My Project');
      await page.locator('[data-testid="portfolio-url"]').fill('not-a-valid-url');
      await page.locator('[data-testid="add-portfolio-button"]').click();

      // THEN: Should show URL validation error
      await expect(page.getByText(/valid url/i)).toBeVisible();
    });

    test('should enforce maximum portfolio items limit', async ({ page }) => {
      // Check current item count
      const itemCount = await page.locator('[data-testid^="portfolio-item-"]').count();

      if (itemCount >= 10) {
        // THEN: Add button should be disabled
        const addButton = page.locator('[data-testid="add-portfolio-item-button"]');
        await expect(addButton).toBeDisabled();

        // Should show warning message
        await expect(page.getByText(/maximum.*portfolio items/i)).toBeVisible();
      }
    });

    test('should remove portfolio item', async ({ page }) => {
      // GIVEN: At least one portfolio item exists
      const addButton = page.locator('[data-testid="add-portfolio-item-button"]');

      // Add an item first
      await addButton.click();
      await page.locator('[data-testid="portfolio-title"]').fill('Test Portfolio Item');
      await page.locator('[data-testid="portfolio-url"]').fill('https://example.com');
      await page.locator('[data-testid="add-portfolio-button"]').click();

      // WHEN: User clicks remove button
      await page.waitForSelector('[data-testid="remove-portfolio-item-0"]');
      const removeButton = page.locator('[data-testid="remove-portfolio-item-0"]');
      await removeButton.click();

      // THEN: Item should be removed
      await expect(page.locator('[data-testid="portfolio-item-0"]')).not.toBeVisible();
    });
  });

  // =========================================================================
  // Save Changes
  // =========================================================================

  test.describe('Save Changes', () => {
    test('should save profile changes', async ({ page }) => {
      // GIVEN: User has made changes (add a portfolio item)
      const addButton = page.locator('[data-testid="add-portfolio-item-button"]');
      await addButton.click();
      await page.locator('[data-testid="portfolio-title"]').fill('Test Item');
      await page.locator('[data-testid="portfolio-url"]').fill('https://test.com');
      await page.locator('[data-testid="add-portfolio-button"]').click();

      // Unsaved changes bar should appear
      await expect(page.locator('[data-testid="unsaved-changes-bar"]')).toBeVisible();

      // WHEN: User clicks "Save Changes"
      const saveButton = page.getByRole('button', { name: /save changes/i });
      await saveButton.click();

      // THEN: Should show success message
      await expect(page.locator('[data-testid="save-success-message"]')).toBeVisible();

      // Unsaved changes bar should disappear
      await expect(page.locator('[data-testid="unsaved-changes-bar"]')).not.toBeVisible();
    });

    test('should discard unsaved changes', async ({ page }) => {
      // GIVEN: User has made changes
      const addButton = page.locator('[data-testid="add-portfolio-item-button"]');
      await addButton.click();
      await page.locator('[data-testid="portfolio-title"]').fill('Test Item');
      await page.locator('[data-testid="portfolio-url"]').fill('https://test.com');
      await page.locator('[data-testid="add-portfolio-button"]').click();

      await expect(page.locator('[data-testid="unsaved-changes-bar"]')).toBeVisible();

      // WHEN: User clicks "Discard"
      const discardButton = page.getByRole('button', { name: /discard/i });
      await discardButton.click();

      // THEN: Changes should be discarded
      await expect(page.locator('[data-testid="unsaved-changes-bar"]')).not.toBeVisible();
    });
  });
});
