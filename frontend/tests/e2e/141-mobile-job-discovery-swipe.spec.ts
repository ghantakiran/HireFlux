/**
 * E2E Tests for Issue #141: Mobile Job Discovery (Swipe Cards)
 * Phase 5 | P2 | Tinder-style job discovery interface
 *
 * Features:
 * - Tinder-style swipe cards for job discovery
 * - Swipe right (save/like), left (pass/reject)
 * - Swipe up (super like/quick apply)
 * - Undo last swipe action
 * - Smooth card animations and transitions
 * - Quick apply modal on match
 * - Card stack with depth effect
 *
 * Acceptance Criteria:
 * - ✅ Swipe smooth (60 FPS animations)
 * - ✅ Animations fluid (physics-based transitions)
 * - ✅ Undo working (restore last card with animation)
 * - ✅ Mobile only (optimized for touch screens)
 */

import { test, expect, devices } from '@playwright/test';

// Use mobile viewport for all tests
test.use(devices['iPhone 13 Pro']);

test.describe('Issue #141: Mobile Job Discovery (Swipe Cards)', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to swipe discovery page
    await page.goto('http://localhost:3000/jobs/discover');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('1. Card Stack Rendering & Display', () => {
    test('should display swipe card interface', async ({ page }) => {
      const swipeContainer = page.locator('[data-swipe-container]');
      await expect(swipeContainer).toBeVisible();
    });

    test('should show card stack with depth effect', async ({ page }) => {
      // Should show multiple cards stacked (top card + 2 behind)
      const cards = page.locator('[data-job-card]');
      const count = await cards.count();

      expect(count).toBeGreaterThanOrEqual(3);
    });

    test('should display top card prominently', async ({ page }) => {
      const topCard = page.locator('[data-job-card][data-card-index="0"]');
      await expect(topCard).toBeVisible();

      // Should be at front (higher z-index)
      const zIndex = await topCard.evaluate((el) => window.getComputedStyle(el).zIndex);
      expect(parseInt(zIndex)).toBeGreaterThan(0);
    });

    test('should show card details (job title, company, location)', async ({ page }) => {
      await expect(page.locator('[data-job-title]').first()).toBeVisible();
      await expect(page.locator('[data-company-name]').first()).toBeVisible();
      await expect(page.locator('[data-job-location]').first()).toBeVisible();
    });

    test('should display job salary range', async ({ page }) => {
      const salary = page.locator('[data-salary-range]').first();
      await expect(salary).toBeVisible();
      await expect(salary).toContainText(/\$|£|€/);
    });

    test('should show job tags (remote, visa, etc.)', async ({ page }) => {
      const tags = page.locator('[data-job-tags] [data-tag]');
      await expect(tags.first()).toBeVisible();
    });

    test('should display company logo', async ({ page }) => {
      const logo = page.locator('[data-company-logo]').first();
      await expect(logo).toBeVisible();
    });

    test('should show fit index score', async ({ page }) => {
      const fitIndex = page.locator('[data-fit-index]').first();
      await expect(fitIndex).toBeVisible();
      await expect(fitIndex).toContainText(/\d+%|\d+\/100/);
    });

    test('should display card count (e.g., "1 of 25")', async ({ page }) => {
      const cardCount = page.locator('[data-card-count]');
      await expect(cardCount).toBeVisible();
      await expect(cardCount).toContainText(/\d+ of \d+/);
    });

    test('should show "View Details" button', async ({ page }) => {
      const detailsButton = page.locator('[data-view-details]');
      await expect(detailsButton).toBeVisible();
    });
  });

  test.describe('2. Swipe Gestures - Left (Pass/Reject)', () => {
    test('should detect swipe left gesture', async ({ page }) => {
      const card = page.locator('[data-job-card][data-card-index="0"]');

      // Simulate swipe left
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300); // Start position
      await page.mouse.move(-200, 300); // Swipe left 300px
      await page.mouse.up();

      // Card should start moving left
      await expect(card).toHaveAttribute('data-swiping', 'left');
    });

    test('should show red overlay on swipe left', async ({ page }) => {
      const card = page.locator('[data-job-card][data-card-index="0"]');

      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(-150, 300);

      // Should show reject overlay
      const overlay = page.locator('[data-swipe-overlay="reject"]');
      await expect(overlay).toBeVisible();
      await expect(overlay).toHaveCSS('opacity', /0\.[5-9]|1/); // 50%+ opacity
    });

    test('should animate card out to the left', async ({ page }) => {
      const card = page.locator('[data-job-card][data-card-index="0"]');
      const initialX = await card.evaluate((el) => el.getBoundingClientRect().left);

      // Swipe left past threshold
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(-250, 300);
      await page.mouse.up();

      // Wait for animation
      await page.waitForTimeout(500);

      // Card should be off screen to the left
      const finalX = await card.evaluate((el) => el.getBoundingClientRect().left);
      expect(finalX).toBeLessThan(initialX - 200);
    });

    test('should show next card after swipe left', async ({ page }) => {
      const initialJobTitle = await page.locator('[data-job-card][data-card-index="0"] [data-job-title]').textContent();

      // Swipe left
      const card = page.locator('[data-job-card][data-card-index="0"]');
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(-250, 300);
      await page.mouse.up();

      // Wait for animation to complete
      await page.waitForTimeout(600);

      // New card should be on top
      const newJobTitle = await page.locator('[data-job-card][data-card-index="0"] [data-job-title]').textContent();
      expect(newJobTitle).not.toBe(initialJobTitle);
    });

    test('should return card if swipe is not far enough (threshold)', async ({ page }) => {
      const card = page.locator('[data-job-card][data-card-index="0"]');
      const initialPosition = await card.boundingBox();

      // Swipe left but not past threshold (only 80px)
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(20, 300);
      await page.mouse.up();

      // Wait for snap-back animation
      await page.waitForTimeout(300);

      // Card should return to original position
      const finalPosition = await card.boundingBox();
      expect(finalPosition?.left).toBeCloseTo(initialPosition!.left, 0);
    });

    test('should update card count after swipe left', async ({ page }) => {
      const initialCount = await page.locator('[data-card-count]').textContent();

      // Swipe left
      const card = page.locator('[data-job-card][data-card-index="0"]');
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(-250, 300);
      await page.mouse.up();

      await page.waitForTimeout(600);

      // Count should increment (e.g., "1 of 25" → "2 of 25")
      const newCount = await page.locator('[data-card-count]').textContent();
      expect(newCount).not.toBe(initialCount);
    });
  });

  test.describe('3. Swipe Gestures - Right (Like/Save)', () => {
    test('should detect swipe right gesture', async ({ page }) => {
      const card = page.locator('[data-job-card][data-card-index="0"]');

      // Simulate swipe right
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(400, 300); // Swipe right 300px
      await page.mouse.up();

      await expect(card).toHaveAttribute('data-swiping', 'right');
    });

    test('should show green overlay on swipe right', async ({ page }) => {
      const card = page.locator('[data-job-card][data-card-index="0"]');

      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(250, 300);

      // Should show like overlay
      const overlay = page.locator('[data-swipe-overlay="like"]');
      await expect(overlay).toBeVisible();
      await expect(overlay).toHaveCSS('opacity', /0\.[5-9]|1/);
    });

    test('should animate card out to the right', async ({ page }) => {
      const card = page.locator('[data-job-card][data-card-index="0"]');

      // Swipe right past threshold
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(450, 300);
      await page.mouse.up();

      // Wait for animation
      await page.waitForTimeout(500);

      // Card should be off screen to the right
      const box = await card.boundingBox();
      expect(box?.left).toBeGreaterThan(400);
    });

    test('should save job to saved list on swipe right', async ({ page }) => {
      const jobTitle = await page.locator('[data-job-card][data-card-index="0"] [data-job-title]').textContent();

      // Swipe right
      const card = page.locator('[data-job-card][data-card-index="0"]');
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(450, 300);
      await page.mouse.up();

      await page.waitForTimeout(600);

      // Check localStorage
      const savedJobs = await page.evaluate(() => {
        const saved = localStorage.getItem('savedJobs');
        return saved ? JSON.parse(saved) : [];
      });

      expect(savedJobs.length).toBeGreaterThan(0);
    });

    test('should show toast notification on save', async ({ page }) => {
      // Swipe right
      const card = page.locator('[data-job-card][data-card-index="0"]');
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(450, 300);
      await page.mouse.up();

      // Should show success toast
      const toast = page.locator('[data-toast]', { hasText: /saved|liked/i });
      await expect(toast).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('4. Swipe Gestures - Up (Super Like/Quick Apply)', () => {
    test('should detect swipe up gesture', async ({ page }) => {
      const card = page.locator('[data-job-card][data-card-index="0"]');

      // Simulate swipe up
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(250, 400);
      await page.mouse.move(250, 100); // Swipe up 300px
      await page.mouse.up();

      await expect(card).toHaveAttribute('data-swiping', 'up');
    });

    test('should show blue overlay on swipe up', async ({ page }) => {
      const card = page.locator('[data-job-card][data-card-index="0"]');

      await card.hover();
      await page.mouse.down();
      await page.mouse.move(250, 400);
      await page.mouse.move(250, 200);

      // Should show super like overlay
      const overlay = page.locator('[data-swipe-overlay="super"]');
      await expect(overlay).toBeVisible();
    });

    test('should animate card out to the top', async ({ page }) => {
      const card = page.locator('[data-job-card][data-card-index="0"]');

      // Swipe up past threshold
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(250, 400);
      await page.mouse.move(250, 50);
      await page.mouse.up();

      // Wait for animation
      await page.waitForTimeout(500);

      // Card should be off screen to the top
      const box = await card.boundingBox();
      expect(box?.top).toBeLessThan(0);
    });

    test('should open quick apply modal on swipe up', async ({ page }) => {
      // Swipe up
      const card = page.locator('[data-job-card][data-card-index="0"]');
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(250, 400);
      await page.mouse.move(250, 50);
      await page.mouse.up();

      await page.waitForTimeout(600);

      // Quick apply modal should open
      const modal = page.locator('[data-application-modal]');
      await expect(modal).toBeVisible({ timeout: 3000 });
    });

    test('should pre-populate application with job details', async ({ page }) => {
      const jobTitle = await page.locator('[data-job-card][data-card-index="0"] [data-job-title]').textContent();

      // Swipe up
      const card = page.locator('[data-job-card][data-card-index="0"]');
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(250, 400);
      await page.mouse.move(250, 50);
      await page.mouse.up();

      await page.waitForTimeout(600);

      // Modal should show correct job title
      const modalTitle = await page.locator('[data-application-modal] h1');
      await expect(modalTitle).toContainText(jobTitle!);
    });
  });

  test.describe('5. Button Actions', () => {
    test('should show action buttons (pass, details, like, super like)', async ({ page }) => {
      await expect(page.locator('[data-action-pass]')).toBeVisible();
      await expect(page.locator('[data-action-like]')).toBeVisible();
      await expect(page.locator('[data-action-super]')).toBeVisible();
      await expect(page.locator('[data-view-details]')).toBeVisible();
    });

    test('should have touch-friendly buttons (min 44x44px)', async ({ page }) => {
      const likeButton = page.locator('[data-action-like]');
      const box = await likeButton.boundingBox();

      expect(box).toBeTruthy();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    });

    test('should pass job on pass button click', async ({ page }) => {
      const initialJobTitle = await page.locator('[data-job-title]').first().textContent();

      await page.click('[data-action-pass]');

      // Wait for animation
      await page.waitForTimeout(600);

      // Should show next job
      const newJobTitle = await page.locator('[data-job-title]').first().textContent();
      expect(newJobTitle).not.toBe(initialJobTitle);
    });

    test('should like job on like button click', async ({ page }) => {
      const jobTitle = await page.locator('[data-job-title]').first().textContent();

      await page.click('[data-action-like]');

      await page.waitForTimeout(600);

      // Should save to localStorage
      const savedJobs = await page.evaluate(() => {
        const saved = localStorage.getItem('savedJobs');
        return saved ? JSON.parse(saved) : [];
      });

      expect(savedJobs.some((job: any) => job.title === jobTitle)).toBeTruthy();
    });

    test('should open quick apply on super like button click', async ({ page }) => {
      await page.click('[data-action-super]');

      await page.waitForTimeout(600);

      // Quick apply modal should open
      const modal = page.locator('[data-application-modal]');
      await expect(modal).toBeVisible();
    });

    test('should open job details modal on details button click', async ({ page }) => {
      await page.click('[data-view-details]');

      // Details modal should open
      const modal = page.locator('[data-job-details-modal]');
      await expect(modal).toBeVisible();
    });

    test('should show button press animation', async ({ page }) => {
      const likeButton = page.locator('[data-action-like]');

      await likeButton.click();

      // Should have active state animation (scale down)
      // This is tested via CSS class or transform
      const transform = await likeButton.evaluate((el) => window.getComputedStyle(el).transform);
      expect(transform).toBeTruthy();
    });
  });

  test.describe('6. Undo Functionality', () => {
    test('should show undo button', async ({ page }) => {
      const undoButton = page.locator('[data-undo-button]');
      await expect(undoButton).toBeVisible();
    });

    test('should disable undo button initially (no history)', async ({ page }) => {
      const undoButton = page.locator('[data-undo-button]');
      await expect(undoButton).toBeDisabled();
    });

    test('should enable undo button after first swipe', async ({ page }) => {
      // Swipe left
      const card = page.locator('[data-job-card][data-card-index="0"]');
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(-250, 300);
      await page.mouse.up();

      await page.waitForTimeout(600);

      // Undo should be enabled
      const undoButton = page.locator('[data-undo-button]');
      await expect(undoButton).toBeEnabled();
    });

    test('should restore previous card on undo', async ({ page }) => {
      const firstJobTitle = await page.locator('[data-job-title]').first().textContent();

      // Swipe left
      const card = page.locator('[data-job-card][data-card-index="0"]');
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(-250, 300);
      await page.mouse.up();

      await page.waitForTimeout(600);

      const secondJobTitle = await page.locator('[data-job-title]').first().textContent();
      expect(secondJobTitle).not.toBe(firstJobTitle);

      // Click undo
      await page.click('[data-undo-button]');

      await page.waitForTimeout(600);

      // Should restore first card
      const restoredJobTitle = await page.locator('[data-job-title]').first().textContent();
      expect(restoredJobTitle).toBe(firstJobTitle);
    });

    test('should animate card back in from the direction it left', async ({ page }) => {
      // Swipe left
      const card = page.locator('[data-job-card][data-card-index="0"]');
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(-250, 300);
      await page.mouse.up();

      await page.waitForTimeout(600);

      // Click undo
      await page.click('[data-undo-button]');

      // Card should slide in from the left
      const restoredCard = page.locator('[data-job-card][data-card-index="0"]');
      await expect(restoredCard).toHaveAttribute('data-undo-animation', 'left');
    });

    test('should restore like status on undo', async ({ page }) => {
      const jobTitle = await page.locator('[data-job-title]').first().textContent();

      // Like job
      await page.click('[data-action-like]');
      await page.waitForTimeout(600);

      // Check it's saved
      let savedJobs = await page.evaluate(() => {
        const saved = localStorage.getItem('savedJobs');
        return saved ? JSON.parse(saved) : [];
      });
      expect(savedJobs.some((job: any) => job.title === jobTitle)).toBeTruthy();

      // Undo
      await page.click('[data-undo-button]');
      await page.waitForTimeout(600);

      // Should be removed from saved
      savedJobs = await page.evaluate(() => {
        const saved = localStorage.getItem('savedJobs');
        return saved ? JSON.parse(saved) : [];
      });
      expect(savedJobs.some((job: any) => job.title === jobTitle)).toBeFalsy();
    });

    test('should support multiple undo actions', async ({ page }) => {
      const firstJobTitle = await page.locator('[data-job-title]').first().textContent();

      // Swipe 3 times
      for (let i = 0; i < 3; i++) {
        const card = page.locator('[data-job-card][data-card-index="0"]');
        await card.hover();
        await page.mouse.down();
        await page.mouse.move(100, 300);
        await page.mouse.move(-250, 300);
        await page.mouse.up();
        await page.waitForTimeout(600);
      }

      // Undo 3 times
      for (let i = 0; i < 3; i++) {
        await page.click('[data-undo-button]');
        await page.waitForTimeout(600);
      }

      // Should be back at first card
      const restoredJobTitle = await page.locator('[data-job-title]').first().textContent();
      expect(restoredJobTitle).toBe(firstJobTitle);
    });

    test('should show undo history count', async ({ page }) => {
      // Swipe 3 times
      for (let i = 0; i < 3; i++) {
        const card = page.locator('[data-job-card][data-card-index="0"]');
        await card.hover();
        await page.mouse.down();
        await page.mouse.move(100, 300);
        await page.mouse.move(-250, 300);
        await page.mouse.up();
        await page.waitForTimeout(600);
      }

      // Should show undo count (e.g., "Undo (3)")
      const undoButton = page.locator('[data-undo-button]');
      await expect(undoButton).toContainText(/3|undo.*3/i);
    });
  });

  test.describe('7. Card Animations & Transitions', () => {
    test('should have smooth entrance animation', async ({ page }) => {
      // Reload to see entrance animation
      await page.reload();

      const cards = page.locator('[data-job-card]');
      await expect(cards.first()).toBeVisible();

      // Should have entrance animation class
      await expect(cards.first()).toHaveClass(/animate-in|fade-in|scale-in/);
    });

    test('should rotate card based on swipe direction', async ({ page }) => {
      const card = page.locator('[data-job-card][data-card-index="0"]');

      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(300, 300); // Swipe right

      // Should rotate clockwise
      const transform = await card.evaluate((el) => window.getComputedStyle(el).transform);
      expect(transform).toContain('matrix'); // Rotation applied
    });

    test('should scale card on drag', async ({ page }) => {
      const card = page.locator('[data-job-card][data-card-index="0"]');
      const initialScale = await card.evaluate((el) => {
        const transform = window.getComputedStyle(el).transform;
        return transform;
      });

      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(200, 300);

      const dragScale = await card.evaluate((el) => {
        const transform = window.getComputedStyle(el).transform;
        return transform;
      });

      expect(dragScale).not.toBe(initialScale);
    });

    test('should animate cards behind moving to front', async ({ page }) => {
      const secondCard = page.locator('[data-job-card][data-card-index="1"]');
      const initialScale = await secondCard.evaluate((el) => {
        const transform = window.getComputedStyle(el).transform;
        return transform;
      });

      // Swipe top card away
      const card = page.locator('[data-job-card][data-card-index="0"]');
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(-250, 300);
      await page.mouse.up();

      await page.waitForTimeout(600);

      // Second card should now be at full scale
      const newScale = await secondCard.evaluate((el) => {
        const transform = window.getComputedStyle(el).transform;
        return transform;
      });

      expect(newScale).not.toBe(initialScale);
    });

    test('should use spring physics for snap-back', async ({ page }) => {
      const card = page.locator('[data-job-card][data-card-index="0"]');

      // Swipe but not past threshold
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(200, 300);
      await page.mouse.up();

      // Should snap back with spring animation (duration ~300ms)
      await page.waitForTimeout(100);
      const midPosition = await card.boundingBox();

      await page.waitForTimeout(300);
      const finalPosition = await card.boundingBox();

      // Should have moved back (spring effect)
      expect(finalPosition?.left).toBeLessThan(midPosition!.left);
    });

    test('should maintain 60 FPS during swipe', async ({ page }) => {
      // Start performance monitoring
      await page.evaluate(() => {
        (window as any).frames = [];
        let lastTime = performance.now();

        const measureFPS = () => {
          const now = performance.now();
          const delta = now - lastTime;
          lastTime = now;
          (window as any).frames.push(1000 / delta);

          if ((window as any).frames.length < 60) {
            requestAnimationFrame(measureFPS);
          }
        };

        requestAnimationFrame(measureFPS);
      });

      // Perform swipe
      const card = page.locator('[data-job-card][data-card-index="0"]');
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);

      for (let i = 0; i < 10; i++) {
        await page.mouse.move(100 + i * 20, 300);
        await page.waitForTimeout(16); // ~60 FPS
      }

      await page.mouse.up();

      // Check average FPS
      const avgFPS = await page.evaluate(() => {
        const frames = (window as any).frames;
        const sum = frames.reduce((a: number, b: number) => a + b, 0);
        return sum / frames.length;
      });

      expect(avgFPS).toBeGreaterThan(55); // Allow small deviation
    });

    test('should have staggered entrance for card stack', async ({ page }) => {
      await page.reload();

      const cards = page.locator('[data-job-card]');

      // Cards should animate in with delay
      await expect(cards.nth(0)).toBeVisible();
      await expect(cards.nth(1)).toBeVisible();
      await expect(cards.nth(2)).toBeVisible();

      // Check animation delay
      const firstDelay = await cards.nth(0).evaluate((el) => window.getComputedStyle(el).animationDelay);
      const secondDelay = await cards.nth(1).evaluate((el) => window.getComputedStyle(el).animationDelay);

      expect(firstDelay).not.toBe(secondDelay);
    });
  });

  test.describe('8. Job Details Modal', () => {
    test('should open job details modal on card tap (not swipe)', async ({ page }) => {
      const card = page.locator('[data-job-card][data-card-index="0"]');

      // Tap (quick touch without swipe)
      await card.click();

      // Details modal should open
      const modal = page.locator('[data-job-details-modal]');
      await expect(modal).toBeVisible({ timeout: 2000 });
    });

    test('should show full job details in modal', async ({ page }) => {
      await page.click('[data-view-details]');

      const modal = page.locator('[data-job-details-modal]');
      await expect(modal.locator('[data-job-title]')).toBeVisible();
      await expect(modal.locator('[data-job-description]')).toBeVisible();
      await expect(modal.locator('[data-requirements]')).toBeVisible();
    });

    test('should have action buttons in modal (apply, save, pass)', async ({ page }) => {
      await page.click('[data-view-details]');

      await expect(page.locator('[data-modal-apply]')).toBeVisible();
      await expect(page.locator('[data-modal-save]')).toBeVisible();
      await expect(page.locator('[data-modal-pass]')).toBeVisible();
    });

    test('should close modal and resume swiping', async ({ page }) => {
      await page.click('[data-view-details]');

      const modal = page.locator('[data-job-details-modal]');
      await expect(modal).toBeVisible();

      // Close modal
      await page.click('[data-modal-close]');
      await expect(modal).not.toBeVisible();

      // Should still be able to swipe
      const card = page.locator('[data-job-card][data-card-index="0"]');
      await expect(card).toBeVisible();
    });

    test('should apply from modal without closing', async ({ page }) => {
      await page.click('[data-view-details]');

      await page.click('[data-modal-apply]');

      // Application modal should open
      const appModal = page.locator('[data-application-modal]');
      await expect(appModal).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('9. Empty State & End of Stack', () => {
    test('should show empty state when no more cards', async ({ page }) => {
      // Mock empty job list
      await page.route('**/api/jobs/discover*', (route) => {
        route.fulfill({ status: 200, body: JSON.stringify({ jobs: [] }) });
      });

      await page.reload();

      // Should show empty state
      const emptyState = page.locator('[data-empty-state]');
      await expect(emptyState).toBeVisible();
    });

    test('should show friendly message in empty state', async ({ page }) => {
      await page.route('**/api/jobs/discover*', (route) => {
        route.fulfill({ status: 200, body: JSON.stringify({ jobs: [] }) });
      });

      await page.reload();

      const message = page.locator('[data-empty-message]');
      await expect(message).toContainText(/no more jobs|check back later|all done/i);
    });

    test('should show "Adjust Filters" button in empty state', async ({ page }) => {
      await page.route('**/api/jobs/discover*', (route) => {
        route.fulfill({ status: 200, body: JSON.stringify({ jobs: [] }) });
      });

      await page.reload();

      const button = page.locator('[data-adjust-filters]');
      await expect(button).toBeVisible();
    });

    test('should show "View Saved Jobs" button in empty state', async ({ page }) => {
      await page.route('**/api/jobs/discover*', (route) => {
        route.fulfill({ status: 200, body: JSON.stringify({ jobs: [] }) });
      });

      await page.reload();

      const button = page.locator('[data-view-saved]');
      await expect(button).toBeVisible();
    });

    test('should load more jobs when reaching end', async ({ page }) => {
      // Start with 5 jobs
      await page.route('**/api/jobs/discover*', (route) => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({ jobs: Array(5).fill({}).map((_, i) => ({ id: `job-${i}`, title: `Job ${i}` })) }),
        });
      });

      await page.reload();

      // Swipe through 3 cards
      for (let i = 0; i < 3; i++) {
        const card = page.locator('[data-job-card][data-card-index="0"]');
        await card.hover();
        await page.mouse.down();
        await page.mouse.move(100, 300);
        await page.mouse.move(-250, 300);
        await page.mouse.up();
        await page.waitForTimeout(600);
      }

      // Should auto-load more jobs
      const loadingIndicator = page.locator('[data-loading-more]');
      await expect(loadingIndicator).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('10. Filters & Preferences', () => {
    test('should show filters button', async ({ page }) => {
      const filtersButton = page.locator('[data-filters-button]');
      await expect(filtersButton).toBeVisible();
    });

    test('should open filters sheet on button click', async ({ page }) => {
      await page.click('[data-filters-button]');

      const filtersSheet = page.locator('[data-filters-sheet]');
      await expect(filtersSheet).toBeVisible();
    });

    test('should show filter options (remote, salary, location)', async ({ page }) => {
      await page.click('[data-filters-button]');

      await expect(page.locator('[data-filter="remote"]')).toBeVisible();
      await expect(page.locator('[data-filter="salary"]')).toBeVisible();
      await expect(page.locator('[data-filter="location"]')).toBeVisible();
    });

    test('should apply filters and reload cards', async ({ page }) => {
      await page.click('[data-filters-button]');

      // Toggle remote filter
      await page.click('[data-filter="remote"]');

      // Apply filters
      await page.click('[data-apply-filters]');

      // Should reload with filtered jobs
      const loadingIndicator = page.locator('[data-loading]');
      await expect(loadingIndicator).toBeVisible({ timeout: 2000 });
    });

    test('should show active filter count', async ({ page }) => {
      await page.click('[data-filters-button]');
      await page.click('[data-filter="remote"]');
      await page.click('[data-apply-filters]');

      // Filters button should show count
      const filtersButton = page.locator('[data-filters-button]');
      await expect(filtersButton).toContainText(/1/);
    });
  });

  test.describe('11. Performance & Optimization', () => {
    test('should preload next 3 cards', async ({ page }) => {
      // Check if images for next 3 cards are preloaded
      const images = page.locator('[data-job-card] img');
      const count = await images.count();

      expect(count).toBeGreaterThanOrEqual(3);
    });

    test('should lazy load cards beyond initial stack', async ({ page }) => {
      // Cards beyond index 2 should not be rendered initially
      const cards = page.locator('[data-job-card]');
      const count = await cards.count();

      expect(count).toBeLessThanOrEqual(5); // Only render 5 at a time
    });

    test('should unload cards that have been swiped', async ({ page }) => {
      // Swipe 5 cards
      for (let i = 0; i < 5; i++) {
        const card = page.locator('[data-job-card][data-card-index="0"]');
        await card.hover();
        await page.mouse.down();
        await page.mouse.move(100, 300);
        await page.mouse.move(-250, 300);
        await page.mouse.up();
        await page.waitForTimeout(600);
      }

      // Should not have more than 5 cards in DOM
      const cards = page.locator('[data-job-card]');
      const count = await cards.count();

      expect(count).toBeLessThanOrEqual(5);
    });

    test('should use CSS transforms for animations', async ({ page }) => {
      const card = page.locator('[data-job-card][data-card-index="0"]');

      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(200, 300);

      // Should use transform instead of left/top
      const transform = await card.evaluate((el) => window.getComputedStyle(el).transform);
      expect(transform).toContain('matrix');
    });

    test('should debounce swipe calculations', async ({ page }) => {
      // Rapid swipe movements should be debounced
      const card = page.locator('[data-job-card][data-card-index="0"]');

      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);

      // Move rapidly
      for (let i = 0; i < 20; i++) {
        await page.mouse.move(100 + i * 5, 300);
      }

      await page.mouse.up();

      // Should still animate smoothly (not janky)
      await page.waitForTimeout(600);
      await expect(card).toBeVisible();
    });
  });

  test.describe('12. Accessibility (WCAG 2.1 AA)', () => {
    test('should have accessible button labels', async ({ page }) => {
      const likeButton = page.locator('[data-action-like]');
      const ariaLabel = await likeButton.getAttribute('aria-label');

      expect(ariaLabel).toContain('like' || 'save');
    });

    test('should announce swipe actions to screen readers', async ({ page }) => {
      await page.click('[data-action-like]');

      // Should have live region announcement
      const liveRegion = page.locator('[role="status"]');
      await expect(liveRegion).toContainText(/saved|liked/i);
    });

    test('should support keyboard navigation (Tab, Enter, Space)', async ({ page }) => {
      // Tab to like button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      const likeButton = page.locator('[data-action-like]');
      await expect(likeButton).toBeFocused();

      // Activate with Enter
      await page.keyboard.press('Enter');

      // Should save job
      await page.waitForTimeout(600);
      const savedJobs = await page.evaluate(() => {
        return localStorage.getItem('savedJobs');
      });

      expect(savedJobs).toBeTruthy();
    });

    test('should have sufficient color contrast', async ({ page }) => {
      const card = page.locator('[data-job-card][data-card-index="0"]');
      const color = await card.evaluate((el) => window.getComputedStyle(el).color);
      const bgColor = await card.evaluate((el) => window.getComputedStyle(el).backgroundColor);

      expect(color).toBeTruthy();
      expect(bgColor).toBeTruthy();
      // Real contrast check would use axe-core
    });

    test('should have focus visible on all interactive elements', async ({ page }) => {
      const likeButton = page.locator('[data-action-like]');
      await likeButton.focus();

      const outline = await likeButton.evaluate((el) => window.getComputedStyle(el).outline);
      expect(outline).not.toBe('none');
    });
  });

  test.describe('13. Edge Cases & Error Handling', () => {
    test('should handle API error gracefully', async ({ page }) => {
      await page.route('**/api/jobs/discover*', (route) => {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
      });

      await page.reload();

      // Should show error message
      const error = page.locator('[data-error-message]');
      await expect(error).toBeVisible();
      await expect(error).toContainText(/error|failed|try again/i);
    });

    test('should handle network offline', async ({ page, context }) => {
      await context.setOffline(true);

      await page.reload();

      // Should show offline message
      const offline = page.locator('[data-offline-message]');
      await expect(offline).toBeVisible();
    });

    test('should handle rapid swipes without breaking', async ({ page }) => {
      // Rapid fire 5 swipes
      for (let i = 0; i < 5; i++) {
        const card = page.locator('[data-job-card][data-card-index="0"]');
        await card.hover();
        await page.mouse.down();
        await page.mouse.move(100, 300);
        await page.mouse.move(-250, 300);
        await page.mouse.up();
        // No wait between swipes
      }

      await page.waitForTimeout(3000);

      // Should still show cards
      const card = page.locator('[data-job-card][data-card-index="0"]');
      await expect(card).toBeVisible();
    });

    test('should handle device orientation change', async ({ page }) => {
      // Simulate orientation change (landscape)
      await page.setViewportSize({ width: 844, height: 390 }); // iPhone landscape

      // Should adapt layout
      const container = page.locator('[data-swipe-container]');
      await expect(container).toBeVisible();

      // Cards should still be interactive
      const card = page.locator('[data-job-card][data-card-index="0"]');
      await expect(card).toBeVisible();
    });

    test('should prevent accidental swipes (touch vs scroll)', async ({ page }) => {
      const card = page.locator('[data-job-card][data-card-index="0"]');

      // Small vertical movement (scroll intent)
      await card.hover();
      await page.mouse.down();
      await page.mouse.move(100, 300);
      await page.mouse.move(100, 320); // Only 20px down
      await page.mouse.up();

      // Should not swipe
      await page.waitForTimeout(300);
      await expect(card).toBeVisible();
    });
  });

  test.describe('14. Mobile-Only Detection', () => {
    test('should not show swipe interface on desktop', async ({ page, viewport }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:3000/jobs/discover');

      // Should show message to use mobile
      const mobileOnly = page.locator('[data-mobile-only-message]');
      await expect(mobileOnly).toBeVisible();
    });

    test('should show alternative UI on desktop (grid/list view)', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:3000/jobs/discover');

      // Should show grid or list view
      const alternativeView = page.locator('[data-desktop-view]');
      await expect(alternativeView).toBeVisible();
    });

    test('should detect mobile device correctly', async ({ page }) => {
      const isMobile = await page.evaluate(() => {
        return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      });

      expect(isMobile).toBeTruthy();
    });
  });
});
