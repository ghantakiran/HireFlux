/**
 * MCQQuestion Component - Sprint 19-20 Week 38 Day 3
 *
 * Multiple Choice Question component for assessments
 * Supports both single and multiple choice questions
 */

'use client';

import React from 'react';
import { Label } from '@/components/ui/label';

export interface MCQQuestionProps {
  /** Question data */
  question: {
    id: string;
    question_text: string;
    question_type: 'mcq_single' | 'mcq_multiple';
    options?: string[];
    points: number;
  };
  /** Current answer value */
  value?: {
    selected_options?: string[];
  };
  /** Callback when answer changes */
  onAnswerChange: (answer: { selected_options: string[] }) => void;
  /** Whether question is required */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /** Optional className */
  className?: string;
}

export function MCQQuestion({
  question,
  value,
  onAnswerChange,
  required = false,
  error,
  className = '',
}: MCQQuestionProps) {
  const selectedOptions = value?.selected_options || [];
  const isSingleChoice = question.question_type === 'mcq_single';

  const handleSingleChoiceChange = (selectedValue: string) => {
    onAnswerChange({ selected_options: [selectedValue] });
  };

  const handleMultipleChoiceChange = (option: string, checked: boolean) => {
    let newSelected: string[];

    if (checked) {
      // Add option
      newSelected = [...selectedOptions, option];
    } else {
      // Remove option
      newSelected = selectedOptions.filter(opt => opt !== option);
    }

    onAnswerChange({ selected_options: newSelected });
  };

  const questionId = `question-${question.id}`;
  const hasError = Boolean(error);

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
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Options */}
      {question.options && question.options.length > 0 && (
        <div
          role="group"
          aria-labelledby={questionId}
          className={`space-y-3 rounded-lg border p-4 ${
            hasError ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950'
          }`}
        >
          {isSingleChoice ? (
            // Single Choice (Radio Buttons)
            <div className="space-y-3">
              {question.options.map((option, index) => {
                const optionId = `${question.id}-option-${index}`;
                const isSelected = selectedOptions[0] === option;

                return (
                  <div key={optionId} className="flex items-center space-x-3">
                    <input
                      type="radio"
                      id={optionId}
                      name={question.id}
                      value={option}
                      checked={isSelected}
                      onChange={(e) => handleSingleChoiceChange(e.target.value)}
                      className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 focus:ring-blue-500"
                    />
                    <Label
                      htmlFor={optionId}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {option}
                    </Label>
                  </div>
                );
              })}
            </div>
          ) : (
            // Multiple Choice (Checkboxes)
            <div className="space-y-3">
              {question.options.map((option, index) => {
                const optionId = `${question.id}-option-${index}`;
                const isChecked = selectedOptions.includes(option);

                return (
                  <div key={optionId} className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id={optionId}
                      checked={isChecked}
                      onChange={(e) => handleMultipleChoiceChange(option, e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                    />
                    <Label
                      htmlFor={optionId}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {option}
                    </Label>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Hint for multiple choice */}
      {!isSingleChoice && (
        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
          Select all that apply
        </p>
      )}
    </div>
  );
}
