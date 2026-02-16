'use client';

/**
 * Pipeline Funnel Chart Component
 * Sprint 15-16: Advanced Analytics & Reporting
 */

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { PipelineFunnel } from '@/lib/hooks/useEmployerAnalytics';

interface PipelineFunnelChartProps {
  data: PipelineFunnel;
  isLoading?: boolean;
  onStageClick?: (stage: string) => void;
}

import { STAGE_LABELS, STAGE_COLORS } from '@/lib/constants/employer-stages';

export function PipelineFunnelChart({ data, isLoading, onStageClick }: PipelineFunnelChartProps) {
  const [selectedStage, setSelectedStage] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4 animate-pulse"></div>
        <div className="h-96 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"></div>
      </div>
    );
  }

  if (!data.stages || data.stages.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Pipeline Funnel</h3>
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">No pipeline data available</p>
        </div>
      </div>
    );
  }

  const chartData = data.stages
    .filter((stage) => stage.stage !== 'rejected') // Exclude rejected from main funnel
    .map((stage) => ({
      stage: STAGE_LABELS[stage.stage] || stage.stage,
      count: stage.count,
      avgDays: stage.avg_days_in_stage,
      dropOffRate: stage.drop_off_rate ? (stage.drop_off_rate * 100).toFixed(1) : null,
      stageKey: stage.stage,
    }));

  const handleBarClick = (entry: any) => {
    setSelectedStage(entry.stageKey);
    if (onStageClick) {
      onStageClick(entry.stageKey);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Pipeline Funnel</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Overall conversion rate: {(data.overall_conversion_rate * 100).toFixed(1)}%
          </p>
        </div>
        {data.job_id && (
          <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
            Filtered by Job
          </span>
        )}
      </div>

      {/* Chart */}
      <div data-testid="pipeline-funnel-chart" style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            aria-label="Pipeline funnel chart"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="stage"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fill: '#6B7280', fontSize: 12 }}
            />
            <YAxis tick={{ fill: '#6B7280', fontSize: 12 }} label={{ value: 'Candidates', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{data.stage}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Count:</span> {data.count}
                      </p>
                      {data.avgDays !== null && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Avg days:</span> {data.avgDays.toFixed(1)}
                        </p>
                      )}
                      {data.dropOffRate && (
                        <p className="text-sm text-red-600">
                          <span className="font-medium">Drop-off:</span> {data.dropOffRate}%
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend />
            <Bar
              dataKey="count"
              name="Candidates"
              cursor="pointer"
              onClick={handleBarClick}
              aria-label="Funnel stage bar"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={STAGE_COLORS[entry.stageKey] || '#6B7280'}
                  opacity={selectedStage && selectedStage !== entry.stageKey ? 0.5 : 1}
                  data-testid={`funnel-stage-${entry.stageKey}`}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Stage Details Grid */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {data.stages
          .filter((stage) => stage.stage !== 'rejected')
          .map((stage) => (
            <div
              key={stage.stage}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                selectedStage === stage.stage
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => handleBarClick({ stageKey: stage.stage })}
              data-testid={`stage-card-${stage.stage}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                  {STAGE_LABELS[stage.stage]}
                </span>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: STAGE_COLORS[stage.stage] }}
                ></div>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stage.count}</p>
              {stage.avg_days_in_stage !== null && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {stage.avg_days_in_stage.toFixed(1)} days avg
                </p>
              )}
              {stage.drop_off_rate !== null && (
                <p className="text-xs text-red-600 mt-1">
                  {(stage.drop_off_rate * 100).toFixed(0)}% drop-off
                </p>
              )}
            </div>
          ))}
      </div>

      {/* Rejected Summary */}
      {data.stages.find((s) => s.stage === 'rejected') && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-900">Rejected Candidates</p>
              <p className="text-xs text-red-700 mt-1">Throughout the pipeline</p>
            </div>
            <p className="text-3xl font-bold text-red-600">
              {data.stages.find((s) => s.stage === 'rejected')?.count || 0}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
