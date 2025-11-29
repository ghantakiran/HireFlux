/**
 * E2E Tests: Subscription Plans & Upgrade Flow (Issue #110)
 *
 * Test Coverage:
 * - Plan comparison page with 4 plans (Free, Plus, Pro, Premium)
 * - Billing cycle toggle (Monthly/Annual) with savings calculation
 * - Current plan indication and upgrade CTAs
 * - Stripe checkout flow (initiation, success, failure, cancellation)
 * - Post-upgrade experience and feature access
 * - Plan management (upgrade, downgrade, cancellation)
 * - Billing history and invoice downloads
 * - Payment method management
 * - Plan limits and usage tracking
 * - Mobile responsiveness and accessibility
 * - Error handling and edge cases
 *
 * TDD Red Phase: These tests define expected behavior before implementation
 * All tests use data-* attributes for reliable selectors
 */

import { test, expect, Page } from '@playwright/test';

// ============================================================================
// Test Suite 1: Plan Comparison Page
// ============================================================================

test.describe('Plan Comparison Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login as job seeker on Free plan
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('jobseeker@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
    await expect(page).toHaveURL(/.*dashboard/);
  });

  test('should display subscription plans page', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.locator('[data-page-title]')).toContainText(/Subscription Plans|Choose Your Plan/i);
    await expect(page.locator('[data-plan-comparison-table]')).toBeVisible();
    await expect(page.locator('[data-billing-cycle-toggle]')).toBeVisible();

    // Should see 4 plan cards
    const planCards = page.locator('[data-plan-card]');
    await expect(planCards).toHaveCount(4);
  });

  test('should display all plan details correctly', async ({ page }) => {
    await page.goto('/pricing');

    // Free plan
    await expect(page.locator('[data-plan="free"] [data-plan-name]')).toContainText('Free');
    await expect(page.locator('[data-plan="free"] [data-plan-price-monthly]')).toContainText('$0/month');
    await expect(page.locator('[data-plan="free"] [data-plan-price-annual]')).toContainText('$0/year');

    // Plus plan
    await expect(page.locator('[data-plan="plus"] [data-plan-name]')).toContainText('Plus');
    await expect(page.locator('[data-plan="plus"] [data-plan-price-monthly]')).toContainText('$19/month');
    await expect(page.locator('[data-plan="plus"] [data-plan-price-annual]')).toContainText('$190/year');

    // Pro plan
    await expect(page.locator('[data-plan="pro"] [data-plan-name]')).toContainText('Pro');
    await expect(page.locator('[data-plan="pro"] [data-plan-price-monthly]')).toContainText('$49/month');
    await expect(page.locator('[data-plan="pro"] [data-plan-price-annual]')).toContainText('$490/year');

    // Premium plan
    await expect(page.locator('[data-plan="premium"] [data-plan-name]')).toContainText('Premium');
    await expect(page.locator('[data-plan="premium"] [data-plan-price-monthly]')).toContainText('$99/month');
    await expect(page.locator('[data-plan="premium"] [data-plan-price-annual]')).toContainText('$990/year');
  });

  test('should display plan features comparison', async ({ page }) => {
    await page.goto('/pricing');

    // Each plan should have features list, price, billing cycle, and CTA
    const planCards = page.locator('[data-plan-card]');
    for (let i = 0; i < 4; i++) {
      const card = planCards.nth(i);
      await expect(card.locator('[data-features-list]')).toBeVisible();
      await expect(card.locator('[data-plan-price]')).toBeVisible();
      await expect(card.locator('[data-cta-button]')).toBeVisible();
    }
  });

  test('should display Free plan features', async ({ page }) => {
    await page.goto('/pricing');

    const freePlanFeatures = page.locator('[data-plan="free"] [data-features-list]');
    await expect(freePlanFeatures).toContainText('3 cover letters per month');
    await expect(freePlanFeatures).toContainText('10 job suggestions per month');
    await expect(freePlanFeatures).toContainText('Basic resume builder');
    await expect(freePlanFeatures).toContainText('Manual job applications');
  });

  test('should display Plus plan features', async ({ page }) => {
    await page.goto('/pricing');

    const plusPlanFeatures = page.locator('[data-plan="plus"] [data-features-list]');
    await expect(plusPlanFeatures).toContainText('Unlimited resumes');
    await expect(plusPlanFeatures).toContainText('Unlimited cover letters');
    await expect(plusPlanFeatures).toContainText('100 weekly job suggestions');
    await expect(plusPlanFeatures).toContainText('Priority matching');
    await expect(plusPlanFeatures).toContainText('Email support');
  });

  test('should display Pro plan features', async ({ page }) => {
    await page.goto('/pricing');

    const proPlanFeatures = page.locator('[data-plan="pro"] [data-features-list]');
    await expect(proPlanFeatures).toContainText('Everything in Plus');
    await expect(proPlanFeatures).toContainText('50 auto-apply credits/month');
    await expect(proPlanFeatures).toContainText('Interview coach access');
    await expect(proPlanFeatures).toContainText('Priority support');
    await expect(proPlanFeatures).toContainText('Advanced analytics');
  });

  test('should display Premium plan features', async ({ page }) => {
    await page.goto('/pricing');

    const premiumPlanFeatures = page.locator('[data-plan="premium"] [data-features-list]');
    await expect(premiumPlanFeatures).toContainText('Everything in Pro');
    await expect(premiumPlanFeatures).toContainText('Unlimited auto-apply');
    await expect(premiumPlanFeatures).toContainText('Unlimited interview coaching');
    await expect(premiumPlanFeatures).toContainText('Dedicated success manager');
    await expect(premiumPlanFeatures).toContainText('White-glove service');
  });
});

