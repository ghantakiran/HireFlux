'use client';

import { RouteErrorFallback } from '@/components/ui/route-error-fallback';

export default function CompanyProfileError({
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
      pageName="company"
      pageLabel="the company profile"
    />
  );
}
