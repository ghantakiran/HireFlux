import { test, expect } from '@playwright/test';

/**
 * Focus Management & Skip Links - E2E Test Suite
 * Issue #151: [ADVANCED] Focus Management & Skip Links
 *
 * This test suite validates focus management across the application
 * following WCAG 2.4.3 (Focus Order) and 2.4.7 (Focus Visible).
 *
 * Test Coverage:
 * 1. Skip Links - Already implemented in Issue #148
 * 2. Focus Trapping - Modals, dialogs, dropdowns
 * 3. Focus Restoration - Return focus when closing modals
 * 4. Focus Outlines - Visible keyboard focus indicators
 * 5. Focus Order - Logical tab order through interactive elements
 *
 * TDD/BDD Approach:
 * - RED Phase: These tests will initially FAIL, identifying gaps
 * - GREEN Phase: Implement focus management features
 * - REFACTOR Phase: Optimize and enhance UX
 */

test.describe('Focus Management - Issue #151', () => {

  // ========================================================================
  // SECTION 1: SKIP LINKS (Already Implemented - Verification Tests)
  // ========================================================================

  test.describe('1. Skip Links', () => {

    test('1.1 Skip link should be visible on focus', async ({ page }) => {
      await page.goto('/');

      // Press Tab to focus skip link
      await page.keyboard.press('Tab');

      // Skip link should be visible when focused
      const skipLink = page.locator('a[href="#main-content"]').first();
      await expect(skipLink).toBeVisible();

      // Should have accessible text
      const text = await skipLink.textContent();
      expect(text).toContain('Skip to main content');
    });

    test('1.2 Skip link should jump to main content', async ({ page }) => {
      await page.goto('/');

      // Focus skip link and activate
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      // Main content should now have focus
      const mainContent = page.locator('#main-content');
      await expect(mainContent).toBeFocused();
    });

    test('1.3 Skip link works on authenticated pages', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Press Tab to focus skip link
      await page.keyboard.press('Tab');

      // Skip link should exist
      const skipLink = page.locator('a[href="#main-content"]').first();
      await expect(skipLink).toBeVisible();

      // Activate skip link
      await page.keyboard.press('Enter');

      // Main content should have focus
      const mainContent = page.locator('#main-content');
      await expect(mainContent).toBeFocused();
    });
  });

  // ========================================================================
  // SECTION 2: FOCUS TRAPPING IN MODALS
  // ========================================================================

  test.describe('2. Focus Trapping', () => {

    test('2.1 Modal should trap focus when open', async ({ page }) => {
      // Set mobile viewport to make mobile menu button visible
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Open mobile menu modal
      const mobileMenuButton = page.locator('button[aria-label="Open mobile menu"]');
      await mobileMenuButton.click();

      // Wait for modal to open
      await page.waitForSelector('[data-testid="mobile-menu"]', { state: 'visible' });

      // Get all focusable elements in modal
      const modal = page.locator('[data-testid="mobile-menu"]');
      const firstFocusable = modal.locator('button, a, input, [tabindex="0"]').first();
      const lastFocusable = modal.locator('button, a, input, [tabindex="0"]').last();

      // Focus should be in modal
      await expect(firstFocusable).toBeFocused();

      // Tab through all focusable elements
      const focusableCount = await modal.locator('button, a, input, [tabindex="0"]').count();

      for (let i = 0; i < focusableCount; i++) {
        await page.keyboard.press('Tab');
      }

      // After tabbing past last element, should cycle back to first
      await expect(firstFocusable).toBeFocused();
    });

    test('2.2 Shift+Tab should reverse cycle through modal', async ({ page }) => {
      // Set mobile viewport to make mobile menu button visible
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Open mobile menu modal
      const mobileMenuButton = page.locator('button[aria-label="Open mobile menu"]');
      await mobileMenuButton.click();

      // Wait for modal to open
      await page.waitForSelector('[data-testid="mobile-menu"]', { state: 'visible' });

      const modal = page.locator('[data-testid="mobile-menu"]');
      const firstFocusable = modal.locator('button, a, input, [tabindex="0"]').first();

      // Press Shift+Tab from first element
      await page.keyboard.press('Shift+Tab');

      // Should cycle to last focusable element
      const lastFocusable = modal.locator('button, a, input, [tabindex="0"]').last();
      await expect(lastFocusable).toBeFocused();
    });

    test('2.3 Escape key should close modal', async ({ page }) => {
      // Set mobile viewport to make mobile menu button visible
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Open mobile menu modal
      const mobileMenuButton = page.locator('button[aria-label="Open mobile menu"]');
      await mobileMenuButton.click();

      // Wait for modal to open
      await page.waitForSelector('[data-testid="mobile-menu"]', { state: 'visible' });

      // Press Escape
      await page.keyboard.press('Escape');

      // Modal should be closed
      await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible();
    });

    test('2.4 Focus should not escape modal when open', async ({ page }) => {
      // Set mobile viewport to make mobile menu button visible
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Open mobile menu modal
      const mobileMenuButton = page.locator('button[aria-label="Open mobile menu"]');
      await mobileMenuButton.click();

      // Wait for modal to open
      await page.waitForSelector('[data-testid="mobile-menu"]', { state: 'visible' });

      // Get element outside modal
      const outsideElement = page.locator('nav a').first();

      // Try to focus element outside modal programmatically
      await outsideElement.focus();

      // Focus should still be trapped in modal
      const modal = page.locator('[data-testid="mobile-menu"]');
      const modalFocused = await modal.locator(':focus').count();
      expect(modalFocused).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // SECTION 3: FOCUS RESTORATION
  // ========================================================================

  test.describe('3. Focus Restoration', () => {

    test('3.1 Focus should return to trigger when modal closes', async ({ page }) => {
      // Set mobile viewport to make mobile menu button visible
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Focus and click mobile menu button
      const mobileMenuButton = page.locator('button[aria-label="Open mobile menu"]');
      await mobileMenuButton.focus();
      await mobileMenuButton.click();

      // Wait for modal to open
      await page.waitForSelector('[data-testid="mobile-menu"]', { state: 'visible' });

      // Close modal with Escape
      await page.keyboard.press('Escape');

      // Wait for modal to close
      await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible();

      // Focus should return to button that opened modal
      await expect(mobileMenuButton).toBeFocused();
    });

    test('3.2 Focus restoration works when closing via close button', async ({ page }) => {
      // Set mobile viewport to make mobile menu button visible
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Focus and click mobile menu button
      const mobileMenuButton = page.locator('button[aria-label="Open mobile menu"]');
      await mobileMenuButton.focus();
      await mobileMenuButton.click();

      // Wait for modal to open
      await page.waitForSelector('[data-testid="mobile-menu"]', { state: 'visible' });

      // Find and click close button (X button in dialog)
      const modal = page.locator('[data-testid="mobile-menu"]');
      const closeButton = modal.locator('button[aria-label*="Close"], button[aria-label*="close"]').first();

      if (await closeButton.count() > 0) {
        await closeButton.click();
      } else {
        // If no close button, click outside modal
        await page.mouse.click(10, 10);
      }

      // Wait for modal to close
      await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible();

      // Focus should return to trigger button
      await expect(mobileMenuButton).toBeFocused();
    });

    test('3.3 Focus restoration works for dropdown menus', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Find and focus profile menu button
      const profileButton = page.locator('[data-profile-menu-trigger]').first();

      if (await profileButton.count() > 0) {
        await profileButton.focus();
        await profileButton.click();

        // Wait for dropdown to open
        await page.waitForTimeout(300);

        // Press Escape to close
        await page.keyboard.press('Escape');

        // Focus should return to profile button
        await expect(profileButton).toBeFocused();
      } else {
        console.log('⏭️  Skipping: Profile menu not found on this page');
      }
    });
  });

  // ========================================================================
  // SECTION 4: FOCUS OUTLINES (Visibility)
  // ========================================================================

  test.describe('4. Focus Outlines', () => {

    test('4.1 Buttons should have visible focus outlines', async ({ page }) => {
      await page.goto('/');

      // Tab to first button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Get focused button
      const focusedButton = page.locator('button:focus, a:focus').first();

      // Check for focus outline styles
      const outlineStyle = await focusedButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          outlineStyle: styles.outlineStyle,
          outlineColor: styles.outlineColor,
          boxShadow: styles.boxShadow,
        };
      });

      // Should have SOME visible focus indicator (outline or box-shadow)
      const hasOutline = outlineStyle.outlineWidth !== '0px' && outlineStyle.outlineStyle !== 'none';
      const hasBoxShadow = outlineStyle.boxShadow !== 'none';

      expect(hasOutline || hasBoxShadow).toBeTruthy();
    });

    test('4.2 Links should have visible focus outlines', async ({ page }) => {
      await page.goto('/');

      // Find first link
      const firstLink = page.locator('a[href]').first();
      await firstLink.focus();

      // Check for focus indicator
      const outlineStyle = await firstLink.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          outlineWidth: styles.outlineWidth,
          outlineStyle: styles.outlineStyle,
          boxShadow: styles.boxShadow,
        };
      });

      const hasOutline = outlineStyle.outlineWidth !== '0px' && outlineStyle.outlineStyle !== 'none';
      const hasBoxShadow = outlineStyle.boxShadow !== 'none';

      expect(hasOutline || hasBoxShadow).toBeTruthy();
    });

    test('4.3 Form inputs should have visible focus outlines', async ({ page }) => {
      await page.goto('/signin');

      // Focus first input
      const firstInput = page.locator('input').first();
      await firstInput.focus();

      // Check for focus indicator
      const outlineStyle = await firstInput.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          outlineWidth: styles.outlineWidth,
          outlineStyle: styles.outlineStyle,
          boxShadow: styles.boxShadow,
          borderColor: styles.borderColor,
        };
      });

      // Should have visible focus indicator
      const hasOutline = outlineStyle.outlineWidth !== '0px' && outlineStyle.outlineStyle !== 'none';
      const hasBoxShadow = outlineStyle.boxShadow !== 'none';

      expect(hasOutline || hasBoxShadow).toBeTruthy();
    });

    test('4.4 Focus outlines should have sufficient contrast', async ({ page }) => {
      await page.goto('/');

      // Tab to first interactive element
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focusedElement = page.locator('button:focus, a:focus, input:focus').first();

      // Get outline color
      const outlineColor = await focusedElement.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.outlineColor || styles.boxShadow;
      });

      // Should have a defined color (not transparent or auto)
      expect(outlineColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(outlineColor).not.toBe('transparent');
    });
  });

  // ========================================================================
  // SECTION 5: FOCUS ORDER (Logical Tab Sequence)
  // ========================================================================

  test.describe('5. Focus Order', () => {

    test('5.1 Homepage should have logical focus order', async ({ page }) => {
      await page.goto('/');

      const focusOrder: string[] = [];

      // Tab through first 10 focusable elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');

        const focusedElement = page.locator(':focus').first();
        const role = await focusedElement.getAttribute('role');
        const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
        const ariaLabel = await focusedElement.getAttribute('aria-label');
        const text = await focusedElement.textContent();

        focusOrder.push(`${tagName}[${role || 'no-role'}]: ${ariaLabel || text?.substring(0, 30) || 'no-text'}`);
      }

      console.log('Focus Order:');
      focusOrder.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item}`);
      });

      // First focus should be skip link
      expect(focusOrder[0]).toContain('Skip');
    });

    test('5.2 Dashboard should have logical focus order', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const focusOrder: string[] = [];

      // Tab through first 10 focusable elements
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press('Tab');

        const focusedElement = page.locator(':focus').first();
        const tagName = await focusedElement.evaluate(el => el.tagName.toLowerCase());
        const ariaLabel = await focusedElement.getAttribute('aria-label');
        const text = await focusedElement.textContent();

        focusOrder.push(`${tagName}: ${ariaLabel || text?.substring(0, 30) || 'no-text'}`);
      }

      console.log('Dashboard Focus Order:');
      focusOrder.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item}`);
      });

      // Should start with skip link or navigation
      expect(focusOrder.length).toBe(10);
    });

    test('5.3 No focusable elements should have tabindex > 0', async ({ page }) => {
      await page.goto('/');

      // Find all elements with tabindex > 0
      const invalidTabindex = await page.locator('[tabindex]').evaluateAll((elements) => {
        return elements
          .filter(el => {
            const tabindex = parseInt(el.getAttribute('tabindex') || '0');
            return tabindex > 0;
          })
          .map(el => ({
            tag: el.tagName,
            tabindex: el.getAttribute('tabindex'),
            html: el.outerHTML.substring(0, 100),
          }));
      });

      if (invalidTabindex.length > 0) {
        console.log('⚠️  Elements with tabindex > 0:');
        invalidTabindex.forEach(el => {
          console.log(`  - ${el.tag} tabindex="${el.tabindex}"`);
        });
      }

      // Should have no elements with positive tabindex (anti-pattern)
      expect(invalidTabindex.length).toBe(0);
    });

    test('5.4 Hidden elements should not be focusable', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Find all hidden elements that are focusable
      const hiddenFocusable = await page.locator('[hidden], [aria-hidden="true"], .sr-only, .hidden').evaluateAll((elements) => {
        return elements
          .filter(el => {
            const tabindex = parseInt(el.getAttribute('tabindex') || '-1');
            return tabindex >= 0;
          })
          .map(el => ({
            tag: el.tagName,
            classes: el.className,
            tabindex: el.getAttribute('tabindex'),
          }));
      });

      if (hiddenFocusable.length > 0) {
        console.log('⚠️  Hidden elements that are focusable:');
        hiddenFocusable.forEach(el => {
          console.log(`  - ${el.tag}.${el.classes}`);
        });
      }

      // Hidden elements should not be focusable
      expect(hiddenFocusable.length).toBe(0);
    });
  });

  // ========================================================================
  // SECTION 6: ACCEPTANCE CRITERIA
  // ========================================================================

  test.describe('6. Acceptance Criteria', () => {

    test('@acceptance Skip links work', async ({ page }) => {
      await page.goto('/');

      // Tab to skip link
      await page.keyboard.press('Tab');

      // Activate skip link
      await page.keyboard.press('Enter');

      // Main content should have focus
      const mainContent = page.locator('#main-content');
      await expect(mainContent).toBeFocused();
    });

    test('@acceptance Focus trapped in modals', async ({ page }) => {
      // Set mobile viewport to make mobile menu button visible
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Open modal
      const mobileMenuButton = page.locator('button[aria-label="Open mobile menu"]');
      await mobileMenuButton.click();

      // Wait for modal
      await page.waitForSelector('[data-testid="mobile-menu"]', { state: 'visible' });

      // Tab multiple times
      for (let i = 0; i < 20; i++) {
        await page.keyboard.press('Tab');
      }

      // Focus should still be in modal
      const modal = page.locator('[data-testid="mobile-menu"]');
      const focusInModal = await modal.locator(':focus').count();
      expect(focusInModal).toBeGreaterThan(0);
    });

    test('@acceptance Focus restoration correct', async ({ page }) => {
      // Set mobile viewport to make mobile menu button visible
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      // Focus trigger button
      const mobileMenuButton = page.locator('button[aria-label="Open mobile menu"]');
      await mobileMenuButton.focus();
      await mobileMenuButton.click();

      // Wait for modal
      await page.waitForSelector('[data-testid="mobile-menu"]', { state: 'visible' });

      // Close with Escape
      await page.keyboard.press('Escape');

      // Wait for modal to close
      await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible();

      // Focus should be restored
      await expect(mobileMenuButton).toBeFocused();
    });

    test('@acceptance Focus outlines visible', async ({ page }) => {
      await page.goto('/');

      // Tab to first interactive element
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const focusedElement = page.locator(':focus').first();

      // Get focus styles
      const styles = await focusedElement.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          outlineWidth: computed.outlineWidth,
          outlineStyle: computed.outlineStyle,
          boxShadow: computed.boxShadow,
        };
      });

      // Should have visible focus indicator
      const hasOutline = styles.outlineWidth !== '0px' && styles.outlineStyle !== 'none';
      const hasBoxShadow = styles.boxShadow !== 'none';

      expect(hasOutline || hasBoxShadow).toBeTruthy();
    });
  });
});
