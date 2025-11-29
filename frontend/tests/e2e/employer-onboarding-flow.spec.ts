/**
 * E2E Tests: Employer Onboarding Flow (Issue #112)
 *
 * TDD RED Phase - Write failing tests first
 *
 * Test Coverage:
 * - Registration & Account Creation
 * - Email Verification
 * - Onboarding Progress Tracking
 * - Step 1: Company Profile Setup
 * - Step 2: First Job Post Walkthrough
 * - Step 3: Team Member Invitation (Optional)
 * - Step 4: ATS Introduction Tour (Optional)
 * - Step 5: Onboarding Complete
 * - Onboarding State & Resumption
 * - Mobile Responsiveness
 * - Accessibility
 * - Error Handling
 *
 * Total: 50+ comprehensive E2E tests
 */

import { test, expect, Page } from '@playwright/test';

// Test data
const TEST_EMPLOYER = {
  email: 'test.employer@techcorp.com',
  password: 'SecurePass123!',
  companyName: 'TechCorp Inc',
  industry: 'Technology',
  size: '51-200 employees',
};

const TEST_JOB = {
  title: 'Senior Software Engineer',
  department: 'Engineering',
  location: 'San Francisco, CA',
  employmentType: 'Full-time',
  experienceLevel: 'Senior',
  salaryMin: '150000',
  salaryMax: '200000',
};

// Helper functions
async function registerEmployer(page: Page, email = TEST_EMPLOYER.email, password = TEST_EMPLOYER.password) {
  await page.goto('/employer/register');
  await page.locator('[data-email-input]').fill(email);
  await page.locator('[data-password-input]').fill(password);
  await page.locator('[data-confirm-password-input]').fill(password);
  await page.locator('[data-terms-checkbox]').check();
  await page.locator('[data-register-button]').click();
}

async function verifyEmail(page: Page) {
  // Simulate clicking verification link (in real scenario, would fetch from email)
  await page.goto('/employer/verify-email?token=mock-verification-token');
}

// ==============================================================================
// Test Suite 1: Registration & Account Creation
// ==============================================================================

test.describe('Registration & Account Creation', () => {
  test('should display employer registration page', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-for-employers-link]').click();
    await expect(page).toHaveURL(/\/employer\/register/);
    await expect(page.locator('[data-registration-page]')).toBeVisible();
  });

  test('should register new employer with valid details', async ({ page }) => {
    await page.goto('/employer/register');
    await page.locator('[data-email-input]').fill(TEST_EMPLOYER.email);
    await page.locator('[data-password-input]').fill(TEST_EMPLOYER.password);
    await page.locator('[data-confirm-password-input]').fill(TEST_EMPLOYER.password);
    await page.locator('[data-terms-checkbox]').check();
    await page.locator('[data-register-button]').click();

    await expect(page.locator('[data-success-message]')).toBeVisible();
    await expect(page.locator('[data-success-message]')).toContainText('Account created! Check your email.');
    await expect(page).toHaveURL(/\/employer\/verify-email/);
  });

  test('should show error for existing email', async ({ page }) => {
    await page.goto('/employer/register');
    await page.locator('[data-email-input]').fill('existing@employer.com');
    await page.locator('[data-password-input]').fill(TEST_EMPLOYER.password);
    await page.locator('[data-confirm-password-input]').fill(TEST_EMPLOYER.password);
    await page.locator('[data-terms-checkbox]').check();
    await page.locator('[data-register-button]').click();

    await expect(page.locator('[data-email-error]')).toBeVisible();
    await expect(page.locator('[data-email-error]')).toContainText('Email already exists');
  });

  test('should validate weak password', async ({ page }) => {
    await page.goto('/employer/register');
    await page.locator('[data-email-input]').fill(TEST_EMPLOYER.email);
    await page.locator('[data-password-input]').fill('weak');
    await page.locator('[data-password-input]').blur();

    await expect(page.locator('[data-password-error]')).toBeVisible();
    await expect(page.locator('[data-password-error]')).toContainText('at least 8 characters');
  });

  test('should show error when passwords do not match', async ({ page }) => {
    await page.goto('/employer/register');
    await page.locator('[data-password-input]').fill(TEST_EMPLOYER.password);
    await page.locator('[data-confirm-password-input]').fill('DifferentPass456!');
    await page.locator('[data-confirm-password-input]').blur();

    await expect(page.locator('[data-confirm-password-error]')).toBeVisible();
    await expect(page.locator('[data-confirm-password-error]')).toContainText('Passwords do not match');
  });

  test('should require terms of service acceptance', async ({ page }) => {
    await page.goto('/employer/register');
    await page.locator('[data-email-input]').fill(TEST_EMPLOYER.email);
    await page.locator('[data-password-input]').fill(TEST_EMPLOYER.password);
    await page.locator('[data-confirm-password-input]').fill(TEST_EMPLOYER.password);
    // Don't check terms
    await page.locator('[data-register-button]').click();

    await expect(page.locator('[data-terms-error]')).toBeVisible();
    await expect(page.locator('[data-terms-error]')).toContainText('Please agree to Terms of Service');
  });
});

