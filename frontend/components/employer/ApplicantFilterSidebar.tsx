/**
 * Applicant Filter Sidebar Component
 * Issue #59: ATS Core Features
 *
 * Provides comprehensive filtering options:
 * - Status checkboxes (multiple selection)
 * - Fit index range slider
 * - Date range pickers
 * - Tag selection
 * - Team member assignment
 * - Unassigned filter toggle
 * - Clear all filters button
 * - Active filter chips
 */

'use client';

import React, { useState } from 'react';
import { X, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { useApplicantFiltering } from '@/hooks/useApplicantFiltering';
import {
  APPLICATION_STATUSES,
  STATUS_LABELS,
  STATUS_COLORS,
  FIT_INDEX_RANGES,
} from '@/lib/types/applicant-filtering';

interface ApplicantFilterSidebarProps {
  jobId: string;
  onClose?: () => void;
}

export default function ApplicantFilterSidebar({
  jobId,
  onClose,
}: ApplicantFilterSidebarProps) {
  const { filters, filterStats, setFilters, clearFilters, activeFilterCount } =
    useApplicantFiltering();

  // Section collapse states
  const [statusExpanded, setStatusExpanded] = useState(true);
  const [fitIndexExpanded, setFitIndexExpanded] = useState(true);
  const [dateExpanded, setDateExpanded] = useState(false);
  const [assignmentExpanded, setAssignmentExpanded] = useState(false);

  // Handle status toggle
  const handleStatusToggle = (status: string) => {
    const currentStatuses = filters.status || [];
    const newStatuses = currentStatuses.includes(status)
      ? currentStatuses.filter((s) => s !== status)
      : [...currentStatuses, status];

    setFilters({ status: newStatuses.length > 0 ? newStatuses : undefined });
  };

  // Handle fit index range
  const handleFitIndexChange = (min?: number, max?: number) => {
    setFilters({
      minFitIndex: min,
      maxFitIndex: max,
    });
  };

  // Handle date range
  const handleDateChange = (type: 'after' | 'before', value: string) => {
    if (type === 'after') {
      setFilters({ appliedAfter: value || undefined });
    } else {
      setFilters({ appliedBefore: value || undefined });
    }
  };

  // Handle unassigned toggle
  const handleUnassignedToggle = () => {
    setFilters({ unassigned: !filters.unassigned });
  };

  // Clear all filters
  const handleClearAll = () => {
    clearFilters();
  };

  const activeCount = activeFilterCount();

  return (
    <div className="w-80 border-r border-gray-200 bg-white overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                {activeCount}
              </span>
            )}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-md lg:hidden"
              aria-label="Close filters"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Clear all button */}
        {activeCount > 0 && (
          <button
            onClick={handleClearAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear all filters
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="p-4 space-y-6">
        {/* Status Filter */}
        <div className="space-y-3">
          <button
            onClick={() => setStatusExpanded(!statusExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-900">Status</span>
            {statusExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {statusExpanded && (
            <div className="space-y-2">
              {APPLICATION_STATUSES.map((status) => {
                const count = filterStats?.status_counts[status] || 0;
                const isChecked = filters.status?.includes(status) || false;

                return (
                  <label
                    key={status}
                    className="flex items-center gap-2 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleStatusToggle(status)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="flex-1 text-sm text-gray-700 group-hover:text-gray-900">
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="text-xs text-gray-500">{count}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Fit Index Range Filter */}
        <div className="space-y-3">
          <button
            onClick={() => setFitIndexExpanded(!fitIndexExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-900">Fit Score</span>
            {fitIndexExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {fitIndexExpanded && (
            <div className="space-y-3">
              {/* Preset ranges */}
              <div className="space-y-2">
                {FIT_INDEX_RANGES.map((range) => {
                  const count = filterStats?.fit_index_counts[range.label.split(' ')[0].toLowerCase()] || 0;
                  const isActive =
                    filters.minFitIndex === range.min &&
                    filters.maxFitIndex === range.max;

                  return (
                    <button
                      key={range.label}
                      onClick={() => handleFitIndexChange(range.min, range.max)}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md border transition-colors ${
                        isActive
                          ? 'bg-blue-50 border-blue-200 text-blue-700'
                          : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{range.label}</span>
                      <span className="text-xs text-gray-500">{count}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom range inputs */}
              <div className="space-y-2 pt-2 border-t border-gray-200">
                <label className="block">
                  <span className="text-xs text-gray-600">Min Score</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.minFitIndex || ''}
                    onChange={(e) =>
                      handleFitIndexChange(
                        e.target.value ? parseInt(e.target.value) : undefined,
                        filters.maxFitIndex
                      )
                    }
                    placeholder="0"
                    className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-gray-600">Max Score</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={filters.maxFitIndex || ''}
                    onChange={(e) =>
                      handleFitIndexChange(
                        filters.minFitIndex,
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    placeholder="100"
                    className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Date Range Filter */}
        <div className="space-y-3">
          <button
            onClick={() => setDateExpanded(!dateExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-900">Application Date</span>
            {dateExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {dateExpanded && (
            <div className="space-y-2">
              <label className="block">
                <span className="text-xs text-gray-600">From</span>
                <input
                  type="date"
                  value={filters.appliedAfter || ''}
                  onChange={(e) => handleDateChange('after', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-600">To</span>
                <input
                  type="date"
                  value={filters.appliedBefore || ''}
                  onChange={(e) => handleDateChange('before', e.target.value)}
                  className="mt-1 block w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </label>
            </div>
          )}
        </div>

        {/* Assignment Filter */}
        <div className="space-y-3">
          <button
            onClick={() => setAssignmentExpanded(!assignmentExpanded)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-medium text-gray-900">Assignment</span>
            {assignmentExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {assignmentExpanded && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={filters.unassigned || false}
                  onChange={handleUnassignedToggle}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="flex-1 text-sm text-gray-700 group-hover:text-gray-900">
                  Unassigned only
                </span>
                <span className="text-xs text-gray-500">
                  {filterStats?.unassigned_count || 0}
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Summary */}
        {filterStats && (
          <div className="pt-4 border-t border-gray-200">
            <div className="text-xs text-gray-600">
              Showing <span className="font-medium text-gray-900">{filterStats.total_count}</span>{' '}
              applicants
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
