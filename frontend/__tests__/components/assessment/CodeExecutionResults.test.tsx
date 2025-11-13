/**
 * Tests for CodeExecutionResults Component - Sprint 19-20 Week 38 Day 4
 * Following TDD approach: Write tests first, then implement component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CodeExecutionResults } from '@/components/assessment/CodeExecutionResults';

describe('CodeExecutionResults Component', () => {
  const mockPassingResults = {
    status: 'success' as const,
    totalTests: 3,
    passedTests: 3,
    failedTests: 0,
    executionTime: 125, // ms
    testCases: [
      {
        name: 'Test Case 1',
        input: '"hello"',
        expected: '"olleh"',
        actual: '"olleh"',
        passed: true,
      },
      {
        name: 'Test Case 2',
        input: '"world"',
        expected: '"dlrow"',
        actual: '"dlrow"',
        passed: true,
      },
      {
        name: 'Test Case 3',
        input: '""',
        expected: '""',
        actual: '""',
        passed: true,
      },
    ],
    consoleOutput: [],
  };

  const mockFailingResults = {
    status: 'failure' as const,
    totalTests: 3,
    passedTests: 1,
    failedTests: 2,
    executionTime: 98,
    testCases: [
      {
        name: 'Test Case 1',
        input: '"hello"',
        expected: '"olleh"',
        actual: '"olleh"',
        passed: true,
      },
      {
        name: 'Test Case 2',
        input: '"world"',
        expected: '"dlrow"',
        actual: '"world"', // Wrong output
        passed: false,
        error: 'Expected "dlrow" but got "world"',
      },
      {
        name: 'Test Case 3',
        input: '""',
        expected: '""',
        actual: undefined,
        passed: false,
        error: 'Function returned undefined',
      },
    ],
    consoleOutput: ['Debug: input is "world"'],
  };

  const mockErrorResults = {
    status: 'error' as const,
    totalTests: 3,
    passedTests: 0,
    failedTests: 3,
    executionTime: 15,
    error: 'SyntaxError: Unexpected token',
    testCases: [],
    consoleOutput: [],
  };

  // ========================================================================
  // Rendering Tests
  // ========================================================================

  it('should render overall status for passing code', () => {
    render(<CodeExecutionResults results={mockPassingResults} />);

    expect(screen.getByText(/all tests passed/i)).toBeInTheDocument();
  });

  it('should render overall status for failing code', () => {
    render(<CodeExecutionResults results={mockFailingResults} />);

    expect(screen.getByText(/tests failed/i)).toBeInTheDocument();
  });

  it('should render error message for compilation errors', () => {
    render(<CodeExecutionResults results={mockErrorResults} />);

    expect(screen.getByText(/compilation error/i)).toBeInTheDocument();
    expect(screen.getByText(/SyntaxError: Unexpected token/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Test Summary Tests
  // ========================================================================

  it('should show test summary with pass/fail counts', () => {
    render(<CodeExecutionResults results={mockFailingResults} />);

    expect(screen.getByText(/1 passed/i)).toBeInTheDocument();
    expect(screen.getByText(/2 failed/i)).toBeInTheDocument();
  });

  it('should show execution time', () => {
    render(<CodeExecutionResults results={mockPassingResults} />);

    expect(screen.getByText(/125ms/i)).toBeInTheDocument();
  });

  it('should show percentage score', () => {
    render(<CodeExecutionResults results={mockFailingResults} />);

    // 1 passed out of 3 = 33%
    expect(screen.getByText(/33%/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Test Cases Display Tests
  // ========================================================================

  it('should render all test cases', () => {
    render(<CodeExecutionResults results={mockFailingResults} />);

    expect(screen.getByText('Test Case 1')).toBeInTheDocument();
    expect(screen.getByText('Test Case 2')).toBeInTheDocument();
    expect(screen.getByText('Test Case 3')).toBeInTheDocument();
  });

  it('should show passed test cases with checkmark', () => {
    render(<CodeExecutionResults results={mockFailingResults} />);

    const testCase1 = screen.getByText('Test Case 1').closest('div');
    expect(testCase1).toHaveTextContent('Pass');
  });

  it('should show failed test cases with X mark', () => {
    render(<CodeExecutionResults results={mockFailingResults} />);

    const testCase2 = screen.getByText('Test Case 2').closest('div');
    expect(testCase2).toHaveTextContent('Fail');
  });

  it('should display input and expected output for all tests', () => {
    render(<CodeExecutionResults results={mockFailingResults} />);

    expect(screen.getByText(/"hello"/i)).toBeInTheDocument();
    expect(screen.getByText(/"olleh"/i)).toBeInTheDocument();
  });

  it('should display actual output for failed tests', () => {
    render(<CodeExecutionResults results={mockFailingResults} />);

    // Test Case 2 failed - should show actual output label
    expect(screen.getByText(/actual output/i)).toBeInTheDocument();

    // Verify "world" appears multiple times (in input, actual output, console)
    const worldInstances = screen.getAllByText(/"world"/i);
    expect(worldInstances.length).toBeGreaterThan(1);
  });

  it('should display error messages for failed tests', () => {
    render(<CodeExecutionResults results={mockFailingResults} />);

    expect(screen.getByText(/Expected "dlrow" but got "world"/i)).toBeInTheDocument();
    expect(screen.getByText(/Function returned undefined/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Console Output Tests
  // ========================================================================

  it('should render console output section when present', () => {
    render(<CodeExecutionResults results={mockFailingResults} />);

    expect(screen.getByText(/console output/i)).toBeInTheDocument();
  });

  it('should display console logs', () => {
    render(<CodeExecutionResults results={mockFailingResults} />);

    expect(screen.getByText(/Debug: input is "world"/i)).toBeInTheDocument();
  });

  it('should not render console section when empty', () => {
    render(<CodeExecutionResults results={mockPassingResults} />);

    expect(screen.queryByText(/console output/i)).not.toBeInTheDocument();
  });

  // ========================================================================
  // Visual Feedback Tests
  // ========================================================================

  it('should use green styling for all tests passed', () => {
    const { container } = render(<CodeExecutionResults results={mockPassingResults} />);

    const successElement = container.querySelector('.bg-green-50, .text-green-700');
    expect(successElement).toBeInTheDocument();
  });

  it('should use red styling for test failures', () => {
    const { container } = render(<CodeExecutionResults results={mockFailingResults} />);

    const failureElement = container.querySelector('.bg-red-50, .text-red-700');
    expect(failureElement).toBeInTheDocument();
  });

  it('should use yellow styling for compilation errors', () => {
    const { container } = render(<CodeExecutionResults results={mockErrorResults} />);

    const errorElement = container.querySelector('.bg-yellow-50, .text-yellow-700');
    expect(errorElement).toBeInTheDocument();
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  it('should have accessible headings', () => {
    render(<CodeExecutionResults results={mockPassingResults} />);

    const headings = screen.getAllByRole('heading');
    expect(headings.length).toBeGreaterThan(0);
  });

  it('should mark status as live region', () => {
    render(<CodeExecutionResults results={mockPassingResults} />);

    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeInTheDocument();
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  it('should handle zero tests', () => {
    const noTestsResults = {
      ...mockPassingResults,
      totalTests: 0,
      passedTests: 0,
      testCases: [],
    };

    render(<CodeExecutionResults results={noTestsResults} />);

    expect(screen.getByText(/0 passed/i)).toBeInTheDocument();
  });

  it('should handle very long error messages', () => {
    const longErrorResults = {
      ...mockErrorResults,
      error: 'A'.repeat(500),
    };

    render(<CodeExecutionResults results={longErrorResults} />);

    expect(screen.getByText(/A{50}/)).toBeInTheDocument();
  });

  it('should handle multiple console outputs', () => {
    const multipleLogsResults = {
      ...mockPassingResults,
      consoleOutput: ['Log 1', 'Log 2', 'Log 3', 'Log 4'],
    };

    render(<CodeExecutionResults results={multipleLogsResults} />);

    expect(screen.getByText('Log 1')).toBeInTheDocument();
    expect(screen.getByText('Log 4')).toBeInTheDocument();
  });
});
