'use client';

/**
 * Global Error Page for Next.js App Router (Issue #138)
 *
 * Handles errors that occur in the app directory.
 * This is automatically used by Next.js for error handling.
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { captureException } from '@/lib/sentry';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log error to Sentry
    captureException(error, {
      digest: error.digest,
      page: 'error.tsx',
    });

    console.error('Global error:', error);
  }, [error]);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background p-4"
      data-testid="error-page"
      role="alert"
      aria-live="assertive"
    >
      <div className="w-full max-w-md space-y-6 rounded-lg border border-destructive/20 bg-card p-8 shadow-lg">
        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
          </div>
        </div>

        {/* Error Message */}
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Oops! Something went wrong</h1>
          <p className="text-sm text-muted-foreground" data-testid="error-message">
            {getFriendlyErrorMessage(error)}
          </p>

          {/* Error digest for support */}
          {error.digest && (
            <p className="text-xs text-muted-foreground">
              Error ID: <code className="rounded bg-muted px-1">{error.digest}</code>
            </p>
          )}

          {/* Technical details (development only) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-left">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                Technical Details
              </summary>
              <pre className="mt-2 overflow-auto rounded bg-muted p-2 text-xs">
                {error.message}
                {'\n\n'}
                {error.stack}
              </pre>
            </details>
          )}
        </div>

        {/* Recovery Suggestions */}
        <div
          className="rounded-md bg-muted/50 p-4 text-sm"
          data-testid="recovery-suggestions"
        >
          <p className="font-medium">What you can try:</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>• Refresh the page to try again</li>
            <li>• Go back to the homepage</li>
            <li>• Check your internet connection</li>
            <li>• Clear your browser cache and cookies</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={reset}
            className="w-full"
            data-testid="retry-button"
            aria-label="Try again"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>

          <Button
            variant="outline"
            onClick={() => (window.location.href = '/')}
            className="w-full"
            data-testid="back-button"
            aria-label="Go to homepage"
          >
            <Home className="mr-2 h-4 w-4" />
            Go to Homepage
          </Button>

          <Button
            variant="ghost"
            onClick={() => (window.location.href = '/support')}
            className="w-full text-sm"
            data-testid="contact-support"
            aria-label="Contact support"
          >
            Need help? Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Convert technical errors to user-friendly messages
 */
function getFriendlyErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return "We're having trouble connecting. Please check your internet connection and try again.";
  }

  // Authentication errors
  if (message.includes('auth') || message.includes('unauthorized') || message.includes('401')) {
    return 'Your session has expired. Please sign in again to continue.';
  }

  // Permission errors
  if (message.includes('permission') || message.includes('forbidden') || message.includes('403')) {
    return "You don't have permission to access this resource.";
  }

  // Not found errors
  if (message.includes('not found') || message.includes('404')) {
    return "We couldn't find what you're looking for.";
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('aborted') || message.includes('timed out')) {
    return 'The request is taking longer than expected. Please try again.';
  }

  // Server errors
  if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('server')) {
    return "We're experiencing technical difficulties. Our team has been notified and is working on a fix.";
  }

  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many requests') || message.includes('429')) {
    return "You're sending requests too quickly. Please wait a moment and try again.";
  }

  // Validation errors
  if (message.includes('validation') || message.includes('invalid')) {
    return 'There was a problem with your request. Please check your input and try again.';
  }

  // Generic fallback
  return "An unexpected error occurred. We've been notified and are working on a fix.";
}
