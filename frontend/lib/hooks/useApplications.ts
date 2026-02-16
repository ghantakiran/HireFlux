/**
 * Applications React Query Hooks
 *
 * Custom hooks for application-related API calls with React Query.
 * Provides automatic caching, refetching, and state management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheInvalidation } from '../react-query';
import { createAuthAxios } from '../api-client';
import { toast } from 'sonner';

export interface Application {
  id: string;
  user_id: string;
  job_id: string;
  resume_id: string;
  cover_letter_id?: string;
  status: 'applied' | 'screening' | 'interview' | 'offer' | 'rejected' | 'accepted' | 'withdrawn';
  applied_at: string;
  updated_at: string;
  notes?: string;
  job?: {
    title: string;
    company: string;
    location: string;
  };
}

export interface ApplicationStats {
  total: number;
  applied: number;
  screening: number;
  interview: number;
  offer: number;
  rejected: number;
}

export interface ApplicationFilters {
  status?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}

/**
 * Hook to fetch list of applications with filters
 */
export function useApplications(filters?: ApplicationFilters) {
  return useQuery({
    queryKey: queryKeys.applications.list(filters),
    queryFn: async () => {
      const response = await createAuthAxios().get<{ data: Application[] }>(
        '/applications',
        {
          params: filters,
        }
      );
      return response.data.data;
    },
  });
}

/**
 * Hook to fetch a single application by ID
 */
export function useApplication(id: string) {
  return useQuery({
    queryKey: queryKeys.applications.detail(id),
    queryFn: async () => {
      const response = await createAuthAxios().get<{ data: Application }>(
        `/applications/${id}`,
      );
      return response.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch application statistics
 */
export function useApplicationStats() {
  return useQuery({
    queryKey: queryKeys.applications.stats(),
    queryFn: async () => {
      const response = await createAuthAxios().get<{ data: ApplicationStats }>(
        '/applications/stats',
      );
      return response.data.data;
    },
    staleTime: 1000 * 60 * 2, // 2 minutes - stats change frequently
  });
}

/**
 * Hook to fetch application timeline/history
 */
export function useApplicationTimeline(applicationId: string) {
  return useQuery({
    queryKey: queryKeys.applications.timeline(applicationId),
    queryFn: async () => {
      const response = await createAuthAxios().get<{
        data: Array<{ event: string; timestamp: string; note?: string }>;
      }>(`/applications/${applicationId}/timeline`);
      return response.data.data;
    },
    enabled: !!applicationId,
  });
}

/**
 * Hook to create a new application
 */
export function useCreateApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      job_id: string;
      resume_id: string;
      cover_letter_id?: string;
    }) => {
      const response = await createAuthAxios().post<{ data: Application }>(
        '/applications',
        data,
      );
      return response.data.data;
    },
    onSuccess: () => {
      cacheInvalidation.invalidateApplications(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.stats() });
      toast.success('Application submitted successfully');
    },
  });
}

/**
 * Hook to update application status
 */
export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: string;
      status: Application['status'];
      note?: string;
    }) => {
      const response = await createAuthAxios().patch<{ data: Application }>(
        `/applications/${id}/status`,
        { status, note },
      );
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.detail(variables.id) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.applications.timeline(variables.id),
      });
      cacheInvalidation.invalidateApplications(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.stats() });
      toast.success('Application status updated');
    },
  });
}

/**
 * Hook to add note to application
 */
export function useAddApplicationNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      await createAuthAxios().post(
        `/applications/${id}/notes`,
        { note },
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.detail(variables.id) });
      queryClient.invalidateQueries({
        queryKey: queryKeys.applications.timeline(variables.id),
      });
      toast.success('Note added successfully');
    },
  });
}

/**
 * Hook to delete an application
 */
export function useDeleteApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await createAuthAxios().delete(`/applications/${id}`);
    },
    onSuccess: () => {
      cacheInvalidation.invalidateApplications(queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.applications.stats() });
      toast.success('Application deleted successfully');
    },
  });
}
