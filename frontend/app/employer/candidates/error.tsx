'use client';

import { RouteErrorFallback } from '@/components/ui/route-error-fallback';

export default function EmployerCandidatesError({
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
      pageName="employer/candidates"
      pageLabel="the candidates"
      homeUrl="/employer/dashboard"
    />
  );
}