// ============================================================================
// Test Suite 2: Billing Cycle Toggle
// ============================================================================

test.describe('Billing Cycle Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('jobseeker@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
    await page.goto('/pricing');
  });

  test('should toggle billing cycle to Annual', async ({ page }) => {
    // Default should be Monthly
    await expect(page.locator('[data-billing-cycle="monthly"]')).toHaveAttribute('data-active', 'true');

    // Click Annual toggle
    await page.locator('[data-billing-cycle="annual"]').click();

    // Prices should update
    await expect(page.locator('[data-plan="plus"] [data-plan-price]')).toContainText('$190/year');
    await expect(page.locator('[data-plan="pro"] [data-plan-price]')).toContainText('$490/year');
    await expect(page.locator('[data-plan="premium"] [data-plan-price]')).toContainText('$990/year');

    // Should show savings badges
    await expect(page.locator('[data-plan="plus"] [data-savings-badge]')).toBeVisible();
    await expect(page.locator('[data-plan="pro"] [data-savings-badge]')).toBeVisible();
    await expect(page.locator('[data-plan="premium"] [data-savings-badge]')).toBeVisible();
  });

  test('should display annual billing discount amounts', async ({ page }) => {
    await page.locator('[data-billing-cycle="annual"]').click();

    // Check savings amounts
    await expect(page.locator('[data-plan="plus"] [data-savings-amount]')).toContainText(/Save.*\$38/i);
    await expect(page.locator('[data-plan="pro"] [data-savings-amount]')).toContainText(/Save.*\$98/i);
    await expect(page.locator('[data-plan="premium"] [data-savings-amount]')).toContainText(/Save.*\$198/i);
  });

  test('should toggle billing cycle back to Monthly', async ({ page }) => {
    // First switch to Annual
    await page.locator('[data-billing-cycle="annual"]').click();

    // Then switch back to Monthly
    await page.locator('[data-billing-cycle="monthly"]').click();

    // Prices should update back
    await expect(page.locator('[data-plan="plus"] [data-plan-price]')).toContainText('$19/month');
    await expect(page.locator('[data-plan="pro"] [data-plan-price]')).toContainText('$49/month');
    await expect(page.locator('[data-plan="premium"] [data-plan-price]')).toContainText('$99/month');

    // Savings badges should be hidden
    await expect(page.locator('[data-plan="plus"] [data-savings-badge]')).not.toBeVisible();
  });
});

// ============================================================================
// Test Suite 3: Current Plan Indication
// ============================================================================

test.describe('Current Plan Indication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('jobseeker@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
    await page.goto('/pricing');
  });

  test('should highlight current plan (Free)', async ({ page }) => {
    // Free plan should be marked as current
    await expect(page.locator('[data-plan="free"] [data-current-plan-badge]')).toBeVisible();
    await expect(page.locator('[data-plan="free"] [data-current-plan-badge]')).toContainText('Current Plan');

    // CTA button should be disabled or say "Current Plan"
    const freePlanCTA = page.locator('[data-plan="free"] [data-cta-button]');
    const isDisabled = await freePlanCTA.isDisabled();
    const buttonText = await freePlanCTA.textContent();

    expect(isDisabled || buttonText?.includes('Current Plan')).toBeTruthy();
  });

  test('should show upgrade CTAs for higher plans', async ({ page }) => {
    await expect(page.locator('[data-plan="plus"] [data-cta-button]')).toContainText(/Upgrade to Plus/i);
    await expect(page.locator('[data-plan="pro"] [data-cta-button]')).toContainText(/Upgrade to Pro/i);
    await expect(page.locator('[data-plan="premium"] [data-cta-button]')).toContainText(/Upgrade to Premium/i);
  });
});

