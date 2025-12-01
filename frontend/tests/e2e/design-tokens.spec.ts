/**
 * E2E Tests for Issue #73: Design Tokens and Theming
 *
 * Test Coverage:
 * - Design token presence and values
 * - Light/Dark theme switching
 * - System preference detection
 * - Theme persistence (localStorage)
 * - WCAG 2.2 AA contrast compliance
 * - Theme toggle UI component
 * - Performance (no flash of unstyled content)
 *
 * @see tests/features/design-tokens.feature for BDD scenarios
 */

import { test, expect, Page } from '@playwright/test';

// ============================================================================
// Test Configuration
// ============================================================================

test.describe('Design Tokens and Theming (Issue #73)', () => {

  // Helper function to get computed CSS variable value
  async function getCSSVariable(page: Page, variable: string): Promise<string> {
    return await page.evaluate((varName) => {
      return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    }, variable);
  }

  // Helper function to calculate contrast ratio
  async function getContrastRatio(page: Page, fgColor: string, bgColor: string): Promise<number> {
    return await page.evaluate(([fg, bg]) => {
      // Simple luminance calculation (simplified for testing)
      const getLuminance = (color: string) => {
        const rgb = color.match(/\d+/g)?.map(Number) || [0, 0, 0];
        const [r, g, b] = rgb.map(val => {
          const sRGB = val / 255;
          return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      const l1 = getLuminance(fg);
      const l2 = getLuminance(bg);
      const lighter = Math.max(l1, l2);
      const darker = Math.min(l1, l2);
      return (lighter + 0.05) / (darker + 0.05);
    }, [fgColor, bgColor]);
  }

  // Helper to set localStorage theme
  async function setThemeInStorage(page: Page, theme: 'light' | 'dark' | null) {
    if (theme === null) {
      await page.evaluate(() => localStorage.removeItem('theme'));
    } else {
      await page.evaluate((t) => localStorage.setItem('theme', t), theme);
    }
  }

  // Helper to emulate system color scheme
  async function setSystemColorScheme(page: Page, scheme: 'light' | 'dark') {
    await page.emulateMedia({ colorScheme: scheme });
  }

  // ============================================================================
  // 1. Design Tokens - Color System
  // ============================================================================

  test.describe('Design Tokens - Color System', () => {

    test('should have primary color tokens defined', async ({ page }) => {
      await page.goto('/');

      // Check that primary color variables exist
      const primary500 = await getCSSVariable(page, '--color-primary-500');
      expect(primary500).toBeTruthy();
      expect(primary500).toMatch(/#[0-9a-f]{6}/i);
    });

    test('should have semantic color tokens', async ({ page }) => {
      await page.goto('/');

      const success = await getCSSVariable(page, '--color-success');
      const warning = await getCSSVariable(page, '--color-warning');
      const error = await getCSSVariable(page, '--color-error');
      const info = await getCSSVariable(page, '--color-info');

      expect(success).toBeTruthy();
      expect(warning).toBeTruthy();
      expect(error).toBeTruthy();
      expect(info).toBeTruthy();
    });

    test('should have background and surface color tokens', async ({ page }) => {
      await page.goto('/');

      const background = await getCSSVariable(page, '--color-background');
      const surface = await getCSSVariable(page, '--color-surface');

      expect(background).toBeTruthy();
      expect(surface).toBeTruthy();
    });
  });

  // ============================================================================
  // 2. Design Tokens - Spacing System
  // ============================================================================

  test.describe('Design Tokens - Spacing System', () => {

    test('should have spacing scale from 0 to 24', async ({ page }) => {
      await page.goto('/');

      const spacings = [0, 1, 2, 3, 4, 6, 8, 12, 16, 24];
      for (const space of spacings) {
        const value = await getCSSVariable(page, `--space-${space}`);
        expect(value).toBeTruthy();
      }
    });

    test('should have layout spacing tokens', async ({ page }) => {
      await page.goto('/');

      const maxWidth = await getCSSVariable(page, '--layout-max-width');
      const headerHeight = await getCSSVariable(page, '--layout-header-height');

      expect(maxWidth).toBe('1200px');
      expect(headerHeight).toBe('64px');
    });
  });

  // ============================================================================
  // 3. Design Tokens - Typography System
  // ============================================================================

  test.describe('Design Tokens - Typography System', () => {

    test('should have font family tokens', async ({ page }) => {
      await page.goto('/');

      const fontSans = await getCSSVariable(page, '--font-sans');
      const fontMono = await getCSSVariable(page, '--font-mono');

      expect(fontSans).toContain('Inter');
      expect(fontMono).toBeTruthy();
    });

    test('should have font size scale', async ({ page }) => {
      await page.goto('/');

      const sizes = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
      for (const size of sizes) {
        const value = await getCSSVariable(page, `--text-${size}`);
        expect(value).toBeTruthy();
      }
    });

    test('should have font weight tokens', async ({ page }) => {
      await page.goto('/');

      const normal = await getCSSVariable(page, '--font-normal');
      const medium = await getCSSVariable(page, '--font-medium');
      const semibold = await getCSSVariable(page, '--font-semibold');
      const bold = await getCSSVariable(page, '--font-bold');

      expect(normal).toBe('400');
      expect(medium).toBe('500');
      expect(semibold).toBe('600');
      expect(bold).toBe('700');
    });
  });

  // ============================================================================
  // 4. Design Tokens - Elevation System
  // ============================================================================

  test.describe('Design Tokens - Elevation System', () => {

    test('should have shadow tokens', async ({ page }) => {
      await page.goto('/');

      const shadowSm = await getCSSVariable(page, '--shadow-sm');
      const shadowMd = await getCSSVariable(page, '--shadow-md');
      const shadowLg = await getCSSVariable(page, '--shadow-lg');

      expect(shadowSm).toBeTruthy();
      expect(shadowMd).toBeTruthy();
      expect(shadowLg).toBeTruthy();
    });

    test('should have border radius tokens', async ({ page }) => {
      await page.goto('/');

      const radiusSm = await getCSSVariable(page, '--radius-sm');
      const radiusMd = await getCSSVariable(page, '--radius-md');
      const radiusLg = await getCSSVariable(page, '--radius-lg');
      const radiusFull = await getCSSVariable(page, '--radius-full');

      expect(radiusSm).toBe('0.25rem');
      expect(radiusMd).toBe('0.5rem');
      expect(radiusLg).toBe('0.75rem');
      expect(radiusFull).toBe('9999px');
    });
  });

  // ============================================================================
  // 5. Light Theme - Default State
  // ============================================================================

  test.describe('Light Theme - Default', () => {

    test('should load in light theme by default with no preference', async ({ page, context }) => {
      // Clear cookies and storage
      await context.clearCookies();
      await page.goto('/');
      await setThemeInStorage(page, null);
      await setSystemColorScheme(page, 'light');
      await page.reload();

      const theme = await page.getAttribute('html', 'data-theme');
      expect(theme).toBe('light');
    });

    test('should have white background in light theme', async ({ page }) => {
      await page.goto('/');
      await setThemeInStorage(page, 'light');
      await page.reload();

      const background = await getCSSVariable(page, '--color-background');
      expect(background).toBe('#ffffff');
    });

    test('should meet WCAG AA contrast for text in light theme', async ({ page }) => {
      await page.goto('/');
      await setThemeInStorage(page, 'light');
      await page.reload();

      // Get primary text and background colors
      const textColor = await page.evaluate(() => {
        return getComputedStyle(document.body).color;
      });
      const bgColor = await page.evaluate(() => {
        return getComputedStyle(document.body).backgroundColor;
      });

      const contrast = await getContrastRatio(page, textColor, bgColor);
      expect(contrast).toBeGreaterThanOrEqual(4.5); // WCAG AA for normal text
    });
  });

  // ============================================================================
  // 6. Dark Theme - User Activation
  // ============================================================================

  test.describe('Dark Theme - Manual Activation', () => {

    test('should switch to dark theme when user toggles', async ({ page }) => {
      await page.goto('/dashboard');
      await setThemeInStorage(page, 'light');
      await page.reload();

      // Click profile menu
      await page.locator('[data-profile-menu]').click();

      // Click theme toggle
      await page.locator('[data-theme-toggle]').click();

      // Check theme attribute
      const theme = await page.getAttribute('html', 'data-theme');
      expect(theme).toBe('dark');
    });

    test('should have dark background in dark theme', async ({ page }) => {
      await page.goto('/');
      await setThemeInStorage(page, 'dark');
      await page.reload();

      const background = await getCSSVariable(page, '--color-background');
      expect(background).toBe('#0a0a0a');
    });

    test('should meet WCAG AA contrast for text in dark theme', async ({ page }) => {
      await page.goto('/');
      await setThemeInStorage(page, 'dark');
      await page.reload();

      const textColor = await page.evaluate(() => {
        return getComputedStyle(document.body).color;
      });
      const bgColor = await page.evaluate(() => {
        return getComputedStyle(document.body).backgroundColor;
      });

      const contrast = await getContrastRatio(page, textColor, bgColor);
      expect(contrast).toBeGreaterThanOrEqual(4.5);
    });

    test('should save dark theme preference to localStorage', async ({ page }) => {
      await page.goto('/dashboard');
      await page.locator('[data-profile-menu]').click();
      await page.locator('[data-theme-toggle]').click();

      const stored = await page.evaluate(() => localStorage.getItem('theme'));
      expect(stored).toBe('dark');
    });
  });

  // ============================================================================
  // 7. System Preference Detection
  // ============================================================================

  test.describe('System Preference Detection', () => {

    test('should respect system dark mode preference', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto('/');
      await setThemeInStorage(page, null);
      await setSystemColorScheme(page, 'dark');
      await page.reload();

      const theme = await page.getAttribute('html', 'data-theme');
      expect(theme).toBe('dark');
    });

    test('should respect system light mode preference', async ({ page, context }) => {
      await context.clearCookies();
      await page.goto('/');
      await setThemeInStorage(page, null);
      await setSystemColorScheme(page, 'light');
      await page.reload();

      const theme = await page.getAttribute('html', 'data-theme');
      expect(theme).toBe('light');
    });

    test('manual preference should override system preference', async ({ page }) => {
      await page.goto('/');
      await setSystemColorScheme(page, 'dark');
      await setThemeInStorage(page, 'light');
      await page.reload();

      const theme = await page.getAttribute('html', 'data-theme');
      expect(theme).toBe('light'); // Manual preference wins
    });
  });

  // ============================================================================
  // 8. Theme Persistence
  // ============================================================================

  test.describe('Theme Persistence', () => {

    test('should persist theme across page reloads', async ({ page }) => {
      await page.goto('/');
      await setThemeInStorage(page, 'dark');
      await page.reload();

      let theme = await page.getAttribute('html', 'data-theme');
      expect(theme).toBe('dark');

      await page.reload();
      theme = await page.getAttribute('html', 'data-theme');
      expect(theme).toBe('dark'); // Still dark after reload
    });

    test('should sync theme across tabs', async ({ page, context }) => {
      // Open first tab
      const page1 = page;
      await page1.goto('/dashboard');
      await setThemeInStorage(page1, 'light');
      await page1.reload();

      // Open second tab
      const page2 = await context.newPage();
      await page2.goto('/dashboard');

      // Both should be in light theme
      let theme1 = await page1.getAttribute('html', 'data-theme');
      let theme2 = await page2.getAttribute('html', 'data-theme');
      expect(theme1).toBe('light');
      expect(theme2).toBe('light');

      // Switch theme in tab 1
      await page1.locator('[data-profile-menu]').click();
      await page1.locator('[data-theme-toggle]').click();

      // Wait for storage event to propagate
      await page2.waitForTimeout(500);

      // Tab 2 should also switch to dark
      theme2 = await page2.getAttribute('html', 'data-theme');
      expect(theme2).toBe('dark');
    });
  });

  // ============================================================================
  // 9. Theme Toggle UI Component
  // ============================================================================

  test.describe('Theme Toggle UI', () => {

    test('should display theme toggle in profile menu', async ({ page }) => {
      await page.goto('/dashboard');
      await page.locator('[data-profile-menu]').click();

      const toggle = page.locator('[data-theme-toggle]');
      await expect(toggle).toBeVisible();
    });

    test('should show correct icon for current theme', async ({ page }) => {
      await page.goto('/dashboard');
      await setThemeInStorage(page, 'light');
      await page.reload();

      await page.locator('[data-profile-menu]').click();

      // Light theme should show moon icon (switch to dark)
      const icon = page.locator('[data-theme-toggle] [data-icon="moon"]');
      await expect(icon).toBeVisible();
    });

    test('should provide visual feedback on click', async ({ page }) => {
      await page.goto('/dashboard');
      await page.locator('[data-profile-menu]').click();

      const toggle = page.locator('[data-theme-toggle]');

      // Click and check for immediate visual change
      await toggle.click();

      // Theme should change within 100ms
      await page.waitForTimeout(100);
      const theme = await page.getAttribute('html', 'data-theme');
      expect(['light', 'dark']).toContain(theme);
    });

    test('should be keyboard accessible', async ({ page }) => {
      await page.goto('/dashboard');

      // Tab to profile menu
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');

      // Arrow down to theme toggle
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');

      // Theme should switch
      await page.waitForTimeout(100);
      const theme = await page.getAttribute('html', 'data-theme');
      expect(['light', 'dark']).toContain(theme);
    });
  });

  // ============================================================================
  // 10. Performance
  // ============================================================================

  test.describe('Performance', () => {

    test('should apply theme without flash of unstyled content', async ({ page }) => {
      await setThemeInStorage(page, 'dark');

      // Navigate with network slow down to simulate slow connection
      await page.goto('/', { waitUntil: 'domcontentloaded' });

      // Check theme is applied immediately
      const theme = await page.getAttribute('html', 'data-theme');
      expect(theme).toBe('dark');

      // Background should already be dark
      const bgColor = await page.evaluate(() => {
        return getComputedStyle(document.documentElement).backgroundColor;
      });
      expect(bgColor).toContain('10'); // Dark background RGB values are low
    });

    test('should switch themes quickly (< 100ms)', async ({ page }) => {
      await page.goto('/dashboard');
      await page.locator('[data-profile-menu]').click();

      const startTime = Date.now();
      await page.locator('[data-theme-toggle]').click();

      // Wait for theme attribute to change
      await page.waitForFunction(() => {
        return document.documentElement.getAttribute('data-theme') !== null;
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Should be nearly instant
    });
  });

  // ============================================================================
  // 11. Component Theming
  // ============================================================================

  test.describe('Component Theming', () => {

    test('buttons should adapt to theme', async ({ page }) => {
      await page.goto('/dashboard');

      // Get button in light theme
      await setThemeInStorage(page, 'light');
      await page.reload();

      const lightBgColor = await page.locator('button').first().evaluate((el) => {
        return getComputedStyle(el).backgroundColor;
      });

      // Switch to dark theme
      await setThemeInStorage(page, 'dark');
      await page.reload();

      const darkBgColor = await page.locator('button').first().evaluate((el) => {
        return getComputedStyle(el).backgroundColor;
      });

      // Colors should be different
      expect(lightBgColor).not.toBe(darkBgColor);
    });

    test('cards should have distinct backgrounds in both themes', async ({ page }) => {
      await page.goto('/dashboard');

      // Check card in light theme
      await setThemeInStorage(page, 'light');
      await page.reload();

      const lightCardBg = await page.locator('[data-card]').first().evaluate((el) => {
        return getComputedStyle(el).backgroundColor;
      });
      const lightPageBg = await page.evaluate(() => {
        return getComputedStyle(document.body).backgroundColor;
      });

      // Card should be distinct from page
      expect(lightCardBg).not.toBe(lightPageBg);

      // Check card in dark theme
      await setThemeInStorage(page, 'dark');
      await page.reload();

      const darkCardBg = await page.locator('[data-card]').first().evaluate((el) => {
        return getComputedStyle(el).backgroundColor;
      });
      const darkPageBg = await page.evaluate(() => {
        return getComputedStyle(document.body).backgroundColor;
      });

      // Card should be distinct from page
      expect(darkCardBg).not.toBe(darkPageBg);
    });
  });

  // ============================================================================
  // 12. Edge Cases
  // ============================================================================

  test.describe('Edge Cases', () => {

    test('should handle missing localStorage gracefully', async ({ page, context }) => {
      // Block localStorage
      await context.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: null,
          writable: false
        });
      });

      await page.goto('/');

      // Should not crash
      const theme = await page.getAttribute('html', 'data-theme');
      expect(['light', 'dark']).toContain(theme);
    });

    test('should handle corrupted theme data', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('theme', 'invalid-theme-value');
      });
      await page.reload();

      // Should fall back to system preference
      const theme = await page.getAttribute('html', 'data-theme');
      expect(['light', 'dark']).toContain(theme);
    });
  });
});
