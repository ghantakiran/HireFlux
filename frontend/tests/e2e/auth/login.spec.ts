import { test, expect } from '@playwright/test';

test.describe('HireFlux Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display landing page with sign up CTA', async ({ page }) => {
    // Test landing page elements
    await expect(page.locator('h1')).toContainText('AI-Powered Job Application Copilot');
    await expect(page.locator('[data-testid="sign-up-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="login-button"]')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.click('[data-testid="login-button"]');
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1')).toContainText('Sign In');
  });

  test('should navigate to sign up page', async ({ page }) => {
    await page.click('[data-testid="sign-up-button"]');
    await expect(page).toHaveURL('/signup');
    await expect(page.locator('h1')).toContainText('Create Account');
  });

  test('should show validation errors for empty login form', async ({ page }) => {
    await page.goto('/login');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required');
  });

  test('should show validation errors for invalid email', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Please enter a valid email');
  });

  test('should handle login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'wrongpassword');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page.locator('[data-testid="login-error"]')).toContainText('Invalid credentials');
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
  });

  test('should show OAuth login options', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.locator('[data-testid="google-login"]')).toBeVisible();
    await expect(page.locator('[data-testid="linkedin-login"]')).toBeVisible();
    await expect(page.locator('[data-testid="github-login"]')).toBeVisible();
  });

  test('should handle OAuth login flow', async ({ page }) => {
    await page.goto('/login');
    
    // Mock OAuth response
    await page.route('**/auth/google/callback*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock_token',
          user: {
            id: '123',
            email: 'test@example.com',
            name: 'Test User'
          }
        })
      });
    });
    
    await page.click('[data-testid="google-login"]');
    
    // Should redirect to dashboard after OAuth
    await expect(page).toHaveURL('/dashboard');
  });

  test('should show sign up form validation', async ({ page }) => {
    await page.goto('/signup');
    
    await page.click('[data-testid="signup-submit"]');
    
    await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required');
  });

  test('should validate password strength', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', '123');
    await page.click('[data-testid="signup-submit"]');
    
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 8 characters');
  });

  test('should successfully create account', async ({ page }) => {
    await page.goto('/signup');
    
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.check('[data-testid="terms-checkbox"]');
    await page.click('[data-testid="signup-submit"]');
    
    // Should redirect to onboarding
    await expect(page).toHaveURL('/onboarding');
  });

  test('should handle logout', async ({ page }) => {
    // First login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Then logout
    await page.click('[data-testid="user-menu"]');
    await page.click('[data-testid="logout-button"]');
    
    await expect(page).toHaveURL('/');
    await expect(page.locator('[data-testid="sign-up-button"]')).toBeVisible();
  });

  test('should persist login state on page refresh', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-submit"]');
    
    await expect(page).toHaveURL('/dashboard');
    
    // Refresh page
    await page.reload();
    
    // Should still be logged in
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="dashboard-header"]')).toBeVisible();
  });

  test('should redirect to dashboard when accessing protected routes', async ({ page }) => {
    // Try to access dashboard without login
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL('/login');
  });

  test('should show loading states during authentication', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    
    // Start login and check loading state
    const loginPromise = page.click('[data-testid="login-submit"]');
    await expect(page.locator('[data-testid="login-loading"]')).toBeVisible();
    
    await loginPromise;
    await expect(page).toHaveURL('/dashboard');
  });
});
