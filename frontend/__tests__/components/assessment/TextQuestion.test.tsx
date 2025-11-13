/**
 * Tests for TextQuestion Component - Sprint 19-20 Week 38 Day 3
 * Following TDD approach: Write tests first, then implement component
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextQuestion } from '@/components/assessment/TextQuestion';

describe('TextQuestion Component', () => {
  const mockShortQuestion = {
    id: 'q1',
    question_text: 'What is your greatest strength?',
    question_type: 'text_short' as const,
    points: 5,
  };

  const mockLongQuestion = {
    id: 'q2',
    question_text: 'Describe your experience with React and TypeScript.',
    question_type: 'text_long' as const,
    points: 10,
    max_words: 200,
  };

  const mockOnAnswerChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========================================================================
  // Rendering Tests
  // ========================================================================

  it('should render question text', () => {
    render(<TextQuestion question={mockShortQuestion} onAnswerChange={mockOnAnswerChange} />);
    expect(screen.getByText('What is your greatest strength?')).toBeInTheDocument();
  });

  it('should render all options', () => {
    render(<TextQuestion question={mockShortQuestion} onAnswerChange={mockOnAnswerChange} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('should show points value', () => {
    render(<TextQuestion question={mockShortQuestion} onAnswerChange={mockOnAnswerChange} />);
    expect(screen.getByText('5 points')).toBeInTheDocument();
  });

  // ========================================================================
  // Short Answer Tests
  // ========================================================================

  it('should render single-line input for short answer', () => {
    render(<TextQuestion question={mockShortQuestion} onAnswerChange={mockOnAnswerChange} />);

    const input = screen.getByRole('textbox');
    expect(input.tagName).toBe('INPUT');
  });

  it('should update value when typing (short answer)', () => {
    render(<TextQuestion question={mockShortQuestion} onAnswerChange={mockOnAnswerChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Problem solving' } });

    expect(mockOnAnswerChange).toHaveBeenCalledWith({
      text_response: 'Problem solving',
    });
  });

  it('should show existing value (short answer)', () => {
    render(
      <TextQuestion
        question={mockShortQuestion}
        onAnswerChange={mockOnAnswerChange}
        value={{ text_response: 'Leadership' }}
      />
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('Leadership');
  });

  it('should have placeholder text for short answer', () => {
    render(<TextQuestion question={mockShortQuestion} onAnswerChange={mockOnAnswerChange} />);

    expect(screen.getByPlaceholderText('Type your answer here...')).toBeInTheDocument();
  });

  // ========================================================================
  // Long Answer Tests
  // ========================================================================

  it('should render textarea for long answer', () => {
    render(<TextQuestion question={mockLongQuestion} onAnswerChange={mockOnAnswerChange} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea.tagName).toBe('TEXTAREA');
  });

  it('should update value when typing (long answer)', () => {
    render(<TextQuestion question={mockLongQuestion} onAnswerChange={mockOnAnswerChange} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'I have 5 years of experience...' } });

    expect(mockOnAnswerChange).toHaveBeenCalledWith({
      text_response: 'I have 5 years of experience...',
    });
  });

  it('should show existing value (long answer)', () => {
    const existingText = 'React is a JavaScript library...';
    render(
      <TextQuestion
        question={mockLongQuestion}
        onAnswerChange={mockOnAnswerChange}
        value={{ text_response: existingText }}
      />
    );

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe(existingText);
  });

  it('should have larger height for long answer', () => {
    render(<TextQuestion question={mockLongQuestion} onAnswerChange={mockOnAnswerChange} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea.className).toMatch(/h-32|min-h/); // Should have height class
  });

  // ========================================================================
  // Character/Word Count Tests
  // ========================================================================

  it('should show character count for short answer', () => {
    render(<TextQuestion question={mockShortQuestion} onAnswerChange={mockOnAnswerChange} />);

    expect(screen.getByText(/0 characters/i)).toBeInTheDocument();
  });

  it('should update character count when typing', () => {
    function ControlledTextQuestion() {
      const [value, setValue] = React.useState<{ text_response: string }>({ text_response: '' });
      return (
        <TextQuestion
          question={mockShortQuestion}
          value={value}
          onAnswerChange={(newValue) => {
            setValue(newValue);
            mockOnAnswerChange(newValue);
          }}
        />
      );
    }

    render(<ControlledTextQuestion />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Test' } });

    expect(screen.getByText(/4 characters/i)).toBeInTheDocument();
  });

  it('should show word count for long answer', () => {
    render(<TextQuestion question={mockLongQuestion} onAnswerChange={mockOnAnswerChange} />);

    expect(screen.getByText(/0 \/ 200 words/i)).toBeInTheDocument();
  });

  it('should update word count when typing', () => {
    function ControlledTextQuestion() {
      const [value, setValue] = React.useState<{ text_response: string }>({ text_response: '' });
      return (
        <TextQuestion
          question={mockLongQuestion}
          value={value}
          onAnswerChange={(newValue) => {
            setValue(newValue);
            mockOnAnswerChange(newValue);
          }}
        />
      );
    }

    render(<ControlledTextQuestion />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello world this is a test' } });

    // "Hello world this is a test" = 6 words
    expect(screen.getByText(/6 \/ 200 words/i)).toBeInTheDocument();
  });

  it('should warn when approaching word limit', () => {
    const questionWithLimit = {
      ...mockLongQuestion,
      max_words: 10,
    };

    function ControlledTextQuestion() {
      const [value, setValue] = React.useState<{ text_response: string }>({ text_response: '' });
      return (
        <TextQuestion
          question={questionWithLimit}
          value={value}
          onAnswerChange={(newValue) => {
            setValue(newValue);
            mockOnAnswerChange(newValue);
          }}
        />
      );
    }

    render(<ControlledTextQuestion />);

    const textarea = screen.getByRole('textbox');
    // 9 words - should show warning
    fireEvent.change(textarea, { target: { value: 'one two three four five six seven eight nine' } });

    const wordCount = screen.getByText(/9 \/ 10 words/i);
    expect(wordCount.className).toMatch(/yellow|warning/);
  });

  it('should show error when exceeding word limit', () => {
    const questionWithLimit = {
      ...mockLongQuestion,
      max_words: 10,
    };

    function ControlledTextQuestion() {
      const [value, setValue] = React.useState<{ text_response: string }>({ text_response: '' });
      return (
        <TextQuestion
          question={questionWithLimit}
          value={value}
          onAnswerChange={(newValue) => {
            setValue(newValue);
            mockOnAnswerChange(newValue);
          }}
        />
      );
    }

    render(<ControlledTextQuestion />);

    const textarea = screen.getByRole('textbox');
    // 11 words - exceeds limit
    fireEvent.change(textarea, { target: { value: 'one two three four five six seven eight nine ten eleven' } });

    const wordCount = screen.getByText(/11 \/ 10 words/i);
    expect(wordCount.className).toMatch(/red|error/);
  });

  // ========================================================================
  // Validation Tests
  // ========================================================================

  it('should show required indicator when required', () => {
    render(<TextQuestion question={mockShortQuestion} onAnswerChange={mockOnAnswerChange} required />);

    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('should show error message when provided', () => {
    render(
      <TextQuestion
        question={mockShortQuestion}
        onAnswerChange={mockOnAnswerChange}
        error="This field is required"
      />
    );

    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('should apply error styling when error is present', () => {
    render(
      <TextQuestion
        question={mockShortQuestion}
        onAnswerChange={mockOnAnswerChange}
        error="Error message"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/border-red/);
  });

  // ========================================================================
  // Accessibility Tests
  // ========================================================================

  it('should have proper ARIA labels', () => {
    render(<TextQuestion question={mockShortQuestion} onAnswerChange={mockOnAnswerChange} />);

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-labelledby');
  });

  it('should have aria-invalid when error present', () => {
    render(
      <TextQuestion
        question={mockShortQuestion}
        onAnswerChange={mockOnAnswerChange}
        error="Error"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });

  it('should have aria-describedby for error message', () => {
    render(
      <TextQuestion
        question={mockShortQuestion}
        onAnswerChange={mockOnAnswerChange}
        error="Error message"
      />
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('aria-describedby');
  });

  it('should support keyboard input', () => {
    render(<TextQuestion question={mockShortQuestion} onAnswerChange={mockOnAnswerChange} />);

    const input = screen.getByRole('textbox');
    input.focus();

    expect(document.activeElement).toBe(input);
  });

  // ========================================================================
  // Edge Cases
  // ========================================================================

  it('should handle empty input', () => {
    render(
      <TextQuestion
        question={mockShortQuestion}
        onAnswerChange={mockOnAnswerChange}
        value={{ text_response: 'Test' }}
      />
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: '' } });

    expect(mockOnAnswerChange).toHaveBeenCalledWith({
      text_response: '',
    });
  });

  it('should handle undefined value', () => {
    render(<TextQuestion question={mockShortQuestion} onAnswerChange={mockOnAnswerChange} />);

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('should handle very long text input', () => {
    const longText = 'a'.repeat(1000);

    render(<TextQuestion question={mockShortQuestion} onAnswerChange={mockOnAnswerChange} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: longText } });

    expect(mockOnAnswerChange).toHaveBeenCalledWith({
      text_response: longText,
    });
  });

  it('should count words correctly with multiple spaces', () => {
    function ControlledTextQuestion() {
      const [value, setValue] = React.useState<{ text_response: string }>({ text_response: '' });
      return (
        <TextQuestion
          question={mockLongQuestion}
          value={value}
          onAnswerChange={(newValue) => {
            setValue(newValue);
            mockOnAnswerChange(newValue);
          }}
        />
      );
    }

    render(<ControlledTextQuestion />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'hello    world   test' } });

    // Should count as 3 words despite multiple spaces
    expect(screen.getByText(/3 \/ 200 words/i)).toBeInTheDocument();
  });

  it('should handle special characters in word count', () => {
    function ControlledTextQuestion() {
      const [value, setValue] = React.useState<{ text_response: string }>({ text_response: '' });
      return (
        <TextQuestion
          question={mockLongQuestion}
          value={value}
          onAnswerChange={(newValue) => {
            setValue(newValue);
            mockOnAnswerChange(newValue);
          }}
        />
      );
    }

    render(<ControlledTextQuestion />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: "Hello, world! This is a test." } });

    // Should count as 6 words
    expect(screen.getByText(/6 \/ 200 words/i)).toBeInTheDocument();
  });

  it('should handle max_words being undefined', () => {
    const questionNoLimit = {
      ...mockLongQuestion,
      max_words: undefined,
    };

    function ControlledTextQuestion() {
      const [value, setValue] = React.useState<{ text_response: string }>({ text_response: '' });
      return (
        <TextQuestion
          question={questionNoLimit}
          value={value}
          onAnswerChange={(newValue) => {
            setValue(newValue);
            mockOnAnswerChange(newValue);
          }}
        />
      );
    }

    render(<ControlledTextQuestion />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Test text' } });

    // Should show word count without limit
    expect(screen.getByText(/2 words/i)).toBeInTheDocument();
  });
});
