'use client';

import { RouteErrorFallback } from '@/components/ui/route-error-fallback';

export default function EmployerAssessmentsError({
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
      pageName="employer/assessments"
      pageLabel="assessments"
      homeUrl="/employer/dashboard"
    />
  );
}
