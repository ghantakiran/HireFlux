/**
 * AssessmentProgress Component - Sprint 19-20 Week 38 Day 2
 *
 * Visual progress indicator showing:
 * - Questions answered vs total
 * - Progress bar
 * - Current question marker
 */

'use client';

import React from 'react';
import { CheckCircle, Circle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export interface AssessmentProgressProps {
  /** Total number of questions */
  totalQuestions: number;
  /** Number of questions answered */
  answeredQuestions: number;
  /** Current question index (0-based) */
  currentQuestionIndex: number;
  /** Optional className */
  className?: string;
}

export function AssessmentProgress({
  totalQuestions,
  answeredQuestions,
  currentQuestionIndex,
  className = '',
}: AssessmentProgressProps) {
  const progressPercentage = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0;
  const isComplete = answeredQuestions === totalQuestions;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">
          Question {currentQuestionIndex + 1} of {totalQuestions}
        </span>
        <span className={`font-medium ${isComplete ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}`}>
          {answeredQuestions} / {totalQuestions} answered
          {isComplete && ' ✓'}
        </span>
      </div>

      {/* Progress Bar */}
      <Progress value={progressPercentage} max={100} className="h-2" />

      {/* Progress Text */}
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
        {isComplete ? (
          <>
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            <span className="text-green-600 dark:text-green-400 font-medium">All questions answered</span>
          </>
        ) : (
          <>
            <Circle className="w-4 h-4" />
            <span>{totalQuestions - answeredQuestions} remaining</span>
          </>
        )}
      </div>

      {/* Accessibility: Screen reader only */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        Progress: {answeredQuestions} of {totalQuestions} questions answered.
        {progressPercentage.toFixed(0)}% complete.
      </div>
    </div>
  );
}

/**
 * QuestionNavigator Component - Sidebar navigation for questions
 */
export interface QuestionNavigatorProps {
  /** Total number of questions */
  totalQuestions: number;
  /** Current question index (0-based) */
  currentQuestionIndex: number;
  /** Set of answered question indices */
  answeredQuestions: Set<number>;
  /** Callback when question is selected */
  onQuestionSelect: (index: number) => void;
  /** Optional className */
  className?: string;
}

export function QuestionNavigator({
  totalQuestions,
  currentQuestionIndex,
  answeredQuestions,
  onQuestionSelect,
  className = '',
}: QuestionNavigatorProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Questions</h3>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: totalQuestions }, (_, index) => {
          const isAnswered = answeredQuestions.has(index);
          const isCurrent = index === currentQuestionIndex;

          return (
            <button
              key={index}
              onClick={() => onQuestionSelect(index)}
              className={`
                w-10 h-10 rounded-md text-sm font-medium transition-all
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                ${
                  isCurrent
                    ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2'
                    : isAnswered
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 hover:bg-green-200'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                }
              `}
              aria-label={`Question ${index + 1}${isAnswered ? ' (answered)' : ''}${
                isCurrent ? ' (current)' : ''
              }`}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {index + 1}
              {isAnswered && !isCurrent && (
                <span className="sr-only">answered</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
