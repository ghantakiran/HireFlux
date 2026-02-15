'use client';

import { RouteErrorFallback } from '@/components/ui/route-error-fallback';

export default function EmployerError({
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
      pageName="employer"
      pageLabel="the employer dashboard"
      homeUrl="/"
      homeLabel="Go to Home"
    />
  );
}
