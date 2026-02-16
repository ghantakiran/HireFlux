'use client';

import { RouteErrorFallback } from '@/components/ui/route-error-fallback';

export default function AssessmentResultsError({
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
      pageName="assessments/results"
      pageLabel="assessment results"
    />
  );
}
