/**
 * E2E Tests for Email Delivery Tracking & Webhooks - Issue #52
 *
 * Tests the complete email delivery lifecycle:
 * 1. Email triggered from application status change
 * 2. Email sent via Resend API
 * 3. Webhook received from Resend (delivered/bounced/opened/clicked)
 * 4. Delivery status updated in database
 * 5. Employer sees delivery stats in dashboard
 *
 * Run with:
 * npx playwright test tests/e2e/28-email-delivery-tracking.spec.ts
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const MOCK_APPLICATION = {
  id: 'app_123',
  candidateName: 'Jane Doe',
  candidateEmail: 'jane@example.com',
  jobTitle: 'Senior Software Engineer',
  status: 'new',
};

const MOCK_EMAIL_LOG = {
  id: 'email_log_456',
  email_id: 'resend_msg_abc123',
  to_email: 'jane@example.com',
  subject: 'Application Update: Senior Software Engineer',
  status: 'sent',
  sent_at: '2025-11-24T10:00:00Z',
  delivered_at: null,
  opened_at: null,
  open_count: 0,
  click_count: 0,
};

// Helper functions
async function loginAsEmployer(page: Page) {
  await page.goto('/employer/login');
  await page.fill('[name="email"]', 'employer@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/employer/dashboard');
}

async function mockEmailDeliveryAPIs(page: Page) {
  // Mock application update endpoint
  await page.route('**/api/v1/applications/*/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        email_sent: true,
        email_log_id: MOCK_EMAIL_LOG.id,
      }),
    });
  });

  // Mock email logs endpoint
  await page.route('**/api/v1/email-logs**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        logs: [MOCK_EMAIL_LOG],
        total: 1,
      }),
    });
  });

  // Mock email delivery stats endpoint
  await page.route('**/api/v1/analytics/email-delivery**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        total_sent: 100,
        total_delivered: 95,
        total_bounced: 2,
        total_opened: 75,
        total_clicked: 45,
        delivery_rate: 95.0,
        open_rate: 75.0,
        click_rate: 45.0,
        bounce_rate: 2.0,
      }),
    });
  });

  // Mock Resend webhook simulator endpoint
  await page.route('**/api/v1/webhooks/resend', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        received: true,
        event_type: route.request().postDataJSON()?.type,
      }),
    });
  });
}

