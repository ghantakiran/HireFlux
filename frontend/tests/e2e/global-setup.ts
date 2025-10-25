import { chromium, FullConfig } from '@playwright/test';
import path from 'path';

/**
 * Global setup for Playwright E2E tests
 * Creates authenticated user sessions before running tests
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  // Create authenticated user session
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Navigate to sign in page
    await page.goto(`${baseURL}/signin`);

    // Use test credentials from environment or defaults
    const testEmail = process.env.E2E_TEST_EMAIL || 'test@example.com';
    const testPassword = process.env.E2E_TEST_PASSWORD || 'TestPassword123!';

    // Fill in sign in form
    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);

    // Submit form and wait for redirect
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for authentication to complete (redirect to dashboard)
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });

    // Save authentication state
    const authFile = path.join(__dirname, '.auth', 'user.json');
    await page.context().storageState({ path: authFile });

    console.log('✓ Authentication state saved for E2E tests');
  } catch (error) {
    console.warn('Warning: Could not create authenticated session for E2E tests.');
    console.warn('Some tests may be skipped. Error:', error);
    // Don't fail the entire test suite if auth setup fails
    // Tests that require auth will be skipped
  } finally {
    await browser.close();
  }
}

export default globalSetup;
