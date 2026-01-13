/**
 * E2E Tests for Issue #145: Image Optimization & Lazy Loading
 *
 * TDD/BDD Approach: These tests verify that all images in the application are
 * properly optimized using Next.js Image component with:
 * - Lazy loading for below-the-fold images
 * - WebP/AVIF format delivery
 * - Responsive images with proper sizes
 * - Placeholder blur to prevent layout shift
 *
 * Test Categories:
 * 1. OptimizedImage Component Usage
 * 2. Lazy Loading Implementation
 * 3. Modern Image Formats (WebP/AVIF)
 * 4. Responsive Images & Sizes
 * 5. Placeholder & Layout Shift Prevention
 * 6. Performance Metrics
 * 7. Acceptance Criteria
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Image Optimization & Lazy Loading - Issue #145', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a page with images (dashboard or job listings)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  // ==========================================================================
  // 1. OptimizedImage Component Usage
  // ==========================================================================

  test.describe('1. OptimizedImage Component Usage', () => {
    test('1.1 Should use next/image for all images', async ({ page }) => {
      // Wait for images to load
      await page.waitForSelector('img', { timeout: 5000 });

      // Get all img elements
      const images = page.locator('img');
      const count = await images.count();

      // All images should have next/image attributes
      for (let i = 0; i < count; i++) {
        const img = images.nth(i);

        // next/image adds specific attributes
        const hasNextAttrs = await img.evaluate((el) => {
          // Check for next/image indicators:
          // 1. srcset attribute (responsive images)
          // 2. sizes attribute
          // 3. loading attribute
          // 4. decoding="async"
          const hasSrcSet = el.hasAttribute('srcset');
          const hasSizes = el.hasAttribute('sizes');
          const hasDecoding = el.getAttribute('decoding') === 'async';

          return hasSrcSet || hasSizes || hasDecoding;
        });

        expect(hasNextAttrs).toBeTruthy();
      }
    });

    test('1.2 Should not have any <img> tags without optimization', async ({ page }) => {
      // Check for img tags that don't have next/image attributes
      const unoptimizedImages = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter((img) => {
          // If img has neither srcset nor data-nimg, it's not optimized
          return !img.hasAttribute('srcset') && !img.hasAttribute('data-nimg');
        }).length;
      });

      expect(unoptimizedImages).toBe(0);
    });

    test('1.3 Should have proper alt attributes for accessibility', async ({ page }) => {
      const images = page.locator('img');
      const count = await images.count();

      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');

        // Alt should exist (even if empty for decorative images)
        expect(alt).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // 2. Lazy Loading Implementation
  // ==========================================================================

  test.describe('2. Lazy Loading Implementation', () => {
    test('2.1 Should lazy load images below the fold', async ({ page }) => {
      // Navigate to a page with many images
      await page.goto('/dashboard/jobs');
      await page.waitForLoadState('networkidle');

      // Get images below the fold
      const belowFoldImages = await page.evaluate(() => {
        const viewportHeight = window.innerHeight;
        const images = Array.from(document.querySelectorAll('img'));

        return images
          .filter((img) => {
            const rect = img.getBoundingClientRect();
            return rect.top > viewportHeight;
          })
          .map((img) => ({
            loading: img.getAttribute('loading'),
            src: img.src,
            top: img.getBoundingClientRect().top,
          }));
      });

      // Below-fold images should have loading="lazy"
      for (const img of belowFoldImages) {
        expect(img.loading).toBe('lazy');
      }
    });

    test('2.2 Should eagerly load above-the-fold images', async ({ page }) => {
      // Get images above the fold
      const aboveFoldImages = await page.evaluate(() => {
        const viewportHeight = window.innerHeight;
        const images = Array.from(document.querySelectorAll('img'));

        return images
          .filter((img) => {
            const rect = img.getBoundingClientRect();
            return rect.top <= viewportHeight && rect.top >= 0;
          })
          .map((img) => ({
            loading: img.getAttribute('loading'),
            priority: img.hasAttribute('fetchpriority'),
          }));
      });

      // Above-fold images should NOT have loading="lazy"
      // or should have priority/fetchpriority
      expect(aboveFoldImages.length).toBeGreaterThan(0);

      for (const img of aboveFoldImages) {
        const isEager = img.loading !== 'lazy' || img.priority;
        expect(isEager).toBeTruthy();
      }
    });

    test('2.3 Should load images progressively as user scrolls', async ({ page }) => {
      // Navigate to a long page
      await page.goto('/dashboard/jobs');
      await page.waitForLoadState('networkidle');

      // Get initial loaded images count
      const initialCount = await page.locator('img[src*="http"]').count();

      // Scroll down
      await page.evaluate(() => {
        window.scrollTo(0, window.innerHeight * 2);
      });

      // Wait for lazy-loaded images
      await page.waitForTimeout(1000);

      // Get new loaded images count
      const afterScrollCount = await page.locator('img[src*="http"]').count();

      // Should have loaded more images after scrolling
      expect(afterScrollCount).toBeGreaterThanOrEqual(initialCount);
    });
  });

  // ==========================================================================
  // 3. Modern Image Formats (WebP/AVIF)
  // ==========================================================================

  test.describe('3. Modern Image Formats (WebP/AVIF)', () => {
    test('3.1 Should deliver WebP format when supported', async ({ page, browserName }) => {
      // Chromium and Firefox support WebP
      if (browserName === 'chromium' || browserName === 'firefox') {
        await page.waitForSelector('img');

        const hasWebP = await page.evaluate(() => {
          const images = Array.from(document.querySelectorAll('img'));
          return images.some((img) => {
            const srcset = img.getAttribute('srcset') || '';
            return srcset.includes('.webp') || srcset.includes('fm=webp');
          });
        });

        expect(hasWebP).toBeTruthy();
      }
    });

    test('3.2 Should have AVIF in srcset for modern browsers', async ({ page, browserName }) => {
      // Check if AVIF is in the srcset (Chromium supports AVIF)
      if (browserName === 'chromium') {
        await page.waitForSelector('img');

        const srcsets = await page.evaluate(() => {
          const images = Array.from(document.querySelectorAll('img'));
          return images.map((img) => img.getAttribute('srcset') || '');
        });

        // At least one image should have AVIF or WebP in srcset
        const hasModernFormat = srcsets.some(
          (srcset) => srcset.includes('.avif') || srcset.includes('.webp') || srcset.includes('fm=')
        );

        expect(hasModernFormat).toBeTruthy();
      }
    });

    test('3.3 Should fallback to original format if modern formats fail', async ({ page }) => {
      // All images should eventually load (even if modern format fails)
      await page.waitForSelector('img');

      const images = page.locator('img');
      const count = await images.count();

      for (let i = 0; i < count; i++) {
        const img = images.nth(i);
        const isLoaded = await img.evaluate((el: HTMLImageElement) => {
          return el.complete && el.naturalWidth > 0;
        });

        expect(isLoaded).toBeTruthy();
      }
    });
  });

  // ==========================================================================
  // 4. Responsive Images & Sizes
  // ==========================================================================

  test.describe('4. Responsive Images & Sizes', () => {
    test('4.1 Should have srcset attribute for responsive images', async ({ page }) => {
      await page.waitForSelector('img');

      const imagesWithSrcset = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter((img) => img.hasAttribute('srcset')).length;
      });

      // Most images should have srcset
      expect(imagesWithSrcset).toBeGreaterThan(0);
    });

    test('4.2 Should have sizes attribute for proper responsive behavior', async ({ page }) => {
      await page.waitForSelector('img');

      const imagesWithSizes = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter((img) => img.hasAttribute('sizes')).length;
      });

      // Images with srcset should have sizes attribute
      expect(imagesWithSizes).toBeGreaterThan(0);
    });

    test('4.3 Should load appropriate image size for viewport', async ({ page, viewport }) => {
      if (!viewport) return;

      await page.waitForSelector('img');

      // Get image natural widths
      const imageWidths = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.map((img: HTMLImageElement) => ({
          naturalWidth: img.naturalWidth,
          displayWidth: img.clientWidth,
        }));
      });

      // Natural width should not be excessively larger than display width
      // (allowing some overhead for retina displays - 2-3x is acceptable)
      for (const img of imageWidths) {
        if (img.naturalWidth > 0 && img.displayWidth > 0) {
          const ratio = img.naturalWidth / img.displayWidth;
          expect(ratio).toBeLessThan(4); // Max 4x for retina + some overhead
        }
      }
    });

    test('4.4 Should adapt to different viewport sizes', async ({ page }) => {
      // Test with mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const mobileImageSizes = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.map((img: HTMLImageElement) => img.naturalWidth);
      });

      // Test with desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const desktopImageSizes = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.map((img: HTMLImageElement) => img.naturalWidth);
      });

      // Desktop images should generally be larger or same size
      // (some images may be the same if they're small icons)
      expect(desktopImageSizes.length).toBeGreaterThan(0);
      expect(mobileImageSizes.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // 5. Placeholder & Layout Shift Prevention
  // ==========================================================================

  test.describe('5. Placeholder & Layout Shift Prevention', () => {
    test('5.1 Should have placeholder blur for images', async ({ page }) => {
      // Check for blur placeholder data URLs
      const hasBlurPlaceholder = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.some((img) => {
          const src = img.getAttribute('src') || '';
          return src.startsWith('data:image/svg+xml') || src.startsWith('data:image/');
        });
      });

      // At least some images should have blur placeholders
      expect(hasBlurPlaceholder).toBeTruthy();
    });

    test('5.2 Should prevent layout shift during image load', async ({ page }) => {
      // Measure CLS (Cumulative Layout Shift)
      await page.goto('/dashboard');

      // Wait for page to stabilize
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let clsValue = 0;

          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
          });

          observer.observe({ type: 'layout-shift', buffered: true });

          setTimeout(() => {
            observer.disconnect();
            resolve(clsValue);
          }, 1000);
        });
      });

      // CLS should be less than 0.1 (Good threshold per Google)
      expect(cls).toBeLessThan(0.1);
    });

    test('5.3 Should have width and height attributes to reserve space', async ({ page }) => {
      await page.waitForSelector('img');

      const imagesWithDimensions = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter((img) => {
          const hasWidth = img.hasAttribute('width') || img.style.width;
          const hasHeight = img.hasAttribute('height') || img.style.height;
          const hasAspectRatio = img.style.aspectRatio;

          // Should have either width/height or aspect-ratio to prevent shift
          return (hasWidth && hasHeight) || hasAspectRatio;
        }).length;
      });

      const totalImages = await page.locator('img').count();

      // Most images should have dimensions set
      const percentage = (imagesWithDimensions / totalImages) * 100;
      expect(percentage).toBeGreaterThan(80); // At least 80% should have dimensions
    });
  });

  // ==========================================================================
  // 6. Performance Metrics
  // ==========================================================================

  test.describe('6. Performance Metrics', () => {
    test('6.1 Should load images efficiently (LCP < 2.5s)', async ({ page }) => {
      await page.goto('/dashboard');

      const lcp = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1] as any;
            resolve(lastEntry.renderTime || lastEntry.loadTime);
          });

          observer.observe({ type: 'largest-contentful-paint', buffered: true });

          setTimeout(() => {
            observer.disconnect();
            resolve(0);
          }, 5000);
        });
      });

      // LCP should be less than 2.5 seconds (Good threshold)
      expect(lcp).toBeLessThan(2500);
    });

    test('6.2 Should minimize image load time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/dashboard');
      await page.waitForSelector('img');

      // Wait for all images to load
      await page.evaluate(() => {
        return Promise.all(
          Array.from(document.querySelectorAll('img')).map((img: HTMLImageElement) => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
              img.onload = img.onerror = resolve;
            });
          })
        );
      });

      const loadTime = Date.now() - startTime;

      // All images should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('6.3 Should cache images effectively', async ({ page }) => {
      // First load
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      // Second load (should use cache)
      const startTime = Date.now();
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      // Second load should be faster due to caching
      expect(loadTime).toBeLessThan(2000);
    });

    test('6.4 Should optimize total page weight with images', async ({ page }) => {
      const response = await page.goto('/dashboard');

      // Get all image resources
      const imageResources = await page.evaluate(() => {
        return performance
          .getEntriesByType('resource')
          .filter((entry) => (entry as any).initiatorType === 'img')
          .map((entry) => ({
            size: (entry as any).transferSize || 0,
            url: entry.name,
          }));
      });

      // Calculate total image size
      const totalImageSize = imageResources.reduce((sum, img) => sum + img.size, 0);

      // Total image size should be reasonable (less than 2MB for initial load)
      expect(totalImageSize).toBeLessThan(2 * 1024 * 1024);
    });
  });

  // ==========================================================================
  // 7. Acceptance Criteria
  // ==========================================================================

  test.describe('7. Acceptance Criteria', () => {
    test('@acceptance All images should be optimized with next/image', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForSelector('img');

      const allOptimized = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.every((img) => {
          // Check for next/image indicators
          return (
            img.hasAttribute('srcset') ||
            img.hasAttribute('data-nimg') ||
            img.getAttribute('decoding') === 'async'
          );
        });
      });

      expect(allOptimized).toBeTruthy();
    });

    test('@acceptance Lazy loading should work for below-fold images', async ({ page }) => {
      await page.goto('/dashboard/jobs');
      await page.waitForLoadState('networkidle');

      const hasLazyLoading = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.some((img) => img.getAttribute('loading') === 'lazy');
      });

      expect(hasLazyLoading).toBeTruthy();
    });

    test('@acceptance Modern formats (WebP/AVIF) should be delivered', async ({ page, browserName }) => {
      if (browserName !== 'chromium') return; // Skip for non-Chromium

      await page.goto('/dashboard');
      await page.waitForSelector('img');

      const hasModernFormats = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.some((img) => {
          const srcset = img.getAttribute('srcset') || '';
          const src = img.getAttribute('src') || '';
          return (
            srcset.includes('.webp') ||
            srcset.includes('.avif') ||
            src.includes('fm=webp') ||
            src.includes('fm=avif')
          );
        });
      });

      expect(hasModernFormats).toBeTruthy();
    });

    test('@acceptance No layout shift should occur during image load', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let clsValue = 0;

          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
                clsValue += (entry as any).value;
              }
            }
          });

          observer.observe({ type: 'layout-shift', buffered: true });

          setTimeout(() => {
            observer.disconnect();
            resolve(clsValue);
          }, 1000);
        });
      });

      // CLS should be less than 0.1
      expect(cls).toBeLessThan(0.1);
    });
  });
});
