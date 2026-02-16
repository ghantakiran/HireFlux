/**
 * Resume React Query Hooks
 *
 * Custom hooks for resume-related API calls with React Query.
 * Provides automatic caching, refetching, and state management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheInvalidation } from '../react-query';
import { createAuthAxios } from '../api-client';
import { toast } from 'sonner';

// Types
export interface Resume {
  id: string;
  user_id: string;
  title: string;
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ResumeFilters {
  search?: string;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}

/**
 * Hook to fetch list of resumes
 *
 * @param filters - Optional filters for resume list
 * @returns Query result with resumes data
 */
export function useResumes(filters?: ResumeFilters) {
  return useQuery({
    queryKey: queryKeys.resumes.list(filters),
    queryFn: async () => {
      const response = await createAuthAxios().get<{ data: Resume[] }>('/resumes', {
        params: filters,
      });
      return response.data.data;
    },
  });
}

/**
 * Hook to fetch a single resume by ID
 *
 * @param id - Resume ID
 * @returns Query result with resume data
 */
export function useResume(id: string) {
  return useQuery({
    queryKey: queryKeys.resumes.detail(id),
    queryFn: async () => {
      const response = await createAuthAxios().get<{ data: Resume }>(`/resumes/${id}`);
      return response.data.data;
    },
    enabled: !!id, // Only run query if id is provided
  });
}

/**
 * Hook to create a new resume
 *
 * @returns Mutation result with create function
 */
export function useCreateResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<Resume>) => {
      const response = await createAuthAxios().post<{ data: Resume }>('/resumes', data);
      return response.data.data;
    },
    onSuccess: (data) => {
      // Invalidate resume list to refetch with new data
      cacheInvalidation.invalidateResumes(queryClient);
      toast.success('Resume created successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to create resume';
      toast.error(message);
    },
  });
}

/**
 * Hook to update an existing resume
 *
 * @returns Mutation result with update function
 */
export function useUpdateResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Resume> }) => {
      const response = await createAuthAxios().put<{ data: Resume }>(
        `/resumes/${id}`,
        data
      );
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate specific resume and list
      queryClient.invalidateQueries({ queryKey: queryKeys.resumes.detail(variables.id) });
      cacheInvalidation.invalidateResumes(queryClient);
      toast.success('Resume updated successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to update resume';
      toast.error(message);
    },
  });
}

/**
 * Hook to delete a resume
 *
 * @returns Mutation result with delete function
 */
export function useDeleteResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await createAuthAxios().delete(`/resumes/${id}`);
    },
    onSuccess: () => {
      // Invalidate resume list
      cacheInvalidation.invalidateResumes(queryClient);
      toast.success('Resume deleted successfully');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to delete resume';
      toast.error(message);
    },
  });
}
