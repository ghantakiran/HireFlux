'use client';

import { RouteErrorFallback } from '@/components/ui/route-error-fallback';

export default function EmployerJobsError({
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
      pageName="employer/jobs"
      pageLabel="your job postings"
      homeUrl="/employer/dashboard"
    />
  );
}
