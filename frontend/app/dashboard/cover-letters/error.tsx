'use client';

import { FileText } from 'lucide-react';
import { RouteErrorFallback } from '@/components/ui/route-error-fallback';

export default function CoverLettersError({
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
      pageName="dashboard/cover-letters"
      pageLabel="your cover letters"
      homeLabel="Dashboard"
      extraLinks={[
        {
          href: '/dashboard/cover-letters',
          label: 'View Cover Letters',
          icon: <FileText className="mr-2 h-4 w-4" />,
        },
      ]}
    />
  );
}
