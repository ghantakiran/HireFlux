'use client';

/**
 * Time to Hire Chart Component
 * Sprint 15-16: Advanced Analytics & Reporting
 */

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TimeMetrics } from '@/lib/hooks/useEmployerAnalytics';

interface TimeToHireChartProps {
  data: TimeMetrics;
  isLoading?: boolean;
}

export function TimeToHireChart({ data, isLoading }: TimeToHireChartProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="h-80 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }

  const chartData = [
    {
      stage: 'First App',
      days: data.avg_time_to_first_application,
      label: 'Time to First Application',
    },
    {
      stage: 'Shortlist',
      days: data.avg_time_to_shortlist,
      label: 'Time to Shortlist',
    },
    {
      stage: 'Offer',
      days: data.avg_time_to_offer,
      label: 'Time to Offer',
    },
    {
      stage: 'Hire',
      days: data.avg_time_to_hire,
      label: 'Time to Hire',
    },
  ];

  const performanceIndicator =
    data.performance_vs_target < 0
      ? 'Ahead of target'
      : data.performance_vs_target > 0
      ? 'Behind target'
      : 'On target';

  const performanceColor =
    data.performance_vs_target < 0
      ? 'text-green-600'
      : data.performance_vs_target > 0
      ? 'text-red-600'
      : 'text-gray-600';

  return (
    <div className="bg-white rounded-lg shadow p-6" data-testid="time-to-hire-chart">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Time Metrics</h3>
            <p className="text-sm text-gray-600 mt-1">Average time in days for key milestones</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-600">vs Target</p>
            <p className={`text-2xl font-bold ${performanceColor}`}>
              {data.performance_vs_target > 0 ? '+' : ''}
              {data.performance_vs_target.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-500">{performanceIndicator}</p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            aria-label="Time to hire metrics chart"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="stage"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fill: '#6B7280', fontSize: 12 }}
            />
            <YAxis
              tick={{ fill: '#6B7280', fontSize: 12 }}
              label={{ value: 'Days', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
                      <p className="font-semibold text-gray-900 mb-2">{data.label}</p>
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Average:</span> {data.days.toFixed(1)} days
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <ReferenceLine
              y={data.target_time_to_hire}
              stroke="#EF4444"
              strokeDasharray="3 3"
              label={{ value: `Target: ${data.target_time_to_hire} days`, position: 'right' }}
            />
            <Bar dataKey="days" name="Days" fill="#3B82F6" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Detailed Metrics Grid */}
      <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">First Application</p>
          <p className="text-2xl font-bold text-blue-600">
            {data.avg_time_to_first_application.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500 mt-1">days</p>
        </div>
        <div className="p-4 bg-purple-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Shortlist</p>
          <p className="text-2xl font-bold text-purple-600">
            {data.avg_time_to_shortlist.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500 mt-1">days</p>
        </div>
        <div className="p-4 bg-orange-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Offer</p>
          <p className="text-2xl font-bold text-orange-600">
            {data.avg_time_to_offer.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500 mt-1">days</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-xs text-gray-600 mb-1">Hire</p>
          <p className="text-2xl font-bold text-green-600">
            {data.avg_time_to_hire.toFixed(1)}
          </p>
          <p className="text-xs text-gray-500 mt-1">days</p>
        </div>
      </div>

      {/* Target Comparison */}
      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-900">Target Time to Hire</p>
            <p className="text-xs text-gray-600 mt-1">Company goal</p>
          </div>
          <p className="text-3xl font-bold text-gray-900">{data.target_time_to_hire} days</p>
        </div>
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                data.avg_time_to_hire <= data.target_time_to_hire
                  ? 'bg-green-600'
                  : 'bg-red-600'
              }`}
              style={{
                width: `${Math.min((data.avg_time_to_hire / data.target_time_to_hire) * 100, 100)}%`,
              }}
              role="progressbar"
              aria-valuenow={data.avg_time_to_hire}
              aria-valuemin={0}
              aria-valuemax={data.target_time_to_hire}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
}
