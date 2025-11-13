/**
 * Tests for EmployerRegistration Component - Sprint 19-20 Week 39 Day 2
 * Following TDD approach: Write tests first, then implement component
 *
 * Registration Flow:
 * 1. Email entry → domain auto-detect
 * 2. Email verification (6-digit code)
 * 3. Password creation
 * 4. Company details (name, industry, size, location, website, logo)
 * 5. Plan selection
 * 6. Payment info (if paid plan)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { EmployerRegistration } from '@/components/employer/EmployerRegistration';

describe('EmployerRegistration Component', () => {
  const mockOnComplete = jest.fn();
  const mockOnStepChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // Rendering Tests
  // ========================================================================

  it('should render email input as first step', () => {
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    expect(screen.getByRole('heading', { name: /create.*company account/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/company email/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument();
  });

  it('should show progress indicator', () => {
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    expect(screen.getByText(/step 1 of 6/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Email Entry Tests (Step 1)
  // ========================================================================

  it('should validate email format', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    const emailInput = screen.getByLabelText(/company email/i);

    // Invalid email
    await user.type(emailInput, 'invalid-email');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
  });

  it('should detect company domain from email', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    const emailInput = screen.getByLabelText(/company email/i);
    await user.type(emailInput, 'john@acmecorp.com');

    // Domain should be extracted
    await waitFor(() => {
      expect(screen.getByText(/acmecorp\.com/i)).toBeInTheDocument();
    });
  });

  it('should warn about personal email domains', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    const emailInput = screen.getByLabelText(/company email/i);
    await user.type(emailInput, 'john@gmail.com');

    await waitFor(() => {
      expect(screen.getByText(/personal email.*company email/i)).toBeInTheDocument();
    });
  });

  it('should proceed to verification step on valid email', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    const emailInput = screen.getByLabelText(/company email/i);
    await user.type(emailInput, 'hiring@techcorp.com');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/verification code/i)).toBeInTheDocument();
      expect(screen.getByText(/step 2 of 6/i)).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Email Verification Tests (Step 2)
  // ========================================================================

  it('should render 6-digit code input', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    // Navigate to step 2
    await user.type(screen.getByLabelText(/company email/i), 'test@company.com');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      const codeInputs = screen.getAllByRole('textbox', { name: /digit/i });
      expect(codeInputs).toHaveLength(6);
    });
  });

  it('should auto-focus next digit on input', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    // Navigate to step 2
    await user.type(screen.getByLabelText(/company email/i), 'test@company.com');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(async () => {
      const codeInputs = screen.getAllByRole('textbox', { name: /digit/i });

      await user.type(codeInputs[0], '1');
      expect(codeInputs[1]).toHaveFocus();
    });
  });

  it('should allow resending verification code', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    // Navigate to step 2
    await user.type(screen.getByLabelText(/company email/i), 'test@company.com');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /resend code/i })).toBeInTheDocument();
    });
  });

  it('should validate 6-digit code', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    // Navigate to step 2
    await user.type(screen.getByLabelText(/company email/i), 'test@company.com');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(async () => {
      const codeInputs = screen.getAllByRole('textbox', { name: /digit/i });

      // Enter valid code
      for (let i = 0; i < 6; i++) {
        await user.type(codeInputs[i], '1');
      }

      // Should auto-verify
      expect(screen.getByText(/verifying/i)).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Password Creation Tests (Step 3)
  // ========================================================================

  it('should render password fields', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    // Navigate to step 3 (email + verification)
    await navigateToPasswordStep(user);

    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('should show password strength indicator', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    await navigateToPasswordStep(user);

    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'weak');

    expect(screen.getByText(/weak/i)).toBeInTheDocument();

    await user.clear(passwordInput);
    await user.type(passwordInput, 'StrongP@ssw0rd123');

    expect(screen.getByText(/strong/i)).toBeInTheDocument();
  });

  it('should validate password requirements', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    await navigateToPasswordStep(user);

    const passwordInput = screen.getByLabelText(/^password$/i);
    await user.type(passwordInput, 'short');

    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
  });

  it('should validate password confirmation', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    await navigateToPasswordStep(user);

    await user.type(screen.getByLabelText(/^password$/i), 'StrongP@ssw0rd123');
    await user.type(screen.getByLabelText(/confirm password/i), 'DifferentPassword');

    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByText(/passwords.*match/i)).toBeInTheDocument();
  });

  it('should toggle password visibility', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    await navigateToPasswordStep(user);

    const passwordInput = screen.getByLabelText(/^password$/i);
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    await user.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  // ========================================================================
  // Company Details Tests (Step 4)
  // ========================================================================

  it('should render company details form', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    await navigateToCompanyDetailsStep(user);

    expect(screen.getByLabelText(/company name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/industry/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/company size/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/website/i)).toBeInTheDocument();
  });

  it('should pre-fill company name from email domain', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    // Use email with clear company name
    await user.type(screen.getByLabelText(/company email/i), 'hiring@techcorp.com');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Skip verification for this test
    // ... navigate to company details

    await navigateToCompanyDetailsStep(user);

    const companyNameInput = screen.getByLabelText(/company name/i);
    expect(companyNameInput).toHaveValue(/techcorp/i);
  });

  it('should provide industry dropdown options', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    await navigateToCompanyDetailsStep(user);

    const industrySelect = screen.getByLabelText(/industry/i);
    await user.click(industrySelect);

    // Common industries
    expect(screen.getByRole('option', { name: /technology/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /healthcare/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /finance/i })).toBeInTheDocument();
  });

  it('should provide company size options', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    await navigateToCompanyDetailsStep(user);

    const sizeSelect = screen.getByLabelText(/company size/i);
    await user.click(sizeSelect);

    expect(screen.getByRole('option', { name: /1-10/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /11-50/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /501\+/i })).toBeInTheDocument();
  });

  it('should allow logo upload', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    await navigateToCompanyDetailsStep(user);

    const logoInput = screen.getByLabelText(/company logo/i);
    expect(logoInput).toHaveAttribute('type', 'file');
    expect(logoInput).toHaveAttribute('accept', /image/i);
  });

  it('should validate website URL format', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    await navigateToCompanyDetailsStep(user);

    const websiteInput = screen.getByLabelText(/website/i);
    await user.type(websiteInput, 'invalid-url');

    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(screen.getByText(/valid url/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Plan Selection Tests (Step 5)
  // ========================================================================

  it('should display all plan tiers', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    await navigateToPlanSelectionStep(user);

    expect(screen.getByRole('heading', { name: /starter/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /growth/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /professional/i })).toBeInTheDocument();
  });

  it('should show plan pricing', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    await navigateToPlanSelectionStep(user);

    expect(screen.getByText(/free/i)).toBeInTheDocument();
    expect(screen.getByText(/\$99.*month/i)).toBeInTheDocument();
    expect(screen.getByText(/\$299.*month/i)).toBeInTheDocument();
  });

  it('should highlight recommended plan', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    await navigateToPlanSelectionStep(user);

    expect(screen.getByText(/recommended/i)).toBeInTheDocument();
  });

  it('should allow plan selection', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    await navigateToPlanSelectionStep(user);

    const growthPlan = screen.getByRole('button', { name: /select.*growth/i });
    await user.click(growthPlan);

    expect(growthPlan).toHaveClass(/selected|active/i);
  });

  it('should skip payment for free plan', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    await navigateToPlanSelectionStep(user);

    const starterPlan = screen.getByRole('button', { name: /select.*starter/i });
    await user.click(starterPlan);
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled();
    });
  });

  it('should show payment form for paid plans', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    await navigateToPlanSelectionStep(user);

    const growthPlan = screen.getByRole('button', { name: /select.*growth/i });
    await user.click(growthPlan);
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/payment information/i)).toBeInTheDocument();
      expect(screen.getByText(/step 6 of 6/i)).toBeInTheDocument();
    });
  });

  // ========================================================================
  // Navigation Tests
  // ========================================================================

  it('should allow going back to previous step', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    await navigateToPasswordStep(user);

    const backButton = screen.getByRole('button', { name: /back/i });
    await user.click(backButton);

    expect(screen.getByText(/step 2 of 6/i)).toBeInTheDocument();
  });

  it('should preserve form data when navigating back', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    const email = 'test@company.com';
    await user.type(screen.getByLabelText(/company email/i), email);
    await user.click(screen.getByRole('button', { name: /continue/i }));

    // Go forward then back
    await user.click(screen.getByRole('button', { name: /back/i }));

    const emailInput = screen.getByLabelText(/company email/i);
    expect(emailInput).toHaveValue(email);
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  it('should have accessible form labels', () => {
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    const emailInput = screen.getByLabelText(/company email/i);
    expect(emailInput).toHaveAccessibleName();
  });

  it('should announce step changes to screen readers', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    await user.type(screen.getByLabelText(/company email/i), 'test@company.com');
    await user.click(screen.getByRole('button', { name: /continue/i }));

    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status).toBeInTheDocument();
    });
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    const emailInput = screen.getByLabelText(/company email/i);

    // Tab to input
    await user.tab();
    expect(emailInput).toHaveFocus();

    // Tab to continue button
    await user.tab();
    expect(screen.getByRole('button', { name: /continue/i })).toHaveFocus();
  });

  // ========================================================================
  // Error Handling Tests
  // ========================================================================

  it('should handle API errors gracefully', async () => {
    const user = userEvent.setup();
    render(
      <EmployerRegistration
        onComplete={mockOnComplete}
        onError={jest.fn()}
      />
    );

    // Mock API failure
    // ... trigger error condition

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('should show retry option on error', async () => {
    const user = userEvent.setup();
    render(<EmployerRegistration onComplete={mockOnComplete} />);

    // Trigger error
    // ...

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });
});

// ========================================================================
// Helper Functions
// ========================================================================

async function navigateToPasswordStep(user: ReturnType<typeof userEvent.setup>) {
  // Step 1: Email
  await user.type(screen.getByLabelText(/company email/i), 'test@company.com');
  await user.click(screen.getByRole('button', { name: /continue/i }));

  // Step 2: Verification (mock auto-pass)
  await waitFor(() => {
    expect(screen.getByText(/step 3 of 6/i)).toBeInTheDocument();
  });
}

async function navigateToCompanyDetailsStep(user: ReturnType<typeof userEvent.setup>) {
  await navigateToPasswordStep(user);

  // Step 3: Password
  await user.type(screen.getByLabelText(/^password$/i), 'StrongP@ssw0rd123');
  await user.type(screen.getByLabelText(/confirm password/i), 'StrongP@ssw0rd123');
  await user.click(screen.getByRole('button', { name: /continue/i }));

  await waitFor(() => {
    expect(screen.getByText(/step 4 of 6/i)).toBeInTheDocument();
  });
}

async function navigateToPlanSelectionStep(user: ReturnType<typeof userEvent.setup>) {
  await navigateToCompanyDetailsStep(user);

  // Step 4: Company Details
  await user.type(screen.getByLabelText(/company name/i), 'Tech Corp');
  await user.click(screen.getByLabelText(/industry/i));
  await user.click(screen.getByRole('option', { name: /technology/i }));
  await user.click(screen.getByLabelText(/company size/i));
  await user.click(screen.getByRole('option', { name: /11-50/i }));
  await user.type(screen.getByLabelText(/location/i), 'San Francisco, CA');
  await user.type(screen.getByLabelText(/website/i), 'https://techcorp.com');
  await user.click(screen.getByRole('button', { name: /continue/i }));

  await waitFor(() => {
    expect(screen.getByText(/step 5 of 6/i)).toBeInTheDocument();
  });
}
