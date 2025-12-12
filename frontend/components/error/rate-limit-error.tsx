/**
 * Rate Limit Error Component (429)
 * Displays rate limiting errors with countdown
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export interface RateLimitErrorProps {
  retryAfter: number; // seconds
  usageStats?: {
    current: number;
    limit: number;
    resetAt?: Date;
  };
}

export function RateLimitError({ retryAfter, usageStats }: RateLimitErrorProps) {
  const [timeLeft, setTimeLeft] = useState(retryAfter);

  useEffect(() => {
    if (timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
      <Alert className="max-w-md border-orange-500 bg-orange-50 dark:bg-orange-900/10" data-testid="rate-limit-error">
        <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        <AlertTitle className="text-orange-900 dark:text-orange-100">
          Too Many Requests
        </AlertTitle>
        <AlertDescription className="text-orange-800 dark:text-orange-200">
          <p className="mb-4">
            You've made too many requests. Please wait before trying again.
          </p>

          {/* Countdown */}
          <div className="bg-orange-100 dark:bg-orange-900/20 rounded-lg p-3 mb-4 text-center">
            <p className="text-sm font-medium">Try again in:</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {formatTime(timeLeft)}
            </p>
          </div>

          {/* Usage Stats */}
          {usageStats && (
            <div className="mb-4 space-y-2">
              <p className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Usage Statistics
              </p>
              <div className="text-sm">
                <p>
                  Requests: <strong>{usageStats.current}</strong> / {usageStats.limit}
                </p>
                {usageStats.resetAt && (
                  <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                    Resets at {usageStats.resetAt.toLocaleTimeString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Retry Button (disabled until countdown ends) */}
          <Button disabled={timeLeft > 0} size="sm" className="w-full">
            {timeLeft > 0 ? `Wait ${formatTime(timeLeft)}` : 'Retry Now'}
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
