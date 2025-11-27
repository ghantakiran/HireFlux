/**
 * FitIndexBadge Component (Issue #94)
 *
 * Displays AI-generated fit scores (0-100) with color-coded visual feedback
 * Used across job seeker and employer views for match quality indication
 */

import { cn } from '@/lib/utils';

export interface FitIndexBadgeProps {
  /** Fit score from 0-100 */
  score: number;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show text label (e.g., "Excellent Fit") */
  showLabel?: boolean;
  /** Variant for different contexts */
  variant?: 'job-seeker' | 'employer';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get color classes based on fit score
 *
 * Scoring ranges:
 * - 90-100: Excellent Fit (Dark Green #15803D)
 * - 75-89: Great Fit (Green #22C55E)
 * - 60-74: Good Fit (Amber #F59E0B)
 * - 40-59: Moderate Fit (Orange/Warning)
 * - 0-39: Low Fit (Red #EF4444)
 */
function getFitScoreColor(score: number): string {
  if (score >= 90) return 'bg-success-700 text-white';
  if (score >= 75) return 'bg-success-500 text-white';
  if (score >= 60) return 'bg-accent-500 text-white';
  if (score >= 40) return 'bg-warning text-white';
  return 'bg-error text-white';
}

/**
 * Get label text based on fit score
 */
function getFitScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent Fit';
  if (score >= 75) return 'Great Fit';
  if (score >= 60) return 'Good Fit';
  if (score >= 40) return 'Moderate Fit';
  return 'Low Fit';
}

/**
 * Get size classes
 */
function getSizeClasses(size: 'sm' | 'md' | 'lg'): string {
  const sizes = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };
  return sizes[size];
}

export function FitIndexBadge({
  score,
  size = 'md',
  showLabel = false,
  variant = 'job-seeker',
  className,
}: FitIndexBadgeProps) {
  // Clamp score between 0-100
  const clampedScore = Math.max(0, Math.min(100, score));

  const colorClasses = getFitScoreColor(clampedScore);
  const sizeClasses = getSizeClasses(size);
  const label = getFitScoreLabel(clampedScore);

  return (
    <span
      data-fit-index
      data-variant={variant}
      role="status"
      aria-label={`Fit index: ${clampedScore}% - ${label}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold transition-colors',
        colorClasses,
        sizeClasses,
        className
      )}
    >
      <span>{clampedScore}%</span>
      {showLabel && <span className="font-medium">{label}</span>}
    </span>
  );
}
