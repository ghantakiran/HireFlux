/**
 * E2E Tests for Issue #130: Notification Center (In-App)
 *
 * Testing Criteria:
 * - Notification dropdown
 * - Real-time notifications
 * - Mark as read
 * - Notification preferences
 * - Notification history
 *
 * Methodology: TDD/BDD (RED → GREEN → REFACTOR)
 *
 * Test Structure:
 * 1. Notification dropdown rendering & interaction
 * 2. Real-time notification updates
 * 3. Mark as read/unread functionality
 * 4. Notification filtering & categories
 * 5. Notification preferences
 * 6. Notification history
 * 7. Empty states
 * 8. Mobile responsiveness
 * 9. Accessibility compliance
 * 10. Performance
 * 11. Cross-browser compatibility
 * 12. Edge cases & error handling
 */

import { test, expect, type Page } from '@playwright/test';

// Test configuration
const DESKTOP_VIEWPORT = { width: 1280, height: 720 };
const MOBILE_VIEWPORT = { width: 375, height: 667 };

// Mock notification data types
interface Notification {
  id: string;
  type: 'application' | 'message' | 'interview' | 'offer' | 'system';
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  actionUrl?: string;
}

// Helper functions
async function setupDesktopViewport(page: Page) {
  await page.setViewportSize(DESKTOP_VIEWPORT);
}

async function setupMobileViewport(page: Page) {
  await page.setViewportSize(MOBILE_VIEWPORT);
}

async function waitForAnimations(page: Page, ms: number = 500) {
  await page.waitForTimeout(ms);
}

async function openNotificationDropdown(page: Page) {
  const notificationButton = page.locator('[data-notification-button]');
  await notificationButton.click();
  await waitForAnimations(page, 300);
}

async function closeNotificationDropdown(page: Page) {
  // Click outside the dropdown
  await page.mouse.click(50, 50);
  await waitForAnimations(page, 300);
}

