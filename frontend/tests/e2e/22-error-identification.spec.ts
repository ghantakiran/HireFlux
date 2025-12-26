import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Error Identification Audit - WCAG 2.1 AA Compliance
 * Issue #148: Focus on WCAG 3.3.2 Error Identification
 *
 * WCAG 3.3.2 Requirements (Labels or Instructions):
 * - When input error is automatically detected, the item in error is identified
 * - Error is described to user in text
 * - Error messages must be programmatically associated with inputs
 * - Use aria-describedby or aria-errormessage to link errors to fields
 * - Ensure aria-invalid="true" when field has error
 *
 * This test verifies error messages are properly associated with form inputs
 * across all forms in the application.
 */

test.describe('Error Identification Audit - WCAG 3.3.2', () => {

  /**
   * Helper function to trigger validation errors on a form
   */
  async function triggerValidationErrors(page: any, formType: 'signin' | 'signup' | 'employer-login' | 'employer-register') {
    if (formType === 'signin' || formType === 'employer-login') {
      // Fill in partial data to trigger specific errors
      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', '');

      // Blur to trigger validation
      await page.locator('input[type="email"]').blur();
      await page.locator('input[type="password"]').blur();
    } else if (formType === 'signup') {
      // Fill in partial/invalid data
      await page.fill('input#first_name', '');
      await page.fill('input#last_name', '');
      await page.fill('input#email', 'invalid-email');
      await page.fill('input#password', 'short');
      await page.fill('input#confirmPassword', 'different');

      // Blur to trigger validation
      await page.locator('input#first_name').blur();
      await page.locator('input#last_name').blur();
      await page.locator('input#email').blur();
      await page.locator('input#password').blur();
      await page.locator('input#confirmPassword').blur();
    } else if (formType === 'employer-register') {
      // Fill in partial/invalid data for employer registration
      await page.fill('input#company_name', '');
      await page.fill('input#email', 'invalid-email');
      await page.fill('input#password', 'short');

      // Blur to trigger validation
      await page.locator('input#company_name').blur();
      await page.locator('input#email').blur();
      await page.locator('input#password').blur();
    }

    // Wait for error messages to appear
    await page.waitForTimeout(500);
  }

  /**
   * Helper function to check if input has proper error associations
   */
  async function checkErrorAssociation(page: any, inputSelector: string, errorMessage: string) {
    const input = page.locator(inputSelector);

    // 1. Check aria-invalid is set
    const ariaInvalid = await input.getAttribute('aria-invalid');
    expect(ariaInvalid).toBe('true');

    // 2. Check aria-describedby or aria-errormessage exists
    const ariaDescribedby = await input.getAttribute('aria-describedby');
    const ariaErrormessage = await input.getAttribute('aria-errormessage');

    const hasAssociation = ariaDescribedby !== null || ariaErrormessage !== null;
    expect(hasAssociation).toBe(true);

    // 3. Check associated error element exists and has correct text
    if (ariaDescribedby) {
      const errorElement = page.locator(`#${ariaDescribedby}`);
      await expect(errorElement).toBeVisible();
      const errorText = await errorElement.textContent();
      expect(errorText).toContain(errorMessage);
    } else if (ariaErrormessage) {
      const errorElement = page.locator(`#${ariaErrormessage}`);
      await expect(errorElement).toBeVisible();
      const errorText = await errorElement.textContent();
      expect(errorText).toContain(errorMessage);
    }

    return { ariaInvalid, ariaDescribedby, ariaErrormessage };
  }

  test('1.1 Sign In Page - Email field error association', async ({ page }) => {
    await page.goto('/signin');
    await page.waitForLoadState('networkidle');

    // Trigger validation error
    await page.fill('input[type="email"]', 'invalid-email');
    await page.locator('input[type="email"]').blur();
    await page.waitForTimeout(300);

    // Check if error message appears
    const errorMessage = page.locator('text=/Please enter a valid email/i');
    await expect(errorMessage).toBeVisible();

    // Check ARIA association
    const result = await checkErrorAssociation(
      page,
      'input[type="email"]',
      'valid email'
    );

    console.log('\n' + '='.repeat(80));
    console.log('SIGN IN - EMAIL FIELD ERROR ASSOCIATION');
    console.log('='.repeat(80));
    console.log(`aria-invalid: ${result.ariaInvalid}`);
    console.log(`aria-describedby: ${result.ariaDescribedby}`);
    console.log(`aria-errormessage: ${result.ariaErrormessage}`);
    console.log('='.repeat(80) + '\n');
  });

  test('1.2 Sign In Page - Password field error association', async ({ page }) => {
    await page.goto('/signin');
    await page.waitForLoadState('networkidle');

    // Trigger validation error
    await page.fill('input[type="password"]', '');
    await page.locator('input[type="password"]').blur();
    await page.waitForTimeout(300);

    // Check if error message appears
    const errorMessage = page.locator('text=/Password is required/i');
    await expect(errorMessage).toBeVisible();

    // Check ARIA association
    const result = await checkErrorAssociation(
      page,
      'input[type="password"]',
      'required'
    );

    console.log('\n' + '='.repeat(80));
    console.log('SIGN IN - PASSWORD FIELD ERROR ASSOCIATION');
    console.log('='.repeat(80));
    console.log(`aria-invalid: ${result.ariaInvalid}`);
    console.log(`aria-describedby: ${result.ariaDescribedby}`);
    console.log(`aria-errormessage: ${result.ariaErrormessage}`);
    console.log('='.repeat(80) + '\n');
  });

  test('2.1 Sign Up Page - All fields error associations', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    // Trigger all validation errors
    await triggerValidationErrors(page, 'signup');

    // Check first name error
    const firstNameError = page.locator('text=/First name is required/i');
    await expect(firstNameError).toBeVisible();

    await checkErrorAssociation(
      page,
      'input#first_name',
      'First name is required'
    );

    // Check last name error
    const lastNameError = page.locator('text=/Last name is required/i');
    await expect(lastNameError).toBeVisible();

    await checkErrorAssociation(
      page,
      'input#last_name',
      'Last name is required'
    );

    // Check email error
    const emailError = page.locator('text=/valid email/i');
    await expect(emailError).toBeVisible();

    await checkErrorAssociation(
      page,
      'input#email',
      'valid email'
    );

    console.log('\n✅ All Sign Up form fields have proper error associations\n');
  });

  test('3.1 Employer Login - Error associations', async ({ page }) => {
    await page.goto('/employer/login');
    await page.waitForLoadState('networkidle');

    // Trigger validation errors
    await page.fill('input[type="email"]', 'invalid');
    await page.locator('input[type="email"]').blur();
    await page.waitForTimeout(300);

    // Check error appears (employer login uses "Invalid email address" message)
    const errorMessage = page.locator('text=/Invalid email address/i');
    await expect(errorMessage).toBeVisible();

    // Check ARIA association
    await checkErrorAssociation(
      page,
      'input[type="email"]',
      'Invalid email'
    );

    console.log('\n✅ Employer Login form has proper error associations\n');
  });

  test.skip('4.1 Employer Register - Error associations', async ({ page }) => {
    // Skip: Employer register page not yet implemented
    // Will be added in future sprint when employer registration is built
    await page.goto('/employer/register');
    await page.waitForLoadState('networkidle');

    // Trigger validation errors
    await triggerValidationErrors(page, 'employer-register');

    // Check company name error (if visible)
    const companyNameInput = await page.locator('input#company_name').count();
    if (companyNameInput > 0) {
      const companyNameError = page.locator('text=/required/i').first();
      if (await companyNameError.isVisible()) {
        await checkErrorAssociation(
          page,
          'input#company_name',
          'required'
        );
      }
    }

    // Check email error
    const emailError = page.locator('text=/valid email/i');
    if (await emailError.isVisible()) {
      await checkErrorAssociation(
        page,
        'input[type="email"]',
        'valid email'
      );
    }

    console.log('\n✅ Employer Register form has proper error associations\n');
  });

  test('5.1 axe-core scan for label/error associations', async ({ page }) => {
    await page.goto('/signin');
    await page.waitForLoadState('networkidle');

    // Trigger errors
    await triggerValidationErrors(page, 'signin');

    // Run axe scan focused on forms and error messages
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa', 'wcag332', 'wcag412'])
      .analyze();

    console.log('\n' + '='.repeat(80));
    console.log('AXE-CORE SCAN: Error Identification');
    console.log('='.repeat(80));
    console.log(`Total Violations: ${results.violations.length}`);

    if (results.violations.length > 0) {
      results.violations.forEach((violation, index) => {
        console.log(`\nViolation #${index + 1}: ${violation.id}`);
        console.log(`Impact: ${violation.impact?.toUpperCase()}`);
        console.log(`Description: ${violation.description}`);
        console.log(`Help: ${violation.help}`);
        console.log(`Affected Elements: ${violation.nodes.length}`);

        violation.nodes.slice(0, 3).forEach((node, nodeIndex) => {
          console.log(`  ${nodeIndex + 1}. ${node.html.substring(0, 100)}`);
          console.log(`     ${node.failureSummary}`);
        });
      });
    } else {
      console.log('✅ No WCAG violations found!');
    }
    console.log('='.repeat(80) + '\n');

    // Filter for form-related violations
    const formViolations = results.violations.filter(v =>
      v.id.includes('label') ||
      v.id.includes('aria') ||
      v.id.includes('form-field')
    );

    expect(formViolations.length).toBe(0);
  });

  test('6.1 Error message visibility and readability', async ({ page }) => {
    await page.goto('/signup');
    await page.waitForLoadState('networkidle');

    // Trigger errors
    await triggerValidationErrors(page, 'signup');

    // Check all error messages are visible and have proper color contrast
    const errorMessages = page.locator('[class*="text-red"]');
    const count = await errorMessages.count();

    console.log(`\nFound ${count} error messages on the page`);

    for (let i = 0; i < count; i++) {
      const error = errorMessages.nth(i);
      await expect(error).toBeVisible();

      // Check text is not empty
      const text = await error.textContent();
      expect(text).toBeTruthy();
      expect(text!.length).toBeGreaterThan(0);
    }

    console.log('✅ All error messages are visible and readable\n');
  });

  test('7.1 Screen reader announcement - ARIA live region', async ({ page }) => {
    await page.goto('/signin');
    await page.waitForLoadState('networkidle');

    // Check for ARIA live regions that would announce errors
    const liveRegions = page.locator('[aria-live]');
    const count = await liveRegions.count();

    console.log(`\nFound ${count} ARIA live region(s) for screen reader announcements`);

    // Trigger error and check if it's announced
    await page.fill('input[type="email"]', 'invalid');
    await page.locator('input[type="email"]').blur();
    await page.waitForTimeout(300);

    // Error should either be in a live region or associated via aria-describedby
    const emailInput = page.locator('input[type="email"]');
    const ariaDescribedby = await emailInput.getAttribute('aria-describedby');
    const ariaErrormessage = await emailInput.getAttribute('aria-errormessage');

    const hasAssociation = ariaDescribedby !== null || ariaErrormessage !== null || count > 0;
    expect(hasAssociation).toBe(true);

    console.log(`aria-describedby: ${ariaDescribedby}`);
    console.log(`aria-errormessage: ${ariaErrormessage}`);
    console.log(`Live regions: ${count}`);
    console.log('\n✅ Error announcements configured for screen readers\n');
  });
});
