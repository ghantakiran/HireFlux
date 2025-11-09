'use client';

/**
 * Quality Metrics Grid Component
 * Sprint 15-16: Advanced Analytics & Reporting
 */

import React from 'react';
import { QualityMetrics } from '@/lib/hooks/useEmployerAnalytics';

interface QualityMetricsGridProps {
  data: QualityMetrics;
  isLoading?: boolean;
}

export function QualityMetricsGrid({ data, isLoading }: QualityMetricsGridProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 bg-gray-100 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  const metrics = [
    {
      label: 'Average Fit Index',
      value: data.avg_fit_index,
      max: 100,
      format: (val: number) => val.toFixed(1),
      color: 'blue',
      testId: 'quality-fit-index',
      description: 'AI-calculated match score',
    },
    {
      label: 'Interview Show-Up Rate',
      value: data.interview_show_up_rate * 100,
      max: 100,
      format: (val: number) => `${val.toFixed(1)}%`,
      color: 'green',
      testId: 'quality-show-up-rate',
      description: 'Candidates attending scheduled interviews',
    },
    {
      label: 'Offer Acceptance Rate',
      value: data.offer_acceptance_rate * 100,
      max: 100,
      format: (val: number) => `${val.toFixed(1)}%`,
      color: 'purple',
      testId: 'quality-offer-acceptance',
      description: 'Offers accepted by candidates',
    },
    {
      label: '6-Month Retention',
      value: data.six_month_retention_rate * 100,
      max: 100,
      format: (val: number) => `${val.toFixed(1)}%`,
      color: 'orange',
      testId: 'quality-6mo-retention',
      description: 'Employees retained for 6+ months',
    },
    {
      label: '12-Month Retention',
      value: data.twelve_month_retention_rate * 100,
      max: 100,
      format: (val: number) => `${val.toFixed(1)}%`,
      color: 'teal',
      testId: 'quality-12mo-retention',
      description: 'Employees retained for 12+ months',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; bar: string; text: string }> = {
      blue: { bg: 'bg-blue-50', bar: 'bg-blue-600', text: 'text-blue-600' },
      green: { bg: 'bg-green-50', bar: 'bg-green-600', text: 'text-green-600' },
      purple: { bg: 'bg-purple-50', bar: 'bg-purple-600', text: 'text-purple-600' },
      orange: { bg: 'bg-orange-50', bar: 'bg-orange-600', text: 'text-orange-600' },
      teal: { bg: 'bg-teal-50', bar: 'bg-teal-600', text: 'text-teal-600' },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid="quality-metrics-grid">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Quality of Hire Metrics</h3>
        <p className="text-sm text-gray-600 mt-1">
          Measures of candidate quality and hiring success
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric) => {
          const colorClasses = getColorClasses(metric.color);
          const percentage = (metric.value / metric.max) * 100;

          return (
            <div
              key={metric.testId}
              data-testid={metric.testId}
              className={`p-5 rounded-lg border-2 border-gray-200 ${colorClasses.bg} hover:shadow-md transition-all`}
            >
              {/* Metric Header */}
              <div className="mb-3">
                <h4 className="text-sm font-semibold text-gray-900 mb-1">{metric.label}</h4>
                <p className="text-xs text-gray-600">{metric.description}</p>
              </div>

              {/* Value Display */}
              <div className="mb-3">
                <p className={`text-3xl font-bold ${colorClasses.text}`} aria-label={metric.label}>
                  {metric.format(metric.value)}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`${colorClasses.bar} h-2.5 rounded-full transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                  role="progressbar"
                  aria-valuenow={metric.value}
                  aria-valuemin={0}
                  aria-valuemax={metric.max}
                  aria-label={`${metric.label} progress bar`}
                ></div>
              </div>

              {/* Benchmark Indicator */}
              <div className="mt-2 text-xs">
                {percentage >= 80 && (
                  <span className="text-green-600 font-medium">✓ Excellent</span>
                )}
                {percentage >= 60 && percentage < 80 && (
                  <span className="text-orange-600 font-medium">→ Good</span>
                )}
                {percentage < 60 && (
                  <span className="text-red-600 font-medium">↓ Needs Improvement</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall Quality Score */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-100 mb-1">Overall Quality Score</p>
              <p className="text-4xl font-bold">
                {(
                  (data.avg_fit_index +
                    data.interview_show_up_rate * 100 +
                    data.offer_acceptance_rate * 100 +
                    data.six_month_retention_rate * 100 +
                    data.twelve_month_retention_rate * 100) /
                  5
                ).toFixed(1)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-100">Average across all metrics</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
