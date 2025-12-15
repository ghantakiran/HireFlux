/**
 * Error utility functions for HireFlux
 * Issue #138: Error States & Recovery Flows
 */

import { v4 as uuidv4 } from 'uuid';
import {
  AppError,
  ErrorType,
  ErrorSeverity,
  APIErrorResponse,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  RecoverySuggestion,
  isAPIErrorResponse,
  isNetworkError,
} from './types';

// ============================================================================
// ERROR CREATION
// ============================================================================

/**
 * Create an AppError from various error types
 */
export function createAppError(
  error: unknown,
  context?: Record<string, any>
): AppError {
  // Handle AppError (already transformed)
  if (isAppErrorInstance(error)) {
    return error;
  }

  // Handle API error responses
  if (isAPIErrorResponse(error)) {
    return createAPIError(error, context);
  }

  // Handle network errors
  if (isNetworkError(error)) {
    return createNetworkError(error as Error, context);
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return createGenericError(error, context);
  }

  // Handle unknown errors
  return createUnknownError(error, context);
}

function isAppErrorInstance(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'id' in error &&
    'type' in error &&
    'severity' in error &&
    'message' in error &&
    'retryable' in error
  );
}

/**
 * Create error from API response
 */
function createAPIError(
  response: APIErrorResponse,
  context?: Record<string, any>
): AppError {
  const type = getErrorTypeFromStatus(response.statusCode);
  const severity = response.critical ? ErrorSeverity.CRITICAL : ErrorSeverity.ERROR;

  return {
    id: uuidv4(),
    type,
    severity,
    message: getFriendlyMessage(type, response),
    technicalMessage: response.message || response.error,
    statusCode: response.statusCode,
    suggestions: getSuggestions(type, response),
    retryable: isRetryable(type, response.statusCode),
    retryCount: 0,
    maxRetries: DEFAULT_RETRY_CONFIG.maxAttempts,
    retryDelay: response.retryAfter ? response.retryAfter * 1000 : DEFAULT_RETRY_CONFIG.initialDelay,
    referenceNumber: generateReferenceNumber(),
    timestamp: new Date(),
    context,
    persistent: response.critical || false,
  };
}

/**
 * Create error from network failure
 */
function createNetworkError(error: Error, context?: Record<string, any>): AppError {
  return {
    id: uuidv4(),
    type: ErrorType.NETWORK,
    severity: ErrorSeverity.ERROR,
    message: 'Unable to connect to the server. Please check your internet connection and try again.',
    technicalMessage: error.message,
    suggestions: [
      'Check your internet connection',
      'Try again in a few moments',
      'Contact support if the problem persists',
    ],
    retryable: true,
    retryCount: 0,
    maxRetries: DEFAULT_RETRY_CONFIG.maxAttempts,
    retryDelay: DEFAULT_RETRY_CONFIG.initialDelay,
    referenceNumber: generateReferenceNumber(),
    timestamp: new Date(),
    context,
    originalError: error,
  };
}

/**
 * Create error from generic Error object
 */
function createGenericError(error: Error, context?: Record<string, any>): AppError {
  return {
    id: uuidv4(),
    type: ErrorType.CLIENT,
    severity: ErrorSeverity.ERROR,
    message: 'Something went wrong. Please try again.',
    technicalMessage: error.message,
    suggestions: ['Try again', 'Refresh the page', 'Contact support if the problem persists'],
    retryable: true,
    retryCount: 0,
    maxRetries: DEFAULT_RETRY_CONFIG.maxAttempts,
    retryDelay: DEFAULT_RETRY_CONFIG.initialDelay,
    referenceNumber: generateReferenceNumber(),
    timestamp: new Date(),
    context,
    originalError: error,
  };
}

/**
 * Create error from unknown error type
 */
function createUnknownError(error: unknown, context?: Record<string, any>): AppError {
  return {
    id: uuidv4(),
    type: ErrorType.UNKNOWN,
    severity: ErrorSeverity.ERROR,
    message: 'An unexpected error occurred. Please try again.',
    technicalMessage: String(error),
    suggestions: ['Try again', 'Refresh the page', 'Contact support if the problem persists'],
    retryable: true,
    retryCount: 0,
    maxRetries: DEFAULT_RETRY_CONFIG.maxAttempts,
    retryDelay: DEFAULT_RETRY_CONFIG.initialDelay,
    referenceNumber: generateReferenceNumber(),
    timestamp: new Date(),
    context: { ...context, errorValue: error },
  };
}

