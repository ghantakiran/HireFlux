'use client';

import { useEffect, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { captureException } from '@/lib/sentry';
import Link from 'next/link';

interface RouteErrorFallbackProps {
  error: Error & { digest?: string };
  reset: () => void;
  pageName: string;
  pageLabel: string;
  homeUrl?: string;
  homeLabel?: string;
  primaryIcon?: ReactNode;
  primaryLabel?: string;
  extraLinks?: Array<{
    href: string;
    label: string;
    icon: ReactNode;
  }>;
}

export function RouteErrorFallback({
  error,
  reset,
  pageName,
  pageLabel,
  homeUrl = '/dashboard',
  homeLabel = 'Go to Dashboard',
  primaryIcon,
  primaryLabel = 'Try Again',
  extraLinks,
}: RouteErrorFallbackProps) {
  useEffect(() => {
    captureException(error, { digest: error.digest, page: pageName });
    console.error(`${pageName} error:`, error);
  }, [error, pageName]);

  return (
    <div className="flex min-h-[400px] items-center justify-center p-8" role="alert" aria-live="assertive">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto rounded-full bg-destructive/10 p-4 w-fit">
          <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t load {pageLabel}. Please try again.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground">
              Error ID: <code className="rounded bg-muted px-1">{error.digest}</code>
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <Button onClick={reset} className="w-full">
            {primaryIcon ?? <RefreshCw className="mr-2 h-4 w-4" />} {primaryLabel}
          </Button>
          <Button variant="outline" asChild className="w-full">
            <Link href={homeUrl}>
              <Home className="mr-2 h-4 w-4" /> {homeLabel}
            </Link>
          </Button>
          {extraLinks?.map((link) => (
            <Button key={link.href} variant="outline" asChild className="w-full">
              <Link href={link.href}>
                {link.icon} {link.label}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
