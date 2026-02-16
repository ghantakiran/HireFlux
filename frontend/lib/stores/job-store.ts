import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { API_URL, getAuthToken, createAuthAxios } from '@/lib/api-client';

// Types based on backend schemas
export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  preferred_qualifications: string[];
  responsibilities: string[];
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  employment_type: 'full_time' | 'part_time' | 'contract' | 'internship';
  remote_policy: 'remote' | 'hybrid' | 'onsite';
  experience_level: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  skills_required: string[];
  skills_preferred: string[];
  benefits: string[];
  application_url: string;
  company_description?: string;
  company_size?: string;
  industry?: string;
  posted_at: string;
  expires_at?: string;
  source: string;
  source_url: string;
  is_visa_friendly: boolean;
  created_at: string;
}

export interface MatchScore {
  job_id: string;
  user_id: string;
  fit_index: number;
  skills_match_score: number;
  experience_match_score: number;
  location_match_score: number;
  salary_match_score: number;
  match_rationale: string;
  matched_skills: string[];
  missing_skills: string[];
  calculated_at: string;
}

export interface JobWithMatch extends Job {
  match_score?: MatchScore;
}

export interface SavedJob {
  id: string;
  job_id: string;
  user_id: string;
  saved_at: string;
  notes?: string;
}

export interface JobSearchFilters {
  query?: string;
  min_fit_index?: number;
  remote_policy?: 'remote' | 'hybrid' | 'onsite' | 'any';
  visa_friendly?: boolean;
  salary_min?: number;
  salary_max?: number;
  posted_after?: string;
  experience_level?: string[];
  employment_type?: string[];
  skills?: string[];
}

export interface JobSearchParams extends JobSearchFilters {
  page?: number;
  limit?: number;
  sort?: 'fit_index' | 'posted_at' | 'salary' | 'relevance';
  order?: 'asc' | 'desc';
}

interface JobState {
  // State
  jobs: JobWithMatch[];
  savedJobs: SavedJob[];
  currentJob: JobWithMatch | null;
  isLoading: boolean;
  error: string | null;
  filters: JobSearchFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };

  // Actions
  fetchJobs: (params?: JobSearchParams) => Promise<void>;
  fetchJob: (jobId: string) => Promise<void>;
  searchJobs: (params: JobSearchParams) => Promise<void>;
  saveJob: (jobId: string, notes?: string) => Promise<void>;
  unsaveJob: (jobId: string) => Promise<void>;
  fetchSavedJobs: () => Promise<void>;
  isSaved: (jobId: string) => boolean;
  setFilters: (filters: Partial<JobSearchFilters>) => void;
  clearFilters: () => void;
  clearError: () => void;
  clearCurrentJob: () => void;
}

export const useJobStore = create<JobState>()(
  persist(
    (set, get) => ({
      // Initial state
      jobs: [],
      savedJobs: [],
      currentJob: null,
      isLoading: false,
      error: null,
      filters: {},
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        total_pages: 0,
      },

      // Fetch job matches
      fetchJobs: async (params?: JobSearchParams) => {
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
          };

          const response = await api.get('/jobs/matches', { params: searchParams });

          const { jobs, total, page, limit } = response.data.data;

          set({
            jobs: jobs || [],
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
            error?.response?.data?.detail || 'Failed to fetch jobs';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Fetch single job
      fetchJob: async (jobId: string) => {
        try {
          set({ isLoading: true, error: null });

          const api = createAuthAxios();
          const response = await api.get(`/jobs/${jobId}`);

          set({
            currentJob: response.data.data,
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || 'Failed to fetch job';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Search jobs
      searchJobs: async (params: JobSearchParams) => {
        try {
          set({ isLoading: true, error: null });

          const api = createAuthAxios();
          const response = await api.post('/jobs/search', params);

          const { jobs, total, page, limit } = response.data.data;

          set({
            jobs: jobs || [],
            pagination: {
              page: page || 1,
              limit: limit || 20,
              total: total || 0,
              total_pages: Math.ceil((total || 0) / (limit || 20)),
            },
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || 'Failed to search jobs';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Save job
      saveJob: async (jobId: string, notes?: string) => {
        try {
          set({ isLoading: true, error: null });

          const api = createAuthAxios();
          const response = await api.post(`/jobs/${jobId}/save`, { notes });

          const savedJob = response.data.data;

          // Add to saved jobs list
          const { savedJobs } = get();
          set({
            savedJobs: [savedJob, ...savedJobs],
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || 'Failed to save job';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Unsave job
      unsaveJob: async (jobId: string) => {
        try {
          set({ isLoading: true, error: null });

          const api = createAuthAxios();
          await api.delete(`/jobs/${jobId}/save`);

          // Remove from saved jobs list
          const { savedJobs } = get();
          set({
            savedJobs: savedJobs.filter((job) => job.job_id !== jobId),
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || 'Failed to unsave job';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Fetch saved jobs
      fetchSavedJobs: async () => {
        try {
          set({ isLoading: true, error: null });

          const api = createAuthAxios();
          const response = await api.get('/jobs/saved');

          set({
            savedJobs: response.data.data || [],
            isLoading: false,
          });
        } catch (error: any) {
          const errorMessage =
            error?.response?.data?.detail || 'Failed to fetch saved jobs';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      // Check if job is saved
      isSaved: (jobId: string) => {
        const { savedJobs } = get();
        return savedJobs.some((job) => job.job_id === jobId);
      },

      // Set filters
      setFilters: (newFilters: Partial<JobSearchFilters>) => {
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

      // Clear current job
      clearCurrentJob: () => set({ currentJob: null }),
    }),
    {
      name: 'job-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        savedJobs: state.savedJobs,
        filters: state.filters,
      }),
    }
  )
);
