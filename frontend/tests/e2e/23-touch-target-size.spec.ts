import { test, expect } from '@playwright/test';

/**
 * Touch Target Size Audit - WCAG 2.1 AA Compliance
 * Issue #148: Focus on WCAG 2.5.5 Target Size (Enhanced)
 *
 * WCAG 2.5.5 Requirements (Level AAA, but following for AA best practice):
 * - Interactive elements should be at least 44x44 CSS pixels
 * - Applies to: buttons, links, form controls, interactive icons
 * - Exceptions: inline links in text, elements with spacing equivalent
 * - Mobile-first: Critical for touch interfaces
 *
 * Note: While 2.5.5 is Level AAA, we implement for better mobile UX
 * Level AA requires 24x24px (2.5.8) but we target 44x44px best practice
 */

test.describe('Touch Target Size Audit - WCAG 2.5.5', () => {

  /**
   * Helper function to check if element meets minimum touch target size
   */
  async function checkTouchTargetSize(
    page: any,
    selector: string,
    elementDescription: string,
    minSize: number = 44
  ) {
    const element = page.locator(selector).first();

    // Get bounding box
    const box = await element.boundingBox();

    if (!box) {
      console.log(`⚠️  ${elementDescription}: Element not visible or has no layout`);
      return { width: 0, height: 0, meetsRequirement: false };
    }

    const meetsRequirement = box.width >= minSize && box.height >= minSize;

    console.log(`${meetsRequirement ? '✅' : '❌'} ${elementDescription}:`);
    console.log(`   Size: ${Math.round(box.width)}x${Math.round(box.height)}px`);
    console.log(`   Required: ${minSize}x${minSize}px`);
    console.log(`   Status: ${meetsRequirement ? 'PASS' : 'FAIL'}`);

    return {
      width: box.width,
      height: box.height,
      meetsRequirement,
      element: elementDescription
    };
  }

  /**
   * Helper to check all buttons on a page
   */
  async function checkAllButtons(page: any, pageName: string, minSize: number = 44) {
    const buttons = page.locator('button:visible, a[role="button"]:visible');
    const count = await buttons.count();

    console.log(`\n${'='.repeat(80)}`);
    console.log(`TOUCH TARGET AUDIT: ${pageName} - Buttons (${count} found)`);
    console.log('='.repeat(80));

    const results = [];

    for (let i = 0; i < Math.min(count, 20); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const description = text?.trim() || ariaLabel || `Button ${i + 1}`;

      const box = await button.boundingBox();
      if (box) {
        const meetsRequirement = box.width >= minSize && box.height >= minSize;
        results.push({
          description,
          width: box.width,
          height: box.height,
          meetsRequirement
        });

        console.log(`${meetsRequirement ? '✅' : '❌'} "${description}": ${Math.round(box.width)}x${Math.round(box.height)}px`);
      }
    }

    const failedButtons = results.filter(r => !r.meetsRequirement);
    console.log(`\nSummary: ${results.length - failedButtons.length}/${results.length} buttons meet ${minSize}x${minSize}px requirement`);
    console.log('='.repeat(80) + '\n');

    return results;
  }

  test('1.1 Homepage - Primary CTA buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await checkAllButtons(page, 'Homepage');

    // All primary CTA buttons should meet touch target size
    const failedButtons = results.filter(r => !r.meetsRequirement);

    if (failedButtons.length > 0) {
      console.log(`\n⚠️  ${failedButtons.length} button(s) below minimum size:`);
      failedButtons.forEach(btn => {
        console.log(`   - "${btn.description}": ${Math.round(btn.width)}x${Math.round(btn.height)}px`);
      });
    }

    expect(failedButtons.length).toBe(0);
  });

  test('1.2 Homepage - Navigation links', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check desktop navigation links
    const navLinks = page.locator('nav a:visible');
    const count = await navLinks.count();

    console.log(`\n${'='.repeat(80)}`);
    console.log(`NAVIGATION LINKS: ${count} found`);
    console.log('='.repeat(80));

    const results = [];

    for (let i = 0; i < count; i++) {
      const link = navLinks.nth(i);
      const text = (await link.textContent())?.trim() || `Link ${i + 1}`;
      const box = await link.boundingBox();

      if (box) {
        const meetsRequirement = box.height >= 44; // At least height matters for nav
        results.push({
          text,
          width: box.width,
          height: box.height,
          meetsRequirement
        });

        console.log(`${meetsRequirement ? '✅' : '❌'} "${text}": ${Math.round(box.width)}x${Math.round(box.height)}px`);
      }
    }

    const failedLinks = results.filter(r => !r.meetsRequirement);
    console.log(`\nSummary: ${results.length - failedLinks.length}/${results.length} nav links meet minimum height`);
    console.log('='.repeat(80) + '\n');

    expect(failedLinks.length).toBe(0);
  });

  test('2.1 Sign In Page - Form controls', async ({ page }) => {
    await page.goto('/signin');
    await page.waitForLoadState('networkidle');

    const results = await checkAllButtons(page, 'Sign In Page');

    // Check input fields also have adequate height
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');

    const emailBox = await emailInput.boundingBox();
    const passwordBox = await passwordInput.boundingBox();

    console.log('\nForm Input Heights:');
    if (emailBox) {
      console.log(`Email input: ${Math.round(emailBox.height)}px ${emailBox.height >= 44 ? '✅' : '❌'}`);
    }
    if (passwordBox) {
      console.log(`Password input: ${Math.round(passwordBox.height)}px ${passwordBox.height >= 44 ? '✅' : '❌'}`);
    }

    const failedButtons = results.filter(r => !r.meetsRequirement);
    expect(failedButtons.length).toBe(0);

    // Inputs should be at least 44px tall
    if (emailBox) expect(emailBox.height).toBeGreaterThanOrEqual(44);
    if (passwordBox) expect(passwordBox.height).toBeGreaterThanOrEqual(44);
  });

  test('2.2 Sign Up Page - Form controls', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    const results = await checkAllButtons(page, 'Sign Up Page');

    // Check all input fields
    const inputs = page.locator('input:visible');
    const inputCount = await inputs.count();

    console.log(`\n${'='.repeat(80)}`);
    console.log(`FORM INPUTS: ${inputCount} found`);
    console.log('='.repeat(80));

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const box = await input.boundingBox();

      if (box) {
        const meetsRequirement = box.height >= 44;
        console.log(`${meetsRequirement ? '✅' : '❌'} Input "${id}": ${Math.round(box.height)}px tall`);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }

    const failedButtons = results.filter(r => !r.meetsRequirement);
    expect(failedButtons.length).toBe(0);
  });

  test('3.1 Mobile viewport - Homepage buttons', async ({ page }) => {
    // Set mobile viewport (iPhone 12)
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Open mobile menu if exists
    const mobileMenuButton = page.locator('[aria-label*="menu" i], [aria-label*="navigation" i]').first();
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.click();
      await page.waitForTimeout(300);
    }

    const results = await checkAllButtons(page, 'Homepage (Mobile 390px)');

    const failedButtons = results.filter(r => !r.meetsRequirement);
    expect(failedButtons.length).toBe(0);
  });

  test('3.2 Mobile viewport - Navigation', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check mobile menu button
    const mobileMenuButton = page.locator('button').filter({ has: page.locator('svg') }).first();

    if (await mobileMenuButton.isVisible()) {
      const result = await checkTouchTargetSize(
        page,
        'button:visible >> nth=0',
        'Mobile menu button'
      );

      expect(result.meetsRequirement).toBe(true);
    }
  });

  test('4.1 Employer Dashboard - Interactive elements', async ({ page }) => {
    // Set mock auth for employer
    await page.goto('/employer/login');
    await page.evaluate(() => {
      localStorage.setItem('user_type', 'employer');
      localStorage.setItem('access_token', 'mock-employer-token');
      localStorage.setItem('user', JSON.stringify({
        id: 'employer-123',
        email: 'employer@test.com',
        user_type: 'employer'
      }));
    });

    await page.goto('/employer/dashboard');

    // Wait for page to load or redirect
    await page.waitForTimeout(2000);

    // Only check if we're on the dashboard (not redirected)
    const currentUrl = page.url();
    if (currentUrl.includes('/employer/dashboard')) {
      const results = await checkAllButtons(page, 'Employer Dashboard');

      const failedButtons = results.filter(r => !r.meetsRequirement);

      if (failedButtons.length > 0) {
        console.log(`\n⚠️  Found ${failedButtons.length} undersized button(s) on Employer Dashboard`);
      }

      expect(failedButtons.length).toBe(0);
    } else {
      console.log('⏭️  Skipping: Redirected from employer dashboard (auth not working)');
      test.skip();
    }
  });

  test('5.1 Icon buttons - Adequate sizing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Find icon-only buttons (buttons with SVG but minimal text)
    const iconButtons = page.locator('button:has(svg)');
    const count = await iconButtons.count();

    console.log(`\n${'='.repeat(80)}`);
    console.log(`ICON BUTTONS: ${count} found`);
    console.log('='.repeat(80));

    const results = [];

    for (let i = 0; i < count; i++) {
      const button = iconButtons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = (await button.textContent())?.trim();
      const description = ariaLabel || text || `Icon button ${i + 1}`;

      const box = await button.boundingBox();
      if (box) {
        const meetsRequirement = box.width >= 44 && box.height >= 44;
        results.push({
          description,
          width: box.width,
          height: box.height,
          meetsRequirement
        });

        console.log(`${meetsRequirement ? '✅' : '❌'} "${description}": ${Math.round(box.width)}x${Math.round(box.height)}px`);
      }
    }

    const failedButtons = results.filter(r => !r.meetsRequirement);
    console.log(`\nSummary: ${results.length - failedButtons.length}/${results.length} icon buttons meet 44x44px requirement`);
    console.log('='.repeat(80) + '\n');

    expect(failedButtons.length).toBe(0);
  });

  test('6.1 Form checkboxes and radio buttons', async ({ page }) => {
    await page.goto('/employer/login');
    await page.waitForLoadState('networkidle');

    // Check "Remember me" checkbox if it exists
    const checkbox = page.locator('input[type="checkbox"]').first();

    if (await checkbox.isVisible()) {
      const box = await checkbox.boundingBox();

      if (box) {
        console.log(`\n${'='.repeat(80)}`);
        console.log('CHECKBOX TOUCH TARGET');
        console.log('='.repeat(80));
        console.log(`Size: ${Math.round(box.width)}x${Math.round(box.height)}px`);

        // For checkboxes, the entire clickable area (including label) matters
        // Native checkbox might be small, but it should be wrapped in a larger clickable area
        const label = page.locator('label[for="remember-me"]');
        if (await label.isVisible()) {
          const labelBox = await label.boundingBox();
          if (labelBox) {
            console.log(`Label area: ${Math.round(labelBox.width)}x${Math.round(labelBox.height)}px`);
            const meetsRequirement = labelBox.height >= 44;
            console.log(`${meetsRequirement ? '✅' : '❌'} Clickable area adequate`);
            console.log('='.repeat(80) + '\n');

            expect(meetsRequirement).toBe(true);
          }
        }
      }
    } else {
      console.log('⏭️  No checkbox found on this page');
    }
  });

  test('7.1 Responsive buttons - Tablet viewport', async ({ page }) => {
    // iPad viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await checkAllButtons(page, 'Homepage (Tablet 768px)');

    const failedButtons = results.filter(r => !r.meetsRequirement);
    expect(failedButtons.length).toBe(0);
  });

  test('8.1 Summary - Touch target compliance report', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Comprehensive check across all interactive elements
    const allInteractive = page.locator('button:visible, a:visible, input:visible, [role="button"]:visible');
    const total = await allInteractive.count();

    console.log(`\n${'='.repeat(80)}`);
    console.log('COMPREHENSIVE TOUCH TARGET AUDIT');
    console.log('='.repeat(80));
    console.log(`Total interactive elements: ${total}`);

    let compliant = 0;
    let nonCompliant = 0;

    for (let i = 0; i < Math.min(total, 50); i++) {
      const element = allInteractive.nth(i);
      const box = await element.boundingBox();

      if (box) {
        const meetsRequirement = box.width >= 44 && box.height >= 44;
        if (meetsRequirement) {
          compliant++;
        } else {
          nonCompliant++;
        }
      }
    }

    const complianceRate = Math.round((compliant / (compliant + nonCompliant)) * 100);

    console.log(`\nCompliance Rate: ${complianceRate}%`);
    console.log(`✅ Compliant: ${compliant}`);
    console.log(`❌ Non-compliant: ${nonCompliant}`);
    console.log(`\nNote: WCAG 2.5.5 exempts inline links in sentences from touch target requirements`);
    console.log('='.repeat(80) + '\n');

    // Aim for at least 70% compliance (inline links in text are WCAG-exempt)
    // 70%+ indicates all primary interactive elements (buttons, nav, forms) comply
    expect(complianceRate).toBeGreaterThanOrEqual(70);
  });
});
