/**
 * E2E Tests for Issue #72: App Shell - Global Navigation & Responsive Layout
 *
 * Test Coverage:
 * - Desktop navigation (top nav + collapsible left sidebar)
 * - Mobile navigation (bottom tab bar + hamburger menu)
 * - Accessibility (keyboard navigation, ARIA landmarks, focus states)
 * - Responsive layout system (12-column desktop, 4-column mobile)
 * - Profile menu, search, notifications
 * - Role-based navigation
 *
 * @see tests/features/app-shell.feature for BDD scenarios
 */

import { test, expect, Page } from '@playwright/test';

// ============================================================================
// Test Configuration
// ============================================================================

test.describe('App Shell - Global Navigation & Responsive Layout', () => {

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Login as a job seeker
   */
  async function loginAsJobSeeker(page: Page) {
    await page.goto('/login');
    await page.locator('[data-email-input]').fill('jobseeker@example.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
    await expect(page).toHaveURL('/dashboard');
  }

  /**
   * Login as an employer
   */
  async function loginAsEmployer(page: Page) {
    await page.goto('/login');
    await page.locator('[data-email-input]').fill('employer@example.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
    await expect(page).toHaveURL('/employer/dashboard');
  }

  /**
   * Set viewport to desktop size
   */
  async function setDesktopViewport(page: Page) {
    await page.setViewportSize({ width: 1280, height: 800 });
  }

  /**
   * Set viewport to tablet size
   */
  async function setTabletViewport(page: Page) {
    await page.setViewportSize({ width: 800, height: 1024 });
  }

  /**
   * Set viewport to mobile size
   */
  async function setMobileViewport(page: Page) {
    await page.setViewportSize({ width: 375, height: 667 });
  }

  /**
   * Check if element is visible in viewport
   */
  async function isInViewport(page: Page, selector: string): Promise<boolean> {
    const element = page.locator(selector);
    const box = await element.boundingBox();
    if (!box) return false;

    const viewport = page.viewportSize();
    if (!viewport) return false;

    return (
      box.y >= 0 &&
      box.x >= 0 &&
      box.y + box.height <= viewport.height &&
      box.x + box.width <= viewport.width
    );
  }

  // ============================================================================
  // 1. Desktop Navigation - Top Navigation Bar
  // ============================================================================

  test.describe('Desktop Navigation - Top Navigation Bar', () => {

    test.beforeEach(async ({ page }) => {
      await setDesktopViewport(page);
    });

    test('should display top navigation on desktop', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Top nav should be visible
      const topNav = page.locator('[data-top-nav]');
      await expect(topNav).toBeVisible();

      // Check height
      const navBox = await topNav.boundingBox();
      expect(navBox?.height).toBe(64);

      // Check top nav contains required elements
      await expect(page.locator('[data-logo]')).toBeVisible();
      await expect(page.locator('[data-search-bar]')).toBeVisible();
      await expect(page.locator('[data-notifications-icon]')).toBeVisible();
      await expect(page.locator('[data-profile-menu-trigger]')).toBeVisible();
    });

    test('should navigate to dashboard when logo is clicked', async ({ page }) => {
      await loginAsJobSeeker(page);
      await page.goto('/jobs');

      // Click logo
      await page.locator('[data-logo]').click();

      // Should navigate to job seeker dashboard
      await expect(page).toHaveURL('/dashboard');
    });

    test('should navigate to employer dashboard when logo is clicked (employer role)', async ({ page }) => {
      await loginAsEmployer(page);
      await page.goto('/employer/jobs');

      // Click logo
      await page.locator('[data-logo]').click();

      // Should navigate to employer dashboard
      await expect(page).toHaveURL('/employer/dashboard');
    });

    test('should focus search bar when clicked', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Click search bar
      await page.locator('[data-search-bar]').click();

      // Search input should be focused
      const searchInput = page.locator('[data-search-input]');
      await expect(searchInput).toBeFocused();

      // Check placeholder
      await expect(searchInput).toHaveAttribute('placeholder', /Search/i);
    });

    test('should display notification badge when there are unread notifications', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Assuming user has 3 unread notifications (mock data)
      const badge = page.locator('[data-notifications-badge]');
      await expect(badge).toBeVisible();
      await expect(badge).toHaveText('3');
    });

    test('should open notifications dropdown when icon is clicked', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Click notifications icon
      await page.locator('[data-notifications-icon]').click();

      // Dropdown should be visible
      const dropdown = page.locator('[data-notifications-dropdown]');
      await expect(dropdown).toBeVisible();

      // Should display notifications
      await expect(page.locator('[data-notification-item]').first()).toBeVisible();
    });

    test('should open profile menu when avatar is clicked', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Click profile avatar
      await page.locator('[data-profile-menu-trigger]').click();

      // Profile menu should be visible
      const menu = page.locator('[data-profile-menu]');
      await expect(menu).toBeVisible();

      // Check menu items
      await expect(page.locator('[data-menu-profile-settings]')).toBeVisible();
      await expect(page.locator('[data-menu-billing]')).toBeVisible();
      await expect(page.locator('[data-menu-help]')).toBeVisible();
      await expect(page.locator('[data-menu-sign-out]')).toBeVisible();
    });

    test('should sign out user when sign out is clicked', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Open profile menu
      await page.locator('[data-profile-menu-trigger]').click();

      // Click sign out
      await page.locator('[data-menu-sign-out]').click();

      // Should see confirmation dialog
      await expect(page.locator('[data-sign-out-confirm]')).toBeVisible();

      // Confirm sign out
      await page.locator('[data-confirm-sign-out-button]').click();

      // Should be redirected to login
      await expect(page).toHaveURL('/login');
    });
  });

  // ============================================================================
  // 2. Desktop Navigation - Left Sidebar
  // ============================================================================

  test.describe('Desktop Navigation - Left Sidebar', () => {

    test.beforeEach(async ({ page }) => {
      await setDesktopViewport(page);
    });

    test('should display left sidebar navigation on desktop (job seeker)', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Sidebar should be visible
      const sidebar = page.locator('[data-left-sidebar]');
      await expect(sidebar).toBeVisible();

      // Check width
      const sidebarBox = await sidebar.boundingBox();
      expect(sidebarBox?.width).toBe(240);

      // Check navigation items
      await expect(page.locator('[data-nav-dashboard]')).toBeVisible();
      await expect(page.locator('[data-nav-job-search]')).toBeVisible();
      await expect(page.locator('[data-nav-applications]')).toBeVisible();
      await expect(page.locator('[data-nav-resumes]')).toBeVisible();
      await expect(page.locator('[data-nav-cover-letters]')).toBeVisible();
      await expect(page.locator('[data-nav-interview-prep]')).toBeVisible();
      await expect(page.locator('[data-nav-profile]')).toBeVisible();
    });

    test('should display employer-specific sidebar items', async ({ page }) => {
      await loginAsEmployer(page);

      // Check employer navigation items
      await expect(page.locator('[data-nav-dashboard]')).toBeVisible();
      await expect(page.locator('[data-nav-jobs]')).toBeVisible();
      await expect(page.locator('[data-nav-candidates]')).toBeVisible();
      await expect(page.locator('[data-nav-applications]')).toBeVisible();
      await expect(page.locator('[data-nav-team]')).toBeVisible();
      await expect(page.locator('[data-nav-analytics]')).toBeVisible();
      await expect(page.locator('[data-nav-company-profile]')).toBeVisible();

      // Should NOT have job seeker items
      await expect(page.locator('[data-nav-resumes]')).not.toBeVisible();
      await expect(page.locator('[data-nav-cover-letters]')).not.toBeVisible();
    });

    test('should highlight active navigation item', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Dashboard should be active
      await expect(page.locator('[data-nav-dashboard]')).toHaveAttribute('data-active', 'true');

      // Navigate to job search
      await page.locator('[data-nav-job-search]').click();
      await expect(page).toHaveURL(/\/jobs/);

      // Job search should be active, dashboard should not
      await expect(page.locator('[data-nav-job-search]')).toHaveAttribute('data-active', 'true');
      await expect(page.locator('[data-nav-dashboard]')).not.toHaveAttribute('data-active', 'true');
    });

    test('should collapse sidebar when collapse button is clicked', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Sidebar should be expanded
      let sidebarBox = await page.locator('[data-left-sidebar]').boundingBox();
      expect(sidebarBox?.width).toBe(240);

      // Click collapse button
      await page.locator('[data-sidebar-collapse-button]').click();

      // Sidebar should be collapsed
      sidebarBox = await page.locator('[data-left-sidebar]').boundingBox();
      expect(sidebarBox?.width).toBe(64);

      // Text labels should be hidden
      await expect(page.locator('[data-nav-text]').first()).not.toBeVisible();

      // Icons should still be visible
      await expect(page.locator('[data-nav-icon]').first()).toBeVisible();
    });

    test('should show tooltip on hover when sidebar is collapsed', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Collapse sidebar
      await page.locator('[data-sidebar-collapse-button]').click();

      // Hover over dashboard nav item
      await page.locator('[data-nav-dashboard]').hover();

      // Tooltip should appear
      await expect(page.locator('[data-nav-tooltip]')).toBeVisible();
      await expect(page.locator('[data-nav-tooltip]')).toHaveText('Dashboard');
    });

    test('should persist sidebar collapse state on page refresh', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Collapse sidebar
      await page.locator('[data-sidebar-collapse-button]').click();

      // Refresh page
      await page.reload();

      // Sidebar should remain collapsed
      const sidebarBox = await page.locator('[data-left-sidebar]').boundingBox();
      expect(sidebarBox?.width).toBe(64);
    });
  });

  // ============================================================================
  // 3. Mobile Navigation - Bottom Tab Bar
  // ============================================================================

  test.describe('Mobile Navigation - Bottom Tab Bar', () => {

    test.beforeEach(async ({ page }) => {
      await setMobileViewport(page);
    });

    test('should display bottom tab bar on mobile', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Bottom tab bar should be visible
      const tabBar = page.locator('[data-bottom-tab-bar]');
      await expect(tabBar).toBeVisible();

      // Check height
      const tabBarBox = await tabBar.boundingBox();
      expect(tabBarBox?.height).toBe(64);

      // Check tabs
      await expect(page.locator('[data-tab-home]')).toBeVisible();
      await expect(page.locator('[data-tab-search]')).toBeVisible();
      await expect(page.locator('[data-tab-activity]')).toBeVisible();
      await expect(page.locator('[data-tab-messages]')).toBeVisible();
      await expect(page.locator('[data-tab-more]')).toBeVisible();
    });

    test('should navigate when bottom tab is tapped', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Tap search tab
      await page.locator('[data-tab-search]').click();
      await expect(page).toHaveURL(/\/jobs/);

      // Search tab should be highlighted
      await expect(page.locator('[data-tab-search]')).toHaveAttribute('data-active', 'true');

      // Tap activity tab
      await page.locator('[data-tab-activity]').click();
      await expect(page).toHaveURL(/\/activity/);

      // Activity tab should be highlighted
      await expect(page.locator('[data-tab-activity]')).toHaveAttribute('data-active', 'true');
    });

    test('should show notification badge on activity tab', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Assuming 5 unread notifications (mock data)
      const badge = page.locator('[data-tab-activity-badge]');
      await expect(badge).toBeVisible();
      await expect(badge).toHaveText('5');
    });

    test('should have touch-friendly tap targets', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Each tab should have at least 48px x 48px tap target
      const tabs = [
        '[data-tab-home]',
        '[data-tab-search]',
        '[data-tab-activity]',
        '[data-tab-messages]',
        '[data-tab-more]'
      ];

      for (const tab of tabs) {
        const box = await page.locator(tab).boundingBox();
        expect(box?.width).toBeGreaterThanOrEqual(48);
        expect(box?.height).toBeGreaterThanOrEqual(48);
      }
    });
  });

  // ============================================================================
  // 4. Mobile Navigation - Hamburger Menu
  // ============================================================================

  test.describe('Mobile Navigation - Hamburger Menu', () => {

    test.beforeEach(async ({ page }) => {
      await setMobileViewport(page);
    });

    test('should display hamburger menu icon on mobile', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Hamburger icon should be visible
      await expect(page.locator('[data-hamburger-icon]')).toBeVisible();

      // Logo should be centered
      await expect(page.locator('[data-logo]')).toBeVisible();

      // User avatar should be on the right
      await expect(page.locator('[data-profile-menu-trigger]')).toBeVisible();
    });

    test('should open navigation drawer when hamburger is tapped', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Drawer should not be visible initially
      await expect(page.locator('[data-nav-drawer]')).not.toBeVisible();

      // Tap hamburger icon
      await page.locator('[data-hamburger-icon]').click();

      // Drawer should slide in
      const drawer = page.locator('[data-nav-drawer]');
      await expect(drawer).toBeVisible();

      // Drawer should be 80% of screen width
      const drawerBox = await drawer.boundingBox();
      const viewportWidth = page.viewportSize()?.width || 375;
      expect(drawerBox?.width).toBeCloseTo(viewportWidth * 0.8, 10);

      // Check navigation items
      await expect(page.locator('[data-drawer-nav-dashboard]')).toBeVisible();
      await expect(page.locator('[data-drawer-nav-job-search]')).toBeVisible();
      await expect(page.locator('[data-drawer-nav-applications]')).toBeVisible();
      await expect(page.locator('[data-drawer-nav-settings]')).toBeVisible();
      await expect(page.locator('[data-drawer-nav-sign-out]')).toBeVisible();
    });

    test('should close drawer when tapping outside', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Open drawer
      await page.locator('[data-hamburger-icon]').click();
      await expect(page.locator('[data-nav-drawer]')).toBeVisible();

      // Tap outside (on overlay)
      await page.locator('[data-drawer-overlay]').click();

      // Drawer should close
      await expect(page.locator('[data-nav-drawer]')).not.toBeVisible();
    });

    test('should close drawer when navigation item is tapped', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Open drawer
      await page.locator('[data-hamburger-icon]').click();
      await expect(page.locator('[data-nav-drawer]')).toBeVisible();

      // Tap a navigation item
      await page.locator('[data-drawer-nav-job-search]').click();

      // Drawer should close
      await expect(page.locator('[data-nav-drawer]')).not.toBeVisible();

      // Should navigate to the page
      await expect(page).toHaveURL(/\/jobs/);
    });
  });

  // ============================================================================
  // 5. Accessibility - Keyboard Navigation
  // ============================================================================

  test.describe('Accessibility - Keyboard Navigation', () => {

    test.beforeEach(async ({ page }) => {
      await setDesktopViewport(page);
    });

    test('should have skip to main content link', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Press Tab to focus skip link
      await page.keyboard.press('Tab');

      // Skip link should be focused
      await expect(page.locator('[data-skip-to-main]')).toBeFocused();

      // Press Enter
      await page.keyboard.press('Enter');

      // Main content should be focused
      await expect(page.locator('[role="main"]')).toBeFocused();
    });

    test('should navigate through navigation items with Tab key', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Tab through elements
      await page.keyboard.press('Tab'); // Skip link
      await page.keyboard.press('Tab'); // Logo
      await page.keyboard.press('Tab'); // Search bar
      await page.keyboard.press('Tab'); // Notifications
      await page.keyboard.press('Tab'); // Profile menu

      // Profile menu should be focused
      await expect(page.locator('[data-profile-menu-trigger]')).toBeFocused();
    });

    test('should navigate sidebar with arrow keys', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Focus first sidebar item
      await page.locator('[data-nav-dashboard]').focus();
      await expect(page.locator('[data-nav-dashboard]')).toBeFocused();

      // Press Down Arrow
      await page.keyboard.press('ArrowDown');
      await expect(page.locator('[data-nav-job-search]')).toBeFocused();

      // Press Down Arrow again
      await page.keyboard.press('ArrowDown');
      await expect(page.locator('[data-nav-applications]')).toBeFocused();

      // Press Up Arrow
      await page.keyboard.press('ArrowUp');
      await expect(page.locator('[data-nav-job-search]')).toBeFocused();
    });

    test('should close hamburger menu with Escape key', async ({ page }) => {
      await setMobileViewport(page);
      await loginAsJobSeeker(page);

      // Open drawer
      await page.locator('[data-hamburger-icon]').click();
      await expect(page.locator('[data-nav-drawer]')).toBeVisible();

      // Press Escape
      await page.keyboard.press('Escape');

      // Drawer should close
      await expect(page.locator('[data-nav-drawer]')).not.toBeVisible();

      // Focus should return to hamburger button
      await expect(page.locator('[data-hamburger-icon]')).toBeFocused();
    });

    test('should have visible focus indicators', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Focus navigation item
      await page.locator('[data-nav-dashboard]').focus();

      // Check for focus ring (outline or box-shadow)
      const focusedElement = page.locator('[data-nav-dashboard]');
      const styles = await focusedElement.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          outline: computed.outline,
          boxShadow: computed.boxShadow,
        };
      });

      // Should have either outline or box-shadow
      const hasFocusIndicator =
        styles.outline !== 'none' ||
        styles.boxShadow !== 'none';
      expect(hasFocusIndicator).toBe(true);
    });
  });

  // ============================================================================
  // 6. Accessibility - ARIA Landmarks
  // ============================================================================

  test.describe('Accessibility - ARIA Landmarks', () => {

    test('should have proper ARIA landmarks', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Check for landmarks
      await expect(page.locator('header[role="banner"]')).toBeVisible();
      await expect(page.locator('nav[role="navigation"]')).toBeVisible();
      await expect(page.locator('main[role="main"]')).toBeVisible();

      // Footer might not be present on all pages
      const footer = page.locator('footer[role="contentinfo"]');
      const footerCount = await footer.count();
      if (footerCount > 0) {
        await expect(footer).toBeVisible();
      }
    });

    test('should have descriptive aria-labels on landmarks', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Check aria-labels
      const nav = page.locator('nav[role="navigation"]');
      await expect(nav).toHaveAttribute('aria-label', /navigation/i);

      const main = page.locator('main[role="main"]');
      await expect(main).toHaveAttribute('aria-label', /main content/i);
    });

    test('should have aria-current on active nav item', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Dashboard should have aria-current="page"
      await expect(page.locator('[data-nav-dashboard]')).toHaveAttribute('aria-current', 'page');

      // Navigate to job search
      await page.locator('[data-nav-job-search]').click();

      // Job search should have aria-current="page"
      await expect(page.locator('[data-nav-job-search]')).toHaveAttribute('aria-current', 'page');

      // Dashboard should not
      await expect(page.locator('[data-nav-dashboard]')).not.toHaveAttribute('aria-current', 'page');
    });

    test('should have aria-expanded on expandable menus', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Profile menu should have aria-expanded="false"
      await expect(page.locator('[data-profile-menu-trigger]')).toHaveAttribute('aria-expanded', 'false');

      // Open profile menu
      await page.locator('[data-profile-menu-trigger]').click();

      // Should have aria-expanded="true"
      await expect(page.locator('[data-profile-menu-trigger]')).toHaveAttribute('aria-expanded', 'true');
    });

    test('should have aria-haspopup on dropdown triggers', async ({ page }) => {
      await loginAsJobSeeker(page);

      // Profile menu trigger should have aria-haspopup
      await expect(page.locator('[data-profile-menu-trigger]')).toHaveAttribute('aria-haspopup', 'true');

      // Notifications icon should have aria-haspopup
      await expect(page.locator('[data-notifications-icon]')).toHaveAttribute('aria-haspopup', 'true');
    });
  });

  // ============================================================================
  // 7. Responsive Layout System
  // ============================================================================

  test.describe('Responsive Layout System', () => {

    test('should use 12-column grid on desktop', async ({ page }) => {
      await setDesktopViewport(page);
      await loginAsJobSeeker(page);

      // Main content should have max-width 1200px
      const mainContent = page.locator('[data-main-content]');
      const contentBox = await mainContent.boundingBox();
      expect(contentBox?.width).toBeLessThanOrEqual(1200);

      // Should have grid layout
      const gridClass = await mainContent.getAttribute('class');
      expect(gridClass).toContain('grid');
    });

    test('should use 4-column grid on mobile', async ({ page }) => {
      await setMobileViewport(page);
      await loginAsJobSeeker(page);

      // Main content should be full-width with padding
      const mainContent = page.locator('[data-main-content]');
      const contentBox = await mainContent.boundingBox();
      const viewportWidth = page.viewportSize()?.width || 375;

      // Content should span most of viewport (accounting for padding)
      expect(contentBox?.width).toBeGreaterThan(viewportWidth - 40); // 16px padding on each side
    });

    test('should center content when viewport exceeds 1200px', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await loginAsJobSeeker(page);

      const mainContent = page.locator('[data-main-content]');
      const contentBox = await mainContent.boundingBox();

      // Content should not exceed 1200px
      expect(contentBox?.width).toBeLessThanOrEqual(1200);

      // Should be centered (equal margins on left and right)
      const viewportWidth = 1920;
      const leftMargin = contentBox?.x || 0;
      const rightMargin = viewportWidth - (contentBox?.x || 0) - (contentBox?.width || 0);

      // Margins should be approximately equal (within 10px)
      expect(Math.abs(leftMargin - rightMargin)).toBeLessThan(10);
    });
  });

  // ============================================================================
  // 8. Responsive Breakpoints
  // ============================================================================

  test.describe('Responsive Breakpoints', () => {

    test('should show mobile layout at 375px width', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await loginAsJobSeeker(page);

      // Should show bottom tab bar
      await expect(page.locator('[data-bottom-tab-bar]')).toBeVisible();

      // Should show hamburger menu
      await expect(page.locator('[data-hamburger-icon]')).toBeVisible();

      // Should NOT show left sidebar
      await expect(page.locator('[data-left-sidebar]')).not.toBeVisible();
    });

    test('should show tablet layout at 800px width', async ({ page }) => {
      await page.setViewportSize({ width: 800, height: 1024 });
      await loginAsJobSeeker(page);

      // Should show bottom tab bar
      await expect(page.locator('[data-bottom-tab-bar]')).toBeVisible();

      // Should show hamburger menu
      await expect(page.locator('[data-hamburger-icon]')).toBeVisible();

      // Should NOT show left sidebar
      await expect(page.locator('[data-left-sidebar]')).not.toBeVisible();
    });

    test('should show desktop layout at 1280px width', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await loginAsJobSeeker(page);

      // Should show top navigation
      await expect(page.locator('[data-top-nav]')).toBeVisible();

      // Should show left sidebar
      await expect(page.locator('[data-left-sidebar]')).toBeVisible();

      // Should NOT show bottom tab bar
      await expect(page.locator('[data-bottom-tab-bar]')).not.toBeVisible();

      // Should NOT show hamburger menu
      await expect(page.locator('[data-hamburger-icon]')).not.toBeVisible();
    });

    test('should maintain layout at extra large desktop (2560px)', async ({ page }) => {
      await page.setViewportSize({ width: 2560, height: 1440 });
      await loginAsJobSeeker(page);

      // Content should not exceed 1200px
      const mainContent = page.locator('[data-main-content]');
      const contentBox = await mainContent.boundingBox();
      expect(contentBox?.width).toBeLessThanOrEqual(1200);

      // Should have desktop navigation
      await expect(page.locator('[data-top-nav]')).toBeVisible();
      await expect(page.locator('[data-left-sidebar]')).toBeVisible();
    });
  });

  // ============================================================================
  // 9. Search Functionality
  // ============================================================================

  test.describe('Search Functionality', () => {

    test('should show role-specific search placeholder', async ({ page }) => {
      await setDesktopViewport(page);
      await loginAsJobSeeker(page);

      // Job seeker should see jobs search placeholder
      const searchInput = page.locator('[data-search-input]');
      await expect(searchInput).toHaveAttribute('placeholder', /Search jobs/i);
    });

    test('should show employer-specific search placeholder', async ({ page }) => {
      await setDesktopViewport(page);
      await loginAsEmployer(page);

      // Employer should see candidates search placeholder
      const searchInput = page.locator('[data-search-input]');
      await expect(searchInput).toHaveAttribute('placeholder', /Search candidates/i);
    });

    test('should show search suggestions when typing', async ({ page }) => {
      await setDesktopViewport(page);
      await loginAsJobSeeker(page);

      // Type in search
      await page.locator('[data-search-input]').fill('Soft');

      // Suggestions should appear
      await expect(page.locator('[data-search-suggestions]')).toBeVisible();

      // Should show relevant suggestions
      const suggestions = page.locator('[data-search-suggestion-item]');
      await expect(suggestions).toHaveCount(3);
    });

    test('should navigate with arrow keys in search suggestions', async ({ page }) => {
      await setDesktopViewport(page);
      await loginAsJobSeeker(page);

      // Type in search
      await page.locator('[data-search-input]').fill('Soft');
      await expect(page.locator('[data-search-suggestions]')).toBeVisible();

      // Press Down Arrow
      await page.keyboard.press('ArrowDown');

      // First suggestion should be highlighted
      await expect(page.locator('[data-search-suggestion-item][data-highlighted="true"]').first()).toBeVisible();

      // Press Enter
      await page.keyboard.press('Enter');

      // Should navigate to search results
      await expect(page).toHaveURL(/\/jobs/);
    });
  });

  // ============================================================================
  // 10. Notifications Panel
  // ============================================================================

  test.describe('Notifications Panel', () => {

    test('should display notifications with correct counts', async ({ page }) => {
      await setDesktopViewport(page);
      await loginAsJobSeeker(page);

      // Open notifications
      await page.locator('[data-notifications-icon]').click();

      const panel = page.locator('[data-notifications-dropdown]');
      await expect(panel).toBeVisible();

      // Should show unread count
      await expect(page.locator('[data-unread-count]')).toHaveText('3 unread notifications');

      // Should show unread indicator on unread notifications
      const unreadDots = page.locator('[data-unread-dot]');
      await expect(unreadDots).toHaveCount(3);
    });

    test('should mark notification as read when clicked', async ({ page }) => {
      await setDesktopViewport(page);
      await loginAsJobSeeker(page);

      // Open notifications
      await page.locator('[data-notifications-icon]').click();

      // Click first unread notification
      await page.locator('[data-notification-item][data-read="false"]').first().click();

      // Badge count should decrease
      const badge = page.locator('[data-notifications-badge]');
      await expect(badge).toHaveText('2');
    });

    test('should mark all as read', async ({ page }) => {
      await setDesktopViewport(page);
      await loginAsJobSeeker(page);

      // Open notifications
      await page.locator('[data-notifications-icon]').click();

      // Click "Mark all as read"
      await page.locator('[data-mark-all-read]').click();

      // Badge should disappear
      await expect(page.locator('[data-notifications-badge]')).not.toBeVisible();

      // All unread dots should be gone
      await expect(page.locator('[data-unread-dot]')).toHaveCount(0);
    });

    test('should show appropriate icons for notification types', async ({ page }) => {
      await setDesktopViewport(page);
      await loginAsJobSeeker(page);

      // Open notifications
      await page.locator('[data-notifications-icon]').click();

      // Check for different notification type icons
      await expect(page.locator('[data-notification-type="application"]')).toBeVisible();
      await expect(page.locator('[data-notification-type="message"]')).toBeVisible();
      await expect(page.locator('[data-notification-type="interview"]')).toBeVisible();
    });
  });

  // ============================================================================
  // 11. Performance & Optimization
  // ============================================================================

  test.describe('Performance & Optimization', () => {

    test('should have fast navigation transitions', async ({ page }) => {
      await setDesktopViewport(page);
      await loginAsJobSeeker(page);

      const startTime = Date.now();

      // Click navigation item
      await page.locator('[data-nav-job-search]').click();
      await expect(page).toHaveURL(/\/jobs/);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within 500ms
      expect(duration).toBeLessThan(500);
    });

    test('should have no layout shift on page load', async ({ page }) => {
      await setDesktopViewport(page);

      // Monitor layout shifts
      await page.goto('/dashboard');

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      // Get cumulative layout shift score
      const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let clsScore = 0;
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if ((entry as any).hadRecentInput) continue;
              clsScore += (entry as any).value;
            }
          });
          observer.observe({ type: 'layout-shift', buffered: true });

          setTimeout(() => {
            observer.disconnect();
            resolve(clsScore);
          }, 1000);
        });
      });

      // CLS should be less than 0.1
      expect(cls).toBeLessThan(0.1);
    });
  });

  // ============================================================================
  // 12. Role-Based Navigation
  // ============================================================================

  test.describe('Role-Based Navigation', () => {

    test('should show only job seeker items for job seeker role', async ({ page }) => {
      await setDesktopViewport(page);
      await loginAsJobSeeker(page);

      // Should have job seeker items
      await expect(page.locator('[data-nav-job-search]')).toBeVisible();
      await expect(page.locator('[data-nav-resumes]')).toBeVisible();
      await expect(page.locator('[data-nav-cover-letters]')).toBeVisible();
      await expect(page.locator('[data-nav-interview-prep]')).toBeVisible();

      // Should NOT have employer items
      await expect(page.locator('[data-nav-candidates]')).not.toBeVisible();
      await expect(page.locator('[data-nav-team]')).not.toBeVisible();
      await expect(page.locator('[data-nav-company-profile]')).not.toBeVisible();
    });

    test('should show only employer items for employer role', async ({ page }) => {
      await setDesktopViewport(page);
      await loginAsEmployer(page);

      // Should have employer items
      await expect(page.locator('[data-nav-jobs]')).toBeVisible();
      await expect(page.locator('[data-nav-candidates]')).toBeVisible();
      await expect(page.locator('[data-nav-team]')).toBeVisible();
      await expect(page.locator('[data-nav-analytics]')).toBeVisible();
      await expect(page.locator('[data-nav-company-profile]')).toBeVisible();

      // Should NOT have job seeker items
      await expect(page.locator('[data-nav-resumes]')).not.toBeVisible();
      await expect(page.locator('[data-nav-cover-letters]')).not.toBeVisible();
      await expect(page.locator('[data-nav-interview-prep]')).not.toBeVisible();
    });
  });
});
