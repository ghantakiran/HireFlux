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

    // Create employer auth state
    await page.evaluate(() => {
      const mockEmployer = {
        id: 'employer-user-123',
        email: 'employer@company.com',
        first_name: 'Employer',
        last_name: 'User',
        full_name: 'Employer User',
        user_type: 'employer',
        company_id: 'company-123',
        subscription_tier: 'professional',
        is_verified: true,
        onboarding_completed: true,
      };

      const mockAccessToken = 'mock-employer-access-token';
      const mockRefreshToken = 'mock-employer-refresh-token';

      localStorage.setItem('access_token', mockAccessToken);
      localStorage.setItem('refresh_token', mockRefreshToken);

      const authState = {
        state: {
          user: mockEmployer,
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

    // Save employer authentication state
    const employerAuthFile = path.join(__dirname, '.auth', 'employer.json');
    await context.storageState({ path: employerAuthFile });

    // Clear and create job seeker auth state
    await page.evaluate(() => {
      localStorage.clear();

      const mockJobSeeker = {
        id: 'jobseeker-user-123',
        email: 'jobseeker@test.com',
        first_name: 'Job',
        last_name: 'Seeker',
        full_name: 'Job Seeker',
        user_type: 'job_seeker',
        subscription_tier: 'plus',
        is_verified: true,
        onboarding_completed: true,
      };

      const mockAccessToken = 'mock-jobseeker-access-token';
      const mockRefreshToken = 'mock-jobseeker-refresh-token';

      localStorage.setItem('access_token', mockAccessToken);
      localStorage.setItem('refresh_token', mockRefreshToken);

      const authState = {
        state: {
          user: mockJobSeeker,
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

    // Save job seeker authentication state
    const jobseekerAuthFile = path.join(__dirname, '.auth', 'jobseeker.json');
    await context.storageState({ path: jobseekerAuthFile });

    console.log('✓ Mock authentication states created for E2E tests (employer + job seeker)');
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
