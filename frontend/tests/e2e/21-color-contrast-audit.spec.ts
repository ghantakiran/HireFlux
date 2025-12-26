import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Color Contrast Audit - WCAG 2.1 AA Compliance
 * Issue #148: Focus on WCAG 1.4.3 Contrast (Minimum)
 *
 * WCAG 1.4.3 Requirements:
 * - Normal text (< 18pt or < 14pt bold): 4.5:1 contrast ratio
 * - Large text (≥ 18pt or ≥ 14pt bold): 3:1 contrast ratio
 * - UI components and graphical objects: 3:1 contrast ratio
 *
 * This test specifically checks for color contrast violations
 * across all major pages.
 */

test.describe('Color Contrast Audit - WCAG 1.4.3', () => {

  /**
   * Helper function to run axe-core scan for color contrast only
   */
  async function runColorContrastScan(page: any, pageName: string) {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa', 'wcag143'])
      .withRules(['color-contrast'])
      // Exclude Next.js error overlay (dev-only, not in production)
      .exclude('nextjs-portal')
      .exclude('[data-nextjs-dialog-overlay]')
      .exclude('[data-nextjs-toast]')
      .analyze();

    console.log('\n' + '='.repeat(80));
    console.log(`COLOR CONTRAST SCAN: ${pageName}`);
    console.log('='.repeat(80));

    const contrastViolations = results.violations.filter(v => v.id === 'color-contrast');

    console.log(`Total Contrast Violations: ${contrastViolations.length}`);

    if (contrastViolations.length > 0) {
      contrastViolations.forEach((violation, index) => {
        console.log(`\nViolation #${index + 1}: ${violation.id}`);
        console.log(`Impact: ${violation.impact?.toUpperCase()}`);
        console.log(`Description: ${violation.description}`);
        console.log(`Help: ${violation.help}`);
        console.log(`Help URL: ${violation.helpUrl}`);
        console.log(`Affected Elements (${violation.nodes.length}):`);

        violation.nodes.forEach((node, nodeIndex) => {
          console.log(`  ${nodeIndex + 1}. ${node.html.substring(0, 100)}${node.html.length > 100 ? '...' : ''}`);
          console.log(`     Target: ${node.target.join(' > ')}`);
          console.log(`     Failure Summary: ${node.failureSummary}`);

          // Extract contrast ratios if available
          if (node.any && node.any.length > 0) {
            node.any.forEach(check => {
              if (check.data && check.data.contrastRatio) {
                console.log(`     Actual Contrast: ${check.data.contrastRatio}`);
                console.log(`     Expected: ${check.data.expectedContrastRatio || '4.5:1 (normal text)'}`);
                console.log(`     Foreground: ${check.data.fgColor}`);
                console.log(`     Background: ${check.data.bgColor}`);
              }
            });
          }
        });
        console.log('-'.repeat(80));
      });
    } else {
      console.log('✅ No color contrast violations found!');
    }
    console.log('='.repeat(80) + '\n');

    return contrastViolations;
  }

  test('1.1 Homepage - Color Contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const violations = await runColorContrastScan(page, 'Homepage');

    // Document violations but don't fail yet - this is the RED phase
    if (violations.length > 0) {
      console.log(`\n⚠️  Found ${violations.length} color contrast violation(s) on Homepage`);
      console.log('📝 Documenting for fix in GREEN phase...\n');
    }

    expect(violations.length).toBe(0);
  });

  test('1.2 Sign In Page - Color Contrast', async ({ page }) => {
    await page.goto('/signin');
    await page.waitForLoadState('networkidle');

    const violations = await runColorContrastScan(page, 'Sign In');
    expect(violations.length).toBe(0);
  });

  test('1.3 Sign Up Page - Color Contrast', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    const violations = await runColorContrastScan(page, 'Sign Up');
    expect(violations.length).toBe(0);
  });

  test('1.4 Pricing Page - Color Contrast', async ({ page }) => {
    await page.goto('/pricing');
    await page.waitForLoadState('networkidle');

    const violations = await runColorContrastScan(page, 'Pricing');
    expect(violations.length).toBe(0);
  });

  test('1.5 Employer Login - Color Contrast', async ({ page }) => {
    await page.goto('/employer/login');
    await page.waitForLoadState('networkidle');

    const violations = await runColorContrastScan(page, 'Employer Login');
    expect(violations.length).toBe(0);
  });

  test('1.6 Employer Register - Color Contrast', async ({ page }) => {
    await page.goto('/employer/register');
    await page.waitForLoadState('networkidle');

    const violations = await runColorContrastScan(page, 'Employer Register');
    expect(violations.length).toBe(0);
  });

  // Test key UI components
  test('2.1 Buttons - Color Contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Focus on button elements specifically
    const results = await new AxeBuilder({ page })
      .include('button')
      .withRules(['color-contrast'])
      .analyze();

    const violations = results.violations.filter(v => v.id === 'color-contrast');

    if (violations.length > 0) {
      console.log(`\n⚠️  Found ${violations.length} button color contrast violation(s)`);
      violations.forEach(v => {
        v.nodes.forEach(node => {
          console.log(`   - ${node.html.substring(0, 80)}`);
        });
      });
    }

    expect(violations.length).toBe(0);
  });

  test('2.2 Links - Color Contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Focus on link elements specifically
    const results = await new AxeBuilder({ page })
      .include('a')
      .withRules(['color-contrast'])
      .analyze();

    const violations = results.violations.filter(v => v.id === 'color-contrast');

    if (violations.length > 0) {
      console.log(`\n⚠️  Found ${violations.length} link color contrast violation(s)`);
      violations.forEach(v => {
        v.nodes.forEach(node => {
          console.log(`   - ${node.html.substring(0, 80)}`);
        });
      });
    }

    expect(violations.length).toBe(0);
  });
});
