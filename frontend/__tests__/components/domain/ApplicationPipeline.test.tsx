/**
 * ApplicationPipeline Component Tests (Issue #94)
 *
 * TDD/BDD approach for kanban-style application tracking component
 */

import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApplicationPipeline } from '@/components/domain/ApplicationPipeline';

const mockApplications = [
  {
    id: '1',
    jobTitle: 'Senior Frontend Engineer',
    company: 'TechCorp',
    candidateName: 'John Doe',
    appliedDate: new Date('2024-01-15'),
    stage: 'new' as const,
    fitIndex: 87,
  },
  {
    id: '2',
    jobTitle: 'Backend Developer',
    company: 'StartupXYZ',
    candidateName: 'Jane Smith',
    appliedDate: new Date('2024-01-14'),
    stage: 'screening' as const,
    fitIndex: 92,
  },
  {
    id: '3',
    jobTitle: 'Full Stack Engineer',
    company: 'BigCo',
    candidateName: 'Bob Johnson',
    appliedDate: new Date('2024-01-13'),
    stage: 'interview' as const,
    fitIndex: 78,
  },
];

const mockStages = [
  { id: 'new', label: 'New', color: 'gray' },
  { id: 'screening', label: 'Screening', color: 'blue' },
  { id: 'interview', label: 'Interview', color: 'purple' },
  { id: 'offer', label: 'Offer', color: 'green' },
  { id: 'hired', label: 'Hired', color: 'success' },
  { id: 'rejected', label: 'Rejected', color: 'red' },
];

