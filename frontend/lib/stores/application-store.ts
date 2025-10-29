import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Types based on backend schemas
export type ApplicationStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected';
export type ApplicationMode = 'manual' | 'apply_assist' | 'auto_apply';

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  resume_version_id?: string;
  cover_letter_id?: string;
  status: ApplicationStatus;
  applied_at?: string;
  notes?: string;
  is_auto_applied: boolean;
  application_mode?: ApplicationMode;
  created_at: string;
  updated_at: string;
}

export interface ApplicationDetail extends Application {
  job?: {
    id: string;
    title: string;
    company: string;
    location: string;
    remote_policy: string;
    employment_type: string;
    salary_min?: number;
    salary_max?: number;
    posted_at: string;
    match_score?: {
      fit_index: number;
    };
  };
  resume_version?: {
    id: string;
    title: string;
    filename: string;
  };
  cover_letter?: {
    id: string;
    job_title: string;
    company_name: string;
  };
}

export interface ApplicationStats {
  total_applications: number;
  by_status: {
    saved: number;
    applied: number;
    interview: number;
    offer: number;
    rejected: number;
  };
  by_mode: {
    manual: number;
    apply_assist: number;
    auto_apply: number;
  };
  total_interviews: number;
  total_offers: number;
  total_rejections: number;
  success_rate: number;
  avg_days_to_interview?: number;
  avg_days_to_offer?: number;
}

export interface ApplicationFilters {
  status?: ApplicationStatus;
  job_id?: string;
  is_auto_applied?: boolean;
  application_mode?: ApplicationMode;
  from_date?: string;
  to_date?: string;
}

export interface ApplicationSearchParams extends ApplicationFilters {
  page?: number;
  limit?: number;
  sort?: 'created_at' | 'applied_at' | 'updated_at' | 'status';
  order?: 'asc' | 'desc';
}

interface ApplicationState {
  // State
  applications: ApplicationDetail[];
  currentApplication: ApplicationDetail | null;
  stats: ApplicationStats | null;
  isLoading: boolean;
  error: string | null;
  filters: ApplicationFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };

  // Actions
  fetchApplications: (params?: ApplicationSearchParams) => Promise<void>;
  fetchApplication: (applicationId: string) => Promise<void>;
  createApplication: (data: {
    job_id: string;
    resume_version_id?: string;
    cover_letter_id?: string;
    status?: ApplicationStatus;
    notes?: string;
    is_auto_applied?: boolean;
    application_mode?: ApplicationMode;
  }) => Promise<Application>;
  updateApplication: (
    applicationId: string,
    data: {
      status?: ApplicationStatus;
      notes?: string;
      resume_version_id?: string;
      cover_letter_id?: string;
    }
  ) => Promise<void>;
  deleteApplication: (applicationId: string) => Promise<void>;
  fetchStats: () => Promise<void>;
  setFilters: (filters: Partial<ApplicationFilters>) => void;
  clearFilters: () => void;
  clearError: () => void;
  clearCurrentApplication: () => void;
}

// Helper function to get auth token
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
};

// Axios instance with auth
const createAuthAxios = () => {
  const token = getAuthToken();
  return axios.create({
    baseURL: API_URL,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
};

export const useApplicationStore = create<ApplicationState>()(
  persist(
    (set, get) => ({
      // Initial state
      applications: [],
      currentApplication: null,
      stats: null,
      isLoading: false,
      error: null,
      filters: {},
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0,
      },

      // Fetch applications
      fetchApplications: async (params?: ApplicationSearchParams) => {
        try {
          set({ isLoading: true, error: null });

          const api = createAuthAxios();
          const { filters, pagination } = get();

          // Merge current state with new params
          const searchParams = {
            ...filters,
            ...params,
            page: params?.page || pagination.page,
            limit: params?.limit || pagination.limit,
            sort: params?.sort || 'created_at',
            order: params?.order || 'desc',
          };

          const response = await api.get('/applications', { params: searchParams });

          const { applications, total, page, limit } = response.data.data;

          set({
            applications: applications || [],
            pagination: {
              page,
              limit,
              total,
              total_pages: Math.ceil(total / limit),
            },
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || 'Failed to fetch applications';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Fetch single application
      fetchApplication: async (applicationId: string) => {
        try {
          set({ isLoading: true, error: null });

          const api = createAuthAxios();
          const response = await api.get(`/applications/${applicationId}`);

          set({
            currentApplication: response.data.data,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || 'Failed to fetch application';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Create application
      createApplication: async (data) => {
        try {
          set({ isLoading: true, error: null });

          const api = createAuthAxios();
          const response = await api.post('/applications', data);

          const newApplication = response.data.data;

          // Add to applications list
          const { applications } = get();
          set({
            applications: [newApplication, ...applications],
            isLoading: false,
          });

          return newApplication;
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || 'Failed to create application';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Update application
      updateApplication: async (applicationId: string, data) => {
        try {
          set({ isLoading: true, error: null });

          const api = createAuthAxios();
          const response = await api.patch(`/applications/${applicationId}`, data);

          const updatedApplication = response.data.data;

          // Update in applications list
          const { applications } = get();
          set({
            applications: applications.map((app) =>
              app.id === applicationId ? { ...app, ...updatedApplication } : app
            ),
            currentApplication:
              get().currentApplication?.id === applicationId
                ? { ...get().currentApplication, ...updatedApplication }
                : get().currentApplication,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || 'Failed to update application';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Delete application
      deleteApplication: async (applicationId: string) => {
        try {
          set({ isLoading: true, error: null });

          const api = createAuthAxios();
          await api.delete(`/applications/${applicationId}`);

          // Remove from applications list
          const { applications } = get();
          set({
            applications: applications.filter((app) => app.id !== applicationId),
            currentApplication:
              get().currentApplication?.id === applicationId
                ? null
                : get().currentApplication,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || 'Failed to delete application';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Fetch statistics
      fetchStats: async () => {
        try {
          set({ isLoading: true, error: null });

          const api = createAuthAxios();
          const response = await api.get('/applications/stats');

          set({
            stats: response.data.data,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || 'Failed to fetch statistics';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Set filters
      setFilters: (newFilters: Partial<ApplicationFilters>) => {
        const { filters } = get();
        set({
          filters: { ...filters, ...newFilters },
          pagination: { ...get().pagination, page: 1 }, // Reset to page 1
        });
      },

      // Clear filters
      clearFilters: () => {
        set({
          filters: {},
          pagination: { ...get().pagination, page: 1 },
        });
      },

      // Clear error
      clearError: () => set({ error: null }),

      // Clear current application
      clearCurrentApplication: () => set({ currentApplication: null }),
    }),
    {
      name: 'application-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist filters
        filters: state.filters,
      }),
    }
  )
);
