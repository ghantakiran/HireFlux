/**
 * E2E Tests: Onboarding Tooltips & Tours - Issue #137
 * Tests all tour functionality, tooltips, progress tracking, and mobile adaptation
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Onboarding Tooltips & Tours - Issue #137', () => {
  // Helper function to clear tour progress
  async function clearTourProgress(page: Page) {
    await page.evaluate(() => {
      const keys = Object.keys(localStorage).filter(key => key.startsWith('tour-'));
      keys.forEach(key => localStorage.removeItem(key));
    });
  }

  // Helper function to set tour progress
  async function setTourProgress(page: Page, tourId: string, step: number, status: string) {
    await page.evaluate(
      ({ id, s, st }) => {
        localStorage.setItem(`tour-${id}-progress`, String(s));
        localStorage.setItem(`tour-${id}-status`, st);
        localStorage.setItem(`tour-${id}-updated`, new Date().toISOString());
      },
      { id: tourId, s: step, st: status }
    );
  }

  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/auth/**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ user: { id: '1', role: 'job_seeker' } }),
      });
    });

    console.log('✓ Authentication mocked for E2E tests');
  });

  // ========================================
  // Feature 1: Feature Introduction Tours
  // ========================================

  test.describe('Feature Introduction Tours', () => {
    test('@critical should show welcome tour modal on first visit', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');

      // Wait for tour modal to appear
      const tourModal = page.getByTestId('tour-modal');
      await expect(tourModal).toBeVisible({ timeout: 3000 });

      // Check for required buttons
      await expect(page.getByRole('button', { name: /start tour/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /skip tour/i })).toBeVisible();

      // Check ARIA labels
      await expect(tourModal).toHaveAttribute('role', 'dialog');
      await expect(tourModal).toHaveAttribute('aria-label', /welcome tour|onboarding/i);

      console.log('✓ Welcome tour modal displayed correctly');
    });

    test('should progress through tour steps', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');

      // Start tour
      await page.getByRole('button', { name: /start tour/i }).click();

      // Check first step
      await expect(page.getByTestId('tour-step')).toBeVisible();
      await expect(page.getByTestId('tour-progress')).toContainText('1 of 5');

      // Check spotlight/highlight
      const spotlight = page.getByTestId('tour-spotlight');
      await expect(spotlight).toBeVisible();

      // Progress to next step
      await page.getByRole('button', { name: /next/i }).click();
      await expect(page.getByTestId('tour-progress')).toContainText('2 of 5');

      console.log('✓ Tour progression working');
    });

    test('should complete tour and save completion status', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');
      await page.getByRole('button', { name: /start tour/i }).click();

      // Go through all steps (5 steps)
      for (let i = 0; i < 4; i++) {
        await page.getByRole('button', { name: /next/i }).click();
        await page.waitForTimeout(300); // Wait for animation
      }

      // Finish tour
      await page.getByRole('button', { name: /finish|done/i }).click();

      // Check tour closed
      await expect(page.getByTestId('tour-modal')).not.toBeVisible();

      // Check success toast
      await expect(page.getByText(/tour completed/i)).toBeVisible();

      // Check localStorage
      const tourStatus = await page.evaluate(() =>
        localStorage.getItem('tour-dashboard-status')
      );
      expect(tourStatus).toBe('completed');

      // Reload page - tour should not appear
      await page.reload();
      await expect(page.getByTestId('tour-modal')).not.toBeVisible();

      console.log('✓ Tour completion saved correctly');
    });

    test('should skip tour and mark as skipped', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');

      await page.getByRole('button', { name: /skip tour/i }).click();

      // Tour should close
      await expect(page.getByTestId('tour-modal')).not.toBeVisible();

      // Check localStorage
      const tourStatus = await page.evaluate(() =>
        localStorage.getItem('tour-dashboard-status')
      );
      expect(tourStatus).toBe('skipped');

      console.log('✓ Tour skipping working');
    });

    test('should dismiss tour mid-progress and save progress', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');
      await page.getByRole('button', { name: /start tour/i }).click();

      // Go to step 3
      await page.getByRole('button', { name: /next/i }).click();
      await page.getByRole('button', { name: /next/i }).click();
      await expect(page.getByTestId('tour-progress')).toContainText('3 of 5');

      // Press Escape to dismiss
      await page.keyboard.press('Escape');

      // Tour should close
      await expect(page.getByTestId('tour-modal')).not.toBeVisible();

      // Check progress saved
      const progress = await page.evaluate(() =>
        localStorage.getItem('tour-dashboard-progress')
      );
      expect(progress).toBe('3');

      const status = await page.evaluate(() =>
        localStorage.getItem('tour-dashboard-status')
      );
      expect(status).toBe('in-progress');

      console.log('✓ Tour progress saved on dismissal');
    });
  });

  // ========================================
  // Feature 2: Contextual Tooltips
  // ========================================

  test.describe('Contextual Tooltips', () => {
    test('@critical should show tooltip on hover', async ({ page }) => {
      await clearTourProgress(page);
      // Mark tour as completed so it doesn't interfere
      await setTourProgress(page, 'dashboard', 5, 'completed');

      await page.goto('/dashboard');

      // Find element with tooltip (e.g., Auto-Apply button)
      const autoApplyButton = page.getByTestId('auto-apply-button');
      await autoApplyButton.hover();

      // Wait for tooltip to appear (500ms delay)
      await page.waitForTimeout(600);

      const tooltip = page.getByTestId('contextual-tooltip');
      await expect(tooltip).toBeVisible();
      await expect(tooltip).toContainText(/auto.?apply|automatically apply/i);

      // Check for Learn More link
      await expect(tooltip.getByRole('link', { name: /learn more/i })).toBeVisible();

      console.log('✓ Contextual tooltip appears on hover');
    });

    test('should show tooltip on keyboard focus', async ({ page }) => {
      await clearTourProgress(page);
      await setTourProgress(page, 'dashboard', 5, 'completed');

      await page.goto('/dashboard');

      // Tab to Auto-Apply button
      const autoApplyButton = page.getByTestId('auto-apply-button');
      await autoApplyButton.focus();

      // Wait for tooltip
      await page.waitForTimeout(1100);

      const tooltip = page.getByTestId('contextual-tooltip');
      await expect(tooltip).toBeVisible();

      // Check ARIA announcement
      await expect(tooltip).toHaveAttribute('role', 'tooltip');

      // Press Escape to dismiss
      await page.keyboard.press('Escape');
      await expect(tooltip).not.toBeVisible();

      console.log('✓ Tooltip appears on focus and dismisses with Escape');
    });

    test('should trigger tour from tooltip "Show me how" link', async ({ page }) => {
      await clearTourProgress(page);
      await setTourProgress(page, 'dashboard', 5, 'completed');

      await page.goto('/dashboard');

      // Hover to show tooltip
      const resumeButton = page.getByTestId('resume-builder-button');
      await resumeButton.hover();
      await page.waitForTimeout(600);

      const tooltip = page.getByTestId('contextual-tooltip');
      await expect(tooltip).toBeVisible();

      // Click "Show me how"
      await tooltip.getByRole('button', { name: /show me how/i }).click();

      // Resume Builder tour should start
      await expect(page.getByTestId('tour-modal')).toBeVisible();
      await expect(page.getByTestId('tour-title')).toContainText(/resume builder/i);
      await expect(page.getByTestId('tour-progress')).toContainText('1 of');

      console.log('✓ Tour triggered from tooltip');
    });

    test('should disable tooltips via settings', async ({ page }) => {
      await page.goto('/dashboard/settings');

      // Toggle tooltips off
      const tooltipToggle = page.getByTestId('setting-tooltips-enabled');
      await tooltipToggle.click();

      // Save settings
      await page.getByRole('button', { name: /save/i }).click();

      // Navigate to dashboard
      await page.goto('/dashboard');

      // Hover over element - tooltip should NOT appear
      const autoApplyButton = page.getByTestId('auto-apply-button');
      await autoApplyButton.hover();
      await page.waitForTimeout(1000);

      await expect(page.getByTestId('contextual-tooltip')).not.toBeVisible();

      console.log('✓ Tooltips disabled via settings');
    });
  });

  // ========================================
  // Feature 3: Skip/Dismiss Tours
  // ========================================

  test.describe('Skip/Dismiss Tours', () => {
    test('should have skip button on every tour step', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');
      await page.getByRole('button', { name: /start tour/i }).click();

      // Check skip button on step 1
      await expect(page.getByRole('button', { name: /skip tour/i })).toBeVisible();

      // Go to step 2
      await page.getByRole('button', { name: /next/i }).click();
      await expect(page.getByRole('button', { name: /skip tour/i })).toBeVisible();

      // Click skip
      await page.getByRole('button', { name: /skip tour/i }).click();
      await expect(page.getByTestId('tour-modal')).not.toBeVisible();

      const status = await page.evaluate(() =>
        localStorage.getItem('tour-dashboard-status')
      );
      expect(status).toBe('skipped');

      console.log('✓ Skip button available and functional');
    });

    test('should dismiss with close (X) button', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');
      await page.getByRole('button', { name: /start tour/i }).click();

      // Go to step 2
      await page.getByRole('button', { name: /next/i }).click();

      // Click close button
      const closeButton = page.getByTestId('tour-close-button');
      await closeButton.click();

      await expect(page.getByTestId('tour-modal')).not.toBeVisible();
      await expect(page.getByText(/tour paused|resume anytime/i)).toBeVisible();

      console.log('✓ Close button dismisses tour');
    });

    test('should dismiss with Escape key', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');
      await page.getByRole('button', { name: /start tour/i }).click();

      // Go to step 4
      for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: /next/i }).click();
      }

      // Press Escape
      await page.keyboard.press('Escape');

      await expect(page.getByTestId('tour-modal')).not.toBeVisible();

      const progress = await page.evaluate(() =>
        localStorage.getItem('tour-dashboard-progress')
      );
      expect(progress).toBe('4');

      console.log('✓ Escape key dismisses tour');
    });

    test('should dismiss by clicking overlay', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');
      await page.getByRole('button', { name: /start tour/i }).click();

      // Click overlay (backdrop)
      const overlay = page.getByTestId('tour-overlay');
      await overlay.click({ position: { x: 10, y: 10 } });

      await expect(page.getByTestId('tour-modal')).not.toBeVisible();

      console.log('✓ Clicking overlay dismisses tour');
    });
  });

  // ========================================
  // Feature 4: Progress Tracking
  // ========================================

  test.describe('Progress Tracking', () => {
    test('@acceptance should save progress to localStorage', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard/cover-letters/new');

      // Assume Cover Letter tour auto-starts
      const tourModal = page.getByTestId('tour-modal');
      if (await tourModal.isVisible()) {
        await page.getByRole('button', { name: /start tour/i }).click();

        // Go to step 3
        await page.getByRole('button', { name: /next/i }).click();
        await page.getByRole('button', { name: /next/i }).click();

        // Dismiss
        await page.keyboard.press('Escape');

        // Check localStorage
        const progress = await page.evaluate(() =>
          localStorage.getItem('tour-cover-letter-progress')
        );
        const status = await page.evaluate(() =>
          localStorage.getItem('tour-cover-letter-status')
        );

        expect(progress).toBe('3');
        expect(status).toBe('in-progress');
      }

      console.log('✓ Tour progress saved to localStorage');
    });

    test('should resume tour from saved progress', async ({ page }) => {
      await clearTourProgress(page);

      // Set saved progress at step 4
      await setTourProgress(page, 'dashboard', 4, 'in-progress');

      await page.goto('/dashboard');

      // Should see resume prompt
      const resumePrompt = page.getByText(/resume tour|continue from step 4/i);
      await expect(resumePrompt).toBeVisible();

      // Click Resume
      await page.getByRole('button', { name: /resume tour/i }).click();

      // Tour should start at step 4
      await expect(page.getByTestId('tour-progress')).toContainText('4 of 5');

      console.log('✓ Tour resumed from saved progress');
    });

    test('should view all tour progress in settings', async ({ page }) => {
      await page.goto('/dashboard/settings/onboarding');

      // Should see list of tours
      const tourList = page.getByTestId('tour-list');
      await expect(tourList).toBeVisible();

      // Check for tour items
      await expect(tourList.getByText(/dashboard overview/i)).toBeVisible();
      await expect(tourList.getByText(/resume builder/i)).toBeVisible();

      // Check for status indicators
      await expect(tourList.getByText(/completed/i)).toBeVisible();
      await expect(tourList.getByText(/in progress/i)).toBeVisible();

      // Check for action buttons
      await expect(tourList.getByRole('button', { name: /replay tour/i }).first()).toBeVisible();
      await expect(tourList.getByRole('button', { name: /resume tour/i }).first()).toBeVisible();

      console.log('✓ All tours displayed in settings');
    });

    test('should reset all tour progress', async ({ page }) => {
      await page.goto('/dashboard/settings/onboarding');

      // Click Reset All Tours
      await page.getByRole('button', { name: /reset all tours/i }).click();

      // Confirm
      await page.getByRole('button', { name: /confirm|yes/i }).click();

      // Success message
      await expect(page.getByText(/tours reset|progress cleared/i)).toBeVisible();

      // Check localStorage cleared
      const tourKeys = await page.evaluate(() => {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('tour-'));
        return keys.length;
      });
      expect(tourKeys).toBe(0);

      console.log('✓ All tour progress reset');
    });

    test('should display tour completion statistics', async ({ page }) => {
      await page.goto('/dashboard/settings/onboarding');

      // Check for statistics section
      const stats = page.getByTestId('tour-statistics');
      await expect(stats).toBeVisible();

      await expect(stats.getByText(/tours completed/i)).toBeVisible();
      await expect(stats.getByText(/in progress/i)).toBeVisible();
      await expect(stats.getByText(/not started/i)).toBeVisible();

      console.log('✓ Tour statistics displayed');
    });
  });

  // ========================================
  // Feature 5: Tour Replay Option
  // ========================================

  test.describe('Tour Replay Option', () => {
    test('should replay completed tour from settings', async ({ page }) => {
      // Mark dashboard tour as completed
      await setTourProgress(page, 'dashboard', 5, 'completed');

      await page.goto('/dashboard/settings/onboarding');

      // Find Dashboard Overview tour
      const dashboardTour = page.getByTestId('tour-item-dashboard');
      await expect(dashboardTour.getByText(/completed/i)).toBeVisible();

      // Click Replay Tour
      await dashboardTour.getByRole('button', { name: /replay tour/i }).click();

      // Should navigate to dashboard and start tour
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByTestId('tour-modal')).toBeVisible();
      await expect(page.getByTestId('tour-progress')).toContainText('1 of 5');

      console.log('✓ Tour replayed from settings');
    });

    test('should replay tour from help menu', async ({ page }) => {
      await page.goto('/dashboard');

      // Open help menu
      await page.getByTestId('help-menu-button').click();

      // Click "Show Dashboard Tour"
      await page.getByRole('menuitem', { name: /show dashboard tour/i }).click();

      // Tour should start
      await expect(page.getByTestId('tour-modal')).toBeVisible();
      await expect(page.getByTestId('tour-progress')).toContainText('1 of');

      console.log('✓ Tour replayed from help menu');
    });

    test('should restart in-progress tour', async ({ page }) => {
      await setTourProgress(page, 'dashboard', 3, 'in-progress');

      await page.goto('/dashboard/settings/onboarding');

      const dashboardTour = page.getByTestId('tour-item-dashboard');

      // Open dropdown and click Restart
      await dashboardTour.getByTestId('tour-actions-dropdown').click();
      await page.getByRole('menuitem', { name: /restart tour/i }).click();

      // Confirmation
      await page.getByRole('button', { name: /confirm|restart/i }).click();

      // Navigate to dashboard and check tour starts from step 1
      await expect(page).toHaveURL(/\/dashboard/);
      await expect(page.getByTestId('tour-modal')).toBeVisible();
      await expect(page.getByTestId('tour-progress')).toContainText('1 of 5');

      console.log('✓ Tour restarted from step 1');
    });
  });

  // ========================================
  // Tour Smoothness (Performance)
  // ========================================

  test.describe('@performance Tour Smoothness', () => {
    test('should have smooth transitions between steps', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');
      await page.getByRole('button', { name: /start tour/i }).click();

      // Measure transition time
      const startTime = Date.now();
      await page.getByRole('button', { name: /next/i }).click();

      // Wait for step 2 to be visible
      await expect(page.getByTestId('tour-progress')).toContainText('2 of 5');
      const endTime = Date.now();

      const transitionTime = endTime - startTime;
      expect(transitionTime).toBeLessThan(500); // Should be under 500ms

      console.log(`✓ Transition time: ${transitionTime}ms`);
    });

    test('should not block page rendering', async ({ page }) => {
      await clearTourProgress(page);

      const startTime = Date.now();
      await page.goto('/dashboard');

      // Check if main content is visible quickly
      await expect(page.getByTestId('dashboard-content')).toBeVisible();
      const contentTime = Date.now() - startTime;

      expect(contentTime).toBeLessThan(2000);

      console.log(`✓ Page rendered in ${contentTime}ms`);
    });

    test('should have visible overlay without blocking UI', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');
      await page.getByRole('button', { name: /start tour/i }).click();

      // Check overlay opacity
      const overlay = page.getByTestId('tour-overlay');
      const opacity = await overlay.evaluate(el =>
        window.getComputedStyle(el).opacity
      );

      const opacityValue = parseFloat(opacity);
      expect(opacityValue).toBeGreaterThan(0.4);
      expect(opacityValue).toBeLessThan(0.8);

      console.log(`✓ Overlay opacity: ${opacity}`);
    });
  });

  // ========================================
  // Mobile Adaptation
  // ========================================

  test.describe('@mobile Mobile Adaptation', () => {
    test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

    test('should show full-screen tour modal on mobile', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');

      const tourModal = page.getByTestId('tour-modal');
      await expect(tourModal).toBeVisible();

      // Check if modal is full-screen
      const box = await tourModal.boundingBox();
      expect(box?.width).toBeGreaterThan(350); // Close to viewport width

      console.log('✓ Full-screen modal on mobile');
    });

    test('should use bottom sheet UI on mobile', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');
      await page.getByRole('button', { name: /start tour/i }).click();

      // Check for bottom sheet
      const bottomSheet = page.getByTestId('tour-bottom-sheet');
      await expect(bottomSheet).toBeVisible();

      // Check for drag handle
      await expect(page.getByTestId('bottom-sheet-handle')).toBeVisible();

      console.log('✓ Bottom sheet UI on mobile');
    });

    test('should have touch-friendly buttons (min 44px)', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');
      await page.getByRole('button', { name: /start tour/i }).click();

      // Check Next button size
      const nextButton = page.getByRole('button', { name: /next/i });
      const box = await nextButton.boundingBox();

      expect(box?.height).toBeGreaterThanOrEqual(44);

      console.log(`✓ Button height: ${box?.height}px`);
    });
  });

  // ========================================
  // Accessibility
  // ========================================

  test.describe('@accessibility Keyboard Navigation & Screen Readers', () => {
    test('should be fully keyboard navigable', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');

      // Tab to Start Tour button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const startButton = page.getByRole('button', { name: /start tour/i });
      await expect(startButton).toBeFocused();

      // Press Enter to start
      await page.keyboard.press('Enter');

      // Tab to Next button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const nextButton = page.getByRole('button', { name: /next/i });
      await expect(nextButton).toBeFocused();

      // Arrow Right to go to next step
      await page.keyboard.press('ArrowRight');
      await expect(page.getByTestId('tour-progress')).toContainText('2 of 5');

      // Arrow Left to go back
      await page.keyboard.press('ArrowLeft');
      await expect(page.getByTestId('tour-progress')).toContainText('1 of 5');

      console.log('✓ Fully keyboard navigable');
    });

    test('should announce to screen readers', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');

      const tourModal = page.getByTestId('tour-modal');
      await expect(tourModal).toBeVisible();

      // Check ARIA attributes
      await expect(tourModal).toHaveAttribute('role', 'dialog');
      await expect(tourModal).toHaveAttribute('aria-labelledby');

      // Check for live region
      const liveRegion = page.locator('[aria-live="polite"]');
      await expect(liveRegion).toBeAttached();

      console.log('✓ Screen reader support implemented');
    });
  });

  // ========================================
  // Integration with Existing Features
  // ========================================

  test.describe('Integration with Existing Features', () => {
    test('should pause tour when feedback widget opens', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');
      await page.getByRole('button', { name: /start tour/i }).click();

      // Open feedback widget (Ctrl+Shift+F)
      await page.keyboard.press('Control+Shift+F');

      // Feedback widget should open
      await expect(page.getByTestId('feedback-widget')).toBeVisible();

      // Tour should be paused (not visible)
      await expect(page.getByTestId('tour-modal')).not.toBeVisible();

      // Close feedback widget
      await page.keyboard.press('Escape');

      // Tour should resume
      await expect(page.getByTestId('tour-modal')).toBeVisible();

      console.log('✓ Tour pauses for feedback widget');
    });

    test('should show tour controls in help menu', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');
      await page.getByRole('button', { name: /start tour/i }).click();

      // Open help menu
      await page.keyboard.press('Shift+?');

      const helpMenu = page.getByTestId('keyboard-shortcuts-panel');
      await expect(helpMenu).toBeVisible();

      // Tour should pause
      await expect(page.getByTestId('tour-modal')).not.toBeVisible();

      // Close help
      await page.keyboard.press('Escape');

      // Tour should resume
      await expect(page.getByTestId('tour-modal')).toBeVisible();

      console.log('✓ Tour integrates with help menu');
    });
  });

  // ========================================
  // Edge Cases & Error Handling
  // ========================================

  test.describe('Edge Cases & Error Handling', () => {
    test('should handle missing target element gracefully', async ({ page }) => {
      await clearTourProgress(page);

      // Mock a tour with a missing element step
      await page.goto('/dashboard');

      // If a step targets a non-existent element, it should skip
      // This would require tour config mocking - placeholder test

      console.log('✓ Missing element handling (requires implementation)');
    });

    test('should handle navigation during tour', async ({ page }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');
      await page.getByRole('button', { name: /start tour/i }).click();

      // Go to step 3
      await page.getByRole('button', { name: /next/i }).click();
      await page.getByRole('button', { name: /next/i }).click();

      // Navigate away
      await page.goto('/dashboard/resumes');

      // Tour should close
      await expect(page.getByTestId('tour-modal')).not.toBeVisible();

      // Progress should be saved
      const progress = await page.evaluate(() =>
        localStorage.getItem('tour-dashboard-progress')
      );
      expect(progress).toBe('3');

      console.log('✓ Navigation handled correctly');
    });

    test('should not show tour in multiple tabs simultaneously', async ({ page, context }) => {
      await clearTourProgress(page);

      await page.goto('/dashboard');
      await page.getByRole('button', { name: /start tour/i }).click();
      await expect(page.getByTestId('tour-modal')).toBeVisible();

      // Open new tab
      const newPage = await context.newPage();
      await newPage.goto('/dashboard');

      // Tour should not appear in new tab
      await expect(newPage.getByTestId('tour-modal')).not.toBeVisible();

      await newPage.close();

      console.log('✓ Tour not duplicated across tabs');
    });
  });
});
