/**
 * CodeExecutionResults Component - Sprint 19-20 Week 38 Day 4
 *
 * Displays test execution results for coding questions
 * Shows passed/failed tests, console output, and error messages
 */

'use client';

import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Clock, Terminal } from 'lucide-react';

export interface TestCase {
  name: string;
  input: string;
  expected: string;
  actual?: string;
  passed: boolean;
  error?: string;
}

export interface ExecutionResults {
  status: 'success' | 'failure' | 'error';
  totalTests: number;
  passedTests: number;
  failedTests: number;
  executionTime: number; // milliseconds
  testCases: TestCase[];
  consoleOutput: string[];
  error?: string; // Compilation/runtime error
}

export interface CodeExecutionResultsProps {
  results: ExecutionResults;
  className?: string;
}

export function CodeExecutionResults({ results, className = '' }: CodeExecutionResultsProps) {
  const { status, totalTests, passedTests, failedTests, executionTime, testCases, consoleOutput, error } = results;

  // Calculate percentage
  const percentage = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

  // Status styling
  const getStatusColor = () => {
    if (status === 'error') return 'yellow';
    if (status === 'success') return 'green';
    return 'red';
  };

  const statusColor = getStatusColor();

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overall Status */}
      <div
        role="status"
        aria-live="polite"
        className={`border rounded-lg p-4 ${
          statusColor === 'green' ? 'bg-green-50 dark:bg-green-900/20 border-green-200' :
          statusColor === 'red' ? 'bg-red-50 dark:bg-red-900/20 border-red-200' :
          'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200'
        }`}
      >
        <div className="flex items-start gap-3">
          {status === 'success' && <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0" />}
          {status === 'failure' && <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0" />}
          {status === 'error' && <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />}

          <div className="flex-1">
            <h3
              className={`text-lg font-semibold ${
                statusColor === 'green' ? 'text-green-900 dark:text-green-300' :
                statusColor === 'red' ? 'text-red-900 dark:text-red-300' :
                'text-yellow-900 dark:text-yellow-300'
              }`}
            >
              {status === 'success' && 'All Tests Passed!'}
              {status === 'failure' && 'Tests Failed'}
              {status === 'error' && 'Compilation Error'}
            </h3>

            {/* Test Summary */}
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-4 text-sm">
                <span className={`font-medium ${
                  statusColor === 'green' ? 'text-green-700 dark:text-green-300' :
                  statusColor === 'red' ? 'text-red-700 dark:text-red-400' :
                  'text-yellow-700 dark:text-yellow-300'
                }`}>
                  {passedTests} passed, {failedTests} failed
                </span>
                <span className="text-gray-600 dark:text-gray-400">Score: {percentage}%</span>
                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                  <Clock className="w-3 h-3" />
                  {executionTime}ms
                </span>
              </div>
            </div>

            {/* Compilation Error */}
            {status === 'error' && error && (
              <div className="mt-3 p-3 bg-white dark:bg-gray-900 border border-yellow-300 rounded text-sm">
                <p className="font-mono text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Test Cases */}
      {testCases.length > 0 && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100">Test Cases</h4>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {testCases.map((testCase, index) => (
              <div key={index} className="p-4 space-y-3">
                {/* Test Name and Status */}
                <div className="flex items-center justify-between">
                  <h5 className="font-medium text-gray-900 dark:text-gray-100">{testCase.name}</h5>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                      testCase.passed
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}
                  >
                    {testCase.passed ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        Pass
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        Fail
                      </>
                    )}
                  </span>
                </div>

                {/* Test Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {/* Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Input</label>
                    <pre className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs overflow-x-auto">
                      <code>{testCase.input}</code>
                    </pre>
                  </div>

                  {/* Expected Output */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Expected</label>
                    <pre className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded p-2 text-xs overflow-x-auto">
                      <code>{testCase.expected}</code>
                    </pre>
                  </div>
                </div>

                {/* Actual Output (for failed tests) */}
                {!testCase.passed && testCase.actual !== undefined && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Actual Output</label>
                    <pre className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded p-2 text-xs overflow-x-auto">
                      <code>{testCase.actual}</code>
                    </pre>
                  </div>
                )}

                {/* Error Message */}
                {testCase.error && (
                  <div className="flex items-start gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded p-2">
                    <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{testCase.error}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Console Output */}
      {consoleOutput.length > 0 && (
        <div className="bg-gray-900 text-gray-100 rounded-lg overflow-hidden">
          <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            <h4 className="text-sm font-medium">Console Output</h4>
          </div>
          <div className="p-4 space-y-1 font-mono text-xs">
            {consoleOutput.map((log, index) => (
              <div key={index} className="text-gray-300">
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
