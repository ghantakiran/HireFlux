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
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
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

  // Sync URL with view changes
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

    const newUrl = `${pathname}?${params.toString()}`;
    if (newUrl !== `${pathname}?${searchParams.toString()}`) {
      router.push(newUrl);
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
    updateApplication(applicationId, { stage: newStage });
    // TODO: Call API to persist change
  };

  // Handle bulk update from List view
  const handleBulkUpdate = async (applicationIds: string[], action: any) => {
    // TODO: Implement bulk update
    console.log('Bulk update:', applicationIds, action);
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
    updateApplication(applicationId, { stage: newStage });
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
      <div className="flex flex-col items-center justify-center h-96">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4 mx-auto">
            <svg
              className="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications yet</h3>
          <p className="text-gray-600 max-w-md">
            Post this job to start receiving applications from qualified candidates.
          </p>
        </div>
      </div>
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
