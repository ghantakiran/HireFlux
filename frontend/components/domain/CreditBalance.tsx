/**
 * CreditBalance Component (Issue #94)
 *
 * Displays credit usage visualization with progress bar and balance information
 * Used in job seeker dashboard for tracking auto-apply credits and other usage-based features
 */

'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Plus } from 'lucide-react';
import { format } from 'date-fns';

export interface CreditBalanceProps {
  /** Current credit balance */
  current: number;
  /** Total credit allocation */
  total: number;
  /** Optional title */
  title?: string;
  /** Optional description */
  description?: string;
  /** Renewal date for credits */
  renewalDate?: Date;
  /** Whether to show low balance warning */
  showWarning?: boolean;
  /** Warning threshold percentage (default: 25) */
  warningThreshold?: number;
  /** Whether to show used credits */
  showUsed?: boolean;
  /** Callback when buy more credits clicked */
  onBuyMore?: () => void;
  /** Visual variant */
  variant?: 'default' | 'compact' | 'card';
  /** Loading state */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get progress bar color based on balance percentage
 */
function getBalanceColor(percentage: number): string {
  if (percentage > 75) return 'bg-success-500';
  if (percentage >= 25) return 'bg-accent-500';
  return 'bg-error';
}

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function CreditBalance({
  current,
  total,
  title = 'Credits',
  description,
  renewalDate,
  showWarning = false,
  warningThreshold = 25,
  showUsed = false,
  onBuyMore,
  variant = 'default',
  loading = false,
  className,
}: CreditBalanceProps) {
  // Clamp current to valid range
  const clampedCurrent = Math.max(0, Math.min(current, total));

  // Calculate percentage
  const percentage = total > 0 ? (clampedCurrent / total) * 100 : 0;

  // Calculate used credits
  const used = total - clampedCurrent;

  // Check if balance is low
  const isLowBalance = percentage < warningThreshold;

  // Determine container classes based on variant
  const containerClasses = cn(
    'w-full',
    {
      'rounded-lg border border-border bg-card p-4 shadow-sm': variant === 'card',
      'p-4': variant === 'default',
      'p-2': variant === 'compact',
    },
    className
  );

  return (
    <div
      data-credit-balance
      data-variant={variant}
      className={containerClasses}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between">
        <div className="flex-1">
          {title && (
            <h3 className={cn('font-semibold text-foreground', variant === 'compact' ? 'text-sm' : 'text-base')}>
              {title}
            </h3>
          )}
          {description && (
            <p className={cn('text-muted-foreground', variant === 'compact' ? 'text-xs mt-0.5' : 'text-sm mt-1')}>
              {description}
            </p>
          )}
        </div>

        {/* Buy More Button */}
        {onBuyMore && (
          <Button
            onClick={onBuyMore}
            disabled={loading}
            size="sm"
            variant="outline"
            aria-label="Buy more credits"
          >
            <Plus className="h-4 w-4 mr-1" />
            Buy More
          </Button>
        )}
      </div>

      {/* Credit Balance Display */}
      <div className={cn('mb-3', loading && 'opacity-50')}>
        {loading && (
          <div
            role="status"
            aria-label="Loading"
            className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg"
          >
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}

        <div className="flex items-baseline gap-1">
          <span className={cn('font-bold text-foreground', variant === 'compact' ? 'text-2xl' : 'text-3xl')}>
            {formatNumber(clampedCurrent)}
          </span>
          <span className="text-muted-foreground">/ {formatNumber(total)}</span>
        </div>

        {showUsed && used > 0 && (
          <p className={cn('text-muted-foreground', variant === 'compact' ? 'text-xs' : 'text-sm')}>
            {formatNumber(used)} used
          </p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div
          data-credit-progress
          role="progressbar"
          aria-label={`Credit balance: ${clampedCurrent} of ${total} credits remaining`}
          aria-valuenow={clampedCurrent}
          aria-valuemin={0}
          aria-valuemax={total}
          className="h-2 w-full rounded-full bg-muted overflow-hidden"
        >
          <div
            data-credit-fill
            className={cn(
              'h-full transition-all duration-300',
              getBalanceColor(percentage)
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Renewal Date */}
      {renewalDate && (
        <p className={cn('text-muted-foreground mb-3', variant === 'compact' ? 'text-xs' : 'text-sm')}>
          Renews on {format(renewalDate, 'MMM d, yyyy')}
        </p>
      )}

      {/* Low Balance Warning */}
      {showWarning && isLowBalance && !loading && (
        <Alert variant="destructive" className="mt-3">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Low credit balance! {onBuyMore ? 'Consider purchasing more credits.' : 'Credits will renew soon.'}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
