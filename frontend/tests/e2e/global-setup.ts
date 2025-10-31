import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

/**
 * Global setup for Playwright E2E tests
 * Creates mock authenticated user sessions for testing
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  // Create mock authenticated user session
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to any page to establish context
    await page.goto(baseURL);

    // Mock authentication state in localStorage
    // This simulates a logged-in user without requiring backend
    await page.evaluate(() => {
      // Mock user data
      const mockUser = {
        id: 'test-user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        full_name: 'Test User',
        subscription_tier: 'free',
        is_verified: true,
        onboarding_completed: true,
      };

      // Mock tokens
      const mockAccessToken = 'mock-access-token-for-e2e-tests';
      const mockRefreshToken = 'mock-refresh-token-for-e2e-tests';

      // Set localStorage items that Zustand auth store expects
      localStorage.setItem('access_token', mockAccessToken);
      localStorage.setItem('refresh_token', mockRefreshToken);

      // Set Zustand persist storage
      const authState = {
        state: {
          user: mockUser,
          accessToken: mockAccessToken,
          refreshToken: mockRefreshToken,
          isAuthenticated: true,
          isLoading: false,
          isInitialized: true,
          error: null,
        },
        version: 0,
      };

      localStorage.setItem('auth-storage', JSON.stringify(authState));
    });

    // Save authentication state including localStorage
    const authFile = path.join(__dirname, '.auth', 'user.json');
    await context.storageState({ path: authFile });

    console.log('✓ Mock authentication state created for E2E tests');
  } catch (error) {
    console.warn('Warning: Could not create mock authenticated session for E2E tests.');
    console.warn('Some tests may be skipped. Error:', error);
    // Don't fail the entire test suite if auth setup fails
    // Tests that require auth will use inline mocks
  } finally {
    await browser.close();
  }
}

export default globalSetup;
