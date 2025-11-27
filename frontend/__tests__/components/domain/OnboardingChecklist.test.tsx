/**
 * OnboardingChecklist Component Tests (Issue #94)
 *
 * TDD/BDD approach for onboarding progress tracking component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingChecklist } from '@/components/domain/OnboardingChecklist';

const mockSteps = [
  {
    id: '1',
    title: 'Create your profile',
    description: 'Add your basic information',
    completed: true,
  },
  {
    id: '2',
    title: 'Upload your resume',
    description: 'Help us understand your experience',
    completed: true,
  },
  {
    id: '3',
    title: 'Set job preferences',
    description: 'Tell us what you are looking for',
    completed: false,
  },
  {
    id: '4',
    title: 'Apply to your first job',
    description: 'Start your job search journey',
    completed: false,
  },
];

describe('OnboardingChecklist', () => {
  describe('Basic Rendering', () => {
    it('should render all steps', () => {
      render(<OnboardingChecklist steps={mockSteps} />);
      expect(screen.getByText('Create your profile')).toBeInTheDocument();
      expect(screen.getByText('Upload your resume')).toBeInTheDocument();
      expect(screen.getByText('Set job preferences')).toBeInTheDocument();
      expect(screen.getByText('Apply to your first job')).toBeInTheDocument();
    });

    it('should render step descriptions', () => {
      render(<OnboardingChecklist steps={mockSteps} />);
      expect(screen.getByText('Add your basic information')).toBeInTheDocument();
      expect(screen.getByText('Help us understand your experience')).toBeInTheDocument();
    });

    it('should render checklist title when provided', () => {
      render(<OnboardingChecklist steps={mockSteps} title="Get Started" />);
      expect(screen.getByText('Get Started')).toBeInTheDocument();
    });
  });

  describe('Progress Display', () => {
    it('should show correct progress percentage', () => {
      render(<OnboardingChecklist steps={mockSteps} />);
      // 2 out of 4 steps completed = 50%
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });

    it('should show progress bar', () => {
      const { container } = render(<OnboardingChecklist steps={mockSteps} />);
      const progressBar = container.querySelector('[data-progress-bar]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should set progress bar width correctly', () => {
      const { container } = render(<OnboardingChecklist steps={mockSteps} />);
      const progressFill = container.querySelector('[data-progress-fill]');
      expect(progressFill).toHaveStyle({ width: '50%' });
    });

    it('should show 0% when no steps completed', () => {
      const incompleteSteps = mockSteps.map((s) => ({ ...s, completed: false }));
      render(<OnboardingChecklist steps={incompleteSteps} />);
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });

    it('should show 100% when all steps completed', () => {
      const completedSteps = mockSteps.map((s) => ({ ...s, completed: true }));
      render(<OnboardingChecklist steps={completedSteps} />);
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });

    it('should show completion message when all steps done', () => {
      const completedSteps = mockSteps.map((s) => ({ ...s, completed: true }));
      render(<OnboardingChecklist steps={completedSteps} />);
      expect(screen.getByText(/all set/i)).toBeInTheDocument();
    });
  });

  describe('Step Status Indicators', () => {
    it('should show checkmark for completed steps', () => {
      const { container } = render(<OnboardingChecklist steps={mockSteps} />);
      const completedIndicators = container.querySelectorAll('[data-step-completed="true"]');
      expect(completedIndicators.length).toBe(2);
    });

    it('should show empty circle for incomplete steps', () => {
      const { container } = render(<OnboardingChecklist steps={mockSteps} />);
      const incompleteIndicators = container.querySelectorAll('[data-step-completed="false"]');
      expect(incompleteIndicators.length).toBe(2);
    });

    it('should apply completed styling to completed steps', () => {
      const { container } = render(<OnboardingChecklist steps={mockSteps} />);
      const firstStep = container.querySelector('[data-step-id="1"]');
      expect(firstStep).toHaveClass('opacity-75');
    });

    it('should apply active styling to incomplete steps', () => {
      const { container } = render(<OnboardingChecklist steps={mockSteps} />);
      const thirdStep = container.querySelector('[data-step-id="3"]');
      expect(thirdStep).not.toHaveClass('opacity-75');
    });
  });

  describe('Step Actions', () => {
    it('should render action button when provided', () => {
      const stepsWithAction = [
        {
          ...mockSteps[2],
          actionLabel: 'Set Preferences',
        },
      ];
      render(<OnboardingChecklist steps={stepsWithAction} />);
      expect(screen.getByRole('button', { name: /set preferences/i })).toBeInTheDocument();
    });

    it('should call onStepAction when action button clicked', async () => {
      const onStepAction = jest.fn();
      const stepsWithAction = [
        {
          ...mockSteps[2],
          actionLabel: 'Set Preferences',
        },
      ];
      render(<OnboardingChecklist steps={stepsWithAction} onStepAction={onStepAction} />);

      const button = screen.getByRole('button', { name: /set preferences/i });
      await userEvent.click(button);

      expect(onStepAction).toHaveBeenCalledWith('3');
    });

    it('should not show action button for completed steps', () => {
      const stepsWithAction = [
        {
          ...mockSteps[0],
          actionLabel: 'Complete',
        },
      ];
      render(<OnboardingChecklist steps={stepsWithAction} />);
      expect(screen.queryByRole('button', { name: /complete/i })).not.toBeInTheDocument();
    });
  });

  describe('Step Click Functionality', () => {
    it('should call onStepClick when step is clicked', async () => {
      const onStepClick = jest.fn();
      render(<OnboardingChecklist steps={mockSteps} onStepClick={onStepClick} />);

      const step = screen.getByText('Set job preferences');
      await userEvent.click(step);

      expect(onStepClick).toHaveBeenCalledWith('3');
    });

    it('should not call onStepClick for completed steps', async () => {
      const onStepClick = jest.fn();
      render(<OnboardingChecklist steps={mockSteps} onStepClick={onStepClick} />);

      const completedStep = screen.getByText('Create your profile');
      await userEvent.click(completedStep);

      expect(onStepClick).not.toHaveBeenCalled();
    });

    it('should have hover state for clickable incomplete steps', () => {
      const { container } = render(<OnboardingChecklist steps={mockSteps} onStepClick={() => {}} />);
      const thirdStep = container.querySelector('[data-step-id="3"]');
      expect(thirdStep).toHaveClass('cursor-pointer');
    });
  });

  describe('Collapsible Functionality', () => {
    it('should collapse checklist when collapse button clicked', async () => {
      render(<OnboardingChecklist steps={mockSteps} collapsible />);

      const collapseButton = screen.getByRole('button', { name: /hide/i });
      await userEvent.click(collapseButton);

      // Steps should be hidden
      expect(screen.queryByText('Create your profile')).not.toBeVisible();
    });

    it('should expand checklist when expand button clicked', async () => {
      render(<OnboardingChecklist steps={mockSteps} collapsible />);

      const collapseButton = screen.getByRole('button', { name: /hide/i });
      await userEvent.click(collapseButton);

      const expandButton = screen.getByRole('button', { name: /show/i });
      await userEvent.click(expandButton);

      // Steps should be visible again
      expect(screen.getByText('Create your profile')).toBeVisible();
    });

    it('should not show collapse button when collapsible is false', () => {
      render(<OnboardingChecklist steps={mockSteps} collapsible={false} />);
      expect(screen.queryByRole('button', { name: /hide/i })).not.toBeInTheDocument();
    });
  });

  describe('Dismiss Functionality', () => {
    it('should render dismiss button when onDismiss provided', () => {
      render(<OnboardingChecklist steps={mockSteps} onDismiss={() => {}} />);
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      expect(dismissButton).toBeInTheDocument();
    });

    it('should call onDismiss when dismiss button clicked', async () => {
      const onDismiss = jest.fn();
      render(<OnboardingChecklist steps={mockSteps} onDismiss={onDismiss} />);

      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await userEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      const { container } = render(<OnboardingChecklist steps={mockSteps} variant="default" />);
      const checklist = container.querySelector('[data-onboarding-checklist]');
      expect(checklist).toHaveAttribute('data-variant', 'default');
    });

    it('should render compact variant', () => {
      const { container } = render(<OnboardingChecklist steps={mockSteps} variant="compact" />);
      const checklist = container.querySelector('[data-onboarding-checklist]');
      expect(checklist).toHaveAttribute('data-variant', 'compact');
    });

    it('should render card variant', () => {
      const { container } = render(<OnboardingChecklist steps={mockSteps} variant="card" />);
      const checklist = container.querySelector('[data-onboarding-checklist]');
      expect(checklist).toHaveAttribute('data-variant', 'card');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role for checklist', () => {
      const { container } = render(<OnboardingChecklist steps={mockSteps} />);
      const checklist = container.querySelector('[data-onboarding-checklist]');
      expect(checklist).toHaveAttribute('role', 'region');
    });

    it('should have proper aria-label for progress', () => {
      const { container } = render(<OnboardingChecklist steps={mockSteps} />);
      const progress = container.querySelector('[data-progress-bar]');
      expect(progress).toHaveAttribute('aria-label', 'Onboarding progress: 50%');
    });

    it('should have keyboard accessible step actions', async () => {
      const onStepAction = jest.fn();
      const stepsWithAction = [
        {
          ...mockSteps[2],
          actionLabel: 'Set Preferences',
        },
      ];
      render(<OnboardingChecklist steps={stepsWithAction} onStepAction={onStepAction} />);

      const button = screen.getByRole('button', { name: /set preferences/i });
      button.focus();

      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });

      expect(onStepAction).toHaveBeenCalled();
    });

    it('should have proper heading level', () => {
      render(<OnboardingChecklist steps={mockSteps} title="Get Started" />);
      const heading = screen.getByRole('heading', { name: 'Get Started' });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H3');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty steps array', () => {
      render(<OnboardingChecklist steps={[]} />);
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });

    it('should handle single step', () => {
      const singleStep = [mockSteps[0]];
      render(<OnboardingChecklist steps={singleStep} />);
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });

    it('should handle very long step titles', () => {
      const longTitleStep = {
        ...mockSteps[0],
        title: 'A'.repeat(200),
      };
      render(<OnboardingChecklist steps={[longTitleStep]} />);
      expect(screen.getByText('A'.repeat(200))).toBeInTheDocument();
    });

    it('should handle missing descriptions', () => {
      const stepWithoutDesc = [
        {
          id: '1',
          title: 'Step 1',
          completed: false,
        },
      ];
      render(<OnboardingChecklist steps={stepWithoutDesc} />);
      expect(screen.getByText('Step 1')).toBeInTheDocument();
    });

    it('should handle many steps', () => {
      const manySteps = Array.from({ length: 20 }, (_, i) => ({
        id: String(i + 1),
        title: `Step ${i + 1}`,
        completed: i < 10,
      }));
      render(<OnboardingChecklist steps={manySteps} />);
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });
  });
});
