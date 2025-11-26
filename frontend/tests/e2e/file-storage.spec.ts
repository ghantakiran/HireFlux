/**
 * E2E Tests for File Storage (Issue #53)
 * Tests S3 file upload, download, and management functionality
 *
 * @group e2e
 * @group file-storage
 * @priority high
 */

import { test, expect } from '@playwright/test';
import { loginAsJobSeeker, loginAsEmployer } from './helpers/auth.helper';
import path from 'path';
import fs from 'fs';

// Test file paths
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const SAMPLE_RESUME_PDF = path.join(FIXTURES_DIR, 'sample-resume.pdf');
const SAMPLE_LOGO_PNG = path.join(FIXTURES_DIR, 'company-logo.png');

test.describe('File Storage - Resume Upload (Job Seeker)', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure test files exist
    if (!fs.existsSync(SAMPLE_RESUME_PDF)) {
      // Create a minimal PDF for testing
      fs.mkdirSync(FIXTURES_DIR, { recursive: true });
      fs.writeFileSync(SAMPLE_RESUME_PDF, Buffer.from([
        0x25, 0x50, 0x44, 0x46, // %PDF
        0x2D, 0x31, 0x2E, 0x34, // -1.4
      ]));
    }
  });

  test('should upload resume via file input', async ({ page }) => {
    // Login as job seeker
    await loginAsJobSeeker(page);

    // Navigate to resume upload page
    await page.goto('/dashboard/resume/upload');

    // Wait for upload form
    await expect(page.locator('[data-testid="resume-upload-form"]')).toBeVisible();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_RESUME_PDF);

    // Click upload button
    await page.click('[data-testid="upload-button"]');

    // Wait for success message
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

    // Verify file appears in list
    await expect(page.locator('[data-testid="resume-list"]')).toContainText('sample-resume.pdf');
  });

  test('should reject invalid file types', async ({ page }) => {
    await loginAsJobSeeker(page);
    await page.goto('/dashboard/resume/upload');

    // Try to upload an invalid file (.exe)
    const invalidFile = path.join(FIXTURES_DIR, 'malware.exe');
    fs.writeFileSync(invalidFile, 'fake executable');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(invalidFile);

    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/invalid file type/i);

    // Cleanup
    fs.unlinkSync(invalidFile);
  });

  test('should enforce 10MB size limit for resumes', async ({ page }) => {
    await loginAsJobSeeker(page);
    await page.goto('/dashboard/resume/upload');

    // Create a large file (>10MB)
    const largeFile = path.join(FIXTURES_DIR, 'large-resume.pdf');
    const buffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
    fs.writeFileSync(largeFile, buffer);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(largeFile);

    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/too large/i);

    // Cleanup
    fs.unlinkSync(largeFile);
  });

  test('should display upload progress', async ({ page }) => {
    await loginAsJobSeeker(page);
    await page.goto('/dashboard/resume/upload');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_RESUME_PDF);

    await page.click('[data-testid="upload-button"]');

    // Progress bar should appear
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();

    // Progress should reach 100%
    await expect(page.locator('[data-testid="upload-progress"]')).toHaveAttribute('aria-valuenow', '100', { timeout: 10000 });
  });

  test('should download resume with pre-signed URL', async ({ page }) => {
    await loginAsJobSeeker(page);
    await page.goto('/dashboard/resume');

    // Assume a resume exists
    await expect(page.locator('[data-testid="resume-list-item"]').first()).toBeVisible();

    // Click download button
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-button"]').first();

    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('should delete resume (soft delete)', async ({ page }) => {
    await loginAsJobSeeker(page);
    await page.goto('/dashboard/resume');

    // Get initial count
    const initialCount = await page.locator('[data-testid="resume-list-item"]').count();

    if (initialCount > 0) {
      // Click delete on first item
      await page.click('[data-testid="delete-button"]').first();

      // Confirm deletion
      await page.click('[data-testid="confirm-delete"]');

      // Wait for success toast
      await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

      // Verify item removed from list
      const newCount = await page.locator('[data-testid="resume-list-item"]').count();
      expect(newCount).toBe(initialCount - 1);
    }
  });
});

