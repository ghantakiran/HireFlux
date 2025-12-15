/**
 * Error handling types and interfaces for HireFlux
 * Issue #138: Error States & Recovery Flows
 */

// ============================================================================
// ERROR TYPES
// ============================================================================

export enum ErrorType {
  NETWORK = 'network',
  API = 'api',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  RATE_LIMIT = 'rate_limit',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown',
}

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

// ============================================================================
// ERROR INTERFACES
// ============================================================================

export interface AppError {
  /** Unique error identifier */
  id: string;

  /** Error type category */
  type: ErrorType;

  /** Severity level */
  severity: ErrorSeverity;

  /** User-friendly error message */
  message: string;

  /** Technical error details (not shown to user) */
  technicalMessage?: string;

  /** HTTP status code (if applicable) */
  statusCode?: number;

  /** Recovery suggestions for the user */
  suggestions?: string[];

  /** Whether this error can be retried */
  retryable: boolean;

  /** Retry attempt count */
  retryCount?: number;

  /** Maximum retry attempts allowed */
  maxRetries?: number;

  /** Delay before next retry (milliseconds) */
  retryDelay?: number;

  /** Reference number for support */
  referenceNumber?: string;

  /** Timestamp when error occurred */
  timestamp: Date;

  /** Additional context data */
  context?: Record<string, any>;

  /** Original error object */
  originalError?: Error;

  /** Whether error should persist across navigation */
  persistent?: boolean;
}

export interface APIErrorResponse {
  error: string;
  message?: string;
  errors?: Record<string, string[]>; // Field-level validation errors
  statusCode?: number;
  retryAfter?: number; // For rate limiting (seconds)
  estimatedRestoreTime?: string; // For maintenance
  critical?: boolean; // Whether error is critical
}

// ============================================================================
// RETRY CONFIGURATION
// ============================================================================

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;

  /** Initial delay in milliseconds */
  initialDelay: number;

  /** Backoff multiplier for exponential backoff */
  backoffMultiplier: number;

  /** Maximum delay between retries */
  maxDelay: number;

  /** Whether to use exponential backoff */
  useExponentialBackoff: boolean;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  backoffMultiplier: 2,
  maxDelay: 10000, // 10 seconds
  useExponentialBackoff: true,
};

// ============================================================================
// ERROR RECOVERY
// ============================================================================

export interface RecoverySuggestion {
  /** Suggestion text */
  text: string;

  /** Action to perform (optional) */
  action?: {
    label: string;
    onClick: () => void | Promise<void>;
  };

  /** Icon to display */
  icon?: string;
}

export interface ErrorRecoveryOptions {
  /** Custom retry handler */
  onRetry?: () => void | Promise<void>;

  /** Custom dismiss handler */
  onDismiss?: () => void;

  /** Whether to show retry button */
  showRetry?: boolean;

  /** Whether to show dismiss button */
  showDismiss?: boolean;

  /** Custom recovery suggestions */
  suggestions?: RecoverySuggestion[];

  /** Whether to auto-retry */
  autoRetry?: boolean;

  /** Retry configuration */
  retryConfig?: RetryConfig;
}

// ============================================================================
// OFFLINE STATE
// ============================================================================

export interface OfflineState {
  /** Whether currently offline */
  isOffline: boolean;

  /** When went offline */
  offlineSince?: Date;

  /** When came back online */
  onlineSince?: Date;

  /** Actions queued while offline */
  queuedActions: QueuedAction[];
}

export interface QueuedAction {
  /** Unique ID */
  id: string;

  /** Action type */
  type: string;

  /** Action payload */
  payload: any;

  /** When queued */
  queuedAt: Date;

  /** Whether action was processed */
  processed: boolean;

  /** Error if processing failed */
  error?: AppError;
}

// ============================================================================
// ERROR BOUNDARY STATE
// ============================================================================

export interface ErrorBoundaryState {
  /** Whether error was caught */
  hasError: boolean;

  /** Caught error */
  error?: Error;

  /** Error info from React */
  errorInfo?: React.ErrorInfo;

  /** Retry count */
  retryCount: number;

  /** Component that errored */
  componentName?: string;
}

// ============================================================================
// SENTRY INTEGRATION
// ============================================================================

export interface SentryErrorContext {
  /** User information */
  user?: {
    id?: string;
    email?: string;
    username?: string;
  };

  /** Error tags */
  tags?: Record<string, string>;

  /** Extra context data */
  extra?: Record<string, any>;

  /** Breadcrumbs */
  breadcrumbs?: SentryBreadcrumb[];

  /** Error level */
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

export interface SentryBreadcrumb {
  /** Breadcrumb type */
  type?: 'default' | 'navigation' | 'http' | 'user' | 'error';

  /** Category */
  category?: string;

  /** Message */
  message: string;

  /** Data */
  data?: Record<string, any>;

  /** Timestamp */
  timestamp: number;

  /** Level */
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug';
}

// ============================================================================
// ERROR HANDLER OPTIONS
// ============================================================================

export interface ErrorHandlerOptions {
  /** Whether to log to Sentry */
  logToSentry?: boolean;

  /** Whether to show toast notification */
  showToast?: boolean;

  /** Whether to show full error UI */
  showErrorUI?: boolean;

  /** Custom error message */
  customMessage?: string;

  /** Custom recovery suggestions */
  suggestions?: RecoverySuggestion[];

  /** Sentry context */
  sentryContext?: SentryErrorContext;

  /** Whether error is critical */
  critical?: boolean;

  /** Whether to persist error across navigation */
  persistent?: boolean;
}

// ============================================================================
// VALIDATION ERRORS
// ============================================================================

export interface ValidationError {
  /** Field name */
  field: string;

  /** Error message */
  message: string;

  /** Field value that failed validation */
  value?: any;

  /** Validation rule that failed */
  rule?: string;
}

export interface ValidationResult {
  /** Whether validation passed */
  valid: boolean;

  /** Validation errors */
  errors: ValidationError[];
}

// ============================================================================
// ERROR NOTIFICATION
// ============================================================================

export interface ErrorNotification {
  /** Notification ID */
  id: string;

  /** Error that triggered notification */
  error: AppError;

  /** When notification was created */
  createdAt: Date;

  /** Whether notification was read */
  read: boolean;

  /** Whether notification was dismissed */
  dismissed: boolean;

  /** Whether notification should persist */
  persistent: boolean;
}

// ============================================================================
// TYPE GUARDS
// ============================================================================

export function isAppError(error: unknown): error is AppError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'id' in error &&
    'type' in error &&
    'message' in error
  );
}

export function isAPIErrorResponse(response: unknown): response is APIErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response
  );
}

export function isNetworkError(error: unknown): error is Error {
  if (error instanceof Error) {
    return (
      error.message.includes('network') ||
      error.message.includes('fetch') ||
      error.message.includes('Network request failed')
    );
  }
  return false;
}