// ============================================================================
// Test Suite 4: Upgrade Flow - From Pricing Page
// ============================================================================

test.describe('Upgrade Flow from Pricing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('jobseeker@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
    await page.goto('/pricing');
  });

  test('should open plan preview modal on upgrade click', async ({ page }) => {
    await page.locator('[data-plan="plus"] [data-cta-button]').click();

    // Should see plan preview modal
    await expect(page.locator('[data-plan-preview-modal]')).toBeVisible();
    await expect(page.locator('[data-modal-plan-name]')).toContainText('Plus');
    await expect(page.locator('[data-modal-plan-price]')).toContainText('$19/month');
    await expect(page.locator('[data-continue-to-checkout-button]')).toBeVisible();
  });

  test('should display plan change preview details', async ({ page }) => {
    await page.locator('[data-plan="pro"] [data-cta-button]').click();

    // Should show current and new plan comparison
    await expect(page.locator('[data-current-plan-display]')).toContainText('Free');
    await expect(page.locator('[data-new-plan-display]')).toContainText('Pro');
    await expect(page.locator('[data-price-difference]')).toBeVisible();
    await expect(page.locator('[data-billing-cycle-display]')).toBeVisible();
    await expect(page.locator('[data-features-comparison]')).toBeVisible();
  });

  test('should close plan preview modal', async ({ page }) => {
    await page.locator('[data-plan="plus"] [data-cta-button]').click();
    await expect(page.locator('[data-plan-preview-modal]')).toBeVisible();

    // Close modal
    await page.locator('[data-close-modal-button]').click();
    await expect(page.locator('[data-plan-preview-modal]')).not.toBeVisible();
  });
});

// ============================================================================
// Test Suite 5: Upgrade CTAs Throughout App
// ============================================================================

test.describe('Upgrade CTAs Throughout App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('jobseeker@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
  });

  test('should show upgrade CTA on limited feature (cover letters)', async ({ page }) => {
    // Simulate user who has used 3 cover letters
    await page.goto('/dashboard/cover-letter');

    // Try to generate 4th cover letter (should be blocked on Free plan)
    await expect(page.locator('[data-upgrade-prompt]')).toBeVisible();
    await expect(page.locator('[data-upgrade-prompt]')).toContainText(/Upgrade to Plus for unlimited cover letters/i);
    await expect(page.locator('[data-upgrade-now-button]')).toBeVisible();
  });

  test('should show upgrade CTA on auto-apply feature', async ({ page }) => {
    await page.goto('/dashboard/jobs');

    // Try to access auto-apply (locked on Free plan)
    await page.locator('[data-auto-apply-button]').first().click();

    await expect(page.locator('[data-feature-lock-message]')).toBeVisible();
    await expect(page.locator('[data-feature-lock-message]')).toContainText(/Auto-apply is available on Pro plan/i);
    await expect(page.locator('[data-view-plans-button]')).toBeVisible();
  });

  test('should show upgrade CTA on interview coach', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    await expect(page.locator('[data-feature-lock-message]')).toBeVisible();
    await expect(page.locator('[data-feature-lock-message]')).toContainText(/Interview coaching is available on Pro plan/i);
    await expect(page.locator('[data-upgrade-to-pro-button]')).toBeVisible();
  });

  test('should navigate to pricing page from feature lock CTA', async ({ page }) => {
    await page.goto('/dashboard/interview-buddy');

    await page.locator('[data-upgrade-to-pro-button]').click();

    // Should be taken to pricing page
    await expect(page).toHaveURL(/.*pricing/);

    // Pro plan should be highlighted
    await expect(page.locator('[data-plan="pro"]')).toHaveAttribute('data-highlighted', 'true');
  });

  test('should display upgrade banner in dashboard', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.locator('[data-upgrade-banner]')).toBeVisible();
    await expect(page.locator('[data-upgrade-banner]')).toContainText(/premium features/i);
    await expect(page.locator('[data-upgrade-banner] [data-view-plans-button]')).toBeVisible();
  });
});

// ============================================================================
// Test Suite 6: Stripe Checkout Flow (Mock)
// ============================================================================

