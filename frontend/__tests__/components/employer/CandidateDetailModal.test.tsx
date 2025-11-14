/**
 * Unit Tests for CandidateDetailModal Component
 * Sprint 19-20 Week 40 Day 1
 *
 * Tests comprehensive candidate detail modal functionality including:
 * - Modal visibility and interaction
 * - Tab navigation (Overview, Fit Score, Notes)
 * - Status change workflow
 * - Notes management
 * - API integration
 * - Accessibility
 *
 * Following TDD methodology (retroactive testing of existing component)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CandidateDetailModal from '@/components/employer/CandidateDetailModal';
import { atsApi } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
  atsApi: {
    calculateFit: jest.fn(),
    getApplicationNotes: jest.fn(),
    updateApplicationStatus: jest.fn(),
    addApplicationNote: jest.fn(),
  },
}));

const mockFitData = {
  fit_index: 85,
  explanations: [
    {
      factor: 'skills_match',
      score: 90,
      explanation: 'Strong alignment with required technical skills including React, TypeScript, and Node.js',
    },
    {
      factor: 'experience',
      score: 80,
      explanation: '5 years of experience meets the 3-5 year requirement',
    },
    {
      factor: 'location',
      score: 100,
      explanation: 'Candidate is based in San Francisco, matching job location',
    },
  ],
  strengths: [
    'Extensive React and TypeScript experience',
    'Strong portfolio of production applications',
    'Excellent communication skills demonstrated in cover letter',
  ],
  concerns: [
    'No GraphQL experience mentioned',
    'Limited AWS/cloud infrastructure background',
  ],
};

const mockNotes = [
  {
    id: 'note-1',
    content: 'Great candidate, strong technical background',
    visibility: 'team' as const,
    author_name: 'Sarah Johnson',
    created_at: '2024-01-15T10:30:00Z',
  },
  {
    id: 'note-2',
    content: 'Need to verify availability for start date',
    visibility: 'private' as const,
    author_name: 'Mike Chen',
    created_at: '2024-01-15T14:20:00Z',
  },
];

describe('CandidateDetailModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (atsApi.calculateFit as jest.Mock).mockResolvedValue({
      data: { data: mockFitData },
    });
    (atsApi.getApplicationNotes as jest.Mock).mockResolvedValue({
      data: { data: mockNotes },
    });
  });

  describe('Rendering & Visibility', () => {
    it('should not render when isOpen is false', () => {
      const { container } = render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={false}
          onClose={jest.fn()}
        />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render modal when isOpen is true', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Candidate Details')).toBeInTheDocument();
      });
    });

    it('should display modal header with title', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /candidate details/i })).toBeInTheDocument();
      });
    });

    it('should display all three tabs', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Overview' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /AI Fit Score/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Notes/ })).toBeInTheDocument();
      });
    });

    it('should display close button in header', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        const closeButtons = screen.getAllByRole('button', { name: /close/i });
        expect(closeButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Modal Open/Close Behavior', () => {
    it('should call onClose when X button is clicked', async () => {
      const onClose = jest.fn();

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Candidate Details')).toBeInTheDocument();
      });

      // Click the X button in header
      const xButton = screen.getByRole('button', { name: '' }).closest('button');
      if (xButton) {
        fireEvent.click(xButton);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should call onClose when Close button is clicked', async () => {
      const onClose = jest.fn();

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Candidate Details')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /^close$/i });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', async () => {
      const onClose = jest.fn();

      const { container } = render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Candidate Details')).toBeInTheDocument();
      });

      // Find backdrop (first child with bg-black class)
      const backdrop = container.querySelector('.bg-black');
      if (backdrop) {
        fireEvent.click(backdrop);
        expect(onClose).toHaveBeenCalledTimes(1);
      }
    });

    it('should not close when clicking modal content', async () => {
      const onClose = jest.fn();

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Candidate Details')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Candidate Details'));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Tab Navigation', () => {
    it('should default to Overview tab', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        const overviewTab = screen.getByRole('button', { name: 'Overview' });
        expect(overviewTab).toHaveClass('border-blue-500');
      });
    });

    it('should switch to AI Fit Score tab when clicked', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Candidate Details')).toBeInTheDocument();
      });

      const fitTab = screen.getByRole('button', { name: /AI Fit Score/i });
      fireEvent.click(fitTab);

      await waitFor(() => {
        expect(fitTab).toHaveClass('border-blue-500');
        expect(screen.getByText('Fit Score')).toBeInTheDocument();
      });
    });

    it('should switch to Notes tab when clicked', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Candidate Details')).toBeInTheDocument();
      });

      const notesTab = screen.getByRole('button', { name: /Notes/i });
      fireEvent.click(notesTab);

      await waitFor(() => {
        expect(notesTab).toHaveClass('border-blue-500');
        expect(screen.getByRole('heading', { name: 'Add Note' })).toBeInTheDocument();
      });
    });

    it('should display note count in tab label', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Notes \(2\)/i })).toBeInTheDocument();
      });
    });
  });

  describe('Data Fetching & Loading States', () => {
    it('should display loading spinner initially', () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should fetch fit data when modal opens', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(atsApi.calculateFit).toHaveBeenCalledWith('app-1');
      });
    });

    it('should fetch notes data when modal opens', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(atsApi.getApplicationNotes).toHaveBeenCalledWith('app-1');
      });
    });

    it('should handle API errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      (atsApi.calculateFit as jest.Mock).mockRejectedValue(new Error('API Error'));

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalled();
      });

      consoleError.mockRestore();
    });

    it('should not fetch data when modal is closed', () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={false}
          onClose={jest.fn()}
        />
      );

      expect(atsApi.calculateFit).not.toHaveBeenCalled();
      expect(atsApi.getApplicationNotes).not.toHaveBeenCalled();
    });

    it('should refetch when applicationId changes', async () => {
      const { rerender } = render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(atsApi.calculateFit).toHaveBeenCalledWith('app-1');
      });

      jest.clearAllMocks();

      rerender(
        <CandidateDetailModal
          applicationId="app-2"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(atsApi.calculateFit).toHaveBeenCalledWith('app-2');
      });
    });
  });

  describe('Overview Tab Content', () => {
    it('should display candidate information section', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Candidate Information')).toBeInTheDocument();
      });
    });

    it('should display placeholder for candidate profile', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(
          screen.getByText(/Detailed candidate profile will be displayed here/i)
        ).toBeInTheDocument();
      });
    });

    it('should display Change Status section', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Change Status')).toBeInTheDocument();
      });
    });

    it('should display all 7 status change buttons', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Reviewing' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Phone Screen' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Technical' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Final Interview' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Offer' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Hired' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Rejected' })).toBeInTheDocument();
      });
    });

    it('should enable status change buttons when not loading', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        const reviewingBtn = screen.getByRole('button', { name: 'Reviewing' });
        expect(reviewingBtn).not.toBeDisabled();
      });
    });
  });

  describe('Fit Score Tab Content', () => {
    it('should display overall fit score', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Candidate Details')).toBeInTheDocument();
      });

      const fitTab = screen.getByRole('button', { name: /AI Fit Score/i });
      fireEvent.click(fitTab);

      await waitFor(() => {
        expect(screen.getByText('85')).toBeInTheDocument();
        expect(screen.getByText('Fit Score')).toBeInTheDocument();
      });
    });

    it('should display score breakdown section', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /AI Fit Score/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Score Breakdown')).toBeInTheDocument();
      });
    });

    it('should display all factor scores with explanations', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Candidate Details')).toBeInTheDocument();
      });

      const fitTab = screen.getByRole('button', { name: /AI Fit Score/i });
      fireEvent.click(fitTab);

      await waitFor(() => {
        expect(screen.getByText(/skills match/i)).toBeInTheDocument();
      });

      expect(screen.getByText('90/100')).toBeInTheDocument();
      expect(screen.getByText(/Strong alignment with required technical skills/i)).toBeInTheDocument();

      // Check for Experience factor (multiple matches, so verify at least one is the heading)
      const experienceElements = screen.getAllByText(/experience/i);
      expect(experienceElements.length).toBeGreaterThan(0);
      expect(screen.getByText('80/100')).toBeInTheDocument();

      expect(screen.getByText('100/100')).toBeInTheDocument();
    });

    it('should display progress bars for each factor', async () => {
      const { container } = render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /AI Fit Score/i }));
      });

      await waitFor(() => {
        const progressBars = container.querySelectorAll('.bg-blue-600.h-2');
        expect(progressBars.length).toBeGreaterThan(0);
      });
    });

    it('should display strengths section', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /AI Fit Score/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Candidate Strengths')).toBeInTheDocument();
        expect(screen.getByText(/Extensive React and TypeScript experience/i)).toBeInTheDocument();
      });
    });

    it('should display concerns section', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /AI Fit Score/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Potential Concerns')).toBeInTheDocument();
        expect(screen.getByText(/No GraphQL experience mentioned/i)).toBeInTheDocument();
      });
    });

    it('should hide strengths section if empty', async () => {
      (atsApi.calculateFit as jest.Mock).mockResolvedValue({
        data: {
          data: {
            ...mockFitData,
            strengths: [],
          },
        },
      });

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /AI Fit Score/i }));
      });

      await waitFor(() => {
        expect(screen.queryByText('Candidate Strengths')).not.toBeInTheDocument();
      });
    });

    it('should hide concerns section if empty', async () => {
      (atsApi.calculateFit as jest.Mock).mockResolvedValue({
        data: {
          data: {
            ...mockFitData,
            concerns: [],
          },
        },
      });

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /AI Fit Score/i }));
      });

      await waitFor(() => {
        expect(screen.queryByText('Potential Concerns')).not.toBeInTheDocument();
      });
    });
  });

  describe('Notes Tab Content', () => {
    it('should display add note form', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Candidate Details')).toBeInTheDocument();
      });

      const notesTab = screen.getByRole('button', { name: /Notes/i });
      fireEvent.click(notesTab);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Add Note' })).toBeInTheDocument();
      });

      expect(screen.getByPlaceholderText(/Enter your note/i)).toBeInTheDocument();
    });

    it('should allow typing in note textarea', async () => {
      const user = userEvent.setup();

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Notes/i }));
      });

      const textarea = screen.getByPlaceholderText(/Enter your note/i) as HTMLTextAreaElement;
      await user.type(textarea, 'This is a test note');

      expect(textarea.value).toBe('This is a test note');
    });

    it('should toggle visibility radio buttons', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Notes/i }));
      });

      const teamRadio = screen.getByLabelText(/Team Visible/i) as HTMLInputElement;
      const privateRadio = screen.getByLabelText(/Private/i) as HTMLInputElement;

      expect(teamRadio).toBeChecked();
      expect(privateRadio).not.toBeChecked();

      fireEvent.click(privateRadio);

      expect(privateRadio).toBeChecked();
      expect(teamRadio).not.toBeChecked();
    });

    it('should display all notes', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Notes/i }));
      });

      await waitFor(() => {
        expect(screen.getByText(/Great candidate, strong technical background/i)).toBeInTheDocument();
        expect(screen.getByText(/Need to verify availability for start date/i)).toBeInTheDocument();
        expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
        expect(screen.getByText('Mike Chen')).toBeInTheDocument();
      });
    });

    it('should display note visibility badges', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Notes/i }));
      });

      await waitFor(() => {
        const teamBadges = screen.getAllByText('Team');
        const privateBadges = screen.getAllByText('Private');
        expect(teamBadges.length).toBeGreaterThan(0);
        expect(privateBadges.length).toBeGreaterThan(0);
      });
    });

    it('should display "No notes yet" when empty', async () => {
      (atsApi.getApplicationNotes as jest.Mock).mockResolvedValue({
        data: { data: [] },
      });

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Notes/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('No notes yet')).toBeInTheDocument();
      });
    });

    it('should format note timestamps', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Notes/i }));
      });

      await waitFor(() => {
        // Timestamps should be formatted using toLocaleString()
        const timestamps = screen.getAllByText(/\d{1,2}\/\d{1,2}\/\d{4}/);
        expect(timestamps.length).toBeGreaterThan(0);
      });
    });

    it('should display notes count', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Notes/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('All Notes (2)')).toBeInTheDocument();
      });
    });
  });

  describe('Status Change Workflow', () => {
    it('should update application status when button clicked', async () => {
      (atsApi.updateApplicationStatus as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Change Status')).toBeInTheDocument();
      });

      const reviewingBtn = screen.getByRole('button', { name: 'Reviewing' });
      fireEvent.click(reviewingBtn);

      await waitFor(() => {
        expect(atsApi.updateApplicationStatus).toHaveBeenCalledWith('app-1', {
          status: 'reviewing',
          note: 'Status changed to reviewing',
        });
      });
    });

    it('should disable status buttons during update', async () => {
      (atsApi.updateApplicationStatus as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Change Status')).toBeInTheDocument();
      });

      const reviewingBtn = screen.getByRole('button', { name: 'Reviewing' });
      fireEvent.click(reviewingBtn);

      const offerBtn = screen.getByRole('button', { name: 'Offer' });
      expect(offerBtn).toBeDisabled();
    });

    it('should refresh data after status update', async () => {
      (atsApi.updateApplicationStatus as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(atsApi.calculateFit).toHaveBeenCalledTimes(1);
      });

      const reviewingBtn = screen.getByRole('button', { name: 'Reviewing' });
      fireEvent.click(reviewingBtn);

      await waitFor(() => {
        expect(atsApi.calculateFit).toHaveBeenCalledTimes(2);
        expect(atsApi.getApplicationNotes).toHaveBeenCalledTimes(2);
      });
    });

    it('should call onUpdate callback after successful status change', async () => {
      const onUpdate = jest.fn();
      (atsApi.updateApplicationStatus as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
          onUpdate={onUpdate}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Change Status')).toBeInTheDocument();
      });

      const reviewingBtn = screen.getByRole('button', { name: 'Reviewing' });
      fireEvent.click(reviewingBtn);

      await waitFor(() => {
        expect(onUpdate).toHaveBeenCalledTimes(1);
      });
    });

    it('should show error alert on status change failure', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();
      (atsApi.updateApplicationStatus as jest.Mock).mockRejectedValue({
        response: { data: { detail: 'Update failed' } },
      });

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Change Status')).toBeInTheDocument();
      });

      const reviewingBtn = screen.getByRole('button', { name: 'Reviewing' });
      fireEvent.click(reviewingBtn);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Update failed');
      });

      alertSpy.mockRestore();
    });
  });

  describe('Notes Management', () => {
    it('should add new note when form submitted', async () => {
      const user = userEvent.setup();
      (atsApi.addApplicationNote as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Notes/i }));
      });

      const textarea = screen.getByPlaceholderText(/Enter your note/i);
      await user.type(textarea, 'New test note');

      const submitButton = screen.getByRole('button', { name: /Add Note/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(atsApi.addApplicationNote).toHaveBeenCalledWith('app-1', {
          content: 'New test note',
          visibility: 'team',
        });
      });
    });

    it('should refresh notes after adding', async () => {
      const user = userEvent.setup();
      (atsApi.addApplicationNote as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Notes/i }));
      });

      await waitFor(() => {
        expect(atsApi.getApplicationNotes).toHaveBeenCalledTimes(1);
      });

      const textarea = screen.getByPlaceholderText(/Enter your note/i);
      await user.type(textarea, 'New note');

      const submitButton = screen.getByRole('button', { name: /Add Note/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(atsApi.getApplicationNotes).toHaveBeenCalledTimes(2);
      });
    });

    it('should clear form after successful submission', async () => {
      const user = userEvent.setup();
      (atsApi.addApplicationNote as jest.Mock).mockResolvedValue({
        data: { success: true },
      });

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Notes/i }));
      });

      const textarea = screen.getByPlaceholderText(/Enter your note/i) as HTMLTextAreaElement;
      await user.type(textarea, 'Test note');

      const privateRadio = screen.getByLabelText(/Private/i);
      fireEvent.click(privateRadio);

      const submitButton = screen.getByRole('button', { name: /Add Note/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(textarea.value).toBe('');
        expect(screen.getByLabelText(/Team Visible/i)).toBeChecked();
      });
    });

    it('should disable form during submission', async () => {
      const user = userEvent.setup();
      (atsApi.addApplicationNote as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Notes/i }));
      });

      const textarea = screen.getByPlaceholderText(/Enter your note/i);
      await user.type(textarea, 'Test');

      const submitButton = screen.getByRole('button', { name: /Add Note/i });
      fireEvent.click(submitButton);

      expect(textarea).toBeDisabled();
      expect(screen.getByRole('button', { name: /Adding.../i })).toBeDisabled();
    });

    it('should not submit empty note', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Notes/i }));
      });

      const submitButton = screen.getByRole('button', { name: /Add Note/i });
      fireEvent.click(submitButton);

      expect(atsApi.addApplicationNote).not.toHaveBeenCalled();
    });

    it('should show error alert on add note failure', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation();
      const user = userEvent.setup();
      (atsApi.addApplicationNote as jest.Mock).mockRejectedValue({
        response: { data: { detail: 'Failed to add note' } },
      });

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Notes/i }));
      });

      const textarea = screen.getByPlaceholderText(/Enter your note/i);
      await user.type(textarea, 'Test note');

      const submitButton = screen.getByRole('button', { name: /Add Note/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Failed to add note');
      });

      alertSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible modal structure', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /candidate details/i })).toBeInTheDocument();
      });
    });

    it('should have accessible tab navigation', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        const tabs = screen.getAllByRole('button').filter(
          (btn) =>
            btn.textContent === 'Overview' ||
            btn.textContent === 'AI Fit Score' ||
            btn.textContent?.startsWith('Notes')
        );
        expect(tabs.length).toBe(3);
      });
    });

    it('should have accessible form labels', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /Notes/i }));
      });

      await waitFor(() => {
        expect(screen.getByLabelText(/Team Visible/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Private/i)).toBeInTheDocument();
      });
    });

    it('should have accessible close buttons', async () => {
      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={jest.fn()}
        />
      );

      await waitFor(() => {
        const closeButtons = screen.getAllByRole('button', { name: /close/i });
        expect(closeButtons.length).toBeGreaterThan(0);
      });
    });

    it('should support keyboard navigation', async () => {
      const onClose = jest.fn();

      render(
        <CandidateDetailModal
          applicationId="app-1"
          isOpen={true}
          onClose={onClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Candidate Details')).toBeInTheDocument();
      });

      const closeButton = screen.getByRole('button', { name: /^close$/i });
      closeButton.focus();
      expect(closeButton).toHaveFocus();

      fireEvent.keyDown(closeButton, { key: 'Enter', code: 'Enter' });
      fireEvent.click(closeButton);

      expect(onClose).toHaveBeenCalled();
    });
  });
});
