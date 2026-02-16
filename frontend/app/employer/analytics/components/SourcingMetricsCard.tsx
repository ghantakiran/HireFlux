'use client';

/**
 * Sourcing Metrics Card Component
 * Sprint 15-16: Advanced Analytics & Reporting
 */

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { SourcingMetrics } from '@/lib/hooks/useEmployerAnalytics';

interface SourcingMetricsCardProps {
  data: SourcingMetrics;
  isLoading?: boolean;
}

const SOURCE_COLORS: Record<string, string> = {
  auto_apply: '#3B82F6',
  manual: '#8B5CF6',
  referral: '#10B981',
  job_board: '#F59E0B',
  career_site: '#EC4899',
};

const SOURCE_LABELS: Record<string, string> = {
  auto_apply: 'Auto Apply',
  manual: 'Manual',
  referral: 'Referral',
  job_board: 'Job Board',
  career_site: 'Career Site',
};

export function SourcingMetricsCard({ data, isLoading }: SourcingMetricsCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!data.sources || data.sources.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Sourcing Metrics</h3>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No sourcing data available</p>
        </div>
      </div>
    );
  }

  const chartData = data.sources.map((source) => ({
    name: SOURCE_LABELS[source.source] || source.source,
    value: source.count,
    source: source.source,
  }));

  // Find best performing source
  const bestSource = data.sources.reduce((best, current) =>
    current.conversion_rate > best.conversion_rate ? current : best
  );

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6" data-testid="sourcing-metrics-card">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Application Sources</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {data.total_applications} total applications from {data.sources.length} sources
        </p>
      </div>

      {/* Pie Chart */}
      <div style={{ width: '100%', height: 250 }}>
        <ResponsiveContainer>
          <PieChart aria-label="Application sources pie chart">
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={SOURCE_COLORS[entry.source] || '#6B7280'} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Source Breakdown */}
      <div className="mt-6 space-y-3">
        {data.sources.map((source) => (
          <div
            key={source.source}
            className={`p-4 rounded-lg border-2 transition-all ${
              source.source === bestSource.source
                ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'
            }`}
            data-testid={`source-${source.source}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: SOURCE_COLORS[source.source] }}
                ></div>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {SOURCE_LABELS[source.source] || source.source}
                </span>
                {source.source === bestSource.source && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                    Best
                  </span>
                )}
              </div>
              <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{source.count}</span>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Fit Index</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{source.avg_fit_index.toFixed(1)}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Hires</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{source.hires}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Conversion</p>
                <p className="font-semibold text-green-600 dark:text-green-400">
                  {(source.conversion_rate * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Applications</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.total_applications}</p>
          </div>
          <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Hires</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data.total_hires}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
