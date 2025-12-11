/**
 * E2E Tests: Performance Optimization - Core Web Vitals (Issue #144)
 *
 * Following TDD/BDD approach:
 * - Tests written BEFORE optimization
 * - Tests will FAIL initially (Red phase)
 * - Optimizations will make tests pass (Green phase)
 *
 * @see tests/features/performance-optimization.feature
 */

import { test, expect, Page } from '@playwright/test';

/**
 * Helper: Measure Core Web Vitals using web-vitals library
 */
async function measureWebVitals(page: Page) {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      const vitals: any = {
        lcp: null,
        fid: null,
        cls: null,
        fcp: null,
        ttfb: null,
      };

      // LCP - Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        vitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // FID - First Input Delay (requires user interaction)
      new PerformanceObserver((list) => {
        const firstInput = list.getEntries()[0] as any;
        vitals.fid = firstInput.processingStart - firstInput.startTime;
      }).observe({ entryTypes: ['first-input'] });

      // CLS - Cumulative Layout Shift
      let clsScore = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as any[]) {
          if (!(entry as any).hadRecentInput) {
            clsScore += (entry as any).value;
          }
        }
        vitals.cls = clsScore;
      }).observe({ entryTypes: ['layout-shift'] });

      // FCP - First Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        vitals.fcp = entries[0].startTime;
      }).observe({ entryTypes: ['paint'] });

      // TTFB - Time to First Byte
      const navigationTiming = performance.getEntriesByType('navigation')[0] as any;
      vitals.ttfb = navigationTiming ? navigationTiming.responseStart : null;

      // Wait a bit to collect metrics, then resolve
      setTimeout(() => resolve(vitals), 3000);
    });
  });
}

