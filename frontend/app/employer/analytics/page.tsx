'use client';

/**
 * Employer Analytics Dashboard Page
 * Sprint 15-16: Advanced Analytics & Reporting
 *
 * Performance Optimization (Issue #144):
 * - Lazy load recharts components for better bundle size
 * - Charts are deferred until below-the-fold or user scrolls
 */

import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import {
  useAnalyticsOverview,
  usePipelineFunnel,
  useSourcingMetrics,
  useTimeMetrics,
  useQualityMetrics,
  useCostMetrics,
} from '@/lib/hooks/useEmployerAnalytics';

// Regular components (lightweight)
import { DateRangePicker } from './components/DateRangePicker';
import { AnalyticsOverview } from './components/AnalyticsOverview';
import { QualityMetricsGrid } from './components/QualityMetricsGrid';
import { ExportReportButton } from './components/ExportReportButton';
import { AnalyticsEmptyState } from './components/AnalyticsEmptyState';

// Lazy load heavy chart components (recharts library ~100KB)
// Using dynamic import to defer loading until needed
import dynamic from 'next/dynamic';

const StageDetailsModal = dynamic(
  () => import('./components/StageDetailsModal').then(mod => ({ default: mod.StageDetailsModal })),
  { ssr: false }
);

const PipelineFunnelChart = dynamic(
  () => import('./components/PipelineFunnelChart').then(mod => ({ default: mod.PipelineFunnelChart })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
      </div>
    ),
  }
);

const SourcingMetricsCard = dynamic(
  () => import('./components/SourcingMetricsCard').then(mod => ({ default: mod.SourcingMetricsCard })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
      </div>
    ),
  }
);

const TimeToHireChart = dynamic(
  () => import('./components/TimeToHireChart').then(mod => ({ default: mod.TimeToHireChart })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
      </div>
    ),
  }
);

const CostMetricsCard = dynamic(
  () => import('./components/CostMetricsCard').then(mod => ({ default: mod.CostMetricsCard })),
  {
    ssr: false,
    loading: () => (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
      </div>
    ),
  }
);

// TODO: These will come from auth context in production
const MOCK_COMPANY_ID = '550e8400-e29b-41d4-a716-446655440000';
const MOCK_USER_ROLE = 'admin'; // owner, admin, hiring_manager, recruiter, interviewer, viewer
const MOCK_COMPANY_PLAN: 'starter' | 'growth' | 'professional' | 'enterprise' = 'growth';

export default function AnalyticsPage() {
  // Set page metadata
  useEffect(() => {
    document.title = 'Analytics | HireFlux';
  }, []);

  // Date range state (default to last 30 days)
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  // Stage modal state
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch all analytics data
  const overviewQuery = useAnalyticsOverview(
    MOCK_COMPANY_ID,
    dateRange.startDate,
    dateRange.endDate
  );
  const funnelQuery = usePipelineFunnel(MOCK_COMPANY_ID);
  const sourcingQuery = useSourcingMetrics(
    MOCK_COMPANY_ID,
    dateRange.startDate,
    dateRange.endDate
  );
  const timeQuery = useTimeMetrics(MOCK_COMPANY_ID, dateRange.startDate, dateRange.endDate);
  const qualityQuery = useQualityMetrics(MOCK_COMPANY_ID);
  const costQuery = useCostMetrics(MOCK_COMPANY_ID, dateRange.startDate, dateRange.endDate);

  // Check if user has access to analytics (Growth+ plan)
  if (MOCK_COMPANY_PLAN === 'starter') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div
            className="bg-white rounded-lg shadow p-8 text-center"
            data-testid="upgrade-prompt"
          >
            <svg
              className="mx-auto h-16 w-16 text-gray-300 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Upgrade to Access Analytics
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Analytics is available on Growth and Professional plans. Upgrade to unlock insights
              into your hiring pipeline, time-to-hire metrics, and more.
            </p>
            <button className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Upgrade to Growth Plan
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handle date range change
  const handleDateRangeChange = (startDate: string, endDate: string) => {
    setDateRange({ startDate, endDate });
  };

  // Handle stage click (open modal)
  const handleStageClick = (stage: string) => {
    setSelectedStage(stage);
    setIsModalOpen(true);
  };

  // Handle export
  const handleExport = async (format: 'pdf' | 'csv') => {
    // API call would go here
  };

  // Check if data is empty
  const isEmpty = overviewQuery.data?.total_applications === 0;

  // Loading skeleton for initial load
  if (
    overviewQuery.isLoading ||
    funnelQuery.isLoading ||
    sourcingQuery.isLoading ||
    timeQuery.isLoading ||
    qualityQuery.isLoading
  ) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header skeleton */}
          <div className="h-12 bg-white dark:bg-gray-900 rounded-lg shadow animate-pulse"></div>
          {/* Content skeletons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-white dark:bg-gray-900 rounded-lg shadow animate-pulse"></div>
            <div className="h-96 bg-white dark:bg-gray-900 rounded-lg shadow animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (overviewQuery.isError) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 text-center">
            <p className="text-red-800 dark:text-red-300 font-medium">Failed to load analytics data</p>
            <button
              onClick={() => overviewQuery.refetch()}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (isEmpty) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <AnalyticsEmptyState onCreateJob={() => (window.location.href = '/employer/jobs/new')} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Analytics Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track your hiring performance and optimize your recruitment process
            </p>
          </div>
          <ExportReportButton
            companyId={MOCK_COMPANY_ID}
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onExport={handleExport}
          />
        </div>

        {/* Date Range Picker */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>

        {/* Analytics Overview */}
        {overviewQuery.data && (
          <AnalyticsOverview data={overviewQuery.data} isLoading={overviewQuery.isLoading} />
        )}

        {/* Pipeline Funnel & Sourcing Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {funnelQuery.data && (
            <PipelineFunnelChart
              data={funnelQuery.data}
              isLoading={funnelQuery.isLoading}
              onStageClick={handleStageClick}
            />
          )}
          {sourcingQuery.data && (
            <SourcingMetricsCard data={sourcingQuery.data} isLoading={sourcingQuery.isLoading} />
          )}
        </div>

        {/* Time Metrics */}
        {timeQuery.data && (
          <TimeToHireChart data={timeQuery.data} isLoading={timeQuery.isLoading} />
        )}

        {/* Quality Metrics */}
        {qualityQuery.data && (
          <QualityMetricsGrid data={qualityQuery.data} isLoading={qualityQuery.isLoading} />
        )}

        {/* Cost Metrics (Owner/Admin only) */}
        {costQuery.data && (
          <CostMetricsCard
            data={costQuery.data}
            isLoading={costQuery.isLoading}
            userRole={MOCK_USER_ROLE}
          />
        )}

        {/* Stage Details Modal */}
        {funnelQuery.data && (
          <StageDetailsModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            stage={selectedStage}
            stageData={
              funnelQuery.data?.stages.find((s) => s.stage === selectedStage) || undefined
            }
          />
        )}
      </div>
    </div>
  );
}