test.describe('Stripe Checkout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('jobseeker@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
    await page.goto('/pricing');
  });

  test('should initiate Stripe checkout for Plus plan', async ({ page }) => {
    await page.locator('[data-plan="plus"] [data-cta-button]').click();
    await page.locator('[data-continue-to-checkout-button]').click();

    // Should redirect to Stripe Checkout (or mock checkout)
    await expect(page.locator('[data-stripe-checkout-form]')).toBeVisible({ timeout: 10000 });

    // Should display plan and amount
    await expect(page.locator('[data-checkout-plan-name]')).toContainText('Plus');
    await expect(page.locator('[data-checkout-amount]')).toContainText('$19');
  });

  test('should display all payment fields in Stripe checkout', async ({ page }) => {
    await page.locator('[data-plan="plus"] [data-cta-button]').click();
    await page.locator('[data-continue-to-checkout-button]').click();

    await expect(page.locator('[data-stripe-checkout-form]')).toBeVisible({ timeout: 10000 });

    // Check for required payment fields
    await expect(page.locator('[data-email-field]')).toBeVisible();
    await expect(page.locator('[data-card-number-field]')).toBeVisible();
    await expect(page.locator('[data-expiry-field]')).toBeVisible();
    await expect(page.locator('[data-cvc-field]')).toBeVisible();
    await expect(page.locator('[data-cardholder-name-field]')).toBeVisible();
    await expect(page.locator('[data-billing-address-field]')).toBeVisible();
  });

  test('should complete Stripe checkout successfully (mock)', async ({ page }) => {
    await page.locator('[data-plan="plus"] [data-cta-button]').click();
    await page.locator('[data-continue-to-checkout-button]').click();

    await expect(page.locator('[data-stripe-checkout-form]')).toBeVisible({ timeout: 10000 });

    // Fill payment details (mock)
    await page.locator('[data-email-field]').fill('jobseeker@test.com');
    await page.locator('[data-card-number-field]').fill('4242424242424242');
    await page.locator('[data-expiry-field]').fill('12/25');
    await page.locator('[data-cvc-field]').fill('123');
    await page.locator('[data-cardholder-name-field]').fill('Test User');

    // Submit payment
    await page.locator('[data-subscribe-button]').click();

    // Should redirect to success page
    await expect(page).toHaveURL(/.*success/, { timeout: 15000 });
    await expect(page.locator('[data-success-message]')).toContainText(/Successfully upgraded to Plus/i);
  });

  test('should handle Stripe checkout failure (mock)', async ({ page }) => {
    await page.locator('[data-plan="pro"] [data-cta-button]').click();
    await page.locator('[data-continue-to-checkout-button]').click();

    await expect(page.locator('[data-stripe-checkout-form]')).toBeVisible({ timeout: 10000 });

    // Fill invalid payment details (use test card that fails)
    await page.locator('[data-email-field]').fill('jobseeker@test.com');
    await page.locator('[data-card-number-field]').fill('4000000000000002'); // Declined card
    await page.locator('[data-expiry-field]').fill('12/25');
    await page.locator('[data-cvc-field]').fill('123');

    await page.locator('[data-subscribe-button]').click();

    // Should show error message
    await expect(page.locator('[data-payment-error]')).toBeVisible();
    await expect(page.locator('[data-payment-error]')).toContainText(/declined|failed/i);

    // Should remain on checkout page
    await expect(page.locator('[data-stripe-checkout-form]')).toBeVisible();
  });

  test('should allow cancelling Stripe checkout', async ({ page }) => {
    await page.locator('[data-plan="plus"] [data-cta-button]').click();
    await page.locator('[data-continue-to-checkout-button]').click();

    await expect(page.locator('[data-stripe-checkout-form]')).toBeVisible({ timeout: 10000 });

    // Cancel checkout
    await page.locator('[data-cancel-checkout-button]').click();

    // Should return to pricing page
    await expect(page).toHaveURL(/.*pricing/);

    // Plan should still be Free (not upgraded)
    await page.goto('/dashboard/account');
    await expect(page.locator('[data-current-plan]')).toContainText('Free');
  });
});

// ============================================================================
// Test Suite 7: Post-Upgrade Experience
// ============================================================================