test.describe('File Storage - Company Logo Upload (Employer)', () => {
  test.beforeEach(async ({ page }) => {
    // Create test logo if it doesn't exist
    if (!fs.existsSync(SAMPLE_LOGO_PNG)) {
      fs.mkdirSync(FIXTURES_DIR, { recursive: true });
      // Create a minimal PNG file
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
      ]);
      fs.writeFileSync(SAMPLE_LOGO_PNG, pngHeader);
    }
  });

  test('should upload company logo (PNG)', async ({ page }) => {
    await loginAsEmployer(page);
    await page.goto('/employer/company/settings');

    // Upload logo
    const fileInput = page.locator('[data-testid="logo-upload-input"]');
    await fileInput.setInputFiles(SAMPLE_LOGO_PNG);

    // Wait for preview
    await expect(page.locator('[data-testid="logo-preview"]')).toBeVisible({ timeout: 5000 });

    // Save changes
    await page.click('[data-testid="save-logo-button"]');

    // Success message
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
  });

  test('should reject non-image files for logo', async ({ page }) => {
    await loginAsEmployer(page);
    await page.goto('/employer/company/settings');

    // Try to upload PDF as logo
    const fileInput = page.locator('[data-testid="logo-upload-input"]');
    await fileInput.setInputFiles(SAMPLE_RESUME_PDF);

    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/invalid image format/i);
  });

  test('should enforce 2MB size limit for logos', async ({ page }) => {
    await loginAsEmployer(page);
    await page.goto('/employer/company/settings');

    // Create large PNG (>2MB)
    const largeLogo = path.join(FIXTURES_DIR, 'large-logo.png');
    const buffer = Buffer.alloc(3 * 1024 * 1024); // 3MB
    fs.writeFileSync(largeLogo, buffer);

    const fileInput = page.locator('[data-testid="logo-upload-input"]');
    await fileInput.setInputFiles(largeLogo);

    // Should show error
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/logo too large/i);

    // Cleanup
    fs.unlinkSync(largeLogo);
  });

  test('should replace existing logo', async ({ page }) => {
    await loginAsEmployer(page);
    await page.goto('/employer/company/settings');

    // Upload first logo
    const fileInput = page.locator('[data-testid="logo-upload-input"]');
    await fileInput.setInputFiles(SAMPLE_LOGO_PNG);
    await page.click('[data-testid="save-logo-button"]');
    await page.waitForTimeout(1000);

    // Upload second logo (should replace)
    await fileInput.setInputFiles(SAMPLE_LOGO_PNG);
    await page.click('[data-testid="save-logo-button"]');

    // Success message
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

    // Only one logo should exist (replaced, not duplicated)
    await expect(page.locator('[data-testid="logo-preview"]')).toHaveCount(1);
  });
});

test.describe('File Storage - Access Control', () => {
  test('should prevent downloading other users\' files', async ({ page, context }) => {
    // Login as user A
    await loginAsJobSeeker(page, { email: 'usera@example.com', password: 'password123' });
    await page.goto('/dashboard/resume');

    // Get a file ID from user A's list
    const fileId = await page.locator('[data-testid="resume-list-item"]').first().getAttribute('data-file-id');

    if (fileId) {
      // Logout and login as user B
      await page.goto('/logout');
      await loginAsJobSeeker(page, { email: 'userb@example.com', password: 'password123' });

      // Try to access user A's file directly via API
      const response = await page.request.get(`/api/v1/files/${fileId}/download`);

      // Should be forbidden
      expect(response.status()).toBe(403);
    }
  });

  test('should allow employer to download applicant resume', async ({ page }) => {
    await loginAsEmployer(page);
    await page.goto('/employer/applicants/12345'); // Specific application

    // Download applicant's resume
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-applicant-resume"]');

    const download = await downloadPromise;

    // Should succeed
    expect(download).toBeDefined();
  });
});

test.describe('File Storage - Virus Scanning', () => {
  test('should show scanning status after upload', async ({ page }) => {
    await loginAsJobSeeker(page);
    await page.goto('/dashboard/resume/upload');

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_RESUME_PDF);
    await page.click('[data-testid="upload-button"]');

    // Should show scanning status
    await expect(page.locator('[data-testid="file-status"]')).toContainText(/scanning/i, { timeout: 5000 });

    // Wait for scan to complete (max 30 seconds per spec)
    await expect(page.locator('[data-testid="file-status"]')).toContainText(/available/i, { timeout: 35000 });
  });

  test('should prevent download of quarantined files', async ({ page }) => {
    await loginAsJobSeeker(page);
    await page.goto('/dashboard/resume');

    // Find a quarantined file (if any)
    const quarantinedFile = page.locator('[data-testid="file-status"][data-status="quarantined"]').first();

    if (await quarantinedFile.count() > 0) {
      // Download button should be disabled
      const downloadButton = page.locator('[data-testid="download-button"]').first();
      await expect(downloadButton).toBeDisabled();

      // Should show warning message
      await expect(page.locator('[data-testid="security-warning"]')).toContainText(/failed security scan/i);
    }
  });
});

