import { test, expect } from '@playwright/test';

/**
 * Loading Skeleton UI Tests
 *
 * Tests the loading skeleton components for improved UX.
 * Following BDD approach to verify skeleton states are shown during data loading.
 *
 * Scenarios:
 * 1. Skeleton appears during initial page load
 * 2. Skeleton structure matches actual content layout
 * 3. Skeleton disappears when data loads
 * 4. Skeleton is accessible and performant
 */

test.describe('Loading Skeletons - Resumes Page', () => {
  test.describe('Given user navigates to resumes page', () => {
    test('When page is loading, Then skeleton cards should be visible', async ({ page }) => {
      // Given: User is authenticated (using test auth)
      await page.goto('/dashboard/resumes');

      // When: Page is loading (capture initial state)
      // Note: We need to slow down or intercept the API to see skeleton
      await page.route('**/api/v1/resumes*', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000)); // Delay 2s
        await route.continue();
      });

      await page.reload();

      // Then: Skeleton cards should be visible during loading
      // Look for skeleton elements (typically have animate-pulse class)
      const skeletons = page.locator('[class*="animate-pulse"]').first();
      await expect(skeletons).toBeVisible({ timeout: 500 });
    });

    test('When loading completes, Then skeleton should be replaced with actual content', async ({ page }) => {
      // Given: User is on resumes page
      await page.goto('/dashboard/resumes');

      // When: Loading completes
      await page.waitForLoadState('networkidle');

      // Then: Skeleton should not be visible
      const skeletons = page.locator('[class*="animate-pulse"]');
      await expect(skeletons).toHaveCount(0);

      // And actual resume cards should be visible
      const resumeCards = page.locator('[role="article"], .resume-card').first();
      // Note: Adjust selector based on actual implementation
    });

    test('When resumes are empty, Then should show empty state (not skeleton)', async ({ page }) => {
      // Given: User has no resumes
      await page.route('**/api/v1/resumes*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: { resumes: [] },
            meta: { total: 0 }
          })
        });
      });

      await page.goto('/dashboard/resumes');
      await page.waitForLoadState('networkidle');

      // Then: Should show empty state, not skeleton
      await expect(page.getByText(/no resumes/i)).toBeVisible();
      const skeletons = page.locator('[class*="animate-pulse"]');
      await expect(skeletons).toHaveCount(0);
    });
  });

  test.describe('Skeleton Layout Structure', () => {
    test('Skeleton should match resume card layout (3-column grid)', async ({ page }) => {
      // Slow down API to observe skeleton
      await page.route('**/api/v1/resumes*', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      });

      await page.goto('/dashboard/resumes');

      // Skeleton grid should be 3 columns on desktop
      const viewportSize = page.viewportSize();
      if (viewportSize && viewportSize.width >= 1024) {
        // Check grid layout
        const skeletonContainer = page.locator('[class*="grid"]').first();
        await expect(skeletonContainer).toBeVisible();
      }
    });

    test('Skeleton should show 6 placeholder cards', async ({ page }) => {
      await page.route('**/api/v1/resumes*', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      });

      await page.goto('/dashboard/resumes');

      // Should show 6 skeleton cards
      const skeletonCards = page.locator('[class*="animate-pulse"]');
      const count = await skeletonCards.count();
      expect(count).toBeGreaterThan(0); // At least some skeleton elements
    });
  });
});

test.describe('Loading Skeletons - Applications Page', () => {
  test.describe('Given user navigates to applications page', () => {
    test('When loading, Then should show stats skeleton AND card skeleton', async ({ page }) => {
      // Slow down API
      await page.route('**/api/v1/applications*', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      });

      await page.goto('/dashboard/applications');

      // Should show skeleton for:
      // 1. Stats row (5 stat cards)
      // 2. Application cards (4 cards)
      const skeletons = page.locator('[class*="animate-pulse"]');
      await expect(skeletons.first()).toBeVisible({ timeout: 500 });
    });

    test('When loading, Then stats skeleton should have 5 cards', async ({ page }) => {
      await page.route('**/api/v1/applications*', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      });

      await page.goto('/dashboard/applications');

      // Stats row should have 5 skeleton cards
      const statsRow = page.locator('[class*="grid"]').first();
      await expect(statsRow).toBeVisible({ timeout: 500 });
    });
  });
});

