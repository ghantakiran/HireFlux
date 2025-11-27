/**
 * EmptyState Component (Issue #94)
 *
 * Reusable component for displaying empty data states with optional actions
 * Used across job seeker and employer dashboards for empty lists, search results, etc.
 */

'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { FileQuestion, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export interface EmptyStateProps {
  /** Main title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Custom icon to display */
  icon?: ReactNode;
  /** Whether to show icon */
  showIcon?: boolean;
  /** Primary action button label */
  actionLabel?: string;
  /** Primary action callback */
  onAction?: () => void;
  /** Whether primary action is disabled */
  actionDisabled?: boolean;
  /** Secondary action button label */
  secondaryActionLabel?: string;
  /** Secondary action callback */
  onSecondaryAction?: () => void;
  /** Visual variant */
  variant?: 'default' | 'compact' | 'card';
  /** State for color coding */
  state?: 'info' | 'error' | 'success' | 'warning';
  /** Custom content to render below description */
  children?: ReactNode;
  /** Custom ARIA label */
  ariaLabel?: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get default icon based on state
 */
function getDefaultIcon(state: EmptyStateProps['state']): ReactNode {
  switch (state) {
    case 'error':
      return <AlertCircle className="h-12 w-12 text-error" />;
    case 'success':
      return <CheckCircle2 className="h-12 w-12 text-success-500" />;
    case 'warning':
      return <AlertCircle className="h-12 w-12 text-warning" />;
    case 'info':
    default:
      return <FileQuestion className="h-12 w-12 text-muted-foreground" />;
  }
}

/**
 * Get title color based on state
 */
function getTitleColor(state: EmptyStateProps['state']): string {
  switch (state) {
    case 'error':
      return 'text-error';
    case 'success':
      return 'text-success-500';
    case 'warning':
      return 'text-warning';
    case 'info':
    default:
      return 'text-foreground';
  }
}

export function EmptyState({
  title,
  description,
  icon,
  showIcon = true,
  actionLabel,
  onAction,
  actionDisabled = false,
  secondaryActionLabel,
  onSecondaryAction,
  variant = 'default',
  state = 'info',
  children,
  ariaLabel,
  className,
}: EmptyStateProps) {
  const hasActions = Boolean(actionLabel && onAction) || Boolean(secondaryActionLabel && onSecondaryAction);

  // Determine container classes based on variant
  const containerClasses = cn(
    'flex flex-col items-center justify-center text-center space-y-4',
    {
      'py-12 px-4': variant === 'default',
      'py-6 px-4': variant === 'compact',
      'py-12 px-6 rounded-lg border border-border bg-card shadow-sm': variant === 'card',
    },
    className
  );

  return (
    <div
      data-empty-state
      data-variant={variant}
      data-state={state}
      role="status"
      aria-label={ariaLabel}
      className={containerClasses}
    >
      {/* Icon */}
      {showIcon && (
        <div data-empty-state-icon className="mb-2">
          {icon || getDefaultIcon(state)}
        </div>
      )}

      {/* Title */}
      <div>
        <h3 className={cn('text-lg font-semibold mb-2 break-words', getTitleColor(state))}>
          {title}
        </h3>

        {/* Description */}
        {description && (
          <p
            data-empty-state-description
            className="text-sm text-muted-foreground max-w-md mx-auto break-words"
          >
            {description}
          </p>
        )}
      </div>

      {/* Custom content */}
      {children && <div className="w-full max-w-md">{children}</div>}

      {/* Action buttons */}
      {hasActions && (
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          {actionLabel && onAction && (
            <Button
              onClick={onAction}
              disabled={actionDisabled}
              size="default"
            >
              {actionLabel}
            </Button>
          )}

          {secondaryActionLabel && onSecondaryAction && (
            <Button
              onClick={onSecondaryAction}
              variant="outline"
              size="default"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
