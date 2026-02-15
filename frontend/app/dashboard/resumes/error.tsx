'use client';

import { RouteErrorFallback } from '@/components/ui/route-error-fallback';

export default function ResumesError({
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
      pageName="dashboard/resumes"
      pageLabel="your resumes"
    />
  );
}