test.describe('Post-Upgrade Experience', () => {
  test.beforeEach(async ({ page }) => {
    // Login and simulate successful upgrade to Plus
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('upgraded-user@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
  });

  test('should display success page after upgrade', async ({ page }) => {
    await page.goto('/pricing/success?plan=plus');

    await expect(page.locator('[data-success-page]')).toBeVisible();
    await expect(page.locator('[data-success-title]')).toContainText(/Welcome to Plus/i);
    await expect(page.locator('[data-new-features-list]')).toBeVisible();
    await expect(page.locator('[data-get-started-button]')).toBeVisible();
  });

  test('should update plan display in account settings', async ({ page }) => {
    await page.goto('/dashboard/account');

    await expect(page.locator('[data-current-plan]')).toContainText('Plus');
    await expect(page.locator('[data-billing-cycle]')).toContainText(/Monthly|Annual/);
    await expect(page.locator('[data-next-billing-date]')).toBeVisible();
    await expect(page.locator('[data-manage-subscription-button]')).toBeVisible();
  });

  test('should grant access to premium features after upgrade', async ({ page }) => {
    // User is on Pro plan, should have auto-apply access
    await page.goto('/dashboard/jobs');

    // Auto-apply button should be accessible (not locked)
    await expect(page.locator('[data-auto-apply-button]').first()).toBeEnabled();
    await expect(page.locator('[data-feature-lock-message]')).not.toBeVisible();
  });

  test('should remove upgrade CTAs for current plan', async ({ page }) => {
    // User is on Plus, should not see Plus upgrade CTAs
    await page.goto('/pricing');

    // Plus plan should be marked as current
    await expect(page.locator('[data-plan="plus"] [data-current-plan-badge]')).toBeVisible();

    // But should still see Pro and Premium upgrade CTAs
    await expect(page.locator('[data-plan="pro"] [data-cta-button]')).toContainText(/Upgrade/i);
    await expect(page.locator('[data-plan="premium"] [data-cta-button]')).toContainText(/Upgrade/i);
  });
});

// ============================================================================
// Test Suite 8: Plan Management
// ============================================================================

test.describe('Plan Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('plus-user@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
  });

  test('should view subscription details', async ({ page }) => {
    await page.goto('/dashboard/account');
    await page.locator('[data-subscription-tab]').click();

    await expect(page.locator('[data-current-plan]')).toContainText('Plus');
    await expect(page.locator('[data-billing-cycle]')).toBeVisible();
    await expect(page.locator('[data-next-billing-date]')).toBeVisible();
    await expect(page.locator('[data-billing-amount]')).toContainText('$19');
    await expect(page.locator('[data-payment-method]')).toBeVisible();
    await expect(page.locator('[data-manage-subscription-link]')).toBeVisible();
  });

  test('should open Stripe Customer Portal on manage subscription click', async ({ page }) => {
    await page.goto('/dashboard/account');
    await page.locator('[data-subscription-tab]').click();

    // Click manage subscription
    const [stripePortal] = await Promise.all([
      page.waitForEvent('popup'),
      page.locator('[data-manage-subscription-button]').click()
    ]);

    // Should redirect to Stripe portal (or mock portal)
    await expect(stripePortal).toHaveURL(/stripe.com|billing-portal/);
  });
});

// ============================================================================
// Test Suite 9: Plan Upgrade (Change to Higher Plan)
// ============================================================================

test.describe('Plan Upgrade to Higher Tier', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('plus-user@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
  });

  test('should show prorated pricing when upgrading mid-cycle', async ({ page }) => {
    await page.goto('/pricing');

    await page.locator('[data-plan="pro"] [data-cta-button]').click();

    // Should see plan change preview with proration
    await expect(page.locator('[data-plan-preview-modal]')).toBeVisible();
    await expect(page.locator('[data-prorated-amount]')).toBeVisible();
    await expect(page.locator('[data-prorated-explanation]')).toContainText(/charged.*today.*prorated/i);
  });

  test('should immediately grant Pro access after upgrade', async ({ page }) => {
    // Simulate successful upgrade from Plus to Pro
    await page.goto('/pricing/success?plan=pro&upgraded_from=plus');

    await expect(page.locator('[data-success-message]')).toContainText(/upgraded to Pro/i);

    // Navigate to interview coach - should have access
    await page.goto('/dashboard/interview-buddy');
    await expect(page.locator('[data-feature-lock-message]')).not.toBeVisible();
    await expect(page.locator('[data-session-config-form]')).toBeVisible();
  });
});

// ============================================================================
// Test Suite 10: Plan Downgrade
// ============================================================================