// ==============================================================================
// Test Suite 2: Email Verification
// ==============================================================================

test.describe('Email Verification', () => {
  test('should show email verification page after registration', async ({ page }) => {
    await registerEmployer(page);
    await expect(page.locator('[data-verify-email-page]')).toBeVisible();
    await expect(page.locator('[data-verify-message]')).toContainText('Check your email');
  });

  test('should verify email with valid token', async ({ page }) => {
    await page.goto('/employer/verify-email?token=valid-token-123');
    await expect(page.locator('[data-success-message]')).toBeVisible();
    await expect(page.locator('[data-success-message]')).toContainText('Email verified');
    await expect(page).toHaveURL(/\/employer\/onboarding/);
  });

  test('should show error for expired verification token', async ({ page }) => {
    await page.goto('/employer/verify-email?token=expired-token');
    await expect(page.locator('[data-error-message]')).toBeVisible();
    await expect(page.locator('[data-error-message]')).toContainText('Verification link expired');
    await expect(page.locator('[data-resend-button]')).toBeVisible();
  });

  test('should resend verification email', async ({ page }) => {
    await page.goto('/employer/verify-email');
    await page.locator('[data-resend-button]').click();
    await expect(page.locator('[data-success-message]')).toBeVisible();
    await expect(page.locator('[data-success-message]')).toContainText('Verification email sent');
  });

  test('should block dashboard access before email verification', async ({ page }) => {
    await page.goto('/employer/dashboard');
    await expect(page.locator('[data-verify-prompt]')).toBeVisible();
    await expect(page.locator('[data-verify-prompt]')).toContainText('Please verify your email');
  });
});

// ==============================================================================
// Test Suite 3: Onboarding Progress Tracking
// ==============================================================================

test.describe('Onboarding Progress Tracking', () => {
  test('should display onboarding progress indicator', async ({ page }) => {
    await page.goto('/employer/onboarding');
    await expect(page.locator('[data-progress-bar]')).toBeVisible();
    await expect(page.locator('[data-progress-text]')).toContainText('Step 1 of 5');
  });

  test('should show all step indicators', async ({ page }) => {
    await page.goto('/employer/onboarding');
    const steps = ['Company Profile', 'First Job Post', 'Team Members', 'ATS Tour', 'Complete'];

    for (const step of steps) {
      await expect(page.locator(`[data-step-label]:has-text("${step}")`)).toBeVisible();
    }
  });

  test('should mark current step as active', async ({ page }) => {
    await page.goto('/employer/onboarding');
    await expect(page.locator('[data-step="1"]')).toHaveAttribute('data-status', 'active');
    await expect(page.locator('[data-step="2"]')).toHaveAttribute('data-status', 'incomplete');
  });

  test('should update progress when step completed', async ({ page }) => {
    await page.goto('/employer/onboarding');
    // Complete step 1
    await page.locator('[data-company-name-input]').fill(TEST_EMPLOYER.companyName);
    await page.locator('[data-industry-select]').click();
    await page.locator('[data-industry-option="Technology"]').click();
    await page.locator('[data-company-size-select]').click();
    await page.locator('[data-size-option="51-200 employees"]').click();
    await page.locator('[data-continue-button]').click();

    await expect(page.locator('[data-progress-text]')).toContainText('Step 2 of 5');
    await expect(page.locator('[data-step="1"]')).toHaveAttribute('data-status', 'complete');
    await expect(page.locator('[data-step="2"]')).toHaveAttribute('data-status', 'active');
  });
});

