/**
 * Applicant List Component - Sprint 19-20 Week 39 Day 5
 *
 * Basic Applicant Tracking System (ATS) list view with:
 * - Fit Index display with color coding
 * - Pipeline stage management (8 stages)
 * - Sorting and filtering
 * - Bulk actions
 * - Accessibility compliant
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, ChevronDown, Eye, CheckSquare, Square } from 'lucide-react';
import { ErrorBanner } from '@/components/ui/error-banner';
import { EmptyState } from '@/components/domain/EmptyState';
import StatusChangeModal from './StatusChangeModal';
import BulkActionToolbar from './BulkActionToolbar';
import BulkStatusChangeModal from './BulkStatusChangeModal';
import { getFitIndexDetailedColor } from '@/lib/score-colors';
import { formatRelativeTime } from '@/lib/utils';
import { EMPLOYER_STAGES } from '@/lib/constants/employer-stages';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface Applicant {
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

export interface ApplicantListProps {
  applicants: Applicant[];
  jobId: string;
  jobTitle: string;
  loading?: boolean;
  error?: string;
  onViewApplicant: (applicantId: string) => void;
  onUpdateStage: (applicantId: string, newStage: string) => void;
  onBulkUpdate: (applicantIds: string[], action: { stage?: string; action?: string }) => void;
  onFilterChange: (filters: Filters) => void;
  onSortChange: (sortBy: string) => void;
}

interface Filters {
  stage?: string;
  minFitIndex?: number;
}

// ============================================================================
// Constants
// ============================================================================

const SORT_OPTIONS = [
  { value: 'fit_index_desc', label: 'Fit Index (High to Low)' },
  { value: 'fit_index_asc', label: 'Fit Index (Low to High)' },
  { value: 'date_desc', label: 'Applied Date (Newest First)' },
  { value: 'date_asc', label: 'Applied Date (Oldest First)' },
];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get stage label from value
 */
function getStageLabel(stageValue: string): string {
  const stage = EMPLOYER_STAGES.find(s => s.id === stageValue);
  return stage?.label || stageValue;
}

// ============================================================================
// Main Component
// ============================================================================

