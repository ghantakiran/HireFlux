/**
 * Assessments List Page - Employer Portal
 * Sprint 17-18 Phase 4
 *
 * BDD Test: tests/e2e/assessment-features.spec.ts
 * Satisfies: "should create a new technical screening assessment"
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, MoreVertical, ClipboardCheck } from 'lucide-react';
import { EmptyState } from '@/components/domain/EmptyState';
import { Button } from '@/components/ui/button';
import { SearchInput } from '@/components/ui/search-input';
import { FilterBar } from '@/components/ui/filter-bar';
import { useSearch } from '@/hooks/useSearch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PageLoader } from '@/components/ui/page-loader';
import { assessmentApi } from '@/lib/api';
import { getAssessmentStatusBadgeColor, getAssessmentTypeBadgeColor } from '@/lib/badge-helpers';
import { Pagination } from '@/components/ui/pagination';
import { usePagination } from '@/hooks/usePagination';
import { useColumnSort, parseSortValue } from '@/hooks/useColumnSort';
import { useURLState } from '@/hooks/useURLState';
import { getErrorMessage } from '@/lib/api-error-handler';

interface Assessment {
  id: string;
  title: string;
  description: string;
  assessment_type: 'screening' | 'technical' | 'behavioral' | 'culture_fit';
  status: 'draft' | 'published' | 'archived';
  total_attempts: number;
  avg_score: number;
  pass_rate: number;
  time_limit_minutes: number;
  created_at: string;
}

const ASSESSMENT_URL_CONFIG = {
  status: { defaultValue: 'all' },
  type: { defaultValue: 'all' },
  search: { defaultValue: '' },
  sort: { defaultValue: 'created_at' },
  sort_dir: { defaultValue: 'desc' },
};

export default function AssessmentsPage() {
  const router = useRouter();
  const urlState = useURLState(ASSESSMENT_URL_CONFIG);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const statusFilter = urlState.params.status || 'all';
  const setStatusFilter = (s: string) => urlState.setParam('status', s);
  const typeFilter = urlState.params.type || 'all';
  const setTypeFilter = (s: string) => urlState.setParam('type', s);
  const { query: searchQuery, debouncedQuery, setQuery: setSearchQuery, isDebouncing } = useSearch({
    initialQuery: urlState.params.search,
    debounceMs: 300,
    onSearch: (q) => { urlState.setParam('search', q); },
  });

  const filteredAssessments = assessments.filter((a) => {
    if (!debouncedQuery) return true;
    const q = debouncedQuery.toLowerCase();
    return a.title.toLowerCase().includes(q) || a.description?.toLowerCase().includes(q);
  });

  // Sorting
  const { sortedItems: sortedAssessments, setSort } = useColumnSort<Assessment>({
    items: filteredAssessments,
    defaultSort: {
      column: (urlState.params.sort || 'created_at') as any,
      direction: (urlState.params.sort_dir || 'desc') as 'asc' | 'desc',
    },
  });

  const sortDropdownValue = `${urlState.params.sort}_${urlState.params.sort_dir}`;

  const handleSortChange = (value: string) => {
    const { column, direction } = parseSortValue(value);
    setSort(column, direction);
    urlState.setParams({ sort: column, sort_dir: direction });
  };

  useEffect(() => {
    const col = urlState.params.sort || 'created_at';
    const dir = urlState.params.sort_dir || 'desc';
    setSort(col, dir as 'asc' | 'desc');
  }, [urlState.params.sort, urlState.params.sort_dir]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedItems: paginatedAssessments,
    pageInfo,
  } = usePagination({ items: sortedAssessments, itemsPerPage: 10 });

  // Set page metadata
  useEffect(() => {
    document.title = 'Assessments | HireFlux';
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [statusFilter, typeFilter]);

  const fetchAssessments = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string | number> = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (typeFilter !== 'all') {
        params.assessment_type = typeFilter;
      }

      const response = await assessmentApi.listAssessments(params);

      if (response.data.success) {
        setAssessments(response.data.data || []);
      } else {
        setError('Failed to load assessments');
      }
    } catch (error: unknown) {
      console.error('Failed to fetch assessments:', error);
      setError(getErrorMessage(error, 'Failed to load assessments'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssessment = () => {
    router.push('/employer/assessments/new');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Assessments</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Create and manage skills assessments for your candidates
          </p>
        </div>
        <Button
          onClick={handleCreateAssessment}
          data-testid="create-assessment-button"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Assessment
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              isSearching={isDebouncing}
              placeholder="Search assessments..."
              data-testid="search-assessments"
            />
          </div>
          <FilterBar
            filters={[
              {
                type: 'select',
                key: 'status',
                label: 'Status',
                options: [
                  { value: 'all', label: 'All Status' },
                  { value: 'published', label: 'Published' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'archived', label: 'Archived' },
                ],
                'data-testid': 'status-filter',
              },
              {
                type: 'select',
                key: 'type',
                label: 'Type',
                options: [
                  { value: 'all', label: 'All Types' },
                  { value: 'screening', label: 'Screening' },
                  { value: 'technical', label: 'Technical' },
                  { value: 'behavioral', label: 'Behavioral' },
                  { value: 'culture_fit', label: 'Culture Fit' },
                ],
                'data-testid': 'type-filter',
              },
              {
                type: 'select',
                key: 'sort',
                label: 'Sort by',
                options: [
                  { value: 'created_at_desc', label: 'Newest First' },
                  { value: 'created_at_asc', label: 'Oldest First' },
                  { value: 'total_attempts_desc', label: 'Most Attempts' },
                  { value: 'avg_score_desc', label: 'Highest Avg Score' },
                ],
                'data-testid': 'sort-select',
              },
            ]}
            values={{ status: statusFilter, type: typeFilter, sort: sortDropdownValue }}
            onChange={(key, val) => {
              if (key === 'status') setStatusFilter(val);
              if (key === 'type') setTypeFilter(val);
              if (key === 'sort') handleSortChange(val);
            }}
            showClearButton={false}
          />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg mb-4">
          <p className="font-medium">Error loading assessments</p>
          <p className="text-sm mt-1">{error}</p>
          <Button variant="outline" size="sm" onClick={fetchAssessments} className="mt-2">
            Try Again
          </Button>
        </div>
      )}

      {/* Assessments List */}
      <div className="space-y-4">
        {loading ? (
          <PageLoader message="Loading assessments..." />
        ) : assessments.length === 0 && !error ? (
          <EmptyState
            title="No assessments yet"
            description="Create skills assessments to evaluate candidates for your open positions."
            icon={<ClipboardCheck className="h-12 w-12 text-muted-foreground" />}
            actionLabel="Create Assessment"
            onAction={() => router.push('/employer/assessments/new')}
          />
        ) : filteredAssessments.length === 0 && !error ? (
          <EmptyState
            title="No matching assessments"
            description="Try adjusting your search or filter criteria."
            icon={<ClipboardCheck className="h-12 w-12 text-muted-foreground" />}
          />
        ) : (
          paginatedAssessments.map((assessment) => (
            <div
              key={assessment.id}
              data-testid="assessment-item"
              className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/employer/assessments/${assessment.id}`)}
              tabIndex={0}
              role="button"
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/employer/assessments/${assessment.id}`); } }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {assessment.title}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getAssessmentStatusBadgeColor(
                        assessment.status
                      )}`}
                    >
                      {assessment.status}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getAssessmentTypeBadgeColor(
                        assessment.assessment_type
                      )}`}
                    >
                      {assessment.assessment_type.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{assessment.description}</p>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm text-gray-500 dark:text-gray-400">
                    <span>{assessment.total_attempts} attempts</span>
                    <span>Avg Score: {assessment.avg_score}%</span>
                    <span>Pass Rate: {assessment.pass_rate}%</span>
                    <span>{assessment.time_limit_minutes} min</span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()} aria-label="Assessment actions">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/employer/assessments/${assessment.id}/edit`)}>
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/employer/assessments/${assessment.id}/analytics`)}>
                      View Analytics
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push(`/employer/assessments/${assessment.id}/clone`)}>
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600 dark:text-red-400">
                      Archive
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={pageInfo.totalItems}
            itemsPerPage={10}
          />
      </div>
    </div>
  );
}
