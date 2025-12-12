/**
 * E2E Tests: Feedback & Bug Reporting - Issue #139
 *
 * TDD/BDD Approach:
 * 1. RED: Write failing tests first
 * 2. GREEN: Implement features to pass tests
 * 3. REFACTOR: Optimize implementation
 *
 * @see tests/features/feedback-bug-reporting.feature
 */

import { test, expect, Page } from '@playwright/test';
import { setupAPIMocks } from './helpers/api-mock.helper';

test.describe('Feedback & Bug Reporting - Issue #139', () => {
  // Setup API mocks before each test
  test.beforeEach(async ({ page }) => {
    await setupAPIMocks(page);
  });

  // ============================================================================
  // 1. Feedback Widget Accessibility
  // ============================================================================

  test.describe('Feedback Widget Accessibility', () => {
    test('@critical should show feedback button on all pages', async ({ page }) => {
      // Navigate to different pages
      const pages = ['/dashboard', '/dashboard/jobs', '/dashboard/resumes'];

      for (const pagePath of pages) {
        await page.goto(pagePath);

        // Should show feedback button
        const feedbackButton = page.getByTestId('feedback-widget-trigger');
        await expect(feedbackButton).toBeVisible();
        await expect(feedbackButton).toHaveAttribute('aria-label', /feedback|report/i);

        // Should be accessible via keyboard
        await page.keyboard.press('Tab');
        // Eventually should reach feedback button
      }
    });

    test('should open feedback widget on click', async ({ page }) => {
      await page.goto('/dashboard');

      // Click feedback button
      await page.getByTestId('feedback-widget-trigger').click();

      // Widget should open
      await expect(page.getByTestId('feedback-widget')).toBeVisible();
      await expect(page.getByTestId('feedback-widget-close')).toBeVisible();

      // Should show feedback options
      await expect(page.getByText(/report.*bug/i)).toBeVisible();
      await expect(page.getByText(/request.*feature/i)).toBeVisible();
      await expect(page.getByText(/send.*feedback/i)).toBeVisible();
    });

    test('should close feedback widget', async ({ page }) => {
      await page.goto('/dashboard');

      // Open widget
      await page.getByTestId('feedback-widget-trigger').click();
      await expect(page.getByTestId('feedback-widget')).toBeVisible();

      // Close widget
      await page.getByTestId('feedback-widget-close').click();

      // Should close
      await expect(page.getByTestId('feedback-widget')).not.toBeVisible();

      // Focus should return to trigger
      await expect(page.getByTestId('feedback-widget-trigger')).toBeFocused();
    });

    test('should close widget with Escape key', async ({ page }) => {
      await page.goto('/dashboard');

      await page.getByTestId('feedback-widget-trigger').click();
      await expect(page.getByTestId('feedback-widget')).toBeVisible();

      await page.keyboard.press('Escape');

      await expect(page.getByTestId('feedback-widget')).not.toBeVisible();
    });
  });

  // ============================================================================
  // 2. Feedback Type Selection
  // ============================================================================

  test.describe('Feedback Type Selection', () => {
    test('should show bug report form', async ({ page }) => {
      await page.goto('/dashboard');
      await page.getByTestId('feedback-widget-trigger').click();

      // Select bug report
      await page.getByRole('button', { name: /report.*bug/i }).click();

      // Should show bug report form
      await expect(page.getByTestId('bug-report-form')).toBeVisible();
      await expect(page.getByLabel(/title/i)).toBeVisible();
      await expect(page.getByLabel(/description/i)).toBeVisible();
      await expect(page.getByLabel(/steps.*reproduce/i)).toBeVisible();
      await expect(page.getByLabel(/severity/i)).toBeVisible();

      // Should have screenshot option
      await expect(page.getByTestId('screenshot-preview')).toBeVisible();
    });

    test('should show feature request form', async ({ page }) => {
      await page.goto('/dashboard');
      await page.getByTestId('feedback-widget-trigger').click();

      await page.getByRole('button', { name: /request.*feature/i }).click();

      await expect(page.getByTestId('feature-request-form')).toBeVisible();
      await expect(page.getByLabel(/title/i)).toBeVisible();
      await expect(page.getByLabel(/description/i)).toBeVisible();
      await expect(page.getByLabel(/use.*case/i)).toBeVisible();
      await expect(page.getByLabel(/priority/i)).toBeVisible();
    });

    test('should show general feedback form', async ({ page }) => {
      await page.goto('/dashboard');
      await page.getByTestId('feedback-widget-trigger').click();

      await page.getByRole('button', { name: /send.*feedback/i }).click();

      await expect(page.getByTestId('general-feedback-form')).toBeVisible();
      await expect(page.getByTestId('rating-stars')).toBeVisible();
      await expect(page.getByLabel(/feedback/i)).toBeVisible();
      await expect(page.getByLabel(/category/i)).toBeVisible();
    });
  });

  // ============================================================================
  // 3. Screenshot Capture
  // ============================================================================

  test.describe('Screenshot Capture', () => {
    test('@critical should auto-capture screenshot for bug reports', async ({ page }) => {
      await page.goto('/dashboard');
      await page.getByTestId('feedback-widget-trigger').click();
      await page.getByRole('button', { name: /report.*bug/i }).click();

      // Screenshot should be auto-captured
      await expect(page.getByTestId('screenshot-preview')).toBeVisible();
      await expect(page.getByTestId('screenshot-image')).toBeVisible();
      await expect(page.getByTestId('screenshot-size')).toContainText(/KB|MB/);
    });

    test('should manually capture screenshot', async ({ page }) => {
      await page.goto('/dashboard');
      await page.getByTestId('feedback-widget-trigger').click();
      await page.getByRole('button', { name: /report.*bug/i }).click();

      // Remove auto screenshot
      await page.getByTestId('screenshot-remove').click();

      // Manually capture
      await page.getByTestId('screenshot-capture').click();

      // Should show new screenshot
      await expect(page.getByTestId('screenshot-image')).toBeVisible();
      await expect(page.getByText(/screenshot.*captured/i)).toBeVisible();
    });

    test('should remove screenshot', async ({ page }) => {
      await page.goto('/dashboard');
      await page.getByTestId('feedback-widget-trigger').click();
      await page.getByRole('button', { name: /report.*bug/i }).click();

      await expect(page.getByTestId('screenshot-image')).toBeVisible();

      await page.getByTestId('screenshot-remove').click();

      await expect(page.getByTestId('screenshot-image')).not.toBeVisible();
      await expect(page.getByTestId('screenshot-capture')).toBeVisible();
    });
  });

  // ============================================================================
  // 4. Bug Report Submission
  // ============================================================================

  test.describe('Bug Report Submission', () => {
    test('@critical should submit bug report successfully', async ({ page }) => {
      // Mock API endpoint
      await page.route('**/api/v1/feedback/bug-report**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            tracking_id: 'BUG-123456',
            message: 'Bug report submitted successfully',
          }),
        });
      });

      await page.goto('/dashboard');
      await page.getByTestId('feedback-widget-trigger').click();
      await page.getByRole('button', { name: /report.*bug/i }).click();

      // Fill form
      await page.getByLabel(/title/i).fill('Login button not working');
      await page.getByLabel(/description/i).fill('Cannot click the login button');
      await page.getByLabel(/steps.*reproduce/i).fill('1. Go to login\n2. Try to click button');
      await page.getByLabel(/expected/i).fill('Should redirect to dashboard');
      await page.getByLabel(/actual/i).fill('Nothing happens');
      await page.getByLabel(/severity/i).selectOption('high');

      // Submit
      await page.getByRole('button', { name: /submit/i }).click();

      // Should show success message
      await expect(page.getByText(/submitted successfully/i)).toBeVisible();
      await expect(page.getByText(/BUG-123456/)).toBeVisible();
      await expect(page.getByTestId('feedback-widget')).not.toBeVisible();
    });

    test('should pre-fill error context from error boundary', async ({ page }) => {
      await page.goto('/dashboard');

      // Simulate error with context
      await page.evaluate(() => {
        (window as any).__errorContext = {
          errorId: 'ERR-789012',
          message: 'Network timeout',
          url: '/dashboard/jobs',
          userAgent: navigator.userAgent,
        };
      });

      await page.getByTestId('feedback-widget-trigger').click();
      await page.getByRole('button', { name: /report.*error/i }).click();

      // Should pre-fill error details
      await expect(page.getByLabel(/error.*id/i)).toHaveValue('ERR-789012');
      await expect(page.getByLabel(/description/i)).toContainText('Network timeout');
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/dashboard');
      await page.getByTestId('feedback-widget-trigger').click();
      await page.getByRole('button', { name: /report.*bug/i }).click();

      // Try to submit empty form
      await page.getByRole('button', { name: /submit/i }).click();

      // Should show validation errors
      await expect(page.getByTestId('error-title')).toContainText(/required/i);
      await expect(page.getByTestId('error-description')).toContainText(/required/i);

      // Submit button should be disabled or show error
      const submitButton = page.getByRole('button', { name: /submit/i });
      const isDisabled = await submitButton.isDisabled();
      expect(isDisabled).toBe(true);
    });
  });

  // ============================================================================
  // 5. Feature Request Submission
  // ============================================================================

  test.describe('Feature Request Submission', () => {
    test('should submit feature request successfully', async ({ page }) => {
      await page.route('**/api/v1/feedback/feature-request**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            tracking_id: 'FEAT-456789',
            message: 'Feature request submitted',
          }),
        });
      });

      await page.goto('/dashboard');
      await page.getByTestId('feedback-widget-trigger').click();
      await page.getByRole('button', { name: /request.*feature/i }).click();

      await page.getByLabel(/title/i).fill('Dark mode support');
      await page.getByLabel(/description/i).fill('Add dark theme option');
      await page.getByLabel(/use.*case/i).fill('Working late at night');
      await page.getByLabel(/priority/i).selectOption('medium');

      await page.getByRole('button', { name: /submit/i }).click();

      await expect(page.getByText(/submitted.*successfully/i)).toBeVisible();
      await expect(page.getByText(/FEAT-456789/)).toBeVisible();
      await expect(page.getByText(/thank.*you/i)).toBeVisible();
    });

    test('should attach mockup images', async ({ page }) => {
      await page.goto('/dashboard');
      await page.getByTestId('feedback-widget-trigger').click();
      await page.getByRole('button', { name: /request.*feature/i }).click();

      // Upload mockup
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'mockup.png',
        mimeType: 'image/png',
        buffer: Buffer.from('fake image data'),
      });

      // Should show preview
      await expect(page.getByTestId('mockup-preview')).toBeVisible();

      // Should allow up to 3 images
      await expect(page.getByText(/0\/3.*images/i)).toBeVisible();
    });
  });

  // ============================================================================
  // 6. General Feedback Submission
  // ============================================================================

  test.describe('General Feedback Submission', () => {
    test('should submit positive feedback', async ({ page }) => {
      await page.route('**/api/v1/feedback/general**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Thank you for your feedback!',
          }),
        });
      });

      await page.goto('/dashboard');
      await page.getByTestId('feedback-widget-trigger').click();
      await page.getByRole('button', { name: /send.*feedback/i }).click();

      // Select 5 stars
      await page.getByTestId('rating-star-5').click();

      await page.getByLabel(/feedback/i).fill('Great app! Love the UI');
      await page.getByLabel(/category/i).selectOption('user-experience');

      await page.getByRole('button', { name: /send/i }).click();

      await expect(page.getByText(/thank.*you/i)).toBeVisible();
    });

    test('should submit negative feedback with follow-up', async ({ page }) => {
      await page.route('**/api/v1/feedback/general**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'We appreciate your feedback',
            follow_up_offered: true,
          }),
        });
      });

      await page.goto('/dashboard');
      await page.getByTestId('feedback-widget-trigger').click();
      await page.getByRole('button', { name: /send.*feedback/i }).click();

      // Select 2 stars
      await page.getByTestId('rating-star-2').click();

      await page.getByLabel(/feedback/i).fill('App is slow, needs optimization');
      await page.getByLabel(/category/i).selectOption('performance');

      await page.getByRole('button', { name: /send/i }).click();

      await expect(page.getByText(/appreciate.*feedback/i)).toBeVisible();
      await expect(page.getByText(/follow.*up/i)).toBeVisible();
    });
  });

  // ============================================================================
  // 7. Feedback Tracking
  // ============================================================================

  test.describe('Feedback Tracking', () => {
    test('should view submitted feedback history', async ({ page }) => {
      await page.route('**/api/v1/feedback/my-feedback**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              feedback: [
                {
                  id: 'BUG-123',
                  type: 'bug_report',
                  title: 'Login issue',
                  status: 'in_progress',
                  created_at: '2025-12-10T10:00:00Z',
                },
                {
                  id: 'FEAT-456',
                  type: 'feature_request',
                  title: 'Dark mode',
                  status: 'under_review',
                  created_at: '2025-12-11T14:30:00Z',
                },
              ],
            },
          }),
        });
      });

      await page.goto('/dashboard/feedback');

      // Should show feedback list
      await expect(page.getByTestId('feedback-item-BUG-123')).toBeVisible();
      await expect(page.getByTestId('feedback-item-FEAT-456')).toBeVisible();

      // Should show status
      await expect(page.getByText(/in.*progress/i)).toBeVisible();
      await expect(page.getByText(/under.*review/i)).toBeVisible();

      // Should have filters
      await expect(page.getByLabel(/filter.*type/i)).toBeVisible();
      await expect(page.getByPlaceholder(/search/i)).toBeVisible();
    });

    test('should track bug report status updates', async ({ page }) => {
      await page.route('**/api/v1/feedback/BUG-789**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'BUG-789',
              title: 'Payment error',
              status: 'resolved',
              status_history: [
                { status: 'submitted', date: '2025-12-10T10:00:00Z' },
                { status: 'in_progress', date: '2025-12-10T15:00:00Z' },
                { status: 'resolved', date: '2025-12-11T09:00:00Z' },
              ],
              team_response: 'Fixed in version 1.2.3',
            },
          }),
        });
      });

      await page.goto('/dashboard/feedback');
      await page.getByPlaceholder(/search/i).fill('BUG-789');
      await page.keyboard.press('Enter');

      // Should show bug details
      await expect(page.getByText(/BUG-789/)).toBeVisible();
      await expect(page.getByText(/resolved/i)).toBeVisible();

      // Should show status history
      await expect(page.getByTestId('status-history')).toBeVisible();
      await expect(page.getByText(/submitted/i)).toBeVisible();
      await expect(page.getByText(/in.*progress/i)).toBeVisible();

      // Should show team response
      await expect(page.getByText(/fixed.*1\.2\.3/i)).toBeVisible();
    });
  });

  // ============================================================================
  // 8. Keyboard Accessibility
  // ============================================================================

  test.describe('Keyboard Accessibility', () => {
    test('@accessibility should open widget with keyboard shortcut', async ({ page }) => {
      await page.goto('/dashboard');

      // Press Ctrl+Shift+F (or Cmd+Shift+F on Mac)
      await page.keyboard.press('Control+Shift+F');

      await expect(page.getByTestId('feedback-widget')).toBeVisible();
    });

    test('@accessibility should navigate form with keyboard', async ({ page }) => {
      await page.goto('/dashboard');
      await page.keyboard.press('Control+Shift+F');
      await page.getByRole('button', { name: /report.*bug/i }).click();

      // Tab through form fields
      await page.keyboard.press('Tab'); // Should focus title
      await expect(page.getByLabel(/title/i)).toBeFocused();

      await page.keyboard.press('Tab'); // Should focus description
      await expect(page.getByLabel(/description/i)).toBeFocused();
    });
  });

  // ============================================================================
  // 9. Mobile Responsiveness
  // ============================================================================

  test.describe('Mobile Responsiveness', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should show mobile-optimized feedback button', async ({ page }) => {
      await page.goto('/dashboard');

      const feedbackButton = page.getByTestId('feedback-widget-trigger');
      await expect(feedbackButton).toBeVisible();

      // Should be positioned for thumb access (bottom right)
      const box = await feedbackButton.boundingBox();
      expect(box?.y).toBeGreaterThan(500); // Near bottom
    });

    test('should show full-screen widget on mobile', async ({ page }) => {
      await page.goto('/dashboard');
      await page.getByTestId('feedback-widget-trigger').click();

      const widget = page.getByTestId('feedback-widget');
      const box = await widget.boundingBox();

      // Should be full-screen
      expect(box?.width).toBeCloseTo(375, 50);
      expect(box?.height).toBeCloseTo(667, 100);
    });
  });

  // ============================================================================
  // Acceptance Criteria
  // ============================================================================

  test.describe('Acceptance Criteria', () => {
    test('@acceptance widget is accessible everywhere', async ({ page }) => {
      const testPages = [
        '/dashboard',
        '/dashboard/jobs',
        '/dashboard/resumes',
        '/dashboard/applications',
      ];

      for (const pagePath of testPages) {
        await page.goto(pagePath);
        await expect(page.getByTestId('feedback-widget-trigger')).toBeVisible();
      }
    });

    test('@acceptance screenshots are captured correctly', async ({ page }) => {
      await page.goto('/dashboard');
      await page.getByTestId('feedback-widget-trigger').click();
      await page.getByRole('button', { name: /report.*bug/i }).click();

      // Should have screenshot
      const screenshot = page.getByTestId('screenshot-image');
      await expect(screenshot).toBeVisible();

      // Should have reasonable size
      const sizeText = await page.getByTestId('screenshot-size').textContent();
      expect(sizeText).toMatch(/KB|MB/);

      // Size should be less than 2MB
      const sizeMatch = sizeText?.match(/([\d.]+)\s*(KB|MB)/);
      if (sizeMatch) {
        const size = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2];
        if (unit === 'MB') {
          expect(size).toBeLessThan(2);
        }
      }
    });

    test('@acceptance reports are submitted successfully', async ({ page }) => {
      let reportSubmitted = false;

      await page.route('**/api/v1/feedback/**', (route) => {
        reportSubmitted = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            tracking_id: 'TEST-999',
          }),
        });
      });

      await page.goto('/dashboard');
      await page.getByTestId('feedback-widget-trigger').click();
      await page.getByRole('button', { name: /report.*bug/i }).click();

      await page.getByLabel(/title/i).fill('Test bug');
      await page.getByLabel(/description/i).fill('Test description');
      await page.getByRole('button', { name: /submit/i }).click();

      // Wait for submission
      await page.waitForTimeout(500);

      expect(reportSubmitted).toBe(true);
      await expect(page.getByText(/TEST-999/)).toBeVisible();
    });

    test('@acceptance tracking is visible', async ({ page }) => {
      await page.route('**/api/v1/feedback/my-feedback**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              feedback: [
                { id: 'BUG-1', title: 'Test 1', status: 'open', created_at: '2025-12-10' },
                { id: 'FEAT-2', title: 'Test 2', status: 'closed', created_at: '2025-12-11' },
              ],
            },
          }),
        });
      });

      await page.goto('/dashboard/feedback');

      await expect(page.getByTestId('feedback-item-BUG-1')).toBeVisible();
      await expect(page.getByTestId('feedback-item-FEAT-2')).toBeVisible();
    });
  });
});
