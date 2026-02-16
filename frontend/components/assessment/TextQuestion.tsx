/**
 * TextQuestion Component - Sprint 19-20 Week 38 Day 3
 *
 * Text response question component for assessments
 * Supports both short (single line) and long (multi-line) text answers
 */

'use client';

import React from 'react';
import { Label } from '@/components/ui/label';

export interface TextQuestionProps {
  /** Question data */
  question: {
    id: string;
    question_text: string;
    question_type: 'text_short' | 'text_long';
    points: number;
    max_words?: number;
  };
  /** Current answer value */
  value?: {
    text_response?: string;
  };
  /** Callback when answer changes */
  onAnswerChange: (answer: { text_response: string }) => void;
  /** Whether question is required */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /** Optional className */
  className?: string;
}

function TextQuestionInner({
  question,
  value,
  onAnswerChange,
  required = false,
  error,
  className = '',
}: TextQuestionProps) {
  const textResponse = value?.text_response || '';
  const isLongAnswer = question.question_type === 'text_long';

  // Character count for short answers
  const charCount = textResponse.length;

  // Word count for long answers
  const wordCount = textResponse.trim() === '' ? 0 : textResponse.trim().split(/\s+/).length;

  const handleChange = (newValue: string) => {
    onAnswerChange({ text_response: newValue });
  };

  const questionId = `question-${question.id}`;
  const inputId = `input-${question.id}`;
  const errorId = `error-${question.id}`;
  const hasError = Boolean(error);

  // Word limit styling
  const getWordCountColor = () => {
    if (!question.max_words) return 'text-gray-500 dark:text-gray-400';

    const percentage = (wordCount / question.max_words) * 100;

    if (wordCount > question.max_words) {
      return 'text-red-600 dark:text-red-400'; // Over limit
    } else if (percentage >= 90) {
      return 'text-yellow-600 dark:text-yellow-400'; // Warning (90%+)
    } else {
      return 'text-gray-500 dark:text-gray-400'; // Normal
    }
  };

  // Common input props
  const commonInputProps = {
    id: inputId,
    value: textResponse,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      handleChange(e.target.value),
    placeholder: 'Type your answer here...',
    'aria-labelledby': questionId,
    'aria-invalid': hasError ? true : undefined,
    'aria-describedby': hasError ? errorId : undefined,
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Question Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h3 id={questionId} className="text-lg font-medium text-gray-900 dark:text-gray-100">
            {question.question_text}
            {required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{question.points} points</span>
        </div>

        {error && (
          <p id={errorId} className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Input Field */}
      {isLongAnswer ? (
        // Long answer - textarea
        <div className="space-y-2">
          <textarea
            {...commonInputProps}
            rows={6}
            className={`w-full px-3 py-2 border rounded-lg resize-y min-h-32 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${
              hasError
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />

          {/* Word Count */}
          <div className="flex items-center justify-between text-xs">
            <span className={getWordCountColor()}>
              {wordCount}
              {question.max_words ? ` / ${question.max_words}` : ''} word{wordCount !== 1 ? 's' : ''}
            </span>
            {question.max_words && wordCount > question.max_words && (
              <span className="text-red-600 dark:text-red-400 font-medium">
                Exceeds word limit by {wordCount - question.max_words}
              </span>
            )}
          </div>
        </div>
      ) : (
        // Short answer - input
        <div className="space-y-2">
          <input
            type="text"
            {...commonInputProps}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 ${
              hasError
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />

          {/* Character Count */}
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {charCount} character{charCount !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  );
}

export const TextQuestion = React.memo(TextQuestionInner);
TextQuestion.displayName = 'TextQuestion';
