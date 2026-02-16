/**
 * Error Message Component
 * Displays user-friendly error messages with recovery options
 */

'use client';

import React from 'react';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatError, ErrorDetails, ErrorType } from '@/lib/error-utils';

export interface ErrorMessageProps {
  error: unknown;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

export function ErrorMessage({ error, onRetry, isRetrying = false, className = '' }: ErrorMessageProps) {
  if (!error) return null;

  const errorDetails: ErrorDetails = formatError(error);

  const getIcon = () => {
    switch (errorDetails.type) {
      case ErrorType.NETWORK:
        return <WifiOff className="h-5 w-5" />;
      case ErrorType.AUTH:
      case ErrorType.PERMISSION:
      case ErrorType.RATE_LIMIT:
        return <AlertCircle className="h-5 w-5" />;
      default:
        return <AlertCircle className="h-5 w-5" />;
    }
  };

  return (
    <Alert variant="destructive" className={className} data-testid="error-container">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{getIcon()}</div>
        <div className="flex-1 space-y-2">
          {/* Error Message */}
          <AlertTitle data-testid="error-message">
            {errorDetails.message}
          </AlertTitle>

          {/* Error Description */}
          {errorDetails.description && (
            <AlertDescription data-testid="error-description">
              {errorDetails.description}
            </AlertDescription>
          )}

          {/* Error Reference ID */}
          {errorDetails.referenceId && (
            <div
              className="bg-red-950/20 rounded px-2 py-1 text-xs font-mono"
              data-testid="error-reference"
            >
              Reference: {errorDetails.referenceId}
            </div>
          )}

          {/* Field Errors (for validation) */}
          {errorDetails.fieldErrors && Object.keys(errorDetails.fieldErrors).length > 0 && (
            <div className="space-y-1 mt-2">
              {Object.entries(errorDetails.fieldErrors).map(([field, message]) => (
                <div key={field} className="text-sm" data-testid={`error-${field}`}>
                  <span className="font-semibold capitalize">{field.replace(/_/g, ' ')}:</span>{' '}
                  {message}
                </div>
              ))}
            </div>
          )}

          {/* Error Suggestions */}
          {errorDetails.suggestions && errorDetails.suggestions.length > 0 && (
            <div className="mt-3" data-testid="error-suggestions">
              <p className="text-sm font-medium mb-1">What you can do:</p>
              <ul className="list-disc list-inside text-sm space-y-1">
                {errorDetails.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Recovery Actions */}
          {(errorDetails.retryable || onRetry) && (
            <div className="flex gap-2 mt-4" data-testid="error-actions">
              {errorDetails.retryable && onRetry && (
                <Button
                  onClick={onRetry}
                  disabled={isRetrying}
                  size="sm"
                  variant="outline"
                  data-testid="error-action"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" data-testid="loading-spinner" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retry
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Alert>
  );
}

/**
 * Inline field error message
 */
export interface FieldErrorProps {
  error?: string;
  fieldName: string;
}

export function FieldError({ error, fieldName }: FieldErrorProps) {
  if (!error) return null;

  return (
    <p
      className="text-sm text-red-600 dark:text-red-400 mt-1"
      data-testid={`error-${fieldName}`}
      role="alert"
    >
      {error}
    </p>
  );
}

/**
 * Network Error Display
 */
export function NetworkError({ onRetry, isRetrying }: { onRetry?: () => void; isRetrying?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-4">
      <WifiOff className="h-16 w-16 text-red-500" />
      <h3 className="text-lg font-semibold" data-testid="error-message">
        Network Error
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center" data-testid="error-description">
        Unable to connect. Please check your connection and try again.
      </p>
      {onRetry && (
        <Button onClick={onRetry} disabled={isRetrying} data-testid="error-action">
          {isRetrying ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" data-testid="loading-spinner" />
              Retrying...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </>
          )}
        </Button>
      )}
    </div>
  );
}
