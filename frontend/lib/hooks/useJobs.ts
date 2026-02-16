/**
 * Jobs React Query Hooks
 *
 * Custom hooks for job-related API calls with React Query.
 * Provides automatic caching, refetching, and state management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheInvalidation } from '../react-query';
import { createAuthAxios } from '../api-client';
import { toast } from 'sonner';

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
      const response = await createAuthAxios().get<{ data: Job[] }>('/jobs', {
        params: filters,
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
      const response = await createAuthAxios().get<{ data: Job }>(`/jobs/${id}`);
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
      const response = await createAuthAxios().get<{ data: Job[] }>('/jobs/saved');
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
      const response = await createAuthAxios().get<{ data: Job[] }>(
        '/jobs/recommendations'
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
      const response = await createAuthAxios().get<{ data: { score: number; reasons: string[] } }>(
        `/jobs/${jobId}/match/${resumeId}`
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
      const endpoint = save ? 'save' : 'unsave';
      await createAuthAxios().post(`/jobs/${jobId}/${endpoint}`, {});
    },
    onSuccess: (_, variables) => {
      cacheInvalidation.invalidateJobs(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.jobs.saved() });
      toast.success(variables.save ? 'Job saved' : 'Job removed from saved');
    },
  });
}
