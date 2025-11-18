/**
 * FitIndexBadge Component (Issue #26)
 *
 * Displays AI-calculated fit index with color coding:
 * - 80-100: Green (Excellent fit)
 * - 60-79: Yellow (Good fit)
 * - 40-59: Orange (Fair fit)
 * - 0-39: Red (Poor fit)
 */

'use client';

import React from 'react';
import { getFitIndexColor } from '@/lib/api/ranking';

interface FitIndexBadgeProps {
  fitIndex: number;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export default function FitIndexBadge({
  fitIndex,
  onClick,
  size = 'md',
  showLabel = true,
  className = '',
}: FitIndexBadgeProps) {
  const { bg, text, label } = getFitIndexColor(fitIndex);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const isClickable = !!onClick;

  return (
    <button
      data-testid="fit-index-badge"
      aria-label={`Fit index: ${fitIndex} out of 100, ${label}`}
      onClick={onClick}
      disabled={!isClickable}
      className={`
        inline-flex items-center gap-2 rounded-full font-semibold
        ${bg} ${text} ${sizeClasses[size]}
        ${isClickable ? 'cursor-pointer hover:opacity-80 transition-opacity' : 'cursor-default'}
        ${className}
      `}
    >
      {/* Fit Index Score */}
      <span className="font-bold">{fitIndex}%</span>

      {/* Label (optional) */}
      {showLabel && (
        <span className="hidden sm:inline font-medium">{label}</span>
      )}

      {/* Click indicator (if clickable) */}
      {isClickable && (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      )}
    </button>
  );
}
