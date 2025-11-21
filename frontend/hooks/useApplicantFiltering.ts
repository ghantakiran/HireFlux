/**
 * Zustand Store for Applicant Filtering & Sorting
 * Issue #59: ATS Core Features
 *
 * Manages state for:
 * - Filter parameters (status, fit index, dates, tags, search)
 * - Sorting (field, order)
 * - Pagination (page, limit)
 * - Applications data
 * - Filter statistics
 * - Loading/error states
 */

import { create } from 'zustand';
import { atsApi } from '@/lib/api';
import {
  Application,
  FilterParams,
  FilterStats,
  ApplicantFilterState,
} from '@/lib/types/applicant-filtering';

interface ApplicantFilteringStore extends ApplicantFilterState {
  // Actions
  setFilters: (filters: Partial<FilterParams>) => void;
  clearFilters: () => void;
  setSearch: (search: string) => void;
  setSort: (sortBy: FilterParams['sortBy'], order: FilterParams['order']) => void;
  setPage: (page: number) => void;
  fetchApplications: (jobId: string) => Promise<void>;
  refreshData: (jobId: string) => Promise<void>;

  // Computed
  activeFilterCount: () => number;
}

const initialFilters: FilterParams = {
  status: undefined,
  minFitIndex: undefined,
  maxFitIndex: undefined,
  appliedAfter: undefined,
  appliedBefore: undefined,
  assignedTo: undefined,
  tags: undefined,
  search: undefined,
  unassigned: undefined,
  sortBy: 'appliedDate',
  order: 'desc',
  page: 1,
  limit: 50,
};

export const useApplicantFiltering = create<ApplicantFilteringStore>((set, get) => ({
  // Initial state
  filters: initialFilters,
  isLoading: false,
  error: null,
  applications: [],
  filterStats: null,
  totalCount: 0,
  page: 1,
  limit: 50,
  hasMore: false,

  // Set filters (merge with existing)
  setFilters: (newFilters) => {
    set((state) => ({
      filters: {
        ...state.filters,
        ...newFilters,
        page: 1, // Reset to page 1 when filters change
      },
      page: 1,
    }));
  },

  // Clear all filters
  clearFilters: () => {
    set({
      filters: initialFilters,
      page: 1,
    });
  },

  // Set search term (debounced in component)
  setSearch: (search) => {
    set((state) => ({
      filters: {
        ...state.filters,
        search: search || undefined,
        page: 1,
      },
      page: 1,
    }));
  },

  // Set sorting
  setSort: (sortBy, order) => {
    set((state) => ({
      filters: {
        ...state.filters,
        sortBy: sortBy || 'appliedDate',
        order: order || 'desc',
      },
    }));
  },

  // Set page for pagination
  setPage: (page) => {
    set((state) => ({
      filters: {
        ...state.filters,
        page,
      },
      page,
    }));
  },

  // Fetch applications with current filters
  fetchApplications: async (jobId: string) => {
    set({ isLoading: true, error: null });

    try {
      const { filters } = get();

      // Call API with filters
      const response = await atsApi.getJobApplications(jobId, filters);

      if (response.data.success) {
        const { data } = response.data;

        set({
          applications: data.applications,
          filterStats: data.filter_stats,
          totalCount: data.total_count,
          page: data.page,
          limit: data.limit,
          hasMore: data.has_more,
          isLoading: false,
          error: null,
        });
      } else {
        throw new Error('Failed to fetch applications');
      }
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      set({
        isLoading: false,
        error: error.response?.data?.detail || error.message || 'Failed to fetch applications',
        applications: [],
      });
    }
  },

  // Refresh data (clear cache and refetch)
  refreshData: async (jobId: string) => {
    await get().fetchApplications(jobId);
  },

  // Count active filters
  activeFilterCount: () => {
    const { filters } = get();
    let count = 0;

    if (filters.status && filters.status.length > 0) count++;
    if (filters.minFitIndex !== undefined) count++;
    if (filters.maxFitIndex !== undefined) count++;
    if (filters.appliedAfter) count++;
    if (filters.appliedBefore) count++;
    if (filters.assignedTo) count++;
    if (filters.tags && filters.tags.length > 0) count++;
    if (filters.search) count++;
    if (filters.unassigned) count++;

    return count;
  },
}));
