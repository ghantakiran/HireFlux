/**
 * Error Context Provider
 * Issue #138: Error States & Recovery Flows
 */

'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import {
  AppError,
  ErrorHandlerOptions,
  ErrorNotification,
  DEFAULT_RETRY_CONFIG,
  RetryConfig,
} from '@/lib/errors/types';
import {
  createAppError,
  withRetry,
  deduplicateErrors,
  sanitizeContext,
} from '@/lib/errors/error-utils';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// CONTEXT TYPES
// ============================================================================

interface ErrorContextType {
  /** Current error being displayed */
  currentError: AppError | null;

  /** All error notifications */
  notifications: ErrorNotification[];

  /** Handle an error */
  handleError: (error: unknown, options?: ErrorHandlerOptions) => void;

  /** Clear current error */
  clearError: () => void;

  /** Retry current error action */
  retry: () => Promise<void>;

  /** Dismiss error notification */
  dismissNotification: (id: string) => void;

  /** Mark notification as read */
  markAsRead: (id: string) => void;

  /** Clear all notifications */
  clearAllNotifications: () => void;

  /** Get unread count */
  unreadCount: number;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

interface ErrorProviderProps {
  children: React.ReactNode;
  /** Optional callback when error occurs */
  onError?: (error: AppError) => void;
  /** Optional Sentry DSN */
  sentryDsn?: string;
}

export function ErrorProvider({ children, onError, sentryDsn }: ErrorProviderProps) {
  const [currentError, setCurrentError] = useState<AppError | null>(null);
  const [notifications, setNotifications] = useState<ErrorNotification[]>([]);
  const [retryAction, setRetryAction] = useState<(() => Promise<void>) | null>(null);
  const { toast } = useToast();

  // Load notifications from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('error-notifications');
    if (stored) {
      try {
        const loaded = JSON.parse(stored);
        setNotifications(loaded.map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
        })));
      } catch (error) {
        console.error('Failed to load error notifications:', error);
      }
    }
  }, []);

  // Save notifications to localStorage when they change
  useEffect(() => {
    localStorage.setItem('error-notifications', JSON.stringify(notifications));
  }, [notifications]);

  /**
   * Handle an error
   */
  const handleError = useCallback(
    (error: unknown, options: ErrorHandlerOptions = {}) => {
      const appError = createAppError(error, sanitizeContext(options.sentryContext?.extra));

      // Apply custom message if provided
      if (options.customMessage) {
        appError.message = options.customMessage;
      }

      // Apply custom suggestions if provided
      if (options.suggestions) {
        appError.suggestions = options.suggestions.map((s) => s.text);
      }

      // Set as critical if specified
      if (options.critical) {
        appError.persistent = true;
      }

      // Call external error handler
      if (onError) {
        onError(appError);
      }

      // Log to Sentry if enabled
      if (options.logToSentry !== false && sentryDsn) {
        logToSentry(appError, options.sentryContext);
      }

      // Show toast notification if requested
      if (options.showToast) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: appError.message,
          duration: 5000,
        });
      }

      // Show full error UI if requested or if error is critical
      if (options.showErrorUI || appError.persistent) {
        setCurrentError(appError);
      }

      // Add to notifications if persistent or critical
      if (appError.persistent || options.persistent) {
        const notification: ErrorNotification = {
          id: uuidv4(),
          error: appError,
          createdAt: new Date(),
          read: false,
          dismissed: false,
          persistent: appError.persistent || false,
        };

        setNotifications((prev) => {
          const deduplicated = deduplicateErrors([...prev.map((n) => n.error), appError]);
          if (deduplicated.length === prev.length + 1) {
            // New unique error
            return [notification, ...prev];
          }
          // Duplicate error, update existing
          return prev;
        });
      }
    },
    [onError, sentryDsn, toast]
  );

  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setCurrentError(null);
    setRetryAction(null);
  }, []);

  /**
   * Retry current error action
   */
  const retry = useCallback(async () => {
    if (!currentError || !retryAction) return;

    try {
      await retryAction();
      clearError();

      // Show success toast
      toast({
        title: 'Success',
        description: 'Your action completed successfully.',
        duration: 3000,
      });
    } catch (error) {
      // Increment retry count
      const updatedError = {
        ...currentError,
        retryCount: (currentError.retryCount || 0) + 1,
      };
      setCurrentError(updatedError);

      // Show error toast
      toast({
        variant: 'destructive',
        title: 'Retry Failed',
        description: 'The action failed again. Please try later.',
        duration: 5000,
      });
    }
  }, [currentError, retryAction, clearError, toast]);

  /**
   * Dismiss notification
   */
  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, dismissed: true } : n
      )
    );

    // Remove dismissed notifications after animation
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 300);
  }, []);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
    );
  }, []);

  /**
   * Clear all notifications
   */
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    localStorage.removeItem('error-notifications');
  }, []);

  /**
   * Get unread notification count
   */
  const unreadCount = notifications.filter((n) => !n.read && !n.dismissed).length;

  const value: ErrorContextType = {
    currentError,
    notifications,
    handleError,
    clearError,
    retry,
    dismissNotification,
    markAsRead,
    clearAllNotifications,
    unreadCount,
  };

  return <ErrorContext.Provider value={value}>{children}</ErrorContext.Provider>;
}

// ============================================================================
// HOOK
// ============================================================================

export function useError() {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
}

// ============================================================================
// SENTRY INTEGRATION
// ============================================================================

function logToSentry(error: AppError, context?: any) {
  // For now, just log to window object for testing
  // In production, this would call Sentry.captureException()
  if (typeof window !== 'undefined') {
    if (!(window as any).__SENTRY_EVENTS__) {
      (window as any).__SENTRY_EVENTS__ = [];
    }
    (window as any).__SENTRY_EVENTS__.push({
      message: error.message,
      technicalMessage: error.technicalMessage,
      type: error.type,
      severity: error.severity,
      context: error.context,
      timestamp: error.timestamp,
    });
  }

  Sentry.captureException(error.originalError || new Error(error.message), {
    level: getSentryLevel(error.severity),
    tags: {
      errorType: error.type,
      statusCode: error.statusCode?.toString(),
    },
    extra: {
      ...error.context,
      referenceNumber: error.referenceNumber,
    },
    user: context?.user,
  });
}

function getSentryLevel(severity: string): 'fatal' | 'error' | 'warning' | 'info' {
  switch (severity) {
    case 'critical':
      return 'fatal';
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    default:
      return 'info';
  }
}

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Hook to execute async function with error handling
 */
export function useErrorHandler() {
  const { handleError } = useError();

  return useCallback(
    async <T,>(
      fn: () => Promise<T>,
      options?: ErrorHandlerOptions
    ): Promise<T | null> => {
      try {
        return await fn();
      } catch (error) {
        handleError(error, options);
        return null;
      }
    },
    [handleError]
  );
}

/**
 * Hook to execute async function with retry
 */
export function useRetry() {
  const { handleError } = useError();
  const { toast } = useToast();

  return useCallback(
    async <T,>(
      fn: () => Promise<T>,
      config: RetryConfig = DEFAULT_RETRY_CONFIG
    ): Promise<T | null> => {
      try {
        return await withRetry(fn, config, (attempt, error) => {
          toast({
            title: 'Retrying...',
            description: `Retry attempt ${attempt} of ${config.maxAttempts}`,
            duration: 2000,
          });
        });
      } catch (error) {
        handleError(error, { showToast: true });
        return null;
      }
    },
    [handleError, toast]
  );
}
