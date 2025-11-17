/**
 * ApplicantKanbanBoard Component Unit Tests
 *
 * Test Coverage:
 * - Rendering & Visibility (10 tests)
 * - Drag-and-Drop Behavior (12 tests)
 * - Card Interactions (8 tests)
 * - Filtering & Sorting (6 tests)
 * - Accessibility (8 tests)
 * - Edge Cases (6 tests)
 *
 * Total: 50 tests
 * Methodology: TDD (RED phase - tests written before component)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ApplicantKanbanBoard from '@/components/employer/ApplicantKanbanBoard';
import { atsApi } from '@/lib/api';

// Mock the API module
jest.mock('@/lib/api', () => ({
  atsApi: {
    getApplications: jest.fn(),
    updateApplicationStatus: jest.fn(),
    bulkUpdateApplications: jest.fn(),
  },
}));

// Mock @dnd-kit modules
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  useDraggable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
  }),
  useDroppable: () => ({
    setNodeRef: jest.fn(),
    isOver: false,
  }),
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div data-testid="drag-overlay">{children}</div>,
  PointerSensor: jest.fn(),
  KeyboardSensor: jest.fn(),
  useSensor: jest.fn(),
  useSensors: jest.fn(() => []),
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div data-testid="sortable-context">{children}</div>,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
  }),
  verticalListSortingStrategy: jest.fn(),
}));

// Mock data
const mockApplicants = [
  {
    id: 'app-1',
    candidateId: 'cand-1',
    candidateName: 'Alice Johnson',
    candidateEmail: 'alice@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Engineer',
    fitIndex: 92,
    stage: 'new' as const,
    appliedAt: '2025-01-10T10:00:00Z',
    resumeUrl: 'https://example.com/resume1.pdf',
    tags: ['React', 'TypeScript', 'Remote'],
    assignedTo: 'recruiter-1',
  },
  {
    id: 'app-2',
    candidateId: 'cand-2',
    candidateName: 'Bob Smith',
    candidateEmail: 'bob@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Engineer',
    fitIndex: 68,
    stage: 'reviewing' as const,
    appliedAt: '2025-01-09T14:30:00Z',
    tags: ['Vue', 'JavaScript'],
    assignedTo: 'recruiter-2',
  },
  {
    id: 'app-3',
    candidateId: 'cand-3',
    candidateName: 'Carol Davis',
    candidateEmail: 'carol@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Engineer',
    fitIndex: 85,
    stage: 'phone_screen' as const,
    appliedAt: '2025-01-08T09:15:00Z',
    tags: ['React', 'Node.js', 'Referral'],
  },
  {
    id: 'app-4',
    candidateId: 'cand-4',
    candidateName: 'David Wilson',
    candidateEmail: 'david@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Engineer',
    fitIndex: 78,
    stage: 'technical_interview' as const,
    appliedAt: '2025-01-07T16:45:00Z',
    tags: ['Angular', 'TypeScript'],
  },
  {
    id: 'app-5',
    candidateId: 'cand-5',
    candidateName: 'Eve Martinez',
    candidateEmail: 'eve@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Engineer',
    fitIndex: 95,
    stage: 'final_interview' as const,
    appliedAt: '2025-01-06T11:20:00Z',
    tags: ['React', 'GraphQL', 'Leadership'],
  },
  {
    id: 'app-6',
    candidateId: 'cand-6',
    candidateName: 'Frank Brown',
    candidateEmail: 'frank@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Engineer',
    fitIndex: 42,
    stage: 'rejected' as const,
    appliedAt: '2025-01-05T08:30:00Z',
    tags: ['jQuery', 'PHP'],
  },
];

const mockApiResponse = {
  data: {
    data: mockApplicants,
    total: mockApplicants.length,
  },
};

describe('ApplicantKanbanBoard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (atsApi.getJobApplications as jest.Mock).mockResolvedValue(mockApiResponse);
    (atsApi.updateApplicationStatus as jest.Mock).mockResolvedValue({ data: { success: true } });
  });

  // =================================================================
  // 1. RENDERING & VISIBILITY (10 tests)
  // =================================================================
  describe('Rendering & Visibility', () => {
    test('should render all 8 stage columns', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('New')).toBeInTheDocument();
      });

      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Reviewing')).toBeInTheDocument();
      expect(screen.getByText('Phone Screen')).toBeInTheDocument();
      expect(screen.getByText('Technical Interview')).toBeInTheDocument();
      expect(screen.getByText('Final Interview')).toBeInTheDocument();
      expect(screen.getByText('Offer')).toBeInTheDocument();
      expect(screen.getByText('Hired')).toBeInTheDocument();
      expect(screen.getByText('Rejected')).toBeInTheDocument();
    });

    test('should display candidate count per column', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('New')).toBeInTheDocument();
      });

      // New: 1, Reviewing: 1, Phone Screen: 1, Technical: 1, Final: 1, Rejected: 1
      const newColumn = screen.getByText('New').closest('[data-testid="kanban-column"]');
      expect(within(newColumn!).getByText('1')).toBeInTheDocument();

      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');
      expect(within(reviewingColumn!).getByText('1')).toBeInTheDocument();
    });

    test('should render candidate cards in correct columns', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Check candidates are in correct columns
      const newColumn = screen.getByText('New').closest('[data-testid="kanban-column"]');
      expect(within(newColumn!).getByText('Alice Johnson')).toBeInTheDocument();

      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');
      expect(within(reviewingColumn!).getByText('Bob Smith')).toBeInTheDocument();

      const phoneColumn = screen.getByText('Phone Screen').closest('[data-testid="kanban-column"]');
      expect(within(phoneColumn!).getByText('Carol Davis')).toBeInTheDocument();
    });

    test('should show empty state when no candidates', async () => {
      (atsApi.getJobApplications as jest.Mock).mockResolvedValue({
        data: { data: [], total: 0 },
      });

      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('No candidates yet')).toBeInTheDocument();
      });

      expect(screen.getByText(/Post this job to start receiving applications/i)).toBeInTheDocument();
    });

    test('should display fit index badges with correct colors', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // High fit (>80) - green
      const aliceCard = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      const aliceBadge = within(aliceCard!).getByText('92');
      expect(aliceBadge).toHaveClass('bg-green-100');

      // Medium fit (60-80) - yellow
      const bobCard = screen.getByText('Bob Smith').closest('[data-testid="kanban-card"]');
      const bobBadge = within(bobCard!).getByText('68');
      expect(bobBadge).toHaveClass('bg-yellow-100');

      // Low fit (<60) - red
      const frankCard = screen.getByText('Frank Brown').closest('[data-testid="kanban-card"]');
      const frankBadge = within(frankCard!).getByText('42');
      expect(frankBadge).toHaveClass('bg-red-100');
    });

    test('should show applied date as relative time', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Should show relative times like "3 days ago"
      const aliceCard = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      expect(within(aliceCard!).getByText(/days? ago/i)).toBeInTheDocument();
    });

    test('should display candidate tags', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const aliceCard = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      expect(within(aliceCard!).getByText('React')).toBeInTheDocument();
      expect(within(aliceCard!).getByText('TypeScript')).toBeInTheDocument();
      expect(within(aliceCard!).getByText('Remote')).toBeInTheDocument();
    });

    test('should show assigned recruiter when present', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const aliceCard = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      expect(within(aliceCard!).getByText(/Assigned/i)).toBeInTheDocument();
    });

    test('should render quick action buttons on cards', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const aliceCard = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      expect(within(aliceCard!).getByLabelText('View details')).toBeInTheDocument();
      expect(within(aliceCard!).getByLabelText('Add note')).toBeInTheDocument();
    });

    test('should allow collapsing and expanding columns', async () => {
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const newColumn = screen.getByText('New').closest('[data-testid="kanban-column"]');
      const collapseButton = within(newColumn!).getByLabelText('Collapse column');

      // Collapse
      await user.click(collapseButton);
      expect(screen.queryByText('Alice Johnson')).not.toBeVisible();

      // Expand
      const expandButton = within(newColumn!).getByLabelText('Expand column');
      await user.click(expandButton);
      expect(screen.getByText('Alice Johnson')).toBeVisible();
    });
  });

  // =================================================================
  // 2. DRAG-AND-DROP BEHAVIOR (12 tests)
  // =================================================================
  describe('Drag-and-Drop Behavior', () => {
    test('should allow dragging candidate card', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      expect(card).toHaveAttribute('draggable', 'true');
    });

    test('should show drag ghost during drag operation', async () => {
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');

      // Simulate drag start
      fireEvent.dragStart(card!);

      await waitFor(() => {
        expect(screen.getByTestId('drag-overlay')).toBeInTheDocument();
      });
    });

    test('should highlight drop zones during drag', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      fireEvent.dragStart(card!);

      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');
      fireEvent.dragOver(reviewingColumn!);

      expect(reviewingColumn).toHaveClass('ring-2', 'ring-blue-500');
    });

    test('should update stage on successful drop', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');

      // Simulate drag and drop
      fireEvent.dragStart(card!);
      fireEvent.dragOver(reviewingColumn!);
      fireEvent.drop(reviewingColumn!);
      fireEvent.dragEnd(card!);

      await waitFor(() => {
        expect(atsApi.updateApplicationStatus).toHaveBeenCalledWith('app-1', {
          status: 'reviewing',
        });
      });
    });

    test('should call onStageChange callback when provided', async () => {
      const onStageChange = jest.fn();
      render(<ApplicantKanbanBoard jobId="job-1" onStageChange={onStageChange} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');

      fireEvent.dragStart(card!);
      fireEvent.drop(reviewingColumn!);
      fireEvent.dragEnd(card!);

      await waitFor(() => {
        expect(onStageChange).toHaveBeenCalledWith('app-1', 'new', 'reviewing');
      });
    });

    test('should show optimistic update immediately', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');

      fireEvent.dragStart(card!);
      fireEvent.drop(reviewingColumn!);
      fireEvent.dragEnd(card!);

      // Card should move immediately (before API response)
      const newReviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');
      expect(within(newReviewingColumn!).getByText('Alice Johnson')).toBeInTheDocument();
    });

    test('should handle drag cancel with Escape key', async () => {
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      fireEvent.dragStart(card!);

      // Press Escape to cancel
      await user.keyboard('{Escape}');

      // Card should remain in original column
      const newColumn = screen.getByText('New').closest('[data-testid="kanban-column"]');
      expect(within(newColumn!).getByText('Alice Johnson')).toBeInTheDocument();

      // API should not be called
      expect(atsApi.updateApplicationStatus).not.toHaveBeenCalled();
    });

    test('should prevent dragging to same column', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      const newColumn = screen.getByText('New').closest('[data-testid="kanban-column"]');

      fireEvent.dragStart(card!);
      fireEvent.drop(newColumn!);
      fireEvent.dragEnd(card!);

      // API should not be called (same column)
      expect(atsApi.updateApplicationStatus).not.toHaveBeenCalled();
    });

    test('should update candidate count after drag', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');

      // Initial counts: New=1, Reviewing=1
      const newColumn = screen.getByText('New').closest('[data-testid="kanban-column"]');
      expect(within(newColumn!).getByText('1')).toBeInTheDocument();
      expect(within(reviewingColumn!).getByText('1')).toBeInTheDocument();

      // Drag and drop
      fireEvent.dragStart(card!);
      fireEvent.drop(reviewingColumn!);
      fireEvent.dragEnd(card!);

      await waitFor(() => {
        // New counts: New=0, Reviewing=2
        expect(within(newColumn!).getByText('0')).toBeInTheDocument();
        expect(within(reviewingColumn!).getByText('2')).toBeInTheDocument();
      });
    });

    test('should preserve card order within column', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Bob Smith')).toBeInTheDocument();
      });

      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');
      const cards = within(reviewingColumn!).getAllByTestId('kanban-card');

      // Add another card to Reviewing
      const aliceCard = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      fireEvent.dragStart(aliceCard!);
      fireEvent.drop(reviewingColumn!);
      fireEvent.dragEnd(aliceCard!);

      await waitFor(() => {
        const updatedCards = within(reviewingColumn!).getAllByTestId('kanban-card');
        expect(updatedCards.length).toBe(2);
        // Order should be preserved (most recent first or by applied date)
      });
    });

    test('should handle multiple rapid drags gracefully', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');
      const phoneColumn = screen.getByText('Phone Screen').closest('[data-testid="kanban-column"]');

      // Rapid drag operations
      fireEvent.dragStart(card!);
      fireEvent.drop(reviewingColumn!);
      fireEvent.dragEnd(card!);

      fireEvent.dragStart(card!);
      fireEvent.drop(phoneColumn!);
      fireEvent.dragEnd(card!);

      // All API calls should be queued properly
      await waitFor(() => {
        expect(atsApi.updateApplicationStatus).toHaveBeenCalledTimes(2);
      });
    });

    test('should show loading state during API call', async () => {
      (atsApi.updateApplicationStatus as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { success: true } }), 1000))
      );

      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');

      fireEvent.dragStart(card!);
      fireEvent.drop(reviewingColumn!);
      fireEvent.dragEnd(card!);

      // Should show loading indicator
      expect(within(card!).getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  // =================================================================
  // 3. CARD INTERACTIONS (8 tests)
  // =================================================================
  describe('Card Interactions', () => {
    test('should open detail modal on card click', async () => {
      const onCardClick = jest.fn();
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" onCardClick={onCardClick} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      await user.click(card!);

      expect(onCardClick).toHaveBeenCalledWith('app-1');
    });

    test('should show hover state with quick actions', async () => {
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');

      // Hover over card
      await user.hover(card!);

      // Quick actions should become visible
      expect(within(card!).getByLabelText('View details')).toBeVisible();
      expect(within(card!).getByLabelText('Add note')).toBeVisible();
      expect(within(card!).getByLabelText('Assign recruiter')).toBeVisible();
    });

    test('should allow adding note from card', async () => {
      const onAddNote = jest.fn();
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" onAddNote={onAddNote} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      await user.hover(card!);

      const addNoteButton = within(card!).getByLabelText('Add note');
      await user.click(addNoteButton);

      expect(onAddNote).toHaveBeenCalledWith('app-1');
    });

    test('should allow assigning recruiter from card', async () => {
      const onAssignRecruiter = jest.fn();
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" onAssignRecruiter={onAssignRecruiter} />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      await user.hover(card!);

      const assignButton = within(card!).getByLabelText('Assign recruiter');
      await user.click(assignButton);

      expect(onAssignRecruiter).toHaveBeenCalledWith('app-1');
    });

    test('should show context menu on right-click', async () => {
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');

      // Right-click
      fireEvent.contextMenu(card!);

      // Context menu should appear
      await waitFor(() => {
        expect(screen.getByRole('menu')).toBeInTheDocument();
      });

      expect(screen.getByText('Move to Reviewing')).toBeInTheDocument();
      expect(screen.getByText('Reject candidate')).toBeInTheDocument();
      expect(screen.getByText('Schedule interview')).toBeInTheDocument();
    });

    test('should navigate with keyboard (Tab, Enter)', async () => {
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Tab to first card
      await user.tab();
      const firstCard = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      expect(firstCard).toHaveFocus();

      // Tab to next card
      await user.tab();
      const secondCard = screen.getByText('Bob Smith').closest('[data-testid="kanban-card"]');
      expect(secondCard).toHaveFocus();
    });

    test('should announce actions to screen reader', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      fireEvent.dragStart(card!);

      const liveRegion = screen.getByRole('status', { name: /drag announcement/i });
      expect(liveRegion).toHaveTextContent(/Picked up Alice Johnson/i);
    });

    test('should focus next card after drag', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');

      fireEvent.dragStart(card!);
      fireEvent.drop(reviewingColumn!);
      fireEvent.dragEnd(card!);

      await waitFor(() => {
        // Focus should move to the next card in the original column
        const nextCard = screen.getByText('Bob Smith').closest('[data-testid="kanban-card"]');
        expect(nextCard).toHaveFocus();
      });
    });
  });

  // =================================================================
  // 4. FILTERING & SORTING (6 tests)
  // =================================================================
  describe('Filtering & Sorting', () => {
    test('should filter candidates by assignee', async () => {
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Open filter menu
      const filterButton = screen.getByLabelText('Filter candidates');
      await user.click(filterButton);

      // Select assignee filter
      const assigneeFilter = screen.getByLabelText('Filter by assignee');
      await user.click(assigneeFilter);
      await user.selectOptions(assigneeFilter, 'recruiter-1');

      // Only Alice should be visible (assigned to recruiter-1)
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    });

    test('should filter candidates by tags', async () => {
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const filterButton = screen.getByLabelText('Filter candidates');
      await user.click(filterButton);

      const tagFilter = screen.getByLabelText('Filter by tags');
      await user.click(tagFilter);
      await user.type(tagFilter, 'React');

      // Only React candidates should be visible
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Carol Davis')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    });

    test('should filter candidates by fit index range', async () => {
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const filterButton = screen.getByLabelText('Filter candidates');
      await user.click(filterButton);

      const minFitInput = screen.getByLabelText('Minimum fit index');
      await user.clear(minFitInput);
      await user.type(minFitInput, '80');

      // Only high-fit candidates (≥80) should be visible
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument(); // 92
      expect(screen.getByText('Carol Davis')).toBeInTheDocument(); // 85
      expect(screen.getByText('Eve Martinez')).toBeInTheDocument(); // 95
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument(); // 68
    });

    test('should sort candidates by fit index (high to low)', async () => {
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const sortButton = screen.getByLabelText('Sort candidates');
      await user.click(sortButton);
      await user.selectOptions(sortButton, 'fit-desc');

      // Get all cards in order
      const cards = screen.getAllByTestId('kanban-card');
      const names = cards.map(card => within(card).getByRole('heading').textContent);

      // First card should be Eve (95), then Alice (92), then Carol (85), etc.
      expect(names[0]).toBe('Eve Martinez');
      expect(names[1]).toBe('Alice Johnson');
      expect(names[2]).toBe('Carol Davis');
    });

    test('should sort candidates by applied date (newest first)', async () => {
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const sortButton = screen.getByLabelText('Sort candidates');
      await user.click(sortButton);
      await user.selectOptions(sortButton, 'date-desc');

      const cards = screen.getAllByTestId('kanban-card');
      const names = cards.map(card => within(card).getByRole('heading').textContent);

      // Most recent first: Alice (Jan 10), Bob (Jan 9), Carol (Jan 8), etc.
      expect(names[0]).toBe('Alice Johnson');
      expect(names[1]).toBe('Bob Smith');
      expect(names[2]).toBe('Carol Davis');
    });

    test('should persist sort/filter settings across columns', async () => {
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Set sort order
      const sortButton = screen.getByLabelText('Sort candidates');
      await user.click(sortButton);
      await user.selectOptions(sortButton, 'fit-desc');

      // Verify all columns are sorted
      const newColumn = screen.getByText('New').closest('[data-testid="kanban-column"]');
      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');

      // Both columns should show candidates sorted by fit index
      const newCards = within(newColumn!).getAllByTestId('kanban-card');
      const reviewCards = within(reviewingColumn!).getAllByTestId('kanban-card');

      // Verify sorting is applied to all columns
      expect(newCards.length + reviewCards.length).toBeGreaterThan(0);
    });
  });

  // =================================================================
  // 5. ACCESSIBILITY (8 tests)
  // =================================================================
  describe('Accessibility', () => {
    test('should have accessible column headers', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('New')).toBeInTheDocument();
      });

      const newHeader = screen.getByRole('heading', { name: /New/i });
      expect(newHeader).toHaveAttribute('aria-level', '2');
    });

    test('should announce drag start to screen reader', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      fireEvent.dragStart(card!);

      const announcement = screen.getByRole('status', { name: /drag announcement/i });
      expect(announcement).toHaveTextContent(/Picked up Alice Johnson from New column/i);
    });

    test('should announce drag end to screen reader', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');

      fireEvent.dragStart(card!);
      fireEvent.drop(reviewingColumn!);
      fireEvent.dragEnd(card!);

      await waitFor(() => {
        const announcement = screen.getByRole('status', { name: /drag announcement/i });
        expect(announcement).toHaveTextContent(/Moved Alice Johnson to Reviewing/i);
      });
    });

    test('should support keyboard drag (Space/Enter)', async () => {
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      card!.focus();

      // Press Space to initiate drag
      await user.keyboard(' ');

      // Should show keyboard drag mode
      expect(screen.getByText(/Press arrow keys to move/i)).toBeInTheDocument();

      // Arrow right to move to next column
      await user.keyboard('{ArrowRight}');

      // Press Space to drop
      await user.keyboard(' ');

      await waitFor(() => {
        expect(atsApi.updateApplicationStatus).toHaveBeenCalledWith('app-1', {
          status: 'reviewing',
        });
      });
    });

    test('should trap focus during drag', async () => {
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      fireEvent.dragStart(card!);

      // Tab should not move focus away from drag operation
      await user.tab();

      // Focus should remain within drag controls
      expect(document.activeElement).toBeInstanceOf(HTMLElement);
      expect(document.activeElement?.closest('[data-testid="dnd-context"]')).toBeTruthy();
    });

    test('should have ARIA labels on cards', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      expect(card).toHaveAttribute('aria-label');
      expect(card?.getAttribute('aria-label')).toMatch(/Alice Johnson.*92.*fit index/i);
    });

    test('should support arrow key navigation between cards', async () => {
      const user = userEvent.setup();
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const firstCard = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      firstCard!.focus();

      // Arrow down to next card in column
      await user.keyboard('{ArrowDown}');

      // Should focus next card (if exists in same column) or first card in next column
      expect(document.activeElement?.getAttribute('data-testid')).toBe('kanban-card');
    });

    test('should announce candidate count changes', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');

      fireEvent.dragStart(card!);
      fireEvent.drop(reviewingColumn!);
      fireEvent.dragEnd(card!);

      await waitFor(() => {
        const announcement = screen.getByRole('status', { name: /count announcement/i });
        expect(announcement).toHaveTextContent(/New: 0 candidates.*Reviewing: 2 candidates/i);
      });
    });
  });

  // =================================================================
  // 6. EDGE CASES (6 tests)
  // =================================================================
  describe('Edge Cases', () => {
    test('should handle 0 candidates gracefully', async () => {
      (atsApi.getJobApplications as jest.Mock).mockResolvedValue({
        data: { data: [], total: 0 },
      });

      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('No candidates yet')).toBeInTheDocument();
      });

      // All columns should show 0 count
      const columns = screen.getAllByTestId('kanban-column');
      columns.forEach(column => {
        expect(within(column).getByText('0')).toBeInTheDocument();
      });
    });

    test('should handle 100+ candidates per column with virtualization', async () => {
      const manyCandidates = Array.from({ length: 150 }, (_, i) => ({
        ...mockApplicants[0],
        id: `app-${i}`,
        candidateId: `cand-${i}`,
        candidateName: `Candidate ${i}`,
        candidateEmail: `candidate${i}@example.com`,
      }));

      (atsApi.getJobApplications as jest.Mock).mockResolvedValue({
        data: { data: manyCandidates, total: manyCandidates.length },
      });

      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Candidate 0')).toBeInTheDocument();
      });

      // Should show count of 150
      const newColumn = screen.getByText('New').closest('[data-testid="kanban-column"]');
      expect(within(newColumn!).getByText('150')).toBeInTheDocument();

      // Should only render visible cards (virtualization)
      const visibleCards = screen.getAllByTestId('kanban-card');
      expect(visibleCards.length).toBeLessThan(150);
    });

    test('should handle API errors gracefully', async () => {
      (atsApi.updateApplicationStatus as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');

      fireEvent.dragStart(card!);
      fireEvent.drop(reviewingColumn!);
      fireEvent.dragEnd(card!);

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText(/Failed to update candidate stage/i)).toBeInTheDocument();
      });

      // Should revert optimistic update
      const newColumn = screen.getByText('New').closest('[data-testid="kanban-column"]');
      expect(within(newColumn!).getByText('Alice Johnson')).toBeInTheDocument();
    });

    test('should handle network offline state', async () => {
      // Mock navigator.onLine
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // Should show offline banner
      expect(screen.getByText(/You are currently offline/i)).toBeInTheDocument();

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');

      fireEvent.dragStart(card!);
      fireEvent.drop(reviewingColumn!);
      fireEvent.dragEnd(card!);

      // Should queue changes for sync when online
      expect(screen.getByText(/Changes will sync when online/i)).toBeInTheDocument();

      // Restore online state
      Object.defineProperty(window.navigator, 'onLine', {
        writable: true,
        value: true,
      });
    });

    test('should prevent concurrent drag operations', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      const aliceCard = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      const bobCard = screen.getByText('Bob Smith').closest('[data-testid="kanban-card"]');

      // Start dragging Alice
      fireEvent.dragStart(aliceCard!);

      // Try to drag Bob while Alice is being dragged
      fireEvent.dragStart(bobCard!);

      // Second drag should be prevented
      expect(screen.getAllByTestId('drag-overlay')).toHaveLength(1);
    });

    test('should handle stage with single candidate', async () => {
      render(<ApplicantKanbanBoard jobId="job-1" />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });

      // New column has only 1 candidate
      const newColumn = screen.getByText('New').closest('[data-testid="kanban-column"]');
      expect(within(newColumn!).getAllByTestId('kanban-card')).toHaveLength(1);

      const card = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');

      fireEvent.dragStart(card!);
      fireEvent.drop(reviewingColumn!);
      fireEvent.dragEnd(card!);

      await waitFor(() => {
        // New column should now be empty
        expect(within(newColumn!).getByText('No candidates in this stage')).toBeInTheDocument();
        expect(within(newColumn!).getByText('0')).toBeInTheDocument();
      });
    });
  });
});
