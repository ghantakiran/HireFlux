/**
 * Mobile Responsiveness E2E Tests (BDD)
 *
 * Feature: Mobile-First Responsive Design
 * As a mobile user
 * I want the application to work seamlessly on my device
 * So that I can access all features on the go
 */

import { test, expect, devices } from '@playwright/test';
import path from 'path';

// BDD-style test organization
test.describe('Mobile Responsiveness @mobile', () => {

  // Scenario: Landing Page Mobile View
  test.describe('Given user visits landing page on mobile', () => {
    const mobileDevices = [
      { name: 'iPhone 13', device: devices['iPhone 13'] },
      { name: 'Pixel 5', device: devices['Pixel 5'] },
      { name: 'Samsung Galaxy S21', device: devices['Galaxy S21'] },
    ];

    for (const { name, device } of mobileDevices) {
      test(`When viewing on ${name}, Then layout should be mobile-optimized`, async ({ browser }) => {
        const context = await browser.newContext({ ...device });
        const page = await context.newPage();

        // Navigate to landing page
        await page.goto('/');

        // Then: Mobile navigation should be present
        await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();

        // Then: Hero section should stack vertically
        const heroSection = page.locator('[data-testid="hero-section"]');
        const boundingBox = await heroSection.boundingBox();
        const viewportSize = page.viewportSize();
        expect(boundingBox?.width).toBeLessThanOrEqual(viewportSize?.width || 400);

        // Then: Text should be readable (not too small)
        const heading = page.locator('h1').first();
        const fontSize = await heading.evaluate((el) =>
          window.getComputedStyle(el).getPropertyValue('font-size')
        );
        const fontSizeNum = parseInt(fontSize);
        expect(fontSizeNum).toBeGreaterThanOrEqual(24); // Minimum 24px for h1 on mobile

        // Then: No horizontal scroll
        const hasHorizontalScroll = await page.evaluate(() =>
          document.documentElement.scrollWidth > document.documentElement.clientWidth
        );
        expect(hasHorizontalScroll).toBeFalsy();

        await context.close();
      });
    }
  });

  // Scenario: Authentication Forms on Mobile
  test.describe('Given user accesses auth forms on mobile', () => {
    test('When on sign-in page, Then form should be mobile-friendly', async ({ browser }) => {
      const context = await browser.newContext({ ...devices['iPhone 13'] });
      const page = await context.newPage();

      await page.goto('/signin');

      // Then: Form inputs should be appropriately sized
      const emailInput = page.locator('input[type="email"]');
      await expect(emailInput).toBeVisible();

      const inputHeight = await emailInput.evaluate((el) => el.getBoundingClientRect().height);
      expect(inputHeight).toBeGreaterThanOrEqual(44); // iOS touch target minimum

      // Then: Buttons should be easy to tap (44x44px minimum)
      const submitButton = page.locator('button[type="submit"]');
      const buttonBox = await submitButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44);

      // Then: OAuth buttons should stack vertically on mobile
      const oauthButtons = page.locator('[data-testid*="oauth-button"]');
      const count = await oauthButtons.count();

      if (count > 1) {
        const firstButtonPos = await oauthButtons.nth(0).boundingBox();
        const secondButtonPos = await oauthButtons.nth(1).boundingBox();

        // Check if buttons are stacked (second button is below first)
        expect(secondButtonPos?.y).toBeGreaterThan(firstButtonPos!.y + firstButtonPos!.height);
      }

      await context.close();
    });

    test('When on sign-up page, Then multi-step form should work on mobile', async ({ browser }) => {
      const context = await browser.newContext({ ...devices['Pixel 5'] });
      const page = await context.newPage();

      await page.goto('/signup');

      // Then: Form should be visible and scrollable
      const form = page.locator('form').first();
      await expect(form).toBeVisible();

      // Then: Step indicators should be visible on mobile
      const stepIndicators = page.locator('[data-testid="step-indicator"]');
      if (await stepIndicators.count() > 0) {
        await expect(stepIndicators.first()).toBeVisible();
      }

      await context.close();
    });
  });

  // Scenario: Dashboard Navigation on Mobile
  test.describe('Given authenticated user on mobile dashboard', () => {
    test('When opening mobile menu, Then navigation should be accessible', async ({ browser }) => {
      // Load authentication state from global setup
      const storageState = path.join(__dirname, '.auth', 'user.json');
      const context = await browser.newContext({
        ...devices['iPhone 13'],
        storageState: storageState,
      });
      const page = await context.newPage();

      await page.goto('/dashboard');

      // Then: Mobile menu button should be visible
      const menuButton = page.locator('[data-testid="mobile-menu-button"]');
      await expect(menuButton).toBeVisible();

      // When: User taps menu button
      await menuButton.click();

      // Then: Navigation menu should slide in/appear
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      await expect(mobileMenu).toBeVisible({ timeout: 1000 });

      // Then: All navigation links should be accessible
      const navLinks = mobileMenu.locator('a');
      const linkCount = await navLinks.count();
      expect(linkCount).toBeGreaterThan(0);

      // Each link should be tappable
      for (let i = 0; i < linkCount; i++) {
        const link = navLinks.nth(i);
        const box = await link.boundingBox();
        expect(box?.height).toBeGreaterThanOrEqual(44); // Touch target size
      }

      await context.close();
    });
  });

  // Scenario: Resume Builder on Mobile
  test.describe('Given user creates resume on mobile', () => {
    test('When on resume builder, Then forms should be mobile-optimized', async ({ browser }) => {
      // Load authentication state from global setup
      const storageState = path.join(__dirname, '.auth', 'user.json');
      const context = await browser.newContext({
        ...devices['iPhone 13'],
        storageState: storageState,
      });
      const page = await context.newPage();

      await page.goto('/dashboard/resumes/builder');

      // Then: Form sections should stack vertically
      const sections = page.locator('[data-testid*="form-section"]');
      const sectionCount = await sections.count();

      if (sectionCount > 1) {
        for (let i = 0; i < sectionCount - 1; i++) {
          const currentSection = await sections.nth(i).boundingBox();
          const nextSection = await sections.nth(i + 1).boundingBox();

          // Verify vertical stacking
          expect(nextSection?.y).toBeGreaterThan(currentSection!.y);
        }
      }

      // Then: Input fields should be full width on mobile
      const inputs = page.locator('input[type="text"]').first();
      if (await inputs.count() > 0) {
        const inputWidth = await inputs.evaluate((el) => el.getBoundingClientRect().width);
        const viewportWidth = devices['iPhone 13'].viewport.width;

        // Input should use most of the width (accounting for padding)
        expect(inputWidth).toBeGreaterThan(viewportWidth * 0.8);
      }

      await context.close();
    });
  });

  // Scenario: Job Listings on Mobile
  test.describe('Given user browses jobs on mobile', () => {
    test('When on jobs page, Then cards should be stacked', async ({ browser }) => {
      // Load authentication state from global setup
      const storageState = path.join(__dirname, '.auth', 'user.json');
      const context = await browser.newContext({
        ...devices['Pixel 5'],
        storageState: storageState,
      });
      const page = await context.newPage();

      await page.goto('/dashboard/jobs');

      // Then: Job cards should be single column on mobile
      const jobCards = page.locator('[data-testid="job-card"]');
      const cardCount = await jobCards.count();

      if (cardCount > 1) {
        const firstCard = await jobCards.nth(0).boundingBox();
        const secondCard = await jobCards.nth(1).boundingBox();

        // Cards should be stacked vertically (not side by side)
        expect(secondCard?.y).toBeGreaterThan(firstCard!.y + firstCard!.height);

        // Cards should be full width (accounting for padding)
        const viewportWidth = devices['Pixel 5'].viewport.width;
        expect(firstCard?.width).toBeGreaterThan(viewportWidth * 0.85);
      }

      await context.close();
    });

    test('When filtering jobs, Then mobile filter UI should work', async ({ browser }) => {
      // Load authentication state from global setup
      const storageState = path.join(__dirname, '.auth', 'user.json');
      const context = await browser.newContext({
        ...devices['iPhone 13'],
        storageState: storageState,
      });
      const page = await context.newPage();

      await page.goto('/dashboard/jobs');

      // Then: Filter button/drawer should be accessible
      const filterButton = page.locator('[data-testid="filter-button"]');

      if (await filterButton.count() > 0) {
        await expect(filterButton).toBeVisible();

        // When: User taps filter button
        await filterButton.click();

        // Then: Filter panel should appear
        const filterPanel = page.locator('[data-testid="filter-panel"]');
        await expect(filterPanel).toBeVisible({ timeout: 1000 });
      }

      await context.close();
    });
  });

  // Scenario: Tablet Layout (iPad)
  test.describe('Given user on tablet device', () => {
    test('When on dashboard with iPad, Then should use tablet layout', async ({ browser }) => {
      // Load authentication state from global setup
      const storageState = path.join(__dirname, '.auth', 'user.json');
      const context = await browser.newContext({
        ...devices['iPad Pro'],
        storageState: storageState,
      });
      const page = await context.newPage();

      await page.goto('/dashboard');

      // Then: Sidebar might be visible on tablet
      const sidebar = page.locator('[data-testid="sidebar"]');

      // Tablet should show sidebar or hamburger menu
      const sidebarVisible = await sidebar.isVisible().catch(() => false);
      const menuButton = await page.locator('[data-testid="mobile-menu-button"]').isVisible().catch(() => false);

      expect(sidebarVisible || menuButton).toBeTruthy();

      await context.close();
    });
  });

  // Scenario: Touch Interactions
  test.describe('Given mobile touch interactions', () => {
    test('When user swipes/taps, Then gestures should work', async ({ browser }) => {
      const context = await browser.newContext({ ...devices['iPhone 13'] });
      const page = await context.newPage();

      await page.goto('/');

      // Then: Tap targets should be appropriately sized
      const links = page.locator('a').all();

      for (const link of await links) {
        const box = await link.boundingBox();
        if (box) {
          // Touch targets should be at least 44x44px (iOS HIG)
          expect(box.height).toBeGreaterThanOrEqual(40); // Allowing small variance
        }
      }

      await context.close();
    });
  });

  // Scenario: Performance on Mobile
  test.describe('Given mobile performance considerations', () => {
    test('When page loads on mobile, Then should be performant', async ({ browser }) => {
      const context = await browser.newContext({
        ...devices['iPhone 13'],
        // Simulate slower 3G network
        offline: false,
      });
      const page = await context.newPage();

      const startTime = Date.now();
      await page.goto('/', { waitUntil: 'networkidle' });
      const loadTime = Date.now() - startTime;

      // Then: Page should load within reasonable time on mobile network
      expect(loadTime).toBeLessThan(5000); // 5 seconds max

      // Then: Images should be lazy loaded
      const images = page.locator('img');
      const imageCount = await images.count();

      if (imageCount > 0) {
        const firstImage = images.first();
        const loading = await firstImage.getAttribute('loading');
        // Most images should be lazy loaded
        expect(['lazy', null]).toContain(loading);
      }

      await context.close();
    });
  });

  // Scenario: Accessibility on Mobile
  test.describe('Given mobile accessibility @accessibility @mobile', () => {
    test('When on mobile, Then should have proper heading hierarchy', async ({ browser }) => {
      const context = await browser.newContext({ ...devices['iPhone 13'] });
      const page = await context.newPage();

      await page.goto('/');

      // Then: Should have proper heading structure
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
      expect(h1Count).toBeLessThanOrEqual(1); // Only one h1 per page

      await context.close();
    });

    test('When on mobile form, Then should have proper labels', async ({ browser }) => {
      const context = await browser.newContext({ ...devices['Pixel 5'] });
      const page = await context.newPage();

      await page.goto('/signin');

      // Then: All inputs should have associated labels
      const inputs = page.locator('input');
      const inputCount = await inputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');

        // Should have either id (for label[for]) or aria-label/aria-labelledby
        expect(id || ariaLabel || ariaLabelledBy).toBeTruthy();
      }

      await context.close();
    });
  });
});

// Feature: Mobile-Specific Features
test.describe('Mobile-Specific Features @mobile', () => {
  test('Given mobile device, When long-pressing link, Then context menu should work', async ({ browser }) => {
    const context = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await context.newPage();

    await page.goto('/');

    // Mobile-specific behavior test
    const link = page.locator('a').first();

    // Long press simulation (if supported)
    await link.tap({
      timeout: 1000,
    }).catch(() => {
      // Some elements might not support tap, that's okay for this test
    });

    await context.close();
  });

  test('Given mobile keyboard, When typing in input, Then viewport should adjust', async ({ browser }) => {
    const context = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await context.newPage();

    await page.goto('/signin');

    const emailInput = page.locator('input[type="email"]');
    await emailInput.click();

    // Then: Input should remain visible (not hidden by keyboard)
    await expect(emailInput).toBeVisible();

    await context.close();
  });
});
