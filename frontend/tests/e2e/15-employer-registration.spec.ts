import { test, expect } from '@playwright/test';

test.describe('Employer Registration Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/employer/register');
  });

  test('should display employer registration page with all required elements', async ({ page }) => {
    // Verify page loads
    await expect(page).toHaveTitle(/HireFlux/i);

    // Check heading and description
    await expect(page.getByRole('heading', { name: /Register Your Company/i })).toBeVisible();
    await expect(page.getByText(/Join HireFlux to find top talent/i)).toBeVisible();

    // Check form fields
    await expect(page.getByLabel(/Company Name/i)).toBeVisible();
    await expect(page.getByLabel(/Founder Email/i)).toBeVisible();
    await expect(page.getByLabel(/^Password/i)).toBeVisible();
    await expect(page.getByLabel(/Confirm Password/i)).toBeVisible();
    await expect(page.getByLabel(/Industry/i)).toBeVisible();
    await expect(page.getByLabel(/Company Size/i)).toBeVisible();
    await expect(page.getByLabel(/Location/i)).toBeVisible();
    await expect(page.getByLabel(/Website/i)).toBeVisible();

    // Check trial plan info
    await expect(page.getByText(/Free 14-Day Trial/i)).toBeVisible();
    await expect(page.getByText(/Post 1 active job/i)).toBeVisible();
    await expect(page.getByText(/View up to 10 candidates per month/i)).toBeVisible();
    await expect(page.getByText(/No credit card required/i)).toBeVisible();

    // Check submit button
    await expect(page.getByRole('button', { name: /Start Free Trial/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Start Free Trial/i })).toBeEnabled();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    // Try to submit empty form
    await page.getByRole('button', { name: /Start Free Trial/i }).click();

    // Should show validation errors for required fields
    await expect(page.getByText(/Company name must be at least 2 characters/i)).toBeVisible();
    await expect(page.getByText(/Email is required/i)).toBeVisible();
    await expect(page.getByText(/Password must be at least 8 characters/i)).toBeVisible();
    await expect(page.getByText(/Please confirm your password/i)).toBeVisible();
  });

  test('should show error for invalid email format', async ({ page }) => {
    await page.getByLabel(/Company Name/i).fill('Acme Inc');
    await page.getByLabel(/Founder Email/i).fill('invalid-email');
    await page.getByLabel(/^Password/i).fill('ValidPass123');
    await page.getByLabel(/Confirm Password/i).fill('ValidPass123');

    // Trigger validation by clicking submit or blurring
    await page.getByLabel(/Founder Email/i).blur();
    await page.getByRole('button', { name: /Start Free Trial/i }).click();

    await expect(page.getByText(/Please enter a valid email address/i)).toBeVisible();
  });

  test('should show error for weak password - too short', async ({ page }) => {
    await page.getByLabel(/Company Name/i).fill('Acme Inc');
    await page.getByLabel(/Founder Email/i).fill('founder@acme.com');
    await page.getByLabel(/^Password/i).fill('weak');
    await page.getByLabel(/Confirm Password/i).fill('weak');

    await page.getByLabel(/^Password/i).blur();
    await page.getByRole('button', { name: /Start Free Trial/i }).click();

    await expect(page.getByText(/Password must be at least 8 characters/i)).toBeVisible();
  });

  test('should show error for password without uppercase letter', async ({ page }) => {
    await page.getByLabel(/Company Name/i).fill('Acme Inc');
    await page.getByLabel(/Founder Email/i).fill('founder@acme.com');
    await page.getByLabel(/^Password/i).fill('weakpass123');
    await page.getByLabel(/Confirm Password/i).fill('weakpass123');

    await page.getByLabel(/^Password/i).blur();
    await page.getByRole('button', { name: /Start Free Trial/i }).click();

    await expect(page.getByText(/Password must contain at least one uppercase letter/i)).toBeVisible();
  });

  test('should show error for password without lowercase letter', async ({ page }) => {
    await page.getByLabel(/Company Name/i).fill('Acme Inc');
    await page.getByLabel(/Founder Email/i).fill('founder@acme.com');
    await page.getByLabel(/^Password/i).fill('WEAKPASS123');
    await page.getByLabel(/Confirm Password/i).fill('WEAKPASS123');

    await page.getByLabel(/^Password/i).blur();
    await page.getByRole('button', { name: /Start Free Trial/i }).click();

    await expect(page.getByText(/Password must contain at least one lowercase letter/i)).toBeVisible();
  });

  test('should show error for password without digit', async ({ page }) => {
    await page.getByLabel(/Company Name/i).fill('Acme Inc');
    await page.getByLabel(/Founder Email/i).fill('founder@acme.com');
    await page.getByLabel(/^Password/i).fill('WeakPassword');
    await page.getByLabel(/Confirm Password/i).fill('WeakPassword');

    await page.getByLabel(/^Password/i).blur();
    await page.getByRole('button', { name: /Start Free Trial/i }).click();

    await expect(page.getByText(/Password must contain at least one digit/i)).toBeVisible();
  });

  test('should show error for password mismatch', async ({ page }) => {
    await page.getByLabel(/Company Name/i).fill('Acme Inc');
    await page.getByLabel(/Founder Email/i).fill('founder@acme.com');
    await page.getByLabel(/^Password/i).fill('ValidPass123');
    await page.getByLabel(/Confirm Password/i).fill('DifferentPass123');

    await page.getByLabel(/Confirm Password/i).blur();
    await page.getByRole('button', { name: /Start Free Trial/i }).click();

    await expect(page.getByText(/Passwords don't match/i)).toBeVisible();
  });

  test('should allow selecting industry from dropdown', async ({ page }) => {
    // Click industry dropdown
    await page.getByLabel(/Industry/i).click();

    // Verify industry options are visible
    await expect(page.getByRole('option', { name: 'Technology' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Finance' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Healthcare' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Education' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'Marketing' })).toBeVisible();

    // Select an industry
    await page.getByRole('option', { name: 'Technology' }).click();

    // Verify selection
    await expect(page.getByLabel(/Industry/i)).toContainText('Technology');
  });

  test('should allow selecting company size from dropdown', async ({ page }) => {
    // Click company size dropdown
    await page.getByLabel(/Company Size/i).click();

    // Verify size options are visible
    await expect(page.getByRole('option', { name: /1-10 employees/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /11-50 employees/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /51-200 employees/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /201-500 employees/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /501\+ employees/i })).toBeVisible();

    // Select a size
    await page.getByRole('option', { name: /11-50 employees/i }).click();

    // Verify selection
    await expect(page.getByLabel(/Company Size/i)).toContainText('11-50 employees');
  });

  test('should show company name with minimum 2 characters validation', async ({ page }) => {
    await page.getByLabel(/Company Name/i).fill('A');
    await page.getByLabel(/Company Name/i).blur();

    await expect(page.getByText(/Company name must be at least 2 characters/i)).toBeVisible();

    // Fix by adding more characters
    await page.getByLabel(/Company Name/i).fill('Acme');
    await page.getByLabel(/Company Name/i).blur();

    // Error should disappear
    await expect(page.getByText(/Company name must be at least 2 characters/i)).not.toBeVisible();
  });

  test('should display founder email help text', async ({ page }) => {
    await expect(
      page.getByText(/This will be your login email and company domain will be extracted from it/i)
    ).toBeVisible();
  });

  test('should have links to Terms and Privacy Policy', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Terms of Service/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Privacy Policy/i })).toBeVisible();

    // Verify links have correct href
    await expect(page.getByRole('link', { name: /Terms of Service/i })).toHaveAttribute('href', '/terms');
    await expect(page.getByRole('link', { name: /Privacy Policy/i })).toHaveAttribute('href', '/privacy');
  });

  test('should have link to sign in page', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
    await expect(page.getByText(/Already have an employer account/i)).toBeVisible();

    // Click and verify navigation
    await page.getByRole('link', { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/.*signin/);
  });

  test('should have link to job seeker registration', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Register as a job seeker/i })).toBeVisible();
    await expect(page.getByText(/Looking for a job/i)).toBeVisible();

    // Click and verify navigation
    await page.getByRole('link', { name: /Register as a job seeker/i }).click();
    await expect(page).toHaveURL(/.*signup/);
  });

  test('should allow optional fields to be left empty', async ({ page }) => {
    // Fill only required fields
    await page.getByLabel(/Company Name/i).fill('Acme Inc');
    await page.getByLabel(/Founder Email/i).fill('founder@acme.com');
    await page.getByLabel(/^Password/i).fill('ValidPass123');
    await page.getByLabel(/Confirm Password/i).fill('ValidPass123');

    // Leave optional fields empty: Industry, Size, Location, Website
    // Should not show validation errors for optional fields
    await page.getByRole('button', { name: /Start Free Trial/i }).click();

    // Should not show "required" errors for optional fields
    await expect(page.getByText(/Industry.*required/i)).not.toBeVisible();
    await expect(page.getByText(/Size.*required/i)).not.toBeVisible();
    await expect(page.getByText(/Location.*required/i)).not.toBeVisible();
    await expect(page.getByText(/Website.*required/i)).not.toBeVisible();
  });

  test('should show loading state when submitting form', async ({ page }) => {
    // Fill in valid data
    await page.getByLabel(/Company Name/i).fill('Acme Inc');
    await page.getByLabel(/Founder Email/i).fill('founder@acme.com');
    await page.getByLabel(/^Password/i).fill('ValidPass123');
    await page.getByLabel(/Confirm Password/i).fill('ValidPass123');

    // Mock API to delay response
    await page.route('**/api/v1/employers/register', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 500,
        body: JSON.stringify({
          success: false,
          error: { message: 'Test error' },
        }),
      });
    });

    // Click submit
    await page.getByRole('button', { name: /Start Free Trial/i }).click();

    // Should show loading text
    await expect(page.getByRole('button', { name: /Creating your account/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Creating your account/i })).toBeDisabled();

    // Wait for response
    await page.waitForTimeout(1500);

    // Button should return to normal state after error
    await expect(page.getByRole('button', { name: /Start Free Trial/i })).toBeVisible();
  });

  test('should display error message on registration failure', async ({ page }) => {
    await page.getByLabel(/Company Name/i).fill('Acme Inc');
    await page.getByLabel(/Founder Email/i).fill('founder@acme.com');
    await page.getByLabel(/^Password/i).fill('ValidPass123');
    await page.getByLabel(/Confirm Password/i).fill('ValidPass123');

    // Mock API error
    await page.route('**/api/v1/employers/register', async (route) => {
      await route.fulfill({
        status: 409,
        body: JSON.stringify({
          success: false,
          error: { message: 'A company with this domain already exists' },
        }),
      });
    });

    await page.getByRole('button', { name: /Start Free Trial/i }).click();

    // Should show error message
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByText(/A company with this domain already exists/i)).toBeVisible();
  });

  test('should successfully register and redirect to employer dashboard', async ({ page }) => {
    await page.getByLabel(/Company Name/i).fill('Acme Inc');
    await page.getByLabel(/Founder Email/i).fill('founder@acme.com');
    await page.getByLabel(/^Password/i).fill('ValidPass123');
    await page.getByLabel(/Confirm Password/i).fill('ValidPass123');

    // Select optional fields
    await page.getByLabel(/Industry/i).click();
    await page.getByRole('option', { name: 'Technology' }).click();

    await page.getByLabel(/Company Size/i).click();
    await page.getByRole('option', { name: /11-50 employees/i }).click();

    await page.getByLabel(/Location/i).fill('San Francisco, CA');
    await page.getByLabel(/Website/i).fill('https://acme.com');

    // Mock successful API response
    await page.route('**/api/v1/employers/register', async (route) => {
      await route.fulfill({
        status: 201,
        body: JSON.stringify({
          success: true,
          message: 'Company registered successfully',
          data: {
            company: {
              id: 'uuid-1234',
              name: 'Acme Inc',
              domain: 'acme.com',
              subscription_tier: 'starter',
              subscription_status: 'trial',
            },
            user_id: 'uuid-5678',
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            token_type: 'bearer',
          },
        }),
      });
    });

    // Submit form
    await page.getByRole('button', { name: /Start Free Trial/i }).click();

    // Should redirect to employer dashboard
    await page.waitForURL('**/employer/dashboard', { timeout: 5000 });
    await expect(page).toHaveURL(/.*employer\/dashboard/);
  });

  test('should have correct field autocomplete attributes', async ({ page }) => {
    // Check autocomplete attributes for better UX
    const nameInput = page.getByLabel(/Company Name/i);
    await expect(nameInput).toHaveAttribute('autocomplete', 'organization');

    const emailInput = page.getByLabel(/Founder Email/i);
    await expect(emailInput).toHaveAttribute('autocomplete', 'email');

    const passwordInput = page.getByLabel(/^Password/i);
    await expect(passwordInput).toHaveAttribute('autocomplete', 'new-password');

    const confirmPasswordInput = page.getByLabel(/Confirm Password/i);
    await expect(confirmPasswordInput).toHaveAttribute('autocomplete', 'new-password');

    const locationInput = page.getByLabel(/Location/i);
    await expect(locationInput).toHaveAttribute('autocomplete', 'address-level2');

    const websiteInput = page.getByLabel(/Website/i);
    await expect(websiteInput).toHaveAttribute('autocomplete', 'url');
  });

  test('should show trial plan benefits prominently', async ({ page }) => {
    // Verify all trial benefits are displayed
    await expect(page.getByText(/Post 1 active job/i)).toBeVisible();
    await expect(page.getByText(/View up to 10 candidates per month/i)).toBeVisible();
    await expect(page.getByText(/AI-powered candidate ranking/i)).toBeVisible();
    await expect(page.getByText(/Basic ATS features/i)).toBeVisible();
    await expect(page.getByText(/No credit card required/i)).toBeVisible();
    await expect(page.getByText(/Upgrade anytime for more features/i)).toBeVisible();
  });

  test('should have proper password field types', async ({ page }) => {
    // Password fields should be type="password"
    const passwordInput = page.getByLabel(/^Password/i);
    await expect(passwordInput).toHaveAttribute('type', 'password');

    const confirmPasswordInput = page.getByLabel(/Confirm Password/i);
    await expect(confirmPasswordInput).toHaveAttribute('type', 'password');

    // Should show bullets/dots instead of plain text
    await passwordInput.fill('ValidPass123');
    await expect(passwordInput).toHaveValue('ValidPass123');
  });

  test('should have accessible form with proper ARIA attributes', async ({ page }) => {
    // Check for proper form accessibility
    await page.getByLabel(/Company Name/i).fill('A');
    await page.getByLabel(/Company Name/i).blur();

    // Input should have aria-invalid when validation fails
    const nameInput = page.getByLabel(/Company Name/i);
    await expect(nameInput).toHaveAttribute('aria-invalid', 'true');

    // Fix validation error
    await nameInput.fill('Acme Inc');
    await nameInput.blur();

    // aria-invalid should be removed or set to false
    await expect(nameInput).toHaveAttribute('aria-invalid', 'false');
  });

  test('should complete full registration flow with all fields', async ({ page }) => {
    // Fill all fields including optional ones
    await page.getByLabel(/Company Name/i).fill('TechCorp Solutions');
    await page.getByLabel(/Founder Email/i).fill('ceo@techcorp.io');
    await page.getByLabel(/^Password/i).fill('SecurePass123');
    await page.getByLabel(/Confirm Password/i).fill('SecurePass123');

    // Select industry
    await page.getByLabel(/Industry/i).click();
    await page.getByRole('option', { name: 'Technology' }).click();

    // Select company size
    await page.getByLabel(/Company Size/i).click();
    await page.getByRole('option', { name: /51-200 employees/i }).click();

    // Fill location
    await page.getByLabel(/Location/i).fill('New York, NY');

    // Fill website
    await page.getByLabel(/Website/i).fill('https://techcorp.io');

    // Verify all fields are filled
    await expect(page.getByLabel(/Company Name/i)).toHaveValue('TechCorp Solutions');
    await expect(page.getByLabel(/Founder Email/i)).toHaveValue('ceo@techcorp.io');
    await expect(page.getByLabel(/^Password/i)).toHaveValue('SecurePass123');
    await expect(page.getByLabel(/Confirm Password/i)).toHaveValue('SecurePass123');
    await expect(page.getByLabel(/Industry/i)).toContainText('Technology');
    await expect(page.getByLabel(/Company Size/i)).toContainText('51-200 employees');
    await expect(page.getByLabel(/Location/i)).toHaveValue('New York, NY');
    await expect(page.getByLabel(/Website/i)).toHaveValue('https://techcorp.io');

    // Mock successful registration
    await page.route('**/api/v1/employers/register', async (route) => {
      await route.fulfill({
        status: 201,
        body: JSON.stringify({
          success: true,
          data: {
            company: { id: 'uuid', name: 'TechCorp Solutions' },
            access_token: 'token',
            refresh_token: 'refresh',
          },
        }),
      });
    });

    // Submit
    await page.getByRole('button', { name: /Start Free Trial/i }).click();

    // Verify redirect
    await page.waitForURL('**/employer/dashboard', { timeout: 5000 });
  });
});