test.describe('Performance Optimization - Issue #144', () => {
  test.describe.configure({ mode: 'serial' });

  // ============================================================================
  // 1. Largest Contentful Paint (LCP) - Critical
  // ============================================================================

  test.describe('Largest Contentful Paint (LCP)', () => {
    test('@critical should have LCP under 2.5s on dashboard', async ({ page }) => {
      await page.goto('/dashboard');

      const vitals: any = await measureWebVitals(page);

      console.log(`LCP: ${vitals.lcp}ms`);

      // LCP should be under 2500ms (2.5 seconds)
      expect(vitals.lcp).toBeLessThan(2500);
      expect(vitals.lcp).toBeGreaterThan(0);
    });

    test('should have LCP under 2.5s on jobs page', async ({ page }) => {
      await page.goto('/jobs');

      // Wait for content to load
      await page.waitForSelector('[data-testid="job-card"], .job-listing', { timeout: 5000 });

      const vitals: any = await measureWebVitals(page);

      console.log(`Jobs Page LCP: ${vitals.lcp}ms`);
      expect(vitals.lcp).toBeLessThan(2500);
    });

    test('should have images with explicit dimensions to prevent shifts', async ({ page }) => {
      await page.goto('/dashboard');

      // Check all images have width/height attributes
      const imagesWithoutDimensions = await page.locator('img:not([width]):not([height])').count();

      console.log(`Images without dimensions: ${imagesWithoutDimensions}`);

      // Allow some exceptions, but should be minimal
      expect(imagesWithoutDimensions).toBeLessThan(5);
    });
  });

  // ============================================================================
  // 2. First Input Delay (FID) - Interactivity
  // ============================================================================

  test.describe('First Input Delay (FID)', () => {
    test('@critical should respond to first click within 100ms', async ({ page }) => {
      await page.goto('/dashboard');

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle');

      // Find a clickable button
      const button = page.locator('button').first();

      // Measure time from click to response
      const startTime = Date.now();

      await button.click({ force: true }).catch(() => {
        // Button might not be actionable, that's ok for this test
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      console.log(`First input response time: ${responseTime}ms`);

      // Should respond within 100ms
      expect(responseTime).toBeLessThan(100);
    });

    test('should have minimal long tasks', async ({ page }) => {
      await page.goto('/dashboard');

      // Check for long tasks using Performance API
      const longTasks = await page.evaluate(() => {
        return new Promise((resolve) => {
          const tasks: number[] = [];

          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              tasks.push(entry.duration);
            }
          }).observe({ entryTypes: ['longtask'] });

          setTimeout(() => resolve(tasks), 5000);
        });
      });

      console.log(`Long tasks detected: ${(longTasks as number[]).length}`);

      // Should have few long tasks
      expect((longTasks as number[]).length).toBeLessThan(3);
    });
  });

  // ============================================================================
  // 3. Cumulative Layout Shift (CLS)
  // ============================================================================

  test.describe('Cumulative Layout Shift (CLS)', () => {
    test('@critical should have CLS under 0.1', async ({ page }) => {
      await page.goto('/dashboard');

      const vitals: any = await measureWebVitals(page);

      console.log(`CLS: ${vitals.cls}`);

      // CLS should be under 0.1
      expect(vitals.cls).toBeLessThan(0.1);
      expect(vitals.cls).toBeGreaterThanOrEqual(0);
    });

    test('should not shift when images load', async ({ page }) => {
      await page.goto('/jobs');

      // Measure CLS before and after images load
      const initialCLS = await page.evaluate(() => {
        let cls = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!entry.hadRecentInput) {
              cls += entry.value;
            }
          }
        }).observe({ entryTypes: ['layout-shift'] });

        return cls;
      });

      // Wait for all images to load
      await page.waitForLoadState('networkidle');

      await page.waitForTimeout(2000);

      const finalCLS: any = await measureWebVitals(page);

      console.log(`CLS after images: ${finalCLS.cls}`);

      expect(finalCLS.cls).toBeLessThan(0.1);
    });
  });

  // ============================================================================
  // 4. Bundle Size
  // ============================================================================

  test.describe('Bundle Size', () => {
    test('should have total JS under 500KB', async ({ page }) => {
      const jsRequests: any[] = [];

      page.on('response', (response) => {
        const url = response.url();
        if (url.includes('.js') && response.status() === 200) {
          response.body().then((body) => {
            jsRequests.push({
              url,
              size: body.length,
            });
          }).catch(() => {});
        }
      });

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Wait a bit for all responses
      await page.waitForTimeout(2000);

      const totalJSSize = jsRequests.reduce((sum, req) => sum + req.size, 0);
      const totalJSKB = (totalJSSize / 1024).toFixed(2);

      console.log(`Total JS size: ${totalJSKB} KB`);
      console.log(`Number of JS files: ${jsRequests.length}`);

      // Total JS should be under 500KB uncompressed (will be ~200KB gzipped)
      expect(totalJSSize).toBeLessThan(500 * 1024);
    });

    test('should have initial page weight under 1MB', async ({ page }) => {
      let totalBytes = 0;

      page.on('response', async (response) => {
        try {
          const body = await response.body();
          totalBytes += body.length;
        } catch (e) {
          // Some responses might not have a body
        }
      });

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);

      console.log(`Total page weight: ${totalMB} MB`);

      // Should be under 1MB for initial load
      expect(totalBytes).toBeLessThan(1 * 1024 * 1024);
    });
  });

  // ============================================================================
  // 5. Image Optimization
  // ============================================================================

  test.describe('Image Optimization', () => {
    test('should serve images in modern formats (WebP/AVIF)', async ({ page }) => {
      const imageFormats: string[] = [];

      page.on('response', (response) => {
        const url = response.url();
        const contentType = response.headers()['content-type'];

        if (contentType && contentType.includes('image')) {
          imageFormats.push(contentType);
        }
      });

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      console.log(`Image formats served: ${imageFormats.join(', ')}`);

      // Most images should be WebP or AVIF
      const modernFormats = imageFormats.filter((f) =>
        f.includes('webp') || f.includes('avif')
      );

      const modernFormatRatio = modernFormats.length / imageFormats.length;

      console.log(`Modern format ratio: ${(modernFormatRatio * 100).toFixed(1)}%`);

      // At least 50% should be modern formats
      expect(modernFormatRatio).toBeGreaterThan(0.5);
    });

    test('should lazy load below-the-fold images', async ({ page }) => {
      await page.goto('/jobs');

      // Get all images
      const allImages = await page.locator('img').count();

      // Get loaded images
      const loadedImages = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter((img) => img.complete).length;
      });

      console.log(`Total images: ${allImages}, Loaded: ${loadedImages}`);

      // Not all images should be loaded immediately (lazy loading working)
      expect(loadedImages).toBeLessThan(allImages);
    });
  });

  // ============================================================================
  // 6. Resource Loading
  // ============================================================================

  test.describe('Resource Loading', () => {
    test('should have TTFB under 600ms', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/dashboard');

      // Get TTFB from Performance API
      const ttfb = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as any;
        return navigation ? navigation.responseStart : null;
      });

      console.log(`TTFB: ${ttfb}ms`);

      if (ttfb) {
        expect(ttfb).toBeLessThan(600);
      }
    });

    test('should have FCP under 1.8 seconds', async ({ page }) => {
      await page.goto('/dashboard');

      const vitals: any = await measureWebVitals(page);

      console.log(`FCP: ${vitals.fcp}ms`);

      // First Contentful Paint should be under 1.8 seconds
      expect(vitals.fcp).toBeLessThan(1800);
    });

    test('should use compression for text assets', async ({ page }) => {
      const compressedResponses: any[] = [];

      page.on('response', (response) => {
        const contentEncoding = response.headers()['content-encoding'];
        const contentType = response.headers()['content-type'];

        if (contentType && (contentType.includes('javascript') || contentType.includes('css') || contentType.includes('html'))) {
          compressedResponses.push({
            url: response.url(),
            compressed: contentEncoding === 'gzip' || contentEncoding === 'br',
            encoding: contentEncoding,
          });
        }
      });

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const compressionRatio = compressedResponses.filter((r) => r.compressed).length / compressedResponses.length;

      console.log(`Compression ratio: ${(compressionRatio * 100).toFixed(1)}%`);

      // Most text assets should be compressed
      expect(compressionRatio).toBeGreaterThan(0.8);
    });
  });

  // ============================================================================
  // 7. Runtime Performance
  // ============================================================================

  test.describe('Runtime Performance', () => {
    test('should maintain 60fps during scroll', async ({ page }) => {
      await page.goto('/jobs');

      // Measure frame rate during scroll
      const frameRate = await page.evaluate(async () => {
        return new Promise((resolve) => {
          let frameCount = 0;
          let lastTime = performance.now();

          const measureFrameRate = () => {
            frameCount++;
            const currentTime = performance.now();

            if (currentTime - lastTime >= 1000) {
              resolve(frameCount);
            } else {
              requestAnimationFrame(measureFrameRate);
            }
          };

          // Scroll to trigger rendering
          window.scrollBy(0, 100);

          requestAnimationFrame(measureFrameRate);
        });
      });

      console.log(`Frame rate: ${frameRate} fps`);

      // Should be close to 60 fps
      expect(frameRate).toBeGreaterThan(50);
    });
  });

  // ============================================================================
  // 8. Specific Page Performance
  // ============================================================================

  test.describe('Page-Specific Performance', () => {
    test('dashboard should be interactive in under 2 seconds', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/dashboard');

      // Wait for a key interactive element
      await page.waitForSelector('button, a, [role="button"]', { state: 'visible' });

      const loadTime = Date.now() - startTime;

      console.log(`Dashboard interactive in: ${loadTime}ms`);

      // Should be interactive in under 2 seconds
      expect(loadTime).toBeLessThan(2000);
    });

    test('jobs page should load without lag', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/jobs');

      // Wait for job cards to appear
      await page.waitForSelector('[data-testid="job-card"], .job-listing', { timeout: 5000 });

      const loadTime = Date.now() - startTime;

      console.log(`Jobs page loaded in: ${loadTime}ms`);

      // Should load reasonably fast
      expect(loadTime).toBeLessThan(3000);
    });
  });

  // ============================================================================
  // 9. Acceptance Criteria
  // ============================================================================

  test.describe('Acceptance Criteria', () => {
    test('@acceptance all Core Web Vitals should be green', async ({ page }) => {
      await page.goto('/dashboard');

      const vitals: any = await measureWebVitals(page);

      console.log('Core Web Vitals:');
      console.log(`- LCP: ${vitals.lcp}ms (target: <2500ms)`);
      console.log(`- CLS: ${vitals.cls} (target: <0.1)`);

      // LCP should be green (<2.5s)
      expect(vitals.lcp).toBeLessThan(2500);

      // CLS should be green (<0.1)
      expect(vitals.cls).toBeLessThan(0.1);

      // All vitals should be defined
      expect(vitals.lcp).toBeTruthy();
      expect(vitals.cls).toBeDefined();
    });

    test('@acceptance page should load under performance budget', async ({ page }) => {
      let totalBytes = 0;

      page.on('response', async (response) => {
        try {
          const body = await response.body();
          totalBytes += body.length;
        } catch (e) {}
      });

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const totalKB = (totalBytes / 1024).toFixed(2);

      console.log(`Total page weight: ${totalKB} KB`);

      // Performance budget: under 1MB
      expect(totalBytes).toBeLessThan(1024 * 1024);
    });
  });
});
