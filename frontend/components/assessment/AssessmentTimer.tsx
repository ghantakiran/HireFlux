/**
 * AssessmentTimer Component - Sprint 19-20 Week 38 Day 2
 *
 * Reusable countdown timer for candidate assessments with:
 * - Color-coded warnings (green > 10min, yellow 5-10min, red < 5min)
 * - Warning callbacks at 5min and 1min
 * - Auto-submit on expiry
 * - WCAG 2.1 AA compliant accessibility
 * - Visual feedback (pulsing when < 1min)
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Clock } from 'lucide-react';

export interface AssessmentTimerProps {
  /** Time remaining in seconds */
  timeRemaining: number;
  /** Callback when timer reaches zero */
  onTimeExpired: () => void;
  /** Optional callback when reaching warning thresholds (5min, 1min) */
  onWarning?: (minutesLeft: number) => void;
  /** Optional CSS classes */
  className?: string;
}

export function AssessmentTimer({
  timeRemaining: initialTime,
  onTimeExpired,
  onWarning,
  className = '',
}: AssessmentTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);
  const [warningsFired, setWarningsFired] = useState<Set<number>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Update timer when prop changes
  useEffect(() => {
    setTimeRemaining(initialTime);
  }, [initialTime]);

  // Countdown logic
  useEffect(() => {
    if (timeRemaining <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      onTimeExpired();
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        const newTime = prev - 1;

        // Check for warning thresholds
        if (onWarning) {
          const minutes = Math.floor(newTime / 60);

          // Fire warnings at 5min and 1min (only once per threshold)
          if (minutes === 5 && !warningsFired.has(5) && newTime === 300) {
            setWarningsFired(prev => new Set(prev).add(5));
            onWarning(5);
          } else if (minutes === 1 && !warningsFired.has(1) && newTime === 60) {
            setWarningsFired(prev => new Set(prev).add(1));
            onWarning(1);
          }
        }

        return newTime > 0 ? newTime : 0;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeRemaining, onTimeExpired, onWarning, warningsFired]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get aria-label with descriptive time
  const getAriaLabel = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    const minuteText = mins === 1 ? '1 minute' : `${mins} minutes`;
    const secondText = secs === 1 ? '1 second' : `${secs} seconds`;

    if (mins === 0) {
      return `${secondText} remaining`;
    } else if (secs === 0) {
      return `${minuteText} remaining`;
    } else {
      return `${minuteText} ${secondText} remaining`;
    }
  };

  // Determine color based on time remaining
  const getColorClass = (): string => {
    if (timeRemaining > 600) {
      return 'text-green-600 dark:text-green-400'; // > 10 minutes
    } else if (timeRemaining > 300) {
      return 'text-yellow-600 dark:text-yellow-400'; // 5-10 minutes
    } else {
      return 'text-red-600 dark:text-red-400'; // < 5 minutes
    }
  };

  // Determine if should pulse (< 1 minute)
  const shouldPulse = timeRemaining < 60 && timeRemaining > 0;

  // Determine if should be bold (< 5 minutes)
  const shouldBeBold = timeRemaining < 300;

  return (
    <div
      className={`flex items-center gap-2 ${shouldPulse ? 'animate-pulse' : ''} ${className}`}
      aria-label={getAriaLabel(timeRemaining)}
    >
      <Clock className={`h-5 w-5 ${getColorClass()}`} aria-hidden="true" />
      <span
        className={`text-lg ${getColorClass()} ${shouldBeBold ? 'font-bold' : 'font-medium'} tabular-nums`}
        role="timer"
        aria-live="polite"
        aria-atomic="true"
      >
        {formatTime(timeRemaining)}
      </span>
    </div>
  );
}
