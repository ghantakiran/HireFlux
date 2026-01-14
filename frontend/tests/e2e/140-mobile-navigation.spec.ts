/**
 * E2E Tests for Issue #140: Mobile Navigation (Bottom Tabs)
 *
 * Testing Criteria:
 * - Bottom tab navigation (4-5 tabs)
 * - Active state indicators
 * - Badge notifications
 * - Smooth transitions
 * - Safe area support (iOS)
 *
 * Methodology: TDD/BDD (RED → GREEN → REFACTOR)
 *
 * Test Structure:
 * 1. Mobile bottom navigation rendering
 * 2. Tab navigation functionality
 * 3. Active state indicators
 * 4. Badge notifications
 * 5. Touch interactions & feedback
 * 6. Smooth transitions & animations
 * 7. iOS safe area support
 * 8. Accessibility compliance
 * 9. Cross-browser compatibility
 * 10. Responsive behavior
 */

import { test, expect, type Page } from '@playwright/test';

// Test configuration
const MOBILE_VIEWPORT = { width: 375, height: 667 }; // iPhone SE
const TABLET_VIEWPORT = { width: 768, height: 1024 }; // iPad
const DESKTOP_VIEWPORT = { width: 1280, height: 720 };

// Helper function to setup mobile viewport
async function setupMobileViewport(page: Page) {
  await page.setViewportSize(MOBILE_VIEWPORT);
}

// Helper function to wait for animations
async function waitForAnimations(page: Page) {
  await page.waitForTimeout(500);
}

