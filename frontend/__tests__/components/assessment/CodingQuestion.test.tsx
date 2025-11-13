/**
 * Tests for CodingQuestion Component - Sprint 19-20 Week 38 Day 3
 * Following TDD approach: Write tests first, then implement component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CodingQuestion } from '@/components/assessment/CodingQuestion';

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => {
  return {
    __esModule: true,
    default: ({ value, onChange, language, ...props }: any) => {
      return (
        <textarea
          data-testid="monaco-editor"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          data-language={language}
          {...props}
        />
      );
    },
  };
});

describe('CodingQuestion Component', () => {
  const mockQuestion = {
    id: 'q1',
    question_text: 'Write a function that reverses a string',
    question_type: 'coding' as const,
    points: 20,
    programming_language: 'javascript' as const,
    starter_code: 'function reverseString(str) {\n  // Your code here\n}',
    test_cases: [
      {
        input: '"hello"',
        expected_output: '"olleh"',
        is_hidden: false,
      },
      {
        input: '"world"',
        expected_output: '"dlrow"',
        is_hidden: false,
      },
      {
        input: '""',
        expected_output: '""',
        is_hidden: true,
      },
    ],
  };

  const mockOnAnswerChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // Rendering Tests
  // ========================================================================

  it('should render question text', () => {
    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);
    expect(screen.getByText('Write a function that reverses a string')).toBeInTheDocument();
  });

  it('should render Monaco Editor', () => {
    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('should show points value', () => {
    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);
    expect(screen.getByText('20 points')).toBeInTheDocument();
  });

  it('should show programming language', () => {
    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);
    expect(screen.getByText(/javascript/i)).toBeInTheDocument();
  });

  // ========================================================================
  // Editor Tests
  // ========================================================================

  it('should initialize editor with starter code', () => {
    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    expect(editor.value).toContain('function reverseString(str)');
  });

  it('should update code when typing', async () => {
    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    const newCode = 'function reverseString(str) {\n  return str.split("").reverse().join("");\n}';

    fireEvent.change(editor, { target: { value: newCode } });

    await waitFor(() => {
      expect(mockOnAnswerChange).toHaveBeenCalledWith({
        code_response: newCode,
      });
    });
  });

  it('should preserve existing code value', () => {
    const existingCode = 'function reverseString(str) {\n  return str.split("").reverse().join("");\n}';

    render(
      <CodingQuestion
        question={mockQuestion}
        onAnswerChange={mockOnAnswerChange}
        value={{ code_response: existingCode }}
      />
    );

    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe(existingCode);
  });

  it('should set correct language for editor', () => {
    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toHaveAttribute('data-language', 'javascript');
  });

  it('should support Python language', () => {
    const pythonQuestion = {
      ...mockQuestion,
      programming_language: 'python' as const,
      starter_code: 'def reverse_string(s):\n    # Your code here\n    pass',
    };

    render(<CodingQuestion question={pythonQuestion} onAnswerChange={mockOnAnswerChange} />);

    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toHaveAttribute('data-language', 'python');
  });

  // ========================================================================
  // Test Cases Display Tests
  // ========================================================================

  it('should display test cases', () => {
    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    expect(screen.getByRole('heading', { name: /test cases/i })).toBeInTheDocument();
  });

  it('should show visible test cases', () => {
    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    expect(screen.getByText('"hello"')).toBeInTheDocument();
    expect(screen.getByText('"olleh"')).toBeInTheDocument();
    expect(screen.getByText('"world"')).toBeInTheDocument();
    expect(screen.getByText('"dlrow"')).toBeInTheDocument();
  });

  it('should not show hidden test cases', () => {
    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    // Hidden test case input/output should not be visible
    const allText = screen.queryAllByText('""');
    // We expect this to be empty or not include both input and output
    expect(allText.length).toBeLessThan(2);
  });

  it('should indicate when there are hidden test cases', () => {
    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    expect(screen.getByText(/1 hidden test case/i)).toBeInTheDocument();
  });

  it('should handle questions with no test cases', () => {
    const noTestCasesQuestion = {
      ...mockQuestion,
      test_cases: [],
    };

    render(<CodingQuestion question={noTestCasesQuestion} onAnswerChange={mockOnAnswerChange} />);

    expect(screen.queryByText(/test cases/i)).not.toBeInTheDocument();
  });

  // ========================================================================
  // Validation Tests
  // ========================================================================

  it('should show required indicator when required', () => {
    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} required />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should show error message when provided', () => {
    render(
      <CodingQuestion
        question={mockQuestion}
        onAnswerChange={mockOnAnswerChange}
        error="Code is required"
      />
    );

    expect(screen.getByText('Code is required')).toBeInTheDocument();
  });

  it('should apply error styling when error is present', () => {
    render(
      <CodingQuestion
        question={mockQuestion}
        onAnswerChange={mockOnAnswerChange}
        error="Error message"
      />
    );

    const container = screen.getByTestId('monaco-editor').parentElement;
    expect(container?.className).toMatch(/border-red|error/);
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  it('should have proper ARIA labels', () => {
    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toHaveAttribute('aria-labelledby');
  });

  it('should have aria-invalid when error present', () => {
    render(
      <CodingQuestion
        question={mockQuestion}
        onAnswerChange={mockOnAnswerChange}
        error="Error"
      />
    );

    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toHaveAttribute('aria-invalid', 'true');
  });

  it('should support keyboard navigation in editor', () => {
    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    const editor = screen.getByTestId('monaco-editor');
    editor.focus();

    expect(document.activeElement).toBe(editor);
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  it('should handle empty starter code', () => {
    const emptyCodeQuestion = {
      ...mockQuestion,
      starter_code: '',
    };

    render(<CodingQuestion question={emptyCodeQuestion} onAnswerChange={mockOnAnswerChange} />);

    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe('');
  });

  it('should handle undefined value', () => {
    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    // Should default to starter code
    expect(editor.value).toBe(mockQuestion.starter_code);
  });

  it('should handle very long code', () => {
    const longCode = 'function test() {\n' + '  console.log("test");\n'.repeat(100) + '}';

    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: longCode } });

    expect(mockOnAnswerChange).toHaveBeenCalledWith({
      code_response: longCode,
    });
  });

  it('should handle multiple programming languages', () => {
    const languages = ['javascript', 'python', 'java', 'cpp', 'typescript'] as const;

    languages.forEach((lang) => {
      const langQuestion = {
        ...mockQuestion,
        programming_language: lang,
      };

      const { unmount } = render(
        <CodingQuestion question={langQuestion} onAnswerChange={mockOnAnswerChange} />
      );

      const editor = screen.getByTestId('monaco-editor');
      expect(editor).toHaveAttribute('data-language', lang);

      unmount();
    });
  });

  // ========================================================================
  // Instructions Display Tests
  // ========================================================================

  it('should display question instructions', () => {
    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    expect(screen.getByText(/Write a function that reverses a string/i)).toBeInTheDocument();
  });

  it('should show hint about test cases', () => {
    render(<CodingQuestion question={mockQuestion} onAnswerChange={mockOnAnswerChange} />);

    expect(screen.getByText(/your code will be tested/i)).toBeInTheDocument();
  });
});
