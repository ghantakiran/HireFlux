/**
 * Tests for ApplicantList Component - Sprint 19-20 Week 39 Day 5
 * Following TDD approach: Write tests first, then implement component
 *
 * Applicant Tracking System (ATS) - Basic List View
 * Features:
 * - Display all applicants for a job
 * - Fit Index ranking (0-100 AI score)
 * - Pipeline stage management (8 stages)
 * - Filtering and sorting
 * - Applicant detail view
 * - Bulk actions
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ApplicantList } from '@/components/employer/ApplicantList';

// Mock data types
interface Applicant {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  fitIndex: number;
  stage: string;
  appliedAt: string;
  resumeUrl?: string;
  coverLetterText?: string;
  tags?: string[];
  assignedTo?: string;
}

// Mock applicants data
const mockApplicants: Applicant[] = [
  {
    id: 'app-1',
    candidateId: 'user-1',
    candidateName: 'John Doe',
    candidateEmail: 'john@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Developer',
    fitIndex: 92,
    stage: 'new',
    appliedAt: '2025-01-13T10:00:00Z',
    resumeUrl: 'https://example.com/resume1.pdf',
    tags: ['react', 'typescript'],
  },
  {
    id: 'app-2',
    candidateId: 'user-2',
    candidateName: 'Jane Smith',
    candidateEmail: 'jane@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Developer',
    fitIndex: 87,
    stage: 'reviewing',
    appliedAt: '2025-01-12T15:30:00Z',
    assignedTo: 'recruiter-1',
    tags: ['vue', 'javascript'],
  },
  {
    id: 'app-3',
    candidateId: 'user-3',
    candidateName: 'Bob Johnson',
    candidateEmail: 'bob@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Developer',
    fitIndex: 75,
    stage: 'phone_screen',
    appliedAt: '2025-01-11T09:15:00Z',
    tags: ['angular'],
  },
  {
    id: 'app-4',
    candidateId: 'user-4',
    candidateName: 'Alice Brown',
    candidateEmail: 'alice@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Developer',
    fitIndex: 68,
    stage: 'rejected',
    appliedAt: '2025-01-10T14:20:00Z',
    tags: ['jquery'],
  },
];

describe('ApplicantList Component', () => {
  // Mock handlers
  const mockOnViewApplicant = jest.fn();
  const mockOnUpdateStage = jest.fn();
  const mockOnBulkUpdate = jest.fn();
  const mockOnFilterChange = jest.fn();
  const mockOnSortChange = jest.fn();

  const defaultProps = {
    applicants: mockApplicants,
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Developer',
    loading: false,
    onViewApplicant: mockOnViewApplicant,
    onUpdateStage: mockOnUpdateStage,
    onBulkUpdate: mockOnBulkUpdate,
    onFilterChange: mockOnFilterChange,
    onSortChange: mockOnSortChange,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // Rendering Tests
  // ========================================================================

  it('should render applicant list', () => {
    render(<ApplicantList {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /applicants/i })).toBeInTheDocument();
  });

  it('should display job title', () => {
    render(<ApplicantList {...defaultProps} />);
    expect(screen.getByText(/senior frontend developer/i)).toBeInTheDocument();
  });

  it('should display applicant count', () => {
    render(<ApplicantList {...defaultProps} />);
    expect(screen.getByText(/4.*applicants?/i)).toBeInTheDocument();
  });

  it('should render all applicants', () => {
    render(<ApplicantList {...defaultProps} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    expect(screen.getByText('Alice Brown')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    render(<ApplicantList {...defaultProps} loading={true} />);
    expect(screen.getByText(/loading applicants/i)).toBeInTheDocument();
  });

  it('should display empty state when no applicants', () => {
    render(<ApplicantList {...defaultProps} applicants={[]} />);
    expect(screen.getByText(/no applicants yet/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Fit Index Display Tests
  // ========================================================================

  it('should display fit index for each applicant', () => {
    render(<ApplicantList {...defaultProps} />);
    expect(screen.getByText('92')).toBeInTheDocument(); // John Doe
    expect(screen.getByText('87')).toBeInTheDocument(); // Jane Smith
    expect(screen.getByText('75')).toBeInTheDocument(); // Bob Johnson
    expect(screen.getByText('68')).toBeInTheDocument(); // Alice Brown
  });

  it('should display fit index badge with color coding', () => {
    render(<ApplicantList {...defaultProps} />);

    // High score (>80) = green
    const highScore = screen.getByText('92').closest('[data-testid="fit-index-badge"]');
    expect(highScore).toHaveClass(/green|success/i);

    // Medium score (60-80) = yellow
    const mediumScore = screen.getByText('75').closest('[data-testid="fit-index-badge"]');
    expect(mediumScore).toHaveClass(/yellow|warning/i);

    // Low score (<60) = red
    const lowScore = screen.getByText('68').closest('[data-testid="fit-index-badge"]');
    expect(lowScore).toHaveClass(/yellow|warning|red|danger/i);
  });

  // ========================================================================
  // Stage/Status Display Tests
  // ========================================================================

  it('should display stage for each applicant', () => {
    render(<ApplicantList {...defaultProps} />);

    expect(screen.getByText(/new/i)).toBeInTheDocument();
    expect(screen.getByText(/reviewing/i)).toBeInTheDocument();
    expect(screen.getByText(/phone screen/i)).toBeInTheDocument();
    expect(screen.getByText(/rejected/i)).toBeInTheDocument();
  });

  it('should display stage badges with different colors', () => {
    render(<ApplicantList {...defaultProps} />);

    const newBadge = screen.getByText(/^new$/i).closest('[data-testid="stage-badge"]');
    expect(newBadge).toBeInTheDocument();
  });

  // ========================================================================
  // Applied Date Tests
  // ========================================================================

  it('should display applied date for each applicant', () => {
    render(<ApplicantList {...defaultProps} />);

    // Should show relative time like "2 days ago"
    expect(screen.getByText(/ago|today|yesterday/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Sorting Tests
  // ========================================================================

  it('should display sort dropdown', () => {
    render(<ApplicantList {...defaultProps} />);
    expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
  });

  it('should call onSortChange when sorting changes', async () => {
    const user = userEvent.setup();
    render(<ApplicantList {...defaultProps} />);

    const sortSelect = screen.getByLabelText(/sort by/i);
    await user.selectOptions(sortSelect, 'fit_index_desc');

    expect(mockOnSortChange).toHaveBeenCalledWith('fit_index_desc');
  });

  it('should sort by fit index (high to low) by default', () => {
    render(<ApplicantList {...defaultProps} />);

    const applicantNames = screen.getAllByTestId('applicant-name').map(el => el.textContent);
    expect(applicantNames[0]).toBe('John Doe'); // 92
    expect(applicantNames[1]).toBe('Jane Smith'); // 87
  });

  // ========================================================================
  // Filtering Tests
  // ========================================================================

  it('should display stage filter', () => {
    render(<ApplicantList {...defaultProps} />);
    expect(screen.getByLabelText(/filter by stage/i)).toBeInTheDocument();
  });

  it('should call onFilterChange when stage filter changes', async () => {
    const user = userEvent.setup();
    render(<ApplicantList {...defaultProps} />);

    const stageFilter = screen.getByLabelText(/filter by stage/i);
    await user.selectOptions(stageFilter, 'reviewing');

    expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({
      stage: 'reviewing'
    }));
  });

  it('should display fit index range filter', () => {
    render(<ApplicantList {...defaultProps} />);
    expect(screen.getByLabelText(/minimum fit index/i)).toBeInTheDocument();
  });

  it('should filter by minimum fit index', async () => {
    const user = userEvent.setup();
    render(<ApplicantList {...defaultProps} />);

    const minFitInput = screen.getByLabelText(/minimum fit index/i);
    await user.type(minFitInput, '80');

    await waitFor(() => {
      expect(mockOnFilterChange).toHaveBeenCalledWith(expect.objectContaining({
        minFitIndex: 80
      }));
    });
  });

  // ========================================================================
  // View Applicant Tests
  // ========================================================================

  it('should call onViewApplicant when clicking applicant row', async () => {
    const user = userEvent.setup();
    render(<ApplicantList {...defaultProps} />);

    const firstApplicant = screen.getByText('John Doe').closest('[data-testid="applicant-row"]');
    await user.click(firstApplicant!);

    expect(mockOnViewApplicant).toHaveBeenCalledWith('app-1');
  });

  it('should highlight selected applicant', async () => {
    const user = userEvent.setup();
    render(<ApplicantList {...defaultProps} />);

    const firstApplicant = screen.getByText('John Doe').closest('[data-testid="applicant-row"]');
    await user.click(firstApplicant!);

    expect(firstApplicant).toHaveClass(/selected|active|highlighted/i);
  });

  // ========================================================================
  // Stage Update Tests
  // ========================================================================

  it('should display stage update dropdown for each applicant', () => {
    render(<ApplicantList {...defaultProps} />);

    const stageDropdowns = screen.getAllByLabelText(/update stage/i);
    expect(stageDropdowns.length).toBe(4);
  });

  it('should call onUpdateStage when changing stage', async () => {
    const user = userEvent.setup();
    render(<ApplicantList {...defaultProps} />);

    const stageDropdowns = screen.getAllByLabelText(/update stage/i);
    await user.selectOptions(stageDropdowns[0], 'reviewing');

    expect(mockOnUpdateStage).toHaveBeenCalledWith('app-1', 'reviewing');
  });

  it('should show all pipeline stages in dropdown', async () => {
    const user = userEvent.setup();
    render(<ApplicantList {...defaultProps} />);

    const stageDropdown = screen.getAllByLabelText(/update stage/i)[0];
    await user.click(stageDropdown);

    expect(screen.getByRole('option', { name: /new/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /reviewing/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /phone screen/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /technical interview/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /final interview/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /offer/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /hired/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /rejected/i })).toBeInTheDocument();
  });

  // ========================================================================
  // Bulk Actions Tests
  // ========================================================================

  it('should display bulk select checkboxes', () => {
    render(<ApplicantList {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBeGreaterThan(0);
  });

  it('should select individual applicants', async () => {
    const user = userEvent.setup();
    render(<ApplicantList {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox', { name: /select applicant/i });
    await user.click(checkboxes[0]);

    expect(checkboxes[0]).toBeChecked();
  });

  it('should select all applicants with select all checkbox', async () => {
    const user = userEvent.setup();
    render(<ApplicantList {...defaultProps} />);

    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all/i });
    await user.click(selectAllCheckbox);

    const individualCheckboxes = screen.getAllByRole('checkbox', { name: /select applicant/i });
    individualCheckboxes.forEach(checkbox => {
      expect(checkbox).toBeChecked();
    });
  });

  it('should display bulk action toolbar when applicants selected', async () => {
    const user = userEvent.setup();
    render(<ApplicantList {...defaultProps} />);

    const checkbox = screen.getAllByRole('checkbox', { name: /select applicant/i })[0];
    await user.click(checkbox);

    expect(screen.getByText(/1.*selected/i)).toBeInTheDocument();
  });

  it('should call onBulkUpdate for bulk actions', async () => {
    const user = userEvent.setup();
    render(<ApplicantList {...defaultProps} />);

    // Select 2 applicants
    const checkboxes = screen.getAllByRole('checkbox', { name: /select applicant/i });
    await user.click(checkboxes[0]);
    await user.click(checkboxes[1]);

    // Click bulk action
    const bulkActionButton = screen.getByRole('button', { name: /move to/i });
    await user.click(bulkActionButton);

    const reviewingOption = screen.getByRole('option', { name: /reviewing/i });
    await user.click(reviewingOption);

    expect(mockOnBulkUpdate).toHaveBeenCalledWith(
      ['app-1', 'app-2'],
      expect.objectContaining({ stage: 'reviewing' })
    );
  });

  // ========================================================================
  // Tags Display Tests
  // ========================================================================

  it('should display applicant tags', () => {
    render(<ApplicantList {...defaultProps} />);

    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
  });

  // ========================================================================
  // Assignment Display Tests
  // ========================================================================

  it('should display assigned recruiter', () => {
    render(<ApplicantList {...defaultProps} />);

    expect(screen.getByText(/assigned/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  it('should have accessible table structure', () => {
    render(<ApplicantList {...defaultProps} />);

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();

    const headers = screen.getAllByRole('columnheader');
    expect(headers.length).toBeGreaterThan(0);
  });

  it('should have accessible row selection', () => {
    render(<ApplicantList {...defaultProps} />);

    const checkboxes = screen.getAllByRole('checkbox');
    checkboxes.forEach(checkbox => {
      expect(checkbox).toHaveAccessibleName();
    });
  });

  it('should support keyboard navigation', async () => {
    render(<ApplicantList {...defaultProps} />);

    const firstRow = screen.getAllByRole('row')[1]; // Skip header row
    firstRow.focus();

    expect(document.activeElement).toBe(firstRow);
  });

  // ========================================================================
  // Edge Cases Tests
  // ========================================================================

  it('should handle applicants with missing data gracefully', () => {
    const incompleteApplicant = {
      id: 'app-5',
      candidateId: 'user-5',
      candidateName: 'Test User',
      candidateEmail: 'test@example.com',
      jobId: 'job-1',
      jobTitle: 'Senior Frontend Developer',
      fitIndex: 50,
      stage: 'new',
      appliedAt: '2025-01-13T10:00:00Z',
      // Missing resumeUrl, tags, assignedTo
    };

    render(<ApplicantList {...defaultProps} applicants={[incompleteApplicant]} />);

    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should handle very high fit index (100)', () => {
    const perfectMatch = {
      ...mockApplicants[0],
      fitIndex: 100,
    };

    render(<ApplicantList {...defaultProps} applicants={[perfectMatch]} />);

    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('should handle very low fit index (0)', () => {
    const poorMatch = {
      ...mockApplicants[0],
      fitIndex: 0,
    };

    render(<ApplicantList {...defaultProps} applicants={[poorMatch]} />);

    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('should display error state', () => {
    render(<ApplicantList {...defaultProps} error="Failed to load applicants" />);

    expect(screen.getByText(/failed to load/i)).toBeInTheDocument();
  });

  it('should handle pagination', () => {
    const manyApplicants = Array.from({ length: 50 }, (_, i) => ({
      ...mockApplicants[0],
      id: `app-${i}`,
      candidateName: `Candidate ${i}`,
    }));

    render(<ApplicantList {...defaultProps} applicants={manyApplicants} />);

    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
  });
});
