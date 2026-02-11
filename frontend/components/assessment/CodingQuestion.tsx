/**
 * CodingQuestion Component - Sprint 19-20 Week 38 Day 3
 *
 * Coding question component with Monaco Editor integration
 * Supports multiple programming languages with syntax highlighting
 */

'use client';

import React from 'react';
import Editor from '@monaco-editor/react';
import { Label } from '@/components/ui/label';
import { Code, CheckCircle, EyeOff } from 'lucide-react';

export interface CodingQuestionProps {
  /** Question data */
  question: {
    id: string;
    question_text: string;
    question_type: 'coding';
    points: number;
    programming_language: 'javascript' | 'python' | 'java' | 'cpp' | 'typescript';
    starter_code?: string;
    test_cases?: Array<{
      input: string;
      expected_output: string;
      is_hidden: boolean;
    }>;
  };
  /** Current answer value */
  value?: {
    code_response?: string;
  };
  /** Callback when answer changes */
  onAnswerChange: (answer: { code_response: string }) => void;
  /** Whether question is required */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /** Optional className */
  className?: string;
}

export function CodingQuestion({
  question,
  value,
  onAnswerChange,
  required = false,
  error,
  className = '',
}: CodingQuestionProps) {
  const codeResponse = value?.code_response || question.starter_code || '';

  const handleEditorChange = (newValue: string | undefined) => {
    onAnswerChange({ code_response: newValue || '' });
  };

  const questionId = `question-${question.id}`;
  const editorId = `editor-${question.id}`;
  const errorId = `error-${question.id}`;
  const hasError = Boolean(error);

  // Get visible and hidden test cases
  const visibleTestCases = question.test_cases?.filter((tc) => !tc.is_hidden) || [];
  const hiddenTestCasesCount = question.test_cases?.filter((tc) => tc.is_hidden).length || 0;

  // Language display names
  const languageNames: Record<string, string> = {
    javascript: 'JavaScript',
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    typescript: 'TypeScript',
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

        {/* Language Badge */}
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {languageNames[question.programming_language] || question.programming_language}
          </span>
        </div>

        {error && (
          <p id={errorId} className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
      </div>

      {/* Code Editor */}
      <div
        className={`rounded-lg border overflow-hidden ${
          hasError ? 'border-red-300 error' : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        <Editor
          height="400px"
          language={question.programming_language}
          value={codeResponse}
          onChange={handleEditorChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            ariaLabel: question.question_text,
          }}
          // These props will be passed to the mocked textarea in tests
          {...({
            'aria-labelledby': questionId,
            'aria-invalid': hasError ? 'true' : undefined,
            'aria-describedby': hasError ? errorId : undefined,
          } as any)}
        />
      </div>

      {/* Test Cases Display */}
      {question.test_cases && question.test_cases.length > 0 && (
        <>
          {/* Instructions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Note:</strong> Your code will be tested against the test cases shown below.
            </p>
          </div>
        <div className="space-y-3">
          <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            Test Cases
          </h4>

          {/* Visible Test Cases */}
          {visibleTestCases.length > 0 && (
            <div className="space-y-2">
              {visibleTestCases.map((testCase, index) => (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-2"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Input</Label>
                      <pre className="mt-1 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 overflow-x-auto">
                        <code>{testCase.input}</code>
                      </pre>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-600 dark:text-gray-400 font-semibold">Expected Output</Label>
                      <pre className="mt-1 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded p-2 overflow-x-auto">
                        <code>{testCase.expected_output}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Hidden Test Cases Indicator */}
          {hiddenTestCasesCount > 0 && (
            <div className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-3 flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {hiddenTestCasesCount} hidden test case{hiddenTestCasesCount > 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