test.describe('Email Delivery Tracking & Webhooks', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsEmployer(page);
    await mockEmailDeliveryAPIs(page);
  });

  // ===========================================================================
  // Email Sending & Initial Tracking
  // ===========================================================================

  test('Send email on application status change and track delivery', async ({ page }) => {
    // Given I am on the applications page
    await page.goto('/employer/applications');

    // When I change an application status
    const app = page.locator('[data-testid="application-row"]').first();
    await app.locator('[data-testid="status-dropdown"]').click();
    await page.locator('[data-testid="status-option-reviewing"]').click();

    const modal = page.locator('[data-testid="status-change-modal"]');

    // And I confirm sending the email
    await expect(modal.locator('[data-testid="send-email-checkbox"]')).toBeChecked();
    await modal.locator('[data-testid="confirm-button"]').click();

    // Then the application status should update
    await expect(page.getByText('Application status updated successfully')).toBeVisible();

    // And I should see an email delivery tracking indicator
    await expect(page.locator('[data-testid="email-delivery-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-delivery-status"]')).toContainText('Sent');

    // And the indicator should show "Pending delivery"
    const statusBadge = page.locator('[data-testid="email-status-badge"]');
    await expect(statusBadge).toHaveClass(/status-sent/);
  });

  test('Display email delivery status in application row', async ({ page }) => {
    // Given I am on the applications page
    await page.goto('/employer/applications');

    // Then each application row should show email delivery status
    const app = page.locator('[data-testid="application-row"]').first();

    // And I should see an email icon/badge
    const emailIcon = app.locator('[data-testid="email-delivery-icon"]');
    await expect(emailIcon).toBeVisible();

    // And hovering should show delivery details
    await emailIcon.hover();
    const tooltip = page.locator('[data-testid="email-delivery-tooltip"]');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Sent at: 10:00 AM');
    await expect(tooltip).toContainText('Status: Sent');
  });

  test('View detailed email delivery log', async ({ page }) => {
    // Given I am on the applications page
    await page.goto('/employer/applications');

    const app = page.locator('[data-testid="application-row"]').first();

    // When I click on the email delivery status
    await app.locator('[data-testid="email-delivery-icon"]').click();

    // Then I should see an email delivery log modal
    const modal = page.locator('[data-testid="email-log-modal"]');
    await expect(modal).toBeVisible();

    // And it should show the email details
    await expect(modal).toContainText('Email Delivery Log');
    await expect(modal).toContainText('To: jane@example.com');
    await expect(modal).toContainText('Subject: Application Update');

    // And it should show the delivery timeline
    const timeline = modal.locator('[data-testid="delivery-timeline"]');
    await expect(timeline).toBeVisible();

    // And it should show events
    await expect(timeline.locator('[data-testid="event-sent"]')).toBeVisible();
    await expect(timeline.locator('[data-testid="event-sent"]')).toContainText('Sent');
  });

  // ===========================================================================
  // Webhook Event Processing
  // ===========================================================================

  test('Webhook: Email delivered successfully', async ({ page }) => {
    // Given an email was sent
    await page.goto('/employer/applications');

    // Simulate Resend webhook: email.delivered
    await page.evaluate(async () => {
      await fetch('/api/v1/webhooks/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email.delivered',
          data: {
            email_id: 'resend_msg_abc123',
            to: 'jane@example.com',
            delivered_at: '2025-11-24T10:00:05Z',
          },
        }),
      });
    });

    // When I refresh the page
    await page.reload();

    // Then the email status should show "Delivered"
    const statusBadge = page.locator('[data-testid="email-status-badge"]').first();
    await expect(statusBadge).toContainText('Delivered');
    await expect(statusBadge).toHaveClass(/status-delivered/);

    // And the delivery time should be shown
    const emailIcon = page.locator('[data-testid="email-delivery-icon"]').first();
    await emailIcon.hover();
    const tooltip = page.locator('[data-testid="email-delivery-tooltip"]');
    await expect(tooltip).toContainText('Delivered at: 10:00 AM');
  });

  test('Webhook: Email bounced (hard bounce)', async ({ page }) => {
    // Given an email was sent
    await page.goto('/employer/applications');

    // Simulate Resend webhook: email.bounced (hard)
    await page.evaluate(async () => {
      await fetch('/api/v1/webhooks/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email.bounced',
          data: {
            email_id: 'resend_msg_abc123',
            to: 'invalid@example.com',
            bounce_type: 'hard',
            bounce_reason: 'Address does not exist',
            smtp_code: '550',
          },
        }),
      });
    });

    await page.reload();

    // Then the email status should show "Bounced"
    const statusBadge = page.locator('[data-testid="email-status-badge"]').first();
    await expect(statusBadge).toContainText('Bounced');
    await expect(statusBadge).toHaveClass(/status-bounced/);

    // And there should be a warning indicator
    await expect(page.locator('[data-testid="email-warning-icon"]').first()).toBeVisible();

    // And hovering should show bounce details
    const emailIcon = page.locator('[data-testid="email-delivery-icon"]').first();
    await emailIcon.hover();
    const tooltip = page.locator('[data-testid="email-delivery-tooltip"]');
    await expect(tooltip).toContainText('Bounced: Address does not exist');
    await expect(tooltip).toContainText('Hard bounce - email address invalid');
  });

  test('Webhook: Email bounced (soft bounce with retry)', async ({ page }) => {
    // Given an email was sent
    await page.goto('/employer/applications');

    // Simulate Resend webhook: email.bounced (soft)
    await page.evaluate(async () => {
      await fetch('/api/v1/webhooks/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email.bounced',
          data: {
            email_id: 'resend_msg_abc123',
            to: 'jane@example.com',
            bounce_type: 'soft',
            bounce_reason: 'Mailbox full',
            smtp_code: '452',
          },
        }),
      });
    });

    await page.reload();

    // Then the email status should show "Soft Bounced - Retrying"
    const statusBadge = page.locator('[data-testid="email-status-badge"]').first();
    await expect(statusBadge).toContainText('Soft Bounce');
    await expect(statusBadge).toHaveClass(/status-soft-bounced/);

    // And there should be a retry indicator
    const emailIcon = page.locator('[data-testid="email-delivery-icon"]').first();
    await emailIcon.hover();
    const tooltip = page.locator('[data-testid="email-delivery-tooltip"]');
    await expect(tooltip).toContainText('Will retry: 2 attempts remaining');
  });

  test('Webhook: Email opened by candidate', async ({ page }) => {
    // Given an email was delivered
    await page.goto('/employer/applications');

    // Simulate Resend webhook: email.opened
    await page.evaluate(async () => {
      await fetch('/api/v1/webhooks/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email.opened',
          data: {
            email_id: 'resend_msg_abc123',
            to: 'jane@example.com',
            opened_at: '2025-11-24T11:30:00Z',
            user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0...)',
            ip_address: '192.168.1.1',
          },
        }),
      });
    });

    await page.reload();

    // Then the email status should show "Opened"
    const statusBadge = page.locator('[data-testid="email-status-badge"]').first();
    await expect(statusBadge).toContainText('Opened');
    await expect(statusBadge).toHaveClass(/status-opened/);

    // And there should be an "opened" indicator icon
    await expect(page.locator('[data-testid="email-opened-icon"]').first()).toBeVisible();

    // And hovering should show open details
    const emailIcon = page.locator('[data-testid="email-delivery-icon"]').first();
    await emailIcon.hover();
    const tooltip = page.locator('[data-testid="email-delivery-tooltip"]');
    await expect(tooltip).toContainText('Opened at: 11:30 AM');
    await expect(tooltip).toContainText('Device: iPhone');
  });

  test('Webhook: Email link clicked by candidate', async ({ page }) => {
    // Given an email was opened
    await page.goto('/employer/applications');

    // Simulate Resend webhook: email.clicked
    await page.evaluate(async () => {
      await fetch('/api/v1/webhooks/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email.clicked',
          data: {
            email_id: 'resend_msg_abc123',
            to: 'jane@example.com',
            clicked_at: '2025-11-24T11:35:00Z',
            url: 'https://hireflux.com/dashboard/applications',
            link_text: 'View Your Application',
          },
        }),
      });
    });

    await page.reload();

    // Then the email status should show "Clicked"
    const statusBadge = page.locator('[data-testid="email-status-badge"]').first();
    await expect(statusBadge).toContainText('Clicked');
    await expect(statusBadge).toHaveClass(/status-clicked/);

    // And there should be a "clicked" indicator icon
    await expect(page.locator('[data-testid="email-clicked-icon"]').first()).toBeVisible();

    // And hovering should show click details
    const emailIcon = page.locator('[data-testid="email-delivery-icon"]').first();
    await emailIcon.hover();
    const tooltip = page.locator('[data-testid="email-delivery-tooltip"]');
    await expect(tooltip).toContainText('Clicked: View Your Application');
    await expect(tooltip).toContainText('Clicked at: 11:35 AM');
  });

  test('Webhook: Email marked as spam (complaint)', async ({ page }) => {
    // Given an email was delivered
    await page.goto('/employer/applications');

    // Simulate Resend webhook: email.complained
    await page.evaluate(async () => {
      await fetch('/api/v1/webhooks/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email.complained',
          data: {
            email_id: 'resend_msg_abc123',
            to: 'jane@example.com',
            complained_at: '2025-11-24T12:00:00Z',
          },
        }),
      });
    });

    await page.reload();

    // Then the email status should show "Complained"
    const statusBadge = page.locator('[data-testid="email-status-badge"]').first();
    await expect(statusBadge).toContainText('Spam');
    await expect(statusBadge).toHaveClass(/status-complained/);

    // And there should be a critical warning indicator
    await expect(page.locator('[data-testid="email-warning-icon"]').first()).toBeVisible();

    // And there should be an alert message
    const alert = page.locator('[data-testid="spam-complaint-alert"]');
    await expect(alert).toBeVisible();
    await expect(alert).toContainText('Email marked as spam');
    await expect(alert).toContainText('This candidate has been unsubscribed');
  });

  // ===========================================================================
  // Email Delivery Dashboard & Analytics
  // ===========================================================================

  test('View email delivery analytics dashboard', async ({ page }) => {
    // Given I am logged in as an employer
    // When I navigate to the analytics page
    await page.goto('/employer/analytics/email-delivery');

    // Then I should see overall delivery metrics
    const metrics = page.locator('[data-testid="email-metrics-overview"]');
    await expect(metrics).toBeVisible();

    // And I should see total sent emails
    await expect(metrics.locator('[data-testid="metric-total-sent"]')).toContainText('100');

    // And I should see delivery rate
    await expect(metrics.locator('[data-testid="metric-delivery-rate"]')).toContainText('95%');

    // And I should see open rate
    await expect(metrics.locator('[data-testid="metric-open-rate"]')).toContainText('75%');

    // And I should see click rate
    await expect(metrics.locator('[data-testid="metric-click-rate"]')).toContainText('45%');

    // And I should see bounce rate
    await expect(metrics.locator('[data-testid="metric-bounce-rate"]')).toContainText('2%');
  });

  test('View email delivery chart (time series)', async ({ page }) => {
    // Given I am on the email analytics page
    await page.goto('/employer/analytics/email-delivery');

    // Then I should see a delivery rate chart
    const chart = page.locator('[data-testid="delivery-chart"]');
    await expect(chart).toBeVisible();

    // And the chart should show last 30 days
    await expect(page.locator('[data-testid="chart-timeframe"]')).toContainText('Last 30 days');

    // And I can change the timeframe
    await page.locator('[data-testid="timeframe-dropdown"]').click();
    await page.locator('[data-testid="timeframe-7days"]').click();

    // Then the chart should update
    await expect(page.locator('[data-testid="chart-timeframe"]')).toContainText('Last 7 days');
  });

  test('Filter email logs by status', async ({ page }) => {
    // Given I am on the email logs page
    await page.goto('/employer/analytics/email-logs');

    // When I filter by "Bounced" status
    await page.locator('[data-testid="status-filter-dropdown"]').click();
    await page.locator('[data-testid="filter-option-bounced"]').click();

    // Then I should only see bounced emails
    const emailRows = page.locator('[data-testid="email-log-row"]');
    await expect(emailRows).toHaveCount(2); // From mock data

    // And each row should show "Bounced" status
    await expect(emailRows.first()).toContainText('Bounced');
  });

  test('Search email logs by recipient', async ({ page }) => {
    // Given I am on the email logs page
    await page.goto('/employer/analytics/email-logs');

    // When I search for a specific email address
    await page.locator('[data-testid="email-search-input"]').fill('jane@example.com');
    await page.locator('[data-testid="search-button"]').click();

    // Then I should only see emails sent to that address
    const emailRows = page.locator('[data-testid="email-log-row"]');
    await expect(emailRows).toHaveCount(1);
    await expect(emailRows.first()).toContainText('jane@example.com');
  });

  test('Export email delivery data as CSV', async ({ page }) => {
    // Given I am on the email logs page
    await page.goto('/employer/analytics/email-logs');

    // When I click "Export CSV"
    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-testid="export-csv-button"]').click();

    // Then a CSV file should be downloaded
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/email-delivery-logs.*\.csv/);
  });

  // ===========================================================================
  // Blocklist & Unsubscribe Management
  // ===========================================================================

  test('View blocklist of bounced emails', async ({ page }) => {
    // Given I am logged in as an employer
    // When I navigate to email settings
    await page.goto('/employer/settings/email-blocklist');

    // Then I should see a list of blocked email addresses
    const blocklist = page.locator('[data-testid="email-blocklist"]');
    await expect(blocklist).toBeVisible();

    // And each entry should show the reason
    const entry = blocklist.locator('[data-testid="blocklist-entry"]').first();
    await expect(entry).toContainText('invalid@example.com');
    await expect(entry).toContainText('Hard bounce: Address does not exist');

    // And each entry should show the date blocked
    await expect(entry).toContainText('Blocked on:');
  });

  test('Remove email from blocklist', async ({ page }) => {
    // Given I am on the blocklist page
    await page.goto('/employer/settings/email-blocklist');

    const entry = page.locator('[data-testid="blocklist-entry"]').first();

    // When I click "Remove from blocklist"
    await entry.locator('[data-testid="remove-blocklist-button"]').click();

    // Then I should see a confirmation dialog
    const dialog = page.locator('[data-testid="remove-blocklist-dialog"]');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Are you sure?');

    // When I confirm
    await dialog.locator('[data-testid="confirm-remove-button"]').click();

    // Then the entry should be removed
    await expect(page.getByText('Email removed from blocklist')).toBeVisible();
  });

  test('View unsubscribed candidates', async ({ page }) => {
    // Given I am logged in as an employer
    // When I navigate to unsubscribe list
    await page.goto('/employer/settings/unsubscribed');

    // Then I should see a list of unsubscribed email addresses
    const unsubList = page.locator('[data-testid="unsubscribe-list"]');
    await expect(unsubList).toBeVisible();

    // And each entry should show the reason
    const entry = unsubList.locator('[data-testid="unsubscribe-entry"]').first();
    await expect(entry).toContainText('Spam complaint');

    // And each entry should show the date
    await expect(entry).toContainText('Unsubscribed on:');

    // And I should NOT be able to remove them (compliance)
    await expect(entry.locator('[data-testid="remove-button"]')).not.toBeVisible();
  });

  // ===========================================================================
  // Mobile Responsive
  // ===========================================================================

  test('View email delivery status on mobile', async ({ page }) => {
    // Given I am using a mobile device
    await page.setViewportSize({ width: 375, height: 667 });

    // When I navigate to applications
    await page.goto('/employer/applications');

    // Then email delivery icons should be visible
    const emailIcon = page.locator('[data-testid="email-delivery-icon"]').first();
    await expect(emailIcon).toBeVisible();

    // And tapping should show delivery details
    await emailIcon.tap();
    const modal = page.locator('[data-testid="email-log-modal"]');
    await expect(modal).toBeVisible();
  });

  // ===========================================================================
  // Accessibility
  // ===========================================================================

  test('Email delivery status is accessible', async ({ page }) => {
    // Given I am on the applications page
    await page.goto('/employer/applications');

    // Then email status badges should have proper ARIA labels
    const statusBadge = page.locator('[data-testid="email-status-badge"]').first();
    await expect(statusBadge).toHaveAttribute('aria-label', /Email status:/);

    // And icons should have tooltips
    const emailIcon = page.locator('[data-testid="email-delivery-icon"]').first();
    await expect(emailIcon).toHaveAttribute('aria-describedby');
  });

  test('Keyboard navigation for email delivery log', async ({ page }) => {
    // Given I am on the applications page
    await page.goto('/employer/applications');

    // When I tab to the email delivery icon
    const emailIcon = page.locator('[data-testid="email-delivery-icon"]').first();
    await emailIcon.focus();

    // And I press Enter
    await page.keyboard.press('Enter');

    // Then the email log modal should open
    const modal = page.locator('[data-testid="email-log-modal"]');
    await expect(modal).toBeVisible();

    // And I should be able to tab through elements
    await page.keyboard.press('Tab');
    const closeButton = modal.locator('[data-testid="close-button"]');
    await expect(closeButton).toBeFocused();
  });
});
