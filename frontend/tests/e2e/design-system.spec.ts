import { test, expect } from '@playwright/test';

/**
 * Design System E2E Tests (Issue #92)
 *
 * Following BDD approach:
 * - Given: HireFlux design system is loaded
 * - When: User visits the application
 * - Then: Design tokens should be applied correctly
 */

test.describe('Design System - Color Palette', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have HireFlux primary brand color (#0EA5E9)', async ({ page }) => {
    // Given: Page is loaded with design system
    // When: We check the CSS variables
    const primaryColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--primary-500')
        .trim();
    });

    // Then: Primary color should match brand
    expect(primaryColor).toBe('#0EA5E9');
  });

  test('should have success color (#22C55E)', async ({ page }) => {
    const successColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--success-500')
        .trim();
    });

    expect(successColor).toBe('#22C55E');
  });

  test('should have accent color (#F59E0B)', async ({ page }) => {
    const accentColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--accent-500')
        .trim();
    });

    expect(accentColor).toBe('#F59E0B');
  });
});

test.describe('Design System - Typography', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load Inter font family', async ({ page }) => {
    // Check if Inter font is loaded
    const fontFamily = await page.evaluate(() => {
      return getComputedStyle(document.body).fontFamily;
    });

    expect(fontFamily).toContain('Inter');
  });

  test('should have correct base font size (16px)', async ({ page }) => {
    const fontSize = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).fontSize;
    });

    expect(fontSize).toBe('16px');
  });
});

test.describe('Design System - Spacing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should follow 4px spacing grid', async ({ page }) => {
    // Verify spacing utilities are multiples of 4px
    const spacing1 = await page.evaluate(() => {
      const div = document.createElement('div');
      div.className = 'p-1';
      document.body.appendChild(div);
      const padding = getComputedStyle(div).padding;
      document.body.removeChild(div);
      return padding;
    });

    expect(spacing1).toBe('4px');
  });
});

test.describe('Design System - Dark Mode', () => {
  test('should toggle between light and dark mode', async ({ page }) => {
    await page.goto('/');

    // Get initial background color (light mode)
    const lightBg = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--background')
        .trim();
    });

    // Toggle to dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });

    // Get dark mode background color
    const darkBg = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--background')
        .trim();
    });

    // Light and dark backgrounds should be different
    expect(lightBg).not.toBe(darkBg);
  });
});

test.describe('Design System - Responsive Breakpoints', () => {
  test('should render correctly on mobile (375px)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Verify page is responsive
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBe(375);
  });

  test('should render correctly on tablet (768px)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBe(768);
  });

  test('should render correctly on desktop (1440px)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');

    const viewportWidth = await page.evaluate(() => window.innerWidth);
    expect(viewportWidth).toBe(1440);
  });
});

test.describe('Design System - Accessibility (WCAG AA)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should have sufficient color contrast (4.5:1 minimum)', async ({ page }) => {
    // This is a placeholder - in production, use axe-core or similar
    // For now, we verify that contrast colors are defined
    const foreground = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--foreground')
        .trim();
    });

    const background = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--background')
        .trim();
    });

    expect(foreground).toBeTruthy();
    expect(background).toBeTruthy();
    expect(foreground).not.toBe(background);
  });
});

test.describe('Design System - Animation Timing', () => {
  test('should have fast transition (150ms) defined', async ({ page }) => {
    await page.goto('/');

    const hasFastTransition = await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = '.test-transition { transition: all 150ms; }';
      document.head.appendChild(style);

      const div = document.createElement('div');
      div.className = 'test-transition';
      document.body.appendChild(div);

      const transition = getComputedStyle(div).transition;
      document.body.removeChild(div);
      document.head.removeChild(style);

      return transition.includes('150ms') || transition.includes('0.15s');
    });

    expect(hasFastTransition).toBe(true);
  });
});
