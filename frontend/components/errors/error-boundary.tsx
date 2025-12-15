/**
 * Error Boundary Component
 * Issue #138: Error States & Recovery Flows
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorBoundaryState } from '@/lib/errors/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Fallback UI to render on error */
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode);
  /** Callback when error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Component name for logging */
  componentName?: string;
  /** Whether to isolate errors (prevent propagation) */
  isolate?: boolean;
  /** Maximum number of auto-retry attempts */
  maxRetries?: number;
}

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      componentName: props.componentName,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, componentName } = this.props;

    // Update state with error info
    this.setState({
      error,
      errorInfo,
      componentName,
    });

    // Call external error handler
    if (onError) {
      onError(error, errorInfo);
    }

    // Log to Sentry or error tracking service
    this.logErrorToService(error, errorInfo);

    // Auto-retry if configured
    const { maxRetries = 0 } = this.props;
    if (this.state.retryCount < maxRetries) {
      setTimeout(() => {
        this.handleReset();
      }, 2000); // Wait 2 seconds before auto-retry
    }
  }

  logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Log to window object for testing
    if (typeof window !== 'undefined') {
      if (!(window as any).__SENTRY_EVENTS__) {
        (window as any).__SENTRY_EVENTS__ = [];
      }
      (window as any).__SENTRY_EVENTS__.push({
        type: 'error-boundary',
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        componentName: this.props.componentName,
        timestamp: new Date().toISOString(),
      });
    }

    // TODO: Implement actual Sentry logging
    // Sentry.captureException(error, {
    //   contexts: {
    //     react: {
    //       componentStack: errorInfo.componentStack,
    //     },
    //   },
    //   tags: {
    //     componentName: this.props.componentName || 'unknown',
    //   },
    // });
  }

  handleReset = () => {
    this.setState((prevState) => ({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: prevState.retryCount + 1,
    }));
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error && errorInfo) {
      // Render custom fallback if provided
      if (typeof fallback === 'function') {
        return fallback(error, errorInfo, this.handleReset);
      }

      if (fallback) {
        return fallback;
      }

      // Render default error UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
          <Card className="max-w-2xl w-full border-red-200 dark:border-red-800" data-testid="error-boundary-fallback">
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-red-900 dark:text-red-100">
                    Something went wrong
                  </CardTitle>
                  {this.props.componentName && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Component: {this.props.componentName}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                We encountered an unexpected error. This has been logged and we'll look into it.
              </p>

              {process.env.NODE_ENV === 'development' && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-2">
                    Error Details (Development Only)
                  </summary>
                  <div className="space-y-2">
                    <div>
                      <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Error:</h4>
                      <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto text-red-600 dark:text-red-400">
                        {error.toString()}
                      </pre>
                    </div>
                    {error.stack && (
                      <div>
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Stack Trace:</h4>
                        <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto text-xs">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    {errorInfo.componentStack && (
                      <div>
                        <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Component Stack:</h4>
                        <pre className="p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto text-xs">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </CardContent>

            <CardFooter className="flex gap-3">
              <Button
                onClick={this.handleReset}
                data-testid="reload-component-button"
                className="flex-1"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button
                variant="outline"
                onClick={() => (window.location.href = '/dashboard')}
              >
                <Home className="mr-2 h-4 w-4" />
                Go Home
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return children;
  }
}

// ============================================================================
// COMPONENT-SPECIFIC ERROR BOUNDARY
// ============================================================================

interface ComponentErrorBoundaryProps {
  children: ReactNode;
  componentName: string;
  onError?: (error: Error) => void;
}

export function ComponentErrorBoundary({
  children,
  componentName,
  onError,
}: ComponentErrorBoundaryProps) {
  return (
    <ErrorBoundary
      componentName={componentName}
      isolate
      onError={(error, errorInfo) => {
        onError?.(error);
      }}
      fallback={(error, errorInfo, reset) => (
        <div className="p-4 border border-red-200 dark:border-red-800 rounded-lg bg-red-50 dark:bg-red-950" data-testid={`${componentName.toLowerCase()}-error-boundary`}>
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-red-900 dark:text-red-100">
                Failed to load {componentName}
              </h3>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                {error.message}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={reset}
              data-testid="reload-component-button"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    >
      {children}
    </ErrorBoundary>
  );
}

// ============================================================================
// HOOK FOR FUNCTIONAL COMPONENTS
// ============================================================================

/**
 * Hook to handle errors in functional components
 * Note: This doesn't catch render errors like ErrorBoundary,
 * but can be used to handle async errors
 */
export function useErrorBoundary() {
  const [, setError] = React.useState();

  return React.useCallback(
    (error: Error) => {
      setError(() => {
        throw error;
      });
    },
    []
  );
}
