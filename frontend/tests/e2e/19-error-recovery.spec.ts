import { test, expect, Page } from '@playwright/test';

/**
 * E2E Tests for Issue #138: Error States & Recovery Flows
 *
 * Test Coverage:
 * - Friendly error messages
 * - Recovery suggestions
 * - Retry mechanisms
 * - Error logging (Sentry)
 * - Offline detection
 * - Error boundaries
 * - Validation errors
 * - API error handling
 * - Toast notifications
 * - Mobile optimization
 * - Accessibility
 * - Performance
 *
 * Following TDD/BDD: This is the RED phase - tests written first
 */

// ============================================================================
// HELPERS AND UTILITIES
// ============================================================================

/**
 * Simulate network error by intercepting API call
 */
async function simulateNetworkError(page: Page, endpoint: string) {
  await page.route(`**/${endpoint}**`, (route) => {
    route.abort('failed');
  });
}

/**
 * Simulate API error response
 */
async function simulateAPIError(
  page: Page,
  endpoint: string,
  status: number,
  body?: any
) {
  await page.route(`**/${endpoint}**`, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body || { error: 'API Error' }),
    });
  });
}

/**
 * Simulate offline state
 */
async function goOffline(page: Page) {
  await page.context().setOffline(true);
}

/**
 * Simulate coming back online
 */
async function goOnline(page: Page) {
  await page.context().setOffline(false);
}

/**
 * Wait for error UI to appear
 */
async function waitForErrorUI(page: Page) {
  await expect(page.locator('[data-testid="error-message"]')).toBeVisible({
    timeout: 5000,
  });
}

/**
 * Check if Sentry event was captured (mock)
 */
async function checkSentryEvent(page: Page, expectedError: string) {
  // In real implementation, check Sentry SDK capture was called
  const sentryEvents = await page.evaluate(() => {
    return (window as any).__SENTRY_EVENTS__ || [];
  });
  expect(sentryEvents.some((e: any) => e.message.includes(expectedError))).toBe(true);
}

// ============================================================================
// FRIENDLY ERROR MESSAGES
// ============================================================================

test.describe('Friendly Error Messages', () => {
  test('should display friendly error message for network failure', async ({ page }) => {
    await page.goto('/dashboard');
    await simulateNetworkError(page, 'api/dashboard');

    // Trigger a data fetch that will fail
    await page.click('[data-testid="refresh-button"]');

    // Wait for error UI
    await waitForErrorUI(page);

    // Check friendly message (not technical jargon)
    const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
    expect(errorMessage).toContain('connection');
    expect(errorMessage).not.toContain('ERR_');
    expect(errorMessage).not.toContain('500');
    expect(errorMessage).not.toContain('stack trace');
  });

  test('should display context-specific error messages', async ({ page }) => {
    await page.goto('/dashboard/resume-builder');
    await simulateNetworkError(page, 'api/resumes/generate');

    await page.click('[data-testid="generate-resume-button"]');
    await waitForErrorUI(page);

    const errorMessage = await page.locator('[data-testid="error-message"]').textContent();
    expect(errorMessage).toContain('resume');
  });

  test('should show appropriate error icons', async ({ page }) => {
    await page.goto('/dashboard');

    // Network error → wifi icon
    await simulateNetworkError(page, 'api/dashboard');
    await page.click('[data-testid="refresh-button"]');
    await expect(page.locator('[data-testid="error-icon-network"]')).toBeVisible();

    // Server error → server icon
    await simulateAPIError(page, 'api/dashboard', 500);
    await page.click('[data-testid="refresh-button"]');
    await expect(page.locator('[data-testid="error-icon-server"]')).toBeVisible();
  });
});

// ============================================================================
// RECOVERY SUGGESTIONS
// ============================================================================

test.describe('Recovery Suggestions', () => {
  test('should provide actionable recovery suggestions for network errors', async ({ page }) => {
    await page.goto('/dashboard');
    await simulateNetworkError(page, 'api/dashboard');
    await page.click('[data-testid="refresh-button"]');
    await waitForErrorUI(page);

    // Check for recovery suggestions
    await expect(page.locator('[data-testid="error-suggestion"]')).toContainText([
      'Check your internet connection',
      'Try again',
    ]);
  });

  test('should provide recovery suggestions for authentication errors', async ({ page }) => {
    await page.goto('/dashboard');
    await simulateAPIError(page, 'api/dashboard', 401);
    await page.click('[data-testid="refresh-button"]');

    await expect(page.locator('[data-testid="error-message"]')).toContainText('session has expired');
    await expect(page.locator('[data-testid="signin-button"]')).toBeVisible();
  });

  test('should provide recovery suggestions for permission errors', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await simulateAPIError(page, 'api/admin', 403, {
      error: 'Forbidden',
      message: 'You do not have permission to access this resource',
    });

    await waitForErrorUI(page);
    await expect(page.locator('[data-testid="error-suggestion"]')).toContainText([
      'Contact your team admin',
      'Upgrade your plan',
    ]);
  });
});

