'use client';

/**
 * Error Boundary Component (Issue #138)
 *
 * Catches React errors and displays a friendly fallback UI
 * with recovery options. Integrates with Sentry for error tracking.
 */

import React from 'react';
import { captureException } from '@/lib/sentry';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home, Mail } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to Sentry
    captureException(error, {
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    this.setState({
      errorInfo,
    });

    console.error('Error caught by boundary:', error, errorInfo);
  }

  resetError = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          resetError={this.resetError}
          retryCount={this.state.retryCount}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Default Error Fallback Component
 */
function DefaultErrorFallback({
  error,
  resetError,
  retryCount,
}: {
  error: Error;
  resetError: () => void;
  retryCount: number;
}) {
  const showSupportOption = retryCount >= 2;

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background p-4"
      data-testid="error-boundary-fallback"
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
          <h2 className="text-2xl font-bold tracking-tight">Something went wrong</h2>
          <p className="text-sm text-muted-foreground" data-testid="error-message">
            {getFriendlyErrorMessage(error)}
          </p>

          {/* Technical details for debugging (collapsed) */}
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
          <p className="font-medium">What you can do:</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>• Try refreshing the page</li>
            <li>• Check your internet connection</li>
            <li>• Clear your browser cache</li>
            {showSupportOption && <li>• Contact support if the problem persists</li>}
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button
            onClick={resetError}
            className="w-full"
            data-testid="error-boundary-reset"
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

          {showSupportOption && (
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/support')}
              className="w-full"
              data-testid="contact-support"
              aria-label="Contact support"
            >
              <Mail className="mr-2 h-4 w-4" />
              Contact Support
            </Button>
          )}
        </div>

        {retryCount > 0 && (
          <p className="text-center text-xs text-muted-foreground">
            Retry attempt: {retryCount}
          </p>
        )}
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
  if (message.includes('network') || message.includes('fetch')) {
    return "We're having trouble connecting. Please check your internet connection and try again.";
  }

  // Authentication errors
  if (message.includes('auth') || message.includes('unauthorized')) {
    return 'Your session has expired. Please sign in again to continue.';
  }

  // Permission errors
  if (message.includes('permission') || message.includes('forbidden')) {
    return "You don't have permission to access this resource.";
  }

  // Timeout errors
  if (message.includes('timeout') || message.includes('aborted')) {
    return 'The request is taking longer than expected. Please try again.';
  }

  // Not found errors
  if (message.includes('not found') || message.includes('404')) {
    return "We couldn't find what you're looking for.";
  }

  // Server errors
  if (message.includes('500') || message.includes('server error')) {
    return "We're experiencing technical difficulties. Please try again later.";
  }

  // Generic fallback
  return "An unexpected error occurred. We've been notified and are working on a fix.";
}

export { ErrorBoundary };
export type { ErrorBoundaryProps, ErrorFallbackProps };
