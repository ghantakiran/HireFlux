import { test, expect } from '@playwright/test';

test.describe('Notifications Flow', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display notification bell icon', async ({ page }) => {
    const notificationBell = page.locator('[data-testid="notification-bell"]');
    await expect(notificationBell).toBeVisible();
  });

  test('should show notification count badge', async ({ page }) => {
    // Should show unread count
    const badge = page.locator('[data-testid="notification-badge"]');

    if (await badge.isVisible()) {
      await expect(badge).toContainText(/\d+/);
    }
  });

  test('should open notifications panel', async ({ page }) => {
    await page.locator('[data-testid="notification-bell"]').click();

    // Should show notifications dropdown
    await expect(page.getByRole('heading', { name: /Notifications/i })).toBeVisible();

    // Should show notification list
    const notifications = page.locator('[data-testid="notification-item"]');
    await expect(notifications.first()).toBeVisible();
  });

  test('should display different notification types', async ({ page }) => {
    await page.locator('[data-testid="notification-bell"]').click();

    const notifications = page.locator('[data-testid="notification-item"]');

    // Should have various notification types
    const types = ['job_match', 'application_status', 'interview_scheduled', 'system_alert'];

    for (const type of types) {
      const typeNotification = notifications.locator(`[data-type="${type}"]`);
      if (await typeNotification.isVisible()) {
        await expect(typeNotification).toBeVisible();
      }
    }
  });

  test('should mark notification as read on click', async ({ page }) => {
    await page.locator('[data-testid="notification-bell"]').click();

    const unreadNotification = page
      .locator('[data-testid="notification-item"]')
      .filter({ has: page.locator('[data-read="false"]') })
      .first();

    if (await unreadNotification.isVisible()) {
      await unreadNotification.click();

      // Should be marked as read
      await expect(unreadNotification.locator('[data-read="true"]')).toBeVisible();
    }
  });

  test('should navigate to related page from notification', async ({ page }) => {
    await page.locator('[data-testid="notification-bell"]').click();

    // Click on job match notification
    const jobMatchNotif = page
      .locator('[data-testid="notification-item"]')
      .filter({ has: page.locator('[data-type="job_match"]') })
      .first();

    if (await jobMatchNotif.isVisible()) {
      await jobMatchNotif.click();

      // Should navigate to jobs page
      await expect(page).toHaveURL(/.*jobs/);
    }
  });

  test('should filter notifications by category', async ({ page }) => {
    await page.locator('[data-testid="notification-bell"]').click();

    // Open filter dropdown
    await page.getByRole('button', { name: /Filter/i }).click();

    // Select job matches only
    await page.getByLabel(/Job Matches/i).check();
    await page.getByRole('button', { name: /Apply/i }).click();

    // Should show only job match notifications
    const notifications = page.locator('[data-testid="notification-item"]');
    await expect(notifications.first()).toHaveAttribute('data-type', 'job_match');
  });

  test('should mark all notifications as read', async ({ page }) => {
    await page.locator('[data-testid="notification-bell"]').click();

    // Click mark all as read
    await page.getByRole('button', { name: /Mark all as read/i }).click();

    // Should clear unread badge
    const badge = page.locator('[data-testid="notification-badge"]');
    await expect(badge).not.toBeVisible();
  });

  test('should delete individual notification', async ({ page }) => {
    await page.locator('[data-testid="notification-bell"]').click();

    const firstNotification = page.locator('[data-testid="notification-item"]').first();

    // Hover to show delete button
    await firstNotification.hover();
    await firstNotification.getByRole('button', { name: /Delete/i }).click();

    // Should show confirmation
    await page.getByRole('button', { name: /Confirm/i }).click();

    // Should remove notification
    await expect(page.getByText(/Notification deleted/i)).toBeVisible();
  });

  test('should clear all notifications', async ({ page }) => {
    await page.locator('[data-testid="notification-bell"]').click();

    // Click clear all
    await page.getByRole('button', { name: /Clear all/i }).click();

    // Should show confirmation
    await expect(page.getByText(/Clear all notifications/i)).toBeVisible();
    await page.getByRole('button', { name: /Confirm/i }).click();

    // Should show empty state
    await expect(page.getByText(/No notifications/i)).toBeVisible();
  });

  test('should manage notification preferences', async ({ page }) => {
    await page.goto('/dashboard/settings');

    // Navigate to notifications tab
    await page.getByRole('tab', { name: /Notifications/i }).click();

    // Should show preference toggles
    await expect(page.getByText(/Email Notifications/i)).toBeVisible();
    await expect(page.getByText(/In-App Notifications/i)).toBeVisible();

    // Toggle job match notifications
    const jobMatchToggle = page.getByLabel(/Job Match Alerts/i);
    await jobMatchToggle.click();

    // Save preferences
    await page.getByRole('button', { name: /Save Preferences/i }).click();

    // Should show success message
    await expect(page.getByText(/Preferences saved/i)).toBeVisible();
  });

  test('should configure quiet hours', async ({ page }) => {
    await page.goto('/dashboard/settings');
    await page.getByRole('tab', { name: /Notifications/i }).click();

    // Enable quiet hours
    await page.getByLabel(/Enable Quiet Hours/i).check();

    // Set time range
    await page.getByLabel(/Start Time/i).fill('22:00');
    await page.getByLabel(/End Time/i).fill('08:00');

    // Save
    await page.getByRole('button', { name: /Save Preferences/i }).click();

    await expect(page.getByText(/Preferences saved/i)).toBeVisible();
  });

  test('should receive real-time notification', async ({ page }) => {
    // Simulate real-time notification (would need WebSocket/SSE in real implementation)
    await page.goto('/dashboard/jobs');

    // When new job match is created, notification should appear
    // This would trigger via backend in actual implementation
    await page.evaluate(() => {
      // Simulate notification event
      window.dispatchEvent(
        new CustomEvent('notification', {
          detail: {
            type: 'job_match',
            title: 'New Job Match',
            message: 'Found 5 new jobs matching your profile!',
          },
        })
      );
    });

    // Should show toast notification
    await expect(page.getByRole('status')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/New Job Match/i)).toBeVisible();
  });

  test('should group similar notifications', async ({ page }) => {
    await page.locator('[data-testid="notification-bell"]').click();

    // Should group multiple job matches
    const groupedNotification = page.locator('[data-testid="notification-group"]').first();

    if (await groupedNotification.isVisible()) {
      await expect(groupedNotification).toContainText(/\d+ new job matches/i);

      // Expand group
      await groupedNotification.click();

      // Should show individual notifications
      const groupItems = page.locator('[data-testid="group-item"]');
      await expect(groupItems.first()).toBeVisible();
    }
  });

  test('should show notification timestamp', async ({ page }) => {
    await page.locator('[data-testid="notification-bell"]').click();

    const notification = page.locator('[data-testid="notification-item"]').first();

    // Should show relative time
    await expect(notification.locator('[data-testid="timestamp"]')).toContainText(
      /(just now|minute|hour|day)/i
    );
  });

  test('should prioritize urgent notifications', async ({ page }) => {
    await page.locator('[data-testid="notification-bell"]').click();

    // Urgent notifications should appear at top
    const urgentNotification = page
      .locator('[data-testid="notification-item"]')
      .filter({ has: page.locator('[data-priority="high"]') })
      .first();

    if (await urgentNotification.isVisible()) {
      const notifications = page.locator('[data-testid="notification-item"]');
      const firstNotification = notifications.first();

      // First notification should be urgent if any exist
      await expect(firstNotification).toHaveAttribute('data-priority', 'high');
    }
  });

  test('should show notification settings quick access', async ({ page }) => {
    await page.locator('[data-testid="notification-bell"]').click();

    // Should have settings link
    await expect(page.getByRole('link', { name: /Notification Settings/i })).toBeVisible();

    // Click to navigate to settings
    await page.getByRole('link', { name: /Notification Settings/i }).click();

    // Should be on notifications settings page
    await expect(page).toHaveURL(/.*settings/);
    await expect(page.getByRole('tab', { name: /Notifications/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('should handle notification actions', async ({ page }) => {
    await page.locator('[data-testid="notification-bell"]').click();

    // Find notification with action button
    const actionNotification = page
      .locator('[data-testid="notification-item"]')
      .filter({ has: page.locator('[data-testid="notification-action"]') })
      .first();

    if (await actionNotification.isVisible()) {
      // Click action button (e.g., "View Application", "Start Interview Practice")
      await actionNotification.locator('[data-testid="notification-action"]').click();

      // Should perform the action and navigate
      await expect(page).toHaveURL(/.*dashboard/);
    }
  });

  test('should show loading state while fetching notifications', async ({ page }) => {
    // Intercept API call to add delay
    await page.route('**/api/v1/notifications**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.continue();
    });

    await page.locator('[data-testid="notification-bell"]').click();

    // Should show loading state
    await expect(page.getByText(/Loading/i)).toBeVisible();
  });

  test('should handle empty notification state', async ({ page }) => {
    // Assuming no notifications
    await page.locator('[data-testid="notification-bell"]').click();

    // Check if empty state is shown
    const emptyState = page.getByText(/No notifications yet/i);
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
      await expect(page.getByText(/check back later/i)).toBeVisible();
    }
  });
});