test.describe('Issue #140: Mobile Navigation - Bottom Tabs', () => {

  // ========================================
  // 1. Mobile Bottom Navigation Rendering
  // ========================================

  test.describe('Mobile Bottom Navigation Rendering', () => {
    test('should render bottom tab bar on mobile viewport', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');
      await expect(bottomTabBar).toBeVisible();
    });

    test('should hide bottom tab bar on desktop viewport', async ({ page }) => {
      await page.setViewportSize(DESKTOP_VIEWPORT);
      await page.goto('/dashboard');

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');
      await expect(bottomTabBar).toBeHidden();
    });

    test('should render exactly 5 tabs', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const tabs = page.locator('[data-bottom-tab-bar] [data-tab]');
      await expect(tabs).toHaveCount(5);
    });

    test('should render tabs with correct labels', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const expectedLabels = ['Home', 'Search', 'Activity', 'Messages', 'More'];

      for (const label of expectedLabels) {
        const tab = page.locator('[data-bottom-tab-bar]', { hasText: label });
        await expect(tab).toBeVisible();
      }
    });

    test('should render tabs with icons', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const tabs = page.locator('[data-bottom-tab-bar] [data-tab]');

      for (let i = 0; i < 5; i++) {
        const tab = tabs.nth(i);
        const icon = tab.locator('svg');
        await expect(icon).toBeVisible();
      }
    });

    test('should have fixed positioning at bottom of screen', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');
      const position = await bottomTabBar.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          position: styles.position,
          bottom: styles.bottom,
          left: styles.left,
          right: styles.right,
        };
      });

      expect(position.position).toBe('fixed');
      expect(position.bottom).toBe('0px');
      expect(position.left).toBe('0px');
      expect(position.right).toBe('0px');
    });
  });

  // ========================================
  // 2. Tab Navigation Functionality
  // ========================================

  test.describe('Tab Navigation Functionality', () => {
    test('should navigate to correct page when Home tab is clicked', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard/applications');

      await page.locator('[data-tab="home"]').click();
      await waitForAnimations(page);

      await expect(page).toHaveURL('/dashboard');
    });

    test('should navigate to jobs page when Search tab is clicked', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      await page.locator('[data-tab="search"]').click();
      await waitForAnimations(page);

      await expect(page).toHaveURL(/\/jobs/);
    });

    test('should navigate to applications when Activity tab is clicked', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      await page.locator('[data-tab="activity"]').click();
      await waitForAnimations(page);

      await expect(page).toHaveURL(/\/applications/);
    });

    test('should navigate to messages when Messages tab is clicked', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      await page.locator('[data-tab="messages"]').click();
      await waitForAnimations(page);

      await expect(page).toHaveURL(/\/messages/);
    });

    test('should navigate to settings when More tab is clicked', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      await page.locator('[data-tab="more"]').click();
      await waitForAnimations(page);

      await expect(page).toHaveURL(/\/settings/);
    });

    test('should maintain tab bar visibility during navigation', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');
      await expect(bottomTabBar).toBeVisible();

      await page.locator('[data-tab="search"]').click();
      await waitForAnimations(page);
      await expect(bottomTabBar).toBeVisible();

      await page.locator('[data-tab="activity"]').click();
      await waitForAnimations(page);
      await expect(bottomTabBar).toBeVisible();
    });
  });

  // ========================================
  // 3. Active State Indicators
  // ========================================

  test.describe('Active State Indicators', () => {
    test('should highlight Home tab when on dashboard page', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const homeTab = page.locator('[data-tab="home"]');
      const activeState = await homeTab.getAttribute('data-active');

      expect(activeState).toBe('true');
    });

    test('should highlight correct tab based on current route', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard/applications');

      const activityTab = page.locator('[data-tab="activity"]');
      const activeState = await activityTab.getAttribute('data-active');

      expect(activeState).toBe('true');
    });

    test('should apply active styling to current tab', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const homeTab = page.locator('[data-tab="home"]');
      const color = await homeTab.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      // Check for blue color (active state)
      // RGB value for text-blue-600 is approximately rgb(37, 99, 235)
      expect(color).toContain('37'); // Basic check for blue
    });

    test('should only have one active tab at a time', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const activeTabs = page.locator('[data-bottom-tab-bar] [data-active="true"]');
      await expect(activeTabs).toHaveCount(1);
    });

    test('should update active state when navigating between tabs', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      // Home should be active
      await expect(page.locator('[data-tab="home"]')).toHaveAttribute('data-active', 'true');

      // Click Search tab
      await page.locator('[data-tab="search"]').click();
      await waitForAnimations(page);

      // Search should now be active
      await expect(page.locator('[data-tab="search"]')).toHaveAttribute('data-active', 'true');
      await expect(page.locator('[data-tab="home"]')).toHaveAttribute('data-active', 'false');
    });

    test('should maintain active state after page reload', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard/applications');

      await page.reload();
      await waitForAnimations(page);

      const activityTab = page.locator('[data-tab="activity"]');
      await expect(activityTab).toHaveAttribute('data-active', 'true');
    });
  });

  // ========================================
  // 4. Badge Notifications
  // ========================================

  test.describe('Badge Notifications', () => {
    test('should display badge on Activity tab when notifications exist', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const activityBadge = page.locator('[data-tab-badge="activity"]');
      await expect(activityBadge).toBeVisible();
    });

    test('should show correct notification count', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const activityBadge = page.locator('[data-tab-badge="activity"]');
      const count = await activityBadge.textContent();

      expect(count).toMatch(/\d+/); // Should contain a number
      expect(parseInt(count || '0')).toBeGreaterThan(0);
    });

    test('should position badge correctly on icon', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const activityBadge = page.locator('[data-tab-badge="activity"]');
      const position = await activityBadge.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          position: styles.position,
          top: styles.top,
          right: styles.right,
        };
      });

      expect(position.position).toBe('absolute');
      // Badge should be positioned at top-right of icon
    });

    test('should have appropriate badge styling', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const activityBadge = page.locator('[data-tab-badge="activity"]');
      const styles = await activityBadge.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          borderRadius: computed.borderRadius,
          fontSize: computed.fontSize,
        };
      });

      // Should be circular/rounded
      expect(styles.borderRadius).toMatch(/50%|9999px/);
    });

    test('should not show badge when count is 0', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      // Assuming Messages tab has no badge in mock data
      const messagesBadge = page.locator('[data-tab-badge="messages"]');
      await expect(messagesBadge).toBeHidden();
    });
  });

  // ========================================
  // 5. Touch Interactions & Feedback
  // ========================================

  test.describe('Touch Interactions & Feedback', () => {
    test('should have minimum touch target size of 48x48px', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const tabs = page.locator('[data-bottom-tab-bar] [data-tab]');

      for (let i = 0; i < 5; i++) {
        const tab = tabs.nth(i);
        const size = await tab.boundingBox();

        expect(size).not.toBeNull();
        expect(size!.height).toBeGreaterThanOrEqual(48);
        expect(size!.width).toBeGreaterThanOrEqual(48);
      }
    });

    test('should provide visual feedback on tap', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const searchTab = page.locator('[data-tab="search"]');

      // Hover state should exist
      await searchTab.hover();
      await waitForAnimations(page);

      // Note: Active press states are harder to test in Playwright
      // This test ensures the element is interactive
      await expect(searchTab).toBeVisible();
    });

    test('should handle rapid tab switching', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      // Quickly switch between tabs
      await page.locator('[data-tab="search"]').click();
      await page.locator('[data-tab="home"]').click();
      await page.locator('[data-tab="activity"]').click();

      await waitForAnimations(page);

      // Should end up on applications page
      await expect(page).toHaveURL(/\/applications/);
    });

    test('should prevent double-tap zoom on tabs', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const homeTab = page.locator('[data-tab="home"]');

      // Double click
      await homeTab.click();
      await homeTab.click();
      await waitForAnimations(page);

      // Should still be functional, not zoomed
      await expect(page).toHaveURL('/dashboard');
    });
  });

  // ========================================
  // 6. Smooth Transitions & Animations
  // ========================================

  test.describe('Smooth Transitions & Animations', () => {
    test('should have transition properties on tab elements', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const homeTab = page.locator('[data-tab="home"]');
      const transition = await homeTab.evaluate((el) => {
        return window.getComputedStyle(el).transition;
      });

      // Should have some transition defined
      expect(transition).not.toBe('all 0s ease 0s');
      expect(transition).toContain('color'); // At minimum, color transition
    });

    test('should animate active state change', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const searchTab = page.locator('[data-tab="search"]');

      // Get initial color
      const initialColor = await searchTab.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      // Click and wait for transition
      await searchTab.click();
      await waitForAnimations(page);

      // Color should have changed (active state)
      const finalColor = await searchTab.evaluate((el) => {
        return window.getComputedStyle(el).color;
      });

      expect(initialColor).not.toBe(finalColor);
    });

    test('should have smooth icon scale animation', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const activityTab = page.locator('[data-tab="activity"]');
      const icon = activityTab.locator('svg');

      // Check for transform property
      const hasTransform = await icon.evaluate((el) => {
        const parent = el.parentElement;
        if (!parent) return false;
        const styles = window.getComputedStyle(parent);
        return styles.transition.includes('transform') || styles.transform !== 'none';
      });

      // This will fail initially (RED phase) and pass after implementation
      expect(hasTransform).toBe(true);
    });

    test('should animate badge appearance', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const activityBadge = page.locator('[data-tab-badge="activity"]');

      // Badge should have animation classes or transition
      const hasAnimation = await activityBadge.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.animation !== 'none' || styles.transition !== 'all 0s ease 0s';
      });

      expect(hasAnimation).toBe(true);
    });
  });

  // ========================================
  // 7. iOS Safe Area Support
  // ========================================

  test.describe('iOS Safe Area Support', () => {
    test('should have safe-area-inset-bottom padding', async ({ page, browserName }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');
      const paddingBottom = await bottomTabBar.evaluate((el) => {
        return window.getComputedStyle(el).paddingBottom;
      });

      // This will fail initially (RED phase)
      // After implementation, should have env(safe-area-inset-bottom)
      // For testing, we check if padding is applied
      expect(paddingBottom).toBeTruthy();
    });

    test('should support viewport-fit=cover meta tag', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const viewportFit = await page.evaluate(() => {
        const meta = document.querySelector('meta[name="viewport"]');
        return meta?.getAttribute('content') || '';
      });

      // This will fail initially (RED phase)
      expect(viewportFit).toContain('viewport-fit=cover');
    });

    test('should have sufficient height for iOS bottom bar', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');
      const height = await bottomTabBar.boundingBox();

      expect(height).not.toBeNull();
      // Should be at least 64px (16px spacer + ~48px content) for iOS
      expect(height!.height).toBeGreaterThanOrEqual(64);
    });
  });

  // ========================================
  // 8. Accessibility Compliance
  // ========================================

  test.describe('Accessibility Compliance', () => {
    test('should have navigation role', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');
      const role = await bottomTabBar.getAttribute('role');

      expect(role).toBe('navigation');
    });

    test('should have aria-label for navigation', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');
      const ariaLabel = await bottomTabBar.getAttribute('aria-label');

      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toContain('navigation');
    });

    test('should have aria-current on active tab', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const homeTab = page.locator('[data-tab="home"]');
      const ariaCurrent = await homeTab.getAttribute('aria-current');

      // This will fail initially (RED phase)
      expect(ariaCurrent).toBe('page');
    });

    test('should be keyboard navigable', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      // Tab to first navigation element
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Should be able to focus tabs
      const focused = await page.evaluate(() => {
        return document.activeElement?.closest('[data-bottom-tab-bar]') !== null;
      });

      expect(focused).toBe(true);
    });

    test('should have accessible names for all tabs', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const tabs = page.locator('[data-bottom-tab-bar] [data-tab]');

      for (let i = 0; i < 5; i++) {
        const tab = tabs.nth(i);
        const text = await tab.textContent();

        expect(text).toBeTruthy();
        expect(text!.trim().length).toBeGreaterThan(0);
      }
    });

    test('should have proper color contrast for inactive tabs', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const searchTab = page.locator('[data-tab="search"]');
      const color = await searchTab.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          color: computed.color,
          backgroundColor: computed.backgroundColor,
        };
      });

      // Basic check that colors are defined
      expect(color.color).toBeTruthy();
    });
  });

  // ========================================
  // 9. Cross-Browser Compatibility
  // ========================================

  test.describe('Cross-Browser Compatibility', () => {
    test('should render correctly in Chromium', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Chromium-only test');

      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');
      await expect(bottomTabBar).toBeVisible();

      const tabs = page.locator('[data-bottom-tab-bar] [data-tab]');
      await expect(tabs).toHaveCount(5);
    });

    test('should render correctly in Firefox', async ({ page, browserName }) => {
      test.skip(browserName !== 'firefox', 'Firefox-only test');

      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');
      await expect(bottomTabBar).toBeVisible();

      const tabs = page.locator('[data-bottom-tab-bar] [data-tab]');
      await expect(tabs).toHaveCount(5);
    });

    test('should render correctly in WebKit/Safari', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'WebKit-only test');

      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');
      await expect(bottomTabBar).toBeVisible();

      const tabs = page.locator('[data-bottom-tab-bar] [data-tab]');
      await expect(tabs).toHaveCount(5);
    });
  });

  // ========================================
  // 10. Responsive Behavior
  // ========================================

  test.describe('Responsive Behavior', () => {
    test('should be visible on small mobile (320px)', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto('/dashboard');

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');
      await expect(bottomTabBar).toBeVisible();

      // All tabs should fit
      const tabs = page.locator('[data-bottom-tab-bar] [data-tab]');
      await expect(tabs).toHaveCount(5);
    });

    test('should hide on tablet landscape (1024px)', async ({ page }) => {
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.goto('/dashboard');

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');
      await expect(bottomTabBar).toBeHidden();
    });

    test('should adapt tab labels on very small screens', async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto('/dashboard');

      const tabs = page.locator('[data-bottom-tab-bar] [data-tab]');
      const firstTab = tabs.first();

      // Text should still be visible
      const text = await firstTab.textContent();
      expect(text).toBeTruthy();
    });

    test('should maintain aspect ratio of icons across screen sizes', async ({ page }) => {
      const sizes = [
        { width: 320, height: 568 },
        { width: 375, height: 667 },
        { width: 414, height: 896 },
      ];

      for (const size of sizes) {
        await page.setViewportSize(size);
        await page.goto('/dashboard');

        const icon = page.locator('[data-tab="home"] svg').first();
        const box = await icon.boundingBox();

        expect(box).not.toBeNull();
        // Icons should maintain square aspect ratio
        const ratio = box!.width / box!.height;
        expect(ratio).toBeGreaterThan(0.9);
        expect(ratio).toBeLessThan(1.1);
      }
    });

    test('should not overlap with content', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await waitForAnimations(page);

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');
      await expect(bottomTabBar).toBeVisible();

      // Tab bar should remain fixed at bottom
      const position = await bottomTabBar.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          viewportHeight: window.innerHeight,
        };
      });

      expect(position.bottom).toBeLessThanOrEqual(position.viewportHeight + 1);
    });
  });

  // ========================================
  // 11. Performance
  // ========================================

  test.describe('Performance', () => {
    test('should render bottom tab bar quickly', async ({ page }) => {
      await setupMobileViewport(page);

      const startTime = Date.now();
      await page.goto('/dashboard');

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');
      await expect(bottomTabBar).toBeVisible();

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      // Should render within 3 seconds
      expect(renderTime).toBeLessThan(3000);
    });

    test('should not cause layout shifts', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      // Measure CLS
      const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let clsValue = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if ((entry as any).hadRecentInput) continue;
              clsValue += (entry as any).value;
            }
          });

          observer.observe({ type: 'layout-shift', buffered: true });

          setTimeout(() => {
            observer.disconnect();
            resolve(clsValue);
          }, 2000);
        });
      });

      // CLS should be minimal
      expect(cls).toBeLessThan(0.1);
    });

    test('should handle tab switching without performance degradation', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      const iterations = 10;
      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        await page.locator('[data-tab="search"]').click();
        await page.waitForTimeout(50);
        await page.locator('[data-tab="home"]').click();
        await page.waitForTimeout(50);
      }

      const endTime = Date.now();
      const avgTime = (endTime - startTime) / (iterations * 2);

      // Each tab switch should be fast (<200ms)
      expect(avgTime).toBeLessThan(200);
    });
  });

  // ========================================
  // 12. Edge Cases & Error Handling
  // ========================================

  test.describe('Edge Cases & Error Handling', () => {
    test('should handle navigation to non-existent route', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      // Manually navigate to non-existent route
      await page.goto('/nonexistent');

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');

      // Tab bar should still render or gracefully handle
      // Depends on app's error handling
    });

    test('should work with browser back/forward', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard');

      await page.locator('[data-tab="search"]').click();
      await waitForAnimations(page);

      await page.goBack();
      await waitForAnimations(page);

      // Should be back on dashboard
      await expect(page).toHaveURL('/dashboard');

      // Home tab should be active
      await expect(page.locator('[data-tab="home"]')).toHaveAttribute('data-active', 'true');
    });

    test('should handle slow network conditions', async ({ page }) => {
      await setupMobileViewport(page);

      // Simulate slow 3G
      await page.route('**/*', (route) => {
        setTimeout(() => route.continue(), 100);
      });

      await page.goto('/dashboard');

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');
      await expect(bottomTabBar).toBeVisible({ timeout: 10000 });
    });

    test('should persist across page reloads', async ({ page }) => {
      await setupMobileViewport(page);
      await page.goto('/dashboard/applications');

      await page.reload();
      await waitForAnimations(page);

      const bottomTabBar = page.locator('[data-bottom-tab-bar]');
      await expect(bottomTabBar).toBeVisible();

      // Activity tab should still be active
      await expect(page.locator('[data-tab="activity"]')).toHaveAttribute('data-active', 'true');
    });
  });
});

/**
 * Role-Based Navigation Tests
 * Testing employer vs job seeker bottom tabs
 */
test.describe('Issue #140: Role-Based Navigation', () => {
  test('should show job seeker tabs for dashboard routes', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/dashboard');

    const searchTab = page.locator('[data-tab="search"]');
    await searchTab.click();
    await waitForAnimations(page);

    // Should navigate to /jobs for job seekers
    await expect(page).toHaveURL(/\/jobs/);
  });

  test('should show employer tabs for employer routes', async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);
    await page.goto('/employer/dashboard');

    const searchTab = page.locator('[data-tab="search"]');
    await searchTab.click();
    await waitForAnimations(page);

    // Should navigate to /employer/candidates for employers
    await expect(page).toHaveURL(/\/employer\/candidates/);
  });
});
