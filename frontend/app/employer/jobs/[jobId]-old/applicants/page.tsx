'use client';

/**
 * ATS Application List Page
 *
 * Displays all applications for a specific job with:
 * - Filtering by status and fit index
 * - Sorting by fit score or application date
 * - Pagination
 * - AI fit score visualization
 * - Quick actions (status change, notes, assign)
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { atsApi } from '@/lib/api';
import CandidateDetailModal from '@/components/employer/CandidateDetailModal';
import { formatDate } from '@/lib/utils';

// Types
interface Application {
  id: string;
  user_id: string;
  job_id: string;
  status: string;
  fit_index: number | null;
  applied_at: string;
  candidate: {
    first_name: string;
    last_name: string;
    email: string;
    headline?: string;
  };
  assigned_to: string[];
  note_count?: number;
}

interface ApplicationListResponse {
  applications: Application[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export default function ApplicantsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const [applications, setApplications] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter and sort state
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [minFitIndex, setMinFitIndex] = useState<number | undefined>(undefined);
  const [sortBy, setSortBy] = useState<string>('fit_index');
  const [order, setOrder] = useState<string>('desc');
  const [page, setPage] = useState<number>(1);
  const limit = 20;

  // Selected applications for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal state
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, [jobId, statusFilter, minFitIndex, sortBy, order, page]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await atsApi.getJobApplications(jobId, {
        status: statusFilter ? [statusFilter] : undefined,
        minFitIndex: minFitIndex,
        sortBy: sortBy as 'fitIndex' | 'appliedDate' | 'experience' | undefined,
        order: order as 'asc' | 'desc' | undefined,
        page,
        limit,
      });

      const data = response.data.data as ApplicationListResponse;
      setApplications(data.applications);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err: any) {
      if (err.response?.status === 401) {
        router.push('/login');
        return;
      }
      setError(err.response?.data?.detail || 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(applications.map(app => app.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds);
    if (checked) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkAction = async (action: 'reject' | 'shortlist' | 'move_to_stage', targetStatus?: string) => {
    try {
      await atsApi.bulkUpdateApplications({
        application_ids: Array.from(selectedIds),
        action,
        target_status: targetStatus,
      });

      // Refresh list
      await fetchApplications();
      setSelectedIds(new Set());
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Bulk action failed');
    }
  };

  if (loading && applications.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={fetchApplications}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Applicants</h1>
              <p className="text-gray-600">{total} total applications</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Back to Jobs
            </button>
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="reviewing">Reviewing</option>
                <option value="phone_screen">Phone Screen</option>
                <option value="technical_interview">Technical Interview</option>
                <option value="final_interview">Final Interview</option>
                <option value="offer">Offer</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Min Fit Score Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Fit Score</label>
              <select
                value={minFitIndex || ''}
                onChange={(e) => {
                  setMinFitIndex(e.target.value ? parseInt(e.target.value) : undefined);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Any Score</option>
                <option value="80">80+ (Excellent)</option>
                <option value="70">70+ (Good)</option>
                <option value="60">60+ (Fair)</option>
                <option value="50">50+ (Below Average)</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="fit_index">Fit Score</option>
                <option value="applied_at">Application Date</option>
              </select>
            </div>

            {/* Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
              <select
                value={order}
                onChange={(e) => {
                  setOrder(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.size} application(s) selected
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleBulkAction('shortlist')}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                >
                  Shortlist
                </button>
                <button
                  onClick={() => handleBulkAction('reject')}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                >
                  Reject
                </button>
                <button
                  onClick={() => handleBulkAction('move_to_stage', 'phone_screen')}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Move to Phone Screen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Applications Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === applications.length && applications.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fit Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Applied
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No applications found matching your filters
                  </td>
                </tr>
              ) : (
                applications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(app.id)}
                        onChange={(e) => handleSelectOne(app.id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {app.candidate.first_name} {app.candidate.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{app.candidate.email}</div>
                        {app.candidate.headline && (
                          <div className="text-xs text-gray-500 mt-1">{app.candidate.headline}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <FitScoreBadge score={app.fit_index} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={app.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(app.applied_at)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedApplicationId(app.id);
                          setIsModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} results
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium ${
                        page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Candidate Detail Modal */}
      {selectedApplicationId && (
        <CandidateDetailModal
          applicationId={selectedApplicationId}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedApplicationId(null);
          }}
          onUpdate={fetchApplications}
        />
      )}
    </div>
  );
}

// Helper Components

interface FitScoreBadgeProps {
  score: number | null;
}

function FitScoreBadge({ score }: FitScoreBadgeProps) {
  if (score === null) {
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
        Not Scored
      </span>
    );
  }

  let colorClass = '';
  let label = '';

  if (score >= 80) {
    colorClass = 'bg-green-100 text-green-800';
    label = 'Excellent';
  } else if (score >= 70) {
    colorClass = 'bg-blue-100 text-blue-800';
    label = 'Good';
  } else if (score >= 60) {
    colorClass = 'bg-yellow-100 text-yellow-800';
    label = 'Fair';
  } else {
    colorClass = 'bg-red-100 text-red-800';
    label = 'Below Average';
  }

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colorClass}`}>
        {score}
      </span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

interface StatusBadgeProps {
  status: string;
}

function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig: Record<string, { color: string; label: string }> = {
    new: { color: 'bg-blue-100 text-blue-800', label: 'New' },
    reviewing: { color: 'bg-purple-100 text-purple-800', label: 'Reviewing' },
    phone_screen: { color: 'bg-yellow-100 text-yellow-800', label: 'Phone Screen' },
    technical_interview: { color: 'bg-orange-100 text-orange-800', label: 'Technical' },
    final_interview: { color: 'bg-pink-100 text-pink-800', label: 'Final Interview' },
    offer: { color: 'bg-green-100 text-green-800', label: 'Offer' },
    hired: { color: 'bg-green-200 text-green-900', label: 'Hired' },
    rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
  };

  const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
}
