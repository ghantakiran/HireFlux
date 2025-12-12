/**
 * Error Handling Utilities
 * Classification, formatting, and handling of various error types
 */

export enum ErrorType {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  AUTH = 'auth',
  PERMISSION = 'permission',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  FILE_UPLOAD = 'file_upload',
  UNKNOWN = 'unknown',
}

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  description?: string;
  referenceId?: string;
  retryable: boolean;
  statusCode?: number;
  suggestions?: string[];
  fieldErrors?: Record<string, string>;
  metadata?: Record<string, any>;
}

/**
 * Classify error based on response or error object
 */
export function classifyError(error: any): ErrorType {
  // Network errors
  if (error.name === 'NetworkError' || error.message?.includes('network')) {
    return ErrorType.NETWORK;
  }

  if (!error.response && error.request) {
    return ErrorType.NETWORK;
  }

  // HTTP status code based classification
  const status = error.response?.status || error.status;

  if (status === 401) return ErrorType.AUTH;
  if (status === 403) return ErrorType.PERMISSION;
  if (status === 404) return ErrorType.NOT_FOUND;
  if (status === 413) return ErrorType.FILE_UPLOAD;
  if (status === 429) return ErrorType.RATE_LIMIT;
  if (status === 400 && error.response?.data?.errors) return ErrorType.VALIDATION;
  if (status >= 500) return ErrorType.API;

  // Default
  return ErrorType.UNKNOWN;
}

/**
 * Format error into user-friendly ErrorDetails
 */
export function formatError(error: any): ErrorDetails {
  const type = classifyError(error);
  const status = error.response?.status || error.status;
  const data = error.response?.data || {};

  const baseDetails: ErrorDetails = {
    type,
    message: '',
    description: '',
    retryable: false,
    statusCode: status,
    referenceId: data.reference_id || data.error_id,
    metadata: {},
  };

  switch (type) {
    case ErrorType.NETWORK:
      return {
        ...baseDetails,
        message: 'Network Error',
        description: 'Unable to connect. Please check your connection and try again.',
        retryable: true,
        suggestions: [
          'Check your internet connection',
          'Retry the request',
          'Try again in a moment',
        ],
      };

    case ErrorType.AUTH:
      return {
        ...baseDetails,
        message: 'Session Expired',
        description: 'Your session has expired. Please sign in again.',
        retryable: false,
        suggestions: ['Sign in again to continue'],
      };

    case ErrorType.PERMISSION:
      return {
        ...baseDetails,
        message: 'Upgrade Required',
        description: data.error || 'This feature requires a higher plan.',
        retryable: false,
        suggestions: ['Upgrade your plan to access this feature'],
        metadata: {
          required_plan: data.required_plan,
        },
      };

    case ErrorType.NOT_FOUND:
      return {
        ...baseDetails,
        message: 'Not Found',
        description: data.error || 'The requested resource could not be found.',
        retryable: false,
        suggestions: ['Check the URL and try again', 'Browse available content'],
      };

    case ErrorType.RATE_LIMIT:
      return {
        ...baseDetails,
        message: 'Too Many Requests',
        description: 'You\'ve made too many requests. Please wait before trying again.',
        retryable: true,
        suggestions: [`Try again in ${data.retry_after || 60} seconds`],
        metadata: {
          retry_after: data.retry_after,
        },
      };

    case ErrorType.FILE_UPLOAD:
      return {
        ...baseDetails,
        message: 'File Upload Error',
        description: data.error || 'There was a problem uploading your file.',
        retryable: false,
        suggestions: [
          data.max_size ? `Maximum file size is ${data.max_size}` : '',
          data.accepted_types ? `Accepted types: ${data.accepted_types.join(', ')}` : '',
        ].filter(Boolean),
        metadata: {
          max_size: data.max_size,
          accepted_types: data.accepted_types,
        },
      };

    case ErrorType.VALIDATION:
      return {
        ...baseDetails,
        message: 'Please Check Your Information',
        description: 'Some fields need your attention.',
        retryable: false,
        fieldErrors: data.errors || {},
        suggestions: ['Correct the highlighted fields and try again'],
      };

    case ErrorType.API:
      return {
        ...baseDetails,
        message: 'Something Went Wrong',
        description: 'We encountered an unexpected error. Our team has been notified.',
        retryable: true,
        suggestions: ['Try again in a moment', 'Contact support if this persists'],
      };

    default:
      return {
        ...baseDetails,
        message: 'An Error Occurred',
        description: data.error || error.message || 'Please try again.',
        retryable: true,
        suggestions: ['Retry the request', 'Contact support if this continues'],
      };
  }
}

/**
 * Check if error should trigger a retry
 */
export function shouldRetry(error: any, attemptCount: number = 1): boolean {
  const errorDetails = formatError(error);

  // Don't retry non-retryable errors
  if (!errorDetails.retryable) return false;

  // Don't retry after max attempts
  if (attemptCount >= 3) return false;

  // Retry network and API errors
  return errorDetails.type === ErrorType.NETWORK || errorDetails.type === ErrorType.API;
}

/**
 * Extract field errors for form validation
 */
export function getFieldErrors(error: any): Record<string, string> {
  const data = error.response?.data || error.data || {};
  return data.errors || {};
}

/**
 * Check if user is offline
 */
export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

/**
 * Generate unique error reference ID
 */
export function generateErrorId(): string {
  return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log error to monitoring service (Sentry)
 */
export function logError(error: any, context?: Record<string, any>): void {
  const errorDetails = formatError(error);
  const errorId = generateErrorId();

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', {
      id: errorId,
      type: errorDetails.type,
      message: errorDetails.message,
      error,
      context,
    });
  }

  // Send to Sentry in production
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    (window as any).Sentry.captureException(error, {
      level: 'error',
      tags: {
        error_type: errorDetails.type,
        error_id: errorId,
        retryable: errorDetails.retryable,
      },
      extra: {
        errorDetails,
        context,
      },
    });
  }
}

/**
 * Get user-friendly error message (no technical jargon)
 */
export function getFriendlyMessage(error: any): string {
  const errorDetails = formatError(error);
  return errorDetails.message;
}

/**
 * Get detailed error description
 */
export function getErrorDescription(error: any): string {
  const errorDetails = formatError(error);
  return errorDetails.description || errorDetails.message;
}

/**
 * Get error suggestions for recovery
 */
export function getErrorSuggestions(error: any): string[] {
  const errorDetails = formatError(error);
  return errorDetails.suggestions || [];
}