// ==============================================================================
// Test Suite 4: Step 1 - Company Profile Setup
// ==============================================================================

test.describe('Step 1: Company Profile Setup', () => {
  test('should display company profile setup screen', async ({ page }) => {
    await page.goto('/employer/onboarding?step=1');
    await expect(page.locator('[data-step-heading]')).toContainText("Let's set up your company profile");
    await expect(page.locator('[data-step-description]')).toBeVisible();
    await expect(page.locator('[data-company-profile-form]')).toBeVisible();
  });

  test('should complete minimal company profile', async ({ page }) => {
    await page.goto('/employer/onboarding?step=1');
    await page.locator('[data-company-name-input]').fill(TEST_EMPLOYER.companyName);
    await page.locator('[data-industry-select]').click();
    await page.locator(`[data-industry-option="${TEST_EMPLOYER.industry}"]`).click();
    await page.locator('[data-company-size-select]').click();
    await page.locator(`[data-size-option="${TEST_EMPLOYER.size}"]`).click();
    await page.locator('[data-description-textarea]').fill('We build innovative software solutions');
    await page.locator('[data-continue-button]').click();

    await expect(page.locator('[data-success-message]')).toContainText('Company profile saved');
    await expect(page).toHaveURL(/step=2/);
  });

  test('should allow skip for optional fields', async ({ page }) => {
    await page.goto('/employer/onboarding?step=1');
    await page.locator('[data-company-name-input]').fill(TEST_EMPLOYER.companyName);
    await page.locator('[data-industry-select]').click();
    await page.locator(`[data-industry-option="${TEST_EMPLOYER.industry}"]`).click();
    await page.locator('[data-company-size-select]').click();
    await page.locator(`[data-size-option="${TEST_EMPLOYER.size}"]`).click();
    await page.locator('[data-skip-button]').click();

    await expect(page.locator('[data-info-message]')).toContainText('complete your profile later');
    await expect(page).toHaveURL(/step=2/);
  });

  test('should save and exit onboarding', async ({ page }) => {
    await page.goto('/employer/onboarding?step=1');
    await page.locator('[data-company-name-input]').fill(TEST_EMPLOYER.companyName);
    await page.locator('[data-save-exit-button]').click();

    await expect(page).toHaveURL(/\/employer\/dashboard/);
    await expect(page.locator('[data-resume-onboarding-prompt]')).toBeVisible();
  });
});

// ==============================================================================
// Test Suite 5: Step 2 - First Job Post Walkthrough
// ==============================================================================

test.describe('Step 2: First Job Post Walkthrough', () => {
  test('should display job post walkthrough screen', async ({ page }) => {
    await page.goto('/employer/onboarding?step=2');
    await expect(page.locator('[data-step-heading]')).toContainText('Create your first job post');
    await expect(page.locator('[data-step-description]')).toBeVisible();
  });

  test('should show guided tooltips on job form fields', async ({ page }) => {
    await page.goto('/employer/onboarding?step=2');
    await expect(page.locator('[data-job-title-tooltip]')).toBeVisible();
    await expect(page.locator('[data-location-tooltip]')).toBeVisible();
    await expect(page.locator('[data-salary-tooltip]')).toBeVisible();
  });

  test('should pre-fill company information from step 1', async ({ page }) => {
    await page.goto('/employer/onboarding?step=2');
    await expect(page.locator('[data-job-company-name]')).toHaveValue(TEST_EMPLOYER.companyName);
    await expect(page.locator('[data-job-company-logo]')).toBeVisible();
  });

  test('should open AI job description generator', async ({ page }) => {
    await page.goto('/employer/onboarding?step=2');
    await page.locator('[data-job-title-input]').fill(TEST_JOB.title);
    await page.locator('[data-ai-generate-button]').click();

    await expect(page.locator('[data-ai-modal]')).toBeVisible();
    await expect(page.locator('[data-ai-modal-title]')).toContainText('AI Job Description Generator');
  });

  test('should complete and publish first job post', async ({ page }) => {
    await page.goto('/employer/onboarding?step=2');

    // Fill job details
    await page.locator('[data-job-title-input]').fill(TEST_JOB.title);
    await page.locator('[data-department-input]').fill(TEST_JOB.department);
    await page.locator('[data-employment-type-select]').click();
    await page.locator(`[data-employment-option="${TEST_JOB.employmentType}"]`).click();
    await page.locator('[data-experience-level-select]').click();
    await page.locator(`[data-experience-option="${TEST_JOB.experienceLevel}"]`).click();
    await page.locator('[data-salary-min-input]').fill(TEST_JOB.salaryMin);
    await page.locator('[data-salary-max-input]').fill(TEST_JOB.salaryMax);

    await page.locator('[data-publish-job-button]').click();

    await expect(page.locator('[data-success-message]')).toContainText('Job posted successfully');
    await expect(page).toHaveURL(/step=3/);
  });

  test('should save job as draft', async ({ page }) => {
    await page.goto('/employer/onboarding?step=2');
    await page.locator('[data-job-title-input]').fill(TEST_JOB.title);
    await page.locator('[data-save-draft-button]').click();

    await expect(page.locator('[data-info-message]')).toContainText('saved as draft');
    await expect(page).toHaveURL(/step=3/);
  });

  test('should skip job posting', async ({ page }) => {
    await page.goto('/employer/onboarding?step=2');
    await page.locator('[data-skip-job-button]').click();

    await expect(page.locator('[data-info-message]')).toContainText("I'll post a job later");
    await expect(page).toHaveURL(/step=3/);
  });
});

