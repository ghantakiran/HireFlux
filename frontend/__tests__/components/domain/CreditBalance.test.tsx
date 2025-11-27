/**
 * CreditBalance Component Tests (Issue #94)
 *
 * TDD/BDD approach for credit usage visualization component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreditBalance } from '@/components/domain/CreditBalance';

describe('CreditBalance', () => {
  describe('Basic Rendering', () => {
    it('should render current credit balance', () => {
      render(<CreditBalance current={75} total={100} />);
      expect(screen.getByText(/75/)).toBeInTheDocument();
    });

    it('should render total credits', () => {
      render(<CreditBalance current={75} total={100} />);
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    it('should render as fraction format', () => {
      render(<CreditBalance current={75} total={100} />);
      expect(screen.getByText(/75.*\/.*100/)).toBeInTheDocument();
    });

    it('should render title when provided', () => {
      render(<CreditBalance current={75} total={100} title="Auto-Apply Credits" />);
      expect(screen.getByText('Auto-Apply Credits')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(<CreditBalance current={75} total={100} description="Credits refresh monthly" />);
      expect(screen.getByText('Credits refresh monthly')).toBeInTheDocument();
    });
  });

  describe('Visual Progress Bar', () => {
    it('should render progress bar', () => {
      const { container } = render(<CreditBalance current={75} total={100} />);
      const progressBar = container.querySelector('[data-credit-progress]');
      expect(progressBar).toBeInTheDocument();
    });

    it('should set correct progress percentage', () => {
      const { container } = render(<CreditBalance current={75} total={100} />);
      const progressFill = container.querySelector('[data-credit-fill]');
      expect(progressFill).toHaveStyle({ width: '75%' });
    });

    it('should handle 0% progress', () => {
      const { container } = render(<CreditBalance current={0} total={100} />);
      const progressFill = container.querySelector('[data-credit-fill]');
      expect(progressFill).toHaveStyle({ width: '0%' });
    });

    it('should handle 100% progress', () => {
      const { container } = render(<CreditBalance current={100} total={100} />);
      const progressFill = container.querySelector('[data-credit-fill]');
      expect(progressFill).toHaveStyle({ width: '100%' });
    });
  });

  describe('Color Coding Based on Balance', () => {
    it('should use green for high balance (>75%)', () => {
      const { container } = render(<CreditBalance current={80} total={100} />);
      const progressFill = container.querySelector('[data-credit-fill]');
      expect(progressFill).toHaveClass('bg-success-500');
    });

    it('should use amber for medium balance (25-75%)', () => {
      const { container } = render(<CreditBalance current={50} total={100} />);
      const progressFill = container.querySelector('[data-credit-fill]');
      expect(progressFill).toHaveClass('bg-accent-500');
    });

    it('should use red for low balance (<25%)', () => {
      const { container } = render(<CreditBalance current={20} total={100} />);
      const progressFill = container.querySelector('[data-credit-fill]');
      expect(progressFill).toHaveClass('bg-error');
    });

    it('should use amber for exactly 75%', () => {
      const { container } = render(<CreditBalance current={75} total={100} />);
      const progressFill = container.querySelector('[data-credit-fill]');
      expect(progressFill).toHaveClass('bg-accent-500');
    });

    it('should use amber for exactly 25%', () => {
      const { container } = render(<CreditBalance current={25} total={100} />);
      const progressFill = container.querySelector('[data-credit-fill]');
      expect(progressFill).toHaveClass('bg-accent-500');
    });
  });

  describe('Low Balance Warning', () => {
    it('should show warning message when balance is low', () => {
      render(<CreditBalance current={15} total={100} showWarning />);
      expect(screen.getByText(/low credit balance/i)).toBeInTheDocument();
    });

    it('should not show warning when balance is sufficient', () => {
      render(<CreditBalance current={50} total={100} showWarning />);
      expect(screen.queryByText(/low credit balance/i)).not.toBeInTheDocument();
    });

    it('should not show warning when showWarning is false', () => {
      render(<CreditBalance current={15} total={100} showWarning={false} />);
      expect(screen.queryByText(/low credit balance/i)).not.toBeInTheDocument();
    });

    it('should show custom warning threshold', () => {
      render(<CreditBalance current={35} total={100} showWarning warningThreshold={40} />);
      expect(screen.getByText(/low credit balance/i)).toBeInTheDocument();
    });
  });

  describe('Buy More Credits Action', () => {
    it('should render buy more button when onBuyMore provided', () => {
      render(<CreditBalance current={75} total={100} onBuyMore={() => {}} />);
      expect(screen.getByRole('button', { name: /buy more/i })).toBeInTheDocument();
    });

    it('should call onBuyMore when button clicked', async () => {
      const onBuyMore = jest.fn();
      render(<CreditBalance current={75} total={100} onBuyMore={onBuyMore} />);

      const button = screen.getByRole('button', { name: /buy more/i });
      await userEvent.click(button);

      expect(onBuyMore).toHaveBeenCalled();
    });

    it('should not render buy button when onBuyMore not provided', () => {
      render(<CreditBalance current={75} total={100} />);
      expect(screen.queryByRole('button', { name: /buy more/i })).not.toBeInTheDocument();
    });
  });

  describe('Renewal Information', () => {
    it('should render renewal date when provided', () => {
      const renewalDate = new Date('2024-02-01');
      render(<CreditBalance current={75} total={100} renewalDate={renewalDate} />);
      expect(screen.getByText(/renew/i)).toBeInTheDocument();
    });

    it('should format renewal date correctly', () => {
      const renewalDate = new Date('2024-02-01');
      render(<CreditBalance current={75} total={100} renewalDate={renewalDate} />);
      // Should show some form of date (exact format may vary)
      expect(screen.getByText(/feb/i)).toBeInTheDocument();
    });

    it('should not render renewal info when date not provided', () => {
      render(<CreditBalance current={75} total={100} />);
      expect(screen.queryByText(/renew/i)).not.toBeInTheDocument();
    });
  });

  describe('Usage Breakdown', () => {
    it('should render used credits when showUsed is true', () => {
      render(<CreditBalance current={75} total={100} showUsed />);
      expect(screen.getByText(/25.*used/i)).toBeInTheDocument();
    });

    it('should calculate used credits correctly', () => {
      render(<CreditBalance current={30} total={100} showUsed />);
      expect(screen.getByText(/70.*used/i)).toBeInTheDocument();
    });

    it('should not show used credits when showUsed is false', () => {
      render(<CreditBalance current={75} total={100} showUsed={false} />);
      expect(screen.queryByText(/used/i)).not.toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      const { container } = render(<CreditBalance current={75} total={100} variant="default" />);
      const creditBalance = container.querySelector('[data-credit-balance]');
      expect(creditBalance).toHaveAttribute('data-variant', 'default');
    });

    it('should render compact variant', () => {
      const { container } = render(<CreditBalance current={75} total={100} variant="compact" />);
      const creditBalance = container.querySelector('[data-credit-balance]');
      expect(creditBalance).toHaveAttribute('data-variant', 'compact');
    });

    it('should render card variant', () => {
      const { container } = render(<CreditBalance current={75} total={100} variant="card" />);
      const creditBalance = container.querySelector('[data-credit-balance]');
      expect(creditBalance).toHaveAttribute('data-variant', 'card');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label for progress bar', () => {
      const { container } = render(<CreditBalance current={75} total={100} />);
      const progressBar = container.querySelector('[data-credit-progress]');
      expect(progressBar).toHaveAttribute('aria-label');
      expect(progressBar?.getAttribute('aria-label')).toContain('75');
      expect(progressBar?.getAttribute('aria-label')).toContain('100');
    });

    it('should have role progressbar', () => {
      const { container } = render(<CreditBalance current={75} total={100} />);
      const progressBar = container.querySelector('[data-credit-progress]');
      expect(progressBar).toHaveAttribute('role', 'progressbar');
    });

    it('should have aria-valuenow', () => {
      const { container } = render(<CreditBalance current={75} total={100} />);
      const progressBar = container.querySelector('[data-credit-progress]');
      expect(progressBar).toHaveAttribute('aria-valuenow', '75');
    });

    it('should have aria-valuemax', () => {
      const { container } = render(<CreditBalance current={75} total={100} />);
      const progressBar = container.querySelector('[data-credit-progress]');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should have proper heading level when title provided', () => {
      render(<CreditBalance current={75} total={100} title="Credits" />);
      const heading = screen.getByRole('heading', { name: 'Credits' });
      expect(heading).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle 0 current credits', () => {
      render(<CreditBalance current={0} total={100} />);
      expect(screen.getByText(/0.*\/.*100/)).toBeInTheDocument();
    });

    it('should handle 0 total credits', () => {
      render(<CreditBalance current={0} total={0} />);
      expect(screen.getByText(/0.*\/.*0/)).toBeInTheDocument();
    });

    it('should handle current > total gracefully', () => {
      render(<CreditBalance current={150} total={100} />);
      // Should clamp to 100%
      const { container } = render(<CreditBalance current={150} total={100} />);
      const progressFill = container.querySelector('[data-credit-fill]');
      expect(progressFill).toHaveStyle({ width: '100%' });
    });

    it('should handle negative current gracefully', () => {
      render(<CreditBalance current={-10} total={100} />);
      expect(screen.getByText(/0.*\/.*100/)).toBeInTheDocument();
    });

    it('should handle very large numbers', () => {
      render(<CreditBalance current={9999} total={10000} />);
      expect(screen.getByText(/9,999/)).toBeInTheDocument();
      expect(screen.getByText(/10,000/)).toBeInTheDocument();
    });

    it('should format large numbers with commas', () => {
      render(<CreditBalance current={1234} total={5000} />);
      expect(screen.getByText(/1,234/)).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state when loading prop is true', () => {
      render(<CreditBalance current={75} total={100} loading />);
      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    });

    it('should hide credit info when loading', () => {
      render(<CreditBalance current={75} total={100} loading />);
      // Credits should be hidden or showing skeleton
      const creditText = screen.queryByText(/75.*\/.*100/);
      // Either not present or has loading styling
      if (creditText) {
        expect(creditText.parentElement).toHaveClass('opacity-50');
      }
    });
  });
});
