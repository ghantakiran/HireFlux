/**
 * Resume React Query Hooks
 *
 * Custom hooks for resume-related API calls with React Query.
 * Provides automatic caching, refetching, and state management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheInvalidation } from '../react-query';
import axios from 'axios';
import { toast } from 'sonner';

// API Base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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
      const token = localStorage.getItem('access_token');
      const response = await axios.get<{ data: Resume[] }>(`${API_BASE_URL}/resumes`, {
        params: filters,
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
      const token = localStorage.getItem('access_token');
      const response = await axios.get<{ data: Resume }>(`${API_BASE_URL}/resumes/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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
      const token = localStorage.getItem('access_token');
      const response = await axios.post<{ data: Resume }>(`${API_BASE_URL}/resumes`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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
      const token = localStorage.getItem('access_token');
      const response = await axios.put<{ data: Resume }>(
        `${API_BASE_URL}/resumes/${id}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
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
      const token = localStorage.getItem('access_token');
      await axios.delete(`${API_BASE_URL}/resumes/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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
