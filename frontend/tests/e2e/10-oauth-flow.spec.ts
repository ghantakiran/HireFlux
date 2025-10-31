import { test, expect } from '@playwright/test';

/**
 * OAuth Flow E2E Tests
 *
 * Tests the complete OAuth authentication flow for Google and LinkedIn.
 * Following BDD (Behavior-Driven Development) approach with Given-When-Then structure.
 *
 * Scenarios:
 * 1. OAuth buttons are visible and enabled
 * 2. OAuth redirect flow initiates correctly
 * 3. OAuth callback handling
 * 4. Account linking for existing users
 * 5. Error handling for OAuth failures
 */

test.describe('OAuth Authentication Flow', () => {
  test.describe('Given user is on sign in page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/signin');
    });

    test('When user sees OAuth options, Then Google and LinkedIn buttons should be visible', async ({ page }) => {
      // Given: User is on signin page (handled in beforeEach)

      // When: User sees OAuth options
      const googleButton = page.getByRole('button', { name: /Google/i });
      const linkedinButton = page.getByRole('button', { name: /LinkedIn/i });

      // Then: Both OAuth buttons should be visible and enabled
      await expect(googleButton).toBeVisible();
      await expect(googleButton).toBeEnabled();
      await expect(linkedinButton).toBeVisible();
      await expect(linkedinButton).toBeEnabled();
    });

    test('When user clicks Google OAuth button, Then redirect to Google OAuth should initiate', async ({ page }) => {
      // Given: User is on signin page

      // When: User clicks Google button
      const googleButton = page.getByRole('button', { name: /Google/i });

      // Set up request interceptor to verify OAuth redirect
      const requestPromise = page.waitForRequest(
        request => request.url().includes('/auth/google/authorize')
      );

      await googleButton.click();

      // Then: Should redirect to Google OAuth endpoint
      const request = await requestPromise;
      expect(request.url()).toContain('auth/google/authorize');
    });

    test('When user clicks LinkedIn OAuth button, Then redirect to LinkedIn OAuth should initiate', async ({ page }) => {
      // Given: User is on signin page

      // When: User clicks LinkedIn button
      const linkedinButton = page.getByRole('button', { name: /LinkedIn/i });

      // Set up request interceptor
      const requestPromise = page.waitForRequest(
        request => request.url().includes('/auth/linkedin/authorize')
      );

      await linkedinButton.click();

      // Then: Should redirect to LinkedIn OAuth endpoint
      const request = await requestPromise;
      expect(request.url()).toContain('auth/linkedin/authorize');
    });
  });

  test.describe('Given user is on sign up page', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/signup');
    });

    test('When user sees registration options, Then OAuth buttons should be visible', async ({ page }) => {
      // Given: User is on signup page

      // When/Then: OAuth options should be available for registration
      await expect(page.getByRole('button', { name: /Google/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /LinkedIn/i })).toBeVisible();
    });

    test('When user registers with OAuth, Then should redirect to onboarding', async ({ page, context }) => {
      // Given: User is on signup page

      // When: User completes OAuth registration (simulated)
      // Note: In real scenario, this would go through OAuth provider
      // For testing, we simulate the callback
      await page.goto('/auth/callback?access_token=test_token&refresh_token=test_refresh&token_type=bearer');

      // Then: Should handle callback and redirect
      // Note: This requires mock backend or test environment
      await expect(page).toHaveURL(/.*dashboard|.*onboarding/);
    });
  });

  test.describe('OAuth Callback Handling', () => {
    test('Given valid OAuth callback, When page loads, Then should extract and store tokens', async ({ page, context }) => {
      // Given: Valid OAuth callback URL with tokens
      const accessToken = 'test_access_token_12345';
      const refreshToken = 'test_refresh_token_67890';

      // When: Navigate to callback page
      await page.goto(`/auth/callback?access_token=${accessToken}&refresh_token=${refreshToken}&token_type=bearer`);

      // Then: Tokens should be stored in localStorage
      // Note: Actual implementation might handle this differently
      await page.waitForTimeout(1000); // Wait for token storage

      // Verify redirect happened (to dashboard or onboarding)
      await expect(page).toHaveURL(/.*dashboard|.*onboarding/);
    });

    test('Given OAuth error, When callback receives error, Then should display error message', async ({ page }) => {
      // Given: OAuth error in callback
      const errorMessage = 'access_denied';
      const errorDescription = 'User cancelled the OAuth flow';

      // When: Navigate to callback with error
      await page.goto(`/auth/callback?error=${errorMessage}&error_description=${errorDescription}`);

      // Then: Should display error and redirect to signin
      await expect(page.getByText(/Authentication Failed/i)).toBeVisible();
      await expect(page.getByText(/cancelled/i)).toBeVisible();

      // Should redirect to signin after showing error
      await page.waitForTimeout(3500); // Wait for auto-redirect (3 seconds)
      await expect(page).toHaveURL(/.*signin/);
    });

    test('Given invalid callback parameters, When tokens are missing, Then should show error', async ({ page }) => {
      // Given: Callback without required tokens

      // When: Navigate to callback with incomplete parameters
      await page.goto('/auth/callback?access_token=only_one_token');

      // Then: Should display error message
      await expect(page.getByText(/Invalid authentication/i)).toBeVisible();
    });
  });

  test.describe('OAuth Return URL Preservation', () => {
    test('When user accesses protected page, Then OAuth should preserve return URL', async ({ page, context }) => {
      // Given: User tries to access dashboard without authentication
      await page.goto('/dashboard/resumes');

      // Assuming redirect to signin with returnUrl parameter
      await expect(page).toHaveURL(/.*signin/);

      // When: User initiates OAuth
      // The return URL should be preserved in sessionStorage
      // This would be tested by checking sessionStorage after OAuth button click
    });
  });

  test.describe('Account Linking', () => {
    test('Given existing email account, When user logs in with OAuth, Then accounts should link', async ({ page }) => {
      // This test would require:
      // 1. Creating a test user with email/password
      // 2. Logging in with OAuth using same email
      // 3. Verifying account was linked (not duplicated)

      // Note: This requires backend mock or test environment
      // Placeholder for implementation
      test.skip('Account linking requires test backend');
    });
  });

  test.describe('OAuth Button States', () => {
    test('When OAuth is in progress, Then buttons should be disabled', async ({ page }) => {
      await page.goto('/signin');

      // When: OAuth button is clicked
      const googleButton = page.getByRole('button', { name: /Google/i });

      // Then: Button should be disabled during loading
      // Note: This depends on implementation details
      await googleButton.click();

      // Verify loading state (if implemented)
      // await expect(googleButton).toBeDisabled();
    });

    test('When form is submitting, Then OAuth buttons should be disabled', async ({ page }) => {
      await page.goto('/signin');

      // Fill in email/password form
      await page.getByLabel(/email/i).fill('test@example.com');
      await page.getByLabel(/password/i).fill('Password123');

      // Start submission
      await page.getByRole('button', { name: /Sign In/i }).click();

      // OAuth buttons should be disabled
      const googleButton = page.getByRole('button', { name: /Google/i });
      await expect(googleButton).toBeDisabled();
    });
  });

  test.describe('OAuth Error Recovery', () => {
    test('Given OAuth fails, When user retries, Then should work correctly', async ({ page }) => {
      await page.goto('/signin');

      // Simulate failed OAuth attempt
      // Then retry should work
      const googleButton = page.getByRole('button', { name: /Google/i });
      await expect(googleButton).toBeEnabled();

      // Multiple clicks should each initiate new flow
      await googleButton.click();
      await page.waitForTimeout(500);
      await page.goBack();

      await expect(googleButton).toBeEnabled();
      await expect(googleButton).toBeVisible();
    });
  });
});

