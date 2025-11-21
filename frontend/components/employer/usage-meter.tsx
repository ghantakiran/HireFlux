/**
 * Usage Meter Component (Issue #64)
 * Displays resource usage with visual progress bars and warnings
 */

'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { ResourceUsage } from '@/lib/types/usage-limits';

export interface UsageMeterProps {
  resource: 'jobs' | 'candidate_views' | 'team_members';
  label: string;
  usage: ResourceUsage;
  onUpgrade?: () => void;
  'data-testid'?: string;
}

export function UsageMeter({
  resource,
  label,
  usage,
  onUpgrade,
  'data-testid': dataTestId
}: UsageMeterProps) {
  const { used, limit, remaining, unlimited, percentage } = usage;

  // Determine color based on percentage
  const getBarColor = () => {
    if (unlimited) return 'bg-green-500';
    if (percentage >= 100) return 'bg-red-600';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-blue-600';
  };

  // Determine status message
  const getStatusMessage = () => {
    if (unlimited) return 'Unlimited';
    if (percentage >= 100) return 'Limit reached';
    if (percentage >= 80) return 'Approaching limit';
    return `${remaining} remaining`;
  };

  // Determine warning level
  const getWarningLevel = () => {
    if (unlimited) return null;
    if (percentage >= 100) return 'error';
    if (percentage >= 80) return 'warning';
    return null;
  };

  const warningLevel = getWarningLevel();
  const statusMessage = getStatusMessage();

  return (
    <div
      className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm"
      data-testid={dataTestId}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-700">{label}</h3>
        <span
          className={`text-xs font-semibold px-2 py-1 rounded ${
            warningLevel === 'error'
              ? 'bg-red-100 text-red-700'
              : warningLevel === 'warning'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-gray-100 text-gray-600'
          }`}
          data-testid={`${dataTestId}-status`}
        >
          {statusMessage}
        </span>
      </div>

      {/* Usage Text */}
      <div className="flex items-baseline justify-between mb-3">
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold text-gray-900" data-testid={`${dataTestId}-used`}>
            {used}
          </span>
          {!unlimited && (
            <>
              <span className="text-sm text-gray-500">/</span>
              <span className="text-lg font-semibold text-gray-600" data-testid={`${dataTestId}-limit`}>
                {limit}
              </span>
            </>
          )}
        </div>
        {!unlimited && (
          <span className="text-sm font-medium text-gray-600" data-testid={`${dataTestId}-percentage`}>
            {percentage.toFixed(0)}%
          </span>
        )}
      </div>

      {/* Progress Bar */}
      {!unlimited && (
        <div className="mb-3">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-in-out ${getBarColor()}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
              role="progressbar"
              aria-valuenow={used}
              aria-valuemin={0}
              aria-valuemax={limit}
              data-testid={`${dataTestId}-bar`}
            />
          </div>
        </div>
      )}

      {/* Warning Messages & Upgrade CTA */}
      {warningLevel === 'error' && onUpgrade && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-800 mb-2">
            You've reached your {label.toLowerCase()} limit. Upgrade to continue.
          </p>
          <button
            onClick={onUpgrade}
            className="w-full px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 transition-colors"
            data-testid={`${dataTestId}-upgrade-button`}
          >
            Upgrade Plan
          </button>
        </div>
      )}

      {warningLevel === 'warning' && onUpgrade && (
        <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-md">
          <p className="text-sm text-orange-800 mb-2">
            You're at {percentage.toFixed(0)}% of your {label.toLowerCase()} limit.
          </p>
          <button
            onClick={onUpgrade}
            className="text-sm text-orange-700 font-medium hover:text-orange-900 underline"
            data-testid={`${dataTestId}-upgrade-link`}
          >
            Consider upgrading
          </button>
        </div>
      )}

      {unlimited && (
        <div className="mt-2 flex items-center gap-2 text-green-700">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-medium">Unlimited {label.toLowerCase()}</span>
        </div>
      )}
    </div>
  );
}
