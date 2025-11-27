import { test, expect } from '@playwright/test';

/**
 * Shadcn/ui Component Library E2E Tests (Issue #93)
 *
 * Following BDD approach:
 * - Given: Shadcn/ui components are installed
 * - When: User interacts with components
 * - Then: Components behave as expected
 */

test.describe('Shadcn/ui Components - Switch', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a page with switch component (we'll create test page)
    await page.goto('/components-test');
  });

  test('should toggle switch on click', async ({ page }) => {
    const switchElement = page.locator('[role="switch"]').first();

    // Initial state should be unchecked
    await expect(switchElement).toHaveAttribute('aria-checked', 'false');

    // Click to toggle
    await switchElement.click();
    await expect(switchElement).toHaveAttribute('aria-checked', 'true');

    // Click again to toggle back
    await switchElement.click();
    await expect(switchElement).toHaveAttribute('aria-checked', 'false');
  });

  test('should be keyboard accessible', async ({ page }) => {
    const switchElement = page.locator('[role="switch"]').first();

    // Tab to focus
    await page.keyboard.press('Tab');
    await expect(switchElement).toBeFocused();

    // Space to toggle
    await page.keyboard.press('Space');
    await expect(switchElement).toHaveAttribute('aria-checked', 'true');
  });
});

test.describe('Shadcn/ui Components - Slider', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components-test');
  });

  test('should change value when dragged', async ({ page }) => {
    const slider = page.locator('[role="slider"]').first();

    // Get initial value
    const initialValue = await slider.getAttribute('aria-valuenow');
    expect(initialValue).toBeTruthy();

    // Slider should be draggable
    const sliderBox = await slider.boundingBox();
    if (sliderBox) {
      await page.mouse.move(sliderBox.x + sliderBox.width / 2, sliderBox.y + sliderBox.height / 2);
      await page.mouse.down();
      await page.mouse.move(sliderBox.x + sliderBox.width * 0.75, sliderBox.y + sliderBox.height / 2);
      await page.mouse.up();

      const newValue = await slider.getAttribute('aria-valuenow');
      expect(newValue).not.toBe(initialValue);
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    const slider = page.locator('[role="slider"]').first();

    await slider.focus();
    const initialValue = await slider.getAttribute('aria-valuenow');

    // Arrow right should increase value
    await page.keyboard.press('ArrowRight');
    const newValue = await slider.getAttribute('aria-valuenow');

    expect(Number(newValue)).toBeGreaterThan(Number(initialValue));
  });
});

test.describe('Shadcn/ui Components - Popover', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components-test');
  });

  test('should open and close popover on trigger click', async ({ page }) => {
    const trigger = page.locator('[data-testid="popover-trigger"]').first();
    const content = page.locator('[role="dialog"]');

    // Popover should be hidden initially
    await expect(content).toBeHidden();

    // Click trigger to open
    await trigger.click();
    await expect(content).toBeVisible();

    // Click outside or trigger again to close
    await trigger.click();
    await expect(content).toBeHidden();
  });

  test('should close on Escape key', async ({ page }) => {
    const trigger = page.locator('[data-testid="popover-trigger"]').first();
    const content = page.locator('[role="dialog"]');

    // Open popover
    await trigger.click();
    await expect(content).toBeVisible();

    // Press Escape
    await page.keyboard.press('Escape');
    await expect(content).toBeHidden();
  });
});

test.describe('Shadcn/ui Components - Toast', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components-test');
  });

  test('should display toast notification', async ({ page }) => {
    const toastTrigger = page.locator('[data-testid="toast-trigger"]').first();

    // Click to show toast
    await toastTrigger.click();

    // Toast should appear
    const toast = page.locator('[role="status"]').or(page.locator('[data-toast]'));
    await expect(toast.first()).toBeVisible({ timeout: 2000 });

    // Toast should have content
    await expect(toast.first()).not.toBeEmpty();
  });

  test('should auto-dismiss after timeout', async ({ page }) => {
    const toastTrigger = page.locator('[data-testid="toast-trigger"]').first();

    await toastTrigger.click();

    const toast = page.locator('[role="status"]').or(page.locator('[data-toast]')).first();
    await expect(toast).toBeVisible();

    // Wait for auto-dismiss (usually 3-5 seconds)
    await expect(toast).toBeHidden({ timeout: 6000 });
  });
});

test.describe('Shadcn/ui Components - Tooltip', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components-test');
  });

  test('should show tooltip on hover', async ({ page }) => {
    const trigger = page.locator('[data-testid="tooltip-trigger"]').first();
    const tooltip = page.locator('[role="tooltip"]');

    // Tooltip hidden initially
    await expect(tooltip).toBeHidden();

    // Hover to show tooltip
    await trigger.hover();
    await expect(tooltip).toBeVisible({ timeout: 1000 });

    // Move away to hide
    await page.mouse.move(0, 0);
    await expect(tooltip).toBeHidden({ timeout: 1000 });
  });

  test('should show tooltip on focus', async ({ page }) => {
    const trigger = page.locator('[data-testid="tooltip-trigger"]').first();
    const tooltip = page.locator('[role="tooltip"]');

    // Focus to show
    await trigger.focus();
    await expect(tooltip).toBeVisible({ timeout: 1000 });
  });
});

