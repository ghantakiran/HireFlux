/**
 * Cover Letters React Query Hooks
 *
 * Custom hooks for cover letter-related API calls with React Query.
 * Provides automatic caching, refetching, and state management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheInvalidation } from '../react-query';
import { createAuthAxios } from '../api-client';
import { toast } from 'sonner';
import { downloadBlob } from '@/lib/utils';

export interface CoverLetter {
  id: string;
  user_id: string;
  job_id: string;
  resume_id: string;
  content: string;
  tone: 'professional' | 'casual' | 'enthusiastic';
  created_at: string;
  updated_at: string;
  job?: {
    title: string;
    company: string;
  };
}

export interface GenerateCoverLetterRequest {
  job_id: string;
  resume_id: string;
  tone?: 'professional' | 'casual' | 'enthusiastic';
  custom_instructions?: string;
}

export interface CoverLetterFilters {
  search?: string;
  job_id?: string;
  limit?: number;
  offset?: number;
  [key: string]: unknown;
}

/**
 * Hook to fetch list of cover letters with filters
 */
export function useCoverLetters(filters?: CoverLetterFilters) {
  return useQuery({
    queryKey: queryKeys.coverLetters.list(filters),
    queryFn: async () => {
      const response = await createAuthAxios().get<{ data: CoverLetter[] }>(
        '/cover-letters',
        {
          params: filters,
        }
      );
      return response.data.data;
    },
  });
}

/**
 * Hook to fetch a single cover letter by ID
 */
export function useCoverLetter(id: string) {
  return useQuery({
    queryKey: queryKeys.coverLetters.detail(id),
    queryFn: async () => {
      const response = await createAuthAxios().get<{ data: CoverLetter }>(
        `/cover-letters/${id}`
      );
      return response.data.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook to generate a new cover letter using AI
 */
export function useGenerateCoverLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: GenerateCoverLetterRequest) => {
      const response = await createAuthAxios().post<{ data: CoverLetter }>(
        '/cover-letters/generate',
        data,
        {
          timeout: 60000, // 60 seconds - AI generation can take time
        }
      );
      return response.data.data;
    },
    onSuccess: () => {
      cacheInvalidation.invalidateCoverLetters(queryClient);
      toast.success('Cover letter generated successfully');
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : 'Failed to generate cover letter';
      toast.error(message);
    },
  });
}

/**
 * Hook to update an existing cover letter
 */
export function useUpdateCoverLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const response = await createAuthAxios().put<{ data: CoverLetter }>(
        `/cover-letters/${id}`,
        { content }
      );
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coverLetters.detail(variables.id) });
      cacheInvalidation.invalidateCoverLetters(queryClient);
      toast.success('Cover letter updated successfully');
    },
  });
}

/**
 * Hook to regenerate a cover letter with different settings
 */
export function useRegenerateCoverLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      tone,
      custom_instructions,
    }: {
      id: string;
      tone?: CoverLetter['tone'];
      custom_instructions?: string;
    }) => {
      const response = await createAuthAxios().post<{ data: CoverLetter }>(
        `/cover-letters/${id}/regenerate`,
        { tone, custom_instructions },
        {
          timeout: 60000,
        }
      );
      return response.data.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coverLetters.detail(variables.id) });
      cacheInvalidation.invalidateCoverLetters(queryClient);
      toast.success('Cover letter regenerated successfully');
    },
  });
}

/**
 * Hook to download cover letter as PDF or DOCX
 */
export function useDownloadCoverLetter() {
  return useMutation({
    mutationFn: async ({ id, format }: { id: string; format: 'pdf' | 'docx' }) => {
      const response = await createAuthAxios().get(
        `/cover-letters/${id}/download/${format}`,
        {
          responseType: 'blob',
        }
      );

      // Trigger download
      downloadBlob(new Blob([response.data]), `cover-letter.${format}`);
    },
    onSuccess: (_, variables) => {
      toast.success(`Cover letter downloaded as ${variables.format.toUpperCase()}`);
    },
  });
}

/**
 * Hook to delete a cover letter
 */
export function useDeleteCoverLetter() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await createAuthAxios().delete(`/cover-letters/${id}`);
    },
    onSuccess: () => {
      cacheInvalidation.invalidateCoverLetters(queryClient);
      toast.success('Cover letter deleted successfully');
    },
  });
}
