/**
 * Tests for EmployerDashboard Component - Sprint 19-20 Week 39 Day 3
 * Following TDD approach: Write tests first, then implement component
 *
 * Dashboard Features:
 * - Overview statistics (active jobs, applications, quality metrics)
 * - Activity feed (recent actions)
 * - Quick actions (post job, view applications, search candidates)
 * - Data visualization (charts, graphs)
 * - Real-time updates
 */

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { EmployerDashboard } from '@/components/employer/EmployerDashboard';

// Mock data for testing
const mockDashboardData = {
  company: {
    id: 'company-1',
    name: 'TechCorp Inc.',
    logo: '/logos/techcorp.png',
  },
  stats: {
    activeJobs: 12,
    newApplicationsToday: 8,
    totalApplications: 145,
    avgCandidateQuality: 78,
    avgTimeToFill: 24,
  },
  applicationsByStatus: {
    new: 45,
    reviewing: 32,
    interview: 18,
    offer: 5,
    hired: 40,
    rejected: 5,
  },
  topJobs: [
    {
      id: 'job-1',
      title: 'Senior Software Engineer',
      applications: 42,
      views: 320,
      postedDays: 5,
    },
    {
      id: 'job-2',
      title: 'Product Manager',
      applications: 35,
      views: 280,
      postedDays: 3,
    },
    {
      id: 'job-3',
      title: 'UX Designer',
      applications: 28,
      views: 210,
      postedDays: 7,
    },
  ],
  recentActivity: [
    {
      id: 'activity-1',
      type: 'new_application',
      message: 'John Doe applied to Senior Software Engineer',
      timestamp: '2 minutes ago',
      actor: 'System',
    },
    {
      id: 'activity-2',
      type: 'status_change',
      message: 'Jane Smith moved to Interview stage',
      timestamp: '1 hour ago',
      actor: 'Sarah Johnson',
    },
    {
      id: 'activity-3',
      type: 'new_job',
      message: 'New job posted: Frontend Developer',
      timestamp: '3 hours ago',
      actor: 'Mike Chen',
    },
  ],
};

