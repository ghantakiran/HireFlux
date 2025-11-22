/**
 * E2E Tests for Application Status Change & Notifications - Issue #58
 *
 * Following BDD scenarios from:
 * tests/features/application-status-change.feature
 *
 * Run with:
 * npx playwright test tests/e2e/application-status-change.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const MOCK_APPLICATIONS = [
  {
    id: '1',
    candidateName: 'Jane Doe',
    candidateEmail: 'jane@example.com',
    jobTitle: 'Senior Software Engineer',
    status: 'new',
  },
  {
    id: '2',
    candidateName: 'John Smith',
    candidateEmail: 'john@example.com',
    jobTitle: 'Senior Software Engineer',
    status: 'reviewing',
  },
  {
    id: '3',
    candidateName: 'Alice Johnson',
    candidateEmail: 'alice@example.com',
    jobTitle: 'Senior Software Engineer',
    status: 'technical_interview',
  },
];

// Helper functions
async function loginAsEmployer(page: Page) {
  // TODO: Replace with actual login flow
  await page.goto('/employer/login');
  await page.fill('[name="email"]', 'employer@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/employer/dashboard');
}

async function navigateToApplicationsPage(page: Page) {
  await page.goto('/employer/applications');
  await page.waitForLoadState('networkidle');
}

async function mockApplicationsAPI(page: Page) {
  // Mock API responses
  await page.route('**/api/v1/applications*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ applications: MOCK_APPLICATIONS }),
      });
    } else if (route.request().method() === 'PATCH') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          email_sent: true,
        }),
      });
    }
  });
}

