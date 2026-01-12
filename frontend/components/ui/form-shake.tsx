'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * FormShake Component
 * Issue #152: Micro-Interactions & Animations
 *
 * Provides shake animation for forms when validation fails.
 * Wraps form elements and triggers shake on error state.
 *
 * Features:
 * - 400ms shake animation on validation errors
 * - Automatic animation reset
 * - WCAG 2.2.2 compliant (reduced motion support via CSS)
 * - Can be triggered manually or via error prop
 *
 * Usage:
 * ```tsx
 * <FormShake error={hasErrors}>
 *   <form>...</form>
 * </FormShake>
 * ```
 */

export interface FormShakeProps {
  children: React.ReactNode;
  error?: boolean;
  className?: string;
  onAnimationEnd?: () => void;
}

export function FormShake({
  children,
  error = false,
  className,
  onAnimationEnd
}: FormShakeProps) {
  const [shouldShake, setShouldShake] = React.useState(false);

  // Trigger shake animation when error becomes true
  React.useEffect(() => {
    if (error) {
      setShouldShake(true);
      const timer = setTimeout(() => {
        setShouldShake(false);
        onAnimationEnd?.();
      }, 400); // Duration matches shake animation in animations.css
      return () => clearTimeout(timer);
    }
  }, [error, onAnimationEnd]);

  return (
    <div
      className={cn(
        shouldShake && 'animate-shake',
        className
      )}
      data-shake-active={shouldShake}
    >
      {children}
    </div>
  );
}

/**
 * Hook to manage form shake state
 *
 * Usage:
 * ```tsx
 * const { shake, triggerShake } = useFormShake();
 *
 * const handleSubmit = (e) => {
 *   if (hasErrors) {
 *     triggerShake();
 *   }
 * };
 *
 * return <FormShake error={shake}>...</FormShake>
 * ```
 */
export function useFormShake() {
  const [shake, setShake] = React.useState(false);

  const triggerShake = React.useCallback(() => {
    setShake(true);
    const timer = setTimeout(() => setShake(false), 400);
    return () => clearTimeout(timer);
  }, []);

  return { shake, triggerShake };
}