// ============================================================================
// ERROR TYPE DETECTION
// ============================================================================

/**
 * Determine error type from HTTP status code
 */
function getErrorTypeFromStatus(statusCode?: number): ErrorType {
  if (!statusCode) return ErrorType.UNKNOWN;

  if (statusCode === 400) return ErrorType.VALIDATION;
  if (statusCode === 401) return ErrorType.AUTHENTICATION;
  if (statusCode === 403) return ErrorType.AUTHORIZATION;
  if (statusCode === 404) return ErrorType.NOT_FOUND;
  if (statusCode === 429) return ErrorType.RATE_LIMIT;
  if (statusCode >= 500) return ErrorType.SERVER;
  if (statusCode >= 400) return ErrorType.CLIENT;

  return ErrorType.API;
}

/**
 * Check if error is retryable
 */
function isRetryable(type: ErrorType, statusCode?: number): boolean {
  // Never retry authentication or authorization errors
  if (type === ErrorType.AUTHENTICATION || type === ErrorType.AUTHORIZATION) {
    return false;
  }

  // Never retry validation errors (user needs to fix input)
  if (type === ErrorType.VALIDATION) {
    return false;
  }

  // Don't retry 404s (resource doesn't exist)
  if (type === ErrorType.NOT_FOUND) {
    return false;
  }

  // Retry rate limits after delay
  if (type === ErrorType.RATE_LIMIT) {
    return true;
  }

  // Retry server errors (5xx)
  if (statusCode && statusCode >= 500) {
    return true;
  }

  // Retry network errors
  if (type === ErrorType.NETWORK) {
    return true;
  }

  // Default to not retryable for client errors
  return false;
}

// ============================================================================
// USER-FRIENDLY MESSAGES
// ============================================================================

/**
 * Get friendly error message based on type
 */
function getFriendlyMessage(type: ErrorType, response?: APIErrorResponse): string {
  switch (type) {
    case ErrorType.NETWORK:
      return 'Unable to connect to the server. Please check your internet connection and try again.';

    case ErrorType.AUTHENTICATION:
      return 'Your session has expired. Please sign in again to continue.';

    case ErrorType.AUTHORIZATION:
      return "You don't have permission to perform this action.";

    case ErrorType.NOT_FOUND:
      return "We couldn't find what you're looking for.";

    case ErrorType.RATE_LIMIT:
      return "You're doing that too quickly. Please wait a moment before trying again.";

    case ErrorType.SERVER:
      return "Something went wrong on our end. We've been notified and are working on it.";

    case ErrorType.VALIDATION:
      return response?.message || 'Please check your input and try again.';

    case ErrorType.CLIENT:
      return response?.message || 'Something went wrong. Please try again.';

    default:
      return 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Get recovery suggestions based on error type
 */
function getSuggestions(type: ErrorType, response?: APIErrorResponse): string[] {
  switch (type) {
    case ErrorType.NETWORK:
      return [
        'Check your internet connection',
        'Try again in a few moments',
        'Contact support if the problem persists',
      ];

    case ErrorType.AUTHENTICATION:
      return ['Sign in again to continue', 'Clear your browser cache', 'Try a different browser'];

    case ErrorType.AUTHORIZATION:
      return [
        'Contact your team administrator for access',
        'Upgrade your plan for additional features',
        'Return to dashboard',
      ];

    case ErrorType.NOT_FOUND:
      return ['Check the URL is correct', 'Return to dashboard', 'Search for what you need'];

    case ErrorType.RATE_LIMIT:
      return [
        `Wait ${response?.retryAfter || 60} seconds before trying again`,
        'Slow down your actions',
        'Upgrade your plan for higher limits',
      ];

    case ErrorType.SERVER:
      return [
        'Try again in a few moments',
        'Check our status page',
        'Contact support with reference number',
      ];

    case ErrorType.VALIDATION:
      return ['Fix the errors highlighted above', 'Check all required fields', 'Verify your input format'];

    default:
      return ['Try again', 'Refresh the page', 'Contact support if the problem persists'];
  }
}

// ============================================================================
// RETRY LOGIC
// ============================================================================

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  attemptNumber: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  if (!config.useExponentialBackoff) {
    return config.initialDelay;
  }

  const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attemptNumber - 1);
  return Math.min(delay, config.maxDelay);
}

