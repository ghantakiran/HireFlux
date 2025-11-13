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
import { AlertCircle, Search, Filter, ChevronDown, Eye, CheckSquare, Square } from 'lucide-react';

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
  onBulkUpdate: (applicantIds: string[], action: any) => void;
  onFilterChange: (filters: any) => void;
  onSortChange: (sortBy: string) => void;
}

interface Filters {
  stage?: string;
  minFitIndex?: number;
}

// ============================================================================
// Constants
// ============================================================================

const STAGES = [
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'phone_screen', label: 'Phone Screen' },
  { value: 'technical_interview', label: 'Technical Interview' },
  { value: 'final_interview', label: 'Final Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
];

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
 * Get color class for fit index badge
 */
function getFitIndexColor(fitIndex: number): string {
  if (fitIndex > 80) return 'bg-green-100 text-green-800 border-green-300';
  if (fitIndex >= 60) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
  return 'bg-red-100 text-red-800 border-red-300';
}

/**
 * Format relative time from ISO date string
 */
function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Get stage label from value
 */
function getStageLabel(stageValue: string): string {
  const stage = STAGES.find(s => s.value === stageValue);
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

  // ============================================================================
  // Render States
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading applicants...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3" role="alert">
        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-900">Error loading applicants</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (applicants.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No applicants yet</h3>
        <p className="text-gray-600 mb-4">
          When candidates apply to "{jobTitle}", they'll appear here.
        </p>
      </div>
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Applicants</h2>
          <p className="text-sm text-gray-600 mt-1">
            {applicants.length} applicant{applicants.length === 1 ? '' : 's'} for {jobTitle}
          </p>
        </div>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <span className="text-sm font-medium text-blue-900">
              {selectedIds.length} selected
            </span>
            <select
              aria-label="Bulk actions"
              className="text-sm border border-blue-300 rounded px-2 py-1 bg-white"
              onChange={(e) => {
                const value = e.target.value;
                if (value.startsWith('move:')) {
                  handleBulkAction('move', value.split(':')[1]);
                } else if (value === 'reject') {
                  handleBulkAction('reject');
                } else if (value === 'archive') {
                  handleBulkAction('archive');
                }
                e.target.value = '';
              }}
            >
              <option value="">Bulk Actions</option>
              <optgroup label="Move to Stage">
                {STAGES.map(stage => (
                  <option key={stage.value} value={`move:${stage.value}`}>
                    Move to {stage.label}
                  </option>
                ))}
              </optgroup>
              <option value="reject">Reject Selected</option>
              <option value="archive">Archive Selected</option>
            </select>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-4">
        {/* Sort */}
        <div className="flex items-center gap-2">
          <label htmlFor="sort-select" className="text-sm font-medium text-gray-700">
            Sort by:
          </label>
          <select
            id="sort-select"
            aria-label="Sort by"
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <label htmlFor="stage-filter" className="text-sm font-medium text-gray-700">
            Stage:
          </label>
          <select
            id="stage-filter"
            aria-label="Filter by stage"
            value={filters.stage || ''}
            onChange={(e) => handleFilterChange({ ...filters, stage: e.target.value || undefined })}
            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Stages</option>
            {STAGES.map(stage => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Min Fit Index */}
        <div className="flex items-center gap-2">
          <label htmlFor="fit-filter" className="text-sm font-medium text-gray-700">
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
            className="w-20 text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
          />
        </div>

        {/* Clear Filters */}
        {(filters.stage || filters.minFitIndex) && (
          <button
            onClick={() => handleFilterChange({})}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full" role="table">
            <thead className="bg-gray-50 border-b border-gray-200">
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
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Fit Index
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Applied
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Assigned
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {applicants.map((applicant) => {
                const isSelected = selectedIds.includes(applicant.id);
                const isActive = activeApplicantId === applicant.id;

                return (
                  <tr
                    key={applicant.id}
                    data-testid="applicant-row"
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
                        ? 'bg-blue-100 hover:bg-blue-100 highlighted'
                        : isSelected
                        ? 'bg-blue-50 hover:bg-blue-100'
                        : 'hover:bg-gray-50'
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
                        <p className="font-medium text-gray-900" data-testid="applicant-name">
                          {applicant.candidateName}
                        </p>
                        <p className="text-sm text-gray-600">{applicant.candidateEmail}</p>
                      </div>
                    </td>

                    {/* Fit Index */}
                    <td className="px-4 py-3">
                      <div
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold border ${getFitIndexColor(
                          applicant.fitIndex
                        )}`}
                        data-testid="fit-index-badge"
                        aria-label={`Fit index ${applicant.fitIndex}`}
                      >
                        {applicant.fitIndex}
                      </div>
                    </td>

                    {/* Stage */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={applicant.stage}
                        onChange={(e) => handleStageChange(applicant.id, e.target.value)}
                        aria-label={`Update stage for ${applicant.candidateName}`}
                        className="text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        {STAGES.map(stage => (
                          <option key={stage.value} value={stage.value}>
                            {stage.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Applied Date */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {formatRelativeTime(applicant.appliedAt)}
                      </span>
                    </td>

                    {/* Tags */}
                    <td className="px-4 py-3">
                      {applicant.tags && applicant.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {applicant.tags.slice(0, 2).map(tag => (
                            <span
                              key={tag}
                              className="inline-block px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                          {applicant.tags.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{applicant.tags.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>

                    {/* Assigned To */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {applicant.assignedTo || '-'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onViewApplicant(applicant.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
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
      <div className="flex items-center justify-between text-sm text-gray-600 px-2">
        <p>
          Showing {applicants.length} applicant{applicants.length === 1 ? '' : 's'}
        </p>
        {selectedIds.length > 0 && (
          <p className="font-medium text-blue-600">
            {selectedIds.length} selected
          </p>
        )}
      </div>
    </div>
  );
}

export default ApplicantList;