// ==============================================================================
// Test Suite 6: Step 3 - Team Member Invitation
// ==============================================================================

test.describe('Step 3: Team Member Invitation', () => {
  test('should display team invitation screen', async ({ page }) => {
    await page.goto('/employer/onboarding?step=3');
    await expect(page.locator('[data-step-heading]')).toContainText('Invite your team members');
    await expect(page.locator('[data-role-options]')).toBeVisible();
  });

  test('should show role options with descriptions', async ({ page }) => {
    await page.goto('/employer/onboarding?step=3');
    const roles = ['Owner', 'Admin', 'Manager', 'Recruiter', 'Interviewer', 'Viewer'];

    for (const role of roles) {
      await expect(page.locator(`[data-role-option="${role}"]`)).toBeVisible();
    }
  });

  test('should invite a team member', async ({ page }) => {
    await page.goto('/employer/onboarding?step=3');
    await page.locator('[data-invite-email-input]').fill('recruiter@techcorp.com');
    await page.locator('[data-role-select]').click();
    await page.locator('[data-role-option="Recruiter"]').click();
    await page.locator('[data-send-invitation-button]').click();

    await expect(page.locator('[data-success-message]')).toContainText('Invitation sent');
    await expect(page.locator('[data-pending-invitations]')).toContainText('recruiter@techcorp.com');
  });

  test('should invite multiple team members', async ({ page }) => {
    await page.goto('/employer/onboarding?step=3');

    const invites = [
      { email: 'admin@techcorp.com', role: 'Admin' },
      { email: 'recruiter@techcorp.com', role: 'Recruiter' },
      { email: 'manager@techcorp.com', role: 'Manager' },
    ];

    for (const invite of invites) {
      await page.locator('[data-invite-email-input]').fill(invite.email);
      await page.locator('[data-role-select]').click();
      await page.locator(`[data-role-option="${invite.role}"]`).click();
      await page.locator('[data-send-invitation-button]').click();
    }

    const invitationCount = await page.locator('[data-invitation-item]').count();
    expect(invitationCount).toBe(3);
  });

  test('should validate invalid email', async ({ page }) => {
    await page.goto('/employer/onboarding?step=3');
    await page.locator('[data-invite-email-input]').fill('invalid-email');
    await page.locator('[data-send-invitation-button]').click();

    await expect(page.locator('[data-email-error]')).toBeVisible();
    await expect(page.locator('[data-email-error]')).toContainText('valid email address');
  });

  test('should skip team invitations', async ({ page }) => {
    await page.goto('/employer/onboarding?step=3');
    await page.locator('[data-skip-invitations-button]').click();

    await expect(page).toHaveURL(/step=4/);
  });
});

// ==============================================================================
// Test Suite 7: Step 4 - ATS Introduction Tour
// ==============================================================================

