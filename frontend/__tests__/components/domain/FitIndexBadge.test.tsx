/**
 * FitIndexBadge Component Tests (Issue #94)
 *
 * TDD/BDD approach for domain-specific component
 */

import { render, screen } from '@testing-library/react';
import { FitIndexBadge } from '@/components/domain/FitIndexBadge';

describe('FitIndexBadge', () => {
  describe('Score Display', () => {
    it('should display the correct score', () => {
      render(<FitIndexBadge score={87} />);
      expect(screen.getByText(/87/)).toBeInTheDocument();
    });

    it('should display percentage symbol', () => {
      render(<FitIndexBadge score={87} showLabel />);
      expect(screen.getByText(/87%/)).toBeInTheDocument();
    });
  });

  describe('Color Coding', () => {
    it('should use dark green for 90-100 (Excellent Fit)', () => {
      const { container } = render(<FitIndexBadge score={95} />);
      const badge = container.querySelector('[data-fit-index]');
      expect(badge).toHaveClass('bg-success-700'); // Dark green
    });

    it('should use green for 75-89 (Great Fit)', () => {
      const { container } = render(<FitIndexBadge score={82} />);
      const badge = container.querySelector('[data-fit-index]');
      expect(badge).toHaveClass('bg-success-500'); // Green
    });

    it('should use amber for 60-74 (Good Fit)', () => {
      const { container } = render(<FitIndexBadge score={67} />);
      const badge = container.querySelector('[data-fit-index]');
      expect(badge).toHaveClass('bg-accent-500'); // Amber
    });

    it('should use orange for 40-59 (Moderate Fit)', () => {
      const { container } = render(<FitIndexBadge score={48} />);
      const badge = container.querySelector('[data-fit-index]');
      expect(badge).toHaveClass('bg-warning'); // Orange
    });

    it('should use red for 0-39 (Low Fit)', () => {
      const { container } = render(<FitIndexBadge score={23} />);
      const badge = container.querySelector('[data-fit-index]');
      expect(badge).toHaveClass('bg-error'); // Red
    });
  });

  describe('Sizes', () => {
    it('should render small size', () => {
      const { container } = render(<FitIndexBadge score={87} size="sm" />);
      const badge = container.querySelector('[data-fit-index]');
      expect(badge).toHaveClass('text-xs');
    });

    it('should render medium size (default)', () => {
      const { container } = render(<FitIndexBadge score={87} />);
      const badge = container.querySelector('[data-fit-index]');
      expect(badge).toHaveClass('text-sm');
    });

    it('should render large size', () => {
      const { container } = render(<FitIndexBadge score={87} size="lg" />);
      const badge = container.querySelector('[data-fit-index]');
      expect(badge).toHaveClass('text-base');
    });
  });

  describe('Labels', () => {
    it('should show label when showLabel is true', () => {
      render(<FitIndexBadge score={95} showLabel />);
      expect(screen.getByText(/Excellent Fit/i)).toBeInTheDocument();
    });

    it('should not show label by default', () => {
      render(<FitIndexBadge score={95} />);
      expect(screen.queryByText(/Excellent Fit/i)).not.toBeInTheDocument();
    });

    it('should show correct label for each range', () => {
      const { rerender } = render(<FitIndexBadge score={95} showLabel />);
      expect(screen.getByText(/Excellent Fit/i)).toBeInTheDocument();

      rerender(<FitIndexBadge score={82} showLabel />);
      expect(screen.getByText(/Great Fit/i)).toBeInTheDocument();

      rerender(<FitIndexBadge score={67} showLabel />);
      expect(screen.getByText(/Good Fit/i)).toBeInTheDocument();

      rerender(<FitIndexBadge score={48} showLabel />);
      expect(screen.getByText(/Moderate Fit/i)).toBeInTheDocument();

      rerender(<FitIndexBadge score={23} showLabel />);
      expect(screen.getByText(/Low Fit/i)).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should support job-seeker variant', () => {
      const { container } = render(<FitIndexBadge score={87} variant="job-seeker" />);
      const badge = container.querySelector('[data-fit-index]');
      expect(badge).toHaveAttribute('data-variant', 'job-seeker');
    });

    it('should support employer variant', () => {
      const { container } = render(<FitIndexBadge score={87} variant="employer" />);
      const badge = container.querySelector('[data-fit-index]');
      expect(badge).toHaveAttribute('data-variant', 'employer');
    });
  });

  describe('Accessibility', () => {
    it('should have aria-label with score', () => {
      const { container } = render(<FitIndexBadge score={87} />);
      const badge = container.querySelector('[data-fit-index]');
      expect(badge).toHaveAttribute('aria-label');
      expect(badge?.getAttribute('aria-label')).toContain('87');
    });

    it('should have role attribute', () => {
      const { container } = render(<FitIndexBadge score={87} />);
      const badge = container.querySelector('[data-fit-index]');
      expect(badge).toHaveAttribute('role', 'status');
    });
  });

  describe('Edge Cases', () => {
    it('should handle score of 0', () => {
      render(<FitIndexBadge score={0} />);
      expect(screen.getByText(/0/)).toBeInTheDocument();
    });

    it('should handle score of 100', () => {
      render(<FitIndexBadge score={100} />);
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    it('should clamp scores above 100', () => {
      render(<FitIndexBadge score={150} />);
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });

    it('should clamp negative scores', () => {
      render(<FitIndexBadge score={-10} />);
      expect(screen.getByText(/0/)).toBeInTheDocument();
    });
  });
});
