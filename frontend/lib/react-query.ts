/**
 * React Query Configuration
 *
 * Centralized configuration for React Query (TanStack Query).
 * Provides caching, retry logic, and error handling.
 */

import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { captureException } from './sentry';

/**
 * Default query options
 */
const DEFAULT_STALE_TIME = 1000 * 60 * 5; // 5 minutes
const DEFAULT_GC_TIME = 1000 * 60 * 30; // 30 minutes (cache time)
const DEFAULT_RETRY = 3;

/**
 * Create a new QueryClient instance with default configuration
 *
 * @returns QueryClient instance
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache configuration
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_GC_TIME,

        // Retry configuration
        retry: DEFAULT_RETRY,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

        // Refetch configuration
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        refetchOnMount: true,

        // Error handling
        throwOnError: false,
      },
      mutations: {
        // Retry configuration for mutations
        retry: 1,
        retryDelay: 1000,

        // Error handling
        onError: (error) => {
          // Log error to Sentry
          captureException(error as Error, {
            context: 'mutation',
          });

          // Show error toast
          const errorMessage =
            error instanceof Error ? error.message : 'An error occurred';
          toast.error(errorMessage);
        },
      },
    },
  });
}

/**
 * Query key factory for consistent query key management
 */
export const queryKeys = {
  // Auth
  auth: {
    user: () => ['auth', 'user'] as const,
    session: () => ['auth', 'session'] as const,
  },

  // Resumes
  resumes: {
    all: () => ['resumes'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['resumes', 'list', filters] as const,
    detail: (id: string) => ['resumes', 'detail', id] as const,
    versions: (resumeId: string) => ['resumes', 'versions', resumeId] as const,
    atsScore: (resumeId: string) => ['resumes', 'ats-score', resumeId] as const,
  },

  // Jobs
  jobs: {
    all: () => ['jobs'] as const,
    list: (filters?: Record<string, unknown>) => ['jobs', 'list', filters] as const,
    detail: (id: string) => ['jobs', 'detail', id] as const,
    saved: () => ['jobs', 'saved'] as const,
    recommendations: (userId: string) =>
      ['jobs', 'recommendations', userId] as const,
    matchScore: (jobId: string, resumeId: string) =>
      ['jobs', 'match-score', jobId, resumeId] as const,
  },

  // Applications
  applications: {
    all: () => ['applications'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['applications', 'list', filters] as const,
    detail: (id: string) => ['applications', 'detail', id] as const,
    stats: () => ['applications', 'stats'] as const,
    timeline: (applicationId: string) =>
      ['applications', 'timeline', applicationId] as const,
  },

  // Cover Letters
  coverLetters: {
    all: () => ['cover-letters'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['cover-letters', 'list', filters] as const,
    detail: (id: string) => ['cover-letters', 'detail', id] as const,
  },

  // Billing
  billing: {
    subscription: () => ['billing', 'subscription'] as const,
    credits: () => ['billing', 'credits'] as const,
    usage: () => ['billing', 'usage'] as const,
    invoices: () => ['billing', 'invoices'] as const,
  },

  // Notifications
  notifications: {
    all: () => ['notifications'] as const,
    unread: () => ['notifications', 'unread'] as const,
    count: () => ['notifications', 'count'] as const,
  },
} as const;

/**
 * Cache invalidation helpers
 */
export const cacheInvalidation = {
  /**
   * Invalidate all resume-related queries
   */
  invalidateResumes: (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.resumes.all() });
  },

  /**
   * Invalidate all job-related queries
   */
  invalidateJobs: (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all() });
  },

  /**
   * Invalidate all application-related queries
   */
  invalidateApplications: (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.applications.all(),
    });
  },

  /**
   * Invalidate all cover letter-related queries
   */
  invalidateCoverLetters: (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.coverLetters.all(),
    });
  },

  /**
   * Invalidate all billing-related queries
   */
  invalidateBilling: (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({ queryKey: queryKeys.billing.subscription() });
  },

  /**
   * Invalidate all notification-related queries
   */
  invalidateNotifications: (queryClient: QueryClient) => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.notifications.all(),
    });
  },
};

/**
 * Prefetch helpers for optimistic UX
 */
export const prefetch = {
  /**
   * Prefetch resume detail
   */
  resumeDetail: async (queryClient: QueryClient, id: string, fetcher: () => Promise<unknown>) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.resumes.detail(id),
      queryFn: fetcher,
    });
  },

  /**
   * Prefetch job detail
   */
  jobDetail: async (queryClient: QueryClient, id: string, fetcher: () => Promise<unknown>) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.jobs.detail(id),
      queryFn: fetcher,
    });
  },

  /**
   * Prefetch application detail
   */
  applicationDetail: async (
    queryClient: QueryClient,
    id: string,
    fetcher: () => Promise<unknown>
  ) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.applications.detail(id),
      queryFn: fetcher,
    });
  },
};