test.describe('Step 4: ATS Introduction Tour', () => {
  test('should display ATS tour welcome screen', async ({ page }) => {
    await page.goto('/employer/onboarding?step=4');
    await expect(page.locator('[data-step-heading]')).toContainText('Welcome to your Applicant Tracking System');
    await expect(page.locator('[data-start-tour-button]')).toBeVisible();
    await expect(page.locator('[data-skip-tour-button]')).toBeVisible();
  });

  test('should start interactive ATS tour', async ({ page }) => {
    await page.goto('/employer/onboarding?step=4');
    await page.locator('[data-start-tour-button]').click();

    await expect(page.locator('[data-tour-overlay]')).toBeVisible();
    await expect(page.locator('[data-tour-step-1]')).toBeVisible();
  });

  test('should navigate through tour steps', async ({ page }) => {
    await page.goto('/employer/onboarding?step=4');
    await page.locator('[data-start-tour-button]').click();

    for (let i = 1; i <= 6; i++) {
      await expect(page.locator(`[data-tour-step="${i}"]`)).toBeVisible();
      if (i < 6) {
        await page.locator('[data-tour-next-button]').click();
      }
    }

    await page.locator('[data-tour-finish-button]').click();
    await expect(page).toHaveURL(/step=5/);
  });

  test('should skip ATS tour', async ({ page }) => {
    await page.goto('/employer/onboarding?step=4');
    await page.locator('[data-skip-tour-button]').click();

    await expect(page).toHaveURL(/step=5/);
  });
});

// ==============================================================================
// Test Suite 8: Step 5 - Onboarding Complete
// ==============================================================================

test.describe('Step 5: Onboarding Complete', () => {
  test('should display onboarding completion screen', async ({ page }) => {
    await page.goto('/employer/onboarding?step=5');
    await expect(page.locator('[data-step-heading]')).toContainText("You're all set!");
    await expect(page.locator('[data-success-message]')).toContainText('Welcome to HireFlux');
  });

  test('should show completion summary', async ({ page }) => {
    await page.goto('/employer/onboarding?step=5');
    await expect(page.locator('[data-completion-summary]')).toBeVisible();
    await expect(page.locator('[data-summary-company-profile]')).toContainText('✓');
    await expect(page.locator('[data-summary-job-post]')).toContainText('✓');
  });

  test('should show recommended next steps', async ({ page }) => {
    await page.goto('/employer/onboarding?step=5');
    await expect(page.locator('[data-next-steps]')).toBeVisible();
    await expect(page.locator('[data-next-step-applications]')).toBeVisible();
    await expect(page.locator('[data-next-step-post-job]')).toBeVisible();
  });

  test('should navigate to dashboard on completion', async ({ page }) => {
    await page.goto('/employer/onboarding?step=5');
    await page.locator('[data-go-to-dashboard-button]').click();

    await expect(page).toHaveURL(/\/employer\/dashboard/);
    await expect(page.locator('[data-resume-onboarding-prompt]')).not.toBeVisible();
  });
});

// ==============================================================================
// Test Suite 9: Onboarding State & Resumption
// ==============================================================================

test.describe('Onboarding State & Resumption', () => {
  test('should show resume onboarding banner for incomplete onboarding', async ({ page }) => {
    await page.goto('/employer/dashboard');
    await expect(page.locator('[data-resume-onboarding-banner]')).toBeVisible();
    await expect(page.locator('[data-resume-onboarding-banner]')).toContainText('Complete your onboarding');
  });

  test('should resume from last completed step', async ({ page }) => {
    await page.goto('/employer/dashboard');
    await page.locator('[data-resume-onboarding-button]').click();

    await expect(page).toHaveURL(/\/employer\/onboarding\?step=/);
    // Should resume from where left off (mock as step 2)
    await expect(page.locator('[data-progress-text]')).toContainText('Step');
  });

  test('should persist progress across sessions', async ({ page }) => {
    // Simulate completing step 1
    await page.goto('/employer/onboarding?step=1');
    await page.locator('[data-company-name-input]').fill(TEST_EMPLOYER.companyName);
    await page.locator('[data-industry-select]').click();
    await page.locator('[data-industry-option="Technology"]').click();
    await page.locator('[data-company-size-select]').click();
    await page.locator('[data-size-option="51-200 employees"]').click();
    await page.locator('[data-continue-button]').click();

    // Navigate away
    await page.goto('/employer/dashboard');

    // Return to onboarding
    await page.goto('/employer/onboarding');
    await expect(page).toHaveURL(/step=2/);
  });

  test('should allow skipping entire onboarding', async ({ page }) => {
    await page.goto('/employer/onboarding?step=1');
    await page.locator('[data-skip-onboarding-button]').click();

    await expect(page.locator('[data-confirm-dialog]')).toBeVisible();
    await page.locator('[data-confirm-yes]').click();

    await expect(page).toHaveURL(/\/employer\/dashboard/);
  });
});

