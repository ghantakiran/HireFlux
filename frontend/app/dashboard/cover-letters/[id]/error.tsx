'use client';

import { RouteErrorFallback } from '@/components/ui/route-error-fallback';

export default function CoverLetterDetailError({
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
      pageName="dashboard/cover-letters/detail"
      pageLabel="the cover letter"
    />
  );
}
