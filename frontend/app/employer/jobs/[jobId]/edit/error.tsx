'use client';

import { RouteErrorFallback } from '@/components/ui/route-error-fallback';

export default function JobEditError({
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
      pageName="employer/jobs/edit"
      pageLabel="the job editor"
    />
  );
}
