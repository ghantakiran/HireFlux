/**
 * ATS Integration Page
 * Week 40 Day 3
 *
 * Unified ATS experience:
 * - List view (ApplicantList)
 * - Kanban view (ApplicantKanbanBoard)
 * - CandidateDetailModal
 * - Shared state via Zustand
 * - URL state synchronization
 * - localStorage persistence
 */

'use client';

import React, { useEffect } from 'react';
import { toast } from 'sonner';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Users } from 'lucide-react';
import { EmptyState } from '@/components/domain/EmptyState';
import { useATSStore } from '@/hooks/useATSStore';
import ATSViewToggle from '@/components/employer/ATSViewToggle';
import ApplicantList from '@/components/employer/ApplicantList';
import ApplicantKanbanBoard from '@/components/employer/ApplicantKanbanBoard';
import CandidateDetailModal from '@/components/employer/CandidateDetailModal';

interface ATSPageProps {
  params: {
    jobId: string;
  };
}

export default function ATSPage({ params }: ATSPageProps) {
  const { jobId } = params;
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Zustand store
  const {
    applications,
    filteredApplications,
    view,
    loading,
    error,
    filters,
    sortBy,
    selectedApplicationId,
    setView,
    toggleView,
    fetchApplications,
    refreshData,
    updateApplication,
    setFilters,
    clearFilters,
    setSortBy,
    openModal,
    closeModal,
  } = useATSStore();

  // Initialize from URL params
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'list' || viewParam === 'kanban') {
      setView(viewParam);
    }

    const minFitParam = searchParams.get('minFit');
    const stageParam = searchParams.get('stage');
    const assigneeParam = searchParams.get('assignee');

    if (minFitParam || stageParam || assigneeParam) {
      setFilters({
        minFitIndex: minFitParam ? parseInt(minFitParam) : undefined,
        stage: stageParam || undefined,
        assignee: assigneeParam || undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount - intentionally ignoring setView/setFilters as they are stable

  // Fetch applications
  useEffect(() => {
    if (jobId) {
      fetchApplications(jobId);
    }
  }, [jobId, fetchApplications]);

  // Sync URL with view changes (using replace to avoid polluting browser history)
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    // Update view param
    if (view !== 'list') {
      params.set('view', view);
    } else {
      params.delete('view');
    }

    // Update filter params
    if (filters.minFitIndex) {
      params.set('minFit', filters.minFitIndex.toString());
    } else {
      params.delete('minFit');
    }

    if (filters.stage) {
      params.set('stage', filters.stage);
    } else {
      params.delete('stage');
    }

    if (filters.assignee) {
      params.set('assignee', filters.assignee);
    } else {
      params.delete('assignee');
    }

    const qs = params.toString();
    const newUrl = qs ? `${pathname}?${qs}` : pathname;
    const currentUrl = searchParams.toString() ? `${pathname}?${searchParams.toString()}` : pathname;
    if (newUrl !== currentUrl) {
      router.replace(newUrl, { scroll: false });
    }
  }, [view, filters, searchParams, pathname, router]);

  // Handle view toggle
  const handleToggleView = (newView: 'list' | 'kanban') => {
    setView(newView);
  };

  // Handle applicant click from List view
  const handleViewApplicant = (applicationId: string) => {
    openModal(applicationId);
  };

  // Handle stage update from List view
  const handleUpdateStage = async (applicationId: string, newStage: string) => {
    try {
      updateApplication(applicationId, { stage: newStage });
      // TODO: Call API to persist change
      toast.success('Application status updated');
    } catch (err) {
      console.error('Stage update error:', err);
      toast.error('Failed to update application. Please try again.');
    }
  };

  // Handle bulk update from List view
  const handleBulkUpdate = async (applicationIds: string[], action: any) => {
    try {
      // TODO: Implement bulk update
      console.log('Bulk update:', applicationIds, action);
      toast.success(`${applicationIds.length} applications updated`);
    } catch (err) {
      console.error('Bulk update error:', err);
      toast.error('Failed to update applications. Please try again.');
    }
  };

  // Handle sort change from List view
  const handleSortChange = (newSortBy: string) => {
    // Validate that it's a valid SortOption before setting
    const validSortOptions = ['fit-desc', 'fit-asc', 'date-desc', 'date-asc'];
    if (validSortOptions.includes(newSortBy)) {
      setSortBy(newSortBy as 'fit-desc' | 'fit-asc' | 'date-desc' | 'date-asc');
    }
  };

  // Handle card click from Kanban view
  const handleCardClick = (applicationId: string) => {
    openModal(applicationId);
  };

  // Handle stage change from Kanban view
  const handleStageChange = (applicationId: string, oldStage: string, newStage: string) => {
    try {
      updateApplication(applicationId, { stage: newStage });
      toast.success('Candidate moved to next stage');
    } catch (err) {
      console.error('Stage change error:', err);
      toast.error('Failed to update application. Please try again.');
    }
  };

  // Handle modal close and refresh
  const handleModalUpdate = () => {
    refreshData();
  };

  // Determine content to render
  let content;

  if (loading && applications.length === 0) {
    // Loading state
    content = (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  } else if (error) {
    // Error state
    content = (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4 mx-auto">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Failed to load applications
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchApplications(jobId)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  } else if (!loading && filteredApplications.length === 0 && applications.length === 0) {
    // Empty state
    content = (
      <EmptyState
        title="No applications yet"
        description="Applications will appear here as candidates apply to this position."
        icon={<Users className="h-12 w-12 text-muted-foreground" />}
      />
    );
  } else {
    // Main content - List or Kanban view
    content = view === 'list' ? (
      <ApplicantList
        applicants={filteredApplications}
        jobId={jobId}
        jobTitle="Job Title" // TODO: Pass actual job title
        loading={loading}
        error={error || undefined}
        onViewApplicant={handleViewApplicant}
        onUpdateStage={handleUpdateStage}
        onBulkUpdate={handleBulkUpdate}
        onFilterChange={setFilters}
        onSortChange={handleSortChange}
      />
    ) : (
      <ApplicantKanbanBoard
        jobId={jobId}
        onCardClick={handleCardClick}
        onStageChange={handleStageChange}
      />
    );
  }

  return (
    <div data-testid="ats-page" className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header - Always visible */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Applications{!loading && filteredApplications.length > 0 && ` (${filteredApplications.length})`}
            </h1>
            <p className="text-gray-600 mt-1">
              {loading ? 'Loading...' : error ? 'Error loading applications' : view === 'list' ? 'List view' : 'Kanban view'}
            </p>
          </div>
          <ATSViewToggle view={view} onToggle={handleToggleView} />
        </div>

        {/* Content */}
        {content}

        {/* Candidate Detail Modal */}
        {selectedApplicationId && (
          <CandidateDetailModal
            applicationId={selectedApplicationId}
            isOpen={!!selectedApplicationId}
            onClose={closeModal}
            onUpdate={handleModalUpdate}
          />
        )}
      </div>
    </div>
  );
}