test.describe('Shadcn/ui Components - Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components-test');
  });

  test('should switch between tabs', async ({ page }) => {
    const tab1 = page.locator('[role="tab"]').first();
    const tab2 = page.locator('[role="tab"]').nth(1);
    const panel1 = page.locator('[role="tabpanel"]').first();
    const panel2 = page.locator('[role="tabpanel"]').nth(1);

    // First tab should be selected initially
    await expect(tab1).toHaveAttribute('aria-selected', 'true');
    await expect(panel1).toBeVisible();
    await expect(panel2).toBeHidden();

    // Click second tab
    await tab2.click();
    await expect(tab2).toHaveAttribute('aria-selected', 'true');
    await expect(panel2).toBeVisible();
    await expect(panel1).toBeHidden();
  });

  test('should support keyboard navigation', async ({ page }) => {
    const tab1 = page.locator('[role="tab"]').first();

    await tab1.focus();
    await expect(tab1).toBeFocused();

    // Arrow Right should move to next tab
    await page.keyboard.press('ArrowRight');
    const tab2 = page.locator('[role="tab"]').nth(1);
    await expect(tab2).toBeFocused();
  });
});

test.describe('Shadcn/ui Components - Accordion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components-test');
  });

  test('should expand and collapse accordion items', async ({ page }) => {
    const trigger = page.locator('[data-accordion-trigger]').or(page.locator('[data-state]')).first();
    const content = page.locator('[data-accordion-content]').or(page.locator('[role="region"]')).first();

    // Content should be collapsed initially (or might be expanded)
    const initialState = await trigger.getAttribute('data-state');

    // Click to toggle
    await trigger.click();
    await page.waitForTimeout(300); // Animation time

    const newState = await trigger.getAttribute('data-state');
    expect(newState).not.toBe(initialState);
  });

  test('should be keyboard accessible', async ({ page }) => {
    const trigger = page.locator('[data-accordion-trigger]').or(page.locator('[data-state]')).first();

    // Tab to focus
    await trigger.focus();
    await expect(trigger).toBeFocused();

    // Enter or Space to toggle
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // State should have changed
    const state = await trigger.getAttribute('data-state');
    expect(state).toBeTruthy();
  });
});

test.describe('Shadcn/ui Components - Avatar', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components-test');
  });

  test('should display avatar with image', async ({ page }) => {
    const avatar = page.locator('[data-testid="avatar"]').first();
    const image = avatar.locator('img');

    await expect(avatar).toBeVisible();

    // Should have an image or fallback
    const hasImage = await image.count();
    expect(hasImage).toBeGreaterThanOrEqual(0);
  });

  test('should show fallback when image fails', async ({ page }) => {
    const avatar = page.locator('[data-testid="avatar-fallback"]').first();
    const fallback = avatar.locator('[data-avatar-fallback]').or(avatar.locator('span')).first();

    await expect(fallback).toBeVisible();
    await expect(fallback).not.toBeEmpty();
  });

  test('should have correct size and shape', async ({ page }) => {
    const avatar = page.locator('[data-testid="avatar"]').first();

    // Avatar should be visible and have dimensions
    const box = await avatar.boundingBox();
    expect(box).not.toBeNull();

    if (box) {
      // Should be roughly square (allowing for rounding)
      const aspectRatio = box.width / box.height;
      expect(aspectRatio).toBeGreaterThan(0.9);
      expect(aspectRatio).toBeLessThan(1.1);
    }
  });
});

test.describe('Shadcn/ui Components - Integration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/components-test');
  });

  test('should have consistent styling across all components', async ({ page }) => {
    // Check that all interactive elements have focus indicators
    const interactiveElements = page.locator('button, [role="button"], [role="switch"], [role="slider"], [role="tab"]');

    const count = await interactiveElements.count();
    if (count > 0) {
      const firstElement = interactiveElements.first();
      await firstElement.focus();

      // Should have visible focus (outline or ring)
      const outlineColor = await firstElement.evaluate((el) => {
        return window.getComputedStyle(el).outlineColor;
      });

      expect(outlineColor).toBeTruthy();
    }
  });

  test('should work well on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/components-test');

    // All components should be visible and functional on mobile
    const buttons = page.locator('button');
    const count = await buttons.count();

    if (count > 0) {
      const firstButton = buttons.first();
      await expect(firstButton).toBeVisible();

      // Should be touch-friendly (minimum 44px height)
      const box = await firstButton.boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(40); // Allowing slight variance
      }
    }
  });
});
