'use client';

import { RouteErrorFallback } from '@/components/ui/route-error-fallback';

export default function ResumeDetailError({
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
      pageName="dashboard/resumes/detail"
      pageLabel="the resume"
    />
  );
}
