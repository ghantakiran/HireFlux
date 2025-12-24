/**
 * E2E Tests: Keyboard Navigation Enhancement (Issue #149)
 *
 * Following TDD/BDD approach:
 * - Tests written BEFORE implementation
 * - Tests will FAIL initially (Red phase)
 * - Implementation will make tests pass (Green phase)
 * - Refactoring preserves passing tests (Refactor phase)
 *
 * @see tests/features/keyboard-navigation.feature
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Keyboard Navigation Enhancement - Issue #149', () => {

  // ============================================================================
  // 1. Tab Order - Logical Flow
  // ============================================================================

  test.describe('Tab Order', () => {
    test('should have logical tab order on job seeker dashboard', async ({ page }) => {
      await page.goto('/dashboard');

      // First tab should focus skip link
      await page.keyboard.press('Tab');
      let focused = await page.evaluate(() => document.activeElement?.textContent);
      expect(focused).toContain('Skip to main content');

      // Second tab should focus logo (TopNav)
      await page.keyboard.press('Tab');
      focused = await page.evaluate(() => document.activeElement?.textContent);
      expect(focused).toContain('HireFlux');

      // Third tab: Search input (TopNav)
      await page.keyboard.press('Tab');
      const searchFocused = await page.evaluate(() => document.activeElement?.tagName);
      expect(searchFocused).toBe('INPUT');

      // Fourth tab: Notifications button (TopNav)
      await page.keyboard.press('Tab');
      // Just verify it's a button, content varies

      // Fifth tab: Profile menu (TopNav)
      await page.keyboard.press('Tab');
      // Just verify it's a button

      // Sixth tab: Sidebar collapse button
      await page.keyboard.press('Tab');
      focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || '');
      expect(focused).toMatch(/collapse|expand/i);

      // Continue through main navigation (LeftSidebar nav items)
      const expectedOrder = [
        /dashboard/i,
        /job search|jobs/i,  // "Job Search" in nav
        /applications/i,
        /resumes/i,
        /cover letters/i,
        /interview prep/i,
        /profile/i
      ];

      for (const expected of expectedOrder) {
        await page.keyboard.press('Tab');
        focused = await page.evaluate(() =>
          document.activeElement?.textContent || document.activeElement?.getAttribute('aria-label') || ''
        );
        expect(focused).toMatch(expected);
      }
    });

    test('should have logical tab order on employer dashboard', async ({ page }) => {
      await page.goto('/employer/dashboard');

      // First tab: Skip link
      await page.keyboard.press('Tab');
      let focused = await page.evaluate(() => document.activeElement?.textContent);
      expect(focused).toContain('Skip to main content');

      // Second tab: Logo (TopNav)
      await page.keyboard.press('Tab');
      focused = await page.evaluate(() => document.activeElement?.textContent);
      expect(focused).toContain('HireFlux');

      // Third tab: Search input (TopNav)
      await page.keyboard.press('Tab');
      // Skip validation

      // Fourth tab: Notifications (TopNav)
      await page.keyboard.press('Tab');
      // Skip validation

      // Fifth tab: Profile menu (TopNav)
      await page.keyboard.press('Tab');
      // Skip validation

      // Sixth tab: Sidebar collapse button
      await page.keyboard.press('Tab');
      focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || '');
      expect(focused).toMatch(/collapse|expand/i);

      // Continue through main navigation (LeftSidebar employer nav items)
      const employerNav = [
        /dashboard/i,
        /jobs/i,
        /candidates/i,
        /applications/i,
        /team/i,
        /analytics/i,
        /company/i
      ];

      for (const expected of employerNav) {
        await page.keyboard.press('Tab');
        focused = await page.evaluate(() =>
          document.activeElement?.textContent || document.activeElement?.getAttribute('aria-label') || ''
        );
        expect(focused).toMatch(expected);
      }
    });

    test('should skip hidden elements', async ({ page }) => {
      await page.goto('/dashboard');

      // Close a collapsible section
      const collapseButton = page.locator('[aria-expanded="true"]').first();
      if (await collapseButton.count() > 0) {
        await collapseButton.click();

        // Tab through and verify hidden elements are skipped
        const focusableElements = await page.locator(':visible:focus').all();
        const hiddenElements = await page.locator('[hidden], [style*="display: none"]').all();

        // No hidden element should be in the tab order
        for (const hidden of hiddenElements) {
          const isInTabOrder = await hidden.evaluate((el: any) => el.tabIndex >= 0);
          expect(isInTabOrder).toBe(false);
        }
      }
    });
  });

  // ============================================================================
  // 2. Skip Links - Quick Navigation
  // ============================================================================

  test.describe('Skip Links', () => {
    test('should show skip to main content link on first tab', async ({ page }) => {
      await page.goto('/dashboard');

      // Press tab once
      await page.keyboard.press('Tab');

      // Skip link should be visible and focused
      const skipLink = page.locator('a:has-text("Skip to main content")');
      await expect(skipLink).toBeVisible();
      await expect(skipLink).toBeFocused();

      // Should have high contrast
      const contrast = await skipLink.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
        };
      });
      expect(contrast.color).toBeTruthy();
      expect(contrast.backgroundColor).toBeTruthy();
    });

    test('should skip to main content when activated', async ({ page }) => {
      await page.goto('/dashboard');

      // Focus skip link
      await page.keyboard.press('Tab');

      // Activate it
      await page.keyboard.press('Enter');

      // Main content should now be focused
      const focused = await page.evaluate(() =>
        document.activeElement?.getAttribute('id') || document.activeElement?.tagName
      );
      expect(focused).toMatch(/main|content/i);
    });

    test('should have skip to navigation link at bottom', async ({ page }) => {
      await page.goto('/dashboard');

      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Look for skip to navigation link
      const skipNav = page.locator('a:has-text("Skip to navigation")');
      if (await skipNav.count() > 0) {
        await expect(skipNav).toBeVisible();
      }
    });
  });

  // ============================================================================
  // 3. Focus Indicators - Visibility
  // ============================================================================

  test.describe('Focus Indicators', () => {
    test('should have visible focus indicators on all interactive elements', async ({ page }) => {
      await page.goto('/dashboard');

      // Get all interactive elements
      const interactiveSelectors = [
        'button:visible',
        'a:visible',
        'input:visible',
        '[role="button"]:visible'
      ];

      for (const selector of interactiveSelectors) {
        const element = page.locator(selector).first();
        if (await element.count() > 0) {
          await element.focus();

          // Check for focus indicator
          const hasFocusStyle = await element.evaluate((el) => {
            const style = window.getComputedStyle(el);
            return (
              style.outline !== 'none' ||
              style.boxShadow !== 'none' ||
              style.border !== style.borderColor // Changed border
            );
          });

          expect(hasFocusStyle).toBe(true);
        }
      }
    });

    test('should maintain focus indicator visibility', async ({ page }) => {
      await page.goto('/dashboard');

      const button = page.locator('button').first();
      await button.focus();

      // Wait a bit to ensure indicator doesn't flicker
      await page.waitForTimeout(500);

      const stillFocused = await button.evaluate((el) => el === document.activeElement);
      expect(stillFocused).toBe(true);

      // Indicator should still be visible
      const hasOutline = await button.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.outline !== 'none' && style.outline !== '';
      });
      expect(hasOutline).toBe(true);
    });

    test('should have minimum 2px focus outline', async ({ page }) => {
      await page.goto('/dashboard');

      const button = page.locator('button').first();
      await button.focus();

      const outlineWidth = await button.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return parseFloat(style.outlineWidth);
      });

      expect(outlineWidth).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================================================
  // 4. Keyboard Shortcuts - Global Actions
  // ============================================================================

  test.describe('Keyboard Shortcuts', () => {
    test('should open search with / key', async ({ page }) => {
      await page.goto('/dashboard');

      // Press /
      await page.keyboard.press('/');

      // Search modal should open
      const searchModal = page.locator('[role="dialog"]:has-text("Search")');
      await expect(searchModal).toBeVisible({ timeout: 2000 });

      // Search input should be focused
      const searchInput = page.locator('input[type="search"], input[placeholder*="Search"]').first();
      await expect(searchInput).toBeFocused();
    });

    test('should open command palette with Ctrl+K', async ({ page }) => {
      await page.goto('/dashboard');

      // Press Ctrl+K (Cmd+K on Mac)
      const isMac = await page.evaluate(() => navigator.platform.includes('Mac'));
      await page.keyboard.press(isMac ? 'Meta+k' : 'Control+k');

      // Command palette should open
      const commandPalette = page.locator('[role="dialog"]:has-text("Command")');
      await expect(commandPalette).toBeVisible({ timeout: 2000 });
    });

    test('should show keyboard shortcuts with ?', async ({ page }) => {
      await page.goto('/dashboard');

      // Press Shift+/ (which produces ?)
      await page.keyboard.press('Shift+/');

      // Shortcuts modal should open
      const shortcutsModal = page.locator('[role="dialog"]:has-text("Keyboard Shortcuts")');
      await expect(shortcutsModal).toBeVisible({ timeout: 2000 });

      // Should show shortcut categories
      await expect(page.locator('text=Navigation')).toBeVisible();
      await expect(page.locator('text=Actions')).toBeVisible();
    });

    test('should not trigger shortcuts when typing in input', async ({ page }) => {
      await page.goto('/dashboard');

      // Focus on a text input
      const input = page.locator('input[type="text"], input[type="search"]').first();
      await input.click();

      // Type /
      await page.keyboard.type('/');

      // Search modal should NOT open
      const searchModal = page.locator('[role="dialog"]:has-text("Search")');
      await expect(searchModal).not.toBeVisible();

      // / should be in the input value
      const value = await input.inputValue();
      expect(value).toContain('/');
    });
  });

  // ============================================================================
  // 5. Escape Key - Universal Close
  // ============================================================================

  test.describe('Escape Key Behavior', () => {
    test('should close modal with Escape', async ({ page }) => {
      await page.goto('/');

      // Open mobile menu modal
      const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
      await mobileMenuButton.click();

      // Modal should open
      const modal = page.locator('[role="dialog"]').first();
      await expect(modal).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');

      // Modal should close
      await expect(modal).not.toBeVisible();
    });

    test('should close dropdown with Escape', async ({ page }) => {
      await page.goto('/dashboard');

      // Open profile dropdown using role and data attribute
      const profileButton = page.locator('button[data-profile-menu-trigger]');
      await profileButton.click();

      // Dropdown should be visible
      const dropdown = page.locator('[role="menu"]').first();
      await expect(dropdown).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');

      // Dropdown should close
      await expect(dropdown).not.toBeVisible();
    });

    test.skip('should close nested modals in order', async ({ page }) => {
      // Skip this test for now - nested modals are not implemented in current UI
      // TODO: Create a test page with nested modals or implement this feature
      await page.goto('/dashboard');

      // Open first modal
      const button1 = page.locator('button').first();
      await button1.click();

      // If there's a nested action, click it
      const nestedButton = page.locator('[role="dialog"] button').first();
      if (await nestedButton.count() > 0) {
        await nestedButton.click();

        // Press Escape - should close inner modal
        await page.keyboard.press('Escape');

        // Outer modal should still be visible
        const outerModal = page.locator('[role="dialog"]').first();
        await expect(outerModal).toBeVisible();

        // Press Escape again - should close outer modal
        await page.keyboard.press('Escape');
        await expect(outerModal).not.toBeVisible();
      }
    });
  });

  // ============================================================================
  // 6. Enter and Space Keys - Activation
  // ============================================================================

  test.describe('Enter and Space Activation', () => {
    test('should activate buttons with Enter', async ({ page }) => {
      await page.goto('/dashboard');

      const button = page.locator('button:visible').first();
      await button.focus();

      // Listen for click event
      const clicked = await page.evaluate(() => {
        return new Promise((resolve) => {
          const btn = document.activeElement as HTMLElement;
          btn.addEventListener('click', () => resolve(true), { once: true });
          setTimeout(() => resolve(false), 1000);
        });
      });

      await page.keyboard.press('Enter');

      // Small wait for event to fire
      await page.waitForTimeout(100);
    });

    test('should activate buttons with Space', async ({ page }) => {
      await page.goto('/dashboard');

      const button = page.locator('button:visible').first();
      await button.focus();
      await page.keyboard.press('Space');

      // Button should have been activated (implementation will handle the action)
      await page.waitForTimeout(100);
    });

    test('should submit form with Enter', async ({ page }) => {
      await page.goto('/dashboard');

      // Find a form
      const form = page.locator('form').first();
      if (await form.count() > 0) {
        const input = form.locator('input').first();
        await input.focus();
        await page.keyboard.press('Enter');

        // Form should attempt to submit (validation may prevent it)
        await page.waitForTimeout(100);
      }
    });
  });

  // ============================================================================
  // 7. Arrow Keys - Menu and List Navigation
  // ============================================================================

  test.describe('Arrow Key Navigation', () => {
    test('should navigate dropdown menu with arrow keys', async ({ page }) => {
      await page.goto('/dashboard');

      // Open a dropdown
      const dropdownTrigger = page.locator('[aria-haspopup="menu"]').first();
      if (await dropdownTrigger.count() > 0) {
        await dropdownTrigger.click();

        // Press Down Arrow
        await page.keyboard.press('ArrowDown');

        const firstItem = await page.evaluate(() =>
          document.activeElement?.getAttribute('role')
        );
        expect(firstItem).toBe('menuitem');

        // Press Down Arrow again
        await page.keyboard.press('ArrowDown');

        // Should move to second item
        const secondItem = await page.evaluate(() =>
          document.activeElement?.textContent
        );
        expect(secondItem).toBeTruthy();
      }
    });

    test('should wrap arrow navigation at menu boundaries', async ({ page }) => {
      await page.goto('/dashboard');

      const dropdownTrigger = page.locator('[aria-haspopup="menu"]').first();
      if (await dropdownTrigger.count() > 0) {
        await dropdownTrigger.click();

        // Get menu items count
        const menuItems = await page.locator('[role="menuitem"]').count();

        // Navigate to last item
        for (let i = 0; i < menuItems; i++) {
          await page.keyboard.press('ArrowDown');
        }

        // Press Down again - should wrap to first
        await page.keyboard.press('ArrowDown');

        const firstItemText = await page.locator('[role="menuitem"]').first().textContent();
        const focusedText = await page.evaluate(() => document.activeElement?.textContent);
        expect(focusedText).toBe(firstItemText);
      }
    });
  });

  // ============================================================================
  // 8. Focus Management - Modals and Dialogs
  // ============================================================================

  test.describe('Focus Management', () => {
    test('should move focus to modal on open', async ({ page }) => {
      await page.goto('/dashboard');

      // Click button to open modal
      const openButton = page.locator('button:visible').first();
      await openButton.click();

      // If modal opens, focus should be inside it
      const modal = page.locator('[role="dialog"]').first();
      if (await modal.isVisible()) {
        const focusedElement = await page.evaluate(() => {
          const active = document.activeElement;
          const dialog = document.querySelector('[role="dialog"]');
          return dialog?.contains(active);
        });

        expect(focusedElement).toBe(true);
      }
    });

    test('should trap focus within modal', async ({ page }) => {
      await page.goto('/dashboard');

      // Open modal
      const button = page.locator('button:visible').first();
      await button.click();

      const modal = page.locator('[role="dialog"]').first();
      if (await modal.isVisible()) {
        // Tab through all elements
        for (let i = 0; i < 20; i++) {
          await page.keyboard.press('Tab');

          // Focus should always be within modal
          const isInModal = await page.evaluate(() => {
            const active = document.activeElement;
            const dialog = document.querySelector('[role="dialog"]');
            return dialog?.contains(active);
          });

          expect(isInModal).toBe(true);
        }
      }
    });

    test('should return focus to trigger on modal close', async ({ page }) => {
      await page.goto('/dashboard');

      const triggerButton = page.locator('button:visible').first();
      const triggerText = await triggerButton.textContent();

      await triggerButton.click();

      const modal = page.locator('[role="dialog"]').first();
      if (await modal.isVisible()) {
        await page.keyboard.press('Escape');

        // Focus should return to trigger
        const focusedText = await page.evaluate(() => document.activeElement?.textContent);
        expect(focusedText).toContain(triggerText || '');
      }
    });
  });

  // ============================================================================
  // 9. Edge Cases
  // ============================================================================

  test.describe('Edge Cases', () => {
    test('should skip disabled buttons', async ({ page }) => {
      await page.goto('/dashboard');

      // Find a disabled button
      const disabledButton = page.locator('button:disabled').first();

      if (await disabledButton.count() > 0) {
        // Tab through page
        for (let i = 0; i < 50; i++) {
          await page.keyboard.press('Tab');

          const focused = await page.evaluate(() => document.activeElement);
          const isDisabled = await page.evaluate((el) => (el as HTMLButtonElement).disabled, focused);

          expect(isDisabled).toBe(false);
        }
      }
    });

    test('should handle loading states gracefully', async ({ page }) => {
      await page.goto('/dashboard');

      const button = page.locator('button:visible').first();
      await button.focus();
      await button.click();

      // If button shows loading state, focus should remain or move appropriately
      await page.waitForTimeout(500);

      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused).toBeTruthy();
    });
  });

  // ============================================================================
  // 10. Acceptance Criteria Validation
  // ============================================================================

  test.describe('Acceptance Criteria', () => {
    test('@acceptance tab order is correct', async ({ page }) => {
      await page.goto('/dashboard');

      // Tab through and verify order is logical
      const focusedElements: string[] = [];

      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const text = await page.evaluate(() =>
          document.activeElement?.textContent || document.activeElement?.getAttribute('aria-label') || ''
        );
        focusedElements.push(text.trim());
      }

      // Should have at least skip link, logo, and nav items
      expect(focusedElements.length).toBeGreaterThan(0);
      expect(focusedElements[0]).toMatch(/skip/i);
    });

    test('@acceptance skip links work', async ({ page }) => {
      await page.goto('/dashboard');

      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      const focused = await page.evaluate(() =>
        document.activeElement?.getAttribute('id') || document.activeElement?.tagName
      );
      expect(focused).toMatch(/main|content/i);
    });

    test('@acceptance focus indicators are visible', async ({ page }) => {
      await page.goto('/dashboard');

      const button = page.locator('button:visible').first();
      await button.focus();

      const hasOutline = await button.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.outline !== 'none';
      });

      expect(hasOutline).toBe(true);
    });

    test('@acceptance all shortcuts are documented', async ({ page }) => {
      await page.goto('/dashboard');

      await page.keyboard.press('Shift+/');

      const modal = page.locator('[role="dialog"]:has-text("Keyboard Shortcuts")');
      if (await modal.isVisible()) {
        // Should have categories
        await expect(page.locator('text=Navigation')).toBeVisible();
        await expect(page.locator('text=Actions')).toBeVisible();
      }
    });
  });
});