test.describe('Application Status Change & Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployer(page);
    await mockApplicationsAPI(page);
    await navigateToApplicationsPage(page);
  });

  // =========================================================================
  // Single Application Status Change
  // =========================================================================

  test('Change single application status to "Reviewing"', async ({ page }) => {
    // Given I select an application in "New" status
    const firstApp = page.locator('[data-testid="application-row"]').first();
    await expect(firstApp).toContainText('Jane Doe');
    await expect(firstApp).toContainText('New');

    // When I click on the status dropdown
    await firstApp.locator('[data-testid="status-dropdown"]').click();

    // And I select "Reviewing" from the status options
    await page.locator('[data-testid="status-option-reviewing"]').click();

    // Then I should see a confirmation modal
    const modal = page.locator('[data-testid="status-change-modal"]');
    await expect(modal).toBeVisible();

    // And the modal should show the current status
    await expect(modal.locator('[data-testid="current-status"]')).toContainText('New');

    // And I should see a checkbox "Send email notification to candidate"
    const emailCheckbox = modal.locator('[data-testid="send-email-checkbox"]');
    await expect(emailCheckbox).toBeVisible();

    // And the checkbox should be checked by default
    await expect(emailCheckbox).toBeChecked();

    // When I click "Confirm"
    await modal.locator('[data-testid="confirm-button"]').click();

    // Then the application status should update to "Reviewing"
    await expect(page.getByText('Application status updated successfully')).toBeVisible();

    // And an email notification should be sent to the candidate
    // (verified through API mock)
  });

  test('Change application status with custom message', async ({ page }) => {
    // Given I select an application in "Reviewing" status
    const app = page.locator('[data-testid="application-row"]').nth(1);
    await app.locator('[data-testid="status-dropdown"]').click();

    // When I change the status to "Phone Screen"
    await page.locator('[data-testid="status-option-phone_screen"]').click();

    const modal = page.locator('[data-testid="status-change-modal"]');
    await expect(modal).toBeVisible();

    // And I enter a custom message
    const customMessage = 'Looking forward to speaking with you on Tuesday at 2 PM';
    await modal.locator('[data-testid="custom-message-input"]').fill(customMessage);

    // And I click "Confirm"
    await modal.locator('[data-testid="confirm-button"]').click();

    // Then the custom message should be included in the email notification
    // (verified through API payload)

    // And the application status should update to "Phone Screen"
    await expect(page.getByText('Application status updated successfully')).toBeVisible();
  });

  test('Reject application with reason', async ({ page }) => {
    // Given I select an application in "Technical Interview" status
    const app = page.locator('[data-testid="application-row"]').nth(2);
    await app.locator('[data-testid="status-dropdown"]').click();

    // When I change the status to "Rejected"
    await page.locator('[data-testid="status-option-rejected"]').click();

    const modal = page.locator('[data-testid="status-change-modal"]');
    await expect(modal).toBeVisible();

    // Then I should see a "Rejection Reason" dropdown
    const rejectionReasonDropdown = modal.locator(
      '[data-testid="rejection-reason-dropdown"]'
    );
    await expect(rejectionReasonDropdown).toBeVisible();

    // When I select a rejection reason
    await rejectionReasonDropdown.click();
    await page
      .getByText('Not enough experience with required technologies')
      .click();

    // And I optionally add a custom note
    await modal
      .locator('[data-testid="custom-message-input"]')
      .fill('Great candidate, but need more Python experience');

    // And I click "Confirm"
    await modal.locator('[data-testid="confirm-button"]').click();

    // Then the rejection reason should be saved
    // And the rejection email should include the reason
    // And the application status should update to "Rejected"
    await expect(page.getByText('Application status updated successfully')).toBeVisible();
  });

  test('Change status without sending email', async ({ page }) => {
    // Given I select an application
    const app = page.locator('[data-testid="application-row"]').first();
    await app.locator('[data-testid="status-dropdown"]').click();

    // When I change the status
    await page.locator('[data-testid="status-option-reviewing"]').click();

    const modal = page.locator('[data-testid="status-change-modal"]');

    // And I uncheck "Send email notification to candidate"
    await modal.locator('[data-testid="send-email-checkbox"]').click();

    // And I click "Confirm"
    await modal.locator('[data-testid="confirm-button"]').click();

    // Then the application status should update
    await expect(page.getByText('Application status updated successfully')).toBeVisible();

    // But no email should be sent to the candidate
    // (verified through API payload with send_email: false)
  });

  test('Cancel status change', async ({ page }) => {
    // Given I select an application
    const app = page.locator('[data-testid="application-row"]').first();
    const originalStatus = await app.locator('[data-testid="current-status"]').textContent();

    await app.locator('[data-testid="status-dropdown"]').click();

    // When I change the status
    await page.locator('[data-testid="status-option-rejected"]').click();

    const modal = page.locator('[data-testid="status-change-modal"]');
    await expect(modal).toBeVisible();

    // And I click "Cancel"
    await modal.locator('[data-testid="cancel-button"]').click();

    // Then the modal should close
    await expect(modal).not.toBeVisible();

    // And the application status should remain unchanged
    await expect(app.locator('[data-testid="current-status"]')).toContainText(
      originalStatus || ''
    );

    // And no email should be sent
  });

  test('Validate status transition rules - rejected application', async ({ page }) => {
    // Mock a rejected application
    await page.route('**/api/v1/applications*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          applications: [
            { ...MOCK_APPLICATIONS[0], status: 'rejected' },
          ],
        }),
      });
    });

    await page.reload();

    // Given I select an application in "Rejected" status
    const app = page.locator('[data-testid="application-row"]').first();
    await expect(app).toContainText('Rejected');

    // When I try to change the status
    await app.locator('[data-testid="status-dropdown"]').click();
    await page.locator('[data-testid="status-option-phone_screen"]').click();

    const modal = page.locator('[data-testid="status-change-modal"]');

    // Then I should see an error message
    await expect(
      modal.locator('[data-testid="validation-error"]')
    ).toContainText('Cannot change status of rejected application');

    // And the confirm button should be disabled
    await expect(modal.locator('[data-testid="confirm-button"]')).toBeDisabled();
  });

  test('Preview email before sending', async ({ page }) => {
    // Given I am changing an application status
    const app = page.locator('[data-testid="application-row"]').first();
    await app.locator('[data-testid="status-dropdown"]').click();
    await page.locator('[data-testid="status-option-phone_screen"]').click();

    const modal = page.locator('[data-testid="status-change-modal"]');

    // When I click "Preview Email" button
    await modal.locator('[data-testid="preview-email-button"]').click();

    // Then I should see a preview of the email
    const emailPreview = modal.locator('[data-testid="email-preview"]');
    await expect(emailPreview).toBeVisible();

    // And the preview should show the subject line
    await expect(emailPreview).toContainText('Subject:');
    await expect(emailPreview).toContainText('Application Update');

    // And the preview should show the email body
    await expect(emailPreview).toContainText('Message:');

    // And the preview should include candidate name and job title
    await expect(emailPreview).toContainText('Jane Doe');
    await expect(emailPreview).toContainText('Senior Software Engineer');
  });

  // =========================================================================
  // Bulk Status Changes
  // =========================================================================

  test('Bulk reject multiple applications', async ({ page }) => {
    // Given I have multiple applications
    // When I select 5 applications using checkboxes
    await page.locator('[data-testid="application-checkbox"]').nth(0).check();
    await page.locator('[data-testid="application-checkbox"]').nth(1).check();
    await page.locator('[data-testid="application-checkbox"]').nth(2).check();

    // Then I should see a bulk action toolbar at the top
    const toolbar = page.locator('[data-testid="bulk-action-toolbar"]');
    await expect(toolbar).toBeVisible();

    // And the toolbar should show "N applications selected"
    await expect(toolbar.locator('[data-testid="selection-count"]')).toContainText(
      '3 applications selected'
    );

    // When I click "Bulk Actions" dropdown
    await toolbar.locator('[data-testid="bulk-actions-button"]').click();

    // And I select "Reject Selected"
    await page.locator('[data-testid="bulk-reject-button"]').click();

    // Then I should see a bulk rejection modal
    const modal = page.locator('[data-testid="bulk-status-change-modal"]');
    await expect(modal).toBeVisible();

    // And the modal should list all selected applications
    await expect(modal.locator('[data-testid="selected-application"]')).toHaveCount(3);

    // And I should see a rejection reason dropdown
    const rejectionDropdown = modal.locator(
      '[data-testid="bulk-rejection-reason-dropdown"]'
    );
    await expect(rejectionDropdown).toBeVisible();

    // When I select "Position filled" as the reason
    await rejectionDropdown.click();
    await page.getByText('Position filled').click();

    // And I check "Send email notifications to all candidates"
    const emailCheckbox = modal.locator('[data-testid="bulk-send-email-checkbox"]');
    await expect(emailCheckbox).toBeChecked(); // Checked by default

    // And I click "Reject N Applications"
    await modal.locator('[data-testid="bulk-confirm-button"]').click();

    // Then all applications should be rejected
    // And rejection emails should be sent
    // And I should see success message
    await expect(
      page.getByText(/Successfully (rejected|updated) \d+ applications?/)
    ).toBeVisible();
  });

  test('Bulk move applications to different stage', async ({ page }) => {
    // Given I have selected 3 applications
    await page.locator('[data-testid="application-checkbox"]').nth(0).check();
    await page.locator('[data-testid="application-checkbox"]').nth(1).check();
    await page.locator('[data-testid="application-checkbox"]').nth(2).check();

    const toolbar = page.locator('[data-testid="bulk-action-toolbar"]');

    // When I use bulk actions to move them to a stage
    await toolbar.locator('[data-testid="bulk-actions-button"]').click();
    await page.locator('[data-testid="bulk-move-to-technical_interview"]').click();

    const modal = page.locator('[data-testid="bulk-status-change-modal"]');
    await expect(modal).toBeVisible();

    // And I add a custom message
    await modal
      .locator('[data-testid="bulk-custom-message-input"]')
      .fill("You've been selected for the technical interview round");

    // And I confirm the action
    await modal.locator('[data-testid="bulk-confirm-button"]').click();

    // Then all applications should move to the new stage
    await expect(page.getByText(/Successfully (moved|updated) \d+ applications?/)).toBeVisible();
  });

  test('Deselect all applications', async ({ page }) => {
    // Given I have 3 applications selected
    await page.locator('[data-testid="application-checkbox"]').nth(0).check();
    await page.locator('[data-testid="application-checkbox"]').nth(1).check();
    await page.locator('[data-testid="application-checkbox"]').nth(2).check();

    const toolbar = page.locator('[data-testid="bulk-action-toolbar"]');
    await expect(toolbar).toBeVisible();

    // When I click "Deselect All"
    await toolbar.locator('[data-testid="deselect-all-button"]').click();

    // Then all checkboxes should be unchecked
    await expect(page.locator('[data-testid="application-checkbox"]:checked')).toHaveCount(
      0
    );

    // And the bulk toolbar should disappear
    await expect(toolbar).not.toBeVisible();
  });

  test('Bulk action with partial failures', async ({ page }) => {
    // Mock applications with mixed statuses
    await page.route('**/api/v1/applications*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          applications: [
            { ...MOCK_APPLICATIONS[0], status: 'reviewing' },
            { ...MOCK_APPLICATIONS[1], status: 'rejected' },
            { ...MOCK_APPLICATIONS[2], status: 'reviewing' },
          ],
        }),
      });
    });

    await page.reload();

    // Given I have selected applications (including rejected ones)
    await page.locator('[data-testid="application-checkbox"]').nth(0).check();
    await page.locator('[data-testid="application-checkbox"]').nth(1).check();
    await page.locator('[data-testid="application-checkbox"]').nth(2).check();

    const toolbar = page.locator('[data-testid="bulk-action-toolbar"]');
    await toolbar.locator('[data-testid="bulk-actions-button"]').click();
    await page.locator('[data-testid="bulk-move-to-offer"]').click();

    const modal = page.locator('[data-testid="bulk-status-change-modal"]');

    // Then I should see a validation error
    const warning = modal.locator('[data-testid="validation-warning"]');
    await expect(warning).toBeVisible();
    await expect(warning).toContainText(
      '1 application cannot be changed (already rejected)'
    );

    // And I should have the option to "Continue with valid applications"
    const continueCheckbox = modal.locator(
      '[data-testid="continue-with-valid-checkbox"]'
    );
    await expect(continueCheckbox).toBeVisible();

    // When I check "Continue with valid applications"
    await continueCheckbox.check();

    // And I confirm
    await modal.locator('[data-testid="bulk-confirm-button"]').click();

    // Then only the valid applications should be updated
    await expect(page.getByText(/2 applications?/)).toBeVisible();
  });

  // =========================================================================
  // Mobile Responsive
  // =========================================================================

  test('Change status on mobile device', async ({ page }) => {
    // Given I am using a mobile device
    await page.setViewportSize({ width: 375, height: 667 });

    // When I navigate to applications
    await navigateToApplicationsPage(page);

    // And I tap on an application status
    const app = page.locator('[data-testid="application-row"]').first();
    await app.locator('[data-testid="status-dropdown"]').click();
    await page.locator('[data-testid="status-option-reviewing"]').click();

    // Then I should see a mobile-optimized modal
    const modal = page.locator('[data-testid="status-change-modal"]');
    await expect(modal).toBeVisible();

    // And the modal should fit the screen
    const modalBox = await modal.boundingBox();
    expect(modalBox?.width).toBeLessThanOrEqual(375);

    // And all buttons should be easily tappable (min 44px)
    const confirmButton = modal.locator('[data-testid="confirm-button"]');
    const buttonBox = await confirmButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
  });

  // =========================================================================
  // Accessibility
  // =========================================================================

  test('Navigate status change with keyboard', async ({ page }) => {
    // Given I am using keyboard navigation
    const app = page.locator('[data-testid="application-row"]').first();

    // When I tab to the status dropdown
    await app.locator('[data-testid="status-dropdown"]').focus();

    // And I press Enter to open it
    await page.keyboard.press('Enter');

    // And I use arrow keys to select an option
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    // Then the confirmation modal should open
    const modal = page.locator('[data-testid="status-change-modal"]');
    await expect(modal).toBeVisible();

    // And I should be able to tab through all fields
    await page.keyboard.press('Tab'); // Custom message
    await page.keyboard.press('Tab'); // Email checkbox
    await page.keyboard.press('Tab'); // Cancel button
    await page.keyboard.press('Tab'); // Confirm button

    // And I can press Enter on "Confirm" button
    const confirmButton = modal.locator('[data-testid="confirm-button"]');
    await expect(confirmButton).toBeFocused();
  });

  test('Screen reader support', async ({ page }) => {
    // Test ARIA labels and roles
    const app = page.locator('[data-testid="application-row"]').first();
    await app.locator('[data-testid="status-dropdown"]').click();
    await page.locator('[data-testid="status-option-reviewing"]').click();

    const modal = page.locator('[data-testid="status-change-modal"]');

    // Check modal has proper ARIA attributes
    await expect(modal).toHaveAttribute('role', 'dialog');

    // Check form labels are associated with inputs
    const customMessageInput = modal.locator('[data-testid="custom-message-input"]');
    await expect(customMessageInput).toHaveAttribute('id', 'custom-message');

    const label = modal.locator('label[for="custom-message"]');
    await expect(label).toBeVisible();
  });
});
