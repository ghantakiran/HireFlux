import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display landing page with sign up CTA', async ({ page }) => {
    // Verify landing page loads
    await expect(page).toHaveTitle(/HireFlux/i);

    // Check for key elements
    await expect(page.getByRole('heading', { name: /AI-Powered Job Application/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sign Up/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sign In/i })).toBeVisible();
  });

  test('should navigate to sign up page', async ({ page }) => {
    await page.getByRole('link', { name: /Sign Up/i }).click();

    // Verify we're on signup page
    await expect(page).toHaveURL(/.*signup/);
    await expect(page.getByRole('heading', { name: /Create.*Account/i })).toBeVisible();
  });

  test('should navigate to sign in page', async ({ page }) => {
    await page.getByRole('link', { name: /Sign In/i }).click();

    // Verify we're on signin page
    await expect(page).toHaveURL(/.*signin/);
    await expect(page.getByRole('heading', { name: /Sign In/i })).toBeVisible();
  });

  test('should show validation errors for empty sign up form', async ({ page }) => {
    await page.goto('/signup');

    // Try to submit empty form
    await page.getByRole('button', { name: /Sign Up/i }).click();

    // Should show validation errors
    await expect(page.getByText(/email.*required/i)).toBeVisible();
    await expect(page.getByText(/password.*required/i)).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.goto('/signup');

    await page.getByLabel(/email/i).fill('invalid-email');
    await page.getByLabel(/password/i).fill('ValidPassword123!');
    await page.getByRole('button', { name: /Sign Up/i }).click();

    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('should show error for weak password', async ({ page }) => {
    await page.goto('/signup');

    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('weak');
    await page.getByRole('button', { name: /Sign Up/i }).click();

    await expect(page.getByText(/password.*8 characters/i)).toBeVisible();
  });

  test('should allow OAuth sign in with Google', async ({ page }) => {
    await page.goto('/signin');

    const googleButton = page.getByRole('button', { name: /Continue with Google/i });
    await expect(googleButton).toBeVisible();
    await expect(googleButton).toBeEnabled();
  });

  test('should allow OAuth sign in with LinkedIn', async ({ page }) => {
    await page.goto('/signin');

    const linkedinButton = page.getByRole('button', { name: /Continue with LinkedIn/i });
    await expect(linkedinButton).toBeVisible();
    await expect(linkedinButton).toBeEnabled();
  });

  test('should have forgot password link', async ({ page }) => {
    await page.goto('/signin');

    await expect(page.getByRole('link', { name: /Forgot.*Password/i })).toBeVisible();
  });

  test('should toggle between sign in and sign up', async ({ page }) => {
    await page.goto('/signin');

    // Click link to sign up
    await page.getByRole('link', { name: /Don't have.*account.*Sign Up/i }).click();
    await expect(page).toHaveURL(/.*signup/);

    // Click link back to sign in
    await page.getByRole('link', { name: /Already have.*account.*Sign In/i }).click();
    await expect(page).toHaveURL(/.*signin/);
  });
});
