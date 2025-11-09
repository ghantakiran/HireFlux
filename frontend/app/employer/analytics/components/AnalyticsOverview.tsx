'use client';

/**
 * Analytics Overview Component - Summary Metrics Cards
 * Sprint 15-16: Advanced Analytics & Reporting
 */

import React from 'react';
import { AnalyticsOverview as AnalyticsOverviewType } from '@/lib/hooks/useEmployerAnalytics';

interface AnalyticsOverviewProps {
  data: AnalyticsOverviewType;
  isLoading?: boolean;
}

export function AnalyticsOverview({ data, isLoading }: AnalyticsOverviewProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const metrics = [
    {
      label: 'Total Applications',
      value: data.total_applications,
      testId: 'total-applications',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Total Hires',
      value: data.total_hires,
      testId: 'total-hires',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Avg Time to Hire',
      value: `${data.avg_time_to_hire.toFixed(1)} days`,
      testId: 'avg-time-to-hire',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Avg Cost per Hire',
      value: `$${parseFloat(data.avg_cost_per_hire).toFixed(2)}`,
      testId: 'avg-cost-per-hire',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  const conversionRate = data.total_hires / data.total_applications;

  return (
    <div className="space-y-6">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => (
          <div
            key={metric.testId}
            data-testid={metric.testId}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-600">{metric.label}</span>
              <div className={`w-2 h-2 rounded-full ${metric.bgColor}`}></div>
            </div>
            <div className={`text-3xl font-bold ${metric.color}`} aria-label={metric.label}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>

      {/* Fit Index Card */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Average Fit Index</h3>
          <span
            data-testid="avg-fit-index"
            className="text-3xl font-bold text-blue-600"
            aria-label="Average Fit Index"
          >
            {data.avg_fit_index.toFixed(1)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${data.avg_fit_index}%` }}
            role="progressbar"
            aria-valuenow={data.avg_fit_index}
            aria-valuemin={0}
            aria-valuemax={100}
          ></div>
        </div>
      </div>

      {/* Top Performing Jobs */}
      {data.top_performing_jobs && data.top_performing_jobs.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Jobs</h3>
          <div className="space-y-3" data-testid="top-performing-jobs">
            {data.top_performing_jobs.map((job) => (
              <div
                key={job.job_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{job.title}</p>
                  <p className="text-sm text-gray-600">
                    {job.applications} applications • {job.hires} hires
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-green-600">
                    {(job.conversion_rate * 100).toFixed(1)}%
                  </span>
                  <p className="text-xs text-gray-500">conversion</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pipeline Conversion Rates */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Conversion Rates</h3>
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          data-testid="pipeline-conversion-rates"
        >
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">New → Reviewing</p>
            <p className="text-2xl font-bold text-blue-600">
              {(data.pipeline_conversion.new_to_reviewing * 100).toFixed(0)}%
            </p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Reviewing → Phone</p>
            <p className="text-2xl font-bold text-purple-600">
              {(data.pipeline_conversion.reviewing_to_phone_screen * 100).toFixed(0)}%
            </p>
          </div>
          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Phone → Technical</p>
            <p className="text-2xl font-bold text-orange-600">
              {(data.pipeline_conversion.phone_screen_to_technical * 100).toFixed(0)}%
            </p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-2">Technical → Hired</p>
            <p className="text-2xl font-bold text-green-600">
              {(data.pipeline_conversion.technical_to_hired * 100).toFixed(0)}%
            </p>
          </div>
        </div>
      </div>

      {/* Overall Conversion */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-100 mb-1">Overall Conversion Rate</p>
            <p className="text-4xl font-bold">{(conversionRate * 100).toFixed(2)}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">
              {data.total_hires} hires from {data.total_applications} applications
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
