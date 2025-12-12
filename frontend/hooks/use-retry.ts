/**
 * Retry Hook
 * Provides retry functionality with exponential backoff for React components
 */

'use client';

import { useState, useCallback } from 'react';
import { RetryManager } from '@/lib/retry-utils';

export function useRetry<T = any>() {
  const [isRetrying, setIsRetrying] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [retryManager] = useState(() => new RetryManager());

  const retry = useCallback(
    async (fn: () => Promise<T>): Promise<T> => {
      setIsRetrying(true);
      setError(null);

      try {
        const result = await retryManager.execute(fn);
        setAttemptCount(0);
        return result;
      } catch (err) {
        setError(err as Error);
        setAttemptCount(retryManager.getAttemptCount());
        throw err;
      } finally {
        setIsRetrying(false);
      }
    },
    [retryManager]
  );

  const reset = useCallback(() => {
    retryManager.reset();
    setAttemptCount(0);
    setError(null);
    setIsRetrying(false);
  }, [retryManager]);

  return {
    retry,
    reset,
    isRetrying,
    attemptCount,
    error,
    canRetry: retryManager.canRetry(),
    nextDelay: retryManager.getNextDelay(),
  };
}
