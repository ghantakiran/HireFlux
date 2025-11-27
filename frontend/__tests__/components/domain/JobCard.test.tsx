/**
 * JobCard Component Tests (Issue #94)
 *
 * TDD/BDD approach for job listing card component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { JobCard } from '@/components/domain/JobCard';

const mockJob = {
  id: '1',
  title: 'Senior Frontend Engineer',
  company: 'TechCorp Inc.',
  location: 'San Francisco, CA',
  locationType: 'hybrid' as const,
  salary: {
    min: 150000,
    max: 200000,
    currency: 'USD',
  },
  fitIndex: 87,
  postedDate: '2024-01-15T10:00:00Z',
  tags: ['React', 'TypeScript', 'Next.js'],
  description: 'We are looking for an experienced frontend engineer to join our team.',
  saved: false,
  applied: false,
};

describe('JobCard', () => {
  describe('Basic Rendering', () => {
    it('should render job title', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
    });

    it('should render company name', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText('TechCorp Inc.')).toBeInTheDocument();
    });

    it('should render location', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText(/San Francisco, CA/)).toBeInTheDocument();
    });

    it('should render location type badge', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText(/hybrid/i)).toBeInTheDocument();
    });

    it('should render salary range', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText(/\$150,000 - \$200,000/)).toBeInTheDocument();
    });

    it('should render fit index', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText(/87%/)).toBeInTheDocument();
    });

    it('should render skill tags', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('Next.js')).toBeInTheDocument();
    });
  });

  describe('Location Type Badges', () => {
    it('should show remote badge', () => {
      render(<JobCard job={{ ...mockJob, locationType: 'remote' }} />);
      expect(screen.getByText(/remote/i)).toBeInTheDocument();
    });

    it('should show hybrid badge', () => {
      render(<JobCard job={{ ...mockJob, locationType: 'hybrid' }} />);
      expect(screen.getByText(/hybrid/i)).toBeInTheDocument();
    });

    it('should show onsite badge', () => {
      render(<JobCard job={{ ...mockJob, locationType: 'onsite' }} />);
      expect(screen.getByText(/onsite/i)).toBeInTheDocument();
    });
  });

  describe('Salary Display', () => {
    it('should format salary with commas', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText(/\$150,000 - \$200,000/)).toBeInTheDocument();
    });

    it('should handle salary without max value', () => {
      const jobWithMinSalary = {
        ...mockJob,
        salary: { min: 100000, currency: 'USD' },
      };
      render(<JobCard job={jobWithMinSalary} />);
      expect(screen.getByText(/\$100,000\+/)).toBeInTheDocument();
    });

    it('should handle missing salary', () => {
      const jobWithoutSalary = { ...mockJob, salary: undefined };
      render(<JobCard job={jobWithoutSalary} />);
      expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    });

    it('should show different currencies', () => {
      const jobEUR = {
        ...mockJob,
        salary: { min: 80000, max: 100000, currency: 'EUR' },
      };
      render(<JobCard job={jobEUR} />);
      expect(screen.getByText(/€80,000 - €100,000/)).toBeInTheDocument();
    });
  });

  describe('Fit Index Display', () => {
    it('should render fit index badge', () => {
      const { container } = render(<JobCard job={mockJob} />);
      const fitBadge = container.querySelector('[data-fit-index]');
      expect(fitBadge).toBeInTheDocument();
    });

    it('should hide fit index when showFitIndex is false', () => {
      const { container } = render(<JobCard job={mockJob} showFitIndex={false} />);
      const fitBadge = container.querySelector('[data-fit-index]');
      expect(fitBadge).not.toBeInTheDocument();
    });

    it('should handle missing fit index', () => {
      const jobWithoutFit = { ...mockJob, fitIndex: undefined };
      const { container } = render(<JobCard job={jobWithoutFit} />);
      const fitBadge = container.querySelector('[data-fit-index]');
      expect(fitBadge).not.toBeInTheDocument();
    });
  });

  describe('Posted Date Display', () => {
    it('should show relative time for recent posts', () => {
      const recentDate = new Date();
      recentDate.setHours(recentDate.getHours() - 2);
      const recentJob = { ...mockJob, postedDate: recentDate.toISOString() };

      render(<JobCard job={recentJob} />);
      expect(screen.getByText(/hours ago/i)).toBeInTheDocument();
    });

    it('should show days ago for older posts', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 5);
      const oldJob = { ...mockJob, postedDate: oldDate.toISOString() };

      render(<JobCard job={oldJob} />);
      expect(screen.getByText(/days ago/i)).toBeInTheDocument();
    });
  });

  describe('Save/Bookmark Functionality', () => {
    it('should render save button', () => {
      render(<JobCard job={mockJob} onSave={() => {}} />);
      const saveButton = screen.getByRole('button', { name: /save job/i });
      expect(saveButton).toBeInTheDocument();
    });

    it('should call onSave when save button clicked', async () => {
      const onSave = jest.fn();
      render(<JobCard job={mockJob} onSave={onSave} />);

      const saveButton = screen.getByRole('button', { name: /save job/i });
      await userEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledWith(mockJob.id);
    });

    it('should show saved state when job is saved', () => {
      render(<JobCard job={{ ...mockJob, saved: true }} onSave={() => {}} />);
      const saveButton = screen.getByRole('button', { name: /unsave job/i });
      expect(saveButton).toBeInTheDocument();
    });

    it('should not render save button when onSave is not provided', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.queryByRole('button', { name: /save job/i })).not.toBeInTheDocument();
    });
  });

  describe('Apply Functionality', () => {
    it('should render apply button', () => {
      render(<JobCard job={mockJob} onApply={() => {}} />);
      const applyButton = screen.getByRole('button', { name: /apply now/i });
      expect(applyButton).toBeInTheDocument();
    });

    it('should call onApply when apply button clicked', async () => {
      const onApply = jest.fn();
      render(<JobCard job={mockJob} onApply={onApply} />);

      const applyButton = screen.getByRole('button', { name: /apply now/i });
      await userEvent.click(applyButton);

      expect(onApply).toHaveBeenCalledWith(mockJob.id);
    });

    it('should show applied state when job is applied', () => {
      render(<JobCard job={{ ...mockJob, applied: true }} onApply={() => {}} />);
      expect(screen.getByText(/applied/i)).toBeInTheDocument();
    });

    it('should disable apply button when already applied', () => {
      render(<JobCard job={{ ...mockJob, applied: true }} onApply={() => {}} />);
      const applyButton = screen.getByRole('button', { name: /applied/i });
      expect(applyButton).toBeDisabled();
    });
  });

  describe('View Details Functionality', () => {
    it('should call onClick when card is clicked', async () => {
      const onClick = jest.fn();
      render(<JobCard job={mockJob} onClick={onClick} />);

      const card = screen.getByRole('article');
      await userEvent.click(card);

      expect(onClick).toHaveBeenCalledWith(mockJob.id);
    });

    it('should not call onClick when action buttons are clicked', async () => {
      const onClick = jest.fn();
      const onSave = jest.fn();

      render(<JobCard job={mockJob} onClick={onClick} onSave={onSave} />);

      const saveButton = screen.getByRole('button', { name: /save job/i });
      await userEvent.click(saveButton);

      expect(onSave).toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Skill Tags', () => {
    it('should render all skill tags', () => {
      render(<JobCard job={mockJob} />);
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.getByText('Next.js')).toBeInTheDocument();
    });

    it('should limit skill tags when maxTags is provided', () => {
      render(<JobCard job={mockJob} maxTags={2} />);
      expect(screen.getByText('React')).toBeInTheDocument();
      expect(screen.getByText('TypeScript')).toBeInTheDocument();
      expect(screen.queryByText('Next.js')).not.toBeInTheDocument();
    });

    it('should show +N more indicator when tags are limited', () => {
      render(<JobCard job={mockJob} maxTags={2} />);
      expect(screen.getByText('+1 more')).toBeInTheDocument();
    });

    it('should handle jobs with no tags', () => {
      const jobWithoutTags = { ...mockJob, tags: [] };
      render(<JobCard job={jobWithoutTags} />);
      // Should render without errors
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render compact variant', () => {
      const { container } = render(<JobCard job={mockJob} variant="compact" />);
      const card = container.querySelector('[data-job-card]');
      expect(card).toHaveAttribute('data-variant', 'compact');
    });

    it('should render full variant (default)', () => {
      const { container } = render(<JobCard job={mockJob} variant="full" />);
      const card = container.querySelector('[data-job-card]');
      expect(card).toHaveAttribute('data-variant', 'full');
    });

    it('should hide description in compact variant', () => {
      render(<JobCard job={mockJob} variant="compact" />);
      expect(screen.queryByText(mockJob.description)).not.toBeInTheDocument();
    });

    it('should show description in full variant', () => {
      render(<JobCard job={mockJob} variant="full" showDescription />);
      expect(screen.getByText(mockJob.description)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role for card', () => {
      render(<JobCard job={mockJob} />);
      const card = screen.getByRole('article');
      expect(card).toBeInTheDocument();
    });

    it('should have keyboard accessible card when onClick provided', async () => {
      const onClick = jest.fn();
      render(<JobCard job={mockJob} onClick={onClick} />);

      const card = screen.getByRole('article');
      card.focus();

      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });

      expect(onClick).toHaveBeenCalled();
    });

    it('should have proper aria-label for save button', () => {
      render(<JobCard job={mockJob} onSave={() => {}} />);
      const saveButton = screen.getByRole('button', { name: /save job/i });
      expect(saveButton).toHaveAccessibleName();
    });

    it('should have proper aria-label for apply button', () => {
      render(<JobCard job={mockJob} onApply={() => {}} />);
      const applyButton = screen.getByRole('button', { name: /apply now/i });
      expect(applyButton).toHaveAccessibleName();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long job titles', () => {
      const longTitle = 'A'.repeat(200);
      render(<JobCard job={{ ...mockJob, title: longTitle }} />);
      expect(screen.getByText(longTitle)).toBeInTheDocument();
    });

    it('should handle very long company names', () => {
      const longCompany = 'Company Name '.repeat(20);
      render(<JobCard job={{ ...mockJob, company: longCompany }} />);
      expect(screen.getByText(longCompany.trim())).toBeInTheDocument();
    });

    it('should handle missing optional fields gracefully', () => {
      const minimalJob = {
        id: '1',
        title: 'Engineer',
        company: 'Company',
      };
      render(<JobCard job={minimalJob} />);
      expect(screen.getByText('Engineer')).toBeInTheDocument();
    });

    it('should handle very large salary values', () => {
      const highSalaryJob = {
        ...mockJob,
        salary: { min: 500000, max: 1000000, currency: 'USD' },
      };
      render(<JobCard job={highSalaryJob} />);
      expect(screen.getByText(/\$500,000 - \$1,000,000/)).toBeInTheDocument();
    });

    it('should handle many skill tags', () => {
      const manyTags = Array.from({ length: 20 }, (_, i) => `Skill ${i + 1}`);
      const jobWithManyTags = { ...mockJob, tags: manyTags };

      render(<JobCard job={jobWithManyTags} maxTags={3} />);
      expect(screen.getByText('Skill 1')).toBeInTheDocument();
      expect(screen.getByText('+17 more')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('should show loading state when loading prop is true', () => {
      render(<JobCard job={mockJob} loading />);
      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    });

    it('should disable all buttons when loading', () => {
      render(<JobCard job={mockJob} loading onSave={() => {}} onApply={() => {}} />);

      const saveButton = screen.getByRole('button', { name: /save job/i });
      const applyButton = screen.getByRole('button', { name: /apply now/i });

      expect(saveButton).toBeDisabled();
      expect(applyButton).toBeDisabled();
    });
  });
});
