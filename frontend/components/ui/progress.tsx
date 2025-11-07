/**
 * Progress Component
 * Progress bar for loading states and completion tracking
 */

'use client';

import * as React from 'react';

export interface ProgressProps {
  value?: number;
  max?: number;
  className?: string;
  'data-testid'?: string;
}

export function Progress({ value = 0, max = 100, className = '', 'data-testid': dataTestId }: ProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      className={`w-full bg-gray-200 rounded-full h-4 overflow-hidden ${className}`}
      data-testid={dataTestId}
    >
      <div
        className="h-full bg-blue-600 transition-all duration-300 ease-in-out"
        style={{ width: `${percentage}%` }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
      />
    </div>
  );
}
