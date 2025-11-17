/**
 * ATS Integration Unit Tests
 * Week 40 Day 3
 *
 * Test Coverage:
 * - View Toggle (8 tests)
 * - Shared State (10 tests)
 * - Modal Integration (6 tests)
 * - URL State (6 tests)
 *
 * Total: 30 tests
 * Methodology: TDD (RED phase - tests written before implementation)
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

// Components to be implemented
import ATSPage from '@/app/employer/jobs/[jobId]/applications/page';
import ATSViewToggle from '@/components/employer/ATSViewToggle';
import { useATSStore } from '@/hooks/useATSStore';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

// Mock API
jest.mock('@/lib/api', () => ({
  atsApi: {
    getJobApplications: jest.fn(),
    updateApplicationStatus: jest.fn(),
    bulkUpdateApplications: jest.fn(),
    calculateFit: jest.fn(),
    getApplicationDetails: jest.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock data
const mockApplications = [
  {
    id: 'app-1',
    candidateId: 'cand-1',
    candidateName: 'Alice Johnson',
    candidateEmail: 'alice@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Engineer',
    fitIndex: 92,
    stage: 'new',
    appliedAt: '2025-01-10T10:00:00Z',
    tags: ['React', 'TypeScript'],
  },
  {
    id: 'app-2',
    candidateId: 'cand-2',
    candidateName: 'Bob Smith',
    candidateEmail: 'bob@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Engineer',
    fitIndex: 68,
    stage: 'reviewing',
    appliedAt: '2025-01-09T14:30:00Z',
    tags: ['Vue', 'JavaScript'],
  },
];

describe('ATS Integration - View Toggle', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Zustand store to prevent test interference
    const { useATSStore } = require('@/hooks/useATSStore');
    useATSStore.getState()._resetStore();

    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
    });
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    (usePathname as jest.Mock).mockReturnValue('/employer/jobs/job-1/applications');

    // Mock API responses for this test suite
    const { atsApi } = require('@/lib/api');
    atsApi.getJobApplications.mockResolvedValue({
      data: { data: mockApplications, total: mockApplications.length },
    });
  });

  test('should render view toggle button', () => {
    render(<ATSViewToggle view="list" onToggle={jest.fn()} />);

    expect(screen.getByRole('button', { name: /toggle view/i })).toBeInTheDocument();
  });

  test('should switch from List to Kanban view', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();

    render(<ATSViewToggle view="list" onToggle={onToggle} />);

    const toggleButton = screen.getByRole('button', { name: /toggle view/i });
    await user.click(toggleButton);

    expect(onToggle).toHaveBeenCalledWith('kanban');
  });

  test('should switch from Kanban to List view', async () => {
    const onToggle = jest.fn();
    const user = userEvent.setup();

    render(<ATSViewToggle view="kanban" onToggle={onToggle} />);

    const toggleButton = screen.getByRole('button', { name: /toggle view/i });
    await user.click(toggleButton);

    expect(onToggle).toHaveBeenCalledWith('list');
  });

  test('should persist view preference to localStorage', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<ATSPage params={{ jobId: 'job-1' }} />);

    // Switch to Kanban view
    const toggleButton = screen.getByRole('button', { name: /toggle view/i });
    await user.click(toggleButton);

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ats_view_preference',
        'kanban'
      );
    });
  });

  test('should load view preference from localStorage', () => {
    localStorageMock.getItem.mockReturnValue('kanban');

    render(<ATSPage params={{ jobId: 'job-1' }} />);

    // Kanban view should be active
    expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
  });

  test('should update URL query param when view changes', async () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, replace: jest.fn() });

    const user = userEvent.setup();
    render(<ATSPage params={{ jobId: 'job-1' }} />);

    const toggleButton = screen.getByRole('button', { name: /toggle view/i });
    await user.click(toggleButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('view=kanban')
      );
    });
  });

  test('should announce view change to screen reader', async () => {
    const user = userEvent.setup();
    render(<ATSPage params={{ jobId: 'job-1' }} />);

    const toggleButton = screen.getByRole('button', { name: /toggle view/i });
    await user.click(toggleButton);

    const announcement = screen.getByRole('status', { name: /view announcement/i });
    expect(announcement).toHaveTextContent(/switched to kanban view/i);
  });

  test('should support keyboard shortcut Alt+V to toggle', async () => {
    const user = userEvent.setup();
    render(<ATSPage params={{ jobId: 'job-1' }} />);

    // Initially in List view
    expect(screen.queryByTestId('dnd-context')).not.toBeInTheDocument();

    // Press Alt+V
    await user.keyboard('{Alt>}v{/Alt}');

    // Should switch to Kanban view
    await waitFor(() => {
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    });
  });
});

describe('ATS Integration - Shared State', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Zustand store to prevent test interference
    const { useATSStore } = require('@/hooks/useATSStore');
    useATSStore.getState()._resetStore();

    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
    });
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    (usePathname as jest.Mock).mockReturnValue('/employer/jobs/job-1/applications');

    const { atsApi } = require('@/lib/api');
    atsApi.getJobApplications.mockResolvedValue({
      data: { data: mockApplications, total: mockApplications.length },
    });
  });

  test('should fetch applications on mount', async () => {
    const { atsApi } = require('@/lib/api');
    render(<ATSPage params={{ jobId: 'job-1' }} />);

    await waitFor(() => {
      expect(atsApi.getJobApplications).toHaveBeenCalledWith('job-1');
    });
  });

  test('should share applications data between List and Kanban views', async () => {
    const user = userEvent.setup();
    render(<ATSPage params={{ jobId: 'job-1' }} />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Switch to Kanban view
    const toggleButton = screen.getByRole('button', { name: /toggle view/i });
    await user.click(toggleButton);

    // Same data should be visible in Kanban
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });

  test('should apply filters to both List and Kanban views', async () => {
    const user = userEvent.setup();
    render(<ATSPage params={{ jobId: 'job-1' }} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Apply filter: min fit index = 80
    const filterButton = screen.getByLabelText(/filter/i);
    await user.click(filterButton);
    const minFitInput = screen.getByLabelText(/minimum fit index/i);
    await user.clear(minFitInput);
    await user.type(minFitInput, '80');

    // Only Alice (92) should be visible
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();

    // Switch to Kanban view
    const toggleButton = screen.getByRole('button', { name: /toggle view/i });
    await user.click(toggleButton);

    // Same filter should apply
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    });
  });

  test('should apply sort to both List and Kanban views', async () => {
    const user = userEvent.setup();
    render(<ATSPage params={{ jobId: 'job-1' }} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Sort by fit index descending
    const sortSelect = screen.getByLabelText(/sort/i);
    await user.selectOptions(sortSelect, 'fit-desc');

    // Get all cards in order
    const listCards = screen.getAllByTestId(/applicant-row|kanban-card/);
    const firstCardName = listCards[0].textContent;
    expect(firstCardName).toContain('Alice'); // 92 fit index

    // Switch to Kanban view
    const toggleButton = screen.getByRole('button', { name: /toggle view/i });
    await user.click(toggleButton);

    // Same sort order should apply
    await waitFor(() => {
      const kanbanCards = screen.getAllByTestId('kanban-card');
      const firstKanbanName = kanbanCards[0].textContent;
      expect(firstKanbanName).toContain('Alice');
    });
  });

  test('should preserve selection state when switching views', async () => {
    const user = userEvent.setup();
    render(<ATSPage params={{ jobId: 'job-1' }} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Select Alice in List view
    const aliceCheckbox = screen.getByRole('checkbox', { name: /select alice/i });
    await user.click(aliceCheckbox);

    expect(aliceCheckbox).toBeChecked();

    // Switch to Kanban view
    const toggleButton = screen.getByRole('button', { name: /toggle view/i });
    await user.click(toggleButton);

    // Switch back to List view
    await user.click(toggleButton);

    // Selection should be preserved
    await waitFor(() => {
      const aliceCheckboxAgain = screen.getByRole('checkbox', { name: /select alice/i });
      expect(aliceCheckboxAgain).toBeChecked();
    });
  });

  test('should update both views when application data changes', async () => {
    const { atsApi } = require('@/lib/api');
    const user = userEvent.setup();

    render(<ATSPage params={{ jobId: 'job-1' }} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Mock stage change
    atsApi.updateApplicationStatus.mockResolvedValue({
      data: { ...mockApplications[0], stage: 'reviewing' },
    });

    // Change Alice's stage
    const stageSelect = screen.getByLabelText(/change stage.*alice/i);
    await user.selectOptions(stageSelect, 'reviewing');

    // Wait for update
    await waitFor(() => {
      expect(atsApi.updateApplicationStatus).toHaveBeenCalled();
    });

    // Verify change in List view
    expect(screen.getByText(/reviewing/i)).toBeInTheDocument();

    // Switch to Kanban view
    const toggleButton = screen.getByRole('button', { name: /toggle view/i });
    await user.click(toggleButton);

    // Verify change in Kanban view
    await waitFor(() => {
      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');
      expect(reviewingColumn).toContainElement(screen.getByText('Alice Johnson'));
    });
  });

  test('should handle loading state in both views', async () => {
    const { atsApi } = require('@/lib/api');
    atsApi.getJobApplications.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: { data: mockApplications } }), 1000))
    );

    const { rerender } = render(<ATSPage params={{ jobId: 'job-1' }} />);

    // Should show loading state
    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    // Wait for data
    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  test('should handle error state in both views', async () => {
    const { atsApi } = require('@/lib/api');
    atsApi.getJobApplications.mockRejectedValue(new Error('Network error'));

    render(<ATSPage params={{ jobId: 'job-1' }} />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load applications/i)).toBeInTheDocument();
    });

    // Should show retry button
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  test('should show empty state when no applications', async () => {
    const { atsApi } = require('@/lib/api');
    atsApi.getJobApplications.mockResolvedValue({
      data: { data: [], total: 0 },
    });

    render(<ATSPage params={{ jobId: 'job-1' }} />);

    await waitFor(() => {
      expect(screen.getByText(/no applications yet/i)).toBeInTheDocument();
    });
  });

  test('should refresh data after modal update', async () => {
    const { atsApi } = require('@/lib/api');
    const user = userEvent.setup();

    render(<ATSPage params={{ jobId: 'job-1' }} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Open modal
    const viewButton = screen.getAllByRole('button', { name: /view details/i })[0];
    await user.click(viewButton);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /candidate details/i })).toBeInTheDocument();
    });

    // Change stage in modal
    atsApi.updateApplicationStatus.mockResolvedValue({
      data: { ...mockApplications[0], stage: 'reviewing' },
    });

    const modalStageButton = screen.getByRole('button', { name: /reviewing/i });
    await user.click(modalStageButton);

    // Close modal
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    // Data should refresh
    await waitFor(() => {
      expect(atsApi.getJobApplications).toHaveBeenCalledTimes(2); // Initial + refresh
    });
  });
});

describe('ATS Integration - Modal Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Zustand store to prevent test interference
    const { useATSStore } = require('@/hooks/useATSStore');
    useATSStore.getState()._resetStore();

    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
    });
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    (usePathname as jest.Mock).mockReturnValue('/employer/jobs/job-1/applications');

    const { atsApi } = require('@/lib/api');
    atsApi.getJobApplications.mockResolvedValue({
      data: { data: mockApplications, total: mockApplications.length },
    });
  });

  test('should open modal from List view when row clicked', async () => {
    const user = userEvent.setup();
    render(<ATSPage params={{ jobId: 'job-1' }} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Click on applicant row
    const viewButton = screen.getAllByRole('button', { name: /view details/i })[0];
    await user.click(viewButton);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /candidate details/i })).toBeInTheDocument();
    });
  });

  test('should open modal from Kanban view when card clicked', async () => {
    const user = userEvent.setup();
    render(<ATSPage params={{ jobId: 'job-1' }} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Switch to Kanban view
    const toggleButton = screen.getByRole('button', { name: /toggle view/i });
    await user.click(toggleButton);

    await waitFor(() => {
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
    });

    // Click on candidate card
    const aliceCard = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
    await user.click(aliceCard!);

    // Modal should open
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /candidate details/i })).toBeInTheDocument();
    });
  });

  test('should close modal when backdrop clicked', async () => {
    const user = userEvent.setup();
    render(<ATSPage params={{ jobId: 'job-1' }} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Open modal
    const viewButton = screen.getAllByRole('button', { name: /view details/i })[0];
    await user.click(viewButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /candidate details/i })).toBeInTheDocument();
    });

    // Click backdrop
    const backdrop = screen.getByRole('dialog').closest('.fixed');
    await user.click(backdrop!, { position: { x: 10, y: 10 } });

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /candidate details/i })).not.toBeInTheDocument();
    });
  });

  test('should close modal when Esc key pressed', async () => {
    const user = userEvent.setup();
    render(<ATSPage params={{ jobId: 'job-1' }} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Open modal
    const viewButton = screen.getAllByRole('button', { name: /view details/i })[0];
    await user.click(viewButton);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /candidate details/i })).toBeInTheDocument();
    });

    // Press Esc
    await user.keyboard('{Escape}');

    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /candidate details/i })).not.toBeInTheDocument();
    });
  });

  test('should update List view after modal stage change', async () => {
    const { atsApi } = require('@/lib/api');
    const user = userEvent.setup();

    render(<ATSPage params={{ jobId: 'job-1' }} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Open modal
    const viewButton = screen.getAllByRole('button', { name: /view details/i })[0];
    await user.click(viewButton);

    // Change stage in modal
    atsApi.updateApplicationStatus.mockResolvedValue({
      data: { ...mockApplications[0], stage: 'reviewing' },
    });

    const reviewingButton = screen.getByRole('button', { name: /reviewing/i });
    await user.click(reviewingButton);

    // Close modal
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    // List view should show updated stage
    await waitFor(() => {
      expect(screen.getByText(/reviewing/i)).toBeInTheDocument();
    });
  });

  test('should update Kanban view after modal stage change', async () => {
    const { atsApi } = require('@/lib/api');
    const user = userEvent.setup();

    render(<ATSPage params={{ jobId: 'job-1' }} />);

    await waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    });

    // Switch to Kanban view
    const toggleButton = screen.getByRole('button', { name: /toggle view/i });
    await user.click(toggleButton);

    // Open modal
    const aliceCard = screen.getByText('Alice Johnson').closest('[data-testid="kanban-card"]');
    await user.click(aliceCard!);

    // Change stage in modal
    atsApi.updateApplicationStatus.mockResolvedValue({
      data: { ...mockApplications[0], stage: 'reviewing' },
    });

    const reviewingButton = screen.getByRole('button', { name: /reviewing/i });
    await user.click(reviewingButton);

    // Close modal
    const closeButton = screen.getByRole('button', { name: /close/i });
    await user.click(closeButton);

    // Kanban view should show Alice in Reviewing column
    await waitFor(() => {
      const reviewingColumn = screen.getByText('Reviewing').closest('[data-testid="kanban-column"]');
      expect(reviewingColumn).toContainElement(screen.getByText('Alice Johnson'));
    });
  });
});

describe('ATS Integration - URL State', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Zustand store to prevent test interference
    const { useATSStore } = require('@/hooks/useATSStore');
    useATSStore.getState()._resetStore();

    (useRouter as jest.Mock).mockReturnValue({
      push: jest.fn(),
      replace: jest.fn(),
    });
    (useSearchParams as jest.Mock).mockReturnValue(new URLSearchParams());
    (usePathname as jest.Mock).mockReturnValue('/employer/jobs/job-1/applications');

    const { atsApi } = require('@/lib/api');
    atsApi.getJobApplications.mockResolvedValue({
      data: { data: mockApplications, total: mockApplications.length },
    });
  });

  test('should initialize view from URL query param', () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams('view=kanban')
    );

    render(<ATSPage params={{ jobId: 'job-1' }} />);

    // Should render Kanban view
    expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
  });

  test('should update URL when view changes via toggle', async () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, replace: jest.fn() });

    const user = userEvent.setup();
    render(<ATSPage params={{ jobId: 'job-1' }} />);

    const toggleButton = screen.getByRole('button', { name: /toggle view/i });
    await user.click(toggleButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('view=kanban')
      );
    });
  });

  test('should initialize filters from URL query params', () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams('minFit=80&stage=new')
    );

    render(<ATSPage params={{ jobId: 'job-1' }} />);

    // Only Alice (92, new) should be visible
    waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    });
  });

  test('should update URL when filters change', async () => {
    const mockPush = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush, replace: jest.fn() });

    const user = userEvent.setup();
    render(<ATSPage params={{ jobId: 'job-1' }} />);

    // Apply filter
    const filterButton = screen.getByLabelText(/filter/i);
    await user.click(filterButton);
    const minFitInput = screen.getByLabelText(/minimum fit index/i);
    await user.type(minFitInput, '80');

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(
        expect.stringContaining('minFit=80')
      );
    });
  });

  test('should support shareable URLs with filters and view', () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams('view=kanban&minFit=80&stage=reviewing')
    );

    render(<ATSPage params={{ jobId: 'job-1' }} />);

    // Should render Kanban view with filters applied
    waitFor(() => {
      expect(screen.getByTestId('dnd-context')).toBeInTheDocument();
      // Only Bob (68 < 80) should be filtered out
      expect(screen.queryByText('Bob Smith')).not.toBeInTheDocument();
    });
  });

  test('should handle invalid URL params gracefully', () => {
    (useSearchParams as jest.Mock).mockReturnValue(
      new URLSearchParams('view=invalid&minFit=abc')
    );

    render(<ATSPage params={{ jobId: 'job-1' }} />);

    // Should default to List view
    expect(screen.queryByTestId('dnd-context')).not.toBeInTheDocument();

    // Should ignore invalid minFit
    waitFor(() => {
      expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      expect(screen.getByText('Bob Smith')).toBeInTheDocument();
    });
  });
});
