/**
 * Error Message Component
 * Issue #138: Error States & Recovery Flows
 */

'use client';

import React, { useState, useEffect } from 'react';
import { AppError, ErrorType } from '@/lib/errors/types';
import { getErrorIcon, getErrorIconTestId } from '@/lib/errors/error-utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertTriangle,
  WifiOff,
  ServerCrash,
  Lock,
  ShieldAlert,
  SearchX,
  Clock,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

interface ErrorMessageProps {
  /** The error to display */
  error: AppError;

  /** Callback when retry is clicked */
  onRetry?: () => void | Promise<void>;

  /** Callback when dismiss is clicked */
  onDismiss?: () => void;

  /** Whether retry button is shown */
  showRetry?: boolean;

  /** Whether dismiss button is shown */
  showDismiss?: boolean;

  /** Whether to show technical details */
  showTechnicalDetails?: boolean;

  /** Custom className */
  className?: string;

  /** Compact mode (smaller UI) */
  compact?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ErrorMessage({
  error,
  onRetry,
  onDismiss,
  showRetry = true,
  showDismiss = true,
  showTechnicalDetails = false,
  className = '',
  compact = false,
}: ErrorMessageProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  // Handle rate limit countdown
  useEffect(() => {
    if (error.type === ErrorType.RATE_LIMIT && error.retryDelay) {
      const countdown = Math.ceil(error.retryDelay / 1000);
      setRetryCountdown(countdown);

      const interval = setInterval(() => {
        setRetryCountdown((prev) => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [error]);

  const handleRetry = async () => {
    if (!onRetry || isRetrying) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const ErrorIcon = getIconComponent(error.type);
  const iconTestId = getErrorIconTestId(error.type);

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg ${className}`} data-testid="error-container">
        <ErrorIcon className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" data-testid={iconTestId} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-red-900 dark:text-red-100" data-testid="error-message">
            {error.message}
          </p>
        </div>
        {showRetry && error.retryable && onRetry && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRetry}
            disabled={isRetrying || retryCountdown !== null}
            data-testid="retry-button"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" data-testid="retry-spinner" />
                Retrying...
              </>
            ) : retryCountdown !== null ? (
              `Wait ${retryCountdown}s`
            ) : (
              'Try Again'
            )}
          </Button>
        )}
        {showDismiss && onDismiss && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            data-testid="dismiss-button"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={`border-red-200 dark:border-red-800 ${className}`} data-testid="error-container">
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
            <ErrorIcon className="h-6 w-6 text-red-600 dark:text-red-400" data-testid={iconTestId} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-red-900 dark:text-red-100">
              {getErrorTitle(error.type)}
            </CardTitle>
            {error.referenceNumber && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1" data-testid="reference-number">
                Reference: {error.referenceNumber}
              </p>
            )}
          </div>
          {showDismiss && onDismiss && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onDismiss}
              data-testid="dismiss-button"
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-gray-700 dark:text-gray-300" data-testid="error-message">
          {error.message}
        </p>

        {error.suggestions && error.suggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">What you can do:</h4>
            <ul className="space-y-1">
              {error.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400" data-testid="error-suggestion">
                  <span className="text-gray-400 dark:text-gray-500">•</span>
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {error.type === ErrorType.RATE_LIMIT && retryCountdown !== null && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
            <p className="text-sm text-yellow-800 dark:text-yellow-200" data-testid="rate-limit-countdown">
              Please wait {retryCountdown} seconds before trying again.
            </p>
          </div>
        )}

        {error.retryCount && error.retryCount > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="retry-count">
            Retry attempt {error.retryCount} of {error.maxRetries || 3}
          </p>
        )}

        {showTechnicalDetails && error.technicalMessage && (
          <details className="text-xs">
            <summary className="cursor-pointer text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
              Technical Details
            </summary>
            <pre className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-x-auto">
              {error.technicalMessage}
            </pre>
          </details>
        )}

        {/* ARIA live region for screen readers */}
        <div className="sr-only" aria-live="assertive" aria-atomic="true">
          {error.message}
        </div>
      </CardContent>

      {(showRetry && error.retryable && onRetry) && (
        <CardFooter className="flex gap-3">
          <Button
            onClick={handleRetry}
            disabled={isRetrying || retryCountdown !== null}
            data-testid="retry-button"
            className="flex-1"
          >
            {isRetrying ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" data-testid="retry-spinner" />
                Retrying
              </>
            ) : retryCountdown !== null ? (
              `Wait ${retryCountdown}s`
            ) : (
              'Try Again'
            )}
          </Button>

          {error.type === ErrorType.AUTHENTICATION && (
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/login')}
              data-testid="signin-button"
            >
              Sign In
            </Button>
          )}

          {error.type === ErrorType.NOT_FOUND && (
            <Button
              variant="outline"
              onClick={() => (window.location.href = '/dashboard')}
              data-testid="return-dashboard-button"
            >
              Return to Dashboard
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function getIconComponent(type: ErrorType) {
  switch (type) {
    case ErrorType.NETWORK:
      return WifiOff;
    case ErrorType.SERVER:
      return ServerCrash;
    case ErrorType.AUTHENTICATION:
      return Lock;
    case ErrorType.AUTHORIZATION:
      return ShieldAlert;
    case ErrorType.NOT_FOUND:
      return SearchX;
    case ErrorType.RATE_LIMIT:
      return Clock;
    case ErrorType.VALIDATION:
      return AlertCircle;
    default:
      return AlertTriangle;
  }
}

function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case ErrorType.NETWORK:
      return 'Connection Error';
    case ErrorType.SERVER:
      return 'Server Error';
    case ErrorType.AUTHENTICATION:
      return 'Session Expired';
    case ErrorType.AUTHORIZATION:
      return 'Access Denied';
    case ErrorType.NOT_FOUND:
      return 'Not Found';
    case ErrorType.RATE_LIMIT:
      return 'Too Many Requests';
    case ErrorType.VALIDATION:
      return 'Validation Error';
    default:
      return 'Error';
  }
}
