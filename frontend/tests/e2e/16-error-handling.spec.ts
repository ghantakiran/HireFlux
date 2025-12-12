/**
 * E2E Tests: Error States & Recovery Flows - Issue #138
 *
 * TDD/BDD Approach:
 * 1. RED: Write failing tests first
 * 2. GREEN: Implement features to pass tests
 * 3. REFACTOR: Optimize implementation
 *
 * @see tests/features/error-handling.feature
 */

import { test, expect, Page, Route } from '@playwright/test';
import { setupAPIMocks } from './helpers/api-mock.helper';

test.describe('Error States & Recovery Flows - Issue #138', () => {
  // Setup API mocks before each test
  test.beforeEach(async ({ page }) => {
    await setupAPIMocks(page);
  });

  // ============================================================================
  // 1. Network Error Handling
  // ============================================================================

  test.describe('Network Error Handling', () => {
    test('@critical should display friendly error on network failure', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/v1/jobs**', (route: Route) => {
        route.abort('failed');
      });

      await page.goto('/dashboard/jobs');

      // Should show error message
      await expect(page.getByTestId('error-message')).toBeVisible();
      await expect(page.getByTestId('error-message')).toContainText(/network|connection/i);

      // Should show retry button
      const retryButton = page.getByRole('button', { name: /retry/i });
      await expect(retryButton).toBeVisible();

      // Should show friendly explanation
      await expect(page.getByTestId('error-description')).toContainText(
        /check your connection/i
      );
    });

    test('should retry successfully after network error', async ({ page }) => {
      let failureCount = 0;

      await page.route('**/api/v1/jobs**', async (route: Route) => {
        if (failureCount === 0) {
          failureCount++;
          route.abort('failed');
        } else {
          route.continue();
        }
      });

      await page.goto('/dashboard/jobs');

      // Wait for error
      await expect(page.getByTestId('error-message')).toBeVisible();

      // Click retry
      await page.getByRole('button', { name: /retry/i }).click();

      // Error should disappear
      await expect(page.getByTestId('error-message')).not.toBeVisible({ timeout: 5000 });

      // Content should load
      await expect(page.getByTestId('job-card')).toBeVisible();
    });

    test('should show retry progress indicator', async ({ page }) => {
      await page.route('**/api/v1/jobs**', (route: Route) => {
        route.abort('failed');
      });

      await page.goto('/dashboard/jobs');

      const retryButton = page.getByRole('button', { name: /retry/i });
      await retryButton.click();

      // Should show loading state during retry
      await expect(retryButton).toBeDisabled();
      await expect(page.getByTestId('loading-spinner')).toBeVisible();
    });
  });

  // ============================================================================
  // 2. API Error Handling
  // ============================================================================

  test.describe('API Error Handling', () => {
    test('@critical should display 500 error message', async ({ page }) => {
      await page.route('**/api/v1/applications**', (route: Route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error',
            reference_id: 'ERR-123456',
          }),
        });
      });

      await page.goto('/dashboard/jobs/job-1');

      // Try to apply
      await page.getByRole('button', { name: /apply/i }).click();

      // Should show error
      await expect(page.getByTestId('error-message')).toContainText(/something went wrong/i);

      // Should show reference ID
      await expect(page.getByTestId('error-reference')).toContainText('ERR-123456');

      // Should suggest trying again
      await expect(page.getByTestId('error-description')).toContainText(/try again later/i);
    });

    test('should handle validation errors', async ({ page }) => {
      await page.route('**/api/v1/cover-letters**', (route: Route) => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            errors: {
              job_title: 'Job title is required',
              company: 'Company name must be at least 2 characters',
            },
          }),
        });
      });

      await page.goto('/dashboard/cover-letters/new');

      // Submit form with invalid data
      await page.getByRole('button', { name: /generate/i }).click();

      // Should show field-specific errors
      await expect(page.getByTestId('error-job_title')).toContainText('required');
      await expect(page.getByTestId('error-company')).toContainText('at least 2 characters');

      // Fields should be highlighted
      await expect(page.locator('input[name="job_title"]')).toHaveClass(/error|invalid/);
      await expect(page.locator('input[name="company"]')).toHaveClass(/error|invalid/);
    });

    test('should show recovery suggestions for API errors', async ({ page }) => {
      await page.route('**/api/v1/jobs**', (route: Route) => {
        route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Service temporarily unavailable',
          }),
        });
      });

      await page.goto('/dashboard/jobs');

      await expect(page.getByTestId('error-suggestions')).toBeVisible();
      await expect(page.getByTestId('error-suggestions')).toContainText(/try again/i);
    });
  });

  // ============================================================================
  // 3. Offline Detection
  // ============================================================================

  test.describe('Offline Detection', () => {
    test('@critical should detect offline state', async ({ page, context }) => {
      await page.goto('/dashboard');

      // Simulate going offline
      await context.setOffline(true);

      // Trigger an action
      await page.getByRole('link', { name: /jobs/i }).click();

      // Should show offline indicator
      await expect(page.getByTestId('offline-indicator')).toBeVisible();
      await expect(page.getByTestId('offline-message')).toContainText(/offline/i);
    });

    test('should detect reconnection', async ({ page, context }) => {
      await page.goto('/dashboard');

      // Go offline
      await context.setOffline(true);
      await page.getByRole('link', { name: /jobs/i }).click();
      await expect(page.getByTestId('offline-indicator')).toBeVisible();

      // Come back online
      await context.setOffline(false);

      // Should show back online message
      await expect(page.getByTestId('online-indicator')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/back online/i)).toBeVisible();
    });

    test('should show cached content when offline', async ({ page, context }) => {
      await page.goto('/dashboard/jobs');
      await expect(page.getByTestId('job-card')).toHaveCount(5);

      // Go offline
      await context.setOffline(true);

      // Reload page
      await page.reload();

      // Should still show cached jobs
      await expect(page.getByTestId('job-card')).toHaveCount(5);
      await expect(page.getByTestId('offline-indicator')).toBeVisible();
    });

    test('should disable form submissions when offline', async ({ page, context }) => {
      await page.goto('/dashboard/jobs/job-1');

      // Go offline
      await context.setOffline(true);

      // Apply button should be disabled
      const applyButton = page.getByRole('button', { name: /apply/i });
      await expect(applyButton).toBeDisabled();

      // Should show offline warning
      await expect(page.getByText(/can't submit while offline/i)).toBeVisible();
    });
  });

  // ============================================================================
  // 4. Authentication Errors
  // ============================================================================

  test.describe('Authentication Errors', () => {
    test('@critical should handle expired session', async ({ page }) => {
      await page.route('**/api/v1/**', (route: Route) => {
        if (route.request().method() !== 'GET') {
          route.fulfill({
            status: 401,
            contentType: 'application/json',
            body: JSON.stringify({
              success: false,
              error: 'Session expired',
            }),
          });
        } else {
          route.continue();
        }
      });

      await page.goto('/dashboard/jobs/job-1');

      // Try to apply (POST request)
      await page.getByRole('button', { name: /apply/i }).click();

      // Should show session expired message
      await expect(page.getByTestId('auth-error')).toContainText(/session.*expired/i);

      // Should show sign in button
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    });

    test('should handle invalid credentials', async ({ page }) => {
      await page.route('**/api/v1/auth/login**', (route: Route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Invalid credentials',
          }),
        });
      });

      await page.goto('/signin');

      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.getByRole('button', { name: /sign in/i }).click();

      // Should show error
      await expect(page.getByTestId('auth-error')).toContainText(/invalid.*password/i);

      // Email should remain, password should be cleared
      await expect(page.locator('input[name="email"]')).toHaveValue('test@example.com');
      await expect(page.locator('input[name="password"]')).toHaveValue('');

      // Should show forgot password link
      await expect(page.getByRole('link', { name: /forgot password/i })).toBeVisible();
    });
  });

  // ============================================================================
  // 5. Form Submission Errors
  // ============================================================================

  test.describe('Form Submission Errors', () => {
    test('should prevent duplicate submissions', async ({ page }) => {
      let requestCount = 0;

      await page.route('**/api/v1/applications**', async (route: Route) => {
        requestCount++;
        // Delay response to allow multiple clicks
        await page.waitForTimeout(100);
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      await page.goto('/dashboard/jobs/job-1');

      const applyButton = page.getByRole('button', { name: /apply/i });

      // Click multiple times quickly
      await applyButton.click();
      await applyButton.click();
      await applyButton.click();

      // Wait for request to complete
      await page.waitForTimeout(500);

      // Only one request should have been made
      expect(requestCount).toBe(1);
    });

    test('should preserve form data on error', async ({ page }) => {
      await page.route('**/api/v1/cover-letters**', (route: Route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ success: false, error: 'Server error' }),
        });
      });

      await page.goto('/dashboard/cover-letters/new');

      // Fill form
      await page.fill('input[name="job_title"]', 'Senior Engineer');
      await page.fill('input[name="company"]', 'TechCorp');
      await page.fill('textarea[name="key_points"]', 'My key achievements...');

      // Submit
      await page.getByRole('button', { name: /generate/i }).click();

      // Wait for error
      await expect(page.getByTestId('error-message')).toBeVisible();

      // Form data should be preserved
      await expect(page.locator('input[name="job_title"]')).toHaveValue('Senior Engineer');
      await expect(page.locator('input[name="company"]')).toHaveValue('TechCorp');
      await expect(page.locator('textarea[name="key_points"]')).toHaveValue(
        'My key achievements...'
      );
    });

    test('should show loading state during submission', async ({ page }) => {
      await page.route('**/api/v1/applications**', async (route: Route) => {
        await page.waitForTimeout(1000); // Simulate slow response
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      await page.goto('/dashboard/jobs/job-1');

      const applyButton = page.getByRole('button', { name: /apply/i });
      await applyButton.click();

      // Button should be disabled and show loading
      await expect(applyButton).toBeDisabled();
      await expect(page.getByTestId('loading-spinner')).toBeVisible();
    });
  });

  // ============================================================================
  // 6. Resource Not Found (404)
  // ============================================================================

  test.describe('Resource Not Found', () => {
    test('should handle job not found', async ({ page }) => {
      await page.route('**/api/v1/jobs/nonexistent**', (route: Route) => {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Job not found',
          }),
        });
      });

      await page.goto('/dashboard/jobs/nonexistent');

      await expect(page.getByTestId('404-error')).toBeVisible();
      await expect(page.getByText(/job.*not found/i)).toBeVisible();

      // Should show suggestions
      await expect(page.getByRole('link', { name: /browse.*jobs/i })).toBeVisible();
      await expect(page.getByTestId('similar-jobs')).toBeVisible();
    });

    test('should handle resume not found', async ({ page }) => {
      await page.route('**/api/v1/resumes/deleted-resume**', (route: Route) => {
        route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Resume not found',
          }),
        });
      });

      await page.goto('/dashboard/resumes/deleted-resume');

      await expect(page.getByText(/resume.*not found/i)).toBeVisible();
      await expect(page.getByRole('link', { name: /create.*resume/i })).toBeVisible();
      await expect(page.getByRole('link', { name: /view.*resumes/i })).toBeVisible();
    });
  });

  // ============================================================================
  // 7. Permission Errors (403)
  // ============================================================================

  test.describe('Permission Errors', () => {
    test('should handle insufficient permissions', async ({ page }) => {
      await page.route('**/api/v1/auto-apply**', (route: Route) => {
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Upgrade required',
            required_plan: 'Pro',
          }),
        });
      });

      await page.goto('/dashboard/auto-apply');

      await expect(page.getByTestId('permission-error')).toBeVisible();
      await expect(page.getByText(/upgrade required/i)).toBeVisible();

      // Should show upgrade button
      await expect(page.getByRole('button', { name: /upgrade.*now/i })).toBeVisible();

      // Should show benefits
      await expect(page.getByTestId('upgrade-benefits')).toBeVisible();
    });
  });

  // ============================================================================
  // 8. Rate Limiting
  // ============================================================================

  test.describe('Rate Limiting', () => {
    test('should handle rate limit exceeded', async ({ page }) => {
      await page.route('**/api/v1/**', (route: Route) => {
        route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Too many requests',
            retry_after: 60,
          }),
        });
      });

      await page.goto('/dashboard/jobs');

      await expect(page.getByTestId('rate-limit-error')).toBeVisible();
      await expect(page.getByText(/too many requests/i)).toBeVisible();

      // Should show when to retry
      await expect(page.getByText(/try again in.*60/i)).toBeVisible();

      // Retry button should be disabled
      await expect(page.getByRole('button', { name: /retry/i })).toBeDisabled();
    });
  });

  // ============================================================================
  // 9. File Upload Errors
  // ============================================================================

  test.describe('File Upload Errors', () => {
    test('should handle file too large', async ({ page }) => {
      await page.goto('/dashboard/resumes/upload');

      // Mock file too large error
      await page.route('**/api/v1/resumes/upload**', (route: Route) => {
        route.fulfill({
          status: 413,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'File too large',
            max_size: '5MB',
          }),
        });
      });

      // Trigger file upload
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'resume.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.alloc(6 * 1024 * 1024), // 6MB
      });

      await page.getByRole('button', { name: /upload/i }).click();

      await expect(page.getByTestId('file-error')).toContainText(/too large/i);
      await expect(page.getByText(/maximum.*5MB/i)).toBeVisible();
    });

    test('should handle invalid file type', async ({ page }) => {
      await page.goto('/dashboard/resumes/upload');

      await page.route('**/api/v1/resumes/upload**', (route: Route) => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Invalid file type',
            accepted_types: ['PDF', 'DOCX'],
          }),
        });
      });

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'resume.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('resume content'),
      });

      await page.getByRole('button', { name: /upload/i }).click();

      await expect(page.getByTestId('file-error')).toContainText(/invalid.*type/i);
      await expect(page.getByText(/PDF.*DOCX/i)).toBeVisible();
    });
  });

  // ============================================================================
  // 10. Error Recovery Actions
  // ============================================================================

  test.describe('Error Recovery Actions', () => {
    test('@critical should provide actionable recovery suggestions', async ({ page }) => {
      await page.route('**/api/v1/jobs**', (route: Route) => {
        route.abort('failed');
      });

      await page.goto('/dashboard/jobs');

      // Should have recovery actions
      await expect(page.getByTestId('error-actions')).toBeVisible();

      const actions = page.getByTestId('error-action');
      await expect(actions).toHaveCountGreaterThan(0);

      // Actions should be clearly labeled
      const firstAction = actions.first();
      await expect(firstAction).toBeVisible();
      await expect(firstAction).toHaveText(/.+/); // Should have text
    });

    test('should provide contact support option', async ({ page }) => {
      await page.route('**/api/v1/jobs**', (route: Route) => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Unknown error',
            reference_id: 'ERR-789',
          }),
        });
      });

      await page.goto('/dashboard/jobs');

      // Should show support link
      await expect(page.getByRole('link', { name: /contact support/i })).toBeVisible();

      // Clicking should open support form
      await page.getByRole('link', { name: /contact support/i }).click();

      // Form should be pre-filled with error details
      await expect(page.locator('textarea[name="error_details"]')).toContainText('ERR-789');
    });
  });

  // ============================================================================
  // Acceptance Criteria
  // ============================================================================

  test.describe('Acceptance Criteria', () => {
    test('@acceptance all errors use friendly language', async ({ page }) => {
      const errorScenarios = [
        {
          route: '**/api/v1/jobs**',
          status: 500,
          expectedText: /something went wrong/i,
          noJargon: /(?!error code|stack trace|exception)/i,
        },
        {
          route: '**/api/v1/applications**',
          status: 400,
          expectedText: /check.*information/i,
          noJargon: /(?!validation failed|bad request)/i,
        },
      ];

      for (const scenario of errorScenarios) {
        await page.route(scenario.route, (route: Route) => {
          route.fulfill({
            status: scenario.status,
            contentType: 'application/json',
            body: JSON.stringify({ success: false, error: 'Error occurred' }),
          });
        });
      }

      await page.goto('/dashboard/jobs');

      const errorMessage = page.getByTestId('error-message');
      await expect(errorMessage).toMatch(errorScenarios[0].expectedText);
      await expect(errorMessage).not.toContainText('500');
      await expect(errorMessage).not.toContainText('Internal Server Error');
    });

    test('@acceptance retry mechanisms use exponential backoff', async ({ page }) => {
      const retryTimestamps: number[] = [];

      await page.route('**/api/v1/jobs**', (route: Route) => {
        retryTimestamps.push(Date.now());
        route.abort('failed');
      });

      await page.goto('/dashboard/jobs');

      // Retry 3 times
      for (let i = 0; i < 3; i++) {
        await page.getByRole('button', { name: /retry/i }).click();
        await page.waitForTimeout(100);
      }

      // Check that delays increase (exponential backoff)
      if (retryTimestamps.length >= 3) {
        const delay1 = retryTimestamps[1] - retryTimestamps[0];
        const delay2 = retryTimestamps[2] - retryTimestamps[1];
        expect(delay2).toBeGreaterThan(delay1);
      }
    });

    test('@acceptance offline state queues form submissions', async ({ page, context }) => {
      await page.goto('/dashboard/jobs/job-1');

      // Go offline
      await context.setOffline(true);

      // Try to submit application
      await page.getByRole('button', { name: /apply/i }).click();

      // Should see queued message
      await expect(page.getByText(/queued.*when online/i)).toBeVisible();

      // Come back online
      await context.setOffline(false);

      // Should see sync notification
      await expect(page.getByText(/syncing.*queued/i)).toBeVisible({ timeout: 5000 });
    });
  });
});