/**
 * Execute function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: AppError) => void
): Promise<T> {
  let lastError: AppError | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = createAppError(error);

      // Don't retry if error is not retryable
      if (!lastError.retryable) {
        throw lastError;
      }

      // Don't retry if we've hit max attempts
      if (attempt >= config.maxAttempts) {
        throw lastError;
      }

      // Call onRetry callback
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      // Wait before retrying
      const delay = calculateRetryDelay(attempt, config);
      await sleep(delay);
    }
  }

  // Should never reach here, but TypeScript needs it
  throw lastError;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// ERROR PARSING
// ============================================================================

/**
 * Parse fetch response error
 */
export async function parseFetchError(response: Response): Promise<AppError> {
  try {
    const data = await response.json();

    if (isAPIErrorResponse(data)) {
      return createAPIError({ ...data, statusCode: response.status });
    }

    return createAPIError(
      {
        error: 'API Error',
        message: data.message || response.statusText,
        statusCode: response.status,
      }
    );
  } catch {
    // Failed to parse JSON
    return createAPIError({
      error: 'API Error',
      message: response.statusText,
      statusCode: response.status,
    });
  }
}

/**
 * Parse axios error
 */
export function parseAxiosError(error: any): AppError {
  if (error.response) {
    // Server responded with error status
    const data = error.response.data;
    return createAPIError({
      ...data,
      statusCode: error.response.status,
    });
  } else if (error.request) {
    // Request was made but no response
    return createNetworkError(error);
  } else {
    // Something else happened
    return createGenericError(error);
  }
}

// ============================================================================
// REFERENCE NUMBER GENERATION
// ============================================================================

/**
 * Generate unique reference number for error
 * Format: ERR-YYYYMMDD-XXXXXX
 */
function generateReferenceNumber(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ERR-${dateStr}-${random}`;
}

// ============================================================================
// ERROR ICON MAPPING
// ============================================================================

/**
 * Get icon name for error type
 */
export function getErrorIcon(type: ErrorType): string {
  switch (type) {
    case ErrorType.NETWORK:
      return 'wifi-off';
    case ErrorType.SERVER:
      return 'server-crash';
    case ErrorType.AUTHENTICATION:
      return 'lock';
    case ErrorType.AUTHORIZATION:
      return 'shield-alert';
    case ErrorType.NOT_FOUND:
      return 'search-x';
    case ErrorType.RATE_LIMIT:
      return 'clock-alert';
    case ErrorType.VALIDATION:
      return 'alert-circle';
    default:
      return 'alert-triangle';
  }
}

/**
 * Get data-testid for error icon
 */
export function getErrorIconTestId(type: ErrorType): string {
  switch (type) {
    case ErrorType.NETWORK:
      return 'error-icon-network';
    case ErrorType.SERVER:
      return 'error-icon-server';
    case ErrorType.VALIDATION:
      return 'error-icon-validation';
    default:
      return 'error-icon';
  }
}

// ============================================================================
// ERROR FILTERING AND DEDUPLICATION
// ============================================================================

/**
 * Check if two errors are the same
 */
export function isSameError(error1: AppError, error2: AppError): boolean {
  return (
    error1.type === error2.type &&
    error1.message === error2.message &&
    error1.statusCode === error2.statusCode
  );
}

/**
 * Deduplicate array of errors
 */
export function deduplicateErrors(errors: AppError[]): AppError[] {
  const seen = new Map<string, AppError>();

  for (const error of errors) {
    const key = `${error.type}-${error.message}-${error.statusCode}`;
    if (!seen.has(key)) {
      seen.set(key, error);
    } else {
      // Update retry count if we've seen this error multiple times
      const existing = seen.get(key)!;
      existing.retryCount = (existing.retryCount || 0) + 1;
    }
  }

  return Array.from(seen.values());
}

// ============================================================================
// ERROR CONTEXT HELPERS
// ============================================================================

/**
 * Sanitize sensitive data from error context
 */
export function sanitizeContext(context?: Record<string, any>): Record<string, any> {
  if (!context) return {};

  const sanitized = { ...context };
  const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'creditCard', 'ssn'];

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }

  return sanitized;
}
