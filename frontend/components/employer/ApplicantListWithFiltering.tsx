/**
 * Applicant List with Filtering Component
 * Issue #59: ATS Core Features
 *
 * Features:
 * - Sortable columns (fit score, application date)
 * - Pagination controls
 * - Loading states
 * - Empty state
 * - Status badges
 * - Fit score indicators
 * - Candidate info display
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Loader2,
  Inbox,
} from 'lucide-react';
import { SortableColumnHeader } from '@/components/ui/sortable-column-header';
import { useApplicantFiltering } from '@/hooks/useApplicantFiltering';
import { Application, STATUS_LABELS, STATUS_COLORS } from '@/lib/types/applicant-filtering';
import { getFitScoreColor } from '@/lib/score-colors';
import { formatDistanceToNow } from 'date-fns';

interface ApplicantListWithFilteringProps {
  jobId: string;
}

export default function ApplicantListWithFiltering({
  jobId,
}: ApplicantListWithFilteringProps) {
  const router = useRouter();
  const {
    applications,
    isLoading,
    error,
    filters,
    totalCount,
    page,
    limit,
    hasMore,
    setSort,
    setPage,
  } = useApplicantFiltering();

  // Handle sort column click
  const handleSort = (sortBy: 'fitIndex' | 'appliedDate') => {
    const newOrder =
      filters.sortBy === sortBy && filters.order === 'desc' ? 'asc' : 'desc';
    setSort(sortBy, newOrder);
  };

  // Handle pagination
  const totalPages = Math.ceil(totalCount / limit);
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, totalCount);

  const handleFirstPage = () => setPage(1);
  const handlePrevPage = () => setPage(Math.max(1, page - 1));
  const handleNextPage = () => setPage(Math.min(totalPages, page + 1));
  const handleLastPage = () => setPage(totalPages);

  // Handle applicant click
  const handleApplicantClick = (applicationId: string) => {
    router.push(`/employer/jobs/${jobId}/applications/${applicationId}`);
  };

  // Get status badge color
  const getStatusBadgeColor = (status: string) => {
    const color = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'gray';
    const colorMap: Record<string, string> = {
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
      yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
      purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
      green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
      red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
      gray: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    };
    return colorMap[color] || colorMap.gray;
  };

  // Map sort state for SortableColumnHeader
  const currentSortColumn = filters.sortBy || null;
  const currentSortDirection = filters.order === 'desc' ? 'desc' : filters.order === 'asc' ? 'asc' : 'none';
  const handleSortColumn = (column: string) => {
    handleSort(column as 'fitIndex' | 'appliedDate');
  };

  // Loading state
  if (isLoading && applications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Loading applicants...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">Failed to load applicants</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (applications.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Inbox className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">No applicants found</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {filters.search
              ? 'Try adjusting your search or filters'
              : 'No applications have been received yet'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-950 sticky top-0 z-10">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Candidate
              </th>
              <SortableColumnHeader
                column="fitIndex"
                label="Fit Score"
                currentSortColumn={currentSortColumn}
                currentSortDirection={currentSortDirection as any}
                onSort={handleSortColumn}
              />
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Status
              </th>
              <SortableColumnHeader
                column="appliedDate"
                label="Applied"
                currentSortColumn={currentSortColumn}
                currentSortDirection={currentSortDirection as any}
                onSort={handleSortColumn}
              />
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
              >
                Location
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {applications.map((application) => (
              <tr
                key={application.id}
                onClick={() => handleApplicantClick(application.id)}
                className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {application.candidate.first_name} {application.candidate.last_name}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {application.candidate.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFitScoreColor(
                      application.fit_index
                    )}`}
                  >
                    {application.fit_index}%
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                      application.status
                    )}`}
                  >
                    {STATUS_LABELS[application.status]}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {formatDistanceToNow(new Date(application.applied_at), {
                    addSuffix: true,
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {application.candidate.location || '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalCount}</span> results
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleFirstPage}
              disabled={page === 1}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="First page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={handlePrevPage}
              disabled={page === 1}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm text-gray-700 dark:text-gray-300 px-4">
              Page {page} of {totalPages}
            </span>

            <button
              onClick={handleNextPage}
              disabled={!hasMore}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleLastPage}
              disabled={!hasMore}
              className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Last page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
