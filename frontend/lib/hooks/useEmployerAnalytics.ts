/**
 * React Query hooks for Employer Analytics API
 * Sprint 15-16: Advanced Analytics & Reporting
 */

import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { employerAnalyticsApi } from '../api';

// Type definitions matching backend Pydantic schemas
export interface AnalyticsOverview {
  company_id: string;
  start_date: string;
  end_date: string;
  total_applications: number;
  total_hires: number;
  avg_time_to_hire: number;
  avg_cost_per_hire: string;
  avg_fit_index: number;
  top_performing_jobs: Array<{
    job_id: string;
    title: string;
    conversion_rate: number;
    applications: number;
    hires: number;
  }>;
  pipeline_conversion: {
    new_to_reviewing: number;
    reviewing_to_phone_screen: number;
    phone_screen_to_technical: number;
    technical_to_hired: number;
  };
}

export interface PipelineFunnel {
  company_id: string;
  job_id: string | null;
  stages: Array<{
    stage: string;
    count: number;
    avg_days_in_stage: number | null;
    drop_off_rate: number | null;
  }>;
  overall_conversion_rate: number;
}

export interface SourcingMetrics {
  company_id: string;
  start_date: string;
  end_date: string;
  sources: Array<{
    source: string;
    count: number;
    avg_fit_index: number;
    hires: number;
    conversion_rate: number;
  }>;
  total_applications: number;
  total_hires: number;
}

export interface TimeMetrics {
  company_id: string;
  start_date: string;
  end_date: string;
  avg_time_to_first_application: number;
  avg_time_to_shortlist: number;
  avg_time_to_offer: number;
  avg_time_to_hire: number;
  target_time_to_hire: number;
  performance_vs_target: number;
}

export interface QualityMetrics {
  company_id: string;
  avg_fit_index: number;
  interview_show_up_rate: number;
  offer_acceptance_rate: number;
  six_month_retention_rate: number;
  twelve_month_retention_rate: number;
}

export interface CostMetrics {
  company_id: string;
  start_date: string;
  end_date: string;
  total_subscription_cost: string;
  total_applications: number;
  total_hires: number;
  cost_per_application: string;
  cost_per_hire: string;
  roi: string;
}

// Query keys for cache management
export const analyticsKeys = {
  all: ['employer-analytics'] as const,
  overview: (companyId: string, startDate?: string, endDate?: string) =>
    [...analyticsKeys.all, 'overview', companyId, startDate, endDate] as const,
  funnel: (companyId: string, jobId?: string) =>
    [...analyticsKeys.all, 'funnel', companyId, jobId] as const,
  sources: (companyId: string, startDate?: string, endDate?: string) =>
    [...analyticsKeys.all, 'sources', companyId, startDate, endDate] as const,
  timeMetrics: (companyId: string, startDate?: string, endDate?: string) =>
    [...analyticsKeys.all, 'time-metrics', companyId, startDate, endDate] as const,
  quality: (companyId: string) => [...analyticsKeys.all, 'quality', companyId] as const,
  costs: (companyId: string, startDate?: string, endDate?: string) =>
    [...analyticsKeys.all, 'costs', companyId, startDate, endDate] as const,
};

/**
 * Hook to fetch analytics overview with summary metrics
 */
export function useAnalyticsOverview(
  companyId: string,
  startDate?: string,
  endDate?: string,
  options?: UseQueryOptions<AnalyticsOverview>
) {
  return useQuery({
    queryKey: analyticsKeys.overview(companyId, startDate, endDate),
    queryFn: async () => {
      const response = await employerAnalyticsApi.getOverview(companyId, {
        start_date: startDate,
        end_date: endDate,
      });
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    refetchOnWindowFocus: true,
    retry: 3,
    enabled: !!companyId,
    ...options,
  });
}

/**
 * Hook to fetch pipeline funnel visualization data
 */
export function usePipelineFunnel(
  companyId: string,
  jobId?: string,
  options?: UseQueryOptions<PipelineFunnel>
) {
  return useQuery({
    queryKey: analyticsKeys.funnel(companyId, jobId),
    queryFn: async () => {
      const response = await employerAnalyticsApi.getFunnel(companyId, {
        job_id: jobId,
      });
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 3,
    enabled: !!companyId,
    ...options,
  });
}

/**
 * Hook to fetch sourcing metrics (application sources)
 */
export function useSourcingMetrics(
  companyId: string,
  startDate?: string,
  endDate?: string,
  options?: UseQueryOptions<SourcingMetrics>
) {
  return useQuery({
    queryKey: analyticsKeys.sources(companyId, startDate, endDate),
    queryFn: async () => {
      const response = await employerAnalyticsApi.getSources(companyId, {
        start_date: startDate,
        end_date: endDate,
      });
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 3,
    enabled: !!companyId,
    ...options,
  });
}

/**
 * Hook to fetch time metrics (time-to-hire, time-to-offer)
 */
export function useTimeMetrics(
  companyId: string,
  startDate?: string,
  endDate?: string,
  options?: UseQueryOptions<TimeMetrics>
) {
  return useQuery({
    queryKey: analyticsKeys.timeMetrics(companyId, startDate, endDate),
    queryFn: async () => {
      const response = await employerAnalyticsApi.getTimeMetrics(companyId, {
        start_date: startDate,
        end_date: endDate,
      });
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 3,
    enabled: !!companyId,
    ...options,
  });
}

/**
 * Hook to fetch quality metrics (fit index, retention)
 */
export function useQualityMetrics(
  companyId: string,
  options?: UseQueryOptions<QualityMetrics>
) {
  return useQuery({
    queryKey: analyticsKeys.quality(companyId),
    queryFn: async () => {
      const response = await employerAnalyticsApi.getQuality(companyId);
      return response.data.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes (quality metrics change less frequently)
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 3,
    enabled: !!companyId,
    ...options,
  });
}

/**
 * Hook to fetch cost metrics (owner/admin only)
 */
export function useCostMetrics(
  companyId: string,
  startDate?: string,
  endDate?: string,
  options?: UseQueryOptions<CostMetrics>
) {
  return useQuery({
    queryKey: analyticsKeys.costs(companyId, startDate, endDate),
    queryFn: async () => {
      const response = await employerAnalyticsApi.getCosts(companyId, {
        start_date: startDate,
        end_date: endDate,
      });
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 3,
    enabled: !!companyId,
    ...options,
  });
}