export function ApplicantList({
  applicants,
  jobId,
  jobTitle,
  loading = false,
  error,
  onViewApplicant,
  onUpdateStage,
  onBulkUpdate,
  onFilterChange,
  onSortChange,
}: ApplicantListProps) {
  // State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({});
  const [sortBy, setSortBy] = useState<string>('fit_index_desc');
  const [activeApplicantId, setActiveApplicantId] = useState<string | null>(null);

  // Modal states for Issue #58
  const [statusChangeModalOpen, setStatusChangeModalOpen] = useState(false);
  const [currentApplicantForStatus, setCurrentApplicantForStatus] = useState<Applicant | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSelectAll = () => {
    if (selectedIds.length === applicants.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(applicants.map(a => a.id));
    }
  };

  const handleSelectApplicant = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleStageChange = (applicantId: string, newStage: string) => {
    onUpdateStage(applicantId, newStage);
  };

  const handleBulkAction = (action: 'move' | 'reject' | 'archive', value?: string) => {
    if (selectedIds.length === 0) return;

    const actionData = action === 'move' ? { stage: value } : { action };
    onBulkUpdate(selectedIds, actionData);
    setSelectedIds([]);
  };

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSortChange = (newSort: string) => {
    setSortBy(newSort);
    onSortChange(newSort);
  };

  const handleRowClick = (applicantId: string) => {
    setActiveApplicantId(applicantId);
    onViewApplicant(applicantId);
  };

  // Handler for opening status change modal (Issue #58)
  const handleOpenStatusModal = (applicant: Applicant) => {
    setCurrentApplicantForStatus(applicant);
    setStatusChangeModalOpen(true);
  };

  // Handler for status change confirmation (Issue #58)
  const handleStatusChangeConfirm = async (data: { newStatus: string }) => {
    if (!currentApplicantForStatus) return;

    // Call parent handler
    await onUpdateStage(currentApplicantForStatus.id, data.newStatus);

    // Close modal and reset
    setStatusChangeModalOpen(false);
    setCurrentApplicantForStatus(null);
  };

  // Handler for bulk status change (Issue #58)
  const handleBulkStatusChange = (status: string) => {
    setBulkModalOpen(true);
  };

  // Handler for bulk status change confirmation (Issue #58)
  const handleBulkConfirm = async (data: { newStatus: string }) => {
    if (selectedIds.length === 0) return;

    // Call parent handler
    await onBulkUpdate(selectedIds, { stage: data.newStatus });

    // Close modal and reset selections
    setBulkModalOpen(false);
    setSelectedIds([]);
  };

  // ============================================================================
  // Render States
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading applicants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorBanner error={error} />;
  }

  if (applicants.length === 0) {
    return (
      <EmptyState
        title="No applicants yet"
        description={`When candidates apply to "${jobTitle}", they'll appear here.`}
        variant="compact"
        icon={<Search className="h-12 w-12 text-gray-400" />}
        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-950"
      />
    );
  }

  // ============================================================================
  // Main UI
  // ============================================================================

  const allSelected = selectedIds.length === applicants.length && applicants.length > 0;
  const someSelected = selectedIds.length > 0 && selectedIds.length < applicants.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Applicants</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {applicants.length} applicant{applicants.length === 1 ? '' : 's'} for {jobTitle}
          </p>
        </div>

        {/* Bulk Actions Toolbar (Issue #58) */}
        {selectedIds.length > 0 && (
          <BulkActionToolbar
            selectedCount={selectedIds.length}
            onDeselectAll={() => setSelectedIds([])}
            onBulkReject={() => {
              // Open bulk modal with reject pre-selected
              setBulkModalOpen(true);
            }}
            onBulkMoveToStage={(stage) => {
              // Open bulk modal
              setBulkModalOpen(true);
            }}
          />
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-wrap bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        {/* Sort */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Sort by:
          </label>
          <select
            id="sort-select"
            aria-label="Sort by"
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {SORT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Stage */}
        <div className="flex items-center gap-2">
          <label htmlFor="stage-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Stage:
          </label>
          <select
            id="stage-filter"
            aria-label="Filter by stage"
            value={filters.stage || ''}
            onChange={(e) => handleFilterChange({ ...filters, stage: e.target.value || undefined })}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Stages</option>
            {EMPLOYER_STAGES.map(stage => (
              <option key={stage.id} value={stage.id}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Min Fit Index */}
        <div className="flex items-center gap-2">
          <label htmlFor="fit-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Min Fit Index:
          </label>
          <input
            id="fit-filter"
            type="number"
            min="0"
            max="100"
            aria-label="Minimum fit index"
            value={filters.minFitIndex || ''}
            onChange={(e) => {
              const value = e.target.value ? parseInt(e.target.value) : undefined;
              handleFilterChange({ ...filters, minFitIndex: value });
            }}
            className="w-20 text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
          />
        </div>

        {/* Clear Filters */}
        {(filters.stage || filters.minFitIndex) && (
          <button
            onClick={() => handleFilterChange({})}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead className="bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="w-12 px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(input) => {
                      if (input) input.indeterminate = someSelected;
                    }}
                    onChange={handleSelectAll}
                    aria-label="Select all applicants"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Fit Index
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Stage
                </th>
                <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Applied
                </th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Tags
                </th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Assigned
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {applicants.map((applicant) => {
                const isSelected = selectedIds.includes(applicant.id);
                const isActive = activeApplicantId === applicant.id;

                return (
                  <tr
                    key={applicant.id}
                    data-testid="applicant-row"
                    aria-label={`${applicant.candidateName}, fit index ${applicant.fitIndex}, stage ${getStageLabel(applicant.stage)}`}
                    tabIndex={0}
                    onClick={() => handleRowClick(applicant.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleRowClick(applicant.id);
                      }
                    }}
                    className={`cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/30 highlighted'
                        : isSelected
                        ? 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectApplicant(applicant.id)}
                        aria-label={`Select applicant ${applicant.candidateName}`}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </td>

                    {/* Candidate Name & Email */}
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100" data-testid="applicant-name">
                          {applicant.candidateName}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{applicant.candidateEmail}</p>
                      </div>
                    </td>

                    {/* Fit Index */}
                    <td className="px-4 py-3">
                      <div
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold border ${getFitIndexDetailedColor(
                          applicant.fitIndex
                        )}`}
                        data-testid="fit-index-badge"
                        aria-label={`Fit index ${applicant.fitIndex}`}
                      >
                        {applicant.fitIndex}
                      </div>
                    </td>

                    {/* Stage (Issue #58 - opens StatusChangeModal) */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {getStageLabel(applicant.stage)}
                        </span>
                        <button
                          onClick={() => handleOpenStatusModal(applicant)}
                          data-testid="status-dropdown"
                          className="text-xs px-2 py-1 text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          aria-label={`Change status for ${applicant.candidateName}`}
                        >
                          Change
                        </button>
                      </div>
                    </td>

                    {/* Applied Date */}
                    <td className="hidden lg:table-cell px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {formatRelativeTime(applicant.appliedAt, true)}
                      </span>
                    </td>

                    {/* Tags */}
                    <td className="hidden md:table-cell px-4 py-3">
                      {applicant.tags && applicant.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {applicant.tags.slice(0, 2).map(tag => (
                            <span
                              key={tag}
                              className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {applicant.tags.length > 2 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{applicant.tags.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-500">-</span>
                      )}
                    </td>

                    {/* Assigned To */}
                    <td className="hidden md:table-cell px-4 py-3">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {applicant.assignedTo || '-'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onViewApplicant(applicant.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        aria-label={`View details for ${applicant.candidateName}`}
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 px-2">
        <p>
          Showing {applicants.length} applicant{applicants.length === 1 ? '' : 's'}
        </p>
        {selectedIds.length > 0 && (
          <p className="font-medium text-blue-600">
            {selectedIds.length} selected
          </p>
        )}
      </div>

      {/* Status Change Modal (Issue #58) */}
      {currentApplicantForStatus && (
        <StatusChangeModal
          application={{
            id: currentApplicantForStatus.id,
            candidateName: currentApplicantForStatus.candidateName,
            candidateEmail: currentApplicantForStatus.candidateEmail,
            jobTitle: currentApplicantForStatus.jobTitle,
            status: currentApplicantForStatus.stage as any,
          }}
          isOpen={statusChangeModalOpen}
          onClose={() => {
            setStatusChangeModalOpen(false);
            setCurrentApplicantForStatus(null);
          }}
          onConfirm={handleStatusChangeConfirm}
        />
      )}

      {/* Bulk Status Change Modal (Issue #58) */}
      {bulkModalOpen && (
        <BulkStatusChangeModal
          applications={applicants.filter(a => selectedIds.includes(a.id)).map(a => ({
            id: a.id,
            candidateName: a.candidateName,
            candidateEmail: a.candidateEmail,
            jobTitle: a.jobTitle,
            status: a.stage as any,
          }))}
          isOpen={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          onConfirm={handleBulkConfirm}
        />
      )}
    </div>
  );
}

export default ApplicantList;
