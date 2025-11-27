/**
 * EmptyState Component Tests (Issue #94)
 *
 * TDD/BDD approach for empty state placeholder component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '@/components/domain/EmptyState';

describe('EmptyState', () => {
  describe('Basic Rendering', () => {
    it('should render title', () => {
      render(<EmptyState title="No jobs found" />);
      expect(screen.getByText('No jobs found')).toBeInTheDocument();
    });

    it('should render description when provided', () => {
      render(
        <EmptyState
          title="No applications yet"
          description="Start applying to jobs to see your applications here"
        />
      );
      expect(screen.getByText(/Start applying to jobs/)).toBeInTheDocument();
    });

    it('should not render description when not provided', () => {
      const { container } = render(<EmptyState title="No data" />);
      const description = container.querySelector('[data-empty-state-description]');
      expect(description).not.toBeInTheDocument();
    });
  });

  describe('Icon Display', () => {
    it('should render default icon when no custom icon provided', () => {
      const { container } = render(<EmptyState title="No data" />);
      const icon = container.querySelector('[data-empty-state-icon]');
      expect(icon).toBeInTheDocument();
    });

    it('should render custom icon when provided', () => {
      const CustomIcon = () => <div data-testid="custom-icon">Custom</div>;
      render(<EmptyState title="No data" icon={<CustomIcon />} />);
      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });

    it('should not render icon when showIcon is false', () => {
      const { container } = render(<EmptyState title="No data" showIcon={false} />);
      const icon = container.querySelector('[data-empty-state-icon]');
      expect(icon).not.toBeInTheDocument();
    });
  });

  describe('Action Button', () => {
    it('should render action button when provided', () => {
      render(
        <EmptyState
          title="No jobs"
          actionLabel="Browse Jobs"
          onAction={() => {}}
        />
      );
      expect(screen.getByRole('button', { name: /browse jobs/i })).toBeInTheDocument();
    });

    it('should not render action button when not provided', () => {
      render(<EmptyState title="No data" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('should call onAction when action button clicked', async () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="No jobs"
          actionLabel="Browse Jobs"
          onAction={onAction}
        />
      );

      const button = screen.getByRole('button', { name: /browse jobs/i });
      await userEvent.click(button);

      expect(onAction).toHaveBeenCalledTimes(1);
    });

    it('should disable action button when disabled prop is true', () => {
      render(
        <EmptyState
          title="No jobs"
          actionLabel="Browse Jobs"
          onAction={() => {}}
          actionDisabled
        />
      );

      const button = screen.getByRole('button', { name: /browse jobs/i });
      expect(button).toBeDisabled();
    });
  });

  describe('Secondary Action', () => {
    it('should render secondary action when provided', () => {
      render(
        <EmptyState
          title="No jobs"
          actionLabel="Browse Jobs"
          onAction={() => {}}
          secondaryActionLabel="Learn More"
          onSecondaryAction={() => {}}
        />
      );
      expect(screen.getByRole('button', { name: /learn more/i })).toBeInTheDocument();
    });

    it('should call onSecondaryAction when secondary button clicked', async () => {
      const onSecondaryAction = jest.fn();
      render(
        <EmptyState
          title="No jobs"
          secondaryActionLabel="Learn More"
          onSecondaryAction={onSecondaryAction}
        />
      );

      const button = screen.getByRole('button', { name: /learn more/i });
      await userEvent.click(button);

      expect(onSecondaryAction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Variants', () => {
    it('should render default variant', () => {
      const { container } = render(<EmptyState title="No data" variant="default" />);
      const wrapper = container.querySelector('[data-empty-state]');
      expect(wrapper).toHaveAttribute('data-variant', 'default');
    });

    it('should render compact variant', () => {
      const { container } = render(<EmptyState title="No data" variant="compact" />);
      const wrapper = container.querySelector('[data-empty-state]');
      expect(wrapper).toHaveAttribute('data-variant', 'compact');
    });

    it('should render card variant', () => {
      const { container } = render(<EmptyState title="No data" variant="card" />);
      const wrapper = container.querySelector('[data-empty-state]');
      expect(wrapper).toHaveAttribute('data-variant', 'card');
    });
  });

  describe('States', () => {
    it('should render error state', () => {
      const { container } = render(<EmptyState title="Error loading data" state="error" />);
      const wrapper = container.querySelector('[data-empty-state]');
      expect(wrapper).toHaveAttribute('data-state', 'error');
    });

    it('should render success state', () => {
      const { container } = render(<EmptyState title="All done!" state="success" />);
      const wrapper = container.querySelector('[data-empty-state]');
      expect(wrapper).toHaveAttribute('data-state', 'success');
    });

    it('should render info state (default)', () => {
      const { container } = render(<EmptyState title="No data" state="info" />);
      const wrapper = container.querySelector('[data-empty-state]');
      expect(wrapper).toHaveAttribute('data-state', 'info');
    });

    it('should render warning state', () => {
      const { container } = render(<EmptyState title="Almost there" state="warning" />);
      const wrapper = container.querySelector('[data-empty-state]');
      expect(wrapper).toHaveAttribute('data-state', 'warning');
    });
  });

  describe('Custom Content', () => {
    it('should render custom children content', () => {
      render(
        <EmptyState title="Custom">
          <div data-testid="custom-content">Custom content here</div>
        </EmptyState>
      );
      expect(screen.getByTestId('custom-content')).toBeInTheDocument();
    });

    it('should render children below description', () => {
      const { container } = render(
        <EmptyState title="Title" description="Description">
          <div data-testid="custom-content">Custom</div>
        </EmptyState>
      );

      const description = screen.getByText('Description');
      const customContent = screen.getByTestId('custom-content');

      // Custom content should be after description in DOM order
      expect(description.compareDocumentPosition(customContent) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role for container', () => {
      const { container } = render(<EmptyState title="No data" />);
      const wrapper = container.querySelector('[data-empty-state]');
      expect(wrapper).toHaveAttribute('role', 'status');
    });

    it('should have proper heading level', () => {
      render(<EmptyState title="No data" />);
      const heading = screen.getByRole('heading', { name: 'No data' });
      expect(heading).toBeInTheDocument();
      expect(heading.tagName).toBe('H3');
    });

    it('should have keyboard accessible action button', async () => {
      const onAction = jest.fn();
      render(
        <EmptyState
          title="No jobs"
          actionLabel="Browse Jobs"
          onAction={onAction}
        />
      );

      const button = screen.getByRole('button', { name: /browse jobs/i });
      button.focus();

      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });

      expect(onAction).toHaveBeenCalled();
    });

    it('should have aria-label when provided', () => {
      const { container } = render(
        <EmptyState title="No data" ariaLabel="No data available message" />
      );
      const wrapper = container.querySelector('[data-empty-state]');
      expect(wrapper).toHaveAttribute('aria-label', 'No data available message');
    });
  });

  describe('Context-Specific Empty States', () => {
    it('should render job seeker empty jobs state', () => {
      render(
        <EmptyState
          title="No job matches yet"
          description="We're searching for the best opportunities for you"
          actionLabel="Improve Your Profile"
          onAction={() => {}}
        />
      );

      expect(screen.getByText('No job matches yet')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /improve your profile/i })).toBeInTheDocument();
    });

    it('should render employer empty applications state', () => {
      render(
        <EmptyState
          title="No applications yet"
          description="Share your job posting to attract candidates"
          actionLabel="Share Job"
          onAction={() => {}}
        />
      );

      expect(screen.getByText('No applications yet')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /share job/i })).toBeInTheDocument();
    });

    it('should render search results empty state', () => {
      render(
        <EmptyState
          title="No results found"
          description="Try adjusting your search filters"
          actionLabel="Clear Filters"
          onAction={() => {}}
        />
      );

      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /clear filters/i })).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long title text', () => {
      const longTitle = 'A'.repeat(200);
      render(<EmptyState title={longTitle} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle very long description text', () => {
      const longDescription = 'Lorem ipsum dolor sit amet. '.repeat(50);
      render(<EmptyState title="Title" description={longDescription} />);
      expect(screen.getByText(longDescription)).toBeInTheDocument();
    });

    it('should handle empty string title gracefully', () => {
      render(<EmptyState title="" />);
      const heading = screen.getByRole('heading');
      expect(heading).toHaveTextContent('');
    });

    it('should handle special characters in title', () => {
      render(<EmptyState title="No jobs found! Try again?" />);
      expect(screen.getByText('No jobs found! Try again?')).toBeInTheDocument();
    });
  });

  describe('Styling and Layout', () => {
    it('should apply custom className', () => {
      const { container } = render(<EmptyState title="No data" className="custom-class" />);
      const wrapper = container.querySelector('[data-empty-state]');
      expect(wrapper).toHaveClass('custom-class');
    });

    it('should center content by default', () => {
      const { container } = render(<EmptyState title="No data" />);
      const wrapper = container.querySelector('[data-empty-state]');
      expect(wrapper).toHaveClass('text-center');
    });

    it('should have proper spacing between elements', () => {
      const { container } = render(
        <EmptyState
          title="No data"
          description="Description here"
          actionLabel="Action"
          onAction={() => {}}
        />
      );
      const wrapper = container.querySelector('[data-empty-state]');
      expect(wrapper).toHaveClass('space-y-4');
    });
  });
});
