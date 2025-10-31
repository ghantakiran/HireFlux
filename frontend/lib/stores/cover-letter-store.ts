import { create } from 'zustand';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Types based on backend schemas
export type CoverLetterTone = 'formal' | 'concise' | 'conversational';
export type CoverLetterLength = 'short' | 'medium' | 'long';

export interface CoverLetter {
  id: string;
  user_id: string;
  job_id?: string;
  resume_version_id: string;
  content: string;
  tone: CoverLetterTone;
  length: CoverLetterLength;
  job_title?: string;
  company_name?: string;
  personalize_company: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoverLetterGenerateRequest {
  job_id?: string;
  job_description: string;
  resume_version_id: string;
  tone: CoverLetterTone;
  length: CoverLetterLength;
  personalize_company: boolean;
  job_title?: string;
  company_name?: string;
}

export interface CoverLetterStats {
  total_generated: number;
  used_in_applications: number;
  this_month: number;
  by_tone: {
    formal: number;
    concise: number;
    conversational: number;
  };
}

export interface CoverLetterFilters {
  job_id?: string;
  tone?: CoverLetterTone;
  created_after?: string;
  created_before?: string;
}

export interface CoverLetterSearchParams extends CoverLetterFilters {
  page?: number;
  limit?: number;
  sort?: 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
}

interface CoverLetterState {
  // State
  coverLetters: CoverLetter[];
  currentCoverLetter: CoverLetter | null;
  stats: CoverLetterStats | null;
  isLoading: boolean;
  isGenerating: boolean;
  generationProgress: number;
  error: string | null;
  filters: CoverLetterFilters;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };

  // Actions
  fetchCoverLetters: (params?: CoverLetterSearchParams) => Promise<void>;
  fetchCoverLetter: (id: string) => Promise<void>;
  generateCoverLetter: (data: CoverLetterGenerateRequest) => Promise<CoverLetter>;
  updateCoverLetter: (id: string, content: string) => Promise<void>;
  deleteCoverLetter: (id: string) => Promise<void>;
  downloadCoverLetter: (id: string, format: 'pdf' | 'docx') => Promise<void>;
  fetchStats: () => Promise<void>;
  setFilters: (filters: Partial<CoverLetterFilters>) => void;
  clearFilters: () => void;
  clearError: () => void;
  clearCurrentCoverLetter: () => void;
  resetGenerationProgress: () => void;
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

export const useCoverLetterStore = create<CoverLetterState>((set, get) => ({
  // Initial state
  coverLetters: [],
  currentCoverLetter: null,
  stats: null,
  isLoading: false,
  isGenerating: false,
  generationProgress: 0,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    total_pages: 0,
  },

  // Fetch cover letters
  fetchCoverLetters: async (params?: CoverLetterSearchParams) => {
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

      const response = await api.get('/cover-letters', { params: searchParams });

      const data = response.data.data;
      const coverLetters = Array.isArray(data) ? data : data.cover_letters || [];
      const total = data.total || coverLetters.length;
      const page = data.page || searchParams.page;
      const limit = data.limit || searchParams.limit;

      set({
        coverLetters,
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
        error?.response?.data?.detail || 'Failed to fetch cover letters';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Fetch single cover letter
  fetchCoverLetter: async (id: string) => {
    try {
      set({ isLoading: true, error: null });

      const api = createAuthAxios();
      const response = await api.get(`/cover-letters/${id}`);

      set({
        currentCoverLetter: response.data.data,
        isLoading: false,
      });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail || 'Failed to fetch cover letter';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Generate cover letter with progress simulation
  generateCoverLetter: async (data: CoverLetterGenerateRequest) => {
    try {
      set({ isGenerating: true, generationProgress: 0, error: null });

      // Simulate progress
      const progressInterval = setInterval(() => {
        set((state) => ({
          generationProgress: Math.min(state.generationProgress + 10, 90),
        }));
      }, 500);

      const api = createAuthAxios();
      const response = await api.post('/cover-letters/generate', data);

      clearInterval(progressInterval);
      set({ generationProgress: 100 });

      const newCoverLetter = response.data.data;

      // Add to cover letters list
      const { coverLetters } = get();
      set({
        coverLetters: [newCoverLetter, ...coverLetters],
        currentCoverLetter: newCoverLetter,
        isGenerating: false,
        generationProgress: 0,
      });

      return newCoverLetter;
    } catch (error: any) {
      set({ generationProgress: 0 });
      const errorMessage =
        error?.response?.data?.detail || 'Failed to generate cover letter';
      set({ error: errorMessage, isGenerating: false });
      throw error;
    }
  },

  // Update cover letter content
  updateCoverLetter: async (id: string, content: string) => {
    try {
      set({ isLoading: true, error: null });

      const api = createAuthAxios();
      const response = await api.put(`/cover-letters/${id}`, { content });

      const updatedCoverLetter = response.data.data;

      // Update in cover letters list
      const { coverLetters } = get();
      set({
        coverLetters: coverLetters.map((cl) =>
          cl.id === id ? { ...cl, ...updatedCoverLetter } : cl
        ),
        currentCoverLetter:
          get().currentCoverLetter?.id === id
            ? { ...get().currentCoverLetter, ...updatedCoverLetter }
            : get().currentCoverLetter,
        isLoading: false,
      });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail || 'Failed to update cover letter';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Delete cover letter
  deleteCoverLetter: async (id: string) => {
    try {
      set({ isLoading: true, error: null });

      const api = createAuthAxios();
      await api.delete(`/cover-letters/${id}`);

      // Remove from cover letters list
      const { coverLetters } = get();
      set({
        coverLetters: coverLetters.filter((cl) => cl.id !== id),
        currentCoverLetter:
          get().currentCoverLetter?.id === id ? null : get().currentCoverLetter,
        isLoading: false,
      });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail || 'Failed to delete cover letter';
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Download cover letter as PDF or DOCX
  downloadCoverLetter: async (id: string, format: 'pdf' | 'docx') => {
    try {
      set({ isLoading: true, error: null });

      const api = createAuthAxios();
      const response = await api.get(`/cover-letters/${id}/export`, {
        params: { format },
        responseType: 'blob',
      });

      // Create blob from response
      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `cover-letter-${id}.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      set({ isLoading: false });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail || `Failed to download cover letter as ${format.toUpperCase()}`;
      set({ error: errorMessage, isLoading: false });
      throw error;
    }
  },

  // Fetch statistics
  fetchStats: async () => {
    try {
      const api = createAuthAxios();
      const response = await api.get('/cover-letters/stats');

      set({
        stats: response.data.data,
      });
    } catch (error: any) {
      // Silently fail - stats are not critical
      console.error('Failed to fetch cover letter stats:', error);
    }
  },

  // Set filters
  setFilters: (newFilters: Partial<CoverLetterFilters>) => {
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

  // Clear current cover letter
  clearCurrentCoverLetter: () => set({ currentCoverLetter: null }),

  // Reset generation progress
  resetGenerationProgress: () => set({ generationProgress: 0 }),
}));
