/**
 * ATS Store - Zustand State Management
 * Week 40 Day 3
 *
 * Centralized state for:
 * - Applications data
 * - View preference (List vs Kanban)
 * - Filters and sorting
 * - Selection state
 * - Loading and error states
 */

import { create } from 'zustand';
import { atsApi } from '@/lib/api';

// Types
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

export interface Filters {
  stage?: string;
  minFitIndex?: number;
  maxFitIndex?: number;
  tags?: string[];
  assignee?: string;
}

export type SortOption = 'fit-desc' | 'fit-asc' | 'date-desc' | 'date-asc';
export type ViewMode = 'list' | 'kanban';

interface ATSStore {
  // Data
  applications: Applicant[];
  filteredApplications: Applicant[];

  // UI State
  view: ViewMode;
  loading: boolean;
  error: string | null;

  // Filters & Sort
  filters: Filters;
  sortBy: SortOption;

  // Selection
  selectedIds: string[];

  // Modal
  selectedApplicationId: string | null;

  // Actions - View
  setView: (view: ViewMode) => void;
  toggleView: () => void;

  // Actions - Data
  fetchApplications: (jobId: string) => Promise<void>;
  refreshData: () => Promise<void>;
  updateApplication: (id: string, updates: Partial<Applicant>) => void;

  // Actions - Filters & Sort
  setFilters: (filters: Partial<Filters>) => void;
  clearFilters: () => void;
  setSortBy: (sortBy: SortOption) => void;

  // Actions - Selection
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Actions - Modal
  openModal: (applicationId: string) => void;
  closeModal: () => void;

  // Internal
  currentJobId: string | null;
  applyFiltersAndSort: () => void;
}

// Helper function to apply filters
function filterApplications(applications: Applicant[], filters: Filters): Applicant[] {
  let filtered = [...applications];

  if (filters.stage) {
    filtered = filtered.filter(a => a.stage === filters.stage);
  }

  if (filters.minFitIndex !== undefined) {
    filtered = filtered.filter(a => a.fitIndex >= filters.minFitIndex!);
  }

  if (filters.maxFitIndex !== undefined) {
    filtered = filtered.filter(a => a.fitIndex <= filters.maxFitIndex!);
  }

  if (filters.tags && filters.tags.length > 0) {
    filtered = filtered.filter(a =>
      filters.tags!.some(tag => a.tags?.includes(tag))
    );
  }

  if (filters.assignee) {
    filtered = filtered.filter(a => a.assignedTo === filters.assignee);
  }

  return filtered;
}

// Helper function to sort applications
function sortApplications(applications: Applicant[], sortBy: SortOption): Applicant[] {
  const sorted = [...applications];

  switch (sortBy) {
    case 'fit-desc':
      return sorted.sort((a, b) => b.fitIndex - a.fitIndex);
    case 'fit-asc':
      return sorted.sort((a, b) => a.fitIndex - b.fitIndex);
    case 'date-desc':
      return sorted.sort(
        (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
      );
    case 'date-asc':
      return sorted.sort(
        (a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()
      );
    default:
      return sorted;
  }
}

// Load view preference from localStorage
function loadViewPreference(): ViewMode {
  if (typeof window === 'undefined') return 'list';
  const saved = localStorage.getItem('ats_view_preference');
  return (saved === 'kanban' || saved === 'list') ? saved : 'list';
}

// Save view preference to localStorage
function saveViewPreference(view: ViewMode) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ats_view_preference', view);
}

// Create the store
export const useATSStore = create<ATSStore>((set, get) => ({
  // Initial State
  applications: [],
  filteredApplications: [],
  view: loadViewPreference(),
  loading: false,
  error: null,
  filters: {},
  sortBy: 'date-desc',
  selectedIds: [],
  selectedApplicationId: null,
  currentJobId: null,

  // View Actions
  setView: (view) => {
    saveViewPreference(view);
    set({ view });
  },

  toggleView: () => {
    const currentView = get().view;
    const newView: ViewMode = currentView === 'list' ? 'kanban' : 'list';
    saveViewPreference(newView);
    set({ view: newView });
  },

  // Data Actions
  fetchApplications: async (jobId) => {
    set({ loading: true, error: null, currentJobId: jobId });

    try {
      const response = await atsApi.getApplications(jobId);
      const applications = response.data.data;

      set({ applications, loading: false });
      get().applyFiltersAndSort();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load applications',
        loading: false,
      });
    }
  },

  refreshData: async () => {
    const { currentJobId } = get();
    if (currentJobId) {
      await get().fetchApplications(currentJobId);
    }
  },

  updateApplication: (id, updates) => {
    set((state) => ({
      applications: state.applications.map((app) =>
        app.id === id ? { ...app, ...updates } : app
      ),
    }));
    get().applyFiltersAndSort();
  },

  // Filter & Sort Actions
  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
    }));
    get().applyFiltersAndSort();
  },

  clearFilters: () => {
    set({ filters: {} });
    get().applyFiltersAndSort();
  },

  setSortBy: (sortBy) => {
    set({ sortBy });
    get().applyFiltersAndSort();
  },

  // Selection Actions
  toggleSelection: (id) => {
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((selectedId) => selectedId !== id)
        : [...state.selectedIds, id],
    }));
  },

  selectAll: () => {
    set((state) => ({
      selectedIds: state.filteredApplications.map((app) => app.id),
    }));
  },

  clearSelection: () => {
    set({ selectedIds: [] });
  },

  // Modal Actions
  openModal: (applicationId) => {
    set({ selectedApplicationId: applicationId });
  },

  closeModal: () => {
    set({ selectedApplicationId: null });
  },

  // Internal Helper
  applyFiltersAndSort: () => {
    const { applications, filters, sortBy } = get();

    let filtered = filterApplications(applications, filters);
    filtered = sortApplications(filtered, sortBy);

    set({ filteredApplications: filtered });
  },
}));
