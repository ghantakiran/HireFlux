/**
 * Shared badge color helpers for status/type badges across the app.
 * Returns Tailwind className strings for use with Badge components.
 */

/** Assessment status → badge className */
export function getAssessmentStatusBadgeColor(status: string): string {
  switch (status) {
    case 'published':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'draft':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    case 'archived':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
}

/** Job location type → badge className */
export function getLocationTypeBadgeColor(type: string): string {
  switch (type) {
    case 'remote':
      return 'bg-success-500 text-white';
    case 'hybrid':
      return 'bg-accent-500 text-white';
    case 'onsite':
      return 'bg-gray-600 text-white';
    default:
      return 'bg-gray-600 text-white';
  }
}

/** Assessment type → badge className */
export function getAssessmentTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    screening: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    technical: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    behavioral: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
    culture_fit: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
  };
  return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
}