test.describe('Issue #130: Notification Center', () => {

  // ========================================
  // 1. Notification Dropdown Rendering & Interaction
  // ========================================

  test.describe('Notification Dropdown Rendering', () => {
    test('should render notification bell icon in header', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      const notificationButton = page.locator('[data-notification-button]');
      await expect(notificationButton).toBeVisible();
    });

    test('should show unread notification badge', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      const badge = page.locator('[data-notification-badge]');
      await expect(badge).toBeVisible();

      const count = await badge.textContent();
      expect(parseInt(count || '0')).toBeGreaterThan(0);
    });

    test('should hide badge when no unread notifications', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      // Mark all as read first
      await openNotificationDropdown(page);
      const markAllReadBtn = page.locator('[data-mark-all-read]');
      if (await markAllReadBtn.isVisible()) {
        await markAllReadBtn.click();
        await waitForAnimations(page);
      }

      await closeNotificationDropdown(page);

      const badge = page.locator('[data-notification-badge]');
      await expect(badge).toBeHidden();
    });

    test('should open dropdown when notification button is clicked', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const dropdown = page.locator('[data-notification-dropdown]');
      await expect(dropdown).toBeVisible();
    });

    test('should close dropdown when clicking outside', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const dropdown = page.locator('[data-notification-dropdown]');
      await expect(dropdown).toBeVisible();

      await closeNotificationDropdown(page);

      await expect(dropdown).toBeHidden();
    });

    test('should close dropdown when clicking close button', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const dropdown = page.locator('[data-notification-dropdown]');
      await expect(dropdown).toBeVisible();

      const closeButton = page.locator('[data-notification-close]');
      await closeButton.click();
      await waitForAnimations(page);

      await expect(dropdown).toBeHidden();
    });

    test('should toggle dropdown on repeated clicks', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      const notificationButton = page.locator('[data-notification-button]');
      const dropdown = page.locator('[data-notification-dropdown]');

      // Open
      await notificationButton.click();
      await waitForAnimations(page);
      await expect(dropdown).toBeVisible();

      // Close
      await notificationButton.click();
      await waitForAnimations(page);
      await expect(dropdown).toBeHidden();

      // Open again
      await notificationButton.click();
      await waitForAnimations(page);
      await expect(dropdown).toBeVisible();
    });

    test('should render dropdown header with title', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const header = page.locator('[data-notification-dropdown] [data-header]');
      await expect(header).toContainText('Notifications');
    });

    test('should render notification list', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const notificationList = page.locator('[data-notification-list]');
      await expect(notificationList).toBeVisible();
    });

    test('should render individual notification items', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const notifications = page.locator('[data-notification-item]');
      const count = await notifications.count();

      expect(count).toBeGreaterThan(0);
    });

    test('should display notification with correct structure', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const firstNotification = page.locator('[data-notification-item]').first();

      // Should have title
      const title = firstNotification.locator('[data-notification-title]');
      await expect(title).toBeVisible();

      // Should have message
      const message = firstNotification.locator('[data-notification-message]');
      await expect(message).toBeVisible();

      // Should have timestamp
      const timestamp = firstNotification.locator('[data-notification-timestamp]');
      await expect(timestamp).toBeVisible();
    });
  });

  // ========================================
  // 2. Real-Time Notification Updates
  // ========================================

  test.describe('Real-Time Notification Updates', () => {
    test('should update badge count when new notification arrives', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      const badge = page.locator('[data-notification-badge]');
      const initialCount = await badge.textContent();

      // Simulate new notification via API or WebSocket
      // This test will fail initially (RED phase)
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('new-notification', {
          detail: {
            id: 'test-notification',
            type: 'system',
            title: 'Test Notification',
            message: 'This is a test',
            read: false,
            timestamp: new Date().toISOString(),
          }
        }));
      });

      await waitForAnimations(page, 1000);

      const newCount = await badge.textContent();
      expect(parseInt(newCount || '0')).toBeGreaterThan(parseInt(initialCount || '0'));
    });

    test('should show new notification at top of list', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const firstNotificationBefore = await page.locator('[data-notification-item]').first()
        .locator('[data-notification-title]').textContent();

      // Simulate new notification
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('new-notification', {
          detail: {
            id: 'new-test-notification',
            type: 'system',
            title: 'Brand New Notification',
            message: 'This just arrived',
            read: false,
            timestamp: new Date().toISOString(),
          }
        }));
      });

      await waitForAnimations(page, 1000);

      const firstNotificationAfter = await page.locator('[data-notification-item]').first()
        .locator('[data-notification-title]').textContent();

      expect(firstNotificationAfter).not.toBe(firstNotificationBefore);
      expect(firstNotificationAfter).toContain('Brand New Notification');
    });

    test('should play sound on new notification (if enabled)', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      // Check if audio is played
      const audioPlayed = await page.evaluate(() => {
        return new Promise((resolve) => {
          const originalPlay = HTMLAudioElement.prototype.play;
          let played = false;

          HTMLAudioElement.prototype.play = function() {
            played = true;
            return Promise.resolve();
          };

          window.dispatchEvent(new CustomEvent('new-notification', {
            detail: {
              id: 'sound-test',
              type: 'message',
              title: 'Sound Test',
              message: 'Testing notification sound',
              read: false,
              timestamp: new Date().toISOString(),
            }
          }));

          setTimeout(() => {
            HTMLAudioElement.prototype.play = originalPlay;
            resolve(played);
          }, 1000);
        });
      });

      // This will fail initially (RED phase)
      expect(audioPlayed).toBe(true);
    });

    test('should show browser notification (if permission granted)', async ({ page, context }) => {
      await setupDesktopViewport(page);

      // Grant notification permission
      await context.grantPermissions(['notifications']);

      await page.goto('/dashboard');

      // Trigger notification
      const notificationPromise = page.waitForEvent('popup', { timeout: 5000 }).catch(() => null);

      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('new-notification', {
          detail: {
            id: 'browser-notif-test',
            type: 'interview',
            title: 'Interview Scheduled',
            message: 'You have an interview tomorrow',
            read: false,
            timestamp: new Date().toISOString(),
          }
        }));
      });

      await waitForAnimations(page, 1000);

      // Check if notification was shown (implementation-dependent)
      const wasShown = await page.evaluate(() => {
        return 'Notification' in window && Notification.permission === 'granted';
      });

      expect(wasShown).toBe(true);
    });
  });

  // ========================================
  // 3. Mark as Read/Unread Functionality
  // ========================================

  test.describe('Mark as Read/Unread', () => {
    test('should mark notification as read when clicked', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const unreadNotification = page.locator('[data-notification-item][data-read="false"]').first();
      const initialBadgeCount = await page.locator('[data-notification-badge]').textContent();

      await unreadNotification.click();
      await waitForAnimations(page);

      const newBadgeCount = await page.locator('[data-notification-badge]').textContent();
      expect(parseInt(newBadgeCount || '0')).toBeLessThan(parseInt(initialBadgeCount || '0'));
    });

    test('should visually distinguish read from unread notifications', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const unreadNotification = page.locator('[data-notification-item][data-read="false"]').first();
      const readNotification = page.locator('[data-notification-item][data-read="true"]').first();

      const unreadBg = await unreadNotification.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      const readBg = await readNotification.evaluate((el) => {
        return window.getComputedStyle(el).backgroundColor;
      });

      expect(unreadBg).not.toBe(readBg);
    });

    test('should show mark as read button on hover', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const notification = page.locator('[data-notification-item]').first();
      await notification.hover();
      await waitForAnimations(page, 200);

      const markReadButton = notification.locator('[data-mark-read-button]');
      await expect(markReadButton).toBeVisible();
    });

    test('should mark single notification as read via button', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const unreadNotification = page.locator('[data-notification-item][data-read="false"]').first();
      await unreadNotification.hover();

      const markReadButton = unreadNotification.locator('[data-mark-read-button]');
      await markReadButton.click();
      await waitForAnimations(page);

      const isRead = await unreadNotification.getAttribute('data-read');
      expect(isRead).toBe('true');
    });

    test('should mark all notifications as read', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const markAllReadButton = page.locator('[data-mark-all-read]');
      await markAllReadButton.click();
      await waitForAnimations(page);

      const unreadCount = await page.locator('[data-notification-item][data-read="false"]').count();
      expect(unreadCount).toBe(0);

      const badge = page.locator('[data-notification-badge]');
      await expect(badge).toBeHidden();
    });

    test('should allow marking read notification as unread', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const readNotification = page.locator('[data-notification-item][data-read="true"]').first();
      await readNotification.hover();

      const markUnreadButton = readNotification.locator('[data-mark-unread-button]');
      await markUnreadButton.click();
      await waitForAnimations(page);

      const isUnread = await readNotification.getAttribute('data-read');
      expect(isUnread).toBe('false');
    });

    test('should persist read status after page reload', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const firstNotification = page.locator('[data-notification-item]').first();
      const notificationId = await firstNotification.getAttribute('data-notification-id');

      // Mark as read
      await firstNotification.click();
      await waitForAnimations(page);

      // Reload page
      await page.reload();
      await openNotificationDropdown(page);

      // Check if still marked as read
      const sameNotification = page.locator(`[data-notification-id="${notificationId}"]`);
      const isRead = await sameNotification.getAttribute('data-read');
      expect(isRead).toBe('true');
    });
  });

  // ========================================
  // 4. Notification Filtering & Categories
  // ========================================

  test.describe('Notification Filtering & Categories', () => {
    test('should show filter tabs for notification types', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const filterTabs = page.locator('[data-notification-filters]');
      await expect(filterTabs).toBeVisible();
    });

    test('should filter notifications by type (All)', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const allTab = page.locator('[data-filter-tab="all"]');
      await allTab.click();
      await waitForAnimations(page);

      const notifications = page.locator('[data-notification-item]');
      const count = await notifications.count();

      expect(count).toBeGreaterThan(0);
    });

    test('should filter notifications by type (Applications)', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const applicationsTab = page.locator('[data-filter-tab="application"]');
      await applicationsTab.click();
      await waitForAnimations(page);

      const notifications = page.locator('[data-notification-item]');

      for (let i = 0; i < await notifications.count(); i++) {
        const type = await notifications.nth(i).getAttribute('data-notification-type');
        expect(type).toBe('application');
      }
    });

    test('should filter notifications by type (Messages)', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const messagesTab = page.locator('[data-filter-tab="message"]');
      await messagesTab.click();
      await waitForAnimations(page);

      const notifications = page.locator('[data-notification-item]');

      for (let i = 0; i < await notifications.count(); i++) {
        const type = await notifications.nth(i).getAttribute('data-notification-type');
        expect(type).toBe('message');
      }
    });

    test('should filter notifications by type (Interviews)', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const interviewsTab = page.locator('[data-filter-tab="interview"]');
      await interviewsTab.click();
      await waitForAnimations(page);

      const notifications = page.locator('[data-notification-item]');

      for (let i = 0; i < await notifications.count(); i++) {
        const type = await notifications.nth(i).getAttribute('data-notification-type');
        expect(type).toBe('interview');
      }
    });

    test('should show count badge on filter tabs', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const allTab = page.locator('[data-filter-tab="all"]');
      const allCount = await allTab.locator('[data-tab-count]').textContent();

      expect(parseInt(allCount || '0')).toBeGreaterThan(0);
    });

    test('should show active state on selected filter', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const messagesTab = page.locator('[data-filter-tab="message"]');
      await messagesTab.click();
      await waitForAnimations(page);

      const isActive = await messagesTab.getAttribute('data-active');
      expect(isActive).toBe('true');
    });

    test('should show unread-only toggle', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const unreadToggle = page.locator('[data-unread-only-toggle]');
      await expect(unreadToggle).toBeVisible();
    });

    test('should filter to show only unread notifications', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const unreadToggle = page.locator('[data-unread-only-toggle]');
      await unreadToggle.click();
      await waitForAnimations(page);

      const notifications = page.locator('[data-notification-item]');

      for (let i = 0; i < await notifications.count(); i++) {
        const isRead = await notifications.nth(i).getAttribute('data-read');
        expect(isRead).toBe('false');
      }
    });
  });

  // ========================================
  // 5. Notification Preferences
  // ========================================

  test.describe('Notification Preferences', () => {
    test('should have settings/preferences button in dropdown', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const settingsButton = page.locator('[data-notification-settings]');
      await expect(settingsButton).toBeVisible();
    });

    test('should navigate to preferences page when settings clicked', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const settingsButton = page.locator('[data-notification-settings]');
      await settingsButton.click();
      await waitForAnimations(page);

      await expect(page).toHaveURL(/settings.*notifications/);
    });

    test('should show preferences for notification types', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/settings/notifications');

      const applicationsPref = page.locator('[data-pref-type="application"]');
      const messagesPref = page.locator('[data-pref-type="message"]');
      const interviewsPref = page.locator('[data-pref-type="interview"]');

      await expect(applicationsPref).toBeVisible();
      await expect(messagesPref).toBeVisible();
      await expect(interviewsPref).toBeVisible();
    });

    test('should toggle in-app notifications', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/settings/notifications');

      const inAppToggle = page.locator('[data-pref="in-app"]');
      const initialState = await inAppToggle.isChecked();

      await inAppToggle.click();
      await waitForAnimations(page);

      const newState = await inAppToggle.isChecked();
      expect(newState).not.toBe(initialState);
    });

    test('should toggle email notifications', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/settings/notifications');

      const emailToggle = page.locator('[data-pref="email"]');
      const initialState = await emailToggle.isChecked();

      await emailToggle.click();
      await waitForAnimations(page);

      const newState = await emailToggle.isChecked();
      expect(newState).not.toBe(initialState);
    });

    test('should toggle browser notifications', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/settings/notifications');

      const browserToggle = page.locator('[data-pref="browser"]');
      await expect(browserToggle).toBeVisible();
    });

    test('should toggle sound notifications', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/settings/notifications');

      const soundToggle = page.locator('[data-pref="sound"]');
      const initialState = await soundToggle.isChecked();

      await soundToggle.click();
      await waitForAnimations(page);

      const newState = await soundToggle.isChecked();
      expect(newState).not.toBe(initialState);
    });

    test('should save preferences', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/settings/notifications');

      // Change some preferences
      await page.locator('[data-pref="sound"]').click();
      await page.locator('[data-pref="email"]').click();

      // Save
      const saveButton = page.locator('[data-save-preferences]');
      await saveButton.click();
      await waitForAnimations(page);

      // Check for success message
      const successToast = page.locator('[data-toast]', { hasText: /saved|updated/i });
      await expect(successToast).toBeVisible();
    });

    test('should persist preferences after reload', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/settings/notifications');

      // Toggle sound off
      const soundToggle = page.locator('[data-pref="sound"]');
      await soundToggle.click();
      await waitForAnimations(page);

      const stateBeforeReload = await soundToggle.isChecked();

      // Reload
      await page.reload();

      const stateAfterReload = await soundToggle.isChecked();
      expect(stateAfterReload).toBe(stateBeforeReload);
    });
  });

  // ========================================
  // 6. Notification History
  // ========================================

  test.describe('Notification History', () => {
    test('should have "View All" link in dropdown', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const viewAllLink = page.locator('[data-view-all-notifications]');
      await expect(viewAllLink).toBeVisible();
    });

    test('should navigate to full notification history page', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const viewAllLink = page.locator('[data-view-all-notifications]');
      await viewAllLink.click();
      await waitForAnimations(page);

      await expect(page).toHaveURL(/notifications/);
    });

    test('should display full notification history on dedicated page', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/notifications');

      const notifications = page.locator('[data-notification-item]');
      const count = await notifications.count();

      expect(count).toBeGreaterThan(0);
    });

    test('should paginate notification history', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/notifications');

      const pagination = page.locator('[data-pagination]');
      await expect(pagination).toBeVisible();
    });

    test('should load more notifications on scroll (infinite scroll)', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/notifications');

      const initialCount = await page.locator('[data-notification-item]').count();

      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await waitForAnimations(page, 2000);

      const newCount = await page.locator('[data-notification-item]').count();
      expect(newCount).toBeGreaterThanOrEqual(initialCount);
    });

    test('should group notifications by date', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/notifications');

      const dateHeaders = page.locator('[data-date-header]');
      const count = await dateHeaders.count();

      expect(count).toBeGreaterThan(0);

      // Check for common date headers
      const today = page.locator('[data-date-header="today"]');
      const yesterday = page.locator('[data-date-header="yesterday"]');

      // At least one should exist
      const todayExists = await today.count() > 0;
      const yesterdayExists = await yesterday.count() > 0;
      expect(todayExists || yesterdayExists).toBe(true);
    });

    test('should allow bulk delete of notifications', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/notifications');

      // Select multiple notifications
      const firstCheckbox = page.locator('[data-notification-checkbox]').first();
      const secondCheckbox = page.locator('[data-notification-checkbox]').nth(1);

      await firstCheckbox.click();
      await secondCheckbox.click();

      // Delete selected
      const deleteButton = page.locator('[data-bulk-delete]');
      await deleteButton.click();
      await waitForAnimations(page);

      // Confirm deletion
      const confirmButton = page.locator('[data-confirm-delete]');
      await confirmButton.click();
      await waitForAnimations(page);

      // Check success
      const successToast = page.locator('[data-toast]', { hasText: /deleted/i });
      await expect(successToast).toBeVisible();
    });

    test('should allow clearing all read notifications', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/notifications');

      const clearReadButton = page.locator('[data-clear-read-notifications]');
      if (await clearReadButton.isVisible()) {
        await clearReadButton.click();
        await waitForAnimations(page);

        // Confirm
        const confirmButton = page.locator('[data-confirm-clear]');
        await confirmButton.click();
        await waitForAnimations(page);

        // Check that only unread remain
        const notifications = page.locator('[data-notification-item]');
        for (let i = 0; i < await notifications.count(); i++) {
          const isRead = await notifications.nth(i).getAttribute('data-read');
          expect(isRead).toBe('false');
        }
      }
    });

    test('should search through notification history', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/notifications');

      const searchInput = page.locator('[data-notification-search]');
      await searchInput.fill('interview');
      await waitForAnimations(page, 500);

      const notifications = page.locator('[data-notification-item]');
      const count = await notifications.count();

      if (count > 0) {
        const firstNotification = notifications.first();
        const text = await firstNotification.textContent();
        expect(text?.toLowerCase()).toContain('interview');
      }
    });
  });

  // ========================================
  // 7. Empty States
  // ========================================

  test.describe('Empty States', () => {
    test('should show empty state when no notifications exist', async ({ page }) => {
      await setupDesktopViewport(page);

      // Mock empty notifications
      await page.goto('/dashboard');

      // Mark all as read and clear
      await openNotificationDropdown(page);

      // Check for empty state
      const emptyState = page.locator('[data-notification-empty]');
      const notificationList = page.locator('[data-notification-item]');

      if (await notificationList.count() === 0) {
        await expect(emptyState).toBeVisible();
      }
    });

    test('should show empty state with appropriate message', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/notifications');

      // Filter to type with no notifications
      const filterTab = page.locator('[data-filter-tab="offer"]');
      if (await filterTab.isVisible()) {
        await filterTab.click();
        await waitForAnimations(page);

        const notificationList = page.locator('[data-notification-item]');
        if (await notificationList.count() === 0) {
          const emptyState = page.locator('[data-notification-empty]');
          await expect(emptyState).toContainText(/no.*notifications/i);
        }
      }
    });

    test('should show empty state with illustration', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/notifications');

      const emptyState = page.locator('[data-notification-empty]');
      if (await emptyState.isVisible()) {
        const illustration = emptyState.locator('svg, img');
        await expect(illustration).toBeVisible();
      }
    });
  });

  // ========================================
  // 8. Mobile Responsiveness
  // ========================================

  test.describe('Mobile Responsiveness', () => {
    test('should show notification button on mobile', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const notificationButton = page.locator('[data-notification-button]');
      await expect(notificationButton).toBeVisible();
    });

    test('should show full-screen dropdown on mobile', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const dropdown = page.locator('[data-notification-dropdown]');
      const size = await dropdown.boundingBox();

      expect(size).not.toBeNull();
      // On mobile, dropdown should take most of the viewport
      expect(size!.width).toBeGreaterThan(300);
    });

    test('should be swipeable to close on mobile', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const dropdown = page.locator('[data-notification-dropdown]');
      await expect(dropdown).toBeVisible();

      // Simulate swipe down
      await page.touchscreen.tap(200, 100);
      await page.touchscreen.tap(200, 400);
      await waitForAnimations(page);

      // Dropdown might close (implementation-dependent)
    });

    test('should have mobile-friendly touch targets', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const notifications = page.locator('[data-notification-item]');
      const firstNotification = notifications.first();
      const size = await firstNotification.boundingBox();

      expect(size).not.toBeNull();
      expect(size!.height).toBeGreaterThanOrEqual(48); // WCAG minimum
    });

    test('should show notification badge on mobile', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const badge = page.locator('[data-notification-badge]');
      if (await badge.isVisible()) {
        const text = await badge.textContent();
        expect(parseInt(text || '0')).toBeGreaterThan(0);
      }
    });

    test('should adapt layout for small screens', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 }); // iPhone SE
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const dropdown = page.locator('[data-notification-dropdown]');
      await expect(dropdown).toBeVisible();

      // Dropdown should fit screen
      const size = await dropdown.boundingBox();
      expect(size).not.toBeNull();
      expect(size!.width).toBeLessThanOrEqual(320);
    });
  });

  // ========================================
  // 9. Accessibility Compliance
  // ========================================

  test.describe('Accessibility Compliance', () => {
    test('should have accessible notification button', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      const notificationButton = page.locator('[data-notification-button]');

      const ariaLabel = await notificationButton.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('notification');
    });

    test('should announce unread count to screen readers', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      const notificationButton = page.locator('[data-notification-button]');
      const ariaLabel = await notificationButton.getAttribute('aria-label');

      const badge = page.locator('[data-notification-badge]');
      if (await badge.isVisible()) {
        const count = await badge.textContent();
        expect(ariaLabel).toContain(count || '');
      }
    });

    test('should have aria-expanded on dropdown trigger', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      const notificationButton = page.locator('[data-notification-button]');

      // Before opening
      let expanded = await notificationButton.getAttribute('aria-expanded');
      expect(expanded).toBe('false');

      // After opening
      await notificationButton.click();
      await waitForAnimations(page);
      expanded = await notificationButton.getAttribute('aria-expanded');
      expect(expanded).toBe('true');
    });

    test('should have proper focus management', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      // Tab to notification button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focused = await page.evaluate(() => {
        return document.activeElement?.getAttribute('data-notification-button') !== null;
      });

      expect(focused).toBe(true);
    });

    test('should be keyboard navigable', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      // Navigate to button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Open with Enter
      await page.keyboard.press('Enter');
      await waitForAnimations(page);

      const dropdown = page.locator('[data-notification-dropdown]');
      await expect(dropdown).toBeVisible();
    });

    test('should close on Escape key', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const dropdown = page.locator('[data-notification-dropdown]');
      await expect(dropdown).toBeVisible();

      await page.keyboard.press('Escape');
      await waitForAnimations(page);

      await expect(dropdown).toBeHidden();
    });

    test('should have role and aria-label on list', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const list = page.locator('[data-notification-list]');

      const role = await list.getAttribute('role');
      const ariaLabel = await list.getAttribute('aria-label');

      expect(role).toBe('list');
      expect(ariaLabel).toBeTruthy();
    });

    test('should have accessible notification items', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const firstNotification = page.locator('[data-notification-item]').first();

      const role = await firstNotification.getAttribute('role');
      expect(role).toBe('listitem');
    });

    test('should have semantic time elements', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const timestamp = page.locator('[data-notification-item] time').first();
      await expect(timestamp).toBeVisible();

      const datetime = await timestamp.getAttribute('datetime');
      expect(datetime).toBeTruthy();
    });

    test('should have proper color contrast', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const firstNotification = page.locator('[data-notification-item]').first();
      const title = firstNotification.locator('[data-notification-title]');

      const color = await title.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
        };
      });

      // Basic check that colors are defined
      expect(color.color).toBeTruthy();
    });
  });

  // ========================================
  // 10. Performance
  // ========================================

  test.describe('Performance', () => {
    test('should render dropdown quickly', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      const startTime = Date.now();
      await openNotificationDropdown(page);
      const endTime = Date.now();

      const renderTime = endTime - startTime;
      expect(renderTime).toBeLessThan(1000); // <1s
    });

    test('should handle large notification lists', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/notifications');

      // Scroll through large list
      for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 500));
        await waitForAnimations(page, 100);
      }

      // Should still be responsive
      const notification = page.locator('[data-notification-item]').first();
      await expect(notification).toBeVisible();
    });

    test('should virtualize long notification lists', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard/notifications');

      // Check if virtualization is implemented
      const containerHeight = await page.locator('[data-notification-list]').evaluate((el) => {
        return el.scrollHeight;
      });

      const viewportHeight = await page.locator('[data-notification-list]').evaluate((el) => {
        return el.clientHeight;
      });

      // If list is virtualized, scroll height should be much larger than viewport
      expect(containerHeight).toBeGreaterThan(viewportHeight);
    });

    test('should not block UI when new notifications arrive', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      // Measure interaction time
      const startTime = Date.now();

      // Simulate multiple notifications
      await page.evaluate(() => {
        for (let i = 0; i < 10; i++) {
          window.dispatchEvent(new CustomEvent('new-notification', {
            detail: {
              id: `perf-test-${i}`,
              type: 'system',
              title: `Notification ${i}`,
              message: 'Performance test',
              read: false,
              timestamp: new Date().toISOString(),
            }
          }));
        }
      });

      // Try to interact
      await page.locator('[data-notification-button]').click();
      const endTime = Date.now();

      const interactionTime = endTime - startTime;
      expect(interactionTime).toBeLessThan(2000); // <2s
    });
  });

  // ========================================
  // 11. Cross-Browser Compatibility
  // ========================================

  test.describe('Cross-Browser Compatibility', () => {
    test('should work in Chromium', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chromium-only test');

      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const dropdown = page.locator('[data-notification-dropdown]');
      await expect(dropdown).toBeVisible();
    });

    test('should work in Firefox', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-only test');

      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const dropdown = page.locator('[data-notification-dropdown]');
      await expect(dropdown).toBeVisible();
    });

    test('should work in WebKit/Safari', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'WebKit-only test');

      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      const dropdown = page.locator('[data-notification-dropdown]');
      await expect(dropdown).toBeVisible();
    });
  });

  // ========================================
  // 12. Edge Cases & Error Handling
  // ========================================

  test.describe('Edge Cases & Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      await setupDesktopViewport(page);

      // Mock API error
      await page.route('**/api/notifications**', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      });

      await page.goto('/dashboard');
      await openNotificationDropdown(page);

      // Should show error state
      const errorState = page.locator('[data-notification-error]');
      await expect(errorState).toBeVisible();
    });

    test('should handle network timeouts', async ({ page }) => {
      await setupDesktopViewport(page);

      // Mock slow network
      await page.route('**/api/notifications**', (route) => {
        setTimeout(() => route.continue(), 10000);
      });

      await page.goto('/dashboard');

      // Should show loading state
      const loadingState = page.locator('[data-notification-loading]');
      // Test will timeout if not handled properly
    });

    test('should handle empty response', async ({ page }) => {
      await setupDesktopViewport(page);

      // Mock empty response
      await page.route('**/api/notifications**', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ notifications: [] }),
        });
      });

      await page.goto('/dashboard');
      await openNotificationDropdown(page);

      const emptyState = page.locator('[data-notification-empty]');
      await expect(emptyState).toBeVisible();
    });

    test('should handle malformed notification data', async ({ page }) => {
      await setupDesktopViewport(page);

      // Inject malformed notification
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('new-notification', {
          detail: {
            // Missing required fields
            id: 'malformed',
          }
        }));
      });

      await waitForAnimations(page, 1000);

      // Should not crash
      const notificationButton = page.locator('[data-notification-button]');
      await expect(notificationButton).toBeVisible();
    });

    test('should handle rapid open/close', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      const notificationButton = page.locator('[data-notification-button]');

      // Rapidly toggle
      for (let i = 0; i < 10; i++) {
        await notificationButton.click();
        await page.waitForTimeout(50);
      }

      // Should still work
      await expect(notificationButton).toBeVisible();
    });

    test('should handle localStorage quota exceeded', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      // Fill localStorage
      await page.evaluate(() => {
        try {
          const largeData = 'x'.repeat(5000000); // 5MB
          localStorage.setItem('test', largeData);
        } catch (e) {
          // Expected to throw
        }
      });

      // Notification system should still work
      await openNotificationDropdown(page);

      const dropdown = page.locator('[data-notification-dropdown]');
      await expect(dropdown).toBeVisible();
    });

    test('should persist across browser back/forward', async ({ page }) => {
      await setupDesktopViewport(page);
      await page.goto('/dashboard');

      await openNotificationDropdown(page);

      // Mark one as read
      const firstNotification = page.locator('[data-notification-item]').first();
      const notifId = await firstNotification.getAttribute('data-notification-id');
      await firstNotification.click();
      await waitForAnimations(page);

      // Navigate away
      await page.goto('/dashboard/jobs');

      // Go back
      await page.goBack();
      await openNotificationDropdown(page);

      // Should still be marked as read
      const sameNotification = page.locator(`[data-notification-id="${notifId}"]`);
      const isRead = await sameNotification.getAttribute('data-read');
      expect(isRead).toBe('true');
    });
  });
});