describe('EmployerDashboard Component', () => {
  const mockOnPostJob = jest.fn();
  const mockOnViewApplications = jest.fn();
  const mockOnSearchCandidates = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // Rendering Tests
  // ========================================================================

  it('should render dashboard with company name', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText('TechCorp Inc.')).toBeInTheDocument();
  });

  it('should render welcome message', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText(/welcome back/i)).toBeInTheDocument();
  });

  it('should render all stat cards', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText(/active jobs/i)).toBeInTheDocument();
    expect(screen.getByText(/new applications/i)).toBeInTheDocument();
    expect(screen.getByText(/candidate quality/i)).toBeInTheDocument();
    expect(screen.getByText(/time to fill/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Statistics Tests
  // ========================================================================

  it('should display active jobs count', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText(/active jobs/i)).toBeInTheDocument();
  });

  it('should display new applications count', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText(/new applications.*today/i)).toBeInTheDocument();
  });

  it('should display candidate quality score', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText('78')).toBeInTheDocument();
    expect(screen.getByText(/candidate quality/i)).toBeInTheDocument();
  });

  it('should display average time to fill', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText(/24.*days/i)).toBeInTheDocument();
    expect(screen.getByText(/time to fill/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Quick Actions Tests
  // ========================================================================

  it('should render quick action buttons', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByRole('button', { name: /post.*job/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /view.*applications/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /search.*candidates/i })).toBeInTheDocument();
  });

  it('should call onPostJob when post job button clicked', async () => {
    const user = userEvent.setup();
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    const postJobButton = screen.getByRole('button', { name: /post.*job/i });
    await user.click(postJobButton);

    expect(mockOnPostJob).toHaveBeenCalledTimes(1);
  });

  it('should call onViewApplications when view applications clicked', async () => {
    const user = userEvent.setup();
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    const viewAppsButton = screen.getByRole('button', { name: /view.*applications/i });
    await user.click(viewAppsButton);

    expect(mockOnViewApplications).toHaveBeenCalledTimes(1);
  });

  it('should call onSearchCandidates when search candidates clicked', async () => {
    const user = userEvent.setup();
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    const searchButton = screen.getByRole('button', { name: /search.*candidates/i });
    await user.click(searchButton);

    expect(mockOnSearchCandidates).toHaveBeenCalledTimes(1);
  });

  // ========================================================================
  // Top Jobs Tests
  // ========================================================================

  it('should display top performing jobs section', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText(/top performing jobs/i)).toBeInTheDocument();
  });

  it('should display all top jobs', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText('Senior Software Engineer')).toBeInTheDocument();
    expect(screen.getByText('Product Manager')).toBeInTheDocument();
    expect(screen.getByText('UX Designer')).toBeInTheDocument();
  });

  it('should display application counts for top jobs', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText(/42.*applications/i)).toBeInTheDocument();
    expect(screen.getByText(/35.*applications/i)).toBeInTheDocument();
    expect(screen.getByText(/28.*applications/i)).toBeInTheDocument();
  });

  it('should display view counts for top jobs', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText(/320.*views/i)).toBeInTheDocument();
    expect(screen.getByText(/280.*views/i)).toBeInTheDocument();
    expect(screen.getByText(/210.*views/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Applications by Status Tests
  // ========================================================================

  it('should display applications by status section', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText(/applications.*status/i)).toBeInTheDocument();
  });

  it('should display all pipeline stages', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    const pipelineSection = screen.getByTestId('applications-by-status');
    expect(within(pipelineSection).getByText(/new/i)).toBeInTheDocument();
    expect(within(pipelineSection).getByText(/reviewing/i)).toBeInTheDocument();
    expect(within(pipelineSection).getByText(/interview/i)).toBeInTheDocument();
    expect(within(pipelineSection).getByText(/offer/i)).toBeInTheDocument();
    expect(within(pipelineSection).getByText(/hired/i)).toBeInTheDocument();
  });

  it('should display counts for each status', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    // Look for the status counts
    const statusSection = screen.getByText(/applications.*status/i).closest('div');
    expect(statusSection).toHaveTextContent('45'); // new
    expect(statusSection).toHaveTextContent('32'); // reviewing
    expect(statusSection).toHaveTextContent('18'); // interview
  });

  // ========================================================================
  // Activity Feed Tests
  // ========================================================================

  it('should display recent activity section', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
  });

  it('should display all activity items', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText(/john doe applied/i)).toBeInTheDocument();
    expect(screen.getByText(/jane smith moved to interview/i)).toBeInTheDocument();
    expect(screen.getByText(/new job posted.*frontend developer/i)).toBeInTheDocument();
  });

  it('should display activity timestamps', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText(/2 minutes ago/i)).toBeInTheDocument();
    expect(screen.getByText(/1 hour ago/i)).toBeInTheDocument();
    expect(screen.getByText(/3 hours ago/i)).toBeInTheDocument();
  });

  it('should display activity actors', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
    expect(screen.getByText('Mike Chen')).toBeInTheDocument();
  });

  // ========================================================================
  // Loading State Tests
  // ========================================================================

  it('should display loading state when data is not available', () => {
    render(
      <EmployerDashboard
        data={null}
        loading={true}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should display skeleton loaders for stats while loading', () => {
    render(
      <EmployerDashboard
        data={null}
        loading={true}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    const skeletons = screen.getAllByRole('status', { name: /loading/i });
    expect(skeletons.length).toBeGreaterThan(0);
  });

  // ========================================================================
  // Empty State Tests
  // ========================================================================

  it('should display empty state when no jobs', () => {
    const emptyData = {
      ...mockDashboardData,
      stats: { ...mockDashboardData.stats, activeJobs: 0 },
      topJobs: [],
    };

    render(
      <EmployerDashboard
        data={emptyData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText(/no active jobs/i)).toBeInTheDocument();
  });

  it('should show call-to-action when no jobs', () => {
    const emptyData = {
      ...mockDashboardData,
      stats: { ...mockDashboardData.stats, activeJobs: 0 },
      topJobs: [],
    };

    render(
      <EmployerDashboard
        data={emptyData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByText(/post your first job/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Responsive Design Tests
  // ========================================================================

  it('should be mobile responsive', () => {
    const { container } = render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    // Check for responsive grid classes
    const grid = container.querySelector('.grid');
    expect(grid).toHaveClass(/grid-cols-1|md:grid-cols-2|lg:grid-cols-4/);
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  it('should have accessible stat cards', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    const activeJobsStat = screen.getByTestId('active-jobs-stat');
    expect(activeJobsStat).toHaveAttribute('role', 'region');
    expect(activeJobsStat).toHaveAttribute('aria-label', 'Active jobs statistic');
  });

  it('should have accessible buttons', () => {
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    const postJobButton = screen.getByRole('button', { name: /post.*job/i });
    expect(postJobButton).toHaveAccessibleName();
  });

  it('should support keyboard navigation', async () => {
    const user = userEvent.setup();
    render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    // Tab to first button
    await user.tab();
    const postJobButton = screen.getByRole('button', { name: /post.*job/i });
    expect(postJobButton).toHaveFocus();
  });

  // ========================================================================
  // Error Handling Tests
  // ========================================================================

  it('should handle data fetch errors gracefully', () => {
    render(
      <EmployerDashboard
        data={null}
        error="Failed to load dashboard data"
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(screen.getByRole('heading', { name: /failed to load dashboard/i })).toBeInTheDocument();
    expect(screen.getByText('Failed to load dashboard data')).toBeInTheDocument();
  });

  it('should show retry button on error', async () => {
    const mockOnRetry = jest.fn();
    const user = userEvent.setup();

    render(
      <EmployerDashboard
        data={null}
        error="Failed to load dashboard data"
        onRetry={mockOnRetry}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    const retryButton = screen.getByRole('button', { name: /try again|retry/i });
    await user.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  // ========================================================================
  // Real-time Updates Tests
  // ========================================================================

  it('should update stats when data changes', () => {
    const { rerender } = render(
      <EmployerDashboard
        data={mockDashboardData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    const newApplicationsStat = screen.getByTestId('new-applications-stat');
    expect(within(newApplicationsStat).getByText('8')).toBeInTheDocument(); // initial new applications

    // Update data
    const updatedData = {
      ...mockDashboardData,
      stats: { ...mockDashboardData.stats, newApplicationsToday: 12 },
    };

    rerender(
      <EmployerDashboard
        data={updatedData}
        onPostJob={mockOnPostJob}
        onViewApplications={mockOnViewApplications}
        onSearchCandidates={mockOnSearchCandidates}
      />
    );

    expect(within(newApplicationsStat).getByText('12')).toBeInTheDocument();
  });
});