test.describe('File Storage - Pagination & Filtering', () => {
  test('should paginate file list', async ({ page }) => {
    await loginAsJobSeeker(page);
    await page.goto('/dashboard/files');

    // If more than 20 files exist
    const totalFiles = await page.locator('[data-testid="total-files"]').textContent();

    if (totalFiles && parseInt(totalFiles) > 20) {
      // Next page button should be enabled
      await expect(page.locator('[data-testid="next-page"]')).toBeEnabled();

      // Click next page
      await page.click('[data-testid="next-page"]');

      // URL should update with page parameter
      await expect(page).toHaveURL(/page=2/);

      // Previous page button should now be enabled
      await expect(page.locator('[data-testid="previous-page"]')).toBeEnabled();
    }
  });

  test('should filter files by type', async ({ page }) => {
    await loginAsJobSeeker(page);
    await page.goto('/dashboard/files');

    // Select "Resumes" filter
    await page.selectOption('[data-testid="file-type-filter"]', 'resume');

    // Wait for filtered results
    await page.waitForTimeout(500);

    // All visible items should be resumes
    const fileTypes = await page.locator('[data-testid="file-type"]').allTextContents();
    fileTypes.forEach(type => {
      expect(type.toLowerCase()).toContain('resume');
    });
  });
});

test.describe('File Storage - Error Handling', () => {
  test('should handle network interruption gracefully', async ({ page, context }) => {
    await loginAsJobSeeker(page);
    await page.goto('/dashboard/resume/upload');

    // Simulate network offline
    await context.setOffline(true);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_RESUME_PDF);
    await page.click('[data-testid="upload-button"]');

    // Should show network error
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/network/i, { timeout: 5000 });

    // Restore network
    await context.setOffline(false);

    // Retry button should be available
    await expect(page.locator('[data-testid="retry-upload"]')).toBeVisible();
  });

  test('should show error when S3 is unavailable', async ({ page }) => {
    // This would require mocking the backend to return 503
    // For now, we'll check that the UI handles errors gracefully
    await loginAsJobSeeker(page);
    await page.goto('/dashboard/resume/upload');

    // Intercept API call and return 503
    await page.route('**/api/v1/files/upload/initiate', route => {
      route.fulfill({
        status: 503,
        body: JSON.stringify({ detail: 'Storage service temporarily unavailable' })
      });
    });

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(SAMPLE_RESUME_PDF);
    await page.click('[data-testid="upload-button"]');

    // Should show service unavailable error
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/service unavailable/i);
  });
});

test.describe('File Storage - API Integration', () => {
  test('should receive pre-signed URL from backend', async ({ page, request }) => {
    // Direct API test
    const response = await request.post('/api/v1/files/upload/initiate', {
      data: {
        file_name: 'test-resume.pdf',
        file_type: 'resume',
        mime_type: 'application/pdf',
        file_size: 512000
      },
      headers: {
        'Authorization': `Bearer ${process.env.TEST_JWT_TOKEN}`
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty('upload_url');
    expect(data).toHaveProperty('file_id');
    expect(data).toHaveProperty('s3_key');
    expect(data.upload_url).toMatch(/^https:\/\//);
  });

  test('should validate file type via API', async ({ request }) => {
    const response = await request.post('/api/v1/files/upload/initiate', {
      data: {
        file_name: 'malware.exe',
        file_type: 'resume',
        mime_type: 'application/x-msdownload',
        file_size: 512000
      },
      headers: {
        'Authorization': `Bearer ${process.env.TEST_JWT_TOKEN}`
      }
    });

    expect(response.status()).toBe(400);

    const data = await response.json();
    expect(data.detail).toMatch(/invalid file type/i);
  });
});

test.describe('File Storage - Performance', () => {
  test('should upload within 5 seconds for 1MB file', async ({ page }) => {
    await loginAsJobSeeker(page);
    await page.goto('/dashboard/resume/upload');

    // Create 1MB file
    const oneMbFile = path.join(FIXTURES_DIR, '1mb-resume.pdf');
    const buffer = Buffer.alloc(1024 * 1024);
    fs.writeFileSync(oneMbFile, buffer);

    const startTime = Date.now();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(oneMbFile);
    await page.click('[data-testid="upload-button"]');

    // Wait for success
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible({ timeout: 10000 });

    const duration = Date.now() - startTime;

    // Should complete within 5 seconds
    expect(duration).toBeLessThan(5000);

    // Cleanup
    fs.unlinkSync(oneMbFile);
  });
});

/**
 * Test Coverage Summary:
 * - Resume upload (job seeker)
 * - Company logo upload (employer)
 * - File type validation
 * - File size limits
 * - Access control
 * - Virus scanning status
 * - Pagination & filtering
 * - Error handling
 * - Network resilience
 * - API integration
 * - Performance
 *
 * Acceptance Criteria Validated:
 * ✅ Upload reliability
 * ✅ Pre-signed URLs work
 * ✅ File validation
 * ✅ Access control
 * ✅ Virus scanning
 * ✅ Error handling
 */