// ============================================================================
// RETRY MECHANISMS
// ============================================================================

test.describe('Retry Mechanisms', () => {
  test('should show retry button on transient errors', async ({ page }) => {
    await page.goto('/dashboard');
    await simulateNetworkError(page, 'api/dashboard');
    await page.click('[data-testid="refresh-button"]');
    await waitForErrorUI(page);

    const retryButton = page.locator('[data-testid="retry-button"]');
    await expect(retryButton).toBeVisible();
    await expect(retryButton).toContainText('Try Again');
  });

  test('should retry with exponential backoff', async ({ page }) => {
    await page.goto('/dashboard');

    let attemptCount = 0;
    await page.route('**/api/dashboard**', (route) => {
      attemptCount++;
      if (attemptCount < 3) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    await page.click('[data-testid="refresh-button"]');
    await waitForErrorUI(page);

    // Click retry
    await page.click('[data-testid="retry-button"]');

    // Should show retry attempt count
    await expect(page.locator('[data-testid="retry-count"]')).toContainText('Retry attempt');
  });

  test('should show loading state during retry', async ({ page }) => {
    await page.goto('/dashboard');
    await simulateNetworkError(page, 'api/dashboard');
    await page.click('[data-testid="refresh-button"]');
    await waitForErrorUI(page);

    // Click retry
    const retryButton = page.locator('[data-testid="retry-button"]');
    await retryButton.click();

    // Should show loading state
    await expect(retryButton).toBeDisabled();
    await expect(page.locator('[data-testid="retry-spinner"]')).toBeVisible();
    await expect(retryButton).toContainText('Retrying');
  });

  test('should preserve user data on retry', async ({ page }) => {
    await page.goto('/dashboard/resume-builder');

    // Fill form
    await page.fill('[data-testid="resume-title-input"]', 'My Resume');
    await page.fill('[data-testid="resume-content"]', 'My content here');

    // Simulate submission failure
    await simulateNetworkError(page, 'api/resumes');
    await page.click('[data-testid="save-resume-button"]');
    await waitForErrorUI(page);

    // Retry
    await page.click('[data-testid="retry-button"]');

    // Form data should still be there
    await expect(page.locator('[data-testid="resume-title-input"]')).toHaveValue('My Resume');
    await expect(page.locator('[data-testid="resume-content"]')).toHaveValue('My content here');
  });

  test('should batch retry for multiple failed items', async ({ page }) => {
    await page.goto('/dashboard/bulk-upload');

    // Simulate 2 of 5 uploads failing
    let uploadCount = 0;
    await page.route('**/api/resumes/upload**', (route) => {
      uploadCount++;
      if (uploadCount === 2 || uploadCount === 4) {
        route.abort('failed');
      } else {
        route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      }
    });

    // Upload 5 files (mock)
    await page.setInputFiles('[data-testid="file-upload"]', [
      'test1.pdf',
      'test2.pdf',
      'test3.pdf',
      'test4.pdf',
      'test5.pdf',
    ]);

    // Should show error summary
    await expect(page.locator('[data-testid="upload-error-summary"]')).toContainText('2 of 5 uploads failed');

    // Should have batch retry button
    await expect(page.locator('[data-testid="retry-failed-button"]')).toBeVisible();
  });
});

// ============================================================================
// OFFLINE DETECTION
// ============================================================================

test.describe('Offline Detection', () => {
  test('should detect when user goes offline', async ({ page }) => {
    await page.goto('/dashboard');

    // Go offline
    await goOffline(page);

    // Should show offline banner within 2 seconds
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible({ timeout: 2000 });
    await expect(page.locator('[data-testid="offline-banner"]')).toContainText("You're offline");
  });

  test('should detect when user comes back online', async ({ page }) => {
    await page.goto('/dashboard');

    // Go offline then online
    await goOffline(page);
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();

    await goOnline(page);

    // Offline banner should disappear
    await expect(page.locator('[data-testid="offline-banner"]')).toBeHidden({ timeout: 2000 });

    // Success message should appear
    await expect(page.locator('[data-testid="online-success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="online-success-message"]')).toContainText("You're back online");

    // Auto-dismiss after 3 seconds
    await expect(page.locator('[data-testid="online-success-message"]')).toBeHidden({ timeout: 4000 });
  });

  test('should disable actions that require internet when offline', async ({ page }) => {
    await page.goto('/dashboard');
    await goOffline(page);

    // Actions requiring internet should be disabled
    await expect(page.locator('[data-testid="refresh-button"]')).toBeDisabled();
    await expect(page.locator('[data-testid="apply-job-button"]')).toBeDisabled();

    // Should have tooltip explaining why
    await page.hover('[data-testid="refresh-button"]');
    await expect(page.locator('[data-testid="tooltip"]')).toContainText('Requires internet connection');
  });

  test('should show offline-capable features when offline', async ({ page }) => {
    await page.goto('/dashboard');
    await goOffline(page);

    // Should still be able to view cached data
    await expect(page.locator('[data-testid="cached-resumes"]')).toBeVisible();

    // Should be able to draft offline
    await page.click('[data-testid="new-resume-button"]');
    await expect(page.locator('[data-testid="resume-editor"]')).toBeVisible();
  });

  test('should queue actions when offline', async ({ page }) => {
    await page.goto('/dashboard/jobs');
    await goOffline(page);

    // Try to apply for a job
    await page.click('[data-testid="apply-button"]');

    // Should be queued
    await expect(page.locator('[data-testid="queued-message"]')).toContainText(
      'Application queued - will submit when online'
    );

    // Come back online
    await goOnline(page);

    // Queue should auto-process
    await expect(page.locator('[data-testid="application-submitted"]')).toBeVisible({ timeout: 5000 });
  });

  test('should show offline status in UI', async ({ page }) => {
    await page.goto('/dashboard');
    await goOffline(page);

    // Should have offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

    // Hover should show tooltip
    await page.hover('[data-testid="offline-indicator"]');
    await expect(page.locator('[data-testid="tooltip"]')).toContainText('Offline');
  });
});

// ============================================================================
// ERROR BOUNDARIES
// ============================================================================

test.describe('Error Boundaries', () => {
  test('should catch React errors with error boundary', async ({ page }) => {
    await page.goto('/dashboard');

    // Inject error into a component
    await page.evaluate(() => {
      (window as any).__TRIGGER_COMPONENT_ERROR__ = true;
    });

    // Reload to trigger error
    await page.reload();

    // Should show error boundary fallback, not blank screen
    await expect(page.locator('[data-testid="error-boundary-fallback"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-boundary-fallback"]')).not.toHaveText('');
  });

  test('should show component-specific error boundaries', async ({ page }) => {
    await page.goto('/dashboard');

    // Trigger error in stats component only
    await page.evaluate(() => {
      (window as any).__TRIGGER_STATS_ERROR__ = true;
    });

    await page.reload();

    // Only stats component should show error
    await expect(page.locator('[data-testid="stats-error-boundary"]')).toBeVisible();

    // Other components should render normally
    await expect(page.locator('[data-testid="recent-applications"]')).toBeVisible();
  });

  test('should have retry functionality in error boundary', async ({ page }) => {
    await page.goto('/dashboard');

    await page.evaluate(() => {
      (window as any).__TRIGGER_COMPONENT_ERROR__ = true;
    });
    await page.reload();

    // Should have reload button
    await expect(page.locator('[data-testid="reload-component-button"]')).toBeVisible();

    // Clear error and retry
    await page.evaluate(() => {
      (window as any).__TRIGGER_COMPONENT_ERROR__ = false;
    });
    await page.click('[data-testid="reload-component-button"]');

    // Component should render normally
    await expect(page.locator('[data-testid="error-boundary-fallback"]')).toBeHidden();
  });
});

// ============================================================================
// VALIDATION ERROR HANDLING
// ============================================================================

test.describe('Validation Errors', () => {
  test('should display inline validation errors', async ({ page }) => {
    await page.goto('/dashboard/profile');

    // Enter invalid email
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.click('[data-testid="name-input"]'); // Blur email field

    // Should show inline error
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="email-error"]')).toContainText('valid email');

    // Field should be highlighted
    await expect(page.locator('[data-testid="email-input"]')).toHaveClass(/error|invalid/);
  });

  test('should show form-level validation summary', async ({ page }) => {
    await page.goto('/dashboard/profile');

    // Fill form with multiple errors
    await page.fill('[data-testid="email-input"]', 'invalid');
    await page.fill('[data-testid="phone-input"]', '123'); // Too short
    await page.fill('[data-testid="name-input"]', ''); // Required

    await page.click('[data-testid="save-button"]');

    // Should show error summary
    await expect(page.locator('[data-testid="validation-summary"]')).toBeVisible();

    const summaryItems = page.locator('[data-testid="validation-summary-item"]');
    await expect(summaryItems).toHaveCount(3);
  });

  test('should clear validation errors on fix', async ({ page }) => {
    await page.goto('/dashboard/profile');

    await page.fill('[data-testid="email-input"]', 'invalid');
    await page.click('[data-testid="name-input"]'); // Blur
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible();

    // Fix the error
    await page.fill('[data-testid="email-input"]', 'valid@example.com');
    await page.click('[data-testid="name-input"]'); // Blur

    // Error should disappear
    await expect(page.locator('[data-testid="email-error"]')).toBeHidden();
  });
});

// ============================================================================
// API ERROR HANDLING
// ============================================================================

test.describe('API Error Handling', () => {
  test('should handle 400 Bad Request errors', async ({ page }) => {
    await page.goto('/dashboard/profile');

    await simulateAPIError(page, 'api/profile', 400, {
      errors: {
        email: ['Email is invalid'],
        phone: ['Phone number is too short'],
      },
    });

    await page.click('[data-testid="save-button"]');

    // Should show validation errors from API
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is invalid');
    await expect(page.locator('[data-testid="phone-error"]')).toContainText('too short');
  });

  test('should handle 401 Unauthorized errors', async ({ page }) => {
    await page.goto('/dashboard');

    await simulateAPIError(page, 'api/dashboard', 401);
    await page.click('[data-testid="refresh-button"]');

    // Should redirect to login
    await page.waitForURL('**/login**', { timeout: 5000 });
  });

  test('should handle 403 Forbidden errors', async ({ page }) => {
    await page.goto('/dashboard/admin');

    await simulateAPIError(page, 'api/admin', 403);
    await waitForErrorUI(page);

    await expect(page.locator('[data-testid="error-message"]')).toContainText("don't have permission");
  });

  test('should handle 404 Not Found errors', async ({ page }) => {
    await page.goto('/dashboard/resume/999999');

    await simulateAPIError(page, 'api/resumes/999999', 404);

    await expect(page.locator('[data-testid="error-message"]')).toContainText("couldn't find");
    await expect(page.locator('[data-testid="return-dashboard-button"]')).toBeVisible();
  });

  test('should handle 429 Rate Limit errors', async ({ page }) => {
    await page.goto('/dashboard');

    await simulateAPIError(page, 'api/dashboard', 429, {
      error: 'Too Many Requests',
      retryAfter: 60,
    });

    await page.click('[data-testid="refresh-button"]');
    await waitForErrorUI(page);

    await expect(page.locator('[data-testid="error-message"]')).toContainText('too quickly');
    await expect(page.locator('[data-testid="rate-limit-countdown"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeDisabled();
  });

  test('should handle 500 Internal Server errors', async ({ page }) => {
    await page.goto('/dashboard');

    await simulateAPIError(page, 'api/dashboard', 500);
    await page.click('[data-testid="refresh-button"]');
    await waitForErrorUI(page);

    await expect(page.locator('[data-testid="error-message"]')).toContainText('Something went wrong on our end');
    await expect(page.locator('[data-testid="reference-number"]')).toBeVisible();
  });

  test('should handle 503 Service Unavailable errors', async ({ page }) => {
    await page.goto('/dashboard');

    await simulateAPIError(page, 'api/dashboard', 503, {
      error: 'Service Unavailable',
      estimatedRestoreTime: '2024-01-01T12:00:00Z',
    });

    await page.click('[data-testid="refresh-button"]');
    await waitForErrorUI(page);

    await expect(page.locator('[data-testid="error-message"]')).toContainText('maintenance');
    await expect(page.locator('[data-testid="estimated-restore-time"]')).toBeVisible();
  });
});

// ============================================================================
// TOAST NOTIFICATIONS
// ============================================================================

test.describe('Toast Notifications', () => {
  test('should show error toast for failed actions', async ({ page }) => {
    await page.goto('/dashboard');

    await simulateNetworkError(page, 'api/resumes/delete');
    await page.click('[data-testid="delete-resume-button"]');

    // Should show error toast
    await expect(page.locator('[data-testid="toast-error"]')).toBeVisible({ timeout: 2000 });

    // Should auto-dismiss after 5 seconds
    await expect(page.locator('[data-testid="toast-error"]')).toBeHidden({ timeout: 6000 });
  });

  test('should show success toast after recovery', async ({ page }) => {
    await page.goto('/dashboard');

    // First attempt fails
    await simulateNetworkError(page, 'api/dashboard');
    await page.click('[data-testid="refresh-button"]');
    await waitForErrorUI(page);

    // Remove network error simulation
    await page.unroute('**/api/dashboard**');

    // Retry succeeds
    await page.click('[data-testid="retry-button"]');

    // Should show success toast
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Success');
  });

  test('should allow dismissing error toasts', async ({ page }) => {
    await page.goto('/dashboard');

    await simulateNetworkError(page, 'api/dashboard');
    await page.click('[data-testid="refresh-button"]');

    await expect(page.locator('[data-testid="toast-error"]')).toBeVisible();

    // Click close button
    await page.click('[data-testid="toast-close-button"]');

    // Toast should disappear immediately
    await expect(page.locator('[data-testid="toast-error"]')).toBeHidden();
  });

  test('should stack multiple error toasts', async ({ page }) => {
    await page.goto('/dashboard');

    // Trigger multiple errors in quick succession
    await simulateNetworkError(page, 'api/resumes');
    await simulateNetworkError(page, 'api/jobs');
    await simulateNetworkError(page, 'api/applications');

    await page.click('[data-testid="action-1"]');
    await page.click('[data-testid="action-2"]');
    await page.click('[data-testid="action-3"]');

    // Should have multiple toasts stacked
    const toasts = page.locator('[data-testid="toast-error"]');
    await expect(toasts).toHaveCount(3);
  });
});

// ============================================================================
// MOBILE ERROR HANDLING
// ============================================================================

test.describe('Mobile Error Handling', () => {
  test('should show mobile-optimized error states', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    await simulateNetworkError(page, 'api/dashboard');
    await page.click('[data-testid="refresh-button"]');
    await waitForErrorUI(page);

    // Error should be full-width
    const errorContainer = page.locator('[data-testid="error-container"]');
    const boundingBox = await errorContainer.boundingBox();
    expect(boundingBox?.width).toBeGreaterThan(300); // Most of mobile width

    // Buttons should be touch-friendly
    const retryButton = page.locator('[data-testid="retry-button"]');
    const buttonBox = await retryButton.boundingBox();
    expect(buttonBox?.height).toBeGreaterThanOrEqual(44); // iOS HIG minimum
  });

  test('should show offline banner on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    await goOffline(page);

    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();

    // Should be dismissible by swipe (simulate with click for now)
    await page.click('[data-testid="offline-banner-dismiss"]');
    await expect(page.locator('[data-testid="offline-banner"]')).toBeHidden();
  });
});

// ============================================================================
// ACCESSIBILITY
// ============================================================================

test.describe('Accessibility', () => {
  test('should announce errors to screen readers', async ({ page }) => {
    await page.goto('/dashboard');

    await simulateNetworkError(page, 'api/dashboard');
    await page.click('[data-testid="refresh-button"]');
    await waitForErrorUI(page);

    // Should have ARIA live region
    const liveRegion = page.locator('[aria-live="assertive"]');
    await expect(liveRegion).toBeVisible();
    await expect(liveRegion).not.toBeEmpty();
  });

  test('should support focus management for errors', async ({ page }) => {
    await page.goto('/dashboard/profile');

    // Submit form with errors
    await page.fill('[data-testid="email-input"]', 'invalid');
    await page.click('[data-testid="save-button"]');

    // Focus should move to error summary
    await expect(page.locator('[data-testid="validation-summary"]')).toBeFocused();
  });

  test('should support keyboard navigation for error actions', async ({ page }) => {
    await page.goto('/dashboard');

    await simulateNetworkError(page, 'api/dashboard');
    await page.click('[data-testid="refresh-button"]');
    await waitForErrorUI(page);

    // Tab to retry button
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="retry-button"]')).toBeFocused();

    // Activate with Enter
    await page.keyboard.press('Enter');

    // Escape should dismiss
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="error-container"]')).toBeHidden();
  });
});