// ==============================================================================
// Test Suite 10: Mobile Responsiveness
// ==============================================================================

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should display registration on mobile', async ({ page }) => {
    await page.goto('/employer/register');
    await expect(page.locator('[data-registration-page]')).toBeVisible();
    await expect(page.locator('[data-email-input]')).toBeVisible();
  });

  test('should navigate onboarding steps on mobile', async ({ page }) => {
    await page.goto('/employer/onboarding?step=1');
    await expect(page.locator('[data-progress-bar]')).toBeVisible();
    await expect(page.locator('[data-company-profile-form]')).toBeVisible();
  });

  test('should have touch-friendly buttons on mobile', async ({ page }) => {
    await page.goto('/employer/onboarding?step=1');
    const button = page.locator('[data-continue-button]');
    const box = await button.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44); // Minimum touch target
  });
});

// ==============================================================================
// Test Suite 11: Accessibility
// ==============================================================================

test.describe('Accessibility', () => {
  test('should navigate registration with keyboard', async ({ page }) => {
    await page.goto('/employer/register');
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-email-input]')).toBeFocused();
  });

  test('should submit form with Enter key', async ({ page }) => {
    await page.goto('/employer/register');
    await page.locator('[data-email-input]').fill(TEST_EMPLOYER.email);
    await page.locator('[data-password-input]').fill(TEST_EMPLOYER.password);
    await page.locator('[data-confirm-password-input]').fill(TEST_EMPLOYER.password);
    await page.locator('[data-terms-checkbox]').check();
    await page.locator('[data-register-button]').press('Enter');

    await expect(page.locator('[data-success-message]')).toBeVisible();
  });

  test('should have proper labels for form fields', async ({ page }) => {
    await page.goto('/employer/register');
    const emailInput = page.locator('[data-email-input]');
    const labelFor = await page.locator('label[for="email"]').textContent();
    expect(labelFor).toBeTruthy();
  });

  test('should announce errors to screen readers', async ({ page }) => {
    await page.goto('/employer/register');
    await page.locator('[data-register-button]').click();

    const errorMessage = page.locator('[data-email-error]');
    await expect(errorMessage).toHaveAttribute('role', 'alert');
  });
});

// ==============================================================================
// Test Suite 12: Error Handling
// ==============================================================================

test.describe('Error Handling', () => {
  test('should handle registration API failure', async ({ page }) => {
    await page.route('**/api/auth/register', route => route.abort());

    await page.goto('/employer/register');
    await page.locator('[data-email-input]').fill(TEST_EMPLOYER.email);
    await page.locator('[data-password-input]').fill(TEST_EMPLOYER.password);
    await page.locator('[data-confirm-password-input]').fill(TEST_EMPLOYER.password);
    await page.locator('[data-terms-checkbox]').check();
    await page.locator('[data-register-button]').click();

    await expect(page.locator('[data-error-message]')).toBeVisible();
    await expect(page.locator('[data-retry-button]')).toBeVisible();
  });

  test('should preserve form data after error', async ({ page }) => {
    await page.route('**/api/onboarding/step1', route => route.abort());

    await page.goto('/employer/onboarding?step=1');
    await page.locator('[data-company-name-input]').fill(TEST_EMPLOYER.companyName);
    await page.locator('[data-continue-button]').click();

    await expect(page.locator('[data-company-name-input]')).toHaveValue(TEST_EMPLOYER.companyName);
  });

  test('should handle session timeout', async ({ page }) => {
    await page.goto('/employer/onboarding?step=2');
    // Simulate session expiry
    await page.evaluate(() => localStorage.removeItem('auth_token'));
    await page.locator('[data-continue-button]').click();

    await expect(page.locator('[data-session-expired-message]')).toBeVisible();
  });
});