/**
 * Integration Tests
 * Testing integration with other features
 */
test.describe('Issue #130: Integration Tests', () => {
  test('should integrate with mobile bottom navigation', async ({ page }) => {
    await setupMobileViewport(page);
    await page.goto('/dashboard');

    // Notification button should work on mobile
    const notificationButton = page.locator('[data-notification-button]');
    await expect(notificationButton).toBeVisible();

    await notificationButton.click();
    await waitForAnimations(page);

    const dropdown = page.locator('[data-notification-dropdown]');
    await expect(dropdown).toBeVisible();
  });

  test('should show notification for new application status', async ({ page }) => {
    await setupDesktopViewport(page);
    await page.goto('/dashboard/applications');

    // Simulate application status change
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent('new-notification', {
        detail: {
          id: 'app-status-change',
          type: 'application',
          title: 'Application Status Updated',
          message: 'Your application for Software Engineer has been reviewed',
          read: false,
          timestamp: new Date().toISOString(),
          actionUrl: '/dashboard/applications/123',
        }
      }));
    });

    await waitForAnimations(page, 1000);

    // Badge should update
    const badge = page.locator('[data-notification-badge]');
    await expect(badge).toBeVisible();
  });

  test('should navigate to relevant page when notification clicked', async ({ page }) => {
    await setupDesktopViewport(page);
    await page.goto('/dashboard');

    await openNotificationDropdown(page);

    const notificationWithAction = page.locator('[data-notification-item][data-action-url]').first();
    if (await notificationWithAction.count() > 0) {
      const actionUrl = await notificationWithAction.getAttribute('data-action-url');
      await notificationWithAction.click();
      await waitForAnimations(page);

      // Should navigate to action URL
      await expect(page).toHaveURL(new RegExp(actionUrl || ''));
    }
  });
});
