/**
 * BDD Test Spec: Error States & Recovery Flows (Issue #138)
 *
 * Feature: Error States & Recovery Flows
 *   As a user
 *   I want to see friendly error messages with recovery options
 *   So that I can understand what went wrong and how to fix it
 *
 * Acceptance Criteria:
 *   - Errors are friendly and informative
 *   - Recovery suggestions are helpful
 *   - Retry mechanisms work correctly
 *   - Offline detection is accurate
 *   - Error logging works (Sentry integration)
 */

import { test, expect } from '@playwright/test';

test.describe('Error States & Recovery Flows', () => {
  test.describe('Network Error Handling', () => {
    test('should display friendly error message when API fails', async ({ page, context }) => {
      // Given: User is on the dashboard
      await page.goto('/dashboard');

      // When: API request fails
      await context.route('**/api/**', route => {
        route.abort('failed');
      });

      // Trigger an API call
      await page.reload();

      // Then: Friendly error message is displayed
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
      await expect(errorMessage).toContainText(/something went wrong|error occurred/i);

      // And: Error is user-friendly (not technical jargon)
      const text = await errorMessage.textContent();
      expect(text).not.toMatch(/500|404|undefined|null|NaN/);
    });

    test('should show retry button on network failure', async ({ page, context }) => {
      // Given: Network request failed
      let requestCount = 0;
      await context.route('**/api/jobs**', route => {
        requestCount++;
        if (requestCount === 1) {
          route.abort('failed');
        } else {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ jobs: [] }),
          });
        }
      });

      await page.goto('/jobs');

      // When: Error is displayed
      const retryButton = page.locator('[data-testid="retry-button"]');
      await expect(retryButton).toBeVisible({ timeout: 10000 });

      // Then: Retry button works
      await retryButton.click();

      // And: Content loads successfully
      await expect(retryButton).not.toBeVisible({ timeout: 5000 });
      expect(requestCount).toBe(2);
    });

    test('should show helpful recovery suggestions', async ({ page, context }) => {
      // Given: API fails with specific error
      await context.route('**/api/**', route => {
        route.fulfill({
          status: 503,
          body: JSON.stringify({ error: 'Service Unavailable' }),
        });
      });

      await page.goto('/dashboard');

      // Then: Recovery suggestions are shown
      const suggestions = page.locator('[data-testid="recovery-suggestions"]');
      await expect(suggestions).toBeVisible({ timeout: 10000 });

      // And: Suggestions are actionable
      await expect(suggestions).toContainText(/try again|refresh|check/i);
    });
  });

  test.describe('Offline Detection', () => {
    test('should detect when user goes offline', async ({ page, context }) => {
      // Given: User is online
      await page.goto('/dashboard');

      // When: User goes offline
      await context.setOffline(true);

      // Then: Offline indicator is shown
      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      await expect(offlineIndicator).toBeVisible({ timeout: 5000 });
      await expect(offlineIndicator).toContainText(/offline|no connection/i);
    });

    test('should detect when user comes back online', async ({ page, context }) => {
      // Given: User is offline
      await context.setOffline(true);
      await page.goto('/dashboard');

      const offlineIndicator = page.locator('[data-testid="offline-indicator"]');
      await expect(offlineIndicator).toBeVisible({ timeout: 5000 });

      // When: User comes back online
      await context.setOffline(false);

      // Then: Offline indicator disappears
      await expect(offlineIndicator).not.toBeVisible({ timeout: 5000 });

      // And: Success message is shown
      const onlineMessage = page.locator('[data-testid="online-message"]');
      await expect(onlineMessage).toBeVisible({ timeout: 3000 });
    });

    test('should queue actions when offline and execute when back online', async ({ page, context }) => {
      // Given: User is online and has unsaved changes
      await page.goto('/resume/edit');
      await page.fill('[data-testid="resume-title"]', 'My Updated Resume');

      // When: User goes offline and tries to save
      await context.setOffline(true);
      await page.click('[data-testid="save-button"]');

      // Then: Action is queued
      const queuedMessage = page.locator('[data-testid="action-queued"]');
      await expect(queuedMessage).toBeVisible({ timeout: 3000 });

      // When: User comes back online
      await context.setOffline(false);

      // Then: Queued action executes
      const successMessage = page.locator('[data-testid="save-success"]');
      await expect(successMessage).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Error Boundary', () => {
    test('should catch React errors and show fallback UI', async ({ page }) => {
      // This test requires a component that throws an error
      // We'll create a test route that intentionally throws
      await page.goto('/test/error-boundary');

      // Then: Error boundary fallback is shown
      const errorBoundary = page.locator('[data-testid="error-boundary-fallback"]');
      await expect(errorBoundary).toBeVisible({ timeout: 5000 });

      // And: User can reset the error boundary
      const resetButton = page.locator('[data-testid="error-boundary-reset"]');
      await expect(resetButton).toBeVisible();
    });

    test('should show different error messages for different error types', async ({ page, context }) => {
      // Scenario 1: Authentication error
      await context.route('**/api/auth/**', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      });

      await page.goto('/dashboard');

      const authError = page.locator('[data-testid="error-message"]');
      await expect(authError).toContainText(/sign in|log in|authenticate/i);

      // Scenario 2: Permission error
      await context.route('**/api/**', route => {
        route.fulfill({
          status: 403,
          body: JSON.stringify({ error: 'Forbidden' }),
        });
      });

      await page.reload();

      await expect(authError).toContainText(/permission|access|forbidden/i);
    });
  });

  test.describe('Form Validation Errors', () => {
    test('should show inline validation errors', async ({ page }) => {
      await page.goto('/resume/create');

      // When: User submits invalid form
      await page.click('[data-testid="submit-button"]');

      // Then: Inline errors are shown
      const emailError = page.locator('[data-testid="email-error"]');
      await expect(emailError).toBeVisible({ timeout: 3000 });
      await expect(emailError).toContainText(/required|invalid/i);
    });

    test('should clear errors when user corrects input', async ({ page }) => {
      await page.goto('/resume/create');

      // Given: Form has validation errors
      await page.click('[data-testid="submit-button"]');
      const error = page.locator('[data-testid="email-error"]');
      await expect(error).toBeVisible();

      // When: User corrects the input
      await page.fill('[data-testid="email-input"]', 'valid@email.com');

      // Then: Error disappears
      await expect(error).not.toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Error Recovery Actions', () => {
    test('should allow user to go back to previous page', async ({ page, context }) => {
      // Given: User encounters an error
      await page.goto('/dashboard');

      await context.route('**/api/**', route => {
        route.abort('failed');
      });

      await page.click('[data-testid="jobs-link"]');

      // When: Error is shown
      const errorPage = page.locator('[data-testid="error-message"]');
      await expect(errorPage).toBeVisible({ timeout: 10000 });

      // Then: Back button is available
      const backButton = page.locator('[data-testid="back-button"]');
      await expect(backButton).toBeVisible();

      // When: User clicks back
      await backButton.click();

      // Then: User is taken to previous page
      await expect(page).toHaveURL(/dashboard/);
    });

    test('should allow user to refresh the page', async ({ page, context }) => {
      // Given: User encounters an error
      let requestCount = 0;
      await context.route('**/api/jobs**', route => {
        requestCount++;
        if (requestCount === 1) {
          route.abort('failed');
        } else {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ jobs: [] }),
          });
        }
      });

      await page.goto('/jobs');

      // When: Refresh button is clicked
      const refreshButton = page.locator('[data-testid="refresh-button"]');
      await expect(refreshButton).toBeVisible({ timeout: 10000 });
      await refreshButton.click();

      // Then: Page reloads successfully
      await expect(refreshButton).not.toBeVisible({ timeout: 5000 });
    });

    test('should provide contact support option for persistent errors', async ({ page, context }) => {
      // Given: Multiple retry attempts fail
      await context.route('**/api/**', route => {
        route.abort('failed');
      });

      await page.goto('/dashboard');

      // When: Multiple retries fail
      for (let i = 0; i < 3; i++) {
        const retryButton = page.locator('[data-testid="retry-button"]');
        if (await retryButton.isVisible()) {
          await retryButton.click();
          await page.waitForTimeout(1000);
        }
      }

      // Then: Support contact option appears
      const supportLink = page.locator('[data-testid="contact-support"]');
      await expect(supportLink).toBeVisible({ timeout: 5000 });
      await expect(supportLink).toHaveAttribute('href', /support|help|contact/);
    });
  });

  test.describe('Loading States', () => {
    test('should show loading indicators during async operations', async ({ page, context }) => {
      // Given: Slow API response
      await context.route('**/api/jobs**', route => {
        setTimeout(() => {
          route.fulfill({
            status: 200,
            body: JSON.stringify({ jobs: [] }),
          });
        }, 2000);
      });

      await page.goto('/jobs');

      // Then: Loading indicator is shown
      const loadingIndicator = page.locator('[data-testid="loading-indicator"]');
      await expect(loadingIndicator).toBeVisible({ timeout: 1000 });

      // And: Loading indicator disappears after data loads
      await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 });
    });

    test('should timeout and show error for long-running requests', async ({ page, context }) => {
      // Given: API hangs
      await context.route('**/api/**', route => {
        // Don't fulfill or abort - simulate hanging request
      });

      await page.goto('/dashboard');

      // Then: Timeout error is shown
      const timeoutError = page.locator('[data-testid="error-message"]');
      await expect(timeoutError).toBeVisible({ timeout: 35000 }); // 30s timeout + 5s buffer
      await expect(timeoutError).toContainText(/timeout|taking too long|slow/i);
    });
  });

  test.describe('Accessibility', () => {
    test('should announce errors to screen readers', async ({ page }) => {
      await page.goto('/dashboard');

      // Trigger an error
      await page.evaluate(() => {
        throw new Error('Test error');
      });

      // Then: Error has appropriate ARIA attributes
      const errorMessage = page.locator('[data-testid="error-message"]');
      await expect(errorMessage).toHaveAttribute('role', 'alert');
      await expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
    });

    test('should allow keyboard navigation of error recovery options', async ({ page }) => {
      await page.goto('/test/error');

      // Focus on retry button
      await page.keyboard.press('Tab');
      const retryButton = page.locator('[data-testid="retry-button"]');
      await expect(retryButton).toBeFocused();

      // Navigate to back button
      await page.keyboard.press('Tab');
      const backButton = page.locator('[data-testid="back-button"]');
      await expect(backButton).toBeFocused();
    });
  });
});
