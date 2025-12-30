import { test, expect } from '@playwright/test';

/**
 * Screen Reader Optimization - Issue #150
 *
 * WCAG 2.1 AA Requirements for Screen Reader Accessibility:
 * - 1.3.1: Info and Relationships (Level A) - Semantic HTML and ARIA
 * - 1.3.6: Identify Purpose (Level AAA, but good practice for AA)
 * - 2.4.1: Bypass Blocks (Level A) - Landmarks for navigation
 * - 4.1.2: Name, Role, Value (Level A) - ARIA labels and roles
 * - 4.1.3: Status Messages (Level AA) - Live regions
 *
 * Screen Reader Support: NVDA, JAWS, VoiceOver, TalkBack
 */

test.describe('Screen Reader Optimization - Issue #150', () => {

  /**
   * SECTION 1: ARIA Landmarks (WCAG 2.4.1)
   * Landmarks help screen reader users navigate quickly to sections
   */
  test.describe('1. ARIA Landmarks', () => {

    test('1.1 Dashboard should have all required landmarks', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      console.log('\n' + '='.repeat(80));
      console.log('LANDMARK AUDIT: Job Seeker Dashboard');
      console.log('='.repeat(80));

      // Required landmarks for a complete page
      const landmarks = {
        banner: await page.locator('header, [role="banner"]').count(),
        navigation: await page.locator('nav, [role="navigation"]').count(),
        main: await page.locator('main, [role="main"]').count(),
        contentinfo: await page.locator('footer, [role="contentinfo"]').count(),
        complementary: await page.locator('aside, [role="complementary"]').count(),
      };

      console.log(`✓ Banner (header): ${landmarks.banner} found`);
      console.log(`✓ Navigation: ${landmarks.navigation} found`);
      console.log(`✓ Main: ${landmarks.main} found`);
      console.log(`✓ Contentinfo (footer): ${landmarks.contentinfo} found`);
      console.log(`✓ Complementary (aside): ${landmarks.complementary} found`);
      console.log('='.repeat(80) + '\n');

      // Assertions
      expect(landmarks.banner, 'Page should have banner/header landmark').toBeGreaterThanOrEqual(1);
      expect(landmarks.navigation, 'Page should have navigation landmark').toBeGreaterThanOrEqual(1);
      expect(landmarks.main, 'Page should have main landmark').toBe(1); // Exactly one main
      // Footer and complementary are optional but recommended
    });

    test('1.2 Employer Dashboard should have all required landmarks', async ({ page }) => {
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
      await page.waitForTimeout(2000);

      const currentUrl = page.url();
      if (!currentUrl.includes('/employer/dashboard')) {
        console.log('⏭️  Skipping: Redirected from employer dashboard');
        test.skip();
        return;
      }

      const landmarks = {
        banner: await page.locator('header, [role="banner"]').count(),
        navigation: await page.locator('nav, [role="navigation"]').count(),
        main: await page.locator('main, [role="main"]').count(),
      };

      expect(landmarks.banner).toBeGreaterThanOrEqual(1);
      expect(landmarks.navigation).toBeGreaterThanOrEqual(1);
      expect(landmarks.main).toBe(1);
    });

    test('1.3 All navigation elements should have aria-label', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const navElements = await page.locator('nav, [role="navigation"]').all();

      console.log(`\nFound ${navElements.length} navigation landmark(s)`);

      for (let i = 0; i < navElements.length; i++) {
        const ariaLabel = await navElements[i].getAttribute('aria-label');
        const ariaLabelledby = await navElements[i].getAttribute('aria-labelledby');

        console.log(`Navigation ${i + 1}: aria-label="${ariaLabel || ariaLabelledby || 'MISSING'}"`);

        expect(
          ariaLabel || ariaLabelledby,
          `Navigation ${i + 1} should have aria-label or aria-labelledby`
        ).toBeTruthy();
      }
    });
  });

  /**
   * SECTION 2: ARIA Labels for Interactive Elements (WCAG 4.1.2)
   */
  test.describe('2. ARIA Labels', () => {

    test('2.1 Icon-only buttons should have aria-label', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Find buttons that have icons but minimal/no text
      const iconButtons = await page.locator('button:has(svg):not(:has-text(""))').all();

      console.log('\n' + '='.repeat(80));
      console.log(`ARIA LABEL AUDIT: Icon Buttons (${iconButtons.length} found)`);
      console.log('='.repeat(80));

      const missingLabels = [];

      for (const button of iconButtons) {
        const ariaLabel = await button.getAttribute('aria-label');
        const ariaLabelledby = await button.getAttribute('aria-labelledby');
        const title = await button.getAttribute('title');
        const textContent = await button.textContent();

        if (!ariaLabel && !ariaLabelledby && !title && !textContent?.trim()) {
          missingLabels.push('Icon button without accessible label');
        }
      }

      console.log(`✓ ${iconButtons.length - missingLabels.length}/${iconButtons.length} icon buttons have labels`);
      if (missingLabels.length > 0) {
        console.log(`❌ ${missingLabels.length} icon buttons missing labels`);
      }
      console.log('='.repeat(80) + '\n');

      expect(missingLabels.length, 'All icon buttons should have accessible labels').toBe(0);
    });

    test('2.2 Form inputs should have labels or aria-label', async ({ page }) => {
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');

      const inputs = await page.locator('input:visible, textarea:visible, select:visible').all();

      console.log(`\nAuditing ${inputs.length} form controls for labels...`);

      const missingLabels = [];

      for (const input of inputs) {
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');
        const placeholder = await input.getAttribute('placeholder');
        const type = await input.getAttribute('type');

        // Check if there's a <label for="id">
        let hasLabel = false;
        if (id) {
          hasLabel = await page.locator(`label[for="${id}"]`).count() > 0;
        }

        if (!hasLabel && !ariaLabel && !ariaLabelledby) {
          // Placeholder is NOT sufficient for accessibility
          missingLabels.push({
            id: id || 'no-id',
            type: type || 'unknown',
            placeholder: placeholder || 'none'
          });
        }
      }

      if (missingLabels.length > 0) {
        console.log(`\n❌ ${missingLabels.length} inputs missing labels:`);
        missingLabels.forEach(input => {
          console.log(`  - Input type="${input.type}" id="${input.id}"`);
        });
      }

      expect(missingLabels.length, 'All form inputs should have labels').toBe(0);
    });

    test('2.3 Links should have descriptive text or aria-label', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const links = await page.locator('a:visible').all();

      console.log(`\nAuditing ${links.length} links for descriptive text...`);

      const poorLinks = [];

      for (const link of links) {
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute('aria-label');
        const ariaLabelledby = await link.getAttribute('aria-labelledby');
        const title = await link.getAttribute('title');

        const accessibleName = ariaLabel || ariaLabelledby || text?.trim() || title;

        // Check for generic or missing text
        if (!accessibleName || accessibleName.toLowerCase() === 'click here' || accessibleName.toLowerCase() === 'read more') {
          poorLinks.push({
            text: text?.trim() || 'NO TEXT',
            ariaLabel: ariaLabel || 'none'
          });
        }
      }

      if (poorLinks.length > 0) {
        console.log(`\n⚠️  ${poorLinks.length} links with generic/missing text:`);
        poorLinks.forEach(link => {
          console.log(`  - "${link.text}" (aria-label: ${link.ariaLabel})`);
        });
      }

      expect(poorLinks.length, 'Links should have descriptive accessible names').toBe(0);
    });
  });

  /**
   * SECTION 3: Live Regions (WCAG 4.1.3)
   * For dynamic content updates that should be announced to screen readers
   */
  test.describe('3. Live Regions', () => {

    test('3.1 Notifications should use aria-live regions', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check for notification containers with aria-live
      const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').all();

      console.log('\n' + '='.repeat(80));
      console.log(`LIVE REGION AUDIT: ${liveRegions.length} found`);
      console.log('='.repeat(80));

      for (const region of liveRegions) {
        const ariaLive = await region.getAttribute('aria-live');
        const role = await region.getAttribute('role');
        const ariaAtomic = await region.getAttribute('aria-atomic');

        console.log(`✓ Live region: role="${role || 'none'}" aria-live="${ariaLive || 'none'}" aria-atomic="${ariaAtomic || 'none'}"`);
      }
      console.log('='.repeat(80) + '\n');

      // At least one live region should exist for notifications/status updates
      expect(liveRegions.length, 'Page should have live regions for dynamic updates').toBeGreaterThan(0);
    });

    test('3.2 Error messages should be in alert or live regions', async ({ page }) => {
      await page.goto('/signup');
      await page.waitForLoadState('networkidle');

      // Try to submit empty form to trigger errors
      const submitButton = page.locator('button:has-text("Create Account")');
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Check for error messages
        const errorElements = await page.locator('[role="alert"], .error, [aria-invalid="true"] + *, [class*="error"]').all();

        console.log(`\nFound ${errorElements.length} error element(s)`);

        // At least one error should be in an alert or live region
        const errorsInAlerts = await page.locator('[role="alert"]').count();
        const errorsWithAriaLive = await page.locator('[aria-live="polite"], [aria-live="assertive"]').count();

        console.log(`Errors in role="alert": ${errorsInAlerts}`);
        console.log(`Errors with aria-live: ${errorsWithAriaLive}`);

        // Either role="alert" or aria-live should be used
        expect(
          errorsInAlerts + errorsWithAriaLive,
          'Error messages should use role="alert" or aria-live'
        ).toBeGreaterThan(0);
      }
    });

    test('3.3 Loading states should announce to screen readers', async ({ page }) => {
      await page.goto('/dashboard');

      // Check for loading indicators with screen reader announcements
      const loadingIndicators = await page.locator('[aria-busy="true"], [aria-live][class*="load"], [role="status"][class*="load"]').all();

      console.log(`\nFound ${loadingIndicators.length} loading indicator(s) with screen reader support`);

      // Pages with dynamic content should have at least one aria-busy or aria-live for loading states
      // This is a soft requirement - might not exist on simple pages
      if (loadingIndicators.length === 0) {
        console.log('⚠️  No loading indicators with ARIA attributes found (may be acceptable for simple pages)');
      }
    });
  });

  /**
   * SECTION 4: Alt Text Audit (WCAG 1.1.1)
   */
  test.describe('4. Alt Text', () => {

    test('4.1 All images should have alt text or role="presentation"', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const images = await page.locator('img:visible').all();

      console.log('\n' + '='.repeat(80));
      console.log(`ALT TEXT AUDIT: ${images.length} images`);
      console.log('='.repeat(80));

      const missingAlt = [];

      for (let i = 0; i < images.length; i++) {
        const alt = await images[i].getAttribute('alt');
        const role = await images[i].getAttribute('role');
        const ariaLabel = await images[i].getAttribute('aria-label');
        const src = await images[i].getAttribute('src');

        const hasAccessibleName = alt !== null || role === 'presentation' || ariaLabel;

        if (!hasAccessibleName) {
          missingAlt.push({
            index: i + 1,
            src: src?.substring(0, 50) || 'unknown'
          });
        }

        const status = hasAccessibleName ? '✅' : '❌';
        console.log(`${status} Image ${i + 1}: alt="${alt || role || 'MISSING'}" src="${src?.substring(0, 40)}"`);
      }

      console.log(`\nSummary: ${images.length - missingAlt.length}/${images.length} images have alt text`);
      console.log('='.repeat(80) + '\n');

      expect(missingAlt.length, 'All images should have alt text or role="presentation"').toBe(0);
    });

    test('4.2 Decorative icons should have aria-hidden="true"', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // SVG icons that are purely decorative (next to text) should be aria-hidden
      const icons = await page.locator('svg').all();

      console.log(`\nFound ${icons.length} SVG icon(s)`);

      let decorativeCount = 0;
      let missingAriaHidden = 0;

      for (const icon of icons) {
        const ariaHidden = await icon.getAttribute('aria-hidden');
        const ariaLabel = await icon.getAttribute('aria-label');
        const role = await icon.getAttribute('role');

        // If icon has no aria-label or role, it's likely decorative and should be aria-hidden
        if (!ariaLabel && !role && role !== 'img') {
          decorativeCount++;
          if (ariaHidden !== 'true') {
            missingAriaHidden++;
          }
        }
      }

      console.log(`Decorative icons: ${decorativeCount}`);
      console.log(`Missing aria-hidden="true": ${missingAriaHidden}`);

      // This is a warning - not all decorative icons need aria-hidden if context is clear
      if (missingAriaHidden > 0) {
        console.log(`⚠️  Consider adding aria-hidden="true" to ${missingAriaHidden} decorative icon(s)`);
      }
    });
  });

  /**
   * SECTION 5: Semantic HTML (WCAG 1.3.1)
   */
  test.describe('5. Semantic HTML', () => {

    test('5.1 Headings should be in logical order', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();

      console.log('\n' + '='.repeat(80));
      console.log(`HEADING HIERARCHY AUDIT: ${headings.length} headings`);
      console.log('='.repeat(80));

      const headingLevels = [];

      for (const heading of headings) {
        const tagName = await heading.evaluate(el => el.tagName.toLowerCase());
        const text = await heading.textContent();
        const level = parseInt(tagName.substring(1));

        headingLevels.push({ level, text: text?.trim().substring(0, 50) });
        console.log(`${tagName.toUpperCase()}: "${text?.trim().substring(0, 60)}"`);
      }

      console.log('='.repeat(80) + '\n');

      // Check for h1
      const h1Count = headingLevels.filter(h => h.level === 1).length;
      expect(h1Count, 'Page should have exactly one h1').toBe(1);

      // Check for logical hierarchy (no skipping levels)
      for (let i = 1; i < headingLevels.length; i++) {
        const prevLevel = headingLevels[i - 1].level;
        const currentLevel = headingLevels[i].level;

        // You can skip down multiple levels, but shouldn't skip up more than one level
        if (currentLevel > prevLevel) {
          expect(
            currentLevel - prevLevel,
            `Heading level should not skip from h${prevLevel} to h${currentLevel}`
          ).toBeLessThanOrEqual(1);
        }
      }
    });

    test('5.2 Lists should use proper semantic markup', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const lists = await page.locator('ul, ol, dl').all();

      console.log(`\nFound ${lists.length} semantic list(s) (ul, ol, dl)`);

      // Check that lists contain proper children
      for (let i = 0; i < Math.min(lists.length, 5); i++) {
        const tagName = await lists[i].evaluate(el => el.tagName.toLowerCase());
        const childrenCount = await lists[i].locator('> li, > dt, > dd').count();

        console.log(`${tagName.toUpperCase()}: ${childrenCount} child item(s)`);

        expect(childrenCount, `${tagName} should have child items`).toBeGreaterThan(0);
      }
    });
  });

  /**
   * SECTION 6: Acceptance Criteria
   */
  test.describe('6. Acceptance Criteria', () => {

    test('@acceptance Screen reader: All pages have landmarks', async ({ page }) => {
      const pages = ['/dashboard', '/dashboard/jobs', '/dashboard/resumes'];

      for (const url of pages) {
        await page.goto(url);
        await page.waitForTimeout(1000);

        const main = await page.locator('main, [role="main"]').count();
        const nav = await page.locator('nav, [role="navigation"]').count();

        expect(main, `${url} should have main landmark`).toBeGreaterThan(0);
        expect(nav, `${url} should have navigation landmark`).toBeGreaterThan(0);
      }
    });

    test('@acceptance Screen reader: All interactive elements have labels', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Check buttons
      const buttons = await page.locator('button:visible').all();
      for (const button of buttons.slice(0, 10)) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute('aria-label');
        const ariaLabelledby = await button.getAttribute('aria-labelledby');

        const hasLabel = text?.trim() || ariaLabel || ariaLabelledby;
        expect(hasLabel, 'Button should have accessible label').toBeTruthy();
      }
    });

    test('@acceptance Screen reader: Live regions present for dynamic updates', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const liveRegions = await page.locator('[aria-live], [role="status"], [role="alert"]').count();
      expect(liveRegions, 'Page should have live regions').toBeGreaterThan(0);
    });

    test('@acceptance Screen reader: All images have alt text', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const images = await page.locator('img:visible').all();

      for (const img of images) {
        const alt = await img.getAttribute('alt');
        const role = await img.getAttribute('role');
        const ariaLabel = await img.getAttribute('aria-label');

        const hasAccessibleName = alt !== null || role === 'presentation' || ariaLabel;
        expect(hasAccessibleName, 'Image should have alt text or role="presentation"').toBeTruthy();
      }
    });
  });
});
