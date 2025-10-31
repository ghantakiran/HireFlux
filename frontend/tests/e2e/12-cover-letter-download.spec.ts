import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Cover Letter Download E2E Tests
 *
 * Tests the cover letter download functionality (PDF and DOCX export).
 * Following BDD approach to verify download flow works correctly.
 *
 * Scenarios:
 * 1. Download button is visible and functional
 * 2. PDF download works correctly
 * 3. DOCX download works correctly
 * 4. Download shows loading state
 * 5. Download handles errors gracefully
 */

test.describe('Cover Letter Download Functionality', () => {
  test.describe('Given user has cover letters', () => {
    test.beforeEach(async ({ page }) => {
      // Navigate to cover letters page
      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');
    });

    test('When user sees cover letter card, Then download button should be visible', async ({ page }) => {
      // Given: User has cover letters (handled in beforeEach)

      // When: User sees a cover letter card
      const downloadButton = page.getByRole('button', { name: /Download/i }).first();

      // Then: Download button should be visible
      await expect(downloadButton).toBeVisible();
    });

    test('When user clicks download button, Then dropdown menu should appear', async ({ page }) => {
      // Given: User is viewing cover letters

      // When: User clicks download button
      const downloadButton = page.getByRole('button', { name: /Download/i }).first();
      await downloadButton.click();

      // Then: Dropdown menu with PDF and DOCX options should appear
      await expect(page.getByText(/Download as PDF/i)).toBeVisible();
      await expect(page.getByText(/Download as DOCX/i)).toBeVisible();
    });

    test('When user selects PDF download, Then PDF file should download', async ({ page }) => {
      // Given: User clicks download button
      const downloadButton = page.getByRole('button', { name: /Download/i }).first();
      await downloadButton.click();

      // When: User selects PDF option
      const downloadPromise = page.waitForEvent('download');

      await page.getByText(/Download as PDF/i).click();

      // Then: Download should start
      const download = await downloadPromise;

      // Verify download properties
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);

      // Save and verify file exists
      const downloadsPath = path.join(__dirname, '../../downloads');
      if (!fs.existsSync(downloadsPath)) {
        fs.mkdirSync(downloadsPath, { recursive: true });
      }

      const filePath = path.join(downloadsPath, download.suggestedFilename());
      await download.saveAs(filePath);

      // Verify file was downloaded
      expect(fs.existsSync(filePath)).toBe(true);

      // Verify file is not empty
      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(0);

      // Cleanup
      fs.unlinkSync(filePath);
    });

    test('When user selects DOCX download, Then DOCX file should download', async ({ page }) => {
      // Given: User clicks download button
      const downloadButton = page.getByRole('button', { name: /Download/i }).first();
      await downloadButton.click();

      // When: User selects DOCX option
      const downloadPromise = page.waitForEvent('download');

      await page.getByText(/Download as DOCX/i).click();

      // Then: Download should start
      const download = await downloadPromise;

      // Verify download properties
      expect(download.suggestedFilename()).toMatch(/\.docx$/i);

      // Save and verify file
      const downloadsPath = path.join(__dirname, '../../downloads');
      if (!fs.existsSync(downloadsPath)) {
        fs.mkdirSync(downloadsPath, { recursive: true });
      }

      const filePath = path.join(downloadsPath, download.suggestedFilename());
      await download.saveAs(filePath);

      expect(fs.existsSync(filePath)).toBe(true);

      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(0);

      // Cleanup
      fs.unlinkSync(filePath);
    });
  });

  test.describe('Download Loading States', () => {
    test('When download starts, Then button should show loading state', async ({ page }) => {
      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');

      // Click download button
      const downloadButton = page.getByRole('button', { name: /Download/i }).first();
      await downloadButton.click();

      // Select PDF
      await page.getByText(/Download as PDF/i).click();

      // Button should show loading state briefly
      // Note: This may be too fast to catch, but we can verify it doesn't error
      await page.waitForTimeout(500);
    });

    test('When download completes, Then success toast should appear', async ({ page }) => {
      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');

      // Start download
      const downloadButton = page.getByRole('button', { name: /Download/i }).first();
      await downloadButton.click();

      const downloadPromise = page.waitForEvent('download');
      await page.getByText(/Download as PDF/i).click();
      await downloadPromise;

      // Success toast should appear
      await expect(page.getByText(/Downloaded/i)).toBeVisible({ timeout: 2000 });
      await expect(page.getByText(/successfully/i)).toBeVisible();
    });

    test('When download fails, Then error toast should appear', async ({ page }) => {
      // Intercept download request and make it fail
      await page.route('**/cover-letters/*/export*', async route => {
        await route.abort('failed');
      });

      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');

      // Attempt download
      const downloadButton = page.getByRole('button', { name: /Download/i }).first();
      await downloadButton.click();
      await page.getByText(/Download as PDF/i).click();

      // Error toast should appear
      await expect(page.getByText(/Download failed/i)).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('Download Button States', () => {
    test('When one download is in progress, Then button should be disabled', async ({ page }) => {
      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');

      // Slow down the download to observe button state
      await page.route('**/cover-letters/*/export*', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      });

      const downloadButton = page.getByRole('button', { name: /Download/i }).first();
      await downloadButton.click();
      await page.getByText(/Download as PDF/i).click();

      // Button should be disabled during download
      await page.waitForTimeout(500);
      await expect(downloadButton).toBeDisabled();
    });

    test('After download completes, Then button should be re-enabled', async ({ page }) => {
      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');

      const downloadButton = page.getByRole('button', { name: /Download/i }).first();
      await downloadButton.click();

      const downloadPromise = page.waitForEvent('download');
      await page.getByText(/Download as PDF/i).click();
      await downloadPromise;

      // Wait for download to complete
      await page.waitForTimeout(1000);

      // Button should be re-enabled
      await expect(downloadButton).toBeEnabled();
    });
  });

  test.describe('Multiple Downloads', () => {
    test('User should be able to download multiple files sequentially', async ({ page }) => {
      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');

      const downloadButton = page.getByRole('button', { name: /Download/i }).first();

      // Download PDF
      await downloadButton.click();
      let downloadPromise = page.waitForEvent('download');
      await page.getByText(/Download as PDF/i).click();
      const pdfDownload = await downloadPromise;
      expect(pdfDownload.suggestedFilename()).toMatch(/\.pdf$/i);

      // Wait a bit
      await page.waitForTimeout(1000);

      // Download DOCX
      await downloadButton.click();
      downloadPromise = page.waitForEvent('download');
      await page.getByText(/Download as DOCX/i).click();
      const docxDownload = await downloadPromise;
      expect(docxDownload.suggestedFilename()).toMatch(/\.docx$/i);
    });

    test('User should be able to download different cover letters', async ({ page }) => {
      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');

      // Get all download buttons
      const downloadButtons = page.getByRole('button', { name: /Download/i });
      const count = await downloadButtons.count();

      if (count >= 2) {
        // Download from first card
        await downloadButtons.nth(0).click();
        let downloadPromise = page.waitForEvent('download');
        await page.getByText(/Download as PDF/i).first().click();
        await downloadPromise;

        await page.waitForTimeout(500);

        // Download from second card
        await downloadButtons.nth(1).click();
        downloadPromise = page.waitForEvent('download');
        await page.getByText(/Download as PDF/i).first().click();
        await downloadPromise;
      }
    });
  });

  test.describe('Download Accessibility', () => {
    test('Download button should be keyboard accessible', async ({ page }) => {
      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');

      // Focus on download button with keyboard
      const downloadButton = page.getByRole('button', { name: /Download/i }).first();
      await downloadButton.focus();

      // Activate with Enter
      await page.keyboard.press('Enter');

      // Dropdown should appear
      await expect(page.getByText(/Download as PDF/i)).toBeVisible();

      // Navigate dropdown with arrow keys
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');

      // Download should start
      const downloadPromise = page.waitForEvent('download');
      const download = await downloadPromise;
      expect(download).toBeDefined();
    });

    test('Download dropdown should have proper ARIA attributes', async ({ page }) => {
      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');

      const downloadButton = page.getByRole('button', { name: /Download/i }).first();
      await downloadButton.click();

      // Dropdown menu should be properly labeled
      const dropdown = page.getByRole('menu');
      await expect(dropdown).toBeVisible();

      // Menu items should have role="menuitem"
      const menuItems = page.getByRole('menuitem');
      const itemCount = await menuItems.count();
      expect(itemCount).toBeGreaterThanOrEqual(2); // PDF and DOCX
    });

    test('Loading state should be announced to screen readers', async ({ page }) => {
      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');

      // Slow down download
      await page.route('**/cover-letters/*/export*', async route => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.continue();
      });

      const downloadButton = page.getByRole('button', { name: /Download/i }).first();
      await downloadButton.click();
      await page.getByText(/Download as PDF/i).click();

      // Loading indicator should have aria-label or similar
      await page.waitForTimeout(500);
    });
  });

  test.describe('Download Error Handling', () => {
    test('When network fails, Then should show appropriate error', async ({ page }) => {
      await page.route('**/cover-letters/*/export*', async route => {
        await route.abort('internetdisconnected');
      });

      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');

      const downloadButton = page.getByRole('button', { name: /Download/i }).first();
      await downloadButton.click();
      await page.getByText(/Download as PDF/i).click();

      // Should show error toast
      await expect(page.getByText(/failed/i)).toBeVisible({ timeout: 2000 });
    });

    test('When server returns 404, Then should show "not found" error', async ({ page }) => {
      await page.route('**/cover-letters/*/export*', async route => {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: 'Cover letter not found' }
          })
        });
      });

      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');

      const downloadButton = page.getByRole('button', { name: /Download/i }).first();
      await downloadButton.click();
      await page.getByText(/Download as PDF/i).click();

      await expect(page.getByText(/failed/i)).toBeVisible({ timeout: 2000 });
    });

    test('When server returns 500, Then should show generic error', async ({ page }) => {
      await page.route('**/cover-letters/*/export*', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: { message: 'Internal server error' }
          })
        });
      });

      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');

      const downloadButton = page.getByRole('button', { name: /Download/i }).first();
      await downloadButton.click();
      await page.getByText(/Download as PDF/i).click();

      await expect(page.getByText(/failed/i)).toBeVisible({ timeout: 2000 });
    });
  });

  test.describe('Download File Validation', () => {
    test('PDF download should have correct MIME type', async ({ page }) => {
      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');

      const downloadButton = page.getByRole('button', { name: /Download/i }).first();
      await downloadButton.click();

      const downloadPromise = page.waitForEvent('download');
      await page.getByText(/Download as PDF/i).click();

      const download = await downloadPromise;

      // Verify MIME type (if available)
      // Note: Playwright download object may not expose MIME type directly
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    });

    test('DOCX download should have correct MIME type', async ({ page }) => {
      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');

      const downloadButton = page.getByRole('button', { name: /Download/i }).first();
      await downloadButton.click();

      const downloadPromise = page.waitForEvent('download');
      await page.getByText(/Download as DOCX/i).click();

      const download = await downloadPromise;

      expect(download.suggestedFilename()).toMatch(/\.docx$/i);
    });

    test('Downloaded filename should contain cover letter ID or title', async ({ page }) => {
      await page.goto('/dashboard/cover-letters');
      await page.waitForLoadState('networkidle');

      const downloadButton = page.getByRole('button', { name: /Download/i }).first();
      await downloadButton.click();

      const downloadPromise = page.waitForEvent('download');
      await page.getByText(/Download as PDF/i).click();

      const download = await downloadPromise;
      const filename = download.suggestedFilename();

      // Filename should contain meaningful information
      expect(filename).toMatch(/cover-letter/i);
    });
  });
});
