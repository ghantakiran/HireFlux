'use client';

/**
 * Analytics Empty State Component
 * Sprint 15-16: Advanced Analytics & Reporting
 */

import React from 'react';

interface AnalyticsEmptyStateProps {
  onCreateJob?: () => void;
}

export function AnalyticsEmptyState({ onCreateJob }: AnalyticsEmptyStateProps) {
  return (
    <div
      className="flex flex-col items-center justify-center py-16 px-4"
      data-testid="analytics-empty-state"
    >
      {/* Icon */}
      <div className="mb-6">
        <svg
          className="w-24 h-24 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      </div>

      {/* Content */}
      <div className="text-center max-w-md">
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No Analytics Data Yet</h3>
        <p className="text-gray-600 mb-6">
          Start posting jobs and receiving applications to see your analytics dashboard come to
          life. Track your hiring pipeline, measure time-to-hire, and optimize your recruitment
          process.
        </p>
      </div>

      {/* Call to Action */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={onCreateJob}
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg
            className="-ml-1 mr-2 h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Post Your First Job
        </button>
        <a
          href="/employer/jobs"
          className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          View Existing Jobs
        </a>
      </div>

      {/* Info Cards */}
      <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
        <div className="text-center p-4 bg-blue-50 rounded-lg">
          <div className="text-3xl font-bold text-blue-600 mb-1">📊</div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Pipeline Funnel</h4>
          <p className="text-xs text-gray-600">
            Track candidates through each stage of your hiring process
          </p>
        </div>
        <div className="text-center p-4 bg-green-50 rounded-lg">
          <div className="text-3xl font-bold text-green-600 mb-1">⏱️</div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Time Metrics</h4>
          <p className="text-xs text-gray-600">Measure and optimize your time-to-hire</p>
        </div>
        <div className="text-center p-4 bg-purple-50 rounded-lg">
          <div className="text-3xl font-bold text-purple-600 mb-1">💰</div>
          <h4 className="text-sm font-semibold text-gray-900 mb-1">Cost Analysis</h4>
          <p className="text-xs text-gray-600">Understand your cost per hire and ROI</p>
        </div>
      </div>
    </div>
  );
}
