/**
 * OnboardingChecklist Component (Issue #94)
 *
 * Progress tracking component for user onboarding with step completion
 * Used on job seeker and employer dashboards to guide initial setup
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Check, Circle, ChevronUp, ChevronDown, X } from 'lucide-react';

export interface OnboardingStep {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  actionLabel?: string;
}

export interface OnboardingChecklistProps {
  /** Onboarding steps to display */
  steps: OnboardingStep[];
  /** Optional title for the checklist */
  title?: string;
  /** Callback when step is clicked (only for incomplete steps) */
  onStepClick?: (stepId: string) => void;
  /** Callback when step action button is clicked */
  onStepAction?: (stepId: string) => void;
  /** Callback when checklist is dismissed */
  onDismiss?: () => void;
  /** Whether the checklist can be collapsed */
  collapsible?: boolean;
  /** Visual variant */
  variant?: 'default' | 'compact' | 'card';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Calculate completion percentage
 */
function calculateProgress(steps: OnboardingStep[]): number {
  if (steps.length === 0) return 0;
  const completedCount = steps.filter((s) => s.completed).length;
  return Math.round((completedCount / steps.length) * 100);
}

export function OnboardingChecklist({
  steps,
  title = 'Getting Started',
  onStepClick,
  onStepAction,
  onDismiss,
  collapsible = false,
  variant = 'default',
  className,
}: OnboardingChecklistProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const progress = calculateProgress(steps);
  const isComplete = progress === 100;

  const handleStepClick = (step: OnboardingStep) => {
    if (!step.completed && onStepClick) {
      onStepClick(step.id);
    }
  };

  const handleActionClick = (e: React.MouseEvent, stepId: string) => {
    e.stopPropagation();
    if (onStepAction) {
      onStepAction(stepId);
    }
  };

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
      data-onboarding-checklist
      data-variant={variant}
      role="region"
      aria-label="Onboarding checklist"
      className={containerClasses}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">
            {isComplete ? (
              <span className="text-success-500 font-medium">All set! 🎉</span>
            ) : (
              `${progress}% complete`
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {collapsible && (
            <Button
              onClick={() => setIsCollapsed(!isCollapsed)}
              variant="ghost"
              size="sm"
              aria-label={isCollapsed ? 'Show checklist' : 'Hide checklist'}
            >
              {isCollapsed ? (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show
                </>
              ) : (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Hide
                </>
              )}
            </Button>
          )}

          {onDismiss && (
            <Button
              onClick={onDismiss}
              variant="ghost"
              size="icon"
              aria-label="Dismiss checklist"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <Progress
          value={progress}
          data-progress-bar
          aria-label={`Onboarding progress: ${progress}%`}
          className="h-2"
        >
          <div
            data-progress-fill
            className="h-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </Progress>
      </div>

      {/* Steps */}
      {!isCollapsed && (
        <div className="space-y-3">
          {steps.map((step) => {
            const isClickable = !step.completed && onStepClick;

            return (
              <div
                key={step.id}
                data-step-id={step.id}
                onClick={() => isClickable && handleStepClick(step)}
                className={cn(
                  'flex items-start gap-3 rounded-md p-3 transition-all',
                  step.completed && 'opacity-75',
                  isClickable && 'cursor-pointer hover:bg-accent/10',
                  variant === 'compact' && 'p-2'
                )}
              >
                {/* Status Indicator */}
                <div
                  data-step-completed={step.completed}
                  className={cn(
                    'flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full transition-colors',
                    step.completed
                      ? 'bg-success-500 text-white'
                      : 'border-2 border-muted-foreground'
                  )}
                >
                  {step.completed ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Circle className="h-3 w-3 fill-current opacity-0" />
                  )}
                </div>

                {/* Step Content */}
                <div className="flex-1 min-w-0">
                  <h4
                    className={cn(
                      'font-medium break-words',
                      step.completed ? 'text-muted-foreground line-through' : 'text-foreground',
                      variant === 'compact' ? 'text-sm' : 'text-base'
                    )}
                  >
                    {step.title}
                  </h4>
                  {step.description && (
                    <p
                      className={cn(
                        'text-muted-foreground break-words',
                        variant === 'compact' ? 'text-xs mt-0.5' : 'text-sm mt-1'
                      )}
                    >
                      {step.description}
                    </p>
                  )}

                  {/* Action Button */}
                  {!step.completed && step.actionLabel && onStepAction && (
                    <Button
                      onClick={(e) => handleActionClick(e, step.id)}
                      size="sm"
                      variant="outline"
                      className="mt-2"
                    >
                      {step.actionLabel}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
