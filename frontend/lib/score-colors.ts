/**
 * Consolidated score color helpers
 *
 * Shared utility functions for color-coding fit indices, health scores,
 * and other numeric scores across job seeker and employer views.
 */

/**
 * Simple fit index badge color (bg only) — used in job cards
 * Thresholds: 80+ green, 60+ blue, 40+ yellow, <40 gray
 */
export function getFitIndexBadgeColor(fitIndex: number): string {
  if (fitIndex >= 80) return 'bg-green-500';
  if (fitIndex >= 60) return 'bg-blue-500';
  if (fitIndex >= 40) return 'bg-yellow-500';
  return 'bg-gray-500';
}

/**
 * Fit index label text — used alongside fit index badge
 */
export function getFitIndexLabel(fitIndex: number): string {
  if (fitIndex >= 80) return 'Excellent Match';
  if (fitIndex >= 60) return 'Good Match';
  if (fitIndex >= 40) return 'Fair Match';
  return 'Low Match';
}

/**
 * Fit index color with dark mode support — used in employer kanban/applicant views
 * Thresholds: 80+ green, 60+ yellow, <60 red
 */
export function getFitIndexDetailedColor(fitIndex: number): string {
  if (fitIndex > 80)
    return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300';
  if (fitIndex >= 60)
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300';
  return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300';
}

/**
 * Score color object — used for detailed score breakdowns
 * Returns separate bg and text classes
 */
export function getScoreColors(score: number): { bg: string; text: string } {
  if (score >= 80) return { bg: 'bg-green-600', text: 'text-green-600' };
  if (score >= 60) return { bg: 'bg-blue-600', text: 'text-blue-600' };
  if (score >= 40) return { bg: 'bg-yellow-600', text: 'text-yellow-600' };
  return { bg: 'bg-gray-600', text: 'text-gray-600' };
}

/**
 * Health/metric score color — used in dashboard overview cards
 * Returns combined text+bg+dark mode classes
 */
export function getHealthScoreColor(score: number): string {
  if (score >= 80)
    return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20';
  if (score >= 60)
    return 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20';
  if (score >= 40)
    return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/20';
  return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20';
}

/**
 * Fit score color for employer applicant lists — with dark mode
 * Thresholds: 80+ green, 60+ yellow, <60 red
 */
export function getFitScoreColor(score: number): string {
  if (score >= 80)
    return 'text-green-700 bg-green-50 dark:bg-green-900/20 dark:text-green-400';
  if (score >= 60)
    return 'text-yellow-700 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-400';
  return 'text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-400';
}