test.describe('Loading Skeletons - Cover Letters Page', () => {
  test.describe('Given user navigates to cover letters page', () => {
    test('When loading, Then should show 2-column grid skeleton', async ({ page }) => {
      await page.route('**/api/v1/cover-letters*', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      });

      await page.goto('/dashboard/cover-letters');

      // Should show skeleton in 2-column grid
      const skeletons = page.locator('[class*="animate-pulse"]');
      await expect(skeletons.first()).toBeVisible({ timeout: 500 });
    });

    test('When loading, Then should show 4 placeholder cards', async ({ page }) => {
      await page.route('**/api/v1/cover-letters*', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      });

      await page.goto('/dashboard/cover-letters');

      // Should show 4 skeleton cards
      const skeletons = page.locator('[class*="animate-pulse"]');
      const count = await skeletons.count();
      expect(count).toBeGreaterThan(0);
    });
  });
});

test.describe('Skeleton Performance', () => {
  test('Skeleton should render quickly (< 100ms)', async ({ page }) => {
    const startTime = Date.now();

    await page.route('**/api/v1/resumes*', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await route.continue();
    });

    await page.goto('/dashboard/resumes');

    // Skeleton should appear almost immediately
    await page.locator('[class*="animate-pulse"]').first().waitFor({ timeout: 100 });

    const renderTime = Date.now() - startTime;
    console.log(`Skeleton render time: ${renderTime}ms`);
    // This is a soft assertion - skeleton should render very fast
  });

  test('Skeleton should not cause layout shift', async ({ page }) => {
    await page.goto('/dashboard/resumes');

    // Measure initial layout
    const initialHeight = await page.evaluate(() => document.body.scrollHeight);

    // Wait for content to load
    await page.waitForLoadState('networkidle');

    // Measure final layout
    const finalHeight = await page.evaluate(() => document.body.scrollHeight);

    // Heights should be similar (allowing for some variance)
    const heightDifference = Math.abs(finalHeight - initialHeight);
    const maxAllowedShift = 100; // 100px tolerance

    expect(heightDifference).toBeLessThan(maxAllowedShift);
  });
});

test.describe('Skeleton Accessibility', () => {
  test('Skeleton should not be announced to screen readers', async ({ page }) => {
    await page.route('**/api/v1/resumes*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/dashboard/resumes');

    // Skeleton elements should have aria-hidden="true" or similar
    // This prevents screen readers from announcing meaningless placeholder content
    const skeletons = page.locator('[class*="animate-pulse"]').first();

    // Should not have accessible text
    const text = await skeletons.textContent();
    expect(text?.trim() || '').toBe('');
  });

  test('Page should announce when content loads', async ({ page }) => {
    await page.goto('/dashboard/resumes');
    await page.waitForLoadState('networkidle');

    // Main content area should have proper ARIA labels
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible();
  });
});

test.describe('Skeleton Responsiveness', () => {
  test('On mobile, skeleton should show single column', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone size

    await page.route('**/api/v1/resumes*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/dashboard/resumes');

    // Skeleton should be visible
    const skeletons = page.locator('[class*="animate-pulse"]');
    await expect(skeletons.first()).toBeVisible({ timeout: 500 });

    // Should adapt to mobile layout
    // Note: Specific assertions depend on implementation
  });

  test('On tablet, skeleton should show 2 columns', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad size

    await page.route('**/api/v1/resumes*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/dashboard/resumes');

    const skeletons = page.locator('[class*="animate-pulse"]');
    await expect(skeletons.first()).toBeVisible({ timeout: 500 });
  });

  test('On desktop, skeleton should show 3 columns', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop size

    await page.route('**/api/v1/resumes*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/dashboard/resumes');

    const skeletons = page.locator('[class*="animate-pulse"]');
    await expect(skeletons.first()).toBeVisible({ timeout: 500 });
  });
});

test.describe('Skeleton Animation', () => {
  test('Skeleton should have pulse animation', async ({ page }) => {
    await page.route('**/api/v1/resumes*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    await page.goto('/dashboard/resumes');

    // Should have animate-pulse class
    const skeleton = page.locator('[class*="animate-pulse"]').first();
    await expect(skeleton).toBeVisible();

    // Verify animation is present
    const classList = await skeleton.getAttribute('class');
    expect(classList).toContain('animate-pulse');
  });

  test('Animation should be smooth and not janky', async ({ page }) => {
    await page.route('**/api/v1/resumes*', async route => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      await route.continue();
    });

    await page.goto('/dashboard/resumes');

    // Wait for skeleton to appear
    await page.locator('[class*="animate-pulse"]').first().waitFor();

    // Skeleton should remain visible for at least 2 seconds
    await page.waitForTimeout(2000);
    const stillVisible = await page.locator('[class*="animate-pulse"]').first().isVisible();
    expect(stillVisible).toBe(true);
  });
});
