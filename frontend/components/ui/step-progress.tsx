'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  label: string;
}

interface StepProgressProps {
  steps: Step[];
  currentStep: number;
  className?: string;
}

export function StepProgress({ steps, currentStep, className }: StepProgressProps) {
  return (
    <div
      className={cn('w-full', className)}
      data-step-progress
      role="progressbar"
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-label={`Step ${currentStep + 1} of ${steps.length}: ${steps[currentStep]?.label ?? ''}`}
    >
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;

          return (
            <React.Fragment key={index}>
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-all duration-300',
                    isCompleted && 'border-blue-600 bg-blue-600 text-white',
                    isActive && 'border-blue-600 bg-white dark:bg-gray-900 text-blue-600 ring-4 ring-blue-100',
                    !isCompleted && !isActive && 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-500'
                  )}
                  data-step={index}
                  data-step-status={isCompleted ? 'completed' : isActive ? 'active' : 'upcoming'}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium transition-colors duration-300 text-center max-w-[80px]',
                    isCompleted && 'text-blue-600',
                    isActive && 'text-blue-600',
                    !isCompleted && !isActive && 'text-gray-500'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 mb-6">
                  <div className="h-0.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full bg-blue-600 transition-all duration-500 ease-out',
                        index < currentStep ? 'w-full' : 'w-0'
                      )}
                    />
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
