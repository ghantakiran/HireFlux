'use client';

import { RouteErrorFallback } from '@/components/ui/route-error-fallback';

export default function ApplicationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <RouteErrorFallback
      error={error}
      reset={reset}
      pageName="dashboard/applications"
      pageLabel="your applications"
    />
  );
}
