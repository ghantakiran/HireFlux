/**
 * Dashboard Loading State
 *
 * Displayed while dashboard pages are loading.
 * Automatically used by Next.js App Router during navigation.
 */

import { PageLoadingSpinner } from '@/components/ui/loading-spinner';

export default function DashboardLoading() {
  return <PageLoadingSpinner />;
}
