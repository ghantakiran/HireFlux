/**
 * Limit Warning Banner Component (Issue #64)
 * Displays warning banner when approaching or at usage limits
 */

'use client';

import React from 'react';

export interface LimitWarningProps {
  resource: 'jobs' | 'candidate_views' | 'team_members';
  resourceLabel: string;
  percentage: number;
  message: string;
  onUpgrade?: () => void;
  onDismiss?: () => void;
  'data-testid'?: string;
}

export function LimitWarning({
  resource,
  resourceLabel,
  percentage,
  message,
  onUpgrade,
  onDismiss,
  'data-testid': dataTestId
}: LimitWarningProps) {
  // Determine severity based on percentage
  const severity = percentage >= 100 ? 'error' : percentage >= 80 ? 'warning' : 'info';

  const severityStyles = {
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'text-red-500',
      text: 'text-red-800',
      button: 'bg-red-600 hover:bg-red-700 text-white'
    },
    warning: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: 'text-orange-500',
      text: 'text-orange-800',
      button: 'bg-orange-600 hover:bg-orange-700 text-white'
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'text-blue-500',
      text: 'text-blue-800',
      button: 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  };

  const styles = severityStyles[severity];

  return (
    <div
      className={`flex items-start gap-3 p-4 ${styles.bg} border ${styles.border} rounded-lg`}
      role="alert"
      data-testid={dataTestId}
    >
      {/* Icon */}
      <div className="flex-shrink-0">
        {severity === 'error' && (
          <svg className={`w-5 h-5 ${styles.icon}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )}
        {severity === 'warning' && (
          <svg className={`w-5 h-5 ${styles.icon}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )}
        {severity === 'info' && (
          <svg className={`w-5 h-5 ${styles.icon}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3
          className={`text-sm font-semibold ${styles.text} mb-1`}
          data-testid={`${dataTestId}-title`}
        >
          {severity === 'error' && `${resourceLabel} Limit Reached`}
          {severity === 'warning' && `Approaching ${resourceLabel} Limit`}
          {severity === 'info' && `${resourceLabel} Usage Notice`}
        </h3>
        <p
          className={`text-sm ${styles.text}`}
          data-testid={`${dataTestId}-message`}
        >
          {message}
        </p>
        {onUpgrade && (
          <button
            onClick={onUpgrade}
            className={`mt-3 px-4 py-2 text-sm font-medium rounded-md transition-colors ${styles.button}`}
            data-testid={`${dataTestId}-upgrade-button`}
          >
            {severity === 'error' ? 'Upgrade Now' : 'View Upgrade Options'}
          </button>
        )}
      </div>

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={onDismiss}
          className={`flex-shrink-0 ${styles.text} hover:opacity-70 transition-opacity`}
          aria-label="Dismiss"
          data-testid={`${dataTestId}-dismiss`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}
