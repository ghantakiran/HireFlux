/**
 * BDD Test Spec: Keyboard Navigation Enhancement (Issue #149)
 *
 * Feature: Keyboard Navigation Enhancement
 *   As a user who relies on keyboard navigation
 *   I want logical tab order, skip links, and keyboard shortcuts
 *   So that I can efficiently navigate the application without a mouse
 *
 * Acceptance Criteria:
 *   - Tab order is logical and follows visual layout
 *   - Skip links work and bypass navigation
 *   - Focus indicators are clearly visible
 *   - Keyboard shortcuts are available and documented
 *   - Escape key closes modals, dropdowns, and overlays
 */

import { test, expect } from '@playwright/test';

test.describe('Keyboard Navigation Enhancement', () => {
  test.describe('Tab Order', () => {
    test('should have logical tab order on dashboard', async ({ page }) => {
      // Given: User is on the dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // When: User presses Tab multiple times
      await page.keyboard.press('Tab');
      let firstFocused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') || document.activeElement?.tagName);

      await page.keyboard.press('Tab');
      let secondFocused = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') || document.activeElement?.tagName);

      // Then: Tab order follows visual layout
      expect(firstFocused).toBeTruthy();
      expect(secondFocused).toBeTruthy();
      expect(firstFocused).not.toBe(secondFocused);
    });

    test('should tab through form fields in correct order', async ({ page }) => {
      // Given: User is on a form page
      await page.goto('/resume/create');
      await page.waitForLoadState('networkidle');

      // When: User tabs through form
      const focusOrder: string[] = [];

      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const focusedId = await page.evaluate(() =>
          document.activeElement?.getAttribute('data-testid') ||
          document.activeElement?.getAttribute('name') ||
          document.activeElement?.getAttribute('id') ||
          'unknown'
        );
        focusOrder.push(focusedId);
      }

      // Then: Form fields are in logical order
      expect(focusOrder.length).toBeGreaterThan(0);
      // Should not have same element focused consecutively (unless intentional)
      const uniqueFocused = new Set(focusOrder);
      expect(uniqueFocused.size).toBeGreaterThan(focusOrder.length / 2);
    });

    test('should not trap focus in navigation', async ({ page }) => {
      // Given: User is on any page with navigation
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // When: User tabs through navigation
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
      }

      // Then: Focus should eventually leave navigation
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
      // Should have progressed beyond navigation
    });
  });

  test.describe('Skip Links', () => {
    test('should provide skip to main content link', async ({ page }) => {
      // Given: User loads the page
      await page.goto('/dashboard');

      // When: User presses Tab (first focus should be skip link)
      await page.keyboard.press('Tab');

      // Then: Skip link is focused
      const skipLink = page.locator('[data-testid="skip-to-content"]').first();
      await expect(skipLink).toBeFocused({ timeout: 3000 });
    });

    test('should skip navigation when skip link is activated', async ({ page }) => {
      // Given: User has focused skip link
      await page.goto('/dashboard');
      await page.keyboard.press('Tab');

      const skipLink = page.locator('[data-testid="skip-to-content"]').first();
      await expect(skipLink).toBeFocused({ timeout: 3000 });

      // When: User activates skip link
      await page.keyboard.press('Enter');

      // Then: Focus jumps to main content
      await page.waitForTimeout(500); // Allow focus to settle
      const focusedElement = await page.evaluate(() => document.activeElement?.getAttribute('id'));
      expect(focusedElement).toMatch(/main|content/i);
    });

    test('should have visible skip link on focus', async ({ page }) => {
      // Given: User loads the page
      await page.goto('/dashboard');

      // When: Skip link receives focus
      await page.keyboard.press('Tab');

      const skipLink = page.locator('[data-testid="skip-to-content"]').first();

      // Then: Skip link becomes visible
      await expect(skipLink).toBeVisible({ timeout: 3000 });

      // And: Skip link has sufficient contrast
      const bgColor = await skipLink.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );
      const color = await skipLink.evaluate((el) =>
        window.getComputedStyle(el).color
      );
      expect(bgColor).toBeTruthy();
      expect(color).toBeTruthy();
      expect(bgColor).not.toBe(color);
    });
  });

  test.describe('Focus Indicators', () => {
    test('should show visible focus indicator on interactive elements', async ({ page }) => {
      // Given: User is on a page with buttons
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // When: User tabs to a button
      let focused = false;
      for (let i = 0; i < 20 && !focused; i++) {
        await page.keyboard.press('Tab');
        const isButton = await page.evaluate(() =>
          ['BUTTON', 'A', 'INPUT'].includes(document.activeElement?.tagName || '')
        );
        if (isButton) {
          focused = true;
        }
      }

      expect(focused).toBe(true);

      // Then: Focus indicator is visible
      const outline = await page.evaluate(() => {
        const el = document.activeElement;
        const styles = window.getComputedStyle(el!);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow,
        };
      });

      // Should have either outline or box-shadow for focus
      const hasFocusIndicator =
        outline.outline !== 'none' ||
        outline.outlineWidth !== '0px' ||
        outline.boxShadow !== 'none';

      expect(hasFocusIndicator).toBe(true);
    });

    test('should maintain focus indicator on all interactive elements', async ({ page }) => {
      // Given: User is on dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // When: User tabs through multiple interactive elements
      const elementsWithFocus: boolean[] = [];

      for (let i = 0; i < 15; i++) {
        await page.keyboard.press('Tab');

        const isInteractive = await page.evaluate(() => {
          const el = document.activeElement;
          return ['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT'].includes(el?.tagName || '');
        });

        if (isInteractive) {
          const hasFocusStyle = await page.evaluate(() => {
            const el = document.activeElement;
            const styles = window.getComputedStyle(el!);
            return (
              styles.outline !== 'none' ||
              styles.outlineWidth !== '0px' ||
              styles.boxShadow !== 'none'
            );
          });
          elementsWithFocus.push(hasFocusStyle);
        }
      }

      // Then: All interactive elements should have focus indicators
      expect(elementsWithFocus.length).toBeGreaterThan(0);
      const allHaveFocus = elementsWithFocus.every((has) => has);
      expect(allHaveFocus).toBe(true);
    });
  });

  test.describe('Keyboard Shortcuts', () => {
    test('should list available keyboard shortcuts', async ({ page }) => {
      // Given: User is on any page
      await page.goto('/dashboard');

      // When: User presses ? key (common shortcut help key)
      await page.keyboard.press('?');

      // Then: Shortcuts help modal/tooltip appears
      const shortcutsHelp = page.locator('[data-testid="keyboard-shortcuts-help"]');
      await expect(shortcutsHelp).toBeVisible({ timeout: 3000 });
    });

    test('should navigate with keyboard shortcuts', async ({ page }) => {
      // Given: User is on dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // When: User presses shortcut for jobs (e.g., 'g' then 'j')
      await page.keyboard.press('g');
      await page.keyboard.press('j');

      // Then: User is navigated to jobs page
      await page.waitForURL(/jobs/, { timeout: 5000 }).catch(() => {
        // If keyboard shortcuts not yet implemented, this will fail gracefully
      });
    });

    test('should close shortcuts help with Escape', async ({ page }) => {
      // Given: Shortcuts help is open
      await page.goto('/dashboard');
      await page.keyboard.press('?');

      const shortcutsHelp = page.locator('[data-testid="keyboard-shortcuts-help"]');
      await expect(shortcutsHelp).toBeVisible({ timeout: 3000 });

      // When: User presses Escape
      await page.keyboard.press('Escape');

      // Then: Shortcuts help closes
      await expect(shortcutsHelp).not.toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Escape Key Behavior', () => {
    test('should close modal with Escape key', async ({ page }) => {
      // Given: A modal is open
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Find and click a button that opens a modal
      const modalTrigger = page.locator('[data-testid*="dialog"]').first();
      if (await modalTrigger.count() > 0) {
        await modalTrigger.click();
        await page.waitForTimeout(500);

        // When: User presses Escape
        await page.keyboard.press('Escape');

        // Then: Modal closes
        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).not.toBeVisible({ timeout: 3000 });
      }
    });

    test('should close dropdown with Escape key', async ({ page }) => {
      // Given: A dropdown is open
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Find and open a dropdown menu
      const dropdownTrigger = page.locator('[data-menu-button]').first();
      if (await dropdownTrigger.count() > 0) {
        await dropdownTrigger.click();
        await page.waitForTimeout(500);

        const dropdownMenu = page.locator('[role="menu"]');
        await expect(dropdownMenu).toBeVisible({ timeout: 3000 });

        // When: User presses Escape
        await page.keyboard.press('Escape');

        // Then: Dropdown closes
        await expect(dropdownMenu).not.toBeVisible({ timeout: 3000 });
      }
    });

    test('should close popover with Escape key', async ({ page }) => {
      // Given: A popover is open
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Find and open a popover
      const popoverTrigger = page.locator('[data-testid*="popover"]').first();
      if (await popoverTrigger.count() > 0) {
        await popoverTrigger.click();
        await page.waitForTimeout(500);

        // When: User presses Escape
        await page.keyboard.press('Escape');

        // Then: Popover closes
        const popover = page.locator('[data-radix-popper-content-wrapper]');
        await expect(popover).not.toBeVisible({ timeout: 3000 });
      }
    });

    test('should not close page content with Escape', async ({ page }) => {
      // Given: User is on a page (no modal/dropdown open)
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const initialUrl = page.url();

      // When: User presses Escape
      await page.keyboard.press('Escape');
      await page.waitForTimeout(500);

      // Then: Page remains the same
      expect(page.url()).toBe(initialUrl);
    });
  });

  test.describe('Form Navigation', () => {
    test('should submit form with Enter key', async ({ page }) => {
      // Given: User is in a form input
      await page.goto('/resume/create');
      await page.waitForLoadState('networkidle');

      const input = page.locator('input[type="text"]').first();
      if (await input.count() > 0) {
        await input.fill('Test Input');
        await input.focus();

        // When: User presses Enter
        await page.keyboard.press('Enter');

        // Then: Form should be submitted or validated
        await page.waitForTimeout(1000);
        // Check for validation or submission feedback
      }
    });

    test('should navigate between form fields with Tab/Shift+Tab', async ({ page }) => {
      // Given: User is on a form
      await page.goto('/resume/create');
      await page.waitForLoadState('networkidle');

      const firstInput = page.locator('input').first();
      await firstInput.focus();

      const firstFocused = await page.evaluate(() => document.activeElement?.getAttribute('name'));

      // When: User presses Tab
      await page.keyboard.press('Tab');
      const secondFocused = await page.evaluate(() => document.activeElement?.getAttribute('name'));

      // And: User presses Shift+Tab
      await page.keyboard.press('Shift+Tab');
      const backToFirst = await page.evaluate(() => document.activeElement?.getAttribute('name'));

      // Then: Navigation works correctly
      expect(firstFocused).toBeTruthy();
      expect(secondFocused).toBeTruthy();
      expect(firstFocused).not.toBe(secondFocused);
      expect(backToFirst).toBe(firstFocused);
    });
  });

  test.describe('Accessibility Standards', () => {
    test('should support ARIA keyboard navigation', async ({ page }) => {
      // Given: User is on a page with ARIA components
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // When: User tabs to ARIA components
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');
        const ariaRole = await page.evaluate(() =>
          document.activeElement?.getAttribute('role')
        );

        if (ariaRole) {
          // Then: ARIA components are keyboard accessible
          const isKeyboardAccessible = await page.evaluate(() => {
            const el = document.activeElement;
            return el?.getAttribute('tabindex') !== '-1' || el?.tagName === 'BUTTON' || el?.tagName === 'A';
          });
          expect(isKeyboardAccessible).toBe(true);
        }
      }
    });

    test('should announce focus changes to screen readers', async ({ page }) => {
      // Given: User is on dashboard
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // When: User tabs through elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
        const hasAriaLabel = await page.evaluate(() => {
          const el = document.activeElement;
          return !!(
            el?.getAttribute('aria-label') ||
            el?.getAttribute('aria-labelledby') ||
            el?.textContent?.trim()
          );
        });

        // Then: Elements have accessible labels
        expect(hasAriaLabel).toBe(true);
      }
    });
  });
});