test.describe('Plan Downgrade', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('pro-user@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
  });

  test('should show downgrade warning when changing to lower plan', async ({ page }) => {
    await page.goto('/pricing');

    await page.locator('[data-plan="plus"] [data-cta-button]').click();

    // Should see downgrade warning
    await expect(page.locator('[data-downgrade-warning]')).toBeVisible();
    await expect(page.locator('[data-features-to-lose]')).toBeVisible();
    await expect(page.locator('[data-downgrade-effective-date]')).toContainText(/end of billing period/i);
  });

  test('should schedule downgrade for end of billing period', async ({ page }) => {
    await page.goto('/pricing');

    await page.locator('[data-plan="plus"] [data-cta-button]').click();
    await page.locator('[data-confirm-downgrade-button]').click();

    await expect(page.locator('[data-downgrade-scheduled-message]')).toBeVisible();
    await expect(page.locator('[data-downgrade-scheduled-message]')).toContainText(/plan will change to Plus on/i);

    // Should see cancel downgrade option
    await expect(page.locator('[data-cancel-downgrade-button]')).toBeVisible();
  });

  test('should allow cancelling scheduled downgrade', async ({ page }) => {
    // Simulate scheduled downgrade exists
    await page.goto('/dashboard/account');
    await page.locator('[data-subscription-tab]').click();

    await expect(page.locator('[data-scheduled-downgrade-notice]')).toBeVisible();

    await page.locator('[data-cancel-downgrade-button]').click();

    await expect(page.locator('[data-downgrade-cancelled-message]')).toContainText(/Downgrade cancelled/i);
    await expect(page.locator('[data-current-plan]')).toContainText('Pro');
  });
});

// ============================================================================
// Test Suite 11: Subscription Cancellation
// ============================================================================

test.describe('Subscription Cancellation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('plus-user@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
  });

  test('should show cancellation confirmation dialog', async ({ page }) => {
    await page.goto('/dashboard/account');
    await page.locator('[data-subscription-tab]').click();

    await page.locator('[data-cancel-subscription-button]').click();

    await expect(page.locator('[data-cancellation-dialog]')).toBeVisible();
    await expect(page.locator('[data-cancellation-warning]')).toContainText(/losing access/i);
    await expect(page.locator('[data-access-end-date]')).toBeVisible();
  });

  test('should mark subscription for cancellation at period end', async ({ page }) => {
    await page.goto('/dashboard/account');
    await page.locator('[data-subscription-tab]').click();

    await page.locator('[data-cancel-subscription-button]').click();
    await page.locator('[data-confirm-cancellation-button]').click();

    await expect(page.locator('[data-cancellation-scheduled-message]')).toBeVisible();
    await expect(page.locator('[data-subscription-status]')).toContainText(/Cancelling/i);
    await expect(page.locator('[data-reactivate-button]')).toBeVisible();
  });

  test('should allow reactivating cancelled subscription', async ({ page }) => {
    // Simulate cancelled subscription
    await page.goto('/dashboard/account');
    await page.locator('[data-subscription-tab]').click();

    await expect(page.locator('[data-cancellation-notice]')).toBeVisible();

    await page.locator('[data-reactivate-button]').click();

    await expect(page.locator('[data-reactivation-success-message]')).toContainText(/Subscription reactivated/i);
    await expect(page.locator('[data-subscription-status]')).toContainText(/Active/i);
  });
});

// ============================================================================
// Test Suite 12: Billing History
// ============================================================================

test.describe('Billing History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('plus-user@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
  });

  test('should display billing history', async ({ page }) => {
    await page.goto('/dashboard/account');
    await page.locator('[data-billing-history-tab]').click();

    await expect(page.locator('[data-invoices-list]')).toBeVisible();

    // Should have invoice rows
    const invoices = page.locator('[data-invoice-row]');
    await expect(invoices.first()).toBeVisible();

    // Each invoice should show date, amount, plan, status, download link
    const firstInvoice = invoices.first();
    await expect(firstInvoice.locator('[data-invoice-date]')).toBeVisible();
    await expect(firstInvoice.locator('[data-invoice-amount]')).toBeVisible();
    await expect(firstInvoice.locator('[data-invoice-plan]')).toBeVisible();
    await expect(firstInvoice.locator('[data-invoice-status]')).toBeVisible();
    await expect(firstInvoice.locator('[data-download-invoice]')).toBeVisible();
  });

  test('should download invoice PDF', async ({ page }) => {
    await page.goto('/dashboard/account');
    await page.locator('[data-billing-history-tab]').click();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.locator('[data-download-invoice]').first().click()
    ]);

    // Should download a PDF
    expect(download.suggestedFilename()).toMatch(/invoice.*\.pdf/i);
  });
});

// ============================================================================
// Test Suite 13: Payment Method Management
// ============================================================================