// ============================================================================
// PERFORMANCE
// ============================================================================

test.describe('Performance', () => {
  test('should render error states quickly', async ({ page }) => {
    await page.goto('/dashboard');

    await simulateNetworkError(page, 'api/dashboard');

    const startTime = Date.now();
    await page.click('[data-testid="refresh-button"]');
    await waitForErrorUI(page);
    const endTime = Date.now();

    const renderTime = endTime - startTime;
    expect(renderTime).toBeLessThan(500); // Should render in < 500ms
  });

  test('should not block UI during error logging', async ({ page }) => {
    await page.goto('/dashboard');

    // Simulate slow error logging
    await page.route('**/sentry.io/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // 2s delay
      route.continue();
    });

    await simulateNetworkError(page, 'api/dashboard');
    await page.click('[data-testid="refresh-button"]');

    // Error UI should appear immediately despite slow logging
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible({ timeout: 1000 });
  });
});

// ============================================================================
// EDGE CASES
// ============================================================================

test.describe('Edge Cases', () => {
  test('should handle errors during error handling', async ({ page }) => {
    await page.goto('/dashboard');

    // Simulate error logging failure
    await page.route('**/sentry.io/**', (route) => {
      route.abort('failed');
    });

    await simulateNetworkError(page, 'api/dashboard');
    await page.click('[data-testid="refresh-button"]');

    // Error UI should still show even if logging fails
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
  });

  test('should handle rapid repeated errors', async ({ page }) => {
    await page.goto('/dashboard');

    await simulateNetworkError(page, 'api/dashboard');

    // Click refresh multiple times rapidly
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="refresh-button"]');
      await page.waitForTimeout(100);
    }

    // Should show single error with count
    await expect(page.locator('[data-testid="error-count"]')).toContainText('5');
  });

  test('should clear errors on navigation', async ({ page }) => {
    await page.goto('/dashboard');

    await simulateNetworkError(page, 'api/dashboard');
    await page.click('[data-testid="refresh-button"]');
    await waitForErrorUI(page);

    // Navigate away
    await page.goto('/dashboard/resumes');

    // Error should be cleared
    await expect(page.locator('[data-testid="error-message"]')).toBeHidden();
  });

  test('should persist critical errors across navigation', async ({ page }) => {
    await page.goto('/dashboard/billing');

    // Simulate payment failure (critical error)
    await simulateAPIError(page, 'api/payment', 402, {
      error: 'Payment Failed',
      critical: true,
    });

    await page.click('[data-testid="submit-payment-button"]');
    await waitForErrorUI(page);

    // Navigate away
    await page.goto('/dashboard');

    // Critical error should persist in notification center
    await expect(page.locator('[data-testid="notification-critical-error"]')).toBeVisible();
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

test.describe('Error Recovery Integration', () => {
  test('should handle complete error recovery flow', async ({ page }) => {
    await page.goto('/dashboard');

    // 1. Go offline
    await goOffline(page);
    await expect(page.locator('[data-testid="offline-banner"]')).toBeVisible();

    // 2. Try action (should queue)
    await page.click('[data-testid="refresh-button"]');
    await expect(page.locator('[data-testid="queued-message"]')).toBeVisible();

    // 3. Come back online
    await goOnline(page);
    await expect(page.locator('[data-testid="online-success-message"]')).toBeVisible();

    // 4. Queued action should auto-execute
    await expect(page.locator('[data-testid="dashboard-data"]')).toBeVisible({ timeout: 5000 });
  });

  test('should handle multiple simultaneous errors gracefully', async ({ page }) => {
    await page.goto('/dashboard');

    // Simulate multiple API failures
    await simulateAPIError(page, 'api/resumes', 500);
    await simulateAPIError(page, 'api/jobs', 503);
    await simulateAPIError(page, 'api/applications', 429);

    // Trigger all at once
    await Promise.all([
      page.click('[data-testid="load-resumes"]'),
      page.click('[data-testid="load-jobs"]'),
      page.click('[data-testid="load-applications"]'),
    ]);

    // Should handle gracefully without crashing
    await expect(page.locator('[data-testid="toast-error"]')).toHaveCount(3);
  });
});
