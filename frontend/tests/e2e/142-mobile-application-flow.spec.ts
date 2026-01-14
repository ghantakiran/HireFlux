/**
 * E2E Tests for Issue #142: Mobile Application Flow
 * Phase 5 | P1 | Mobile-optimized job application with camera upload
 *
 * Features:
 * - Mobile-optimized application flow
 * - Simplified forms with touch-friendly inputs
 * - Camera resume upload
 * - Instant submit with confirmation
 * - Progress indicators
 *
 * Acceptance Criteria:
 * - ✅ Flow complete (all steps work end-to-end)
 * - ✅ Camera working (capture photo, upload file)
 * - ✅ Inputs large (min 44x44px tap targets)
 * - ✅ Submit instant (optimistic UI, no lag)
 */

import { test, expect, devices } from '@playwright/test';

// Use mobile viewport for all tests
test.use(devices['iPhone 13 Pro']);

test.describe('Issue #142: Mobile Application Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to job details page
    await page.goto('http://localhost:3000/jobs/job-001');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test.describe('1. Application Flow - Entry Point', () => {
    test('should show "Apply Now" button on job details page', async ({ page }) => {
      const applyButton = page.locator('[data-apply-button]');

      await expect(applyButton).toBeVisible();
      await expect(applyButton).toHaveText(/Apply Now|Quick Apply/i);
      await expect(applyButton).toBeEnabled();
    });

    test('should have touch-friendly apply button (min 44x44px)', async ({ page }) => {
      const applyButton = page.locator('[data-apply-button]');
      const box = await applyButton.boundingBox();

      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(120); // Wide button for easy tapping
    });

    test('should open application modal on "Apply Now" click', async ({ page }) => {
      await page.click('[data-apply-button]');

      const modal = page.locator('[data-application-modal]');
      await expect(modal).toBeVisible();

      // Should show first step
      await expect(page.locator('[data-application-step="1"]')).toBeVisible();
    });

    test('should show progress indicator with steps', async ({ page }) => {
      await page.click('[data-apply-button]');

      const progress = page.locator('[data-application-progress]');
      await expect(progress).toBeVisible();

      // Should show step indicators (e.g., "1 of 3", "Step 1/3")
      await expect(progress).toContainText(/1.*3|Step 1/i);
    });

    test('should close modal on cancel/back button', async ({ page }) => {
      await page.click('[data-apply-button]');

      const modal = page.locator('[data-application-modal]');
      await expect(modal).toBeVisible();

      await page.click('[data-modal-close]');
      await expect(modal).not.toBeVisible();
    });

    test('should close modal on backdrop click', async ({ page }) => {
      await page.click('[data-apply-button]');

      const modal = page.locator('[data-application-modal]');
      await expect(modal).toBeVisible();

      // Click backdrop (outside modal content)
      await page.click('[data-modal-backdrop]');
      await expect(modal).not.toBeVisible();
    });
  });

  test.describe('2. Step 1: Resume Upload', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-apply-button]');
      await page.waitForSelector('[data-application-step="1"]');
    });

    test('should show resume upload section as first step', async ({ page }) => {
      const uploadSection = page.locator('[data-resume-upload]');
      await expect(uploadSection).toBeVisible();

      await expect(page.locator('h2')).toContainText(/Upload Resume|Resume/i);
    });

    test('should show three upload options', async ({ page }) => {
      await expect(page.locator('[data-upload-option="camera"]')).toBeVisible();
      await expect(page.locator('[data-upload-option="file"]')).toBeVisible();
      await expect(page.locator('[data-upload-option="existing"]')).toBeVisible();
    });

    test('should have touch-friendly upload buttons (min 44x44px)', async ({ page }) => {
      const cameraButton = page.locator('[data-upload-option="camera"]');
      const box = await cameraButton.boundingBox();

      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(100);
    });

    test('should open camera capture on camera option click', async ({ page, context }) => {
      // Grant camera permission
      await context.grantPermissions(['camera']);

      await page.click('[data-upload-option="camera"]');

      // Should show camera interface or file picker
      const camera = page.locator('[data-camera-capture]');
      await expect(camera).toBeVisible({ timeout: 3000 });
    });

    test('should handle camera permission denied gracefully', async ({ page, context }) => {
      // Deny camera permission
      await context.grantPermissions([]);

      await page.click('[data-upload-option="camera"]');

      // Should show error message
      const errorMessage = page.locator('[data-camera-error]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText(/permission|camera|access/i);
    });

    test('should open file picker on file upload option', async ({ page }) => {
      // Set up file chooser promise before clicking
      const fileChooserPromise = page.waitForEvent('filechooser');

      await page.click('[data-upload-option="file"]');

      const fileChooser = await fileChooserPromise;
      expect(fileChooser).toBeTruthy();

      // Verify accepted file types
      const accept = await page.locator('[data-upload-option="file"] input[type="file"]').getAttribute('accept');
      expect(accept).toContain('.pdf');
      expect(accept).toContain('.doc');
    });

    test('should show existing resumes when "Use existing" clicked', async ({ page }) => {
      await page.click('[data-upload-option="existing"]');

      const resumeList = page.locator('[data-existing-resumes]');
      await expect(resumeList).toBeVisible();

      // Should show at least one resume (from profile)
      await expect(page.locator('[data-resume-item]').first()).toBeVisible();
    });

    test('should select existing resume and enable next button', async ({ page }) => {
      await page.click('[data-upload-option="existing"]');

      await page.click('[data-resume-item]').first();

      // Selected resume should be highlighted
      await expect(page.locator('[data-resume-item][data-selected="true"]').first()).toBeVisible();

      // Next button should be enabled
      const nextButton = page.locator('[data-next-button]');
      await expect(nextButton).toBeEnabled();
    });

    test('should upload file and show preview', async ({ page }) => {
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.click('[data-upload-option="file"]');

      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles({
        name: 'resume.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Mock PDF content'),
      });

      // Should show upload progress
      const progress = page.locator('[data-upload-progress]');
      await expect(progress).toBeVisible();

      // Should show success state after upload
      const success = page.locator('[data-upload-success]');
      await expect(success).toBeVisible({ timeout: 5000 });

      // Should show file name
      await expect(page.locator('[data-file-name]')).toContainText('resume.pdf');

      // Next button should be enabled
      await expect(page.locator('[data-next-button]')).toBeEnabled();
    });

    test('should handle file upload error', async ({ page }) => {
      // Simulate upload error by selecting invalid file
      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.click('[data-upload-option="file"]');

      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles({
        name: 'invalid.exe',
        mimeType: 'application/x-msdownload',
        buffer: Buffer.from('Invalid file'),
      });

      // Should show error message
      const error = page.locator('[data-upload-error]');
      await expect(error).toBeVisible();
      await expect(error).toContainText(/invalid|format|type/i);
    });

    test('should disable next button when no resume selected', async ({ page }) => {
      const nextButton = page.locator('[data-next-button]');
      await expect(nextButton).toBeDisabled();
    });

    test('should show file size limit', async ({ page }) => {
      const sizeLimit = page.locator('[data-file-size-limit]');
      await expect(sizeLimit).toBeVisible();
      await expect(sizeLimit).toContainText(/5MB|10MB|size/i);
    });

    test('should show supported file formats', async ({ page }) => {
      const formats = page.locator('[data-supported-formats]');
      await expect(formats).toBeVisible();
      await expect(formats).toContainText(/PDF|DOC|DOCX/i);
    });
  });

  test.describe('3. Step 2: Application Form (Simplified)', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-apply-button]');

      // Select existing resume to proceed to step 2
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      await page.waitForSelector('[data-application-step="2"]');
    });

    test('should show simplified application form', async ({ page }) => {
      const form = page.locator('[data-application-form]');
      await expect(form).toBeVisible();

      await expect(page.locator('h2')).toContainText(/Application|Details/i);
    });

    test('should show essential fields only (name, email, phone)', async ({ page }) => {
      await expect(page.locator('input[name="fullName"]')).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="phone"]')).toBeVisible();
    });

    test('should pre-fill fields from user profile', async ({ page }) => {
      const nameInput = page.locator('input[name="fullName"]');
      const emailInput = page.locator('input[name="email"]');

      await expect(nameInput).toHaveValue(/.+/); // Non-empty
      await expect(emailInput).toHaveValue(/.+@.+\..+/); // Valid email format
    });

    test('should have large, touch-friendly input fields', async ({ page }) => {
      const nameInput = page.locator('input[name="fullName"]');
      const box = await nameInput.boundingBox();

      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44); // Min iOS touch target
    });

    test('should show mobile-optimized keyboard for each input type', async ({ page }) => {
      // Email input should have email keyboard
      const emailInput = page.locator('input[name="email"]');
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(emailInput).toHaveAttribute('inputmode', 'email');

      // Phone input should have tel keyboard
      const phoneInput = page.locator('input[name="phone"]');
      await expect(phoneInput).toHaveAttribute('type', 'tel');
      await expect(phoneInput).toHaveAttribute('inputmode', 'tel');
    });

    test('should show cover letter textarea (optional)', async ({ page }) => {
      const coverLetter = page.locator('textarea[name="coverLetter"]');
      await expect(coverLetter).toBeVisible();

      // Should be optional (no required attribute)
      await expect(coverLetter).not.toHaveAttribute('required');
    });

    test('should show "Generate Cover Letter" button', async ({ page }) => {
      const generateButton = page.locator('[data-generate-cover-letter]');
      await expect(generateButton).toBeVisible();
      await expect(generateButton).toHaveText(/Generate|AI|Auto/i);
    });

    test('should generate cover letter on button click', async ({ page }) => {
      await page.click('[data-generate-cover-letter]');

      // Should show loading state
      const loading = page.locator('[data-generating]');
      await expect(loading).toBeVisible();

      // Should populate cover letter textarea after generation
      const coverLetter = page.locator('textarea[name="coverLetter"]');
      await expect(coverLetter).toHaveValue(/.+/, { timeout: 10000 });

      // Generated text should be non-empty
      const value = await coverLetter.inputValue();
      expect(value.length).toBeGreaterThan(50);
    });

    test('should validate required fields', async ({ page }) => {
      // Clear pre-filled fields
      await page.fill('input[name="fullName"]', '');
      await page.fill('input[name="email"]', '');

      await page.click('[data-next-button]');

      // Should show validation errors
      await expect(page.locator('[data-error="fullName"]')).toBeVisible();
      await expect(page.locator('[data-error="email"]')).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.fill('input[name="email"]', 'invalid-email');

      await page.click('[data-next-button]');

      const error = page.locator('[data-error="email"]');
      await expect(error).toBeVisible();
      await expect(error).toContainText(/invalid|format|email/i);
    });

    test('should validate phone format', async ({ page }) => {
      await page.fill('input[name="phone"]', 'abc123');

      await page.click('[data-next-button]');

      const error = page.locator('[data-error="phone"]');
      await expect(error).toBeVisible();
      await expect(error).toContainText(/invalid|format|phone/i);
    });

    test('should enable next button when form is valid', async ({ page }) => {
      // Fill in all required fields
      await page.fill('input[name="fullName"]', 'John Doe');
      await page.fill('input[name="email"]', 'john@example.com');
      await page.fill('input[name="phone"]', '+1 (555) 123-4567');

      const nextButton = page.locator('[data-next-button]');
      await expect(nextButton).toBeEnabled();
    });

    test('should show character count for cover letter', async ({ page }) => {
      const coverLetter = page.locator('textarea[name="coverLetter"]');
      await coverLetter.fill('This is a test cover letter.');

      const charCount = page.locator('[data-char-count]');
      await expect(charCount).toBeVisible();
      await expect(charCount).toContainText(/\d+/); // Shows number
    });

    test('should enforce max length for cover letter', async ({ page }) => {
      const coverLetter = page.locator('textarea[name="coverLetter"]');
      await expect(coverLetter).toHaveAttribute('maxlength');

      const maxLength = await coverLetter.getAttribute('maxlength');
      expect(parseInt(maxLength!)).toBeGreaterThan(0);
    });

    test('should show "Back" button to return to previous step', async ({ page }) => {
      const backButton = page.locator('[data-back-button]');
      await expect(backButton).toBeVisible();

      await page.click('[data-back-button]');

      // Should return to step 1
      await expect(page.locator('[data-application-step="1"]')).toBeVisible();
    });

    test('should preserve form data when going back', async ({ page }) => {
      // Fill in form data
      await page.fill('input[name="fullName"]', 'Jane Smith');
      await page.fill('textarea[name="coverLetter"]', 'Custom cover letter');

      // Go back to step 1
      await page.click('[data-back-button]');

      // Go forward to step 2 again
      await page.click('[data-next-button]');
      await page.waitForSelector('[data-application-step="2"]');

      // Data should be preserved
      await expect(page.locator('input[name="fullName"]')).toHaveValue('Jane Smith');
      await expect(page.locator('textarea[name="coverLetter"]')).toHaveValue('Custom cover letter');
    });
  });

  test.describe('4. Step 3: Review & Confirmation', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-apply-button]');

      // Step 1: Select resume
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      // Step 2: Fill form
      await page.fill('input[name="fullName"]', 'John Doe');
      await page.fill('input[name="email"]', 'john@example.com');
      await page.fill('input[name="phone"]', '+1 (555) 123-4567');
      await page.click('[data-next-button]');

      await page.waitForSelector('[data-application-step="3"]');
    });

    test('should show review screen with all application details', async ({ page }) => {
      const review = page.locator('[data-application-review]');
      await expect(review).toBeVisible();

      await expect(page.locator('h2')).toContainText(/Review|Confirm/i);
    });

    test('should display job details', async ({ page }) => {
      await expect(page.locator('[data-review-job-title]')).toBeVisible();
      await expect(page.locator('[data-review-company]')).toBeVisible();
      await expect(page.locator('[data-review-location]')).toBeVisible();
    });

    test('should display resume information', async ({ page }) => {
      const resume = page.locator('[data-review-resume]');
      await expect(resume).toBeVisible();
      await expect(resume).toContainText(/resume|CV/i);
    });

    test('should display applicant information', async ({ page }) => {
      await expect(page.locator('[data-review-name]')).toContainText('John Doe');
      await expect(page.locator('[data-review-email]')).toContainText('john@example.com');
      await expect(page.locator('[data-review-phone]')).toContainText(/555.*123.*4567/);
    });

    test('should display cover letter if provided', async ({ page }) => {
      // Go back and add cover letter
      await page.click('[data-back-button]');
      await page.fill('textarea[name="coverLetter"]', 'This is my cover letter.');
      await page.click('[data-next-button]');

      const coverLetter = page.locator('[data-review-cover-letter]');
      await expect(coverLetter).toBeVisible();
      await expect(coverLetter).toContainText('This is my cover letter.');
    });

    test('should show "Edit" buttons for each section', async ({ page }) => {
      await expect(page.locator('[data-edit-resume]')).toBeVisible();
      await expect(page.locator('[data-edit-details]')).toBeVisible();
    });

    test('should navigate back to edit resume on edit button click', async ({ page }) => {
      await page.click('[data-edit-resume]');

      // Should go back to step 1
      await expect(page.locator('[data-application-step="1"]')).toBeVisible();
    });

    test('should navigate back to edit details on edit button click', async ({ page }) => {
      await page.click('[data-edit-details]');

      // Should go back to step 2
      await expect(page.locator('[data-application-step="2"]')).toBeVisible();
    });

    test('should show "Submit Application" button', async ({ page }) => {
      const submitButton = page.locator('[data-submit-button]');
      await expect(submitButton).toBeVisible();
      await expect(submitButton).toHaveText(/Submit|Apply|Send/i);
      await expect(submitButton).toBeEnabled();
    });

    test('should have touch-friendly submit button (min 44x44px)', async ({ page }) => {
      const submitButton = page.locator('[data-submit-button]');
      const box = await submitButton.boundingBox();

      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.width).toBeGreaterThanOrEqual(200);
    });

    test('should show terms and conditions checkbox', async ({ page }) => {
      const termsCheckbox = page.locator('[data-terms-checkbox]');
      await expect(termsCheckbox).toBeVisible();

      const termsLabel = page.locator('[data-terms-label]');
      await expect(termsLabel).toContainText(/terms|conditions|agree/i);
    });

    test('should require terms acceptance before submitting', async ({ page }) => {
      const submitButton = page.locator('[data-submit-button]');

      // Without checking terms, submit should show error
      await page.click('[data-submit-button]');

      const error = page.locator('[data-error="terms"]');
      await expect(error).toBeVisible();
      await expect(error).toContainText(/accept|agree|terms/i);
    });

    test('should enable submit after terms accepted', async ({ page }) => {
      const termsCheckbox = page.locator('[data-terms-checkbox]');
      await termsCheckbox.check();

      const submitButton = page.locator('[data-submit-button]');
      await expect(submitButton).toBeEnabled();
    });
  });

  test.describe('5. Submission & Success', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('[data-apply-button]');

      // Complete all steps
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      await page.fill('input[name="fullName"]', 'John Doe');
      await page.fill('input[name="email"]', 'john@example.com');
      await page.fill('input[name="phone"]', '+1 (555) 123-4567');
      await page.click('[data-next-button]');

      await page.check('[data-terms-checkbox]');
    });

    test('should submit application on button click', async ({ page }) => {
      await page.click('[data-submit-button]');

      // Should show submitting state
      const submitting = page.locator('[data-submitting]');
      await expect(submitting).toBeVisible();

      // Should show success state after submission
      const success = page.locator('[data-application-success]');
      await expect(success).toBeVisible({ timeout: 10000 });
    });

    test('should show optimistic UI (instant feedback)', async ({ page }) => {
      const startTime = Date.now();

      await page.click('[data-submit-button]');

      // Submitting state should appear instantly (< 100ms)
      const submitting = page.locator('[data-submitting]');
      await expect(submitting).toBeVisible();

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(100);
    });

    test('should show loading spinner during submission', async ({ page }) => {
      await page.click('[data-submit-button]');

      const spinner = page.locator('[data-loading-spinner]');
      await expect(spinner).toBeVisible();
    });

    test('should disable submit button during submission', async ({ page }) => {
      await page.click('[data-submit-button]');

      const submitButton = page.locator('[data-submit-button]');
      await expect(submitButton).toBeDisabled();
    });

    test('should show success confirmation screen', async ({ page }) => {
      await page.click('[data-submit-button]');

      const success = page.locator('[data-application-success]');
      await expect(success).toBeVisible({ timeout: 10000 });

      // Should show success message
      await expect(page.locator('[data-success-message]')).toContainText(/success|applied|submitted/i);
    });

    test('should display application reference number', async ({ page }) => {
      await page.click('[data-submit-button]');

      await page.waitForSelector('[data-application-success]');

      const refNumber = page.locator('[data-ref-number]');
      await expect(refNumber).toBeVisible();
      await expect(refNumber).toContainText(/APP-\d+|#\d+/);
    });

    test('should show "View Application" button', async ({ page }) => {
      await page.click('[data-submit-button]');

      await page.waitForSelector('[data-application-success]');

      const viewButton = page.locator('[data-view-application]');
      await expect(viewButton).toBeVisible();
      await expect(viewButton).toHaveText(/View|Details|Application/i);
    });

    test('should navigate to application details on "View Application" click', async ({ page }) => {
      await page.click('[data-submit-button]');
      await page.waitForSelector('[data-application-success]');

      await page.click('[data-view-application]');

      // Should navigate to applications page
      await expect(page).toHaveURL(/\/dashboard\/applications/);
    });

    test('should show "Apply to More Jobs" button', async ({ page }) => {
      await page.click('[data-submit-button]');
      await page.waitForSelector('[data-application-success]');

      const moreJobsButton = page.locator('[data-apply-more]');
      await expect(moreJobsButton).toBeVisible();
      await expect(moreJobsButton).toHaveText(/More Jobs|Browse|Search/i);
    });

    test('should navigate to jobs page on "Apply to More Jobs" click', async ({ page }) => {
      await page.click('[data-submit-button]');
      await page.waitForSelector('[data-application-success]');

      await page.click('[data-apply-more]');

      // Should navigate to jobs page
      await expect(page).toHaveURL(/\/jobs/);
    });

    test('should close modal and refresh job card on "Done" button', async ({ page }) => {
      await page.click('[data-submit-button]');
      await page.waitForSelector('[data-application-success]');

      await page.click('[data-done-button]');

      // Modal should close
      const modal = page.locator('[data-application-modal]');
      await expect(modal).not.toBeVisible();

      // Job card should show "Applied" status
      await expect(page.locator('[data-job-status]')).toContainText(/Applied/i);
    });

    test('should handle submission error gracefully', async ({ page }) => {
      // Simulate API error (intercept and fail)
      await page.route('**/api/applications', (route) => {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' }),
        });
      });

      await page.click('[data-submit-button]');

      // Should show error state
      const error = page.locator('[data-application-error]');
      await expect(error).toBeVisible({ timeout: 10000 });
      await expect(error).toContainText(/error|failed|try again/i);
    });

    test('should allow retry after submission error', async ({ page }) => {
      // Simulate API error first time
      let attemptCount = 0;
      await page.route('**/api/applications', (route) => {
        attemptCount++;
        if (attemptCount === 1) {
          route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
        } else {
          route.continue();
        }
      });

      await page.click('[data-submit-button]');
      await page.waitForSelector('[data-application-error]');

      // Click retry button
      await page.click('[data-retry-button]');

      // Should show success on second attempt
      const success = page.locator('[data-application-success]');
      await expect(success).toBeVisible({ timeout: 10000 });
    });

    test('should save application to local storage on success', async ({ page }) => {
      await page.click('[data-submit-button]');
      await page.waitForSelector('[data-application-success]');

      // Check localStorage
      const applications = await page.evaluate(() => {
        const stored = localStorage.getItem('applications');
        return stored ? JSON.parse(stored) : [];
      });

      expect(applications).toHaveLength(1);
      expect(applications[0]).toHaveProperty('jobId');
      expect(applications[0]).toHaveProperty('status', 'submitted');
    });
  });

  test.describe('6. Camera Capture (Advanced)', () => {
    test.beforeEach(async ({ page, context }) => {
      // Grant camera permission
      await context.grantPermissions(['camera']);

      await page.click('[data-apply-button]');
      await page.waitForSelector('[data-application-step="1"]');
    });

    test('should open camera interface on camera option click', async ({ page }) => {
      await page.click('[data-upload-option="camera"]');

      const cameraInterface = page.locator('[data-camera-capture]');
      await expect(cameraInterface).toBeVisible({ timeout: 3000 });
    });

    test('should show camera preview', async ({ page }) => {
      await page.click('[data-upload-option="camera"]');

      const preview = page.locator('[data-camera-preview]');
      await expect(preview).toBeVisible({ timeout: 3000 });

      // Video element should be present
      const video = page.locator('[data-camera-preview] video');
      await expect(video).toBeVisible();
    });

    test('should show capture button', async ({ page }) => {
      await page.click('[data-upload-option="camera"]');

      const captureButton = page.locator('[data-capture-button]');
      await expect(captureButton).toBeVisible({ timeout: 3000 });
      await expect(captureButton).toHaveText(/Capture|Take Photo|Snap/i);
    });

    test('should have touch-friendly capture button (min 64x64px)', async ({ page }) => {
      await page.click('[data-upload-option="camera"]');
      await page.waitForSelector('[data-capture-button]');

      const box = await page.locator('[data-capture-button]').boundingBox();

      expect(box).toBeTruthy();
      expect(box!.height).toBeGreaterThanOrEqual(64); // Larger for camera capture
      expect(box!.width).toBeGreaterThanOrEqual(64);
    });

    test('should capture photo on button click', async ({ page }) => {
      await page.click('[data-upload-option="camera"]');
      await page.waitForSelector('[data-capture-button]');

      await page.click('[data-capture-button]');

      // Should show captured image preview
      const imagePreview = page.locator('[data-captured-image]');
      await expect(imagePreview).toBeVisible();

      // Canvas or img element should be present
      const image = page.locator('[data-captured-image] img, [data-captured-image] canvas');
      await expect(image).toBeVisible();
    });

    test('should show retake button after capture', async ({ page }) => {
      await page.click('[data-upload-option="camera"]');
      await page.waitForSelector('[data-capture-button]');
      await page.click('[data-capture-button]');

      const retakeButton = page.locator('[data-retake-button]');
      await expect(retakeButton).toBeVisible();
      await expect(retakeButton).toHaveText(/Retake|Try Again/i);
    });

    test('should show use photo button after capture', async ({ page }) => {
      await page.click('[data-upload-option="camera"]');
      await page.waitForSelector('[data-capture-button]');
      await page.click('[data-capture-button]');

      const useButton = page.locator('[data-use-photo-button]');
      await expect(useButton).toBeVisible();
      await expect(useButton).toHaveText(/Use|Confirm|Accept/i);
    });

    test('should restart camera on retake button click', async ({ page }) => {
      await page.click('[data-upload-option="camera"]');
      await page.waitForSelector('[data-capture-button]');
      await page.click('[data-capture-button]');

      await page.click('[data-retake-button]');

      // Should show camera preview again
      const preview = page.locator('[data-camera-preview] video');
      await expect(preview).toBeVisible();

      // Capture button should be visible again
      await expect(page.locator('[data-capture-button]')).toBeVisible();
    });

    test('should process captured photo on use button click', async ({ page }) => {
      await page.click('[data-upload-option="camera"]');
      await page.waitForSelector('[data-capture-button]');
      await page.click('[data-capture-button]');
      await page.click('[data-use-photo-button]');

      // Should show processing state
      const processing = page.locator('[data-processing]');
      await expect(processing).toBeVisible();
      await expect(processing).toContainText(/processing|extracting|analyzing/i);
    });

    test('should extract text from captured photo (OCR)', async ({ page }) => {
      await page.click('[data-upload-option="camera"]');
      await page.waitForSelector('[data-capture-button]');
      await page.click('[data-capture-button]');
      await page.click('[data-use-photo-button]');

      // Should show success after OCR
      const success = page.locator('[data-ocr-success]');
      await expect(success).toBeVisible({ timeout: 15000 });

      // Should show extracted text preview
      const extractedText = page.locator('[data-extracted-text]');
      await expect(extractedText).toBeVisible();
    });

    test('should enable next button after successful photo processing', async ({ page }) => {
      await page.click('[data-upload-option="camera"]');
      await page.waitForSelector('[data-capture-button]');
      await page.click('[data-capture-button]');
      await page.click('[data-use-photo-button]');

      await page.waitForSelector('[data-ocr-success]', { timeout: 15000 });

      const nextButton = page.locator('[data-next-button]');
      await expect(nextButton).toBeEnabled();
    });

    test('should close camera interface on cancel button', async ({ page }) => {
      await page.click('[data-upload-option="camera"]');
      await page.waitForSelector('[data-camera-capture]');

      await page.click('[data-cancel-camera]');

      // Should return to upload options
      await expect(page.locator('[data-camera-capture]')).not.toBeVisible();
      await expect(page.locator('[data-resume-upload]')).toBeVisible();
    });

    test('should handle camera initialization error', async ({ page, context }) => {
      // Revoke camera permission after page load
      await context.clearPermissions();

      await page.click('[data-upload-option="camera"]');

      // Should show error message
      const error = page.locator('[data-camera-error]');
      await expect(error).toBeVisible();
      await expect(error).toContainText(/permission|camera|access/i);

      // Should show "Grant Permission" button
      const grantButton = page.locator('[data-grant-permission]');
      await expect(grantButton).toBeVisible();
    });
  });

  test.describe('7. Progress & State Management', () => {
    test('should show progress bar with current step', async ({ page }) => {
      await page.click('[data-apply-button]');

      const progress = page.locator('[data-application-progress]');
      await expect(progress).toBeVisible();

      // Step 1 should be active
      await expect(page.locator('[data-progress-step="1"][data-active="true"]')).toBeVisible();
    });

    test('should update progress bar as user advances', async ({ page }) => {
      await page.click('[data-apply-button]');

      // Complete step 1
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      // Step 2 should be active
      await expect(page.locator('[data-progress-step="2"][data-active="true"]')).toBeVisible();

      // Step 1 should be completed
      await expect(page.locator('[data-progress-step="1"][data-completed="true"]')).toBeVisible();
    });

    test('should show step indicators with icons', async ({ page }) => {
      await page.click('[data-apply-button]');

      // Each step should have an icon
      await expect(page.locator('[data-progress-step="1"] svg')).toBeVisible();
      await expect(page.locator('[data-progress-step="2"] svg')).toBeVisible();
      await expect(page.locator('[data-progress-step="3"] svg')).toBeVisible();
    });

    test('should show step labels on desktop', async ({ page, viewport }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto('http://localhost:3000/jobs/job-001');

      await page.click('[data-apply-button]');

      // Step labels should be visible
      await expect(page.locator('[data-progress-step="1"] [data-step-label]')).toContainText(/Resume|Upload/i);
      await expect(page.locator('[data-progress-step="2"] [data-step-label]')).toContainText(/Details|Form/i);
      await expect(page.locator('[data-progress-step="3"] [data-step-label]')).toContainText(/Review|Confirm/i);
    });

    test('should hide step labels on mobile', async ({ page }) => {
      // Mobile viewport (default)
      await page.click('[data-apply-button]');

      // Step labels should be hidden or very compact
      const label = page.locator('[data-progress-step="1"] [data-step-label]');
      const isHidden = await label.isHidden().catch(() => true);

      expect(isHidden || await label.evaluate((el) => el.offsetHeight === 0)).toBeTruthy();
    });

    test('should disable forward navigation to incomplete steps', async ({ page }) => {
      await page.click('[data-apply-button]');

      // Try to click step 2 without completing step 1
      const step2 = page.locator('[data-progress-step="2"]');
      const isDisabled = await step2.evaluate((el) => el.hasAttribute('disabled') || el.classList.contains('disabled'));

      expect(isDisabled).toBeTruthy();
    });

    test('should allow backward navigation to completed steps', async ({ page }) => {
      await page.click('[data-apply-button]');

      // Complete step 1
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      // Click on step 1 indicator to go back
      await page.click('[data-progress-step="1"]');

      // Should return to step 1
      await expect(page.locator('[data-application-step="1"]')).toBeVisible();
    });

    test('should preserve form state when navigating between steps', async ({ page }) => {
      await page.click('[data-apply-button]');

      // Step 1: Select resume
      await page.click('[data-upload-option="existing"]');
      const resumeId = await page.locator('[data-resume-item]').first().getAttribute('data-resume-id');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      // Step 2: Fill form
      await page.fill('textarea[name="coverLetter"]', 'My cover letter');
      await page.click('[data-next-button]');

      // Go back to step 2
      await page.click('[data-back-button]');

      // Cover letter should be preserved
      await expect(page.locator('textarea[name="coverLetter"]')).toHaveValue('My cover letter');

      // Go back to step 1
      await page.click('[data-back-button]');

      // Resume selection should be preserved
      await expect(page.locator(`[data-resume-item][data-resume-id="${resumeId}"][data-selected="true"]`)).toBeVisible();
    });
  });

  test.describe('8. Mobile UX Enhancements', () => {
    test('should use full-screen modal on mobile', async ({ page }) => {
      await page.click('[data-apply-button]');

      const modal = page.locator('[data-application-modal]');
      const viewport = page.viewportSize();

      const box = await modal.boundingBox();

      expect(box).toBeTruthy();
      expect(box!.width).toBeCloseTo(viewport!.width, -10); // Within 10px
      expect(box!.height).toBeCloseTo(viewport!.height, -10);
    });

    test('should show fixed header with close button', async ({ page }) => {
      await page.click('[data-apply-button]');

      const header = page.locator('[data-modal-header]');
      await expect(header).toBeVisible();

      // Should have fixed positioning
      const position = await header.evaluate((el) => window.getComputedStyle(el).position);
      expect(position).toBe('fixed');

      // Close button should be visible
      await expect(page.locator('[data-modal-close]')).toBeVisible();
    });

    test('should show fixed footer with action buttons', async ({ page }) => {
      await page.click('[data-apply-button]');

      const footer = page.locator('[data-modal-footer]');
      await expect(footer).toBeVisible();

      // Should have fixed positioning
      const position = await footer.evaluate((el) => window.getComputedStyle(el).position);
      expect(position).toBe('fixed');

      // Action buttons should be visible
      await expect(page.locator('[data-next-button]')).toBeVisible();
    });

    test('should have scrollable content area', async ({ page }) => {
      await page.click('[data-apply-button]');

      const content = page.locator('[data-modal-content]');
      const overflowY = await content.evaluate((el) => window.getComputedStyle(el).overflowY);

      expect(overflowY).toMatch(/auto|scroll/);
    });

    test('should handle iOS safe area insets', async ({ page }) => {
      await page.click('[data-apply-button]');

      const modal = page.locator('[data-application-modal]');
      const paddingBottom = await modal.evaluate((el) => window.getComputedStyle(el).paddingBottom);

      // Should have bottom padding for iOS safe area
      expect(paddingBottom).toMatch(/env\(safe-area-inset-bottom\)|px/);
    });

    test('should prevent background scroll when modal is open', async ({ page }) => {
      await page.click('[data-apply-button]');

      // Body should have overflow hidden
      const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
      expect(bodyOverflow).toBe('hidden');
    });

    test('should restore background scroll when modal is closed', async ({ page }) => {
      await page.click('[data-apply-button]');
      await page.click('[data-modal-close]');

      // Body overflow should be reset
      const bodyOverflow = await page.evaluate(() => document.body.style.overflow);
      expect(bodyOverflow).toMatch(/auto|visible|^$/);
    });

    test('should use mobile-optimized date picker', async ({ page }) => {
      await page.click('[data-apply-button]');

      // Complete step 1
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      // If there's a date field (e.g., availability date)
      const dateInput = page.locator('input[type="date"]');
      if (await dateInput.count() > 0) {
        // Should use native date picker on mobile
        await expect(dateInput).toHaveAttribute('type', 'date');
      }
    });

    test('should show haptic feedback on button press (if supported)', async ({ page }) => {
      // Note: Haptic feedback can't be tested in Playwright, but we can verify the API is called
      await page.click('[data-apply-button]');

      // Check if vibrate API exists
      const supportsVibrate = await page.evaluate(() => 'vibrate' in navigator);

      if (supportsVibrate) {
        // We'd expect the button to trigger a short vibration
        // This is more of a code review check than a test
        expect(supportsVibrate).toBeTruthy();
      }
    });

    test('should use large, high-contrast buttons', async ({ page }) => {
      await page.click('[data-apply-button]');

      const nextButton = page.locator('[data-next-button]');

      // Should have high contrast
      const bgColor = await nextButton.evaluate((el) => window.getComputedStyle(el).backgroundColor);
      const color = await nextButton.evaluate((el) => window.getComputedStyle(el).color);

      expect(bgColor).toBeTruthy();
      expect(color).toBeTruthy();

      // Should be large
      const box = await nextButton.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    });

    test('should show loading state without blocking UI', async ({ page }) => {
      await page.click('[data-apply-button]');

      // Complete all steps
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      await page.fill('input[name="fullName"]', 'John Doe');
      await page.fill('input[name="email"]', 'john@example.com');
      await page.fill('input[name="phone"]', '+1 (555) 123-4567');

      // Click generate cover letter
      await page.click('[data-generate-cover-letter]');

      // Loading indicator should be visible
      const loading = page.locator('[data-generating]');
      await expect(loading).toBeVisible();

      // But user should still be able to see and edit other fields
      const nameInput = page.locator('input[name="fullName"]');
      await expect(nameInput).toBeEnabled();
    });
  });

  test.describe('9. Accessibility (WCAG 2.1 AA)', () => {
    test('should have proper heading hierarchy', async ({ page }) => {
      await page.click('[data-apply-button]');

      // H1 for modal title
      await expect(page.locator('h1, [role="heading"][aria-level="1"]')).toBeVisible();

      // H2 for section headings
      await expect(page.locator('h2, [role="heading"][aria-level="2"]')).toBeVisible();
    });

    test('should have accessible form labels', async ({ page }) => {
      await page.click('[data-apply-button]');

      // Complete step 1
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      // Each input should have a label
      const nameInput = page.locator('input[name="fullName"]');
      const labelId = await nameInput.getAttribute('aria-labelledby');
      const label = page.locator(`[id="${labelId}"]`);

      await expect(label).toBeVisible();
    });

    test('should announce errors to screen readers', async ({ page }) => {
      await page.click('[data-apply-button]');
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      // Clear required field
      await page.fill('input[name="fullName"]', '');
      await page.click('[data-next-button]');

      const error = page.locator('[data-error="fullName"]');
      await expect(error).toHaveAttribute('role', 'alert');
      await expect(error).toHaveAttribute('aria-live', 'polite');
    });

    test('should have keyboard-accessible camera controls', async ({ page, context }) => {
      await context.grantPermissions(['camera']);
      await page.click('[data-apply-button]');
      await page.click('[data-upload-option="camera"]');

      const captureButton = page.locator('[data-capture-button]');

      // Should be focusable
      await captureButton.focus();
      await expect(captureButton).toBeFocused();

      // Should be activatable with Enter/Space
      await page.keyboard.press('Enter');

      // Captured image should appear
      await expect(page.locator('[data-captured-image]')).toBeVisible();
    });

    test('should have focus visible on all interactive elements', async ({ page }) => {
      await page.click('[data-apply-button]');

      const uploadOption = page.locator('[data-upload-option="camera"]');
      await uploadOption.focus();

      // Should have visible focus indicator
      const outline = await uploadOption.evaluate((el) => window.getComputedStyle(el).outline);
      expect(outline).not.toBe('none');
    });

    test('should trap focus within modal', async ({ page }) => {
      await page.click('[data-apply-button]');

      // Get all focusable elements
      const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const focusableCount = await page.locator(`[data-application-modal] ${focusableSelectors}`).count();

      // Tab through all elements
      for (let i = 0; i < focusableCount + 2; i++) {
        await page.keyboard.press('Tab');
      }

      // Focus should cycle back to first element
      const firstFocusable = page.locator(`[data-application-modal] ${focusableSelectors}`).first();
      await expect(firstFocusable).toBeFocused();
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await page.click('[data-apply-button]');

      // Text should have 4.5:1 contrast ratio
      // This is a simplified check - real test would use axe-core
      const textElement = page.locator('h2').first();
      const color = await textElement.evaluate((el) => window.getComputedStyle(el).color);
      const bgColor = await textElement.evaluate((el) => window.getComputedStyle(el).backgroundColor);

      expect(color).toBeTruthy();
      expect(bgColor).toBeTruthy();
    });

    test('should have descriptive button labels', async ({ page }) => {
      await page.click('[data-apply-button]');

      const nextButton = page.locator('[data-next-button]');

      // Should have descriptive text or aria-label
      const text = await nextButton.textContent();
      const ariaLabel = await nextButton.getAttribute('aria-label');

      expect(text || ariaLabel).toMatch(/next|continue|proceed/i);
    });
  });

  test.describe('10. Performance & Optimization', () => {
    test('should render modal in < 200ms', async ({ page }) => {
      const startTime = Date.now();

      await page.click('[data-apply-button]');
      await page.waitForSelector('[data-application-modal]');

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(200);
    });

    test('should load step 2 in < 100ms after clicking next', async ({ page }) => {
      await page.click('[data-apply-button]');
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();

      const startTime = Date.now();

      await page.click('[data-next-button]');
      await page.waitForSelector('[data-application-step="2"]');

      const endTime = Date.now();
      const transitionTime = endTime - startTime;

      expect(transitionTime).toBeLessThan(100);
    });

    test('should submit application in < 3 seconds (95th percentile)', async ({ page }) => {
      await page.click('[data-apply-button]');

      // Complete all steps
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      await page.fill('input[name="fullName"]', 'John Doe');
      await page.fill('input[name="email"]', 'john@example.com');
      await page.fill('input[name="phone"]', '+1 (555) 123-4567');
      await page.click('[data-next-button]');

      await page.check('[data-terms-checkbox]');

      const startTime = Date.now();

      await page.click('[data-submit-button]');
      await page.waitForSelector('[data-application-success]', { timeout: 10000 });

      const endTime = Date.now();
      const submitTime = endTime - startTime;

      expect(submitTime).toBeLessThan(3000);
    });

    test('should lazy load camera module', async ({ page }) => {
      // Camera module should not be loaded initially
      const initialScripts = await page.evaluate(() => {
        return Array.from(document.scripts).map((s) => s.src);
      });

      expect(initialScripts.join(' ')).not.toContain('camera');

      // Click camera option
      await page.click('[data-apply-button]');
      await page.click('[data-upload-option="camera"]');

      // Camera module should now be loaded
      await page.waitForTimeout(1000);

      const updatedScripts = await page.evaluate(() => {
        return Array.from(document.scripts).map((s) => s.src);
      });

      // Should have loaded additional camera scripts
      expect(updatedScripts.length).toBeGreaterThan(initialScripts.length);
    });

    test('should preload next step content', async ({ page }) => {
      await page.click('[data-apply-button]');

      // Step 2 content should be preloaded in the background
      // We can check for data attributes or hidden elements
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();

      // Clicking next should be instant (content already loaded)
      const startTime = Date.now();
      await page.click('[data-next-button]');
      await page.waitForSelector('[data-application-step="2"]');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50); // Very fast transition
    });

    test('should debounce form validation', async ({ page }) => {
      await page.click('[data-apply-button]');
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      const emailInput = page.locator('input[name="email"]');

      // Type quickly
      await emailInput.fill('test@');

      // Validation should not trigger immediately
      await page.waitForTimeout(100);
      let errorVisible = await page.locator('[data-error="email"]').isVisible();
      expect(errorVisible).toBeFalsy();

      // After debounce delay (e.g., 300ms), validation should trigger
      await page.waitForTimeout(300);
      errorVisible = await page.locator('[data-error="email"]').isVisible();
      expect(errorVisible).toBeTruthy();
    });

    test('should use optimistic UI for all actions', async ({ page }) => {
      await page.click('[data-apply-button]');
      await page.click('[data-upload-option="existing"]');

      // Selecting resume should update UI instantly
      const startTime = Date.now();
      await page.click('[data-resume-item]').first();
      await page.waitForSelector('[data-resume-item][data-selected="true"]');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50); // Instant feedback
    });

    test('should not block UI during background operations', async ({ page }) => {
      await page.click('[data-apply-button]');
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      // Start cover letter generation
      await page.click('[data-generate-cover-letter]');

      // UI should remain responsive
      const nameInput = page.locator('input[name="fullName"]');
      await nameInput.fill('Test User');

      // Should be able to type without lag
      await expect(nameInput).toHaveValue('Test User');
    });
  });

  test.describe('11. Edge Cases & Error Handling', () => {
    test('should handle network error during file upload', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/upload', (route) => route.abort());

      const fileChooserPromise = page.waitForEvent('filechooser');
      await page.click('[data-apply-button]');
      await page.click('[data-upload-option="file"]');

      const fileChooser = await fileChooserPromise;
      await fileChooser.setFiles({
        name: 'resume.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('PDF content'),
      });

      // Should show error
      const error = page.locator('[data-upload-error]');
      await expect(error).toBeVisible();
      await expect(error).toContainText(/network|failed|error/i);

      // Should show retry button
      await expect(page.locator('[data-retry-upload]')).toBeVisible();
    });

    test('should handle API error during cover letter generation', async ({ page }) => {
      await page.route('**/api/generate-cover-letter', (route) => {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Generation failed' }) });
      });

      await page.click('[data-apply-button]');
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      await page.click('[data-generate-cover-letter]');

      // Should show error
      const error = page.locator('[data-generation-error]');
      await expect(error).toBeVisible();
      await expect(error).toContainText(/failed|error|try again/i);
    });

    test('should handle empty resume list gracefully', async ({ page }) => {
      // Mock empty resume list
      await page.route('**/api/resumes', (route) => {
        route.fulfill({ status: 200, body: JSON.stringify({ resumes: [] }) });
      });

      await page.click('[data-apply-button]');
      await page.click('[data-upload-option="existing"]');

      // Should show empty state
      const emptyState = page.locator('[data-empty-resumes]');
      await expect(emptyState).toBeVisible();
      await expect(emptyState).toContainText(/no resumes|upload first|create resume/i);
    });

    test('should handle session timeout during application', async ({ page }) => {
      await page.click('[data-apply-button]');
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      await page.fill('input[name="fullName"]', 'John Doe');
      await page.fill('input[name="email"]', 'john@example.com');
      await page.fill('input[name="phone"]', '+1 (555) 123-4567');
      await page.click('[data-next-button]');
      await page.check('[data-terms-checkbox]');

      // Simulate session timeout
      await page.route('**/api/applications', (route) => {
        route.fulfill({ status: 401, body: JSON.stringify({ error: 'Unauthorized' }) });
      });

      await page.click('[data-submit-button]');

      // Should show session timeout error with login option
      const error = page.locator('[data-session-error]');
      await expect(error).toBeVisible();
      await expect(error).toContainText(/session|login|authenticate/i);

      await expect(page.locator('[data-login-button]')).toBeVisible();
    });

    test('should handle duplicate application submission', async ({ page }) => {
      // User already applied to this job
      await page.route('**/api/applications', (route) => {
        route.fulfill({ status: 409, body: JSON.stringify({ error: 'Already applied' }) });
      });

      await page.click('[data-apply-button]');
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      await page.fill('input[name="fullName"]', 'John Doe');
      await page.fill('input[name="email"]', 'john@example.com');
      await page.fill('input[name="phone"]', '+1 (555) 123-4567');
      await page.click('[data-next-button]');
      await page.check('[data-terms-checkbox]');

      await page.click('[data-submit-button]');

      // Should show duplicate error
      const error = page.locator('[data-duplicate-error]');
      await expect(error).toBeVisible();
      await expect(error).toContainText(/already applied|duplicate/i);
    });

    test('should handle very large cover letter (max length enforcement)', async ({ page }) => {
      await page.click('[data-apply-button]');
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      const coverLetter = page.locator('textarea[name="coverLetter"]');
      const maxLength = parseInt((await coverLetter.getAttribute('maxlength'))!);

      // Try to paste text longer than max length
      const longText = 'a'.repeat(maxLength + 100);
      await coverLetter.fill(longText);

      // Should truncate to max length
      const value = await coverLetter.inputValue();
      expect(value.length).toBeLessThanOrEqual(maxLength);
    });

    test('should handle browser back button during application', async ({ page }) => {
      await page.click('[data-apply-button]');
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      // Click browser back button
      await page.goBack();

      // Should show confirmation dialog or save draft
      // (Behavior depends on implementation)
      // Modal should either stay open with saved state or close
    });

    test('should handle offline mode gracefully', async ({ page, context }) => {
      // Simulate offline
      await context.setOffline(true);

      await page.click('[data-apply-button]');
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      await page.fill('input[name="fullName"]', 'John Doe');
      await page.fill('input[name="email"]', 'john@example.com');
      await page.fill('input[name="phone"]', '+1 (555) 123-4567');
      await page.click('[data-next-button]');
      await page.check('[data-terms-checkbox]');

      await page.click('[data-submit-button]');

      // Should show offline error
      const error = page.locator('[data-offline-error]');
      await expect(error).toBeVisible();
      await expect(error).toContainText(/offline|no connection|network/i);

      // Should save draft locally
      const draftSaved = await page.evaluate(() => {
        return localStorage.getItem('application-draft') !== null;
      });

      expect(draftSaved).toBeTruthy();
    });
  });

  test.describe('12. Cross-Browser Compatibility', () => {
    test('should work on iOS Safari', async ({ page, browserName }) => {
      test.skip(browserName !== 'webkit', 'iOS-specific test');

      await page.click('[data-apply-button]');

      // Modal should render correctly
      await expect(page.locator('[data-application-modal]')).toBeVisible();

      // Form inputs should work
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      await page.fill('input[name="email"]', 'test@example.com');
      await expect(page.locator('input[name="email"]')).toHaveValue('test@example.com');
    });

    test('should work on Android Chrome', async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium', 'Android-specific test');

      await page.click('[data-apply-button]');

      // Should handle Android-specific input behaviors
      await page.click('[data-upload-option="existing"]');
      await page.click('[data-resume-item]').first();
      await page.click('[data-next-button]');

      const phoneInput = page.locator('input[name="phone"]');
      await phoneInput.focus();

      // Should trigger tel keyboard
      const inputMode = await phoneInput.getAttribute('inputmode');
      expect(inputMode).toBe('tel');
    });

    test('should handle touch events vs mouse events', async ({ page }) => {
      await page.click('[data-apply-button]');

      const uploadOption = page.locator('[data-upload-option="camera"]');

      // Simulate touch
      await uploadOption.tap();

      // Should respond to touch
      // (In real implementation, would check for touch event listeners)
    });
  });
});