test.describe('Payment Method Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('plus-user@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
  });

  test('should open Stripe portal for payment method update', async ({ page }) => {
    await page.goto('/dashboard/account');
    await page.locator('[data-subscription-tab]').click();

    const [stripePortal] = await Promise.all([
      page.waitForEvent('popup'),
      page.locator('[data-update-payment-method-button]').click()
    ]);

    await expect(stripePortal).toHaveURL(/stripe.com|billing/);
  });

  test('should display payment failure banner when payment fails', async ({ page }) => {
    // Simulate payment failure state
    await page.goto('/dashboard?payment_failed=true');

    await expect(page.locator('[data-payment-failure-banner]')).toBeVisible();
    await expect(page.locator('[data-payment-failure-banner]')).toContainText(/Payment Failed.*Update Payment Method/i);
    await expect(page.locator('[data-update-payment-link]')).toBeVisible();
  });
});

// ============================================================================
// Test Suite 14: Plan Limits & Usage
// ============================================================================

test.describe('Plan Limits and Usage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('plus-user@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
  });

  test('should display plan limits and current usage', async ({ page }) => {
    await page.goto('/dashboard/account');
    await page.locator('[data-usage-tab]').click();

    await expect(page.locator('[data-plan-limits]')).toBeVisible();

    // Check usage display
    await expect(page.locator('[data-cover-letters-usage]')).toContainText(/∞|Unlimited/);
    await expect(page.locator('[data-job-suggestions-usage]')).toContainText(/100/);
  });

  test('should show approaching limit warning on Free plan', async ({ page }) => {
    // Login as Free user who used 2 out of 3 cover letters
    await page.goto('/auth/logout');
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('free-user-2-letters@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();

    await page.goto('/dashboard/cover-letter');

    // Should see limit warning
    await expect(page.locator('[data-limit-warning]')).toBeVisible();
    await expect(page.locator('[data-limit-warning]')).toContainText(/1 cover letter remaining/i);
    await expect(page.locator('[data-upgrade-button]')).toBeVisible();
  });
});

// ============================================================================
// Test Suite 15: Mobile Responsiveness
// ============================================================================

test.describe('Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('jobseeker@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
  });

  test('should display mobile-optimized pricing page', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.locator('[data-plan-comparison-table]')).toBeVisible();

    // Plans should be mobile-optimized (stacked or horizontal scroll)
    const planCards = page.locator('[data-plan-card]');
    await expect(planCards.first()).toBeVisible();

    // Features should be readable
    await expect(page.locator('[data-features-list]').first()).toBeVisible();

    // Buttons should be tappable
    const ctaButton = page.locator('[data-cta-button]').first();
    const box = await ctaButton.boundingBox();
    expect(box?.height).toBeGreaterThan(40); // Minimum tap target size
  });

  test('should complete checkout on mobile', async ({ page }) => {
    await page.goto('/pricing');

    await page.locator('[data-plan="plus"] [data-cta-button]').click();
    await page.locator('[data-continue-to-checkout-button]').click();

    // Stripe form should be mobile-responsive
    await expect(page.locator('[data-stripe-checkout-form]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-card-number-field]')).toBeVisible();
  });
});

// ============================================================================
// Test Suite 16: Accessibility
// ============================================================================

test.describe('Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('jobseeker@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
  });

  test('should navigate pricing page with keyboard', async ({ page }) => {
    await page.goto('/pricing');

    // Tab through plans
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to activate billing toggle with keyboard
    await page.locator('[data-billing-cycle="annual"]').focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-plan="plus"] [data-plan-price]')).toContainText('$190/year');

    // Should be able to activate upgrade buttons with Enter
    await page.locator('[data-plan="plus"] [data-cta-button]').focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('[data-plan-preview-modal]')).toBeVisible();
  });

  test('should have proper ARIA labels for screen readers', async ({ page }) => {
    await page.goto('/pricing');

    // Check for proper labels
    await expect(page.locator('[data-plan-comparison-table]')).toHaveAttribute('role', /table|region/);

    // Plan cards should have accessible names
    const plusPlan = page.locator('[data-plan="plus"]');
    const ariaLabel = await plusPlan.getAttribute('aria-label');
    expect(ariaLabel).toBeTruthy();
  });
});

// ============================================================================
// Test Suite 17: Error Handling
// ============================================================================

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('jobseeker@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
  });

  test('should handle Stripe API errors gracefully', async ({ page }) => {
    // Simulate Stripe checkout failure
    await page.goto('/pricing?stripe_error=true');

    await page.locator('[data-plan="plus"] [data-cta-button]').click();
    await page.locator('[data-continue-to-checkout-button]').click();

    // Should show error message
    await expect(page.locator('[data-stripe-error]')).toBeVisible();
    await expect(page.locator('[data-stripe-error]')).toContainText(/Unable to load checkout/i);
    await expect(page.locator('[data-retry-button]')).toBeVisible();
    await expect(page.locator('[data-contact-support-link]')).toBeVisible();
  });

  test('should handle network errors during upgrade', async ({ page }) => {
    // Simulate network error
    await page.route('**/api/subscriptions/checkout', route => route.abort());

    await page.goto('/pricing');
    await page.locator('[data-plan="plus"] [data-cta-button]').click();
    await page.locator('[data-continue-to-checkout-button]').click();

    // Should show network error
    await expect(page.locator('[data-network-error]')).toBeVisible();
    await expect(page.locator('[data-retry-button]')).toBeVisible();
  });
});

