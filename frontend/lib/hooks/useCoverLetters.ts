/**
 * Cover Letters React Query Hooks
 *
 * Custom hooks for cover letter-related API calls with React Query.
 * Provides automatic caching, refetching, and state management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheInvalidation } from '../react-query';
import axios from 'axios';
import { toast } from 'sonner';
import { downloadBlob } from '@/lib/utils';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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
      const token = localStorage.getItem('access_token');
      const response = await axios.get<{ data: CoverLetter[] }>(
        `${API_BASE_URL}/cover-letters`,
        {
          params: filters,
          headers: { Authorization: `Bearer ${token}` },
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
      const token = localStorage.getItem('access_token');
      const response = await axios.get<{ data: CoverLetter }>(
        `${API_BASE_URL}/cover-letters/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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
      const token = localStorage.getItem('access_token');
      const response = await axios.post<{ data: CoverLetter }>(
        `${API_BASE_URL}/cover-letters/generate`,
        data,
        {
          headers: { Authorization: `Bearer ${token}` },
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
      const token = localStorage.getItem('access_token');
      const response = await axios.put<{ data: CoverLetter }>(
        `${API_BASE_URL}/cover-letters/${id}`,
        { content },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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
      const token = localStorage.getItem('access_token');
      const response = await axios.post<{ data: CoverLetter }>(
        `${API_BASE_URL}/cover-letters/${id}/regenerate`,
        { tone, custom_instructions },
        {
          headers: { Authorization: `Bearer ${token}` },
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
      const token = localStorage.getItem('access_token');
      const response = await axios.get(
        `${API_BASE_URL}/cover-letters/${id}/download/${format}`,
        {
          headers: { Authorization: `Bearer ${token}` },
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
      const token = localStorage.getItem('access_token');
      await axios.delete(`${API_BASE_URL}/cover-letters/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
    onSuccess: () => {
      cacheInvalidation.invalidateCoverLetters(queryClient);
      toast.success('Cover letter deleted successfully');
    },
  });
}
