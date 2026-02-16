/**
 * API Error Handler Utilities (Issue #138)
 *
 * Centralized error handling for API requests with
 * friendly error messages and retry logic.
 */

import { captureException } from './sentry';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export class ApiException extends Error implements ApiError {
  status?: number;
  code?: string;
  details?: any;

  constructor(message: string, status?: number, code?: string, details?: any) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Handle API errors and return user-friendly messages
 */
export function handleApiError(error: unknown): ApiError {
  // Already an ApiException
  if (error instanceof ApiException) {
    return error;
  }

  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      message: "Unable to connect to the server. Please check your internet connection.",
      status: 0,
      code: 'NETWORK_ERROR',
    };
  }

  // HTTP errors
  if (error && typeof error === 'object' && 'status' in error) {
    const httpError = error as { status: number; statusText?: string; data?: any };
    const status = httpError.status;
    const data = httpError.data;

    switch (status) {
      case 400:
        return {
          message: data?.message || 'Invalid request. Please check your input.',
          status,
          code: 'BAD_REQUEST',
          details: data,
        };

      case 401:
        return {
          message: 'Your session has expired. Please sign in again.',
          status,
          code: 'UNAUTHORIZED',
        };

      case 403:
        return {
          message: "You don't have permission to perform this action.",
          status,
          code: 'FORBIDDEN',
        };

      case 404:
        return {
          message: 'The requested resource was not found.',
          status,
          code: 'NOT_FOUND',
        };

      case 409:
        return {
          message: data?.message || 'This resource already exists.',
          status,
          code: 'CONFLICT',
          details: data,
        };

      case 422:
        return {
          message: data?.message || 'Validation failed. Please check your input.',
          status,
          code: 'VALIDATION_ERROR',
          details: data,
        };

      case 429:
        return {
          message: "You're sending too many requests. Please slow down and try again.",
          status,
          code: 'RATE_LIMIT',
        };

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          message: "We're experiencing technical difficulties. Please try again later.",
          status,
          code: 'SERVER_ERROR',
        };

      default:
        return {
          message: 'An unexpected error occurred. Please try again.',
          status,
          code: 'UNKNOWN_ERROR',
        };
    }
  }

  // Generic errors
  if (error instanceof Error) {
    return {
      message: error.message || 'An unexpected error occurred.',
      code: 'GENERIC_ERROR',
    };
  }

  // Unknown error type
  return {
    message: 'An unexpected error occurred. Please try again.',
    code: 'UNKNOWN_ERROR',
  };
}

/**
 * Retry logic for failed API requests
 */
export async function retryRequest<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    delayMs?: number;
    backoff?: boolean;
    shouldRetry?: (error: any, attempt: number) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    backoff = true,
    shouldRetry = defaultShouldRetry,
  } = options;

  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!shouldRetry(error, attempt) || attempt === maxRetries) {
        break;
      }

      // Calculate delay with optional exponential backoff
      const delay = backoff ? delayMs * Math.pow(2, attempt - 1) : delayMs;

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Log final failure to Sentry
  captureException(lastError, {
    context: 'API Retry Failed',
    maxRetries,
    finalAttempt: true,
  });

  throw lastError;
}

/**
 * Default retry logic: retry on network errors and 5xx status codes
 */
function defaultShouldRetry(error: any, attempt: number): boolean {
  // Always retry network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // Retry server errors (5xx)
  if (error && typeof error === 'object' && 'status' in error) {
    const status = error.status as number;
    return status >= 500 && status < 600;
  }

  // Don't retry other errors
  return false;
}

/**
 * Timeout wrapper for API requests
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle!);
  }
}

/**
 * Log API errors consistently
 */
export function logApiError(error: unknown, context?: Record<string, any>) {
  const apiError = handleApiError(error);

  console.error('API Error:', {
    message: apiError.message,
    status: apiError.status,
    code: apiError.code,
    details: apiError.details,
    context,
  });

  // Send to Sentry if it's a significant error
  if (apiError.status && apiError.status >= 500) {
    captureException(error instanceof Error ? error : new Error(apiError.message), {
      ...context,
      apiError,
    });
  }
}
