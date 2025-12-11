/**
 * E2E Tests: Image Optimization & Lazy Loading (Issue #145)
 *
 * Following TDD/BDD approach:
 * - Tests written BEFORE image optimization
 * - Tests will FAIL initially (Red phase)
 * - Implementation will make tests pass (Green phase)
 *
 * @see tests/features/image-optimization.feature
 */

import { test, expect, Page } from '@playwright/test';
import { setupAPIMocks } from './helpers/api-mock.helper';

test.describe('Image Optimization & Lazy Loading - Issue #145', () => {
  // Setup API mocks before each test to ensure data is present
  test.beforeEach(async ({ page }) => {
    await setupAPIMocks(page);
  });

  // ============================================================================
  // 1. next/image Component Usage
  // ============================================================================

  test.describe('next/image Component Usage', () => {
    test('@critical should use next/image for 95%+ of images', async ({ page }) => {
      await page.goto('/dashboard');

      // Get all img elements
      const allImages = await page.locator('img').count();

      // Get images that are rendered by next/image (they have specific attributes)
      const nextImages = await page.locator('img[srcset]').count();

      const nextImageRatio = nextImages / allImages;

      console.log(`Total images: ${allImages}`);
      console.log(`next/image images: ${nextImages}`);
      console.log(`Ratio: ${(nextImageRatio * 100).toFixed(1)}%`);

      // At least 95% should use next/image
      expect(nextImageRatio).toBeGreaterThanOrEqual(0.95);
    });

    test('should use next/image for company logos', async ({ page }) => {
      await page.goto('/jobs');

      // Wait for job cards with logos
      await page.waitForSelector('[data-testid="job-card"], .job-listing', { timeout: 5000 }).catch(() => {});

      // Check if logos use next/image (have srcset)
      const logos = await page.locator('[data-testid="company-logo"], .company-logo, img[alt*="logo" i]').all();

      if (logos.length > 0) {
        const firstLogo = logos[0];
        const hasSrcset = await firstLogo.getAttribute('srcset');

        console.log(`Logo has srcset: ${!!hasSrcset}`);

        // Logos should use next/image
        expect(hasSrcset).toBeTruthy();
      }
    });

    test('should have width and height on all images', async ({ page }) => {
      await page.goto('/dashboard');

      const imagesWithoutDimensions = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter(img => !img.width || !img.height).length;
      });

      console.log(`Images without dimensions: ${imagesWithoutDimensions}`);

      // Should be very few (allow max 3 for external/dynamic images)
      expect(imagesWithoutDimensions).toBeLessThanOrEqual(3);
    });
  });

  // ============================================================================
  // 2. Lazy Loading
  // ============================================================================

  test.describe('Lazy Loading', () => {
    test('@critical should lazy load below-the-fold images', async ({ page }) => {
      await page.goto('/jobs');

      // Count total images
      const totalImages = await page.locator('img').count();

      // Count loaded images initially
      const initiallyLoadedImages = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter(img => img.complete && img.naturalHeight > 0).length;
      });

      console.log(`Total images: ${totalImages}`);
      console.log(`Initially loaded: ${initiallyLoadedImages}`);

      // Not all images should be loaded immediately (lazy loading)
      expect(initiallyLoadedImages).toBeLessThan(totalImages);

      // Should load less than 70% initially
      expect(initiallyLoadedImages / totalImages).toBeLessThan(0.7);
    });

    test('should load more images as user scrolls', async ({ page }) => {
      await page.goto('/jobs');

      const initialLoaded = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).filter(
          img => img.complete
        ).length;
      });

      // Scroll down
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(1000);

      const afterScrollLoaded = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).filter(
          img => img.complete
        ).length;
      });

      console.log(`Before scroll: ${initialLoaded}, After scroll: ${afterScrollLoaded}`);

      // More images should be loaded after scrolling
      expect(afterScrollLoaded).toBeGreaterThan(initialLoaded);
    });

    test('should not cause layout shift during lazy load', async ({ page }) => {
      await page.goto('/jobs');

      // Measure CLS before scroll
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

      // Scroll to load more images
      await page.evaluate(() => window.scrollBy(0, 2000));
      await page.waitForTimeout(2000);

      // Measure CLS after scroll
      const finalCLS = await page.evaluate(() => {
        let cls = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as any[]) {
            if (!(entry as any).hadRecentInput) {
              cls += (entry as any).value;
            }
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });

        // Get accumulated CLS
        const entries = performance.getEntriesByType('layout-shift') as any[];
        return entries.reduce((sum, entry) => {
          return entry.hadRecentInput ? sum : sum + entry.value;
        }, 0);
      });

      console.log(`CLS during lazy load: ${finalCLS}`);

      // CLS should remain low
      expect(finalCLS).toBeLessThan(0.1);
    });
  });

  // ============================================================================
  // 3. Modern Image Formats
  // ============================================================================

  test.describe('Modern Image Formats', () => {
    test('@critical should serve WebP or AVIF formats', async ({ page }) => {
      const imageFormats: string[] = [];

      page.on('response', response => {
        const contentType = response.headers()['content-type'];
        if (contentType && contentType.startsWith('image/')) {
          imageFormats.push(contentType);
        }
      });

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      console.log(`Image formats served: ${imageFormats.join(', ')}`);

      const modernFormats = imageFormats.filter(f =>
        f.includes('webp') || f.includes('avif')
      ).length;

      const modernFormatRatio = modernFormats / imageFormats.length;

      console.log(`Modern format ratio: ${(modernFormatRatio * 100).toFixed(1)}%`);

      // At least 80% should be modern formats
      expect(modernFormatRatio).toBeGreaterThan(0.8);
    });

    test('should have fallback for browsers without WebP support', async ({ page }) => {
      await page.goto('/dashboard');

      // Check if images have multiple sources (srcset or picture element)
      const imagesWithSrcset = await page.locator('img[srcset]').count();
      const totalImages = await page.locator('img').count();

      console.log(`Images with srcset: ${imagesWithSrcset}/${totalImages}`);

      // Most images should have srcset for fallbacks
      expect(imagesWithSrcset / totalImages).toBeGreaterThan(0.8);
    });
  });

  // ============================================================================
  // 4. Responsive Images
  // ============================================================================

  test.describe('Responsive Images', () => {
    test('should have srcset for different device sizes', async ({ page }) => {
      await page.goto('/dashboard');

      const imagesWithSrcset = await page.locator('img[srcset]').count();
      const totalImages = await page.locator('img').count();

      const srcsetRatio = imagesWithSrcset / totalImages;

      console.log(`Images with srcset: ${(srcsetRatio * 100).toFixed(1)}%`);

      // At least 90% should have srcset
      expect(srcsetRatio).toBeGreaterThan(0.9);
    });

    test('should have sizes attribute for responsive images', async ({ page }) => {
      await page.goto('/dashboard');

      const imagesWithSizes = await page.locator('img[sizes]').count();
      const imagesWithSrcset = await page.locator('img[srcset]').count();

      console.log(`Images with sizes attribute: ${imagesWithSizes}`);

      // Most images with srcset should also have sizes
      if (imagesWithSrcset > 0) {
        expect(imagesWithSizes / imagesWithSrcset).toBeGreaterThan(0.7);
      }
    });
  });

  // ============================================================================
  // 5. Placeholder and Blur
  // ============================================================================

  test.describe('Placeholder and Blur', () => {
    test('@critical should show blur placeholder during load', async ({ page }) => {
      // Start on a slow connection simulation
      await page.goto('/dashboard');

      // Check if images have blur-up effect
      const imagesWithBlur = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter(img => {
          const style = window.getComputedStyle(img);
          // Check for blur CSS or placeholder attribute
          return img.hasAttribute('placeholder') ||
                 img.getAttribute('src')?.includes('blur') ||
                 style.filter.includes('blur');
        }).length;
      });

      const totalImages = await page.locator('img').count();

      console.log(`Images with blur placeholder: ${imagesWithBlur}/${totalImages}`);

      // Many images should have blur placeholders
      expect(imagesWithBlur).toBeGreaterThan(totalImages * 0.5);
    });

    test('should prevent layout shift with placeholders', async ({ page }) => {
      await page.goto('/jobs');

      // All images should have reserved space
      const imagesWithDimensions = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter(img => {
          const computedStyle = window.getComputedStyle(img);
          return computedStyle.width !== '0px' && computedStyle.height !== '0px';
        }).length;
      });

      const totalImages = await page.locator('img').count();

      console.log(`Images with reserved space: ${imagesWithDimensions}/${totalImages}`);

      // All images should have dimensions
      expect(imagesWithDimensions).toBe(totalImages);
    });
  });

  // ============================================================================
  // 6. Priority Loading
  // ============================================================================

  test.describe('Priority Loading', () => {
    test('should load above-the-fold images with priority', async ({ page }) => {
      await page.goto('/dashboard');

      // Check if first visible image has priority or is not lazy loaded
      const firstImage = page.locator('img').first();

      const isLazyLoaded = await firstImage.getAttribute('loading');

      console.log(`First image loading attribute: ${isLazyLoaded}`);

      // First image should not be lazy loaded
      expect(isLazyLoaded).not.toBe('lazy');
    });
  });

  // ============================================================================
  // 7. Accessibility
  // ============================================================================

  test.describe('Accessibility', () => {
    test('should have alt text on all images', async ({ page }) => {
      await page.goto('/dashboard');

      const imagesWithoutAlt = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter(img => !img.hasAttribute('alt')).length;
      });

      console.log(`Images without alt text: ${imagesWithoutAlt}`);

      // All images should have alt text (even if empty for decorative)
      expect(imagesWithoutAlt).toBe(0);
    });

    test('should have descriptive alt text', async ({ page }) => {
      await page.goto('/jobs');

      const altTexts = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images
          .map(img => img.alt)
          .filter(alt => alt && alt.trim().length > 0);
      });

      console.log(`Sample alt texts: ${altTexts.slice(0, 5).join(', ')}`);

      // Should have some descriptive alt text
      expect(altTexts.length).toBeGreaterThan(0);

      // Alt text shouldn't be generic
      const genericAlts = altTexts.filter(alt =>
        alt.toLowerCase() === 'image' ||
        alt.toLowerCase() === 'photo' ||
        alt.toLowerCase() === 'picture'
      );

      expect(genericAlts.length).toBeLessThan(altTexts.length * 0.1);
    });
  });

  // ============================================================================
  // 8. Performance Impact
  // ============================================================================

  test.describe('Performance Impact', () => {
    test('@critical should improve page load time', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/dashboard');
      await page.waitForSelector('img', { state: 'visible' });

      const loadTime = Date.now() - startTime;

      console.log(`Page with images loaded in: ${loadTime}ms`);

      // Should load reasonably fast
      expect(loadTime).toBeLessThan(3000);
    });

    test('should reduce total page weight', async ({ page }) => {
      let totalImageBytes = 0;

      page.on('response', async response => {
        const contentType = response.headers()['content-type'];
        if (contentType && contentType.startsWith('image/')) {
          try {
            const buffer = await response.body();
            totalImageBytes += buffer.length;
          } catch (e) {}
        }
      });

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const totalImageKB = (totalImageBytes / 1024).toFixed(2);

      console.log(`Total image weight: ${totalImageKB} KB`);

      // Images should be optimized (< 500KB for dashboard)
      expect(totalImageBytes).toBeLessThan(500 * 1024);
    });
  });

  // ============================================================================
  // 9. Specific Page Tests
  // ============================================================================

  test.describe('Page-Specific Tests', () => {
    test('job listings should have optimized logos', async ({ page }) => {
      await page.goto('/jobs');

      await page.waitForSelector('[data-testid="job-card"], .job-listing', { timeout: 5000 }).catch(() => {});

      const logoImages = await page.locator('img[alt*="logo" i]').count();

      console.log(`Company logos found: ${logoImages}`);

      if (logoImages > 0) {
        // Logos should use next/image (have srcset)
        const logosWithSrcset = await page.locator('img[alt*="logo" i][srcset]').count();

        expect(logosWithSrcset).toBeGreaterThanOrEqual(logoImages * 0.9);
      }
    });

    test('dashboard should optimize avatar images', async ({ page }) => {
      await page.goto('/dashboard');

      const avatars = await page.locator('[data-testid="avatar"], .avatar, img[alt*="avatar" i]').count();

      console.log(`Avatars found: ${avatars}`);

      if (avatars > 0) {
        // Avatars should use next/image
        const avatarsWithSrcset = await page.locator('[data-testid="avatar"] img[srcset], .avatar img[srcset]').count();

        expect(avatarsWithSrcset).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // 10. Error Handling
  // ============================================================================

  test.describe('Error Handling', () => {
    test('should handle broken images gracefully', async ({ page }) => {
      await page.goto('/dashboard');

      // Check if any images failed to load
      const brokenImages = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter(img =>
          !img.complete || img.naturalHeight === 0
        ).length;
      });

      console.log(`Broken images: ${brokenImages}`);

      // Should have very few broken images
      expect(brokenImages).toBeLessThan(3);
    });
  });

  // ============================================================================
  // 11. Acceptance Criteria
  // ============================================================================

  test.describe('Acceptance Criteria', () => {
    test('@acceptance all images should be optimized', async ({ page }) => {
      await page.goto('/dashboard');

      const stats = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        const total = images.length;
        const withSrcset = images.filter(img => img.srcset).length;
        const withAlt = images.filter(img => img.hasAttribute('alt')).length;
        const withDimensions = images.filter(img => img.width && img.height).length;

        return {
          total,
          withSrcset,
          withAlt,
          withDimensions,
          srcsetRatio: withSrcset / total,
          altRatio: withAlt / total,
          dimensionsRatio: withDimensions / total,
        };
      });

      console.log('Image Optimization Stats:');
      console.log(`- Total images: ${stats.total}`);
      console.log(`- With srcset: ${(stats.srcsetRatio * 100).toFixed(1)}%`);
      console.log(`- With alt: ${(stats.altRatio * 100).toFixed(1)}%`);
      console.log(`- With dimensions: ${(stats.dimensionsRatio * 100).toFixed(1)}%`);

      // All acceptance criteria
      expect(stats.srcsetRatio).toBeGreaterThan(0.95); // 95%+ use next/image
      expect(stats.altRatio).toBe(1); // 100% have alt
      expect(stats.dimensionsRatio).toBeGreaterThan(0.95); // 95%+ have dimensions
    });

    test('@acceptance lazy loading should be functional', async ({ page }) => {
      await page.goto('/jobs');

      const totalImages = await page.locator('img').count();
      const loadedImages = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img')).filter(
          img => img.complete
        ).length;
      });

      const loadRatio = loadedImages / totalImages;

      console.log(`Initially loaded: ${(loadRatio * 100).toFixed(1)}%`);

      // Should not load all images immediately
      expect(loadRatio).toBeLessThan(0.7);
    });

    test('@acceptance modern formats should be served', async ({ page }) => {
      const formats: string[] = [];

      page.on('response', response => {
        const ct = response.headers()['content-type'];
        if (ct && ct.startsWith('image/')) {
          formats.push(ct);
        }
      });

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      const modernFormats = formats.filter(f =>
        f.includes('webp') || f.includes('avif')
      ).length;

      const modernRatio = modernFormats / formats.length;

      console.log(`Modern formats: ${(modernRatio * 100).toFixed(1)}%`);

      // At least 80% should be modern
      expect(modernRatio).toBeGreaterThan(0.8);
    });
  });
});
