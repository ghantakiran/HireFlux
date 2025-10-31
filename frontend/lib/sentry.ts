/**
 * Sentry Error Tracking Configuration
 *
 * Provides comprehensive error tracking and performance monitoring
 * for the HireFlux frontend application.
 */

import * as Sentry from '@sentry/nextjs';

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;
const ENVIRONMENT = process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || 'development';

/**
 * Initialize Sentry for error tracking
 */
export function initializeSentry() {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,

    // Performance Monitoring
    tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0, // 10% in production, 100% in dev

    // Session Replay (if available in your Sentry version)
    // replaysSessionSampleRate: 0.1, // 10% of sessions
    // replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Additional configuration
    enabled: ENVIRONMENT !== 'development',
    debug: ENVIRONMENT === 'development',

    // Integrations - simplified for compatibility
    // Note: Advanced integrations like BrowserTracing and Replay may require
    // specific Sentry package versions. Uncomment if available.
    // integrations: [],

    // Filter out sensitive data
    beforeSend(event, hint) {
      // Remove sensitive user data
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }

      // Filter out known errors that aren't actionable
      const error = hint.originalException;
      if (error && typeof error === 'object' && 'message' in error) {
        const message = String(error.message);

        // Ignore network errors (user's connection issues)
        if (message.includes('NetworkError') || message.includes('Failed to fetch')) {
          return null;
        }

        // Ignore browser extension errors
        if (message.includes('extension://')) {
          return null;
        }
      }

      return event;
    },

    // Ignore specific errors
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      'chrome-extension://',
      'moz-extension://',

      // Random network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',

      // Safari-specific
      'Non-Error promise rejection captured',
    ],

    // Deny URLs (don't send errors from these scripts)
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });

  console.log('Sentry initialized for environment:', ENVIRONMENT);
}

/**
 * Capture an exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext('custom', context);
  }
  Sentry.captureException(error);
}

/**
 * Capture a message manually
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; name?: string } | null) {
  if (user) {
    Sentry.setUser({
      id: user.id,
      username: user.name,
      // Note: We don't send email to Sentry for privacy
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a performance transaction
 * Note: Simplified version for compatibility
 */
export function startTransaction(name: string, op: string) {
  // Using startSpan instead of startTransaction for newer Sentry versions
  // If this API is not available, it will be a no-op
  if (typeof Sentry.startSpan === 'function') {
    return Sentry.startSpan({ name, op }, (span) => span);
  }
  // Fallback: return a mock transaction object
  return {
    finish: () => {},
    setStatus: () => {},
    setData: () => {},
  };
}

/**
 * Custom error boundary component
 */
export { ErrorBoundary } from '@sentry/nextjs';