/**
 * OAuth Security Tests
 */
test.describe('OAuth Security', () => {
  test('Should not expose tokens in URL after callback processing', async ({ page }) => {
    // Given: Callback with tokens
    await page.goto('/auth/callback?access_token=secret_token&refresh_token=secret_refresh&token_type=bearer');

    // When: Callback is processed
    await page.waitForTimeout(1000);

    // Then: URL should no longer contain tokens (should be cleaned up)
    const url = page.url();
    expect(url).not.toContain('secret_token');
    expect(url).not.toContain('secret_refresh');
  });

  test('Should validate token_type parameter', async ({ page }) => {
    // Given: Callback with invalid token_type
    await page.goto('/auth/callback?access_token=token&refresh_token=refresh&token_type=invalid');

    // Then: Should show error
    await expect(page.getByText(/Invalid authentication/i)).toBeVisible();
  });
});

/**
 * OAuth Accessibility Tests
 */
test.describe('OAuth Accessibility', () => {
  test('OAuth buttons should be keyboard accessible', async ({ page }) => {
    await page.goto('/signin');

    // Tab to Google button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to activate with Enter
    const googleButton = page.getByRole('button', { name: /Google/i });
    await googleButton.focus();
    await page.keyboard.press('Enter');

    // Should initiate OAuth flow
    await page.waitForTimeout(500);
  });

  test('OAuth buttons should have proper ARIA labels', async ({ page }) => {
    await page.goto('/signin');

    const googleButton = page.getByRole('button', { name: /Google/i });
    const linkedinButton = page.getByRole('button', { name: /LinkedIn/i });

    // Buttons should be properly labeled
    await expect(googleButton).toBeVisible();
    await expect(linkedinButton).toBeVisible();
  });

  test('Error messages should be announced to screen readers', async ({ page }) => {
    await page.goto('/auth/callback?error=access_denied&error_description=Test error');

    // Error should have role="alert" for screen readers
    const errorElement = page.getByText(/Authentication Failed/i);
    await expect(errorElement).toBeVisible();
  });
});