describe('ApplicationPipeline', () => {
  describe('Basic Rendering', () => {
    it('should render all pipeline stages', () => {
      render(<ApplicationPipeline applications={mockApplications} stages={mockStages} />);
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Screening')).toBeInTheDocument();
      expect(screen.getByText('Interview')).toBeInTheDocument();
      expect(screen.getByText('Offer')).toBeInTheDocument();
      expect(screen.getByText('Hired')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });

    it('should render application cards', () => {
      render(<ApplicationPipeline applications={mockApplications} stages={mockStages} />);
      expect(screen.getByText('Senior Frontend Engineer')).toBeInTheDocument();
      expect(screen.getByText('Backend Developer')).toBeInTheDocument();
      expect(screen.getByText('Full Stack Engineer')).toBeInTheDocument();
    });

    it('should render company names', () => {
      render(<ApplicationPipeline applications={mockApplications} stages={mockStages} />);
      expect(screen.getByText('TechCorp')).toBeInTheDocument();
      expect(screen.getByText('StartupXYZ')).toBeInTheDocument();
      expect(screen.getByText('BigCo')).toBeInTheDocument();
    });

    it('should render candidate names', () => {
      render(<ApplicationPipeline applications={mockApplications} stages={mockStages} />);
      expect(screen.getByText(/John Doe/)).toBeInTheDocument();
      expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
      expect(screen.getByText(/Bob Johnson/)).toBeInTheDocument();
    });
  });

  describe('Stage Grouping', () => {
    it('should group applications by stage', () => {
      const { container } = render(<ApplicationPipeline applications={mockApplications} stages={mockStages} />);

      const newColumn = container.querySelector('[data-stage="new"]');
      expect(newColumn?.textContent).toContain('Senior Frontend Engineer');

      const screeningColumn = container.querySelector('[data-stage="screening"]');
      expect(screeningColumn?.textContent).toContain('Backend Developer');

      const interviewColumn = container.querySelector('[data-stage="interview"]');
      expect(interviewColumn?.textContent).toContain('Full Stack Engineer');
    });

    it('should show count for each stage', () => {
      render(<ApplicationPipeline applications={mockApplications} stages={mockStages} showCount />);
      // New: 1, Screening: 1, Interview: 1, others: 0
      expect(screen.getByText(/New.*1/)).toBeInTheDocument();
      expect(screen.getByText(/Screening.*1/)).toBeInTheDocument();
      expect(screen.getByText(/Interview.*1/)).toBeInTheDocument();
    });

    it('should handle empty stages', () => {
      const { container } = render(<ApplicationPipeline applications={mockApplications} stages={mockStages} />);
      const offerColumn = container.querySelector('[data-stage="offer"]');
      const cards = offerColumn?.querySelectorAll('[data-application-card]');
      expect(cards?.length).toBe(0);
    });
  });

  describe('Application Card Display', () => {
    it('should show fit index when available', () => {
      render(<ApplicationPipeline applications={mockApplications} stages={mockStages} showFitIndex />);
      expect(screen.getByText(/87%/)).toBeInTheDocument();
      expect(screen.getByText(/92%/)).toBeInTheDocument();
    });

    it('should hide fit index when showFitIndex is false', () => {
      render(<ApplicationPipeline applications={mockApplications} stages={mockStages} showFitIndex={false} />);
      expect(screen.queryByText(/87%/)).not.toBeInTheDocument();
    });

    it('should show applied date', () => {
      render(<ApplicationPipeline applications={mockApplications} stages={mockStages} showDate />);
      expect(screen.getByText(/Jan.*15/)).toBeInTheDocument();
    });
  });

  describe('Stage Movement', () => {
    it('should call onStageChange when moving application to new stage', async () => {
      const onStageChange = jest.fn();
      render(<ApplicationPipeline applications={mockApplications} stages={mockStages} onStageChange={onStageChange} />);

      // Look for move button or action
      const moveButtons = screen.getAllByRole('button', { name: /move/i });
      if (moveButtons.length > 0) {
        await userEvent.click(moveButtons[0]);
        expect(onStageChange).toHaveBeenCalled();
      }
    });

    it('should show stage selector when onStageChange provided', () => {
      const { container } = render(<ApplicationPipeline applications={mockApplications} stages={mockStages} onStageChange={() => {}} />);
      const selectors = container.querySelectorAll('[data-stage-selector]');
      expect(selectors.length).toBeGreaterThan(0);
    });
  });

  describe('Application Click', () => {
    it('should call onApplicationClick when card is clicked', async () => {
      const onApplicationClick = jest.fn();
      render(<ApplicationPipeline applications={mockApplications} stages={mockStages} onApplicationClick={onApplicationClick} />);

      const card = screen.getByText('Senior Frontend Engineer');
      await userEvent.click(card);

      expect(onApplicationClick).toHaveBeenCalledWith('1');
    });

    it('should make cards clickable when onApplicationClick provided', () => {
      const { container } = render(<ApplicationPipeline applications={mockApplications} stages={mockStages} onApplicationClick={() => {}} />);
      const cards = container.querySelectorAll('[data-application-card]');
      expect(cards[0]).toHaveClass('cursor-pointer');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no applications', () => {
      render(<ApplicationPipeline applications={[]} stages={mockStages} />);
      expect(screen.getByText(/no applications/i)).toBeInTheDocument();
    });

    it('should show custom empty message', () => {
      render(<ApplicationPipeline applications={[]} stages={mockStages} emptyMessage="Start tracking applications" />);
      expect(screen.getByText('Start tracking applications')).toBeInTheDocument();
    });
  });

  describe('Compact Variant', () => {
    it('should render compact variant', () => {
      const { container } = render(<ApplicationPipeline applications={mockApplications} stages={mockStages} variant="compact" />);
      const pipeline = container.querySelector('[data-pipeline]');
      expect(pipeline).toHaveAttribute('data-variant', 'compact');
    });

    it('should render full variant (default)', () => {
      const { container } = render(<ApplicationPipeline applications={mockApplications} stages={mockStages} variant="full" />);
      const pipeline = container.querySelector('[data-pipeline]');
      expect(pipeline).toHaveAttribute('data-variant', 'full');
    });
  });

  describe('Horizontal Scroll', () => {
    it('should have horizontal scroll container', () => {
      const { container } = render(<ApplicationPipeline applications={mockApplications} stages={mockStages} />);
      const scrollContainer = container.querySelector('[data-scroll-container]');
      expect(scrollContainer).toHaveClass('overflow-x-auto');
    });
  });

  describe('Loading State', () => {
    it('should show loading state when loading', () => {
      render(<ApplicationPipeline applications={mockApplications} stages={mockStages} loading />);
      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    });

    it('should show skeleton columns when loading', () => {
      const { container } = render(<ApplicationPipeline applications={mockApplications} stages={mockStages} loading />);
      const skeletons = container.querySelectorAll('[data-skeleton]');
      expect(skeletons.length).toBeGreaterThan(0);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA role for pipeline', () => {
      const { container } = render(<ApplicationPipeline applications={mockApplications} stages={mockStages} />);
      const pipeline = container.querySelector('[data-pipeline]');
      expect(pipeline).toHaveAttribute('role', 'region');
    });

    it('should have proper ARIA labels for stages', () => {
      const { container } = render(<ApplicationPipeline applications={mockApplications} stages={mockStages} />);
      const stages = container.querySelectorAll('[data-stage]');
      stages.forEach((stage) => {
        expect(stage).toHaveAttribute('aria-label');
      });
    });

    it('should have keyboard accessible cards', async () => {
      const onApplicationClick = jest.fn();
      const { container } = render(<ApplicationPipeline applications={mockApplications} stages={mockStages} onApplicationClick={onApplicationClick} />);

      const card = container.querySelector('[data-application-card]');
      if (card) {
        card.focus();
        fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' });
        expect(onApplicationClick).toHaveBeenCalled();
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle many applications in one stage', () => {
      const manyApps = Array.from({ length: 50 }, (_, i) => ({
        ...mockApplications[0],
        id: String(i),
        jobTitle: `Job ${i}`,
      }));
      const { container } = render(<ApplicationPipeline applications={manyApps} stages={mockStages} />);
      const newStage = container.querySelector('[data-stage="new"]');
      const cards = newStage?.querySelectorAll('[data-application-card]');
      expect(cards?.length).toBe(50);
    });

    it('should handle very long job titles', () => {
      const longTitleApp = {
        ...mockApplications[0],
        jobTitle: 'A'.repeat(200),
      };
      render(<ApplicationPipeline applications={[longTitleApp]} stages={mockStages} />);
      expect(screen.getByText('A'.repeat(200))).toBeInTheDocument();
    });

    it('should handle missing optional fields', () => {
      const minimalApp = {
        id: '1',
        jobTitle: 'Engineer',
        company: 'Company',
        stage: 'new' as const,
      };
      render(<ApplicationPipeline applications={[minimalApp]} stages={mockStages} />);
      expect(screen.getByText('Engineer')).toBeInTheDocument();
    });
  });

  describe('Stage Colors', () => {
    it('should apply stage colors to headers', () => {
      const { container } = render(<ApplicationPipeline applications={mockApplications} stages={mockStages} />);
      const newStageHeader = container.querySelector('[data-stage="new"] [data-stage-header]');
      expect(newStageHeader).toHaveClass('border-gray-600');
    });
  });
});
