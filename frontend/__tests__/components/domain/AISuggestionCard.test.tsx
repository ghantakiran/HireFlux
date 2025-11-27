/**
 * AISuggestionCard Component Tests (Issue #94)
 *
 * TDD/BDD approach for AI-generated suggestions with reasoning
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AISuggestionCard } from '@/components/domain/AISuggestionCard';

const mockSuggestion = {
  id: '1',
  title: 'Add quantifiable metrics to your resume',
  description: 'Including specific numbers and percentages makes your achievements more impactful.',
  reasoning: 'ATS systems and recruiters look for quantifiable results. Your current resume mentions "improved sales" but lacks specific metrics. Adding percentages or dollar amounts will significantly strengthen your application.',
  confidence: 92,
  impact: 'high' as const,
  category: 'resume' as const,
};

describe('AISuggestionCard', () => {
  describe('Basic Rendering', () => {
    it('should render suggestion title', () => {
      render(<AISuggestionCard suggestion={mockSuggestion} />);
      expect(screen.getByText('Add quantifiable metrics to your resume')).toBeInTheDocument();
    });

    it('should render suggestion description', () => {
      render(<AISuggestionCard suggestion={mockSuggestion} />);
      expect(screen.getByText(/Including specific numbers and percentages/)).toBeInTheDocument();
    });

    it('should display confidence score', () => {
      render(<AISuggestionCard suggestion={mockSuggestion} />);
      expect(screen.getByText(/92%/)).toBeInTheDocument();
    });

    it('should display impact level', () => {
      render(<AISuggestionCard suggestion={mockSuggestion} />);
      expect(screen.getByText(/high impact/i)).toBeInTheDocument();
    });
  });

  describe('Confidence Score Display', () => {
    it('should show high confidence (90-100) in green', () => {
      const { container } = render(<AISuggestionCard suggestion={{ ...mockSuggestion, confidence: 95 }} />);
      const confidenceBadge = container.querySelector('[data-confidence-score]');
      expect(confidenceBadge).toHaveClass('bg-success-500');
    });

    it('should show medium confidence (70-89) in amber', () => {
      const { container } = render(<AISuggestionCard suggestion={{ ...mockSuggestion, confidence: 80 }} />);
      const confidenceBadge = container.querySelector('[data-confidence-score]');
      expect(confidenceBadge).toHaveClass('bg-accent-500');
    });

    it('should show low confidence (0-69) in gray', () => {
      const { container } = render(<AISuggestionCard suggestion={{ ...mockSuggestion, confidence: 65 }} />);
      const confidenceBadge = container.querySelector('[data-confidence-score]');
      expect(confidenceBadge).toHaveClass('bg-gray-600');
    });
  });

  describe('Impact Level Display', () => {
    it('should show high impact badge', () => {
      render(<AISuggestionCard suggestion={{ ...mockSuggestion, impact: 'high' }} />);
      const badge = screen.getByText(/high impact/i);
      expect(badge).toBeInTheDocument();
    });

    it('should show medium impact badge', () => {
      render(<AISuggestionCard suggestion={{ ...mockSuggestion, impact: 'medium' }} />);
      const badge = screen.getByText(/medium impact/i);
      expect(badge).toBeInTheDocument();
    });

    it('should show low impact badge', () => {
      render(<AISuggestionCard suggestion={{ ...mockSuggestion, impact: 'low' }} />);
      const badge = screen.getByText(/low impact/i);
      expect(badge).toBeInTheDocument();
    });
  });

  describe('Reasoning Expansion', () => {
    it('should hide reasoning by default', () => {
      render(<AISuggestionCard suggestion={mockSuggestion} />);
      const reasoning = screen.queryByText(/ATS systems and recruiters/);
      expect(reasoning).not.toBeVisible();
    });

    it('should show reasoning when "Show reasoning" button clicked', async () => {
      render(<AISuggestionCard suggestion={mockSuggestion} />);
      const showButton = screen.getByRole('button', { name: /show reasoning/i });

      await userEvent.click(showButton);

      expect(screen.getByText(/ATS systems and recruiters/)).toBeVisible();
    });

    it('should hide reasoning when "Hide reasoning" button clicked', async () => {
      render(<AISuggestionCard suggestion={mockSuggestion} />);
      const showButton = screen.getByRole('button', { name: /show reasoning/i });

      await userEvent.click(showButton);
      expect(screen.getByText(/ATS systems and recruiters/)).toBeVisible();

      const hideButton = screen.getByRole('button', { name: /hide reasoning/i });
      await userEvent.click(hideButton);

      await waitFor(() => {
        expect(screen.queryByText(/ATS systems and recruiters/)).not.toBeVisible();
      });
    });

    it('should toggle reasoning icon when expanded/collapsed', async () => {
      const { container } = render(<AISuggestionCard suggestion={mockSuggestion} />);
      const toggleButton = screen.getByRole('button', { name: /show reasoning/i });

      // Should have chevron down initially
      expect(container.querySelector('[data-reasoning-icon]')).toHaveAttribute('data-expanded', 'false');

      await userEvent.click(toggleButton);

      // Should have chevron up when expanded
      expect(container.querySelector('[data-reasoning-icon]')).toHaveAttribute('data-expanded', 'true');
    });
  });

  describe('Action Buttons', () => {
    it('should render Accept button', () => {
      render(<AISuggestionCard suggestion={mockSuggestion} />);
      expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    });

    it('should render Reject button', () => {
      render(<AISuggestionCard suggestion={mockSuggestion} />);
      expect(screen.getByRole('button', { name: /reject/i })).toBeInTheDocument();
    });

    it('should call onAccept when Accept button clicked', async () => {
      const onAccept = jest.fn();
      render(<AISuggestionCard suggestion={mockSuggestion} onAccept={onAccept} />);

      const acceptButton = screen.getByRole('button', { name: /accept/i });
      await userEvent.click(acceptButton);

      expect(onAccept).toHaveBeenCalledWith(mockSuggestion.id);
    });

    it('should call onReject when Reject button clicked', async () => {
      const onReject = jest.fn();
      render(<AISuggestionCard suggestion={mockSuggestion} onReject={onReject} />);

      const rejectButton = screen.getByRole('button', { name: /reject/i });
      await userEvent.click(rejectButton);

      expect(onReject).toHaveBeenCalledWith(mockSuggestion.id);
    });

    it('should disable buttons when loading', () => {
      render(<AISuggestionCard suggestion={mockSuggestion} loading />);

      expect(screen.getByRole('button', { name: /accept/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
    });

    it('should show loading spinner when processing', () => {
      render(<AISuggestionCard suggestion={mockSuggestion} loading />);
      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument();
    });
  });

  describe('Accepted/Rejected States', () => {
    it('should show accepted state when accepted=true', () => {
      render(<AISuggestionCard suggestion={mockSuggestion} accepted />);
      expect(screen.getByText(/accepted/i)).toBeInTheDocument();
    });

    it('should show rejected state when rejected=true', () => {
      render(<AISuggestionCard suggestion={mockSuggestion} rejected />);
      expect(screen.getByText(/rejected/i)).toBeInTheDocument();
    });

    it('should hide action buttons when accepted', () => {
      render(<AISuggestionCard suggestion={mockSuggestion} accepted />);
      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    });

    it('should hide action buttons when rejected', () => {
      render(<AISuggestionCard suggestion={mockSuggestion} rejected />);
      expect(screen.queryByRole('button', { name: /accept/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /reject/i })).not.toBeInTheDocument();
    });

    it('should show Undo button when accepted', () => {
      render(<AISuggestionCard suggestion={mockSuggestion} accepted />);
      expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
    });

    it('should show Undo button when rejected', () => {
      render(<AISuggestionCard suggestion={mockSuggestion} rejected />);
      expect(screen.getByRole('button', { name: /undo/i })).toBeInTheDocument();
    });

    it('should call onUndo when Undo button clicked', async () => {
      const onUndo = jest.fn();
      render(<AISuggestionCard suggestion={mockSuggestion} accepted onUndo={onUndo} />);

      const undoButton = screen.getByRole('button', { name: /undo/i });
      await userEvent.click(undoButton);

      expect(onUndo).toHaveBeenCalledWith(mockSuggestion.id);
    });
  });

  describe('Category Badges', () => {
    it('should show resume category badge', () => {
      render(<AISuggestionCard suggestion={{ ...mockSuggestion, category: 'resume' }} />);
      expect(screen.getByText(/resume/i)).toBeInTheDocument();
    });

    it('should show cover letter category badge', () => {
      render(<AISuggestionCard suggestion={{ ...mockSuggestion, category: 'cover-letter' }} />);
      expect(screen.getByText(/cover letter/i)).toBeInTheDocument();
    });

    it('should show job match category badge', () => {
      render(<AISuggestionCard suggestion={{ ...mockSuggestion, category: 'job-match' }} />);
      expect(screen.getByText(/job match/i)).toBeInTheDocument();
    });

    it('should show interview category badge', () => {
      render(<AISuggestionCard suggestion={{ ...mockSuggestion, category: 'interview' }} />);
      expect(screen.getByText(/interview/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for confidence score', () => {
      const { container } = render(<AISuggestionCard suggestion={mockSuggestion} />);
      const confidenceBadge = container.querySelector('[data-confidence-score]');
      expect(confidenceBadge).toHaveAttribute('aria-label', 'Confidence: 92%');
    });

    it('should have proper ARIA labels for impact level', () => {
      const { container } = render(<AISuggestionCard suggestion={mockSuggestion} />);
      const impactBadge = container.querySelector('[data-impact-level]');
      expect(impactBadge).toHaveAttribute('aria-label', 'Impact: High');
    });

    it('should have proper role for card container', () => {
      const { container } = render(<AISuggestionCard suggestion={mockSuggestion} />);
      const card = container.querySelector('[data-suggestion-card]');
      expect(card).toHaveAttribute('role', 'article');
    });

    it('should have keyboard accessible action buttons', async () => {
      const onAccept = jest.fn();
      render(<AISuggestionCard suggestion={mockSuggestion} onAccept={onAccept} />);

      const acceptButton = screen.getByRole('button', { name: /accept/i });
      acceptButton.focus();

      fireEvent.keyDown(acceptButton, { key: 'Enter', code: 'Enter' });

      expect(onAccept).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing reasoning gracefully', () => {
      const suggestionWithoutReasoning = { ...mockSuggestion, reasoning: undefined };
      render(<AISuggestionCard suggestion={suggestionWithoutReasoning} />);

      // Should not show reasoning button if no reasoning provided
      expect(screen.queryByRole('button', { name: /show reasoning/i })).not.toBeInTheDocument();
    });

    it('should handle empty reasoning gracefully', () => {
      const suggestionWithEmptyReasoning = { ...mockSuggestion, reasoning: '' };
      render(<AISuggestionCard suggestion={suggestionWithEmptyReasoning} />);

      expect(screen.queryByRole('button', { name: /show reasoning/i })).not.toBeInTheDocument();
    });

    it('should clamp confidence scores above 100', () => {
      render(<AISuggestionCard suggestion={{ ...mockSuggestion, confidence: 150 }} />);
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });

    it('should clamp negative confidence scores', () => {
      render(<AISuggestionCard suggestion={{ ...mockSuggestion, confidence: -10 }} />);
      expect(screen.getByText(/0%/)).toBeInTheDocument();
    });

    it('should handle very long titles gracefully', () => {
      const longTitle = 'A'.repeat(200);
      render(<AISuggestionCard suggestion={{ ...mockSuggestion, title: longTitle }} />);

      const titleElement = screen.getByText(longTitle);
      expect(titleElement).toBeInTheDocument();
    });

    it('should handle very long reasoning text gracefully', () => {
      const longReasoning = 'Lorem ipsum dolor sit amet. '.repeat(100);
      render(<AISuggestionCard suggestion={{ ...mockSuggestion, reasoning: longReasoning }} />);

      const showButton = screen.getByRole('button', { name: /show reasoning/i });
      expect(showButton).toBeInTheDocument();
    });
  });

  describe('Visual Variants', () => {
    it('should support compact variant', () => {
      const { container } = render(<AISuggestionCard suggestion={mockSuggestion} variant="compact" />);
      const card = container.querySelector('[data-suggestion-card]');
      expect(card).toHaveAttribute('data-variant', 'compact');
    });

    it('should support full variant (default)', () => {
      const { container } = render(<AISuggestionCard suggestion={mockSuggestion} variant="full" />);
      const card = container.querySelector('[data-suggestion-card]');
      expect(card).toHaveAttribute('data-variant', 'full');
    });
  });
});
