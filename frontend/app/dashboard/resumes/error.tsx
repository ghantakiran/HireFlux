'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { captureException } from '@/lib/sentry';
import Link from 'next/link';

export default function ResumesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, { digest: error.digest, page: 'dashboard/resumes' });
    console.error('Resumes error:', error);
  }, [error]);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8" role="alert" aria-live="assertive">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto rounded-full bg-destructive/10 p-4 w-fit">
          <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load your resumes. Please try again.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground">
              Error ID: <code className="rounded bg-muted px-1">{error.digest}</code>
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <Button onClick={reset} className="w-full">
            <RefreshCw className="mr-2 h-4 w-4" /> Try Again
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" /> Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