// ============================================================================
// Test Suite 18: Guest User Experience
// ============================================================================

test.describe('Guest User Pricing Page', () => {
  test('should display pricing page for non-logged-in users', async ({ page }) => {
    await page.goto('/pricing');

    // Should see all plans
    await expect(page.locator('[data-plan-comparison-table]')).toBeVisible();
    const planCards = page.locator('[data-plan-card]');
    await expect(planCards).toHaveCount(4);

    // CTAs should say "Sign Up" instead of "Upgrade"
    await expect(page.locator('[data-plan="plus"] [data-cta-button]')).toContainText(/Sign Up|Get Started/i);
  });

  test('should prompt guest to sign up when selecting plan', async ({ page }) => {
    await page.goto('/pricing');

    await page.locator('[data-plan="plus"] [data-cta-button]').click();

    // Should be redirected to sign up or login
    await expect(page).toHaveURL(/.*auth.*(login|signup)/);
  });

  test('should display social proof on pricing page', async ({ page }) => {
    await page.goto('/pricing');

    // Should see testimonials or user count
    await expect(page.locator('[data-social-proof]')).toBeVisible();
  });
});

// ============================================================================
// Test Suite 19: Discount Codes & Referrals
// ============================================================================

test.describe('Discount Codes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('jobseeker@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
  });

  test('should apply valid discount code at checkout', async ({ page }) => {
    await page.goto('/pricing');
    await page.locator('[data-plan="plus"] [data-cta-button]').click();
    await page.locator('[data-continue-to-checkout-button]').click();

    await expect(page.locator('[data-stripe-checkout-form]')).toBeVisible({ timeout: 10000 });

    // Enter discount code
    await page.locator('[data-discount-code-field]').fill('SAVE20');
    await page.locator('[data-apply-discount-button]').click();

    // Should show discounted price
    await expect(page.locator('[data-discounted-price]')).toBeVisible();
    await expect(page.locator('[data-discount-applied-badge]')).toContainText('SAVE20 applied');
  });

  test('should show error for invalid discount code', async ({ page }) => {
    await page.goto('/pricing');
    await page.locator('[data-plan="plus"] [data-cta-button]').click();
    await page.locator('[data-continue-to-checkout-button]').click();

    await expect(page.locator('[data-stripe-checkout-form]')).toBeVisible({ timeout: 10000 });

    await page.locator('[data-discount-code-field]').fill('INVALID123');
    await page.locator('[data-apply-discount-button]').click();

    await expect(page.locator('[data-discount-error]')).toContainText(/Invalid discount code/i);
  });
});

// ============================================================================
// Test Suite 20: Plan Recommendation
// ============================================================================

test.describe('Plan Recommendation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.locator('[data-email-input]').fill('jobseeker@test.com');
    await page.locator('[data-password-input]').fill('password123');
    await page.locator('[data-login-button]').click();
  });

  test('should offer plan recommendation quiz', async ({ page }) => {
    await page.goto('/pricing');

    await expect(page.locator('[data-help-me-choose-button]')).toBeVisible();

    await page.locator('[data-help-me-choose-button]').click();

    // Should show quiz or questionnaire
    await expect(page.locator('[data-plan-quiz]')).toBeVisible();
    await expect(page.locator('[data-quiz-question]')).toBeVisible();
  });

  test('should provide personalized plan recommendation', async ({ page }) => {
    await page.goto('/pricing');
    await page.locator('[data-help-me-choose-button]').click();

    // Answer quiz questions
    await page.locator('[data-quiz-answer="active-job-search"]').click();
    await page.locator('[data-quiz-next-button]').click();

    await page.locator('[data-quiz-answer="want-auto-apply"]').click();
    await page.locator('[data-quiz-submit-button]').click();

    // Should show recommendation
    await expect(page.locator('[data-recommended-plan]')).toBeVisible();
    await expect(page.locator('[data-recommendation-explanation]')).toBeVisible();
  });
});

// ============================================================================
// End of E2E Tests
// ============================================================================
