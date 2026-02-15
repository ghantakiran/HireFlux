'use client';

import { Briefcase } from 'lucide-react';
import { RouteErrorFallback } from '@/components/ui/route-error-fallback';

export default function JobsError({
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
      pageName="dashboard/jobs"
      pageLabel="your jobs"
      primaryIcon={<Briefcase className="mr-2 h-4 w-4" />}
      primaryLabel="Browse Jobs"
    />
  );
}
