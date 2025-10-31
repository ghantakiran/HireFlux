/**
 * Jobs React Query Hooks
 *
 * Custom hooks for job-related API calls with React Query.
 * Provides automatic caching, refetching, and state management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheInvalidation } from '../react-query';
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  requirements: string[];
  salary_range?: { min: number; max: number };
  employment_type: 'full-time' | 'part-time' | 'contract' | 'internship';
  remote: boolean;
  posted_at: string;
  is_saved?: boolean;
}

export interface JobFilters {
  search?: string;
  location?: string;
  remote?: boolean;
  employment_type?: string;
  salary_min?: number;
  salary_max?: number;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}

/**
 * Hook to fetch list of jobs with filters
 */
export function useJobs(filters?: JobFilters) {
  return useQuery({
    queryKey: queryKeys.jobs.list(filters),
    queryFn: async () => {
      const token = localStorage.getItem('access_token');
      const response = await axios.get<{ data: Job[] }>(`${API_BASE_URL}/jobs`, {
        params: filters,
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
  });
}

/**
 * Hook to fetch a single job by ID
 */
export function useJob(id: string) {
  return useQuery({
    queryKey: queryKeys.jobs.detail(id),
    queryFn: async () => {
      const token = localStorage.getItem('access_token');
      const response = await axios.get<{ data: Job }>(`${API_BASE_URL}/jobs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch saved jobs
 */
export function useSavedJobs() {
  return useQuery({
    queryKey: queryKeys.jobs.saved(),
    queryFn: async () => {
      const token = localStorage.getItem('access_token');
      const response = await axios.get<{ data: Job[] }>(`${API_BASE_URL}/jobs/saved`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data;
    },
  });
}

/**
 * Hook to get job recommendations
 */
export function useJobRecommendations(userId: string) {
  return useQuery({
    queryKey: queryKeys.jobs.recommendations(userId),
    queryFn: async () => {
      const token = localStorage.getItem('access_token');
      const response = await axios.get<{ data: Job[] }>(
        `${API_BASE_URL}/jobs/recommendations`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.data;
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 15, // 15 minutes - recommendations change less frequently
  });
}

/**
 * Hook to get match score between job and resume
 */
export function useJobMatchScore(jobId: string, resumeId: string) {
  return useQuery({
    queryKey: queryKeys.jobs.matchScore(jobId, resumeId),
    queryFn: async () => {
      const token = localStorage.getItem('access_token');
      const response = await axios.get<{ data: { score: number; reasons: string[] } }>(
        `${API_BASE_URL}/jobs/${jobId}/match/${resumeId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.data;
    },
    enabled: !!jobId && !!resumeId,
    staleTime: 1000 * 60 * 30, // 30 minutes - match scores don't change often
  });
}

/**
 * Hook to save/unsave a job
 */
export function useToggleSaveJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, save }: { jobId: string; save: boolean }) => {
      const token = localStorage.getItem('access_token');
      const endpoint = save ? 'save' : 'unsave';
      await axios.post(
        `${API_BASE_URL}/jobs/${jobId}/${endpoint}`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    },
    onSuccess: (_, variables) => {
      cacheInvalidation.invalidateJobs(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.saved() });
      toast.success(variables.save ? 'Job saved' : 'Job removed from saved');
    },
  });
}
